---
phase: 22-schema-foundation
plan: 02
subsystem: database
tags: [prisma, postgres, migration, seed, tipos-turno, flujo-paciente]

# Dependency graph
requires:
  - phase: 22-01
    provides: "FlujoPaciente enum in schema.prisma and migration.sql with DDL + data migration"
provides:
  - "Migration 20260416000000_flujo_paciente applied to production DB"
  - "Migration 20260415221758_flujo_paciente applied (SET DEFAULT + indexes from schema diff)"
  - "Prisma client regenerated with FlujoPaciente enum and new fields"
  - "Seed updated: 5 new TipoTurno types with flujoPaciente and esCirugia"
  - "TiposTurnoService.findAll() exposes flujoPaciente and esCirugia"
affects:
  - 22-03 (PATCH endpoint — Paciente.flujo writable)
  - 23-backend-logic (auto-update flujo, flujoPaciente available from findAll)
  - 24-liveturno-banner
  - 25-tratamientos-tab

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma auto-generates supplemental migration for schema drift (SET DEFAULT + indexes) — expected behavior, commit alongside hand-crafted migration"
    - "Seed uses FlujoPaciente enum import + 'as FlujoPaciente' cast for string literals where needed"

key-files:
  created:
    - backend/src/prisma/migrations/20260415221758_flujo_paciente/migration.sql
  modified:
    - backend/src/prisma/seed
    - backend/src/modules/tipos-turno/tipos-turno.service.ts

key-decisions:
  - "Prisma generated a second migration (20260415221758) to apply SET DEFAULT PENDIENTE and create the 2 indexes — this is correct behavior; both migrations committed together"
  - "DB has 6 TipoTurno records (5 new + 'Cirugía' existing pre-phase) — the old 3 were deleted but Cirugía was never in the delete list; seed only creates the 5 new types"

patterns-established:
  - "When Prisma detects schema drift after manual migration, accept the auto-generated supplemental migration and commit it alongside the hand-crafted one"

requirements-completed: [TIPOS-01, TIPOS-02, FLUJO-06]

# Metrics
duration: 15min
completed: 2026-04-15
---

# Phase 22 Plan 02: Migration + Seed + Service Summary

**flujo_paciente migration applied to DB, seed replaced with 5 correct TipoTurno types with flujoPaciente/esCirugia, and TiposTurnoService.findAll() now exposes those fields**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-15T22:15:00Z
- **Completed:** 2026-04-15T22:30:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Applied migration `20260416000000_flujo_paciente` — FlujoPaciente enum created, Paciente.flujo column added, TipoTurno.flujoPaciente added, data migration ran (3 old types deleted, 4 inserted + Control updated, Paciente backfill)
- Prisma auto-generated `20260415221758_flujo_paciente` to apply `SET DEFAULT 'PENDIENTE'` and create 2 indexes from schema diff — committed alongside manual migration
- Seed file updated: imports FlujoPaciente enum, replaces 4-item array with 5 objects having flujoPaciente and esCirugia fields, batchInsert count updated to 5
- `TiposTurnoService.findAll()` now selects `flujoPaciente: true` and `esCirugia: true` — TypeScript build passes cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Ejecutar migración y verificar estado de la BD** - `d13a803` (feat)
2. **Task 2: Actualizar seed de TipoTurno con los 5 nuevos tipos** - `99f3065` (feat)
3. **Task 3: Actualizar TiposTurnoService.findAll() para exponer nuevos campos** - `4efe892` (feat)

## Files Created/Modified

- `backend/src/prisma/migrations/20260415221758_flujo_paciente/migration.sql` - Auto-generated Prisma supplemental migration (SET DEFAULT + indexes)
- `backend/src/prisma/seed` - Updated TipoTurno block with 5 new types + FlujoPaciente import
- `backend/src/modules/tipos-turno/tipos-turno.service.ts` - findAll() select expanded with flujoPaciente and esCirugia

## Decisions Made

- Prisma generated a second migration (`20260415221758_flujo_paciente`) when `prisma migrate dev` ran — it captured schema fields that the manual migration hadn't applied (SET DEFAULT + indexes). Committed as-is alongside the hand-crafted migration.
- DB verification via Node/PrismaClient showed 6 TipoTurno records: 5 new ones + the pre-existing `Cirugía` type (which was never in the deletion list). Seed creates only the 5 correct new types for dev environments.

## Deviations from Plan

None — plan executed exactly as written. The second auto-generated Prisma migration is expected behavior when a manual migration SQL doesn't include every change declared in schema.prisma.

## Issues Encountered

- `npx prisma db execute --stdin` without `--schema` flag errored — used Node script with PrismaClient directly for DB verification instead. Not a blocking issue.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Migration applied, Prisma client regenerated — FlujoPaciente fully available in TypeScript
- `TiposTurnoService.findAll()` returns flujoPaciente and esCirugia — frontend can consume in Phase 23
- Seed ready for dev environment reseeds with correct 5 TipoTurno types
- Plan 22-03 (PATCH `/pacientes/:id/flujo` endpoint) can proceed immediately

---
*Phase: 22-schema-foundation*
*Completed: 2026-04-15*
