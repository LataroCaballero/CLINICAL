---
phase: 31-stock-ordenes-de-consumo-ui
plan: "01"
subsystem: api
tags: [nestjs, prisma, stock, ordenes-consumo, inventario, movimiento-stock]

# Dependency graph
requires:
  - phase: 27-hc-integration-liveturno
    provides: OrdenConsumo creation (PENDIENTE estado) from HC entry save

provides:
  - Enriched GET /ordenes-consumo with paciente.nombreCompleto and insumos[].producto.{nombre,unidadMedida}
  - Atomic POST /ordenes-consumo/:id/confirmar that decrements stockActual and creates MovimientoStock SALIDA per insumo in a single $transaction
  - Idempotency guard (ConflictException on already-confirmed orders)
  - Insufficient-stock rollback (BadRequestException with descriptive message)

affects:
  - 31-02 frontend stock admin UI (consumes this enriched GET + confirmar endpoint)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - pgBouncer-safe two-step pattern: pre-fetch outside $transaction, re-fetch inside $transaction for race guard
    - Inline SALIDA logic inside confirmarOrden $transaction (no nested service calls that open their own tx)
    - Decimal cast via Number() for OrdenConsumoInsumo.cantidad field before arithmetic

key-files:
  created: []
  modified:
    - backend/src/modules/ordenes-consumo/ordenes-consumo.service.ts
    - backend/src/modules/ordenes-consumo/ordenes-consumo.controller.ts

key-decisions:
  - "confirmarOrden pgBouncer two-step: pre-fetch outside tx, re-fetch inside tx — prevents ConflictException race condition without nested transactions"
  - "Inline tx SALIDA logic: MovimientoStock.create called directly inside confirmarOrden $transaction instead of delegating to InventarioService.registrarMovimiento() which opens its own tx"
  - "Inventario auto-create on confirmar: if no Inventario row exists for a producto+profesional pair, create with stockActual=0 then immediately throw BadRequestException — clean audit trail even for never-stocked items"

patterns-established:
  - "confirmarOrden pattern: same structure as ordenes-compra.service.ts recibir() — re-fetch guard + for-loop tx writes"

requirements-completed: [STOCK-03, STOCK-04]

# Metrics
duration: 3min
completed: 2026-05-13
---

# Phase 31 Plan 01: OrdenConsumo Backend Confirmation Summary

**Atomic POST /ordenes-consumo/:id/confirmar that decrements per-professional inventory and creates SALIDA audit trail inside a single pgBouncer-safe Prisma $transaction, with enriched GET including paciente name and product details**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-13T12:21:16Z
- **Completed:** 2026-05-13T12:24:06Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended `findPendientesByProfesional` to include `paciente.{id,nombreCompleto}` and `insumos[].producto.{id,nombre,unidadMedida}` — stock admin UI can render full order details without extra requests
- Implemented `confirmarOrden()` using pgBouncer-safe two-step pattern: pre-fetch outside tx for fast 404 response, re-fetch inside tx as idempotency/race guard
- Added `POST :id/confirmar` controller action reusing existing `getProfesionalId()` helper for ADMIN/SECRETARIA/PROFESIONAL role resolution

## Task Commits

1. **Task 1: Enrich findPendientesByProfesional and add confirmarOrden() service method** - `a524a5a` (feat)
2. **Task 2: Add POST :id/confirmar controller action** - `15a8f93` (feat)

## Files Created/Modified

- `backend/src/modules/ordenes-consumo/ordenes-consumo.service.ts` - Enriched GET query includes paciente + producto; new confirmarOrden() with atomic $transaction
- `backend/src/modules/ordenes-consumo/ordenes-consumo.controller.ts` - Added Post, Param imports; new confirmar() action reusing getProfesionalId() helper

## Decisions Made

- **Inline tx logic, not InventarioService delegation:** pgBouncer forbids nested transactions. `confirmarOrden` inlines `inventario.update` + `movimientoStock.create` directly inside the $transaction, mirroring `ordenes-compra.service.ts recibir()` pattern.
- **Inventario auto-create path:** If no Inventario row exists for a `(productoId, profesionalId)` pair at confirmation time, create one with stockActual=0, then immediately throw BadRequestException for insufficient stock — preserves the unique constraint and gives a clean error.
- **Number() cast for Decimal fields:** `OrdenConsumoInsumo.cantidad` is a Prisma `Decimal` — must cast via `Number()` before arithmetic comparison with `inv.stockActual`.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Backend enriched GET and confirmar endpoints are ready for the frontend stock admin UI (plan 31-02)
- Frontend can call `GET /ordenes-consumo?profesionalId=X` and receive full order details
- Frontend can call `POST /ordenes-consumo/:id/confirmar?profesionalId=X` to trigger atomic stock decrement
- No blockers for 31-02 execution

---
*Phase: 31-stock-ordenes-de-consumo-ui*
*Completed: 2026-05-13*
