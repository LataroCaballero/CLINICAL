# Project Research Summary

**Project:** CLINICAL v1.5 — Catálogos Clínicos y Flujos de Atención
**Domain:** Catalog-driven clinical workflows for Argentine aesthetic surgery clinic SaaS (NestJS + Prisma + Next.js)
**Researched:** 2026-04-22
**Confidence:** HIGH

## Executive Summary

v1.5 closes the gap between the clinic's treatment/surgery catalogs and three downstream workflows that currently operate in isolation: clinical documentation (HC), quoting (presupuestos), and inventory (stock). Today, coordinators type prices manually into quotes, doctors document treatments as free text with no catalog linkage, and stock deductions happen at billing time with no traceability to clinical events. v1.5 connects these three surfaces through shared catalog models, an insumos junction table, and a pending-consumption-order pattern that respects Argentine clinic role separation (doctor documents, stock admin confirms).

The recommended approach is additive: zero new npm packages are required, and every new surface reuses established patterns already proven in the codebase (cmdk comboboxes from DiagnosticoCombobox, TanStack Query v5 optimistic mutations, NestJS module structure from tratamientos, OrdenCompra to MovimientoStock decoupled pattern from stock module). The only genuinely new architectural element is the OrdenConsumo pending-confirmation model, which is the deliberate design choice that differentiates this system from competitors (Pabau, Zenoti) by preventing automatic stock deductions that bypass the stock admin role.

The critical risks are financial and data integrity, not implementation complexity. Price drift (re-deriving prices from catalog instead of snapshotting at quote creation), stock race conditions (direct inventory decrement from HC save), and CRM side-effect omission on flujo change are the three pitfalls that could corrupt production data. All three are preventable with explicit schema design decisions made in the first phase, before any UI work begins. Implementation complexity is medium throughout; no phase is high-risk if the schema foundation is correct.

---

## Key Findings

### Recommended Stack

v1.5 requires no new dependencies. All capabilities map to installed libraries: Prisma 6 for the new explicit join tables and enums, TanStack Query v5 for optimistic mutations (note: `cancelQueries` is async in v5 and must be awaited in `onMutate`), cmdk 1.1.1 for multi-select catalog pickers following the established DiagnosticoCombobox / PlanCombobox pattern, and sonner for error toasts. The only non-obvious compatibility constraint is Zod 4 (already installed) — new schemas must use Zod 4 API, not copy patterns from older Zod 3 files in the codebase.

**Core technologies:**
- **Prisma 6.1:** New explicit join tables (TratamientoInsumo, CirugiaInsumo) — implicit M2M cannot carry `cantidad` field, making explicit join tables mandatory
- **TanStack Query v5.90:** Optimistic mutations for flujo change in PatientDrawer — `cancelQueries` must be awaited (v5 breaking change from v4)
- **cmdk 1.1.1:** Multi-select catalog pickers — controlled `string[]` state prevents auto-close on item selection; no new library needed
- **NestJS 10:** New `cirugias-catalogo` module + `ordenes-consumo` module — same structure as existing `tratamientos` module
- **Sonner 2.0.7 + React Hook Form 7.68 + Zod 4.1.13:** Form validation and error feedback — all installed, no changes

### Expected Features

**Must have (table stakes):**
- `TratamientoInsumo` join table: links existing Tratamiento catalog to stock Productos with quantities, enabling precio base derived field
- `CirugiasCatalogo` model per profesional: ARS/USD prices, insumos, duration — surgery catalog is currently missing entirely
- Presupuesto catalog item picker: combobox that pre-fills descripcion + precioTotal from catalog; free-text path unchanged
- HC "Tratamiento en Consultorio" section: multi-select from Tratamiento catalog with "consume insumos" checkbox
- `OrdenConsumo` pending model + stock confirmation UI: two-step consumption flow (doctor creates PENDIENTE, stock admin confirms and deducts)
- Tab Tratamientos "Último tratamiento" column: promised in v1.4, requires Paciente.ultimoTratamientoId or a by-date query
- Cambio de flujo desde PatientDrawer: optimistic update + confirmation modal; existing PATCH endpoint already exists
- HC entry creator from PatientDrawer: retroactive/follow-up entries without an active turno; same service method, no duplication

**Should have (differentiators):**
- Pending consumption order pattern (vs. instant deduction): Argentine role separation — PROFESIONAL documents, Admin confirms; uncommon in medspa SaaS but correct for this user base
- Precio base auto-calculated from insumos on demand (not live): "Recalcular" button updates Tratamiento.precio; never auto-recalculates to avoid quote drift
- "Consume insumos" checkbox per HC session: prevents phantom consumption orders for consultations/evaluations
- CirugiasCatalogo dual ARS/USD pricing: consistent with existing presupuesto currency support; avoids constant catalog updates with exchange rate changes

**Defer (v2+):**
- Bulk OrdenConsumo confirmation in stock module
- OrdenConsumo linked to Lote (batch tracking per injectable)
- Surgery planning integration: link CirugiasCatalogo to actual Cirugia events
- Package bundles / tiered pricing

### Architecture Approach

The architecture is additive on top of the existing NestJS module structure. Two new modules (cirugias-catalogo, ordenes-consumo) follow the exact pattern of tratamientos. Three existing modules are extended (historia-clinica, presupuestos, tratamientos). Six new/modified Prisma models are required. The key architectural decision is that HistoriaClinicaService.crearEntrada() becomes the hub of v1.5: it accepts `tratamientoIds[]` + `consumirInsumos`, creates OrdenConsumo in the same transaction, and updates Paciente.ultimoTratamientoId — all in one atomic write. The turnoId relation design is already correct: Turno holds `entradaHCId?`, making HC creation turno-agnostic at the service level (no schema change needed for PatientDrawer path).

**Major components:**
1. **Schema foundation** — TratamientoInsumo, CirugiasCatalogo, CirugiaInsumo, OrdenConsumo + OrdenConsumoItem, enums; modified PresupuestoItem (snapshot price columns), HistoriaClinicaEntrada (tratamientoIds String[], consumirInsumos), Paciente (ultimoTratamientoId)
2. **cirugias-catalogo NestJS module** — full CRUD scoped per profesional; same structure as tratamientos module; consumed by presupuestos and HC integration
3. **ordenes-consumo NestJS module** — lightweight GET/PATCH endpoints; confirm action runs MovimientoStock SALIDA inside $transaction; stock module UI surface for admin confirmation
4. **HC integration layer** — modified crearEntrada() with catalog tratamiento IDs, consumption order creation, and ultimoTratamientoId update in single transaction
5. **Frontend catalog surfaces** — PrimeraConsultaForm refactored to catalog combobox + useFieldArray; GenerarPresupuestoModal with catalog selector panel; PatientDrawer with flujo action and HC creator modal; TratamientosTab with ultimo tratamiento column; new stock ordenes-consumo page

### Critical Pitfalls

1. **Price snapshot missing on PresupuestoItem** — Add `precioUnitario Decimal` + `cantidad Int @default(1)` to PresupuestoItem in the first migration. Store price at quote creation time. Never re-read price from catalog for financial documents. catalogoId is for display traceability only.

2. **Dynamic precio base from insumos causes quote drift** — Tratamiento.precio must remain a static, professionally-set field. Provide a "Recalcular desde insumos" button that updates it on demand. Never auto-recalculate from SUM(insumo.precioActual * cantidad) on read.

3. **Direct stock deduction from HC save creates race conditions** — Two concurrent HC saves can both pass the availability check and bring stockActual below zero. Design: HC save creates OrdenConsumo { estado: PENDIENTE } only. Actual MovimientoStock SALIDA happens only at explicit stock admin confirmation. Add CHECK CONSTRAINT stockActual >= 0 at DB level as final defense.

4. **Flujo change missing CRM side effects** — updateFlujo() currently does a plain prisma.paciente.update() with no CRM logic. TRATAMIENTO to CIRUGIA must set etapaCRM = NUEVO_LEAD when null, inside the same $transaction. Frontend must invalidate ['kanban'], ['tratamientos'], and ['listaAccion'] caches, not just ['paciente', id].

5. **ultimoTratamientoId retroactive write corruption** — Unconditional update on HC save corrupts the pointer for retroactive entries. Preferred approach: query MAX(fecha) at read time for the Tab Tratamientos list (one ORDER BY fecha DESC LIMIT 1 join) rather than storing a denormalized FK. Decide this in the schema phase before the column is built.

---

## Implications for Roadmap

Based on the dependency graph from ARCHITECTURE.md and the pitfall-phase mapping from PITFALLS.md, the following 6-phase structure is recommended:

### Phase A: Schema Foundation + Catalog CRUD

**Rationale:** Every v1.5 feature depends on the new models. Price snapshot columns and consumption order FK strategy must be locked before any UI is built — the two highest-recovery-cost pitfalls (price drift, stock race condition) are prevented here or not at all.

**Delivers:** All new Prisma models + enums migrated; cirugias-catalogo module with full CRUD; tratamientos extended with insumos endpoints; configuracion UI for GestionTratamientos insumos + CirugiasCatalogoSection.

**Addresses:** TratamientoInsumo catalog, CirugiasCatalogo model, precio base display.

**Avoids:** Price drift pitfall (snapshot columns added here), stock race condition pitfall (OrdenConsumo model with PENDIENTE state designed here), ultimoTratamientoId design decision made here.

### Phase B: HC Integration (LiveTurno + PatientDrawer)

**Rationale:** Core of v1.5. Depends on Phase A for catalog models. PrimeraConsultaForm must be refactored to shared component before PatientDrawer can reuse it — do both in the same phase to avoid two refactors.

**Delivers:** crearEntrada() extended with tratamientoIds[] + consumirInsumos; OrdenConsumo created in transaction; PrimeraConsultaForm refactored to catalog combobox with useFieldArray; PatientDrawer HC creator modal using the same component.

**Addresses:** HC "Tratamiento en Consultorio" section, HC creator from PatientDrawer, OrdenConsumo generation, ultimoTratamientoId update.

**Avoids:** Form state divergence pitfall (useFieldArray from start), HC-without-turnoId pitfall (single service method, optional turnoId), duplicate component pitfall.

### Phase C: Presupuestos Catalog Integration

**Rationale:** Depends on Phase A only (catalog models must exist). Can run in parallel with Phase B. Self-contained: PresupuestoItem already has snapshot columns from Phase A migration; this phase adds the frontend combobox and backend DTO changes only.

**Delivers:** GenerarPresupuestoModal with "Agregar del catálogo" panel; catalog item picker (tratamientos + cirugías); PresupuestosService.create() extended with optional catalogItemId + catalogItemType.

**Addresses:** Presupuesto catalog item picker (daily-use feature for secretaria).

**Avoids:** PDF price drift (PDF reads precioUnitario snapshot, never joins catalog).

### Phase D: PatientDrawer Flujo Action

**Rationale:** Fully independent — PATCH /pacientes/:id/flujo already exists. Can start after Phase A. Pure frontend + CRM side-effect backend fix. Short phase. Recommended to run alongside Phase C.

**Delivers:** Flujo-change selector in PatientDrawer with loading state (not optimistic); updateFlujo() service extended with CRM transaction logic; frontend cache invalidation for kanban + tratamientos + listaAccion.

**Addresses:** Cambio de flujo desde PatientDrawer.

**Avoids:** CRM side-effect omission pitfall (the most likely production data corruption risk in the entire milestone).

### Phase E: Tab Tratamientos "Último Tratamiento" Column

**Rationale:** Depends on Phase A (field/query design decided) + Phase B (field gets populated by HC saves). Short implementation once schema is settled.

**Delivers:** "Último tratamiento" column in TratamientosTab; backend includes `ultimoTratamiento: { nombre }` in turno query response (single join, no N+1).

**Addresses:** Promised v1.4 feature.

**Avoids:** N+1 query performance trap (backend includes in existing turno query).

### Phase F: Stock Ordenes de Consumo UI

**Rationale:** Depends on Phase A (model exists) + Phase B (records are created). The stock admin surface has no frontend until this phase; orders accumulate silently in the database until then. Schedule close after Phase B.

**Delivers:** ordenes-consumo NestJS module (GET paginated list + PATCH confirm); useOrdenesConsumo + useConfirmarOrdenConsumo hooks; /dashboard/stock/ordenes-consumo page with PENDIENTE table; confirmation triggers MovimientoStock SALIDA in $transaction; nav badge showing pending count.

**Addresses:** OrdenConsumo pending model + stock confirmation UI.

**Avoids:** Consumption order orphan risk (entradaHCId with onDelete: SetNull; pacienteId + profesionalId stored directly on order).

### Phase Ordering Rationale

- Phase A is the strict prerequisite for everything; no parallel work is possible until migration runs
- Phases B, C, D can run in parallel after Phase A, reducing calendar time
- Phase D is the fastest phase and highest CRM risk — run it before Phase B completes so it does not block
- Phases E and F require Phase B output (HC saves that populate consumption orders and ultimoTratamientoId)
- Schema decisions for ultimoTratamientoId (stored FK vs. query-on-read) and OrdenConsumo.onDelete behavior must be final in Phase A to prevent retroactive migrations

### Research Flags

Phases with standard, well-documented patterns (no research-phase needed):
- **Phase A:** Explicit Prisma join tables with extra fields are standard; migration naming convention established; pattern from OrdenCompra is a direct analog
- **Phase C:** Presupuesto DTO extension + frontend combobox follows the PlanCombobox pattern exactly
- **Phase E:** Simple backend include + frontend column — one of the smallest implementation surfaces

Phases that benefit from a brief codebase read before planning:
- **Phase B:** PrimeraConsultaForm refactor to useFieldArray requires understanding the wizard's step state management; read LiveTurnoPanel + PrimeraConsultaForm props chain before writing the plan
- **Phase D:** updateFlujo() CRM side-effect logic needs a read of the existing CRM kanban filtering query to confirm valid initial etapaCRM values for CIRUGIA
- **Phase F:** confirmar() service needs to inject InventarioService or use PrismaService directly — confirm StockModule export pattern before writing the plan

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages confirmed from package.json; TanStack Query v5 async cancelQueries confirmed from official docs; Prisma explicit join table requirement confirmed from Prisma docs |
| Features | HIGH / MEDIUM | Feature gaps confirmed from schema and component inspection (HIGH); competitor feature claims from marketing pages, not API docs (MEDIUM) |
| Architecture | HIGH | Derived entirely from reading actual schema, services, and components — not assumed |
| Pitfalls | HIGH | Eight pitfalls identified from direct schema/service analysis; recovery strategies are concrete SQL |

**Overall confidence:** HIGH

### Gaps to Address

- **OrdenConsumo module injection pattern:** Whether ordenes-consumo service should import InventarioService from StockModule or use PrismaService directly depends on whether StockModule exports InventarioService. Confirm during Phase F planning.
- **ultimoTratamientoId stored vs. queried:** Architecture and Pitfalls research both recommend query-on-read (ORDER BY fecha DESC LIMIT 1) over a denormalized FK. Decision must be locked in Phase A.
- **HC wizard step state architecture:** LiveTurnoPanel may already use a top-level RHF form wrapping all steps, or each step may have its own local state. The refactor scope for Phase B depends on which is true. Read LiveTurnoPanel.tsx + PrimeraConsultaForm.tsx at phase planning time.
- **CRM etapaCRM valid initial values:** For TRATAMIENTO to CIRUGIA flujo change, NUEVO_LEAD is assumed as the correct initial etapaCRM. Verify against CRM kanban column definitions before Phase D implementation.

---

## Sources

### Primary (HIGH confidence)
- `backend/src/prisma/schema.prisma` — full schema structure, existing model shapes, missing fields confirmed
- `frontend/package.json` + `backend/package.json` — all installed package versions confirmed
- `frontend/src/components/DiagnosticoCombobox.tsx`, `PlanCombobox.tsx`, `CategoriaProductoCombobox.tsx` — cmdk multi-select pattern confirmed
- `backend/src/modules/historia-clinica/historia-clinica.service.ts` — crearEntrada() signature; turnoId not in DTO confirmed
- `backend/src/modules/presupuestos/dto/create-presupuesto.dto.ts` — no catalog FK on PresupuestoItem confirmed
- `frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx` — no ultimo tratamiento column confirmed
- `frontend/src/hooks/useLiveTurnoActions.ts`, `useCerrarLote.ts` — sonner toast pattern; no existing onMutate optimistic updates confirmed
- TanStack Query v5 official docs — cancelQueries async behavior confirmed
- Prisma docs — explicit join table required for M2N with extra fields confirmed

### Secondary (MEDIUM confidence)
- Pabau stock management feature pages — stock-linked services, auto-deduct pattern
- Nubimed Argentina product page — "quick quotes from catalog" feature
- PatientNow medical aesthetics page — procedure library, catalog-driven quoting
- Nextech plastic surgery PM — general plastic surgery SaaS patterns
- v1.4 Key Decisions in `.planning/PROJECT.md` — CRM side effects, guard patterns

### Tertiary (LOW confidence)
- Pabau, Nubimed, PatientNow feature comparisons — marketing claims, not API documentation; competitor feature table is directional, not definitive

---

*Research completed: 2026-04-22*
*Ready for roadmap: yes*
