---
phase: 25-tratamientos-tab
plan: "01"
subsystem: backend-types
tags: [flujo, pacientes, turnos, types, dto]
dependency_graph:
  requires: []
  provides: [flujo-in-paciente-lista-dto, flujoPaciente-in-turnos-rango, frontend-flujo-types]
  affects: [plan-25-02, plan-25-03]
tech_stack:
  added: []
  patterns: [dto-field-extension, prisma-select-extension, frontend-type-augmentation]
key_files:
  created: []
  modified:
    - backend/src/modules/pacientes/dto/paciente-lista.dto.ts
    - backend/src/modules/pacientes/pacientes.service.ts
    - backend/src/modules/turnos/turnos.service.ts
    - frontend/src/types/pacients.ts
    - frontend/src/hooks/useTurnosRangos.ts
decisions:
  - flujo added as string | null to PacienteListaDto to avoid circular-import risk with FlujoPaciente enum
  - flujoPaciente in TurnoRango.tipoTurno typed as string | null (not enum union) to keep hooks decoupled from backend types
  - flujo added to both PacienteListItem and PacienteDetalle so Plan 02 (flujo badge) has the field available for drawer
metrics:
  duration_minutes: 8
  completed_date: "2026-04-20T14:48:39Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
---

# Phase 25 Plan 01: Backend Contract Fields for Flujo and TratamientosTab Summary

**One-liner:** Additive DTO/type changes exposing `flujo` in patient list and `tipoTurno.flujoPaciente` in turnos rango so Plans 02 and 03 can build against complete contracts.

## What Was Built

Two minimal additive changes to backend responses and matching frontend type updates:

1. `PacienteListaDto` gains `flujo?: string | null` — mapped from `p.flujo ?? null` in `obtenerListaPacientes()`. No Prisma query change needed (full Paciente row was already fetched).

2. `obtenerTurnosPorRango()` tipoTurno select gains `flujoPaciente: true` — makes the enum value available in the appointment calendar response.

3. Frontend `PacienteListItem` and `PacienteDetalle` gain `flujo?: 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' | null` — inline union, no separate type export.

4. Frontend `TurnoRango.tipoTurno` type gains `flujoPaciente?: string | null` — uses `string | null` (not enum union) to stay decoupled from backend types.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add flujo to PacienteListaDto and service mapping | 36b6e30 |
| 2 | Add flujoPaciente to turnos rango select + update frontend types | 91322a3 |

## Verification Results

- Backend build: EXIT 0
- Frontend build: EXIT 0
- `grep flujoPaciente turnos.service.ts` shows line 402 in obtenerTurnosPorRango select
- `grep flujo paciente-lista.dto.ts` shows flujo?: string | null
- `grep flujo pacients.ts` shows flujo in both PacienteListItem (line 24) and PacienteDetalle (line 58)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- backend/src/modules/pacientes/dto/paciente-lista.dto.ts — FOUND: flujo field
- backend/src/modules/pacientes/pacientes.service.ts — FOUND: flujo: p.flujo ?? null
- backend/src/modules/turnos/turnos.service.ts — FOUND: flujoPaciente: true at line 402
- frontend/src/types/pacients.ts — FOUND: flujo in both interfaces
- frontend/src/hooks/useTurnosRangos.ts — FOUND: flujoPaciente in TurnoRango
- Commit 36b6e30 — FOUND
- Commit 91322a3 — FOUND
