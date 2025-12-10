import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreatePlan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ obraSocialId, nombre }: any) => {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/obras-sociales/${obraSocialId}/planes`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nombre }),
                }
            );
            if (!res.ok) throw new Error("Error creando plan");
            return res.json();
        },

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["obrasSociales"] });
        }
    });
}
