"use client";

import { ClipboardList, Loader2 } from "lucide-react";
import {
  useAcusarIndicaciones,
  useConsentimientosParaFirmar,
  type ConsentimientoEstado,
} from "@/hooks/usePortalConsentimiento";

// ── Per-zone indicaciones link ─────────────────────────────────────────────

interface IndicacionesLinkProps {
  zone: Extract<ConsentimientoEstado, { estado: "PARA_FIRMAR" }>;
  onAbrir: () => void;
}

function IndicacionesLink({ zone, onAbrir }: IndicacionesLinkProps) {
  // XSS-safe URL guard (D-07) — defense-in-depth on top of the server-side
  // validation already closed in Phase 61 (cr-01).
  const safeIndicacionesUrl =
    zone.indicacionesUrl && /^https?:\/\//i.test(zone.indicacionesUrl)
      ? zone.indicacionesUrl
      : null;

  if (!safeIndicacionesUrl) return null;

  return (
    <a
      href={safeIndicacionesUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onAbrir}
      className="inline-flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 w-full justify-center"
    >
      <ClipboardList className="w-5 h-5 text-gray-500" />
      Ver indicaciones preoperatorias — {zone.zonaNombre}
    </a>
  );
}

// ── Main PortalIndicaciones component ──────────────────────────────────────

/**
 * Patient-facing "Indicaciones" step in the patient portal (INDIC-01/INDIC-02).
 * Reuses the existing GET /consentimiento response (D-04, no new endpoint) and
 * fires the set-once acuse mutation when the patient opens the indicaciones
 * link — no checkbox, no drawn signature (D-05). Strictly separated from any
 * consentimiento content (CONS-12).
 */
export function PortalIndicaciones() {
  const { data, isLoading, isError } = useConsentimientosParaFirmar(true);
  const acusar = useAcusarIndicaciones();

  // Loading state
  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto" />
      </div>
    );
  }

  // API error state
  if (isError || !data) {
    return (
      <p className="text-base text-gray-500 py-4">
        Ocurrió un error al cargar las indicaciones. Intentá de nuevo más tarde.
      </p>
    );
  }

  // Zones with a non-null indicacionesUrl (only PARA_FIRMAR exposes the field)
  const zonasConIndicaciones = data.filter(
    (zone): zone is Extract<ConsentimientoEstado, { estado: "PARA_FIRMAR" }> =>
      zone.estado === "PARA_FIRMAR" &&
      !!zone.indicacionesUrl &&
      /^https?:\/\//i.test(zone.indicacionesUrl)
  );

  // Empty state — no indicaciones loaded yet, no acuse fired
  if (zonasConIndicaciones.length === 0) {
    return (
      <p className="text-base text-gray-500 py-4">
        Tu médico todavía no cargó indicaciones preoperatorias.
      </p>
    );
  }

  const handleAbrir = () => {
    // Backend is idempotent/set-once — safe to fire on every click.
    acusar.mutate();
  };

  return (
    <div className="space-y-3">
      {zonasConIndicaciones.map((zone) => (
        <IndicacionesLink key={zone.zonaId} zone={zone} onAbrir={handleAbrir} />
      ))}
    </div>
  );
}
