---
phase: 51-schema-foundation-chat-fix
plan: "02"
subsystem: database, scheduler
tags: [prisma, postgresql, migration, chat-fix, scheduler, tdd]

# Dependency graph
requires: ["51-01"]
provides:
  - "Versioned big-bang migration applied (v1_12_schema_foundation_chat_fix) with all DDL + CHAT-02 cleanup DELETE"
  - "TareaSeguimiento.notificada guard active: scheduler alerts each task exactly once (CHAT-01)"
  - "Historical esSistema=true flood deleted from MensajeInterno (CHAT-02)"
  - "Prisma client regenerated with notificada/notificadaEn fields"
affects: [52-preop-catalog, 53-storage-consent, 54-portal-backend, 55-portal-frontend, 56-pdf-signature]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma drift bypass: migrate diff → db execute → migrate resolve --applied (pre-existing timestamp mismatch)"
    - "TDD: RED test commit then GREEN implementation commit for scheduler guard fix"
    - "notificada guard pattern: flag set after first alert, WHERE filters it out on every subsequent cron cycle"

key-files:
  created:
    - backend/src/prisma/migrations/20260626000000_v1_12_schema_foundation_chat_fix/migration.sql
    - backend/src/modules/pacientes/seguimiento-scheduler.service.spec.ts
  modified:
    - backend/src/modules/pacientes/seguimiento-scheduler.service.ts

key-decisions:
  - "Used prisma migrate diff + db execute + migrate resolve --applied instead of prisma migrate dev (pre-existing timestamp drift: 20260415221758_flujo_paciente in DB vs 20260416000000_flujo_paciente locally)"
  - "Migration SQL generated from actual DB state to schema.prisma diff — ensures exact DDL for current DB, not shadow DB"
  - "TDD applied for scheduler fix: spec file committed RED before implementation committed GREEN"
  - "No new packages installed (threat T-51-SC: accept)"

requirements-completed: [CHAT-01, CHAT-02]

# Metrics
duration: 25min
completed: "2026-06-26"
---

# Phase 51 Plan 02: Big-Bang Migration + Scheduler Fix Summary

**Applied versioned big-bang migration (DDL + CHAT-02 cleanup DELETE) and fixed the CHAT-01 scheduler to alert each TareaSeguimiento exactly once via the notificada guard — historical flood wiped and regrowth prevented in one atomic release**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-26T03:18:00Z
- **Completed:** 2026-06-26T03:43:00Z
- **Tasks:** 2
- **Files created/modified:** 3

## Accomplishments

- Migration `20260626000000_v1_12_schema_foundation_chat_fix` applied and resolved — 47 total migrations, "Database schema is up to date"
- All v1.12 DDL applied: AlergiaCatalogoPro/MedicamentoCatalogoPro tables, TareaSeguimiento guard fields (notificada/notificadaEn), Paciente portal fields, HistoriaClinicaEntrada.estudiosComplementarios, MensajeInterno.autorId nullable + origenPaciente
- CHAT-02 cleanup: `DELETE FROM "MensajeInterno" WHERE "esSistema" = true` executed atomically — esSistema=true count is 0
- Prisma client regenerated with all new fields
- Scheduler fix: `notificada: false` added to findMany WHERE; `tareaSeguimiento.update({ notificada: true, notificadaEn: ahora })` replaces the no-op log comment
- Unit tests (2) confirm guard behavior: notified tasks skipped, new tasks alerted once then marked

## Task Commits

Each task committed atomically:

1. **Task 1: Big-bang migration applied** - `f4d48d9` (feat)
2. **Task 2 RED: Failing tests for CHAT-01 guard** - `d49d321` (test)
3. **Task 2 GREEN: Scheduler dedupe guard implementation** - `456db91` (feat)

## Files Created/Modified

- `backend/src/prisma/migrations/20260626000000_v1_12_schema_foundation_chat_fix/migration.sql` - Full DDL for all v1.12 schema changes + CHAT-02 cleanup DELETE (88 lines)
- `backend/src/modules/pacientes/seguimiento-scheduler.service.spec.ts` - CHAT-01 unit tests: 2 scenarios (skip notified task, alert new task + mark notificada)
- `backend/src/modules/pacientes/seguimiento-scheduler.service.ts` - Added `notificada: false` to findMany WHERE; replaced no-op log with real `tareaSeguimiento.update`

## Decisions Made

- Used `prisma migrate diff --from-schema-datasource --to-schema-datamodel` to generate exact DDL from current DB state (not shadow DB), then applied with `prisma db execute` and resolved with `prisma migrate resolve --applied` — necessary because of a pre-existing timestamp mismatch (`20260415221758_flujo_paciente` in the DB, `20260416000000_flujo_paciente` locally) that caused `prisma migrate dev` to abort with a drift error
- TDD applied for Task 2: RED commit with 2 failing tests, GREEN commit with implementation. No separate REFACTOR commit needed (code was clean on first pass)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] prisma migrate dev failed due to pre-existing drift**
- **Found during:** Task 1 — Step 1 (scaffold without applying)
- **Issue:** A migration with ID `20260415221758_flujo_paciente` was applied to the DB but the local migrations directory has `20260416000000_flujo_paciente` (different timestamp). Prisma detected `OrdenConsumo`/`OrdenConsumoInsumo` tables as unexpected drift and aborted with "We need to reset the 'public' schema" — a destructive operation we must never run against the live dev DB.
- **Fix:** Used `prisma migrate diff --from-schema-datasource src/prisma/schema.prisma --to-schema-datamodel src/prisma/schema.prisma --script` to generate exact DDL for the v1.12 changes (correctly scoped to what the DB is missing), created the migration directory and SQL file manually (Write tool), applied with `prisma db execute --file ... --schema ...`, then resolved with `prisma migrate resolve --applied 20260626000000_v1_12_schema_foundation_chat_fix`. Result: 47 migrations, DB schema up to date.
- **Files modified:** `backend/src/prisma/migrations/20260626000000_v1_12_schema_foundation_chat_fix/migration.sql`
- **Commit:** `f4d48d9`

## TDD Gate Compliance

- RED gate: `d49d321` — test commit with 2 failing tests
- GREEN gate: `456db91` — feat commit with implementation passing both tests
- REFACTOR: none needed

## Issues Encountered

- Pre-existing migration timestamp drift (`20260415221758` vs `20260416000000` for `flujo_paciente`) is a known project-level divergence. It is NOT introduced by this plan. The bypass approach (diff + db execute + resolve) is documented and safe for this specific case.

## User Setup Required

None — migration applied to dev DB automatically during plan execution.

## Next Phase Readiness

- Phase 52 (catalogo-preop) can now use `AlergiaCatalogoPro`/`MedicamentoCatalogoPro` tables
- Phase 53 (storage-consent) can use `consentimientoFirmadoAt` on Paciente
- Phase 54 (portal-backend) can use `portalToken`/`portalTokenGeneradoAt` and `origenPaciente`
- Phase 55/56 (portal-frontend/pdf-signature) have all schema columns ready
- The scheduler no longer floods chat — CHAT-01 fix active on next 9am cron cycle

## Known Stubs

None — migration and scheduler fix are functional and complete. New columns on Paciente/HistoriaClinicaEntrada remain inert until consumed by phases 52–56 (by design, as documented in plan 01).

## Threat Flags

None — all threats in the plan's threat register were mitigated:
- T-51-01: DELETE scoped to `esSistema = true` only; presupuesto messages (esSistema=false) untouched
- T-51-02: Cascade delete bounded to MensajeLectura; no manual pre-delete; D-06 timing note in migration.sql
- T-51-05: Migration applied via `db execute` + `migrate resolve`, not a build-only pass

---

## Self-Check: PASSED

- `backend/src/prisma/migrations/20260626000000_v1_12_schema_foundation_chat_fix/migration.sql` - FOUND
- `backend/src/modules/pacientes/seguimiento-scheduler.service.spec.ts` - FOUND
- `backend/src/modules/pacientes/seguimiento-scheduler.service.ts` - FOUND, modified
- Commit `f4d48d9` - FOUND (Task 1 migration)
- Commit `d49d321` - FOUND (Task 2 RED tests)
- Commit `456db91` - FOUND (Task 2 GREEN implementation)
- `prisma migrate status` reports "Database schema is up to date!" with 47 migrations
- `npm run build` passes

---
*Phase: 51-schema-foundation-chat-fix*
*Completed: 2026-06-26*
