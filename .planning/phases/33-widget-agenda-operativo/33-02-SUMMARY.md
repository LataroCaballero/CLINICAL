---
phase: 33-widget-agenda-operativo
plan: "02"
subsystem: ui
tags: [react, tanstack-query, dropdown-menu, patient-drawer, turnos, estado]

# Dependency graph
requires:
  - phase: 33-01
    provides: useTurnoEstadoActions hook (marcarEnEspera, marcarAusente, reactivar)
  - phase: 32-schema-backend-estados-extendidos
    provides: EN_ESPERA and SIENDO_ATENDIDO states in backend

provides:
  - UpcomingAppointments upgraded to operational daily tool with column reorder, clickable patient names, contextual DropdownMenu, and correct estado badges

affects:
  - dashboard/page.tsx (renders UpcomingAppointments)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Contextual DropdownMenu: actions shown based on turno.estado, opacity-0/group-hover pattern for clean table UI"
    - "PatientDrawer integration: useState(drawerPacienteId) + open={!!drawerPacienteId} without page navigation"

key-files:
  created: []
  modified:
    - frontend/src/app/dashboard/components/UpcomingAppointments.tsx

key-decisions:
  - "DropdownMenu hidden via opacity-0 group-hover:opacity-100 so Acciones column stays clean by default"
  - "SIENDO_ATENDIDO excluded from DropdownMenu (must close session first) — consistent with Plan 32-02 decision"
  - "EN_ESPERA still gets DropdownMenu but 'En espera' item is disabled (already in that state)"
  - "Llamar action always disabled — CALL-01 is deferred, title attribute used as tooltip (no shadcn Tooltip for simplicity)"

patterns-established:
  - "Two-state drawer pattern: drawerPacienteId state + open={!!drawerPacienteId} + onOpenChange clears to null"

requirements-completed: [WID-01, WID-02, WID-03, WID-04, WID-05, WID-06]

# Metrics
duration: 2min
completed: 2026-05-13
---

# Phase 33 Plan 02: UpcomingAppointments Widget Upgrade Summary

**UpcomingAppointments upgraded to operational daily tool: reordered columns (Tipo de Turno before Tratamiento), clickable patient names opening PatientDrawer, contextual DropdownMenu with state-transition actions, and correct EN_ESPERA/SIENDO_ATENDIDO badges**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-13T23:47:08Z
- **Completed:** 2026-05-13T23:49:32Z
- **Tasks:** 2 (implemented together in 1 commit — same file)
- **Files modified:** 1

## Accomplishments

- Extended `estadoUi()` with EN_ESPERA (amber) and SIENDO_ATENDIDO (indigo + animate-pulse) cases — no existing cases modified
- Reordered thead: Horario → Paciente → Tipo de Turno → Tratamiento → Estado → Acciones (matching td order in rows)
- Patient name cell replaced with `<button>` that sets `drawerPacienteId` state → PatientDrawer slides open
- `PatientDrawer` added at end of return fragment alongside TurnoHCModal
- DropdownMenu contextual menu wired to `useTurnoEstadoActions` mutations:
  - AUSENTE: "Reactivar" only
  - PENDIENTE/CONFIRMADO/EN_ESPERA: "En espera" + "Ausente" + "Llamar" (disabled placeholder)
  - CANCELADO/FINALIZADO/SIENDO_ATENDIDO: no menu
- Menu button uses `opacity-0 group-hover:opacity-100` — invisible by default, appears on row hover
- TypeScript compiles with zero errors

## Task Commits

1. **Task 1 + Task 2: Extend estadoUi, reorder columns, patient name clickable, DropdownMenu actions** - `574f7ca` (feat)

## Files Created/Modified

- `frontend/src/app/dashboard/components/UpcomingAppointments.tsx` - Full operational agenda tool: 110 lines added, 7 removed (column reorder + PatientDrawer + DropdownMenu)

## Decisions Made

- DropdownMenu trigger button uses `opacity-0 group-hover:opacity-100` pattern — keeps Acciones column visually clean when not hovering
- SIENDO_ATENDIDO excluded from DropdownMenu: consistent with Phase 32 decision that an active session must be closed before state changes
- EN_ESPERA gets the PENDIENTE/CONFIRMADO menu but "En espera" item is disabled (already in that state) — user can still Ausentarlo
- Llamar always `disabled` with `title="Próximamente"` — CALL-01 deferred, no shadcn Tooltip added for simplicity

## Deviations from Plan

None - plan executed exactly as written. Tasks 1 and 2 both targeted the same file and were committed together for atomicity.

## Issues Encountered

None.

## Self-Check: PASSED

- FOUND: frontend/src/app/dashboard/components/UpcomingAppointments.tsx
- FOUND: commit 574f7ca
- All 7 must_have truths verified (Tipo de Turno column, PatientDrawer, drawerPacienteId, DropdownMenu, EN_ESPERA amber, animate-pulse, marcarEnEspera.mutate, reactivar.mutate)

---
*Phase: 33-widget-agenda-operativo*
*Completed: 2026-05-13*
