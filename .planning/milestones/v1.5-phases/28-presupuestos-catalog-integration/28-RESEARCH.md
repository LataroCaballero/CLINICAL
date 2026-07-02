# Phase 28: Presupuestos Catalog Integration - Research

**Researched:** 2026-04-25
**Domain:** Frontend — shadcn Command/Popover combobox, TanStack Query, React state, snapshot pricing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Acceso al selector:**
- Dos botones separados debajo de la lista de ítems: `+ Agregar del catálogo` y `+ Agregar ítem libre`
- Ambos conviven en el mismo nivel visual

**Comportamiento del selector (popover):**
- Popover con Combobox/Command (mismo patrón shadcn que Phase 26 para insumos)
- Un buscador único con dos secciones: "Cirugías" y "Tratamientos"
- Cada ítem muestra nombre + precio (cirugías: ARS y USD; tratamientos: solo ARS)
- Selección simple: seleccionar cierra el popover automáticamente
- El mismo ítem puede agregarse más de una vez (sin restricción de duplicados)

**Precio snapshot y moneda:**
- Snapshot se captura al momento de seleccionar (no al guardar)
- Presupuesto ARS → usa `precioARS` de cirugía / `precio` de tratamiento
- Presupuesto USD → usa `precioUSD` de cirugía / `precio` ARS de tratamiento (fallback, usuario edita)

**Ítems post-selección:**
- Totalmente editables (descripción y precio) tras auto-completarse
- Muestran un badge/etiqueta visual "Catálogo" para diferenciarlos
- Una vez editados, funcionalmente idénticos a ítems de texto libre

### Claude's Discretion
- Diseño exacto del badge (color, tamaño, posición)
- Copy exacto de labels y placeholders
- Comportamiento del popover cuando el catálogo está vacío
- Loading skeleton del combobox mientras carga
- Si la moneda del presupuesto cambia después de agregar ítems (no re-calcular automáticamente)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PRESUP-01 | Al armar un presupuesto, el usuario puede seleccionar ítems desde el catálogo de cirugías del profesional | `useCirugiasCatalogo(profesionalId)` ya existe; endpoint `GET /cirugias-catalogo?profesionalId=X` disponible |
| PRESUP-02 | Al armar un presupuesto, el usuario puede seleccionar ítems desde el catálogo de tratamientos | `useTratamientosProfesional(false, profesionalId)` ya existe; endpoint `GET /tratamientos/me?profesionalId=X` disponible |
| PRESUP-03 | Al seleccionar un ítem del catálogo, se auto-completan nombre y precio (ARS/USD) como snapshot en el momento de la selección | Lógica de snapshot en frontend: `precio = moneda === 'USD' ? item.precioUSD ?? item.precioARS : item.precioARS ?? item.precio`; `PresupuestoItemInput` ya es `{ descripcion, precioTotal }` — no requiere cambio de schema |
| PRESUP-04 | Se pueden seguir agregando ítems de texto libre sin cambios | Botón `+ Agregar ítem libre` invoca el `addItem()` existente sin modificar su lógica |
</phase_requirements>

---

## Summary

Phase 28 es una modificación **exclusivamente frontend** al componente `GenerarPresupuestoModal`. No requiere cambios en backend, DTOs, ni schema de base de datos.

El componente ya tiene toda la infraestructura de ítems (`useState<PresupuestoItemInput[]>`). La tarea consiste en: (1) agregar estado interno extendido para el badge "Catálogo", (2) añadir un botón "+ Agregar del catálogo" que abre un Popover/Command con dos `CommandGroup` (Cirugías y Tratamientos), y (3) al seleccionar un ítem, calcular el precio snapshot según la moneda del presupuesto y agregar el ítem a la lista.

Ambos hooks de datos necesarios (`useCirugiasCatalogo` y `useTratamientosProfesional`) ya existen y son funcionales. El patrón exacto del Popover+Command con `CommandGroup` ya está implementado en `InsumosEditor.tsx` (Phase 26) — se replica directamente.

**Primary recommendation:** Añadir un componente local `CatalogoPopover` dentro de `GenerarPresupuestoModal` (o como archivo separado), manejar el estado de ítems con un campo `fromCatalog?: boolean` para el badge, y calcular el snapshot de precio en el handler `onSelect`.

---

## Standard Stack

### Core (ya presente en el proyecto)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Command | installed | Combobox/búsqueda filtrada con grupos | Patrón establecido en Phase 26 (InsumosEditor) |
| shadcn/ui Popover | installed | Contenedor flotante del selector | Mismo patrón Phase 26 |
| shadcn/ui Badge | installed | Badge "Catálogo" en fila del ítem | Componente base disponible |
| TanStack Query | installed | Data fetching con cache | Hook existentes: `useCirugiasCatalogo`, `useTratamientosProfesional` |
| React useState | built-in | Estado de ítems extendido | Ya usado en `GenerarPresupuestoModal` |

### No new dependencies needed

Esta fase no requiere instalar nuevas dependencias. Todo el stack necesario está disponible.

---

## Architecture Patterns

### State Extension for Items with Badge

El `PresupuestoItemInput` actual es `{ descripcion: string; precioTotal: number }`. Para soportar el badge "Catálogo" **sin cambiar el tipo exportado** (que usa `useCreatePresupuesto`), se extiende localmente dentro del modal:

```typescript
// Local type — NOT exported, NOT sent to backend
interface ItemWithMeta extends PresupuestoItemInput {
  fromCatalog?: boolean;  // drives the badge display
}
```

El estado interno del modal pasa de `PresupuestoItemInput[]` a `ItemWithMeta[]`. Al enviar, se mapea a `PresupuestoItemInput[]` (eliminar `fromCatalog`).

### Snapshot Price Calculation

```typescript
// Source: 28-CONTEXT.md specifics section
function calcularPrecioSnapshot(
  item: CirugiaCatalogo | TratamientoConInsumos,
  moneda: 'ARS' | 'USD',
  tipo: 'cirugia' | 'tratamiento',
): number {
  if (tipo === 'cirugia') {
    const cirugia = item as CirugiaCatalogo;
    return moneda === 'USD'
      ? (cirugia.precioUSD ?? cirugia.precioARS ?? 0)
      : (cirugia.precioARS ?? 0);
  }
  // Tratamiento solo tiene precio ARS — siempre usar `precio`
  const trat = item as TratamientoConInsumos;
  return trat.precio ?? 0;
}
```

### CatalogoSelector Component Pattern

Replicar el patrón de `InsumosEditor` (Phase 26):

```typescript
// Source: frontend/src/app/dashboard/configuracion/components/InsumosEditor.tsx
// Pattern: Popover wraps Command with CommandInput + CommandGroup(s)

<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">
      <Plus className="w-3 h-3" /> Agregar del catálogo
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-80 p-0">
    <Command>
      <CommandInput placeholder="Buscar cirugía o tratamiento..." />
      <CommandEmpty>Sin resultados en el catálogo</CommandEmpty>
      <CommandGroup heading="Cirugías">
        {cirugias.map((c) => (
          <CommandItem key={c.id} onSelect={() => handleSelectCirugia(c)}>
            <span className="flex-1">{c.nombre}</span>
            <span className="text-muted-foreground text-xs">
              ARS {c.precioARS?.toLocaleString('es-AR') ?? '—'}
              {c.precioUSD != null && ` · USD ${c.precioUSD}`}
            </span>
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandGroup heading="Tratamientos">
        {tratamientos.map((t) => (
          <CommandItem key={t.id} onSelect={() => handleSelectTratamiento(t)}>
            <span className="flex-1">{t.nombre}</span>
            <span className="text-muted-foreground text-xs">
              ARS {t.precio?.toLocaleString('es-AR') ?? '—'}
            </span>
          </CommandItem>
        ))}
      </CommandGroup>
    </Command>
  </PopoverContent>
</Popover>
```

### Badge Pattern

```typescript
// Source: shadcn/ui Badge component (already installed)
{item.fromCatalog && (
  <Badge variant="secondary" className="text-xs shrink-0">
    Catálogo
  </Badge>
)}
```

The badge sits inside the item row, between the description input and price input.

### Anti-Patterns to Avoid

- **Modificar `PresupuestoItemDto` en backend:** El backend ya acepta `{ descripcion, precioTotal }`. El snapshot normaliza a este formato en frontend. No tocar backend.
- **Filtrar duplicados del catálogo:** La decisión es permitir agregar el mismo ítem más de una vez. No implementar lógica de deduplicación.
- **Re-calcular precios si cambia la moneda:** Precios ya auto-completados no se recalculan. El usuario edita manualmente si cambia la moneda.
- **Pasar `profesionalId` como prop al popover:** Usar `useEffectiveProfessionalId()` dentro del popover o recibirlo del modal padre (ya recibe `profesionalId` como prop).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Búsqueda filtrada en lista | Filtro manual con `.filter()` sobre array renderizado | `CommandInput` de shadcn/ui Command | Keyboard nav, accesibilidad, y filtro integrado |
| Popover flotante | `position: absolute` custom | `Popover` de shadcn/ui (Radix) | Gestión de z-index, focus trap, portal, y cierre automático |
| Grupos con heading en lista | `<div>` con label manual | `CommandGroup heading={}` | Patrón semántico integrado en shadcn Command |
| Fetch de catálogo | Llamada directa a `api.get` en componente | `useCirugiasCatalogo` + `useTratamientosProfesional` | Cache TanStack Query, loading/error states, invalidation |

---

## Common Pitfalls

### Pitfall 1: CommandItem `value` prop vs. `onSelect` text matching

**What goes wrong:** `CommandInput` filtra `CommandItem` basándose en la prop `value` del item (no en el contenido renderizado). Si no se pasa `value` explícito al `CommandItem`, el filtro usa el texto del children, que puede incluir el precio y romper la búsqueda por nombre.

**How to avoid:** Pasar `value={item.nombre}` explícito a cada `CommandItem` para que el filtro de `CommandInput` opere solo sobre el nombre.

**Warning signs:** Al tipear en el buscador, items que deberían aparecer no aparecen, o items que no deberían aparecen.

### Pitfall 2: `open` state compartido entre los dos botones

**What goes wrong:** Si se usa un solo estado `open` para el popover y el botón "+ Agregar ítem libre" también comparte estado, puede producir doble-trigger.

**How to avoid:** El popover del catálogo tiene su propio `const [catalogOpen, setCatalogOpen] = useState(false)`. El botón de ítem libre no tiene popover — solo invoca `addItem()` directamente.

### Pitfall 3: precioUSD null en cirugías

**What goes wrong:** `c.precioUSD` puede ser `null` (cirugía con precio solo en ARS). Para presupuestos USD, el fallback a `precioARS` evita que el precio quede en 0 o NaN.

**How to avoid:** Usar `cirugia.precioUSD ?? cirugia.precioARS ?? 0` en el cálculo del snapshot.

**Warning signs:** Ítem del catálogo se agrega con precio 0 en presupuesto USD.

### Pitfall 4: `moneda` state en el momento de selección

**What goes wrong:** El snapshot de precio se debe capturar con la moneda vigente **en el momento de la selección**, no la moneda al guardar. Si el usuario selecciona ítems y luego cambia la moneda, los precios ya capturados no deben cambiar.

**How to avoid:** El handler `handleSelectCirugia(c)` lee `moneda` del estado local del modal en ese momento. Como los ítems ya capturados son editables y no se recalculan (decisión de CONTEXT.md), este comportamiento es correcto.

---

## Code Examples

### Modal item state with metadata

```typescript
// Source: direct pattern from GenerarPresupuestoModal.tsx + CONTEXT.md decisions
interface ItemWithMeta {
  descripcion: string;
  precioTotal: number;
  fromCatalog?: boolean;
}

const [items, setItems] = useState<ItemWithMeta[]>(initialItems);

const addFromCatalog = (descripcion: string, precioTotal: number) => {
  setItems((prev) => [...prev, { descripcion, precioTotal, fromCatalog: true }]);
};

// Before calling createPresupuesto.mutateAsync — strip meta
const validItems: PresupuestoItemInput[] = items
  .filter((it) => it.descripcion.trim())
  .map(({ descripcion, precioTotal }) => ({ descripcion, precioTotal }));
```

### Handler on CommandItem select

```typescript
// Source: CONTEXT.md specifics + InsumosEditor pattern
const handleSelectCirugia = (c: CirugiaCatalogo) => {
  const precio =
    moneda === 'USD'
      ? (c.precioUSD ?? c.precioARS ?? 0)
      : (c.precioARS ?? 0);
  addFromCatalog(c.nombre, precio);
  setCatalogOpen(false);
};

const handleSelectTratamiento = (t: TratamientoConInsumos) => {
  addFromCatalog(t.nombre, t.precio ?? 0);
  setCatalogOpen(false);
};
```

### Hook calls in modal (profesionalId from prop)

```typescript
// GenerarPresupuestoModal already receives profesionalId as prop
const { data: cirugias = [] } = useCirugiasCatalogo(profesionalId);
const { data: tratamientos = [] } = useTratamientosProfesional(false, profesionalId);
```

Note: `useCirugiasCatalogo` defaults `includeInactive=false`, so only active catalog items appear. Same for `useTratamientosProfesional`.

---

## Integration Points Verified

| Point | Status | Notes |
|-------|--------|-------|
| `GET /cirugias-catalogo?profesionalId=X` | EXISTS | `CirugiasCatalogoController.findAll()` — active only by default |
| `GET /tratamientos/me?profesionalId=X` | EXISTS | `useTratamientosProfesional` hook uses this endpoint |
| `useCirugiasCatalogo(profesionalId)` | EXISTS | `frontend/src/hooks/useCirugiasCatalogo.ts` |
| `useTratamientosProfesional(includeInactive, profesionalId)` | EXISTS | `frontend/src/hooks/useTratamientosProfesional.ts` |
| `CirugiaCatalogo` type | EXISTS | `frontend/src/types/cirugia-catalogo.ts` — has `precioARS`, `precioUSD` |
| `TratamientoConInsumos` type | EXISTS | `frontend/src/types/tratamiento.ts` — has `precio` (ARS only) |
| `PresupuestoItemDto` backend | NO CHANGE | `{ descripcion, precioTotal }` — snapshot normalizes to this |
| `GenerarPresupuestoModal` props | NO CHANGE | Already receives `profesionalId` — no new props needed |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Solo ítems de texto libre en presupuesto | Ítems con catálogo auto-completado + texto libre | Flujo más rápido, precios consistentes con catálogo |
| `addItem()` único | Dos flujos: `addFromCatalog()` y `addItem()` | Clara separación visual y funcional |

---

## Open Questions

1. **Loading state del popover cuando ambos hooks están cargando**
   - What we know: TanStack Query provee `isLoading` de cada hook
   - What's unclear: Decisión de CONTEXT.md dice "loading skeleton — Claude's discretion"
   - Recommendation: Mostrar `CommandEmpty` con texto "Cargando catálogo..." mientras `isLoading` es true para cirugías o tratamientos; skeleton completo es opcional y puede dejarse para iteración posterior.

2. **Empty state cuando no hay cirugías NI tratamientos creados**
   - What we know: CONTEXT.md marca como "Claude's discretion"
   - Recommendation: Mostrar en `CommandEmpty` un mensaje como "No hay ítems en el catálogo. Crea cirugías o tratamientos en Configuración." — evita confusión del usuario.

---

## Sources

### Primary (HIGH confidence)
- `frontend/src/components/live-turno/tabs/hc/GenerarPresupuestoModal.tsx` — componente a modificar, estado actual verificado
- `frontend/src/hooks/useCirugiasCatalogo.ts` — hook de cirugías, firma verificada
- `frontend/src/hooks/useTratamientosProfesional.ts` — hook de tratamientos, firma verificada
- `frontend/src/types/cirugia-catalogo.ts` — tipos verificados (`precioARS`, `precioUSD`, `activo`)
- `frontend/src/types/tratamiento.ts` — tipo `TratamientoConInsumos` verificado (campo `precio`)
- `frontend/src/app/dashboard/configuracion/components/InsumosEditor.tsx` — patrón Popover+Command referencia
- `backend/src/modules/cirugias-catalogo/cirugias-catalogo.controller.ts` — endpoint `GET /` verificado
- `backend/src/modules/presupuestos/dto/create-presupuesto.dto.ts` — `PresupuestoItemDto` verificado (sin cambios)
- `.planning/phases/28-presupuestos-catalog-integration/28-CONTEXT.md` — todas las decisiones de implementación

### Secondary (MEDIUM confidence)
- shadcn/ui Command docs — `CommandGroup heading` prop para secciones con título
- TanStack Query docs — `isLoading` + `data` pattern verificado en hooks existentes

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todos los componentes y hooks ya existen y fueron leídos directamente del código
- Architecture: HIGH — patrón copiado de InsumosEditor (Phase 26) que ya funciona en producción
- Integration: HIGH — endpoints, DTOs, tipos y hooks verificados en el código real
- Pitfalls: HIGH — basados en lectura directa del código existente y las decisiones del CONTEXT.md

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (stack estable, sin dependencias nuevas)
