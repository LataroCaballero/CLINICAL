---
phase: 52-preop-hc-form-chip-catalogs
plan: "08"
subsystem: portal-link-email
tags: [bug-fix, security, email, portal, tdd]
requirements: [PREOP-12]

dependency_graph:
  requires: [52-07]
  provides: [portal-link-email-functional]
  affects: [pacientes-controller, pacientes-service, portal-email-flow]

tech_stack:
  added: []
  patterns:
    - pure-helper-function with unit tests (no NestJS TestingModule)
    - same-origin URL validation with URL.origin comparison
    - differentiated error motivos in API response

key_files:
  created:
    - backend/src/modules/pacientes/portal-url.helper.ts
    - backend/src/modules/pacientes/portal-url.helper.spec.ts
    - backend/src/modules/pacientes/dto/enviar-portal-link-email.dto.ts
  modified:
    - backend/src/modules/pacientes/pacientes.service.ts
    - backend/src/modules/pacientes/pacientes.controller.ts
    - frontend/src/hooks/usePortalLink.ts
    - frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx

decisions:
  - "Use URL.origin for same-origin comparison instead of string prefix matching — prevents subdomain bypass"
  - "Return motivo:'sin_destinatario'|'envio_fallido' from endpoint to enable client-side differentiated banners"
  - "Place explicit validarPortalUrl() in service (not controller) so validation logic stays with business rules"

metrics:
  duration: "~10 minutes"
  completed_date: "2026-06-26"
  tasks_completed: 2
  files_changed: 7
---

# Phase 52 Plan 08: Portal Link Email Gap Closure Summary

**One-liner:** Fixed email-send always failing by passing the client-held URL to the endpoint instead of re-deriving it via the idempotent generarPortalLink that returns url:null when a token already exists.

## What Was Built

### Root Cause Fixed (UAT Test 13)

The endpoint `POST /pacientes/:id/portal-link/email` was calling `generarPortalLink()` which is idempotent by design (D-12) — it returns `{ url: null, alreadyGenerated: true }` when a token already exists. Since the email UI only appears after a link has been generated, this call always returned `url: null`, causing the controller to short-circuit with `{ enviado: false }` before ever calling `enviarLinkPortal`. The user saw a generic "Verificá la dirección" error that was misleading.

### Fix Applied

The frontend already holds the generated URL in local state. We now pass it to the endpoint in the request body. The backend validates it server-side (same-origin + UUID path shape) and sends it directly, without touching `generarPortalLink`. D-12 remains intact: the raw UUID is never re-derived or persisted server-side.

### Task 1: Backend (TDD — 17 tests, all green)

**`portal-url.helper.ts`** — Pure function `esPortalUrlValida(url, frontendBaseUrl)`:
- Parses both URLs with `new URL()` inside try/catch (returns false on parse error)
- Rejects non-http/https schemes (javascript:, data:, ftp:, etc.)
- Compares `URL.origin` values for strict same-origin check (not substring matching)
- Validates pathname matches `/portal/<uuid-v4-shape>` regex exactly

**`EnviarPortalLinkEmailDto`** — Adds required `url: string` field (documented as explicitly validated via helper, not class-validator decorators which are inactive without global ValidationPipe).

**`PacientesService.validarPortalUrl()`** — Throws `BadRequestException` if `esPortalUrlValida` returns false, using `FRONTEND_URL` from ConfigService.

**`enviarPortalLinkEmail` controller rewrite:**
1. `validarPortalUrl(dto.url)` — HTTP 400 on invalid url, before anything else
2. `setEmailSiFalta(id, dto.email)` — if email provided in body
3. `findUnique` patient for email + name
4. `{ enviado: false, motivo: 'sin_destinatario' }` if no recipient
5. `enviarLinkPortal(paciente.email, dto.url, paciente.nombreCompleto)` — uses validated client url
6. `{ enviado: true }` or `{ enviado: false, motivo: 'envio_fallido' }`

**Eliminated:** the call to `generarPortalLink()` and the `if (!url) return { enviado: false }` short-circuit.

### Task 2: Frontend

**`usePortalLink.ts`:**
- `EnviarPortalLinkEmailResponse` extended with `motivo?: 'sin_destinatario' | 'envio_fallido'`
- `useEnviarPortalLinkEmail` mutation variables extended to `{ pacienteId, url, email? }`
- `url` included in the POST body alongside optional `email`

**`SharePortalPanel.tsx`:**
- `emailError: boolean` replaced by `emailErrorMotivo: 'sin_destinatario' | 'envio_fallido' | null`
- `handleEnviarEmail` passes `url` (from local state) in mutation call
- Two distinct error banners replace the generic "Verificá la dirección" message:
  - `sin_destinatario` → "Ingresá un email válido para enviar el link."
  - `envio_fallido` → "No se pudo enviar el email. Intentá nuevamente en unos minutos."

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface

T-52-01 mitigated: `esPortalUrlValida` rejects foreign-origin and non-portal-path URLs before any string is reflected in an email body. URL is never passed through without same-origin + UUID-path validation.

## Known Stubs

None — all wiring is complete. The email send flow is now deterministic given SMTP configuration.

## Self-Check: PASSED

Files confirmed present:
- backend/src/modules/pacientes/portal-url.helper.ts — FOUND
- backend/src/modules/pacientes/portal-url.helper.spec.ts — FOUND
- backend/src/modules/pacientes/dto/enviar-portal-link-email.dto.ts — FOUND
- frontend/src/hooks/usePortalLink.ts — FOUND (modified)
- frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx — FOUND (modified)

Commits:
- cee2ec9 — Task 1 backend
- dedd5db — Task 2 frontend

Verification:
- 17/17 portal-url.helper tests passing
- backend tsc --noEmit: exit 0
- frontend tsc --noEmit: exit 0
