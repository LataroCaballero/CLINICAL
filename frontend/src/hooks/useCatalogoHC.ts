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
    // El catálogo cambia poco y las mutaciones invalidan por CATALOGO_HC_QUERY_KEY.
    // Mantenerlo fresco en caché evita refetch al reabrir la plantilla de Primera Consulta.
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
