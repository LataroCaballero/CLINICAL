---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Agenda Operativa
status: defining_requirements
stopped_at: Milestone started
last_updated: "2026-05-13T00:00:00.000Z"
last_activity: 2026-05-13 — Milestone v1.6 started — Agenda Operativa
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-13)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Milestone v1.6 — Agenda Operativa (defining requirements)

## Current Position

```
Milestone: v1.6 Agenda Operativa
Phase:     Not started (defining requirements)
Plan:      —
Status:    Defining requirements
Progress:  [░░░░░░░░░░] 0%
```

Last activity: 2026-05-13 — Milestone v1.6 started

## Accumulated Context

### Carry-forward Decisions (v1.5)
- HCCreatorForm reutilizable compartido entre LiveTurno y PatientDrawer
- OrdenConsumo pattern: PENDIENTE → confirmación por stock admin
- Snapshot de precio en presupuesto (inmutable al momento de selección)
- Paciente.flujo: null = legacy, PENDIENTE = sin clasificar, CIRUGIA/TRATAMIENTO = clasificado
- Guard PENDIENTE-only: no sobreescribe clasificaciones existentes

### Known Tech Debt (carry-forward)
- LIVHC-05/PAC-01: tratamientos snapshot no se escribe cuando consumirInsumos=false
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs

## Session Continuity

Last session: 2026-05-13
Stopped at: Milestone v1.6 started — requirements phase
Resume file: None
