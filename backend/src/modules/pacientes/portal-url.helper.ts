/**
 * portal-url.helper.ts
 *
 * Pure helper for validating portal URLs received from clients.
 *
 * Security context (T-52-01): the `url` now travels in the request body from
 * a browser client and will be reflected in the HTML body of an outgoing email.
 * We MUST validate it server-side because no global ValidationPipe is active
 * (class-validator decorators on DTOs are typing/documentation only).
 *
 * Validation rules:
 * 1. Must parse as a valid URL (rejects empty strings, non-URLs, etc.)
 * 2. Protocol must be http: or https: (rejects javascript:, data:, ftp:, etc.)
 * 3. Origin must exactly match the FRONTEND_URL origin (rejects foreign domains/ports)
 * 4. Pathname must match /portal/<uuid-v4-shape> exactly (rejects arbitrary paths)
 * 5. Must carry no query string or fragment (CR-01): a same-origin URL such as
 *    `…/portal/<uuid>?x="><script>…` or `…#"><img onerror=…>` otherwise passes
 *    rules 1–4 yet smuggles HTML into the email body when reflected. Rejecting
 *    `search`/`hash` removes the only place attacker bytes could survive.
 */

const UUID_V4_SHAPE =
  /^\/portal\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Returns true iff `url` is a well-formed portal URL on the same origin as
 * `frontendBaseUrl`, has a valid UUID-shaped path segment, and carries no
 * query string or fragment.
 *
 * Never throws — all parsing errors result in false.
 */
export function esPortalUrlValida(
  url: string,
  frontendBaseUrl: string,
): boolean {
  try {
    const parsed = new URL(url);
    const base = new URL(frontendBaseUrl);

    // Rule 2: only http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    // Rule 3: same origin (scheme + host + port — NOT just hostname substring)
    if (parsed.origin !== base.origin) {
      return false;
    }

    // Rule 4: path must be exactly /portal/<uuid-v4-shape>
    if (!UUID_V4_SHAPE.test(parsed.pathname)) {
      return false;
    }

    // Rule 5: no query string or fragment (CR-01 injection boundary)
    if (parsed.search !== '' || parsed.hash !== '') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the canonical, injection-safe portal URL (`origin + pathname`) for a
 * url that has already passed {@link esPortalUrlValida}, or `null` if it has
 * not. Callers reflect THIS value (never the raw client string) into the email
 * body so that only validator-approved bytes can ever reach the recipient
 * (defense-in-depth behind rule 5).
 */
export function normalizarPortalUrl(
  url: string,
  frontendBaseUrl: string,
): string | null {
  if (!esPortalUrlValida(url, frontendBaseUrl)) {
    return null;
  }
  const parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname}`;
}
