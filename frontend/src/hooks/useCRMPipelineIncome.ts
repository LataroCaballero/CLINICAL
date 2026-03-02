import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Periodo } from './usePeriodoFilter';

export interface PipelineIncomeData {
  total: number;
  count: number;
}

export function useCRMPipelineIncome(profesionalId: string | null, periodo: Periodo = 'mes') {
  return useQuery<PipelineIncomeData>({
    queryKey: ['crm-pipeline-income', profesionalId, periodo],
    queryFn: async () => {
      const { data } = await api.get('/reportes/crm/pipeline-income', {
        params: { profesionalId, periodo },
      });
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 1000 * 60 * 5,
  });
}
