---
phase: 36-drag-and-drop-warning-infrastructure
plan: 01
subsystem: ui
tags: [crm, kanban, typescript, warnings, drag-and-drop]

# Dependency graph
requires:
  - phase: 35-backend-foundation
    provides: flujo field on pacientes/kanban endpoint (p.flujo ?? null)

provides:
  - getEtapaWarning pure function in frontend/src/lib/crm-warnings.ts
  - flujo field typed on KanbanPatient in useCRMKanban.ts

affects:
  - 36-02 (KanbanBoard integration — imports getEtapaWarning and uses flujo)
  - 38 (stepper interactions — reuses getEtapaWarning from crm-warnings.ts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Warning logic in dedicated lib file (not coupled to component) for cross-phase reuse"
    - "Union literal types for backend enums on frontend (no Prisma enum imports)"

key-files:
  created:
    - frontend/src/lib/crm-warnings.ts
  modified:
    - frontend/src/hooks/useCRMKanban.ts

key-decisions:
  - "getEtapaWarning lives in lib/crm-warnings.ts (not in a component) so Phase 38 stepper can import it without coupling to KanbanBoard"
  - "flujo typed as union literal 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' | null — not as Prisma enum — consistent with project pattern"
  - "CONFIRMADO warning uses optional chaining (presupuesto?.estado !== 'ACEPTADO') covering both null presupuesto and non-ACEPTADO estado in one condition"

patterns-established:
  - "crm-warnings.ts pattern: pure function receiving KanbanPatient + targetEtapa, returns string | null — stateless, testable, importable from any layer"

requirements-completed: [CRM-02, CRM-03]

# Metrics
duration: 6min
completed: 2026-05-24
---

# Phase 36 Plan 01: Warning Infrastructure Summary

**Pure `getEtapaWarning` function and `KanbanPatient.flujo` field — the two contracts enabling non-blocking drag-and-drop warnings in Phase 36 Plan 02 and the stepper in Phase 38**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-24T23:22:24Z
- **Completed:** 2026-05-24T23:28:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `frontend/src/lib/crm-warnings.ts` with `getEtapaWarning(patient, targetEtapa)` — pure function covering all 6 warning/null cases from CONTEXT.md
- Extended `KanbanPatient` interface with `flujo: 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' | null` — backend already delivers this field from Phase 35
- TypeScript compiles cleanly with no new errors across entire frontend codebase

## Task Commits

Each task was committed atomically:

1. **Task 1: Create frontend/src/lib/crm-warnings.ts** - `75326b1` (feat)
2. **Task 2: Add flujo field to KanbanPatient** - `ea71822` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `frontend/src/lib/crm-warnings.ts` — New file: exports `getEtapaWarning(patient: KanbanPatient, targetEtapa: EtapaCRM): string | null`
- `frontend/src/hooks/useCRMKanban.ts` — Added `flujo: 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' | null` as last field of `KanbanPatient` interface

## Decisions Made

- `getEtapaWarning` imports types from `@/hooks/useCRMKanban` — no type duplication, single source of truth
- Warning text strings are exactly as specified in CONTEXT.md locked decisions — not paraphrased
- `flujo` field added with comment `// Phase 36 — expuesto por backend desde Phase 35` for traceability

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `getEtapaWarning` is ready to be imported by KanbanBoard (Plan 02) for toast warnings on drag-and-drop
- `KanbanPatient.flujo` is available for any component rendering kanban cards to display flow-specific UI
- Phase 38 stepper can import `getEtapaWarning` directly without touching KanbanBoard

---
*Phase: 36-drag-and-drop-warning-infrastructure*
*Completed: 2026-05-24*
