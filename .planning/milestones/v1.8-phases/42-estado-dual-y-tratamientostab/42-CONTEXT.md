# Phase 42: Estado Dual y TratamientosTab - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Hacer que la planilla de tratamientos (`TratamientosTab`) muestre **dos fuentes** de registros:
- **Fuente A:** turnos cuyo `tipoTurno.flujoPaciente === TRATAMIENTO` (comportamiento actual, sin cambios).
- **Fuente B:** turnos de tipo "Consulta" cuya entrada HC vinculada (`Turno.entradaHC`) tiene `tipoEntrada === TRATAMIENTO` (Phase 41).

Objetivo: un paciente `flujo = CIRUGIA` que también recibe tratamientos aparece **tanto** en el kanban CRM **como** en la planilla, sin cambiar su flujo ni su etapa CRM.

**Fuera de scope:** archivar del embudo (Phase 43), cualquier cambio en cómo se crea/clasifica la HC (Phase 41), cualquier mutación de estado del paciente. Phase 42 es **solo lectura/visualización**.

</domain>

<decisions>
## Implementation Decisions

### Distinción visual fuente A vs B
- La planilla es **una sola lista homogénea** — NO se agrega un badge de "origen" por fila. Ambas fuentes son "tratamientos del mes".
- La **columna "Tipo de turno"** es la que delata el origen: para una fila de **fuente B** muestra **`Consulta → Tratamiento`** (el tipo real del turno + la clasificación HC). Para fuente A muestra el `tipoTurno.nombre` como hoy.
- Filas de ambas fuentes se **intercalan ordenadas por fecha/hora del turno** (`inicio asc`, igual que hoy) — no se agrupan A y luego B.
- El **contador del header** (hoy "N tratamientos (X realizados, Y programados…)") cuenta **A + B como un total combinado**, sin desglose por fuente.

### Fecha que determina el mes y la columna "Fecha y hora"
- Para AMBAS fuentes el mes lo determina la **fecha del turno (`inicio`)** — regla única para toda la planilla.
- Para fuente B, aunque la entrada HC se haya cargado en otro mes, la fila aparece en el mes del **turno** y la columna "Fecha y hora" muestra el **`inicio` del turno** (no la fecha de la HC).
- Esto encaja con el `findRango` actual, que ya consulta por `turno.inicio` dentro del rango del mes.

### Paciente dual (flujo = CIRUGIA)
- **Sin marca de flujo** en la planilla: los pacientes `flujo = CIRUGIA` se muestran igual que los `flujo = TRATAMIENTO`. No se agrega `FlujoBadge` ni columna de etapa CRM.
- **No se muestra la etapa CRM** del paciente en la fila.
- **Garantía dual = solo lectura:** aparecer en la planilla NO debe mutar `flujo` ni `etapaCRM`. La query de fuente B es puramente de lectura (sin side effects). El estado dual ya está garantizado a nivel datos desde Phase 41 (TRATAMIENTO sobre paciente CIRUGIA = no-op de flujo).

### Estados incluidos en fuente B
- Fuente B incluye los **mismos estados que A** (PROGRAMADO / REALIZADO / CANCELADO) — una sola regla de estado para toda la planilla. La condición de pertenencia a B es la existencia de la entrada HC con `tipoEntrada = TRATAMIENTO`, no el estado del turno.

### Claude's Discretion
- **Dropdown de filtro por tipo:** cómo encaja la fuente B en el filtro existente queda a discreción del planner — la opción más natural para que el filtro siga teniendo sentido con ambas fuentes (ej: agregar una opción "Consulta→Tratamiento" o tratar B dentro de los tipos presentes). No complicar el dropdown innecesariamente.
- **Dónde vive la query dual:** enriquecer el endpoint existente `GET /turnos/rango` (`findRango` en `turnos.service.ts`) vs. lógica adicional — se recomienda extender `findRango` siguiendo el patrón de Phase 30 (`ultimoTratamiento`), pero queda a criterio del planner.
- **Forma exacta del label `Consulta → Tratamiento`** (texto, separador, ícono) y truncado/estilos.
- **Cómo se expone `tipoEntrada` por turno** en la respuesta de `/turnos/rango` (campo nuevo en el select del turno vía `entradaHC.tipoEntrada`).

</decisions>

<specifics>
## Specific Ideas

- La planilla debe seguir sintiéndose como "la planilla de tratamientos del mes": una sola tabla, homogénea, sin ruido visual extra. La única señal del origen dual es el texto `Consulta → Tratamiento` en la columna de tipo.
- El requisito crítico de no-regresión (paciente CIRUGIA no desaparece del kanban) se cumple por construcción: Phase 42 no escribe nada, solo lee y muestra.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TratamientosTab.tsx` (`frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx`) — componente a modificar. Hoy filtra `turnosData` client-side por `t.tipoTurno.flujoPaciente === "TRATAMIENTO"` (línea ~66). La fuente B se suma a ese filtro: turnos cuyo `tipoTurno` es Consulta y cuya `entradaHC.tipoEntrada === "TRATAMIENTO"`.
- `useTurnosRango` / `TurnoRango` type (`frontend/src/hooks/useTurnosRangos.ts`) — el type del turno debe incluir el nuevo campo (ej. `tipoEntradaHC?: string | null`) para poder identificar la fuente B client-side.
- `findRango` (`backend/src/modules/turnos/turnos.service.ts:504`) — ya devuelve TODOS los turnos del rango + enriquece `ultimoTratamiento` (patrón Phase 30). Extender el `select` del turno para traer `entradaHC.tipoEntrada` (o equivalente) sin N+1.
- Columna "Último tratamiento" (Phase 30) y patrón click-en-celda → `PatientDrawer` — se mantienen para ambas fuentes.

### Established Patterns
- Filtrado de la planilla es **client-side** sobre la respuesta de `/turnos/rango`. La fuente B se agrega ampliando ese predicado, no con un endpoint nuevo.
- `Turno.entradaHCId` → `HistoriaClinicaEntrada.tipoEntrada` (enum `TipoEntradaHC`, Phase 41). Source B = `tipoTurno` Consulta + `entradaHC.tipoEntrada === TRATAMIENTO`.
- Multi-tenant: `profesionalId` ya filtra `findRango` — la fuente B respeta el mismo scope automáticamente.
- Tabla HTML con soporte focus-mode (`cn(fm ? ... : ...)`) — replicar estilos en cualquier ajuste de la columna Tipo.

### Integration Points
- Backend: `findRango` — agregar al `select` del turno la relación `entradaHC` con `tipoEntrada` (y `tipoTurno` ya está). Exponer el valor por turno en el objeto de respuesta.
- Frontend: `TurnoRango` type + predicado de filtrado en `TratamientosTab` (fuente A OR fuente B) + render de `Consulta → Tratamiento` en la columna Tipo cuando la fila es fuente B.
- Refresh: la invalidación de `['turnos','rango', ...]` tras guardar HC (Phase 30) ya cubre el auto-refresh de la planilla; verificar que aplique también a la nueva fuente.

</code_context>

<deferred>
## Deferred Ideas

None — la discusión se mantuvo dentro del scope de Phase 42.

</deferred>

---

*Phase: 42-estado-dual-y-tratamientostab*
*Context gathered: 2026-06-08*
