export type CertStatus = 'OK' | 'EXPIRING_SOON' | 'EXPIRED' | 'NOT_CONFIGURED';

export interface AfipConfigStatusResponse {
  configured: boolean;
  cuit?: string;
  ptoVta?: number;
  ambiente?: 'HOMOLOGACION' | 'PRODUCCION';
  certExpiresAt?: string; // ISO date string
  certStatus: CertStatus;
  daysUntilExpiry?: number;
}
