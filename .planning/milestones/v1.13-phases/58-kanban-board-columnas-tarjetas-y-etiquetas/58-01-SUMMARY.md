---
phase: 58-kanban-board-columnas-tarjetas-y-etiquetas
plan: "01"
subsystem: frontend/crm
tags: [kanban, crm, embudo, frontend]
dependency_graph:
  requires: [57-01]
  provides: [kanban-board-columnas-tarjetas-y-etiquetas]
  affects: [frontend/src/hooks/useCRMKanban.ts, frontend/src/components/crm/KanbanBoard.tsx, frontend/src/components/crm/PatientCard.tsx]
tech_stack:
  added: []
  patterns: [conditional-badge-rendering, array-filter-todosCompletos]
key_files:
  modified:
    - frontend/src/hooks/useCRMKanban.ts
    - frontend/src/components/crm/KanbanBoard.tsx
    - frontend/src/components/crm/PatientCard.tsx
decisions:
  - PasoEstado/PasosCrm types defined in frontend mirroring crm-steps.helper.ts (no import from backend)
  - todosCompletos filter applied after applyPendingMoves to keep optimistic update behavior consistent
  - Contact label (Espera fecha / Cirugía programada) uses optional chaining on patient.pasos for safety
metrics:
  duration: 12min
  completed: 2026-07-04
  tasks_completed: 3
  files_modified: 3
---

# Phase 58 Plan 01: Kanban Board Columnas, Tarjetas y Etiquetas Summary

**One-liner:** Wired Phase 57 backend payload (pasos/todosCompletos) into Kanban frontend — reordered columns, hid completed patients (EMBUDO-04), and added orange step-indicator + "Espera fecha"/"Cirugía programada" contact labels.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend KanbanPatient interface + ETAPA_ORDER + label | 098722f | frontend/src/hooks/useCRMKanban.ts |
| 2 | Filter todosCompletos from board (EMBUDO-04) | 61eca3f | frontend/src/components/crm/KanbanBoard.tsx |
| 3 | Orange indicator + contact label in PatientCard | 3d5ff1a | frontend/src/components/crm/PatientCard.tsx |

## What Was Built

### Task 1 — useCRMKanban.ts
- Added `PasoEstado = 'completo' | 'pendiente'` type alias and `PasosCrm` interface mirroring `crm-steps.helper.ts`
- Extended `KanbanPatient` with `pasos: PasosCrm` and `todosCompletos: boolean` (payload from Phase 57)
- Reordered `ETAPA_ORDER`: `NUEVO_LEAD → TURNO_AGENDADO → CONSULTADO → PRESUPUESTO_ENVIADO → CONFIRMADO → PROCEDIMIENTO_REALIZADO → PERDIDO → SIN_CLASIFICAR` (EMBUDO-01: Sin clasificar last; EMBUDO-02: Cirugía Realizada after Confirmado)
- Changed `ETAPA_LABELS.PROCEDIMIENTO_REALIZADO` from "Procedimiento Realizado" to "Cirugía Realizada"

### Task 2 — KanbanBoard.tsx
- In `displayedColumns` useMemo: filter patients with `todosCompletos === true` before sorting by temperature
- Recalculate `total` per column to reflect visible patient count (not backend total)
- Filter applied after `applyPendingMoves` so optimistic update behavior remains correct

### Task 3 — PatientCard.tsx
- **Orange indicator (EMBUDO-03/SC3):** When `columnId === "PROCEDIMIENTO_REALIZADO"` and `!patient.todosCompletos`, renders an orange badge with dot "Pasos pendientes"
- **Contact label (CONTACTO-01/SC4):** When `columnId === "CONFIRMADO"` and `pasos.cirugia === "pendiente"`, renders "Espera fecha" badge
- **Contact label (CONTACTO-02/SC4):** When `columnId === "CONFIRMADO"` and `pasos.cirugia === "completo"`, renders "Cirugía programada" badge
- Uses `patient.pasos?.cirugia` optional chaining for safety against undefined pasos

## Success Criteria Validation

| Criteria | Status |
|----------|--------|
| (EMBUDO-01) "Sin clasificar" es la ultima columna | PASS |
| (EMBUDO-02) "Cirugía Realizada" aparece inmediatamente despues de "Confirmado" | PASS |
| (EMBUDO-03) Indicador naranja en tarjetas de Cirugía Realizada con pasos pendientes | PASS |
| (EMBUDO-04) Paciente con todos los pasos completos no aparece en el board | PASS |
| (CONTACTO-01) Tarjeta en "Confirmado" sin turno de cirugia muestra "Espera fecha" | PASS |
| (CONTACTO-02) Tarjeta en "Confirmado" con turno de cirugia muestra "Cirugía programada" | PASS |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All data is wired from the backend payload (Phase 57).

## Threat Flags

No new security-relevant surface introduced. All display logic operates on already-scoped `getKanban` payload (profesionalId filtered server-side).

## Self-Check: PASSED

- frontend/src/hooks/useCRMKanban.ts: modified (confirmed)
- frontend/src/components/crm/KanbanBoard.tsx: modified (confirmed)
- frontend/src/components/crm/PatientCard.tsx: modified (confirmed)
- Commit 098722f: feat(58-01): extend KanbanPatient with pasos+todosCompletos, reorder ETAPA_ORDER, relabel Cirugía Realizada
- Commit 61eca3f: feat(58-01): filter todosCompletos patients from kanban board (EMBUDO-04)
- Commit 3d5ff1a: feat(58-01): add orange indicator for Cirugía Realizada + contact label for Confirmado
