# Phase 27: HC Integration — LiveTurno + PatientDrawer - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Tres capacidades nuevas que integran los catálogos clínicos de Phase 26 en los flujos de atención:
1. La sección "Práctica" de LiveTurno HC se renombra "Tratamiento en Consultorio" y gana un multi-selector del catálogo, con checkbox de insumos que genera una OrdenConsumo al guardar.
2. La OrdenConsumo (nuevo modelo) se crea con estado PENDIENTE — la UI de gestión queda para Phase 31.
3. Desde el PatientDrawer el profesional puede crear entradas de HC usando el mismo componente que LiveTurno, sin requerir turno activo, con fecha retroactiva seleccionable.

</domain>

<decisions>
## Implementation Decisions

### Renombrado y reemplazo del botón "Práctica"
- El botón "Práctica" desaparece completamente y es reemplazado por "Tratamiento en Consultorio"
- Los registros históricos con tipo `practica` se siguen mostrando igual en el historial (no hay migración de datos, solo cambio de label en el formulario nuevo)
- No coexisten ambos botones

### Multi-selector de tratamientos dentro de "Tratamiento en Consultorio"
- Al seleccionar "Tratamiento en Consultorio", aparece un Combobox multi-select (mismo patrón que Phase 26 para insumos — shadcn Command/Combobox) que filtra tratamientos del catálogo del profesional
- Los tratamientos seleccionados se muestran como **pills/tags removibles** con × para quitar
- El textarea de texto libre queda **detrás de un toggle/link** ("↑ Agregar notas libres"), colapsado por defecto
- El texto libre es el complemento, no el elemento principal

### Checkbox "Consumir insumos del stock"
- Aparece **justo debajo de los pills** cuando al menos un tratamiento seleccionado tiene insumos vinculados en el catálogo
- Muestra solo el checkbox con label simple: "☐ Consumir insumos del stock" — sin lista de insumos ni detalle a la vista
- No hay dialog de confirmación previo a guardar
- Al guardar con checkbox activo: toast mínimo `✓ HC guardada. Orden de consumo creada.` (sonner, no bloqueante)

### HC creator desde PatientDrawer
- Acceso mediante **botón flotante o en el header del drawer** — visible desde cualquier tab, no requiere estar en la tab HC
- El creator se abre en un Dialog/Sheet
- Usa el **mismo componente** que LiveTurno — todos los tipos disponibles (Primera Consulta, Pre Quirúrgico, Control, Tratamiento en Consultorio)
- **DatePicker en el header del creator**: muestra "Fecha de la sesión: [hoy]" con calendario para cambiar. Hoy por defecto, permite fecha retroactiva
- No requiere turno activo (turnoId queda null cuando se crea desde PatientDrawer)

### OrdenConsumo — scope y modelo
- Phase 27 solo crea órdenes (estado PENDIENTE). La UI de gestión y confirmación queda 100% en Phase 31
- El modelo OrdenConsumo incluye como mínimo:
  - `pacienteId`, `profesionalId`
  - `turnoId` (nullable — presente si se creó desde LiveTurno, null si desde PatientDrawer)
  - `historiaClinicaEntradaId` (trazabilidad completa: vinculado a la entrada que la originó)
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HistoriaClinicaTab.tsx` (`frontend/src/components/live-turno/tabs/HistoriaClinicaTab.tsx`) — componente existente a modificar: reemplazar botón "Práctica" por "Tratamiento en Consultorio" y agregar selector + checkbox
- `useCreateHistoriaClinicaEntry` hook — ya tiene campo `fecha?: string` para fechas retroactivas; listo para el creator desde PatientDrawer
- Combobox/Command de shadcn — ya utilizado en Phase 26 para selector de insumos; el mismo patrón se reutiliza para el selector de tratamientos
- `PatientDrawer` (`frontend/src/components/patient/PatientDrawer/`) — agregar botón en header/área superior para abrir el creator
- `useTratamientosProfesional` hook — ya existe; necesita variante/parámetro que incluya insumos vinculados para saber cuándo mostrar el checkbox
- Módulo `tratamientos` backend — ya tiene endpoints de insumos (`PUT /tratamientos/:id/insumos`, `POST /tratamientos/:id/recalcular-precio`)

### Established Patterns
- `turnoId` ya es nullable en `HistoriaClinicaEntrada` schema — HCDR-02 habilitado sin migración extra
- Multi-tenant por `profesionalId`: patrón `getProfesionalId()` en controllers — replicar en nuevo controller de OrdenConsumo
- TanStack Query hooks en `frontend/src/hooks/` — nuevos hooks: `useCreateOrdenConsumo`, `useTratamientosCatalogoProfesional` (con insumos)
- Toast via `sonner` — patrón ya establecido para confirmaciones de acciones
- `api.post` via `@/lib/api` axios instance — patrón para todas las mutaciones

### Integration Points
- `backend/src/prisma/schema.prisma` — agregar modelo `OrdenConsumo` con sus relaciones (`OrdenConsumoInsumo` join table o array embebido)
- Nuevo módulo backend `ordenes-consumo` con al menos un endpoint `POST /ordenes-consumo` (crear)
- `historia-clinica.service.ts` — la creación de OrdenConsumo puede dispararse desde el service de HC en una transacción atómica, o desde el frontend como segunda llamada al guardar
- `frontend/src/components/live-turno/tabs/HistoriaClinicaTab.tsx` — modificar tipo `practica` → `tratamiento_en_consultorio` y agregar lógica de selector + checkbox
- `frontend/src/components/patient/PatientDrawer/` — agregar botón + Dialog con el creator de HC compartido

</code_context>

<specifics>
## Specific Ideas

- El Combobox de tratamientos en LiveTurno debe filtrar solo los `TratamientoCatalogo` del profesional activo (mismo scope que el usado en Configuración en Phase 26)
- Al incluir el `historiaClinicaEntradaId` en la OrdenConsumo, la trazabilidad queda completa: desde stock se puede ver qué entrada HC generó cada orden
- La creación de OrdenConsumo debería ocurrir en la misma transacción de guardado de HC (transacción atómica en el service de HC, no segunda llamada desde el frontend)
- El toggle de texto libre puede ser simplemente un `<button type="button">+ Agregar notas libres</button>` que muestra el `<Textarea>` con un fade-in o simplemente `display: block`

</specifics>

<deferred>
## Deferred Ideas

- Vista de listado de órdenes pendientes en /dashboard/stock — Phase 31
- Confirmación de órdenes de consumo y registro de movimiento SALIDA — Phase 31 (STOCK-03, STOCK-04)

</deferred>

---

*Phase: 27-hc-integration-liveturno-patientdrawer*
*Context gathered: 2026-04-23*
