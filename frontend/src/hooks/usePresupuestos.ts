import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PresupuestoItem {
  id: string;
  descripcion: string;
  precioTotal: number; // replaces cantidad + precioUnitario + total
  orden: number;
}

export interface Presupuesto {
  id: string;
  pacienteId: string;
  profesionalId: string;
  createdAt: string;
  subtotal: number;
  descuentos: number;
  total: number;
  moneda: string; // "ARS" | "USD"
  fechaValidez?: string | null; // ISO date string
  estado: "BORRADOR" | "ENVIADO" | "ACEPTADO" | "RECHAZADO" | "CANCELADO" | "VENCIDO";
  items: PresupuestoItem[];
}

export function usePresupuestos(pacienteId: string | undefined) {
  return useQuery<Presupuesto[], Error>({
    queryKey: ["presupuestos", pacienteId],
    queryFn: async () => {
      const { data } = await api.get("/presupuestos", {
        params: { pacienteId },
      });
      return data;
    },
    enabled: !!pacienteId,
  });
}
