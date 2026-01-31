"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CreateProductoInput, Producto } from "@/types/stock";

export function useCreateProducto() {
  const queryClient = useQueryClient();

  return useMutation<Producto, Error, CreateProductoInput>({
    mutationFn: async (data) => {
      const response = await api.post("/productos", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
    },
  });
}

export function useUpdateProducto() {
  const queryClient = useQueryClient();

  return useMutation<
    Producto,
    Error,
    { id: string; data: Partial<CreateProductoInput> }
  >({
    mutationFn: async ({ id, data }) => {
      const response = await api.patch(`/productos/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["producto", variables.id] });
    },
  });
}

export function useDeleteProducto() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/productos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
}
