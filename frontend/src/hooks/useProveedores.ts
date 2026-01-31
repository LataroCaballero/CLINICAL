"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Proveedor,
  CreateProveedorInput,
  UpdateProveedorInput,
} from "@/types/stock";

export function useProveedores(q?: string) {
  return useQuery<Proveedor[], Error>({
    queryKey: ["proveedores", q],
    queryFn: async () => {
      const { data } = await api.get("/proveedores", { params: { q } });
      return data;
    },
  });
}

export function useProveedor(id: string | null) {
  return useQuery<Proveedor, Error>({
    queryKey: ["proveedor", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/proveedores/${id}`);
      return data;
    },
  });
}

export function useCreateProveedor() {
  const queryClient = useQueryClient();

  return useMutation<Proveedor, Error, CreateProveedorInput>({
    mutationFn: async (data) => {
      const response = await api.post("/proveedores", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
    },
  });
}

export function useUpdateProveedor() {
  const queryClient = useQueryClient();

  return useMutation<
    Proveedor,
    Error,
    { id: string; data: UpdateProveedorInput }
  >({
    mutationFn: async ({ id, data }) => {
      const response = await api.patch(`/proveedores/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
      queryClient.invalidateQueries({ queryKey: ["proveedor", variables.id] });
    },
  });
}

export function useDeleteProveedor() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/proveedores/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
    },
  });
}
