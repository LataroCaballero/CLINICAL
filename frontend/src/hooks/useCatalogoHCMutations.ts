import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CATALOGO_HC_QUERY_KEY } from '@/hooks/useCatalogoHC';

export function useRenombrarZona(profesionalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: string }) => {
      const { data } = await api.patch(`/catalogo-hc/zonas/${id}`, { nombre }, {
        params: profesionalId ? { profesionalId } : {},
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATALOGO_HC_QUERY_KEY] });
    },
  });
}

export function useEliminarZona(profesionalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/catalogo-hc/zonas/${id}`, {
        params: profesionalId ? { profesionalId } : {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATALOGO_HC_QUERY_KEY] });
    },
  });
}

export function useRenombrarDiagnostico(profesionalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: string }) => {
      const { data } = await api.patch(`/catalogo-hc/diagnosticos/${id}`, { nombre }, {
        params: profesionalId ? { profesionalId } : {},
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATALOGO_HC_QUERY_KEY] });
    },
  });
}

export function useEliminarDiagnostico(profesionalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/catalogo-hc/diagnosticos/${id}`, {
        params: profesionalId ? { profesionalId } : {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATALOGO_HC_QUERY_KEY] });
    },
  });
}

export function useRenombrarTratamiento(profesionalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: string }) => {
      const { data } = await api.patch(`/catalogo-hc/tratamientos/${id}`, { nombre }, {
        params: profesionalId ? { profesionalId } : {},
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATALOGO_HC_QUERY_KEY] });
    },
  });
}

export function useEliminarTratamiento(profesionalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/catalogo-hc/tratamientos/${id}`, {
        params: profesionalId ? { profesionalId } : {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATALOGO_HC_QUERY_KEY] });
    },
  });
}
