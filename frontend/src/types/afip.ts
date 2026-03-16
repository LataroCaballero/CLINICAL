export type CertStatus = 'OK' | 'EXPIRING_SOON' | 'EXPIRED' | 'NOT_CONFIGURED';

export interface AfipConfigStatusResponse {
  configured: boolean;
  cuit?: string;
  ptoVta?: number;
  ambiente?: 'HOMOLOGACION' | 'PRODUCCION';
  certExpiresAt?: string;
  certStatus: CertStatus;
  daysUntilExpiry?: number;
}

export interface SaveCertRequest {
  certPem: string;
  keyPem: string;
  ptoVta: number;
  ambiente: 'HOMOLOGACION' | 'PRODUCCION';
}

export interface SaveBillingConfigRequest {
  ptoVta: number;
  ambiente: 'HOMOLOGACION' | 'PRODUCCION';
}
