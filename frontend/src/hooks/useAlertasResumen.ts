import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useEffectiveProfessionalId } from './useEffectiveProfessionalId';

export type Modulo = 'turnos' | 'finanzas' | 'stock';
export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AlertaItem {
  tipo: string;
  count: number;
}

export interface AlertaModulo {
  modulo: Modulo;
  count: number;
  severity: Severity;
  mensaje: string;
  detalle?: { items: AlertaItem[] };
}

export interface AlertasResumen {
  timestamp: string;
  alertas: AlertaModulo[];
  totalCount: number;
}

export function useAlertasResumen() {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<AlertasResumen>({
    queryKey: ['alertas-resumen', professionalId],
    queryFn: async () => {
      const { data } = await api.get('/alertas/resumen', {
        params: professionalId ? { profesionalId: professionalId } : {},
      });
      return data;
    },
    refetchInterval: 60000, // Polling cada 60 segundos
    staleTime: 30000,
  });
}
