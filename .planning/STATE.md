---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: CRM Flexible
status: defining_requirements
stopped_at: Defining requirements for v1.7
last_updated: "2026-05-23T00:00:00.000Z"
last_activity: "2026-05-23 — Milestone v1.7 started"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-23)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Defining requirements — v1.7 CRM Flexible

## Current Position

```
Phase: Not started (defining requirements)
Plan:  —
Status: Defining requirements
Last activity: 2026-05-23 — Milestone v1.7 started
```

## Accumulated Context

### Carry-forward Decisions (from v1.6)
- HCCreatorForm reutilizable compartido entre LiveTurno y PatientDrawer
- OrdenConsumo pattern: PENDIENTE → confirmación por stock admin
- Snapshot de precio en presupuesto (inmutable al momento de selección)
- Paciente.flujo: null = legacy, PENDIENTE = sin clasificar, CIRUGIA/TRATAMIENTO = clasificado
- Guard PENDIENTE-only: no sobreescribe clasificaciones existentes
- State machine turno: PENDIENTE/CONFIRMADO → EN_ESPERA → SIENDO_ATENDIDO → FINALIZADO; AUSENTE lateral reactivable
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
