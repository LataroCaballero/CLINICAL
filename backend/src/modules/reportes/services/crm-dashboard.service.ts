import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EtapaCRM, TemperaturaPaciente, EstadoPresupuesto } from '@prisma/client';

const ETAPAS_FUNNEL: EtapaCRM[] = [
  EtapaCRM.NUEVO_LEAD,
  EtapaCRM.TURNO_AGENDADO,
  EtapaCRM.CONSULTADO,
  EtapaCRM.PRESUPUESTO_ENVIADO,
  EtapaCRM.CONFIRMADO,
];

@Injectable()
export class CrmDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private calcularRango(periodo: string): { inicio: Date; fin: Date } {
    const now = new Date();

    if (periodo === 'semana') {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const inicio = new Date(now);
      inicio.setDate(diff);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(inicio);
      fin.setDate(inicio.getDate() + 6);
      fin.setHours(23, 59, 59, 999);
      return { inicio, fin };
    }

    if (periodo === 'trimestre') {
      const trimestre = Math.floor(now.getMonth() / 3);
      const inicio = new Date(now.getFullYear(), trimestre * 3, 1);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(now.getFullYear(), trimestre * 3 + 3, 0);
      fin.setHours(23, 59, 59, 999);
      return { inicio, fin };
    }

    // 'mes' (default)
    const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    fin.setHours(23, 59, 59, 999);
    return { inicio, fin };
  }

  async getFunnelSnapshot(profesionalId: string) {
    // Group all patients by CRM stage
    const grupos = await this.prisma.paciente.groupBy({
      by: ['etapaCRM'],
      where: { profesionalId },
      _count: { id: true },
    });

    // Build count map
    const countMap = new Map<string | null, number>();
    for (const g of grupos) {
      countMap.set(g.etapaCRM, g._count.id);
    }

    // Build funnel etapas array
    const etapas = ETAPAS_FUNNEL.map((etapa) => ({
      etapa,
      count: countMap.get(etapa) ?? 0,
    }));

    // Calculate conversion rates between consecutive stages
    const tasasPaso: Array<{ de: EtapaCRM; a: EtapaCRM; tasa: number | null }> = [];
    for (let i = 0; i < etapas.length - 1; i++) {
      const de = etapas[i].etapa;
      const a = etapas[i + 1].etapa;
      const tasa =
        etapas[i].count === 0
          ? null
          : Math.round((etapas[i + 1].count / etapas[i].count) * 100);
      tasasPaso.push({ de, a, tasa });
    }

    // Lost patients
    const perdidosTotal = countMap.get(EtapaCRM.PERDIDO) ?? 0;

    // Loss reasons breakdown
    const motivosGrupos = await this.prisma.paciente.groupBy({
      by: ['motivoPerdida'],
      where: {
        profesionalId,
        etapaCRM: EtapaCRM.PERDIDO,
        motivoPerdida: { not: null },
      },
      _count: { id: true },
    });

    return {
      etapas,
      tasasPaso,
      perdidos: {
        total: perdidosTotal,
        porMotivo: motivosGrupos.map((g) => ({
          motivo: g.motivoPerdida,
          count: g._count.id,
        })),
      },
    };
  }

  async getKpis(profesionalId: string, periodo: string) {
    const { inicio, fin } = this.calcularRango(periodo);

    const [nuevos, confirmados, totalActivos] = await Promise.all([
      this.prisma.paciente.count({
        where: {
          profesionalId,
          createdAt: { gte: inicio, lte: fin },
        },
      }),
      this.prisma.paciente.count({
        where: {
          profesionalId,
          etapaCRM: EtapaCRM.CONFIRMADO,
          updatedAt: { gte: inicio, lte: fin },
        },
      }),
      this.prisma.paciente.count({
        where: {
          profesionalId,
          etapaCRM: { not: EtapaCRM.PERDIDO },
        },
      }),
    ]);

    const tasaConversion =
      totalActivos > 0
        ? Math.round((confirmados / totalActivos) * 1000) / 10
        : 0;

    return {
      periodo: { inicio, fin },
      nuevos,
      confirmados,
      totalActivos,
      tasaConversion,
    };
  }

  async getMotivosPerdida(profesionalId: string, periodo: string) {
    const { inicio, fin } = this.calcularRango(periodo);

    const grupos = await this.prisma.paciente.groupBy({
      by: ['motivoPerdida'],
      where: {
        profesionalId,
        etapaCRM: EtapaCRM.PERDIDO,
        updatedAt: { gte: inicio, lte: fin },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const total = grupos.reduce((acc, g) => acc + g._count.id, 0);

    return {
      total,
      motivos: grupos.map((g) => ({
        motivo: g.motivoPerdida ?? 'SIN_MOTIVO',
        count: g._count.id,
        porcentaje:
          total > 0 ? Math.round((g._count.id / total) * 100) : 0,
      })),
    };
  }

  async getPipelineIncome(profesionalId: string, periodo: string) {
    const { inicio, fin } = this.calcularRango(periodo);

    const presupuestos = await this.prisma.presupuesto.findMany({
      where: {
        profesionalId,
        estado: EstadoPresupuesto.ENVIADO,
        fechaEnviado: { gte: inicio, lte: fin },
        paciente: { temperatura: TemperaturaPaciente.CALIENTE },
      },
      select: { total: true },
    });

    const total = presupuestos.reduce(
      (acc, p) => acc + Number(p.total),
      0,
    );

    return { total, count: presupuestos.length };
  }

  async getCoordinatorPerformance(profesionalId: string, periodo: string) {
    const { inicio, fin } = this.calcularRango(periodo);

    const logs = await this.prisma.contactoLog.findMany({
      where: {
        profesionalId,
        fecha: { gte: inicio, lte: fin },
      },
      select: {
        pacienteId: true,
        etapaCRMPost: true,
        registradoPorId: true,
        registradoPor: { select: { nombre: true } },
      },
    });

    const byCoord = new Map<
      string,
      {
        nombre: string;
        interacciones: number;
        pacientes: Set<string>;
        avances: number;
      }
    >();

    for (const log of logs) {
      const key = log.registradoPorId ?? 'sin-asignar';
      const nombre = log.registradoPor?.nombre ?? 'Sin asignar';

      if (!byCoord.has(key)) {
        byCoord.set(key, {
          nombre,
          interacciones: 0,
          pacientes: new Set(),
          avances: 0,
        });
      }

      const coord = byCoord.get(key)!;
      coord.interacciones++;
      coord.pacientes.add(log.pacienteId);
      if (log.etapaCRMPost != null) coord.avances++;
    }

    const coordinadores = Array.from(byCoord.entries()).map(([, c]) => ({
      nombre: c.nombre,
      interacciones: c.interacciones,
      pacientesContactados: c.pacientes.size,
      porcentajeConversion:
        c.pacientes.size === 0
          ? null
          : Math.round((c.avances / c.pacientes.size) * 100),
    }));

    return { periodo: { inicio, fin }, coordinadores };
  }
}
