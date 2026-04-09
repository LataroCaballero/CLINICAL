---
phase: 21-agenda-widget-modal-hc
plan: 01
subsystem: api
tags: [nestjs, class-validator, typescript, historia-clinica, hc-templates]

# Dependency graph
requires:
  - phase: 20-backend-data-fixes
    provides: "Retroactive fecha pattern in HC entries (crear-entrada.dto.ts + historia-clinica.service.ts)"
provides:
  - "CreateEntryDto backend with optional fecha field and future-date validation"
  - "createEntry service persists retroactive fecha to HistoriaClinicaEntrada"
  - "Frontend CreateEntryDto interface with fecha?: string"
affects:
  - TurnoHCModal (consumes CreateEntryDto.fecha to date entries at turno date)
  - useCreateHCEntry (passes fecha transparently in dto body)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Retroactive fecha pattern: @IsOptional @IsDateString in DTO + isNaN guard + hoy.setHours(23,59,59,999) + spread into Prisma create"

key-files:
  created: []
  modified:
    - backend/src/modules/hc-templates/dto/create-entry.dto.ts
    - backend/src/modules/hc-templates/hc-templates.service.ts
    - frontend/src/types/hc-templates.ts

key-decisions:
  - "Replicates Phase 20 retroactive fecha pattern exactly — same boundary logic (end of today is not future)"
  - "fechaFinal only spread into Prisma data when defined — DB @default(now()) handles nil case without regression"

patterns-established:
  - "HC retroactive fecha: validate not-future with setHours(23,59,59,999); spread ...(fechaFinal && { fecha: fechaFinal }) into Prisma create"

requirements-completed: [HC-03]

# Metrics
duration: 8min
completed: 2026-04-03
---

# Phase 21 Plan 01: Retroactive Fecha Support for HC Template Entries Summary

**Optional `fecha` field added to hc-templates CreateEntryDto with future-date validation, enabling TurnoHCModal to timestamp entries at historical turno date instead of today**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-03T00:00:00Z
- **Completed:** 2026-04-03T00:08:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Backend CreateEntryDto gains `@IsOptional @IsDateString fecha?` field matching Phase 20 pattern exactly
- `createEntry` service validates fecha is not future (using `setHours(23,59,59,999)` boundary) and spreads it into Prisma create
- Frontend `CreateEntryDto` interface updated with `fecha?: string` so TurnoHCModal can pass turno date transparently

## Task Commits

1. **Task 1: Agregar fecha opcional a CreateEntryDto backend y validar en createEntry service** - `c2f19bf` (feat)
2. **Task 2: Actualizar tipo CreateEntryDto en frontend con campo fecha opcional** - `ecc176f` (feat)

## Files Created/Modified

- `backend/src/modules/hc-templates/dto/create-entry.dto.ts` - Added `@IsOptional @IsDateString fecha?` with updated imports
- `backend/src/modules/hc-templates/hc-templates.service.ts` - Added fechaFinal validation block and spread into Prisma create data
- `frontend/src/types/hc-templates.ts` - Added `fecha?: string` to CreateEntryDto interface

## Decisions Made

- Reused Phase 20 pattern verbatim (same validation logic, same boundary convention) to maintain consistency across HC entry creation paths.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HC-03 complete: backend now accepts POST with `{ fecha: "2026-03-15" }` and persists the date
- TurnoHCModal (HC-01 / HC-02) can now pass `fecha` from the selected turno when creating entries
- No blockers for remaining Phase 21 plans

---
*Phase: 21-agenda-widget-modal-hc*
*Completed: 2026-04-03*
