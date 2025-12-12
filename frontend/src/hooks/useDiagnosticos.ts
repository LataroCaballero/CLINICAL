import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

/* --------------------------
   GET diagnósticos (con búsqueda)
--------------------------- */
export function useDiagnosticos(query: string) {
    return useQuery({
        queryKey: ["diagnosticos", query],
        queryFn: async () => {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/diagnosticos`, {
                params: { q: query },
            });
            return res.data;
        },
        staleTime: 1000 * 60 * 10, // 10 minutos
    });
}

/* --------------------------
   POST crear diagnóstico
--------------------------- */
export function useCreateDiagnostico() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (nombre: string) => {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/diagnosticos`, { nombre });
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["diagnosticos"] });
        },
    });
}

/* --------------------------
   DELETE eliminar diagnóstico
--------------------------- */
export function useDeleteDiagnostico() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/diagnosticos/${id}`);
            return id;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["diagnosticos"] });
        },
    });
}
