import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useReprogramarTurno() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; inicio: Date; fin: Date }) => {
      const { id, inicio, fin } = payload;
      return api.patch(`/turnos/${id}/reprogramar`, {
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
      });
    },
    onSuccess: () => {
      // refresca lo que esté consumiendo el calendario
      qc.invalidateQueries({ queryKey: ["turnos", "rango"] });
      qc.invalidateQueries({ queryKey: ["turnos", "upcoming"] });
    },
  });
}
