---
phase: 25-tratamientos-tab
plan: "02"
subsystem: frontend-pacientes
tags: [flujo, badge, ui, pacientes-table, patient-drawer]
dependency_graph:
  requires: [25-01]
  provides: [FLUJO-05]
  affects: [frontend/pacientes-lista, frontend/paciente-drawer]
tech_stack:
  added: []
  patterns: [tailwind-span-badge, named-export-component]
key_files:
  created:
    - frontend/src/app/dashboard/pacientes/components/FlujoBadge.tsx
  modified:
    - frontend/src/app/dashboard/pacientes/components/columns.tsx
    - frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx
key_decisions:
  - FlujoBadge uses plain Tailwind span — no shadcn Badge import, matching the existing estado column pattern in columns.tsx
  - Flujo column placed after estado and before ultimoTurno in createPacienteColumns
  - PacienteDetails receives paciente as any so (paciente.flujo as any) cast used — no component signature change needed
  - Badge always rendered for all 4 values including null (grey dash) per locked CONTEXT.md decision
metrics:
  duration_minutes: 7
  completed_date: "2026-04-20"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
requirements_satisfied: [FLUJO-05]
---

# Phase 25 Plan 02: Flujo Badge in Pacientes Table and Drawer Summary

**One-liner:** FlujoBadge component wires CIRUGIA/TRATAMIENTO/PENDIENTE/null into a colored span displayed in the pacientes list table column and patient drawer header.

## What Was Built

A reusable `FlujoBadge` component renders color-coded classification badges. The pacientes list table gained a dedicated "Flujo" column between "Estado" and "Último turno". The patient details drawer header now shows the same badge immediately below the patient's age, giving secretarias at-a-glance flujo visibility without opening any sub-view.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create FlujoBadge shared component | 6ce52e2 | FlujoBadge.tsx (created) |
| 2 | Add flujo column + badge in PacienteDetails | cad3a7f | columns.tsx, PacienteDetails.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `FlujoBadge.tsx` exists and exports named `FlujoBadge`
- `columns.tsx` contains `accessorKey: "flujo"` ColumnDef after estado, before ultimoTurno
- `PacienteDetails.tsx` imports and renders `FlujoBadge` in the header block
- Frontend build passes (clean build after `.next` cache cleared — cache stale issue pre-existed)

## Self-Check: PASSED

- `FlujoBadge.tsx` — FOUND
- `columns.tsx` flujo ColumnDef — FOUND (line 152)
- `PacienteDetails.tsx` FlujoBadge — FOUND (lines 29, 109)
- Commit 6ce52e2 — FOUND
- Commit cad3a7f — FOUND
