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

/** Maximum length for free-text summaries before truncation with ellipsis. */
const TEXTO_LIMITE = 80;

/**
 * Extractor puro que normaliza los tres shapes de contenido de HC
 * (v1.9 agrupado por zona, legacy plano, texto libre / tratamiento en consultorio)
 * a un string compacto o null si no hay información de tratamiento.
 *
 * Shapes soportados:
 * - v1.9 agrupado: `{ zonas: [{ zona, tratamientos: [{nombre}] }] }`
 * - Legacy plano: `{ tratamientos: [{nombre}] }`
 * - Tratamiento en consultorio: `{ tipo:'tratamiento_en_consultorio', tratamientos:[{nombre}], texto }`
 * - Texto libre puro: `{ tipo: string, texto: string }`
 */
export function resumirTratamientosDeContenido(contenido: unknown): string | null {
  // Normalize to Record or bail
  if (contenido === null || contenido === undefined || typeof contenido !== 'object') {
    return null;
  }
  const c = contenido as Record<string, unknown>;

  // --- Collect treatment names ---

  // Priority 1: v1.9 zona-grouped shape
  if (Array.isArray(c.zonas) && (c.zonas as unknown[]).length > 0) {
    const nombres = (c.zonas as Array<{ tratamientos?: Array<{ nombre?: unknown }> }>)
      .flatMap((z) => z.tratamientos ?? [])
      .map((t) => (typeof t.nombre === 'string' ? t.nombre.trim() : ''))
      .filter((n) => n.length > 0);

    return formatearResumen(nombres);
  }

  // Priority 2: flat tratamientos array (legacy + tratamiento_en_consultorio with catalog)
  if (Array.isArray(c.tratamientos)) {
    const nombres = (c.tratamientos as Array<{ nombre?: unknown }>)
      .map((t) => (typeof t.nombre === 'string' ? t.nombre.trim() : ''))
      .filter((n) => n.length > 0);

    if (nombres.length > 0) {
      return formatearResumen(nombres);
    }
  }

  // Priority 3: free text fallback
  if (typeof c.texto === 'string') {
    const texto = c.texto.trim();
    if (texto.length === 0) return null;
    if (texto.length > TEXTO_LIMITE) {
      return texto.slice(0, TEXTO_LIMITE).trimEnd() + '…';
    }
    return texto;
  }

  return null;
}

/**
 * Formatea una lista de nombres de tratamiento con resumen-con-conteo:
 * - 1 nombre → nombre exacto
 * - N nombres → `${primero} +${N-1}`
 * - 0 nombres → null
 */
function formatearResumen(nombres: string[]): string | null {
  if (nombres.length === 0) return null;
  if (nombres.length === 1) return nombres[0];
  return `${nombres[0]} +${nombres.length - 1}`;
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
