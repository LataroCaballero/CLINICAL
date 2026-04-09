---
phase: 16-caea-contingency-mode
plan: 01
subsystem: api
tags: [afip, caea, prisma, nestjs, soap, tdd]

# Dependency graph
requires:
  - phase: 14-cae-emission
    provides: AfipRealService SOAP pattern, AfipBusinessError/AfipTransientError, EstadoFactura enum
  - phase: 13-wsaa-token-service
    provides: WSAA_SERVICE injection token, WsaaServiceInterface, getTicket pattern

provides:
  - CaeaService with solicitarYPersistir (FECAEASolicitar SOAP + CaeaVigente upsert)
  - CaeaService.asignarCaeaFallback (CAEA_PENDIENTE_INFORMAR assignment with null guard)
  - CaeaService.informarFactura stub shell (Plan 03 implementation)
  - AfipUnavailableError subclass of AfipTransientError
  - calcularPeriodoYOrden + calcularProximoPeriodoYOrden pure helpers (UTC-safe)
  - Factura.cbteFchHsGen schema field + Prisma migration applied

affects:
  - 16-02-PLAN (scheduler uses solicitarYPersistir + asignarCaeaFallback)
  - 16-03-PLAN (informarFactura implementation depends on CaeaService stub)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CaeaService injectable with WSAA_SERVICE injection (same pattern as AfipRealService)
    - UTC-based date helpers to avoid timezone bugs with AFIP date strings

key-files:
  created:
    - backend/src/modules/finanzas/afip/caea.service.ts
    - backend/src/modules/finanzas/afip/caea.service.spec.ts
    - backend/src/modules/finanzas/afip/caea.helpers.ts
    - backend/src/modules/finanzas/afip/caea.helpers.spec.ts
    - backend/src/prisma/migrations/20260330223257_add_cbte_fch_hs_gen_to_factura/migration.sql
  modified:
    - backend/src/prisma/schema.prisma (added cbteFchHsGen to Factura)
    - backend/src/modules/finanzas/afip/afip.errors.ts (added AfipUnavailableError)

key-decisions:
  - "UTC-based getUTCDate() in period helpers — avoids timezone bugs where new Date('YYYY-MM-DD') is UTC midnight but local getDate() returns previous day in UTC-3 (Argentina)"
  - "caea.helpers.ts is a pure function module with no NestJS/Prisma deps — importable in tests without mocking"
  - "cbteFchHsGen uses toISOString().replace(/[-:T]/g,'').slice(0,14) — matches YYYYMMDDHHMMSS AFIP format"
  - "informarFactura is a stub shell in Plan 01 — throws 'Not implemented' — Plan 03 provides full implementation"

patterns-established:
  - "CaeaService: @Injectable() with @Inject(WSAA_SERVICE) — same constructor pattern as AfipRealService"
  - "SOAP parse via regex: (xml.match(/<Field>(.*?)<\\/Field>/) ?? [])[1] — established in Phase 14, continued here"

requirements-completed:
  - CAEA-01
  - CAEA-02

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 16 Plan 01: CaeaService Core Summary

**CaeaService with FECAEASolicitar SOAP + asignarCaeaFallback fallback assignment, AfipUnavailableError subclass, period helpers, and cbteFchHsGen Prisma migration — 15 tests green**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T22:32:04Z
- **Completed:** 2026-03-30T22:35:44Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Prisma migration applied: `cbteFchHsGen String?` column added to `factura` table for CAEA inform datetime tracking
- `AfipUnavailableError` added as subclass of `AfipTransientError` — existing BullMQ retry logic applies automatically
- `CaeaService.solicitarYPersistir()` calls FECAEASolicitar SOAP and upserts `CaeaVigente` row (same SOAP pattern as Phase 14 FECAESolicitar)
- `CaeaService.asignarCaeaFallback()` assigns `CAEA_PENDIENTE_INFORMAR` + `cbteFchHsGen` when `CaeaVigente` found; logs error and returns early when null
- Pure period helpers `calcularPeriodoYOrden` + `calcularProximoPeriodoYOrden` in isolated module (UTC-safe)

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration + AfipUnavailableError + period helpers** - `31c54c7` (feat)
2. **Task 2: CaeaService FECAEASolicitar + asignarCaeaFallback (TDD)** - `e90d366` (feat)

_Note: TDD tasks — tests written first (RED), then implementation (GREEN), all green in single commit per task._

## Files Created/Modified

- `backend/src/modules/finanzas/afip/caea.service.ts` - CaeaService injectable: solicitarYPersistir, asignarCaeaFallback, informarFactura stub
- `backend/src/modules/finanzas/afip/caea.service.spec.ts` - 6 unit tests (Tests 1–5 from plan + stub test)
- `backend/src/modules/finanzas/afip/caea.helpers.ts` - Pure period calculation helpers (UTC-safe, no NestJS deps)
- `backend/src/modules/finanzas/afip/caea.helpers.spec.ts` - 9 unit tests for period helpers + AfipUnavailableError
- `backend/src/modules/finanzas/afip/afip.errors.ts` - Added AfipUnavailableError class
- `backend/src/prisma/schema.prisma` - Added cbteFchHsGen String? to Factura model
- `backend/src/prisma/migrations/20260330223257_add_cbte_fch_hs_gen_to_factura/migration.sql` - Applied migration

## Decisions Made

- UTC-based `getUTCDate()` in period helpers — avoids timezone bugs where `new Date('YYYY-MM-DD')` is UTC midnight but `getDate()` returns previous day in UTC-3 (Argentina). Discovered and fixed during RED phase.
- `caea.helpers.ts` is a pure module with no NestJS/Prisma deps — intentional to allow test import without mocking
- `informarFactura` is a stub shell throwing `'Not implemented — implemented in Plan 03'` — clean extension point

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] UTC timezone fix in period helpers**
- **Found during:** Task 1 (GREEN phase test run)
- **Issue:** `calcularProximoPeriodoYOrden(new Date('2026-01-27'))` returned `{ periodo: '202601', orden: 2 }` instead of `{ periodo: '202602', orden: 1 }`. `new Date('2026-01-27')` is UTC midnight = Jan 26 in Argentina (UTC-3), so `getDate()` returned 26, not 27.
- **Fix:** Changed all date accessors to UTC variants (`getUTCDate()`, `getUTCFullYear()`, `getUTCMonth()`) and used `Date.UTC()` for arithmetic.
- **Files modified:** `backend/src/modules/finanzas/afip/caea.helpers.ts`
- **Verification:** All 9 helpers tests pass including day-27 case
- **Committed in:** `31c54c7` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — Bug)
**Impact on plan:** Fix essential for correctness. CAEA period calculation is critical; wrong period would cause AFIP rejections. No scope creep.

## Issues Encountered

None beyond the UTC timezone bug documented above.

## User Setup Required

None — no external service configuration required for this plan. CaeaService is wired into FinanzasModule in Plan 02.

## Next Phase Readiness

- `CaeaService` is ready for Plan 02 (scheduler + BullMQ fallback processor) which imports it
- `CaeaService.informarFactura` stub is ready for Plan 03 to implement
- `AfipUnavailableError` is ready for Plan 02 to use as CAEA fallback trigger signal
- Build passes with no TypeScript errors

---
*Phase: 16-caea-contingency-mode*
*Completed: 2026-03-30*

## Self-Check: PASSED

- FOUND: backend/src/modules/finanzas/afip/caea.service.ts
- FOUND: backend/src/modules/finanzas/afip/caea.service.spec.ts
- FOUND: backend/src/modules/finanzas/afip/caea.helpers.ts
- FOUND: backend/src/modules/finanzas/afip/caea.helpers.spec.ts
- FOUND: backend/src/modules/finanzas/afip/afip.errors.ts
- FOUND: migration 20260330223257_add_cbte_fch_hs_gen_to_factura
- FOUND: commit 31c54c7
- FOUND: commit e90d366
- 15/15 tests passing
