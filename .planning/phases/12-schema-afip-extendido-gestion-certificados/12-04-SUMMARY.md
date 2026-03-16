---
phase: 12-schema-afip-extendido-gestion-certificados
plan: 04
subsystem: ui
tags: [afip, tanstack-query, react, next.js, shadcn-ui, typescript, cert-management]

# Dependency graph
requires:
  - phase: 12-02
    provides: AfipConfigController endpoints (GET /afip-config/status, POST /afip-config/cert, PATCH /afip-config/billing)
  - phase: 12-03
    provides: CertExpiryScheduler daily cert-expiry alerts, backend fully operational

provides:
  - AfipConfigStatusResponse and SaveCertRequest types in frontend/src/types/afip.ts
  - useAfipConfig TanStack Query hook (GET /afip-config/status)
  - useSaveCert TanStack Query mutation (POST /afip-config/cert)
  - useSaveBillingConfig TanStack Query mutation (PATCH /afip-config/billing)
  - AfipConfigTab component — two-section form (Certificado + Configuracion de facturacion) with preview modal and status view toggle
  - AFIP tab integrated into Configuracion page for ADMIN and PROFESIONAL roles
  - Cert status badge on Facturador home — visual-only, verde/amarillo/rojo based on certStatus

affects:
  - phase-13-wsaa-token-service
  - phase-14-emision-cae-real
  - phase-15-qr-afip-pdf-frontend

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TanStack Query useQuery hook for AFIP config status (queryKey afip-config-status, invalidated on cert/billing save)
    - Two-section card layout following WhatsappConfigTab pattern
    - Preview modal before destructive saves — show user-entered values with ambiente prominently displayed
    - CertBadge reusable sub-component — certStatus drives color class (green/yellow/red)
    - Edit/status toggle via isEditingCert boolean — textareas always empty in edit mode (security)

key-files:
  created:
    - frontend/src/types/afip.ts
    - frontend/src/hooks/useAfipConfig.ts
    - frontend/src/hooks/useSaveCert.ts
    - frontend/src/hooks/useSaveBillingConfig.ts
    - frontend/src/app/dashboard/configuracion/components/AfipConfigTab.tsx
  modified:
    - frontend/src/app/dashboard/configuracion/page.tsx
    - frontend/src/app/dashboard/facturador/page.tsx

key-decisions:
  - "Preview modal before cert save shows user-entered values + ambiente prominently — CUIT/expiry extracted server-side after confirm"
  - "Textareas always empty in edit mode — cert content never returned to browser (security)"
  - "Billing config section only visible when configured or in edit mode — avoids confusion before first cert load"
  - "ADMIN TabsList uses max-w-xl (non-grid) — added AFIP tab between whatsapp and reportes"
  - "PROFESIONAL TabsList grid-cols-8 upgraded to grid-cols-9 — AFIP tab added between whatsapp and reportes"
  - "Facturador badge uses useAfipConfig hook — renders only when configured, no onClick/Link wrapper"

patterns-established:
  - "CertBadge pattern: certStatus === 'OK' → green-600, EXPIRING_SOON → yellow-500, EXPIRED → red-600"
  - "Loading state text 'Validando con AFIP...' for both cert save and billing save mutations"
  - "Error handling via axiosError.response.data.message with fallback to axiosError.message"

requirements-completed:
  - CERT-02
  - CERT-04

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 12 Plan 04: AfipConfigTab Frontend Summary

**TanStack Query hooks + AfipConfigTab two-section form with preview modal + cert status badge on Facturador home, closing Phase 12 AFIP frontend layer**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-16T17:09:45Z
- **Completed:** 2026-03-16T17:13:35Z
- **Tasks:** 2 auto tasks complete, 1 checkpoint:human-verify pending
- **Files modified:** 7

## Accomplishments
- Four frontend files created: AfipConfigStatusResponse types + three TanStack Query hooks following exact repo patterns
- AfipConfigTab with two-section card layout, edit/status toggle, preview modal before save, "Validando con AFIP..." loading state
- AFIP tab wired into Configuracion page for both ADMIN (non-grid TabsList) and PROFESIONAL (grid-cols-9) role views
- Cert status badge injected above Facturador dashboard KPIs — visual-only, conditionally rendered only when cert is configured

## Task Commits

Each task was committed atomically:

1. **Task 1: Frontend types and TanStack Query hooks** - `aff2faa` (feat)
2. **Task 2: AfipConfigTab component + configuracion page wiring + Facturador badge** - `d3e2303` (feat)

**Plan metadata:** (docs commit — pending after human verify)

## Files Created/Modified
- `frontend/src/types/afip.ts` - CertStatus type, AfipConfigStatusResponse, SaveCertRequest, SaveBillingConfigRequest interfaces
- `frontend/src/hooks/useAfipConfig.ts` - useQuery for GET /afip-config/status, queryKey ["afip-config-status"]
- `frontend/src/hooks/useSaveCert.ts` - useMutation for POST /afip-config/cert, invalidates afip-config-status on success
- `frontend/src/hooks/useSaveBillingConfig.ts` - useMutation for PATCH /afip-config/billing, invalidates afip-config-status on success
- `frontend/src/app/dashboard/configuracion/components/AfipConfigTab.tsx` - Two-section form with preview modal and status view toggle
- `frontend/src/app/dashboard/configuracion/page.tsx` - AFIP tab added to ADMIN and PROFESIONAL role views
- `frontend/src/app/dashboard/facturador/page.tsx` - Cert status badge above first section, useAfipConfig hook added

## Decisions Made
- Preview modal shows user-entered values (ambiente prominent, ptoVta, cert preview). CUIT/expiry extracted server-side and visible only after successful save in the status view.
- PRODUCCION ambiente triggers a red warning in the preview modal ("Los comprobantes generados serán válidos ante AFIP")
- CertBadge extracted as local sub-component used in both the status view and the facturador badge (DRY)
- Billing section only shown when configured or in edit mode — reduces confusion for tenants not yet set up

## Deviations from Plan

None — plan executed exactly as specified. Pre-existing TypeScript errors in `PatientsTable.tsx` logged to `deferred-items.md` (out of scope per deviation rule scope boundary).

## Issues Encountered
- Pre-existing TypeScript error in `frontend/src/app/dashboard/components/PatientsTable.tsx` (lines 73-75: NewPacienteModal prop mismatch). Not caused by Plan 12-04 changes. Documented in `deferred-items.md`. Build fails on TypeScript step due to this pre-existing issue; the new AFIP files have zero TS errors.

## User Setup Required
None — no external service configuration required for the frontend layer. Backend cert upload requires real AFIP cert (documented in Phase 12 context).

## Next Phase Readiness
- Phase 12 complete — all 4 plans done
- Phase 13 (WSAA Token Service) can begin: AfipConfigService (Plan 02) provides the cert/key loading, frontend UI (this plan) provides admin config surface
- Pending: Human verification of UI (checkpoint:human-verify task 3) before marking Phase 12 closed

---
*Phase: 12-schema-afip-extendido-gestion-certificados*
*Completed: 2026-03-16*
