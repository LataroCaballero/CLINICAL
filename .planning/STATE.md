---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Catálogos Clínicos y Flujos de Atención
status: executing
stopped_at: Completed 26-04-PLAN.md
last_updated: "2026-04-22T21:20:00Z"
last_activity: "2026-04-22 — Plan 26-04 complete; frontend TypeScript types (TratamientoConInsumos, CirugiaCatalogo) and TanStack Query hooks (useCirugiasCatalogo + 5 mutations) established"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 7
  completed_plans: 4
  percent: 57
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
Plan:      5 of 7
Status:    In progress
Progress:  [█████░░░░░] 57%
```

Last activity: 2026-04-22 — Plan 26-04 complete; frontend TypeScript types (TratamientoConInsumos, CirugiaCatalogo) and TanStack Query hooks (useCirugiasCatalogo + 5 mutations) established

## Accumulated Context

### Key Decisions for v1.5 (from research)

- **26-04 api named export:** `{ api }` is a named export from `@/lib/api`, not a default export — all hooks must use `import { api } from '@/lib/api'`.
- **26-02 setInsumos transaction pattern:** Uses `$transaction([deleteMany, ...creates])` for atomic insumos replacement — prevents partial state; client sends full desired list.
- **26-02 null costoBase:** Treated as 0 via `?? 0` in recalcularPrecioBase reduce — products with no cost set are treated as free, not NaN.
- **26-01 Migration workaround:** Used `prisma db push` + `migrate resolve` instead of `migrate dev` — Supabase pgBouncer shadow DB cannot replay migration 20260415221758_flujo_paciente. Live DB is correct.
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

Last session: 2026-04-22T21:20:00Z
Stopped at: Completed 26-04-PLAN.md
Resume file: None
