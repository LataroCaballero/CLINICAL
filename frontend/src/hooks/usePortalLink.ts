import { api } from '@/lib/api';
import { useMutation, useQuery } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

/** Respuesta del GET /pacientes/:id/portal-link (sólo lectura, no genera). */
export interface ObtenerPortalLinkResponse {
  url: string | null;
  alreadyGenerated: boolean;
  /** true cuando existe portalToken pero no portalTokenCifrado (token legacy sin cifrar). */
  legacy: boolean;
  smtpConfigured: boolean;
}

export interface GenerarPortalLinkResponse {
  url: string | null;
  alreadyGenerated: boolean;
  smtpConfigured: boolean;
}

export interface EnviarPortalLinkEmailResponse {
  enviado: boolean;
  /** Populated when enviado is false to allow differentiated UI error messages. */
  motivo?: 'sin_destinatario' | 'envio_fallido';
  /** Código de error SMTP (EAUTH, ECONNECTION, etc.) cuando motivo es 'envio_fallido'. */
  codigo?: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * GET /pacientes/:id/portal-link (sólo lectura — NO genera).
 * Recupera el link existente al montar; si el paciente no tiene token devuelve url:null.
 * Usa queryKey ['portal-link', pacienteId] para que handleGenerar pueda invalidar/setar.
 */
export function useObtenerPortalLink(pacienteId: string) {
  return useQuery<ObtenerPortalLinkResponse>({
    queryKey: ['portal-link', pacienteId],
    queryFn: async () => {
      const response = await api.get<ObtenerPortalLinkResponse>(
        `/pacientes/${pacienteId}/portal-link`,
      );
      return response.data;
    },
    enabled: !!pacienteId,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * POST /pacientes/:id/portal-link
 * Generates (or fetches) the patient portal link.
 * Returns { url, alreadyGenerated, smtpConfigured }.
 * The patient id is used only in the URL path.
 */
export function useGenerarPortalLink() {
  return useMutation<GenerarPortalLinkResponse, Error, { pacienteId: string }>({
    mutationFn: async ({ pacienteId }) => {
      const response = await api.post<GenerarPortalLinkResponse>(
        `/pacientes/${pacienteId}/portal-link`,
      );
      return response.data;
    },
  });
}

/**
 * POST /pacientes/:id/portal-link/email
 * Sends the portal link via email. Accepts the URL already held in client
 * state (generated in a prior request) plus an optional email address to
 * capture when the patient has no email on file.
 * The patient id is used only in the URL path.
 */
export function useEnviarPortalLinkEmail() {
  return useMutation<
    EnviarPortalLinkEmailResponse,
    Error,
    { pacienteId: string; url: string; email?: string }
  >({
    mutationFn: async ({ pacienteId, url, email }) => {
      const body: { url: string; email?: string } = { url };
      if (email) body.email = email;
      const response = await api.post<EnviarPortalLinkEmailResponse>(
        `/pacientes/${pacienteId}/portal-link/email`,
        body,
      );
      return response.data;
    },
  });
}
