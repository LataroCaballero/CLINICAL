import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateVentaProductoDto } from '../dto';
import { TipoMovimientoStock } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class VentasProductoService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    profesionalId: string,
    filters?: {
      pacienteId?: string;
      desde?: Date;
      hasta?: Date;
    },
  ) {
    const where: any = { profesionalId };

    if (filters?.pacienteId) {
      where.pacienteId = filters.pacienteId;
    }

    if (filters?.desde || filters?.hasta) {
      where.fecha = {};
      if (filters.desde) {
        where.fecha.gte = filters.desde;
      }
      if (filters.hasta) {
        where.fecha.lte = filters.hasta;
      }
    }

    return this.prisma.ventaProducto.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: {
        paciente: { select: { id: true, nombreCompleto: true } },
        items: {
          include: {
            producto: { select: { id: true, nombre: true, sku: true } },
          },
        },
      },
    });
  }

  async findOne(id: string, profesionalId: string) {
    const venta = await this.prisma.ventaProducto.findFirst({
      where: { id, profesionalId },
      include: {
        paciente: { select: { id: true, nombreCompleto: true, dni: true } },
        items: {
          include: {
            producto: true,
          },
        },
        MovimientoStock: {
          include: {
            lote: { select: { lote: true, fechaVencimiento: true } },
          },
        },
        factura: { select: { id: true, numero: true, tipo: true } },
      },
    });

    if (!venta) {
      throw new NotFoundException('Venta no encontrada');
    }

    return venta;
  }

  async create(
    dto: CreateVentaProductoDto,
    profesionalId: string,
    usuarioId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Validar paciente si se proporciona
      if (dto.pacienteId) {
        const paciente = await tx.paciente.findUnique({
          where: { id: dto.pacienteId },
        });
        if (!paciente) {
          throw new NotFoundException('Paciente no encontrado');
        }
      }

      // Validar productos y stock
      const productosInfo = await Promise.all(
        dto.items.map(async (item) => {
          const producto = await tx.producto.findUnique({
            where: { id: item.productoId },
          });

          if (!producto) {
            throw new NotFoundException(
              `Producto ${item.productoId} no encontrado`,
            );
          }

          // Solo validar stock si el producto descuenta stock
          if (producto.descuentaStock) {
            const inventario = await tx.inventario.findUnique({
              where: {
                productoId_profesionalId: {
                  productoId: item.productoId,
                  profesionalId,
                },
              },
            });

            if (!inventario || inventario.stockActual < item.cantidad) {
              throw new BadRequestException(
                `Stock insuficiente para ${producto.nombre}. Disponible: ${inventario?.stockActual ?? 0}, Solicitado: ${item.cantidad}`,
              );
            }
          }

          return { producto, item };
        }),
      );

      // Calcular totales
      let subtotal = new Decimal(0);
      for (const { item } of productosInfo) {
        subtotal = subtotal.add(
          new Decimal(item.precioUnitario).mul(item.cantidad),
        );
      }

      const descuento = dto.descuento
        ? subtotal.mul(dto.descuento).div(100)
        : new Decimal(0);
      const total = subtotal.sub(descuento);

      // Crear la venta
      const venta = await tx.ventaProducto.create({
        data: {
          pacienteId: dto.pacienteId,
          profesionalId,
          medioPago: dto.medioPago,
          total,
          items: {
            create: dto.items.map((item) => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              subtotal: new Decimal(item.precioUnitario).mul(item.cantidad),
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Descontar stock y crear movimientos
      for (const { producto, item } of productosInfo) {
        if (!producto.descuentaStock) continue;

        const inventario = await tx.inventario.findUnique({
          where: {
            productoId_profesionalId: {
              productoId: item.productoId,
              profesionalId,
            },
          },
        });

        if (!inventario) continue;

        // FIFO para lotes si el producto lo requiere
        let loteId: string | null = null;
        if (producto.requiereLote) {
          loteId = await this.consumirLoteFIFO(
            tx,
            item.productoId,
            profesionalId,
            item.cantidad,
          );
        }

        // Actualizar stock
        await tx.inventario.update({
          where: { id: inventario.id },
          data: { stockActual: { decrement: item.cantidad } },
        });

        // Crear movimiento de auditoría
        await tx.movimientoStock.create({
          data: {
            inventarioId: inventario.id,
            tipo: TipoMovimientoStock.SALIDA,
            cantidad: item.cantidad,
            motivo: `Venta de producto #${venta.id.slice(0, 8)}`,
            fecha: new Date(),
            usuarioId,
            ventaProductoId: venta.id,
            loteId,
          },
        });
      }

      return tx.ventaProducto.findUnique({
        where: { id: venta.id },
        include: {
          paciente: { select: { id: true, nombreCompleto: true } },
          items: {
            include: {
              producto: { select: { id: true, nombre: true } },
            },
          },
        },
      });
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
    const lotes = await tx.lote.findMany({
      where: {
        productoId,
        profesionalId,
        cantidadActual: { gt: 0 },
      },
      orderBy: [{ fechaVencimiento: 'asc' }, { id: 'asc' }],
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
      throw new BadRequestException('Stock insuficiente en lotes disponibles');
    }

    return ultimoLoteId;
  }

  /**
   * Obtiene resumen de ventas por período
   */
  async getResumen(
    profesionalId: string,
    desde: Date,
    hasta: Date,
  ) {
    const ventas = await this.prisma.ventaProducto.findMany({
      where: {
        profesionalId,
        fecha: { gte: desde, lte: hasta },
      },
      include: {
        items: {
          include: {
            producto: { select: { nombre: true, categoria: true } },
          },
        },
      },
    });

    const totalVentas = ventas.reduce(
      (acc, v) => acc.add(v.total),
      new Decimal(0),
    );
    const cantidadVentas = ventas.length;

    // Agrupar por producto
    const ventasPorProducto: Record<
      string,
      { nombre: string; cantidad: number; total: Decimal }
    > = {};

    for (const venta of ventas) {
      for (const item of venta.items) {
        if (!ventasPorProducto[item.productoId]) {
          ventasPorProducto[item.productoId] = {
            nombre: item.producto.nombre,
            cantidad: 0,
            total: new Decimal(0),
          };
        }
        ventasPorProducto[item.productoId].cantidad += item.cantidad;
        ventasPorProducto[item.productoId].total =
          ventasPorProducto[item.productoId].total.add(item.subtotal);
      }
    }

    return {
      totalVentas: totalVentas.toNumber(),
      cantidadVentas,
      ventasPorProducto: Object.entries(ventasPorProducto).map(
        ([id, data]) => ({
          productoId: id,
          ...data,
          total: data.total.toNumber(),
        }),
      ),
    };
  }
}
