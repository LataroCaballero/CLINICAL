import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ReporteTurnosFiltersDto,
  ReporteAusentismoFiltersDto,
  ReporteFiltersDto,
  ReporteProcedimientosFiltersDto,
  Agrupacion,
} from '../dto';
import {
  ReporteTurnos,
  ReporteTurnosDetalle,
  ReporteAusentismo,
  AusentismoPorPaciente,
  ReporteOcupacion,
  OcupacionPorProfesional,
  ReporteProcedimientos,
  ProcedimientoRanking,
  ReporteVentasProductos,
  VentaPorProducto,
  VentaPorPaciente,
} from '../types/reportes.types';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReportesOperativosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reporte de turnos con agrupación por día, semana o mes
   */
  async getReporteTurnos(
    filters: ReporteTurnosFiltersDto,
  ): Promise<ReporteTurnos> {
    const { profesionalId, agrupacion = Agrupacion.DIA } = filters;

    // Determinar rango de fechas (default: últimos 30 días)
    const fechaHasta = filters.fechaHasta
      ? endOfDay(parseISO(filters.fechaHasta))
      : endOfDay(new Date());
    const fechaDesde = filters.fechaDesde
      ? startOfDay(parseISO(filters.fechaDesde))
      : startOfDay(new Date(fechaHasta.getTime() - 30 * 24 * 60 * 60 * 1000));

    // Query base para obtener todos los turnos en el rango
    const whereBase = {
      inicio: {
        gte: fechaDesde,
        lte: fechaHasta,
      },
      ...(profesionalId && { profesionalId }),
    };

    // Obtener conteo por estado
    const turnosPorEstado = await this.prisma.turno.groupBy({
      by: ['estado'],
      where: whereBase,
      _count: { _all: true },
    });

    // Calcular totales
    let total = 0;
    let completados = 0;
    let cancelados = 0;
    let ausentes = 0;

    for (const grupo of turnosPorEstado) {
      const count = grupo._count._all;
      total += count;
      switch (grupo.estado) {
        case 'FINALIZADO':
          completados = count;
          break;
        case 'CANCELADO':
          cancelados = count;
          break;
        case 'AUSENTE':
          ausentes = count;
          break;
      }
    }

    // Generar detalle por período
    const detalle = await this.generarDetallePorPeriodo(
      whereBase,
      fechaDesde,
      fechaHasta,
      agrupacion,
    );

    const tasaAusentismo = total > 0 ? (ausentes / total) * 100 : 0;
    const tasaCompletado = total > 0 ? (completados / total) * 100 : 0;

    return {
      total,
      completados,
      cancelados,
      ausentes,
      tasaAusentismo: Math.round(tasaAusentismo * 100) / 100,
      tasaCompletado: Math.round(tasaCompletado * 100) / 100,
      detalle,
    };
  }

  /**
   * Genera el detalle de turnos agrupado por período
   */
  private async generarDetallePorPeriodo(
    whereBase: any,
    fechaDesde: Date,
    fechaHasta: Date,
    agrupacion: Agrupacion,
  ): Promise<ReporteTurnosDetalle[]> {
    const detalle: ReporteTurnosDetalle[] = [];

    // Obtener todos los turnos con su fecha
    const turnos = await this.prisma.turno.findMany({
      where: whereBase,
      select: {
        inicio: true,
        estado: true,
      },
    });

    // Generar períodos según agrupación
    let periodos: Date[];
    let formatoPeriodo: string;

    switch (agrupacion) {
      case Agrupacion.SEMANA:
        periodos = eachWeekOfInterval(
          { start: fechaDesde, end: fechaHasta },
          { locale: es },
        );
        formatoPeriodo = "'Sem' w - MMM yyyy";
        break;
      case Agrupacion.MES:
        periodos = eachMonthOfInterval({ start: fechaDesde, end: fechaHasta });
        formatoPeriodo = 'MMMM yyyy';
        break;
      default: // DIA
        periodos = eachDayOfInterval({ start: fechaDesde, end: fechaHasta });
        formatoPeriodo = 'dd/MM/yyyy';
    }

    // Agrupar turnos por período
    for (const periodo of periodos) {
      let periodoInicio: Date;
      let periodoFin: Date;

      switch (agrupacion) {
        case Agrupacion.SEMANA:
          periodoInicio = startOfWeek(periodo, { locale: es });
          periodoFin = endOfWeek(periodo, { locale: es });
          break;
        case Agrupacion.MES:
          periodoInicio = startOfMonth(periodo);
          periodoFin = endOfMonth(periodo);
          break;
        default:
          periodoInicio = startOfDay(periodo);
          periodoFin = endOfDay(periodo);
      }

      const turnosDelPeriodo = turnos.filter(
        (t) => t.inicio >= periodoInicio && t.inicio <= periodoFin,
      );

      const turnosCount = turnosDelPeriodo.length;
      const completadosCount = turnosDelPeriodo.filter(
        (t) => t.estado === 'FINALIZADO',
      ).length;
      const ausentesCount = turnosDelPeriodo.filter(
        (t) => t.estado === 'AUSENTE',
      ).length;
      const canceladosCount = turnosDelPeriodo.filter(
        (t) => t.estado === 'CANCELADO',
      ).length;

      detalle.push({
        periodo: format(periodo, formatoPeriodo, { locale: es }),
        turnos: turnosCount,
        completados: completadosCount,
        ausentes: ausentesCount,
        cancelados: canceladosCount,
      });
    }

    return detalle;
  }

  /**
   * Tasa de ausentismo por paciente
   */
  async getReporteAusentismo(
    filters: ReporteAusentismoFiltersDto,
  ): Promise<ReporteAusentismo> {
    const { profesionalId, limite = 20 } = filters;

    // Determinar rango de fechas
    const fechaHasta = filters.fechaHasta
      ? endOfDay(parseISO(filters.fechaHasta))
      : endOfDay(new Date());
    const fechaDesde = filters.fechaDesde
      ? startOfDay(parseISO(filters.fechaDesde))
      : startOfDay(new Date(fechaHasta.getTime() - 90 * 24 * 60 * 60 * 1000)); // 90 días

    const whereBase = {
      inicio: {
        gte: fechaDesde,
        lte: fechaHasta,
      },
      ...(profesionalId && { profesionalId }),
    };

    // Obtener totales generales
    const [totalTurnos, totalAusencias] = await Promise.all([
      this.prisma.turno.count({ where: whereBase }),
      this.prisma.turno.count({
        where: { ...whereBase, estado: 'AUSENTE' },
      }),
    ]);

    // Obtener ausentismo por paciente usando raw query para mejor performance
    const ausentismoPorPaciente = await this.prisma.$queryRaw<
      Array<{
        pacienteId: string;
        nombreCompleto: string;
        turnosTotales: bigint;
        ausencias: bigint;
      }>
    >`
      SELECT
        p.id as "pacienteId",
        p."nombreCompleto",
        COUNT(t.id) as "turnosTotales",
        COUNT(CASE WHEN t.estado = 'AUSENTE' THEN 1 END) as "ausencias"
      FROM "Turno" t
      JOIN "Paciente" p ON t."pacienteId" = p.id
      WHERE t.inicio >= ${fechaDesde}
        AND t.inicio <= ${fechaHasta}
        ${profesionalId ? this.prisma.$queryRaw`AND t."profesionalId" = ${profesionalId}` : this.prisma.$queryRaw``}
      GROUP BY p.id, p."nombreCompleto"
      HAVING COUNT(CASE WHEN t.estado = 'AUSENTE' THEN 1 END) > 0
      ORDER BY COUNT(CASE WHEN t.estado = 'AUSENTE' THEN 1 END) DESC
      LIMIT ${limite}
    `;

    const porPaciente: AusentismoPorPaciente[] = ausentismoPorPaciente.map(
      (row) => {
        const turnosTotales = Number(row.turnosTotales);
        const ausencias = Number(row.ausencias);
        return {
          pacienteId: row.pacienteId,
          nombreCompleto: row.nombreCompleto,
          turnosTotales,
          ausencias,
          tasa:
            turnosTotales > 0
              ? Math.round((ausencias / turnosTotales) * 10000) / 100
              : 0,
        };
      },
    );

    const tasaGeneral =
      totalTurnos > 0
        ? Math.round((totalAusencias / totalTurnos) * 10000) / 100
        : 0;

    return {
      tasaGeneral,
      totalTurnos,
      totalAusencias,
      porPaciente,
    };
  }

  /**
   * Ocupación por profesional
   */
  async getReporteOcupacion(
    filters: ReporteFiltersDto,
  ): Promise<ReporteOcupacion> {
    const { profesionalId } = filters;

    // Determinar rango de fechas
    const fechaHasta = filters.fechaHasta
      ? endOfDay(parseISO(filters.fechaHasta))
      : endOfDay(new Date());
    const fechaDesde = filters.fechaDesde
      ? startOfDay(parseISO(filters.fechaDesde))
      : startOfDay(new Date(fechaHasta.getTime() - 30 * 24 * 60 * 60 * 1000));

    // Obtener profesionales
    const whereProfesional = profesionalId ? { id: profesionalId } : {};

    const profesionales = await this.prisma.profesional.findMany({
      where: whereProfesional,
      include: {
        usuario: {
          select: {
            nombre: true,
          },
        },
      },
    });

    const porProfesional: OcupacionPorProfesional[] = [];
    let totalAgendados = 0;
    let totalCompletados = 0;

    for (const prof of profesionales) {
      // Contar turnos del profesional
      const [agendados, completados] = await Promise.all([
        this.prisma.turno.count({
          where: {
            profesionalId: prof.id,
            inicio: { gte: fechaDesde, lte: fechaHasta },
            estado: { notIn: ['CANCELADO'] },
          },
        }),
        this.prisma.turno.count({
          where: {
            profesionalId: prof.id,
            inicio: { gte: fechaDesde, lte: fechaHasta },
            estado: 'FINALIZADO',
          },
        }),
      ]);

      // Calcular slots disponibles basado en agenda del profesional
      // Por ahora usamos un estimado simple (8 slots por día laboral)
      const diasEnRango = Math.ceil(
        (fechaHasta.getTime() - fechaDesde.getTime()) / (24 * 60 * 60 * 1000),
      );
      const diasLaborales = Math.ceil(diasEnRango * (5 / 7)); // ~71% días laborales
      const slotsDisponibles = diasLaborales * 8; // 8 turnos por día

      const tasaOcupacion =
        slotsDisponibles > 0
          ? Math.round((agendados / slotsDisponibles) * 10000) / 100
          : 0;
      const tasaEfectividad =
        agendados > 0
          ? Math.round((completados / agendados) * 10000) / 100
          : 0;

      totalAgendados += agendados;
      totalCompletados += completados;

      porProfesional.push({
        profesionalId: prof.id,
        nombre: prof.usuario.nombre,
        especialidad: prof.especialidad || 'General',
        turnosDisponibles: slotsDisponibles,
        turnosAgendados: agendados,
        turnosCompletados: completados,
        tasaOcupacion,
        tasaEfectividad,
      });
    }

    // Calcular tasa de ocupación general
    const totalDisponibles = porProfesional.reduce(
      (sum, p) => sum + p.turnosDisponibles,
      0,
    );
    const tasaOcupacionGeneral =
      totalDisponibles > 0
        ? Math.round((totalAgendados / totalDisponibles) * 10000) / 100
        : 0;

    return {
      tasaOcupacionGeneral,
      porProfesional,
    };
  }

  /**
   * Ranking de procedimientos más realizados
   */
  async getRankingProcedimientos(
    filters: ReporteProcedimientosFiltersDto,
  ): Promise<ReporteProcedimientos> {
    const { profesionalId, limite = 20 } = filters;

    // Determinar rango de fechas
    const fechaHasta = filters.fechaHasta
      ? endOfDay(parseISO(filters.fechaHasta))
      : endOfDay(new Date());
    const fechaDesde = filters.fechaDesde
      ? startOfDay(parseISO(filters.fechaDesde))
      : startOfDay(new Date(fechaHasta.getTime() - 90 * 24 * 60 * 60 * 1000));

    const whereBase = {
      fecha: {
        gte: fechaDesde,
        lte: fechaHasta,
      },
      ...(profesionalId && { profesionalId }),
    };

    // Obtener prácticas agrupadas por código
    const practicasAgrupadas = await this.prisma.practicaRealizada.groupBy({
      by: ['codigo', 'descripcion'],
      where: whereBase,
      _count: { _all: true },
      _sum: { monto: true },
      orderBy: { _count: { codigo: 'desc' } },
      take: limite,
    });

    // Calcular totales
    const totales = await this.prisma.practicaRealizada.aggregate({
      where: whereBase,
      _count: { _all: true },
      _sum: { monto: true },
    });

    const ranking: ProcedimientoRanking[] = practicasAgrupadas.map((p) => ({
      codigo: p.codigo,
      descripcion: p.descripcion,
      cantidad: p._count._all,
      ingresoTotal: this.decimalToNumber(p._sum.monto),
    }));

    return {
      totalProcedimientos: totales._count._all,
      ingresoTotal: this.decimalToNumber(totales._sum.monto),
      ranking,
    };
  }

  /**
   * Tracking de ventas de productos a pacientes
   */
  async getVentasProductos(
    filters: ReporteFiltersDto,
  ): Promise<ReporteVentasProductos> {
    const { profesionalId } = filters;

    // Determinar rango de fechas
    const fechaHasta = filters.fechaHasta
      ? endOfDay(parseISO(filters.fechaHasta))
      : endOfDay(new Date());
    const fechaDesde = filters.fechaDesde
      ? startOfDay(parseISO(filters.fechaDesde))
      : startOfDay(new Date(fechaHasta.getTime() - 30 * 24 * 60 * 60 * 1000));

    const whereBase = {
      fecha: {
        gte: fechaDesde,
        lte: fechaHasta,
      },
      ...(profesionalId && { profesionalId }),
    };

    // Obtener totales de ventas
    const totalesVenta = await this.prisma.ventaProducto.aggregate({
      where: whereBase,
      _sum: { total: true },
      _count: { _all: true },
    });

    // Obtener ventas por producto
    const ventasPorProductoRaw = await this.prisma.ventaProductoItem.groupBy({
      by: ['productoId'],
      where: {
        ventaProducto: whereBase,
      },
      _sum: { cantidad: true, subtotal: true },
    });

    // Obtener nombres de productos
    const productosIds = ventasPorProductoRaw.map((v) => v.productoId);
    const productos = await this.prisma.producto.findMany({
      where: { id: { in: productosIds } },
      select: { id: true, nombre: true },
    });

    const productosMap = new Map(productos.map((p) => [p.id, p.nombre]));

    const ventasPorProducto: VentaPorProducto[] = ventasPorProductoRaw
      .map((v) => ({
        productoId: v.productoId,
        nombre: productosMap.get(v.productoId) || 'Producto desconocido',
        cantidad: v._sum.cantidad || 0,
        ingresos: this.decimalToNumber(v._sum.subtotal),
      }))
      .sort((a, b) => b.ingresos - a.ingresos);

    // Obtener ventas por paciente
    const ventasPorPacienteRaw = await this.prisma.ventaProducto.groupBy({
      by: ['pacienteId'],
      where: {
        ...whereBase,
        pacienteId: { not: null },
      },
      _sum: { total: true },
      _count: { _all: true },
      _max: { fecha: true },
    });

    // Obtener nombres de pacientes
    const pacientesIds = ventasPorPacienteRaw
      .map((v) => v.pacienteId)
      .filter((id): id is string => id !== null);

    const pacientes = await this.prisma.paciente.findMany({
      where: { id: { in: pacientesIds } },
      select: { id: true, nombreCompleto: true },
    });

    const pacientesMap = new Map(
      pacientes.map((p) => [p.id, p.nombreCompleto]),
    );

    const ventasPorPaciente: VentaPorPaciente[] = ventasPorPacienteRaw
      .filter((v) => v.pacienteId !== null)
      .map((v) => ({
        pacienteId: v.pacienteId!,
        nombreCompleto:
          pacientesMap.get(v.pacienteId!) || 'Paciente desconocido',
        compras: v._count._all,
        montoTotal: this.decimalToNumber(v._sum.total),
        ultimaCompra: v._max.fecha!,
      }))
      .sort((a, b) => b.montoTotal - a.montoTotal);

    return {
      totalVentas: this.decimalToNumber(totalesVenta._sum.total),
      cantidadProductos: totalesVenta._count._all,
      ventasPorProducto,
      ventasPorPaciente,
    };
  }

  /**
   * Convierte un Decimal de Prisma a number
   */
  private decimalToNumber(value: Decimal | null): number {
    if (!value) return 0;
    return Number(value);
  }
}
