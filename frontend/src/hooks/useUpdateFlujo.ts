import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useUpdateFlujo(pacienteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flujo: "CIRUGIA" | "TRATAMIENTO" | "PENDIENTE") => {
      const { data } = await api.patch(`/pacientes/${pacienteId}/flujo`, { flujo });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paciente", pacienteId] });
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban"] });
    },
  });
}
