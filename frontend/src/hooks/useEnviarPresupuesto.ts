import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface EnviarPresupuestoInput {
  presupuestoId: string;
  pacienteId: string;
  emailDestino: string;
  notaCoordinador?: string;
}

export function useEnviarPresupuesto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ presupuestoId, emailDestino, notaCoordinador }: EnviarPresupuestoInput) => {
      const response = await api.post(`/presupuestos/${presupuestoId}/enviar-email`, {
        emailDestino,
        notaCoordinador,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["presupuestos", variables.pacienteId] });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban"] });
    },
  });
}
