---
phase: 09-backend-api-layer
plan: 01
subsystem: api
tags: [nestjs, prisma, timezone, liquidacion, facturacion, tdd, jest]

# Dependency graph
requires:
  - phase: 08-schema-foundation-afip-research
    provides: LimiteFacturacionMensual, LiquidacionObraSocial, PracticaRealizada schema with montoPagado + liquidacionId fields
provides:
  - getMonthBoundariesART() pure function with full unit coverage (UTC-3, no DST)
  - getLimiteDisponible() service method (ART-correct billing limit calculation)
  - setLimiteMensual() service method (upsert LimiteFacturacionMensual)
  - getPracticasPendientesAgrupadas() service method (no N+1, batch OS lookup)
  - getPracticasPendientesPorOS() service method (batch patient lookup for lote prep)
  - crearLoteLiquidacion() service method (atomic $transaction, server-side montoTotal)
  - CreateLoteDto validated DTO
affects: [10-facturador-dashboard, 11-settlement-workflow, 09-02, 09-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getMonthBoundariesART pattern: fixed UTC-3 offset (3*60*60*1000ms) via Date.UTC(), avoids new Date(year,month,1) midnight UTC pitfall"
    - "Atomic transaction pattern: prisma.$transaction(async tx => {...}) interactive callback form for FK-referencing creates"
    - "Batch query pattern: avoid N+1 by collecting IDs then single findMany, build Map for O(1) lookup"
    - "Server-side total pattern: compute montoTotal inside transaction from practice data, never trust client-provided totals"

key-files:
  created:
    - backend/src/modules/finanzas/utils/month-boundaries.ts
    - backend/src/modules/finanzas/utils/month-boundaries.spec.ts
    - backend/src/modules/finanzas/finanzas.service.spec.ts
  modified:
    - backend/src/modules/finanzas/finanzas.service.ts
    - backend/src/modules/finanzas/dto/finanzas.dto.ts

key-decisions:
  - "ART offset hardcoded as 3*60*60*1000ms — Argentina has no DST, fixed offset is correct and simpler than timezone libraries"
  - "Month boundaries use Date.UTC() not new Date(year,month-1,1) — the latter creates midnight UTC (= 21:00 ART previous day), wrong for ART"
  - "crearLoteLiquidacion uses interactive callback form of $transaction — array form cannot reference the newly-created liquidacionId FK"
  - "Server-side montoTotal computation inside transaction — never accept client-provided totals for financial records"
  - "marcarPracticasPagadas marked @deprecated — body kept intact for backward compat with any existing callers"

patterns-established:
  - "Pattern 1: All service methods accept profesionalId as explicit parameter — FACTURADOR has no Profesional record, never derive from JWT"
  - "Pattern 2: TDD RED-GREEN flow — spec files committed first with failing tests, implementation added after"

requirements-completed: [LMIT-02, LIQ-03]

# Metrics
duration: 8min
completed: 2026-03-13
---

# Phase 09 Plan 01: Backend API Layer — Timezone Utility + Service Methods Summary

**getMonthBoundariesART UTC-3 pure function + five FinanzasService methods (getLimiteDisponible, setLimiteMensual, getPracticasPendientesAgrupadas, getPracticasPendientesPorOS, crearLoteLiquidacion) with 9 TDD tests green**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-13T18:33:26Z
- **Completed:** 2026-03-13T18:41:00Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files modified:** 5

## Accomplishments
- Timezone-correct ART boundary function with 5 unit tests covering March, December year-rollover, January, and the 02:30Z exclusion edge case
- Five new FinanzasService methods: limit lookup, limit upsert, two practice list methods (no N+1), and atomic lote settlement transaction
- `crearLoteLiquidacion` computes `montoTotal` server-side inside `$transaction`, preventing client total manipulation
- `marcarPracticasPagadas` deprecated in-place; backward compat preserved

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 — Write failing test scaffolds (RED)** - `d7a2927` (test)
2. **Task 2: Implement getMonthBoundariesART + five service methods (GREEN)** - `cdb6b02` (feat)

## Files Created/Modified
- `backend/src/modules/finanzas/utils/month-boundaries.ts` - getMonthBoundariesART() with MonthBoundaries interface, fixed UTC-3 offset
- `backend/src/modules/finanzas/utils/month-boundaries.spec.ts` - 5 unit tests for timezone arithmetic
- `backend/src/modules/finanzas/finanzas.service.spec.ts` - 4 unit tests for getLimiteDisponible + crearLoteLiquidacion with mocked Prisma
- `backend/src/modules/finanzas/finanzas.service.ts` - 5 new methods appended after getReporteIngresos, @deprecated on marcarPracticasPagadas
- `backend/src/modules/finanzas/dto/finanzas.dto.ts` - CreateLoteDto with @IsUUID, @IsString/@Matches, @IsArray/@IsUUID validators

## Decisions Made
- Used `Date.UTC(year, month-1, 1, 3, 0, 0, 0)` not `new Date(year, month-1, 1)` — the latter creates midnight local time which is system-timezone-dependent
- ART offset hardcoded (no DST in Argentina); avoids luxon/moment dependency
- `$transaction(async tx => {...})` interactive callback form required because `practicaRealizada.updateMany` needs the `liquidacionId` from the preceding `liquidacionObraSocial.create`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test failures in `diagnosticos`, `usuarios.controller`, and `reportes.controller` suites — unrelated to this plan's changes, not introduced by our work.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All five service methods ready for controller exposure in 09-02
- `getMonthBoundariesART` available for import anywhere in the finanzas module
- `CreateLoteDto` ready for POST endpoint in 09-02/09-03
- No blockers for Phase 9 wave 2

---
*Phase: 09-backend-api-layer*
*Completed: 2026-03-13*
