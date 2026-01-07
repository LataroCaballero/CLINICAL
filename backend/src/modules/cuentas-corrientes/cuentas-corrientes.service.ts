import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { TipoMovimiento } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CuentasCorrientesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene o crea la cuenta corriente de un paciente
   */
  async getOrCreateCuentaCorriente(pacienteId: string) {
    // Verificar que el paciente existe
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { id: true },
    });

    if (!paciente) {
      throw new NotFoundException('Paciente no encontrado');
    }

    // Buscar cuenta corriente existente
    let cuentaCorriente = await this.prisma.cuentaCorriente.findUnique({
      where: { pacienteId },
    });

    // Si no existe, crearla
    if (!cuentaCorriente) {
      cuentaCorriente = await this.prisma.cuentaCorriente.create({
        data: {
          pacienteId,
          saldoActual: 0,
          totalPagadoHistorico: 0,
        },
      });
    }

    return cuentaCorriente;
  }

  /**
   * Obtiene la cuenta corriente con resumen
   */
  async findByPaciente(pacienteId: string) {
    const cuenta = await this.getOrCreateCuentaCorriente(pacienteId);

    return {
      id: cuenta.id,
      pacienteId: cuenta.pacienteId,
      saldoActual: Number(cuenta.saldoActual),
      totalPagadoHistorico: Number(cuenta.totalPagadoHistorico),
      createdAt: cuenta.createdAt,
      updatedAt: cuenta.updatedAt,
    };
  }

  /**
   * Lista los movimientos de una cuenta corriente
   */
  async findMovimientos(pacienteId: string) {
    const cuenta = await this.getOrCreateCuentaCorriente(pacienteId);

    const movimientos = await this.prisma.movimientoCC.findMany({
      where: { cuentaCorrienteId: cuenta.id },
      orderBy: { fecha: 'desc' },
      include: {
        turno: {
          select: {
            id: true,
            inicio: true,
            tipoTurno: { select: { nombre: true } },
          },
        },
        presupuesto: {
          select: {
            id: true,
            total: true,
          },
        },
      },
    });

    return movimientos.map((m) => ({
      id: m.id,
      monto: Number(m.monto),
      tipo: m.tipo,
      descripcion: m.descripcion,
      fecha: m.fecha,
      turno: m.turno,
      presupuesto: m.presupuesto
        ? {
            id: m.presupuesto.id,
            total: Number(m.presupuesto.total),
          }
        : null,
    }));
  }

  /**
   * Registra un movimiento en la cuenta corriente
   */
  async createMovimiento(pacienteId: string, dto: CreateMovimientoDto) {
    const cuenta = await this.getOrCreateCuentaCorriente(pacienteId);

    return this.prisma.$transaction(async (tx) => {
      // Crear el movimiento
      const movimiento = await tx.movimientoCC.create({
        data: {
          cuentaCorrienteId: cuenta.id,
          monto: dto.monto,
          tipo: dto.tipo,
          descripcion: dto.descripcion,
          turnoId: dto.turnoId,
          presupuestoId: dto.presupuestoId,
        },
      });

      // Actualizar saldo según tipo
      const montoDecimal = new Decimal(dto.monto);

      if (dto.tipo === TipoMovimiento.CARGO) {
        // CARGO: aumenta la deuda (saldo positivo = debe)
        await tx.cuentaCorriente.update({
          where: { id: cuenta.id },
          data: {
            saldoActual: { increment: montoDecimal },
          },
        });
      } else {
        // PAGO: reduce la deuda y suma al histórico
        await tx.cuentaCorriente.update({
          where: { id: cuenta.id },
          data: {
            saldoActual: { decrement: montoDecimal },
            totalPagadoHistorico: { increment: montoDecimal },
          },
        });
      }

      return {
        id: movimiento.id,
        monto: Number(movimiento.monto),
        tipo: movimiento.tipo,
        descripcion: movimiento.descripcion,
        fecha: movimiento.fecha,
      };
    });
  }
}
