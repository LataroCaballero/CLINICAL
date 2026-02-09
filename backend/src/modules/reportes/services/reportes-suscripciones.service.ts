import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  TipoReporteEmail,
  FrecuenciaReporte,
  ReporteSuscripcion,
} from '@prisma/client';
import { addWeeks, addMonths, startOfWeek, startOfMonth } from 'date-fns';

export interface CreateSuscripcionDto {
  tipoReporte: TipoReporteEmail;
  frecuencia: FrecuenciaReporte;
  emailDestino?: string;
}

export interface UpdateSuscripcionDto {
  frecuencia?: FrecuenciaReporte;
  emailDestino?: string | null;
  activo?: boolean;
}

export interface SuscripcionResumen {
  id: string;
  tipoReporte: TipoReporteEmail;
  frecuencia: FrecuenciaReporte;
  emailDestino: string | null;
  activo: boolean;
  ultimoEnvio: Date | null;
  proximoEnvio: Date | null;
}

@Injectable()
export class ReportesSuscripcionesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todas las suscripciones de un usuario
   */
  async getSuscripciones(usuarioId: string): Promise<SuscripcionResumen[]> {
    const suscripciones = await this.prisma.reporteSuscripcion.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'asc' },
    });

    return suscripciones.map((s) => ({
      id: s.id,
      tipoReporte: s.tipoReporte,
      frecuencia: s.frecuencia,
      emailDestino: s.emailDestino,
      activo: s.activo,
      ultimoEnvio: s.ultimoEnvio,
      proximoEnvio: s.proximoEnvio,
    }));
  }

  /**
   * Crea una nueva suscripción
   */
  async createSuscripcion(
    usuarioId: string,
    dto: CreateSuscripcionDto,
  ): Promise<ReporteSuscripcion> {
    // Verificar si ya existe una suscripción para este tipo
    const existing = await this.prisma.reporteSuscripcion.findUnique({
      where: {
        usuarioId_tipoReporte: {
          usuarioId,
          tipoReporte: dto.tipoReporte,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una suscripción para ${dto.tipoReporte}`,
      );
    }

    // Calcular próximo envío
    const proximoEnvio = this.calculateNextSendDate(dto.frecuencia);

    return this.prisma.reporteSuscripcion.create({
      data: {
        usuarioId,
        tipoReporte: dto.tipoReporte,
        frecuencia: dto.frecuencia,
        emailDestino: dto.emailDestino || null,
        proximoEnvio,
      },
    });
  }

  /**
   * Actualiza una suscripción existente
   */
  async updateSuscripcion(
    usuarioId: string,
    suscripcionId: string,
    dto: UpdateSuscripcionDto,
  ): Promise<ReporteSuscripcion> {
    const suscripcion = await this.prisma.reporteSuscripcion.findFirst({
      where: { id: suscripcionId, usuarioId },
    });

    if (!suscripcion) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    // Si cambia la frecuencia, recalcular próximo envío
    const proximoEnvio =
      dto.frecuencia && dto.frecuencia !== suscripcion.frecuencia
        ? this.calculateNextSendDate(dto.frecuencia)
        : undefined;

    return this.prisma.reporteSuscripcion.update({
      where: { id: suscripcionId },
      data: {
        frecuencia: dto.frecuencia,
        emailDestino: dto.emailDestino,
        activo: dto.activo,
        ...(proximoEnvio && { proximoEnvio }),
      },
    });
  }

  /**
   * Elimina una suscripción
   */
  async deleteSuscripcion(
    usuarioId: string,
    suscripcionId: string,
  ): Promise<void> {
    const suscripcion = await this.prisma.reporteSuscripcion.findFirst({
      where: { id: suscripcionId, usuarioId },
    });

    if (!suscripcion) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    await this.prisma.reporteSuscripcion.delete({
      where: { id: suscripcionId },
    });
  }

  /**
   * Activa o desactiva una suscripción
   */
  async toggleSuscripcion(
    usuarioId: string,
    suscripcionId: string,
  ): Promise<ReporteSuscripcion> {
    const suscripcion = await this.prisma.reporteSuscripcion.findFirst({
      where: { id: suscripcionId, usuarioId },
    });

    if (!suscripcion) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    return this.prisma.reporteSuscripcion.update({
      where: { id: suscripcionId },
      data: { activo: !suscripcion.activo },
    });
  }

  /**
   * Obtiene las opciones disponibles de tipos de reporte
   */
  getTiposReporteDisponibles(): Array<{
    value: TipoReporteEmail;
    label: string;
    descripcion: string;
  }> {
    return [
      {
        value: TipoReporteEmail.RESUMEN_SEMANAL,
        label: 'Resumen Semanal',
        descripcion:
          'Resumen general de turnos e ingresos de la semana anterior',
      },
      {
        value: TipoReporteEmail.RESUMEN_MENSUAL,
        label: 'Resumen Mensual',
        descripcion: 'Resumen general de turnos e ingresos del mes anterior',
      },
      {
        value: TipoReporteEmail.INGRESOS,
        label: 'Reporte de Ingresos',
        descripcion: 'Detalle de ingresos y facturación',
      },
      {
        value: TipoReporteEmail.TURNOS,
        label: 'Reporte de Turnos',
        descripcion: 'Estadísticas de turnos y asistencia',
      },
      {
        value: TipoReporteEmail.MOROSIDAD,
        label: 'Reporte de Morosidad',
        descripcion: 'Estado de cuentas por cobrar y pacientes morosos',
      },
    ];
  }

  /**
   * Calcula la próxima fecha de envío según la frecuencia
   */
  private calculateNextSendDate(frecuencia: FrecuenciaReporte): Date {
    const now = new Date();
    if (frecuencia === FrecuenciaReporte.SEMANAL) {
      const nextMonday = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
      nextMonday.setHours(8, 0, 0, 0);
      return nextMonday;
    } else {
      const nextMonth = startOfMonth(addMonths(now, 1));
      nextMonth.setHours(8, 0, 0, 0);
      return nextMonth;
    }
  }
}
