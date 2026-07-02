import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CONSENTIMIENTOS_QUERY_KEY } from '@/hooks/useConsentimientos';
import { CATALOGO_HC_QUERY_KEY } from '@/hooks/useCatalogoHC';

export function useUploadConsentimiento(profesionalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ zonaId, file }: { zonaId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(
        `/consentimientos/zonas/${zonaId}/pdf`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          params: profesionalId ? { profesionalId } : {},
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONSENTIMIENTOS_QUERY_KEY] });
    },
  });
}

export function useUpdateIndicaciones(profesionalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      zonaId,
      indicacionesUrl,
    }: {
      zonaId: string;
      indicacionesUrl: string | null;
    }) => {
      const { data } = await api.patch(
        `/catalogo-hc/zonas/${zonaId}/indicaciones`,
        { indicacionesUrl },
        { params: profesionalId ? { profesionalId } : {} },
      );
      return data;
    },
    onSuccess: () => {
      // Invalidate both keys: indicacionesUrl lives on ZonaHC (catalogo-hc) and is
      // also reflected in the consentimientos response shape.
      queryClient.invalidateQueries({ queryKey: [CATALOGO_HC_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [CONSENTIMIENTOS_QUERY_KEY] });
    },
  });
}
