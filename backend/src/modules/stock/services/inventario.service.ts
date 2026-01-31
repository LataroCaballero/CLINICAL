import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateMovimientoStockDto,
  CreateLoteDto,
  UpdateInventarioDto,
} from '../dto';
import { TipoMovimientoStock } from '@prisma/client';

@Injectable()
export class InventarioService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene el inventario del profesional con información de productos
   */
  async findAll(profesionalId: string, filters?: { bajoStock?: boolean }) {
    const where: any = { profesionalId };

    const inventarios = await this.prisma.inventario.findMany({
      where,
      include: {
        producto: {
          include: {
            proveedores: {
              include: {
                proveedor: { select: { id: true, nombre: true } },
              },
            },
          },
        },
      },
      orderBy: { producto: { nombre: 'asc' } },
    });

    // Filtrar por bajo stock si se solicita
    if (filters?.bajoStock) {
      return inventarios.filter((inv) => inv.stockActual < inv.stockMinimo);
    }

    return inventarios;
  }

  /**
   * Obtiene el inventario de un producto específico para un profesional
   */
  async findByProducto(productoId: string, profesionalId: string) {
    const inventario = await this.prisma.inventario.findUnique({
      where: {
        productoId_profesionalId: { productoId, profesionalId },
      },
      include: {
        producto: true,
        movimientos: {
          orderBy: { fecha: 'desc' },
          take: 50,
          include: {
            usuario: { select: { nombre: true, apellido: true } },
            lote: { select: { lote: true, fechaVencimiento: true } },
          },
        },
      },
    });

    if (!inventario) {
      throw new NotFoundException(
        'Inventario no encontrado para este producto y profesional',
      );
    }

    return inventario;
  }

  /**
   * Obtiene los movimientos de stock de un producto
   */
  async getMovimientos(
    productoId: string,
    profesionalId: string,
    limit = 50,
    offset = 0,
  ) {
    const inventario = await this.prisma.inventario.findUnique({
      where: {
        productoId_profesionalId: { productoId, profesionalId },
      },
    });

    if (!inventario) {
      throw new NotFoundException('Inventario no encontrado');
    }

    return this.prisma.movimientoStock.findMany({
      where: { inventarioId: inventario.id },
      orderBy: { fecha: 'desc' },
      take: limit,
      skip: offset,
      include: {
        usuario: { select: { nombre: true, apellido: true } },
        lote: { select: { lote: true, fechaVencimiento: true } },
        ordenCompra: { select: { id: true, fechaCreacion: true } },
        ventaProducto: { select: { id: true, fecha: true } },
      },
    });
  }

  /**
   * Obtiene productos con stock bajo el mínimo
   */
  async getAlertas(profesionalId: string) {
    const inventarios = await this.prisma.inventario.findMany({
      where: {
        profesionalId,
        stockActual: { lt: this.prisma.inventario.fields.stockMinimo },
      },
      include: {
        producto: {
          include: {
            proveedores: {
              include: {
                proveedor: { select: { id: true, nombre: true } },
              },
            },
          },
        },
      },
      orderBy: { stockActual: 'asc' },
    });

    // Prisma no soporta comparar campos directamente en where, así que filtramos
    return this.prisma.inventario.findMany({
      where: { profesionalId },
      include: {
        producto: {
          include: {
            proveedores: {
              include: {
                proveedor: { select: { id: true, nombre: true } },
              },
            },
          },
        },
      },
    }).then((invs) => invs.filter((inv) => inv.stockActual < inv.stockMinimo));
  }

  /**
   * Obtiene productos próximos a vencer
   */
  async getProximosVencer(profesionalId: string, diasAlerta = 30) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAlerta);

    return this.prisma.lote.findMany({
      where: {
        profesionalId,
        cantidadActual: { gt: 0 },
        fechaVencimiento: {
          not: null,
          lte: fechaLimite,
        },
      },
      include: {
        producto: { select: { id: true, nombre: true, sku: true } },
      },
      orderBy: { fechaVencimiento: 'asc' },
    });
  }

  /**
   * Crea o actualiza inventario para un producto y profesional
   */
  async getOrCreateInventario(productoId: string, profesionalId: string) {
    let inventario = await this.prisma.inventario.findUnique({
      where: {
        productoId_profesionalId: { productoId, profesionalId },
      },
    });

    if (!inventario) {
      inventario = await this.prisma.inventario.create({
        data: {
          productoId,
          profesionalId,
          stockActual: 0,
          stockMinimo: 0,
        },
      });
    }

    return inventario;
  }

  /**
   * Actualiza configuración de inventario (stock mínimo, precio)
   */
  async updateInventario(
    productoId: string,
    profesionalId: string,
    dto: UpdateInventarioDto,
  ) {
    const inventario = await this.getOrCreateInventario(
      productoId,
      profesionalId,
    );

    return this.prisma.inventario.update({
      where: { id: inventario.id },
      data: {
        stockMinimo: dto.stockMinimo,
        precioActual: dto.precioActual,
      },
    });
  }

  /**
   * Registra un movimiento de stock con validaciones y FIFO
   */
  async registrarMovimiento(
    dto: CreateMovimientoStockDto,
    profesionalId: string,
    usuarioId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Obtener o crear inventario
      let inventario = await tx.inventario.findUnique({
        where: {
          productoId_profesionalId: {
            productoId: dto.productoId,
            profesionalId,
          },
        },
        include: { producto: true },
      });

      if (!inventario) {
        // Crear inventario si no existe
        inventario = await tx.inventario.create({
          data: {
            productoId: dto.productoId,
            profesionalId,
            stockActual: 0,
            stockMinimo: 0,
          },
          include: { producto: true },
        });
      }

      const producto = inventario.producto;
      let loteId = dto.loteId;

      // Validaciones según tipo de movimiento
      if (dto.tipo === TipoMovimientoStock.SALIDA) {
        // Validar stock disponible
        if (inventario.stockActual < dto.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente. Disponible: ${inventario.stockActual}, Solicitado: ${dto.cantidad}`,
          );
        }

        // FIFO: Consumir de lotes más antiguos si el producto requiere lote
        if (producto.requiereLote) {
          if (loteId) {
            // Descontar del lote específico
            await this.descontarLote(tx, loteId, dto.cantidad);
          } else {
            // Verificar si hay lotes disponibles antes de intentar consumir
            const lotesDisponibles = await tx.lote.count({
              where: {
                productoId: dto.productoId,
                profesionalId,
                cantidadActual: { gt: 0 },
              },
            });

            if (lotesDisponibles > 0) {
              loteId = await this.consumirLoteFIFO(
                tx,
                dto.productoId,
                profesionalId,
                dto.cantidad,
              );
            } else {
              // Si no hay lotes pero hay stock, el stock fue ingresado sin lotes
              // Permitir egreso pero advertir que no se puede rastrear lote
              // No lanzar error, solo continuar sin loteId
            }
          }
        } else if (loteId) {
          // El producto no requiere lote pero se especificó uno
          await this.descontarLote(tx, loteId, dto.cantidad);
        }
      }

      if (dto.tipo === TipoMovimientoStock.ENTRADA) {
        // Si es entrada y el producto requiere lote, crear lote nuevo
        if (producto.requiereLote && dto.loteNumero) {
          const nuevoLote = await tx.lote.create({
            data: {
              productoId: dto.productoId,
              profesionalId,
              lote: dto.loteNumero,
              fechaVencimiento: dto.loteFechaVencimiento
                ? new Date(dto.loteFechaVencimiento)
                : null,
              cantidadInicial: dto.cantidad,
              cantidadActual: dto.cantidad,
            },
          });
          loteId = nuevoLote.id;
        }
      }

      // Calcular nuevo stock
      let nuevoStock = inventario.stockActual;
      if (dto.tipo === TipoMovimientoStock.ENTRADA) {
        nuevoStock += dto.cantidad;
      } else if (dto.tipo === TipoMovimientoStock.SALIDA) {
        nuevoStock -= dto.cantidad;
      } else if (dto.tipo === TipoMovimientoStock.AJUSTE) {
        // Para ajustes, la cantidad es el nuevo stock absoluto
        nuevoStock = dto.cantidad;
      }

      // Actualizar stock (y precio si se proporciona en entradas)
      const updateData: any = { stockActual: nuevoStock };
      if (dto.tipo === TipoMovimientoStock.ENTRADA && dto.nuevoPrecio !== undefined) {
        updateData.precioActual = dto.nuevoPrecio;
      }

      await tx.inventario.update({
        where: { id: inventario.id },
        data: updateData,
      });

      // Crear movimiento de auditoría
      const movimiento = await tx.movimientoStock.create({
        data: {
          inventarioId: inventario.id,
          tipo: dto.tipo,
          cantidad: dto.cantidad,
          motivo: dto.motivo,
          fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
          usuarioId,
          loteId,
          ordenCompraId: dto.ordenCompraId,
          practicaId: dto.practicaId,
        },
        include: {
          usuario: { select: { nombre: true, apellido: true } },
          lote: { select: { lote: true, fechaVencimiento: true } },
        },
      });

      return {
        movimiento,
        stockActual: nuevoStock,
        stockAnterior: inventario.stockActual,
      };
    });
  }

  /**
   * Consume stock del lote más antiguo (FIFO)
   */
  private async consumirLoteFIFO(
    tx: any,
    productoId: string,
    profesionalId: string,
    cantidad: number,
  ): Promise<string | null> {
    // Obtener lotes con stock disponible, ordenados por fecha de vencimiento (FIFO)
    const lotes = await tx.lote.findMany({
      where: {
        productoId,
        profesionalId,
        cantidadActual: { gt: 0 },
      },
      orderBy: [
        { fechaVencimiento: 'asc' }, // Primero los que vencen antes
        { id: 'asc' }, // Si no hay fecha, por orden de creación
      ],
    });

    if (lotes.length === 0) {
      throw new BadRequestException(
        'No hay lotes disponibles para este producto',
      );
    }

    let cantidadRestante = cantidad;
    let ultimoLoteId: string | null = null;

    for (const lote of lotes) {
      if (cantidadRestante <= 0) break;

      const aDescontar = Math.min(lote.cantidadActual, cantidadRestante);
      await tx.lote.update({
        where: { id: lote.id },
        data: { cantidadActual: lote.cantidadActual - aDescontar },
      });

      cantidadRestante -= aDescontar;
      ultimoLoteId = lote.id;
    }

    if (cantidadRestante > 0) {
      throw new BadRequestException(
        'Stock insuficiente en lotes disponibles',
      );
    }

    return ultimoLoteId;
  }

  /**
   * Descuenta de un lote específico
   */
  private async descontarLote(tx: any, loteId: string, cantidad: number) {
    const lote = await tx.lote.findUnique({ where: { id: loteId } });

    if (!lote) {
      throw new NotFoundException('Lote no encontrado');
    }

    if (lote.cantidadActual < cantidad) {
      throw new BadRequestException(
        `Stock insuficiente en lote. Disponible: ${lote.cantidadActual}`,
      );
    }

    await tx.lote.update({
      where: { id: loteId },
      data: { cantidadActual: lote.cantidadActual - cantidad },
    });
  }

  /**
   * Crea un nuevo lote
   */
  async crearLote(dto: CreateLoteDto, profesionalId: string) {
    // Verificar que el producto existe y requiere lote
    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    return this.prisma.lote.create({
      data: {
        productoId: dto.productoId,
        profesionalId,
        lote: dto.lote,
        fechaVencimiento: dto.fechaVencimiento
          ? new Date(dto.fechaVencimiento)
          : null,
        cantidadInicial: dto.cantidadInicial,
        cantidadActual: dto.cantidadInicial,
      },
    });
  }

  /**
   * Obtiene lotes de un producto
   */
  async getLotes(productoId: string, profesionalId: string) {
    return this.prisma.lote.findMany({
      where: {
        productoId,
        profesionalId,
        cantidadActual: { gt: 0 },
      },
      orderBy: { fechaVencimiento: 'asc' },
    });
  }
}
