// Enums
export type CondicionPagoProveedor =
  | 'CONTADO'
  | 'DIAS_30'
  | 'DIAS_60'
  | 'DIAS_90'
  | 'PERSONALIZADO';

export type EstadoCuota = 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'ANULADA';

export type MedioPago =
  | 'EFECTIVO'
  | 'TRANSFERENCIA'
  | 'TARJETA_DEBITO'
  | 'TARJETA_CREDITO'
  | 'MERCADO_PAGO'
  | 'OTRO';

// Cuenta Corriente Proveedor
export interface CuentaCorrienteProveedor {
  id: string;
  proveedorId: string;
  profesionalId: string;
  saldoActual: number;
  totalPagadoHistorico: number;
  proveedor?: {
    id: string;
    nombre: string;
    cuit?: string | null;
    telefono?: string | null;
    email?: string | null;
  };
  ultimoMovimiento?: string | null;
  createdAt: string;
}

// Movimiento Cuenta Corriente Proveedor
export interface MovimientoCCProveedor {
  id: string;
  monto: number;
  tipo: 'CARGO' | 'PAGO';
  medioPago?: MedioPago | null;
  descripcion?: string | null;
  referencia?: string | null;
  fecha: string;
  anulado: boolean;
  fechaAnulacion?: string | null;
  ordenCompra?: {
    id: string;
    fechaCreacion: string;
    total: number | null;
  } | null;
  cuota?: {
    id: string;
    numeroCuota: number;
    monto: number;
    fechaVencimiento: string;
  } | null;
}

// Cuota Orden Compra
export interface CuotaOrdenCompra {
  id: string;
  ordenCompraId: string;
  numeroCuota: number;
  monto: number;
  fechaVencimiento: string;
  estado: EstadoCuota;
  fechaPago?: string | null;
  ordenCompra?: {
    id: string;
    fechaCreacion: string;
    total: number | null;
    proveedorNombre?: string;
  };
}

// Cuota con información de proveedor (para listas de cuotas vencidas/próximas)
export interface CuotaConProveedor {
  id: string;
  ordenCompraId: string;
  numeroCuota: number;
  monto: number;
  fechaVencimiento: string;
  diasVencida?: number;
  diasParaVencer?: number;
  proveedor: {
    id: string;
    nombre: string;
  };
}

// Resumen de Deudas
export interface ResumenDeudasProveedores {
  totalDeuda: number;
  totalVencido: number;
  totalPorVencer: number;
  cantidadProveedoresConDeuda: number;
  proveedores: {
    proveedorId: string;
    nombre: string;
    saldoActual: number;
  }[];
}

// Input types
export interface RegistrarPagoProveedorInput {
  monto: number;
  medioPago: MedioPago;
  descripcion?: string;
  referencia?: string;
  ordenCompraId?: string;
}

export interface PagarCuotaInput {
  medioPago: MedioPago;
  referencia?: string;
}

// Extended OrdenCompra with payment fields
export interface OrdenCompraConPago {
  id: string;
  proveedorId: string;
  profesionalId: string;
  fechaCreacion: string;
  fechaRecepcion?: string | null;
  estado: 'PENDIENTE' | 'ENVIADA' | 'RECIBIDA' | 'CANCELADA';
  total?: number | null;
  condicionPago: CondicionPagoProveedor;
  cantidadCuotas: number;
  fechaPrimerVencimiento?: string | null;
  proveedor?: { id: string; nombre: string };
  items: {
    id: string;
    productoId: string;
    cantidad: number;
    precioUnitario: number;
    producto?: { id: string; nombre: string; sku?: string | null };
  }[];
  cuotas?: CuotaOrdenCompra[];
}

// Input for creating OrdenCompra with payment conditions
export interface CreateOrdenCompraConPagoInput {
  proveedorId: string;
  items: {
    productoId: string;
    cantidad: number;
    precioUnitario: number;
  }[];
  condicionPago?: CondicionPagoProveedor;
  cantidadCuotas?: number;
  fechaPrimerVencimiento?: string;
}
