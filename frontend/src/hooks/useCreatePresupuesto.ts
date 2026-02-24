import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface PresupuestoItemInput {
  descripcion: string;
  precioTotal: number;
}

export interface CreatePresupuestoInput {
  pacienteId: string;
  profesionalId: string;
  items: PresupuestoItemInput[];
  descuentos?: number;
  moneda?: "ARS" | "USD";
  fechaValidez?: string; // ISO date string YYYY-MM-DD
}

export function useCreatePresupuesto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePresupuestoInput) => {
      const response = await api.post("/presupuestos", data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["presupuestos", variables.pacienteId] });
    },
  });
}

export function useAceptarPresupuesto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ presupuestoId }: { presupuestoId: string; pacienteId: string }) => {
      const response = await api.patch(`/presupuestos/${presupuestoId}/aceptar`);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["presupuestos", variables.pacienteId] });
      queryClient.invalidateQueries({ queryKey: ["cuenta-corriente", variables.pacienteId] });
      queryClient.invalidateQueries({ queryKey: ["alertas-resumen"] });
    },
  });
}

export function useDeletePresupuesto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ presupuestoId }: { presupuestoId: string; pacienteId: string }) => {
      const response = await api.delete(`/presupuestos/${presupuestoId}`);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["presupuestos", variables.pacienteId] });
    },
  });
}
