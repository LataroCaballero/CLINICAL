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
 * - TRATAMIENTO + (PENDIENTE|null) → TRATAMIENTO (HC-04/EMBUDO-09/D-09; CIRUGIA stays as-is,
 *   dual-state preserved; null covers the EMBUDO-07 new-lead case where flujo starts unset)
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
    // D-09: cubre PENDIENTE (HC-04) y null (lead nuevo EMBUDO-07/D-03); CIRUGIA → null (dual-state preservado)
    return flujoActual === 'PENDIENTE' || flujoActual == null
      ? 'TRATAMIENTO'
      : null;
  }
  return null; // CONTROL / SEGUIMIENTO / PREOPERATORIO: no-op
}

/**
 * Forces the persisted tipoEntrada based on the HC entry's `dto.tipo` discriminator,
 * overriding whatever the client sent in `dto.tipoEntrada`. Server-side forcing prevents
 * a client from evading auto-reclassification by sending a mismatched tipoEntrada (T-63-08).
 *
 * Rules:
 * - dto.tipo === 'pre_quirurgico' → 'PREOPERATORIO' (pre-existing behavior)
 * - dto.tipo === 'tratamiento_en_consultorio' → 'TRATAMIENTO' (D-08, new)
 * - otherwise → dto.tipoEntrada ?? undefined (respects client value, e.g. 'primera_vez' + CONTROL)
 */
export function resolverTipoEntrada(
  tipo: string | undefined,
  tipoEntradaDto: string | undefined,
): string | undefined {
  if (tipo === 'pre_quirurgico') return 'PREOPERATORIO';
  if (tipo === 'tratamiento_en_consultorio') return 'TRATAMIENTO';
  return tipoEntradaDto ?? undefined;
}
