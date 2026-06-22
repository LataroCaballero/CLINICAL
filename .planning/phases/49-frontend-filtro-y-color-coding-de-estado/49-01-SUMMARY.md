---
phase: 49-frontend-filtro-y-color-coding-de-estado
plan: "01"
subsystem: ui
tags: [react, nextjs, typescript, tailwind, tratamientos, estado-turno]

# Dependency graph
requires:
  - phase: 48-backend-lectura-snapshot-tratamientos
    provides: "ultimoTratamiento resolved per-turno in obtenerTurnosPorRango response"
provides:
  - "getEstadoTurnoChip pure helper mapping all 7 EstadoTurno values to {label, className}"
  - "TratamientosTab source-B null filter (CIRUGIA patients without real treatment hidden)"
  - "Semantic color chips for all 7 estados in planilla header remap to realizados/programados/cancelados"
affects:
  - future phases that render EstadoTurno chips (can reuse getEstadoTurnoChip from @/lib/estadoTurno)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure estado helper pattern: getEstadoTurnoChip(estado) -> {label, className} as shared lib module"
    - "Source-B null predicate: isFuenteB(t) && t.ultimoTratamiento != null (client-side filter, no backend mutation)"

key-files:
  created:
    - frontend/src/lib/estadoTurno.ts
  modified:
    - frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx

key-decisions:
  - "getEstadoTurnoChip extracted as shared pure module (not inlined) to prevent future triplication across TratamientosTab, AppointmentDetailModal, CalendarGrid"
  - "Source-B null filter applied client-side only — backend contract (ultimoTratamiento: string|null) consumed as-is, no backend changes"
  - "Header breakdown groups: realizados=FINALIZADO, programados=PENDIENTE+CONFIRMADO+EN_ESPERA+SIENDO_ATENDIDO, cancelados=CANCELADO+AUSENTE — derived from visible rows post-filter"
  - "AppointmentDetailModal and CalendarGrid NOT migrated to new helper (deferred — avoid scope creep in this phase)"

patterns-established:
  - "Pure estado helper: place in frontend/src/lib/ as zero-dependency TS module, switch+return shape"
  - "Source filter pattern: dual-source predicates apply null-checks only to source B, source A always passes"

requirements-completed: [TRAT-04, TRAT-05, TRAT-06]

# Metrics
duration: ~15min
completed: 2026-06-22
---

# Phase 49 Plan 01: Frontend Filtro y Color-Coding de Estado Summary

**Source-B null filter hides CIRUGIA patients without real treatments, and getEstadoTurnoChip helper semantizes all 7 EstadoTurno chips with Tailwind color classes including EN_ESPERA (violet) and SIENDO_ATENDIDO (sky)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-22T20:25:00Z
- **Completed:** 2026-06-22T20:41:57Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- Created pure helper `getEstadoTurnoChip` covering all 7 real EstadoTurno values + neutral fallback, replacing legacy PROGRAMADO/REALIZADO keys that didn't exist in the enum
- Applied null-check filter to source B in TratamientosTab so CIRUGIA patients with no recorded treatment (ultimoTratamiento = null) no longer appear as noise in the planilla
- Remapped header breakdown counters to realizados/programados/cancelados groups derived from visible rows post-filter, eliminating stale counts based on pre-filter data
- Visual verification passed: filter, chips, header, and CRM dual-state all confirmed correct in browser

## Task Commits

Each task was committed atomically:

1. **Task 1: Crear helper compartido estadoTurno** - `29a7c7a` (feat)
2. **Task 2: Cablear helper, filtro de null en source B y header re-mapeado** - `91e1d4c` (feat)
3. **Task 3: Verificacion visual** - checkpoint:human-verify (approved, no code changes)

## Files Created/Modified

- `frontend/src/lib/estadoTurno.ts` - Pure helper: getEstadoTurnoChip(estado) -> {label, className} for all 7 EstadoTurno values + neutral fallback
- `frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx` - Source-B null filter, semantic chips via helper, header remap on visible rows

## Decisions Made

- Extracted `getEstadoTurnoChip` as a shared lib module rather than inlining to TratamientosTab, to avoid triplicating the same logic when AppointmentDetailModal and CalendarGrid eventually adopt it
- Left AppointmentDetailModal and CalendarGrid using their existing implementations — migrating them is deferred to avoid scope creep in this phase
- Filter is purely client-side: `isFuenteB(t) && t.ultimoTratamiento != null` — no backend mutation, preserving v1.8 dual-state (etapaCRM/flujo untouched)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TRAT-04/05/06 requirements satisfied; v1.10 milestone frontend work complete
- `getEstadoTurnoChip` is available at `@/lib/estadoTurno` for reuse in AppointmentDetailModal and CalendarGrid whenever those are migrated (deferred tech debt)
- No blockers

---
*Phase: 49-frontend-filtro-y-color-coding-de-estado*
*Completed: 2026-06-22*
