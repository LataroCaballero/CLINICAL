/**
 * Unit tests for esPortalUrlValida — same-origin portal URL validator.
 *
 * Tests follow TDD: import from the helper and verify all cases
 * before relying on class-validator decorators (which are not active
 * at runtime — no global ValidationPipe).
 */
import { esPortalUrlValida } from './portal-url.helper';

const FRONTEND_URL = 'http://localhost:3000';
const FRONTEND_URL_TRAILING = 'http://localhost:3000/';

// A valid UUID v4 shape
const VALID_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

describe('esPortalUrlValida', () => {
  // ---------------------------------------------------------------------------
  // Happy path: same-origin portal urls
  // ---------------------------------------------------------------------------
  it('same-origin url with valid uuid path → true', () => {
    expect(
      esPortalUrlValida(
        `${FRONTEND_URL}/portal/${VALID_UUID}`,
        FRONTEND_URL,
      ),
    ).toBe(true);
  });

  it('same-origin url with trailing slash in frontendBaseUrl → true (compares by origin)', () => {
    expect(
      esPortalUrlValida(
        `${FRONTEND_URL}/portal/${VALID_UUID}`,
        FRONTEND_URL_TRAILING,
      ),
    ).toBe(true);
  });

  it('same-origin url with uppercase hex in uuid → true (case-insensitive uuid shape)', () => {
    const upperUuid = 'F47AC10B-58CC-4372-A567-0E02B2C3D479';
    expect(
      esPortalUrlValida(
        `${FRONTEND_URL}/portal/${upperUuid}`,
        FRONTEND_URL,
      ),
    ).toBe(true);
  });

  it('https same-origin url → true', () => {
    const httpsBase = 'https://app.example.com';
    expect(
      esPortalUrlValida(
        `${httpsBase}/portal/${VALID_UUID}`,
        httpsBase,
      ),
    ).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Foreign origin
  // ---------------------------------------------------------------------------
  it('foreign origin with valid portal path → false', () => {
    expect(
      esPortalUrlValida(
        `https://evil.com/portal/${VALID_UUID}`,
        FRONTEND_URL,
      ),
    ).toBe(false);
  });

  it('same host but different port → false', () => {
    expect(
      esPortalUrlValida(
        `http://localhost:9999/portal/${VALID_UUID}`,
        FRONTEND_URL,
      ),
    ).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Wrong path (same origin)
  // ---------------------------------------------------------------------------
  it('same-origin but path /dashboard → false', () => {
    expect(
      esPortalUrlValida(
        `${FRONTEND_URL}/dashboard`,
        FRONTEND_URL,
      ),
    ).toBe(false);
  });

  it('same-origin but path /portal/ without uuid → false', () => {
    expect(
      esPortalUrlValida(
        `${FRONTEND_URL}/portal/`,
        FRONTEND_URL,
      ),
    ).toBe(false);
  });

  it('same-origin but path /portal/<not-a-uuid> → false', () => {
    expect(
      esPortalUrlValida(
        `${FRONTEND_URL}/portal/not-a-uuid-token-here`,
        FRONTEND_URL,
      ),
    ).toBe(false);
  });

  it('same-origin but extra path segment after uuid → false', () => {
    expect(
      esPortalUrlValida(
        `${FRONTEND_URL}/portal/${VALID_UUID}/extra`,
        FRONTEND_URL,
      ),
    ).toBe(false);
  });

  it('/portal with no trailing segment → false', () => {
    expect(
      esPortalUrlValida(
        `${FRONTEND_URL}/portal`,
        FRONTEND_URL,
      ),
    ).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Malformed / dangerous input
  // ---------------------------------------------------------------------------
  it('empty string → false', () => {
    expect(esPortalUrlValida('', FRONTEND_URL)).toBe(false);
  });

  it('non-url string → false', () => {
    expect(esPortalUrlValida('not-a-url', FRONTEND_URL)).toBe(false);
  });

  it('javascript: scheme → false', () => {
    expect(
      esPortalUrlValida(`javascript:alert(1)`, FRONTEND_URL),
    ).toBe(false);
  });

  it('data: scheme → false', () => {
    expect(
      esPortalUrlValida(`data:text/html,<h1>hi</h1>`, FRONTEND_URL),
    ).toBe(false);
  });

  it('ftp: scheme → false', () => {
    expect(
      esPortalUrlValida(
        `ftp://localhost:3000/portal/${VALID_UUID}`,
        FRONTEND_URL,
      ),
    ).toBe(false);
  });

  it('malformed frontendBaseUrl → false (does not throw)', () => {
    expect(
      esPortalUrlValida(
        `${FRONTEND_URL}/portal/${VALID_UUID}`,
        'not-a-url',
      ),
    ).toBe(false);
  });
});
