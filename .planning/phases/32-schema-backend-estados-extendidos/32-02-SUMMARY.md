---
phase: 32-schema-backend-estados-extendidos
plan: 02
subsystem: api
tags: [nestjs, typescript, prisma, estado-turno, state-machine, react]

# Dependency graph
requires:
  - phase: 32-01
    provides: EN_ESPERA and SIENDO_ATENDIDO added to EstadoTurno enum + Prisma client regenerated
provides:
  - PATCH /turnos/:id/marcar-en-espera endpoint (PENDIENTE|CONFIRMADO → EN_ESPERA)
  - PATCH /turnos/:id/marcar-ausente endpoint (PENDIENTE|EN_ESPERA|CONFIRMADO → AUSENTE)
  - PATCH /turnos/:id/reactivar endpoint (AUSENTE → PENDIENTE)
  - iniciarSesion now sets SIENDO_ATENDIDO instead of CONFIRMADO
  - Frontend type unions include EN_ESPERA and SIENDO_ATENDIDO in 5 files
  - CalendarGrid color mapping for EN_ESPERA (violet) and SIENDO_ATENDIDO (sky blue)
affects:
  - 33-widget-agenda-operativo
  - 34-liveturno-simplificado

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "State machine transitions: BadRequestException on invalid origin state, NotFoundException on missing turno"
    - "Terminal states (CANCELADO, FINALIZADO) always block further transitions"
    - "NestJS PATCH endpoints for state transitions: no DTO needed when no body is required"

key-files:
  created: []
  modified:
    - backend/src/modules/turnos/turnos.service.ts
    - backend/src/modules/turnos/turnos.controller.ts
    - frontend/src/app/dashboard/turnos/CalendarGrid.tsx
    - frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx
    - frontend/src/app/dashboard/turnos/page.tsx
    - frontend/src/app/dashboard/components/UpcomingAppointments.tsx
    - frontend/src/app/dashboard/components/NextPatientCard.tsx

key-decisions:
  - "QuickAppointment.tsx omitted from type updates — it uses TurnoRango from hook where estado is typed as string, so no inline union to expand"
  - "marcarEnEspera rejects SIENDO_ATENDIDO as origin (not just AUSENTE/FINALIZADO/CANCELADO) — SIENDO_ATENDIDO is an active-session state, not a waiting-room state"
  - "reactivar rejects everything except AUSENTE — one entry point keeps the machine predictable"

patterns-established:
  - "State transition methods: findUnique(select id+estado) → NotFoundException → BadRequestException on invalid states → prisma.update"
  - "Color semantics: orange=pending, green=confirmed, violet=waiting, sky-blue=in-session, blue=finished, red=cancelled, gray=absent"

requirements-completed: [EST-02, EST-03, EST-04, EST-05]

# Metrics
duration: 7min
completed: 2026-05-13
---

# Phase 32 Plan 02: Backend State-Transition Endpoints + Frontend Type Sync Summary

**3 new PATCH endpoints (marcar-en-espera, marcar-ausente, reactivar) + iniciarSesion fixed to SIENDO_ATENDIDO + frontend type unions extended to 7 states**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-13T20:10:00Z
- **Completed:** 2026-05-13T20:17:03Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Implemented full state machine for EN_ESPERA/AUSENTE transitions: marcarEnEspera, marcarAusente, reactivar in TurnosService following the confirmarTurno pattern
- Fixed iniciarSesion to set SIENDO_ATENDIDO instead of CONFIRMADO — a patient being seen is no longer conflated with a confirmed appointment
- Extended estado union type in 5 frontend files; added violet/sky-blue colors to CalendarGrid switch
- Backend build exits 0; frontend tsc --noEmit exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: marcarEnEspera, marcarAusente, reactivar + iniciarSesion fix** - `ae135d8` (feat)
2. **Task 2: Controller endpoints + frontend type updates** - `eaf5005` (feat)

## Files Created/Modified
- `backend/src/modules/turnos/turnos.service.ts` - Added 3 state-transition methods + fixed iniciarSesion to use SIENDO_ATENDIDO
- `backend/src/modules/turnos/turnos.controller.ts` - Added PATCH /:id/marcar-en-espera, /:id/marcar-ausente, /:id/reactivar
- `frontend/src/app/dashboard/turnos/CalendarGrid.tsx` - Extended estado union + added EN_ESPERA/SIENDO_ATENDIDO color cases
- `frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx` - Extended estado union
- `frontend/src/app/dashboard/turnos/page.tsx` - Extended estado union
- `frontend/src/app/dashboard/components/UpcomingAppointments.tsx` - Extended estado union
- `frontend/src/app/dashboard/components/NextPatientCard.tsx` - Extended estado union

## Decisions Made
- QuickAppointment.tsx was not modified because it imports `TurnoRango` from `useTurnosRangos` hook where `estado` is `string` — no inline union to expand
- SIENDO_ATENDIDO is rejected as an origin for marcarEnEspera (an in-session patient can't go back to the waiting room without cerrarSesion first)
- The color palette assigns violet to EN_ESPERA (visually distinct from CONFIRMADO green) and sky blue to SIENDO_ATENDIDO (active session)

## Deviations from Plan

None - plan executed exactly as written. QuickAppointment.tsx was correctly identified in the plan as needing a check ("verificar si hay un switch/case") — there was no inline union, only string usage from the hook, so no update was needed.

## Issues Encountered

None. The pre-existing `error TS6059` about `test/app.e2e-spec.ts` being outside rootDir is unrelated to this plan's changes and was present before execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 3 state-transition endpoints are live and guarded by @Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
- Frontend compiles with the complete 7-state union
- Phase 33 (Widget Agenda Operativo) can now call marcar-en-espera and marcar-ausente from the contextual action menu
- Phase 34 (LiveTurno Simplificado) benefits from iniciarSesion correctly setting SIENDO_ATENDIDO

---
*Phase: 32-schema-backend-estados-extendidos*
*Completed: 2026-05-13*
