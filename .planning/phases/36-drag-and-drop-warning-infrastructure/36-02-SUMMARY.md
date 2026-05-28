---
phase: 36-drag-and-drop-warning-infrastructure
plan: "02"
subsystem: ui
tags: [kanban, crm, drag-and-drop, toast, react]

# Dependency graph
requires:
  - phase: 36-drag-and-drop-warning-infrastructure
    provides: "getEtapaWarning in lib/crm-warnings.ts and KanbanPatient.flujo field (36-01)"
provides:
  - "handleDragEnd in KanbanBoard.tsx with non-blocking amber toast warnings for CRM-02 and CRM-03"
  - "Updated onError text: 'No se pudo guardar el movimiento. Intentá de nuevo.'"
affects:
  - "37-sheet-redesign (uses KanbanBoard as CRM entry point)"
  - "38-stepper-interactions (will import getEtapaWarning for stepper clicks)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Non-blocking warning toast: move optimistically, fire toast.warning simultaneously, no rollback"
    - "Snap-back preserved via onSettled (not onError) — warning integration does not alter rollback logic"

key-files:
  created: []
  modified:
    - "frontend/src/components/crm/KanbanBoard.tsx"

key-decisions:
  - "Toast fires synchronously before updateEtapa call — same event loop tick as setPendingMoves"
  - "onSettled remains the sole cleanup point for pendingMoves ensuring snap-back works on any backend error"
  - "No toast deduplication added in this phase — deferred per CONTEXT.md"

patterns-established:
  - "CRM warning pattern: getEtapaWarning(patient, targetColumn) → toast.warning if non-null, move always proceeds"

requirements-completed: [CRM-01, CRM-02, CRM-03]

# Metrics
duration: 26h (includes human-verify checkpoint)
completed: "2026-05-25"
---

# Phase 36 Plan 02: Drag-and-Drop Warning Integration Summary

**Non-blocking amber toast warnings wired into KanbanBoard.handleDragEnd for PRESUPUESTO_ENVIADO (CRM-02) and CONFIRMADO (CRM-03) via getEtapaWarning, with snap-back logic preserved**

## Performance

- **Duration:** ~26h (includes human-verify checkpoint wait)
- **Started:** 2026-05-24T20:27:05-03:00
- **Completed:** 2026-05-25T22:20:45Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 1

## Accomplishments

- Integrated `getEtapaWarning` import and call into `handleDragEnd` in `KanbanBoard.tsx`
- Toast warning fires simultaneously with the optimistic move — not blocking, not rolling back
- Updated `onError` text from "Verificá los requisitos" to "No se pudo guardar el movimiento. Intentá de nuevo."
- User verified all four drag-and-drop scenarios in browser (CRM-02, CRM-03, normal move, PERDIDO modal)

## Task Commits

Each task was committed atomically:

1. **Task 1: Integrar getEtapaWarning en handleDragEnd de KanbanBoard.tsx** - `23b4391` (feat)
2. **Task 2: Verificar warnings en kanban drag-and-drop** - `0a34201` (chore — checkpoint approved)

## Files Created/Modified

- `frontend/src/components/crm/KanbanBoard.tsx` - Added import of `getEtapaWarning`, warning call before `updateEtapa`, updated `onError` text

## Decisions Made

- Toast fires before `updateEtapa` in the same synchronous block as `setPendingMoves` — ensures the warning is visible even if the backend responds instantly
- `onSettled` remains the only cleanup point for `pendingMoves` so snap-back works regardless of whether the toast was shown

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 36 complete. The warning infrastructure (crm-warnings.ts + KanbanBoard integration) is ready for Phase 38 to reuse `getEtapaWarning` in the stepper click handler (CRM-05).
- Phase 37 (Sheet Redesign) can proceed independently — it does not depend on warning logic.

---
*Phase: 36-drag-and-drop-warning-infrastructure*
*Completed: 2026-05-25*
