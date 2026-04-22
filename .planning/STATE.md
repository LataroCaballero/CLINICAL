---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Catálogos Clínicos y Flujos de Atención
status: defining_requirements
stopped_at: Defining requirements
last_updated: "2026-04-22T00:00:00.000Z"
last_activity: 2026-04-22 — Milestone v1.5 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Defining requirements for v1.5

## Current Position

```
Milestone: v1.5 Catálogos Clínicos y Flujos de Atención
Phase:     Not started (defining requirements)
Plan:      —
Status:    Defining requirements
Progress:  [░░░░░░░░░░] 0%
```

Last activity: 2026-04-22 — Milestone v1.5 started

## Accumulated Context

### Decisions (carry-forward from v1.4)
- Paciente.flujo: null = legacy, PENDIENTE = unclassified, CIRUGIA/TRATAMIENTO = classified
- Auto-update flujo in crearTurno() is best-effort (.catch() without await)
- Guard PENDIENTE-only: never overwrites CIRUGIA/TRATAMIENTO classifications
- CRM filter: [{flujo: CIRUGIA}, {flujo: null}] — preserves legacy data
- Future date boundary uses `hoy.setHours(23, 59, 59, 999)` for HC entries
- Retroactive fecha pattern established in Phase 20 historia-clinica

### Known Tech Debt (carry-forward)
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod antes de deploy
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs

## Session Continuity

Last session: 2026-04-22
Stopped at: Requirements definition
Resume file: None
