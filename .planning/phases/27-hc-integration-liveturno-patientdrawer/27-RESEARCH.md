# Phase 27: HC Integration — LiveTurno + PatientDrawer - Research

**Researched:** 2026-04-23
**Domain:** NestJS backend (new OrdenConsumo module + HC service extension) + React/Next.js frontend (HistoriaClinicaTab modification + PatientDrawer HC creator)
**Confidence:** HIGH — All findings from direct codebase inspection; no external assumptions needed.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Renombrado y reemplazo del botón "Práctica"**
- El botón "Práctica" desaparece completamente y es reemplazado por "Tratamiento en Consultorio"
- Los registros históricos con tipo `practica` se siguen mostrando igual en el historial (no hay migración de datos, solo cambio de label en el formulario nuevo)
- No coexisten ambos botones

**Multi-selector de tratamientos dentro de "Tratamiento en Consultorio"**
- Al seleccionar "Tratamiento en Consultorio", aparece un Combobox multi-select (mismo patrón que Phase 26 para insumos — shadcn Command/Combobox) que filtra tratamientos del catálogo del profesional
- Los tratamientos seleccionados se muestran como pills/tags removibles con × para quitar
- El textarea de texto libre queda detrás de un toggle/link ("↑ Agregar notas libres"), colapsado por defecto
- El texto libre es el complemento, no el elemento principal

**Checkbox "Consumir insumos del stock"**
- Aparece justo debajo de los pills cuando al menos un tratamiento seleccionado tiene insumos vinculados en el catálogo
- Muestra solo el checkbox con label simple: "☐ Consumir insumos del stock" — sin lista de insumos ni detalle a la vista
- No hay dialog de confirmación previo a guardar
- Al guardar con checkbox activo: toast mínimo `✓ HC guardada. Orden de consumo creada.` (sonner, no bloqueante)

**HC creator desde PatientDrawer**
- Acceso mediante botón flotante o en el header del drawer — visible desde cualquier tab, no requiere estar en la tab HC
- El creator se abre en un Dialog/Sheet
- Usa el mismo componente que LiveTurno — todos los tipos disponibles (Primera Consulta, Pre Quirúrgico, Control, Tratamiento en Consultorio)
- DatePicker en el header del creator: muestra "Fecha de la sesión: [hoy]" con calendario para cambiar. Hoy por defecto, permite fecha retroactiva
- No requiere turno activo (turnoId queda null cuando se crea desde PatientDrawer)

**OrdenConsumo — scope y modelo**
- Phase 27 solo crea órdenes (estado PENDIENTE). La UI de gestión y confirmación queda 100% en Phase 31
- El modelo OrdenConsumo incluye como mínimo:
  - `pacienteId`, `profesionalId`
  - `turnoId` (nullable — presente si se creó desde LiveTurno, null si desde PatientDrawer)
  - `historiaClinicaEntradaId` (trazabilidad completa)
  - `fechaSesion` (fecha de la entrada HC, no necesariamente hoy)
  - `tratamientos[]` (IDs o nombres de los tratamientos seleccionados)
  - `insumos[]` con `productoId` y `cantidad`
  - `estado` = PENDIENTE (único estado en Phase 27)

### Claude's Discretion
- Nombre exacto del endpoint REST para crear OrdenConsumo
- Diseño del skeleton/loading del Combobox de tratamientos
- Posición exacta del botón flotante en el PatientDrawer (header vs. área de acción)
- Copy exacto de labels, placeholders y mensajes de error
- Paginación o lista completa en el Combobox de tratamientos (probablemente lista completa dado el volumen esperado)

### Deferred Ideas (OUT OF SCOPE)
- Vista de listado de órdenes pendientes en /dashboard/stock — Phase 31
- Confirmación de órdenes de consumo y registro de movimiento SALIDA — Phase 31 (STOCK-03, STOCK-04)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIVHC-01 | La sección "Práctica" en LiveTurno HC se renombra a "Tratamiento en Consultorio" | `TIPOS` array in `HistoriaClinicaTab.tsx` — replace `{ id: 'practica', label: 'Práctica' }` with `{ id: 'tratamiento_en_consultorio', label: 'Tratamiento en Consultorio' }` |
| LIVHC-02 | El profesional puede seleccionar uno o más tratamientos del catálogo en la sección (multi-select) | `useTratamientosProfesional()` returns `TratamientoConInsumos[]` — already includes `insumos[]`; shadcn Command/Combobox pattern available |
| LIVHC-03 | El campo de texto libre se mantiene como opción complementaria al selector de tratamientos | Existing `textoLibre` state + `Textarea` in `HistoriaClinicaTab.tsx` — wrap in collapsed toggle |
| LIVHC-04 | La sección muestra un checkbox "Consumir insumos del stock" (visible solo cuando tratamiento seleccionado tiene insumos vinculados) | `TratamientoConInsumos.insumos.length > 0` check; checkbox conditionally rendered |
| LIVHC-05 | Al guardar la HC con tratamientos seleccionados, el último tratamiento del paciente se actualiza (query-on-read) | Per REQUIREMENTS.md out-of-scope decision: use ORDER BY fecha DESC — backend reads last entry with tratamientos; no denormalized FK |
| STOCK-01 | Al guardar una HC con el checkbox de insumos activado, se genera automáticamente una orden de consumo con estado PENDIENTE | New `OrdenConsumo` Prisma model + `ordenes-consumo` NestJS module; created inside `$transaction` in `historia-clinica.service.ts` |
| STOCK-02 | La orden de consumo incluye: nombre del paciente, fecha de la sesión, tratamiento(s) realizados, e insumos con cantidades | `OrdenConsumo` model fields: `pacienteId`, `profesionalId`, `turnoId?`, `historiaClinicaEntradaId`, `fechaSesion`, `estado`; join table `OrdenConsumoInsumo` with `productoId` + `cantidad`; tratamientos stored as JSON or `OrdenConsumoTratamiento` join table |
| HCDR-01 | Desde el PatientDrawer se puede crear una nueva entrada de HC usando el mismo creator que se usa en LiveTurno | Extract shared `HCCreatorForm` component from `HistoriaClinicaTab.tsx`; render inside Dialog in `PatientDrawer.tsx` |
| HCDR-02 | La entrada creada desde PatientDrawer no requiere turno activo (se crea sin turnoId asociado) | `HistoriaClinicaEntrada` schema has no required `turnoId`; `turnoId` lives on `Turno` model pointing to the entry — no schema migration needed |
| HCDR-03 | La fecha de la entrada es hoy por defecto pero permite seleccionar una fecha retroactiva | `CreateEntradaDto.fecha?: string` already supported by backend; `useCreateHistoriaClinicaEntry` already passes `fecha`; add DatePicker to shared component |
</phase_requirements>

---

## Summary

Phase 27 integrates the Phase 26 treatment catalog into two existing clinical flows. The work spans three layers: a new Prisma model (`OrdenConsumo` + `OrdenConsumoInsumo`), backend service extension (HC service creates the order inside the existing transaction), and frontend refactoring (extract a reusable HC creator component and wire it into PatientDrawer via a Dialog).

The key architectural insight is that `HistoriaClinicaTab.tsx` must be refactored from a LiveTurno-bound component into a composable `HCCreatorForm` that accepts props (`pacienteId`, `profesionalId`, `turnoId?`, `onSaved`) and can be embedded in both LiveTurno and the PatientDrawer Dialog. This eliminates code duplication and satisfies HCDR-01.

The `OrdenConsumo` creation must be atomic with the HC entry creation — the service's `$transaction` block already owns the pattern. The backend DTO for creating an HC entry needs new optional fields: `tratamientoIds[]`, `consumirInsumos: boolean`, and `turnoId?`.

**Primary recommendation:** Extract `HCCreatorForm` first, wire it into LiveTurno (same behavior), then add PatientDrawer Dialog — this sequencing ensures no regression on the existing flow.

---

## Standard Stack

### Core (already in project — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | existing | New `OrdenConsumo` model + migration | Already used everywhere |
| NestJS modules | existing | New `ordenes-consumo` module | Project pattern |
| TanStack Query | existing | New `useCreateOrdenConsumo` hook | Project pattern |
| shadcn/ui Command | existing (Phase 26) | Multi-select Combobox for treatments | Already used in InsumosEditor |
| shadcn/ui Dialog | existing | HC creator from PatientDrawer | Already used in PatientDrawer views |
| shadcn/ui Checkbox | existing | "Consumir insumos del stock" | Already in project |
| shadcn DatePicker (Calendar + Popover) | existing | Retroactive date selection | shadcn Calendar + Popover pattern |
| sonner | existing | Toast notification on save | Already established pattern |

### No new packages needed

All required UI primitives are already installed. The DatePicker pattern uses shadcn `Calendar` + `Popover` components already available.

---

## Architecture Patterns

### Recommended File Structure (new/modified files)

```
backend/src/
├── prisma/schema.prisma                        # ADD: OrdenConsumo + OrdenConsumoInsumo models + enum EstadoOrdenConsumo
├── modules/
│   ├── historia-clinica/
│   │   ├── dto/crear-entrada.dto.ts            # MODIFY: add tratamientoIds[], consumirInsumos, turnoId?
│   │   └── historia-clinica.service.ts         # MODIFY: crearEntrada() creates OrdenConsumo inside $transaction
│   └── ordenes-consumo/                        # NEW MODULE
│       ├── ordenes-consumo.module.ts
│       ├── ordenes-consumo.controller.ts       # GET /ordenes-consumo (for Phase 31)
│       ├── ordenes-consumo.service.ts
│       └── dto/
│           └── create-orden-consumo.dto.ts

frontend/src/
├── components/
│   ├── live-turno/tabs/
│   │   ├── HistoriaClinicaTab.tsx              # MODIFY: use HCCreatorForm, remove practica entry
│   │   └── hc/
│   │       └── HCCreatorForm.tsx               # NEW: extracted reusable component
│   └── patient/PatientDrawer/
│       └── views/
│           └── HCCreatorDialog.tsx             # NEW: Dialog wrapper for HCCreatorForm
├── hooks/
│   └── useCreateOrdenConsumo.ts               # NEW: (may not be needed if creation is server-side inside HC tx)
└── app/dashboard/pacientes/components/
    └── PatientDrawer.tsx                       # MODIFY: add HC creator button + Dialog
```

### Pattern 1: Shared HCCreatorForm Component

**What:** Extract the form logic from `HistoriaClinicaTab.tsx` into a standalone component that takes `pacienteId`, `profesionalId`, optional `turnoId`, optional `defaultFecha`, and `onSaved` callback.

**When to use:** Any context where creating an HC entry is needed (LiveTurno session and PatientDrawer).

**Key props interface:**
```typescript
// Source: codebase inspection of HistoriaClinicaTab.tsx
interface HCCreatorFormProps {
  pacienteId: string;
  profesionalId: string;
  turnoId?: string;          // Present in LiveTurno, absent from PatientDrawer
  defaultFecha?: string;     // ISO date — hoy by default, retroactive allowed
  onSaved?: () => void;
}
```

The component renders the type selector buttons, the TratamientoEnConsultorio form (combobox + pills + checkbox), and the footer with Save button. `HistoriaClinicaTab.tsx` becomes a thin wrapper that passes `session.pacienteId`, `session.profesionalId`, `session.turnoId`.

### Pattern 2: Tipo `tratamiento_en_consultorio` in TIPOS array

**What:** In `HistoriaClinicaTab.tsx`, the `TIPOS` constant is the source of truth for available entry types. Replace the `practica` entry.

**Current code:**
```typescript
// Source: frontend/src/components/live-turno/tabs/HistoriaClinicaTab.tsx line 19-24
const TIPOS: { id: TipoBoton; label: string }[] = [
  { id: 'primera_vez', label: 'Primera Consulta' },
  { id: 'pre_quirurgico', label: 'Pre Quirúrgico' },
  { id: 'control', label: 'Control' },
  { id: 'practica', label: 'Práctica' },           // REMOVE this
  // ADD: { id: 'tratamiento_en_consultorio', label: 'Tratamiento en Consultorio' }
];
```

**Backend DTO** (`crear-entrada.dto.ts`) union type must add `'tratamiento_en_consultorio'` and remove `'practica'` from the type (keeping `practica` in the union is fine for backward-read compatibility since old data exists, but the new form never sends it).

**Frontend `TipoEntrada` type** (`useCreateHistoriaClinicaEntry.ts` line 16): add `'tratamiento_en_consultorio'` to the union.

### Pattern 3: OrdenConsumo inside HC $transaction

**What:** The HC service's `crearEntrada()` already uses `$transaction`. After creating the `HistoriaClinicaEntrada`, if `dto.consumirInsumos === true` and `dto.tratamientoIds` is non-empty, fetch the insumos for those treatments and create an `OrdenConsumo` + `OrdenConsumoInsumo` records inside the same transaction.

**Why atomic:** Prevents orphaned HC entries without their corresponding stock order, or vice versa.

```typescript
// Source: backend/src/modules/historia-clinica/historia-clinica.service.ts (extended pattern)
// Inside $transaction block, after creating `entrada`:
if (dto.consumirInsumos && dto.tratamientoIds?.length) {
  // Fetch insumos for each tratamiento (outside tx — pre-fetched before tx start)
  const orden = await tx.ordenConsumo.create({
    data: {
      pacienteId,
      profesionalId,
      turnoId: dto.turnoId ?? null,
      historiaClinicaEntradaId: entrada.id,
      fechaSesion: entrada.fecha,
      estado: 'PENDIENTE',
      tratamientosSnapshot: dto.tratamientoIds,  // JSON array of ids or names
      insumos: {
        create: insumosAgregados,   // pre-fetched list of { productoId, cantidad }
      },
    },
  });
}
```

**Important:** The insumos for each tratamiento must be pre-fetched **outside** the transaction (like the existing `autorizacionesMeta` pattern in the same service) to avoid nested Prisma queries.

### Pattern 4: PatientDrawer HC Creator Button + Dialog

**What:** Add a persistent button to `PatientDrawer.tsx` (in the header or as a fixed action area) that opens a `Dialog` containing `HCCreatorForm`. The button is visible regardless of which `view` is active.

**Placement:** The DrawerHeader currently has only a title and DrawerClose. A `Button` with `+ Nueva HC` can be added to the right side of the `DrawerHeader`. When opened from here, `turnoId` is `undefined` and `defaultFecha` is today.

**Dialog pattern (already used in PatientDrawer):**
```typescript
// Source: frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx
// Add state: const [hcDialogOpen, setHcDialogOpen] = useState(false)
// Add in DrawerHeader: <Button size="sm" onClick={() => setHcDialogOpen(true)}>+ Nueva HC</Button>
// Add Dialog below existing views
```

### Pattern 5: DatePicker for Retroactive Date

**What:** In `HCCreatorForm`, when the component renders (particularly when opened from PatientDrawer), show a date picker with "Fecha de la sesión: [hoy]". Uses shadcn `Calendar` + `Popover` (same primitives used in turnos calendar views).

**State:** `const [fecha, setFecha] = useState<string | undefined>(undefined)` — `undefined` means "today" (backend treats no `fecha` as `now()`). When user picks a past date, set it as ISO string.

**Validation:** Backend already validates no future dates (`parsed > hoy` check in `historia-clinica.service.ts` line 120-124).

### Anti-Patterns to Avoid

- **Do NOT create a separate API call for OrdenConsumo from the frontend.** The order must be created server-side inside the HC save transaction. A second frontend API call would break atomicity.
- **Do NOT copy-paste HistoriaClinicaTab logic into a new PatientDrawer component.** Extract the shared component to a single source of truth.
- **Do NOT show all insumos detail in the checkbox area.** The decision is a simple label "Consumir insumos del stock" — no item list visible.
- **Do NOT re-fetch `useTratamientosProfesional` on every keystroke in the combobox.** Use the already-loaded list and filter client-side (expected volume: < 100 items).
- **Do NOT add `ultimoTratamientoId` as a denormalized column on `Paciente`.** REQUIREMENTS.md explicitly marks this as Out of Scope — use query-on-read.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-select combobox | Custom dropdown | shadcn Command + Popover (Phase 26 InsumosEditor pattern) | Already proven in project, filter + pills pattern identical |
| Removable pills/tags | Custom span + button | Inline `<Badge>` with `<button onClick={() => remove(id)}>×</button>` | Trivial — shadcn Badge + inline remove; no lib needed |
| Date picker | Custom input | shadcn Calendar + Popover | Already installed; backend validates retroactive dates |
| Toast notification | Custom alert | sonner (already in project) | Established pattern: `toast.success()` |
| Atomic transaction | Multi-request saga | Prisma `$transaction` in HC service | Already used in same service for autorizaciones |

---

## Common Pitfalls

### Pitfall 1: Forgetting to pre-fetch insumos outside the Prisma transaction

**What goes wrong:** Calling `tx.tratamientoInsumo.findMany()` inside a `$transaction` async callback works with interactive transactions but can cause issues with Prisma's connection pooling under pgBouncer (session mode). The existing codebase pattern (`autorizacionesMeta`) pre-fetches all external data **before** the `$transaction` call.

**How to avoid:** Fetch `tratamientoInsumo` records for all `dto.tratamientoIds` before `$transaction`. Pass the result into the transaction callback as a captured variable.

**Warning signs:** Timeout errors under pgBouncer, or `MaxClientsInSessionMode` errors in logs.

### Pitfall 2: HistoriaClinicaTab depends on `useLiveTurnoStore` session

**What goes wrong:** `HistoriaClinicaTab.tsx` reads `session` from `useLiveTurnoStore` — it assumes a LiveTurno session is active. The extracted `HCCreatorForm` must NOT depend on this store directly; it must receive `pacienteId` + `profesionalId` as props.

**How to avoid:** During extraction, audit every `session.X` reference and replace with props. The `syncDraft` / `setDraftData` calls are LiveTurno-specific and should remain in `HistoriaClinicaTab.tsx` (the thin wrapper), not in `HCCreatorForm`.

**Warning signs:** `HCCreatorForm` rendering blank or throwing `session is null` when used from PatientDrawer.

### Pitfall 3: `canSave` logic for `tratamiento_en_consultorio` — empty selection

**What goes wrong:** Current `canSave` logic requires either a `primera_vez` form state OR a non-empty `textoLibre`. For the new type, the form is valid when at least one tratamiento is selected OR when textoLibre (collapsed) has content.

**How to avoid:** Update `canSave` to also check `tipoSeleccionado === 'tratamiento_en_consultorio' && tratamientosSeleccionados.length > 0`.

### Pitfall 4: OrdenConsumoInsumo — aggregating duplicate insumos across multiple treatments

**What goes wrong:** If two selected treatments share the same `productoId`, naively creating one row per `(tratamiento × insumo)` would create duplicate `productoId` entries in `OrdenConsumoInsumo`. If a unique constraint exists on `(ordenConsumoId, productoId)`, this causes a P2002.

**How to avoid:** Before creating `OrdenConsumoInsumo` rows, aggregate quantities by `productoId` across all selected treatments. Use a `Map<productoId, total>` accumulation before inserting.

### Pitfall 5: `TipoEntrada` union type mismatch between frontend and backend

**What goes wrong:** `TipoEntrada` in `useCreateHistoriaClinicaEntry.ts` and `CreateEntradaDto` in backend must both include `'tratamiento_en_consultorio'` or the request will fail DTO validation.

**How to avoid:** Update both files in the same task. The frontend type lives at `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts:16`, the backend DTO at `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts:28`.

---

## Code Examples

### Multi-select Combobox pattern (Phase 26 reference)

The InsumosEditor in Phase 26 uses the same shadcn Command/Combobox pattern. The treatment selector should mirror it: a Popover trigger button, Command input for filtering, CommandList with items, selected items rendered as removable pills below.

```typescript
// Source: Phase 26 InsumosEditor — project-established pattern
// Popover with Command inside:
<Popover open={comboOpen} onOpenChange={setComboOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">
      Agregar tratamiento <ChevronsUpDown className="ml-2 h-4 w-4" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[300px] p-0">
    <Command>
      <CommandInput placeholder="Buscar tratamiento..." />
      <CommandList>
        {tratamientos.map((t) => (
          <CommandItem key={t.id} onSelect={() => toggleTratamiento(t)}>
            <Check className={cn("mr-2 h-4 w-4", selected.includes(t.id) ? "opacity-100" : "opacity-0")} />
            {t.nombre}
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

### Aggregating insumos before OrdenConsumo creation

```typescript
// Source: pattern derived from TratamientosService.setInsumos (backend/src/modules/tratamientos/tratamientos.service.ts)
// Pre-fetch outside transaction:
const tratamientosConInsumos = await this.prisma.tratamiento.findMany({
  where: { id: { in: dto.tratamientoIds }, profesionalId, activo: true },
  include: { insumos: { include: { producto: { select: { id: true } } } } },
});

// Aggregate quantities by productoId
const insumosMap = new Map<string, number>();
for (const t of tratamientosConInsumos) {
  for (const ins of t.insumos) {
    const prev = insumosMap.get(ins.productoId) ?? 0;
    insumosMap.set(ins.productoId, prev + Number(ins.cantidad));
  }
}
const insumosAgregados = Array.from(insumosMap.entries()).map(([productoId, cantidad]) => ({ productoId, cantidad }));
```

### HistoriaClinicaEntry DTO extension

```typescript
// Source: backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts (to extend)
export class CreateEntradaDto {
  tipo: 'primera_vez' | 'pre_quirurgico' | 'control' | 'tratamiento_en_consultorio' | 'libre';
  // ... existing fields ...
  
  // New fields for Phase 27:
  @IsOptional()
  tratamientoIds?: string[];    // IDs of selected Tratamiento catalog items
  
  @IsOptional()
  consumirInsumos?: boolean;    // Whether to create OrdenConsumo
  
  @IsOptional()
  turnoId?: string;             // Present when called from LiveTurno
}
```

### Prisma Schema additions

```prisma
// Source: schema pattern from TratamientoInsumo (backend/src/prisma/schema.prisma line 905)
model OrdenConsumo {
  id                       String                @id @default(uuid())
  pacienteId               String
  profesionalId            String
  turnoId                  String?
  historiaClinicaEntradaId String
  fechaSesion              DateTime
  estado                   EstadoOrdenConsumo    @default(PENDIENTE)
  tratamientosSnapshot     Json                  // Array of { id, nombre } at time of creation
  createdAt                DateTime              @default(now())
  updatedAt                DateTime              @updatedAt

  paciente      Paciente                @relation(fields: [pacienteId], references: [id])
  profesional   Profesional             @relation(fields: [profesionalId], references: [id])
  insumos       OrdenConsumoInsumo[]

  @@index([profesionalId, estado])
  @@index([pacienteId])
}

model OrdenConsumoInsumo {
  id             String      @id @default(uuid())
  ordenConsumoId String
  productoId     String
  cantidad       Decimal     @db.Decimal(10, 3)
  ordenConsumo   OrdenConsumo @relation(fields: [ordenConsumoId], references: [id], onDelete: Cascade)
  producto       Producto     @relation(fields: [productoId], references: [id])

  @@unique([ordenConsumoId, productoId])
  @@index([ordenConsumoId])
}

enum EstadoOrdenConsumo {
  PENDIENTE
  CONFIRMADA
  CANCELADA
}
```

**Note:** `Profesional` model must add `ordenesConsumo OrdenConsumo[]` relation. `Paciente` model must add `ordenesConsumo OrdenConsumo[]`. `Producto` model must add `ordenesConsumoInsumos OrdenConsumoInsumo[]`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `practica` tipo en TIPOS array | `tratamiento_en_consultorio` | Phase 27 | Label only — old data with `practica` still renders correctly in historial |
| Free-text only for consultorio entries | Catalog multi-select + optional text | Phase 27 | Enables structured treatment tracking |
| HC entries only from LiveTurno (active session) | HC entries from PatientDrawer (no turno needed) | Phase 27 | Enables retroactive documentation |

**Backward compatibility:** Historic entries with `tipo: 'practica'` in `contenido.tipo` will still be displayed by `FreeEntryPreview` and `getTituloEntrada` in `HistoriaClinica.tsx`. No data migration needed — the TIPO_LABELS map in that component would just show `"practica"` as-is for old entries (or can be extended to map it to a readable label).

---

## Critical Implementation Notes

### turnoId in HC entries — Schema clarification

The `HistoriaClinicaEntrada` model does NOT have a direct `turnoId` column. The relationship is inverted: `Turno` has `entradaHCId String?` pointing to the entry. Therefore:
- From PatientDrawer: no turno exists, so no `Turno.entradaHCId` is set — no schema change needed.
- From LiveTurno: the existing flow sets `Turno.entradaHCId` after saving the entry — this continues unchanged.
- The new `OrdenConsumo.turnoId` is nullable and references the `Turno` table directly — this is the linkage for stock traceability.

When `dto.turnoId` is provided (LiveTurno context), the `crearEntrada` service can set `OrdenConsumo.turnoId = dto.turnoId`.

### LIVHC-05 — "último tratamiento" — query on read

Per `REQUIREMENTS.md` (Out of Scope section): do NOT add `ultimoTratamientoId` to `Paciente`. The last treatment is derived by querying `HistoriaClinicaEntrada` for the most recent entry where `contenido->>'tipo' = 'tratamiento_en_consultorio'` and `contenido->'tratamientos'` is non-empty. This query is only needed when displaying it in the patient list (Phase 30, PAC-01), not in Phase 27. Phase 27 satisfies LIVHC-05 implicitly: by creating the entry with structured `tratamientos[]` data in the `contenido` JSON, the data is available for future read.

### ordenes-consumo module — minimal for Phase 27

Phase 27 only needs creation. The module should expose:
- `POST /ordenes-consumo` — triggered server-side from HC service, not directly called from frontend in Phase 27
- `GET /ordenes-consumo` — stub for Phase 31 (returns empty or list by profesionalId)

The module is registered in `app.module.ts` following the existing pattern (see `CirugiasCatalogoModule` reference).

### HC service — profesionalId for OrdenConsumo

The `crearEntrada` service already resolves `profesionalId` from JWT. This same `profesionalId` is passed to `OrdenConsumo.profesionalId`. No additional resolution needed.

---

## Open Questions

1. **`tratamientosSnapshot` format in OrdenConsumo**
   - What we know: needs to store which treatments were performed for Phase 31 display
   - What's unclear: whether to store `[{ id, nombre }]` or just `[nombre]` — id enables future linking
   - Recommendation: store `[{ id, nombre }]` as JSON — captures both for traceability without a join table

2. **`Producto` relation to `OrdenConsumoInsumo` — back-reference**
   - What we know: `Producto` model needs a relation field for Prisma to compile
   - What's unclear: whether existing `Producto` is tightly managed (no extra relations)
   - Recommendation: add `ordenesConsumoInsumos OrdenConsumoInsumo[]` to `Producto` — standard Prisma requirement; no functional impact

3. **Migration strategy**
   - What we know: project uses `prisma db push` + `migrate resolve` due to pgBouncer shadow DB issue (STATE.md: "26-01 Migration workaround")
   - Recommendation: use same workaround — `npx prisma db push` on live DB then `npx prisma migrate resolve --applied <name>` if needed

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `backend/src/modules/historia-clinica/historia-clinica.service.ts` — transaction pattern, DTO structure, fecha validation
- Direct codebase inspection: `frontend/src/components/live-turno/tabs/HistoriaClinicaTab.tsx` — full component structure, TIPOS array, canSave logic, syncDraft
- Direct codebase inspection: `backend/src/prisma/schema.prisma` — all models, `HistoriaClinicaEntrada` (no turnoId), `Tratamiento`+`TratamientoInsumo`, `Turno.entradaHCId`
- Direct codebase inspection: `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` — DTO interface, `fecha?` field already supported
- Direct codebase inspection: `frontend/src/hooks/useTratamientosProfesional.ts` — returns `TratamientoConInsumos[]` with insumos included
- Direct codebase inspection: `frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx` — view routing, DrawerHeader structure
- Direct codebase inspection: `.planning/phases/27-hc-integration-liveturno-patientdrawer/27-CONTEXT.md` — all locked decisions
- Direct codebase inspection: `.planning/REQUIREMENTS.md` — LIVHC, STOCK, HCDR requirements + Out of Scope decisions

### Secondary (MEDIUM confidence)
- Phase 26 InsumosEditor pattern (referenced in CONTEXT.md) — shadcn Command/Combobox multi-select pattern established in project

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, verified by inspection
- Architecture: HIGH — all integration points verified by reading actual source files
- Pitfalls: HIGH — identified from direct code reading of existing patterns and edge cases
- Schema design: HIGH — follows exact same pattern as `TratamientoInsumo` / `CirugiaInsumo` already in schema

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (stable codebase, no fast-moving external dependencies)
