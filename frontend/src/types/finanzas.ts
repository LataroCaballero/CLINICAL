// Enums
export enum TipoMovimiento {
  CARGO = "CARGO",
  PAGO = "PAGO",
}

export enum MedioPago {
  EFECTIVO = "EFECTIVO",
  TRANSFERENCIA = "TRANSFERENCIA",
  TARJETA_DEBITO = "TARJETA_DEBITO",
  TARJETA_CREDITO = "TARJETA_CREDITO",
  MERCADO_PAGO = "MERCADO_PAGO",
  OTRO = "OTRO",
}

export enum EstadoPresupuesto {
  BORRADOR = "BORRADOR",
  ENVIADO = "ENVIADO",
  ACEPTADO = "ACEPTADO",
  RECHAZADO = "RECHAZADO",
  CANCELADO = "CANCELADO",
}

export enum TipoFactura {
  FACTURA = "FACTURA",
  RECIBO = "RECIBO",
}

export enum EstadoFactura {
  EMITIDA = "EMITIDA",
  ANULADA = "ANULADA",
}

export enum EstadoLiquidacion {
  PENDIENTE = "PENDIENTE",
  PAGADO = "PAGADO",
}

// Dashboard
export interface FinanzasDashboardKPIs {
  ingresosHoy: number;
  ingresosSemana: number;
  ingresosMes: number;
  cuentasPorCobrar: number;
  morosidad: number;
  pendientesLiquidacion: number;
  cantidadDeudores: number;
}

export interface IngresosPorDia {
  fecha: string;
  total: number;
}

export interface IngresosPorObraSocial {
  obraSocialId: string;
  nombre: string;
  total: number;
}

export interface IngresosPorProfesional {
  profesionalId: string;
  nombre: string;
  total: number;
}

// Cuentas Corrientes
export interface CuentaCorrienteResumen {
  id: string;
  pacienteId: string;
  paciente: {
    id: string;
    nombreCompleto: string;
    dni: string;
    telefono: string;
    obraSocial?: { nombre: string } | null;
  };
  saldoActual: number;
  saldoVencido: number;
  ultimoPago: string | null;
  estado: "AL_DIA" | "MOROSO";
}

export interface MovimientoCC {
  id: string;
  cuentaCorrienteId: string;
  monto: number;
  tipo: TipoMovimiento;
  medioPago: MedioPago | null;
  descripcion: string | null;
  referencia: string | null;
  fecha: string;
  anulado: boolean;
  turno?: {
    id: string;
    inicio: string;
    tipoTurno?: { nombre: string };
  } | null;
  presupuesto?: {
    id: string;
    total: number;
  } | null;
  ventaProducto?: {
    id: string;
    total: number;
  } | null;
}

export interface AntiguedadDeuda {
  "0-30": number;
  "31-60": number;
  "61-90": number;
  "90+": number;
}

// Pagos / Ingresos
export interface Pago {
  id: string;
  fecha: string;
  monto: number;
  medioPago: MedioPago;
  descripcion: string | null;
  referencia: string | null;
  anulado: boolean;
  paciente: {
    id: string;
    nombreCompleto: string;
    dni: string;
  };
  cuentaCorriente: {
    id: string;
  };
  usuarioNombre?: string;
}

export interface CreatePagoInput {
  pacienteId: string;
  monto: number;
  medioPago: MedioPago;
  descripcion?: string;
  referencia?: string;
  fecha?: string;
}

// Presupuestos
export interface PresupuestoItem {
  id?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  orden?: number;
}

export interface Presupuesto {
  id: string;
  pacienteId: string;
  profesionalId: string;
  paciente: {
    id: string;
    nombreCompleto: string;
    dni: string;
    obraSocial?: { nombre: string } | null;
  };
  profesional: {
    id: string;
    usuario: { nombre: string; apellido: string };
  };
  subtotal: number;
  descuentos: number;
  total: number;
  estado: EstadoPresupuesto;
  fechaEnviado: string | null;
  fechaAceptado: string | null;
  fechaRechazado: string | null;
  motivoRechazo: string | null;
  items: PresupuestoItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePresupuestoInput {
  pacienteId: string;
  items: Omit<PresupuestoItem, "id" | "total">[];
  descuentos?: number;
  observaciones?: string;
}

// Facturación
export interface Factura {
  id: string;
  tipo: TipoFactura;
  numero: string;
  fecha: string;
  estado: EstadoFactura;
  cuit: string | null;
  razonSocial: string | null;
  domicilio: string | null;
  condicionIVA: string | null;
  concepto: string | null;
  subtotal: number;
  impuestos: number;
  total: number;
  profesionalId: string;
  obraSocialId: string | null;
  pacienteId: string | null;
  paciente?: {
    id: string;
    nombreCompleto: string;
  } | null;
  obraSocial?: {
    id: string;
    nombre: string;
  } | null;
}

export interface CreateFacturaInput {
  tipo: TipoFactura;
  cuit?: string;
  razonSocial?: string;
  domicilio?: string;
  condicionIVA?: string;
  concepto?: string;
  subtotal: number;
  impuestos: number;
  total: number;
  obraSocialId?: string;
  pacienteId?: string;
  movimientoId?: string;
}

// Liquidaciones
export interface PracticaRealizada {
  id: string;
  pacienteId: string;
  profesionalId: string;
  obraSocialId: string | null;
  codigo: string;
  descripcion: string;
  monto: number;
  coseguro: number;
  fecha: string;
  estadoLiquidacion: EstadoLiquidacion;
  liquidacionId: string | null;
  paciente?: {
    nombreCompleto: string;
    dni: string;
  };
  obraSocial?: {
    nombre: string;
  };
}

export interface LiquidacionObraSocial {
  id: string;
  obraSocialId: string;
  obraSocial: {
    id: string;
    nombre: string;
  };
  periodo: string;
  fechaPago: string | null;
  montoTotal: number;
  usuarioId: string | null;
  facturaId: string | null;
  createdAt: string;
  practicas: PracticaRealizada[];
}

export interface CierreMensualResumen {
  mes: string;
  totalObrasSociales: number;
  totalParticulares: number;
  totalClinica: number;
  totalGlobal: number;
  detalleObrasSociales: {
    obraSocialId: string;
    nombre: string;
    total: number;
    facturado: number;
    pendiente: number;
  }[];
}

// Reportes
export interface ReporteIngresosParams {
  fechaDesde: string;
  fechaHasta: string;
  profesionalId?: string;
  obraSocialId?: string;
  medioPago?: MedioPago;
}

export interface ReporteIngresos {
  total: number;
  cantidad: number;
  porDia: IngresosPorDia[];
  porMedioPago: { medioPago: MedioPago; total: number }[];
  porObraSocial: IngresosPorObraSocial[];
}

// Filters
export interface CuentasCorrientesFilters {
  search?: string;
  obraSocialId?: string;
  estado?: "AL_DIA" | "MOROSO" | "TODOS";
  saldoMin?: number;
  saldoMax?: number;
}

export interface PagosFilters {
  fechaDesde?: string;
  fechaHasta?: string;
  medioPago?: MedioPago;
  profesionalId?: string;
  obraSocialId?: string;
  pacienteId?: string;
}

export interface PresupuestosFilters {
  pacienteId?: string;
  estado?: EstadoPresupuesto;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface FacturasFilters {
  fechaDesde?: string;
  fechaHasta?: string;
  tipo?: TipoFactura;
  estado?: EstadoFactura;
  obraSocialId?: string;
  pacienteId?: string;
}

export interface LiquidacionesFilters {
  obraSocialId?: string;
  profesionalId?: string;
  estadoLiquidacion?: EstadoLiquidacion;
  fechaDesde?: string;
  fechaHasta?: string;
}
