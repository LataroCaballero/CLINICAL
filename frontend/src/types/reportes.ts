// Tipos para el módulo de Reportes y Analytics

// ========== Dashboard ==========

export interface TurnoResumen {
  id: string;
  fecha: string;
  hora: string;
  paciente: {
    id: string;
    nombreCompleto: string;
  };
  tipoTurno: {
    nombre: string;
    color: string;
  };
  estado: string;
}

export interface SerieTemporalItem {
  fecha: string;
  valor: number;
}

export interface TendenciasData {
  ingresosSemana: SerieTemporalItem[];
  turnosSemana: SerieTemporalItem[];
}

export interface DashboardKPIs {
  turnosHoy: number;
  turnosCompletados: number;
  turnosAusentes: number;
  turnosCancelados: number;
  turnosPendientes: number;
  ingresosHoy: number;
  proximosTurnos: TurnoResumen[];
  alertasPendientes: number;
  tendencias: TendenciasData;
}

// ========== Filtros ==========

export type Agrupacion = 'dia' | 'semana' | 'mes';

export interface ReporteFilters {
  fechaDesde?: string;
  fechaHasta?: string;
  profesionalId?: string;
}

export interface ReporteTurnosFilters extends ReporteFilters {
  agrupacion?: Agrupacion;
}

export interface ReporteIngresosFilters extends ReporteFilters {
  obraSocialId?: string;
  agrupacion?: Agrupacion;
}

// ========== Reportes Operativos ==========

export interface TurnosPorPeriodo {
  periodo: string;
  total: number;
  completados: number;
  cancelados: number;
  ausentismos: number;
  tasaAsistencia: number;
}

export interface ReporteTurnos {
  totalTurnos: number;
  completados: number;
  cancelados: number;
  ausentismos: number;
  tasaAsistencia: number;
  porPeriodo: TurnosPorPeriodo[];
}

export interface PacienteAusentista {
  pacienteId: string;
  nombreCompleto: string;
  telefono: string;
  cantidadAusencias: number;
  totalTurnos: number;
  tasaAusentismo: number;
  ultimaAusencia: string | null;
}

export interface ReporteAusentismo {
  totalAusencias: number;
  tasaGeneral: number;
  pacientesReincidentes: PacienteAusentista[];
}

// ========== Reportes Financieros ==========

export interface IngresosPorPeriodo {
  periodo: string;
  monto: number;
  cantidad: number;
}

export interface IngresosPorMedioPago {
  medio: string;
  monto: number;
  cantidad: number;
  porcentaje: number;
}

export interface ReporteIngresos {
  totalIngresos: number;
  cantidadTransacciones: number;
  ticketPromedio: number;
  porPeriodo: IngresosPorPeriodo[];
  porMedioPago: IngresosPorMedioPago[];
}

// ========== Exportación ==========

export type FormatoExportacion = 'json' | 'csv' | 'pdf';

export type TipoReporte =
  | 'dashboard'
  | 'turnos'
  | 'ausentismo'
  | 'ocupacion'
  | 'procedimientos'
  | 'ventas-productos'
  | 'ingresos'
  | 'ingresos-profesional'
  | 'ingresos-obra-social'
  | 'ingresos-prestacion'
  | 'cuentas-por-cobrar'
  | 'morosidad'
  | 'pagos-pendientes';

export interface ExportOptions {
  tipoReporte: TipoReporte;
  formato: FormatoExportacion;
  filtros?: ReporteFilters;
  titulo?: string;
}
