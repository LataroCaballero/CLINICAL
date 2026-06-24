"use client";

import { Badge } from "@/components/ui/badge";

// ── Shared types for HC entry content ───────────────────────────────────────

export interface ZonaContenido {
  zonaId?: string;
  zona: string;
  diagnosticos: string[];
  otroTexto?: string;
  tratamientos: Array<{ nombre: string; tratamientoId?: string; precio: number }>;
}

export interface ContenidoPrimeraVez {
  tipo: "primera_vez";
  comentario?: string;
  // New grouped shape (v1.9+)
  zonas?: ZonaContenido[];
  // Legacy shape
  diagnostico?: { zonas?: string[]; subzonas?: string[]; otroTexto?: string };
  tratamientos?: { nombre: string; precio?: number }[];
  presupuestoTotal?: number;
  presupuestoId?: string | null;
}

export interface ContenidoLibre {
  tipo?: "libre" | string;
  texto?: string;
}

export type ContenidoEntrada =
  | ContenidoPrimeraVez
  | ContenidoLibre
  | Record<string, unknown>
  | null;

// ── HCEntryChips — card/preview variant ─────────────────────────────────────
// Shows zona + diagnósticos + tratamientos as color chips (no prices, no observaciones).

export function HCEntryChips({
  contenido,
}: {
  contenido?: ContenidoEntrada;
}) {
  if (!contenido) {
    return (
      <p className="text-sm text-muted-foreground italic">(sin contenido)</p>
    );
  }

  const c = contenido as ContenidoPrimeraVez & ContenidoLibre;

  // ── Primera consulta estructurada ──
  if (c.tipo === "primera_vez") {
    // Shape v1.9+ (grouped zones)
    if (Array.isArray(c.zonas) && c.zonas.length > 0) {
      return (
        <div className="space-y-1.5">
          {c.zonas.map((z: ZonaContenido, zi: number) => (
            <div key={zi} className="flex flex-wrap gap-1 items-center">
              <Badge variant="secondary" className="text-xs capitalize font-semibold">
                {z.zona}
              </Badge>
              {z.diagnosticos.map((d: string, di: number) => (
                <Badge key={di} variant="outline" className="text-xs">
                  {d}
                </Badge>
              ))}
              {z.tratamientos.map((t, ti: number) => (
                <Badge
                  key={ti}
                  className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50"
                >
                  {t.nombre}
                </Badge>
              ))}
            </div>
          ))}
          {c.comentario && (
            <p className="text-xs text-muted-foreground whitespace-pre-line pt-1">
              {c.comentario}
            </p>
          )}
        </div>
      );
    }

    // Legacy shape
    const zonas: string[] = c.diagnostico?.zonas ?? [];
    const subzonas: string[] = c.diagnostico?.subzonas ?? [];
    const tratamientos: { nombre: string; precio?: number }[] = c.tratamientos ?? [];

    return (
      <div className="space-y-1.5">
        {(zonas.length > 0 || subzonas.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {zonas.map((z: string) => (
              <Badge key={z} variant="secondary" className="text-xs capitalize">
                {z}
              </Badge>
            ))}
            {subzonas.map((s: string) => (
              <Badge key={s} variant="outline" className="text-xs capitalize">
                {s}
              </Badge>
            ))}
          </div>
        )}
        {tratamientos.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tratamientos.map((t, i: number) => (
              <Badge
                key={i}
                className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50"
              >
                {t.nombre}
              </Badge>
            ))}
          </div>
        )}
        {c.comentario && (
          <p className="text-xs text-muted-foreground whitespace-pre-line pt-1">
            {c.comentario}
          </p>
        )}
      </div>
    );
  }

  // ── Texto libre ──
  if (c.texto) {
    return <p className="text-sm whitespace-pre-line">{c.texto}</p>;
  }

  return (
    <p className="text-sm text-muted-foreground italic">(sin contenido)</p>
  );
}

// ── HCEntryFullContent — detail/modal variant ────────────────────────────────
// Shows chips + observaciones (labeled block) + prices per treatment + Total + comentario.

const formatARS = (amount: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
    amount
  );

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function HCEntryFullContent({
  contenido,
}: {
  contenido?: ContenidoEntrada;
}) {
  if (!contenido) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Contenido</h4>
        <p className="text-sm text-muted-foreground italic">(sin contenido)</p>
      </div>
    );
  }

  const c = contenido as ContenidoPrimeraVez & ContenidoLibre & Record<string, unknown>;

  // ── Primera consulta estructurada ──
  if (c.tipo === "primera_vez") {
    const comentario: string = c.comentario ?? "";
    const presupuestoTotal: number = (c as ContenidoPrimeraVez).presupuestoTotal ?? 0;

    // Shape v1.9+ (grouped zones)
    if (Array.isArray(c.zonas) && c.zonas.length > 0) {
      return (
        <div className="space-y-5">
          {c.zonas.map((z: ZonaContenido, zi: number) => (
            <div key={zi} className="space-y-2">
              {/* Chips row: zona + diagnósticos + tratamientos */}
              <div className="flex flex-wrap gap-1 items-center">
                <Badge variant="secondary" className="text-xs capitalize font-semibold">
                  {z.zona}
                </Badge>
                {z.diagnosticos.map((d: string, di: number) => (
                  <Badge key={di} variant="outline" className="text-xs">
                    {d}
                  </Badge>
                ))}
                {z.tratamientos.map((t, ti: number) => (
                  <Badge
                    key={ti}
                    className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    {t.nombre}
                  </Badge>
                ))}
              </div>

              {/* Observación */}
              {z.otroTexto && (
                <div className="p-3 bg-muted/40 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Observación</p>
                  <p className="text-sm">{z.otroTexto}</p>
                </div>
              )}

              {/* Treatments with prices */}
              {z.tratamientos.length > 0 && (
                <div className="space-y-1">
                  {z.tratamientos.map((t, ti: number) => (
                    <div
                      key={ti}
                      className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg"
                    >
                      <span className="text-sm">{t.nombre}</span>
                      {t.precio > 0 && (
                        <span className="text-sm font-medium text-green-700">
                          {formatARS(t.precio)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Comentario */}
          {comentario && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Comentario</h4>
              <p className="text-sm whitespace-pre-line p-3 bg-muted/40 rounded-lg">
                {comentario}
              </p>
            </div>
          )}

          {/* Total */}
          {presupuestoTotal > 0 && (
            <div className="flex justify-end pt-1">
              <span className="text-sm font-semibold text-green-700">
                Total: {formatARS(presupuestoTotal)}
              </span>
            </div>
          )}
        </div>
      );
    }

    // Legacy shape
    const zonas: string[] = c.diagnostico?.zonas ?? [];
    const subzonas: string[] = c.diagnostico?.subzonas ?? [];
    const otroTexto: string = c.diagnostico?.otroTexto ?? "";
    const tratamientos: { nombre: string; precio?: number }[] = c.tratamientos ?? [];

    return (
      <div className="space-y-5">
        {/* Diagnóstico chips */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Diagnóstico</h4>
          {(zonas.length > 0 || subzonas.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {zonas.map((z: string) => (
                <Badge key={z} variant="secondary" className="text-xs capitalize">
                  {z}
                </Badge>
              ))}
              {subzonas.map((s: string) => (
                <Badge key={s} variant="outline" className="text-xs capitalize">
                  {s}
                </Badge>
              ))}
            </div>
          )}
          {(zonas.length === 0 && subzonas.length === 0) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Zonas</p>
                <p className="text-sm font-medium">
                  <span className="text-muted-foreground italic">—</span>
                </p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Subzonas</p>
                <p className="text-sm font-medium">
                  <span className="text-muted-foreground italic">—</span>
                </p>
              </div>
            </div>
          )}
          {otroTexto && (
            <div className="p-3 bg-muted/40 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Observación de zona</p>
              <p className="text-sm">{otroTexto}</p>
            </div>
          )}
        </div>

        {/* Tratamientos */}
        {tratamientos.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Tratamientos</h4>
            {/* Chips row */}
            <div className="flex flex-wrap gap-1">
              {tratamientos.map((t, i: number) => (
                <Badge
                  key={i}
                  className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50"
                >
                  {t.nombre}
                </Badge>
              ))}
            </div>
            {/* Price list */}
            <div className="space-y-1">
              {tratamientos.map((t, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg"
                >
                  <span className="text-sm">{t.nombre}</span>
                  {!!t.precio && (
                    <span className="text-sm font-medium text-green-700">
                      {formatARS(t.precio)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {presupuestoTotal > 0 && (
              <div className="flex justify-end pt-1">
                <span className="text-sm font-semibold text-green-700">
                  Total: {formatARS(presupuestoTotal)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Comentario */}
        {comentario && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Comentario</h4>
            <p className="text-sm whitespace-pre-line p-3 bg-muted/40 rounded-lg">
              {comentario}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Texto libre ──
  if (c.texto) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Contenido</h4>
        <p className="text-sm whitespace-pre-line">{c.texto}</p>
      </div>
    );
  }

  // ── Fallback: any other object ──
  const entries = Object.entries(c).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );
  if (entries.length === 0) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Contenido</h4>
        <p className="text-sm text-muted-foreground italic">(sin contenido)</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Contenido</h4>
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="p-2.5 bg-muted/40 rounded-lg">
            <p className="text-xs text-muted-foreground mb-0.5">{formatKey(key)}</p>
            <p className="text-sm">
              {typeof value === "object" ? JSON.stringify(value) : String(value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
