import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { portalApi } from "@/lib/portal-api";

// ── Discriminated union for the six D-10 states returned by GET /consentimiento ─

export type ConsentimientoEstado =
  | { estado: "SIN_CIRUGIA" }
  | { estado: "SIN_CATALOGO" }
  | { estado: "SIN_ZONA" }
  | { estado: "SIN_PDF" }
  | {
      estado: "YA_FIRMADO";
      zonaId: string;
      zonaNombre: string;
      firmadoAt: string;
    }
  | {
      estado: "PARA_FIRMAR";
      zonaId: string;
      zonaNombre: string;
      pdfUrl: string;
      consentimientoZonaArchivoId: string;
      version: number;
      indicacionesUrl: string | null;
    };

export type ConsentimientosResponse = ConsentimientoEstado[];

// ── FirmarConsentimiento POST body ────────────────────────────────────────────

export interface FirmarConsentimientoPayload {
  /** zonaId sourced from GET response — NEVER from user input or URL (T-56-18) */
  zonaId: string;
  /** Raw output of SignaturePad.toDataURL('image/png') — not re-encoded (T-56-19) */
  signaturePngDataUrl: string;
}

// ── Query: GET /paciente-portal/public/consentimiento ────────────────────────

export function useConsentimientosParaFirmar(enabled: boolean) {
  return useQuery<ConsentimientosResponse>({
    queryKey: ["portal-consentimiento"],
    queryFn: async () => {
      const { data } = await portalApi.get(
        "/paciente-portal/public/consentimiento"
      );
      return data;
    },
    enabled,
  });
}

// ── Mutation: POST /paciente-portal/public/consentimiento/firmar ─────────────

export function useFirmarConsentimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FirmarConsentimientoPayload) => {
      const { data } = await portalApi.post(
        "/paciente-portal/public/consentimiento/firmar",
        payload
      );
      return data as { ok: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-consentimiento"] });
    },
  });
}

// ── Mutation: POST /paciente-portal/public/indicaciones/acuse ────────────────

export function useAcusarIndicaciones() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await portalApi.post(
        "/paciente-portal/public/indicaciones/acuse"
      );
      return data as { ok: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-consentimiento"] });
    },
  });
}
