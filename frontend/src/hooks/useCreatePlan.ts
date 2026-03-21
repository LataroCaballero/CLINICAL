import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useCreatePlan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ obraSocialId, nombre }: { obraSocialId: string; nombre: string }) => {
            const res = await api.post(`/obras-sociales/${obraSocialId}/planes`, { nombre });
            return res.data;
        },

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["obrasSociales"] });
        }
    });
}
