# Feature Research

**Domain:** Clinical catalogs + clinical workflow integration — v1.5 Catálogos Clínicos y Flujos de Atención for Argentine aesthetic surgery clinic SaaS
**Researched:** 2026-04-22
**Confidence:** HIGH (codebase analysis, Prisma schema inspection, competitor patterns from Pabau, Zenoti, Nubimed, PatientNow) / MEDIUM (UX patterns for pending stock orders — inferred from domain conventions, not directly observed in source code)

> **Scope:** This document covers ONLY features for v1.5. Everything shipped through v1.4 is not re-researched.
> v1.5 goal: connect treatment/surgery catalogs with LiveTurno HC, presupuestos, and stock; improve flujo/HC flows from PatientDrawer.

---

## Context: What Exists Today (Post-v1.4)

### Existing Catalog Model
`Tratamiento` model per-profesional has: nombre, descripcion, precio, indicaciones, procedimiento, duracionMinutos, activo. No relation to stock Productos. No FK from HC entries. No surgery-specific catalog.

### Existing Stock Model
`Producto` + `Inventario` (per profesional) + `MovimientoStock` (with motivo, tipo enum). `MovimientoStock.practicaId` links to `PracticaRealizada` (OS billing). No link from `MovimientoStock` to `HistoriaClinicaEntrada` or `Tratamiento`. Stock deduction is currently triggered at billing/practica layer, not at clinical documentation layer.

### Existing Presupuesto Model
`PresupuestoItem` has: descripcion (free text), precioTotal, orden. No FK to any catalog — entirely free text.

### Existing HC Entry
`HistoriaClinicaEntrada` has: contenido (JSONB), answers (JSONB), template FK, status. No FK to `Tratamiento` catalog. LiveTurno HC tab uses a wizard/creator UI.

### What Competitors Do (Confirmed, MEDIUM confidence)
- **Pabau**: Links services to consumables; deducts inventory automatically when treatment is administered. Practitioner selects units used during charting session.
- **Zenoti**: AI-assisted charting, service-linked forms, product deduction tied to invoice/checkout.
- **Nubimed** (Argentine market): "Generate quick quotes from treatment catalog" — catalog-driven presupuesto creation.
- **PatientNow**: Unified EMR + inventory + billing purpose-built for plastic surgery; catalog drives quote, quote drives booking, booking drives chart, chart drives billing.
- Industry norm: catalog → quote → consent → clinical note → stock deduction → billing. This is the expected flow in aesthetic/plastic surgery SaaS.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist given what the system already does. Missing these = system feels disconnected and incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Insumos (stock products) linked to `Tratamiento` catalog with quantities | Every aesthetic clinic software links consumables to services (Pabau, Zenoti, Nubimed). Without this, precio is meaningless and stock tracking is broken. | MEDIUM | N:N join table `TratamientoInsumo` (tratamientoId, productoId, cantidad). Precio base = sum(costoBase × cantidad) from Inventario. |
| Surgery catalog per profesional (name, ARS/USD prices, insumos, estimated duration) | System already has `Cirugia` model (surgical event record) but no reusable catalog for "types of surgeries I perform." Users expect to define their procedure menu once and reuse it in quotes. | MEDIUM | New model `CirugiaCatalogo` per profesional. Separate from `Cirugia` (the actual event). N:N with Productos for insumos. |
| Presupuesto: pick from catalog with price auto-filled | Nubimed, PatientNow, all plastic surgery PM software do this. Without it, coordinators manually type prices every time — error-prone and slow. | MEDIUM | Add optional `tratamientoId`/`cirugiaId` FK to `PresupuestoItem`. Frontend: combobox that populates descripcion + precioTotal. Keep free-text option for custom items. |
| HC entry "Tratamiento en Consultorio" section: multi-select from Tratamiento catalog | Without catalog linkage in the clinical note, the "Tab Tratamientos → last treatment" feature (already promised in v1.4) has nothing to link to. This closes the loop. | MEDIUM | New optional field(s) on `HistoriaClinicaEntrada`: `tratamientosCatalogo` (JSON array of tratamientoIds + nombre + free text). |
| Tab Tratamientos: "Último tratamiento" column | Promised in v1.4 scope. The tab already shows monthly patient list — without a last-treatment column it feels incomplete. | LOW-MEDIUM | Requires a denormalized FK on `Paciente` or a query to latest HC entry with tratamientos. Prisma-level query, no new model needed if stored as column. |
| Cambio de flujo desde PatientDrawer (optimistic, con modal confirmación) | Users classify patients via LiveTurno banner already. Doing it from the profile drawer is the logical complement — not adding it feels like a regression. Triggers CRM state + contact log. | MEDIUM | PATCH endpoint already exists. Frontend: confirmation modal + optimistic update + invalidate queries. CRM side effects already coded in backend. |
| HC entry creator from PatientDrawer (sin turno activo) | Clinicians need to document retroactive entries (post-op notes, follow-up call notes, manual entries). All competitor systems allow this. Without it, LiveTurno is the only path to HC entry — creates artificial constraint. | MEDIUM | Reuse existing HC wizard component. Pass `turnoId: undefined`, date defaults to today. Backend `crearEntrada` already doesn't require a turno. |

### Differentiators (Competitive Advantage)

Features that align with the core value prop (close more surgeries, simpler ops) and go beyond what competitors offer out of the box for Argentine plastic surgery clinics.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Stock consumption orders (pending confirmation) from HC — not instant deduction | Argentine clinic context: stock module managed separately by admin, not by the doctor doing the HC. Generating a "pending consumption order" rather than instantly deducting respects the operational role separation (PROFESIONAL documents → Admin/stock confirms). | HIGH | New model needed: `OrdenConsumo` (with status PENDIENTE/CONFIRMADA/CANCELADA, FK to HC entry, pacienteId, fecha, items with productoId+cantidad). Stock module gets a confirmation UI. This matches how Argentine clinics actually operate. |
| Precio base calculated from insumos (not just manual entry) | Shows real cost of each treatment. Helps clinic understand margin. Competitors show this, but Argentine-market systems like Nubimed don't emphasize it. Makes catalog more valuable. | LOW | Derived field: sum(inventario.precioActual × cantidad) for each insumo in the tratamiento. Read-only in UI, recalculated on demand. |
| HC section "consume insumos" checkbox per treatment selected | Granular control per clinical session: "I used these treatments but did NOT consume stock this time" (e.g., consultation, evaluation, pre-op). Avoids phantom consumption orders. | LOW | Boolean per HC tratamiento entry. Only generate OrdenConsumo if checked. |
| CirugiaCatalogo priced in ARS + USD | Surgery prices change with exchange rate. Having dual-currency in the catalog avoids updating the catalog constantly. Consistent with existing presupuesto dual-currency support. | LOW | Already modeled in presupuesto (moneda field). Catalog needs both fields. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Instant stock deduction from HC (no confirmation step) | Simpler, fewer clicks | In Argentine multi-role clinics, the professional doing the HC is not the stock admin. Instant deduction bypasses stock validation (stockMinimo, lote tracking, admin oversight). Creates reconciliation nightmares. | Pending `OrdenConsumo` that stock module admin confirms. |
| Full surgery planning inside LiveTurno | Consultations often discuss surgery — seems natural | LiveTurno is a consultorio session tool, not a surgical planning tool. Mixing surgery planning workflow (anesthesiologist, quirofano, ayudante) into a consult session creates scope explosion. | Surgery catalog for quoting. `Cirugia` record creation stays in separate flow. |
| Replacing free-text presupuesto items entirely with catalog items | Uniformity | Users always need custom items (e.g., "traslado", "gastos de sanatorio", one-off extras). Removing free text breaks real workflows. | Keep free-text; catalog items are additive (prefill descripcion + precio, editable before save). |
| Complex pricing rules (tiered pricing, member discounts, package bundles) | Sophisticated pricing seems valuable | Massively increases catalog complexity and coordinator training burden. Argentine plastic surgery practices price ad hoc per patient. | Manual precio override on PresupuestoItem after catalog prefill. |
| Automatic CRM stage advance when HC entry is created from PatientDrawer | Seems like natural automation | HC entry from drawer may be a post-op follow-up note — does not imply a new CRM stage. Stage logic tied to turno lifecycle is already well-defined. Adding drawer HC → CRM advance creates unexpected side effects. | Keep CRM transitions tied to turno events only. Flujo change from drawer does affect CRM (already scoped). |

---

## Feature Dependencies

```
[CirugiaCatalogo model]
    └──required by──> [Presupuesto: catalog item selection (cirugías)]
    └──required by──> [OrdenConsumo: knows which insumos to consume]

[TratamientoInsumo join table (extend existing Tratamiento)]
    └──required by──> [Presupuesto: catalog item selection (tratamientos) with precio base]
    └──required by──> [HC "Tratamiento en Consultorio" section: drives insumo list]
    └──required by──> [OrdenConsumo: knows which insumos tratamiento uses]

[HC "Tratamiento en Consultorio" section]
    └──required by──> [OrdenConsumo generation]
    └──required by──> [Tab Tratamientos: "Último tratamiento" column] (needs tratamientoId stored on HC entry)

[OrdenConsumo model]
    └──required by──> [Stock module: confirmation UI]
    └──enhances──> [HC section "consume insumos" checkbox] (checkbox controls whether order is generated)

[Cambio de flujo desde PatientDrawer]
    └──uses──> [existing PATCH /pacientes/:id + CRM side effects] (already built)
    └──independent from──> [HC entry creator from PatientDrawer]

[HC entry creator from PatientDrawer]
    └──reuses──> [LiveTurno HC wizard component] (must be extracted into shared component)
    └──independent from──> [Cambio de flujo desde PatientDrawer]
```

### Dependency Notes

- **CirugiaCatalogo is new and foundational**: It has no existing analog in the schema. Needs to be defined first before presupuesto and HC integration can reference it.
- **TratamientoInsumo extends existing Tratamiento**: Lower risk than CirugiaCatalogo — it's additive. Tratamiento can function without insumos (backward compatible).
- **HC wizard shared component**: LiveTurno currently uses the HC creator inline. For PatientDrawer to reuse it, the component must be lifted into a shared location (not duplicated). This is a refactor dependency.
- **OrdenConsumo depends on HC section**: No point building the stock confirmation UI before the HC section that generates the orders exists.
- **"Último tratamiento" column**: Needs either a denormalized FK on `Paciente.ultimoTratamientoId` (maintained on HC save) or a join query. If denormalized FK approach: needs a migration + service update in HC save path.

---

## MVP Definition for v1.5

### Launch With (v1.5 core)

Minimum that makes v1.5 coherent and usable end-to-end.

- [ ] `TratamientoInsumo` join table — extend existing catalog with insumos + precio base derived field
- [ ] `CirugiaCatalogo` model per profesional with ARS/USD prices, insumos, duration
- [ ] HC "Tratamiento en Consultorio" section — multi-select from catalog + free text annotation + "consume insumos" checkbox
- [ ] `OrdenConsumo` model + pending orders list in stock module (confirmation UI)
- [ ] Presupuesto: catalog item picker (tratamientos + cirugías) with price auto-fill, keep free text
- [ ] Tab Tratamientos: "Último tratamiento" column (FK or query from latest HC entry)
- [ ] Cambio de flujo desde PatientDrawer (optimistic + modal + CRM side effect)
- [ ] HC entry creator from PatientDrawer (shared component, date = today)

### Add After Validation (v1.5.x)

- [ ] Bulk confirmation of OrdenConsumo (confirm multiple orders at once in stock module) — trigger when stock admin reports friction
- [ ] OrdenConsumo linked to Lote (batch tracking per insumo consumed) — trigger when clinic has traceable injectables

### Future Consideration (v2+)

- [ ] Surgery planning: link `CirugiaCatalogo` to actual `Cirugia` (surgical event) record with pre-populated insumos — only when surgical workflow is a product priority
- [ ] Package bundles: multiple tratamientos/cirugías priced together as a package — only with clear commercial demand

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| CirugiaCatalogo model + CRUD | HIGH (surgery quotes are the core conversion tool) | MEDIUM (new model, scoped CRUD) | P1 |
| TratamientoInsumo + precio base | HIGH (closes the stock-catalog gap) | LOW-MEDIUM (additive migration + service layer) | P1 |
| Presupuesto catalog picker | HIGH (daily use by secretaria) | MEDIUM (frontend combobox + PresupuestoItem FK) | P1 |
| HC "Tratamiento en Consultorio" section | HIGH (clinical documentation + stock trigger) | MEDIUM (new HC section UI + backend field) | P1 |
| OrdenConsumo pending + stock confirmation UI | HIGH (stock integrity) | HIGH (new model + new UI surface in stock module) | P1 |
| Tab Tratamientos "Último tratamiento" column | MEDIUM (nice-to-have, promised in v1.4) | LOW-MEDIUM (query or denormalized FK) | P1 |
| Cambio de flujo desde PatientDrawer | MEDIUM (ergonomics, not blocking) | LOW (reuses existing PATCH + confirmation modal) | P2 |
| HC creator from PatientDrawer | MEDIUM (retroactive docs, follow-up notes) | MEDIUM (component extraction + drawer integration) | P2 |
| Precio base auto-calculated from insumos | MEDIUM (margin visibility) | LOW (derived, no new model) | P2 |
| "Consume insumos" checkbox in HC | HIGH (prevents phantom orders) | LOW (boolean field on HC entry JSON) | P1 — bundled with HC section |

---

## Competitor Feature Analysis

| Feature | Pabau | PatientNow | Nubimed (AR) | Our Approach |
|---------|-------|------------|--------------|--------------|
| Treatment catalog linked to consumables | Yes — auto-deduct at checkout | Yes — tied to invoice | Basic catalog, no insumos linkage found | Full N:N with quantities, precio base derived |
| Surgery catalog | Not specialty-specific | Yes — procedure library | Yes — presupuesto from catalog | New `CirugiaCatalogo` per profesional |
| Catalog-based quoting | Yes | Yes | Yes ("quick quotes from catalog") | PresupuestoItem with optional catalog FK + price prefill |
| Stock deduction from clinical note | Yes — at checkout/admin | Yes | Unknown | Pending `OrdenConsumo` — confirmed by stock admin (fits Argentine role separation) |
| HC entry without appointment | Yes (progress notes) | Yes | Unknown | HC creator reused from LiveTurno, accessible from PatientDrawer |
| Patient classification change | CRM stage change | Not applicable | Not applicable | Flujo change from PatientDrawer with CRM side effects (already built) |

### Differentiation Note

The most distinctive design decision for this project versus competitors is the **pending consumption order** (OrdenConsumo) pattern instead of instant stock deduction. This is driven by Argentine clinic operational reality: the professional documenting the HC is not the same person managing stock. The two-step pattern (generate → confirm) is standard in pharmaceutical/hospital contexts but uncommon in medspa SaaS. It is the correct approach for this user base. Confidence: MEDIUM (domain inference from operational patterns, not verified via competitive feature docs).

---

## Sources

- Pabau stock management: [Stock Management | Pabau Practice Management Software](https://pabau.com/features/stock-management/)
- Pabau inventory: [Inventory Management Software for Clinics & Med Spas](https://pabau.com/features/inventory-management-software/)
- Pabau plastic surgery: [5 Best Plastic Surgery Software Solutions in 2026 | Pabau](https://pabau.com/blog/best-plastic-surgery-software/)
- Pabau medical spa inventory: [8 Best Medical Spa Inventory Software Solutions for 2026 | Pabau](https://pabau.com/blog/medical-spa-inventory-software/)
- Nubimed Argentina: [Software para Clínicas de Estética y Cirugía Plástica | Nubimed](https://www.nubimed.com/software-cirugia-plastica/)
- PatientNow plastics: [Medical Aesthetics & Plastic Surgery Software | PatientNow](https://www.patientnow.com/medical-aesthetics/)
- Nextech plastic surgery PM: [Plastic Surgery Practice Management Software | Nextech](https://www.nextech.com/plastic-surgery/practice-management-software)
- Codebase analysis: `backend/src/prisma/schema.prisma`, `backend/src/modules/tratamientos/tratamientos.service.ts`, `backend/src/modules/historia-clinica/historia-clinica.service.ts`, `backend/src/modules/presupuestos/presupuestos.service.ts`, `frontend/src/types/tratamiento.ts`, `frontend/src/components/live-turno/LiveTurnoTabs.tsx`

---
*Feature research for: v1.5 Catálogos Clínicos y Flujos de Atención — aesthetic surgery clinic SaaS (Argentina)*
*Researched: 2026-04-22*
