import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreatePaciente() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post("/pacientes", data);
            return response.data;
        },
        onSuccess: () => {
            // Invalidar queries de pacientes para refrescar la lista
            queryClient.invalidateQueries({ queryKey: ["pacientes"] });
            // Invalidar sugerencias del autosuggest (Phase 68, ALTA-04) para que una
            // busqueda inmediata posterior encuentre al paciente recien creado
            queryClient.invalidateQueries({ queryKey: ["pacientes-suggest"] });
        },
    });
}
