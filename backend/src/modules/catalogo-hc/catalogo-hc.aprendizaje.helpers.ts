/**
 * Pure helpers for HC catalog learning detection.
 *
 * Given a snapshot of a professional's catalog (including inactive items)
 * and the zones selected when saving a primera_vez HC entry, compute
 * what zones/diagnostics/treatments need to be created or reactivated.
 *
 * No NestJS/Prisma imports — 100% pure, unit-testable.
 */
import { normalizarNombre } from './catalogo-hc.seed-data';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface SnapshotItem {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface SnapshotZona extends SnapshotItem {
  diagnosticos: SnapshotItem[];
  tratamientos: SnapshotItem[];
}

export interface ZonaAprendizajeInput {
  zona: string;
  diagnosticos: string[];
  tratamientos: { nombre: string }[];
}

export interface AccionesAprendizaje {
  /** Nombres formateados, en orden de aparición */
  zonasACrear: string[];
  /** ZonaHC ids */
  zonasAReactivar: string[];
  /** zonaNombre = nombre exacto de zona existente o nombre formateado de zona nueva */
  diagnosticosACrear: { zonaNombre: string; nombre: string }[];
  /** DiagnosticoHC ids */
  diagnosticosAReactivar: string[];
  tratamientosACrear: { zonaNombre: string; nombre: string }[];
  /** TratamientoHC ids */
  tratamientosAReactivar: string[];
}

// ---------------------------------------------------------------------------
// formatearNombreAprendido
// ---------------------------------------------------------------------------

/**
 * Trim + uppercase first character only, rest left intact.
 * Works correctly with accented characters (e.g. 'á' → 'Á').
 */
export function formatearNombreAprendido(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  // Split on first code point to handle multi-byte characters (accented first letters)
  const chars = [...trimmed];
  return chars[0].toUpperCase() + chars.slice(1).join('');
}

// ---------------------------------------------------------------------------
// Guard: check if a raw name should be excluded from learning
// ---------------------------------------------------------------------------
function debeExcluir(raw: string): boolean {
  const n = normalizarNombre(raw);
  return n === '' || n === 'otros';
}

// ---------------------------------------------------------------------------
// detectarAprendizaje
// ---------------------------------------------------------------------------

/**
 * Given a professional's catalog snapshot and the zones selected in a
 * primera_vez HC entry, compute which zones/diagnostics/treatments to
 * create or reactivate.
 *
 * Rules:
 * - Match is case/accent-insensitive (via normalizarNombre)
 * - Inactive items → reactivate (preserve id), do NOT create new
 * - Active items already in catalog → no action
 * - "Otros" / empty / whitespace-only → always excluded
 * - Deduplication within the same input (first occurrence wins)
 */
export function detectarAprendizaje(
  catalogo: SnapshotZona[],
  zonas: ZonaAprendizajeInput[],
): AccionesAprendizaje {
  const acciones: AccionesAprendizaje = {
    zonasACrear: [],
    zonasAReactivar: [],
    diagnosticosACrear: [],
    diagnosticosAReactivar: [],
    tratamientosACrear: [],
    tratamientosAReactivar: [],
  };

  // Build a normalized lookup for catalog zones
  const catalogoNorm = new Map<string, SnapshotZona>();
  for (const z of catalogo) {
    catalogoNorm.set(normalizarNombre(z.nombre), z);
  }

  // Track processed zone normalized names to deduplicate input zones
  const zonasVistas = new Set<string>();

  // Map normKey → display name for NEW zones (to be used when attaching dx/tx)
  const zonaNewNombres = new Map<string, string>();

  // ------------------------------------------------------------------
  // Phase 1: process zones
  // ------------------------------------------------------------------
  for (const input of zonas) {
    if (debeExcluir(input.zona)) continue;

    const norm = normalizarNombre(input.zona);

    if (zonasVistas.has(norm)) {
      // Dedupe — zone already scheduled in this run, do NOT re-add
      // But we still need to know the display name to attach dx/tx correctly
      // It was recorded in zonaNewNombres or from catalog. Nothing to do here.
      continue;
    }
    zonasVistas.add(norm);

    const enCatalogo = catalogoNorm.get(norm);

    if (!enCatalogo) {
      // Zone does not exist in catalog — needs to be created
      const nombreFormateado = formatearNombreAprendido(input.zona);
      acciones.zonasACrear.push(nombreFormateado);
      zonaNewNombres.set(norm, nombreFormateado);
    } else if (!enCatalogo.activo) {
      // Zone exists but is inactive — reactivate
      acciones.zonasAReactivar.push(enCatalogo.id);
      // For dx/tx resolution, the zone name is the existing catalog name
      // (no entry needed in zonaNewNombres; resolved via catalogoNorm)
    }
    // else: active in catalog → no zone action needed
  }

  // ------------------------------------------------------------------
  // Phase 2: process diagnostics and treatments per zone
  // ------------------------------------------------------------------
  for (const input of zonas) {
    if (debeExcluir(input.zona)) continue;

    const zonaNorm = normalizarNombre(input.zona);
    const enCatalogo = catalogoNorm.get(zonaNorm);

    // Determine the display name we use in *ACrear entries
    let zonaNombreDisplay: string;
    if (enCatalogo) {
      zonaNombreDisplay = enCatalogo.nombre;
    } else if (zonaNewNombres.has(zonaNorm)) {
      zonaNombreDisplay = zonaNewNombres.get(zonaNorm)!;
    } else {
      // Excluded zone (e.g. 'otros') — skip
      continue;
    }

    // Build normalized lookups for items in THIS zone (from catalog)
    const dxNorm = new Map<string, SnapshotItem>();
    const txNorm = new Map<string, SnapshotItem>();

    if (enCatalogo) {
      for (const d of enCatalogo.diagnosticos) {
        dxNorm.set(normalizarNombre(d.nombre), d);
      }
      for (const t of enCatalogo.tratamientos) {
        txNorm.set(normalizarNombre(t.nombre), t);
      }
    }

    // Process diagnostics
    const dxVistosEnEstaZona = new Set<string>();
    for (const dxRaw of input.diagnosticos) {
      if (debeExcluir(dxRaw)) continue;

      const dxNormKey = normalizarNombre(dxRaw);
      if (dxVistosEnEstaZona.has(dxNormKey)) continue;
      dxVistosEnEstaZona.add(dxNormKey);

      const enCatalogoDx = dxNorm.get(dxNormKey);
      if (!enCatalogoDx) {
        acciones.diagnosticosACrear.push({
          zonaNombre: zonaNombreDisplay,
          nombre: formatearNombreAprendido(dxRaw),
        });
      } else if (!enCatalogoDx.activo) {
        acciones.diagnosticosAReactivar.push(enCatalogoDx.id);
      }
      // else: active in catalog → no action
    }

    // Process treatments
    const txVistosEnEstaZona = new Set<string>();
    for (const tx of input.tratamientos) {
      if (debeExcluir(tx.nombre)) continue;

      const txNormKey = normalizarNombre(tx.nombre);
      if (txVistosEnEstaZona.has(txNormKey)) continue;
      txVistosEnEstaZona.add(txNormKey);

      const enCatalogoTx = txNorm.get(txNormKey);
      if (!enCatalogoTx) {
        acciones.tratamientosACrear.push({
          zonaNombre: zonaNombreDisplay,
          nombre: formatearNombreAprendido(tx.nombre),
        });
      } else if (!enCatalogoTx.activo) {
        acciones.tratamientosAReactivar.push(enCatalogoTx.id);
      }
      // else: active in catalog → no action
    }
  }

  return acciones;
}
