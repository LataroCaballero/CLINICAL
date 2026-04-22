# Pitfalls Research — v1.5 Catálogos Clínicos y Flujos de Atención

**Domain:** Catalog-driven clinical workflows added to an existing clinic SaaS (NestJS + Prisma + PostgreSQL + Next.js)
**Researched:** 2026-04-22
**Confidence:** HIGH — based on direct codebase analysis of actual schema, services, and patterns in use

---

## Critical Pitfalls

### Pitfall 1: PresupuestoItem Has No Price Snapshot — Catalog Drift

**What goes wrong:**
`PresupuestoItem` currently stores only `descripcion` and `precioTotal` (a single lump sum). When catalog items are added via `catalogoId` FK pointing at `Tratamiento` or a new `CatalogoCirugia`, if the code recalculates or re-resolves the price from the catalog row on quote re-render or PDF generation, the customer sees a different total than the one they were quoted.

**Why it happens:**
The existing `PresupuestoItem` has no `precioUnitario`, no `cantidad`, and no `catalogoId`. When the team adds catalog selection to the quote UI, the temptation is to store only the FK and derive amounts on read. This is DRY but wrong for financial documents.

**How to avoid:**
- Add `precioUnitario Decimal`, `cantidad Int @default(1)`, and optional `catalogoId String?` to `PresupuestoItem` in the migration.
- Store `precioUnitario` at the moment of quote creation — copied from catalog, never re-read from catalog.
- Keep `precioTotal = precioUnitario * cantidad` computed on write, stored on the row.
- `catalogoId` is for display traceability only; never use it to re-derive financials.

**Warning signs:**
- PR that computes `precioTotal` inside a query join to the catalog table.
- PDF generation service that calls `tratamientosService.findById()` inside `presupuestosService.generatePdf()`.
- UI that shows a stale price badge ("precio actualizado") on a sent quote.

**Phase to address:** Schema foundation phase — migration must add snapshot columns before any quote-catalog UI is built.

---

### Pitfall 2: M2M Catalog-Insumo Without Quantity Versioning — Stale Price Base

**What goes wrong:**
`TratamientoInsumo` (new junction) stores `productoId + cantidad`. `Tratamiento.precio` is currently a static field. If `precio base` is computed from `SUM(insumo.precioActual * cantidad)` at query time, every re-fetch recalculates it. When `Inventario.precioActual` changes (new purchase order received), all historical presupuestos that displayed "precio base desde insumos" show a new number retroactively.

**Why it happens:**
It feels natural to compute the price base dynamically so it "stays up to date." The problem is that "up to date" means different things for catalog display vs. financial commitments.

**How to avoid:**
- `Tratamiento.precio` (and the equivalent field on `CatalogoCirugia`) remains the **canonical price** — editable by the professional, not auto-calculated on read.
- Provide a "Recalcular desde insumos" button that updates `Tratamiento.precio` on demand. Never auto-recalculate it.
- `TratamientoInsumo.precioUnitarioReferencia` (nullable) can store the insumo cost at the moment of the last explicit recalculation for auditing, but must not be used for quote totals.

**Warning signs:**
- `getTratamientoConPrecio()` method that sums `inventario.precioActual * cantidad` and returns it as `precio`.
- Frontend that shows a live "precio calculado: $X" that updates when stock changes.
- `Tratamiento.precio` stored as `@default(0)` with no update path — meaning the team forgot to provide a way to set it.

**Phase to address:** Schema foundation + catalog management phase; the "recalculate" button is a UI-only concern deferred to catalog CRUD phase.

---

### Pitfall 3: Consumption Orders Create a Stock Race Condition

**What goes wrong:**
HC save triggers consumption order creation for insumos used in the treatment. If the consumption order deducts stock immediately on HC save, two concurrent LiveTurno sessions (or a HC save + a stock adjustment) can both succeed past the guard check but together bring `stockActual` below zero.

**Why it happens:**
`Inventario.stockActual` is updated in a service method that does `findUnique` then `update` in two separate Prisma calls. Concurrent saves pass the availability check before either has committed.

**How to avoid:**
- Do NOT deduct stock on HC save. Create the consumption order with `estado: PENDIENTE_CONFIRMACION`.
- Stock deduction happens only when a user in the stock module explicitly confirms the order — a deliberate two-step that serializes writes.
- If you must deduct immediately, use a PostgreSQL row-level lock: `SELECT ... FOR UPDATE` via `prisma.$queryRaw` or `pg_advisory_xact_lock` inside a `$transaction` (same pattern already used for AFIP CAE numeración in v1.2).
- Add a `CHECK CONSTRAINT` on `Inventario.stockActual >= 0` at DB level as the last line of defense.

**Warning signs:**
- `inventario.service.ts` `registrarMovimiento()` called outside of a Prisma `$transaction`.
- `stockActual: { decrement: cantidad }` used without first verifying sufficiency inside the same transaction.
- No `estado` field on the consumption order model — means deduction is immediate.

**Phase to address:** Consumption order schema phase; the two-step confirmation flow is the explicit design, not an afterthought.

---

### Pitfall 4: HC Entry Without turnoId Breaks Turno-HC Bidirectional Relation

**What goes wrong:**
`Turno` has `entradaHCId String?` pointing to an `HistoriaClinicaEntrada`. `HistoriaClinicaEntrada` currently has no `turnoId` field — the relation is Turno → HC, not HC → Turno. When adding HC creation from PatientDrawer (no turno context), the new entry has no turno reference. If the code tries to set `Turno.entradaHCId` to the new entry it will fail silently or worse — it will create an orphan entry unlinked from any turno and also leave the turno with a stale `entradaHCId`.

The existing `HistoriaClinicaEntrada` already has `Turno[]` as a relation (many turnos can reference one entrada). This means the relation is one-entrada → many-turnos, not one-turno → one-entrada. Verify this design is intentional before building on it.

**Why it happens:**
LiveTurno creates HC entry then sets `Turno.entradaHCId`. PatientDrawer creates HC entry with no turno — a new code path that was never in the original design. The temptation is to reuse the same service method and just pass `turnoId: undefined`.

**How to avoid:**
- `HistoriaClinicaService.crearEntrada()` already does not require a turnoId in the DTO (`CreateEntradaDto` has no turnoId field). The method is already turno-agnostic.
- Make the PatientDrawer path explicit: call the same service, pass no turnoId, and ensure the LiveTurno path still sets `Turno.entradaHCId` after entry creation.
- Do not add `turnoId` as required to `CreateEntradaDto`. Keep it optional, only set when called from LiveTurno context.
- If a turnoId is passed, validate it belongs to the same paciente before linking.

**Warning signs:**
- `CreateEntradaDto` gains a required `turnoId` field.
- `HistoriaClinicaService` throws if `dto.turnoId` is absent.
- Two separate service methods (`crearEntradaDesdeDrawer` and `crearEntradaDesdeLiveTurno`) that duplicate 80% of logic.

**Phase to address:** PatientDrawer HC creator phase — share the same service method, differ only in whether turnoId post-linking happens.

---

### Pitfall 5: Auto-Update Paciente.ultimoTratamientoId on HC Save — Concurrent Write and Delete Edge Cases

**What goes wrong:**
After adding `ultimoTratamientoId` to `Paciente`, every HC save that includes treatments updates this field. Three failure modes:
1. Two concurrent HC saves for the same patient pick opposite treatments; last-write wins is non-deterministic.
2. When an HC entry is deleted (or soft-deleted), `ultimoTratamientoId` still points to the deleted entry — dangling display in Tab Tratamientos.
3. `ultimoTratamientoId` is updated unconditionally even if the new HC entry has an older `fecha` than the existing last entry (retroactive HC entries via `dto.fecha`).

**Why it happens:**
The pattern of "update parent aggregate field after child insert" inside a transaction looks correct until retroactive entries and deletes are considered. The existing service already does retroactive date entry (`fechaFinal` from `dto.fecha`) without updating any "último" pointer.

**How to avoid:**
- Store `ultimoTratamientoId` as a denormalized pointer, but derive it from the latest `HistoriaClinicaEntrada` by `fecha DESC` at query time for the Tab Tratamientos list (a single `ORDER BY fecha DESC LIMIT 1` join, not a stored field).
- If you must store it: only update when `new entry.fecha > current Paciente.ultimoTratamientoFecha`. Compare dates inside the transaction, not outside.
- On HC entry delete: re-query the latest remaining entry and update the pointer in the same transaction. If no entries remain, null the pointer.
- Use `SELECT ... FOR UPDATE` on `Paciente` row inside the transaction to prevent concurrent update races.

**Warning signs:**
- `paciente.update({ ultimoTratamientoId: entrada.id })` called unconditionally after entry create, without date comparison.
- No handling in HC delete/soft-delete path to refresh the pointer.
- Tab Tratamientos showing treatment name from a deleted HC entry.

**Phase to address:** Schema foundation (whether to store vs. query) must be decided before Tab Tratamientos column phase.

---

### Pitfall 6: Optimistic Update on Flujo Change — CRM Side Effects Not Rolled Back

**What goes wrong:**
The PatientDrawer calls `PATCH /pacientes/:id/flujo`. The current `updateFlujo()` implementation only updates `Paciente.flujo` — it does not touch CRM fields. However, switching from CIRUGIA → TRATAMIENTO should remove the patient from the CRM kanban (which already filters `flujo = CIRUGIA OR flujo IS NULL`). If the frontend optimistically updates the drawer UI but the API call fails, the drawer shows TRATAMIENTO while the kanban still shows the patient as CIRUGIA. When the API succeeds, the kanban silently drops the patient from view without any user feedback.

The bigger risk: switching TRATAMIENTO → CIRUGIA must initialize `etapaCRM` if null, otherwise the patient is CIRUGIA with no CRM stage — invisible in both kanban and tratamientos tab.

**Why it happens:**
`updateFlujo()` is implemented as a simple field update with no CRM business logic. The CRM auto-classification in `crearTurno()` (v1.4) set the precedent that flujo changes have side effects, but the manual `updateFlujo` endpoint was added separately without that logic.

**How to avoid:**
- Extend `updateFlujo()` to include CRM side effects atomically in one `$transaction`:
  - TRATAMIENTO → CIRUGIA: if `etapaCRM IS NULL`, set `etapaCRM = NUEVO_LEAD`.
  - CIRUGIA → TRATAMIENTO: do not clear `etapaCRM` — leave it as historical data but the kanban will auto-exclude the patient.
- On the frontend, do not use optimistic UI for flujo change. Use a loading state instead. The side effects (kanban disappears, tab changes) are disorienting if rolled back.
- If optimistic update is kept, invalidate both `['pacientes']` and `['kanban']` queries on mutation settle (success or error).

**Warning signs:**
- `updateFlujo()` is a single `prisma.paciente.update()` with no transaction, no CRM logic.
- Frontend `useMutation` has no `onError` rollback for the previous flujo value.
- After flujo change, patient appears in both kanban and tratamientos tab simultaneously until manual refresh.

**Phase to address:** PatientDrawer flujo change phase — must include CRM side effect specification before implementation.

---

### Pitfall 7: Multi-Select Tratamientos in LiveTurno HC Wizard — Form State Diverges From Server

**What goes wrong:**
The HC wizard adds a multi-select for `tratamientos` from the catalog. The existing `HistoriaClinicaEntrada.contenido` is a `Json?` blob that stores `{ tipo, diagnostico, tratamientos: [{nombre, tratamientoId?, precio}], ... }`. If the UI allows selecting multiple catalog tratamientos and the form state management is naive (e.g., a simple `useState` array), two failure modes appear:
1. The user selects tratamientos, navigates to a different wizard step, returns, and the selection is reset because local state was not lifted.
2. On submit, the `tratamientos` array is sent but `tratamientoId` is omitted if the item was typed manually (not selected from catalog) — the existing DTO allows this, but the new consumption order generator needs `tratamientoId` to look up insumos. Null `tratamientoId` on a manually typed entry silently skips stock order generation with no user feedback.

**Why it happens:**
The existing `TratamientoItemDto` has `tratamientoId?: string` (optional). The new flow adds semantic meaning to this field (present = catalog item, generates consumption order), but the field name and nullability are unchanged — developers expect the same DTO to just work.

**How to avoid:**
- In the LiveTurno HC wizard, use React Hook Form with a top-level `useForm` wrapping all steps — not per-step local state. Field array for `tratamientos` via `useFieldArray`.
- Distinguish catalog items from free-text items explicitly in the UI: catalog-selected items show a catalog badge; free-text items show a warning "sin gestión de stock."
- When `tratamientoId` is null and consumption orders are configured, log a warning but do not block HC save. The consumption order is optional.
- Add a `origenCatalogo: boolean` field (frontend-only or in contenido JSONB) to distinguish the two cases.

**Warning signs:**
- Multi-select tratamientos state lives in a local `useState` inside a wizard step component.
- The submit handler does `dto.tratamientos.map(t => createConsumptionOrder(t.tratamientoId))` without null-checking `tratamientoId`.
- Free-text tratamiento entries silently fail to generate consumption orders with no user feedback.

**Phase to address:** LiveTurno HC wizard phase — form architecture decision must be made at the start, not retrofitted.

---

### Pitfall 8: Consumption Order FK to HC Entry vs. Turno — Orphan Risk on LiveTurno Cancel

**What goes wrong:**
If the consumption order links to `HistoriaClinicaEntrada.id` and the LiveTurno session is cancelled (turno moved to CANCELADO or AUSENTE), the HC entry may be deleted or voided. The consumption order now has a dangling FK to a non-existent or voided HC entry. Stock module users see a consumption order with no clinical context — they cannot determine whether to fulfill or reject it.

**Why it happens:**
The HC entry is created optimistically during LiveTurno session. Cancellation flows may delete the entry or leave it in DRAFT status. The consumption order is created in the same batch and is not automatically rolled back.

**How to avoid:**
- Consumption orders must always be confirmed by a stock module user — never auto-applied. This means a pending consumption order surviving a cancelled session is a valid workflow (stock user reviews and rejects it).
- Link the consumption order to `HistoriaClinicaEntrada.id` with `onDelete: SetNull` so that if the HC entry is deleted, the order survives with `entradaHCId = null` and `estado = REQUIERE_REVISION`.
- Add `pacienteId` and `profesionalId` directly on the consumption order model for display even when the HC entry link is null.
- Add `turnoId String?` to the consumption order for LiveTurno context — this survives even if HC entry is deleted since Turno is not deleted on cancel.

**Warning signs:**
- `OrdenConsumo` model has only `entradaHCId` as context FK, no `pacienteId` or `turnoId`.
- `onDelete: Cascade` on `OrdenConsumo.entradaHCId` — deleting an HC entry deletes pending consumption orders.
- Stock module UI shows `paciente: undefined` for orders whose HC entry was voided.

**Phase to address:** Consumption order schema phase — FK strategy and `onDelete` behavior must be explicit in the migration.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store `catalogoId` FK on `PresupuestoItem` without price snapshot | DRY, no duplication | Quote totals change retroactively when catalog price changes | Never for financial documents |
| Compute `Tratamiento.precio` dynamically from insumos on every read | Always "up to date" | Unpredictable presupuesto totals; N+1 queries on catalog list | Never for quoted prices; OK for a read-only "cost reference" display |
| Update `ultimoTratamientoId` unconditionally after HC save | Simple code | Retroactive entries corrupt the pointer; concurrent saves are non-deterministic | Never if retroactive HC entries are supported |
| Deduct stock immediately on HC save | Simpler flow, no pending orders to manage | Race conditions; HC cancellation leaves stock under-counted | Only if stock deduction is always reversible with an undo within the session |
| Optimistic UI for flujo change | Snappier UX | CRM kanban and tratamientos tab diverge until re-query; hard-to-debug state | Acceptable only if `onError` rollback is implemented and both query caches are invalidated |
| Separate `crearEntradaDesdeDrawer` and `crearEntradaDesdeLiveTurno` service methods | Easier to reason per path | Logic drift over time; bugs fixed in one method not the other | Never — use one method with optional `turnoId` parameter |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `Inventario` stock deduction in `$transaction` | `{ decrement: cantidad }` without checking `stockActual >= cantidad` first | Read `stockActual` inside the transaction with a lock check, then decrement; or add DB CHECK constraint |
| CRM auto-effects on `updateFlujo` | Treating flujo as a simple enum field update | Always run flujo change through a service method that applies CRM business rules in the same `$transaction` |
| TanStack Query cache after flujo change | Invalidating only `['paciente', id]` | Also invalidate `['kanban']`, `['tratamientos']`, and `['listaAccion']` — flujo change affects multiple list queries |
| `HistoriaClinicaEntrada.contenido` JSONB structure | Adding new top-level keys without versioning | Add a `version` key to the JSONB blob (`version: 2`) so queries can distinguish old-format entries from new catalog-aware ones |
| Presupuesto PDF re-generation | Re-resolving catalog price during PDF generation | PDF must read `PresupuestoItem.precioUnitario` (the snapshot), never join to catalog |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Tab Tratamientos "ultimo tratamiento" via subquery per patient row | List of 200 patients triggers 200 HC subqueries | Use a single `GROUP BY` query with `MAX(fecha)` or a materialized column on Paciente | 50+ patients in list |
| Catalog selector in LiveTurno loading all `Tratamiento` records with their insumos | Slow modal open for professionals with large catalogs | Paginate or search-on-type; only load insumos when a tratamiento is selected | 100+ catalog items |
| Consumption order list in stock module scanning all orders without index | Slow stock module load | Add `@@index([profesionalId, estado, createdAt])` to `OrdenConsumo` model from day one | 500+ pending orders |
| `PresupuestoItem` join to catalog on every quote list render | Quote list table slow | Never join to catalog from quote list; display only stored snapshot data | 100+ quotes per professional |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `CatalogoCirugia` accessible across professionals | Professional A reads Professional B's pricing strategy | Every catalog query must include `profesionalId` in `where` clause; service-level guard like existing `TratamientosService.findById()` pattern |
| Consumption order creation without verifying HC entry belongs to the authenticated professional | Any authenticated user could trigger stock deductions for another professional's inventory | Verify `HistoriaClinicaEntrada.historiaClinica.profesionalId === req.profesionalId` before creating consumption order |
| `PresupuestoItem.catalogoId` exposed in API response | Client can infer catalog pricing of other professionals if catalogoId is global | Validate ownership before resolving catalogoId details; return null for unowned references |
| HC entry created from PatientDrawer without professional ownership check on patient | SECRETARIA could create HC for patient belonging to different professional | Reuse existing `pacientes.service.ts` ownership guard before calling `historia-clinica.service.ts` |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing "precio base calculado" that changes when stock prices update | Professional sees different price than what was quoted; distrust in the system | Show "precio base" as the stored `Tratamiento.precio` with a "Recalcular" button; never auto-update |
| Flujo change from drawer with optimistic UI that reverts on error | User sees the badge flip back to old value 2 seconds after clicking — confusing | Use loading spinner on the badge during the PATCH; show toast on error with "No se pudo cambiar el flujo" |
| Multi-select tratamientos in LiveTurno losing state on step navigation | Professional re-selects treatments on every session; slows down the flow | Lift form state to top-level RHF; persist draft HC in `sessionStorage` if full form persistence is needed |
| Consumption order confirmation flow in stock module is not discoverable | Stock manager does not know pending orders exist | Add a badge/counter on the stock module nav item showing pending consumption orders count |
| HC entry from PatientDrawer with no turno context has identical UI to LiveTurno HC | Professional confused about whether the entry is linked to an appointment | Show "Entrada manual — sin turno" label on entries with no Turno reference in the HC timeline |

---

## "Looks Done But Isn't" Checklist

- [ ] **Catalog-quote integration:** Quote shows catalog name — verify `PresupuestoItem.precioUnitario` is stored at creation time, not joined from catalog on render.
- [ ] **Consumption orders:** HC save creates orders — verify stock is NOT decremented until stock-module confirmation step.
- [ ] **Flujo change CRM side effects:** PATCH flujo returns 200 — verify TRATAMIENTO to CIRUGIA path sets `etapaCRM = NUEVO_LEAD` when null; verify both kanban and tratamientos cache are invalidated on the frontend.
- [ ] **HC from PatientDrawer:** Entry appears in HC timeline — verify `Turno.entradaHCId` is NOT set (no turno context) and the entry appears with "sin turno" label.
- [ ] **ultimoTratamiento column in Tab Tratamientos:** Column shows last treatment — verify retroactive HC entries do not display a treatment dated earlier than the actual last entry.
- [ ] **Multi-select tratamientos:** Treatments appear in HC contenido JSONB — verify `tratamientoId` is present for catalog-selected items and null for free-text items, and that consumption orders are only generated for catalog items.
- [ ] **Precio base from insumos:** Catalog shows precio — verify it reads `Tratamiento.precio` (static field), not a live SUM from `TratamientoInsumo` join.
- [ ] **Consumption order context:** Order appears in stock module — verify `pacienteId`, `profesionalId`, and `turnoId` (if applicable) are stored on the order itself, not only via HC entry FK.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Price drift in PresupuestoItem (catalog FK, no snapshot) | HIGH — requires data migration to backfill snapshot prices | Write a migration that copies `tratamiento.precio` into `presupuestoItem.precioUnitario` at migration time; accept that historical quotes pre-migration have an approximation |
| Stock went negative due to race condition | MEDIUM — data correction needed | Add a DB CHECK constraint immediately; run adjustment MovimientoStock entries to restore accurate counts; audit consumption orders for double-deductions |
| ultimoTratamientoId points to deleted HC entry | LOW — re-run a query to fix the pointer | One-off SQL: `UPDATE "Paciente" SET "ultimoTratamientoId" = (SELECT id FROM "HistoriaClinicaEntrada" WHERE "historiaClinicaId" IN (SELECT id FROM "HistoriaClinica" WHERE "pacienteId" = "Paciente".id) ORDER BY fecha DESC LIMIT 1)` |
| Flujo change with no CRM side effects deployed to production | MEDIUM — patients in CIRUGIA with no etapaCRM, invisible in kanban | Backfill: `UPDATE "Paciente" SET "etapaCRM" = 'NUEVO_LEAD' WHERE flujo = 'CIRUGIA' AND "etapaCRM" IS NULL` |
| HC multi-step form loses state | LOW — user re-enters data | Add `sessionStorage` persistence for the HC draft in LiveTurno; no DB changes needed |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Price drift — no snapshot on PresupuestoItem | Schema foundation (first migration) | Check `PresupuestoItem` has `precioUnitario` and `cantidad` columns before any quote-catalog UI |
| Stale precio base from insumos | Catalog management phase | `GET /tratamientos/:id` returns `precio` (static), not a computed sum; confirmed by service unit test |
| Stock race condition on consumption | Consumption order schema phase | Integration test: two concurrent HC saves for the same patient + insumo; `stockActual` never goes negative |
| HC entry without turnoId breaks existing flow | PatientDrawer HC phase | Existing LiveTurno HC save still sets `Turno.entradaHCId`; new PatientDrawer save does not; both share the same service method |
| ultimoTratamientoId concurrent/retroactive write | Schema design decision (store vs. query) | Tab Tratamientos shows correct last treatment after creating a retroactive HC entry dated 6 months ago |
| Flujo change missing CRM side effects | PatientDrawer flujo change phase | TRATAMIENTO to CIRUGIA: patient appears in kanban at NUEVO_LEAD; both query caches invalidated |
| Multi-select form state diverges | LiveTurno HC wizard phase | Navigate away from step 2 and back; tratamientos selection persists |
| Consumption order orphan on session cancel | Consumption order schema phase | Cancel a LiveTurno session after HC save; consumption order still visible in stock module with `estado: PENDIENTE_CONFIRMACION` |

---

## Sources

- Direct schema analysis: `backend/src/prisma/schema.prisma` — `PresupuestoItem`, `Tratamiento`, `HistoriaClinicaEntrada`, `Turno`, `Inventario`, `MovimientoStock`, `Paciente` models
- Direct service analysis: `historia-clinica.service.ts`, `tratamientos.service.ts`, `inventario.service.ts`, `pacientes.service.ts`
- v1.4 Key Decisions in `.planning/PROJECT.md`: Guard PENDIENTE-only pattern, best-effort flujo update, banner UX decisions
- v1.2 Key Decisions: `pg_advisory_xact_lock` pattern for serialized writes (applicable to stock race condition)
- Existing `CreateEntradaDto`: confirms `turnoId` is not currently in the DTO; HC creation is already turno-agnostic at the service level
- Existing `updateFlujo()`: confirms no CRM side effects are currently applied on flujo change

---
*Pitfalls research for: v1.5 Catalagos Clinicos y Flujos de Atencion — NestJS + Prisma + PostgreSQL + Next.js*
*Researched: 2026-04-22*
