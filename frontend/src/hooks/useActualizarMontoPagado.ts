import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useActualizarMontoPagado() {
  return useMutation({
    mutationFn: async ({
      practicaId,
      montoPagado,
    }: {
      practicaId: string;
      montoPagado: number;
    }) => {
      const { data } = await api.patch(
        `/finanzas/practicas/${practicaId}/monto-pagado`,
        { montoPagado },
      );
      return data;
    },
    // No onSuccess/onError here — caller handles error with revert + toast
    // This is intentional: each cell manages its own rollback state
  });
}
