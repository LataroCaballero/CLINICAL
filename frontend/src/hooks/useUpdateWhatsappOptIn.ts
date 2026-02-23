import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface UpdateOptInInput {
  pacienteId: string;
  optIn: boolean;
}

export function useUpdateWhatsappOptIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pacienteId, optIn }: UpdateOptInInput) => {
      const res = await api.patch(`/pacientes/${pacienteId}/whatsapp-opt-in`, {
        optIn,
      });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      // Invalidar query del paciente para refrescar opt-in status
      // El queryKey de usePaciente es ["paciente", id, effectiveProfessionalId]
      // Usamos invalidación parcial para cubrir todas las variantes de profesional
      queryClient.invalidateQueries({
        queryKey: ["paciente", variables.pacienteId],
      });
    },
  });
}
