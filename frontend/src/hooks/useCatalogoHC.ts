import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ZonaHC } from '@/types/catalogo-hc';

export const CATALOGO_HC_QUERY_KEY = 'catalogo-hc';

export function useCatalogoHC(profesionalId?: string, options?: { enabled?: boolean }) {
  return useQuery<ZonaHC[], Error>({
    queryKey: [CATALOGO_HC_QUERY_KEY, profesionalId],
    queryFn: async () => {
      const { data } = await api.get('/catalogo-hc', {
        params: profesionalId ? { profesionalId } : {},
      });
      return data;
    },
    enabled: options?.enabled ?? true,
  });
}
