---
phase: 38-stepper-interactions-contextual-actions
plan: "02"
subsystem: ui
tags: [react, crm, kanban, optimistic-updates, stepper, tanstack-query, sonner]

# Dependency graph
requires:
  - phase: 38-stepper-interactions-contextual-actions
    plan: "01"
    provides: "EtapaStepper with interactive props (onClickEtapa, onPresupuestoClick, onHCClick, optimisticEtapa)"
provides:
  - CardActionsSheet with full stepper interaction logic and optimistic updates
  - LossReasonModal integration inside sheet for PERDIDO transitions
  - HCCreatorDialog integration inside sheet for HC creation
  - Presupuesto navigation via onOpenDrawerWithView prop
  - KanbanBoard wired with onOpenDrawerWithView
affects: [phase-38, crm, kanban]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hooks called unconditionally before if (!patient) guard — React rules of hooks compliance"
    - "handleStepClick: guard same etapa → LossReasonModal for PERDIDO → warning toast (non-blocking) → optimisticEtapa → mutate → onSettled clears"
    - "onSettled as sole cleanup point for optimisticEtapa — both success and error paths"

key-files:
  created: []
  modified:
    - frontend/src/components/crm/CardActionsSheet.tsx
    - frontend/src/components/crm/KanbanBoard.tsx

key-decisions:
  - "[38-02] handleStepClick guards on patient.etapaCRM (real server state), not optimisticEtapa — consistent with EtapaStepper's click-guard pattern from Plan 01"
  - "[38-02] onOpenDrawerWithView is required (not optional) — KanbanBoard always provides it"

patterns-established:
  - "optimistic state management: setOptimisticEtapa before mutate, clear in onSettled — mirrors KanbanBoard's pendingMoves pattern"
  - "LossReasonModal and HCCreatorDialog mount inside SheetContent via Radix DialogPortal — no z-index/focus-trap conflicts"

requirements-completed: [CRM-05, SHEET-05]

# Metrics
duration: 2min
completed: 2026-05-28
---

# Phase 38 Plan 02: Stepper Interactions + Contextual Actions — Wiring Summary

**CardActionsSheet now handles stepper clicks end-to-end: optimistic updates, PERDIDO via LossReasonModal, HC creation via HCCreatorDialog, and presupuesto navigation via new onOpenDrawerWithView prop**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-28T01:07:17Z
- **Completed:** 2026-05-28T01:08:22Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- CardActionsSheet fully wired with useUpdateEtapaCRM and useEffectiveProfessionalId hooks
- handleStepClick implements non-blocking warning toast then optimistic state → mutate → onSettled cleanup
- PERDIDO transitions routed through LossReasonModal (never calls updateEtapa directly)
- HCCreatorDialog mounted inside sheet, gated on profesionalId availability
- handlePresupuestoClick closes sheet and opens patient drawer on presupuestos view
- KanbanBoard passes onOpenDrawerWithView reusing existing drawerInitialView state
- Zero TypeScript errors across both modified files

## Task Commits

Each task was committed atomically:

1. **Task 1: Update CardActionsSheet — optimistic state, hooks, modals, navigation** - `2eb46ab` (feat)
2. **Task 2: Update KanbanBoard — pass onOpenDrawerWithView to CardActionsSheet** - `fd1014e` (feat)

## Files Created/Modified
- `frontend/src/components/crm/CardActionsSheet.tsx` - Full rewrite with onOpenDrawerWithView prop, optimisticEtapa state, hooks, and all handler functions
- `frontend/src/components/crm/KanbanBoard.tsx` - Added onOpenDrawerWithView prop to CardActionsSheet usage

## Decisions Made
- `handleStepClick` guards on `patient.etapaCRM` (real server state), not `optimisticEtapa` — consistent with EtapaStepper Plan 01 decision that clickability uses real state
- `onOpenDrawerWithView` is required (not optional) — KanbanBoard always provides it, keeping the type contract strict

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CRM-05 and SHEET-05 complete — interactive stepper with full behavioral logic
- SHEET-06 (ContactoRapidoModal improvements), SHEET-07 (HC integration), SHEET-08 ready to proceed
- All behavioral logic for the stepper is in CardActionsSheet — future phases can extend without touching EtapaStepper

## Self-Check: PASSED

- FOUND: `frontend/src/components/crm/CardActionsSheet.tsx`
- FOUND: `frontend/src/components/crm/KanbanBoard.tsx`
- FOUND: `.planning/phases/38-stepper-interactions-contextual-actions/38-02-SUMMARY.md`
- FOUND commit: `2eb46ab`
- FOUND commit: `fd1014e`

---
*Phase: 38-stepper-interactions-contextual-actions*
*Completed: 2026-05-28*
