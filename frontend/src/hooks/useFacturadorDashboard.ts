import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export interface PracticaPendienteAgrupada {
  obraSocialId: string;
  nombre: string;
  count: number;
  total: number;
}

export function usePracticasPendientesAgrupadas(profesionalId: string | null) {
  return useQuery({
    queryKey: ['finanzas', 'practicas-pendientes-agrupadas', profesionalId],
    queryFn: async () => {
      const { data } = await api.get('/finanzas/practicas-pendientes-agrupadas', {
        params: { profesionalId },
      });
      return data as PracticaPendienteAgrupada[];
    },
    enabled: !!profesionalId,
    staleTime: 30_000,
  });
}

export interface LimiteDisponible {
  limite: number | null;
  emitido: number;
  disponible: number | null;
}

export function useLimiteDisponible(profesionalId: string | null, mes: string) {
  return useQuery({
    queryKey: ['finanzas', 'limite-disponible', profesionalId, mes],
    queryFn: async () => {
      const { data } = await api.get('/finanzas/limite-disponible', {
        params: { profesionalId, mes },
      });
      return data as LimiteDisponible;
    },
    enabled: !!profesionalId,
    staleTime: 30_000,
  });
}

export function useSetLimiteMensual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { profesionalId: string; mes: string; limite: number }) => {
      const { data } = await api.post('/finanzas/limite-mensual', dto);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['finanzas', 'limite-disponible', variables.profesionalId, variables.mes],
      });
      toast.success('Límite actualizado');
    },
    onError: () => {
      toast.error('Error al guardar el límite');
    },
  });
}
