import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const ALERGIAS_CATALOGO_QUERY_KEY = 'alergias-catalogo';

export interface CatalogoItem {
  id: string;
  nombre: string;
  esSistema: boolean;
}

export function useAlergiasCatalogo(profesionalId?: string) {
  return useQuery<CatalogoItem[], Error>({
    queryKey: [ALERGIAS_CATALOGO_QUERY_KEY, profesionalId],
    queryFn: async () => {
      const { data } = await api.get('/catalogo-hc/alergias', {
        params: profesionalId ? { profesionalId } : {},
      });
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
