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

/**
 * Determines whether a turno's `tipoTurno` should sync to reflect the HC template
 * (dto.tipo) being saved on it, following a priority ladder that never downgrades
 * an already-advanced type and protects cirugía turnos.
 *
 * Returns the destination `TipoTurno.nombre`, or null if no sync should happen.
 *
 * Rules (D-01/D-02/D-03/D-07, HCSYNC-01/02/03):
 * - currentEsCirugia=true → always null (D-02: sentinel protegido de máxima prioridad,
 *   checked FIRST — a cirugía turno's type is NEVER touched by any plantilla)
 * - plantilla → destino/rango: 'primera_vez'→'Consulta'/1, 'tratamiento_en_consultorio'→
 *   'Tratamiento'/2, 'pre_quirurgico'→'Pre-Quirúrgico'/3; any other plantilla (control,
 *   practica, libre, undefined) → null (D-07: no sync)
 * - currentTipoNombre rango: 'Consulta'=1, 'Tratamiento'=2, 'Pre-Quirúrgico'=3;
 *   any other/null (e.g. 'Control') = 0 (D-03: overwritable by any of the 3 plantillas)
 * - Returns the destino name only if rankDestino > rankActual (D-01: escalera
 *   order-independent, never downgrades); otherwise null (covers no-op when ranks are equal)
 */
export function resolverTipoTurnoSync(
  plantilla: string | undefined,
  currentTipoNombre: string | null | undefined,
  currentEsCirugia: boolean,
): string | null {
  if (currentEsCirugia) return null; // D-02: sentinel protegido, chequeado primero

  const RANGOS: Record<string, number> = {
    Consulta: 1,
    Tratamiento: 2,
    'Pre-Quirúrgico': 3,
  };

  const DESTINOS: Record<string, string> = {
    primera_vez: 'Consulta',
    tratamiento_en_consultorio: 'Tratamiento',
    pre_quirurgico: 'Pre-Quirúrgico',
  };

  const destino = plantilla ? DESTINOS[plantilla] : undefined;
  if (!destino) return null; // D-07: plantilla sin sync (control/practica/libre/undefined)

  const rankDestino = RANGOS[destino];
  const rankActual = currentTipoNombre ? (RANGOS[currentTipoNombre] ?? 0) : 0; // D-03

  return rankDestino > rankActual ? destino : null; // D-01: no-downgrade
}
