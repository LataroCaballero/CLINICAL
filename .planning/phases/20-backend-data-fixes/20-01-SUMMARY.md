---
phase: 20-backend-data-fixes
plan: 01
subsystem: api
tags: [nestjs, prisma, turnos, historia-clinica, class-validator]

# Dependency graph
requires: []
provides:
  - "GET /turnos/agenda returns diagnostico and tratamiento in turno.paciente"
  - "GET /turnos/proximos returns esCirugia and entradaHCId at turno level, and esCirugia in tipoTurno"
  - "POST /pacientes/:id/historia-clinica/entradas accepts optional fecha field with retroactive date support"
  - "Future fecha validation returns 400 before touching DB"
affects:
  - 21-agenda-widget-modal-hc

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma select fields expanded to include nullable patient fields (diagnostico, tratamiento)"
    - "DTO optional field pattern with @IsOptional + @IsDateString from class-validator"
    - "Conditional spread for optional DB fields: ...(fechaFinal && { fecha: fechaFinal })"
    - "Date validation before transaction: parse, check isNaN, compare against end-of-day boundary"

key-files:
  created: []
  modified:
    - backend/src/modules/turnos/turnos.service.ts
    - backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts
    - backend/src/modules/historia-clinica/historia-clinica.service.ts

key-decisions:
  - "Future date boundary: hoy.setHours(23,59,59,999) so that today's date is not rejected"
  - "fechaFinal passed to Prisma only when provided; DB default(now()) handles the nil case"

patterns-established:
  - "Conditional date override pattern: ...(fechaFinal && { fecha: fechaFinal }) in Prisma create"

requirements-completed: [BACK-01, BACK-02, BACK-03]

# Metrics
duration: 8min
completed: 2026-04-02
---

# Phase 20 Plan 01: Backend Data Fixes Summary

**Three surgical Prisma select + DTO fixes enabling agenda widget to display diagnostico/tratamiento and HC modal to create retroactive entries with validated future-date rejection**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-02T15:04:00Z
- **Completed:** 2026-04-02T15:12:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `obtenerAgendaDiaria` now returns `diagnostico` and `tratamiento` in each `turno.paciente` (BACK-01)
- `obtenerProximosTurnos` now returns `esCirugia` and `entradaHCId` at turno level, plus `esCirugia` in `tipoTurno` (BACK-02)
- `CreateEntradaDto` has optional `fecha` field with `@IsOptional` + `@IsDateString`; service validates and persists it, rejects future dates with 400 (BACK-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Agregar diagnostico+tratamiento al select de obtenerAgendaDiaria** - `d6142b1` (feat)
2. **Task 2: Agregar esCirugia y entradaHCId al select de obtenerProximosTurnos** - `2dde494` (feat)
3. **Task 3: Soporte de fecha retroactiva en crearEntrada HC** - `d06b0ec` (feat)

## Files Created/Modified

- `backend/src/modules/turnos/turnos.service.ts` - Added diagnostico+tratamiento to `obtenerAgendaDiaria` select; added esCirugia+entradaHCId to `obtenerProximosTurnos` select and esCirugia to its tipoTurno select
- `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts` - Added `fecha?: string` with `@IsOptional` + `@IsDateString` decorators
- `backend/src/modules/historia-clinica/historia-clinica.service.ts` - Added `BadRequestException` import, fecha validation block before transaction, conditional fecha spread in `historiaClinicaEntrada.create`

## Decisions Made

- Future date boundary uses `hoy.setHours(23, 59, 59, 999)` so requests with today's date are accepted (not rejected as future)
- `fechaFinal` only passed to Prisma when explicitly provided; the DB `@default(now())` handles the nil case with no behavior regression

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all three builds compiled without errors on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three backend contracts (BACK-01, BACK-02, BACK-03) are fulfilled
- Phase 21 (Agenda Widget + Modal HC) can now safely consume `GET /turnos/agenda`, `GET /turnos/proximos`, and `POST /pacientes/:id/historia-clinica/entradas` with the corrected response shapes

## Self-Check: PASSED

- FOUND: backend/src/modules/turnos/turnos.service.ts
- FOUND: backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts
- FOUND: backend/src/modules/historia-clinica/historia-clinica.service.ts
- FOUND: .planning/phases/20-backend-data-fixes/20-01-SUMMARY.md
- FOUND: d6142b1 (Task 1 commit)
- FOUND: 2dde494 (Task 2 commit)
- FOUND: d06b0ec (Task 3 commit)

---
*Phase: 20-backend-data-fixes*
*Completed: 2026-04-02*
