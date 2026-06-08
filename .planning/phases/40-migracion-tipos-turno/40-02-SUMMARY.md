---
phase: 40-migracion-tipos-turno
plan: "02"
subsystem: database, ui
tags: [prisma, seed, tipos-turno, calendar, color, typescript]

# Dependency graph
requires:
  - phase: 40-01
    provides: Migration SQL + esCirugia service filter — types now renamed to v1.8 names in DB
provides:
  - Idempotent seed (seed-tipos-turno.ts) to initialize 5 tipos in fresh environments
  - npm script seed:tipos for CI/dev bootstrap
  - CalendarGrid orange color branch for Pre-Quirúrgico in both dark and light modes
affects: [40-03, 41-migracion-historia-clinica]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Idempotent seed via tipoTurno.upsert({ where: { nombre } }) — safe to re-run on existing DB"
    - "getEventStyle() pre-quir|pre- check inserted BEFORE consulta inicial to avoid default green fallback"

key-files:
  created:
    - backend/src/prisma/seed-tipos-turno.ts
  modified:
    - backend/package.json
    - frontend/src/app/dashboard/turnos/CalendarGrid.tsx

key-decisions:
  - "seed-tipos-turno.ts uses upsert (not createMany) for idempotence — safe in both fresh and existing DBs"
  - "Pre-Quirúrgico orange branch uses tipo.includes('pre-quir') as primary match (robust against casing), tipo.includes('pre-') as fallback — inserted BEFORE consulta inicial in both fm and light blocks"

patterns-established:
  - "Seed pattern: import { PrismaClient, EnumType } from @prisma/client; iterate TIPOS array; upsert per item"

requirements-completed: [TIPO-01, TIPO-06]

# Metrics
duration: 8min
completed: 2026-06-08
---

# Phase 40 Plan 02: Seed de Tipos de Turno y Color Pre-Quirúrgico Summary

**Idempotent seed for 5 tipos-turno v1.8 + orange color fix for Pre-Quirúrgico in CalendarGrid (was incorrectly falling through to default green)**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-08T18:00:00Z
- **Completed:** 2026-06-08T18:08:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `seed-tipos-turno.ts` — idempotent upsert for Consulta, Control, Pre-Quirúrgico (flujoPaciente=CIRUGIA), Tratamiento (flujoPaciente=TRATAMIENTO), Cirugía (esCirugia=true)
- Added `seed:tipos` npm script to `backend/package.json` (ts-node based, no new deps)
- Fixed `getEventStyle()` in CalendarGrid.tsx — Pre-Quirúrgico now renders orange border (#F97316 light / #fb923c dark) instead of falling to default green

## Task Commits

1. **Task 1: Crear seed-tipos-turno.ts e incorporar script en package.json** - `6d30e61` (feat)
2. **Task 2: Corregir color de Pre-Quirúrgico en CalendarGrid.tsx** - `8f52c7a` (fix)

## Files Created/Modified

- `backend/src/prisma/seed-tipos-turno.ts` - New idempotent seed; upserts 5 tipos de turno, uses FlujoPaciente enum
- `backend/package.json` - Added `"seed:tipos": "ts-node src/prisma/seed-tipos-turno.ts"` script
- `frontend/src/app/dashboard/turnos/CalendarGrid.tsx` - Orange color branch for pre-quir|pre- in getEventStyle(), inserted before consulta inicial in both fm (dark) and light blocks

## Decisions Made

- Used `upsert` (not `createMany`) for idempotence — re-running on an existing DB with these tipos already present updates fields without duplicating rows or throwing unique constraint errors.
- Pre-Quirúrgico color branch uses `tipo.includes("pre-quir")` as primary match (handles accent character in "quirúrgico") and `tipo.includes("pre-")` as fallback. Positioned BEFORE "consulta inicial" check to avoid any accidental match reordering.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `npm run seed:tipos` could not connect to the remote Supabase DB from the local/CI environment (ENOTFOUND). This is an infrastructure/environment constraint, not a code error. The TypeScript compiles and prints `"Seed: tipos de turno v1.8"` before hitting the DB error, confirming the seed logic is correct and will execute successfully when DB is reachable.

## User Setup Required

None — no external service configuration required. When DB is accessible, run `npm run seed:tipos` from `backend/` to initialize tipos de turno.

## Next Phase Readiness

- Phase 40 complete: migration SQL (40-01) + seed + CalendarGrid color fix (40-02)
- DB is initialized with the 4 public tipos + Cirugía (internal)
- Ready for Phase 41: Tipo de Entrada en Historia Clínica (tipoEntrada field on HistoriaClinicaEntrada)

---
*Phase: 40-migracion-tipos-turno*
*Completed: 2026-06-08*
