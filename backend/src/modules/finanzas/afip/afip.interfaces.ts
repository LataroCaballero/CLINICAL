export interface EmitirComprobanteParams {
  cuitEmisor: string;        // CUIT del profesional (sin guiones)
  puntoVenta: number;        // Número de punto de venta AFIP
  tipoComprobante: number;   // 1=FactA, 6=FactB, 11=FactC, etc.
  cbteDesde: number;         // Número del comprobante (desde)
  cbteHasta: number;         // Número del comprobante (hasta — igual a cbteDesde para un solo cbte)
  importeTotal: number;      // Total del comprobante en ARS
  importeNeto: number;       // Neto gravado
  importeIVA: number;        // IVA aplicado
  concepto: number;          // 1=Productos, 2=Servicios, 3=Ambos
  docTipo: number;           // 80=CUIT, 96=DNI, 99=Sin identificar
  docNro: string;            // Número de documento del receptor
  periodo?: string;          // YYYYMM — para concepto 2 o 3 (servicios)
}

export interface EmitirComprobanteResult {
  cae: string;               // 14-digit CAE assigned by AFIP
  caeFchVto: string;         // Vencimiento CAE: 'YYYYMMDD'
  cbtDesde: number;
  cbtHasta: number;
  resultado: 'A' | 'R';     // A=Aprobado, R=Rechazado
  observaciones?: string[];  // Error messages when resultado='R'
  qrData?: string;           // AFIP QR URL per RG 5616/2024 (optional — stub/real both return it)
}

export interface AfipService {
  emitirComprobante(params: EmitirComprobanteParams): Promise<EmitirComprobanteResult>;
  verificarServicio(): Promise<boolean>;
}
