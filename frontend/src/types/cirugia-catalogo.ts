export interface CirugiaInsumoProducto {
  id: string;
  nombre: string;
  costoBase: number | null;
  unidadMedida: string | null;
}

export interface CirugiaInsumo {
  id: string;
  cirugiaId: string;
  productoId: string;
  cantidad: number;
  producto: CirugiaInsumoProducto;
}

export interface CirugiaCatalogo {
  id: string;
  nombre: string;
  precioARS: number | null;
  precioUSD: number | null;
  precioBase: number | null;
  duracionMinutos: number | null;
  profesionalId: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  insumos: CirugiaInsumo[];
}

export interface CreateCirugiaCatalogoDto {
  nombre: string;
  precioARS?: number;
  precioUSD?: number;
  duracionMinutos?: number;
}

export interface UpdateCirugiaCatalogoDto {
  nombre?: string;
  precioARS?: number;
  precioUSD?: number;
  duracionMinutos?: number;
}

export interface SetInsumosCirugiaDto {
  insumos: { productoId: string; cantidad: number }[];
}
