// Enums (matching Prisma)
export type TipoProducto = 'INSUMO' | 'PRODUCTO_VENTA' | 'USO_INTERNO';
export type TipoMovimientoStock = 'ENTRADA' | 'SALIDA' | 'AJUSTE';
export type EstadoOrdenCompra = 'PENDIENTE' | 'ENVIADA' | 'RECIBIDA' | 'CANCELADA';

// Producto
export interface Producto {
  id: string;
  nombre: string;
  categoria?: string | null;
  descripcion?: string | null;
  sku?: string | null;
  imagenUrl?: string | null;
  tipo: TipoProducto;
  unidadMedida?: string | null;
  costoBase?: number | null;
  precioSugerido?: number | null;
  requiereLote: boolean;
  descuentaStock: boolean;
  proveedores?: ProductoProveedor[];
}

export interface ProductoProveedor {
  id: string;
  productoId: string;
  proveedorId: string;
  precioHistorico?: number | null;
  proveedor?: { id: string; nombre: string };
}

export interface CreateProductoInput {
  nombre: string;
  categoria?: string;
  descripcion?: string;
  sku?: string;
  imagenUrl?: string;
  tipo: TipoProducto;
  unidadMedida?: string;
  costoBase?: number;
  precioSugerido?: number;
  requiereLote?: boolean;
  descuentaStock?: boolean;
  stockInicial?: number;
  stockMinimo?: number;
  precioActual?: number;
  // Datos de lote inicial
  loteNumero?: string;
  loteFechaVencimiento?: string;
}

export interface UpdateProductoInput {
  nombre?: string;
  categoria?: string;
  descripcion?: string;
  sku?: string;
  imagenUrl?: string;
  tipo?: TipoProducto;
  unidadMedida?: string;
  costoBase?: number;
  precioSugerido?: number;
  requiereLote?: boolean;
  descuentaStock?: boolean;
}

// Inventario
export interface Inventario {
  id: string;
  productoId: string;
  profesionalId: string;
  stockActual: number;
  stockMinimo: number;
  stockReservado: number;
  precioActual?: number | null;
  producto: Producto;
}

export interface InventarioConMovimientos extends Inventario {
  movimientos: MovimientoStock[];
}

export interface UpdateInventarioInput {
  stockMinimo?: number;
  precioActual?: number;
}

// Movimiento de Stock
export interface MovimientoStock {
  id: string;
  inventarioId: string;
  tipo: TipoMovimientoStock;
  cantidad: number;
  motivo?: string | null;
  fecha: string;
  usuarioId?: string | null;
  usuario?: { nombre: string; apellido: string } | null;
  loteId?: string | null;
  lote?: { lote: string; fechaVencimiento?: string | null } | null;
  ordenCompraId?: string | null;
  ventaProductoId?: string | null;
  practicaId?: string | null;
}

export interface CreateMovimientoInput {
  productoId: string;
  tipo: TipoMovimientoStock;
  cantidad: number;
  motivo?: string;
  fecha?: string;
  loteId?: string;
  ordenCompraId?: string;
  practicaId?: string;
  loteNumero?: string;
  loteFechaVencimiento?: string;
  nuevoPrecio?: number;
}

// Lote
export interface Lote {
  id: string;
  productoId: string;
  profesionalId: string;
  lote?: string | null;
  fechaVencimiento?: string | null;
  cantidadInicial: number;
  cantidadActual: number;
  producto?: { id: string; nombre: string; sku?: string | null };
}

export interface CreateLoteInput {
  productoId: string;
  lote?: string;
  fechaVencimiento?: string;
  cantidadInicial: number;
}

// Proveedor
export interface Proveedor {
  id: string;
  nombre: string;
  cuit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  _count?: { productos: number; OrdenCompra: number };
}

export interface CreateProveedorInput {
  nombre: string;
  cuit?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export interface UpdateProveedorInput {
  nombre?: string;
  cuit?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

// Condicion de pago para proveedores
export type CondicionPagoProveedor =
  | 'CONTADO'
  | 'DIAS_30'
  | 'DIAS_60'
  | 'DIAS_90'
  | 'PERSONALIZADO';

// Orden de Compra
export interface OrdenCompra {
  id: string;
  proveedorId: string;
  profesionalId: string;
  fechaCreacion: string;
  fechaRecepcion?: string | null;
  estado: EstadoOrdenCompra;
  total?: number | null;
  condicionPago?: CondicionPagoProveedor;
  cantidadCuotas?: number;
  fechaPrimerVencimiento?: string | null;
  proveedor?: { id: string; nombre: string };
  items: OrdenCompraItem[];
  _count?: { movimientos: number };
}

export interface OrdenCompraItem {
  id: string;
  ordenCompraId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  producto?: { id: string; nombre: string; sku?: string | null };
}

export interface CreateOrdenCompraInput {
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

export interface RecibirOrdenCompraInput {
  fechaRecepcion?: string;
  items?: {
    productoId: string;
    cantidadRecibida: number;
    loteNumero?: string;
    loteFechaVencimiento?: string;
  }[];
}

// Venta de Producto
export interface VentaProducto {
  id: string;
  pacienteId?: string | null;
  profesionalId: string;
  total: number;
  medioPago: string;
  fecha: string;
  paciente?: { id: string; nombreCompleto: string } | null;
  items: VentaProductoItem[];
}

export interface VentaProductoItem {
  id: string;
  ventaProductoId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  producto?: { id: string; nombre: string; sku?: string | null };
}

export interface CreateVentaProductoInput {
  pacienteId?: string;
  medioPago: string;
  descuento?: number;
  items: {
    productoId: string;
    cantidad: number;
    precioUnitario: number;
  }[];
}

// Resumen de ventas
export interface ResumenVentas {
  totalVentas: number;
  cantidadVentas: number;
  ventasPorProducto: {
    productoId: string;
    nombre: string;
    cantidad: number;
    total: number;
  }[];
}
