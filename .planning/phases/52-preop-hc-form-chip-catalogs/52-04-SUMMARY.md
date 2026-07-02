---
phase: 52-preop-hc-form-chip-catalogs
plan: "04"
subsystem: backend/pacientes
tags: [portal-token, sha256, smtp, email, security]
dependency_graph:
  requires: []
  provides: [generarPortalLink, PortalEmailService, portal-link-endpoints]
  affects: [backend/src/modules/pacientes]
tech_stack:
  added: []
  patterns: [sha256-hash-token, smtp-aware-service, idempotent-generation]
key_files:
  created:
    - backend/src/modules/pacientes/portal-email.service.ts
  modified:
    - backend/src/modules/pacientes/pacientes.service.ts
    - backend/src/modules/pacientes/pacientes.controller.ts
    - backend/src/modules/pacientes/pacientes.module.ts
decisions:
  - sha256(randomUUID) persisted as portalToken; raw UUID returned once in URL only (PITFALL 1 / D-12)
  - Idempotent by design: second call returns alreadyGenerated:true with url:null; DB unchanged
  - SMTP gate: isSmtpConfigured() checks SMTP_HOST+USER+PASS; email send fails-closed (returns false, no throw)
metrics:
  duration: "12m"
  completed: "2026-06-26"
  tasks_completed: 2
  files_changed: 4
---

# Phase 52 Plan 04: Portal Token Generation + Share Endpoints Summary

SHA-256 hashed portal token generation (idempotent, D-12) with SMTP-gated email delivery and staff-only endpoints for link generation and sharing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | generarPortalLink + PortalEmailService | 9e1c789 | pacientes.service.ts, portal-email.service.ts |
| 2 | Portal-link + email endpoints + module wiring | ef64d8d | pacientes.controller.ts, pacientes.module.ts |

## What Was Built

### generarPortalLink (PacientesService)
- Fetches `portalToken` from DB; if already set returns `{ url: null, alreadyGenerated: true }` without touching the DB (D-12 idempotency)
- On first generation: `crypto.randomUUID()` → `sha256(rawUuid)` (64-char hex) persisted as `portalToken` + `portalTokenGeneradoAt: new Date()`
- Raw UUID only in return URL (`${FRONTEND_URL}/portal/${rawUuid}`); never in any DB write

### setEmailSiFalta (PacientesService)
- Updates `Paciente.email` only when currently null/empty — used by email endpoint for at-share email capture

### PortalEmailService
- Reads `SMTP_HOST/PORT/USER/PASS` from global ConfigService (same pattern as `reportes/services/email.service.ts`)
- `isSmtpConfigured(): boolean` — true only when host+user+pass all present
- `enviarLinkPortal(to, url, pacienteNombre): Promise<boolean>` — returns false (no throw) when SMTP absent or on send error

### Controller Endpoints (staff-scoped, pacienteId from path)
- `POST /pacientes/:id/portal-link` → `{ url, alreadyGenerated, smtpConfigured }`
- `POST /pacientes/:id/portal-link/email` body `{ email? }` → `{ enviado: boolean }`
  - If `email` in body: calls `setEmailSiFalta` first
  - Calls `generarPortalLink`; if `url` null (already generated) returns `{ enviado: false }`
  - Sends via `PortalEmailService.enviarLinkPortal`

### Module Wiring
- `PortalEmailService` added to `PacientesModule` providers

## Verification

- `npx tsc --noEmit` — no errors in modified files (pre-existing e2e test file excluded from rootDir is unrelated)
- `npm run build` — exits 0
- `grep -q "createHash('sha256')" pacientes.service.ts` — OK
- `grep -q "isSmtpConfigured" portal-email.service.ts` — OK
- `grep -q "portal-link" pacientes.controller.ts` — OK
- `grep -q "PortalEmailService" pacientes.module.ts` — OK

## Deviations from Plan

None — plan executed exactly as written.

## Security Notes (Threat Register)

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-52-10 | sha256(rawUUID) stored; raw UUID never persisted — confirmed by code review |
| T-52-11 | D-12 idempotency: existing token never re-hashed; early return before any DB update |
| T-52-12 | Both endpoints under class-level `@Auth('ADMIN','PROFESIONAL','SECRETARIA','FACTURADOR')`; id from `@Param`, never `@Body` |
| T-52-13 | `enviarLinkPortal` returns false when `!isSmtpConfigured()`; `smtpConfigured` flag in response hides option client-side |

## Known Stubs

None.

## Self-Check: PASSED

- `backend/src/modules/pacientes/portal-email.service.ts` — FOUND
- `backend/src/modules/pacientes/pacientes.service.ts` (generarPortalLink) — FOUND
- Commit 9e1c789 — FOUND
- Commit ef64d8d — FOUND
