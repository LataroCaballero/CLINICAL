import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export function useProfesionales() {
    return useQuery({
        queryKey: ["profesionales"],
        queryFn: async () => {
            const { data } = await api.get("/profesionales");
            return data;
        },
    });
}
