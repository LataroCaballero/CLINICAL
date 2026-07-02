# Phase 30: Tab Tratamientos Último Tratamiento - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Agregar una columna "Último tratamiento" al tab Tratamientos existente en /dashboard/pacientes. La columna muestra el nombre del tratamiento de catálogo más reciente registrado en HC por cada paciente. La vista mensual por-turno no cambia — solo se agrega la columna al final de la tabla.

</domain>

<decisions>
## Implementation Decisions

### Estructura de la tabla
- La vista mensual por-turno (una fila por appointment de tipo TRATAMIENTO) se mantiene sin cambios
- La columna "Último tratamiento" se agrega como **5ta columna al final**: Fecha y hora / Paciente / Tipo de turno / Estado / Último tratamiento
- La celda es **clickeable** cuando hay tratamiento: abre el PatientDrawer del paciente directo en la **tab Historia Clínica**
- El nombre del paciente (columna 2) sigue abriendo el PatientDrawer en la tab por defecto como antes

### Contenido de la columna
- Muestra **solo el nombre** del tratamiento de catálogo (sin fecha)
- Si la última entrada HC tiene múltiples tratamientos, se **listan todos separados por coma**: e.g. "Botox Frente, Relleno Labial"
- El texto clickeable usa el mismo estilo que el nombre del paciente: **`hover:underline font-medium`** — sin color azul explícito

### Estado vacío de la columna
- Cuando el paciente no tiene ningún tratamiento de catálogo en HC: la celda muestra **"—"** (dash largo) en texto muted/secundario (`text-gray-400` / focus-mode `text-[var(--fc-text-secondary)]`)
- El dash **no es clickeable** — solo texto informativo

### Actualización sin recarga (TanStack Query)
- El "último tratamiento" se enriquece en el **endpoint existente de turnos** (GET /turnos rango) — no un endpoint separado por paciente, evita N+1
- Al guardar una HC con tratamiento (desde LiveTurno o PatientDrawer), se invalida `['turnosRango']` para que la columna se refresque automáticamente
- El refetch ocurre cuando el tab Tratamientos está activo (TanStack Query default: refetch on window focus / query active)

### Claude's Discretion
- Header exacto de la columna ("Último tratamiento" o "Últ. tratamiento" si el espacio es acotado)
- Truncado con ellipsis si la lista de tratamientos es muy larga
- Posición exacta del tab target al abrir PatientDrawer desde la columna (pasar prop `defaultTab="hc"` o similar)
- Query key exacta a invalidar (`['turnosRango', profesionalId, desde, hasta]` o partial match)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TratamientosTab.tsx` (`frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx`) — componente a modificar: agregar `<th>` y `<td>` para la nueva columna
- `useTurnosRango` hook (`frontend/src/hooks/useTurnosRangos.ts`) — hook existente a enriquecer; la respuesta del backend debe incluir `ultimoTratamiento` por paciente
- `PatientDrawer` — ya se usa en TratamientosTab para abrir desde el nombre del paciente; el click en la columna nueva lo abre con tab HC
- `FlujoBadge` colores (blue/green/amber) — patrón de colores de referencia para mantener consistencia visual

### Established Patterns
- Tabla HTML `<table>` con clases Tailwind y soporte focus-mode (`cn(fm ? "text-[var(--fc-text-primary)]" : "text-gray-700")`) — replicar en la nueva columna
- Click en celda de paciente → `setSelectedPacienteId(turno.paciente.id)` → PatientDrawer — mismo patrón para la nueva columna, posiblemente con `defaultTab`
- `contenido.tratamientos` en `HistoriaClinicaEntrada` es un `Json` con shape `[{id: string, nombre: string}]` — el backend busca la última entrada con este campo no-vacío
- Multi-tenant: `profesionalId` filtra los datos — el query de "último tratamiento" debe respetar el mismo scope

### Integration Points
- Backend: el endpoint de turnos-rango necesita un sub-query por paciente que busque la HC entry más reciente con `contenido->tratamientos` no-nulo (PostgreSQL JSON operator o Prisma `path`/`array_contains`)
- `history-clinica.service.ts` o `turnos.service.ts` — donde se agrega el enriquecimiento de `ultimoTratamiento` al resultado
- `useCreateHistoriaClinicaEntry` mutation — agregar `queryClient.invalidateQueries(['turnosRango'])` en `onSuccess` para auto-refresh de la columna
- PatientDrawer API: verificar si acepta `defaultTab` prop; si no, agregar el prop para que la columna pueda abrir directo en HC

</code_context>

<specifics>
## Specific Ideas

- La columna debe sentirse como una "vista rápida" de contexto clínico del paciente — no es el foco de la fila, pero enriquece el dato
- El comportamiento del PatientDrawer al hacer click debe ser idéntico al click en el nombre del paciente, excepto que navega directo a la tab HC

</specifics>

<deferred>
## Deferred Ideas

None — la discusión se mantuvo dentro del scope de Phase 30.

</deferred>

---

*Phase: 30-tab-tratamientos-ultimo-tratamiento*
*Context gathered: 2026-05-07*
