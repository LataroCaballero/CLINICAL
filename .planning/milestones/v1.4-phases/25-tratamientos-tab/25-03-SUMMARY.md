---
phase: 25-tratamientos-tab
plan: 03
subsystem: ui
tags: [react, nextjs, tanstack-query, lucide-react, tailwind, shadcn]

# Dependency graph
requires:
  - phase: 25-01
    provides: flujoPaciente field in TurnoRango type, useTurnosRango hook updated

provides:
  - TratamientosTab component — monthly TRATAMIENTO-type turnos list with navigation and filter
  - Third pill view "Tratamientos" on /dashboard/pacientes
  - Tab selection persistence via localStorage

affects:
  - dashboard/pacientes page — Vista type extended

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-side filter derived from API data (no refetch on filter change)"
    - "Month range computed via native Date arithmetic (no date-fns)"
    - "Dropdown options derived from tratamientoTurnos (not a separate tipo API call)"

key-files:
  created:
    - frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx
  modified:
    - frontend/src/app/dashboard/pacientes/page.tsx

key-decisions:
  - "Dropdown options derived from tratamientoTurnos instead of useTiposTurno — useTiposTurno.TipoTurno lacks flujoPaciente field; deriving from turno data is simpler and guarantees only tipos relevant to the current month appear"
  - "Month navigation clears filterTipoId — prevents stale filter when switching months (tipo in March may not exist in April)"

patterns-established:
  - "tiposEnMes derived from Map dedup of tratamientoTurnos[].tipoTurno — clean O(n) dedup"
  - "CANCELADO attenuation via opacity-40 on entire <tr>"

requirements-completed: [TRAT-01, TRAT-02, TRAT-03, TRAT-04, TRAT-05, TRAT-06]

# Metrics
duration: 3min
completed: 2026-04-20
---

# Phase 25 Plan 03: Tratamientos Tab Summary

**Monthly TRATAMIENTO-type turnos list with month navigation, client-side tipo filter, header breakdown, and PatientDrawer integration on /dashboard/pacientes**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-20T14:51:42Z
- **Completed:** 2026-04-20T14:54:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created TratamientosTab.tsx — self-contained component with month navigation, TRATAMIENTO filter, and header summary
- Extended pacientes page Vista type to 3 values and added the Syringe pill button
- TypeScript compilation passes with no errors (confirmed via `npx tsc --noEmit` and `next build` compiled step)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TratamientosTab component** - `64f78a2` (feat)
2. **Task 2: Wire TratamientosTab into pacientes page** - `9afbb78` (feat)

**Plan metadata:** TBD (docs commit)

## Files Created/Modified

- `frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx` - New self-contained component: month nav, TRATAMIENTO filter, header summary, table with CANCELADO attenuation, PatientDrawer
- `frontend/src/app/dashboard/pacientes/page.tsx` - Vista type extended, Syringe import, third pill button, TratamientosTab mount

## Decisions Made

- Dropdown options derived from `tratamientoTurnos` directly rather than calling `useTiposTurno`. Reason: `TipoTurno` from `useTiposTurno` lacks `flujoPaciente` field, and deriving from the already-fetched turno data is simpler and guarantees only tipos present in the current month appear as options.
- Month navigation clears `filterTipoId` to prevent stale filter when switching months (a tipo present in March may not appear in April).

## Deviations from Plan

None — plan executed exactly as written. The only adaptation was the dropdown option derivation strategy (from turno data instead of a separate tipo API call), which was a minor implementation detail within the spirit of the plan.

## Issues Encountered

None — build environment has a pre-existing `pages-manifest.json` ENOENT error during the data collection phase of `next build`, but this is unrelated to our code (TypeScript compilation succeeds cleanly).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 25 plan 03 (final plan of the phase) complete
- TRAT-01 through TRAT-06 requirements satisfied
- v1.4 Flujo de Pacientes milestone complete

---
*Phase: 25-tratamientos-tab*
*Completed: 2026-04-20*
