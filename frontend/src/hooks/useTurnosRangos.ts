import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Espeja el enum EstadoTurno de Prisma (backend/src/prisma/schema.prisma)
export type EstadoTurnoRango =
  | "PENDIENTE"
  | "CONFIRMADO"
  | "CANCELADO"
  | "AUSENTE"
  | "FINALIZADO"
  | "EN_ESPERA"
  | "SIENDO_ATENDIDO";

export type TurnoRango = {
  id: string;
  inicio: string;
  fin: string;
  estado: EstadoTurnoRango;
  observaciones?: string | null;
  pacienteId: string;
  esSobreturno: boolean;
  paciente: {
    id: string;
    nombreCompleto: string;
    whatsappOptIn: boolean;
    telefono: string | null;
  };
  tipoTurno: { id: string; nombre: string; flujoPaciente?: string | null };
  ultimoTratamiento?: string | null;
  // Phase 64 (TRAT-07) — lista completa de nombres sin colapsar; ultimoTratamiento se mantiene para compatibilidad
  tratamientos?: string[];
  tipoEntradaHC?: string | null;
};

export function useTurnosRango(
  profesionalId?: string,
  desde?: string,
  hasta?: string
) {
  return useQuery<TurnoRango[]>({
    queryKey: ["turnos", "rango", profesionalId, desde, hasta],
    queryFn: async () => {
      if (!profesionalId || !desde || !hasta) return [];
      const { data } = await api.get("/turnos/rango", {
        params: { profesionalId, desde, hasta },
      });
      return data;
    },
    enabled: !!profesionalId && !!desde && !!hasta,
    staleTime: 30_000,
  });
}