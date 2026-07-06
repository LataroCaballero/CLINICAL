---
phase: 26-schema-foundation-catalog-crud
plan: "06"
subsystem: frontend-configuracion
tags: [tratamientos, insumos, catalog, crud, ui]
dependency_graph:
  requires: [26-02, 26-04, 26-05]
  provides: [GestionTratamientos-insumos-modal]
  affects: [configuracion-page]
tech_stack:
  added: []
  patterns: [InsumosEditor-embed, mutation-chain-on-save]
key_files:
  modified:
    - frontend/src/app/dashboard/configuracion/components/GestionTratamientos.tsx
    - frontend/src/hooks/useTratamientosProfesional.ts
decisions:
  - "Show InsumosEditor only when editing existing tratamiento (not on create) — new tratamiento has no id yet, so set-insumos requires it"
  - "Added useSetInsumosTratamiento and useRecalcularPrecioTratamiento hooks inline in plan 06 since plan 05 SUMMARY was absent but hooks file was already partially updated"
  - "Widened modal to max-w-xl with overflow scroll to accommodate InsumosEditor table"
metrics:
  duration_seconds: 316
  completed_date: "2026-04-22T21:27:04Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase 26 Plan 06: GestionTratamientos Insumos Integration Summary

GestionTratamientos extended with inline InsumosEditor in edit modal, Costo insumos table column showing precioBase, and Recalcular desde insumos button.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add "Costo insumos" column to table | 07494ae | GestionTratamientos.tsx |
| 2 | Add InsumosEditor section and Recalcular button to edit modal | 423452e | GestionTratamientos.tsx |

## What Was Built

- **Table column "Costo insumos":** New column after "Precio" in the tratamientos table. Displays `precioBase` formatted as `$N.NN` (Argentine locale) or `'—'` when null.
- **TypeScript type upgrade:** `GestionTratamientos` now uses `TratamientoConInsumos` throughout (state, handlers, props), enabling access to `precioBase` and `insumos` fields.
- **New hooks added to useTratamientosProfesional.ts:** `useSetInsumosTratamiento` (PUT /tratamientos/:id/insumos) and `useRecalcularPrecioTratamiento` (POST /tratamientos/:id/recalcular-precio).
- **Edit modal — InsumosEditor section:** Visible only when editing an existing tratamiento. Pre-populated from `tratamiento.insumos` on modal open. Reports changes via `setInsumosLocal` callback.
- **Edit modal — Amber warning:** Shown statically when any insumo in `insumosLocal` has `costoBase === null`, informing user that $0 will be used for those items on recalculation.
- **Edit modal — Recalcular button:** Calls `recalcularMutation.mutateAsync(selectedTratamiento.id)`. Disabled when no insumos or mutation pending.
- **Save handler chain:** On update, calls `updateMutation` then `setInsumosMutation` (batch replace) before closing modal. Idempotent — always sends full desired list.
- **Modal UX:** Widened to `max-w-xl` with `max-h-[90vh] overflow-y-auto` to accommodate the additional InsumosEditor content.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] InsumosEditor was a named export, not default**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `InsumosEditor.tsx` exports `InsumosEditor` as a named export (`export function InsumosEditor`); plan spec said to use default import
- **Fix:** Changed import to `import { InsumosEditor, type InsumoLocal } from './InsumosEditor'`
- **Files modified:** GestionTratamientos.tsx
- **Commit:** 423452e

**2. [Rule 2 - Missing functionality] useSetInsumosTratamiento and useRecalcularPrecioTratamiento were missing**
- **Found during:** Pre-task dependency check
- **Issue:** Plan 05 SUMMARY.md absent; hooks not yet added to useTratamientosProfesional.ts
- **Fix:** Added both hooks to useTratamientosProfesional.ts as part of plan 06 execution
- **Files modified:** frontend/src/hooks/useTratamientosProfesional.ts
- **Commit:** 423452e

## Self-Check

- [x] GestionTratamientos.tsx exists and modified
- [x] useTratamientosProfesional.ts has useSetInsumosTratamiento and useRecalcularPrecioTratamiento
- [x] Commits 07494ae and 423452e exist
- [x] TypeScript noEmit passes with no errors
