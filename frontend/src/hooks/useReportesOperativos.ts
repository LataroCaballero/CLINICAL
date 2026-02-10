import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffectiveProfessionalId } from "./useEffectiveProfessionalId";
import {
  ReporteTurnos,
  ReporteAusentismo,
  ReporteTurnosFilters,
  Agrupacion,
} from "@/types/reportes";

// Tipos adicionales para los reportes operativos
export interface ReporteOcupacion {
  tasaOcupacionGeneral: number;
  porProfesional: OcupacionPorProfesional[];
}

export interface OcupacionPorProfesional {
  profesionalId: string;
  nombre: string;
  especialidad: string;
  turnosDisponibles: number;
  turnosAgendados: number;
  turnosCompletados: number;
  tasaOcupacion: number;
  tasaEfectividad: number;
}

export interface ReporteProcedimientos {
  totalProcedimientos: number;
  ingresoTotal: number;
  ranking: ProcedimientoRanking[];
}

export interface ProcedimientoRanking {
  codigo: string;
  descripcion: string;
  cantidad: number;
  ingresoTotal: number;
}

export interface ReporteVentasProductos {
  totalVentas: number;
  cantidadProductos: number;
  ventasPorProducto: VentaPorProducto[];
  ventasPorPaciente: VentaPorPaciente[];
}

export interface VentaPorProducto {
  productoId: string;
  nombre: string;
  cantidad: number;
  ingresos: number;
}

export interface VentaPorPaciente {
  pacienteId: string;
  nombreCompleto: string;
  compras: number;
  montoTotal: number;
  ultimaCompra: string;
}

interface ReporteFilters {
  fechaDesde?: string;
  fechaHasta?: string;
}

/**
 * Hook para el reporte de turnos
 */
export function useReporteTurnos(filters?: ReporteTurnosFilters) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<ReporteTurnos>({
    queryKey: ["reportes", "operativos", "turnos", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/reportes/operativos/turnos", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para el reporte de ausentismo
 */
export function useReporteAusentismo(filters?: ReporteFilters & { limite?: number }) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<ReporteAusentismo>({
    queryKey: ["reportes", "operativos", "ausentismo", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/reportes/operativos/ausentismo", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para el reporte de ocupación
 */
export function useReporteOcupacion(filters?: ReporteFilters) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<ReporteOcupacion>({
    queryKey: ["reportes", "operativos", "ocupacion", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/reportes/operativos/ocupacion", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para el ranking de procedimientos
 */
export function useReporteProcedimientos(filters?: ReporteFilters & { limite?: number }) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<ReporteProcedimientos>({
    queryKey: ["reportes", "operativos", "procedimientos", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/reportes/operativos/procedimientos-ranking", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para el reporte de ventas de productos
 */
export function useReporteVentasProductos(filters?: ReporteFilters) {
  const profesionalId = useEffectiveProfessionalId();

  return useQuery<ReporteVentasProductos>({
    queryKey: ["reportes", "operativos", "ventas-productos", profesionalId, filters],
    enabled: !!profesionalId,
    queryFn: async () => {
      const { data } = await api.get("/reportes/operativos/ventas-productos", {
        params: { profesionalId, ...filters },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
