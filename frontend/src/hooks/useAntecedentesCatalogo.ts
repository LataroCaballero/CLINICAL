import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const ANTECEDENTES_CATALOGO_QUERY_KEY = 'antecedentes-catalogo';

export interface CatalogoItem {
  id: string;
  nombre: string;
  esSistema: boolean;
}

export function useAntecedentesCatalogo(profesionalId?: string) {
  return useQuery<CatalogoItem[], Error>({
    queryKey: [ANTECEDENTES_CATALOGO_QUERY_KEY, profesionalId],
    queryFn: async () => {
      const { data } = await api.get('/catalogo-hc/antecedentes', {
        params: profesionalId ? { profesionalId } : {},
      });
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
