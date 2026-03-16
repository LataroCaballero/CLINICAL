import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Periodo } from './usePeriodoFilter';

export interface CRMKpisData {
  periodo: { inicio: string; fin: string };
  nuevos: number;
  confirmados: number;
  totalActivos: number;
  tasaConversion: number;
}

export function useCRMKpis(profesionalId: string | null, periodo: Periodo = 'mes') {
  return useQuery<CRMKpisData>({
    queryKey: ['crm-kpis', profesionalId, periodo],
    queryFn: async () => {
      const { data } = await api.get('/reportes/crm/kpis', {
        params: { profesionalId, periodo },
      });
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 1000 * 60 * 5,
  });
}
