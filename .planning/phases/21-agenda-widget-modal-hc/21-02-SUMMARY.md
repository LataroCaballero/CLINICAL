---
phase: 21-agenda-widget-modal-hc
plan: 02
subsystem: ui
tags: [react, tanstack-query, date-fns, dashboard, agenda, next.js]

# Dependency graph
requires:
  - phase: 20-backend-data-fixes
    provides: /turnos/agenda endpoint returning TurnoAgenda[] with esCirugia and entradaHCId fields
provides:
  - UpcomingAppointments.tsx with single selectedDate state, agenda-first loading, day navigation, metrics for hoy/pasados, Ver HC for FINALIZADO turnos on hoy/pasados
affects: [dashboard, turnos, historia-clinica]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unified date state: single selectedDate (Date) instead of dual dateIndex + pickedDate"
    - "Always-enabled query: /turnos/agenda with !!profesionalId (no conditional enabling on date)"
    - "Derived display state: isToday, isPast, isHoyOPasado, header, metrics all computed from selectedDate"

key-files:
  created: []
  modified:
    - frontend/src/app/dashboard/components/UpcomingAppointments.tsx

key-decisions:
  - "Single selectedDate state initialized to new Date() replaces dual dateIndex/pickedDate pattern — simpler, always consistent"
  - "Query enabled with !!profesionalId only — always fetches for current selectedDate without needing a pickedDate flag"
  - "isHoyOPasado derived as isToday || isPast controls both metrics visibility and Ver HC button — no special pickedDate condition"

patterns-established:
  - "Agenda-first: dashboard widget defaults to today's full agenda, not upcoming-next-N-days"
  - "Day navigation: chevron buttons always visible, update selectedDate ±1 day"
  - "X button resets to today only when not already on today (conditional render)"

requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-04, DASH-05]

# Metrics
duration: 8min
completed: 2026-04-03
---

# Phase 21 Plan 02: Agenda Widget Refactor Summary

**UpcomingAppointments rewritten to agenda-first: loads today via /turnos/agenda by default, day-by-day arrow navigation, metrics and Ver HC button appear for hoy and all past days without requiring an explicit date picker selection**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-03T00:00:00Z
- **Completed:** 2026-04-03T00:08:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Eliminated dual-mode architecture (upcoming vs picked) — single `selectedDate: Date` state initialized to today
- Removed the `/turnos/proximos` query entirely; single `/turnos/agenda` query always enabled
- Day navigation arrows are always visible and increment/decrement selectedDate by 1 day (DASH-02)
- Metrics strip (total, finalizados, cirugías, ausentes, cancelados) now visible for today and all past dates (DASH-04)
- "Ver HC" button shown for any FINALIZADO turno when `isHoyOPasado`, not gated on `pickedDate` (DASH-05)
- Calendar picker always updates `selectedDate` directly (DASH-03)
- `TurnoHCModal` receives real `selectedDate` (not `pickedDate ?? new Date()`)

## Task Commits

1. **Task 1: Refactorizar UpcomingAppointments a modo agenda-first unificado** - `4c771ab` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `frontend/src/app/dashboard/components/UpcomingAppointments.tsx` - Agenda-first widget with unified date state, day nav, metrics, Ver HC for hoy/pasados

## Decisions Made
- Single `selectedDate` state replaces dual `dateIndex` + `pickedDate` — eliminates the mode-switching complexity entirely
- Query is always enabled (only gated on `!!profesionalId`) — avoids edge cases where no date was selected
- `isHoyOPasado = isToday || isPast` is the single gate for both metrics and Ver HC visibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — TypeScript compiled clean on first pass, no orphan references to stale state variables.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DASH-01 through DASH-05 complete — agenda widget fully operational
- Phase 21 still has HC-01, HC-02, HC-03 (TurnoHCModal behavior) pending in plan 21-01 (if not yet done)
- No blockers

---
*Phase: 21-agenda-widget-modal-hc*
*Completed: 2026-04-03*
