---
phase: 52-preop-hc-form-chip-catalogs
reviewed: 2026-06-26T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - backend/src/modules/pacientes/portal-url.helper.ts
  - backend/src/modules/pacientes/portal-url.helper.spec.ts
  - backend/src/modules/pacientes/dto/enviar-portal-link-email.dto.ts
  - backend/src/modules/pacientes/pacientes.service.ts
  - backend/src/modules/pacientes/pacientes.controller.ts
  - frontend/src/hooks/usePortalLink.ts
  - frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
  resolved: 2
status: issues_found
resolution_note: >
  CR-01 (critical) and WR-01 (warning) fixed in commit 1f24574 — esPortalUrlValida
  now rejects query/fragment, validarPortalUrl returns a canonical origin+pathname
  reflected into the email (never raw dto.url), email shape validated at runtime,
  7 regression tests added. WR-02/03/04 and the info items are documented as
  follow-ups (UX of already-generated tokens, token-ownership verification under
  D-12, and tenant scoping are architectural and out of this gap's scope).
---

# Phase 52: Code Review Report

**Reviewed:** 2026-06-26
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Gap-closure review for UAT Test 13 (portal-link email send). The core mechanics are
mostly sound: D-12 is honored (raw UUID never persisted — only the SHA-256 hash is
stored, and an existing token is never re-derived), the recipient is resolved from the
DB rather than the request body, and `enviarLinkPortal` degrades gracefully on SMTP
failure.

However, the central security claim of this change — that `esPortalUrlValida`
"prevents URL injection into email bodies" — does **not** hold. The validator inspects
only `origin`, `protocol`, and `pathname`, while the `query` and `fragment` of the URL
are ignored, and the controller reflects the **raw, unparsed** `dto.url` string into the
email HTML. This permits HTML injection into the outgoing email despite passing
validation (proven empirically, see CR-01). There are also secondary gaps: `dto.email`
is persisted with no runtime validation (the `@IsEmail()` decorator is inert, by the
file's own admission), and the frontend cannot retrieve or surface the link for a
patient who already has a token, leaving the share panel silently stuck.

## Critical Issues

### CR-01: URL query/fragment bypass the validator and are reflected verbatim into the email HTML (injection)

**File:** `backend/src/modules/pacientes/portal-url.helper.ts:27-54`, `backend/src/modules/pacientes/pacientes.controller.ts:258,278-282`

**Issue:** `esPortalUrlValida` validates only `parsed.protocol`, `parsed.origin`, and
`parsed.pathname`. It never checks `parsed.search` or `parsed.hash`. Meanwhile the
controller validates with the helper but then passes the **raw client string**
`dto.url` (not a reconstructed/sanitized URL) to `portalEmail.enviarLinkPortal`, which
interpolates it into `<a href="${url}">` in the email body. An authenticated staff user
can therefore craft a same-origin, valid-path URL whose query or fragment carries
`"`, `<`, `>` and break out of the `href` attribute / inject HTML into the email
delivered to the patient. Confirmed empirically:

```
input : http://localhost:3000/portal/f47ac10b-58cc-4372-a567-0e02b2c3d479?x="><script>alert(1)</script>
result: esPortalUrlValida => true   (pathname matches, origin matches)
reflected into href verbatim because the controller forwards dto.url, not parsed.href
```

```
input : http://localhost:3000/portal/f47ac10b-58cc-4372-a567-0e02b2c3d479#"><img src=x onerror=alert(1)>
result: esPortalUrlValida => true
```

This directly defeats the stated purpose in the helper's header comment ("preventing URL
injection into email bodies"). The unit tests give false confidence because none of them
exercise a same-origin URL carrying a query string or fragment.

**Fix:** Reject any URL that carries a query string or fragment, and reflect the
*reconstructed* URL rather than the raw string. For example, in the helper:

```typescript
// after the origin + pathname checks:
if (parsed.search !== '' || parsed.hash !== '') {
  return false;
}
```

And add tests:

```typescript
it('same-origin uuid path WITH query string → false', () => {
  expect(esPortalUrlValida(
    `${FRONTEND_URL}/portal/${VALID_UUID}?x="><script>alert(1)</script>`,
    FRONTEND_URL,
  )).toBe(false);
});
it('same-origin uuid path WITH fragment → false', () => {
  expect(esPortalUrlValida(
    `${FRONTEND_URL}/portal/${VALID_UUID}#"><img src=x onerror=alert(1)>`,
    FRONTEND_URL,
  )).toBe(false);
});
```

Defense-in-depth: also HTML-escape `url` (and `pacienteNombre`) at the point of
interpolation in `portal-email.service.ts buildHtml`, so the email layer is not the sole
trust boundary.

## Warnings

### WR-01: `dto.email` is persisted and used as the SMTP recipient with no runtime validation

**File:** `backend/src/modules/pacientes/dto/enviar-portal-link-email.dto.ts:25-27`, `backend/src/modules/pacientes/pacientes.controller.ts:261-263`, `backend/src/modules/pacientes/pacientes.service.ts:1071-1084`

**Issue:** The DTO's own header comment states there is no global `ValidationPipe`, so
`@IsEmail()` / `@IsOptional()` are inert at runtime. The team correctly compensated for
`url` by validating it explicitly via `validarPortalUrl`, but did **not** do the same for
`email`. Whatever string the client sends in `dto.email` is persisted verbatim onto the
`Paciente` record (`setEmailSiFalta`) when the patient has no email, and on the next call
becomes the `to:` address. This allows garbage / malformed data into the patient record
and feeds an unvalidated value into `nodemailer`. The frontend `type="email"` input is
client-side only and is trivially bypassed by a direct API call.

**Fix:** Validate `dto.email` server-side, mirroring the explicit `url` validation:

```typescript
if (dto.email !== undefined) {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(dto.email)) {
    throw new BadRequestException('Email inválido');
  }
  await this.pacientesService.setEmailSiFalta(id, dto.email);
}
```

(Or, better, enable a scoped `ValidationPipe` on this route so the decorators actually run.)

### WR-02: Patient with an existing portal token can never retrieve the link, and the UI gives no feedback

**File:** `frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx:39-52,103-134,146-150`, `backend/src/modules/pacientes/pacientes.service.ts:1041-1044`

**Issue:** `generarPortalLink` returns `{ url: null, alreadyGenerated: true }` whenever a
token already exists (correct per D-12 — the raw UUID is unrecoverable). The frontend only
calls `setUrl` when `result.url` is truthy (line 44), so for an already-generated patient
`url` stays `null`, the component remains in the "Genera el link" branch (line 103), and
clicking "Generar link del portal" appears to do nothing — the button just re-enables.
`setAlreadyGenerated(true)` is set but the `alreadyGenerated` banner (lines 146-150) lives
only inside the `url`-available branch, so it is never shown. The inline comment at lines
42-43 assumes a url was fetched earlier "in the same session", which is false after a page
reload or when another user first opens the panel. Net effect: the share feature is dead
for any patient whose token was generated previously, with zero user feedback.

**Fix:** Surface the `alreadyGenerated && !url` state explicitly, e.g. render a message in
the no-url branch ("Ya existe un link para este paciente, pero por seguridad no puede
recuperarse. Genera uno nuevo si lo necesitás.") and provide a regenerate path (a backend
endpoint that rotates the token) if recovering the link is a product requirement. At
minimum, do not leave the button as a silent no-op.

### WR-03: `validarPortalUrl` confirms URL *shape* but never that the UUID belongs to this patient

**File:** `backend/src/modules/pacientes/pacientes.controller.ts:252-285`, `backend/src/modules/pacientes/pacientes.service.ts:1017-1025`

**Issue:** The email endpoint trusts the client-supplied `dto.url` and only checks that it
is same-origin with a UUID-shaped path. It never verifies that the URL's token corresponds
to `:id`'s stored `portalToken` (which is feasible: hash the URL's UUID and compare to the
stored hash). Consequently a staff user can email patient A a link that embeds patient B's
(or any random) token. The mismatched link will not authenticate, but the patient receives
a credible-looking, wrong/garbage portal link from the clinic. This is an inherent
consequence of forwarding a client-held URL instead of re-deriving it, but it is unguarded.

**Fix:** Extract the UUID from the validated pathname, hash it with SHA-256, and compare to
the patient's stored `portalToken` before sending; reject on mismatch. This also closes the
door on CR-01's query/fragment payloads since you would reconstruct
`${FRONTEND_URL}/portal/${uuid}` from validated parts rather than echoing `dto.url`.

### WR-04: No patient-ownership / professional-tenant scoping on the portal endpoints

**File:** `backend/src/modules/pacientes/pacientes.controller.ts:239-285`

**Issue:** Both `POST :id/portal-link` and `POST :id/portal-link/email` accept any
`pacienteId` for any authenticated user in `ADMIN | PROFESIONAL | SECRETARIA | FACTURADOR`
(class-level `@Auth`), with no check that the patient belongs to the caller's professional
context / tenant. Per CLAUDE.md ("Mantener multi-tenant/roles cuando aplique"), a
PROFESIONAL or FACTURADOR can generate and email portal links for patients outside their
scope. This may be a pre-existing pattern in this controller (e.g., `findOne` is similarly
unscoped), but the new endpoints extend an unscoped surface to an action that sends email
to patients.

**Fix:** Apply the same professional/tenant ownership check used elsewhere in the module
(resolve `profesionalId` from the patient and compare to `req.user`, as done in
`createContacto` at lines 117-133), and reconsider whether `FACTURADOR` should send portal
links at all.

## Info

### IN-01: Regex is documented as "uuid-v4" but accepts any hex version/variant nibbles

**File:** `backend/src/modules/pacientes/portal-url.helper.ts:18-19`

**Issue:** `UUID_V4_SHAPE` accepts any hex in the version and variant positions, so it
validates non-v4 UUIDs too. Real tokens come from `crypto.randomUUID()` (always v4), so
this is not a security hole, but the name/comment overstate the strictness.

**Fix:** Either rename to `UUID_SHAPE` or tighten the pattern to enforce the `4` version
nibble and `[89ab]` variant nibble if v4 is actually required.

### IN-02: `FRONTEND_URL` silently defaults to `http://localhost:3000` in both validation and generation

**File:** `backend/src/modules/pacientes/pacientes.service.ts:1018-1021,1060-1064`

**Issue:** If `FRONTEND_URL` is unset in production, both generation and validation fall
back to `localhost:3000`. Generated/emailed links would point at localhost (unreachable for
patients) yet still pass validation, masking the misconfiguration.

**Fix:** Fail fast (or log a startup warning) when `FRONTEND_URL` is unset in non-dev
environments rather than defaulting to localhost.

### IN-03: Patient email is persisted before send success is confirmed

**File:** `backend/src/modules/pacientes/pacientes.controller.ts:261-284`

**Issue:** `setEmailSiFalta` writes the email to the record before the send is attempted, so
a subsequent `envio_fallido` still leaves the (possibly mistyped) email persisted. Likely
intentional (capture-on-entry), but worth confirming.

**Fix:** If undesired, persist the email only after a successful send.

### IN-04: Debug `console.log` of full patient DTO (PII) in a reviewed file

**File:** `backend/src/modules/pacientes/pacientes.service.ts:44`

**Issue:** `console.log('DTO RECIBIDO:', dto)` logs the entire patient creation payload
(PII) to stdout. Pre-existing and outside this gap-closure's diff, but present in a file
under review.

**Fix:** Remove the debug log or gate it behind a debug flag / structured logger that
redacts PII.

---

_Reviewed: 2026-06-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
