import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Usuario = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  telefono?: string | null;
  createdAt: string;
};

export type CreateUsuarioDto = {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: "PROFESIONAL" | "SECRETARIA" | "FACTURADOR";
  telefono?: string;
};

export function useUsuarios() {
  return useQuery<Usuario[]>({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data } = await api.get("/usuarios");
      return data;
    },
  });
}

export function useCreateUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateUsuarioDto) => {
      const { data } = await api.post("/usuarios", dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });
}

export function useDeleteUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/usuarios/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });
}
