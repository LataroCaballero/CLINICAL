---
phase: 64-indicadores-de-pendientes-y-planilla-legible-frontend
plan: 01
subsystem: api
tags: [nestjs, prisma, historia-clinica, turnos, backend]

# Dependency graph
requires: []
provides:
  - "listarTratamientosDeContenido(contenido): string[] pure helper (uncollapsed treatment names)"
  - "GET /turnos/rango response now includes tratamientos: string[] alongside unchanged ultimoTratamiento"
affects: [64-02, 64-03, frontend-turnos-planilla]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared private extractor (extraerNombresTratamiento) reused by both the collapsed-summary and full-list public helpers, avoiding duplicated shape-parsing logic"

key-files:
  created: []
  modified:
    - backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts
    - backend/src/modules/historia-clinica/historia-clinica.contenido.spec.ts
    - backend/src/modules/turnos/turnos.service.ts

key-decisions:
  - "Extracted extraerNombresTratamiento(contenido) as a private shared helper (option 1 from 64-PATTERNS.md) instead of duplicating the zona/flat parsing branches in a parallel function"
  - "listarTratamientosDeContenido returns the free-text branch as [texto.trim()] with NO TEXTO_LIMITE truncation (Claude's Discretion per plan D-07), since the full text is already persisted and the collapsed/truncated form remains available via resumirTratamientosDeContenido"
  - "New response field named exactly `tratamientos` (Claude's Discretion per plan; matches the field name the frontend in 64-03 is expected to type)"

patterns-established:
  - "Response-mapper field addition: append inline in the object literal returned from .map(), derived from an already-selected Prisma relation, no new DTO/select/migration needed"

requirements-completed: [TRAT-07]

# Metrics
duration: 12min
completed: 2026-08-03
---

# Phase 64 Plan 01: Backend tratamientos array Summary

**New pure helper `listarTratamientosDeContenido` plus a `tratamientos: string[]` field wired into `GET /turnos/rango`, exposing the full uncollapsed treatment list without touching the existing `ultimoTratamiento` collapsed string.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-03T16:26:00Z
- **Completed:** 2026-08-03T16:38:32Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- Extracted shared `extraerNombresTratamiento(contenido)` private helper from `resumirTratamientosDeContenido`, reused by the new `listarTratamientosDeContenido`
- Added `listarTratamientosDeContenido(contenido): string[]` covering all 3 contenido shapes (zona-grouped, flat legacy, free-text) plus empty/null cases
- Wired `tratamientos: string[]` into the `/turnos/rango` mapper in `turnos.service.ts`, derived from the already-selected `entradaHC.contenido` (no new Prisma select, no migration)
- 36/36 tests pass in `historia-clinica.contenido.spec.ts`, including a new regression test locking `resumirTratamientosDeContenido` output to `"Lipoaspiración +2"`

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): add failing tests for listarTratamientosDeContenido** - `28ba26b` (test)
2. **Task 1 (GREEN): implement listarTratamientosDeContenido helper** - `c3488ee` (feat)
3. **Task 2: expose tratamientos array in GET /turnos/rango response** - `bb90a49` (feat)

**Plan metadata:** (this commit, added by worktree post-commit step)

_TDD gate compliance: RED (`28ba26b`) precedes GREEN (`c3488ee`); no separate REFACTOR commit was needed (ESLint --fix only reformatted, no behavior change)._

## Files Created/Modified
- `backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts` - Added `extraerNombresTratamiento` (private) and `listarTratamientosDeContenido` (exported); `resumirTratamientosDeContenido`/`formatearResumen` output unchanged
- `backend/src/modules/historia-clinica/historia-clinica.contenido.spec.ts` - Added `describe('listarTratamientosDeContenido')` block (9 new tests) + 1 regression test for `resumirTratamientosDeContenido`
- `backend/src/modules/turnos/turnos.service.ts` - Added `listarTratamientosDeContenido` import and `tratamientos` field to the `/turnos/rango` mapper output

## Decisions Made
- Free-text branch of `listarTratamientosDeContenido` returns the full trimmed text without `TEXTO_LIMITE` truncation, per plan instruction (D-07 discretion) — the truncated form stays available for size-sensitive consumers via `ultimoTratamiento`.
- Field name `tratamientos` chosen exactly as specified in the plan (matches the frontend consumer expected in 64-03).

## Deviations from Plan

None — plan executed exactly as written. The only auxiliary change was creating a local `node_modules` symlink to the main repo's install (worktree had no `node_modules`) purely to run `jest`/`tsc` verification commands; this is gitignored and not part of the committed diff.

## Issues Encountered
- `cd backend && npx tsc --noEmit -p tsconfig.json` fails with a pre-existing, unrelated error (`TS6059`: `backend/test/app.e2e-spec.ts` is outside `rootDir: "./src"`). Confirmed via `npx tsc --noEmit -p tsconfig.json --rootDir .` (zero errors) that this is a pre-existing tsconfig `include`/`rootDir` mismatch, not caused by this plan's changes. Logged to `.planning/phases/64-indicadores-de-pendientes-y-planilla-legible-frontend/deferred-items.md` per the Scope Boundary rule (out of scope, not fixed).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend now exposes `tratamientos: string[]` on `GET /turnos/rango`, unblocking the frontend work in later plans of this phase (e.g. `useTurnosRangos.ts` type update, `TratamientosTab.tsx` cell rendering per `64-PATTERNS.md`).
- No blockers. The pre-existing tsconfig `rootDir` issue (see Issues Encountered) does not block frontend consumption of the new field but should be addressed independently if `tsc --noEmit` needs to run clean project-wide.

---
*Phase: 64-indicadores-de-pendientes-y-planilla-legible-frontend*
*Completed: 2026-08-03*
