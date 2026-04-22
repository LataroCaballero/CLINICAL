---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Catálogos Clínicos y Flujos de Atención
status: planning
stopped_at: Phase 26 context gathered
last_updated: "2026-04-22T20:29:14.903Z"
last_activity: 2026-04-22 — Roadmap v1.5 created; 6 phases (26–31), 27/27 requirements mapped
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 26 — Schema Foundation + Catalog CRUD

## Current Position

```
Milestone: v1.5 Catálogos Clínicos y Flujos de Atención
Phase:     26 of 31 (Schema Foundation + Catalog CRUD)
Plan:      — (not yet planned)
Status:    Ready to plan
Progress:  [░░░░░░░░░░] 0%
```

Last activity: 2026-04-22 — Roadmap v1.5 created; 6 phases (26–31), 27/27 requirements mapped

## Accumulated Context

### Key Decisions for v1.5 (from research)

- **Price snapshot on PresupuestoItem:** Add `precioUnitario Decimal` + `cantidad Int @default(1)` in Phase 26 migration. Never re-read price from catalog for financial documents.
- **ultimoTratamientoId design:** Use query-on-read (ORDER BY fecha DESC LIMIT 1 join) rather than denormalized FK — prevents corruption from retroactive entries.
- **OrdenConsumo pattern:** HC save creates OrdenConsumo { estado: PENDIENTE } only. Actual MovimientoStock SALIDA happens at explicit stock admin confirmation.
- **Flujo change CRM side effects:** updateFlujo() must run etapaCRM assignment inside $transaction; frontend must invalidate ['kanban'], ['tratamientos'], ['listaAccion'] caches.
- **TratamientoInsumo / CirugiaInsumo:** Explicit join tables required (implicit M2M cannot carry `cantidad` field).
- **Phase ordering:** Phase 26 is strict prerequisite; Phases 27/28/29 can run in parallel after it; Phases 30/31 require Phase 27 output.

### Carry-forward Decisions (v1.4)
- Paciente.flujo: null = legacy, PENDIENTE = unclassified, CIRUGIA/TRATAMIENTO = classified
- Guard PENDIENTE-only: never overwrites existing CIRUGIA/TRATAMIENTO classifications
- CRM filter: [{flujo: CIRUGIA}, {flujo: null}] — preserves legacy data

### Known Tech Debt
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs

## Session Continuity

Last session: 2026-04-22T20:29:14.900Z
Stopped at: Phase 26 context gathered
Resume file: .planning/phases/26-schema-foundation-catalog-crud/26-CONTEXT.md
