import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EtapaCRM } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// ADVERTENCIA: El enum EtapaCRM en Prisma NO está en orden lógico de avance.
// NO derivar el orden del enum — usar SIEMPRE ETAPA_ORDEN como fuente de verdad.
const ETAPA_ORDEN: Record<string, number> = {
  SIN_CLASIFICAR: 0,
  NUEVO_LEAD: 1,
  TURNO_AGENDADO: 2,
  CONSULTADO: 3,
  PRESUPUESTO_ENVIADO: 4,
  CONFIRMADO: 5,
  PROCEDIMIENTO_REALIZADO: 6,
};

function etapaOrden(e: EtapaCRM | null | undefined): number {
  return ETAPA_ORDEN[e ?? 'SIN_CLASIFICAR'] ?? 0;
}

@Injectable()
export class CirugiaRealizadaSchedulerService {
  private readonly logger = new Logger(CirugiaRealizadaSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Todos los días a las 6am: mueve a PROCEDIMIENTO_REALIZADO a los pacientes
   * cuya Cirugia ya pasó de fecha (forward-only, excluye PERDIDO y cirugías canceladas).
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async moverCirugiasRealizadas(): Promise<void> {
    this.logger.log('Auto-move a PROCEDIMIENTO_REALIZADO por cirugía pasada...');
    const ahora = new Date();

    const candidatos = await this.prisma.cirugia.findMany({
      where: {
        fecha: { lt: ahora },
        estado: { notIn: ['CANCELADA', 'SUSPENDIDA'] },
      },
      select: {
        pacienteId: true,
        paciente: { select: { etapaCRM: true } },
      },
    });

    this.logger.log(
      `Encontrados ${candidatos.length} candidatos para auto-move a PROCEDIMIENTO_REALIZADO`,
    );

    for (const c of candidatos) {
      try {
        const etapaCRMActual = c.paciente?.etapaCRM;

        // Excluir PERDIDO explícitamente (no está en ETAPA_ORDEN — manejo especial)
        if (etapaCRMActual === 'PERDIDO') {
          continue;
        }

        // Forward-only gate: solo avanzar si el orden actual es menor a 6
        if (etapaOrden(etapaCRMActual) >= 6) {
          continue;
        }

        await this.prisma.paciente.update({
          where: { id: c.pacienteId },
          data: { etapaCRM: EtapaCRM.PROCEDIMIENTO_REALIZADO },
        });

        this.logger.log(
          `Paciente ${c.pacienteId} movido a PROCEDIMIENTO_REALIZADO`,
        );
      } catch (err) {
        this.logger.error(
          `Error moviendo paciente ${c.pacienteId}: ${(err as Error).message}`,
        );
      }
    }
  }
}
