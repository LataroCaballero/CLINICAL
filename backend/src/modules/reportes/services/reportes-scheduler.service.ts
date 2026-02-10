import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from './email.service';
import { ReportesExportService } from './reportes-export.service';
import { ReportesDashboardService } from './reportes-dashboard.service';
import { ReportesFinancierosService } from './reportes-financieros.service';
import { ReportesOperativosService } from './reportes-operativos.service';
import {
  TipoReporteEmail,
  FrecuenciaReporte,
  ReporteSuscripcion,
} from '@prisma/client';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  format,
  addWeeks,
  addMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';

interface ReporteData {
  titulo: string;
  resumen: Record<string, string | number>;
  pdfBuffer: Buffer;
}

@Injectable()
export class ReportesSchedulerService {
  private readonly logger = new Logger(ReportesSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly exportService: ReportesExportService,
    private readonly dashboardService: ReportesDashboardService,
    private readonly financierosService: ReportesFinancierosService,
    private readonly operativosService: ReportesOperativosService,
  ) {}

  /**
   * Ejecuta todos los días a las 8:00 AM para procesar reportes pendientes
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async processScheduledReports(): Promise<void> {
    this.logger.log('Iniciando procesamiento de reportes programados...');

    try {
      // Obtener suscripciones que deben enviarse hoy
      const suscripcionesPendientes = await this.prisma.reporteSuscripcion.findMany({
        where: {
          activo: true,
          OR: [
            { proximoEnvio: null },
            { proximoEnvio: { lte: new Date() } },
          ],
        },
        include: {
          usuario: {
            include: {
              profesional: true,
            },
          },
        },
      });

      this.logger.log(
        `Encontradas ${suscripcionesPendientes.length} suscripciones pendientes`,
      );

      for (const suscripcion of suscripcionesPendientes) {
        await this.processSingleSubscription(suscripcion);
      }

      this.logger.log('Procesamiento de reportes completado');
    } catch (error) {
      this.logger.error('Error procesando reportes programados:', error);
    }
  }

  /**
   * Procesa una suscripción individual
   */
  private async processSingleSubscription(
    suscripcion: ReporteSuscripcion & {
      usuario: { email: string; nombre: string; apellido: string; profesional?: { id: string } | null };
    },
  ): Promise<void> {
    try {
      const profesionalId = suscripcion.usuario.profesional?.id;
      if (!profesionalId) {
        this.logger.warn(
          `Usuario ${suscripcion.usuarioId} no tiene profesional asociado`,
        );
        return;
      }

      // Calcular período según frecuencia
      const periodo = this.calculatePeriod(suscripcion.frecuencia);

      // Generar datos del reporte
      const reporteData = await this.generateReportData(
        suscripcion.tipoReporte,
        profesionalId,
        periodo,
      );

      // Determinar email destino
      const emailDestino = suscripcion.emailDestino || suscripcion.usuario.email;

      // Generar HTML del email
      const html = this.emailService.generateReportEmailHtml({
        nombreUsuario: `${suscripcion.usuario.nombre} ${suscripcion.usuario.apellido}`,
        tipoReporte: reporteData.titulo,
        periodo: periodo.label,
        resumen: reporteData.resumen,
      });

      // Enviar email
      const enviado = await this.emailService.sendEmail({
        to: emailDestino,
        subject: `[Clinical] ${reporteData.titulo} - ${periodo.label}`,
        html,
        attachments: [
          {
            filename: `reporte-${suscripcion.tipoReporte.toLowerCase()}-${periodo.fechaDesde}.pdf`,
            content: reporteData.pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      // Actualizar suscripción
      const proximoEnvio = this.calculateNextSendDate(suscripcion.frecuencia);
      await this.prisma.reporteSuscripcion.update({
        where: { id: suscripcion.id },
        data: {
          ultimoEnvio: enviado ? new Date() : undefined,
          proximoEnvio,
        },
      });

      if (enviado) {
        this.logger.log(
          `Reporte ${suscripcion.tipoReporte} enviado a ${emailDestino}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error procesando suscripción ${suscripcion.id}:`,
        error,
      );
    }
  }

  /**
   * Calcula el período del reporte según la frecuencia
   */
  private calculatePeriod(frecuencia: FrecuenciaReporte): {
    fechaDesde: string;
    fechaHasta: string;
    label: string;
  } {
    const now = new Date();

    if (frecuencia === FrecuenciaReporte.SEMANAL) {
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      return {
        fechaDesde: format(lastWeekStart, 'yyyy-MM-dd'),
        fechaHasta: format(lastWeekEnd, 'yyyy-MM-dd'),
        label: `Semana del ${format(lastWeekStart, 'd', { locale: es })} al ${format(lastWeekEnd, 'd \'de\' MMMM', { locale: es })}`,
      };
    } else {
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      return {
        fechaDesde: format(lastMonthStart, 'yyyy-MM-dd'),
        fechaHasta: format(lastMonthEnd, 'yyyy-MM-dd'),
        label: format(lastMonthStart, 'MMMM yyyy', { locale: es }),
      };
    }
  }

  /**
   * Calcula la próxima fecha de envío
   */
  private calculateNextSendDate(frecuencia: FrecuenciaReporte): Date {
    const now = new Date();
    if (frecuencia === FrecuenciaReporte.SEMANAL) {
      // Próximo lunes a las 8:00
      const nextMonday = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
      nextMonday.setHours(8, 0, 0, 0);
      return nextMonday;
    } else {
      // Primer día del próximo mes a las 8:00
      const nextMonth = startOfMonth(addMonths(now, 1));
      nextMonth.setHours(8, 0, 0, 0);
      return nextMonth;
    }
  }

  /**
   * Genera los datos del reporte según el tipo
   */
  private async generateReportData(
    tipoReporte: TipoReporteEmail,
    profesionalId: string,
    periodo: { fechaDesde: string; fechaHasta: string },
  ): Promise<ReporteData> {
    const filters = {
      profesionalId,
      fechaDesde: periodo.fechaDesde,
      fechaHasta: periodo.fechaHasta,
    };

    switch (tipoReporte) {
      case TipoReporteEmail.RESUMEN_SEMANAL:
      case TipoReporteEmail.RESUMEN_MENSUAL:
        return this.generateResumenReport(profesionalId, filters);

      case TipoReporteEmail.INGRESOS:
        return this.generateIngresosReport(filters);

      case TipoReporteEmail.TURNOS:
        return this.generateTurnosReport(filters);

      case TipoReporteEmail.MOROSIDAD:
        return this.generateMorosidadReport(profesionalId);

      default:
        throw new Error(`Tipo de reporte no soportado: ${tipoReporte}`);
    }
  }

  private async generateResumenReport(
    profesionalId: string,
    filters: { fechaDesde: string; fechaHasta: string },
  ): Promise<ReporteData> {
    const [turnos, ingresos] = await Promise.all([
      this.operativosService.getReporteTurnos({
        ...filters,
        profesionalId,
      }),
      this.financierosService.getReporteIngresos({
        ...filters,
        profesionalId,
      }),
    ]);

    const pdfResult = await this.exportService.exportarReporte({
      tipoReporte: 'dashboard',
      formato: 'pdf',
      filtros: { ...filters, profesionalId },
      titulo: 'Resumen General',
    });

    return {
      titulo: 'Resumen General',
      resumen: {
        'Total Turnos': turnos.total,
        'Turnos Completados': turnos.completados,
        'Tasa de Asistencia': `${turnos.tasaCompletado.toFixed(1)}%`,
        'Ingresos Totales': this.formatCurrency(ingresos.totalIngresos),
        'Transacciones': ingresos.cantidadTransacciones,
        'Ticket Promedio': this.formatCurrency(ingresos.ticketPromedio),
      },
      pdfBuffer: pdfResult.data as Buffer,
    };
  }

  private async generateIngresosReport(filters: {
    profesionalId: string;
    fechaDesde: string;
    fechaHasta: string;
  }): Promise<ReporteData> {
    const ingresos = await this.financierosService.getReporteIngresos(filters);

    const pdfResult = await this.exportService.exportarReporte({
      tipoReporte: 'ingresos',
      formato: 'pdf',
      filtros: filters,
      titulo: 'Reporte de Ingresos',
    });

    return {
      titulo: 'Reporte de Ingresos',
      resumen: {
        'Ingresos Totales': this.formatCurrency(ingresos.totalIngresos),
        'Cantidad de Transacciones': ingresos.cantidadTransacciones,
        'Ticket Promedio': this.formatCurrency(ingresos.ticketPromedio),
      },
      pdfBuffer: pdfResult.data as Buffer,
    };
  }

  private async generateTurnosReport(filters: {
    profesionalId: string;
    fechaDesde: string;
    fechaHasta: string;
  }): Promise<ReporteData> {
    const turnos = await this.operativosService.getReporteTurnos(filters);

    const pdfResult = await this.exportService.exportarReporte({
      tipoReporte: 'turnos',
      formato: 'pdf',
      filtros: filters,
      titulo: 'Reporte de Turnos',
    });

    return {
      titulo: 'Reporte de Turnos',
      resumen: {
        'Total Turnos': turnos.total,
        'Completados': turnos.completados,
        'Cancelados': turnos.cancelados,
        'Ausentes': turnos.ausentes,
        'Tasa de Asistencia': `${turnos.tasaCompletado.toFixed(1)}%`,
      },
      pdfBuffer: pdfResult.data as Buffer,
    };
  }

  private async generateMorosidadReport(
    profesionalId: string,
  ): Promise<ReporteData> {
    const morosidad = await this.financierosService.getMorosidad({
      profesionalId,
      diasVencimiento: 30,
      limite: 50,
    });

    const pdfResult = await this.exportService.exportarReporte({
      tipoReporte: 'morosidad',
      formato: 'pdf',
      filtros: { profesionalId },
      titulo: 'Reporte de Morosidad',
    });

    return {
      titulo: 'Reporte de Morosidad',
      resumen: {
        'Índice de Morosidad': `${morosidad.indiceGeneral.toFixed(1)}%`,
        'Monto Total Moroso': this.formatCurrency(morosidad.montoTotalMoroso),
        'Cuentas Morosas': morosidad.cantidadCuentasMorosas,
      },
      pdfBuffer: pdfResult.data as Buffer,
    };
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(value);
  }

  /**
   * Método público para enviar un reporte de prueba
   */
  async sendTestReport(
    usuarioId: string,
    tipoReporte: TipoReporteEmail,
    emailDestino?: string,
  ): Promise<boolean> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { profesional: true },
    });

    if (!usuario || !usuario.profesional) {
      throw new Error('Usuario o profesional no encontrado');
    }

    const frecuencia =
      tipoReporte === TipoReporteEmail.RESUMEN_SEMANAL
        ? FrecuenciaReporte.SEMANAL
        : FrecuenciaReporte.MENSUAL;

    const periodo = this.calculatePeriod(frecuencia);
    const reporteData = await this.generateReportData(
      tipoReporte,
      usuario.profesional.id,
      periodo,
    );

    const html = this.emailService.generateReportEmailHtml({
      nombreUsuario: `${usuario.nombre} ${usuario.apellido}`,
      tipoReporte: reporteData.titulo,
      periodo: periodo.label,
      resumen: reporteData.resumen,
    });

    return this.emailService.sendEmail({
      to: emailDestino || usuario.email,
      subject: `[Clinical - PRUEBA] ${reporteData.titulo} - ${periodo.label}`,
      html,
      attachments: [
        {
          filename: `reporte-prueba-${tipoReporte.toLowerCase()}.pdf`,
          content: reporteData.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }
}
