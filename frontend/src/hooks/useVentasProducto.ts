"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
import {
  VentaProducto,
  CreateVentaProductoInput,
  ResumenVentas,
} from "@/types/stock";

export function useVentasProducto(filters?: {
  pacienteId?: string;
  desde?: string;
  hasta?: string;
}) {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<VentaProducto[], Error>({
    queryKey: ["ventas-producto", professionalId, filters],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data } = await api.get("/ventas-producto", {
        params: {
          profesionalId: professionalId,
          ...filters,
        },
      });
      return data;
    },
  });
}

export function useVentaProducto(id: string | null) {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<VentaProducto, Error>({
    queryKey: ["venta-producto", id, professionalId],
    enabled: !!id && !!professionalId,
    queryFn: async () => {
      const { data } = await api.get(`/ventas-producto/${id}`, {
        params: { profesionalId: professionalId },
      });
      return data;
    },
  });
}

export function useResumenVentas(desde?: string, hasta?: string) {
  const professionalId = useEffectiveProfessionalId();

  return useQuery<ResumenVentas, Error>({
    queryKey: ["resumen-ventas", professionalId, desde, hasta],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data } = await api.get("/ventas-producto/resumen", {
        params: {
          profesionalId: professionalId,
          desde,
          hasta,
        },
      });
      return data;
    },
  });
}

export function useCreateVentaProducto() {
  const queryClient = useQueryClient();
  const professionalId = useEffectiveProfessionalId();

  return useMutation<VentaProducto, Error, CreateVentaProductoInput>({
    mutationFn: async (data) => {
      const response = await api.post("/ventas-producto", data, {
        params: { profesionalId: professionalId },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventas-producto"] });
      queryClient.invalidateQueries({ queryKey: ["resumen-ventas"] });
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
      queryClient.invalidateQueries({ queryKey: ["alertas-stock"] });
      queryClient.invalidateQueries({ queryKey: ["lotes"] });
    },
  });
}
