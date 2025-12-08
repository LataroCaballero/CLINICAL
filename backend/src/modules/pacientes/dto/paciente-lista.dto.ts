export class PacienteListaDto {
  id: string;
  fotoUrl?: string | null;
  nombreCompleto: string;
  dni: string;
  telefono: string;
  email?: string | null;
  obraSocialNombre?: string | null;
  plan?: string | null;
  ultimoTurno?: Date | null;
  proximoTurno?: Date | null;
  deuda: number;
  estado: string; // "ACTIVO" | "INACTIVO"
  consentimientoFirmado: boolean;
  estudiosPendientes: number;
  presupuestosActivos: number;
}
