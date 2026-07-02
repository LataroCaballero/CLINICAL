---
phase: 52-preop-hc-form-chip-catalogs
plan: 01
subsystem: database
tags: [prisma, postgresql, schema, migration, catalogo-hc, antecedentes]

# Dependency graph
requires:
  - phase: 51-schema-foundation-chat-fix
    provides: "AlergiaCatalogoPro/MedicamentoCatalogoPro pattern + catalogo-hc.seed-data.ts with normalizarNombre"
provides:
  - "AntecedenteCatalogoPro table in DB with @@unique([nombre, profesionalId]) and @@index([profesionalId, activo])"
  - "antecedentesCatalogo AntecedenteCatalogoPro[] inverse relation on Profesional"
  - "SEED_ANTECEDENTES string[] (10 system conditions matching frontend PREDEFINED list)"
  - "Migration 20260626120000_add_antecedente_catalogo_pro applied to live DB"
  - "antecedenteCatalogoPro Prisma delegate available on PrismaClient"
affects:
  - 52-02  # service layer seed + learning (consumes SEED_ANTECEDENTES + AntecedenteCatalogoPro)
  - 52-03  # PreoperatorioForm frontend (chips from AntecedenteCatalogoPro catalog)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma catalog model pattern: esSistema, activo, profesionalId FK, @@unique([nombre, profesionalId]), @@index([profesionalId, activo])"
    - "Drift-safe migration via prisma migrate diff --from-schema-datasource + db execute + migrate resolve --applied (established in Phase 51)"

key-files:
  created:
    - backend/src/prisma/migrations/20260626120000_add_antecedente_catalogo_pro/migration.sql
  modified:
    - backend/src/prisma/schema.prisma
    - backend/src/modules/catalogo-hc/catalogo-hc.seed-data.ts

key-decisions:
  - "Drift-safe migration approach reused from Phase 51: migrate diff --from-schema-datasource + db execute + migrate resolve --applied (migrate dev/--create-only both blocked by pre-existing DB drift 20260415221758)"
  - "SEED_ANTECEDENTES mirrors frontend CondicionesChips.tsx PREDEFINED exactly — single source of truth for system condition values"

patterns-established:
  - "AntecedenteCatalogoPro follows exact same schema pattern as AlergiaCatalogoPro/MedicamentoCatalogoPro — field-for-field identical, consistent naming"
  - "SEED_ANTECEDENTES constant in catalogo-hc.seed-data.ts for lazy per-professional seeding by service layer (Plan 02)"

requirements-completed: [PREOP-03, PREOP-04]

# Metrics
duration: 25min
completed: 2026-06-26
---

# Phase 52 Plan 01: AntecedenteCatalogoPro Schema + Migration Summary

**AntecedenteCatalogoPro table created in DB (per-professional antecedentes catalog with @@unique constraint and FK to Profesional), SEED_ANTECEDENTES constant (10 canonical conditions) exported, and Prisma client regenerated with the new delegate**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-26T12:00:00Z
- **Completed:** 2026-06-26T12:23:42Z
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments

- Added `AntecedenteCatalogoPro` model to `schema.prisma` with exact same field layout as `AlergiaCatalogoPro`/`MedicamentoCatalogoPro` (id, nombre, activo, esSistema, profesionalId FK, createdAt, updatedAt, @@unique([nombre, profesionalId]), @@index([profesionalId, activo]))
- Added `antecedentesCatalogo AntecedenteCatalogoPro[]` inverse relation on `Profesional` model
- Exported `SEED_ANTECEDENTES: string[]` (10 values: Hipertensión, Diabetes, Asma, Enfermedad cardíaca, Obesidad, Artritis, Alergia severa, Hipotiroidismo, Cannabis, Epilepsia) from `catalogo-hc.seed-data.ts`, mirroring the frontend `PREDEFINED` list exactly
- Applied migration `20260626120000_add_antecedente_catalogo_pro` via drift-safe workaround; `prisma migrate status` reports "Database schema is up to date!" (48 migrations); `prisma validate` passes; backend `npm run build` exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Add AntecedenteCatalogoPro model + inverse relation + seed constant** - `a90f5f7` (feat)
2. **Task 2: Run Prisma migration + regenerate client** - `71196e8` (feat)

## Files Created/Modified

- `backend/src/prisma/schema.prisma` - Added `AntecedenteCatalogoPro` model + `antecedentesCatalogo` inverse relation on `Profesional`
- `backend/src/modules/catalogo-hc/catalogo-hc.seed-data.ts` - Added `SEED_ANTECEDENTES: string[]` constant (10 system condition values)
- `backend/src/prisma/migrations/20260626120000_add_antecedente_catalogo_pro/migration.sql` - CREATE TABLE + unique/index + FK to Profesional

## Decisions Made

- Reused the Phase 51 drift-safe migration pattern (`prisma migrate diff --from-schema-datasource + prisma db execute + prisma migrate resolve --applied`) because both `prisma migrate dev` and `prisma migrate dev --create-only` are blocked by pre-existing DB drift (migration `20260415221758_flujo_paciente` applied in DB but missing from local migrations folder).
- `SEED_ANTECEDENTES` placed in `catalogo-hc.seed-data.ts` (not a separate file) to keep all catalog seed constants in one place, consistent with `SEED_ZONAS`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Drift-safe migration workaround (prisma migrate diff + db execute + migrate resolve)**

- **Found during:** Task 2 (Run Prisma migration)
- **Issue:** `npx prisma migrate dev --name add_antecedente_catalogo_pro` (and `--create-only`) both blocked by pre-existing DB drift: migration `20260415221758_flujo_paciente` exists in DB but not in local `migrations/` folder, causing Prisma to demand a DB reset
- **Fix:** Followed Phase 51 precedent: (1) `prisma migrate diff --from-schema-datasource --to-schema-datamodel --script` to generate only the additive delta SQL; (2) created migration folder `20260626120000_add_antecedente_catalogo_pro/migration.sql`; (3) `prisma db execute --schema ... --file migration.sql` to apply; (4) `prisma migrate resolve --applied 20260626120000_add_antecedente_catalogo_pro` to mark applied; (5) `prisma generate`
- **Files modified:** `backend/src/prisma/migrations/20260626120000_add_antecedente_catalogo_pro/migration.sql` (new)
- **Verification:** `prisma migrate status` → "Database schema is up to date!" (48 migrations); diff output was additive-only (no `--accept-data-loss` triggered); T-52-01 threat mitigated
- **Committed in:** 71196e8 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - Blocking)
**Impact on plan:** The workaround is identical to Phase 51's approved approach. No data loss, no scope change, table was created correctly.

## Issues Encountered

- Pre-existing DB drift from `20260415221758_flujo_paciente` (same as Phase 51) prevents interactive `migrate dev`; resolved with the same `diff + execute + resolve` workaround that was established as the standard pattern for this environment.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `AntecedenteCatalogoPro` table and `antecedenteCatalogoPro` Prisma delegate are ready for Plan 02 (service layer: per-professional catalog seeding and `aprenderDesdePreoperatorio()` learning logic)
- `SEED_ANTECEDENTES` constant ready for idempotent upsert in the service
- No blockers

---
*Phase: 52-preop-hc-form-chip-catalogs*
*Completed: 2026-06-26*
