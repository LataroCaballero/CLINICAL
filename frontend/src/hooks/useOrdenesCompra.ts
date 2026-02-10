"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import {
  OrdenCompra,
  CreateOrdenCompraInput,
  RecibirOrdenCompraInput,
  EstadoOrdenCompra,
} from "@/types/stock";

export function useOrdenesCompra(estado?: EstadoOrdenCompra) {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<OrdenCompra[], Error>({
    queryKey: ["ordenes-compra", professionalId, estado],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data } = await api.get("/ordenes-compra", {
        params: { profesionalId: professionalId, estado },
      });
      return data;
    },
  });
}

export function useOrdenCompra(id: string | null) {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<OrdenCompra, Error>({
    queryKey: ["orden-compra", id, professionalId],
    enabled: !!id && !!professionalId,
    queryFn: async () => {
      const { data } = await api.get(`/ordenes-compra/${id}`, {
        params: { profesionalId: professionalId },
      });
      return data;
    },
  });
}

export function useCreateOrdenCompra() {
  const queryClient = useQueryClient();
  const professionalId = useEffectiveProfessionalId();

  return useMutation<OrdenCompra, Error, CreateOrdenCompraInput>({
    mutationFn: async (data) => {
      const response = await api.post("/ordenes-compra", data, {
        params: { profesionalId: professionalId },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordenes-compra"] });
    },
  });
}

export function useActualizarEstadoOrden() {
  const queryClient = useQueryClient();
  const professionalId = useEffectiveProfessionalId();

  return useMutation<OrdenCompra, Error, { id: string; estado: EstadoOrdenCompra }>({
    mutationFn: async ({ id, estado }) => {
      const response = await api.patch(
        `/ordenes-compra/${id}/estado`,
        { estado },
        { params: { profesionalId: professionalId } }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ordenes-compra"] });
      queryClient.invalidateQueries({ queryKey: ["orden-compra", variables.id] });
    },
  });
}

export function useRecibirOrdenCompra() {
  const queryClient = useQueryClient();
  const professionalId = useEffectiveProfessionalId();

  return useMutation<
    OrdenCompra,
    Error,
    { id: string; data?: RecibirOrdenCompraInput }
  >({
    mutationFn: async ({ id, data }) => {
      const response = await api.post(`/ordenes-compra/${id}/recibir`, data ?? {}, {
        params: { profesionalId: professionalId },
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ordenes-compra"] });
      queryClient.invalidateQueries({ queryKey: ["orden-compra", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
      queryClient.invalidateQueries({ queryKey: ["alertas-stock"] });
      queryClient.invalidateQueries({ queryKey: ["lotes"] });
      // Invalidate provider accounts (new debt from received order)
      queryClient.invalidateQueries({ queryKey: ["cuentas-corrientes-proveedores"] });
      queryClient.invalidateQueries({ queryKey: ["resumen-deudas-proveedores"] });
      queryClient.invalidateQueries({ queryKey: ["cuotas-vencidas"] });
      queryClient.invalidateQueries({ queryKey: ["cuotas-proximas"] });
    },
  });
}

export function useCancelarOrdenCompra() {
  const queryClient = useQueryClient();
  const professionalId = useEffectiveProfessionalId();

  return useMutation<OrdenCompra, Error, string>({
    mutationFn: async (id) => {
      const response = await api.post(
        `/ordenes-compra/${id}/cancelar`,
        {},
        { params: { profesionalId: professionalId } }
      );
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["ordenes-compra"] });
      queryClient.invalidateQueries({ queryKey: ["orden-compra", id] });
    },
  });
}
