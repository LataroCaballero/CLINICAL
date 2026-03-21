import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EtapaCRM, EstadoPresupuesto } from '@prisma/client';

@Injectable()
export class CrmMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCRMMetrics(profesionalId: string, mes?: string) {
    // Calcular rango del mes (o mes actual si no se especifica)
    let inicio: Date;
    let fin: Date;

    if (mes) {
      const [year, month] = mes.split('-').map(Number);
      inicio = new Date(year, month - 1, 1);
      fin = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      inicio = new Date(now.getFullYear(), now.getMonth(), 1);
      fin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Pacientes del profesional con datos CRM
    const pacientes = await this.prisma.paciente.findMany({
      where: { profesionalId },
      select: {
        id: true,
        etapaCRM: true,
        temperatura: true,
        presupuestos: {
          where: {
            createdAt: { gte: inicio, lte: fin },
          },
          select: {
            estado: true,
            total: true,
            fechaEnviado: true,
            fechaAceptado: true,
            fechaRechazado: true,
          },
        },
      },
    });

    // Métricas de presupuestos del período
    const todosPresupuestos = pacientes.flatMap((p) => p.presupuestos);
    const presupuestosEnviados = todosPresupuestos.filter(
      (pr) =>
        pr.estado === EstadoPresupuesto.ENVIADO ||
        pr.estado === EstadoPresupuesto.ACEPTADO ||
        pr.estado === EstadoPresupuesto.RECHAZADO,
    ).length;
    const confirmados = todosPresupuestos.filter(
      (pr) => pr.estado === EstadoPresupuesto.ACEPTADO,
    ).length;
    const perdidos = todosPresupuestos.filter(
      (pr) => pr.estado === EstadoPresupuesto.RECHAZADO,
    ).length;
    const tasaConversion =
      presupuestosEnviados > 0
        ? Math.round((confirmados / presupuestosEnviados) * 1000) / 10
        : 0;

    // Ingreso proyectado (suma de presupuestos ENVIADOS)
    const ingresoProyectado = todosPresupuestos
      .filter((pr) => pr.estado === EstadoPresupuesto.ENVIADO)
      .reduce((acc, pr) => acc + Number(pr.total), 0);

    // Tiempo promedio de decisión (días entre enviado y aceptado/rechazado)
    const conDecision = todosPresupuestos.filter(
      (pr) =>
        pr.fechaEnviado &&
        (pr.fechaAceptado || pr.fechaRechazado),
    );
    const tiempoPromedioDecisionDias =
      conDecision.length > 0
        ? Math.round(
            conDecision.reduce((acc, pr) => {
              const fin2 = pr.fechaAceptado ?? pr.fechaRechazado!;
              return (
                acc +
                (fin2.getTime() - pr.fechaEnviado!.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
            }, 0) / conDecision.length,
          )
        : 0;

    // Distribución por temperatura
    const temperaturas = { CALIENTE: 0, TIBIO: 0, FRIO: 0 };
    for (const p of pacientes) {
      if (p.temperatura) {
        temperaturas[p.temperatura] = (temperaturas[p.temperatura] ?? 0) + 1;
      }
    }

    // Distribución por etapa CRM
    const distribucionEtapas: Record<string, number> = {
      SIN_CLASIFICAR: 0,
    };
    for (const etapa of Object.values(EtapaCRM)) {
      distribucionEtapas[etapa] = 0;
    }
    for (const p of pacientes) {
      const key = p.etapaCRM ?? 'SIN_CLASIFICAR';
      distribucionEtapas[key] = (distribucionEtapas[key] ?? 0) + 1;
    }

    const enListaEspera = await this.prisma.paciente.count({
      where: { profesionalId, enListaEspera: true },
    });

    return {
      periodo: { inicio, fin },
      presupuestosEnviados,
      confirmados,
      perdidos,
      tasaConversion,
      calientes: temperaturas.CALIENTE,
      tibios: temperaturas.TIBIO,
      frios: temperaturas.FRIO,
      tiempoPromedioDecisionDias,
      ingresoProyectado,
      distribucionEtapas,
      enListaEspera,
    };
  }
}
