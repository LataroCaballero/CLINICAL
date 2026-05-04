# Phase 26: Schema Foundation + Catalog CRUD - Research

**Researched:** 2026-04-22
**Domain:** Prisma schema extension + NestJS module + React CRUD UI with inline combobox
**Confidence:** HIGH (all findings from direct codebase inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Nueva tab "Cirugías" independiente en la página de Configuración, al lado de "Tratamientos"
- Aparece tanto para PROFESIONAL como para SECRETARIA (la secretaria ya puede gestionar tratamientos)
- Nombre del modelo DB: `CirugiaCatalogo` (consistente con `TratamientoCatalogo` existente en schema)
- Los insumos se gestionan **inline dentro del mismo modal de edición** — no hay segundo modal ni drawer separado
- Para agregar insumo: combobox con búsqueda que filtra los productos del stock del profesional
- Los insumos ya agregados se muestran como **tabla compacta**: columnas Producto | Cantidad (editable inline) | × quitar
- El mismo componente/patrón se reutiliza en el modal de Tratamientos y en el modal de Cirugías
- **Conviven** precio manual y `precioBase Decimal?` — no se reemplaza `precio`
- Se agrega `precioBase Decimal?` como campo nuevo (calculado desde insumos, nullable)
- En la tabla de Tratamientos: nueva columna "Costo insumos" que muestra `precioBase`
  - Si el tratamiento no tiene insumos: muestra "—" (sin costo)
  - Si tiene insumos: muestra el valor calculado
- El botón **"Recalcular desde insumos"** está dentro del modal de edición, no en la fila de la tabla
- Para Cirugías: el precio ARS y USD son los precios de venta manuales; `precioBase` (insumos) es referencia de costo

### Claude's Discretion
- Diseño del skeleton/loading state en los modales de edición
- Copy exacto de los labels y mensajes de error
- Orden exacto de las tabs en Configuración (solo se agrega "Cirugías" — posición relativa a "Tratamientos")
- Paginación o lista completa dentro de los catálogos (probablemente lista completa dado el volumen esperado)
- Nombre de los endpoints REST del nuevo módulo cirugias-catalogo

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CATLOG-01 | El profesional puede vincular insumos del stock a un tratamiento del catálogo (relación n:n con cantidad por insumo) | Requires new `TratamientoInsumo` join table in schema + new backend endpoints + inline combobox UI in GestionTratamientos modal |
| CATLOG-02 | El tratamiento del catálogo muestra un precio base calculado a partir del costo de los insumos vinculados (campo estático actualizable con botón "Recalcular", no recalculo automático) | Requires `precioBase Decimal?` on `Tratamiento` model + `recalcularPrecioBase` service method + button in modal |
| CATLOG-03 | El profesional puede crear, editar y eliminar cirugías propias desde la sección de Configuración | Requires new `CirugiaCatalogo` model + full NestJS module + new GestionCirugias component + new tab in configuracion/page.tsx |
| CATLOG-04 | Una cirugía tiene: nombre, precio ARS, precio USD, insumos con cantidades (FK a stock), duración estimada | Defines exact fields for `CirugiaCatalogo` schema model and DTOs |
| CATLOG-05 | El precio base de una cirugía se muestra calculado a partir de los insumos asociados | Requires `precioBase Decimal?` on `CirugiaCatalogo` + `recalcularPrecioBase` method in cirugias service |
| CATLOG-06 | Cada profesional ve y gestiona únicamente sus propias cirugías | Multi-tenant isolation via `profesionalId` FK on `CirugiaCatalogo` — same pattern as `Tratamiento` |
</phase_requirements>

---

## Summary

Phase 26 extends the existing treatments module and adds a new surgeries catalog. The project has a mature, well-structured NestJS + Prisma + Next.js codebase with clear patterns to replicate. The `Tratamiento` model already exists with multi-tenant isolation by `profesionalId` and soft-delete via `activo`. The task is to: (1) add `TratamientoInsumo` join table and `precioBase` field to `Tratamiento`, (2) add new endpoints to the tratamientos module for insumos management, (3) create a brand-new `CirugiaCatalogo` model with `CirugiaInsumo` join table and its full NestJS module, and (4) build the React UI components for both catalogs with an inline insumos management section.

The insumos combobox will query the existing `/inventario` endpoint (filtered by the professional's stock). The `Inventario` type already includes `producto` with `costoBase Decimal?`. Price recalculation is `SUM(producto.costoBase * cantidad)` for each linked insumo, with null costoBase treated as 0.

**Primary recommendation:** Replicate the `Tratamiento` module pattern verbatim for `CirugiaCatalogo`, build a shared `InsumosEditor` sub-component (table + combobox) for reuse in both modals, and add two new endpoints to tratamientos controller (`PUT/DELETE :id/insumos`, `POST :id/recalcular-precio`).

---

## Standard Stack

### Core (already in project — no new installs needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma ORM | Existing (project) | Schema changes + client generation | Already in use; `npx prisma migrate dev` |
| NestJS | Existing | New `cirugias-catalogo` module | Project convention |
| TanStack Query | Existing | New hooks for cirugias catalog | Project convention for all data fetching |
| shadcn/ui (Command, Popover, Table, Dialog) | Existing | Insumos combobox + modal table | Already installed; command.tsx confirmed |
| Zod + React Hook Form | Existing | Could be used for form validation | Project has it; GestionTratamientos uses raw state — replicate that pattern |

### No new dependencies required
All required libraries are already installed in the project.

---

## Architecture Patterns

### Existing `Tratamiento` Module — Full Pattern to Replicate for CirugiaCatalogo

```
backend/src/modules/cirugias-catalogo/
├── cirugias-catalogo.module.ts
├── cirugias-catalogo.controller.ts
├── cirugias-catalogo.service.ts
└── dto/
    ├── create-cirugia-catalogo.dto.ts
    └── update-cirugia-catalogo.dto.ts
```

```
frontend/src/
├── app/dashboard/configuracion/components/
│   ├── GestionCirugias.tsx          (new — mirrors GestionTratamientos.tsx)
│   └── InsumosEditor.tsx            (new — shared inline insumos table+combobox)
├── hooks/
│   └── useCirugiasCatalogo.ts       (new — mirrors useTratamientosProfesional.ts)
└── types/
    └── cirugia-catalogo.ts          (new — mirrors tratamiento.ts)
```

### Pattern 1: Multi-Tenant Controller Helper (getProfesionalId)
**What:** Every controller that owns per-professional data uses this helper to extract the profesionalId from JWT (PROFESIONAL role) or from query param (SECRETARIA/ADMIN role).
**When to use:** Every controller action in the new cirugias-catalogo module.

Exact pattern from `tratamientos.controller.ts` — copy verbatim:
```typescript
// Source: backend/src/modules/tratamientos/tratamientos.controller.ts
private async getProfesionalId(user: any, targetProfesionalId?: string): Promise<string> {
  if ((user.rol === RolUsuario.SECRETARIA || user.rol === RolUsuario.ADMIN) && targetProfesionalId) {
    return targetProfesionalId;
  }
  if (user.rol !== RolUsuario.PROFESIONAL) {
    throw new ForbiddenException('Se requiere profesionalId para gestionar cirugías');
  }
  const profesional = await this.prisma.profesional.findUnique({ where: { usuarioId: user.userId } });
  if (!profesional) throw new ForbiddenException('Perfil profesional no encontrado');
  return profesional.id;
}
```

### Pattern 2: Soft Delete with `activo` flag
**What:** Delete sets `activo: false`, not a hard delete. Restore sets `activo: true`.
**When to use:** All catalog entities — already on `Tratamiento`, must mirror on `CirugiaCatalogo`.

### Pattern 3: Inline Combobox for Insumos (Popover + Command)
**What:** The existing `TratamientosCombobox.tsx` and `CategoriaProductoCombobox.tsx` show the pattern: `Popover` wrapping a `Command` with `CommandInput` + `CommandGroup` + `CommandItem`.
**When to use:** The new `InsumosEditor` component uses this pattern to search the professional's `Inventario` items.

```typescript
// Source: frontend/src/components/TratamientosCombobox.tsx (pattern reference)
import { Command, CommandGroup, CommandItem, CommandInput, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
```

The insumos combobox differs: it queries `/inventario?profesionalId=X` (already available via `useInventario()` hook), filters locally by query string against `producto.nombre`, and on select adds `{ productoId, nombre, cantidad: 1 }` to a local state array.

### Pattern 4: TanStack Query hook shape
```typescript
// Source: frontend/src/hooks/useTratamientosProfesional.ts (pattern)
const QUERY_KEY = 'cirugias-catalogo';

export function useCirugiasCatalogo(includeInactive = false, profesionalId?: string) {
  return useQuery<CirugiaCatalogo[], Error>({
    queryKey: [QUERY_KEY, includeInactive, profesionalId],
    queryFn: async () => {
      const { data } = await api.get('/cirugias-catalogo', {
        params: { ...(includeInactive ? { includeInactive: 'true' } : {}), ...(profesionalId ? { profesionalId } : {}) },
      });
      return data;
    },
  });
}
```

### Anti-Patterns to Avoid
- **Implicit M2M in Prisma for TratamientoInsumo/CirugiaInsumo:** Prisma implicit M2M cannot carry extra fields like `cantidad`. Must use explicit join table models.
- **Auto-recalculate precioBase on insumo save:** Design decision says "Recalcular" is an explicit button action only. Never trigger recalculation automatically.
- **Denormalized `precioBase` column that updates automatically:** The field is only updated when the user clicks "Recalcular" — treat it as a cache/snapshot.
- **Hard delete on cirugías:** Always soft delete (`activo: false`). Future phases (presupuestos) will reference cirugía IDs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Search/filter combobox | Custom input+dropdown | `Command` + `Popover` from shadcn/ui | Already in project; TratamientosCombobox.tsx is the reference |
| Multi-tenant guard | Custom middleware | `getProfesionalId()` helper pattern | Already established in tratamientos controller |
| HTTP client | fetch() | `api` axios instance from `@/lib/api` | Auth interceptor, base URL already configured |
| Cache invalidation | Manual state | `queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })` | TanStack Query handles stale/fresh state |
| Form validation | Custom validation | Inline validation in `handleSubmit` (matches existing GestionTratamientos pattern) | Keeps parity with existing components |

---

## Common Pitfalls

### Pitfall 1: Prisma Unique Constraint on TratamientoInsumo
**What goes wrong:** If you add `@@unique([tratamientoId, productoId])` and then allow adding the same product twice, Prisma throws a P2002.
**Why it happens:** Duplicate insumo entries for the same product in a treatment.
**How to avoid:** Add `@@unique([tratamientoId, productoId])` to the schema and check before inserting in the service (upsert or reject duplicate).

### Pitfall 2: costoBase null on Producto
**What goes wrong:** `SUM` calculation for `precioBase` silently returns wrong value if some products have `costoBase = null`.
**Why it happens:** `costoBase` is `Decimal?` — explicitly nullable on the `Producto` model.
**How to avoid:** In the recalculate service method, treat null costoBase as 0. Show a warning badge in the UI ("Algunos insumos no tienen costo configurado").

### Pitfall 3: Configuring Tabs — Grid Columns Hardcoded
**What goes wrong:** The PROFESIONAL Tabs uses `grid-cols-9` (`className="grid w-full grid-cols-9 max-w-5xl"`). Adding a 10th tab (Cirugías) without updating this class breaks the layout.
**Why it happens:** shadcn/ui Tabs with `grid` layout — columns are hardcoded in className.
**How to avoid:** Change `grid-cols-9` to `grid-cols-10` and adjust `max-w-5xl` accordingly when adding the Cirugías tab.

### Pitfall 4: Secretaria tab count also needs update
**What goes wrong:** The SECRETARIA view has `grid-cols-4` for 4 tabs. When adding Cirugías, it becomes 5.
**Why it happens:** Same hardcoded grid-cols pattern.
**How to avoid:** Check and update SECRETARIA view grid-cols count when adding the new tab.

### Pitfall 5: Prisma migrate dev with new models
**What goes wrong:** Running migration without first running `npx prisma generate` or vice versa leaves the Prisma client out of sync.
**Why it happens:** Prisma client is generated separately from migrations.
**How to avoid:** Always run `npx prisma migrate dev --name add-insumos-catalogs` then `npx prisma generate` in sequence from the `backend/` directory.

### Pitfall 6: Inventario query for combobox uses useEffectiveProfessionalId
**What goes wrong:** If the combobox queries `/inventario` without the correct `profesionalId`, it returns data for the wrong professional (or fails for SECRETARIA).
**Why it happens:** `useInventario()` hook internally uses `useEffectiveProfessionalId()` — but `GestionTratamientos` and `GestionCirugias` receive `profesionalId` as a prop when invoked by SECRETARIA.
**How to avoid:** The `InsumosEditor` sub-component must accept an explicit `profesionalId` prop and pass it to the inventory API call. Don't rely solely on the global store hook.

---

## Code Examples

### Schema additions (Prisma DSL)
```prisma
// Add to existing Tratamiento model:
model Tratamiento {
  // ... existing fields ...
  precioBase  Decimal?           @db.Decimal(10, 2)
  insumos     TratamientoInsumo[]
}

// New join table:
model TratamientoInsumo {
  id            String      @id @default(uuid())
  tratamientoId String
  productoId    String
  cantidad      Decimal     @db.Decimal(10, 3)
  tratamiento   Tratamiento @relation(fields: [tratamientoId], references: [id], onDelete: Cascade)
  producto      Producto    @relation(fields: [productoId], references: [id])

  @@unique([tratamientoId, productoId])
  @@index([tratamientoId])
}

// New catalog model:
model CirugiaCatalogo {
  id              String           @id @default(uuid())
  nombre          String
  precioARS       Decimal?         @db.Decimal(10, 2)
  precioUSD       Decimal?         @db.Decimal(10, 2)
  precioBase      Decimal?         @db.Decimal(10, 2)
  duracionMinutos Int?
  profesionalId   String
  activo          Boolean          @default(true)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  profesional     Profesional      @relation(fields: [profesionalId], references: [id])
  insumos         CirugiaInsumo[]

  @@unique([nombre, profesionalId])
  @@index([profesionalId, activo])
}

model CirugiaInsumo {
  id               String          @id @default(uuid())
  cirugiaId        String
  productoId       String
  cantidad         Decimal         @db.Decimal(10, 3)
  cirugia          CirugiaCatalogo @relation(fields: [cirugiaId], references: [id], onDelete: Cascade)
  producto         Producto        @relation(fields: [productoId], references: [id])

  @@unique([cirugiaId, productoId])
  @@index([cirugiaId])
}
```

Note: `Producto` model must also add back-relations:
```prisma
model Producto {
  // ... existing fields ...
  tratamientoInsumos TratamientoInsumo[]
  cirugiaInsumos     CirugiaInsumo[]
}
```
And `Profesional` must add the `cirugias` catalog relation:
```prisma
model Profesional {
  // ... existing fields ...
  cirugiasCatalogo CirugiaCatalogo[]
}
```

### Backend: recalcularPrecioBase pattern (service method)
```typescript
// Used for both TratamientosService and CirugiasCatalogoService
async recalcularPrecioBase(id: string, profesionalId: string) {
  await this.findById(id, profesionalId); // ownership check

  const insumos = await this.prisma.tratamientoInsumo.findMany({
    where: { tratamientoId: id },
    include: { producto: { select: { costoBase: true } } },
  });

  const precioBase = insumos.reduce((sum, item) => {
    const costo = item.producto.costoBase ?? 0;
    return sum + Number(costo) * Number(item.cantidad);
  }, 0);

  return this.prisma.tratamiento.update({
    where: { id },
    data: { precioBase },
    include: { insumos: { include: { producto: true } } },
  });
}
```

### Backend: findAllByProfesional with insumos included
```typescript
async findAllByProfesional(profesionalId: string, includeInactive = false) {
  return this.prisma.tratamiento.findMany({
    where: { profesionalId, ...(includeInactive ? {} : { activo: true }) },
    include: { insumos: { include: { producto: { select: { id: true, nombre: true, costoBase: true, unidadMedida: true } } } } },
    orderBy: { nombre: 'asc' },
  });
}
```

### Frontend: TypeScript types for extended Tratamiento
```typescript
// frontend/src/types/tratamiento.ts additions
export interface TratamientoInsumo {
  id: string;
  productoId: string;
  cantidad: number;
  producto: {
    id: string;
    nombre: string;
    costoBase: number | null;
    unidadMedida: string | null;
  };
}

export interface Tratamiento {
  // ... existing fields ...
  precioBase: number | null;
  insumos: TratamientoInsumo[];
}
```

### Frontend: InsumosEditor pending-state shape (local state before save)
```typescript
interface InsumoLocal {
  productoId: string;
  nombre: string;
  cantidad: number;
  costoBase: number | null;
  unidadMedida: string | null;
}
// Initialized from existing insumos when editing, empty array when creating
const [insumosLocal, setInsumosLocal] = useState<InsumoLocal[]>([]);
```

### Frontend: configuracion/page.tsx tabs change
```tsx
// PROFESIONAL view: change grid-cols-9 to grid-cols-10
<TabsList className="grid w-full grid-cols-10 max-w-5xl">
  {/* ... existing tabs ... */}
  <TabsTrigger value="cirugias">Cirugías</TabsTrigger>
</TabsList>
<TabsContent value="cirugias" className="mt-6">
  <GestionCirugias />
</TabsContent>

// SECRETARIA view: change grid-cols-4 to grid-cols-5
<TabsList className="grid w-full grid-cols-5 max-w-2xl">
  {/* ... existing tabs ... */}
  <TabsTrigger value="cirugias">Cirugías</TabsTrigger>
</TabsList>
```

---

## Key Implementation Details (from CONTEXT.md specifics)

1. **Recalculate button logic:** `SUM(producto.costoBase * cantidad)` for each insumo. If any `costoBase` is null, treat as 0 and show advisory message ("Algunos insumos no tienen costo base configurado").

2. **"Costo insumos" column in Tratamientos table:** Reads from `tratamiento.precioBase`. If null → display "—". If populated → display formatted currency.

3. **Insumos combobox scope:** The combobox searches among the professional's `Inventario` records (join with `Producto`) — **not** the global Producto table. This means the user can only link products they actually have in stock. Use the existing `/inventario` endpoint with `profesionalId` query param.

4. **Insumos save strategy:** Insumos are saved as part of the parent entity's save action (not auto-saved on add/remove). When the modal opens for editing, load existing insumos into local state. On modal save, send a batch replace call (delete all existing insumos for entity + create new ones in a Prisma transaction).

---

## New Backend Endpoints

### Tratamientos module additions
| Method | Path | Description |
|--------|------|-------------|
| PUT | `/tratamientos/:id/insumos` | Replace all insumos for a tratamiento (batch upsert) |
| POST | `/tratamientos/:id/recalcular-precio` | Recalculate and persist precioBase from insumos |

### New cirugias-catalogo module
| Method | Path | Description |
|--------|------|-------------|
| GET | `/cirugias-catalogo` | List all for authenticated professional |
| POST | `/cirugias-catalogo` | Create new |
| PATCH | `/cirugias-catalogo/:id` | Update |
| DELETE | `/cirugias-catalogo/:id` | Soft delete |
| POST | `/cirugias-catalogo/:id/restore` | Restore |
| PUT | `/cirugias-catalogo/:id/insumos` | Replace all insumos |
| POST | `/cirugias-catalogo/:id/recalcular-precio` | Recalculate precioBase |

All endpoints accept `?profesionalId=` query param for SECRETARIA/ADMIN access, identical to the tratamientos pattern.

---

## Open Questions

1. **Insumos save on modal close vs. explicit save**
   - What we know: CONTEXT.md says insumos are inline within the modal
   - What's unclear: Whether adding/removing an insumo is immediately persisted or only on modal "Guardar cambios"
   - Recommendation: Use local state — persist all insumos atomically when modal saves (via `PUT /insumos` batch endpoint). This avoids partial-save states.

2. **Decimal precision for cantidad in insumos**
   - What we know: Cosméticos often use fractional quantities (e.g., 0.5 mL)
   - Recommendation: Use `Decimal @db.Decimal(10, 3)` for `cantidad` to support decimal quantities; UI input should accept decimals.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `backend/src/prisma/schema.prisma` lines 882–898 (Tratamiento model), lines 591–624 (Producto/Inventario models)
- `backend/src/modules/tratamientos/tratamientos.controller.ts` — full file read
- `backend/src/modules/tratamientos/tratamientos.service.ts` — full file read
- `frontend/src/app/dashboard/configuracion/page.tsx` — full file read (tab structure confirmed)
- `frontend/src/app/dashboard/configuracion/components/GestionTratamientos.tsx` — full file read
- `frontend/src/hooks/useTratamientosProfesional.ts` — full file read
- `frontend/src/hooks/useInventario.ts` — full file read
- `frontend/src/types/tratamiento.ts` — full file read
- `frontend/src/types/stock.ts` — Inventario/Producto types confirmed
- `frontend/src/components/TratamientosCombobox.tsx` — Command/Popover combobox pattern confirmed
- `frontend/src/components/ui/command.tsx` — confirmed available in project

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed, no new dependencies needed
- Schema design: HIGH — existing patterns directly applicable; TratamientoInsumo/CirugiaInsumo follow established conventions
- Architecture: HIGH — module, service, controller, hook patterns all read directly from codebase
- Pitfalls: HIGH — grid-cols hardcoding verified in source; costoBase nullable confirmed in schema; Inventario scoping confirmed

**Research date:** 2026-04-22
**Valid until:** 2026-06-22 (stable stack)
