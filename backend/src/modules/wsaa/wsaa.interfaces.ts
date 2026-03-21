import { AmbienteAFIP } from '@prisma/client';

export interface AccessTicket {
  token: string;
  sign: string;
  expiresAt: Date;
}

export interface WsaaServiceInterface {
  /**
   * Returns a valid AccessTicket for the given professional, loading cert/key from DB.
   * Uses Redis cache with per-CUIT mutex to avoid concurrent WSAA calls.
   */
  getTicket(profesionalId: string, service: string): Promise<AccessTicket>;

  /**
   * Returns a valid AccessTicket using the provided cert/key directly.
   * Does NOT use Redis cache or mutex — for transient one-off calls (e.g., cert validation).
   */
  getTicketTransient(
    certPem: string,
    keyPem: string,
    ambiente: AmbienteAFIP,
    service: string,
  ): Promise<AccessTicket>;
}
