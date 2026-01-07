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
        },
    });
}
