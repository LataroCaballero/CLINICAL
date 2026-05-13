import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useEffectiveProfessionalId } from '@/hooks/useEffectiveProfessionalId';
import { OrdenConsumo } from '@/types/stock';

export function useOrdenesConsumo() {
  const professionalId = useEffectiveProfessionalId();
  return useQuery<OrdenConsumo[], Error>({
    queryKey: ['ordenes-consumo', professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data } = await api.get('/ordenes-consumo', {
        params: { profesionalId: professionalId },
      });
      return data;
    },
  });
}

export function useConfirmarOrdenConsumo() {
  const queryClient = useQueryClient();
  const professionalId = useEffectiveProfessionalId();
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.post(
        `/ordenes-consumo/${id}/confirmar`,
        {},
        { params: { profesionalId: professionalId } },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-consumo'] });
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['alertas-stock'] });
      queryClient.invalidateQueries({ queryKey: ['alertas-resumen'] });
    },
  });
}
