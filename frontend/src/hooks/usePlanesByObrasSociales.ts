import { useQuery } from "@tanstack/react-query";

export type PlanObraSocial = {
    id: string;
    nombre: string;
};

export function usePlanesByObraSocial(obraSocialId: string | null) {
    return useQuery<PlanObraSocial[]>({
        queryKey: ["planes-obra-social", obraSocialId],
        enabled: !!obraSocialId,
        queryFn: async () => {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/obras-sociales/${obraSocialId}/planes`,
                { credentials: "include" }
            );

            if (!res.ok) {
                throw new Error("Error al cargar planes");
            }

            return res.json();
        },
    });
}