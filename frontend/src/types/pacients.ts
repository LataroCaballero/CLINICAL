export interface PacienteListItem {
  id: string;
  fotoUrl?: string | null;
  nombreCompleto: string;
  dni: string;
  telefono: string;
  email?: string | null;
  obraSocialNombre?: string | null;
  plan?: string | null;
  ultimoTurno?: string | null; // llega como ISO string desde el backend
  proximoTurno?: string | null;
  deuda: number;
  estado:
  | "ACTIVO"
  | "ARCHIVADO"
  | "QUIRURGICO"
  | "PRESUPUESTO"
  | "PRIMERA"
  | "PRACTICA_CONSULTORIO";
  consentimientoFirmado: boolean;
  estudiosPendientes: number;
  presupuestosActivos: number;
}

export interface ObraSocialRef {
  id: string;
  nombre: string;
}

export interface PacienteDetalle {
  id: string;
  fotoUrl?: string | null;
  nombreCompleto: string;
  dni: string;
  telefono: string;
  telefonoAlternativo?: string | null;
  email?: string | null;
  fechaNacimiento?: string | null;
  direccion?: string | null;

  obraSocialId?: string | null;
  obraSocial?: ObraSocialRef | null;
  plan?: string | null;

  consentimientoFirmado: boolean;
  indicacionesEnviadas?: boolean;
  fechaIndicaciones?: string | null;

  estado:
  | "ACTIVO"
  | "ARCHIVADO"
  | "QUIRURGICO"
  | "PRESUPUESTO"
  | "PRIMERA"
  | "PRACTICA_CONSULTORIO";
}
