import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SeguimientoSchedulerService {
  private readonly logger = new Logger(SeguimientoSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Todos los días a las 9am: procesa tareas de seguimiento vencidas.
   * Para cada tarea, registra un MensajeInterno en el paciente como alerta.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async processSeguimientos(): Promise<void> {
    this.logger.log('Procesando tareas de seguimiento CRM...');

    const ahora = new Date();

    const tareasPendientes = await this.prisma.tareaSeguimiento.findMany({
      where: {
        completada: false,
        fechaProgramada: { lte: ahora },
      },
      include: {
        paciente: { select: { id: true, nombreCompleto: true } },
        profesional: { select: { id: true, usuarioId: true } },
      },
    });

    this.logger.log(
      `Encontradas ${tareasPendientes.length} tareas de seguimiento pendientes`,
    );

    for (const tarea of tareasPendientes) {
      try {
        const diasMap: Record<string, number> = {
          SEGUIMIENTO_DIA_3: 3,
          SEGUIMIENTO_DIA_7: 7,
          SEGUIMIENTO_DIA_14: 14,
        };
        const dias = diasMap[tarea.tipo] ?? 0;

        const mensaje =
          tarea.tipo === 'PERSONALIZADA'
            ? `Tarea de seguimiento personalizada con ${tarea.paciente.nombreCompleto}`
            : `Seguimiento CRM — han pasado ${dias} días desde el presupuesto enviado a ${tarea.paciente.nombreCompleto}. Contactar hoy.`;

        // Crear mensaje interno como alerta del sistema
        await this.prisma.mensajeInterno.create({
          data: {
            mensaje,
            prioridad: dias <= 3 ? 'ALTA' : 'MEDIA',
            esSistema: true,
            autorId: tarea.profesional.usuarioId,
            pacienteId: tarea.paciente.id,
          },
        });

        // Marcar tarea como "notificada" — el usuario la completa manualmente
        // La dejamos pendiente para que el profesional la marque cuando contacte
        // (solo registramos en log por ahora)
        this.logger.log(
          `Alerta creada para paciente ${tarea.paciente.nombreCompleto} — ${tarea.tipo}`,
        );
      } catch (err) {
        this.logger.error(
          `Error procesando tarea ${tarea.id}: ${err.message}`,
        );
      }
    }
  }
}
