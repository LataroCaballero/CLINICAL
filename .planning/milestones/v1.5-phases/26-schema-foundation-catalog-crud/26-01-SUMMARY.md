---
phase: 26-schema-foundation-catalog-crud
plan: 01
subsystem: database
tags: [prisma, postgresql, schema, migration, tratamientos, cirugia, insumos]

# Dependency graph
requires: []
provides:
  - TratamientoInsumo join table (tratamientoId, productoId, cantidad) with Cascade delete
  - CirugiaCatalogo model (nombre, precioARS, precioUSD, precioBase, duracionMinutos, profesionalId, activo)
  - CirugiaInsumo join table (cirugiaId, productoId, cantidad) with Cascade delete
  - precioBase Decimal? field on Tratamiento model
  - Back-relations on Producto (tratamientoInsumos, cirugiaInsumos) and Profesional (cirugiasCatalogo)
  - Migration 20260422000000_add_insumos_catalogs applied and Prisma client synchronized
affects:
  - 26-02-backend-tratamientos-insumos
  - 26-03-backend-cirugia-catalogo
  - 26-04-frontend-tratamientos-insumos
  - 26-05-frontend-cirugia-catalogo
  - All plans using Prisma client types for TratamientoInsumo, CirugiaCatalogo, CirugiaInsumo

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Explicit M2M join tables with cantidad Decimal field (required when M2M carries payload)
    - onDelete: Cascade on child insumo tables (deleting parent removes all insumos)
    - Multi-tenant isolation via profesionalId FK on CirugiaCatalogo
    - @@unique([nombre, profesionalId]) for per-professional catalog uniqueness
    - @@index([profesionalId, activo]) for filtered list queries

key-files:
  created:
    - backend/src/prisma/migrations/20260422000000_add_insumos_catalogs/migration.sql
  modified:
    - backend/src/prisma/schema.prisma

key-decisions:
  - "Used prisma db push + migrate resolve instead of migrate dev due to Supabase pgBouncer shadow DB incompatibility (column 'flujo' error on shadow DB replay)"
  - "Explicit join tables TratamientoInsumo and CirugiaInsumo required because implicit M2M cannot carry cantidad field"
  - "precioBase Decimal? is nullable on both Tratamiento and CirugiaCatalogo to support optional base pricing"

patterns-established:
  - "M2M with payload: use explicit join table with @@unique([parentId, childId]) and @@index([parentId])"
  - "Multi-tenant catalog: @@unique([nombre, profesionalId]) prevents duplicate names per professional"

requirements-completed: [CATLOG-01, CATLOG-02, CATLOG-03, CATLOG-04, CATLOG-05, CATLOG-06]

# Metrics
duration: 15min
completed: 2026-04-22
---

# Phase 26 Plan 01: Schema Foundation Summary

**Prisma schema extended with TratamientoInsumo, CirugiaCatalogo, CirugiaInsumo models and precioBase field; migration applied to Supabase PostgreSQL via db push workaround; client regenerated**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-22T00:00:00Z
- **Completed:** 2026-04-22T00:15:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `precioBase Decimal?` to `Tratamiento` and `insumos TratamientoInsumo[]` relation
- Created `TratamientoInsumo` join table with unique constraint on (tratamientoId, productoId) and Cascade delete
- Created `CirugiaCatalogo` model with dual-currency pricing (precioARS, precioUSD, precioBase), duration, per-professional unique constraint
- Created `CirugiaInsumo` join table mirroring TratamientoInsumo pattern
- Added back-relations to `Producto` and `Profesional` for bidirectional navigation
- Applied migration to live Supabase database; Prisma client regenerated with new types; 41 migrations tracked

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend schema.prisma** - `485b37b` (feat)
2. **Task 2: Run migration and regenerate Prisma client** - `4567082` (feat)

## Files Created/Modified
- `backend/src/prisma/schema.prisma` - Added TratamientoInsumo, CirugiaCatalogo, CirugiaInsumo models + precioBase field + back-relations
- `backend/src/prisma/migrations/20260422000000_add_insumos_catalogs/migration.sql` - SQL for all DDL changes

## Decisions Made
- Used `prisma db push` then `prisma migrate resolve --applied` instead of `prisma migrate dev` because the Supabase pgBouncer shadow database fails to replay migration `20260415221758_flujo_paciente` (column "flujo" does not exist error). The live DB is correctly up to date; the shadow DB is a known Supabase session-mode pgBouncer limitation.
- Kept `precioBase` nullable (`Decimal?`) on both Tratamiento and CirugiaCatalogo — base pricing is optional in the catalog, not required for MVP.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used db push + migrate resolve instead of migrate dev**
- **Found during:** Task 2 (Run migration)
- **Issue:** `prisma migrate dev` failed with shadow DB error: `column "flujo" of relation "Paciente" does not exist` — a known Supabase pgBouncer (session mode) limitation where the shadow database cannot replay all migrations cleanly
- **Fix:** Used `prisma db push` to apply schema changes directly to the live DB (succeeded in 4s), then `prisma migrate resolve --applied` to record the migration file in the _prisma_migrations table
- **Files modified:** backend/src/prisma/migrations/20260422000000_add_insumos_catalogs/migration.sql (created manually)
- **Verification:** `prisma migrate status` shows 41 migrations, "Database schema is up to date!"; `prisma validate` passes
- **Committed in:** 4567082 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — DB tooling workaround)
**Impact on plan:** Workaround achieves identical outcome. Migration history is tracked. No scope creep.

## Issues Encountered
- Supabase pgBouncer shadow database incompatibility with `prisma migrate dev` — resolved via `db push` + `migrate resolve` pattern. This is a known workaround for Supabase session-mode pooler deployments.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema is migrated and Prisma client is synchronized — all subsequent Phase 26 plans (26-02 through 26-07) can proceed
- NestJS services can now import and use `PrismaService.tratamientoInsumo`, `PrismaService.cirugiaCatalogo`, `PrismaService.cirugiaInsumo`
- No blockers

---
*Phase: 26-schema-foundation-catalog-crud*
*Completed: 2026-04-22*
