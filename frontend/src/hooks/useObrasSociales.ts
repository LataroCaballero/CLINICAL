import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useObrasSociales() {
    return useQuery({
        queryKey: ["obrasSociales"],
        queryFn: async () => {
            const res = await api.get("/obras-sociales");
            return res.data;
        },
    });
}
