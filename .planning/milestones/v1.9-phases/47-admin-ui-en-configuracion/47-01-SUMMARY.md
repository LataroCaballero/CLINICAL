---
phase: 47-admin-ui-en-configuracion
plan: 01
subsystem: api
tags: [nestjs, prisma, catalogo-hc, soft-delete, tdd]

# Dependency graph
requires:
  - phase: 44-schema-catalogo-en-bd
    provides: ZonaHC/DiagnosticoHC/TratamientoHC Prisma models with activo/esSistema fields
  - phase: 46-auto-aprendizaje-via-otros
    provides: CatalogoHCService with crearZona/aprenderDesdeZonas; getCatalogoConSeed filters activo=true
provides:
  - PATCH /catalogo-hc/zonas/:id — rename ZonaHC (guard esSistema, conflict detection)
  - PATCH /catalogo-hc/diagnosticos/:id — rename DiagnosticoHC
  - PATCH /catalogo-hc/tratamientos/:id — rename TratamientoHC
  - DELETE /catalogo-hc/zonas/:id — soft-delete ZonaHC with logical cascade to hijos
  - DELETE /catalogo-hc/diagnosticos/:id — soft-delete DiagnosticoHC
  - DELETE /catalogo-hc/tratamientos/:id — soft-delete TratamientoHC
  - RenameItemDto with 3-80 char nombre validation + trim
affects: [47-02-admin-ui, frontend catalogo-hc mutations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - soft-delete via activo=false (never prisma.*.delete) for catalog items with JSONB-referenced data
    - guard esSistema before mutating catalog items to protect system-seeded rows
    - $transaction([...]) array syntax for eliminarZona cascade (pgBouncer-safe)
    - P2002 Prisma error code → ConflictException pattern for uniqueness violations

key-files:
  created:
    - backend/src/modules/catalogo-hc/dto/rename-item.dto.ts
    - backend/src/modules/catalogo-hc/catalogo-hc.service.spec.ts
  modified:
    - backend/src/modules/catalogo-hc/catalogo-hc.service.ts
    - backend/src/modules/catalogo-hc/catalogo-hc.controller.ts

key-decisions:
  - "RenameItemDto in dto/ subfolder under catalogo-hc — follows pattern of other modules with dedicated dto directories"
  - "eliminarZona uses $transaction([...]) array syntax (not callback) — pgBouncer-safe pattern, consistent with repo conventions"
  - "P2002 catch on renombrar* methods — relays Prisma unique constraint as ConflictException without pre-check query overhead"
  - "No hard-deletes anywhere in CatalogoHCService — HistoriaClinicaEntrada stores JSONB text not FKs, so soft-delete preserves HC history"

patterns-established:
  - "Guard pattern for esSistema: findUnique → check profesionalId ownership → check esSistema → mutate"
  - "Ownership check returns NotFoundException (not ForbiddenException) when profesionalId mismatches — avoids revealing existence of other professionals' items"

requirements-completed: [ADM-02, ADM-03]

# Metrics
duration: 3min
completed: 2026-06-13
---

# Phase 47 Plan 01: Admin UI en Configuracion — Backend Rename/Soft-Delete Summary

**Rename and soft-delete endpoints for ZonaHC/DiagnosticoHC/TratamientoHC with esSistema guard, cascade delete, and 28 unit tests (TDD)**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-13T02:16:24Z
- **Completed:** 2026-06-13T02:19:00Z
- **Tasks:** 3 completed
- **Files modified:** 4 (1 created DTO, 1 spec created, 1 service modified, 1 controller modified)

## Accomplishments
- Created RenameItemDto with class-validator (3-80 chars, trim) in dto/ subfolder
- Added 6 service methods to CatalogoHCService: renombrarZona/Diagnostico/Tratamiento + eliminarZona/Diagnostico/Tratamiento — all with esSistema guard, ownership check, no hard-deletes
- eliminarZona cascades activo=false to all child DiagnosticoHC and TratamientoHC via $transaction
- Added 6 PATCH/DELETE endpoints to CatalogoHCController all scoped by profesionalId (supports SECRETARIA/ADMIN via query param)
- 28 unit tests passing (TDD RED→GREEN): success, NotFoundException, ForbiddenException, ConflictException, cascade

## Task Commits

Each task was committed atomically:

1. **Task 1: Crear RenameItemDto** - `59c6bc9` (feat)
2. **Task 2 RED: Failing tests for renombrar/eliminar** - `e28ac53` (test)
3. **Task 2 GREEN: Implement 6 service methods** - `ba40620` (feat)
4. **Task 3: PATCH/DELETE endpoints in controller** - `7a147d2` (feat)

**Plan metadata:** (see final docs commit below)

_Note: Task 2 follows TDD pattern with RED commit before GREEN_

## Files Created/Modified
- `backend/src/modules/catalogo-hc/dto/rename-item.dto.ts` — RenameItemDto (nombre, 3-80, trim)
- `backend/src/modules/catalogo-hc/catalogo-hc.service.spec.ts` — 28 unit tests for renombrar/eliminar methods
- `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` — +6 methods: 3 rename + 3 soft-delete; imported ForbiddenException, NotFoundException, ConflictException
- `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts` — +6 PATCH/DELETE endpoints delegating to service with profesionalId resolution; imported Patch, Delete, Param, Body, RenameItemDto

## Decisions Made
- RenameItemDto placed in dto/ subfolder consistent with other modules that have multiple DTOs
- eliminarZona uses $transaction([array]) syntax (not callback) — pgBouncer-compatible and consistent with Prisma repo patterns
- P2002 caught after update attempt rather than pre-check findUnique — avoids extra query; identical behavior for the consumer
- Ownership violations return NotFoundException (not ForbiddenException) to avoid revealing existence of other professionals' catalog items

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 6 PATCH/DELETE endpoints deployed and tested — plan 47-02 can build frontend mutation hooks against this contract
- Endpoint pattern: PATCH/DELETE /catalogo-hc/{zonas|diagnosticos|tratamientos}/:id with optional ?profesionalId= query param for ADMIN/SECRETARIA
- GET /catalogo-hc unchanged — still returns only activo=true items, so soft-deleted items automatically disappear from Primera Consulta form

---
*Phase: 47-admin-ui-en-configuracion*
*Completed: 2026-06-13*
