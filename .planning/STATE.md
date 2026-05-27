---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: CRM Flexible
status: completed
stopped_at: Completed 37-01-PLAN.md
last_updated: "2026-05-27T11:08:09.149Z"
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 6
  completed_plans: 5
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-23)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 37 — Sheet Redesign Layout y Stepper UI (v1.7 CRM Flexible)

## Current Position

```
Milestone: v1.7 CRM Flexible
Phase:     37 — Sheet Redesign Layout y Stepper UI — In Progress
Plan:      01 of 02 complete
Status:    37-01 complete — CRM sub-components built
Progress:  [██████████] 97% (34/35 plans)

Last completed: 37-01-PLAN.md (2026-05-27)
Next: 37-02 — CardActionsSheet layout refactor wiring the 4 sub-components
```

## Milestone Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 35 | Backend Foundation | CRM-01 (backend), CRM-04 | In Progress (1/2 plans done) |
| 36 | Drag-and-Drop + Warning Infrastructure | CRM-01 (frontend), CRM-02, CRM-03 | Complete (2/2 plans done) |
| 37 | Sheet Redesign — Layout y Stepper UI | SHEET-01, SHEET-02, SHEET-03, SHEET-04, SHEET-09 | In Progress (1/2 plans done) |
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
- [35-01] Remover validación presupuesto ACEPTADO para CONFIRMADO: el profesional puede mover libremente cualquier etapa CRM; solo PERDIDO requiere motivoPerdida
- [36-01] getEtapaWarning en lib/crm-warnings.ts (no en componente) para que Phase 38 stepper lo importe sin acoplar a KanbanBoard
- [36-01] CONFIRMADO warning usa optional chaining (presupuesto?.estado !== 'ACEPTADO') cubriendo null y non-ACEPTADO en una sola condición
- [36-02] Toast fires synchronously before updateEtapa call — warning visible even on instant backend response
- [36-02] onSettled remains sole cleanup point for pendingMoves — snap-back logic unaffected by warning integration
- [37-01] EtapaStepper has no onClick handlers — interactivity deferred to Phase 38 (CHAIN click + warning)
- [37-01] CRMFlujoBadge is separate from FlujoBadge in /pacientes/ — both coexist, CRM uses full labels, patients uses abbreviated
- [37-01] ContactoRapidoModal calls onOpenChange(false) only for its own Dialog; parent Sheet state is independent

### Known Tech Debt (carry-forward)
- LIVHC-05/PAC-01: tratamientos snapshot no se escribe cuando consumirInsumos=false
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend
- CALL-01: botón "Llamar" placeholder en agenda — sala de espera digital deferida
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs

## Session Continuity

**To resume:** Read `.planning/STATE.md` + `.planning/ROADMAP.md` + Phase 37 plan files.

**Last session:** 2026-05-27T11:08:09.147Z

**Stopped at:** Completed 37-01-PLAN.md

**Blocked by:** Nothing — Phase 36 complete. Ready to begin Phase 37 (Sheet Redesign).
