---
phase: 26-schema-foundation-catalog-crud
plan: "05"
subsystem: frontend-components
tags: [insumos, combobox, tratamientos, catalog, shared-component]
dependency_graph:
  requires: [26-04]
  provides: [InsumosEditor component, TratamientoConInsumos hooks]
  affects: [26-06, 26-07]
tech_stack:
  added: []
  patterns: [Command+Popover combobox, uncontrolled component with onChange callback, TanStack Query mutation]
key_files:
  created:
    - frontend/src/app/dashboard/configuracion/components/InsumosEditor.tsx
  modified:
    - frontend/src/hooks/useTratamientosProfesional.ts
decisions:
  - "useInventario() called without profesionalId param — hook reads professional context internally via useEffectiveProfessionalId"
  - "InsumosEditor is fully uncontrolled: parent passes initialInsumos + onChange, no external state dependency"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-22"
  tasks_completed: 2
  files_changed: 2
requirements_satisfied: [CATLOG-01, CATLOG-03]
---

# Phase 26 Plan 05: InsumosEditor Shared Component Summary

**One-liner:** Shared Popover+Command combobox with inline editable table for managing product-quantity insumo lists, reusable in Tratamientos and Cirugias modals.

## What Was Built

### Task 1: InsumosEditor.tsx (new component)

Created `frontend/src/app/dashboard/configuracion/components/InsumosEditor.tsx` as a `"use client"` React component.

Key behaviors:
- Renders a Popover+Command combobox labeled "+ Agregar insumo" that searches the professional's stock by product name
- Selecting a product inserts it into local state with `cantidad: 1` — duplicate guard excludes already-added products from the dropdown
- Compact `<table>` renders only when `insumos.length > 0` with columns: Producto | Cantidad (inline Input type=number) | × remove button
- `useEffect` syncs local state when `initialInsumos` prop changes (modal reset pattern)
- Exports: `InsumoLocal` interface + `InsumosEditor` named component

### Task 2: useTratamientosProfesional.ts (updated)

- Changed `useTratamientosProfesional` return type from `Tratamiento[]` to `TratamientoConInsumos[]` (imported from `@/types/tratamiento`)
- Added `useSetInsumosTratamiento(profesionalId?)` — `PUT /tratamientos/:id/insumos` with full insumos array replacement
- Added `useRecalcularPrecioTratamiento(profesionalId?)` — `POST /tratamientos/:id/recalcular-precio` to sync `precioBase` after insumo changes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] useInventario hook signature mismatch**
- **Found during:** Task 1
- **Issue:** Plan specified `useInventario(profesionalId)` but the actual hook signature is `useInventario(filters?: { bajoStock?: boolean })`. The hook reads professional context internally via `useEffectiveProfessionalId`.
- **Fix:** Called `useInventario()` without arguments. The `profesionalId` prop on `InsumosEditor` is kept in the interface for API compatibility (consumed by Plans 06/07) but not passed to the inventory hook.
- **Files modified:** InsumosEditor.tsx
- **Commit:** f1c1054

## Commits

| Hash    | Message                                                                          |
| ------- | -------------------------------------------------------------------------------- |
| f1c1054 | feat(26-05): create InsumosEditor shared combobox+table component                |
| 18af044 | feat(26-05): update useTratamientosProfesional to TratamientoConInsumos + mutations |

## Self-Check: PASSED

- [x] `InsumosEditor.tsx` exists at expected path
- [x] `useTratamientosProfesional.ts` updated with TratamientoConInsumos
- [x] Both commits exist in git log
- [x] TypeScript passes with no errors
