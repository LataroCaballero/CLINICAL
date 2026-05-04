# Architecture Research

**Domain:** Catalog-driven clinical workflows (v1.5 Catálogos Clínicos y Flujos de Atención)
**Researched:** 2026-04-22
**Confidence:** HIGH — derived entirely from reading the actual codebase (schema, services, controllers, components)

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                               │
│                                                                        │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────────────┐   │
│  │ /pacientes   │  │ /turnos        │  │ /stock + /finanzas      │   │
│  │  page.tsx    │  │  page.tsx      │  │  (existing pages)       │   │
│  │  TratamTab   │  │  LiveTurnoPanel│  │                         │   │
│  └──────┬───────┘  └───────┬────────┘  └──────────┬──────────────┘   │
│         │                  │                       │                  │
│  ┌──────▼──────────────────▼───────────────────────▼──────────────┐  │
│  │              TanStack Query hooks (frontend/src/hooks/)         │  │
│  │   useTratamientosProfesional · useCirugias · useOrdenConsumo   │  │
│  │   useCreatePresupuesto · useCreateHistoriaClinicaEntry          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                              │ HTTP/JSON (axios + JWT)
┌──────────────────────────────────────────────────────────────────────┐
│                        NestJS Backend                                  │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ tratamientos │  │  cirugias-   │  │historia-clin │                │
│  │  module      │  │  catalogo    │  │  module      │                │
│  │  (modified)  │  │  (NEW)       │  │  (modified)  │                │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                │
│         │                  │                  │                       │
│  ┌──────▼──────────────────▼──────────────────▼───────────────────┐  │
│  │   presupuestos · stock · pacientes · ordenes-consumo (NEW)      │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                      PrismaService                              │   │
│  └────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────────────┐
│                     PostgreSQL (via PgBouncer)                         │
│                                                                        │
│  Tratamiento · TratamientoInsumo(NEW) · CirugiasCatalogo(NEW)         │
│  CirugiaInsumo(NEW) · HistoriaClinicaEntrada(modified)                │
│  OrdenConsumo(NEW) · PresupuestoItem(modified) · Paciente(modified)   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Existing Architecture: What Already Exists

### Backend modules (confirmed from filesystem)

| Module | Path | Current State |
|--------|------|---------------|
| `tratamientos` | `backend/src/modules/tratamientos/` | Exists. CRUD for `Tratamiento` per-profesional (nombre, descripcion, precio, duracionMinutos, activo). Also has legacy `TratamientoCatalogo` (global, unused going forward). |
| `presupuestos` | `backend/src/modules/presupuestos/` | Exists. `PresupuestoItem` has only `descripcion` + `precioTotal` — no catalog FK. PDF + email services present. |
| `historia-clinica` | `backend/src/modules/historia-clinica/` | Exists. `crearEntrada()` builds JSONB `contenido` field. `tratamientos` in HC stored as free `TratamientoItemDto[]` in JSON, not FK. `turnoId` relationship is via `Turno.entradaHCId` (turno → entrada, not entrada → turno). |
| `stock` | `backend/src/modules/stock/` | Exists. Split into 5 services: inventario, productos, proveedores, ordenes-compra, ventas-producto. `Inventario` is `productoId + profesionalId`. No `OrdenConsumo` model yet. |
| `pacientes` | `backend/src/modules/pacientes/` | Exists. Has `PATCH /:id/flujo` endpoint using `UpdateFlujoDto`. No `ultimoTratamientoId` field yet. |
| `turnos` | `backend/src/modules/turnos/` | Exists. `Turno` has `cirugiaId?` (FK to surgery session), `entradaHCId?`, `esCirugia` boolean. |
| `tipos-turno` | `backend/src/modules/tipos-turno/` | Exists. `TipoTurno` has `flujoPaciente: FlujoPaciente?` (used to filter TRATAMIENTO turnos in TratamientosTab). |

### Key existing model facts (from schema.prisma)

- `Cirugia` already exists but is a **surgery session** (per-patient: fecha, procedimiento, quirofano, etc.) — NOT a catalog. v1.5 adds a **CirugiasCatalogo** concept (per-profesional: nombre, precioARS, precioUSD, duracion, insumos).
- `Tratamiento` already exists as a per-profesional catalog with pricing. Missing: `insumos` join table (TratamientoInsumo → Producto/Inventario).
- `PresupuestoItem` is currently free-text only (`descripcion` + `precioTotal`). Missing: `catalogItemId`, `catalogItemType` enum.
- `HistoriaClinicaEntrada` stores treatments in JSONB `contenido`. The `turnoId` association is inverted — Turno holds `entradaHCId?`, making HC entry the owner. `turnoId` becoming optional on HistoriaClinicaEntrada is already effectively true since Turno can exist without an HC entry — adding HC from PatientDrawer (without a turno) only requires ensuring `historiaClinica.crearEntrada()` does not require a turnoId.
- `Paciente` has no `ultimoTratamientoId` FK yet.

### Frontend components (confirmed from filesystem)

| Component | Path | Current State |
|-----------|------|---------------|
| `TratamientosTab` | `frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx` | Exists. Shows TRATAMIENTO-type turnos grouped by month. No "último tratamiento" column. |
| `PrimeraConsultaForm` | `frontend/src/components/live-turno/tabs/hc/PrimeraConsultaForm.tsx` | Exists. Uses chip UI from `ZONAS`/`CATEGORIAS_TRATAMIENTO` constants + `useTratamientosProfesional` hook for catalog. Treatments stored as free `{ nombre, precio }` objects, not FK. |
| `HistorialClinicoPanel` | `frontend/src/components/live-turno/tabs/hc/HistorialClinicoPanel.tsx` | Exists. Read-only display of HC entries. |
| `PatientDrawer` | `frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx` | Exists as page-level component. Views under `frontend/src/components/patient/PatientDrawer/views/` (PresupuestosView, etc.) — no flujo-change action yet, no HC creator. |
| `GenerarPresupuestoModal` | `frontend/src/components/live-turno/tabs/hc/GenerarPresupuestoModal.tsx` | Exists inside LiveTurno HC tab. Free-text item entry only. |
| `LiveTurnoPanel` | `frontend/src/components/live-turno/LiveTurnoPanel.tsx` | Root panel component. Has tabs via `LiveTurnoTabs.tsx`. |

---

## New vs Modified Components

### Schema Changes

**NEW models to add via Prisma migration:**

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `TratamientoInsumo` | Join table: Tratamiento ↔ Producto (stock) with quantity | `tratamientoId`, `productoId`, `cantidad: Int` |
| `CirugiasCatalogo` | Per-profesional surgery catalog | `profesionalId`, `nombre`, `precioARS`, `precioUSD`, `duracionEstimada`, `activo: Boolean` |
| `CirugiaInsumo` | Join table: CirugiasCatalogo ↔ Producto with quantity | `cirugiasCatalogoId`, `productoId`, `cantidad: Int` |
| `OrdenConsumo` | Stock consumption order from HC | `pacienteId`, `profesionalId`, `entradaHCId?`, `fecha`, `estado: EstadoOrdenConsumo`, `insumos: Json` (snapshot) |

**NEW enums to add:**

| Enum | Values |
|------|--------|
| `EstadoOrdenConsumo` | `PENDIENTE`, `CONFIRMADA`, `CANCELADA` |
| `CatalogItemType` | `CIRUGIA`, `TRATAMIENTO` |

**MODIFIED models:**

| Model | Change | Why |
|-------|--------|-----|
| `Tratamiento` | Add `insumos TratamientoInsumo[]` relation | Connects catalog item to stock products |
| `PresupuestoItem` | Add `catalogItemId: String?`, `catalogItemType: CatalogItemType?` | Enables auto-populate from catalog; backward-compatible (optional) |
| `HistoriaClinicaEntrada` | Add `consumirInsumos: Boolean @default(false)`, `tratamientoIds: String[]` (Postgres array) | Tracks which catalog treatments were applied; triggers OrdenConsumo creation |
| `Paciente` | Add `ultimoTratamientoId: String?` FK to `Tratamiento` | Powers "último tratamiento" column in TratamientosTab |

**Note on `turnoId` on HistoriaClinicaEntrada:** The association currently runs `Turno.entradaHCId?` → `HistoriaClinicaEntrada`. HC entries created from PatientDrawer (without a turno) simply have no Turno pointing at them — no schema change needed. The `crearEntrada()` service already does not require a turnoId.

### Backend New/Modified

| Item | Type | Change |
|------|------|--------|
| `cirugias-catalogo` | NEW module | Full NestJS module: `CirugiasCatalogo.module/controller/service` + DTOs. CRUD scoped to `profesionalId`. Endpoints: `GET /cirugias-catalogo`, `POST`, `PATCH/:id`, `DELETE/:id` (soft-delete). |
| `tratamientos.service.ts` | MODIFIED | Add `findAllWithInsumos()` (include TratamientoInsumo → Producto). Add `updateInsumos()` mutation. |
| `tratamientos.controller.ts` | MODIFIED | Add `GET /tratamientos/:id/insumos`, `PUT /tratamientos/:id/insumos`. |
| `historia-clinica.service.ts` | MODIFIED | `crearEntrada()`: accept `tratamientoIds[]` + `consumirInsumos: boolean`. When `consumirInsumos = true`, create `OrdenConsumo` in same transaction. Update `Paciente.ultimoTratamientoId` when `tratamientoIds` non-empty. |
| `historia-clinica/dto/crear-entrada.dto.ts` | MODIFIED | Add `tratamientoIds?: string[]`, `consumirInsumos?: boolean`. `turnoId` is already optional (not in DTO). |
| `presupuestos.service.ts` | MODIFIED | `create()`: accept `catalogItemId?` + `catalogItemType?` per item. Auto-populate `descripcion` + `precioTotal` from catalog if provided and not overridden. |
| `presupuestos/dto/create-presupuesto.dto.ts` | MODIFIED | Add optional `catalogItemId?: string`, `catalogItemType?: string` to `PresupuestoItemDto`. |
| `ordenes-consumo` | NEW module | Lightweight module for stock team. `GET /ordenes-consumo?profesionalId=&estado=PENDIENTE`, `PATCH /ordenes-consumo/:id/confirmar` (triggers MovimientoStock SALIDA). |
| `pacientes.service.ts` | MODIFIED | Add `updateUltimoTratamiento(pacienteId, tratamientoId)` called from HC service. |

### Frontend New/Modified

| Item | Type | Change |
|------|------|--------|
| `useCirugiasCatalogo.ts` | NEW hook | `GET /cirugias-catalogo?profesionalId=` — list for selector dropdowns. |
| `useCreateCirugiasCatalogo.ts` | NEW hook | `POST /cirugias-catalogo` mutation. |
| `useTratamientosConInsumos.ts` | NEW hook | `GET /tratamientos?includeInsumos=true` — enhanced version of existing hook. |
| `useOrdenesConsumo.ts` | NEW hook | `GET /ordenes-consumo?profesionalId=&estado=PENDIENTE`. |
| `useConfirmarOrdenConsumo.ts` | NEW hook | `PATCH /ordenes-consumo/:id/confirmar`. |
| `useUpdateFlujo.ts` | NEW hook | `PATCH /pacientes/:id/flujo` with optimistic update. |
| `PrimeraConsultaForm.tsx` | MODIFIED | Replace free `TratamientoItemDto[]` chip UI with catalog combobox (`useTratamientosProfesional`). Add `consumirInsumos` checkbox. Pass `tratamientoIds[]` to `useCreateHistoriaClinicaEntry`. |
| `GenerarPresupuestoModal.tsx` | MODIFIED | Add "seleccionar del catálogo" button/panel. CirugiasCatalogo + Tratamiento selectors pre-populate description and price. |
| `TratamientosTab.tsx` | MODIFIED | Add "Último tratamiento" column — read `Paciente.ultimoTratamientoId` → `Tratamiento.nombre`. Fetch via backend include, not N+1. |
| `PatientDrawer` (views) | MODIFIED | Add flujo-change action button/dropdown → calls `useUpdateFlujo` with optimistic update. Add HC creator panel using the same `PrimeraConsultaForm` (wrapped in modal). |
| `GestionTratamientos.tsx` | MODIFIED | Add insumos management section per tratamiento (product combobox + quantity input). Exists at `frontend/src/app/dashboard/configuracion/components/GestionTratamientos.tsx`. |
| `CirugiasCatalogoSection` | NEW | UI for CRUD of CirugiasCatalogo per profesional. Lives under `/dashboard/configuracion`. |
| Stock ordenes-consumo view | NEW | Table of OrdenConsumo with PENDIENTE filter and confirm button. Lives under `/dashboard/stock/ordenes-consumo`. |

---

## Data Flow Changes

### Flow 1: HC Entry with Catalog Tratamientos (LiveTurno or PatientDrawer)

```
User selects tratamientos from catalog combobox + checks "Consumir insumos"
    ↓
PrimeraConsultaForm.onChange({ tratamientoIds: ['uuid1', 'uuid2'], consumirInsumos: true, ... })
    ↓
useCreateHistoriaClinicaEntry.mutate({ pacienteId, tratamientoIds, consumirInsumos, ... })
    ↓
POST /historia-clinica/:pacienteId/entradas
    ↓
HistoriaClinicaService.crearEntrada() [transaction]:
  1. Resolve or create HistoriaClinica record
  2. Create HistoriaClinicaEntrada (with tratamientoIds[], consumirInsumos)
  3. If consumirInsumos = true:
     - Fetch TratamientoInsumo records for each tratamientoId
     - Build insumos snapshot
     - Create OrdenConsumo { estado: PENDIENTE, insumos: snapshot }
  4. Update Paciente.ultimoTratamientoId = tratamientoIds[last]
  5. Update Paciente.diagnostico/tratamiento strings (existing behavior)
    ↓
Frontend: invalidate ['historia-clinica', pacienteId], ['pacientes'] queries
```

### Flow 2: Presupuesto with Catalog Items

```
User clicks "Agregar del catálogo" in GenerarPresupuestoModal
    ↓
CirugiasCatalogo or Tratamiento selector populates item row:
  { descripcion: catalogItem.nombre, precioTotal: catalogItem.precio, catalogItemId, catalogItemType }
    ↓
useCreatePresupuesto.mutate({ ..., items: [{ descripcion, precioTotal, catalogItemId, catalogItemType }] })
    ↓
POST /presupuestos
    ↓
PresupuestosService.create(): existing total calculation + stores catalogItemId/catalogItemType on PresupuestoItem
    ↓
PDF generation uses existing descripcion field (no catalog-aware changes needed in PDF service)
```

### Flow 3: Flujo Change from PatientDrawer

```
Coordinator clicks flujo badge in PatientDrawer header
    ↓
FlujoSelector dropdown (CIRUGIA | TRATAMIENTO | PENDIENTE) — optimistic update immediately changes badge
    ↓
useUpdateFlujo.mutate({ pacienteId, flujo })
    ↓
PATCH /pacientes/:id/flujo (existing endpoint + service from v1.4)
    ↓
Existing CRM side effects in pacientesService.updateFlujo()
    ↓
Rollback on error (TanStack Query onError)
```

### Flow 4: Stock Consumption Confirmation

```
Stock user navigates to /dashboard/stock/ordenes-consumo
    ↓
useOrdenesConsumo fetches PENDIENTE orders
    ↓
User reviews insumos snapshot and clicks "Confirmar"
    ↓
useConfirmarOrdenConsumo.mutate({ ordenConsumoId })
    ↓
PATCH /ordenes-consumo/:id/confirmar
    ↓
OrdenesConsumoService.confirmar() [transaction]:
  1. For each insumo in snapshot:
     - Find Inventario { productoId, profesionalId }
     - Create MovimientoStock { tipo: SALIDA, cantidad, motivo: 'Orden de consumo HC' }
     - Decrement inventario.stockActual
  2. Update OrdenConsumo.estado = CONFIRMADA
```

---

## Component Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `historia-clinica` → `stock` | Service injection at module level | HistoriaClinicaModule imports StockModule to create OrdenConsumo. Direct injection is simpler and already the pattern in this codebase (no EventEmitter needed). |
| `historia-clinica` → `pacientes` | Service injection | PacientesService.updateUltimoTratamiento() called from HC service inside same transaction scope. |
| `presupuestos` → `tratamientos` catalog | Direct Prisma query | Presupuestos already injects PrismaService — can query Tratamiento table without importing TratamientosModule. |
| `presupuestos` → `cirugias-catalogo` | Direct Prisma query | Same pattern as above — no module import needed for read-only catalog lookup. |
| `ordenes-consumo` → `stock` | Service injection or Prisma direct | OrdenesConsumoService needs to create MovimientoStock. Either import InventarioService from StockModule or use PrismaService directly for the two queries needed. |
| Frontend hooks → Backend | HTTP via axios | All via `frontend/src/lib/api.ts` with JWT interceptor. No changes to auth flow. |

---

## Suggested Build Order (Phase Dependencies)

### Phase A: Schema + Catalog Foundation

**No UI dependency. Every subsequent feature depends on these models.**

1. Prisma migration: `TratamientoInsumo`, `CirugiasCatalogo`, `CirugiaInsumo`, `OrdenConsumo`, `EstadoOrdenConsumo` enum, `CatalogItemType` enum.
2. Modified models: `PresupuestoItem` (optional catalog FKs), `HistoriaClinicaEntrada` (`tratamientoIds String[]`, `consumirInsumos`), `Paciente` (`ultimoTratamientoId`).
3. New `cirugias-catalogo` NestJS module (CRUD only, no frontend yet).
4. Extend `tratamientos` service with `findAllWithInsumos()` and insumos endpoints.
5. New configuracion UI sections (GestionTratamientos insumos + CirugiasCatalogoSection).

**Schema design note for `tratamientoIds` on HistoriaClinicaEntrada:** Use `String[]` (Postgres array) rather than a join table. The data is primarily written once and read for display. A join table (TratamientoEntrada) is only needed if future reporting requires "all patients who received tratamiento X" — that is a v2 reporting concern. Postgres array with `@db.array` is sufficient at this scale.

### Phase B: HC Integration

**Depends on Phase A. Core of v1.5.**

1. Modify `crearEntrada()` in `historia-clinica.service.ts`: accept `tratamientoIds`, `consumirInsumos`, create OrdenConsumo in transaction, update `Paciente.ultimoTratamientoId`.
2. Modify `PrimeraConsultaForm.tsx`: replace chip-based tratamiento UI with catalog combobox.
3. Wire updated form state to `useCreateHistoriaClinicaEntry` hook.
4. Add HC creator to PatientDrawer (reuse `PrimeraConsultaForm` in a modal, no duplication).

### Phase C: Presupuestos with Catalog

**Depends on Phase A only. Can run parallel with Phase B.**

1. Modify `PresupuestosService.create()`: handle optional `catalogItemId` + `catalogItemType` on items.
2. Modify `GenerarPresupuestoModal.tsx`: add catalog selector panel.
3. Update `CreatePresupuestoDto` with optional catalog fields.

### Phase D: PatientDrawer Flujo Action

**Independent — `PATCH /pacientes/:id/flujo` already exists from v1.4. Frontend only.**

1. Add flujo-change button/selector to PatientDrawer.
2. `useUpdateFlujo` hook with optimistic update + rollback.

### Phase E: TratamientosTab "Último Tratamiento" Column

**Depends on Phase A (field exists) + Phase B (field gets populated).**

1. Include `ultimoTratamiento: { nombre }` in turno/paciente query response from backend.
2. Add column to `TratamientosTab.tsx`.

### Phase F: Stock Ordenes de Consumo UI

**Depends on Phase A (model exists) + Phase B (records created).**

1. New `ordenes-consumo` NestJS module (GET list + PATCH confirm).
2. `useOrdenesConsumo` + `useConfirmarOrdenConsumo` hooks.
3. Stock page `/dashboard/stock/ordenes-consumo` with PENDIENTE table + confirm action.

**Recommended parallel execution:**
```
Phase A (schema + catalog CRUD)
    ↓
Phase B (HC integration) ─────── Phase C (presupuestos catalog) ─── parallel
Phase D (drawer flujo)   ─── can even go before Phase A (pure frontend to existing endpoint)
    ↓ (after B completes)
Phase E (último tratamiento column)
Phase F (stock ordenes UI)
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Reusing the existing `Cirugia` model as a catalog

**What happens:** Extending `Cirugia` (which is a per-patient surgery session with fecha, quirofano, anestesiologo) to also serve as a catalog entry.

**Why it's wrong:** `Cirugia` is a clinical event record — a surgery that happened. Adding catalog fields to it mixes semantics, breaks surgical scheduling reports, and makes the catalog dependent on having a patient attached.

**Do this instead:** Create a separate `CirugiasCatalogo` model. Keep `Cirugia` (surgery session) entirely untouched.

### Anti-Pattern 2: Storing catalog FKs inside `contenido` JSONB

**What happens:** Continuing to store treatment references inside the `contenido: Json?` blob on `HistoriaClinicaEntrada`.

**Why it's wrong:** JSONB fields are opaque to Postgres indexes and Prisma relations. You cannot query "all entries that used tratamiento X" without full table scans and application-level parsing. Reporting and the "último tratamiento" feature both need queryable data.

**Do this instead:** Add `tratamientoIds: String[]` as a proper Postgres array column. Keep JSONB for display/narrative content only.

### Anti-Pattern 3: Decrementing stock directly inside `crearEntrada()`

**What happens:** The HC service tries to decrement `Inventario.stockActual` directly at entry creation time.

**Why it's wrong:** Stock consumption requires confirmation by a stock-responsible user. Automatic decrement at HC save removes the review step and corrupts inventory if entries are created in error.

**Do this instead:** HC service creates `OrdenConsumo { estado: PENDIENTE }` only — a record of intent. The actual `MovimientoStock` creation happens only when the stock user confirms via the dedicated endpoint.

### Anti-Pattern 4: N+1 queries for "último tratamiento" in TratamientosTab

**What happens:** For each turno row in TratamientosTab, making a separate request to resolve the patient's último tratamiento.

**Why it's wrong:** TratamientosTab already loads turnos in bulk by month. Per-patient fetches create N requests for N patients.

**Do this instead:** Include `paciente: { select: { ultimoTratamiento: { select: { nombre: true } } } }` in the existing turno query response. One query covers all rows.

### Anti-Pattern 5: Duplicating PrimeraConsultaForm logic for PatientDrawer

**What happens:** Building a separate similar HC creator component for PatientDrawer instead of reusing the LiveTurno form.

**Why it's wrong:** Both surfaces must produce identical `CreateEntradaDto` shapes. Separate implementations diverge, causing subtle differences in what gets saved.

**Do this instead:** `PrimeraConsultaForm` is already context-agnostic (receives `onChange` + `onGenerarPresupuesto` + `obraSocialId` props). Wrap it in a modal for PatientDrawer use. Same component, two call sites.

---

## Scaling Considerations

| Scale | Architecture Notes |
|-------|-------------------|
| Current (1-10 clinics) | All synchronous service injections are fine. OrdenConsumo PENDIENTE list will be short (< 50/day per clinic). |
| 100+ clinics | `Inventario` lookups per OrdenConsumo confirmation may slow down. `@@unique([productoId, profesionalId])` on Inventario already covers the index — no additional index needed. |
| High OrdenConsumo volume | Plan cursor-based pagination from the start in `GET /ordenes-consumo`. A simple `take/skip` is fine now but the endpoint contract should include pagination params to avoid a breaking change later. |

---

## Integration Points Summary

| New Feature | Integrates With | Mechanism |
|-------------|-----------------|-----------|
| TratamientoInsumo | `Producto` (stock) | Prisma FK `productoId` |
| CirugiasCatalogo | `Profesional` | Scoped by `profesionalId` — same tenant-isolation pattern as Tratamiento |
| HC entry → OrdenConsumo | `stock` module | HistoriaClinicaModule imports PrismaService (already present) or StockModule |
| HC entry → `ultimoTratamientoId` | `pacientes` module | `prisma.paciente.update()` inside HC transaction |
| PresupuestoItem → catalog | `tratamientos` + `cirugias-catalogo` | Optional FK fields; catalog lookup at creation time via direct Prisma query |
| PatientDrawer flujo action | `pacientes` endpoint | Existing `PATCH /pacientes/:id/flujo` — CRM side effects already implemented in v1.4 |
| TratamientosTab "último tratamiento" | `Paciente.ultimoTratamientoId` | Include in turno query response (backend change); read-only display (frontend) |
| OrdenConsumo confirm → MovimientoStock | `inventario.service.ts` / Prisma direct | Transaction: inventory lookup + MovimientoStock create + stockActual decrement |

---

## Sources

- `backend/src/prisma/schema.prisma` — full schema inspected (confirmed all model shapes and existing relations)
- `backend/src/modules/tratamientos/tratamientos.service.ts` — confirmed Tratamiento CRUD pattern
- `backend/src/modules/presupuestos/dto/create-presupuesto.dto.ts` — confirmed PresupuestoItem has no catalog FK
- `backend/src/modules/historia-clinica/historia-clinica.service.ts` — confirmed crearEntrada() signature and JSONB pattern
- `frontend/src/components/live-turno/tabs/hc/PrimeraConsultaForm.tsx` — confirmed tratamiento chip UI stores free objects, not FKs
- `frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx` — confirmed current tab state (no último tratamiento column)
- `frontend/src/hooks/` directory listing — confirmed full existing hooks inventory
- `.planning/PROJECT.md` — milestone context, validated requirements, and existing Key Decisions

---

*Architecture research for: v1.5 Catálogos Clínicos y Flujos de Atención — NestJS + Prisma + Next.js clinic SaaS*
*Researched: 2026-04-22*
