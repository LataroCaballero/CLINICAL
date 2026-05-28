---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: CRM Flexible
status: completed
stopped_at: Completed 39-01-PLAN.md
last_updated: "2026-05-28T16:46:29.126Z"
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 10
  completed_plans: 10
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-23)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 37 — Sheet Redesign Layout y Stepper UI (v1.7 CRM Flexible)

## Current Position

```
Milestone: v1.7 CRM Flexible (tech debt phase)
Phase:     39 — CRM Tech Debt Gap Closure — In Progress
Plan:      01+02 of 03 complete (39-01 rechazar guard + ACEPTADO-first; 39-02 STEPPER_CHAIN)
Status:    39-01 complete — rechazar() etapasProtegidas guard (TD-1) + getKanban ACEPTADO-first (TD-3)
Progress:  [██████████] 100% (39/39 plans)

Last completed: 39-01-PLAN.md (2026-05-28)
Next: 39-03 — remaining tech debt (if any)
```

## Milestone Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 35 | Backend Foundation | CRM-01 (backend), CRM-04 | In Progress (1/2 plans done) |
| 36 | Drag-and-Drop + Warning Infrastructure | CRM-01 (frontend), CRM-02, CRM-03 | Complete (2/2 plans done) |
| 37 | Sheet Redesign — Layout y Stepper UI | SHEET-01, SHEET-02, SHEET-03, SHEET-04, SHEET-09 | Complete (2/2 plans done) |
| 38 | Stepper Interactions + Contextual Actions | CRM-05, SHEET-05, SHEET-06, SHEET-07, SHEET-08 | In Progress (2/2 plans done) |
| 39 | CRM Tech Debt Gap Closure | TD-1, TD-2, TD-3 | In Progress (2/3 plans done) |

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
- [37-02] CardActionsSheet props reduced to 4 fields — onOpenNuevoTurno and onOpenPresupuestos fully removed after NuevoTurnoModal block deleted from KanbanBoard
- [37-02] Sheet flex-col layout with flex-shrink-0 header/footer and flex-1 overflow-y-auto body — no absolute positioning
- [37-02] Dialogs mount via Radix DialogPortal in document.body inside Sheet — no z-index or focus-trap conflicts (human-verified)
- [38-01] STEPPER_CHAIN hardcoded (not derived from ETAPA_ORDER) to include PROCEDIMIENTO_REALIZADO which is intentionally excluded from kanban
- [38-01] Step clickability guards on etapaActual (real server state), not displayEtapa (optimistic) — display-only optimism, real-state guards interaction
- [38-01] PERDIDO hover uses bg-red-50 (destructive signal) vs bg-muted/50 for regular steps
- [38-02] handleStepClick guards on patient.etapaCRM (real server state), not optimisticEtapa — display-only optimism, real-state guards interaction
- [38-02] onOpenDrawerWithView is required (not optional) on CardActionsSheet — KanbanBoard always provides it, keeping the type contract strict
- [39-02] STEPPER_CHAIN swap is string-identity safe: contextual button checks use string comparison not index, so no secondary changes needed after the two-entry swap
- [39-01] rechazar() mirrors rechazarByToken() guard exactly — etapasProtegidas list [CONFIRMADO, PROCEDIMIENTO_REALIZADO] blocks PERDIDO write for protected stages
- [39-01] getKanban drops take:1, filters RECHAZADO via where clause, picks ACEPTADO-first via presupuestoSeleccionado — eliminates false CONFIRMADO warning for multi-presupuesto patients

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

**Last session:** 2026-05-28T16:43:18.870Z

**Stopped at:** Completed 39-01-PLAN.md

**Blocked by:** Nothing — 39-01 complete. rechazar() now guards etapasProtegidas before writing PERDIDO (TD-1); getKanban returns ACEPTADO-first presupuesto eliminating false CONFIRMADO warnings (TD-3). TD-1 and TD-3 closed.
