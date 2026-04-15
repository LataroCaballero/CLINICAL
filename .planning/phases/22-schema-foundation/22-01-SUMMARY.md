---
phase: 22-schema-foundation
plan: 01
subsystem: database
tags: [prisma, postgres, schema, migration, enum, flujo-paciente]

# Dependency graph
requires: []
provides:
  - "enum FlujoPaciente { CIRUGIA, TRATAMIENTO, PENDIENTE } in schema.prisma"
  - "Paciente.flujo: FlujoPaciente? @default(PENDIENTE) with indexes"
  - "TipoTurno.flujoPaciente: FlujoPaciente? (nullable)"
  - "migration.sql with DDL + transactional TipoTurno data migration + Paciente backfill"
affects:
  - 22-02 (seed)
  - 22-03 (PATCH endpoint)
  - 23-backend-logic
  - 24-liveturno-banner
  - 25-tratamientos-tab

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FlujoPaciente enum placed with CRM enums — co-located by domain (patient classification)"
    - "Migration DDL outside transaction, data migration inside BEGIN/COMMIT block"
    - "No SQL DEFAULT on new column — app-level @default(PENDIENTE) handles new inserts, existing rows = NULL (legacy)"

key-files:
  created:
    - backend/src/prisma/migrations/20260416000000_flujo_paciente/migration.sql
  modified:
    - backend/src/prisma/schema.prisma

key-decisions:
  - "Paciente.flujo uses @default(PENDIENTE) in Prisma but NO SQL DEFAULT — DDL adds column as nullable, existing rows intentionally NULL (legacy/unclassified), only new app inserts get PENDIENTE"
  - "TipoTurno.flujoPaciente kept nullable with no default — classifying an appointment type is optional"
  - "Backfill uses CIRUGIA for patients with esCirugia turnos OR etapaCRM set; others stay NULL (not PENDIENTE)"
  - "Control TipoTurno is reused via UPDATE (unique constraint), only 4 net-new TipoTurno rows inserted"
  - "TipoTurnoProfesional configs deleted before TipoTurno rows (FK ON DELETE RESTRICT order)"

patterns-established:
  - "FlujoPaciente enum colocated with CRM enums in schema.prisma for domain cohesion"
  - "Migration split: DDL outside transaction (cannot be in BEGIN/COMMIT in Postgres), data migration inside transaction"

requirements-completed: [TIPOS-01, FLUJO-06]

# Metrics
duration: 15min
completed: 2026-04-15
---

# Phase 22 Plan 01: Schema Foundation Summary

**PostgreSQL enum FlujoPaciente with Paciente.flujo and TipoTurno.flujoPaciente fields in Prisma schema, plus transactional migration SQL replacing 3 legacy TipoTurno records and backfilling patient classification**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-15T22:00:00Z
- **Completed:** 2026-04-15T22:13:32Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `enum FlujoPaciente { CIRUGIA, TRATAMIENTO, PENDIENTE }` to schema.prisma in the CRM enums section
- Added `Paciente.flujo: FlujoPaciente? @default(PENDIENTE)` with two composite indexes
- Added `TipoTurno.flujoPaciente: FlujoPaciente?` (nullable, no default)
- Created complete migration.sql: DDL (CREATE TYPE + 2 ALTER TABLE) + transactional 6-step data migration

## Task Commits

Each task was committed atomically:

1. **Task 1: Añadir enum FlujoPaciente y campos a schema.prisma** - `e6538c6` (feat)
2. **Task 2: Escribir migration.sql con DDL + migración transaccional** - `2a3cdb0` (feat)

## Files Created/Modified

- `backend/src/prisma/schema.prisma` - Added enum FlujoPaciente, Paciente.flujo field + 2 indexes, TipoTurno.flujoPaciente field
- `backend/src/prisma/migrations/20260416000000_flujo_paciente/migration.sql` - Complete DDL + transactional data migration

## Decisions Made

- `Paciente.flujo` column added without SQL DEFAULT so existing rows are NULL (legacy/unclassified). Prisma `@default(PENDIENTE)` ensures new application inserts get PENDIENTE. This cleanly distinguishes legacy patients (NULL) from new unclassified ones (PENDIENTE).
- Backfill only upgrades to CIRUGIA — patients with `esCirugia = true` turno or active `etapaCRM`. All others remain NULL (not PENDIENTE), preserving the legacy/new distinction.
- `Control` TipoTurno reused via UPDATE since its name has a UNIQUE constraint — avoids constraint violation on insert.
- `TipoTurnoProfesional` rows deleted before `TipoTurno` rows to respect FK constraint ordering.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- schema.prisma ready for `npx prisma migrate dev --name flujo_paciente` which will execute migration.sql
- Plan 22-02 (seed) can proceed: new TipoTurno types and FlujoPaciente values are defined
- Plan 22-03 (PATCH endpoint) can proceed: `Paciente.flujo` field exists in schema
- Phase 23 backend logic can reference `FlujoPaciente` enum and both new fields immediately after migration runs

---
*Phase: 22-schema-foundation*
*Completed: 2026-04-15*
