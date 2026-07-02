import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ZonaConConsentimiento } from '@/types/consentimientos';

export const CONSENTIMIENTOS_QUERY_KEY = 'consentimientos-zonas';

export function useConsentimientos(profesionalId?: string, options?: { enabled?: boolean }) {
  return useQuery<ZonaConConsentimiento[], Error>({
    queryKey: [CONSENTIMIENTOS_QUERY_KEY, profesionalId],
    queryFn: async () => {
      const { data } = await api.get('/consentimientos/zonas', {
        params: profesionalId ? { profesionalId } : {},
      });
      return data;
    },
    enabled: options?.enabled ?? true,
    // Los consentimientos cambian poco y las mutaciones invalidan por CONSENTIMIENTOS_QUERY_KEY.
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
