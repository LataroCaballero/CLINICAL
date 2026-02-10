import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { TipoMovimiento, MedioPago } from '@prisma/client';
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
      medioPago: m.medioPago,
      descripcion: m.descripcion,
      referencia: m.referencia,
      fecha: m.fecha,
      anulado: m.anulado,
      fechaAnulacion: m.fechaAnulacion,
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
          medioPago: dto.medioPago,
          descripcion: dto.descripcion,
          referencia: dto.referencia,
          turnoId: dto.turnoId,
          presupuestoId: dto.presupuestoId,
          usuarioId: dto.usuarioId,
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
        medioPago: movimiento.medioPago,
        descripcion: movimiento.descripcion,
        referencia: movimiento.referencia,
        fecha: movimiento.fecha,
      };
    });
  }

  /**
   * Lista todas las cuentas corrientes con filtros
   */
  async findAll(filters?: { profesionalId?: string; soloConDeuda?: boolean }) {
    const whereClause: any = {};

    if (filters?.profesionalId) {
      whereClause.paciente = {
        profesionalId: filters.profesionalId,
      };
    }

    if (filters?.soloConDeuda) {
      whereClause.saldoActual = { gt: 0 };
    }

    const cuentas = await this.prisma.cuentaCorriente.findMany({
      where: whereClause,
      include: {
        paciente: {
          select: {
            id: true,
            nombreCompleto: true,
            dni: true,
            telefono: true,
            email: true,
            obraSocial: {
              select: { id: true, nombre: true },
            },
          },
        },
        movimientos: {
          take: 1,
          orderBy: { fecha: 'desc' },
          select: { fecha: true },
        },
      },
      orderBy: { saldoActual: 'desc' },
    });

    return cuentas.map((c) => ({
      id: c.id,
      pacienteId: c.pacienteId,
      saldoActual: Number(c.saldoActual),
      totalPagadoHistorico: Number(c.totalPagadoHistorico),
      paciente: c.paciente,
      ultimoMovimiento: c.movimientos[0]?.fecha || null,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Antigüedad de deuda para un paciente
   */
  async getAntiguedadDeuda(pacienteId: string) {
    const cuenta = await this.getOrCreateCuentaCorriente(pacienteId);

    const movimientos = await this.prisma.movimientoCC.findMany({
      where: {
        cuentaCorrienteId: cuenta.id,
        tipo: TipoMovimiento.CARGO,
        anulado: false,
      },
      select: { monto: true, fecha: true },
    });

    const now = new Date();
    const result = {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
    };

    for (const mov of movimientos) {
      const diffDays = Math.floor(
        (now.getTime() - new Date(mov.fecha).getTime()) / (1000 * 60 * 60 * 24),
      );
      const monto = Number(mov.monto);

      if (diffDays <= 30) {
        result['0-30'] += monto;
      } else if (diffDays <= 60) {
        result['31-60'] += monto;
      } else if (diffDays <= 90) {
        result['61-90'] += monto;
      } else {
        result['90+'] += monto;
      }
    }

    return result;
  }

  /**
   * Anular un movimiento
   */
  async anularMovimiento(movimientoId: string, usuarioId: string) {
    const movimiento = await this.prisma.movimientoCC.findUnique({
      where: { id: movimientoId },
      include: { cuentaCorriente: true },
    });

    if (!movimiento) {
      throw new NotFoundException('Movimiento no encontrado');
    }

    if (movimiento.anulado) {
      throw new BadRequestException('El movimiento ya está anulado');
    }

    return this.prisma.$transaction(async (tx) => {
      // Marcar movimiento como anulado
      await tx.movimientoCC.update({
        where: { id: movimientoId },
        data: {
          anulado: true,
          fechaAnulacion: new Date(),
        },
      });

      // Revertir efecto en cuenta corriente
      const montoDecimal = new Decimal(movimiento.monto.toString());

      if (movimiento.tipo === TipoMovimiento.CARGO) {
        // Si era CARGO, decrementamos
        await tx.cuentaCorriente.update({
          where: { id: movimiento.cuentaCorrienteId },
          data: {
            saldoActual: { decrement: montoDecimal },
          },
        });
      } else {
        // Si era PAGO, incrementamos el saldo y decrementamos histórico
        await tx.cuentaCorriente.update({
          where: { id: movimiento.cuentaCorrienteId },
          data: {
            saldoActual: { increment: montoDecimal },
            totalPagadoHistorico: { decrement: montoDecimal },
          },
        });
      }

      return { success: true, message: 'Movimiento anulado' };
    });
  }
}
