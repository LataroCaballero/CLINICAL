import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CuentaCorriente {
  id: string;
  pacienteId: string;
  saldoActual: number;
  totalPagadoHistorico: number;
}

export interface MovimientoCC {
  id: string;
  monto: number;
  tipo: "CARGO" | "PAGO";
  descripcion: string | null;
  fecha: string;
  turno?: {
    id: string;
    inicio: string;
    tipoTurno?: { nombre: string };
  } | null;
  presupuesto?: {
    id: string;
    total: number;
  } | null;
}

export function useCuentaCorriente(pacienteId: string | undefined) {
  return useQuery<CuentaCorriente, Error>({
    queryKey: ["cuenta-corriente", pacienteId],
    queryFn: async () => {
      const { data } = await api.get(`/cuentas-corrientes/${pacienteId}`);
      return data;
    },
    enabled: !!pacienteId,
  });
}

export function useMovimientosCC(pacienteId: string | undefined) {
  return useQuery<MovimientoCC[], Error>({
    queryKey: ["cuenta-corriente", pacienteId, "movimientos"],
    queryFn: async () => {
      const { data } = await api.get(
        `/cuentas-corrientes/${pacienteId}/movimientos`
      );
      return data;
    },
    enabled: !!pacienteId,
  });
}

export interface CreateMovimientoInput {
  monto: number;
  tipo: "CARGO" | "PAGO";
  descripcion?: string;
  turnoId?: string;
  presupuestoId?: string;
}

export function useCreateMovimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pacienteId,
      data,
    }: {
      pacienteId: string;
      data: CreateMovimientoInput;
    }) => {
      const response = await api.post(
        `/cuentas-corrientes/${pacienteId}/movimientos`,
        data
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cuenta-corriente", variables.pacienteId],
      });
      queryClient.invalidateQueries({ queryKey: ["alertas-resumen"] });
    },
  });
}
