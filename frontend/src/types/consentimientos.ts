export interface ConsentimientoZonaArchivo {
  id: string;
  zonaId: string;
  path: string;            // relative path for URL construction
  nombreOriginal: string;
  uploadedAt: string;      // ISO string
  vigente: boolean;
  url?: string;            // public URL built by backend StorageService.getPublicUrl()
}

export interface ZonaConConsentimiento {
  id: string;
  nombre: string;
  orden: number;
  esSistema: boolean;
  indicacionesUrl: string | null;
  consentimientoVigente: ConsentimientoZonaArchivo | null;
}
