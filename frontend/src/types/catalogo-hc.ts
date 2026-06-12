export interface DiagnosticoHC {
  id: string;
  nombre: string;
  orden: number;
  esSistema: boolean; // ítems "Otros" protegidos
}

export interface TratamientoHC {
  id: string;
  nombre: string;
  orden: number;
  esSistema: boolean;
  tratamientoId: string | null; // FK al catálogo de precios (null = sin match)
  precio: number | null;        // precio resuelto por join en el backend
}

export interface ZonaHC {
  id: string;
  nombre: string;
  orden: number;
  esSistema: boolean;
  diagnosticos: DiagnosticoHC[];
  tratamientos: TratamientoHC[];
}
