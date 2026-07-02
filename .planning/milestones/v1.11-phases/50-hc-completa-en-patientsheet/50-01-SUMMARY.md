---
phase: 50-hc-completa-en-patientsheet
plan: "01"
subsystem: ui
tags: [historia-clinica, patientsheet, ui, chips, badges, react, typescript]

# Dependency graph
requires: []
provides:
  - "HCEntryContent.tsx — shared render component exporting HCEntryChips (card) and HCEntryFullContent (detail)"
  - "FreeEntryPreview wired to HCEntryChips — color badge chips in HC list cards"
  - "FreeEntryFullContent wired to HCEntryFullContent — chips + observacion + prices + total in HC detail modal"
  - "Both v1.9 zonas[] shape and legacy flat shape handled in all render contexts"
affects: [future-hc-consolidation, patientsheet-improvements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared render component pattern for dual-shape JSONB content (zonas[] v1.9 vs legacy flat)"
    - "HCEntryChips/HCEntryFullContent split: card variant (chips only) vs detail variant (chips + prices + observaciones)"

key-files:
  created:
    - frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx
  modified:
    - frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx

key-decisions:
  - "Shared HCEntryContent.tsx component created: HCEntryChips (card) + HCEntryFullContent (detail) handle both v1.9 zonas[] and legacy shapes with color badge chips"
  - "line-clamp-3 moved to TemplateEntryPreview-only so chip badges wrap fully in card preview"
  - "Local duplicate types removed from HistoriaClinica.tsx; ContenidoEntrada aliased from shared export"
  - "FreeEntryFullContent delegates entirely to HCEntryFullContent to keep local function signature intact for ExpandedEntryContent"

patterns-established:
  - "Pattern: Shared HC render component — extract render logic into dedicated component handling both content shapes with card and detail variants"
  - "Pattern: Chip convention — zona: Badge secondary capitalize font-semibold; diagnosticos: Badge outline; tratamientos: Badge bg-blue-50 text-blue-700 border-blue-200"

requirements-completed: [HCSHEET-01, HCSHEET-02, HCSHEET-03]

# Metrics
duration: ~45min
completed: 2026-06-24
---

# Phase 50 Plan 01: HC Chips en PatientSheet Summary

**Shared HCEntryContent.tsx component with color badge chips (zona/diagnosticos/tratamientos) wired into PatientSheet card list and detail modal, replacing plain-text truncated summaries and achieving visual parity with HistorialClinicoPanel and TurnoHCModal — visual verification approved**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-06-24T14:40:00Z
- **Completed:** 2026-06-24T16:15:00Z
- **Tasks:** 4 (3 auto + 1 human-verify checkpoint — approved)
- **Files modified:** 2

## Accomplishments
- Created `HCEntryContent.tsx` with `HCEntryChips` (card variant: zona/diagnosticos/tratamientos badges, no prices) and `HCEntryFullContent` (detail variant: chips + observacion block + per-treatment ARS prices + total + comment), handling both v1.9 `zonas[]` and legacy flat shapes
- Wired `FreeEntryPreview` (HC list cards) to `HCEntryChips` — replaced plain-text join summary with color badges
- Wired `FreeEntryFullContent` (HC detail modal) to `HCEntryFullContent` — full visual parity with LiveTurno HistorialClinicoPanel
- Visual verification approved: v1.9 shape, legacy shape, free-text entries, and template entries all render correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared HCEntryContent.tsx (HCSHEET-01)** - `b62f96f` (feat)
2. **Task 2: Wire HCEntryChips into FreeEntryPreview card list (HCSHEET-02)** - `7e488e4` (feat)
3. **Task 3: Wire HCEntryFullContent into FreeEntryFullContent detail modal (HCSHEET-03)** - `b0e4cb2` (feat)
4. **Task 4: Visual verification checkpoint** — Approved by user (no code commit)

**Plan metadata (prior checkpoint run):** `dabd645` (docs: complete plan — paused at checkpoint)

## Files Created/Modified
- `frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx` — New shared render component: `HCEntryChips` (card chips), `HCEntryFullContent` (rich detail with chips + observaciones + prices), type exports, both content shapes
- `frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx` — `FreeEntryPreview` delegates to `HCEntryChips`; `FreeEntryFullContent` delegates to `HCEntryFullContent`; `line-clamp-3` moved to template-only path; duplicate type interfaces removed

## Decisions Made
- Used a dedicated shared component (`HCEntryContent.tsx`) rather than inlining chip logic in `HistoriaClinica.tsx` — mirrors the existing pattern and enables future consolidation without touching `HistorialClinicoPanel.tsx` or `TurnoHCModal.tsx`
- `line-clamp-3` removed from the chip card wrapper (applied only to `TemplateEntryPreview`) so badge chips can wrap naturally without being clipped mid-row
- `FreeEntryFullContent` in `HistoriaClinica.tsx` kept as a thin delegation wrapper (not eliminated) to maintain the local function signature expected by `ExpandedEntryContent`

## Deviations from Plan

None - plan executed exactly as written. TypeScript compiled without new errors; ESLint clean on both modified files; visual verification approved by user.

### Out-of-Scope Notes

Pre-existing `no-explicit-any` ESLint errors in `getTituloEntrada` function (HistoriaClinica.tsx lines ~414-416) were present before this plan. Changes in this plan reduced total issues (by removing the old `any` cast in `FreeEntryFullContent`). Remaining pre-existing issues are out of scope and logged as tech debt.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 50 / Plan 01 complete — milestone v1.11 (HC Completa en Ficha de Paciente) fully delivered
- `HCEntryContent.tsx` is available for future consolidation: `HistorialClinicoPanel.tsx` and `TurnoHCModal.tsx` could be migrated to use the shared component (currently deferred per plan scope)
- No blockers

---
*Phase: 50-hc-completa-en-patientsheet*
*Completed: 2026-06-24*

## Self-Check: PASSED

- FOUND: frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx
- FOUND: commit b62f96f (Task 1 — create HCEntryContent.tsx)
- FOUND: commit 7e488e4 (Task 2 — wire FreeEntryPreview)
- FOUND: commit b0e4cb2 (Task 3 — wire FreeEntryFullContent)
- Visual verification: APPROVED by user
