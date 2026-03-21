import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CuentasCorrientesService } from '../cuentas-corrientes/cuentas-corrientes.service';
import {
  CreatePagoDto,
  PagosFiltersDto,
  CreateFacturaDto,
  FacturasFiltersDto,
  LiquidacionesFiltersDto,
  ReporteFiltersDto,
  CreateLoteDto,
} from './dto/finanzas.dto';
import { getMonthBoundariesART } from './utils/month-boundaries';
import {
  TipoMovimiento,
  EstadoLiquidacion,
  EstadoFactura,
} from '@prisma/client';
import { CAE_QUEUE } from './processors/cae-emission.processor';

@Injectable()
export class FinanzasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentasCorrientesService: CuentasCorrientesService,
    @InjectQueue(CAE_QUEUE) private readonly caeQueue: Queue,
  ) {}

  /**
   * Dashboard KPIs
   */
  async getDashboard(profesionalId?: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const whereClause: any = {
      tipo: TipoMovimiento.PAGO,
      anulado: false,
    };

    if (profesionalId) {
      whereClause.cuentaCorriente = {
        paciente: {
          profesionalId,
        },
      };
    }

    // Ingresos del mes
    const ingresosMes = await this.prisma.movimientoCC.aggregate({
      where: {
        ...whereClause,
        fecha: { gte: startOfMonth },
      },
      _sum: { monto: true },
      _count: true,
    });

    // Ingresos de hoy
    const ingresosHoy = await this.prisma.movimientoCC.aggregate({
      where: {
        ...whereClause,
        fecha: { gte: startOfDay },
      },
      _sum: { monto: true },
    });

    // Total cuentas por cobrar
    const cuentasPorCobrar = await this.prisma.cuentaCorriente.aggregate({
      where: profesionalId
        ? {
            paciente: { profesionalId },
            saldoActual: { gt: 0 },
          }
        : { saldoActual: { gt: 0 } },
      _sum: { saldoActual: true },
      _count: true,
    });

    // Presupuestos pendientes
    const presupuestosPendientes = await this.prisma.presupuesto.count({
      where: {
        ...(profesionalId ? { profesionalId } : {}),
        estado: 'ENVIADO',
      },
    });

    // Prácticas pendientes de liquidación
    const practicasPendientes = await this.prisma.practicaRealizada.count({
      where: {
        ...(profesionalId ? { profesionalId } : {}),
        estadoLiquidacion: EstadoLiquidacion.PENDIENTE,
      },
    });

    return {
      ingresosMes: Number(ingresosMes._sum.monto || 0),
      ingresosHoy: Number(ingresosHoy._sum.monto || 0),
      cantidadPagosMes: ingresosMes._count,
      cuentasPorCobrar: Number(cuentasPorCobrar._sum.saldoActual || 0),
      cantidadDeudores: cuentasPorCobrar._count,
      presupuestosPendientes,
      practicasPendientes,
    };
  }

  /**
   * Ingresos por día (últimos N días)
   */
  async getIngresosPorDia(profesionalId?: string, dias: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dias);

    const whereClause: any = {
      tipo: TipoMovimiento.PAGO,
      anulado: false,
      fecha: { gte: startDate },
    };

    if (profesionalId) {
      whereClause.cuentaCorriente = {
        paciente: { profesionalId },
      };
    }

    const pagos = await this.prisma.movimientoCC.findMany({
      where: whereClause,
      select: {
        monto: true,
        fecha: true,
      },
      orderBy: { fecha: 'asc' },
    });

    // Agrupar por día
    const porDia: Record<
      string,
      { fecha: string; total: number; cantidad: number }
    > = {};

    for (const pago of pagos) {
      const fecha = pago.fecha.toISOString().split('T')[0];
      if (!porDia[fecha]) {
        porDia[fecha] = { fecha, total: 0, cantidad: 0 };
      }
      porDia[fecha].total += Number(pago.monto);
      porDia[fecha].cantidad += 1;
    }

    return Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  /**
   * Ingresos por obra social
   */
  async getIngresosPorObraSocial(profesionalId?: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const whereClause: any = {
      tipo: TipoMovimiento.PAGO,
      anulado: false,
      fecha: { gte: startOfMonth },
    };

    if (profesionalId) {
      whereClause.cuentaCorriente = {
        paciente: { profesionalId },
      };
    }

    const pagos = await this.prisma.movimientoCC.findMany({
      where: whereClause,
      include: {
        cuentaCorriente: {
          include: {
            paciente: {
              include: {
                obraSocial: { select: { id: true, nombre: true } },
              },
            },
          },
        },
      },
    });

    // Agrupar por obra social
    const porOS: Record<
      string,
      { obraSocialId: string | null; nombre: string; total: number }
    > = {};

    for (const pago of pagos) {
      const os = pago.cuentaCorriente.paciente.obraSocial;
      const key = os?.id || 'particular';
      const nombre = os?.nombre || 'Particular';

      if (!porOS[key]) {
        porOS[key] = { obraSocialId: os?.id || null, nombre, total: 0 };
      }
      porOS[key].total += Number(pago.monto);
    }

    return Object.values(porOS).sort((a, b) => b.total - a.total);
  }

  /**
   * Lista de pagos con filtros
   */
  async getPagos(filters: PagosFiltersDto) {
    const whereClause: any = {
      tipo: TipoMovimiento.PAGO,
    };

    if (filters.fechaDesde) {
      whereClause.fecha = {
        ...whereClause.fecha,
        gte: new Date(filters.fechaDesde),
      };
    }
    if (filters.fechaHasta) {
      whereClause.fecha = {
        ...whereClause.fecha,
        lte: new Date(filters.fechaHasta + 'T23:59:59'),
      };
    }
    if (filters.medioPago) {
      whereClause.medioPago = filters.medioPago;
    }
    if (filters.profesionalId) {
      whereClause.cuentaCorriente = {
        paciente: { profesionalId: filters.profesionalId },
      };
    }

    const pagos = await this.prisma.movimientoCC.findMany({
      where: whereClause,
      include: {
        cuentaCorriente: {
          include: {
            paciente: {
              select: {
                id: true,
                nombreCompleto: true,
                dni: true,
              },
            },
          },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    return pagos.map((p) => ({
      id: p.id,
      monto: Number(p.monto),
      medioPago: p.medioPago,
      descripcion: p.descripcion,
      referencia: p.referencia,
      fecha: p.fecha,
      anulado: p.anulado,
      paciente: p.cuentaCorriente.paciente,
    }));
  }

  /**
   * Crear un pago
   */
  async createPago(dto: CreatePagoDto, usuarioId?: string) {
    return this.cuentasCorrientesService.createMovimiento(dto.pacienteId, {
      monto: dto.monto,
      tipo: TipoMovimiento.PAGO,
      medioPago: dto.medioPago,
      descripcion: dto.descripcion || 'Pago recibido',
      referencia: dto.referencia,
      usuarioId,
    });
  }

  /**
   * Lista de facturas con filtros
   */
  async getFacturas(filters: FacturasFiltersDto) {
    const whereClause: any = {};

    if (filters.fechaDesde) {
      whereClause.fecha = {
        ...whereClause.fecha,
        gte: new Date(filters.fechaDesde),
      };
    }
    if (filters.fechaHasta) {
      whereClause.fecha = {
        ...whereClause.fecha,
        lte: new Date(filters.fechaHasta + 'T23:59:59'),
      };
    }
    if (filters.tipo) {
      whereClause.tipo = filters.tipo;
    }
    if (filters.profesionalId) {
      whereClause.profesionalId = filters.profesionalId;
    }

    const facturas = await this.prisma.factura.findMany({
      where: whereClause,
      include: {
        profesional: {
          include: {
            usuario: { select: { nombre: true, apellido: true } },
          },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    return facturas.map((f) => ({
      id: f.id,
      tipo: f.tipo,
      numero: f.numero,
      fecha: f.fecha,
      estado: f.estado,
      cuit: f.cuit,
      razonSocial: f.razonSocial,
      subtotal: Number(f.subtotal),
      impuestos: Number(f.impuestos),
      total: Number(f.total),
      profesional: {
        id: f.profesional.id,
        nombre: `${f.profesional.usuario.nombre} ${f.profesional.usuario.apellido}`,
      },
    }));
  }

  /**
   * Crear una factura
   */
  async createFactura(dto: CreateFacturaDto) {
    // Generar número de factura
    const lastFactura = await this.prisma.factura.findFirst({
      where: { profesionalId: dto.profesionalId },
      orderBy: { numero: 'desc' },
    });

    const nextNumber = lastFactura
      ? String(parseInt(lastFactura.numero.replace(/\D/g, '')) + 1).padStart(
          8,
          '0',
        )
      : '00000001';

    const prefix = dto.tipo === 'FACTURA' ? 'FAC-' : 'REC-';

    const factura = await this.prisma.factura.create({
      data: {
        tipo: dto.tipo,
        numero: `${prefix}${nextNumber}`,
        cuit: dto.cuit,
        razonSocial: dto.razonSocial,
        domicilio: dto.domicilio,
        condicionIVAReceptor: dto.condicionIVAReceptor ?? 'CONSUMIDOR_FINAL',
        concepto: dto.concepto,
        subtotal: dto.subtotal,
        impuestos: dto.impuestos,
        total: dto.total,
        profesionalId: dto.profesionalId,
        movimientoId: dto.movimientoId,
        obraSocialId: dto.obraSocialId,
        pacienteId: dto.pacienteId,
      },
    });

    return {
      id: factura.id,
      tipo: factura.tipo,
      numero: factura.numero,
      fecha: factura.fecha,
      estado: factura.estado,
      total: Number(factura.total),
    };
  }

  /**
   * Anular una factura
   */
  async anularFactura(facturaId: string) {
    const factura = await this.prisma.factura.findUnique({
      where: { id: facturaId },
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    if (factura.estado === EstadoFactura.ANULADA) {
      throw new BadRequestException('La factura ya está anulada');
    }

    await this.prisma.factura.update({
      where: { id: facturaId },
      data: { estado: EstadoFactura.ANULADA },
    });

    return { success: true, message: 'Factura anulada' };
  }

  /**
   * Prácticas pendientes de liquidación
   */
  async getPracticasPendientes(filters: LiquidacionesFiltersDto) {
    const whereClause: any = {};

    if (filters.estadoLiquidacion) {
      whereClause.estadoLiquidacion = filters.estadoLiquidacion;
    }
    if (filters.profesionalId) {
      whereClause.profesionalId = filters.profesionalId;
    }
    if (filters.obraSocialId) {
      whereClause.obraSocialId = filters.obraSocialId;
    }

    const practicas = await this.prisma.practicaRealizada.findMany({
      where: whereClause,
      include: {
        Profesional: {
          include: {
            usuario: { select: { nombre: true, apellido: true } },
          },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    // Get patient data separately for practices
    const practicasWithPatients = await Promise.all(
      practicas.map(async (p) => {
        const paciente = await this.prisma.paciente.findUnique({
          where: { id: p.pacienteId },
          select: {
            id: true,
            nombreCompleto: true,
            dni: true,
            obraSocial: { select: { id: true, nombre: true } },
          },
        });

        return {
          id: p.id,
          pacienteId: p.pacienteId,
          codigo: p.codigo,
          descripcion: p.descripcion,
          monto: Number(p.monto),
          coseguro: Number(p.coseguro),
          fecha: p.fecha,
          estadoLiquidacion: p.estadoLiquidacion,
          paciente,
          obraSocial: paciente?.obraSocial || null,
        };
      }),
    );

    return practicasWithPatients;
  }

  /**
   * Marcar prácticas como pagadas
   * @deprecated Use crearLoteLiquidacion for atomic settlement with LiquidacionObraSocial.
   * Kept for backward compatibility with existing callers.
   */
  async marcarPracticasPagadas(practicaIds: string[]) {
    await this.prisma.practicaRealizada.updateMany({
      where: { id: { in: practicaIds } },
      data: { estadoLiquidacion: EstadoLiquidacion.PAGADO },
    });

    return { success: true, count: practicaIds.length };
  }

  /**
   * Cierre mensual
   */
  async getCierreMensual(mes: string, profesionalId?: string) {
    const [year, month] = mes.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const whereClause: any = {
      fecha: { gte: startDate, lte: endDate },
    };

    if (profesionalId) {
      whereClause.profesionalId = profesionalId;
    }

    // Prácticas del mes agrupadas por obra social
    const practicas = await this.prisma.practicaRealizada.findMany({
      where: whereClause,
      include: {
        Profesional: true,
      },
    });

    // Get all unique pacienteIds and fetch their data
    const pacienteIds = [...new Set(practicas.map((p) => p.pacienteId))];
    const pacientes = await this.prisma.paciente.findMany({
      where: { id: { in: pacienteIds } },
      include: {
        obraSocial: { select: { id: true, nombre: true } },
      },
    });
    const pacienteMap = new Map(pacientes.map((p) => [p.id, p]));

    // Agrupar por obra social
    const porObraSocial: Record<
      string,
      {
        obraSocialId: string | null;
        nombre: string;
        total: number;
        facturado: number;
        pendiente: number;
      }
    > = {};

    let totalParticulares = 0;
    let totalObrasSociales = 0;

    for (const p of practicas) {
      const paciente = pacienteMap.get(p.pacienteId);
      const os = paciente?.obraSocial;
      const key = os?.id || 'particular';
      const nombre = os?.nombre || 'Particular';
      const monto = Number(p.monto);

      if (!porObraSocial[key]) {
        porObraSocial[key] = {
          obraSocialId: os?.id || null,
          nombre,
          total: 0,
          facturado: 0,
          pendiente: 0,
        };
      }
      porObraSocial[key].total += monto;

      if (p.estadoLiquidacion === EstadoLiquidacion.PAGADO) {
        porObraSocial[key].facturado += monto;
      } else {
        porObraSocial[key].pendiente += monto;
      }

      if (os) {
        totalObrasSociales += monto;
      } else {
        totalParticulares += monto;
      }
    }

    // Total de ingresos del mes (pagos recibidos)
    const ingresosWhereClause: any = {
      tipo: TipoMovimiento.PAGO,
      anulado: false,
      fecha: { gte: startDate, lte: endDate },
    };

    if (profesionalId) {
      ingresosWhereClause.cuentaCorriente = {
        paciente: { profesionalId },
      };
    }

    const totalClinica = await this.prisma.movimientoCC.aggregate({
      where: ingresosWhereClause,
      _sum: { monto: true },
    });

    return {
      mes,
      totalObrasSociales,
      totalParticulares,
      totalClinica: Number(totalClinica._sum.monto || 0),
      totalGlobal: totalObrasSociales + totalParticulares,
      detalleObrasSociales: Object.values(porObraSocial).filter(
        (os) => os.obraSocialId !== null,
      ),
    };
  }

  /**
   * Reporte de ingresos
   */
  async getReporteIngresos(filters: ReporteFiltersDto) {
    const whereClause: any = {
      tipo: TipoMovimiento.PAGO,
      anulado: false,
    };

    if (filters.fechaDesde) {
      whereClause.fecha = {
        ...whereClause.fecha,
        gte: new Date(filters.fechaDesde),
      };
    }
    if (filters.fechaHasta) {
      whereClause.fecha = {
        ...whereClause.fecha,
        lte: new Date(filters.fechaHasta + 'T23:59:59'),
      };
    }
    if (filters.profesionalId) {
      whereClause.cuentaCorriente = {
        paciente: { profesionalId: filters.profesionalId },
      };
    }

    const pagos = await this.prisma.movimientoCC.findMany({
      where: whereClause,
      include: {
        cuentaCorriente: {
          include: {
            paciente: {
              include: {
                obraSocial: { select: { id: true, nombre: true } },
              },
            },
          },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    // Totales por medio de pago
    const porMedioPago: Record<string, number> = {};
    // Totales por obra social
    const porObraSocial: Record<string, { nombre: string; total: number }> = {};
    // Por día
    const porDia: Record<string, number> = {};

    let total = 0;

    for (const pago of pagos) {
      const monto = Number(pago.monto);
      total += monto;

      // Por medio de pago
      const medio = pago.medioPago || 'OTRO';
      porMedioPago[medio] = (porMedioPago[medio] || 0) + monto;

      // Por obra social
      const os = pago.cuentaCorriente.paciente.obraSocial;
      const osKey = os?.id || 'particular';
      if (!porObraSocial[osKey]) {
        porObraSocial[osKey] = { nombre: os?.nombre || 'Particular', total: 0 };
      }
      porObraSocial[osKey].total += monto;

      // Por día
      const dia = pago.fecha.toISOString().split('T')[0];
      porDia[dia] = (porDia[dia] || 0) + monto;
    }

    return {
      total,
      cantidad: pagos.length,
      porMedioPago: Object.entries(porMedioPago).map(([medio, total]) => ({
        medio,
        total,
      })),
      porObraSocial: Object.entries(porObraSocial).map(([id, data]) => ({
        obraSocialId: id === 'particular' ? null : id,
        nombre: data.nombre,
        total: data.total,
      })),
      porDia: Object.entries(porDia)
        .map(([fecha, total]) => ({ fecha, total }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    };
  }

  /**
   * Returns the available billing limit for a professional in a given month.
   * Uses ART (UTC-3, no DST) boundaries to compute the emitido total.
   *
   * @param profesionalId - The professional's ID
   * @param mes - Month in 'YYYY-MM' format
   */
  async getLimiteDisponible(
    profesionalId: string,
    mes: string,
  ): Promise<{ limite: number | null; emitido: number; disponible: number | null }> {
    const { start, end } = getMonthBoundariesART(mes);

    const [limiteRecord, facturaAggregate] = await Promise.all([
      this.prisma.limiteFacturacionMensual.findUnique({
        where: { profesionalId_mes: { profesionalId, mes } },
      }),
      this.prisma.factura.aggregate({
        where: {
          profesionalId,
          fecha: { gte: start, lte: end },
          estado: EstadoFactura.EMITIDA,
        },
        _sum: { total: true },
      }),
    ]);

    const limite = limiteRecord?.limite != null ? Number(limiteRecord.limite) : null;
    const emitido = Number(facturaAggregate._sum.total ?? 0);
    const disponible = limite !== null ? limite - emitido : null;

    return { limite, emitido, disponible };
  }

  /**
   * Upserts the monthly billing limit for a professional.
   *
   * @param profesionalId - The professional's ID
   * @param mes - Month in 'YYYY-MM' format
   * @param limite - The limit amount (null to clear it)
   */
  async setLimiteMensual(
    profesionalId: string,
    mes: string,
    limite: number | null,
  ) {
    return this.prisma.limiteFacturacionMensual.upsert({
      where: { profesionalId_mes: { profesionalId, mes } },
      update: { limite },
      create: { profesionalId, mes, limite },
    });
  }

  /**
   * Returns pending practices grouped by obra social (no N+1 queries).
   * Single findMany to fetch practices + a batched patient lookup.
   *
   * @param profesionalId - The professional's ID
   */
  async getPracticasPendientesAgrupadas(profesionalId: string): Promise<
    Array<{
      obraSocialId: string | null;
      nombre: string;
      count: number;
      total: number;
    }>
  > {
    const practicas = await this.prisma.practicaRealizada.findMany({
      where: {
        profesionalId,
        estadoLiquidacion: EstadoLiquidacion.PENDIENTE,
        obraSocialId: { not: null },
      },
      select: {
        id: true,
        obraSocialId: true,
        monto: true,
        montoPagado: true,
      },
    });

    // Collect unique obra social IDs
    const obraSocialIds = [
      ...new Set(practicas.map((p) => p.obraSocialId).filter(Boolean) as string[]),
    ];

    // Batch fetch obras sociales
    const obrasSociales = await this.prisma.obraSocial.findMany({
      where: { id: { in: obraSocialIds } },
      select: { id: true, nombre: true },
    });
    const osMap = new Map(obrasSociales.map((os) => [os.id, os.nombre]));

    // Group by obraSocialId
    const groups: Record<
      string,
      { obraSocialId: string; nombre: string; count: number; total: number }
    > = {};

    for (const p of practicas) {
      const osId = p.obraSocialId!;
      if (!groups[osId]) {
        groups[osId] = {
          obraSocialId: osId,
          nombre: osMap.get(osId) || 'Desconocida',
          count: 0,
          total: 0,
        };
      }
      groups[osId].count += 1;
      groups[osId].total += Number(p.montoPagado ?? p.monto);
    }

    return Object.values(groups).sort((a, b) => b.total - a.total);
  }

  /**
   * Returns the list of pending practices for a specific professional + obra social.
   * Used for lote preparation (selecting which practices to settle).
   *
   * @param profesionalId - The professional's ID
   * @param obraSocialId - The obra social's ID
   */
  async getPracticasPendientesPorOS(
    profesionalId: string,
    obraSocialId: string,
  ) {
    const practicas = await this.prisma.practicaRealizada.findMany({
      where: {
        profesionalId,
        obraSocialId,
        estadoLiquidacion: EstadoLiquidacion.PENDIENTE,
      },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        monto: true,
        coseguro: true,
        montoPagado: true,
        fecha: true,
        estadoLiquidacion: true,
        pacienteId: true,
      },
      orderBy: { fecha: 'desc' },
    });

    // Batch fetch patient data
    const pacienteIds = [...new Set(practicas.map((p) => p.pacienteId))];
    const pacientes = await this.prisma.paciente.findMany({
      where: { id: { in: pacienteIds } },
      select: { id: true, nombreCompleto: true, dni: true },
    });
    const pacienteMap = new Map(pacientes.map((p) => [p.id, p]));

    return practicas.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      descripcion: p.descripcion,
      monto: Number(p.monto),
      coseguro: Number(p.coseguro),
      montoPagado: p.montoPagado != null ? Number(p.montoPagado) : null,
      fecha: p.fecha,
      estadoLiquidacion: p.estadoLiquidacion,
      paciente: pacienteMap.get(p.pacienteId) || null,
    }));
  }

  /**
   * Returns liquidaciones with optional filters for profesionalId and periodo.
   * Ordered by createdAt desc. Includes _count of associated practicas.
   */
  async getLiquidaciones(filters: { profesionalId?: string; periodo?: string }) {
    return this.prisma.liquidacionObraSocial.findMany({
      where: {
        ...(filters.profesionalId
          ? { practicas: { some: { profesionalId: filters.profesionalId } } }
          : {}),
        ...(filters.periodo ? { periodo: filters.periodo } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { practicas: true } } },
    });
  }

  /**
   * Returns a single liquidacion by ID, including its associated practices.
   * Throws NotFoundException if not found.
   */
  async getLiquidacionById(id: string) {
    const liq = await this.prisma.liquidacionObraSocial.findUnique({
      where: { id },
      include: {
        practicas: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            monto: true,
            montoPagado: true,
            pacienteId: true,
          },
        },
      },
    });
    if (!liq) throw new NotFoundException('Liquidacion no encontrada');
    return liq;
  }

  /**
   * Updates montoPagado on a PracticaRealizada with audit fields corregidoPor and corregidoAt.
   * Used by FACTURADOR to correct the amount paid by an obra social for a specific practice.
   *
   * @param practicaId - The practice's ID
   * @param montoPagado - The corrected amount paid
   * @param usuarioId - Optional ID of the user making the correction
   */
  async actualizarMontoPagado(
    practicaId: string,
    montoPagado: number,
    usuarioId?: string,
  ) {
    const practica = await this.prisma.practicaRealizada.findUnique({
      where: { id: practicaId },
    });
    if (!practica) throw new NotFoundException('Práctica no encontrada');
    return this.prisma.practicaRealizada.update({
      where: { id: practicaId },
      data: {
        montoPagado,
        corregidoPor: usuarioId ?? null,
        corregidoAt: new Date(),
      },
    });
  }

  /**
   * Validates pre-conditions and enqueues a BullMQ job for async CAE emission.
   * Returns 202 Accepted with jobId. Client polls GET /finanzas/facturas/:id to check estado.
   *
   * Pre-conditions (validated BEFORE enqueueing to avoid retrying bad data):
   * - Factura exists and belongs to profesionalId
   * - Factura.estado is not EMISION_PENDIENTE (not already in-flight)
   * - Factura.condicionIVAReceptor is non-null (mandatory AFIP field from April 2026)
   * - ConfiguracionAFIP exists for the tenant (cert must be uploaded)
   *
   * @throws BadRequestException with Spanish message on any pre-condition failure
   */
  async emitirFactura(facturaId: string, profesionalId: string): Promise<{ jobId: string; status: string }> {
    // 1. Load Factura
    const factura = await this.prisma.factura.findFirst({
      where: { id: facturaId, profesionalId },
      select: { id: true, estado: true, condicionIVAReceptor: true },
    });

    if (!factura) {
      throw new BadRequestException('Factura no encontrada o no pertenece a este profesional.');
    }

    if (factura.estado === EstadoFactura.EMISION_PENDIENTE) {
      throw new BadRequestException('Esta factura ya tiene una emisión en curso. Esperá a que finalice.');
    }

    if (factura.condicionIVAReceptor === null) {
      // Guard per STATE.md Pitfall 2 — error 10242 from AFIP if missing
      throw new BadRequestException('Falta la condición de IVA del receptor. Completá el campo antes de emitir.');
    }

    // 2. Check AFIP config exists for tenant
    const afipConfig = await this.prisma.configuracionAFIP.findUnique({
      where: { profesionalId },
      select: { id: true },
    });

    if (!afipConfig) {
      throw new BadRequestException('No se encontró la configuración AFIP del consultorio. Subí el certificado desde Configuración > AFIP.');
    }

    // 3. Set transient estado — Facturador sees "en proceso" while job is in-flight
    await this.prisma.factura.update({
      where: { id: facturaId },
      data: { estado: EstadoFactura.EMISION_PENDIENTE },
    });

    // 4. Enqueue BullMQ job
    // Passing only identifiers — AfipRealService reads amounts from DB to enforce server-side totals.
    // attempts: 5 overrides the global default of 3 (AFIP may be slower than Meta API).
    const job = await this.caeQueue.add(
      'emit-cae',
      { facturaId, profesionalId },
      { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
    );

    return { jobId: job.id ?? '', status: 'EMISION_PENDIENTE' };
  }

  /**
   * Atomically creates a LiquidacionObraSocial and marks all included practices
   * as PAGADO, setting their liquidacionId FK. Server-side computes montoTotal
   * from actual practice data — never trusts client-provided totals.
   *
   * Uses interactive callback form of $transaction to ensure the FK reference
   * from PracticaRealizada.liquidacionId → LiquidacionObraSocial.id is valid.
   *
   * @param dto - CreateLoteDto with profesionalId, obraSocialId, periodo, practicaIds
   * @param usuarioId - Optional ID of the user performing the operation
   */
  async crearLoteLiquidacion(dto: CreateLoteDto, usuarioId?: string) {
    return this.prisma.$transaction(async (tx) => {
      // Fetch practices inside the transaction to compute montoTotal server-side
      const practicas = await tx.practicaRealizada.findMany({
        where: { id: { in: dto.practicaIds } },
        select: { id: true, monto: true, montoPagado: true },
      });

      // Sum montoPagado ?? monto (do NOT trust client-provided totals)
      const montoTotal = practicas.reduce((sum, p) => {
        return sum + Number(p.montoPagado ?? p.monto);
      }, 0);

      // Create the liquidacion record
      const liquidacion = await tx.liquidacionObraSocial.create({
        data: {
          obraSocialId: dto.obraSocialId,
          periodo: dto.periodo,
          montoTotal,
          usuarioId: usuarioId ?? null,
        },
      });

      // Atomically mark all practices as PAGADO with the new liquidacionId FK
      await tx.practicaRealizada.updateMany({
        where: { id: { in: dto.practicaIds } },
        data: {
          estadoLiquidacion: EstadoLiquidacion.PAGADO,
          liquidacionId: liquidacion.id,
        },
      });

      return liquidacion;
    });
  }
}
