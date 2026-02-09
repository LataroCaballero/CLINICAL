// Tipos para el módulo de Reportes y Analytics

// ========== Dashboard (RF-020) ==========

export interface TurnoResumen {
  id: string;
  fecha: Date;
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

// ========== Reportes Operativos (RF-021) ==========

export interface ReporteTurnosDetalle {
  periodo: string;
  turnos: number;
  completados: number;
  ausentes: number;
  cancelados: number;
}

export interface ReporteTurnos {
  total: number;
  completados: number;
  cancelados: number;
  ausentes: number;
  tasaAusentismo: number;
  tasaCompletado: number;
  detalle: ReporteTurnosDetalle[];
}

export interface AusentismoPorPaciente {
  pacienteId: string;
  nombreCompleto: string;
  turnosTotales: number;
  ausencias: number;
  tasa: number;
}

export interface ReporteAusentismo {
  tasaGeneral: number;
  totalTurnos: number;
  totalAusencias: number;
  porPaciente: AusentismoPorPaciente[];
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

export interface ReporteOcupacion {
  tasaOcupacionGeneral: number;
  porProfesional: OcupacionPorProfesional[];
}

export interface ProcedimientoRanking {
  codigo: string;
  descripcion: string;
  cantidad: number;
  ingresoTotal: number;
}

export interface ReporteProcedimientos {
  totalProcedimientos: number;
  ingresoTotal: number;
  ranking: ProcedimientoRanking[];
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
  ultimaCompra: Date;
}

export interface ReporteVentasProductos {
  totalVentas: number;
  cantidadProductos: number;
  ventasPorProducto: VentaPorProducto[];
  ventasPorPaciente: VentaPorPaciente[];
}

// ========== Reportes Financieros (RF-022) ==========

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

export interface IngresosPorProfesional {
  profesionalId: string;
  nombre: string;
  especialidad: string;
  ingresos: number;
  cantidadTurnos: number;
  ticketPromedio: number;
  porcentajeTotal: number;
}

export interface ReporteIngresosPorProfesional {
  totalIngresos: number;
  porProfesional: IngresosPorProfesional[];
}

export interface IngresosPorObraSocial {
  obraSocialId: string;
  nombre: string;
  ingresos: number;
  cantidadPacientes: number;
  cantidadPracticas: number;
  porcentajeTotal: number;
}

export interface ReporteIngresosPorObraSocial {
  totalIngresos: number;
  porObraSocial: IngresosPorObraSocial[];
}

export interface IngresosPorPrestacion {
  codigo: string;
  descripcion: string;
  cantidad: number;
  ingresoTotal: number;
  promedioUnitario: number;
}

export interface ReporteIngresosPorPrestacion {
  totalIngresos: number;
  totalPrestaciones: number;
  porPrestacion: IngresosPorPrestacion[];
}

export interface CuentaPorCobrar {
  pacienteId: string;
  nombreCompleto: string;
  telefono: string;
  email: string | null;
  saldoActual: number;
  saldoVencido: number;
  ultimoMovimiento: Date | null;
}

export interface ReporteCuentasPorCobrar {
  totalPorCobrar: number;
  totalVencido: number;
  cantidadCuentas: number;
  cuentas: CuentaPorCobrar[];
}

export interface CuentaMorosa {
  pacienteId: string;
  nombreCompleto: string;
  telefono: string;
  montoVencido: number;
  diasMorosidad: number;
  ultimoPago: Date | null;
}

export interface ReporteMorosidad {
  indiceGeneral: number;
  montoTotalMoroso: number;
  cantidadCuentasMorosas: number;
  cuentasMorosas: CuentaMorosa[];
}

export interface PagoPendienteDetalle {
  id: string;
  paciente: string;
  concepto: string;
  monto: number;
  fechaVencimiento: Date | null;
}

export interface PagoPendientePorTipo {
  tipo: string;
  cantidad: number;
  monto: number;
}

export interface ReportePagosPendientes {
  totalPendiente: number;
  porTipo: PagoPendientePorTipo[];
  detalle: PagoPendienteDetalle[];
}

// ========== Exportación (RF-023) ==========

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

export type FrecuenciaEnvio = 'diario' | 'semanal' | 'mensual';

export interface ExportResult {
  url?: string;
  data?: unknown;
  filename: string;
  formato: FormatoExportacion;
}

export interface ProgramacionEnvio {
  programacionId: string;
  proximoEnvio: Date;
}
