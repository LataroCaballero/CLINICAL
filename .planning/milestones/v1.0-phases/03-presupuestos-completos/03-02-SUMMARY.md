---
phase: 03-presupuestos-completos
plan: "02"
subsystem: backend/presupuestos
tags: [pdf, email, nodemailer, pdfkit, public-endpoints, crm, mensajes-internos]
dependency_graph:
  requires: ["03-01"]
  provides: ["presupuesto-pdf-service", "presupuesto-email-service", "presupuesto-public-controller"]
  affects: ["presupuestos.service", "presupuestos.controller", "presupuestos.module"]
tech_stack:
  added: []
  patterns:
    - "PDFKit buffer generation with async logo fetch"
    - "Nodemailer with per-clinic SMTP fallback to env vars"
    - "Controller-scoped guard = public controller without @Auth()"
    - "Token-based patient acceptance flow with CRM state propagation"
key_files:
  created:
    - backend/src/modules/presupuestos/presupuesto-pdf.service.ts
    - backend/src/modules/presupuestos/presupuesto-email.service.ts
    - backend/src/modules/presupuestos/presupuesto-public.controller.ts
    - backend/src/modules/presupuestos/dto/enviar-email-presupuesto.dto.ts
  modified:
    - backend/src/modules/presupuestos/presupuestos.service.ts
    - backend/src/modules/presupuestos/presupuestos.controller.ts
    - backend/src/modules/presupuestos/presupuestos.module.ts
decisions:
  - "Auth guard is controller-scoped — no global APP_GUARD found — PresupuestoPublicController without @Auth() is sufficient for public access"
  - "SMTP fallback: ConfigClinica.smtpHost/User/Pass > SMTP_HOST/USER/PASS env vars — clinic can override system defaults"
  - "rechazarByToken creates MensajeInterno with PrioridadMensaje.MEDIA (vs ALTA for aceptar) — rejected presupuesto is important but not urgent"
  - "aceptarByToken calls cuentasCorrientesService.createMovimiento() outside transaction then references movimiento.id inside transaction — matches existing aceptar() pattern"
metrics:
  duration: "5min"
  completed_date: "2026-02-24"
  tasks_completed: 3
  files_modified: 7
---

# Phase 3 Plan 2: PDF Generation, Email Delivery & Public Acceptance Flow Summary

PDFKit A4 presupuesto PDF with clinic branding, Nodemailer email with PDF attachment and UUID acceptance token, and public controller endpoints for patient acceptance/rejection with CRM state propagation and internal notifications.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | PresupuestoPdfService + PresupuestoEmailService + EnviarEmailDto | 833bd01 | presupuesto-pdf.service.ts, presupuesto-email.service.ts, dto/enviar-email-presupuesto.dto.ts |
| 2a | Service methods + controller endpoints (pdf, enviar-email) | c12dedd | presupuestos.service.ts, presupuestos.controller.ts |
| 2b | Public controller + module wiring | d4e4f77 | presupuesto-public.controller.ts, presupuestos.module.ts |

## New Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /presupuestos/:id/pdf | JWT required | Genera y descarga PDF del presupuesto |
| POST | /presupuestos/:id/enviar-email | JWT required | Genera PDF + envía email con token + marca ENVIADO |
| GET | /presupuestos/public/:token | **Public** | Retorna datos del presupuesto para página pública |
| POST | /presupuestos/public/:token/aceptar | **Public** | Acepta presupuesto: cargo CC + CRM CONFIRMADO + MensajeInterno ALTA |
| POST | /presupuestos/public/:token/rechazar | **Public** | Rechaza presupuesto: CRM PERDIDO + MensajeInterno MEDIA |

## Architecture Notes

### Auth Guard — No Global Guard Found
Verified: no `APP_GUARD` in `app.module.ts`, no `useGlobalGuards()` in `main.ts`. The `@Auth()` decorator applies `JwtRolesGuard` at controller class level only. Therefore `PresupuestoPublicController` (no `@Auth()`) is fully public — no `@SetMetadata('isPublic', true)` needed.

### SMTP Fallback Behavior
`PresupuestoEmailService.sendEmail()` resolves SMTP credentials in priority order:
1. `ConfigClinica.smtpHost` / `smtpUser` / `smtpPassEncrypted` (per-clinic config)
2. `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` env vars (system default)
3. If neither is configured: logs `WARN "SMTP no configurado"` and returns silently (does not throw)

The presupuesto is still marked ENVIADO + tokenAceptacion stored even if email fails, so the acceptance URL can be shared manually.

### TypeScript Compilation Status
`npm run build` exits clean — zero `error TS` entries. All new files compile correctly.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

**Files created:**
- [x] backend/src/modules/presupuestos/presupuesto-pdf.service.ts
- [x] backend/src/modules/presupuestos/presupuesto-email.service.ts
- [x] backend/src/modules/presupuestos/presupuesto-public.controller.ts
- [x] backend/src/modules/presupuestos/dto/enviar-email-presupuesto.dto.ts

**Commits:**
- [x] 833bd01 — Task 1
- [x] c12dedd — Task 2a
- [x] d4e4f77 — Task 2b

## Self-Check: PASSED
