import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

/* GET tratamientos (con búsqueda) */
export function useTratamientos(query: string) {
    return useQuery({
        queryKey: ["tratamientos", query],
        queryFn: async () => {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/tratamientos`, { params: { q: query } });
            return res.data;
        },
        staleTime: 1000 * 60 * 10,
    });
}

/* Crear tratamiento */
export function useCreateTratamiento() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (nombre: string) => {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/tratamientos`, { nombre });
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["tratamientos"] });
        },
    });
}

/* Eliminar tratamiento */
export function useDeleteTratamiento() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/tratamientos/${id}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["tratamientos"] });
        },
    });
}
