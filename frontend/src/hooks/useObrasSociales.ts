import { useQuery } from "@tanstack/react-query";

export function useObrasSociales() {
    return useQuery({
        queryKey: ["obrasSociales"],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/obras-sociales`);
            return res.json();
        },
    });
}
