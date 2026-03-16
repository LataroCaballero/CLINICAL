import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CreateContactoPayload {
  tipo: "LLAMADA" | "MENSAJE" | "PRESENCIAL";
  nota?: string;
  fecha?: string;
  etapaCRM?: string;
  temperatura?: string;
  proximaAccionFecha?: string;
}

export function useCreateContacto(pacienteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateContactoPayload) => {
      const { data: res } = await api.post(`/pacientes/${pacienteId}/contactos`, data);
      return res;
    },
    onSuccess: () => {
      // Invalidar todas las queries afectadas por un nuevo contacto
      queryClient.invalidateQueries({ queryKey: ["contactos", pacienteId] });
      queryClient.invalidateQueries({ queryKey: ["lista-accion"] });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban"] });
      queryClient.invalidateQueries({ queryKey: ["paciente", pacienteId] });
    },
  });
}
