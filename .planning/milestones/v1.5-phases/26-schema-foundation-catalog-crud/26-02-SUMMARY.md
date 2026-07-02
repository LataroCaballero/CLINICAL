---
phase: 26-schema-foundation-catalog-crud
plan: 02
subsystem: api
tags: [nestjs, prisma, tratamientos, insumos, multi-tenant]

requires:
  - phase: 26-01
    provides: TratamientoInsumo model in schema with tratamientoId, productoId, cantidad fields

provides:
  - PUT /tratamientos/:id/insumos endpoint (atomic batch replace)
  - POST /tratamientos/:id/recalcular-precio endpoint (SUM costoBase * cantidad)
  - findAllByProfesional now includes insumos with producto details
  - SetInsumosTratamientoDto and InsumoItemDto for request validation

affects:
  - 26-05-tratamientos-frontend
  - any phase consuming tratamientos list (now includes insumos array)

tech-stack:
  added: []
  patterns:
    - "Prisma $transaction for atomic delete-then-recreate pattern"
    - "Ownership check via findById() before mutation"
    - "Decimal arithmetic using Number() coercion for costoBase * cantidad"

key-files:
  created:
    - backend/src/modules/tratamientos/dto/set-insumos-tratamiento.dto.ts
  modified:
    - backend/src/modules/tratamientos/tratamientos.service.ts
    - backend/src/modules/tratamientos/tratamientos.controller.ts

key-decisions:
  - "setInsumos uses $transaction([deleteMany, ...creates]) — atomic replacement prevents partial state"
  - "null costoBase treated as 0 via ?? 0 in reduce — safe for products with no cost set"
  - "recalcularPrecioBase persists as Decimal via Prisma update; returns updated tratamiento with insumos included"

patterns-established:
  - "Insumos replace pattern: deleteMany + createMany in $transaction (not upsert) to handle removed items"

requirements-completed:
  - CATLOG-01
  - CATLOG-02

duration: 15min
completed: 2026-04-22
---

# Phase 26 Plan 02: Insumos Management Endpoints Summary

**Atomic insumos batch-replace (PUT /tratamientos/:id/insumos) and cost recalculation (POST /tratamientos/:id/recalcular-precio) endpoints added to the tratamientos NestJS module**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-22T21:35:00Z
- **Completed:** 2026-04-22T21:50:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `SetInsumosTratamientoDto` + `InsumoItemDto` with class-validator decorators for type-safe request body validation
- Added `setInsumos()` service method using Prisma `$transaction` for atomic delete-then-recreate of `TratamientoInsumo` records
- Added `recalcularPrecioBase()` service method computing `SUM(costoBase ?? 0 * cantidad)` and persisting to `Tratamiento.precioBase`
- Extended `findAllByProfesional()` to include `insumos { producto { id, nombre, costoBase, unidadMedida } }` in response
- Wired both endpoints to `TratamientosController` with `getProfesionalId()` for multi-tenant isolation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SetInsumosTratamientoDto and add service methods** - `23c2d1c` (feat)
2. **Task 2: Add PUT :id/insumos and POST :id/recalcular-precio routes** - `2dc22a1` (feat)

## Files Created/Modified

- `backend/src/modules/tratamientos/dto/set-insumos-tratamiento.dto.ts` - DTO classes for batch insumos replacement body validation
- `backend/src/modules/tratamientos/tratamientos.service.ts` - Added setInsumos(), recalcularPrecioBase(); extended findAllByProfesional() with insumos include
- `backend/src/modules/tratamientos/tratamientos.controller.ts` - Added Put import, SetInsumosTratamientoDto import, two new route handlers

## Decisions Made

- Used `$transaction([deleteMany, ...createMany])` pattern over upsert — cleanly removes insumos no longer in the list without needing to track deletions client-side
- `null costoBase` is coerced to `0` via `?? 0` before multiplication — treats products with no cost as free rather than throwing NaN

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Insumos management API is complete; frontend can now call PUT /tratamientos/:id/insumos to save insumo selections and POST /tratamientos/:id/recalcular-precio to sync precioBase from insumo costs
- The `findAllByProfesional` response now carries insumos — frontend types may need updating to reflect the expanded shape (InsumoItemDto array on each tratamiento)

---
*Phase: 26-schema-foundation-catalog-crud*
*Completed: 2026-04-22*
