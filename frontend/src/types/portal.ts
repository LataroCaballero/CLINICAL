export interface PortalDatos {
  nombreCompleto: string;
  dni: string;
  obraSocial: string | null;
  proximaCirugia: {
    fecha: string;
    procedimiento: string;
  } | null;
  contacto: {
    telefono: string | null;
    telefonoAlternativo: string | null;
    email: string | null;
    direccion: string | null;
    contactoEmergenciaNombre: string | null;
    contactoEmergenciaTelefono: string | null;
    contactoEmergenciaRelacion: string | null;
  };
  saludAutoReportada: {
    alergiasAutoReportadas: string[] | null;
    antecedentesAutoReportados: Record<string, unknown> | null;
    medicacionAutoReportada: string[] | null;
    tratamientosPreviosAutoReportados: string | null;
  };
}

export interface UpdateContactoPayload {
  telefono?: string | null;
  telefonoAlternativo?: string | null;
  email?: string | null;
  direccion?: string | null;
  contactoEmergenciaNombre?: string | null;
  contactoEmergenciaTelefono?: string | null;
  contactoEmergenciaRelacion?: string | null;
}

export interface UpdateSaludPayload {
  alergiasAutoReportadas?: string[];
  antecedentesAutoReportados?: Record<string, unknown>;
  medicacionAutoReportada?: string[];
  tratamientosPreviosAutoReportados?: string;
}
