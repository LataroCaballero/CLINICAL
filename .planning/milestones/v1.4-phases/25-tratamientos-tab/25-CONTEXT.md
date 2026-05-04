# Phase 25: Tratamientos Tab - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Dos entregables UI en /dashboard/pacientes:
1. Nuevo tab "Tratamientos" — lista mensual de turnos con `tipoTurno.flujoPaciente = TRATAMIENTO` del profesional activo, navegable por mes (anterior/siguiente), filtrable por tipo de turno. El total del mes y breakdown por estado se muestran en el header del tab.
2. Badge de flujo en la tabla general de pacientes — columna dedicada que muestra el flujo de cada paciente (CIRUGIA, TRATAMIENTO, PENDIENTE, null/legacy).

Esta fase es puramente frontend. El backend PATCH `/pacientes/:id/flujo` (Phase 22) y los filtros CRM por flujo (Phase 23) ya existen.

</domain>

<decisions>
## Implementation Decisions

### Badge de flujo en tabla de pacientes
- **Columna dedicada "Flujo"** — nueva columna en `createPacienteColumns()`, no inline en la celda del nombre
- **Texto abreviado con colores:**
  - `CIRUGIA` → badge azul, texto "CIR"
  - `TRATAMIENTO` → badge verde, texto "TRAT"
  - `PENDIENTE` → badge amber, texto "PEND"
  - `null` (legacy) → badge gris, texto "—"
- **Null se muestra siempre** — badge gris con "—" (no celda vacía); consistente con FLUJO-05 y evita confusión con datos faltantes
- **Alcance del badge:** columna en la tabla Lista de /dashboard/pacientes + badge visible en el drawer del paciente (en los datos del paciente / header del drawer)

### Navegación de tabs (Embudo / Lista / Tratamientos)
- **Extender pill buttons existentes a 3** — tercer botón "Tratamientos" en el mismo pill group que ya existe en page.tsx
- **Icono:** `Syringe` de lucide-react (jeringa)
- **Persistencia del tab activo:** mantener el `localStorage.getItem(STORAGE_KEY)` existente extendiendo el tipo `Vista` de `"lista" | "embudo"` a `"lista" | "embudo" | "tratamientos"`
- **Mes seleccionado:** no persistir — siempre arranca en el mes actual al entrar al tab

### Estados de turnos en la lista de tratamientos
- **Todos los estados** — PROGRAMADO, REALIZADO y CANCELADO se muestran
- **Turnos CANCELADOS** — fila atenuada (opacity reducida) para distinguirlos visualmente sin leer el badge
- **Orden** — cronológico ascendente (día 1 del mes al tope, día último al fondo)

### Header del tab — resumen del mes
- **Total + breakdown por estado:** `"12 tratamientos (8 realizados, 3 programados, 1 cancelado)"`
- El mes seleccionado se muestra en los controles de navegación (botones anterior/siguiente + label del mes), no hace falta repetirlo en el header

### Empty states
- **Sin turnos en el mes:** mensaje con sub-hint
  - Título: "Sin tratamientos en [Mes Año]"
  - Subtexto: "Los turnos con tipo de tratamiento aparecerán aquí"
- **Sin profesional seleccionado:** mismo mensaje que la vista Embudo — "Seleccioná un profesional para ver los tratamientos."

### Claude's Discretion
- Implementación del layout interno del tab (componente separado vs. inline en page.tsx)
- Estructura exacta del breakdown en el header (badges, texto, separadores)
- Diseño del atenuado en filas canceladas (opacity class, text-muted, o combinación)
- Si el `Syringe` icon no existe en la versión instalada de lucide-react, usar `Stethoscope` o `Activity` como fallback
- Backend: si el endpoint `/turnos/rango` es suficiente filtrando `flujoPaciente = TRATAMIENTO` del lado cliente, o si conviene un endpoint dedicado `/turnos/tratamientos-mes`

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `page.tsx` (pacientes) — Vista state con `localStorage`, pill buttons `Embudo`/`Lista`. Extender `Vista` type a 3 valores y añadir tercer botón es cambio mínimo.
- `createPacienteColumns()` (columns.tsx) — factory que acepta `unreadMap` extra; agregar un `ColumnDef` de flujo es una entrada más al array de columnas
- `useTurnosRango` (useTurnosRangos.ts) — hook TanStack Query con params `profesionalId, desde, hasta`; filtra todos los turnos del rango. Candidato a reutilizar con filtro adicional por `flujoPaciente`
- `useTiposTurno()` (useTipoTurnos.ts) — devuelve todos los tipos de turno; base para el dropdown de filtro
- `useEffectiveProfessionalId()` — hook de contexto profesional, ya usado en page.tsx
- `Badge`, `Button`, `Skeleton` de shadcn/ui — disponibles para la lista y badges de flujo
- `Kanban`, `LayoutList` iconos de lucide-react — patrón para el nuevo `Syringe` icon en el pill

### Established Patterns
- Focus mode (`useUIStore().focusModeEnabled`) — todos los componentes del dashboard respetan `fm` con clases `cn()`; el nuevo componente debe también
- TanStack Query para fetching — `queryKey: ["turnos", "rango", ...]` patrón en useTurnosRango
- Persistencia de vista en localStorage — `STORAGE_KEY` y `setItem/getItem` en page.tsx
- `cn()` de `@/lib/utils` para clases condicionales

### Integration Points
- `frontend/src/app/dashboard/pacientes/page.tsx` — extender `Vista` type, añadir 3er botón al pill, renderizar el nuevo componente `<TratamientosTab />` cuando `vista === "tratamientos"`
- `frontend/src/app/dashboard/pacientes/components/columns.tsx` — añadir columna `flujo` al array de `createPacienteColumns()`
- `frontend/src/types/` o inline — tipo `FlujoPaciente = 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' | null` para los badges
- Drawer del paciente — buscar el componente del drawer e insertar badge de flujo en el header/datos del paciente
- `usePacientes` hook — verificar que el campo `flujo` se incluye en el response (puede requerir ajuste en el endpoint backend si no se devuelve ya)

</code_context>

<specifics>
## Specific Ideas

- El breakdown del header debe mostrar solo los estados con count > 0 para no clutterear cuando todos son PROGRAMADOS
- El label del mes en los controles de navegación: formato "Abril 2026" (mes capitalizado + año)
- El dropdown de filtro por tipo de turno debe filtrar client-side sobre los datos ya cargados (no refetch por cada cambio de filtro)
- Los turnos CANCELADOS atenuados: la fila entera pierde opacity (no solo el texto), similar a cómo otros sistemas marcan items inactivos

</specifics>

<deferred>
## Deferred Ideas

- TRAT-07: Monto cobrado por paciente en el mes (requiere join Cobro/Factura) — ya marcado como v2 en REQUIREMENTS.md
- TRAT-08: Export CSV de la lista — ya marcado como v2
- TRAT-09: Pantalla de reclasificación masiva de PENDIENTE — ya marcado como v2

</deferred>

---

*Phase: 25-tratamientos-tab*
*Context gathered: 2026-04-19*
