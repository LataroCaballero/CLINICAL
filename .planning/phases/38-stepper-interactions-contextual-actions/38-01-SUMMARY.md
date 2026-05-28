---
phase: 38-stepper-interactions-contextual-actions
plan: "01"
subsystem: ui
tags: [react, typescript, crm, stepper, lucide-react, tailwind]

# Dependency graph
requires:
  - phase: 37-sheet-redesign-layout-stepper-ui
    provides: EtapaStepper static component and CRM stage types/labels
provides:
  - Interactive EtapaStepper with clickable steps and contextual action buttons
  - onClickEtapa, optimisticEtapa, onPresupuestoClick, onHCClick optional props
  - 7-step STEPPER_CHAIN including PROCEDIMIENTO_REALIZADO
affects:
  - CardActionsSheet (will wire onClickEtapa to CRM warning logic)
  - Phase 38 follow-on plans that add PERDIDO modal and HC/presupuesto wiring

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic display pattern: displayEtapa = optimisticEtapa ?? etapaActual for visual state while real etapa guards clickability"
    - "Contextual CTA buttons inside stepper steps use e.stopPropagation() to prevent parent step onClick"
    - "pb-1 + button mb-3 spacing pattern when contextual button present (not pb-3 on label)"

key-files:
  created: []
  modified:
    - frontend/src/components/crm/EtapaStepper.tsx

key-decisions:
  - "STEPPER_CHAIN is hardcoded (not derived from ETAPA_ORDER) to include PROCEDIMIENTO_REALIZADO which is intentionally excluded from kanban ETAPA_ORDER"
  - "Step clickability guards on etapaActual (real), not displayEtapa (optimistic) — prevents clicking current real stage even during optimistic transitions"
  - "PERDIDO hover uses bg-red-50 (destructive signal) vs bg-muted/50 for regular steps"
  - "Removed ETAPA_ORDER import — no longer needed after STEPPER_CHAIN hardcoded"

patterns-established:
  - "Contextual button pattern: inline CTA below step label with stopPropagation, w-fit, border rounded styling"
  - "Optional interactive props pattern: all new props optional for full backwards compatibility with existing callers"

requirements-completed: [SHEET-06, SHEET-07, SHEET-08]

# Metrics
duration: 8min
completed: 2026-05-28
---

# Phase 38 Plan 01: Stepper Interactions + Contextual Actions Summary

**Interactive CRM stepper with 7-step chain, per-step click handlers, optimistic visual state, and contextual action buttons for presupuesto, HC, and procedimiento marking**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-28T01:03:55Z
- **Completed:** 2026-05-28T01:12:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced static 6-step CHAIN with interactive 7-step STEPPER_CHAIN (adds PROCEDIMIENTO_REALIZADO between PRESUPUESTO_ENVIADO and CONFIRMADO)
- All 4 new props are optional — zero breaking changes to existing callers
- Steps become clickable (cursor-pointer + hover:bg-muted/50) when onClickEtapa provided, except the real current etapaActual
- PERDIDO node gets destructive hover:bg-red-50 when clickable
- Three contextual CTA buttons: "Ver/Crear presupuesto" (ExternalLink), "Registrar HC" (FilePlus), "Marcar como realizado" (CheckCircle)
- All contextual buttons call e.stopPropagation() to prevent parent step onClick
- optimisticEtapa prop drives visual highlighting while etapaActual guards real clickability

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite EtapaStepper with interactivity + contextual buttons** - `da49bc9` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `frontend/src/components/crm/EtapaStepper.tsx` - Fully rewritten with interactive props, STEPPER_CHAIN, and contextual buttons

## Decisions Made
- STEPPER_CHAIN hardcoded to include PROCEDIMIENTO_REALIZADO since ETAPA_ORDER intentionally excludes it for kanban display
- Clickability guards on `etapaActual` (real server state), not `displayEtapa` (optimistic) — consistent with drag-and-drop pattern where optimistic is display-only
- ETAPA_ORDER import removed from this file since STEPPER_CHAIN is now hardcoded (avoids TS unused-import warning)
- "Marcar como realizado" CTA hides when displayEtapa === 'PROCEDIMIENTO_REALIZADO' (already there, button irrelevant)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EtapaStepper is fully wired for interactivity — next plan wires onClickEtapa in CardActionsSheet to CRM warning logic (getEtapaWarning from Phase 36)
- onPresupuestoClick and onHCClick ready to receive handlers from CardActionsSheet
- PERDIDO click handler ready to open LossReasonModal (existing component from v1.0)

---
*Phase: 38-stepper-interactions-contextual-actions*
*Completed: 2026-05-28*

## Self-Check: PASSED
- `frontend/src/components/crm/EtapaStepper.tsx` — FOUND (verified by write)
- Commit `da49bc9` — FOUND (confirmed by git rev-parse)
