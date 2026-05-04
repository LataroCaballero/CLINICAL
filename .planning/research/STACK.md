# Stack Research — v1.5 Catálogos Clínicos y Flujos de Atención

**Domain:** Clinical SaaS — catalog extensions, stock-linked items, optimistic UI
**Researched:** 2026-04-22
**Confidence:** HIGH

## Summary

v1.5 requires zero new npm packages. Every capability needed — multi-select catalog
pickers, optimistic mutations, many-to-many Prisma relations with quantities, pending
consumption orders — is already covered by the installed stack. The work is schema
additions + service composition + hook patterns, not dependency acquisition.

---

## New Dependencies: None

All v1.5 features map cleanly to existing installed libraries:

| Feature | Mechanism | Already Installed |
|---------|-----------|-------------------|
| Catalog item → stock linking (m-n with quantity) | Prisma explicit join table | @prisma/client ^6.1.0 |
| Pending stock consumption orders | New Prisma model + enum | @prisma/client ^6.1.0 |
| Budget items from catalog (auto-fill price) | PresupuestoItem FK extension + NestJS endpoint | @nestjs/common ^10 |
| Multi-select catalog picker | cmdk ^1.1.1 + Radix Popover + Command | cmdk ^1.1.1 (installed) |
| Optimistic UI with rollback | TanStack Query v5 onMutate / onError | @tanstack/react-query ^5.90.6 |
| Error toasts | sonner ^2.0.7 | sonner ^2.0.7 (installed) |
| Catalog forms with validation | React Hook Form + Zod | both installed |

**Installation:** nothing.

---

## Recommended Stack (existing, confirmed from package.json inspection)

### Core Technologies

| Technology | Version | Role in v1.5 |
|------------|---------|--------------|
| Prisma | ^6.1.0 | New explicit join table `TratamientoInsumo`; new models `CatalogoCirugia`, `CatalogoCirugiaInsumo`, `OrdenConsumo`, `OrdenConsumoItem`; new enum `EstadoOrdenConsumo`; optional FK on `PresupuestoItem` |
| NestJS | ^10.0.0 | New `catalogos-cirugia` module; extend `tratamientos` service with insumo relations; extend `presupuestos` service for catalog-linked items |
| @tanstack/react-query | ^5.90.6 | Optimistic mutations via `onMutate` / `cancelQueries` (async) / `setQueryData` / `onError` rollback for flujo change in PatientDrawer |
| cmdk | ^1.1.1 | Multi-select catalog picker comboboxes — same Popover + Command + CommandInput pattern used in `DiagnosticoCombobox.tsx` and `PlanCombobox.tsx`, extended to multi-select with checkbox state |
| sonner | ^2.0.7 | Error toasts on mutation failure (`toast.error()`); already wired in `useLiveTurnoActions.ts`, `useCerrarLote.ts`, `useFacturadorDashboard.ts` |
| Zod | ^4.1.13 | DTO schemas for catalog items, insumo arrays with quantities |
| React Hook Form | ^7.68.0 | LiveTurno HC "Tratamiento en Consultorio" section: catalog selector + insumo checklist |
| @radix-ui/react-checkbox | ^1.3.3 | Per-insumo checkboxes inside HC treatment section |

### Supporting Libraries (already installed, newly applied)

| Library | Version | New Usage |
|---------|---------|-----------|
| @radix-ui/react-popover | ^1.1.15 | Wrap `Command` for catalog picker dropdown anchor |
| @radix-ui/react-dialog | ^1.1.15 | PatientDrawer flujo-change confirmation prompt |
| lucide-react | ^0.553.0 | FlaskConical (insumos), Stethoscope (tratamientos), Scissors (cirugías) icons in catalog UI |
| date-fns | ^4.1.0 | "Último tratamiento" date formatting in Tratamientos tab column |
| @tanstack/react-table | ^8.21.3 | Insumo table inside catalog item edit form (already used in stock module) |

---

## Patterns to Apply

### 1. Many-to-Many Tratamiento ↔ Producto with Quantity

Use an explicit Prisma join table (not implicit m-n) because the relation needs a
`cantidad` field. Prisma implicit m-n tables cannot carry extra data.

```prisma
model TratamientoInsumo {
  id            String      @id @default(uuid())
  tratamientoId String
  productoId    String
  cantidad      Int         @default(1)
  tratamiento   Tratamiento @relation(fields: [tratamientoId], references: [id], onDelete: Cascade)
  producto      Producto    @relation(fields: [productoId], references: [id])

  @@unique([tratamientoId, productoId])
  @@index([tratamientoId])
}
```

Same pattern applies to `CatalogoCirugiaInsumo` (many-to-many between `CatalogoCirugia`
and `Producto`).

### 2. Pending Consumption Orders

New model with status enum rather than writing `MovimientoStock` (SALIDA) directly from
HC. This mirrors the existing `OrdenCompra` → `MovimientoStock` decoupled pattern:

```prisma
enum EstadoOrdenConsumo {
  PENDIENTE
  CONFIRMADA
  CANCELADA
}

model OrdenConsumo {
  id          String             @id @default(uuid())
  entradaHCId String
  profesionalId String
  estado      EstadoOrdenConsumo @default(PENDIENTE)
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  items       OrdenConsumoItem[]
  entradaHC   HistoriaClinicaEntrada @relation(fields: [entradaHCId], references: [id])
  profesional Profesional        @relation(fields: [profesionalId], references: [id])
}

model OrdenConsumoItem {
  id             String       @id @default(uuid())
  ordenConsumoId String
  productoId     String
  cantidad       Int
  ordenConsumo   OrdenConsumo @relation(fields: [ordenConsumoId], references: [id], onDelete: Cascade)
  producto       Producto     @relation(fields: [productoId], references: [id])
}
```

The HC write path creates `OrdenConsumo` with `estado = PENDIENTE`. The stock module
confirms it (transitions to `CONFIRMADA`) and writes the actual `MovimientoStock` SALIDA
entry then. This is the same audit pattern as `OrdenCompra`.

### 3. Optimistic UI — TanStack Query v5 Pattern

The codebase currently uses only `invalidateQueries` on success — no optimistic updates
exist yet. The flujo-change action in PatientDrawer warrants optimistic handling because
it's a user-initiated toggle on a visible field:

```typescript
const mutation = useMutation({
  mutationFn: (flujo: FlujoPaciente) =>
    api.patch(`/pacientes/${id}/flujo`, { flujo }),
  onMutate: async (flujo) => {
    // v5: cancelQueries is async — must be awaited
    await queryClient.cancelQueries({ queryKey: ['paciente', id] });
    const prev = queryClient.getQueryData(['paciente', id]);
    queryClient.setQueryData(['paciente', id], (old: any) => ({ ...old, flujo }));
    return { prev };
  },
  onError: (_err, _vars, context) => {
    queryClient.setQueryData(['paciente', id], context?.prev);
    toast.error('Error al cambiar el flujo del paciente');
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['paciente', id] });
    queryClient.invalidateQueries({ queryKey: ['pacientes'] });
  },
});
```

Key v5 difference: `cancelQueries` returns a Promise and must be awaited inside
`onMutate`. In TanStack Query v4 it was fire-and-forget. Getting this wrong means
the optimistic write races with an in-flight refetch.

### 4. Multi-Select Catalog Picker

The existing `cmdk` 1.1.1 + `Popover` + `Command` pattern (used in `DiagnosticoCombobox.tsx`,
`PlanCombobox.tsx`, `CategoriaProductoCombobox.tsx`) is extended for multi-select by
maintaining a `string[]` state and preventing auto-close on item selection:

```typescript
// Pseudocode — no new library, just state management
const [selected, setSelected] = useState<string[]>([]);
// In CommandItem onClick: toggle id in/out of selected[]
// In PopoverTrigger: display selected count or names
// Keep Popover open until explicit "Done" or outside click
```

For budget item selection (single catalog entry auto-filling price): single-select,
same pattern as existing `PlanCombobox.tsx`.

### 5. Catalog-Linked Budget Items

Extend `PresupuestoItem` with optional FK columns to catalog sources. The backend
service auto-fills `descripcion` and `precioTotal` from catalog when a `catalogoId` is
provided; `descripcion` remains free-text for manual items (existing behavior):

```prisma
model PresupuestoItem {
  // ... existing fields unchanged ...
  tratamientoId   String?   // nullable: sourced from tratamiento catalog
  cirugiaId       String?   // nullable: sourced from cirugia catalog
  precioUSD       Decimal?  @db.Decimal(10, 2) // NEW: USD price for dual-currency display
}
```

The frontend catalog picker calls a new `GET /presupuestos/catalogo` endpoint that
returns combined tratamientos + cirugias list with both ARS and USD prices. Selecting
an entry pre-populates the item form. Existing free-text item entry path is unchanged.

### 6. New CatalogoCirugia Module

New NestJS module `catalogos-cirugia` scoped per-profesional (same pattern as
`tratamientos` module with `profesionalId` from JWT or query param for SECRETARIA role):

```
backend/src/modules/catalogos-cirugia/
├── catalogos-cirugia.module.ts
├── catalogos-cirugia.controller.ts
├── catalogos-cirugia.service.ts
└── dto/
    ├── create-catalogo-cirugia.dto.ts
    └── update-catalogo-cirugia.dto.ts
```

Frontend hooks follow the existing `useTratamientosProfesional.ts` pattern:
`useCatalogosCirugia`, `useCreateCatalogoCirugia`, `useUpdateCatalogoCirugia`.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| react-select / downshift | ~350KB extra for multi-select already covered by cmdk 1.1.1 | cmdk + Popover (installed, pattern proven in 4 components) |
| Zustand store for catalog picker selection | Ephemeral form state does not belong in global store | Local `useState` inside picker component |
| SWR optimistic helpers | Redundant — TanStack Query v5 has native `onMutate` | TanStack Query v5 native optimistic pattern |
| Direct MovimientoStock SALIDA from HC save | Bypasses stock module confirmation UX, breaks audit trail | OrdenConsumo model with PENDIENTE state |
| `@tanstack/react-table` for new catalog list UIs | Overkill for simple catalog management lists | Mapped `<div>` rows (pattern used in tratamientos page) — use react-table only if existing stock module integration requires it |
| Global event bus for HC → stock communication | Adds complexity, bypasses Prisma transaction boundary | OrdenConsumo creation inside HC save service call, stock module reads from it |

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Explicit `TratamientoInsumo` join table | Prisma implicit m-n | Implicit m-n tables cannot carry `cantidad` field — this is a Prisma hard limitation |
| `OrdenConsumo` pending model | Write `MovimientoStock` SALIDA directly from HC | Tight coupling; stock movements need confirmation step per UX requirement; breaks existing stock audit trail pattern |
| cmdk multi-select (existing) | react-select | 350KB dependency for a capability already implemented via cmdk; inconsistent UX with existing comboboxes |
| TanStack Query v5 `onMutate` pattern | Zustand local optimistic state | TanStack already owns server state cache; mixing Zustand adds sync complexity on error rollback |
| Optional FK on `PresupuestoItem` (nullable) | Separate `PresupuestoItemCatalogo` table | Nullable FK on existing table is simpler; the join table adds no value when one-to-one per item |

---

## Version Compatibility

| Package | Version | Notes |
|---------|---------|-------|
| @prisma/client | ^6.1.0 | Explicit join tables with extra fields: supported since Prisma 4. `onDelete: Cascade` required on the owning side of the join table relation. |
| @tanstack/react-query | ^5.90.6 | `cancelQueries` in v5 is **async** (returns `Promise<void>`) and must be awaited inside `onMutate`. This is a breaking change from v4 where it was fire-and-forget. Project is already on v5. |
| cmdk | ^1.1.1 | Multi-select is controlled state in userland, not a cmdk API flag. No version constraints. |
| sonner | ^2.0.7 | `toast.error(message)` API unchanged since v1. |
| zod | ^4.1.13 | Project is on Zod 4. New schemas must use Zod 4 API (`.optional()` chains, error handling differ from Zod 3). Do not copy Zod 3 patterns from older files. |

---

## Migration File Naming

Follow existing convention: `YYYYMMDDHHMMSS_descripcion_snake_case`

Suggested: `20260422000000_catalogos_clinicos_v15`

Contents (additive, no destructive changes):
1. `CREATE TYPE "EstadoOrdenConsumo" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CANCELADA')`
2. `CREATE TABLE "TratamientoInsumo"` (explicit join table)
3. `CREATE TABLE "CatalogoCirugia"` (new catalog per-profesional)
4. `CREATE TABLE "CatalogoCirugiaInsumo"` (explicit join table with cantidad)
5. `CREATE TABLE "OrdenConsumo"` + `"OrdenConsumoItem"` (consumption orders)
6. `ALTER TABLE "PresupuestoItem" ADD COLUMN "tratamientoId" TEXT, ADD COLUMN "cirugiaId" TEXT, ADD COLUMN "precioUSD" DECIMAL(10,2)` (nullable, no backfill needed)

```bash
# From backend/ directory
npx prisma migrate dev --name catalogos_clinicos_v15
# After migration:
npx prisma generate
```

---

## Sources

- Codebase inspection: `frontend/package.json`, `backend/package.json` — confirmed all installed versions (HIGH)
- Codebase inspection: `frontend/src/components/DiagnosticoCombobox.tsx`, `PlanCombobox.tsx`, `CategoriaProductoCombobox.tsx` — confirmed existing cmdk multi-select pattern (HIGH)
- Codebase inspection: `backend/src/prisma/schema.prisma` — confirmed `OrdenCompra`/`MovimientoStock` decoupled pattern as consumption order precedent; confirmed `TratamientoInsumo` does not yet exist; confirmed `PresupuestoItem` structure (HIGH)
- Codebase inspection: `frontend/src/hooks/useLiveTurnoActions.ts`, `useCerrarLote.ts` — confirmed `sonner` toast pattern; confirmed no existing `onMutate` optimistic updates anywhere in hooks/ (HIGH)
- Codebase inspection: `frontend/src/hooks/useTratamientosProfesional.ts` — confirmed module structure to replicate for CatalogoCirugia (HIGH)
- TanStack Query v5 official docs — `cancelQueries` async behavior, `onMutate` + `onError` rollback contract (HIGH — v5 is the installed major version)
- Prisma docs — explicit join table required for m-n relations with extra fields; `onDelete: Cascade` on relation field (HIGH)

---

*Stack research for: CLINICAL v1.5 — Catálogos Clínicos y Flujos de Atención*
*Researched: 2026-04-22*
*Supersedes: v1.4 STACK.md (2026-04-15) for this milestone*
