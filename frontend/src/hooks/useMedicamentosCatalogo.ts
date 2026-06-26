import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const MEDICAMENTOS_CATALOGO_QUERY_KEY = 'medicamentos-catalogo';

export interface CatalogoItem {
  id: string;
  nombre: string;
  esSistema: boolean;
}

export function useMedicamentosCatalogo(profesionalId?: string) {
  return useQuery<CatalogoItem[], Error>({
    queryKey: [MEDICAMENTOS_CATALOGO_QUERY_KEY, profesionalId],
    queryFn: async () => {
      const { data } = await api.get('/catalogo-hc/medicamentos', {
        params: profesionalId ? { profesionalId } : {},
      });
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
