# Phase 49: Frontend — Filtro y Color-coding de Estado - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Frontend únicamente, sobre la planilla de Tratamientos (`TratamientosTab.tsx`, consumida en `/dashboard/pacientes`). Dos refinamientos:

1. **Filtro (TRAT-04/TRAT-05):** la planilla deja de mostrar filas de pacientes CIRUGIA sin tratamiento real (Consultas reclasificadas como TRATAMIENTO pero sin contenido de tratamiento), preservando el estado dual — los pacientes CIRUGIA que sí tienen un tratamiento real siguen apareciendo y no se tocan su flujo ni su presencia en el kanban CRM.
2. **Color-coding (TRAT-06):** los chips de la columna "Estado" muestran color semántico y labels humanizados para los 7 valores reales del enum `EstadoTurno` (PENDIENTE, CONFIRMADO, EN_ESPERA, SIENDO_ATENDIDO, FINALIZADO, AUSENTE, CANCELADO) — ningún chip queda sin color ni con texto técnico del enum.

Fuera de esta fase: cualquier cambio de backend (el contrato `ultimoTratamiento: string | null` de Phase 48 se consume tal cual), mutaciones de flujo/etapaCRM del paciente, refactor forzado de `CalendarGrid`/`AppointmentDetailModal` para adoptar el helper compartido, e inferencia de tratamiento "planificado" para turnos futuros sin HC.

</domain>

<decisions>
## Implementation Decisions

### Definición de "tratamiento real" (TRAT-04)
- La señal es **`ultimoTratamiento !== null`** — se reusa directamente lo que Phase 48 ya resuelve por-turno desde la HC del turno. No se agrega ningún campo/flag nuevo en backend (mantiene la frontera frontend-only).
- El **texto libre / tratamiento en consultorio cuenta como tratamiento real**: Phase 48 ya lo devuelve como `ultimoTratamiento` non-null. Regla simple y única: non-null = hay tratamiento.
- El criterio de "sin tratamiento real" se evalúa **uniformemente por flujo de paciente** — no se ramifica en CIRUGIA vs TRATAMIENTO. (El branching real es por *source*, que es por tipo de turno, no por flujo del paciente — ver abajo.)

### Alcance del filtro (TRAT-04/TRAT-05)
- **Source A** (`tipoTurno.flujoPaciente === "TRATAMIENTO"`): **siempre visible**, tenga o no tratamiento registrado. Es un turno de tratamiento agendado deliberadamente; la planilla siempre mostró los programados (futuros sin HC → celda vacía, pero la fila se mantiene). El filtro de null **no** aplica a source A.
- **Source B** (`tipoTurno.nombre === "Consulta"` + `tipoEntradaHC === "TRATAMIENTO"`): **visible solo si `ultimoTratamiento !== null`**. Aquí es donde aparecían los CIRUGIA espurios (Consulta reclasificada como TRATAMIENTO pero sin contenido real) → se ocultan.
- Evaluación **fila por fila**: cada turno se juzga por sí mismo. Una fila vacía de source B se oculta aunque el paciente tenga otra fila con tratamiento en el mismo mes. Coherente con "planilla = lista de turnos del mes" (Phase 42).
- **Resultado:** TRAT-04 se cumple (CIRUGIA sin tratamiento real desaparece vía source B vacío), TRAT-05 se cumple (CIRUGIA con tratamiento real vía source B con contenido — o vía un turno source A — sigue visible).

### No-regresión del estado dual (TRAT-05)
- El filtro es **puramente visual y client-side dentro de `TratamientosTab`**: no muta `flujo` ni `etapaCRM`, no toca el backend. El kanban CRM lee de otra fuente. Dual preservado por construcción, igual que Phase 42 — cero riesgo de sacar al paciente del embudo.

### Chips de Estado — paleta y labels (TRAT-06)
- **Paleta base:** la de `AppointmentDetailModal.getEstadoBadge` (clases Tailwind `bg-X-100 text-X-700`), porque ya usa el mismo estilo de chip que la planilla. Mapeo:
  - CONFIRMADO → verde (`bg-green-100 text-green-700`), "Confirmado"
  - PENDIENTE → amarillo (`bg-yellow-100 text-yellow-700`), "Pendiente"
  - FINALIZADO → azul (`bg-blue-100 text-blue-700`), "Finalizado"
  - AUSENTE → gris (`bg-gray-100 text-gray-700`), "Ausente"
  - CANCELADO → rojo (`bg-red-100 text-red-700`), "Cancelado"
- **Dos estados nuevos** (hoy sin label/color en ningún chip):
  - EN_ESPERA → **violeta**, label **"En espera"**
  - SIENDO_ATENDIDO → **celeste/sky**, label **"Atendiendo"**
  - Colores elegidos para coincidir con los dots de `CalendarGrid` (EN_ESPERA=violeta, SIENDO_ATENDIDO=sky), traducidos a `bg-100/text-700`, para que el mismo estado se vea consistente entre la planilla y el calendario.
- **Ubicación del mapeo:** extraer un **helper compartido reutilizable** (estado → `{ label, className }`) en un módulo común. En esta fase **solo se cablea en `TratamientosTab`**; no se refactorizan `CalendarGrid`/`AppointmentDetailModal` (eso sería scope creep, queda como deferred). El helper mata la futura triplicación sin tocar las otras vistas ahora.

### Header summary y empty state
- **Header re-mapeado a los estados reales del enum**, agrupados:
  - realizados = `FINALIZADO`
  - programados = `PENDIENTE` + `CONFIRMADO` + `EN_ESPERA` + `SIENDO_ATENDIDO`
  - cancelados = `CANCELADO` + `AUSENTE`
  - (Hoy desglosa por `PROGRAMADO`/`REALIZADO`, labels legacy inexistentes en el enum → desglose siempre vacío. Esto lo corrige.)
- **Conteo total del header = sobre las filas visibles (post-filtro)**: el "N tratamientos" refleja lo que efectivamente se muestra; las filas ocultas de source B no suman.
- **Empty state:** mantener el copy genérico actual ("Sin tratamientos en {mes}" + "Los turnos con tipo de tratamiento aparecerán aquí"). No menciona el filtro.

### Claude's Discretion
- Nombre y ubicación exacta del helper compartido (ej. `frontend/src/lib/estadoTurno.ts` o `frontend/src/app/dashboard/turnos/estadoTurno.helpers.ts`) y su firma (función vs objeto Record).
- Tonos Tailwind exactos para violeta/celeste (ej. `violet-100/700` vs `purple-100/700`; `sky-100/700` vs `cyan-100/700`), respetando la intención de color.
- Si el chip mantiene el wrapper `<span>` actual de la planilla o adopta el componente `<Badge>` de `AppointmentDetailModal` — manteniendo consistencia visual con la tabla.
- Manejo del `opacity-40` actual en filas CANCELADO y su interacción con el nuevo color del chip.
- Borde: un estado del enum que (hipotéticamente) no esté en el mapa → fallback neutro con el texto crudo, sin romper.

</decisions>

<specifics>
## Specific Ideas

- El mismo estado debe verse **igual en la planilla y en el calendario** — por eso EN_ESPERA=violeta y SIENDO_ATENDIDO=celeste se alinean con los dots de `CalendarGrid`.
- La planilla sigue siendo "la planilla de tratamientos del mes": el filtro limpia ruido (CIRUGIA espurios) sin agregar marcas ni mensajes nuevos; los tratamientos programados reales (source A) no desaparecen.
- Preferencia consistente del usuario por reusar lo existente (paleta de `AppointmentDetailModal`, contrato de Phase 48) antes que inventar.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx` — componente único a modificar. Hoy: predicado de filtrado `tipoTurno.flujoPaciente === "TRATAMIENTO" || isFuenteB(t)` (~70–72), `isFuenteB` (67–68), `ESTADO_BADGE_CLASS`/`ESTADO_LABEL` legacy (33–43), render del chip con `turno.estado` crudo (250–258), header summary (94–112), empty state (193–203).
- `AppointmentDetailModal.getEstadoBadge` (`frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx:71–86`) — fuente de la paleta base de chips (Tailwind `bg-X-100 text-X-700` + labels en español). Cubre 5 de 7 estados; faltan EN_ESPERA/SIENDO_ATENDIDO.
- `CalendarGrid.getStatusDotColor` (`frontend/src/app/dashboard/turnos/CalendarGrid.tsx:134–145`) — referencia de color para EN_ESPERA (violeta `#A78BFA`) y SIENDO_ATENDIDO (sky `#0EA5E9`).
- `TurnoRango` type / `useTurnosRango` (`frontend/src/hooks/useTurnosRangos.ts`) — ya expone `ultimoTratamiento?: string | null`, `tipoEntradaHC`, `tipoTurno.{nombre,flujoPaciente}`, `estado`. Todo lo necesario para el filtro y los chips ya viene en la respuesta; no hace falta tocar el hook salvo tipos.

### Established Patterns
- **Filtrado client-side** sobre la respuesta de `/turnos/rango`: el filtro de source B se agrega al predicado existente; no hay endpoint nuevo (patrón Phase 42).
- **Source A vs Source B** (Phase 42): A = `tipoTurno.flujoPaciente === "TRATAMIENTO"`; B = `tipoTurno.nombre === "Consulta"` + `tipoEntradaHC === "TRATAMIENTO"`. El filtro de null aplica **solo a B**.
- **Enum `EstadoTurno`** (Prisma `schema.prisma:1099`): PENDIENTE, CONFIRMADO, CANCELADO, AUSENTE, FINALIZADO, EN_ESPERA, SIENDO_ATENDIDO. No existen `PROGRAMADO`/`REALIZADO` (labels legacy a eliminar de `ESTADO_LABEL`/`ESTADO_BADGE_CLASS`).
- **Focus-mode** (`cn(fm ? ... : ...)`): cualquier estilo nuevo de chip/header debe respetar el patrón de tema existente en el componente.

### Integration Points
- **Filtro:** ampliar el predicado en `TratamientosTab` para que `isFuenteB(t)` exija además `t.ultimoTratamiento != null`. Source A queda intacto. `visibleTurnos`, `countByEstado` y `totalCount` deben derivarse del conjunto ya filtrado.
- **Chips:** reemplazar `ESTADO_BADGE_CLASS`/`ESTADO_LABEL` + el render crudo `{turno.estado}` por el helper compartido `estado → {label, className}` que cubre los 7 valores.
- **Header:** reescribir el cálculo de `breakdown` para agrupar por los estados reales del enum (realizados/programados/cancelados) sobre las filas visibles.
- **Sin cambios de backend:** `obtenerTurnosPorRango` ya entrega `ultimoTratamiento` por-turno (Phase 48). Esta fase solo consume.

</code_context>

<deferred>
## Deferred Ideas

- **Refactor de `CalendarGrid` y `AppointmentDetailModal`** para que adopten el mismo helper compartido de estado→{label,color} y eliminar las paletas duplicadas/inconsistentes (PENDIENTE amarillo vs naranja). Esta fase crea el helper pero solo lo cablea en la planilla; unificar las otras vistas es trabajo futuro.

</deferred>

---

*Phase: 49-frontend-filtro-y-color-coding-de-estado*
*Context gathered: 2026-06-22*
