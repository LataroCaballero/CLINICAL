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
 */

const UUID_V4_SHAPE =
  /^\/portal\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Returns true iff `url` is a well-formed portal URL on the same origin as
 * `frontendBaseUrl` and has a valid UUID-shaped path segment.
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

    return true;
  } catch {
    return false;
  }
}
