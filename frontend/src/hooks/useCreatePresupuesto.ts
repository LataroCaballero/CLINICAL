import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface PresupuestoItemInput {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CreatePresupuestoInput {
  pacienteId: string;
  profesionalId: string;
  items: PresupuestoItemInput[];
  descuentos?: number;
}

export function useCreatePresupuesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePresupuestoInput) => {
      const response = await api.post("/presupuestos", data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["presupuestos", variables.pacienteId],
      });
    },
  });
}

export function useAceptarPresupuesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      presupuestoId,
      pacienteId,
    }: {
      presupuestoId: string;
      pacienteId: string;
    }) => {
      const response = await api.patch(`/presupuestos/${presupuestoId}/aceptar`);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["presupuestos", variables.pacienteId],
      });
      queryClient.invalidateQueries({
        queryKey: ["cuenta-corriente", variables.pacienteId],
      });
    },
  });
}

export function useDeletePresupuesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      presupuestoId,
      pacienteId,
    }: {
      presupuestoId: string;
      pacienteId: string;
    }) => {
      const response = await api.delete(`/presupuestos/${presupuestoId}`);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["presupuestos", variables.pacienteId],
      });
    },
  });
}
