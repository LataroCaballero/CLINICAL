import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Tratamiento,
  CreateTratamientoDto,
  UpdateTratamientoDto,
} from '@/types/tratamiento';

const QUERY_KEY = 'tratamientos-profesional';

export function useTratamientosProfesional(includeInactive = false) {
  return useQuery<Tratamiento[], Error>({
    queryKey: [QUERY_KEY, includeInactive],
    queryFn: async () => {
      const { data } = await api.get('/tratamientos/me', {
        params: includeInactive ? { includeInactive: 'true' } : {},
      });
      return data;
    },
  });
}

export function useTratamiento(id: string | undefined) {
  return useQuery<Tratamiento, Error>({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await api.get(`/tratamientos/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTratamiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateTratamientoDto) => {
      const { data } = await api.post('/tratamientos', dto);
      return data as Tratamiento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateTratamiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateTratamientoDto }) => {
      const { data } = await api.patch(`/tratamientos/${id}`, dto);
      return data as Tratamiento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteTratamiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tratamientos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useRestoreTratamiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/tratamientos/${id}/restore`);
      return data as Tratamiento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
