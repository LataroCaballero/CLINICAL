import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffectiveProfessionalId } from "./useEffectiveProfessionalId";
import { ReporteIngresos, ReporteIngresosFilters, Agrupacion } from "@/types/reportes";

// Tipos para reportes financieros
export interface ReporteIngresosPorProfesional {
  totalIngresos: number;
  porProfesional: IngresosPorProfesional[];
}

export interface IngresosPorProfesional {
  profesionalId: string;
  nombre: string;
  especialidad: string;
  ingresos: number;
  cantidadTurnos: number;
  ticketPromedio: number;
  porcentajeTotal: number;
}

export interface ReporteIngresosPorObraSocial {
  totalIngresos: number;
  porObraSocial: IngresosPorObraSocial[];
}

export interface IngresosPorObraSocial {
  obraSocialId: string;
  nombre: string;
  ingresos: number;
  cantidadPacientes: number;
  cantidadPracticas: number;
  porcentajeTotal: number;
}

export interface ReporteIngresosPorPrestacion {
  totalIngresos: number;
  totalPrestaciones: number;
  porPrestacion: IngresosPorPrestacion[];
}

export interface IngresosPorPrestacion {
  codigo: string;
  descripcion: string;
  cantidad: number;
  ingresoTotal: number;
  promedioUnitario: number;
}

export interface ReporteCuentasPorCobrar {
  totalPorCobrar: number;
  totalVencido: number;
  cantidadCuentas: number;
  cuentas: CuentaPorCobrar[];
}

export interface CuentaPorCobrar {
  pacienteId: string;
  nombreCompleto: string;
  telefono: string;
  email: string | null;
  saldoActual: number;
  saldoVencido: number;
  ultimoMovimiento: string | null;
}

export interface ReporteMorosidad {
  indiceGeneral: number;
  montoTotalMoroso: number;
  cantidadCuentasMorosas: number;
  cuentasMorosas: CuentaMorosa[];
}

export interface CuentaMorosa {
  pacienteId: string;
  nombreCompleto: string;
  telefono: string;
  montoVencido: number;
  diasMorosidad: number;
  ultimoPago: string | null;
}

export interface ReportePagosPendientes {
  totalPendiente: number;
  porTipo: PagoPendientePorTipo[];
  detalle: PagoPendienteDetalle[];
}

export interface PagoPendientePorTipo {
  tipo: string;
  cantidad: number;
  monto: number;
}

export interface PagoPendienteDetalle {
  id: string;
  paciente: string;
  concepto: string;
  monto: number;
  fechaVencimiento: string;
}

interface ReporteFilters {
  fechaDesde?: string;
  fechaHasta?: string;
}

/**
 * Hook para el reporte de ingresos
 */
export function useReporteIngresos(filters?: ReporteIngresosFilters) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<ReporteIngresos>({
    queryKey: ["reportes", "financieros", "ingresos", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/reportes/financieros/ingresos", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para el reporte de ingresos por profesional
 */
export function useReporteIngresosPorProfesional(filters?: ReporteFilters) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<ReporteIngresosPorProfesional>({
    queryKey: ["reportes", "financieros", "ingresos-profesional", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/reportes/financieros/ingresos-por-profesional", {
        params: { ...filters },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para el reporte de ingresos por obra social
 */
export function useReporteIngresosPorObraSocial(filters?: ReporteFilters) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<ReporteIngresosPorObraSocial>({
    queryKey: ["reportes", "financieros", "ingresos-obra-social", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/reportes/financieros/ingresos-por-obra-social", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para el reporte de ingresos por prestación
 */
export function useReporteIngresosPorPrestacion(filters?: ReporteFilters) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<ReporteIngresosPorPrestacion>({
    queryKey: ["reportes", "financieros", "ingresos-prestacion", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/reportes/financieros/ingresos-por-prestacion", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para el reporte de cuentas por cobrar
 */
export function useReporteCuentasPorCobrar(filters?: { soloVencidas?: boolean; limite?: number }) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<ReporteCuentasPorCobrar>({
    queryKey: ["reportes", "financieros", "cuentas-por-cobrar", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/reportes/financieros/cuentas-por-cobrar", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para el reporte de morosidad
 */
export function useReporteMorosidad(filters?: { diasVencimiento?: number; limite?: number }) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<ReporteMorosidad>({
    queryKey: ["reportes", "financieros", "morosidad", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/reportes/financieros/morosidad", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para el reporte de pagos pendientes
 */
export function useReportePagosPendientes(filters?: ReporteFilters) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<ReportePagosPendientes>({
    queryKey: ["reportes", "financieros", "pagos-pendientes", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/reportes/financieros/pagos-pendientes", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
