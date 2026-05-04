# Phase 28: Presupuestos Catalog Integration - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Al armar un presupuesto, el usuario puede seleccionar ítems del catálogo de cirugías y tratamientos del profesional desde un popover/combobox, con nombre y precio auto-completados como snapshot en el momento de la selección. Los ítems de texto libre siguen funcionando sin cambios (PRESUP-04 preservado).

Scope: solo el modal de creación de presupuesto (`GenerarPresupuestoModal`). La gestión del catálogo queda en Phase 26 (ya implementada).

</domain>

<decisions>
## Implementation Decisions

### Acceso al selector de catálogo
- Dos botones separados debajo de la lista de ítems:
  - `+ Agregar del catálogo` — abre el selector de catálogo
  - `+ Agregar ítem libre` — agrega fila de texto libre (comportamiento actual, sin cambios)
- Ambos botones conviven en el mismo nivel visual, queda claro que son flujos distintos

### Comportamiento del selector (popover)
- Al hacer click en "+ Agregar del catálogo" → se abre un Popover con Combobox/Command (mismo patrón shadcn que Phase 26 para insumos)
- El popover contiene **un buscador único** con dos secciones/grupos: "Cirugías" y "Tratamientos"
- Cada ítem en el popover muestra: **nombre + precio** (cirugías muestran ARS y USD; tratamientos muestran solo ARS)
- Selecci**ón simple**: seleccionar un ítem lo agrega a la lista y **cierra el popover automáticamente**
- El mismo ítem del catálogo **puede agregarse más de una vez** (sin restricción de duplicados)

### Precio snapshot y moneda
- El snapshot de precio se captura **al momento de seleccionar el ítem** en el popover (no al guardar)
- El precio que se auto-completa depende de la moneda del presupuesto:
  - Presupuesto en ARS → se usa `precioARS` de la cirugía / `precio` del tratamiento
  - Presupuesto en USD → se usa `precioUSD` de la cirugía / `precio` en ARS del tratamiento (fallback — el usuario ajusta)
- Si el presupuesto es USD y el tratamiento solo tiene precio ARS, se auto-completa el precio ARS disponible y el usuario lo edita

### Ítems post-selección
- Los ítems del catálogo son **totalmente editables** después de auto-completados (descripción y precio pueden modificarse)
- Los ítems del catálogo muestran un **badge/etiqueta pequeño** (ej. "Catálogo") para diferenciarse visualmente de los ítems de texto libre
- Una vez editados, son funcionalmente idénticos a los ítems de texto libre (el badge es solo indicador visual, no bloquea edición)

### Claude's Discretion
- Diseño exacto del badge de "Catálogo" (color, tamaño, posición en la fila)
- Copy exacto de labels y placeholders
- Comportamiento del popover cuando el catálogo está vacío (sin cirugías/tratamientos creados)
- Loading skeleton del combobox mientras carga el catálogo
- Si el moneda del presupuesto cambia después de agregar ítems del catálogo (no re-calcular automáticamente — el usuario ya tiene los valores como editables)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GenerarPresupuestoModal` (`frontend/src/components/live-turno/tabs/hc/GenerarPresupuestoModal.tsx`) — componente a modificar: agregar botón "+ Agregar del catálogo" + popover con combobox
- `useCreatePresupuesto` hook (`frontend/src/hooks/useCreatePresupuesto.ts`) — sin cambios en la mutación; los ítems siguen siendo `{ descripcion, precioTotal }` (el snapshot ya normaliza a este formato)
- Popover + Command/Combobox de shadcn — ya utilizado en Phase 26 para selector de insumos; mismo patrón reutilizable
- `useTratamientosProfesional` hooks — ya existen; probablemente necesitan variante que incluya `precio` y `precioBase`
- `CirugiaCatalogo` (Phase 26) — nuevo modelo con `nombre`, `precioARS`, `precioUSD`; necesita hook en frontend

### Established Patterns
- Combobox/Command con grupos/secciones de shadcn — patrón establecido en Phase 26 para selección de insumos; replicar con dos `CommandGroup` (Cirugías / Tratamientos)
- Multi-tenant por `profesionalId`: hooks filtran por profesional activo vía `useEffectiveProfessionalId`
- TanStack Query hooks en `frontend/src/hooks/` — agregar `useCirugiasCatalogoProfesional` (si no existe aún)
- `api.get` via `@/lib/api` axios instance — para fetch del catálogo de cirugías

### Integration Points
- `GenerarPresupuestoModal` — punto de entrada principal; agregar botón + popover
- `backend/src/modules/cirugias-catalogo/` — nuevo módulo de Phase 26; necesita endpoint `GET /cirugias-catalogo?profesionalId=X` para el frontend
- `PresupuestoItemDto` (`create-presupuesto.dto.ts`) — actualmente `{ descripcion, precioTotal }`; no requiere cambio de schema (el snapshot normaliza a este formato en frontend)
- `frontend/src/hooks/` — posible nuevo hook `useCirugiasCatalogoProfesional`

</code_context>

<specifics>
## Specific Ideas

- El popover con dos `CommandGroup` ("Cirugías" arriba, "Tratamientos" abajo) es el patrón shadcn natural y consistente con Phase 26
- El badge "Catálogo" puede ser un `<Badge variant="secondary" className="text-xs">Catálogo</Badge>` dentro de la fila del ítem, al lado de la descripción
- La lógica de precio en el frontend: al seleccionar del popover, calcular `precio = presupuesto.moneda === 'USD' ? item.precioUSD ?? item.precio : item.precioARS ?? item.precio` antes de agregar a la lista

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 28-presupuestos-catalog-integration*
*Context gathered: 2026-04-25*
