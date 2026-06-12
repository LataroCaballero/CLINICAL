/**
 * Pure helpers for HC entry content construction (primera_vez type).
 * Extracted to enable direct unit testing without NestJS/Prisma imports.
 *
 * Supports two shapes:
 * - Nueva forma (zonas[] presente y no vacío): contenido agrupado por zona
 * - Forma legacy (sin zonas): contenido con diagnostico + tratamientos planos
 */

export interface ZonaSeleccionInput {
  zonaId: string;
  zona: string;
  diagnosticos: string[];
  otroTexto?: string;
  tratamientos: { nombre: string; tratamientoId?: string; precio: number }[];
}

type DiagnosticoLegacy = {
  zonas: string[];
  subzonas: string[];
  otroTexto?: string;
};

type TratamientoItem = {
  nombre: string;
  tratamientoId?: string;
  precio: number;
};

type ContenidoInput = {
  zonas?: ZonaSeleccionInput[];
  diagnostico?: DiagnosticoLegacy;
  tratamientos?: TratamientoItem[];
  comentario?: string;
  presupuestoId?: string;
  presupuestoTotal?: number;
};

/**
 * Construye el JSONB de contenido para una entrada de tipo primera_vez.
 *
 * - Si `zonas` está presente y no vacío: produce la forma nueva agrupada por zona
 * - Si `zonas` está ausente o es array vacío: produce la forma legacy (byte-compatible con lógica inline del service)
 */
export function construirContenidoPrimeraVez(
  input: ContenidoInput,
): Record<string, unknown> {
  const { zonas, diagnostico, tratamientos, comentario, presupuestoId, presupuestoTotal } = input;

  // Nueva forma: zonas[] presente y no vacío
  if (zonas && zonas.length > 0) {
    return {
      tipo: 'primera_vez',
      zonas,
      comentario: comentario ?? '',
      presupuestoId: presupuestoId ?? null,
      presupuestoTotal: presupuestoTotal ?? 0,
    };
  }

  // Forma legacy: diagnostico + tratamientos planos
  return {
    tipo: 'primera_vez',
    diagnostico: diagnostico ?? { zonas: [], subzonas: [] },
    tratamientos: tratamientos ?? [],
    comentario: comentario ?? '',
    presupuestoId: presupuestoId ?? null,
    presupuestoTotal: presupuestoTotal ?? 0,
  };
}

/**
 * Deriva los strings de perfil del paciente (diagnosticoStr / tratamientoStr)
 * a partir del input de primera_vez.
 *
 * - Si `zonas` está presente y no vacío: construye desde la estructura por zona
 * - Si `zonas` está ausente o vacío: replica la lógica legacy del service (zonas.join + subzonas en paréntesis)
 */
export function derivarPerfilPrimeraVez(input: ContenidoInput): {
  diagnosticoStr: string | null;
  tratamientoStr: string | null;
} {
  const { zonas, diagnostico, tratamientos } = input;

  // Nueva forma: zonas[] presente y no vacío
  if (zonas && zonas.length > 0) {
    const partesDiag: string[] = zonas.map((z) => {
      if (z.diagnosticos.length > 0) {
        return `${z.zona} (${z.diagnosticos.join(', ')})`;
      }
      return z.zona;
    });

    const todosLosTratamientos = zonas.flatMap((z) =>
      z.tratamientos.map((t) => t.nombre),
    );

    return {
      diagnosticoStr: partesDiag.length > 0 ? partesDiag.join(', ') : null,
      tratamientoStr: todosLosTratamientos.length > 0 ? todosLosTratamientos.join(', ') : null,
    };
  }

  // Forma legacy: replica la lógica inline del service (líneas 108-119)
  const zonasLegacy = diagnostico?.zonas ?? [];
  const subzonasLegacy = diagnostico?.subzonas ?? [];
  const tratamientosLegacy = tratamientos ?? [];

  const diagnosticoStr = zonasLegacy.length
    ? subzonasLegacy.length
      ? `${zonasLegacy.join(', ')} (${subzonasLegacy.join(', ')})`
      : zonasLegacy.join(', ')
    : null;

  const tratamientoStr = tratamientosLegacy.length
    ? tratamientosLegacy.map((t) => t.nombre).join(', ')
    : null;

  return { diagnosticoStr, tratamientoStr };
}
