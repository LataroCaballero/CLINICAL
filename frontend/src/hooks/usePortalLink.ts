import { api } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface GenerarPortalLinkResponse {
  url: string | null;
  alreadyGenerated: boolean;
  smtpConfigured: boolean;
}

export interface EnviarPortalLinkEmailResponse {
  enviado: boolean;
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
 * Sends the portal link via email. Optionally accepts an email address
 * to use/capture when the patient has no email on file.
 * The patient id is used only in the URL path.
 */
export function useEnviarPortalLinkEmail() {
  return useMutation<
    EnviarPortalLinkEmailResponse,
    Error,
    { pacienteId: string; email?: string }
  >({
    mutationFn: async ({ pacienteId, email }) => {
      const body: { email?: string } = {};
      if (email) body.email = email;
      const response = await api.post<EnviarPortalLinkEmailResponse>(
        `/pacientes/${pacienteId}/portal-link/email`,
        body,
      );
      return response.data;
    },
  });
}
