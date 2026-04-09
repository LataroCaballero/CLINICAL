---
phase: 17-cae-emission-ux
plan: 02
subsystem: api
tags: [nestjs, prisma, bullmq, afip, cae, finanzas, dto]

# Dependency graph
requires:
  - phase: 17-01
    provides: Factura.afipError String? column migration + PrismaService injected into CaeEmissionProcessor + Test 8 RED

provides:
  - CaeEmissionProcessor.onFailed persists afipError to DB before CAEA fallback (Test 8 GREEN)
  - FacturaDetailDto.afipError: string | null field
  - getFacturaById returns afipError in response object

affects:
  - 17-03 (frontend polling reads afipError from GET /finanzas/facturas/:id)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "prisma.factura.update called in onFailed before CAEA fallback — error persisted even if fallback throws"
    - "failedReason ?? 'Error desconocido al emitir.' null-safety pattern for job failure reasons"

key-files:
  created: []
  modified:
    - backend/src/modules/finanzas/processors/cae-emission.processor.ts
    - backend/src/modules/finanzas/dto/finanzas.dto.ts
    - backend/src/modules/finanzas/finanzas.service.ts

key-decisions:
  - "prisma.factura.update placed BEFORE caeaService.asignarCaeaFallback in onFailed — error persisted to DB even if CAEA fallback throws"
  - "failedReason ?? 'Error desconocido al emitir.' for null-safety — BullMQ failedReason can be undefined in edge cases"
  - "afipError: f.afipError ?? null in getFacturaById — Prisma include returns all scalar fields so no select change needed"

patterns-established:
  - "BullMQ onFailed: persist DB state before triggering downstream side-effects — ensures atomicity of error recording"

requirements-completed:
  - CAE-02
  - CAE-03

# Metrics
duration: 2min
completed: 2026-03-31
---

# Phase 17 Plan 02: CAE Emission UX — Backend afipError Wiring Summary

**CaeEmissionProcessor.onFailed now persists afipError to Factura before CAEA fallback; FacturaDetailDto and getFacturaById surface afipError for frontend polling**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-31T02:44:37Z
- **Completed:** 2026-03-31T02:46:07Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Test 8 (CAEA-02) turned GREEN: `prisma.factura.update` called with `{ afipError: job.failedReason }` in `onFailed` before CAEA fallback call
- `FacturaDetailDto` extended with `afipError: string | null` field (Spanish AFIP error message)
- `getFacturaById` return object includes `afipError: f.afipError ?? null` — enabling frontend polling via `GET /finanzas/facturas/:id`

## Task Commits

Each task was committed atomically:

1. **Task 1: CaeEmissionProcessor.onFailed — persist afipError before CAEA fallback (GREEN)** - `0d9bb8e` (feat)
2. **Task 2: Propagate afipError through FacturaDetailDto and getFacturaById** - `0a4721e` (feat)

## Files Created/Modified

- `backend/src/modules/finanzas/processors/cae-emission.processor.ts` - Added `prisma.factura.update` call in `onFailed` before CAEA fallback; uses `failedReason ?? 'Error desconocido al emitir.'`
- `backend/src/modules/finanzas/dto/finanzas.dto.ts` - Added `afipError: string | null` to `FacturaDetailDto` class
- `backend/src/modules/finanzas/finanzas.service.ts` - Added `afipError: f.afipError ?? null` to `getFacturaById` return object

## Decisions Made

- prisma.factura.update placed BEFORE caeaService.asignarCaeaFallback in onFailed — ensures afipError is persisted to DB even if the CAEA fallback call throws an exception
- failedReason fallback to 'Error desconocido al emitir.' — BullMQ failedReason can be undefined in edge cases; Spanish message maintains UX consistency
- afipError: f.afipError ?? null — Prisma `include` returns all scalar columns by default so no `select` change needed in getFacturaById

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failures in unrelated modules (`usuarios.controller`, `diagnosticos.service/controller`, `reportes.controller`) were present before this plan and are not caused by these changes. All finanzas module tests pass (6/6 processor, 21/21 service). Build exits 0.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `GET /finanzas/facturas/:id` now returns `afipError` in JSON response
- Frontend polling (Plan 03) can read `afipError` and surface it in the error modal
- All backend contracts for Phase 17 Plan 03 are satisfied

---
*Phase: 17-cae-emission-ux*
*Completed: 2026-03-31*
