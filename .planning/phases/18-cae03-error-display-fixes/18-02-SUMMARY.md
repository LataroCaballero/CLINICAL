---
phase: 18-cae03-error-display-fixes
plan: "02"
subsystem: finanzas
tags: [afip, cae, bullmq, processor, modal, error-display, frontend]

# Dependency graph
requires:
  - phase: 18-01
    provides: Test 9 RED state — failing test establishing UnrecoverableError afipError-persist requirement
  - phase: 17-02
    provides: afipError field on Factura model, PrismaService in CaeEmissionProcessor, onFailed handler
provides:
  - BUG-1 fix: prisma.factura.update unconditional in onFailed — afipError persisted for all failure paths
  - BUG-2 fix: FacturaDetailModal shows red error panel for EMISION_PENDIENTE || CAEA_PENDIENTE_INFORMAR
  - Test 9 GREEN: UnrecoverableError path (attemptsMade=1 < maxAttempts=5) now persists afipError
affects: [cae-emission.processor, FacturaDetailModal, CAE-03 requirement]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BullMQ onFailed: DB write before conditional guard — ensures error persisted regardless of retry count"
    - "JSX OR condition for multi-estado error panels — avoid stale error on terminal states (EMITIDA/ANULADA)"

key-files:
  created: []
  modified:
    - backend/src/modules/finanzas/processors/cae-emission.processor.ts
    - frontend/src/app/dashboard/finanzas/facturacion/components/FacturaDetailModal.tsx

key-decisions:
  - "[Plan 18-02] prisma.factura.update moved before if (attemptsMade >= maxAttempts) guard — unconditional write on every onFailed invocation regardless of retry count"
  - "[Plan 18-02] Error panel condition: EMISION_PENDIENTE || CAEA_PENDIENTE_INFORMAR — EMITIDA/ANULADA excluded to prevent stale error display"

patterns-established:
  - "BullMQ processor DB writes: place unconditionally before retry guards when the write must happen on all failures"

requirements-completed: [CAE-03]

# Metrics
duration: 5min
completed: 2026-03-31
---

# Phase 18 Plan 02: BUG-1 + BUG-2 Fix Summary

**afipError persisted unconditionally in onFailed (BUG-1) and FacturaDetailModal error panel expanded to CAEA_PENDIENTE_INFORMAR (BUG-2) — Test 9 GREEN, all 7 processor tests passing**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-31T12:12:54Z
- **Completed:** 2026-03-31T12:18:00Z
- **Tasks:** 2 auto-tasks complete (Task 3 is checkpoint:human-verify — pending)
- **Files modified:** 2

## Accomplishments
- BUG-1: Moved `prisma.factura.update` outside the `attemptsMade >= maxAttempts` guard in `onFailed` — afipError is now persisted for every job failure, including the UnrecoverableError path where `attemptsMade=1 < maxAttempts=5`
- BUG-2: Expanded FacturaDetailModal error panel JSX condition to include `CAEA_PENDIENTE_INFORMAR` alongside `EMISION_PENDIENTE` — Facturador sees the red error panel for CAEA fallback failures as well
- Test 9 turns GREEN — all 7 processor tests pass (Tests 6, 7, 8 unchanged)

## Task Commits

Each task was committed atomically:

1. **Task 1: BUG-1 fix — move prisma.factura.update before attemptsMade guard** - `fca3dc7` (fix)
2. **Task 2: BUG-2 fix — expand FacturaDetailModal error panel to CAEA_PENDIENTE_INFORMAR** - `3730f9a` (fix)

_Task 3 is a checkpoint:human-verify — no commit until approved._

## Files Created/Modified
- `backend/src/modules/finanzas/processors/cae-emission.processor.ts` - BUG-1: prisma.factura.update moved before the attemptsMade guard; comment updated
- `frontend/src/app/dashboard/finanzas/facturacion/components/FacturaDetailModal.tsx` - BUG-2: error panel condition expanded to EMISION_PENDIENTE || CAEA_PENDIENTE_INFORMAR

## Decisions Made
- `prisma.factura.update` before guard rather than duplicating inside guard — single write, no duplication risk
- OR condition for estados rather than removing estado check entirely — EMITIDA/ANULADA facturas must not show stale error messages

## Deviations from Plan

None — plan executed exactly as written. Both fixes matched the exact replacement snippets provided in `<interfaces>`.

## Issues Encountered
- Frontend `npm run build` fails with Node.js 18.x (project requires >=20.9.0) — pre-existing environment constraint unrelated to this fix. TypeScript type-check via `tsc --noEmit` passes cleanly with no errors.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Task 3 (checkpoint:human-verify) pending human approval of Scenarios A/B/C
- Once approved, CAE-03 requirement is fully closed
- Phase 18 will be complete after checkpoint passes

---
*Phase: 18-cae03-error-display-fixes*
*Completed: 2026-03-31*

## Self-Check: PASSED

- FOUND: `.planning/phases/18-cae03-error-display-fixes/18-02-SUMMARY.md`
- FOUND: `backend/src/modules/finanzas/processors/cae-emission.processor.ts`
- FOUND: `frontend/src/app/dashboard/finanzas/facturacion/components/FacturaDetailModal.tsx`
- FOUND: commit `fca3dc7` (BUG-1 fix)
- FOUND: commit `3730f9a` (BUG-2 fix)
