"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import {
  Inventario,
  InventarioConMovimientos,
  MovimientoStock,
  CreateMovimientoInput,
  UpdateInventarioInput,
  Lote,
} from "@/types/stock";

export function useInventario(filters?: { bajoStock?: boolean }) {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<Inventario[], Error>({
    queryKey: ["inventario", professionalId, filters],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data } = await api.get("/inventario", {
        params: {
          profesionalId: professionalId,
          bajoStock: filters?.bajoStock,
        },
      });
      return data;
    },
  });
}

export function useInventarioProducto(productoId: string | null) {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<InventarioConMovimientos, Error>({
    queryKey: ["inventario", productoId, professionalId],
    enabled: !!productoId && !!professionalId,
    queryFn: async () => {
      const { data } = await api.get(`/inventario/${productoId}`, {
        params: { profesionalId: professionalId },
      });
      return data;
    },
  });
}

export function useMovimientosStock(
  productoId: string | null,
  limit = 50,
  offset = 0
) {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<MovimientoStock[], Error>({
    queryKey: ["movimientos-stock", productoId, professionalId, limit, offset],
    enabled: !!productoId && !!professionalId,
    queryFn: async () => {
      const { data } = await api.get(`/inventario/${productoId}/movimientos`, {
        params: { profesionalId: professionalId, limit, offset },
      });
      return data;
    },
  });
}

export function useAlertasStock() {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<Inventario[], Error>({
    queryKey: ["alertas-stock", professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data } = await api.get("/inventario/alertas", {
        params: { profesionalId: professionalId },
      });
      return data;
    },
  });
}

export function useProximosVencer(dias = 30) {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<Lote[], Error>({
    queryKey: ["proximos-vencer", professionalId, dias],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data } = await api.get("/inventario/proximos-vencer", {
        params: { profesionalId: professionalId, dias },
      });
      return data;
    },
  });
}

export function useLotesProducto(productoId: string | null) {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<Lote[], Error>({
    queryKey: ["lotes", productoId, professionalId],
    enabled: !!productoId && !!professionalId,
    queryFn: async () => {
      const { data } = await api.get(`/inventario/${productoId}/lotes`, {
        params: { profesionalId: professionalId },
      });
      return data;
    },
  });
}

export function useCreateMovimiento() {
  const queryClient = useQueryClient();
  const professionalId = useEffectiveProfessionalId();

  return useMutation<
    { movimiento: MovimientoStock; stockActual: number; stockAnterior: number },
    Error,
    CreateMovimientoInput
  >({
    mutationFn: async (data) => {
      const response = await api.post("/inventario/movimiento", data, {
        params: { profesionalId: professionalId },
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
      queryClient.invalidateQueries({
        queryKey: ["movimientos-stock", variables.productoId],
      });
      queryClient.invalidateQueries({ queryKey: ["alertas-stock"] });
      queryClient.invalidateQueries({ queryKey: ["lotes", variables.productoId] });
    },
  });
}

export function useUpdateInventario() {
  const queryClient = useQueryClient();
  const professionalId = useEffectiveProfessionalId();

  return useMutation<Inventario, Error, { productoId: string; data: UpdateInventarioInput }>({
    mutationFn: async ({ productoId, data }) => {
      const response = await api.patch(`/inventario/${productoId}`, data, {
        params: { profesionalId: professionalId },
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
      queryClient.invalidateQueries({
        queryKey: ["inventario", variables.productoId],
      });
      queryClient.invalidateQueries({ queryKey: ["alertas-stock"] });
    },
  });
}
