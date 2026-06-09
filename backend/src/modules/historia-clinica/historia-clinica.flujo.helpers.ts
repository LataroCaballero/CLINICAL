/**
 * Pure helpers for HC entry flow classification logic.
 * Extracted to a separate file to enable direct unit testing without NestJS/Prisma imports.
 */

/**
 * Determines whether a patient's flujo should change based on the HC entry type.
 * Returns the new flujo value, or null if no change is needed.
 *
 * Rules:
 * - esCirugia=true → always null (cirugía turnos don't change flujo via tipoEntrada, Criterio 5)
 * - CONSULTA_CIRUGIA + PENDIENTE → CIRUGIA (HC-03)
 * - TRATAMIENTO + PENDIENTE → TRATAMIENTO (HC-04, dual-state: CIRUGIA stays as-is)
 * - CONTROL / SEGUIMIENTO / PREOPERATORIO → null (no-op)
 * - tipoEntrada undefined → null (legacy / unclassified entries)
 */
export function resolverNuevoFlujo(
  tipoEntrada: string | undefined,
  flujoActual: string | null | undefined,
  esCirugia: boolean,
): 'CIRUGIA' | 'TRATAMIENTO' | null {
  if (esCirugia) return null; // Criterio 5: turnos cirugía omiten cambio de flujo por tipoEntrada
  if (!tipoEntrada) return null;
  if (tipoEntrada === 'CONSULTA_CIRUGIA') {
    return flujoActual === 'PENDIENTE' ? 'CIRUGIA' : null; // HC-03
  }
  if (tipoEntrada === 'TRATAMIENTO') {
    return flujoActual === 'PENDIENTE' ? 'TRATAMIENTO' : null; // HC-04 (CIRUGIA → null, dual-state preservado)
  }
  return null; // CONTROL / SEGUIMIENTO / PREOPERATORIO: no-op
}
