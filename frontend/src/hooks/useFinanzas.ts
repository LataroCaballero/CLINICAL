import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffectiveProfessionalId } from "./useEffectiveProfessionalId";
import {
  FinanzasDashboardKPIs,
  IngresosPorDia,
  IngresosPorObraSocial,
  CuentaCorrienteResumen,
  CuentasCorrientesFilters,
  MovimientoCC,
  AntiguedadDeuda,
  Pago,
  PagosFilters,
  CreatePagoInput,
  Presupuesto,
  PresupuestosFilters,
  CreatePresupuestoInput,
  Factura,
  FacturasFilters,
  CreateFacturaInput,
  PracticaRealizada,
  LiquidacionesFilters,
  CierreMensualResumen,
  ReporteIngresosParams,
  ReporteIngresos,
  EstadoPresupuesto,
} from "@/types/finanzas";

// ================== DASHBOARD ==================

export function useFinanzasDashboard() {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<FinanzasDashboardKPIs>({
    queryKey: ["finanzas", "dashboard", profesionalId],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/finanzas/dashboard", {
        params: { profesionalId },
      });
      return data;
    },
  });
}

export function useIngresosPorDia(dias: number = 30) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<IngresosPorDia[]>({
    queryKey: ["finanzas", "ingresos-por-dia", profesionalId, dias],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/finanzas/ingresos-por-dia", {
        params: { profesionalId, dias },
      });
      return data;
    },
  });
}

export function useIngresosPorObraSocial() {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<IngresosPorObraSocial[]>({
    queryKey: ["finanzas", "ingresos-por-obra-social", profesionalId],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/finanzas/ingresos-por-obra-social", {
        params: { profesionalId },
      });
      return data;
    },
  });
}

// ================== CUENTAS CORRIENTES ==================

export function useCuentasCorrientes(filters?: CuentasCorrientesFilters) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<CuentaCorrienteResumen[]>({
    queryKey: ["finanzas", "cuentas-corrientes", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/cuentas-corrientes", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
  });
}

export function useCuentaCorrienteDetalle(pacienteId: string | undefined) {
  return useQuery({
    queryKey: ["cuenta-corriente", pacienteId],
    enabled: !!pacienteId,
    queryFn: async () => {
      const { data } = await api.get(`/cuentas-corrientes/${pacienteId}`);
      return data;
    },
  });
}

export function useMovimientosCC(pacienteId: string | undefined) {
  return useQuery<MovimientoCC[]>({
    queryKey: ["cuenta-corriente", pacienteId, "movimientos"],
    enabled: !!pacienteId,
    queryFn: async () => {
      const { data } = await api.get(
        `/cuentas-corrientes/${pacienteId}/movimientos`
      );
      return data;
    },
  });
}

export function useAntiguedadDeuda(pacienteId: string | undefined) {
  return useQuery<AntiguedadDeuda>({
    queryKey: ["cuenta-corriente", pacienteId, "antiguedad"],
    enabled: !!pacienteId,
    queryFn: async () => {
      const { data } = await api.get(
        `/cuentas-corrientes/${pacienteId}/antiguedad-deuda`
      );
      return data;
    },
  });
}

// ================== PAGOS ==================

export function usePagos(filters?: PagosFilters) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<Pago[]>({
    queryKey: ["finanzas", "pagos", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/finanzas/pagos", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
  });
}

export function useCreatePago() {
  const queryClient = useQueryClient();
  const profesionalId = useEffectiveProfessionalId();

  return useMutation({
    mutationFn: async (input: CreatePagoInput) => {
      const { data } = await api.post("/finanzas/pagos", input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cuenta-corriente", variables.pacienteId],
      });
      queryClient.invalidateQueries({
        queryKey: ["finanzas", "pagos", profesionalId],
      });
      queryClient.invalidateQueries({
        queryKey: ["finanzas", "dashboard", profesionalId],
      });
      queryClient.invalidateQueries({
        queryKey: ["finanzas", "cuentas-corrientes", profesionalId],
      });
      queryClient.invalidateQueries({ queryKey: ["alertas-resumen"] });
    },
  });
}

export function useAnularPago() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pagoId,
    }: {
      pagoId: string;
      pacienteId: string;
    }) => {
      const { data } = await api.post(
        `/cuentas-corrientes/movimientos/${pagoId}/anular`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finanzas"] });
      queryClient.invalidateQueries({ queryKey: ["cuenta-corriente"] });
      queryClient.invalidateQueries({ queryKey: ["alertas-resumen"] });
    },
  });
}

// ================== PRESUPUESTOS ==================

export function usePresupuestosFinanzas(filters?: PresupuestosFilters) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<Presupuesto[]>({
    queryKey: ["finanzas", "presupuestos", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/presupuestos", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
  });
}

export function usePresupuestoDetalle(presupuestoId: string | undefined) {
  return useQuery<Presupuesto>({
    queryKey: ["presupuesto", presupuestoId],
    enabled: !!presupuestoId,
    queryFn: async () => {
      const { data } = await api.get(`/presupuestos/${presupuestoId}`);
      return data;
    },
  });
}

export function useCreatePresupuesto() {
  const queryClient = useQueryClient();
  const profesionalId = useEffectiveProfessionalId();

  return useMutation({
    mutationFn: async (input: CreatePresupuestoInput) => {
      const { data } = await api.post("/presupuestos", {
        ...input,
        profesionalId,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finanzas", "presupuestos"] });
      queryClient.invalidateQueries({ queryKey: ["presupuestos"] });
    },
  });
}

export function useUpdatePresupuestoEstado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      presupuestoId,
      estado,
      motivoRechazo,
    }: {
      presupuestoId: string;
      estado: EstadoPresupuesto;
      motivoRechazo?: string;
    }) => {
      if (estado === EstadoPresupuesto.ACEPTADO) {
        const { data } = await api.patch(
          `/presupuestos/${presupuestoId}/aceptar`
        );
        return data;
      }
      const { data } = await api.patch(`/presupuestos/${presupuestoId}`, {
        estado,
        motivoRechazo,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["finanzas", "presupuestos"] });
      queryClient.invalidateQueries({
        queryKey: ["presupuesto", variables.presupuestoId],
      });
      queryClient.invalidateQueries({ queryKey: ["presupuestos"] });
      queryClient.invalidateQueries({ queryKey: ["cuenta-corriente"] });
      queryClient.invalidateQueries({ queryKey: ["alertas-resumen"] });
    },
  });
}

export function useEnviarPresupuesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      presupuestoId,
      via,
    }: {
      presupuestoId: string;
      via: "email" | "whatsapp" | "pdf";
    }) => {
      // TODO: Implement actual send logic when backend endpoint is ready
      console.log(`Sending presupuesto ${presupuestoId} via ${via}`);
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["presupuesto", variables.presupuestoId],
      });
    },
  });
}

// ================== FACTURACION ==================

export function useFacturas(filters?: FacturasFilters) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<Factura[]>({
    queryKey: ["finanzas", "facturas", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/finanzas/facturas", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
  });
}

export function useCreateFactura() {
  const queryClient = useQueryClient();
  const profesionalId = useEffectiveProfessionalId();

  return useMutation({
    mutationFn: async (input: CreateFacturaInput) => {
      const { data } = await api.post("/finanzas/facturas", {
        ...input,
        profesionalId,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finanzas", "facturas"] });
    },
  });
}

export function useAnularFactura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (facturaId: string) => {
      const { data } = await api.post(`/finanzas/facturas/${facturaId}/anular`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finanzas", "facturas"] });
    },
  });
}

export function useGenerarFacturaPDF() {
  return useMutation({
    mutationFn: async (facturaId: string) => {
      // TODO: Implement PDF generation when backend endpoint is ready
      console.log(`Generating PDF for factura ${facturaId}`);
      throw new Error("PDF generation not implemented yet");
    },
  });
}

// ================== LIQUIDACIONES ==================

export function usePracticasPendientes(filters?: LiquidacionesFilters) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<PracticaRealizada[]>({
    queryKey: ["finanzas", "practicas-pendientes", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/finanzas/practicas-pendientes", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
  });
}

export function useMarcarPracticasPagadas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (practicaIds: string[]) => {
      const { data } = await api.post("/finanzas/practicas/marcar-pagadas", {
        practicaIds,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["finanzas", "practicas-pendientes"],
      });
      queryClient.invalidateQueries({ queryKey: ["finanzas", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["alertas-resumen"] });
    },
  });
}

// ================== CIERRE MENSUAL ==================

export function useCierreMensual(mes?: string) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<CierreMensualResumen>({
    queryKey: ["finanzas", "cierre-mensual", profesionalId, mes],
    enabled: !!profesionalId && !!mes,
    queryFn: async () => {
      const { data } = await api.get(`/finanzas/cierre-mensual/${mes}`, {
        params: { profesionalId },
      });
      return data;
    },
  });
}

// ================== REPORTES ==================

export function useReporteIngresos(params?: ReporteIngresosParams) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<ReporteIngresos>({
    queryKey: ["finanzas", "reporte-ingresos", profesionalId, params],
    enabled: !!profesionalId && !!params?.fechaDesde && !!params?.fechaHasta,
    queryFn: async () => {
      const { data } = await api.get("/finanzas/reportes/ingresos", {
        params: { profesionalId, ...params },
      });
      return data;
    },
  });
}

export function useExportarReporte() {
  return useMutation({
    mutationFn: async ({
      tipo,
      formato,
      params,
    }: {
      tipo: "ingresos" | "cuentas-por-cobrar" | "morosidad" | "liquidaciones";
      formato: "csv" | "pdf";
      params: Record<string, unknown>;
    }) => {
      // TODO: Implement export when backend endpoint is ready
      console.log(`Exporting ${tipo} report as ${formato}`);
      throw new Error("Export not implemented yet");
    },
  });
}
