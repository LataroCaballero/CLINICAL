import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useHistoriaClinica(pacienteId: string) {
    return useQuery({
        queryKey: ['historia-clinica', pacienteId],
        queryFn: async () => {
            const { data } = await api.get(
                `${process.env.NEXT_PUBLIC_API_URL}/pacientes/${pacienteId}/historia-clinica`
            );
            return data;
        },
        enabled: !!pacienteId,
    });
}