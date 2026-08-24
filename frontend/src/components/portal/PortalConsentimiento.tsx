"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, FileDown, Loader2 } from "lucide-react";
import SignaturePad from "signature_pad";
import {
  useConsentimientosParaFirmar,
  useFirmarConsentimiento,
  type ConsentimientoEstado,
} from "@/hooks/usePortalConsentimiento";

// ── Per-zone card ─────────────────────────────────────────────────────────────

interface ZoneCardProps {
  zone: Extract<ConsentimientoEstado, { estado: "PARA_FIRMAR" }>;
}

function ZoneCard({ zone }: ZoneCardProps) {
  const [pdfAbierto, setPdfAbierto] = useState(false);
  const [leiConsentimiento, setLeiConsentimiento] = useState(false);
  const [canvasEmpty, setCanvasEmpty] = useState(true);
  const [canvasSupported, setCanvasSupported] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);

  const firmarConsentimiento = useFirmarConsentimiento();

  // Canvas support detection
  useEffect(() => {
    if (
      typeof HTMLCanvasElement === "undefined" ||
      typeof PointerEvent === "undefined"
    ) {
      setCanvasSupported(false);
    }
  }, []);

  // Canvas resize handler (prevents stretched signature on orientation change)
  const resizeCanvas = useCallback(() => {
    if (!canvasRef.current || !padRef.current) return;
    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio ?? 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(ratio, ratio);
    padRef.current.clear();
    // Canvas cleared by resize — update empty state
    setCanvasEmpty(true);
  }, []);

  // Initialize SignaturePad + resize listener
  useEffect(() => {
    if (!canvasSupported || !canvasRef.current) return;

    const pad = new SignaturePad(canvasRef.current, {
      backgroundColor: "rgba(255, 255, 255, 0)", // transparent
      penColor: "rgb(0, 0, 0)",
    });
    padRef.current = pad;

    // Run initial resize to set correct pixel ratio
    resizeCanvas();

    // Subscribe to stroke end to mirror emptiness into React state (reactive disable)
    pad.addEventListener("endStroke", () => {
      setCanvasEmpty(pad.isEmpty());
    });

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      pad.off();
    };
  }, [canvasSupported, resizeCanvas]);

  const handleLimpiar = () => {
    padRef.current?.clear();
    setCanvasEmpty(true);
    setSubmitError(null);
  };

  const handleFirmar = async () => {
    // Defense-in-depth: should never be reachable with empty canvas (button is disabled)
    if (!padRef.current || padRef.current.isEmpty()) {
      setSubmitError("Dibujá tu firma antes de confirmar.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // T-56-19: raw output — not re-encoded client-side
      const signaturePngDataUrl = padRef.current.toDataURL('image/png');

      await firmarConsentimiento.mutateAsync({
        zonaId: zone.zonaId, // from server GET response — never from user input (T-56-18)
        signaturePngDataUrl,
      });

      setSigned(true);
    } catch (err: unknown) {
      // 409 Conflict — already signed (race condition)
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 409) {
        setAlreadySigned(true);
      } else {
        setSubmitError("No pudimos registrar tu firma. Intentá de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Post-sign success state
  if (signed) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-teal-600" />
        <p className="text-base font-semibold text-gray-900">
          Tu firma fue registrada.
        </p>
        <p className="text-base text-gray-500">
          Gracias por completar el consentimiento informado.
        </p>
      </div>
    );
  }

  // Already-signed terminal state (race condition or reload after signing)
  if (alreadySigned) {
    return (
      <div className="flex items-center gap-2 py-3">
        <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
        <span className="text-base text-gray-700">
          Ya firmaste el consentimiento para esta zona.
        </span>
      </div>
    );
  }

  return (
    <div className="border rounded-xl bg-white shadow-sm px-4 py-4 space-y-4">
      {/* Zone title */}
      <h3 className="text-base font-semibold text-gray-800">{zone.zonaNombre}</h3>

      {/* 1. PDF download affordance (CONS-03 / CONS-09 open-PDF gate) */}
      <a
        href={zone.pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setPdfAbierto(true)}
        className="inline-flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 w-full justify-center"
      >
        <FileDown className="w-5 h-5 text-gray-500" />
        Descargar / ver el consentimiento
      </a>

      {/* 2. "Leí el consentimiento" check (CONS-10) */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={leiConsentimiento}
          onChange={(e) => setLeiConsentimiento(e.target.checked)}
          className="mt-1 w-5 h-5 accent-teal-600 flex-shrink-0"
        />
        <span className="text-base text-gray-700">
          Leí el consentimiento.
        </span>
      </label>

      {/* 3. Signature canvas (CONS-04) */}
      {!canvasSupported ? (
        <p className="text-base text-gray-600 py-4 text-center">
          Tu dispositivo no soporta la firma digital. Contactá a tu médico para
          firmar en persona.
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-2">Dibujá tu firma acá abajo:</p>
          <div className="border border-gray-300 rounded-xl overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className="w-full"
              style={{ height: 160, display: "block" }}
            />
          </div>

          {/* 4. Canvas actions */}
          <div className="flex gap-3 mt-3">
            <button
              type="button"
              onClick={handleLimpiar}
              className="flex-1 h-12 border border-gray-300 rounded-lg text-base text-gray-600 hover:bg-gray-50"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleFirmar}
              disabled={
                !pdfAbierto ||
                !leiConsentimiento ||
                canvasEmpty ||
                isSubmitting ||
                !canvasSupported
              }
              className="flex-1 h-12 bg-gray-900 text-white rounded-lg text-base font-semibold disabled:opacity-40 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                "Confirmar firma"
              )}
            </button>
          </div>

          {/* 5. Inline validation error (defense-in-depth, Caption 12px) */}
          {submitError && (
            <p className="text-xs text-red-600 mt-2" role="alert">
              {submitError}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Main PortalConsentimiento component ───────────────────────────────────────

/**
 * Patient-facing "Consentimiento" step in the patient portal (CONS-03/04/07).
 * Renders all six D-10 states, the indicaciones gate, the signature canvas,
 * and the post-sign success block. Links are XSS-safe (href only, ^https?:// gate).
 */
export function PortalConsentimiento() {
  const { data, isLoading, isError } = useConsentimientosParaFirmar(true);

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
        Ocurrió un error al cargar los consentimientos. Intentá de nuevo más tarde.
      </p>
    );
  }

  // Render each zone's status
  return (
    <div className="space-y-4">
      {data.map((zone, idx) => {
        switch (zone.estado) {
          case "SIN_CIRUGIA":
            return (
              <p key={idx} className="text-base text-gray-500 py-4">
                Todavía no hay una cirugía programada para firmar el consentimiento.
              </p>
            );

          case "SIN_CATALOGO":
            return (
              <p key={idx} className="text-base text-gray-500 py-4">
                Tu médico necesita completar la configuración de tu cirugía.
              </p>
            );

          case "SIN_ZONA":
            return (
              <p key={idx} className="text-base text-gray-500 py-4">
                La zona de tu cirugía no está configurada todavía.
              </p>
            );

          case "SIN_PDF":
            return (
              <p key={idx} className="text-base text-gray-500 py-4">
                Todavía no hay un consentimiento disponible para firmar; tu médico lo va a cargar pronto.
              </p>
            );

          case "YA_FIRMADO": {
            const firmedDate = new Date(zone.firmadoAt).toLocaleDateString(
              "es-AR"
            );
            return (
              <div key={zone.zonaId} className="flex items-center gap-2 py-3">
                <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <span className="text-base text-gray-700">
                  Ya firmaste el consentimiento para esta zona.
                </span>
                <span className="text-xs text-gray-400 ml-auto">{firmedDate}</span>
              </div>
            );
          }

          case "PARA_FIRMAR":
            return <ZoneCard key={zone.zonaId} zone={zone} />;

          default:
            return null;
        }
      })}
    </div>
  );
}
