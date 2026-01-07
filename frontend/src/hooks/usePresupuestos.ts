import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PresupuestoItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

export interface Presupuesto {
  id: string;
  pacienteId: string;
  profesionalId: string;
  createdAt: string;
  subtotal: number;
  descuentos: number;
  total: number;
  estado: "BORRADOR" | "ENVIADO" | "ACEPTADO" | "RECHAZADO" | "CANCELADO";
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
