import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  CirugiaCatalogo,
  CreateCirugiaCatalogoDto,
  UpdateCirugiaCatalogoDto,
  SetInsumosCirugiaDto,
} from '@/types/cirugia-catalogo';

const QUERY_KEY = 'cirugias-catalogo';

export function useCirugiasCatalogo(profesionalId?: string, includeInactive = false) {
  return useQuery<CirugiaCatalogo[], Error>({
    queryKey: [QUERY_KEY, profesionalId, includeInactive],
    queryFn: async () => {
      const { data } = await api.get('/cirugias-catalogo', {
        params: {
          ...(profesionalId ? { profesionalId } : {}),
          ...(includeInactive ? { includeInactive: 'true' } : {}),
        },
      });
      return data;
    },
  });
}

export function useCreateCirugiaCatalogo(profesionalId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateCirugiaCatalogoDto) => {
      const { data } = await api.post('/cirugias-catalogo', dto, {
        params: profesionalId ? { profesionalId } : undefined,
      });
      return data as CirugiaCatalogo;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateCirugiaCatalogo(profesionalId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateCirugiaCatalogoDto }) => {
      const { data } = await api.patch(`/cirugias-catalogo/${id}`, dto, {
        params: profesionalId ? { profesionalId } : undefined,
      });
      return data as CirugiaCatalogo;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useDeleteCirugiaCatalogo(profesionalId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/cirugias-catalogo/${id}`, {
        params: profesionalId ? { profesionalId } : undefined,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useSetInsumosCirugia(profesionalId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: SetInsumosCirugiaDto }) => {
      const { data } = await api.put(`/cirugias-catalogo/${id}/insumos`, dto, {
        params: profesionalId ? { profesionalId } : undefined,
      });
      return data as CirugiaCatalogo;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useRecalcularPrecioCirugia(profesionalId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/cirugias-catalogo/${id}/recalcular-precio`, {}, {
        params: profesionalId ? { profesionalId } : undefined,
      });
      return data as CirugiaCatalogo;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
