---
phase: 50-hc-completa-en-patientsheet
plan: "01"
subsystem: frontend/patient
tags: [historia-clinica, patientsheet, ui, chips, badges]
dependency_graph:
  requires: []
  provides: [HCEntryContent.tsx, FreeEntryPreview-chips, FreeEntryFullContent-chips]
  affects: [frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx]
tech_stack:
  added: []
  patterns: [shared-render-component, badge-chips, shadcn-badge]
key_files:
  created:
    - frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx
  modified:
    - frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx
decisions:
  - "Removed line-clamp-3 from free-entry preview container so chips wrap fully; kept it only for TemplateEntryPreview text"
  - "Local duplicate types (ZonaContenido, ContenidoPrimeraVez, ContenidoLibre) removed from HistoriaClinica.tsx and sourced from shared HCEntryContent.tsx via type alias"
  - "FreeEntryFullContent delegates entirely to HCEntryFullContent (not eliminated) to keep the local function signature intact for ExpandedEntryContent"
metrics:
  duration: "~3 min"
  completed_date: "2026-06-24"
  tasks_completed: 3
  tasks_total: 4
  files_created: 1
  files_modified: 1
status: paused_at_checkpoint
checkpoint: Task 4 — visual verification (human-verify)
---

# Phase 50 Plan 01: HC Chips en PatientSheet Summary

**One-liner:** Shared render component (HCEntryContent.tsx) with color chips (zona/diagnósticos/tratamientos badges) wired into PatientSheet card list and detail modal, replacing plain-text truncated summaries, with visual parity to HistorialClinicoPanel.

## What Was Built

A new shared client component `HCEntryContent.tsx` exports two components:

- `HCEntryChips` — card/preview variant: renders zona + diagnósticos + tratamientos as color-coded badges (zona=secondary capitalize bold, diagnósticos=outline, tratamientos=blue), handles both shape v1.9 (`zonas[]`) and legacy plano (`c.diagnostico` + `c.tratamientos`), plus free text passthrough. No prices or observaciones shown in card view.
- `HCEntryFullContent` — detail/modal variant: chips row at top of each zona section + observaciones labeled block (muted bg) + treatments with ARS prices (green) + Total (green) + comentario block. Handles both shapes, free text, and generic object fallback.

Both components are wired in `HistoriaClinica.tsx`:
- `FreeEntryPreview` (card list) → delegates to `<HCEntryChips>`
- `FreeEntryFullContent` (detail modal) → delegates to `<HCEntryFullContent>`
- `line-clamp-3` was moved to template-only branch; free-entry chips wrap fully
- Local duplicate type definitions removed; `ContenidoEntrada` aliased from shared export

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create shared HCEntryContent.tsx (HCSHEET-01) | b62f96f | frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx (created) |
| 2 | Wire chips in FreeEntryPreview card (HCSHEET-02) | 7e488e4 | frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx |
| 3 | Wire HCEntryFullContent in detail modal (HCSHEET-03) | b0e4cb2 | frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx |

## Paused at Checkpoint

**Task 4:** Visual verification of chip parity in PatientSheet — awaiting human review.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Out-of-Scope Notes

Pre-existing `no-explicit-any` ESLint errors in `getTituloEntrada` function (HistoriaClinica.tsx lines ~414-416) were present before this plan. My changes **reduced** total issues from 4 to 2 by removing the `any` cast in the old `FreeEntryFullContent`. These 2 remaining are not introduced by this plan and are out of scope.

## Self-Check: PASSED

- FOUND: frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx
- FOUND: commit b62f96f (Task 1 — create HCEntryContent.tsx)
- FOUND: commit 7e488e4 (Task 2 — wire FreeEntryPreview)
- FOUND: commit b0e4cb2 (Task 3 — wire FreeEntryFullContent)
