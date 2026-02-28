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

export interface KanbanPatient {
  id: string;
  nombreCompleto: string;
  fotoUrl: string | null;
  etapaCRM: EtapaCRM | null;
  temperatura: TemperaturaPaciente | null;
  scoreConversion: number;
  procedimiento: string | null;
  ultimoTurno: string | null;
  presupuesto: {
    total: number;
    estado: string;
    fechaEnviado: string | null;
  } | null;
  diasDesdePresupuesto: number | null;
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
  PROCEDIMIENTO_REALIZADO: "Procedimiento Realizado",
  CONFIRMADO: "Confirmado",
  PERDIDO: "Perdido",
};

// PROCEDIMIENTO_REALIZADO intentionally excluded — hidden from kanban per user decision
export const ETAPA_ORDER: EtapaCRM[] = [
  "SIN_CLASIFICAR",
  "NUEVO_LEAD",
  "TURNO_AGENDADO",
  "CONSULTADO",
  "PRESUPUESTO_ENVIADO",
  "CONFIRMADO",
  "PERDIDO",
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
    staleTime: 30_000,
  });
}
