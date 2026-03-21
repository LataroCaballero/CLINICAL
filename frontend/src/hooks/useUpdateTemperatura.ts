import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TemperaturaPaciente } from "./useCRMKanban";

export function useUpdateTemperatura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pacienteId,
      temperatura,
    }: {
      pacienteId: string;
      temperatura: TemperaturaPaciente;
    }) => {
      const { data } = await api.patch(`/pacientes/${pacienteId}/temperatura`, {
        temperatura,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-kanban"] });
    },
  });
}
