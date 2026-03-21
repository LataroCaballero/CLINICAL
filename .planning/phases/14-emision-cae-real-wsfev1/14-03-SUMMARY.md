---
phase: 14-emision-cae-real-wsfev1
plan: 03
subsystem: api
tags: [bullmq, nestjs, afip, cae, error-classification, tdd]

# Dependency graph
requires:
  - phase: 14-01
    provides: AFIP_SERVICE DI token, CAE queue scaffold, EMISION_PENDIENTE estado, processors/ directory
  - phase: 14-02
    provides: AfipBusinessError, AfipTransientError, afip.errors.ts, afip.constants.ts

provides:
  - CaeEmissionProcessor class (BullMQ @Processor for async CAE emission jobs)
  - CAE_QUEUE constant ('cae-emission')
  - CaeJobData interface (facturaId, profesionalId)
  - Error classification: AfipBusinessError → UnrecoverableError (DLQ); transient → re-throw (backoff)
  - 3 passing unit tests covering CAE-04 behaviors

affects: [14-04, 15-qr-pdf-frontend, finanzas-module-registration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BullMQ WorkerHost extension with @Processor decorator for NestJS processors"
    - "UnrecoverableError wrapping permanent business errors for immediate DLQ routing"
    - "Re-throw pattern for transient errors to preserve BullMQ exponential backoff"
    - "Identifiers-only job payload (facturaId, profesionalId) — AfipRealService reads monetary data from DB"

key-files:
  created:
    - backend/src/modules/finanzas/processors/cae-emission.processor.ts
  modified:
    - backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts

key-decisions:
  - "CaeJobData carries only facturaId + profesionalId — never monetary amounts — server-side totals rule"
  - "AfipBusinessError instanceof check happens before generic re-throw — order matters for classification correctness"
  - "emitirComprobante called as (this.afipService as any).emitirComprobante() to match AfipRealService DB-read signature which differs from AfipService interface"

patterns-established:
  - "Error classification pattern: instanceof AfipBusinessError → UnrecoverableError; all others → re-throw"

requirements-completed: [CAE-04]

# Metrics
duration: 4min
completed: 2026-03-21
---

# Phase 14 Plan 03: CaeEmissionProcessor Summary

**BullMQ @Processor for async CAE emission with error classification: AfipBusinessError → UnrecoverableError (DLQ); AfipTransientError/AxiosError → re-throw for exponential backoff**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-21T00:10:33Z
- **Completed:** 2026-03-21T00:14:00Z
- **Tasks:** 1 (TDD: RED + GREEN phases)
- **Files modified:** 2

## Accomplishments

- CaeEmissionProcessor created: extends WorkerHost, decorated @Processor(CAE_QUEUE), injects AFIP_SERVICE via DI token
- AfipBusinessError → UnrecoverableError wrapping: job moves to BullMQ failed set immediately with no retries
- Transient errors (AfipTransientError, AxiosError, network) re-thrown as-is: BullMQ applies exponential backoff (3 attempts, 2s base)
- 3 xit stubs converted to passing it tests covering all CAE-04 behaviors
- OnWorkerEvent handlers for 'completed' and 'failed' events with structured Logger output

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement CaeEmissionProcessor and convert spec stubs to passing tests** - `3c80ce5` (feat)

**Plan metadata:** (docs commit pending)

_Note: TDD task had RED phase (spec written, tests fail on missing module) then GREEN phase (processor created, 3 tests pass)._

## Files Created/Modified

- `backend/src/modules/finanzas/processors/cae-emission.processor.ts` - CaeEmissionProcessor class with error classification logic, CAE_QUEUE constant, CaeJobData interface
- `backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts` - 3 passing unit tests: UnrecoverableError on business error, re-throw on transient, re-throw on AxiosError

## Decisions Made

- CaeJobData carries only facturaId + profesionalId (no monetary amounts) — server-side totals rule carried from Plan 14-02 STATE.md decisions
- emitirComprobante called with only the identifier pair; AfipRealService is responsible for reading Factura data from DB
- instanceof check order: AfipBusinessError first, then generic re-throw — this order is critical so business errors are never accidentally retried

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CaeEmissionProcessor ready to be registered in FinanzasModule as a provider
- Plan 14-04 (FinanzasService enqueue integration) can now import CaeEmissionProcessor and CAE_QUEUE
- BullMQ queue registration for 'cae-emission' needs to happen in FinanzasModule (Plan 14-04 scope)

## Self-Check

---
*Phase: 14-emision-cae-real-wsfev1*
*Completed: 2026-03-21*
