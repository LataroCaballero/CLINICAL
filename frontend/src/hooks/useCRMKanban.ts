import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type EtapaCRM =
  | "SIN_CLASIFICAR"
  | "NUEVO_LEAD"
  | "TURNO_AGENDADO"
  | "CONSULTADO"
  | "PRESUPUESTO_ENVIADO"
  | "PROCEDIMIENTO_REALIZADO"
  | "CONFIRMADO"
  | "PERDIDO";

export type TemperaturaPaciente = "CALIENTE" | "TIBIO" | "FRIO";

export type MotivoPerdidaCRM =
  | "PRECIO"
  | "TIEMPO"
  | "MIEDO_CIRUGIA"
  | "PREFIERE_OTRO_PROFESIONAL"
  | "NO_CANDIDATO_MEDICO"
  | "NO_RESPONDIO"
  | "OTRO";

// Phase 58 — mirrors crm-steps.helper.ts PasoEstado / PasosCrm
export type PasoEstado = 'completo' | 'pendiente';

export interface PasosCrm {
  hc: PasoEstado;
  presupuesto: PasoEstado;
  cirugia: PasoEstado;
  consentimiento: PasoEstado;
  indicacionesPreop: PasoEstado;
}

export interface KanbanPatient {
  id: string;
  nombreCompleto: string;
  fotoUrl: string | null;
  etapaCRM: EtapaCRM | null;
  temperatura: TemperaturaPaciente | null;
  scoreConversion: number;
  procedimiento: string | null;
  ultimoContactoNota: string | null;
  ultimoContactoFecha: string | null;
  ultimoTurno: string | null;
  presupuesto: {
    total: number;
    estado: string;
    fechaEnviado: string | null;
  } | null;
  diasDesdePresupuesto: number | null;
  enListaEspera: boolean;
  comentarioListaEspera?: string | null;
  pendingAutorizaciones?: number;
  // Phase 36 — expuesto por backend desde Phase 35
  flujo: 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' | null;
  // Phase 58 — expuesto por backend desde Phase 57 (computePasosCrm spread)
  pasos: PasosCrm;
  todosCompletos: boolean;
  // Phase 62 (INDIC-05) — display-only fecha de lectura de indicaciones;
  // NO gobierna pasos.indicacionesPreop (eso sigue siendo computePasosCrm).
  indicacionesLeidasAt: string | null;
}

export interface KanbanColumn {
  etapa: EtapaCRM;
  total: number;
  pacientes: KanbanPatient[];
}

export const ETAPA_LABELS: Record<EtapaCRM, string> = {
  SIN_CLASIFICAR: "Sin clasificar",
  NUEVO_LEAD: "Nuevo Lead",
  TURNO_AGENDADO: "Consulta Agendada",
  CONSULTADO: "Consulta Realizada",
  PRESUPUESTO_ENVIADO: "Presupuesto Enviado",
  PROCEDIMIENTO_REALIZADO: "Cirugía Realizada",
  CONFIRMADO: "Confirmado",
  PERDIDO: "Perdido",
};

// Phase 58: PROCEDIMIENTO_REALIZADO now visible in kanban (after CONFIRMADO);
// SIN_CLASIFICAR moved to last position (EMBUDO-01).
export const ETAPA_ORDER: EtapaCRM[] = [
  "NUEVO_LEAD",
  "TURNO_AGENDADO",
  "CONSULTADO",
  "PRESUPUESTO_ENVIADO",
  "CONFIRMADO",
  "PROCEDIMIENTO_REALIZADO",
  "PERDIDO",
  "SIN_CLASIFICAR",
];

export function useCRMKanban(profesionalId: string | null) {
  return useQuery<KanbanColumn[]>({
    queryKey: ["crm-kanban", profesionalId],
    queryFn: async () => {
      const { data } = await api.get("/pacientes/kanban", {
        params: { profesionalId },
      });
      return data;
    },
    enabled: !!profesionalId,
    // Phase 62 (EMBUDO-06/D-10) — cierre deuda W-1: freshness sobre volumen de
    // requests, sin infra nueva. staleTime 0 fuerza refetch en cada focus.
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
