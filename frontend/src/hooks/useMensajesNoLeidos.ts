import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useEffectiveProfessionalId } from './useEffectiveProfessionalId';
import { useMensajesStore } from '@/store/mensajes-internos.store';
import { useEffect } from 'react';

export interface ContadoresNoLeidos {
  total: number;
  alta: number;
  porPaciente: Record<string, number>;
}

export function useMensajesNoLeidos() {
  const professionalId = useEffectiveProfessionalId();
  const updateUnreadCounts = useMensajesStore((s) => s.updateUnreadCounts);

  const query = useQuery<ContadoresNoLeidos>({
    queryKey: ['mensajes-no-leidos', professionalId],
    queryFn: async () => {
      const { data } = await api.get('/mensajes-internos/no-leidos', {
        params: professionalId ? { profesionalId: professionalId } : {},
      });
      return data;
    },
    refetchInterval: 20000, // Polling cada 20 segundos
    staleTime: 5000,
  });

  // Sincronizar con el store de Zustand
  useEffect(() => {
    if (query.data) {
      updateUnreadCounts(query.data);
    }
  }, [query.data, updateUnreadCounts]);

  return query;
}
