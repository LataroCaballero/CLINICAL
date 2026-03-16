import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface CerrarLoteParams {
  profesionalId: string;
  obraSocialId: string;
  practicaIds: string[];
}

export function useCerrarLote() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ profesionalId, obraSocialId, practicaIds }: CerrarLoteParams) => {
      const periodo = new Date().toISOString().slice(0, 7); // YYYY-MM
      const { data } = await api.post('/finanzas/liquidaciones/crear-lote', {
        profesionalId,
        obraSocialId,
        periodo,
        practicaIds,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['finanzas', 'practicas-pendientes-agrupadas', variables.profesionalId],
      });
      queryClient.invalidateQueries({
        queryKey: ['finanzas', 'practicas-pendientes-por-os', variables.profesionalId, variables.obraSocialId],
      });
      toast.success('Lote cerrado correctamente');
      router.push('/dashboard/facturador');
    },
    onError: () => {
      toast.error('Error al cerrar el lote');
    },
  });
}
