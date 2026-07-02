---
phase: 29-patientdrawer-flujo-action
plan: 01
subsystem: api
tags: [prisma, nestjs, crm, transaction, contactolog]

# Dependency graph
requires:
  - phase: 26-schema-foundation
    provides: FlujoPaciente enum and etapaCRM field in Paciente model
provides:
  - updateFlujo() atomic $transaction: flujo + etapaCRM reset + ContactoLog
affects: [kanban, crm-flow, patientdrawer-flujo-action]

# Tech tracking
tech-stack:
  added: []
  patterns: [prisma-$transaction-array-with-conditional-spread]

key-files:
  created: []
  modified:
    - backend/src/modules/pacientes/pacientes.service.ts

key-decisions:
  - "updateFlujo() uses etapaCRM: null (not 'SIN_CLASIFICAR' string) — DB enum has no SIN_CLASIFICAR value; kanban maps null at read time"
  - "ContactoLog creation guarded by profesionalId non-null check — legacy patients without profesionalId still get flujo updated"
  - "Three operations (flujo update, etapaCRM reset, ContactoLog create) are atomic via $transaction array"

patterns-established:
  - "Conditional spread in $transaction array: ...(condition ? [prisma.model.create({...})] : []) — avoids nullable operation in transaction"

requirements-completed: [PAC-04, PAC-05]

# Metrics
duration: 8min
completed: 2026-04-29
---

# Phase 29 Plan 01: updateFlujo() Atomic CRM Side Effects Summary

**updateFlujo() extended to run flujo + etapaCRM:null + ContactoLog SISTEMA creation in a single Prisma $transaction, with guard for legacy patients lacking profesionalId**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-29T23:55:30Z
- **Completed:** 2026-04-29T00:03:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced single `prisma.paciente.update` with `$transaction` array in `updateFlujo()`
- Update now sets both `flujo` and `etapaCRM: null` atomically (kanban maps null to SIN_CLASIFICAR at read time)
- Conditionally creates `ContactoLog` with tipo SISTEMA and nota "Paciente pendiente de clasificación" only when `profesionalId` is set
- Legacy patients without `profesionalId` continue to work without error

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend updateFlujo() with $transaction (flujo + etapaCRM + ContactoLog)** - `b33e821` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `backend/src/modules/pacientes/pacientes.service.ts` - updateFlujo() replaced with $transaction pattern; pre-fetches profesionalId; conditional ContactoLog spread

## Decisions Made
- Used `etapaCRM: null` instead of any enum string — the DB EtapaCRM enum has no SIN_CLASIFICAR value; the kanban service maps null to that label at line 671
- Used conditional spread `...(paciente.profesionalId ? [...] : [])` inside `$transaction` array — cleanest pattern for optional transaction operations without branching the entire method
- No changes to controller or DTO — endpoint signature unchanged

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript error in `backend/test/app.e2e-spec.ts` (not under `rootDir`) — this is a known project config issue unrelated to this plan. Zero errors in `pacientes.service.ts`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `updateFlujo()` is now atomic and CRM-aware; ready for Plan 29-02 (frontend invalidation of kanban/tratamientos/listaAccion caches after flujo change)
- No blockers

---
*Phase: 29-patientdrawer-flujo-action*
*Completed: 2026-04-29*
