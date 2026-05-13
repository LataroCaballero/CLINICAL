---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Agenda Operativa
status: roadmap_ready
stopped_at: Phase 32 — not started
last_updated: "2026-05-13T00:00:00.000Z"
last_activity: 2026-05-13 — Roadmap created for v1.6 (3 phases, 14 requirements)
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-13)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Milestone v1.6 — Agenda Operativa (Phase 32 next)

## Current Position

```
Milestone: v1.6 Agenda Operativa
Phase:     32 — Schema + Backend Estados Extendidos (not started)
Plan:      —
Status:    Roadmap ready, planning phase 32
Progress:  [░░░░░░░░░░] 0% (0/3 phases)
```

Last activity: 2026-05-13 — Roadmap v1.6 created (3 phases: 32–34, 14 requirements mapped)

## Phase Map

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 32 | Schema + Backend Estados Extendidos | EST-01..05 | Not started |
| 33 | Widget Agenda Operativo | WID-01..06 | Not started |
| 34 | LiveTurno Simplificado | LT-01..03 | Not started |

## Accumulated Context

### Carry-forward Decisions (v1.5)
- HCCreatorForm reutilizable compartido entre LiveTurno y PatientDrawer
- OrdenConsumo pattern: PENDIENTE → confirmación por stock admin
- Snapshot de precio en presupuesto (inmutable al momento de selección)
- Paciente.flujo: null = legacy, PENDIENTE = sin clasificar, CIRUGIA/TRATAMIENTO = clasificado
- Guard PENDIENTE-only: no sobreescribe clasificaciones existentes

### v1.6 Key Decisions (to be recorded as phases complete)
- EN_ESPERA y SIENDO_ATENDIDO se agregan al enum EstadoTurno existente
- iniciarSesion cambia de establecer CONFIRMADO a SIENDO_ATENDIDO
- El menú ⋮ en el widget es contextual: acciones disponibles dependen del estado actual del turno
- Exit sin HC en LiveTurno llama cerrar-sesion → FINALIZADO (nunca queda turno en estado abierto)
- El timer de consulta se elimina de la UI pero duracionRealMinutos se preserva en backend

### Known Tech Debt (carry-forward)
- LIVHC-05/PAC-01: tratamientos snapshot no se escribe cuando consumirInsumos=false
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs

## Session Continuity

Last session: 2026-05-13
Stopped at: Roadmap v1.6 created — ready to plan Phase 32
Resume file: None
Next action: `/gsd:plan-phase 32`
