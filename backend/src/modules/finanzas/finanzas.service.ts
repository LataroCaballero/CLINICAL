import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CuentasCorrientesService } from '../cuentas-corrientes/cuentas-corrientes.service';
import {
  CreatePagoDto,
  PagosFiltersDto,
  CreateFacturaDto,
  FacturasFiltersDto,
  LiquidacionesFiltersDto,
  ReporteFiltersDto,
} from './dto/finanzas.dto';
import { TipoMovimiento, EstadoLiquidacion, EstadoFactura } from '@prisma/client';

@Injectable()
export class FinanzasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentasCorrientesService: CuentasCorrientesService,
  ) {}

  /**
   * Dashboard KPIs
   */
  async getDashboard(profesionalId?: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
    const porDia: Record<string, { fecha: string; total: number; cantidad: number }> = {};

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
    const porOS: Record<string, { obraSocialId: string | null; nombre: string; total: number }> = {};

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
      whereClause.fecha = { ...whereClause.fecha, gte: new Date(filters.fechaDesde) };
    }
    if (filters.fechaHasta) {
      whereClause.fecha = { ...whereClause.fecha, lte: new Date(filters.fechaHasta + 'T23:59:59') };
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
      whereClause.fecha = { ...whereClause.fecha, gte: new Date(filters.fechaDesde) };
    }
    if (filters.fechaHasta) {
      whereClause.fecha = { ...whereClause.fecha, lte: new Date(filters.fechaHasta + 'T23:59:59') };
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
      ? String(parseInt(lastFactura.numero.replace(/\D/g, '')) + 1).padStart(8, '0')
      : '00000001';

    const prefix = dto.tipo === 'FACTURA' ? 'FAC-' : 'REC-';

    const factura = await this.prisma.factura.create({
      data: {
        tipo: dto.tipo,
        numero: `${prefix}${nextNumber}`,
        cuit: dto.cuit,
        razonSocial: dto.razonSocial,
        domicilio: dto.domicilio,
        condicionIVA: dto.condicionIVA,
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
      })
    );

    return practicasWithPatients;
  }

  /**
   * Marcar prácticas como pagadas
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
    const pacienteIds = [...new Set(practicas.map(p => p.pacienteId))];
    const pacientes = await this.prisma.paciente.findMany({
      where: { id: { in: pacienteIds } },
      include: {
        obraSocial: { select: { id: true, nombre: true } },
      },
    });
    const pacienteMap = new Map(pacientes.map(p => [p.id, p]));

    // Agrupar por obra social
    const porObraSocial: Record<string, {
      obraSocialId: string | null;
      nombre: string;
      total: number;
      facturado: number;
      pendiente: number;
    }> = {};

    let totalParticulares = 0;
    let totalObrasSociales = 0;

    for (const p of practicas) {
      const paciente = pacienteMap.get(p.pacienteId);
      const os = paciente?.obraSocial;
      const key = os?.id || 'particular';
      const nombre = os?.nombre || 'Particular';
      const monto = Number(p.monto);

      if (!porObraSocial[key]) {
        porObraSocial[key] = { obraSocialId: os?.id || null, nombre, total: 0, facturado: 0, pendiente: 0 };
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
      detalleObrasSociales: Object.values(porObraSocial).filter(os => os.obraSocialId !== null),
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
      whereClause.fecha = { ...whereClause.fecha, gte: new Date(filters.fechaDesde) };
    }
    if (filters.fechaHasta) {
      whereClause.fecha = { ...whereClause.fecha, lte: new Date(filters.fechaHasta + 'T23:59:59') };
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
      porMedioPago: Object.entries(porMedioPago).map(([medio, total]) => ({ medio, total })),
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
}
