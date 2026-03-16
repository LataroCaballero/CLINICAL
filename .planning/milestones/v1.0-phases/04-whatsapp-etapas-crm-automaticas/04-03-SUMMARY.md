---
phase: 04-whatsapp-etapas-crm-automaticas
plan: "03"
subsystem: crm-transitions
tags: [crm, turnos, kanban, backend, frontend]
dependency_graph:
  requires: [04-01]
  provides: [CRM-01, CRM-02]
  affects: [turnos.service, pacientes.service, useCRMKanban, KanbanBoard]
tech_stack:
  added: []
  patterns: [prisma-auto-transition, kanban-column-filter]
key_files:
  created: []
  modified:
    - backend/src/modules/turnos/turnos.service.ts
    - backend/src/modules/pacientes/pacientes.service.ts
    - frontend/src/hooks/useCRMKanban.ts
    - frontend/src/components/crm/KanbanBoard.tsx
decisions:
  - "whatsappOptIn added to obtenerAgendaDiaria and obtenerTurnosPorRango paciente selects — required by CalendarGrid"
  - "cerrarSesion fetches turno esCirugia/etapaCRM in separate findUnique before update — avoids changing update return shape"
  - "PROCEDIMIENTO_REALIZADO kept in EtapaCRM type and ETAPA_LABELS for DB compat — only removed from ETAPA_ORDER (kanban display)"
  - "CALIENTE in TemperaturaPaciente type is intentional — only removed from EtapaCRM; calcularScore tempWeight CALIENTE key is correct"
metrics:
  duration: 2min
  completed_date: "2026-02-27"
  tasks_completed: 2
  files_modified: 4
---

# Phase 4 Plan 3: CRM Auto-Transitions + Kanban Cleanup Summary

JWT auth with refresh rotation using jose library

**One-liner:** CRM auto-transitions wired in TurnosService (crearTurno sets TURNO_AGENDADO, cerrarSesion sets CONSULTADO/PROCEDIMIENTO_REALIZADO) and Kanban cleaned to 7 visible stages.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CRM auto-transitions in TurnosService + kanban cleanup in PacientesService | ec68ed8 | turnos.service.ts, pacientes.service.ts |
| 2 | Update frontend kanban types and KanbanBoard component | d1f2f48 | useCRMKanban.ts, KanbanBoard.tsx |

## Changes Made

### Task 1 — Backend

**turnos.service.ts — crearTurno():**
- Added `EtapaCRM` to `@prisma/client` import
- Converted `return this.prisma.turno.create(...)` to store result in `turno`
- After creation: `findUnique` paciente to check `etapaCRM`; if null → `update` to `EtapaCRM.TURNO_AGENDADO`
- Returns `turno`
- Lines modified: ~15 (import + create pattern + 12 CRM lines)

**turnos.service.ts — cerrarSesion():**
- Pre-fetch `turnoInfo` via `findUnique` with `esCirugia`, `pacienteId`, `paciente.etapaCRM`
- After `turno.update` to FINALIZADO: if `esCirugia` → set `PROCEDIMIENTO_REALIZADO`; else if `etapaCRM === TURNO_AGENDADO` → set `CONSULTADO`
- Lines modified: ~22

**turnos.service.ts — calendar queries:**
- Added `whatsappOptIn: true` to paciente selects in `obtenerAgendaDiaria` and `obtenerTurnosPorRango`

**pacientes.service.ts — getKanban():**
- Removed `PROCEDIMIENTO_REALIZADO` from `columnas` object
- Patients with `etapaCRM = PROCEDIMIENTO_REALIZADO` now fall to `SIN_CLASIFICAR` bucket via existing else branch

**Kanban stages before → after:**
- Before: SIN_CLASIFICAR, NUEVO_LEAD, TURNO_AGENDADO, CONSULTADO, PRESUPUESTO_ENVIADO, PROCEDIMIENTO_REALIZADO, CONFIRMADO, PERDIDO (8)
- After: SIN_CLASIFICAR, NUEVO_LEAD, TURNO_AGENDADO, CONSULTADO, PRESUPUESTO_ENVIADO, CONFIRMADO, PERDIDO (7)

### Task 2 — Frontend

**useCRMKanban.ts:**
- `ETAPA_LABELS`: renamed `TURNO_AGENDADO` → "Consulta Agendada", `CONSULTADO` → "Consulta Realizada"
- `ETAPA_ORDER`: removed `PROCEDIMIENTO_REALIZADO` — 7 items now
- `EtapaCRM` type: no change (kept PROCEDIMIENTO_REALIZADO for DB compat, no SEGUIMIENTO_ACTIVO or CALIENTE)

**KanbanBoard.tsx:**
- `sortedColumns`: added `.filter(col => ETAPA_ORDER.includes(col.etapa as EtapaCRM))` before `.sort()`
- Defensive guard in case backend sends PROCEDIMIENTO_REALIZADO column

## Verification

```
# Backend type check
npx tsc --noEmit → clean (only pre-existing e2e-spec warning)

# CRM transitions in turnos service
grep TURNO_AGENDADO|CONSULTADO|PROCEDIMIENTO_REALIZADO → lines 121, 129, 697, 699, 702

# Kanban no SEGUIMIENTO_ACTIVO
grep SEGUIMIENTO_ACTIVO pacientes.service.ts → no output

# Frontend type check
npx tsc --noEmit → Exit 0 (clean)

# Frontend kanban hook
grep SEGUIMIENTO_ACTIVO|CALIENTE|PROCEDIMIENTO useCRMKanban.ts
→ line 10: PROCEDIMIENTO_REALIZADO (type, correct)
→ line 14: CALIENTE (TemperaturaPaciente, not EtapaCRM — correct)
→ line 54: PROCEDIMIENTO_REALIZADO in ETAPA_LABELS (correct)
→ line 59: comment noting exclusion from ETAPA_ORDER (correct)
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
