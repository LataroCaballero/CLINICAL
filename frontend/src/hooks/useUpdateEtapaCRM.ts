import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { EtapaCRM, MotivoPerdidaCRM } from "./useCRMKanban";

interface UpdateEtapaCRMPayload {
  pacienteId: string;
  etapaCRM: EtapaCRM;
  motivoPerdida?: MotivoPerdidaCRM;
}

export function useUpdateEtapaCRM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pacienteId, etapaCRM, motivoPerdida }: UpdateEtapaCRMPayload) => {
      const { data } = await api.patch(`/pacientes/${pacienteId}/etapa-crm`, {
        etapaCRM,
        motivoPerdida,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-kanban"] });
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
    },
  });
}
