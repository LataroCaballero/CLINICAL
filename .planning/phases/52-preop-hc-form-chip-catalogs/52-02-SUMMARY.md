---
phase: 52-preop-hc-form-chip-catalogs
plan: 02
subsystem: backend/catalogo-hc
tags: [nestjs, prisma, catalogo-hc, antecedentes, alergias, medicamentos, tdd]

# Dependency graph
requires:
  - phase: 52
    plan: 01
    provides: "AntecedenteCatalogoPro model + SEED_ANTECEDENTES + Prisma delegate"
  - phase: 51
    provides: "AlergiaCatalogoPro/MedicamentoCatalogoPro models + catalogo-hc module base + SEED_ALERGIAS/SEED_MEDICAMENTOS"
provides:
  - "seedAntecedentesInicial/seedAlergiasInicial/seedMedicamentosInicial — idempotent count-guard seed methods"
  - "getAntecedentesConSeed/getAlergiasConSeed/getMedicamentosConSeed — lazy-seed list getters"
  - "aprenderDesdePreoperatorio — best-effort learning upsert (Plan 03 reuses directly)"
  - "GET /catalogo-hc/antecedentes, /catalogo-hc/alergias, /catalogo-hc/medicamentos endpoints"
affects:
  - 52-03  # PreoperatorioForm frontend uses these endpoints for chip data source
  - 52-04  # historia-clinica.service calls aprenderDesdePreoperatorio after PREOP save

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Flat catalog lazy-seed: findMany first (common path), seed only if empty — matches getCatalogoConSeed pattern"
    - "aprenderDesdeFlat generic helper: normalizarNombre dedup map, batch reactivate via updateMany, sequential create for new rows"
    - "Best-effort learning: aprenderDesdePreoperatorio wraps each section in try/catch, logs warn on failure, never throws"
    - "Dynamic Prisma delegate access via (this.prisma as any)[modelo] with typed local cast — keeps helper generic without code duplication"

key-files:
  created:
    - backend/src/modules/catalogo-hc/catalogo-hc.flat-catalog.service.spec.ts
  modified:
    - backend/src/modules/catalogo-hc/catalogo-hc.service.ts
    - backend/src/modules/catalogo-hc/catalogo-hc.controller.ts

key-decisions:
  - "aprenderDesdePreoperatorio wraps each section (antecedentes/alergias/medicacion) in its own try/catch — a DB failure for one section does not prevent learning from the others"
  - "SEED_ALERGIAS/SEED_MEDICAMENTOS imported from catalogo-preop seed-data files (not redefined) — single source of truth maintained"
  - "aprenderDesdeFlat uses SELECT (id, nombre, activo) without activo filter to capture inactive rows for reactivation detection"
  - "Lazy-seed getters query activo:true rows only; seed methods count ALL rows (including inactive) to avoid re-seeding after soft-delete"

# Metrics
duration: 20min
completed: 2026-06-26
---

# Phase 52 Plan 02: Flat Per-Professional Catalog Service + Controller Endpoints Summary

**Flat catalog seed/list/learning service methods and JWT-scoped GET endpoints for antecedentes/alergias/medicamentos added to the catalogo-hc module using TDD; 11 new tests pass, 101 total catalogo-hc tests green, build exits 0**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-06-26T12:33:57Z
- **Completed:** 2026-06-26T12:54:00Z
- **Tasks:** 2/2 (Task 1 TDD: RED + GREEN)
- **Files modified:** 2 + 1 new test file

## Accomplishments

### Task 1 (TDD): Flat catalog seed/list/learning service methods

Added to `catalogo-hc.service.ts`:

- `seedAntecedentesInicial(profesionalId)` — count guard → `createMany` from `SEED_ANTECEDENTES` with `esSistema:true, skipDuplicates:true`
- `seedAlergiasInicial(profesionalId)` — same pattern for `alergiaCatalogoPro` using `SEED_ALERGIAS`
- `seedMedicamentosInicial(profesionalId)` — same for `medicamentoCatalogoPro` using `SEED_MEDICAMENTOS`
- `getAntecedentesConSeed(profesionalId)` — `findMany` active rows; if empty, calls seed then re-queries; ordered esSistema desc then nombre asc
- `getAlergiasConSeed(profesionalId)` / `getMedicamentosConSeed(profesionalId)` — same lazy-seed pattern
- `aprenderDesdeFlat(profesionalId, nombres, modelo)` (private) — loads snapshot (all rows incl. inactive), builds `normalizarNombre→{id,activo}` map; for each incoming name: create (`esSistema:false`), reactivate, or no-op; batch reactivate via `updateMany`
- `aprenderDesdePreoperatorio(profesionalId, {antecedentes, alergias, medicacion})` (public) — calls `aprenderDesdeFlat` per non-empty array, each wrapped in try/catch (best-effort; never throws)
- Imports `SEED_ALERGIAS` from `../catalogo-preop/alergia-catalogo.seed-data` and `SEED_MEDICAMENTOS` from `../catalogo-preop/medicamento-catalogo.seed-data` (no redefinition)

TDD cycle: RED commit `0d9a289` (11 failing tests) → GREEN commit `703026d` (11 passing tests).

### Task 2: JWT-scoped GET endpoints

Added to `catalogo-hc.controller.ts`:
- `@Get('antecedentes')` → `getProfesionalId(req.user, profesionalId)` → `service.getAntecedentesConSeed(pid)`
- `@Get('alergias')` → same scope resolution → `service.getAlergiasConSeed(pid)`
- `@Get('medicamentos')` → same → `service.getMedicamentosConSeed(pid)`

Class-level `@Auth('ADMIN','PROFESIONAL','SECRETARIA')` guard unchanged. `profesionalId` never read from request body (T-52-03 mitigated).

## Task Commits

1. **test(52-02): add failing tests for flat catalog seed/list/learning methods** — `0d9a289` (RED)
2. **feat(52-02): add flat catalog seed/list/learning service methods** — `703026d` (GREEN)
3. **feat(52-02): add JWT-scoped GET endpoints for antecedentes/alergias/medicamentos** — `25ccb99`

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED  | `0d9a289` | test(52-02): 11 failing tests committed |
| GREEN | `703026d` | feat(52-02): 11 passing tests committed |

All 101 catalogo-hc tests pass after implementation.

## Decisions Made

- `aprenderDesdePreoperatorio` wraps each section in its own try/catch (not a single outer wrap) so a DB failure for antecedentes does not block learning alergias or medicacion
- Seed constants for alergias/medicamentos live in `catalogo-preop/` (from Phase 51 planning); imported rather than copied into `catalogo-hc.seed-data.ts`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all methods write to real Prisma delegates, return real data.

## Threat Flags

None — no new network surfaces beyond the three GET endpoints described in the plan. T-52-03, T-52-04, T-52-05 all mitigated:
- T-52-03: `getProfesionalId(req.user, profesionalId)` enforces JWT scope on all three endpoints
- T-52-04: `esSistema` guard inherited from existing service (no rename/delete for seeded rows)
- T-52-05: every write in `aprenderDesdeFlat` receives `profesionalId` from the resolved scope argument, never from the payload

## Self-Check

- [x] `catalogo-hc.flat-catalog.service.spec.ts` created
- [x] `catalogo-hc.service.ts` modified (getAntecedentesConSeed, aprenderDesdePreoperatorio confirmed by grep)
- [x] `catalogo-hc.controller.ts` modified (@Get('antecedentes') confirmed by grep)
- [x] Commits `0d9a289`, `703026d`, `25ccb99` exist in git log

## Self-Check: PASSED
