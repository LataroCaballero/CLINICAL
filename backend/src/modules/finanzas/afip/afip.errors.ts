import { EmitirComprobanteResult } from './afip.interfaces';

/**
 * Spanish translation map for AFIP error codes.
 * Key: AFIP numeric error code. Value: human-readable Spanish message for the Facturador.
 */
export const AFIP_TRANSLATIONS: Map<number, string> = new Map([
  [10242, 'La condición de IVA del receptor es obligatoria. Completá la condición frente al IVA del paciente o del destinatario.'],
  [10243, 'El tipo de documento del receptor no coincide con su CUIT. Verificá los datos del destinatario.'],
  [10016, 'El punto de venta no está habilitado para factura electrónica. Verificá la configuración AFIP del consultorio.'],
  [10040, 'El número de comprobante está fuera de secuencia. Intentá nuevamente.'],
]);

/**
 * Translates a list of AFIP message strings to a single Spanish user-facing message.
 * AFIP messages typically look like: "Obs 10242: El campo Condicion IVA receptor..."
 */
export function translateAfipErrors(afipMessages: string[]): string {
  const translated = afipMessages.map((msg) => {
    const match = msg.match(/(\d{4,6})/);
    if (match) {
      const code = parseInt(match[1], 10);
      const spanish = AFIP_TRANSLATIONS.get(code);
      if (spanish) return spanish;
    }
    return msg;
  });
  return translated.join(' ');
}

/**
 * Thrown when AFIP rejects an invoice for a business reason (resultado='R', error 10242, etc.).
 * These are PERMANENT failures — the BullMQ processor wraps them in UnrecoverableError.
 * No retry will help; the Facturador must correct the underlying data issue.
 */
export class AfipBusinessError extends Error {
  public readonly spanishMessage: string;

  constructor(
    public readonly afipMessages: string[],
    public readonly rawResult: EmitirComprobanteResult,
  ) {
    const spanishMessage = translateAfipErrors(afipMessages);
    super(spanishMessage);
    this.spanishMessage = spanishMessage;
    this.name = 'AfipBusinessError';
  }
}

/**
 * Thrown when AFIP is temporarily unavailable (timeout, HTTP 5xx, network error).
 * These are TRANSIENT failures — the BullMQ processor re-throws so BullMQ applies
 * exponential backoff (configured globally in AppModule: 3 attempts, 2s base delay).
 */
export class AfipTransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AfipTransientError';
  }
}

/**
 * Thrown when ARCA/AFIP endpoints are completely unreachable (connection refused, DNS failure,
 * repeated timeouts indicating service outage). Subclass of AfipTransientError so existing
 * BullMQ retry logic still applies, but specifically signals CAEA fallback should be triggered.
 */
export class AfipUnavailableError extends AfipTransientError {
  constructor(message: string) {
    super(message);
    this.name = 'AfipUnavailableError';
  }
}
