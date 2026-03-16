import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface FunnelEtapa {
  etapa: string;
  count: number;
}

export interface TasaPaso {
  de: string;
  a: string;
  tasa: number | null;
}

export interface FunnelData {
  etapas: FunnelEtapa[];
  tasasPaso: TasaPaso[];
  perdidos: {
    total: number;
    porMotivo: { motivo: string; count: number }[];
  };
}

export function useCRMFunnel(profesionalId: string | null) {
  return useQuery<FunnelData>({
    queryKey: ['crm-funnel', profesionalId],
    queryFn: async () => {
      const { data } = await api.get('/reportes/crm/funnel', {
        params: { profesionalId },
      });
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 1000 * 60 * 5,
  });
}
