---
phase: 18-cae03-error-display-fixes
plan: 01
subsystem: testing
tags: [jest, bullmq, nestjs, cae, afip, tdd]

# Dependency graph
requires:
  - phase: 17-cae-emission-ux
    provides: CaeEmissionProcessor with onFailed hook and afipError field wired to prisma.factura.update inside attemptsMade guard

provides:
  - Test 9 in cae-emission.processor.spec.ts covering UnrecoverableError afipError-persist path (RED state)

affects:
  - 18-cae03-error-display-fixes (Plan 02 will apply BUG-1 fix to turn Test 9 GREEN)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED: Test 9 documents expected behavior before BUG-1 fix — asserts prisma.factura.update called even when attemptsMade < maxAttempts"

key-files:
  created: []
  modified:
    - backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts

key-decisions:
  - "Test 9 uses attemptsMade: 1, opts.attempts: 5 to simulate UnrecoverableError BullMQ lifecycle — onFailed fires with attemptsMade=1 for immediate failure, not maxAttempts"

patterns-established:
  - "Test 9 RED pattern: call onFailed with attemptsMade < maxAttempts, assert update called, assert asignarCaeaFallback NOT called"

requirements-completed:
  - CAE-03

# Metrics
duration: 1min
completed: 2026-03-31
---

# Phase 18 Plan 01: CAE-03 Error Display Fixes — Test 9 (RED) Summary

**TDD RED state established: Test 9 asserts prisma.factura.update is called unconditionally in onFailed for the UnrecoverableError path (attemptsMade=1 < maxAttempts=5), failing against current buggy guard placement**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-31T12:08:57Z
- **Completed:** 2026-03-31T12:09:45Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added Test 9 inside the existing `describe('CAEA fallback')` block after Test 8
- Confirmed RED state: Test 9 fails with "Expected mock function to have been called" (Number of calls: 0)
- Confirmed all pre-existing tests (Tests 6, 7, 8 plus 3 process tests) remain GREEN
- Suite result: 1 failed, 6 passed — correct TDD RED state for Plan 02 BUG-1 fix

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Test 9 — UnrecoverableError afipError persist path (RED)** - `b3ad52c` (test)

**Plan metadata:** `(pending docs commit)`

## Files Created/Modified
- `backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts` - Added Test 9 (20 lines): UnrecoverableError path with attemptsMade=1, opts.attempts=5

## Decisions Made
- None — followed plan as specified. Test structure mirrors Test 8 exactly, substituting attemptsMade=1 and opts.attempts=5 to simulate the BullMQ UnrecoverableError lifecycle.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. The test was added, ran immediately, and produced the expected RED result on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Test 9 is RED and committed. Plan 02 can proceed: move `prisma.factura.update` outside the `if (attemptsMade >= maxAttempts)` guard in `cae-emission.processor.ts` (BUG-1 fix) to turn Test 9 GREEN, then apply BUG-2 fix in `FacturaDetailModal.tsx`.
- All 6 pre-existing tests remain passing — BUG-1 fix will not break guard logic for Tests 6/7/8.

## Self-Check: PASSED

- FOUND: `backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts`
- FOUND: `.planning/phases/18-cae03-error-display-fixes/18-01-SUMMARY.md`
- FOUND: commit `b3ad52c`

---
*Phase: 18-cae03-error-display-fixes*
*Completed: 2026-03-31*
