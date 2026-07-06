# Phase 26: Schema Foundation + Catalog CRUD - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Los profesionales gestionan dos catálogos clínicos desde Configuración:
1. **Tratamientos** (extensión del catálogo existente): vinculación de insumos del stock con cantidad, precio base calculado como campo independiente, botón "Recalcular desde insumos".
2. **Cirugías** (nuevo catálogo): CRUD completo con nombre, precio ARS, precio USD, insumos vinculados con cantidades, duración estimada. Aislamiento multi-profesional.

El catálogo de cirugías se construye sobre un nuevo modelo `CirugiaCatalogo` (distinto al modelo `Cirugia` que representa cirugías clínicas programadas para pacientes).

</domain>

<decisions>
## Implementation Decisions

### Cirugías tab placement
- Nueva tab "Cirugías" independiente en la página de Configuración, al lado de "Tratamientos"
- Aparece tanto para PROFESIONAL como para SECRETARIA (la secretaria ya puede gestionar tratamientos)
- Nombre del modelo DB: `CirugiaCatalogo` (consistente con `TratamientoCatalogo` existente en schema)

### Insumos UI (igual para Tratamientos y Cirugías)
- Los insumos se gestionan **inline dentro del mismo modal de edición** — no hay segundo modal ni drawer separado
- Para agregar insumo: combobox con búsqueda que filtra los productos del stock del profesional
- Los insumos ya agregados se muestran como **tabla compacta**: columnas Producto | Cantidad (editable inline) | × quitar
- El mismo componente/patrón se reutiliza en el modal de Tratamientos y en el modal de Cirugías

### Precio base vs precio manual
- **Conviven** — no se reemplaza el campo `precio` manual en `Tratamiento`
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GestionTratamientos` (`frontend/src/app/dashboard/configuracion/components/GestionTratamientos.tsx`) — componente existente con tabla CRUD; extender para agregar columna "Costo insumos" y sección insumos en el modal
- `useTratamientosProfesional` hooks (`frontend/src/hooks/`) — ya implementados; necesitan variantes con `include: { insumos }` o endpoints ampliados
- `backend/src/modules/tratamientos/` — módulo existente con controller, service, DTOs; agregar endpoints de insumos
- Configuración page (`frontend/src/app/dashboard/configuracion/page.tsx`) — agregar tab "Cirugías" en las vistas PROFESIONAL y SECRETARIA (ya tiene 9 y 4 tabs respectivamente)
- `shadcn/ui`: Dialog, Table, Input, Button, Badge, Combobox/Command (para el buscador de productos) — todos disponibles
- `Producto` model + `Inventario` — usados para buscar insumos del stock del profesional

### Established Patterns
- Multi-tenant por `profesionalId`: patrón establecido en `getProfesionalId()` helper del controller de tratamientos — replicar en controlador de cirugías
- TanStack Query hooks en `frontend/src/hooks/` — nuevos hooks: `useCirugiasCatalogo`, `useCreateCirugiaCatalogo`, etc.
- `api.get` / `api.post` / `api.patch` / `api.delete` via `@/lib/api` axios instance
- Soft delete con `activo: Boolean` — ya en Tratamiento; replicar en CirugiaCatalogo

### Integration Points
- `backend/src/prisma/schema.prisma` — agregar `TratamientoInsumo` (join table Tratamiento ↔ Producto + cantidad), `CirugiaCatalogo`, `CirugiaInsumo`
- `backend/src/modules/tratamientos/` — agregar endpoints `POST /tratamientos/:id/insumos`, `DELETE /tratamientos/:id/insumos/:productoId`, `POST /tratamientos/:id/recalcular-precio`
- Nuevo módulo `backend/src/modules/cirugias-catalogo/` con CRUD completo + endpoints de insumos
- `frontend/src/app/dashboard/configuracion/page.tsx` — insertar `<TabsTrigger value="cirugias">Cirugías</TabsTrigger>` en vistas PROFESIONAL y SECRETARIA

</code_context>

<specifics>
## Specific Ideas

- El botón "Recalcular desde insumos" en el modal de tratamiento calcula: `SUM(producto.costoBase * cantidad)` para cada insumo del tratamiento y persiste el resultado en `precioBase`. Si `costoBase` de algún producto es null, usar 0 para ese ítem y mostrar advertencia.
- La columna "Costo insumos" en la tabla muestra "—" cuando `precioBase` es null (sin insumos), y el monto formateado cuando existe.
- El combobox de búsqueda de insumos debe buscar entre los `Inventario` del profesional (join con `Producto`), no en todos los productos globales.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 26-schema-foundation-catalog-crud*
*Context gathered: 2026-04-22*
