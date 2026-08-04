---
phase: 65-sync-tipo-de-turno-plantilla-hc-backend
plan: 02
subsystem: api
tags: [nestjs, prisma, historia-clinica, turnos, gap-closure]

# Dependency graph
requires:
  - phase: 65-sync-tipo-de-turno-plantilla-hc-backend
    plan: 01
    provides: resolverTipoTurnoSync helper + tx.turno.update sync wired into crearEntrada
provides:
  - Hardened guard `if (dto.turnoId && turnoCtx)` on the sync block, preventing P2025 on stale/deleted turnoId
  - Regression test (e) covering the stale-turnoId scenario permanently
affects: [66-hc-frontend-corrections, agenda-tipo-turno]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Composite guard mirrors turnoCtx?.esCirugia ?? false tolerance already used in the paciente.flujo block immediately above"

key-files:
  created: []
  modified:
    - backend/src/modules/historia-clinica/historia-clinica.service.ts
    - backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts

key-decisions:
  - "Single one-line guard change (if (dto.turnoId) → if (dto.turnoId && turnoCtx)), no changes to the block interior, the pure helper, or the paciente.flujo/etapaCRM block (D-06 preserved)"
  - "Regression test (e) deliberately mocks tipoTurno.findUnique to return a truthy destino (same shape as case (a)) so the test is genuine: with the old guard it would reach tx.turno.update and reject with P2025; with the new guard it short-circuits before reaching it"

patterns-established: []

requirements-completed: [HCSYNC-01, HCSYNC-02, HCSYNC-03]

# Metrics
duration: ~10min
completed: 2026-08-04
---

# Phase 65 Plan 02: Gap Closure — Stale turnoId Guard Summary

**Hardened the tipoTurno sync guard in `crearEntrada` to `if (dto.turnoId && turnoCtx)`, closing the single confirmed gap from 65-VERIFICATION.md where a stale/deleted `turnoId` would cause `tx.turno.update` to run against a non-existent row (Prisma P2025), aborting the entire HC-save transaction.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- Closed the 12th must-have gap from 65-VERIFICATION.md (score was 11/12): the sync block now short-circuits completely when `dto.turnoId` is present but the pre-fetch didn't resolve the turno (`turnoCtx === null`), mirroring how the paciente.flujo block already tolerates `turnoCtx == null` via `turnoCtx?.esCirugia ?? false`
- No P2025 possible anymore on stale/deleted `turnoId`: HC entry creation (diagnóstico, tratamiento, historia clínica, flujo/etapaCRM) always persists regardless of turno resolution state
- Added permanent regression test (e) that reproduces the original failure mode (destino truthy + `turno.update` rejecting with P2025) and asserts the guard prevents it from ever being reached
- Full spec suite: 44/44 green (43 pre-existing + 1 new), no regression on the 11 must-haves already verified in 65-01

## Task Commits

Each task was committed atomically:

1. **Task 1: Endurecer el guard del bloque de sync a `if (dto.turnoId && turnoCtx)`** - `b568706` (fix)
2. **Task 2: Test de regresión — turnoId stale (turno.findUnique→null) no rompe el guardado de la HC** - `aa3db48` (test)

## Files Created/Modified
- `backend/src/modules/historia-clinica/historia-clinica.service.ts` - Hardened the sync block's opening guard from `if (dto.turnoId)` to `if (dto.turnoId && turnoCtx)`; updated inline comment to document the stale-turnoId defense (T-65-03)
- `backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts` - Added case (e) to the existing `describe('crearEntrada — sync tipoTurno (HCSYNC-01/02/03, D-09)')` block: mocks `turno.findUnique→null`, `tipoTurno.findUnique→{id, esCirugia:false}` (truthy destino, same shape as case (a)), and `turno.update→reject(P2025)`; asserts `crearEntrada` resolves and `turno.update` is never called

## Decisions Made
- Kept the fix to exactly one guard condition — no changes to the pure helper `resolverTipoTurnoSync`, the inner idempotence/catalog-lookup logic, or the pre-fetch itself, per the plan's explicit scope boundary
- Mocked a truthy `tipoTurno.findUnique` result in the new test (mirroring case (a)'s constant `TIPO_TURNO_DESTINO_ID`) so the test is a genuine regression guard rather than a vacuous pass — verified manually that reverting the guard to `if (dto.turnoId)` would make the test fail (inner `if (destino && ...)` guard would not short-circuit, `tx.turno.update` would be reached, and the mocked rejection would propagate)

## Deviations from Plan

None — plan executed exactly as written. Both tasks matched the plan's `<action>` and `<acceptance_criteria>` verbatim; no auto-fixes, no architectural questions, no auth gates.

## Issues Encountered

None new. The pre-existing, unrelated `tsc --noEmit -p tsconfig.json` failure on `test/app.e2e-spec.ts` (documented in 65-01-SUMMARY.md, present since initial project setup) remains out of scope and was not touched. Verified type-correctness via the build-scoped `tsconfig.build.json` instead, as in 65-01, which passed with 0 errors.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- HCSYNC-01/02/03 fully implemented, tested, and now hardened against the stale-turnoId edge case at the backend level
- Phase 65 goal (tipo de turno mantenido coherente con la plantilla de HC sin romper el guardado) is now fully achieved — all 12 must-haves from 65-VERIFICATION.md satisfied
- Ready for re-verification of Phase 65, or to proceed to the next phase per roadmap
- No blockers or concerns carried forward

---
*Phase: 65-sync-tipo-de-turno-plantilla-hc-backend*
*Completed: 2026-08-04*

## Self-Check: PASSED

Both modified files verified present on disk; all 3 commit hashes (b568706, aa3db48, 13d09af) verified in git log.
