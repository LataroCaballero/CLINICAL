---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: CRM Flexible
status: roadmap_ready
stopped_at: Phase 35 — ready to plan
last_updated: "2026-05-23T00:00:00.000Z"
last_activity: "2026-05-23 — Roadmap v1.7 created (4 phases, 14 requirements)"
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-23)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 35 — Backend Foundation (v1.7 CRM Flexible)

## Current Position

```
Milestone: v1.7 CRM Flexible
Phase:     35 — Backend Foundation
Plan:      Not started
Status:    Roadmap ready — awaiting plan-phase 35
Progress:  [░░░░░░░░░░░░░░░░░░░░] 0% (0/4 phases)

Next command: /gsd:plan-phase 35
```

## Milestone Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 35 | Backend Foundation | CRM-01 (backend), CRM-04 | Not started |
| 36 | Drag-and-Drop + Warning Infrastructure | CRM-01 (frontend), CRM-02, CRM-03 | Not started |
| 37 | Sheet Redesign — Layout y Stepper UI | SHEET-01, SHEET-02, SHEET-03, SHEET-04, SHEET-09 | Not started |
| 38 | Stepper Interactions + Contextual Actions | CRM-05, SHEET-05, SHEET-06, SHEET-07, SHEET-08 | Not started |

## Accumulated Context

### Carry-forward Decisions (from v1.6)
- HCCreatorForm reutilizable compartido entre LiveTurno y PatientDrawer — usar en SHEET-07
- OrdenConsumo pattern: PENDIENTE → confirmación por stock admin
- Snapshot de precio en presupuesto (inmutable al momento de selección)
- Paciente.flujo: null = legacy, PENDIENTE = sin clasificar, CIRUGIA/TRATAMIENTO = clasificado
- Guard PENDIENTE-only: no sobreescribe clasificaciones existentes al auto-clasificar
- State machine turno: PENDIENTE/CONFIRMADO → EN_ESPERA → SIENDO_ATENDIDO → FINALIZADO; AUSENTE lateral reactivable
- AlertDialogAction + e.preventDefault() para acciones async en shadcn
- Switch-session: cerrar primero, si falla abortar

### v1.7 Key Design Decisions
- Forward-only guard para auto-transiciones: la auto-transición a etapa X no se ejecuta si el paciente ya está en una etapa más avanzada que X
- Warning no bloqueante: el drag-and-drop siempre persiste; el toast es informativo, no impeditivo
- Stepper clickeable comparte la misma warning logic que el drag-and-drop (CRM-05 = CRM-01/02/03 en el stepper)
- PERDIDO en stepper abre LossReasonModal (componente ya existente en v1.0)
- HCCreatorForm reutilizado directamente desde SHEET-07 sin duplicar lógica
- ContactoRapidoModal es un Dialog (no Sheet anidado) para evitar z-index y focus-trap issues

### Known Tech Debt (carry-forward)
- LIVHC-05/PAC-01: tratamientos snapshot no se escribe cuando consumirInsumos=false
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend
- CALL-01: botón "Llamar" placeholder en agenda — sala de espera digital deferida
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs

## Session Continuity

**To resume:** Read `.planning/STATE.md` + `.planning/ROADMAP.md` + current phase plan (`.planning/phases/phase-35/PLAN.md` when created).

**Blocked by:** Nothing — ready to start Phase 35.
