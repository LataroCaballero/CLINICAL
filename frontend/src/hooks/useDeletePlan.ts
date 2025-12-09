import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeletePlan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (planId: string) => {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/obras-sociales/planes/${planId}`,
                { method: "DELETE" }
            );

            if (!res.ok) throw new Error("Error al eliminar plan");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["obrasSociales"]);
        }
    });
}
