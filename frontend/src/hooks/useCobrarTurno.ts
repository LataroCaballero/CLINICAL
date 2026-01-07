import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface CobrarTurnoInput {
  monto: number;
  descripcion?: string;
}

export function useCobrarTurno() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      turnoId,
      data,
    }: {
      turnoId: string;
      pacienteId: string;
      data: CobrarTurnoInput;
    }) => {
      const response = await api.post(`/turnos/${turnoId}/cobrar`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      // Invalidar cuenta corriente del paciente
      queryClient.invalidateQueries({
        queryKey: ["cuenta-corriente", variables.pacienteId],
      });
      // Invalidar turnos por si se muestra algún indicador de cobrado
      queryClient.invalidateQueries({
        queryKey: ["turnos"],
      });
      queryClient.invalidateQueries({
        queryKey: ["paciente-turnos", variables.pacienteId],
      });
    },
  });
}
