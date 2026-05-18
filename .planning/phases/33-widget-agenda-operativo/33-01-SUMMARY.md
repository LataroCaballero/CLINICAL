---
phase: 33-widget-agenda-operativo
plan: "01"
subsystem: ui
tags: [react, tanstack-query, mutations, hooks, turnos]

# Dependency graph
requires:
  - phase: 32-schema-backend-estados-extendidos
    provides: PATCH /turnos/:id/marcar-en-espera, /marcar-ausente, /reactivar endpoints

provides:
  - useTurnoEstadoActions() hook with marcarEnEspera, marcarAusente, reactivar mutations
  - TurnoEstado exported union type for reuse in UI components

affects:
  - 33-02 (UpcomingAppointments DropdownMenu will import useTurnoEstadoActions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "mutations-only hook: single hook wrapping multiple PATCH endpoints, each with toast + cache invalidation"

key-files:
  created:
    - frontend/src/hooks/useTurnoEstadoActions.ts
  modified: []

key-decisions:
  - "No optimistic updates in the hook itself — Plan 02 will handle visual feedback via isPending at component level"
  - "TurnoEstado type exported from the hook so Plan 02 UpcomingAppointments can import it without re-defining"

patterns-established:
  - "Mutations-only hook: useTurnoEstadoActions returns three mutations without any useQuery or store side-effects"

requirements-completed: [WID-03, WID-04, WID-05]

# Metrics
duration: 5min
completed: 2026-05-13
---

# Phase 33 Plan 01: useTurnoEstadoActions Hook Summary

**Three typed TanStack Query mutations wrapping PATCH /marcar-en-espera, /marcar-ausente, /reactivar with cache invalidation and sonner toasts**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-13T23:20:00Z
- **Completed:** 2026-05-13T23:25:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `useTurnoEstadoActions()` hook with three mutations matching Phase 32 endpoints
- Each mutation invalidates both `['turnos']` and `['alertas-resumen']` query keys on success
- Exported `TurnoEstado` union type covering all 7 appointment states for Plan 02 reuse
- TypeScript compiles cleanly with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useTurnoEstadoActions hook** - `ebef22b` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `frontend/src/hooks/useTurnoEstadoActions.ts` - Mutations-only hook: marcarEnEspera, marcarAusente, reactivar + TurnoEstado type

## Decisions Made
- No optimistic updates inside the hook — Plan 02 UpcomingAppointments will handle local visual feedback using `isPending` flag from the returned mutations
- TurnoEstado type is exported (not kept internal) so Plan 02 can import it without re-defining the same union

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `useTurnoEstadoActions` is ready for Plan 02 to import in UpcomingAppointments.tsx
- The hook's three mutations are typed, tested against TypeScript, and follow the same patterns as `useLiveTurnoActions` and `useTurnoActions`

---
*Phase: 33-widget-agenda-operativo*
*Completed: 2026-05-13*
