import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface UpdateCrmArchivoInput {
  pacienteId: string;
  archivado: boolean;
}

export function useUpdateCrmArchivo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pacienteId, archivado }: UpdateCrmArchivoInput) => {
      const res = await api.patch(`/pacientes/${pacienteId}/crm-archivo`, {
        archivado,
      });
      return res.data;
    },
    onSettled: () => {
      // Invalidación parcial por key prefix — cubre todas las variantes de profesionalId
      queryClient.invalidateQueries({ queryKey: ["crm-kanban"] });
      queryClient.invalidateQueries({ queryKey: ["lista-accion"] });
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
    },
  });
}
