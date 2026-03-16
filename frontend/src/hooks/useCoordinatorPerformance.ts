import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Periodo } from './usePeriodoFilter';

export interface CoordinadorRow {
  nombre: string;
  interacciones: number;
  pacientesContactados: number;
  porcentajeConversion: number | null;
}

export interface CoordinatorPerformanceData {
  periodo: { inicio: string; fin: string };
  coordinadores: CoordinadorRow[];
}

export function useCoordinatorPerformance(profesionalId: string | null, periodo: Periodo = 'semana') {
  return useQuery<CoordinatorPerformanceData>({
    queryKey: ['coordinator-performance', profesionalId, periodo],
    queryFn: async () => {
      const { data } = await api.get('/reportes/crm/coordinator-performance', {
        params: { profesionalId, periodo },
      });
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 1000 * 60 * 5,
  });
}
