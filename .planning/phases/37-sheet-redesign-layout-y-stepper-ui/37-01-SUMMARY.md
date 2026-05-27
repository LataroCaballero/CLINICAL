---
phase: 37-sheet-redesign-layout-y-stepper-ui
plan: "01"
subsystem: ui
tags: [react, crm, shadcn, dialog, stepper, badge]

# Dependency graph
requires:
  - phase: 36-drag-and-drop-warning-infrastructure
    provides: KanbanPatient type, useUpdateEtapaCRM, crm-warnings lib
provides:
  - CRMFlujoBadge component with full Spanish labels
  - EtapaStepper vertical 6-step chain with PERDIDO separator
  - ContactoRapidoModal Dialog for contacto registration
  - ListaEsperaDialog Dialog for wait-list opt-in/out
affects: [37-02, 38]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dialog-from-Sheet pattern: Dialog mounts via DialogPortal in document.body, no z-index/focus-trap conflict with parent Sheet"
    - "EtapaStepper: static vertical stepper with done/current/future state derived from ETAPA_ORDER index"

key-files:
  created:
    - frontend/src/components/crm/CRMFlujoBadge.tsx
    - frontend/src/components/crm/EtapaStepper.tsx
    - frontend/src/components/crm/ContactoRapidoModal.tsx
    - frontend/src/components/crm/ListaEsperaDialog.tsx
  modified: []

key-decisions:
  - "EtapaStepper has no onClick handlers — interactivity deferred to Phase 38 (CHAIN click to trigger etapa change + warning)"
  - "CRMFlujoBadge is a new component in /crm/ — FlujoBadge in /pacientes/ is untouched to avoid breaking abbreviated-label patient view"
  - "ContactoRapidoModal calls onOpenChange(false) only for its own Dialog; parent Sheet remains open"
  - "ListaEsperaDialog shows two-button UI (Guardar/Quitar) when enListaEspera=true, single-button when false — state-driven title and actions"

patterns-established:
  - "Dialog-from-Sheet: use shadcn Dialog (not nested Sheet) for modals triggered inside a Sheet to avoid z-index and focus-trap issues"
  - "CHAIN = ETAPA_ORDER.filter(e => e !== 'PERDIDO') — 6-step chain excluding PERDIDO, which renders after a dashed divider"

requirements-completed: [SHEET-01, SHEET-02, SHEET-03, SHEET-04]

# Metrics
duration: 12min
completed: 2026-05-27
---

# Phase 37 Plan 01: CRM Sub-components (Badge + Stepper + Dialogs) Summary

**Four CRM building blocks created: FlujoBadge with full Spanish labels, 6-step vertical EtapaStepper with PERDIDO separator, ContactoRapidoModal Dialog, and ListaEsperaDialog with opt-in/out dual mode**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-27T11:05:51Z
- **Completed:** 2026-05-27T11:17:00Z
- **Tasks:** 2
- **Files modified:** 4 (created)

## Accomplishments
- CRMFlujoBadge renders full Spanish labels (Cirugía/Tratamiento/Pendiente) with color-coded inline badges
- EtapaStepper renders 6-step vertical chain with done/current/future circle styles; PERDIDO node below dashed divider highlighted red only when patient.etapaCRM === "PERDIDO"
- ContactoRapidoModal is a shadcn Dialog (not Sheet) with LLAMADA/MENSAJE/PRESENCIAL tipo selector matching existing card pattern; closes independently from parent Sheet
- ListaEsperaDialog pre-fills textarea from patient.comentarioListaEspera; shows Guardar + Quitar buttons when already in list, single Agregar button otherwise

## Task Commits

Each task was committed atomically:

1. **Task 1: CRMFlujoBadge + EtapaStepper** - `e370792` (feat)
2. **Task 2: ContactoRapidoModal + ListaEsperaDialog** - `10b50cb` (feat)

## Files Created/Modified
- `frontend/src/components/crm/CRMFlujoBadge.tsx` - Badge with full Spanish labels for CIRUGIA/TRATAMIENTO/PENDIENTE/null
- `frontend/src/components/crm/EtapaStepper.tsx` - Static 6-step vertical stepper; PERDIDO after dashed divider; no onClick handlers
- `frontend/src/components/crm/ContactoRapidoModal.tsx` - Dialog for contacto registration with tipo selector and nota textarea
- `frontend/src/components/crm/ListaEsperaDialog.tsx` - Dialog for wait-list management with dual mode (add vs manage)

## Decisions Made
- EtapaStepper has no onClick handlers — these will be added in Phase 38 along with the etapa-change warning logic
- CRMFlujoBadge is a separate file from the existing FlujoBadge in /pacientes/ which uses abbreviated labels; both coexist intentionally
- ContactoRapidoModal calls only onOpenChange(false) on success — the parent Sheet is controlled by its own state and remains open

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 sub-components exported and TypeScript-clean
- Plan 37-02 can now import CRMFlujoBadge, EtapaStepper, ContactoRapidoModal, and ListaEsperaDialog to wire them into the refactored CardActionsSheet layout
- No blockers

## Self-Check: PASSED
- FOUND: frontend/src/components/crm/CRMFlujoBadge.tsx
- FOUND: frontend/src/components/crm/EtapaStepper.tsx
- FOUND: frontend/src/components/crm/ContactoRapidoModal.tsx
- FOUND: frontend/src/components/crm/ListaEsperaDialog.tsx
- FOUND: e370792 (feat(37-01): add CRMFlujoBadge and EtapaStepper components)
- FOUND: 10b50cb (feat(37-01): add ContactoRapidoModal and ListaEsperaDialog components)

---
*Phase: 37-sheet-redesign-layout-y-stepper-ui*
*Completed: 2026-05-27*
