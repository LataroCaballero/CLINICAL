import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useUpdateListaEspera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pacienteId,
      enListaEspera,
      comentarioListaEspera,
    }: {
      pacienteId: string;
      enListaEspera: boolean;
      comentarioListaEspera?: string;
    }) => {
      const { data } = await api.patch(`/pacientes/${pacienteId}/lista-espera`, {
        enListaEspera,
        comentarioListaEspera,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-kanban"] });
      queryClient.invalidateQueries({ queryKey: ["crm-metrics"] });
    },
  });
}
