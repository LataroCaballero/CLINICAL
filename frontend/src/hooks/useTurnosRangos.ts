import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type TurnoRango = {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  observaciones?: string | null;
  paciente: { id: string; nombreCompleto: string };
  tipoTurno: { id: string; nombre: string };
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
    staleTime: 0, // Siempre refetch para tener datos actualizados
    refetchOnWindowFocus: true,
  });
}