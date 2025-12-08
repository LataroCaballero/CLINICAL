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
  estado: "ACTIVO" | "INACTIVO";
  consentimientoFirmado: boolean;
  estudiosPendientes: number;
  presupuestosActivos: number;
}
