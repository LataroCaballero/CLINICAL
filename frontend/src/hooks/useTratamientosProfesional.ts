import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Tratamiento,
  CreateTratamientoDto,
  UpdateTratamientoDto,
} from '@/types/tratamiento';

const QUERY_KEY = 'tratamientos-profesional';

/** profesionalId: cuando se pasa, la secretaria opera sobre ese profesional */
export function useTratamientosProfesional(
  includeInactive = false,
  profesionalId?: string,
) {
  return useQuery<Tratamiento[], Error>({
    queryKey: [QUERY_KEY, includeInactive, profesionalId],
    queryFn: async () => {
      const { data } = await api.get('/tratamientos/me', {
        params: {
          ...(includeInactive ? { includeInactive: 'true' } : {}),
          ...(profesionalId ? { profesionalId } : {}),
        },
      });
      return data;
    },
  });
}

export function useTratamiento(id: string | undefined, profesionalId?: string) {
  return useQuery<Tratamiento, Error>({
    queryKey: [QUERY_KEY, id, profesionalId],
    queryFn: async () => {
      const { data } = await api.get(`/tratamientos/${id}`, {
        params: profesionalId ? { profesionalId } : {},
      });
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTratamiento(profesionalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateTratamientoDto) => {
      const { data } = await api.post('/tratamientos', dto, {
        params: profesionalId ? { profesionalId } : {},
      });
      return data as Tratamiento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateTratamiento(profesionalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateTratamientoDto }) => {
      const { data } = await api.patch(`/tratamientos/${id}`, dto, {
        params: profesionalId ? { profesionalId } : {},
      });
      return data as Tratamiento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteTratamiento(profesionalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tratamientos/${id}`, {
        params: profesionalId ? { profesionalId } : {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useRestoreTratamiento(profesionalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/tratamientos/${id}/restore`, undefined, {
        params: profesionalId ? { profesionalId } : {},
      });
      return data as Tratamiento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
