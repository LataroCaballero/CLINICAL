import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateOrdenCompraDto,
  RecibirOrdenCompraDto,
  CargaFacturaDto,
  TipoHonorario,
} from '../dto';
import {
  EstadoOrdenCompra,
  TipoMovimientoStock,
  TipoProducto,
  CondicionPagoProveedor,
} from '@prisma/client';
import { CuentasCorrientesProveedoresService } from '../../cuentas-corrientes-proveedores/cuentas-corrientes-proveedores.service';

@Injectable()
export class OrdenesCompraService {
  constructor(
    private prisma: PrismaService,
    private cuentasCorrientesProveedores: CuentasCorrientesProveedoresService,
  ) {}

  async findAll(profesionalId: string, estado?: EstadoOrdenCompra) {
    return this.prisma.ordenCompra.findMany({
      where: {
        profesionalId,
        ...(estado && { estado }),
      },
      orderBy: { fechaCreacion: 'desc' },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        items: {
          include: {
            producto: { select: { id: true, nombre: true, sku: true } },
          },
        },
        _count: { select: { movimientos: true } },
      },
    });
  }

  async findOne(id: string, profesionalId: string) {
    const orden = await this.prisma.ordenCompra.findFirst({
      where: { id, profesionalId },
      include: {
        proveedor: true,
        items: {
          include: {
            producto: true,
          },
        },
        movimientos: {
          include: {
            usuario: { select: { nombre: true, apellido: true } },
            lote: { select: { lote: true, fechaVencimiento: true } },
          },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    return orden;
  }

  async create(dto: CreateOrdenCompraDto, profesionalId: string) {
    // Verificar que el proveedor existe
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: dto.proveedorId },
    });

    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    // Verificar que todos los productos existen
    const productoIds = dto.items.map((item) => item.productoId);
    const productos = await this.prisma.producto.findMany({
      where: { id: { in: productoIds } },
    });

    if (productos.length !== productoIds.length) {
      throw new BadRequestException('Uno o más productos no encontrados');
    }

    // Calcular el total de la orden
    const total = dto.items.reduce(
      (sum, item) => sum + item.cantidad * item.precioUnitario,
      0,
    );

    return this.prisma.ordenCompra.create({
      data: {
        proveedorId: dto.proveedorId,
        profesionalId,
        total,
        condicionPago: dto.condicionPago || CondicionPagoProveedor.CONTADO,
        cantidadCuotas: dto.cantidadCuotas || 1,
        fechaPrimerVencimiento: dto.fechaPrimerVencimiento
          ? new Date(dto.fechaPrimerVencimiento)
          : null,
        items: {
          create: dto.items.map((item) => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
          })),
        },
      },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        items: {
          include: {
            producto: { select: { id: true, nombre: true } },
          },
        },
      },
    });
  }

  async actualizarEstado(
    id: string,
    profesionalId: string,
    estado: EstadoOrdenCompra,
  ) {
    const orden = await this.prisma.ordenCompra.findFirst({
      where: { id, profesionalId },
    });

    if (!orden) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    // Validar transiciones de estado
    if (orden.estado === EstadoOrdenCompra.RECIBIDA) {
      throw new BadRequestException(
        'No se puede modificar una orden ya recibida',
      );
    }

    if (orden.estado === EstadoOrdenCompra.CANCELADA) {
      throw new BadRequestException(
        'No se puede modificar una orden cancelada',
      );
    }

    return this.prisma.ordenCompra.update({
      where: { id },
      data: { estado },
    });
  }

  async recibir(
    id: string,
    profesionalId: string,
    usuarioId: string,
    dto?: RecibirOrdenCompraDto,
  ) {
    // First, get the order to access proveedorId outside the transaction
    const ordenPrevia = await this.prisma.ordenCompra.findFirst({
      where: { id, profesionalId },
      select: {
        id: true,
        proveedorId: true,
        condicionPago: true,
        cantidadCuotas: true,
        fechaPrimerVencimiento: true,
        items: {
          select: {
            cantidad: true,
            precioUnitario: true,
          },
        },
      },
    });

    if (!ordenPrevia) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    // Calculate total
    const total = ordenPrevia.items.reduce(
      (sum, item) => sum + item.cantidad * Number(item.precioUnitario),
      0,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const orden = await tx.ordenCompra.findFirst({
        where: { id, profesionalId },
        include: {
          items: {
            include: {
              producto: true,
            },
          },
        },
      });

      if (!orden) {
        throw new NotFoundException('Orden de compra no encontrada');
      }

      if (orden.estado === EstadoOrdenCompra.RECIBIDA) {
        throw new BadRequestException('La orden ya fue recibida');
      }

      if (orden.estado === EstadoOrdenCompra.CANCELADA) {
        throw new BadRequestException(
          'No se puede recibir una orden cancelada',
        );
      }

      const fechaRecepcion = dto?.fechaRecepcion
        ? new Date(dto.fechaRecepcion)
        : new Date();

      // Procesar cada item de la orden
      for (const item of orden.items) {
        // Buscar datos adicionales del DTO (lote, cantidad específica)
        const itemRecepcion = dto?.items?.find(
          (i) => i.productoId === item.productoId,
        );
        const cantidadRecibida =
          itemRecepcion?.cantidadRecibida ?? item.cantidad;

        // Obtener o crear inventario
        let inventario = await tx.inventario.findUnique({
          where: {
            productoId_profesionalId: {
              productoId: item.productoId,
              profesionalId,
            },
          },
        });

        if (!inventario) {
          inventario = await tx.inventario.create({
            data: {
              productoId: item.productoId,
              profesionalId,
              stockActual: 0,
              stockMinimo: 0,
            },
          });
        }

        // Crear lote si el producto lo requiere y se proporciona información
        let loteId: string | null = null;
        if (item.producto.requiereLote && itemRecepcion?.loteNumero) {
          const lote = await tx.lote.create({
            data: {
              productoId: item.productoId,
              profesionalId,
              lote: itemRecepcion.loteNumero,
              fechaVencimiento: itemRecepcion.loteFechaVencimiento
                ? new Date(itemRecepcion.loteFechaVencimiento)
                : null,
              cantidadInicial: cantidadRecibida,
              cantidadActual: cantidadRecibida,
            },
          });
          loteId = lote.id;
        }

        // Actualizar stock
        await tx.inventario.update({
          where: { id: inventario.id },
          data: {
            stockActual: { increment: cantidadRecibida },
          },
        });

        // Crear movimiento de stock
        await tx.movimientoStock.create({
          data: {
            inventarioId: inventario.id,
            tipo: TipoMovimientoStock.ENTRADA,
            cantidad: cantidadRecibida,
            motivo: `Recepción de orden de compra #${orden.id.slice(0, 8)}`,
            fecha: fechaRecepcion,
            usuarioId,
            ordenCompraId: orden.id,
            loteId,
          },
        });
      }

      // Actualizar estado de la orden y guardar el total
      return tx.ordenCompra.update({
        where: { id },
        data: {
          estado: EstadoOrdenCompra.RECIBIDA,
          fechaRecepcion,
          total,
        },
        include: {
          proveedor: { select: { nombre: true } },
          items: {
            include: {
              producto: { select: { nombre: true } },
            },
          },
        },
      });
    });

    // After successful transaction, register charge and generate installments
    await this.cuentasCorrientesProveedores.registrarCargo(
      ordenPrevia.proveedorId,
      profesionalId,
      total,
      id,
      `Recepción orden de compra #${id.slice(0, 8)}`,
    );

    // Generate installments based on payment condition
    await this.cuentasCorrientesProveedores.generarCuotas(
      id,
      total,
      ordenPrevia.condicionPago,
      ordenPrevia.cantidadCuotas,
      ordenPrevia.fechaPrimerVencimiento || undefined,
    );

    return result;
  }

  async cargarFactura(
    dto: CargaFacturaDto,
    profesionalId: string,
    usuarioId: string,
  ) {
    if (!dto.proveedorId && !dto.proveedorNombre) {
      throw new BadRequestException(
        'Debe proporcionar un proveedor existente o un nombre para crear uno nuevo',
      );
    }

    if (dto.items.length === 0) {
      throw new BadRequestException('Debe incluir al menos un ítem');
    }

    for (const item of dto.items) {
      if (!item.productoId && !item.productoNombre) {
        throw new BadRequestException(
          'Cada ítem debe tener un producto existente o un nombre para crear uno nuevo',
        );
      }
    }

    const fechaFactura = dto.fechaFactura
      ? new Date(dto.fechaFactura)
      : new Date();
    const condicionPago = dto.condicionPago || CondicionPagoProveedor.CONTADO;
    const cantidadCuotas = dto.cantidadCuotas || 1;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Resolver proveedor
      let proveedorId = dto.proveedorId;
      if (!proveedorId) {
        const nuevoProveedor = await tx.proveedor.create({
          data: { nombre: dto.proveedorNombre! },
        });
        proveedorId = nuevoProveedor.id;
      } else {
        const existe = await tx.proveedor.findUnique({
          where: { id: proveedorId },
        });
        if (!existe) {
          throw new NotFoundException('Proveedor no encontrado');
        }
      }

      // 2. Procesar ítems: resolver productos y calcular precios
      const itemsData: {
        productoId: string;
        cantidad: number;
        precioUnitario: number;
        costoUnitario: number;
        precioVenta: number;
      }[] = [];

      for (const item of dto.items) {
        let productoId = item.productoId;

        if (!productoId) {
          const nuevoProducto = await tx.producto.create({
            data: {
              nombre: item.productoNombre!,
              tipo: TipoProducto.INSUMO,
            },
          });
          productoId = nuevoProducto.id;
        }

        const costoUnitario = item.precioFactura / item.cantidad;
        const honorario = item.honorario ?? 0;
        const tipoHonorario = item.tipoHonorario ?? TipoHonorario.FIJO;

        const precioVenta =
          tipoHonorario === TipoHonorario.PORCENTAJE
            ? costoUnitario * (1 + honorario / 100)
            : costoUnitario + honorario;

        // Actualizar costoBase y precioSugerido del producto
        await tx.producto.update({
          where: { id: productoId },
          data: {
            costoBase: costoUnitario,
            precioSugerido: precioVenta,
          },
        });

        itemsData.push({
          productoId,
          cantidad: item.cantidad,
          precioUnitario: costoUnitario,
          costoUnitario,
          precioVenta,
        });
      }

      const total = dto.items.reduce((sum, item) => sum + item.precioFactura, 0);

      // 3. Crear OrdenCompra con estado RECIBIDA
      const orden = await tx.ordenCompra.create({
        data: {
          proveedorId,
          profesionalId,
          numeroFactura: dto.numeroFactura,
          estado: EstadoOrdenCompra.RECIBIDA,
          fechaCreacion: fechaFactura,
          fechaRecepcion: fechaFactura,
          total,
          condicionPago,
          cantidadCuotas: condicionPago === CondicionPagoProveedor.CONTADO ? 1 : cantidadCuotas,
          fechaPrimerVencimiento: dto.fechaPrimerVencimiento
            ? new Date(dto.fechaPrimerVencimiento)
            : null,
          items: {
            create: itemsData.map((item) => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              precioUnitario: item.costoUnitario,
            })),
          },
        },
        include: {
          proveedor: { select: { id: true, nombre: true } },
          items: {
            include: {
              producto: { select: { id: true, nombre: true } },
            },
          },
        },
      });

      // 4. Actualizar stock por cada ítem
      for (const item of itemsData) {
        let inventario = await tx.inventario.findUnique({
          where: {
            productoId_profesionalId: {
              productoId: item.productoId,
              profesionalId,
            },
          },
        });

        if (!inventario) {
          inventario = await tx.inventario.create({
            data: {
              productoId: item.productoId,
              profesionalId,
              stockActual: 0,
              stockMinimo: 0,
            },
          });
        }

        await tx.inventario.update({
          where: { id: inventario.id },
          data: {
            stockActual: { increment: item.cantidad },
            precioActual: item.precioVenta,
          },
        });

        await tx.movimientoStock.create({
          data: {
            inventarioId: inventario.id,
            tipo: TipoMovimientoStock.ENTRADA,
            cantidad: item.cantidad,
            motivo: `Factura proveedor${dto.numeroFactura ? ` #${dto.numeroFactura}` : ''} - ${orden.id.slice(0, 8)}`,
            fecha: fechaFactura,
            usuarioId,
            ordenCompraId: orden.id,
          },
        });
      }

      return { orden, proveedorId, total };
    });

    // 5. Post-transacción: registrar deuda y generar cuotas
    await this.cuentasCorrientesProveedores.registrarCargo(
      result.proveedorId,
      profesionalId,
      result.total,
      result.orden.id,
      `Factura proveedor${dto.numeroFactura ? ` #${dto.numeroFactura}` : ''} - ${result.orden.id.slice(0, 8)}`,
    );

    await this.cuentasCorrientesProveedores.generarCuotas(
      result.orden.id,
      result.total,
      condicionPago,
      condicionPago === CondicionPagoProveedor.CONTADO ? 1 : cantidadCuotas,
      dto.fechaPrimerVencimiento
        ? new Date(dto.fechaPrimerVencimiento)
        : undefined,
    );

    return result.orden;
  }

  async cancelar(id: string, profesionalId: string) {
    const orden = await this.prisma.ordenCompra.findFirst({
      where: { id, profesionalId },
    });

    if (!orden) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    if (orden.estado === EstadoOrdenCompra.RECIBIDA) {
      throw new BadRequestException(
        'No se puede cancelar una orden ya recibida',
      );
    }

    return this.prisma.ordenCompra.update({
      where: { id },
      data: { estado: EstadoOrdenCompra.CANCELADA },
    });
  }
}
