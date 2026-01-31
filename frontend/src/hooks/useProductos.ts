"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Producto, TipoProducto } from "@/types/stock";

export function useProductos(filters?: {
  q?: string;
  tipo?: TipoProducto;
  categoria?: string;
}) {
  return useQuery<Producto[], Error>({
    queryKey: ["productos", filters],
    queryFn: async () => {
      const { data } = await api.get("/productos", { params: filters });
      return data;
    },
  });
}

export function useProducto(id: string | null) {
  return useQuery<Producto, Error>({
    queryKey: ["producto", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/productos/${id}`);
      return data;
    },
  });
}

export function useCategorias() {
  return useQuery<string[], Error>({
    queryKey: ["productos", "categorias"],
    queryFn: async () => {
      const { data } = await api.get("/productos/categorias");
      return data;
    },
  });
}
