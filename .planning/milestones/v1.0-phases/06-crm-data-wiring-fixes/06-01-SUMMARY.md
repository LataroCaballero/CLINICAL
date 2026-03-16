---
phase: 06-crm-data-wiring-fixes
plan: "01"
subsystem: api
tags: [nestjs, prisma, crm, contactolog, funnel, coordinator-performance]

# Dependency graph
requires:
  - phase: 05-dashboard-de-conversion
    provides: crm-dashboard.service.ts with ETAPAS_FUNNEL, CRMFunnelWidget, getCoordinatorPerformance()
  - phase: 02-log-de-contactos-lista-de-accion
    provides: createContacto() endpoint and ContactoLog schema with registradoPorId field

provides:
  - registradoPorId populated on every new ContactoLog — coordinator attribution now works
  - PROCEDIMIENTO_REALIZADO in ETAPAS_FUNNEL — funnel includes clinical stage before confirmation
  - PROCEDIMIENTO_REALIZADO label in CRMFunnelWidget — UI shows "Procedimiento realizado"

affects: [crm-dashboard, coordinator-performance-widget, crm-funnel-widget]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Controller extracts userId from req.user and passes as primitive to service — service never receives req object"
    - "ETAPAS_FUNNEL constant drives funnel query and stage order — single source of truth for funnel shape"

key-files:
  created: []
  modified:
    - backend/src/modules/pacientes/pacientes.controller.ts
    - backend/src/modules/pacientes/pacientes.service.ts
    - backend/src/modules/reportes/services/crm-dashboard.service.ts
    - frontend/src/app/dashboard/components/CRMFunnelWidget.tsx

key-decisions:
  - "registradoPorId extracted at controller layer, passed as 4th primitive arg to createContacto() — keeps service signature clean, no req object leakage to service layer"
  - "PROCEDIMIENTO_REALIZADO inserted between PRESUPUESTO_ENVIADO and CONFIRMADO in ETAPAS_FUNNEL — matches clinical sequence and Phase 4 decision in STATE.md"

patterns-established:
  - "Controller-service attribution pattern: controller extracts identity from JWT payload, service receives only the userId string"

requirements-completed: [LOG-01, DASH-05, DASH-01]

# Metrics
duration: 8min
completed: 2026-03-02
---

# Phase 06 Plan 01: CRM Data Wiring Fixes Summary

**registradoPorId wired from JWT payload to ContactoLog, and PROCEDIMIENTO_REALIZADO added to funnel array and frontend label map — coordinator attribution and clinical stage now complete**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-02T22:38:00Z
- **Completed:** 2026-03-02T22:46:46Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Controller now extracts `req.user.userId` and passes it as 4th argument to `createContacto()`, persisting coordinator identity on every new ContactoLog
- Service `createContacto()` signature extended with optional `registradoPorId?: string`, written as `registradoPorId: registradoPorId ?? null` to the Prisma data block
- `ETAPAS_FUNNEL` in `crm-dashboard.service.ts` now includes `EtapaCRM.PROCEDIMIENTO_REALIZADO` between `PRESUPUESTO_ENVIADO` and `CONFIRMADO`
- `ETAPAS_LABELS` in `CRMFunnelWidget.tsx` has `PROCEDIMIENTO_REALIZADO: "Procedimiento realizado"` — UI renders the correct Spanish label instead of raw enum string

## Task Commits

1. **Task 1: Wire registradoPorId en createContacto — controller + service** - `be7a961` (feat)
2. **Task 2: Agregar PROCEDIMIENTO_REALIZADO al embudo — backend array + frontend label** - `a170eb9` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `backend/src/modules/pacientes/pacientes.controller.ts` - Extracts `registradoPorId = req.user?.userId` and passes as 4th arg to `createContacto()`
- `backend/src/modules/pacientes/pacientes.service.ts` - Added `registradoPorId?: string` parameter and `registradoPorId: registradoPorId ?? null` in Prisma data block
- `backend/src/modules/reportes/services/crm-dashboard.service.ts` - Added `EtapaCRM.PROCEDIMIENTO_REALIZADO` to `ETAPAS_FUNNEL` constant
- `frontend/src/app/dashboard/components/CRMFunnelWidget.tsx` - Added `PROCEDIMIENTO_REALIZADO: "Procedimiento realizado"` to `ETAPAS_LABELS`

## Decisions Made
- `registradoPorId` extracted at controller layer, passed as plain string to service — consistent with Phase 2.1 pattern where `profesionalId` fallback lookup also occurs in controller
- `PROCEDIMIENTO_REALIZADO` position in funnel (between `PRESUPUESTO_ENVIADO` and `CONFIRMADO`) matches the clinical milestone decision documented in STATE.md from Phase 4

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Both fields (`registradoPorId` in schema, `PROCEDIMIENTO_REALIZADO` in enum) were already present from prior migrations — changes were purely additive wiring.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CoordinatorPerformanceWidget will show real attribution rows for coordinators who log contacts going forward (retroactive logs remain as "Sin asignar")
- CRM funnel endpoint and widget now correctly represent the full 6-stage conversion path including the clinical procedure milestone
- Phase 06 Plan 01 complete — all requirements LOG-01, DASH-05, DASH-01 satisfied

---
*Phase: 06-crm-data-wiring-fixes*
*Completed: 2026-03-02*
