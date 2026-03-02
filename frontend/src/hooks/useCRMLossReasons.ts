import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Periodo } from './usePeriodoFilter';

export interface MotivoPerdida {
  motivo: string;
  count: number;
  porcentaje: number;
}

export interface LossReasonsData {
  total: number;
  motivos: MotivoPerdida[];
}

export function useCRMLossReasons(profesionalId: string | null, periodo: Periodo = 'mes') {
  return useQuery<LossReasonsData>({
    queryKey: ['crm-loss-reasons', profesionalId, periodo],
    queryFn: async () => {
      const { data } = await api.get('/reportes/crm/motivos-perdida', {
        params: { profesionalId, periodo },
      });
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 1000 * 60 * 5,
  });
}
