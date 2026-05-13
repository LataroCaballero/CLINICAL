import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrdenesConsumoService {
  constructor(private prisma: PrismaService) {}

  findPendientesByProfesional(profesionalId: string) {
    return this.prisma.ordenConsumo.findMany({
      where: { profesionalId, estado: 'PENDIENTE' },
      include: {
        paciente: { select: { id: true, nombreCompleto: true } },
        insumos: {
          include: {
            producto: { select: { id: true, nombre: true, unidadMedida: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async confirmarOrden(id: string, profesionalId: string, usuarioId: string) {
    // Pre-fetch outside tx (pgBouncer pattern — same as HC service crearEntrada)
    const orden = await this.prisma.ordenConsumo.findFirst({
      where: { id, profesionalId, estado: 'PENDIENTE' },
      include: { insumos: true },
    });
    if (!orden) throw new NotFoundException('Orden no encontrada o no está pendiente');

    return this.prisma.$transaction(async (tx) => {
      // Re-fetch inside tx to guard against race condition
      const ordenTx = await tx.ordenConsumo.findFirst({
        where: { id, profesionalId, estado: 'PENDIENTE' },
        include: { insumos: true },
      });
      if (!ordenTx) throw new ConflictException('Orden ya fue confirmada o cancelada');

      for (const insumo of ordenTx.insumos) {
        const cantidad = Number(insumo.cantidad); // Decimal cast — critical

        let inv = await tx.inventario.findUnique({
          where: { productoId_profesionalId: { productoId: insumo.productoId, profesionalId } },
        });
        if (!inv) {
          inv = await tx.inventario.create({
            data: { productoId: insumo.productoId, profesionalId, stockActual: 0, stockMinimo: 0 },
          });
        }

        if (Number(inv.stockActual) < cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para producto ${insumo.productoId}. Disponible: ${inv.stockActual}, Requerido: ${cantidad}`,
          );
        }

        await tx.inventario.update({
          where: { id: inv.id },
          data: { stockActual: Number(inv.stockActual) - cantidad },
        });

        await tx.movimientoStock.create({
          data: {
            inventarioId: inv.id,
            tipo: 'SALIDA',
            cantidad,
            motivo: `Orden de consumo #${id.slice(0, 8)}`,
            usuarioId,
          },
        });
      }

      return tx.ordenConsumo.update({
        where: { id },
        data: { estado: 'CONFIRMADA' },
      });
    });
  }
}
