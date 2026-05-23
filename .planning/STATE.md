---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Agenda Operativa
status: archived
stopped_at: v1.6 milestone archived
last_updated: "2026-05-23T00:00:00.000Z"
last_activity: "2026-05-23 — v1.6 milestone archived"
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-23)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Planning next milestone — run `/gsd:new-milestone` to start v1.7

## Current Position

```
Milestone: v1.6 Agenda Operativa — SHIPPED ✅
Status:    Archived (2026-05-23)
Progress:  [██████████] 100% (6/6 plans complete)
```

Last activity: 2026-05-23 — v1.6 milestone archived

## Phase Map

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 32 | Schema + Backend Estados Extendidos | EST-01..05 | Complete (2/2 plans) |
| 33 | Widget Agenda Operativo | WID-01..06 | Complete (2/2 plans) |
| 34 | LiveTurno Simplificado | LT-01..03 | Complete (2/2 plans) |

## Accumulated Context

### Carry-forward Decisions (for v1.7)
- HCCreatorForm reutilizable compartido entre LiveTurno y PatientDrawer
- OrdenConsumo pattern: PENDIENTE → confirmación por stock admin
- Snapshot de precio en presupuesto (inmutable al momento de selección)
- Paciente.flujo: null = legacy, PENDIENTE = sin clasificar, CIRUGIA/TRATAMIENTO = clasificado
- Guard PENDIENTE-only: no sobreescribe clasificaciones existentes
- State machine turno: PENDIENTE/CONFIRMADO → EN_ESPERA → SIENDO_ATENDIDO (via iniciarSesion) → FINALIZADO; AUSENTE como rama lateral reactivable
- AlertDialogAction + e.preventDefault() para acciones async en shadcn
- Switch-session: cerrar primero, si falla abortar

### Known Tech Debt (carry-forward)
- LIVHC-05/PAC-01: tratamientos snapshot no se escribe cuando consumirInsumos=false
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend
- CALL-01: botón "Llamar" placeholder en agenda — sala de espera digital deferida
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs

## Session Continuity

Last session: 2026-05-23
Stopped at: v1.6 milestone complete
Resume file: None
Next action: `/gsd:new-milestone` — start v1.7 planning
