---
phase: 27-hc-integration-liveturno-patientdrawer
plan: 01
subsystem: database, api
tags: [prisma, nestjs, historia-clinica, ordenes-consumo, stock, postgres]

# Dependency graph
requires:
  - phase: 26-schema-foundation
    provides: TratamientoInsumo model, CirugiaInsumo pattern, pgBouncer db push workaround
provides:
  - OrdenConsumo + OrdenConsumoInsumo Prisma models pushed to DB and client regenerated
  - EstadoOrdenConsumo enum (PENDIENTE, CONFIRMADA, CANCELADA)
  - Extended CreateEntradaDto with tratamientoIds, consumirInsumos, turnoId, tratamiento_en_consultorio tipo
  - crearEntrada() atomically creates OrdenConsumo when consumirInsumos=true and tratamientos have insumos
  - Minimal OrdenesConsumoModule registered in AppModule (stub for Phase 31)
affects: [27-02, 27-03, 28, 30, 31]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-fetch outside $transaction: insumos aggregated outside tx, created inside (pgBouncer pattern)"
    - "Quantity aggregation by productoId using Map to prevent duplicate OrdenConsumoInsumo rows"
    - "OrdenConsumo always starts PENDIENTE — MovimientoStock SALIDA only at explicit stock admin confirmation"

key-files:
  created:
    - backend/src/modules/ordenes-consumo/ordenes-consumo.module.ts
    - backend/src/modules/ordenes-consumo/ordenes-consumo.controller.ts
    - backend/src/modules/ordenes-consumo/ordenes-consumo.service.ts
    - backend/src/modules/ordenes-consumo/dto/create-orden-consumo.dto.ts
  modified:
    - backend/src/prisma/schema.prisma
    - backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts
    - backend/src/modules/historia-clinica/historia-clinica.service.ts
    - backend/src/app.module.ts

key-decisions:
  - "OrdenConsumo creation is atomic with HC entry via $transaction — no orphaned orders possible"
  - "Insumos pre-fetched outside $transaction to follow pgBouncer pattern established in Phase 26"
  - "Quantity deduplication: if two tratamientos share productoId their quantities sum into one OrdenConsumoInsumo row"
  - "consumirInsumos=false or empty tratamientoIds skips OrdenConsumo creation entirely — backward compatible"
  - "turnoId nullable: presence means call from LiveTurno, absence means call from PatientDrawer"

patterns-established:
  - "OrdenConsumo pattern: HC save creates OrdenConsumo{estado:PENDIENTE} only; actual MovimientoStock SALIDA at explicit stock admin confirmation"
  - "tratamiento_en_consultorio contenido includes tratamientosSnapshot for display without DB join"

requirements-completed: [STOCK-01, STOCK-02, LIVHC-05]

# Metrics
duration: 3min
completed: 2026-04-23
---

# Phase 27 Plan 01: HC Integration — OrdenConsumo Schema + Backend Summary

**Prisma OrdenConsumo model live in DB, HC service atomically creates stock consumption orders when saving treatment-linked entries**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-23T21:32:22Z
- **Completed:** 2026-04-23T21:35:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added EstadoOrdenConsumo enum and OrdenConsumo + OrdenConsumoInsumo models to Prisma schema with back-relations on Paciente, Profesional, Producto; pushed to DB and regenerated client
- Extended CreateEntradaDto with tratamientoIds, consumirInsumos, turnoId, and tratamiento_en_consultorio tipo
- crearEntrada() now pre-fetches insumos outside $transaction, aggregates quantities by productoId, and creates OrdenConsumo atomically inside the same transaction as the HC entry
- Scaffolded minimal OrdenesConsumoModule (controller + service stub) registered in AppModule — ready for Phase 31 expansion

## Task Commits

1. **Task 1: Schema — Add OrdenConsumo models and run migration** - `f04c782` (feat)
2. **Task 2: Backend — Extend HC DTO + service + ordenes-consumo module** - `45b6545` (feat)

## Files Created/Modified
- `backend/src/prisma/schema.prisma` - Added EstadoOrdenConsumo enum, OrdenConsumo, OrdenConsumoInsumo models; back-relations on Paciente/Profesional/Producto
- `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts` - Added tratamientoIds, consumirInsumos, turnoId fields; tratamiento_en_consultorio to tipo union
- `backend/src/modules/historia-clinica/historia-clinica.service.ts` - Pre-fetch + aggregate insumos outside tx; create OrdenConsumo inside $transaction
- `backend/src/modules/ordenes-consumo/ordenes-consumo.module.ts` - NestJS module with PrismaModule import
- `backend/src/modules/ordenes-consumo/ordenes-consumo.controller.ts` - GET /ordenes-consumo stub with getProfesionalId pattern
- `backend/src/modules/ordenes-consumo/ordenes-consumo.service.ts` - findPendientesByProfesional stub
- `backend/src/modules/ordenes-consumo/dto/create-orden-consumo.dto.ts` - Empty placeholder DTO for Phase 31
- `backend/src/app.module.ts` - OrdenesConsumoModule registered in imports

## Decisions Made
- OrdenConsumo creation is atomic with HC entry — no orphaned orders possible if HC write fails
- Insumos pre-fetched outside $transaction to comply with pgBouncer session-mode constraint
- Quantity deduplication via Map prevents duplicate OrdenConsumoInsumo rows when two tratamientos share the same productoId
- consumirInsumos=false or empty tratamientoIds is backward-compatible — creates HC entry only, no OrdenConsumo
- turnoId is nullable: present = call from LiveTurno context, absent = call from PatientDrawer

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend contract established: POST /pacientes/:id/historia-clinica/entradas with tratamientoIds + consumirInsumos=true creates entry + OrdenConsumo atomically
- Plan 27-02 can now build the frontend HC creator UI using this API contract
- Plan 31 can flesh out OrdenesConsumoModule with full CRUD (confirm/cancel stock consumption)

---
*Phase: 27-hc-integration-liveturno-patientdrawer*
*Completed: 2026-04-23*

## Self-Check: PASSED

- ordenes-consumo.module.ts: FOUND
- ordenes-consumo.service.ts: FOUND
- ordenes-consumo.controller.ts: FOUND
- 27-01-SUMMARY.md: FOUND
- Commit f04c782 (Task 1 schema): FOUND
- Commit 45b6545 (Task 2 backend): FOUND
- Schema contains 9 references to OrdenConsumo: FOUND
