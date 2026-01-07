import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";

export function usePacienteTurnos(pacienteId?: string) {
    const effectiveProfessionalId = useEffectiveProfessionalId();

    return useQuery({
        queryKey: ["turnos", "paciente", pacienteId, effectiveProfessionalId],
        queryFn: async () => {
            if (!pacienteId) return [];

            const { data } = await api.get("/turnos", {
                params: {
                    pacienteId,
                    ...(effectiveProfessionalId
                        ? { profesionalId: effectiveProfessionalId }
                        : {}),
                },
            });

            return data;
        },
        enabled: !!pacienteId,
    });
}