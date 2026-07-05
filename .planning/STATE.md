---
gsd_state_version: 1.0
milestone: v1.13
milestone_name: Embudo CRM Accionable
status: completed
stopped_at: Phase 59 context gathered
last_updated: "2026-07-05T02:49:48.186Z"
last_activity: 2026-07-05 -- Phase 59 marked complete
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
  percent: 75
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-03)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 59 — stepper-accionable

## Current Position

Phase: 59 — COMPLETE
Plan: 3 of 3
Status: Phase 59 complete
Last activity: 2026-07-05 -- Phase 59 marked complete

Progress: [████████░░] 83%

## Performance Metrics

**Velocity:**

- Total plans completed this milestone: 0
- Average duration: ~4 min/plan (carryover from v1.12)
- Total execution time: 0 min

*Updated after each plan completion*

## Accumulated Context

### Decisions

Full v1.12 decision log en `.planning/PROJECT.md` (Key Decisions) y `.planning/milestones/v1.12-ROADMAP.md`.

Key pending decision for Phase 57: Reuse/rename `PROCEDIMIENTO_REALIZADO` enum value vs. add `CIRUGIA_REALIZADA` — impacts Prisma schema migration and all consumers of the enum (dashboard funnel, frontend constants, STEPPER_CHAIN).

- [Phase ?]: mapeo paso→etapa en EtapaStepper Phase 59-01
- [Phase ?]: filtrado client-side D-05 en EtapaStepper Phase 59-01

### Carry-forward from v1.12

- `getKanban` (`pacientes.service.ts:619`) hoy NO expone: `esCirugia`, `Cirugia.fecha/estado`, ni estado de pasos (HC/presupuesto/consentimiento/indicaciones). Phase 57 lo amplía.
- Forward-only guard duplicado en `turnos.service.ts:30` y `presupuestos.service.ts:26` — EMBUDO-05 relaja para movimientos de nuevo turno (no para auto-transiciones del sistema).
- `STEPPER_CHAIN` hardcoded en `EtapaStepper.tsx` incluye `PROCEDIMIENTO_REALIZADO` — actualizar si se renombra la etapa.
- `HCCreatorDialog` (wizard HC), `GenerarPresupuestoModal` (presupuesto), `NuevoTurnoModal` (agenda) son los 3 targets de quick-actions del stepper (Phase 59).

### Known Tech Debt (carry-forward)

- HistorialClinicoPanel y TurnoHCModal no migrados a HCEntryContent.tsx (diferido).
- AppointmentDetailModal y CalendarGrid no migrados a getEstadoTurnoChip (diferido).
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend.
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod.
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs.

## Deferred Items

Items de v1.12 diferidos al cierre (audit PASSED; son stubs de verificación humana, no bloqueantes):

| Category | Item | Status |
|----------|------|--------|
| uat_gap | 51-HUMAN-UAT | partial |
| uat_gap | 52-HUMAN-UAT | partial |
| uat_gap | 55-HUMAN-UAT | partial |
| verification_gap | 52/53/54/55-VERIFICATION | human_needed |
| verification_gap | 10/27/28/29/30/49-VERIFICATION (carryovers) | human_needed |
| quick_task | 1-eliminar-dropdown-tipo-de-consulta-de-hc | missing |
| Phase 59-stepper-accionable P01 | 18 | 3 tasks | 1 files |

## Session Continuity

Last session: 2026-07-05T02:14:17.649Z
Stopped at: Phase 59 context gathered
Resume file: None
