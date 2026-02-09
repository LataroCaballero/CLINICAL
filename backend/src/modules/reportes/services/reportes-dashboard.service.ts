import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DashboardFiltersDto } from '../dto';
import {
  DashboardKPIs,
  TurnoResumen,
  SerieTemporalItem,
} from '../types/reportes.types';
import {
  startOfDay,
  endOfDay,
  subDays,
  format,
  startOfToday,
  endOfToday,
} from 'date-fns';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReportesDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene los KPIs y métricas principales del dashboard
   */
  async getDashboardKPIs(filters: DashboardFiltersDto): Promise<DashboardKPIs> {
    const { profesionalId } = filters;
    const hoy = new Date();
    const inicioHoy = startOfToday();
    const finHoy = endOfToday();

    // Ejecutar secuencialmente para evitar MaxClientsInSessionMode con pgBouncer
    const turnosPorEstado = await this.getTurnosPorEstadoHoy(profesionalId, inicioHoy, finHoy);
    const ingresosHoy = await this.getIngresosHoy(profesionalId, inicioHoy, finHoy);
    const proximosTurnos = await this.getProximosTurnos(profesionalId, hoy);
    const alertasPendientes = await this.getAlertasPendientesCount(profesionalId);
    const tendenciasIngresos = await this.getTendenciasIngresos(profesionalId, 7);
    const tendenciasTurnos = await this.getTendenciasTurnos(profesionalId, 7);

    return {
      turnosHoy: turnosPorEstado.total,
      turnosCompletados: turnosPorEstado.finalizados,
      turnosAusentes: turnosPorEstado.ausentes,
      turnosCancelados: turnosPorEstado.cancelados,
      turnosPendientes: turnosPorEstado.pendientes + turnosPorEstado.confirmados,
      ingresosHoy,
      proximosTurnos,
      alertasPendientes,
      tendencias: {
        ingresosSemana: tendenciasIngresos,
        turnosSemana: tendenciasTurnos,
      },
    };
  }

  /**
   * Obtiene el conteo de turnos del día agrupado por estado
   */
  private async getTurnosPorEstadoHoy(
    profesionalId: string | undefined,
    inicioHoy: Date,
    finHoy: Date,
  ): Promise<{
    total: number;
    pendientes: number;
    confirmados: number;
    finalizados: number;
    cancelados: number;
    ausentes: number;
  }> {
    const whereBase = {
      inicio: {
        gte: inicioHoy,
        lte: finHoy,
      },
      ...(profesionalId && { profesionalId }),
    };

    const turnosAgrupados = await this.prisma.turno.groupBy({
      by: ['estado'],
      where: whereBase,
      _count: {
        _all: true,
      },
    });

    const resultado = {
      total: 0,
      pendientes: 0,
      confirmados: 0,
      finalizados: 0,
      cancelados: 0,
      ausentes: 0,
    };

    for (const grupo of turnosAgrupados) {
      const count = grupo._count._all;
      resultado.total += count;

      switch (grupo.estado) {
        case 'PENDIENTE':
          resultado.pendientes = count;
          break;
        case 'CONFIRMADO':
          resultado.confirmados = count;
          break;
        case 'FINALIZADO':
          resultado.finalizados = count;
          break;
        case 'CANCELADO':
          resultado.cancelados = count;
          break;
        case 'AUSENTE':
          resultado.ausentes = count;
          break;
      }
    }

    return resultado;
  }

  /**
   * Obtiene el total de ingresos (pagos) del día
   */
  private async getIngresosHoy(
    profesionalId: string | undefined,
    inicioHoy: Date,
    finHoy: Date,
  ): Promise<number> {
    // Si hay profesionalId, filtramos por pacientes de ese profesional
    const whereClause: any = {
      tipo: 'PAGO',
      anulado: false,
      fecha: {
        gte: inicioHoy,
        lte: finHoy,
      },
    };

    if (profesionalId) {
      whereClause.cuentaCorriente = {
        paciente: {
          profesionalId,
        },
      };
    }

    const result = await this.prisma.movimientoCC.aggregate({
      where: whereClause,
      _sum: {
        monto: true,
      },
    });

    return this.decimalToNumber(result._sum.monto);
  }

  /**
   * Obtiene los próximos 5 turnos pendientes o confirmados
   */
  private async getProximosTurnos(
    profesionalId: string | undefined,
    desde: Date,
  ): Promise<TurnoResumen[]> {
    const turnos = await this.prisma.turno.findMany({
      where: {
        inicio: { gte: desde },
        estado: { in: ['PENDIENTE', 'CONFIRMADO'] },
        ...(profesionalId && { profesionalId }),
      },
      orderBy: { inicio: 'asc' },
      take: 5,
      include: {
        paciente: {
          select: {
            id: true,
            nombreCompleto: true,
          },
        },
        tipoTurno: {
          select: {
            nombre: true,
          },
        },
      },
    });

    return turnos.map((turno) => ({
      id: turno.id,
      fecha: turno.inicio,
      hora: format(turno.inicio, 'HH:mm'),
      paciente: {
        id: turno.paciente.id,
        nombreCompleto: turno.paciente.nombreCompleto,
      },
      tipoTurno: {
        nombre: turno.tipoTurno.nombre,
        color: this.getColorForTipoTurno(turno.tipoTurno.nombre),
      },
      estado: turno.estado,
    }));
  }

  /**
   * Obtiene el conteo total de alertas pendientes
   */
  private async getAlertasPendientesCount(
    profesionalId: string | undefined,
  ): Promise<number> {
    const now = new Date();
    const hace24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const hace8h = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    const hace60dias = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const whereBase = profesionalId ? { profesionalId } : {};

    // Conteo simplificado de alertas principales (secuencial para pgBouncer)
    const sinConfirmar = await this.prisma.turno.count({
      where: {
        ...whereBase,
        estado: 'PENDIENTE',
        createdAt: { lt: hace24h },
        inicio: { gt: now },
      },
    });

    const noShow = await this.prisma.turno.count({
      where: {
        ...whereBase,
        inicio: { lt: now },
        inicioReal: null,
        estado: { in: ['PENDIENTE', 'CONFIRMADO'] },
      },
    });

    const sesionAbierta = await this.prisma.turno.count({
      where: {
        ...whereBase,
        inicioReal: { lt: hace8h, not: null },
        finReal: null,
      },
    });

    const deudaEnvejecida = await this.prisma.cuentaCorriente.count({
      where: {
        saldoActual: { gt: 0 },
        ...(profesionalId ? { paciente: { profesionalId } } : {}),
        movimientos: {
          some: {
            tipo: 'CARGO',
            anulado: false,
            fecha: { lt: hace60dias },
          },
        },
      },
    });

    return sinConfirmar + noShow + sesionAbierta + deudaEnvejecida;
  }

  /**
   * Obtiene la tendencia de ingresos de los últimos N días (single query)
   */
  private async getTendenciasIngresos(
    profesionalId: string | undefined,
    dias: number,
  ): Promise<SerieTemporalItem[]> {
    const hoy = new Date();
    const desde = startOfDay(subDays(hoy, dias - 1));
    const hasta = endOfDay(hoy);

    let rows: { dia: Date; total: Decimal | null }[];

    if (profesionalId) {
      rows = await this.prisma.$queryRaw`
        SELECT DATE(m."fecha") as dia, SUM(m."monto") as total
        FROM "MovimientoCC" m
        JOIN "CuentaCorriente" cc ON cc."id" = m."cuentaCorrienteId"
        JOIN "Paciente" p ON p."id" = cc."pacienteId"
        WHERE m."tipo" = 'PAGO'
          AND m."anulado" = false
          AND m."fecha" >= ${desde}
          AND m."fecha" <= ${hasta}
          AND p."profesionalId" = ${profesionalId}
        GROUP BY DATE(m."fecha")
        ORDER BY dia ASC
      `;
    } else {
      rows = await this.prisma.$queryRaw`
        SELECT DATE(m."fecha") as dia, SUM(m."monto") as total
        FROM "MovimientoCC" m
        WHERE m."tipo" = 'PAGO'
          AND m."anulado" = false
          AND m."fecha" >= ${desde}
          AND m."fecha" <= ${hasta}
        GROUP BY DATE(m."fecha")
        ORDER BY dia ASC
      `;
    }

    // Construir mapa de resultados
    const mapaIngresos = new Map<string, number>();
    for (const row of rows) {
      mapaIngresos.set(
        format(new Date(row.dia), 'yyyy-MM-dd'),
        this.decimalToNumber(row.total),
      );
    }

    // Generar serie completa (incluyendo días sin ingresos = 0)
    const resultado: SerieTemporalItem[] = [];
    for (let i = dias - 1; i >= 0; i--) {
      const fechaStr = format(subDays(hoy, i), 'yyyy-MM-dd');
      resultado.push({
        fecha: fechaStr,
        valor: mapaIngresos.get(fechaStr) ?? 0,
      });
    }

    return resultado;
  }

  /**
   * Obtiene la tendencia de turnos de los últimos N días (single query)
   */
  private async getTendenciasTurnos(
    profesionalId: string | undefined,
    dias: number,
  ): Promise<SerieTemporalItem[]> {
    const hoy = new Date();
    const desde = startOfDay(subDays(hoy, dias - 1));
    const hasta = endOfDay(hoy);

    let rows: { dia: Date; total: bigint }[];

    if (profesionalId) {
      rows = await this.prisma.$queryRaw`
        SELECT DATE("inicio") as dia, COUNT(*)::bigint as total
        FROM "Turno"
        WHERE "inicio" >= ${desde}
          AND "inicio" <= ${hasta}
          AND "profesionalId" = ${profesionalId}
        GROUP BY DATE("inicio")
        ORDER BY dia ASC
      `;
    } else {
      rows = await this.prisma.$queryRaw`
        SELECT DATE("inicio") as dia, COUNT(*)::bigint as total
        FROM "Turno"
        WHERE "inicio" >= ${desde}
          AND "inicio" <= ${hasta}
        GROUP BY DATE("inicio")
        ORDER BY dia ASC
      `;
    }

    // Construir mapa de resultados
    const mapaTurnos = new Map<string, number>();
    for (const row of rows) {
      mapaTurnos.set(
        format(new Date(row.dia), 'yyyy-MM-dd'),
        Number(row.total),
      );
    }

    // Generar serie completa (incluyendo días sin turnos = 0)
    const resultado: SerieTemporalItem[] = [];
    for (let i = dias - 1; i >= 0; i--) {
      const fechaStr = format(subDays(hoy, i), 'yyyy-MM-dd');
      resultado.push({
        fecha: fechaStr,
        valor: mapaTurnos.get(fechaStr) ?? 0,
      });
    }

    return resultado;
  }

  /**
   * Convierte un Decimal de Prisma a number
   */
  private decimalToNumber(value: Decimal | null): number {
    if (!value) return 0;
    return Number(value);
  }

  /**
   * Obtiene un color basado en el nombre del tipo de turno
   */
  private getColorForTipoTurno(nombre: string): string {
    const colores: Record<string, string> = {
      Consulta: '#3B82F6',
      Control: '#10B981',
      Cirugía: '#EF4444',
      Procedimiento: '#F59E0B',
      Emergencia: '#DC2626',
    };
    return colores[nombre] || '#6B7280';
  }
}
