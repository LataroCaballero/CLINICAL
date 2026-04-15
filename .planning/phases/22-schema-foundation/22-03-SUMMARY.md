---
phase: 22-schema-foundation
plan: 03
subsystem: api
tags: [nestjs, prisma, rest, roles, dto, class-validator]

# Dependency graph
requires:
  - phase: 22-02
    provides: FlujoPaciente enum in Prisma schema and DB migration applied

provides:
  - PATCH /pacientes/:id/flujo endpoint with enum validation and 404 guard
  - UpdateFlujoDto with @IsEnum(FlujoPaciente) validation
  - PacientesService.updateFlujo(id, flujo) method
  - Role restriction: ADMIN + PROFESIONAL + SECRETARIA only (FACTURADOR excluded)

affects: [23-backend-logic, 24-liveturno-banner]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Method-level @Auth overrides class-level @Auth via RolesGuard.getAllAndOverride (handler priority)
    - updateFlujo mirrors updateTemperatura pattern: findUnique check + NotFoundException + update

key-files:
  created:
    - backend/src/modules/pacientes/dto/update-flujo.dto.ts
  modified:
    - backend/src/modules/pacientes/pacientes.service.ts
    - backend/src/modules/pacientes/pacientes.controller.ts

key-decisions:
  - "RolesGuard uses getAllAndOverride([handler, class]) — method-level @Auth takes priority over class-level, enabling FACTURADOR exclusion without guard changes"
  - "updateFlujo does not accept null — if reset needed in future, a separate endpoint will be created"

patterns-established:
  - "Restrictive method override: @Auth at method level with fewer roles than class-level works due to getAllAndOverride ordering"

requirements-completed: [TIPOS-02]

# Metrics
duration: 15min
completed: 2026-04-15
---

# Phase 22 Plan 03: PATCH /pacientes/:id/flujo Endpoint Summary

**PATCH /pacientes/:id/flujo with @IsEnum validation, 404 guard, and FACTURADOR-exclusion via method-level @Auth override**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-15T22:30:00Z
- **Completed:** 2026-04-15T22:45:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Created `UpdateFlujoDto` with `@IsEnum(FlujoPaciente)` — rejects any value outside CIRUGIA/TRATAMIENTO/PENDIENTE with 400
- Added `updateFlujo(id, flujo)` service method following the `updateTemperatura` pattern with NotFoundException for non-existent patients
- Added `PATCH :id/flujo` controller route with `@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')` that overrides the class-level guard, explicitly excluding FACTURADOR
- Confirmed `npm run build` passes with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Crear UpdateFlujoDto y método updateFlujo en service** - `df2e515` (feat)
2. **Task 2: Añadir ruta PATCH :id/flujo al controller con @Auth restrictivo** - `1f95070` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `backend/src/modules/pacientes/dto/update-flujo.dto.ts` - DTO with `@IsEnum(FlujoPaciente)` for body validation
- `backend/src/modules/pacientes/pacientes.service.ts` - Added `FlujoPaciente` import and `updateFlujo()` method
- `backend/src/modules/pacientes/pacientes.controller.ts` - Added `FlujoPaciente`/`UpdateFlujoDto` imports and `PATCH :id/flujo` route

## Decisions Made
- **@Auth override confirmed viable:** `RolesGuard` uses `reflector.getAllAndOverride(ROLES_KEY, [handler, class])` — handler metadata wins. This means `@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')` at method level correctly overrides the class-level `@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR')`, blocking FACTURADOR without any guard changes.
- **No null support in DTO:** `UpdateFlujoDto.flujo` is non-optional; `null` is not a valid `FlujoPaciente` enum value. If future requirements need to clear the flujo, a dedicated `DELETE /pacientes/:id/flujo` endpoint will be created.

## Deviations from Plan

None - plan executed exactly as written. The `@Auth` override investigation was part of the planned Task 2 and confirmed the recommended approach worked.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 22 (Schema Foundation) is now complete: schema migration, seed, service exposure, and PATCH endpoint all done
- Phase 23 (Backend Logic) can start: auto-update flujo on Turno creation and CRM filters require this endpoint pattern as precedent
- Phase 24 (LiveTurno Banner) unblocked: PENDIENTE classification is now manually settable

---
*Phase: 22-schema-foundation*
*Completed: 2026-04-15*
