---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Catálogos Clínicos y Flujos de Atención
status: completed
stopped_at: Completed 29-02-PLAN.md — human-verify checkpoint approved
last_updated: "2026-05-04T21:49:20.798Z"
last_activity: 2026-04-29 — Plan 29-02 complete; CambiarFlujoModal + PencilLine trigger added to PatientDrawer with optimistic update; requirements PAC-02 and PAC-03 satisfied
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 13
  completed_plans: 13
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 27 — HC Integration LiveTurno + PatientDrawer

## Current Position

```
Milestone: v1.5 Catálogos Clínicos y Flujos de Atención
Phase:     29 of 31 (PatientDrawer Flujo Action)
Plan:      2 of 2 complete (awaiting human-verify checkpoint)
Status:    Plan 29-02 complete — CambiarFlujoModal + PencilLine trigger, optimistic update, sonner toast with CRM action
Progress:  [██████████] 100%
```

Last activity: 2026-04-29 — Plan 29-02 complete; CambiarFlujoModal + PencilLine trigger added to PatientDrawer with optimistic update; requirements PAC-02 and PAC-03 satisfied

## Accumulated Context

### Key Decisions for v1.5 (from research)

- **26-07 recalcularPrecioBase uses Inventario.precioActual:** Per-profesional inventory price used for cost recalculation (not Producto.costoBase global baseline) — ensures multi-tenant cost isolation in cirugías.
- **26-07 skip setInsumos on empty create:** GestionCirugias skips setInsumosMutation call when insumosLocal is empty on create — avoids redundant API round-trip and spinner delay.
- **26-07 GestionCirugias InsumosEditor both modes:** InsumosEditor shown in create and edit modals — createMutation returns id immediately, so setInsumosCirugia can be called in the same save handler. Recalcular button restricted to edit mode only.
- **26-06 InsumosEditor edit-only:** InsumosEditor section is shown only in edit modal (selectedTratamiento != null) — new tratamiento has no id yet so set-insumos requires an existing record.
- **26-05 useInventario no profesionalId param:** `useInventario()` reads professional context internally via `useEffectiveProfessionalId` — do not pass profesionalId to it; InsumosEditor keeps the prop for API compatibility only.
- **26-05 InsumosEditor uncontrolled:** Component manages its own state; parent passes `initialInsumos` + `onChange` callback. `useEffect` syncs on initialInsumos change for modal reset pattern.
- **26-04 api named export:** `{ api }` is a named export from `@/lib/api`, not a default export — all hooks must use `import { api } from '@/lib/api'`.
- **26-02 setInsumos transaction pattern:** Uses `$transaction([deleteMany, ...creates])` for atomic insumos replacement — prevents partial state; client sends full desired list.
- **26-02 null costoBase:** Treated as 0 via `?? 0` in recalcularPrecioBase reduce — products with no cost set are treated as free, not NaN.
- **26-01 Migration workaround:** Used `prisma db push` + `migrate resolve` instead of `migrate dev` — Supabase pgBouncer shadow DB cannot replay migration 20260415221758_flujo_paciente. Live DB is correct.
- **Price snapshot on PresupuestoItem:** Add `precioUnitario Decimal` + `cantidad Int @default(1)` in Phase 26 migration. Never re-read price from catalog for financial documents.
- **ultimoTratamientoId design:** Use query-on-read (ORDER BY fecha DESC LIMIT 1 join) rather than denormalized FK — prevents corruption from retroactive entries.
- **27-01 OrdenConsumo atomic creation:** crearEntrada() pre-fetches insumos outside $transaction (pgBouncer pattern), aggregates quantities by productoId via Map, then creates OrdenConsumo inside the same $transaction as the HC entry — no orphaned orders possible.
- **27-01 consumirInsumos backward compat:** consumirInsumos=false or empty tratamientoIds skips OrdenConsumo creation entirely; existing HC entry creation paths unaffected.
- **27-01 turnoId nullable pattern:** turnoId present = call from LiveTurno context, absent = call from PatientDrawer — same API endpoint serves both flows.
- **OrdenConsumo pattern:** HC save creates OrdenConsumo { estado: PENDIENTE } only. Actual MovimientoStock SALIDA happens at explicit stock admin confirmation.
- **Flujo change CRM side effects:** updateFlujo() must run etapaCRM assignment inside $transaction; frontend must invalidate ['kanban'], ['tratamientos'], ['listaAccion'] caches.
- **TratamientoInsumo / CirugiaInsumo:** Explicit join tables required (implicit M2M cannot carry `cantidad` field).
- **Phase ordering:** Phase 26 is strict prerequisite; Phases 27/28/29 can run in parallel after it; Phases 30/31 require Phase 27 output.
- **27-02 HCCreatorForm autonomous:** HCCreatorForm receives all context via props (pacienteId, profesionalId, turnoId?, obraSocialId?, showDatePicker?, onSaved?) — does not import useLiveTurnoStore, enabling reuse from PatientDrawer.
- **27-02 anyHasInsumos guard:** consumirInsumos checkbox only shown when at least one selected tratamiento has insumos — prevents UI confusion when no stock consumption is possible.
- **27-02 tratamiento_en_consultorio free text collapsed:** Free text textarea for tratamiento_en_consultorio is hidden by default behind "+ Agregar notas libres" toggle — keeps UI clean for the primary multi-select use case.
- **27-03 HCCreatorDialog no turnoId:** turnoId intentionally omitted from HCCreatorDialog — creates HC entry without turno context (HCDR-02). onSaved closes the dialog.
- **27-03 obraSocialId via (paciente as any):** Field exposed via API but not in typed Paciente interface — cast consistent with existing AutorizacionesPacienteSection usage in PatientDrawer.tsx.
- **29-01 updateFlujo etapaCRM: null:** updateFlujo() sets etapaCRM: null (not 'SIN_CLASIFICAR' string) — DB enum has no SIN_CLASIFICAR value; kanban maps null to that label at read time.
- **29-01 ContactoLog in updateFlujo guarded by profesionalId:** ContactoLog creation inside updateFlujo $transaction is guarded by profesionalId non-null check — legacy patients still get their flujo updated without error.
- **29-02 CambiarFlujoModal pre-close pattern:** onOptimisticUpdate + onOpenChange(false) fire before mutation.mutate so UI updates immediately without waiting for network.
- **29-02 onRevert sets optimisticFlujo to null:** displayFlujo falls back to paciente.flujo from TanStack Query server cache on error — no manual cache manipulation needed.

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

Last session: 2026-05-04T21:43:56.585Z
Stopped at: Completed 29-02-PLAN.md — human-verify checkpoint approved
Resume file: None
