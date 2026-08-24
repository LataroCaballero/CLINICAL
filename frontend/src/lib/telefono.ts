/**
 * Motivo de bloqueo por falta de teléfono cargado (Phase 69, D-16).
 * Texto corto de una sola oración: el tooltip no repite la instrucción
 * "Agregá un teléfono en su ficha..." que sí usa el backend (mensaje largo
 * de `requireTelefonoParaEnvio` en whatsapp.service.ts), porque sería
 * redundante en un renglón de UI.
 */
export const MOTIVO_SIN_TELEFONO = "El paciente no tiene teléfono cargado";

/**
 * Motivo de bloqueo por falta de opt-in de WhatsApp (Phase 69, D-15).
 * Centraliza el texto que hoy está hardcodeado y duplicado en los 4
 * archivos de controles WA, evitando una quinta copia divergente.
 */
export const MOTIVO_SIN_OPTIN = "El paciente no tiene opt-in para WhatsApp";

/**
 * Placeholder de teléfono ausente (Phase 69 TEL-03).
 * Mismo criterio "falsy tras trim" de Phase 67 D-03: null, undefined,
 * string vacío o sólo espacios devuelven el guion simple "-" (U+002D, NO
 * em dash). No formatea el número, sin separadores ni prefijo de país;
 * sólo resuelve la ausencia.
 */
export function formatTelefono(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : "-";
}

/**
 * Predicado de teléfono presente (Phase 69 ENVIO-03, D-12).
 * !!value?.trim(), sin mirar el campo de contacto secundario del paciente
 * (67 D-04: ese campo no es canal de envío).
 */
export function tieneTelefono(value: string | null | undefined): boolean {
  return !!value?.trim();
}

/**
 * Motivo de bloqueo del control de WhatsApp (D-14/D-15/D-16).
 * El teléfono tiene precedencia sobre el opt-in: si falta el teléfono se
 * devuelve ese motivo aunque también falte el opt-in. null significa
 * control habilitado y sin TooltipContent; contrato consumido por los
 * planes 05 y 06.
 */
export function getMotivoBloqueoWhatsApp(
  telefono: string | null | undefined,
  whatsappOptIn: boolean | undefined,
): string | null {
  if (!tieneTelefono(telefono)) return MOTIVO_SIN_TELEFONO;
  if (!whatsappOptIn) return MOTIVO_SIN_OPTIN;
  return null;
}
