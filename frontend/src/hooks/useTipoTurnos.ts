import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type TipoTurno = {
    id: string;
    nombre: string;
    descripcion?: string | null;
    duracionDefault?: number | null;
};

export function useTiposTurno() {
    return useQuery<TipoTurno[]>({
        queryKey: ["tipos-turno"],
        queryFn: async () => {
            const { data } = await api.get("/tipos-turno");
            return data;
        },
        staleTime: 1000 * 60 * 10, // 10 minutos (casi estático)
    });
}