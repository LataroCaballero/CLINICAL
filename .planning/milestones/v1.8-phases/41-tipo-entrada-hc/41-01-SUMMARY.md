---
phase: 41-tipo-entrada-hc
plan: "01"
subsystem: database
tags: [prisma, nestjs, historia-clinica, flujo-paciente, tdd, enum]

# Dependency graph
requires:
  - phase: 40-migracion-tipos-turno
    provides: TipoTurno types migrated in DB; esCirugia field on Turno model
provides:
  - enum TipoEntradaHC (CONSULTA_CIRUGIA, TRATAMIENTO, CONTROL, SEGUIMIENTO, PREOPERATORIO) in Prisma schema
  - tipoEntrada optional field on HistoriaClinicaEntrada
  - Migration 20260608100000_add_tipo_entrada_hc (CREATE TYPE + ALTER TABLE)
  - resolverNuevoFlujo pure helper function with 10-case test suite
  - crearEntrada persists tipoEntrada and transitions Paciente.flujo (HC-03, HC-04, Criterio 5)
affects: [42-estado-dual-tratamientos-tab, historia-clinica, turnos, pacientes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure helper extraction pattern: domain logic with complex rules goes into *.flujo.helpers.ts to allow direct Jest unit tests without NestJS/Prisma module resolution"
    - "Re-export pattern: service re-exports from helpers file so external callers maintain existing import paths"
    - "pgBouncer pre-fetch pattern: turno.esCirugia fetched outside prisma.$transaction, consistent with other pre-fetches (OS names, insumos)"

key-files:
  created:
    - backend/src/prisma/migrations/20260608100000_add_tipo_entrada_hc/migration.sql
    - backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts
    - backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts
  modified:
    - backend/src/prisma/schema.prisma
    - backend/src/modules/historia-clinica/historia-clinica.service.ts
    - backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts

key-decisions:
  - "resolverNuevoFlujo extracted to historia-clinica.flujo.helpers.ts (not inline in service) because Jest config lacks moduleNameMapper for src/ path aliases — the pure helper has no NestJS deps and resolves cleanly"
  - "tipoEntrada is @IsOptional() in DTO — legacy entries and PatientDrawer calls without classification are valid; UI enforces it at form level (Plan 02)"
  - "turno.esCirugia pre-fetched outside $transaction following repo pgBouncer pattern, consistent with OS and insumos pre-fetches"
  - "paciente.update condition broadened to: diagnosticoStr !== null || tratamientoStr !== null || nuevoFlujo"

patterns-established:
  - "Pure domain logic in *.flujo.helpers.ts for testability without NestJS context"
  - "Re-export from service preserves backward-compatible import paths"

requirements-completed: [HC-01, HC-03, HC-04]

# Metrics
duration: 5min
completed: 2026-06-08
---

# Phase 41 Plan 01: Tipo Entrada HC — Backend Summary

**Prisma enum TipoEntradaHC + tipoEntrada field on HistoriaClinicaEntrada with flow-transition logic in crearEntrada (HC-03, HC-04, esCirugia guard) backed by 10-case TDD suite**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-08T17:55:09Z
- **Completed:** 2026-06-08T17:59:43Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added `enum TipoEntradaHC` to Prisma schema with 5 values and created manual migration file
- Extended `HistoriaClinicaEntrada` with optional `tipoEntrada TipoEntradaHC?` field; `prisma validate` and `prisma generate` pass
- Implemented `resolverNuevoFlujo` pure helper (exported) with all 10 business rules (HC-03, HC-04, esCirugia guard, legacy no-op)
- Extended `crearEntrada` to persist `tipoEntrada` and apply flujo transitions atomically inside `prisma.$transaction`
- NestJS `npm run build` compiles without TypeScript errors; `cerrarSesion` in turnos.service.ts untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: Enum TipoEntradaHC + campo tipoEntrada + migración** - `928483b` (feat)
2. **Task 2 RED: Failing tests for resolverNuevoFlujo** - `d425e94` (test)
3. **Task 2 GREEN: tipoEntrada in DTO + flujo logic in crearEntrada** - `993161a` (feat)

## Files Created/Modified
- `backend/src/prisma/schema.prisma` - Added `enum TipoEntradaHC` and `tipoEntrada TipoEntradaHC?` on HistoriaClinicaEntrada
- `backend/src/prisma/migrations/20260608100000_add_tipo_entrada_hc/migration.sql` - CREATE TYPE + ALTER TABLE migration
- `backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts` - Pure `resolverNuevoFlujo` helper (no NestJS deps)
- `backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts` - 10 unit tests for all transition rules
- `backend/src/modules/historia-clinica/historia-clinica.service.ts` - Imports helper, re-exports it, extends crearEntrada
- `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts` - Added `tipoEntrada` optional field with `@IsEnum`

## Decisions Made
- `resolverNuevoFlujo` extracted to a separate helpers file (not inline in service) because the Jest config in this repo doesn't include `moduleNameMapper` for `src/` path aliases — extracting to a pure TypeScript file with no NestJS imports allows the spec to resolve it without issues.
- DTO field is `@IsOptional()` — legacy entries, `PatientDrawer` calls without classification, are valid. UI enforces selection at form level (Plan 02).
- `turno.esCirugia` pre-fetched outside `$transaction` following the repo's existing pgBouncer pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extracted resolverNuevoFlujo to separate helpers file**
- **Found during:** Task 2 GREEN (running tests after implementing in service)
- **Issue:** Jest config has no `moduleNameMapper` for `src/` path aliases. Importing `historia-clinica.service.ts` from a spec file fails because `import { PrismaService } from 'src/prisma/prisma.service'` can't resolve at test time.
- **Fix:** Created `historia-clinica.flujo.helpers.ts` with no NestJS/Prisma deps. Spec imports from helpers directly. Service imports from helpers and re-exports.
- **Files modified:** `historia-clinica.flujo.helpers.ts` (created), `historia-clinica.service.ts` (import + re-export), `historia-clinica.flujo.spec.ts` (import path updated)
- **Verification:** `npx jest historia-clinica.flujo` passes 10/10. `npm run build` passes.
- **Committed in:** `993161a` (Task 2 feat commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix is minimal and improves the architecture — pure helpers file is the correct pattern for testable domain logic in NestJS repos without full module wiring. No scope creep.

## Issues Encountered
- None beyond the auto-fixed Jest module resolution issue above.

## User Setup Required
None — no external service configuration required. The migration SQL file is committed but not auto-applied (requires `prisma migrate deploy` or `prisma migrate dev` against a running DB).

## Next Phase Readiness
- Phase 42 (TratamientosTab / Estado Dual) can now query `tipoEntrada = 'TRATAMIENTO'` on HistoriaClinicaEntrada to find patients with treatment entries
- Phase 42 frontend form for HC entry creation needs to send `tipoEntrada` (Plan 02 of Phase 41)
- Migration needs to be applied to staging/production DB via `npx prisma migrate deploy`

## Self-Check: PASSED

- `backend/src/prisma/migrations/20260608100000_add_tipo_entrada_hc/migration.sql` FOUND
- `backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts` FOUND
- `backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts` FOUND
- Commits `928483b`, `d425e94`, `993161a` FOUND
- Tests: 10/10 PASS
- Build: EXIT 0

---
*Phase: 41-tipo-entrada-hc*
*Completed: 2026-06-08*
