import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function usePacienteTurnos(pacienteId?: string) {
    return useQuery({
        queryKey: ["turnos", "paciente", pacienteId],
        queryFn: async () => {
            if (!pacienteId) return [];
            const { data } = await api.get("/turnos", {
                params: { pacienteId },
            });
            return data;
        },
        enabled: !!pacienteId,
    });
}