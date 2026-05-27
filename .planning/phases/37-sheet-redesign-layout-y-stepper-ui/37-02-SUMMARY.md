---
phase: 37-sheet-redesign-layout-y-stepper-ui
plan: "02"
subsystem: ui
tags: [crm, kanban, sheet, stepper, radix, shadcn, dialog]

# Dependency graph
requires:
  - phase: 37-01
    provides: CRMFlujoBadge, EtapaStepper, ContactoRapidoModal, ListaEsperaDialog components
provides:
  - CardActionsSheet refactored to Header + EtapaStepper body + fixed Footer layout
  - Two-button footer with ContactoRapidoModal and ListaEsperaDialog dialog triggers
  - KanbanBoard cleaned up of orphaned turno state and deleted action props
affects:
  - 38-stepper-interactions
  - crm kanban

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Sheet with flex-col layout and flex-shrink-0 header/footer + flex-1 overflow-y-auto body
    - Dialog portals mounted inside a Sheet without z-index or focus-trap conflicts
    - Amber border conditional styling on Button variant="outline" for waiting-list state

key-files:
  created: []
  modified:
    - frontend/src/components/crm/CardActionsSheet.tsx
    - frontend/src/components/crm/KanbanBoard.tsx

key-decisions:
  - "CardActionsSheet props reduced to 4 fields — onOpenNuevoTurno and onOpenPresupuestos fully removed"
  - "Sheet layout uses flex-col with flex-shrink-0 header/footer and flex-1 overflow body — no absolute positioning"
  - "Dialogs (ContactoRapidoModal, ListaEsperaDialog) mount via Radix DialogPortal in document.body — no z-index conflict with Sheet"

patterns-established:
  - "CRM Sheet layout: px-5 pt-5 pb-4 border-b header | flex-1 overflow-y-auto body | border-t px-5 py-4 footer"
  - "Conditional amber border: patient.enListaEspera && 'border-amber-400 text-amber-700 hover:bg-amber-50'"

requirements-completed: [SHEET-01, SHEET-02, SHEET-03, SHEET-04, SHEET-09]

# Metrics
duration: 15min
completed: 2026-05-27
---

# Phase 37 Plan 02: Sheet Redesign Layout Summary

**CardActionsSheet refactored to stepper-centric layout (Header + EtapaStepper + fixed Footer) with ContactoRapidoModal and ListaEsperaDialog wired as Dialog triggers, and KanbanBoard stripped of orphaned NuevoTurnoModal state**

## Performance

- **Duration:** ~15 min (continuation from checkpoint)
- **Started:** 2026-05-27T11:08:09Z
- **Completed:** 2026-05-27T11:25:43Z
- **Tasks:** 3 (2 auto + 1 human-verify)
- **Files modified:** 2

## Accomplishments
- CardActionsSheet completely rewritten: 4-prop interface, flex-col sheet layout, EtapaStepper as scrollable body, fixed footer with two outline buttons
- Amber border on lista de espera button when `patient.enListaEspera` is true
- Both footer buttons open Radix Dialogs (ContactoRapidoModal, ListaEsperaDialog) without closing the parent Sheet
- "Dar un turno" and "Crear presupuesto" quick-action panel fully removed (SHEET-09)
- KanbanBoard: NuevoTurnoModal, turnoPatientId state, onOpenNuevoTurno, onOpenPresupuestos all removed
- Human checkpoint approved: visual verification confirmed all layout and interaction behaviors

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor CardActionsSheet to stepper-centric layout** - `84ca5ec` (feat)
2. **Task 2: Clean up KanbanBoard — remove orphaned turno state and props** - `bfe8505` (feat)
3. **Task 3: Visual verification of sheet redesign** - `7acee5a` (chore — human-verify approved)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `frontend/src/components/crm/CardActionsSheet.tsx` - Full rewrite: Header+Stepper+Footer layout, 4-prop interface, dialog triggers
- `frontend/src/components/crm/KanbanBoard.tsx` - Removed NuevoTurnoModal, turnoPatientId, onOpenNuevoTurno, onOpenPresupuestos

## Decisions Made
- CardActionsSheet props reduced to 4 fields — onOpenNuevoTurno and onOpenPresupuestos fully removed after their callers (NuevoTurnoModal block) were deleted from KanbanBoard
- Sheet layout uses flex-col with flex-shrink-0 header/footer and flex-1 overflow-y-auto body — avoids absolute positioning and works correctly across screen sizes
- Dialogs mount via Radix DialogPortal in document.body — no z-index or focus-trap conflicts with the parent Sheet, both dialogs confirmed working in human verification

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — TypeScript build passed with zero errors after each task. Human checkpoint approved on first verification pass.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 38 (Stepper Interactions + Contextual Actions) can begin immediately
- EtapaStepper is currently static (no onClick) — Phase 38 will add click handlers with warning logic reusing `getEtapaWarning` from `lib/crm-warnings.ts`
- CardActionsSheet footer is the stable integration point — Phase 38 may extend it with contextual action buttons per etapa

---
*Phase: 37-sheet-redesign-layout-y-stepper-ui*
*Completed: 2026-05-27*
