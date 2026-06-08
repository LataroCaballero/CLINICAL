---
phase: 39-crm-tech-debt-fixes
plan: 01
subsystem: api
tags: [nestjs, prisma, crm, presupuestos, kanban]

# Dependency graph
requires:
  - phase: 38-stepper-interactions
    provides: CRM kanban and rechazarByToken() guard pattern
provides:
  - rechazar() with etapasProtegidas guard blocking PERDIDO write for CONFIRMADO/PROCEDIMIENTO_REALIZADO patients
  - getKanban with ACEPTADO-first presupuesto selection via presupuestoSeleccionado variable
affects: [frontend-kanban, crm-warnings, getEtapaWarning]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "etapasProtegidas guard: conditional spread in $transaction to skip PERDIDO write when patient is in protected stage"
    - "presupuestoSeleccionado: find(ACEPTADO) ?? [0] pattern for multi-presupuesto patients in kanban map"

key-files:
  created: []
  modified:
    - backend/src/modules/presupuestos/presupuestos.service.ts
    - backend/src/modules/pacientes/pacientes.service.ts

key-decisions:
  - "rechazar() mirrors rechazarByToken() guard exactly — etapasProtegidas list [CONFIRMADO, PROCEDIMIENTO_REALIZADO] is authoritative"
  - "getKanban sub-query drops take:1, filters RECHAZADO via where clause, then map picks ACEPTADO-first"
  - "presupuestoSeleccionado declared as local variable (block-body map) rather than IIFE — avoids duplicating find() call"

patterns-established:
  - "etapasProtegidas pattern: whenever a staff action might regress CRM stage to PERDIDO, guard with explicit protected-stages list"
  - "ACEPTADO-first selection: getKanban map always shows ACEPTADO presupuesto when it exists regardless of newer drafts"

requirements-completed: [TD-1, TD-3]

# Metrics
duration: 12min
completed: 2026-05-28
---

# Phase 39 Plan 01: CRM Tech Debt Fixes (TD-1 + TD-3) Summary

**rechazar() now guards against regressing CONFIRMADO/PROCEDIMIENTO_REALIZADO patients to PERDIDO; getKanban returns the ACEPTADO presupuesto when present, eliminating false CONFIRMADO warnings**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-28T16:30:00Z
- **Completed:** 2026-05-28T16:42:34Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- TD-1: `rechazar()` now reads `etapaCRM` before the `$transaction` and uses a conditional spread — patients in CONFIRMADO or PROCEDIMIENTO_REALIZADO are not moved to PERDIDO when staff rejects their presupuesto
- TD-3: `getKanban` sub-query drops `take: 1` and filters RECHAZADO via `where`; the `.map()` introduces `presupuestoSeleccionado = find(ACEPTADO) ?? [0]` — false CONFIRMADO warning eliminated for multi-presupuesto patients
- TypeScript build exits 0 with no new errors

## Task Commits

Each task was committed atomically:

1. **Task 1: rechazar() etapasProtegidas guard (TD-1)** - `7a5dd7b` (fix)
2. **Task 2: getKanban ACEPTADO-first presupuesto selection (TD-3)** - `c95f255` (fix)

## Files Created/Modified
- `backend/src/modules/presupuestos/presupuestos.service.ts` - Added etapasProtegidas guard in rechazar(); reads patient etapaCRM pre-transaction, wraps PERDIDO update in conditional spread
- `backend/src/modules/pacientes/pacientes.service.ts` - Removed take:1 from presupuestos sub-query, added RECHAZADO filter, refactored map to block-body with presupuestoSeleccionado variable

## Decisions Made
- Converted `.map((p) => ({...}))` to `.map((p) => { const ...; return {...}; })` to allow the `presupuestoSeleccionado` variable without duplication or IIFEs
- Used same `etapasProtegidas` list as `rechazarByToken()` — keeps both paths consistent and auditable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TD-1 and TD-3 closed; backend behaves correctly for both asymmetries
- Phase 39 Plan 02 (TD-2: STEPPER_CHAIN order) was already committed prior to this plan (dfb3d1c)
- No blockers for remaining plans

---
*Phase: 39-crm-tech-debt-fixes*
*Completed: 2026-05-28*
