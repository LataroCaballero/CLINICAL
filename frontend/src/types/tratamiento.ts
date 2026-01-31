export interface Tratamiento {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  indicaciones: string | null;
  procedimiento: string | null;
  duracionMinutos: number | null;
  activo: boolean;
  profesionalId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTratamientoDto {
  nombre: string;
  descripcion?: string;
  precio?: number;
  indicaciones?: string;
  procedimiento?: string;
  duracionMinutos?: number;
}

export interface UpdateTratamientoDto {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  indicaciones?: string;
  procedimiento?: string;
  duracionMinutos?: number;
}

export interface TratamientoSeleccionado {
  tratamientoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  indicaciones?: string;
  procedimiento?: string;
}

export interface BudgetItem {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  tratamientoId?: string;
}

export interface BudgetData {
  items: BudgetItem[];
  subtotal: number;
  descuentos: number;
  total: number;
}
