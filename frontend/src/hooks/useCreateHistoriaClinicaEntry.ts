import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useCreateHistoriaClinicaEntry() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({
            pacienteId,
            contenido,
        }: {
            pacienteId: string;
            contenido: string;
        }) => {
            await api.post(
                `${process.env.NEXT_PUBLIC_API_URL}/pacientes/${pacienteId}/historia-clinica/entradas`,
                { contenido }
            );
        },
        onSuccess: (_, variables) => {
            qc.invalidateQueries({
                queryKey: ['historia-clinica', variables.pacienteId],
            });
        },
    });
}