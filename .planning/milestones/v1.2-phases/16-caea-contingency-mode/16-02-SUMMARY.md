---
phase: 16-caea-contingency-mode
plan: 02
subsystem: api
tags: [nestjs, bullmq, cron, nodemailer, caea, afip, scheduler]

# Dependency graph
requires:
  - phase: 16-caea-contingency-mode/16-01
    provides: CaeaService with solicitarYPersistir and asignarCaeaFallback
provides:
  - CaeaPrefetchScheduler with bimensual cron '0 6 12,27 * *' and deadline alert email
  - CaeEmissionProcessor.onFailed calls asignarCaeaFallback when retries exhausted
affects:
  - 16-03 (informarFactura)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Per-tenant error isolation in scheduler loops (catch-continue pattern)
    - BullMQ onFailed CAEA fallback (attemptsMade >= maxAttempts guard)
    - parseAfipDate pure helper (YYYYMMDD -> UTC Date) with no external deps

key-files:
  created:
    - backend/src/modules/finanzas/schedulers/caea-prefetch.scheduler.ts
    - backend/src/modules/finanzas/schedulers/caea-prefetch.scheduler.spec.ts
    - backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts (extended with CAEA fallback tests)
  modified:
    - backend/src/modules/finanzas/processors/cae-emission.processor.ts

key-decisions:
  - "CaeaPrefetchScheduler.checkDeadlines() called inline from prefetchAllTenants() — no separate cron needed (same bimensual run)"
  - "onFailed becomes async; any asignarCaeaFallback error propagates visibly in logs rather than being swallowed"
  - "maxAttempts defaults to 3 if job.opts.attempts is undefined — consistent with FinanzasModule queue config"
  - "CaeaService provided as class token (not string) in DI — NestJS resolves by class reference"

patterns-established:
  - "Scheduler cron fires per-tenant loop: findMany all ConfiguracionAFIP, iterate with try/catch per tenant, continue on error"
  - "Deadline alert: parse YYYYMMDD, Math.ceil days diff, skip if >2 days or pendingCount===0, then sendMail"
  - "CAEA fallback: @OnWorkerEvent('failed') async, check attemptsMade >= opts.attempts ?? 3, call caeaService.asignarCaeaFallback"

requirements-completed: [CAEA-01, CAEA-02, CAEA-04]

# Metrics
duration: 15min
completed: 2026-03-30
---

# Phase 16 Plan 02: CaeaPrefetchScheduler + CaeEmissionProcessor CAEA Fallback Summary

**Bimensual CAEA pre-fetch cron with per-tenant error isolation, deadline email alert, and BullMQ onFailed CAEA fallback wiring — 10 unit tests green**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-30T22:38:50Z
- **Completed:** 2026-03-30T22:43:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- CaeaPrefetchScheduler created: `@Cron('0 6 12,27 * *')` iterates all ConfiguracionAFIP tenants, calls `solicitarYPersistir` per tenant with graceful per-tenant error isolation
- `checkDeadlines()` scans all CaeaVigente records and sends nodemailer email alert when `fchTopeInf` is within 2 days AND there are CAEA_PENDIENTE_INFORMAR invoices pending
- CaeEmissionProcessor.onFailed upgraded to async; calls `caeaService.asignarCaeaFallback(facturaId, profesionalId)` when `attemptsMade >= maxAttempts`

## Task Commits

Each task was committed atomically:

1. **Task 1: CaeaPrefetchScheduler bimensual cron + deadline alert** - `637ee6f` (feat)
2. **Task 2: CaeEmissionProcessor CAEA fallback in onFailed** - `9ee32be` (feat)

**Plan metadata:** (this commit, docs)

_Note: TDD tasks follow RED-GREEN-REFACTOR cycle_

## Files Created/Modified

- `backend/src/modules/finanzas/schedulers/caea-prefetch.scheduler.ts` — Bimensual cron, per-tenant prefetch, deadline email alerts
- `backend/src/modules/finanzas/schedulers/caea-prefetch.scheduler.spec.ts` — 5 unit tests (CAEA-01, CAEA-04)
- `backend/src/modules/finanzas/processors/cae-emission.processor.ts` — Added CaeaService DI + async onFailed with fallback logic
- `backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts` — Added Tests 6 and 7 (CAEA-02); all 5 existing tests preserved

## Decisions Made

- `checkDeadlines()` called inline from `prefetchAllTenants()` — no separate daily cron needed, aligns with plan note "same bimensual cron"
- `onFailed` becomes `async` so `asignarCaeaFallback` can be awaited — errors from fallback propagate visibly in process logs
- `maxAttempts` defaults to `3` when `job.opts.attempts` is undefined — consistent with existing queue configuration
- CaeaService injected by class token (not string) — NestJS standard DI pattern, matches processor test setup

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed spec DI token for CaeaService**
- **Found during:** Task 2 (CAEA fallback GREEN phase)
- **Issue:** Initial spec used string `'CaeaService'` as DI token; NestJS resolves by class reference so DI failed at module compile
- **Fix:** Changed `{ provide: 'CaeaService', useValue: mockCaeaService }` to `{ provide: CaeaService, useValue: mockCaeaService }` and added import
- **Files modified:** `backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts`
- **Verification:** All 5 tests pass after fix
- **Committed in:** `9ee32be` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical DI import in spec)
**Impact on plan:** Fix was required for tests to compile/run. No scope creep.

## Issues Encountered

None beyond the DI token fix documented above.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- CaeaPrefetchScheduler and CaeEmissionProcessor fallback are complete
- CaeaService.informarFactura stub from Plan 01 is the remaining gap
- Plan 03 (informarFactura + FECAEARegInformativo full implementation) can proceed immediately
- No blockers

## Self-Check: PASSED

All 5 expected files found. Both task commits verified (637ee6f, 9ee32be).

---
*Phase: 16-caea-contingency-mode*
*Completed: 2026-03-30*
