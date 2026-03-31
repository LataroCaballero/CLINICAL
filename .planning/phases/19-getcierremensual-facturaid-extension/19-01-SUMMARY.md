---
phase: 19-getcierremensual-facturaid-extension
plan: 01
subsystem: testing
tags: [jest, tdd, finanzas, obra-social, prisma]

# Dependency graph
requires:
  - phase: 17-afip-error-display
    provides: getCierreMensual endpoint exists in finanzas.service.ts
  - phase: 18-cae-error-display-fixes
    provides: finanzas.service.spec.ts established with mockPrismaService pattern
provides:
  - getCierreMensual describe block with 3 failing unit tests (RED) asserting facturaId in detalleObrasSociales
  - liquidacionObraSocial.findMany mock on mockPrismaService
affects:
  - 19-02 (GREEN phase — implement facturaId in service against these tests)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED: cast result.detalleObrasSociales as any[] to bypass TypeScript inference on not-yet-implemented properties"
    - "mockPrismaService extended with findMany on liquidacionObraSocial alongside existing create mock"

key-files:
  created: []
  modified:
    - backend/src/modules/finanzas/finanzas.service.spec.ts

key-decisions:
  - "Cast detalleObrasSociales as any[] in test assertions to bypass TypeScript type inference — allows runtime RED failure (undefined vs expected) instead of compile-time TS2551 error; Plan 02 GREEN implementation will make the cast unnecessary"

patterns-established:
  - "RED tests use (result.someArray as any[]).find() when the property does not yet exist on the inferred return type — keeps TypeScript from blocking test execution before implementation"

requirements-completed:
  - CAE-02

# Metrics
duration: 10min
completed: 2026-03-31
---

# Phase 19 Plan 01: getCierreMensual facturaId — RED Tests Summary

**Three failing unit tests assert facturaId in getCierreMensual detalleObrasSociales, confirming the service does not yet return that field**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-31T12:50:00Z
- **Completed:** 2026-03-31T13:00:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `findMany: jest.fn()` to `mockPrismaService.liquidacionObraSocial` alongside existing `create` mock
- Added `getCierreMensual` describe block with 3 unit tests covering: facturaId found, facturaId null (no liquidacion), and non-null preferred when multiple rows
- All 3 new tests FAIL (RED) — service returns `undefined` for `facturaId` because `getCierreMensual` does not call `liquidacionObraSocial.findMany`
- All 21 pre-existing tests remain GREEN — no regression

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — Add getCierreMensual describe block with 3 failing tests** - `8e151ba` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `backend/src/modules/finanzas/finanzas.service.spec.ts` - Added findMany mock to liquidacionObraSocial, added getCierreMensual describe block with 3 failing tests

## Decisions Made
- Cast `result.detalleObrasSociales as any[]` in test `find()` calls — TypeScript's inferred return type from the current `getCierreMensual` implementation does not include `facturaId`, causing TS2551 compile errors that block test execution. The `as any[]` cast preserves the RED signal as a runtime assertion failure (`undefined` vs expected string/null), which is the correct TDD RED state. Plan 02 will add `facturaId` to the service, making the cast unnecessary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript TS2551 compile errors prevented tests from running**
- **Found during:** Task 1 (running initial test attempt)
- **Issue:** `result.detalleObrasSociales.find((d) => d.facturaId)` caused TS2551 — `facturaId` does not exist on inferred type `{ obraSocialId: string | null; nombre: string; total: number; facturado: number; pendiente: number; }`. Test suite failed to run entirely.
- **Fix:** Changed `result.detalleObrasSociales.find(...)` to `(result.detalleObrasSociales as any[]).find(...)` in all 3 test assertions — bypasses TypeScript enforcement, allows runtime failure instead of compile failure.
- **Files modified:** `backend/src/modules/finanzas/finanzas.service.spec.ts`
- **Verification:** Tests now run and fail with `Expected: "factura-uuid-1" / Received: undefined` (assertion failure, not compile error). All 21 prior tests pass.
- **Committed in:** `8e151ba` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - compile-error-as-blocking-bug)
**Impact on plan:** Necessary to achieve correct RED state per TDD protocol. `as any[]` is temporary — Plan 02 implementation removes the need for it.

## Issues Encountered
None beyond the TypeScript compile issue documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- RED phase complete: 3 failing tests establish the contract for `facturaId` in `getCierreMensual` return
- Plan 02 must: call `liquidacionObraSocial.findMany` with `where: { periodo: mes }`, build a lookup map, and add `facturaId: string | null` to each entry in `detalleObrasSociales`
- The `as any[]` cast in tests will become unnecessary once the service return type includes `facturaId`

---
*Phase: 19-getcierremensual-facturaid-extension*
*Completed: 2026-03-31*
