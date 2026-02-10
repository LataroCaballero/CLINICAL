import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ReporteIngresosFiltersDto,
  ReporteFiltersDto,
  ReporteCuentasPorCobrarFiltersDto,
  ReporteMorosidadFiltersDto,
  Agrupacion,
} from '../dto';
import {
  ReporteIngresos,
  IngresosPorPeriodo,
  IngresosPorMedioPago,
  ReporteIngresosPorProfesional,
  IngresosPorProfesional,
  ReporteIngresosPorObraSocial,
  IngresosPorObraSocial,
  ReporteIngresosPorPrestacion,
  IngresosPorPrestacion,
  ReporteCuentasPorCobrar,
  CuentaPorCobrar,
  ReporteMorosidad,
  CuentaMorosa,
  ReportePagosPendientes,
  PagoPendienteDetalle,
  PagoPendientePorTipo,
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
  differenceInDays,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReportesFinancierosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ingresos por período con agrupación
   */
  async getReporteIngresos(
    filters: ReporteIngresosFiltersDto,
  ): Promise<ReporteIngresos> {
    const { profesionalId, agrupacion = Agrupacion.DIA } = filters;

    // Determinar rango de fechas
    const fechaHasta = filters.fechaHasta
      ? endOfDay(parseISO(filters.fechaHasta))
      : endOfDay(new Date());
    const fechaDesde = filters.fechaDesde
      ? startOfDay(parseISO(filters.fechaDesde))
      : startOfDay(new Date(fechaHasta.getTime() - 30 * 24 * 60 * 60 * 1000));

    // Base where para pagos
    const whereBase: any = {
      tipo: 'PAGO',
      anulado: false,
      fecha: {
        gte: fechaDesde,
        lte: fechaHasta,
      },
    };

    if (profesionalId) {
      whereBase.cuentaCorriente = {
        paciente: {
          profesionalId,
        },
      };
    }

    // Obtener totales
    const totales = await this.prisma.movimientoCC.aggregate({
      where: whereBase,
      _sum: { monto: true },
      _count: { _all: true },
    });

    const totalIngresos = this.decimalToNumber(totales._sum.monto);
    const cantidadTransacciones = totales._count._all;
    const ticketPromedio =
      cantidadTransacciones > 0 ? totalIngresos / cantidadTransacciones : 0;

    // Obtener ingresos por período
    const porPeriodo = await this.getIngresosPorPeriodo(
      whereBase,
      fechaDesde,
      fechaHasta,
      agrupacion,
    );

    // Obtener ingresos por medio de pago
    const porMedioPago = await this.getIngresosPorMedioPago(
      whereBase,
      totalIngresos,
    );

    return {
      totalIngresos: Math.round(totalIngresos * 100) / 100,
      cantidadTransacciones,
      ticketPromedio: Math.round(ticketPromedio * 100) / 100,
      porPeriodo,
      porMedioPago,
    };
  }

  /**
   * Obtiene ingresos agrupados por período
   */
  private async getIngresosPorPeriodo(
    whereBase: any,
    fechaDesde: Date,
    fechaHasta: Date,
    agrupacion: Agrupacion,
  ): Promise<IngresosPorPeriodo[]> {
    // Obtener todos los movimientos
    const movimientos = await this.prisma.movimientoCC.findMany({
      where: whereBase,
      select: {
        fecha: true,
        monto: true,
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
      default:
        periodos = eachDayOfInterval({ start: fechaDesde, end: fechaHasta });
        formatoPeriodo = 'dd/MM/yyyy';
    }

    const resultado: IngresosPorPeriodo[] = [];

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

      const movimientosDelPeriodo = movimientos.filter(
        (m) => m.fecha >= periodoInicio && m.fecha <= periodoFin,
      );

      const monto = movimientosDelPeriodo.reduce(
        (sum, m) => sum + this.decimalToNumber(m.monto),
        0,
      );

      resultado.push({
        periodo: format(periodo, formatoPeriodo, { locale: es }),
        monto: Math.round(monto * 100) / 100,
        cantidad: movimientosDelPeriodo.length,
      });
    }

    return resultado;
  }

  /**
   * Obtiene ingresos agrupados por medio de pago
   */
  private async getIngresosPorMedioPago(
    whereBase: any,
    totalIngresos: number,
  ): Promise<IngresosPorMedioPago[]> {
    const agrupados = await this.prisma.movimientoCC.groupBy({
      by: ['medioPago'],
      where: whereBase,
      _sum: { monto: true },
      _count: { _all: true },
    });

    return agrupados
      .filter((g) => g.medioPago !== null)
      .map((g) => {
        const monto = this.decimalToNumber(g._sum.monto);
        return {
          medio: this.formatMedioPago(g.medioPago!),
          monto: Math.round(monto * 100) / 100,
          cantidad: g._count._all,
          porcentaje:
            totalIngresos > 0
              ? Math.round((monto / totalIngresos) * 10000) / 100
              : 0,
        };
      })
      .sort((a, b) => b.monto - a.monto);
  }

  /**
   * Ingresos por profesional
   */
  async getIngresosPorProfesional(
    filters: ReporteFiltersDto,
  ): Promise<ReporteIngresosPorProfesional> {
    // Determinar rango de fechas
    const fechaHasta = filters.fechaHasta
      ? endOfDay(parseISO(filters.fechaHasta))
      : endOfDay(new Date());
    const fechaDesde = filters.fechaDesde
      ? startOfDay(parseISO(filters.fechaDesde))
      : startOfDay(new Date(fechaHasta.getTime() - 30 * 24 * 60 * 60 * 1000));

    // Obtener profesionales con sus ingresos usando raw query
    const ingresosPorProfesional = await this.prisma.$queryRaw<
      Array<{
        profesionalId: string;
        nombre: string;
        especialidad: string | null;
        ingresos: Decimal;
        cantidadTurnos: bigint;
      }>
    >`
      SELECT
        prof.id as "profesionalId",
        u.nombre,
        prof.especialidad,
        COALESCE(SUM(m.monto), 0) as ingresos,
        COUNT(DISTINCT t.id) as "cantidadTurnos"
      FROM "Profesional" prof
      JOIN "Usuario" u ON prof."usuarioId" = u.id
      LEFT JOIN "Paciente" pac ON pac."profesionalId" = prof.id
      LEFT JOIN "CuentaCorriente" cc ON cc."pacienteId" = pac.id
      LEFT JOIN "MovimientoCC" m ON m."cuentaCorrienteId" = cc.id
        AND m.tipo = 'PAGO'
        AND m.anulado = false
        AND m.fecha >= ${fechaDesde}
        AND m.fecha <= ${fechaHasta}
      LEFT JOIN "Turno" t ON t."profesionalId" = prof.id
        AND t.inicio >= ${fechaDesde}
        AND t.inicio <= ${fechaHasta}
        AND t.estado = 'FINALIZADO'
      GROUP BY prof.id, u.nombre, prof.especialidad
      ORDER BY ingresos DESC
    `;

    const totalIngresos = ingresosPorProfesional.reduce(
      (sum, p) => sum + this.decimalToNumber(p.ingresos),
      0,
    );

    const porProfesional: IngresosPorProfesional[] = ingresosPorProfesional.map(
      (p) => {
        const ingresos = this.decimalToNumber(p.ingresos);
        const cantidadTurnos = Number(p.cantidadTurnos);
        return {
          profesionalId: p.profesionalId,
          nombre: p.nombre,
          especialidad: p.especialidad || 'General',
          ingresos: Math.round(ingresos * 100) / 100,
          cantidadTurnos,
          ticketPromedio:
            cantidadTurnos > 0
              ? Math.round((ingresos / cantidadTurnos) * 100) / 100
              : 0,
          porcentajeTotal:
            totalIngresos > 0
              ? Math.round((ingresos / totalIngresos) * 10000) / 100
              : 0,
        };
      },
    );

    return {
      totalIngresos: Math.round(totalIngresos * 100) / 100,
      porProfesional,
    };
  }

  /**
   * Ingresos por obra social
   */
  async getIngresosPorObraSocial(
    filters: ReporteFiltersDto,
  ): Promise<ReporteIngresosPorObraSocial> {
    const { profesionalId } = filters;

    // Determinar rango de fechas
    const fechaHasta = filters.fechaHasta
      ? endOfDay(parseISO(filters.fechaHasta))
      : endOfDay(new Date());
    const fechaDesde = filters.fechaDesde
      ? startOfDay(parseISO(filters.fechaDesde))
      : startOfDay(new Date(fechaHasta.getTime() - 30 * 24 * 60 * 60 * 1000));

    // Obtener ingresos agrupados por obra social
    const ingresosPorOS = await this.prisma.$queryRaw<
      Array<{
        obraSocialId: string | null;
        nombre: string;
        ingresos: Decimal;
        cantidadPacientes: bigint;
        cantidadPracticas: bigint;
      }>
    >`
      SELECT
        os.id as "obraSocialId",
        COALESCE(os.nombre, 'Particular') as nombre,
        COALESCE(SUM(m.monto), 0) as ingresos,
        COUNT(DISTINCT pac.id) as "cantidadPacientes",
        COUNT(DISTINCT pr.id) as "cantidadPracticas"
      FROM "Paciente" pac
      LEFT JOIN "ObraSocial" os ON pac."obraSocialId" = os.id
      LEFT JOIN "CuentaCorriente" cc ON cc."pacienteId" = pac.id
      LEFT JOIN "MovimientoCC" m ON m."cuentaCorrienteId" = cc.id
        AND m.tipo = 'PAGO'
        AND m.anulado = false
        AND m.fecha >= ${fechaDesde}
        AND m.fecha <= ${fechaHasta}
      LEFT JOIN "PracticaRealizada" pr ON pr."pacienteId" = pac.id
        AND pr.fecha >= ${fechaDesde}
        AND pr.fecha <= ${fechaHasta}
      ${profesionalId ? this.prisma.$queryRaw`WHERE pac."profesionalId" = ${profesionalId}` : this.prisma.$queryRaw``}
      GROUP BY os.id, os.nombre
      ORDER BY ingresos DESC
    `;

    const totalIngresos = ingresosPorOS.reduce(
      (sum, os) => sum + this.decimalToNumber(os.ingresos),
      0,
    );

    const porObraSocial: IngresosPorObraSocial[] = ingresosPorOS.map((os) => {
      const ingresos = this.decimalToNumber(os.ingresos);
      return {
        obraSocialId: os.obraSocialId || 'particular',
        nombre: os.nombre,
        ingresos: Math.round(ingresos * 100) / 100,
        cantidadPacientes: Number(os.cantidadPacientes),
        cantidadPracticas: Number(os.cantidadPracticas),
        porcentajeTotal:
          totalIngresos > 0
            ? Math.round((ingresos / totalIngresos) * 10000) / 100
            : 0,
      };
    });

    return {
      totalIngresos: Math.round(totalIngresos * 100) / 100,
      porObraSocial,
    };
  }

  /**
   * Ingresos por prestación/práctica
   */
  async getIngresosPorPrestacion(
    filters: ReporteFiltersDto,
  ): Promise<ReporteIngresosPorPrestacion> {
    const { profesionalId } = filters;

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

    // Obtener prácticas agrupadas
    const practicasAgrupadas = await this.prisma.practicaRealizada.groupBy({
      by: ['codigo', 'descripcion'],
      where: whereBase,
      _count: { _all: true },
      _sum: { monto: true },
      orderBy: { _sum: { monto: 'desc' } },
    });

    // Calcular totales
    const totales = await this.prisma.practicaRealizada.aggregate({
      where: whereBase,
      _count: { _all: true },
      _sum: { monto: true },
    });

    const totalIngresos = this.decimalToNumber(totales._sum.monto);

    const porPrestacion: IngresosPorPrestacion[] = practicasAgrupadas.map(
      (p) => {
        const ingresoTotal = this.decimalToNumber(p._sum.monto);
        const cantidad = p._count._all;
        return {
          codigo: p.codigo,
          descripcion: p.descripcion,
          cantidad,
          ingresoTotal: Math.round(ingresoTotal * 100) / 100,
          promedioUnitario:
            cantidad > 0
              ? Math.round((ingresoTotal / cantidad) * 100) / 100
              : 0,
        };
      },
    );

    return {
      totalIngresos: Math.round(totalIngresos * 100) / 100,
      totalPrestaciones: totales._count._all,
      porPrestacion,
    };
  }

  /**
   * Cuentas por cobrar
   */
  async getCuentasPorCobrar(
    filters: ReporteCuentasPorCobrarFiltersDto,
  ): Promise<ReporteCuentasPorCobrar> {
    const { profesionalId, soloVencidas = false, limite = 100 } = filters;

    // Base where para cuentas con saldo
    const whereBase: any = {
      saldoActual: { gt: 0 },
    };

    if (profesionalId) {
      whereBase.paciente = {
        profesionalId,
      };
    }

    // Obtener cuentas con saldo
    const cuentas = await this.prisma.cuentaCorriente.findMany({
      where: whereBase,
      include: {
        paciente: {
          select: {
            id: true,
            nombreCompleto: true,
            telefono: true,
            email: true,
          },
        },
        movimientos: {
          where: { anulado: false },
          orderBy: { fecha: 'desc' },
          take: 1,
          select: { fecha: true },
        },
      },
      orderBy: { saldoActual: 'desc' },
      take: limite,
    });

    // Calcular totales
    const totales = await this.prisma.cuentaCorriente.aggregate({
      where: whereBase,
      _sum: { saldoActual: true },
      _count: { _all: true },
    });

    // Calcular saldo vencido (cargos > 30 días sin pagar completamente)
    // Por simplicidad, consideramos vencido si tiene saldo > 0 y último cargo > 30 días
    const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const cuentasConVencido = await this.prisma.cuentaCorriente.findMany({
      where: {
        ...whereBase,
        movimientos: {
          some: {
            tipo: 'CARGO',
            anulado: false,
            fecha: { lt: hace30dias },
          },
        },
      },
      select: { saldoActual: true },
    });

    const totalVencido = cuentasConVencido.reduce(
      (sum, c) => sum + this.decimalToNumber(c.saldoActual),
      0,
    );

    const cuentasList: CuentaPorCobrar[] = cuentas.map((c) => ({
      pacienteId: c.paciente.id,
      nombreCompleto: c.paciente.nombreCompleto,
      telefono: c.paciente.telefono,
      email: c.paciente.email,
      saldoActual: this.decimalToNumber(c.saldoActual),
      saldoVencido: 0, // Se podría calcular individualmente si es necesario
      ultimoMovimiento: c.movimientos[0]?.fecha || null,
    }));

    return {
      totalPorCobrar: this.decimalToNumber(totales._sum.saldoActual),
      totalVencido: Math.round(totalVencido * 100) / 100,
      cantidadCuentas: totales._count._all,
      cuentas: cuentasList,
    };
  }

  /**
   * Reporte de morosidad
   */
  async getMorosidad(
    filters: ReporteMorosidadFiltersDto,
  ): Promise<ReporteMorosidad> {
    const { profesionalId, diasVencimiento = 30, limite = 100 } = filters;

    const fechaLimite = new Date(
      Date.now() - diasVencimiento * 24 * 60 * 60 * 1000,
    );

    // Obtener cuentas morosas (con cargos viejos sin pagar)
    const cuentasMorosas = await this.prisma.$queryRaw<
      Array<{
        pacienteId: string;
        nombreCompleto: string;
        telefono: string;
        montoVencido: Decimal;
        ultimoCargo: Date;
        ultimoPago: Date | null;
      }>
    >`
      SELECT
        pac.id as "pacienteId",
        pac."nombreCompleto",
        pac.telefono,
        cc."saldoActual" as "montoVencido",
        MAX(CASE WHEN m.tipo = 'CARGO' THEN m.fecha END) as "ultimoCargo",
        MAX(CASE WHEN m.tipo = 'PAGO' THEN m.fecha END) as "ultimoPago"
      FROM "CuentaCorriente" cc
      JOIN "Paciente" pac ON cc."pacienteId" = pac.id
      LEFT JOIN "MovimientoCC" m ON m."cuentaCorrienteId" = cc.id AND m.anulado = false
      WHERE cc."saldoActual" > 0
        ${profesionalId ? this.prisma.$queryRaw`AND pac."profesionalId" = ${profesionalId}` : this.prisma.$queryRaw``}
      GROUP BY pac.id, pac."nombreCompleto", pac.telefono, cc."saldoActual"
      HAVING MAX(CASE WHEN m.tipo = 'CARGO' THEN m.fecha END) < ${fechaLimite}
      ORDER BY cc."saldoActual" DESC
      LIMIT ${limite}
    `;

    // Calcular totales
    const totalCuentas = await this.prisma.cuentaCorriente.count({
      where: {
        saldoActual: { gt: 0 },
        ...(profesionalId && { paciente: { profesionalId } }),
      },
    });

    const montoTotalMoroso = cuentasMorosas.reduce(
      (sum, c) => sum + this.decimalToNumber(c.montoVencido),
      0,
    );

    const indiceGeneral =
      totalCuentas > 0
        ? Math.round((cuentasMorosas.length / totalCuentas) * 10000) / 100
        : 0;

    const cuentasMorosasList: CuentaMorosa[] = cuentasMorosas.map((c) => ({
      pacienteId: c.pacienteId,
      nombreCompleto: c.nombreCompleto,
      telefono: c.telefono,
      montoVencido: this.decimalToNumber(c.montoVencido),
      diasMorosidad: c.ultimoCargo
        ? differenceInDays(new Date(), c.ultimoCargo)
        : diasVencimiento,
      ultimoPago: c.ultimoPago,
    }));

    return {
      indiceGeneral,
      montoTotalMoroso: Math.round(montoTotalMoroso * 100) / 100,
      cantidadCuentasMorosas: cuentasMorosas.length,
      cuentasMorosas: cuentasMorosasList,
    };
  }

  /**
   * Pagos pendientes
   */
  async getPagosPendientes(
    filters: ReporteFiltersDto,
  ): Promise<ReportePagosPendientes> {
    const { profesionalId } = filters;

    // Determinar rango de fechas
    const fechaHasta = filters.fechaHasta
      ? endOfDay(parseISO(filters.fechaHasta))
      : endOfDay(new Date());
    const fechaDesde = filters.fechaDesde
      ? startOfDay(parseISO(filters.fechaDesde))
      : startOfDay(
          new Date(fechaHasta.getTime() - 90 * 24 * 60 * 60 * 1000),
        );

    // Pagos pendientes = Cargos sin el pago correspondiente
    // Simplificamos: cuentas con saldo > 0 y sus últimos cargos

    const whereBase: any = {
      saldoActual: { gt: 0 },
    };

    if (profesionalId) {
      whereBase.paciente = { profesionalId };
    }

    // Obtener cuentas con saldo pendiente
    const cuentasPendientes = await this.prisma.cuentaCorriente.findMany({
      where: whereBase,
      include: {
        paciente: {
          select: {
            nombreCompleto: true,
          },
        },
        movimientos: {
          where: {
            tipo: 'CARGO',
            anulado: false,
            fecha: { gte: fechaDesde, lte: fechaHasta },
          },
          orderBy: { fecha: 'desc' },
          select: {
            id: true,
            monto: true,
            descripcion: true,
            fecha: true,
          },
        },
      },
    });

    // Agrupar por tipo de concepto
    const porTipoMap = new Map<string, { cantidad: number; monto: number }>();
    const detalle: PagoPendienteDetalle[] = [];

    let totalPendiente = 0;

    for (const cuenta of cuentasPendientes) {
      totalPendiente += this.decimalToNumber(cuenta.saldoActual);

      for (const mov of cuenta.movimientos) {
        const tipo = mov.descripcion?.split(' ')[0] || 'Otros';
        const montoMov = this.decimalToNumber(mov.monto);

        if (porTipoMap.has(tipo)) {
          const existing = porTipoMap.get(tipo)!;
          existing.cantidad += 1;
          existing.monto += montoMov;
        } else {
          porTipoMap.set(tipo, { cantidad: 1, monto: montoMov });
        }

        detalle.push({
          id: mov.id,
          paciente: cuenta.paciente.nombreCompleto,
          concepto: mov.descripcion || 'Sin descripción',
          monto: montoMov,
          fechaVencimiento: mov.fecha,
        });
      }
    }

    const porTipo: PagoPendientePorTipo[] = Array.from(porTipoMap.entries())
      .map(([tipo, data]) => ({
        tipo,
        cantidad: data.cantidad,
        monto: Math.round(data.monto * 100) / 100,
      }))
      .sort((a, b) => b.monto - a.monto);

    return {
      totalPendiente: Math.round(totalPendiente * 100) / 100,
      porTipo,
      detalle: detalle.slice(0, 100), // Limitar a 100 registros
    };
  }

  /**
   * Convierte un Decimal de Prisma a number
   */
  private decimalToNumber(value: Decimal | null): number {
    if (!value) return 0;
    return Number(value);
  }

  /**
   * Formatea el medio de pago a texto legible
   */
  private formatMedioPago(medio: string): string {
    const medios: Record<string, string> = {
      EFECTIVO: 'Efectivo',
      TRANSFERENCIA: 'Transferencia',
      TARJETA_DEBITO: 'Tarjeta Débito',
      TARJETA_CREDITO: 'Tarjeta Crédito',
      MERCADO_PAGO: 'Mercado Pago',
      OTRO: 'Otro',
    };
    return medios[medio] || medio;
  }
}
