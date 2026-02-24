import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useRechazarPresupuesto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      presupuestoId,
      motivoRechazo,
    }: {
      presupuestoId: string;
      pacienteId: string;
      motivoRechazo?: string;
    }) => {
      const response = await api.patch(`/presupuestos/${presupuestoId}/rechazar`, { motivoRechazo });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["presupuestos", variables.pacienteId] });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban"] });
    },
  });
}
