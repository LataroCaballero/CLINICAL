---
phase: 26-schema-foundation-catalog-crud
plan: 03
subsystem: api
tags: [nestjs, prisma, rest-api, catalog, multi-tenant]

requires:
  - phase: 26-01
    provides: CirugiaCatalogo and CirugiaInsumo models in Prisma schema

provides:
  - Seven REST endpoints under /cirugias-catalogo with full CRUD
  - setInsumos atomic replacement via $transaction
  - recalcularPrecioBase from sum of insumo costs
  - Multi-tenant access via getProfesionalId helper (PROFESIONAL/SECRETARIA/ADMIN)
  - CirugiasCatalogoModule registered in AppModule

affects:
  - 26-07 (GestionCirugias frontend component depends on these endpoints)
  - 28-presupuestos-integration (GET /cirugias-catalogo consumed for presupuesto items)

tech-stack:
  added: []
  patterns:
    - "getProfesionalId helper pattern for multi-tenant endpoint access"
    - "Soft-delete via activo boolean flag"
    - "$transaction for atomic insumos replacement (deleteMany + createMany)"
    - "recalcularPrecioBase reduces insumo.costoBase * cantidad into precioBase"

key-files:
  created:
    - backend/src/modules/cirugias-catalogo/dto/create-cirugia-catalogo.dto.ts
    - backend/src/modules/cirugias-catalogo/dto/update-cirugia-catalogo.dto.ts
    - backend/src/modules/cirugias-catalogo/dto/set-insumos-cirugia.dto.ts
    - backend/src/modules/cirugias-catalogo/cirugias-catalogo.service.ts
    - backend/src/modules/cirugias-catalogo/cirugias-catalogo.controller.ts
    - backend/src/modules/cirugias-catalogo/cirugias-catalogo.module.ts
  modified:
    - backend/src/app.module.ts

key-decisions:
  - "Mirrored tratamientos module pattern verbatim for consistency across catalog modules"
  - "findById uses findFirst with profesionalId (not findUnique) for implicit ownership check"
  - "restore() skips activo filter in ownership check so inactive records can be restored"

patterns-established:
  - "cirugias-catalogo service/controller mirrors tratamientos — future catalog modules should follow same pattern"

requirements-completed:
  - CATLOG-03
  - CATLOG-04
  - CATLOG-05
  - CATLOG-06

duration: 15min
completed: 2026-04-22
---

# Phase 26 Plan 03: Cirugias-Catalogo Module Summary

**NestJS cirugias-catalogo module with 7 REST endpoints, multi-tenant ownership via getProfesionalId helper, atomic insumos replacement, and price recalculation from insumo costs**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-22T21:35:00Z
- **Completed:** 2026-04-22T21:50:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Full CRUD service for `cirugiaCatalogo` model scoped to `profesionalId` (findAllByProfesional, findById, create, update, softDelete, restore)
- `setInsumos` method using `$transaction([deleteMany, createMany])` for atomic replacement of `cirugiaInsumo` records
- `recalcularPrecioBase` computing `SUM(costoBase * cantidad)` across all `cirugiaInsumo` rows and persisting to `precioBase`
- 7-route controller with `getProfesionalId` helper supporting PROFESIONAL/SECRETARIA/ADMIN roles
- `CirugiasCatalogoModule` registered in `AppModule` after `TratamientosModule`

## Task Commits

1. **Task 1: Create cirugias-catalogo DTOs and Service** - `771bb1a` (feat)
2. **Task 2: Create Controller, Module, register in app.module.ts** - `58bb540` (feat)

## Files Created/Modified
- `backend/src/modules/cirugias-catalogo/dto/create-cirugia-catalogo.dto.ts` - DTO with nombre, precioARS, precioUSD, duracionMinutos
- `backend/src/modules/cirugias-catalogo/dto/update-cirugia-catalogo.dto.ts` - PartialType of Create
- `backend/src/modules/cirugias-catalogo/dto/set-insumos-cirugia.dto.ts` - Array of {productoId, cantidad} items
- `backend/src/modules/cirugias-catalogo/cirugias-catalogo.service.ts` - Full service with CRUD + setInsumos + recalcularPrecioBase
- `backend/src/modules/cirugias-catalogo/cirugias-catalogo.controller.ts` - 7 REST routes with multi-tenant helper
- `backend/src/modules/cirugias-catalogo/cirugias-catalogo.module.ts` - Module with PrismaModule import and service export
- `backend/src/app.module.ts` - CirugiasCatalogoModule added to imports

## Decisions Made
- Used `findFirst({ where: { id, profesionalId } })` rather than `findUnique` for ownership checks — natural implicit scope
- `restore()` uses `findFirst` without `activo` filter so inactive items can be found for restoration
- Price recalculation uses `Number()` coercion of Prisma `Decimal` fields for arithmetic

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 7 `/cirugias-catalogo` endpoints are ready for Plan 26-07 (GestionCirugias frontend component)
- `GET /cirugias-catalogo` is ready for Phase 28 presupuestos integration
- `CirugiasCatalogoService` is exported for potential use in other modules

---
*Phase: 26-schema-foundation-catalog-crud*
*Completed: 2026-04-22*
