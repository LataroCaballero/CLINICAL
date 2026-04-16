# Phase 23: Backend Logic - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Auto-actualizar `Paciente.flujo` al crear turnos clasificatorios (FLUJO-01–04) y filtrar todas las vistas CRM (kanban, lista de acción, KPIs) para mostrar únicamente pacientes CIRUGIA + legacy (flujo IS NULL). Esta fase es backend puro — no toca frontend. La fundación de schema (campo flujo, TipoTurno.flujoPaciente) ya fue hecha en Phase 22.

</domain>

<decisions>
## Implementation Decisions

### Atomicidad del flujo update
- **Best-effort**: el turno se crea independientemente de si el flujo update falla — mismo patrón que la auto-transición CRM existente en `crearTurno()`
- Si el update falla: `logger.warn()` con `turnoId` y `pacienteId` — el error NO llega al cliente
- Timing dentro de `crearTurno()`: después de crear el turno Y después de la CRM auto-transition (paso 5.5 del flujo actual), antes del contacto log

### Ubicación de la lógica
- La lógica de flujo auto-update vive **inline en `TurnosService.crearTurno()`** — mismo patrón que la auto-transición CRM ya existente, sin inyección de dependencias nueva
- El `tipoTurno` select en `crearTurno()` se expande para incluir `flujoPaciente` (agregar una línea al select existente en `tipoTurno.findUnique()`)
- El `paciente` findUnique (actualmente `{etapaCRM, profesionalId}`) se expande para incluir `flujo` — **un solo findUnique compartido** para la lógica CRM y la lógica de flujo

### Filtro CRM — definición exacta
- Filtro: **`flujo = 'CIRUGIA' OR flujo IS NULL`** — más amplio que STATE.md (sin condición extra sobre etapaCRM)
- Todos los pacientes con `flujo IS NULL` (legacy) permanecen visibles en todas las vistas CRM, sin importar su etapaCRM (incluye PERDIDO, CONFIRMADO, SIN_CLASIFICAR)
- Razón: pacientes existentes que se están atendiendo ahora no deben desaparecer al actualizar a v1.4
- `flujo = TRATAMIENTO` excluido de **todas** las vistas CRM en esta fase (aparecerán en tab Tratamientos en Phase 25)

### Scope del filtro CRM-03 — métodos afectados
**`pacientes.service.ts`:**
- `getKanban()` — agregar `WHERE (flujo = 'CIRUGIA' OR flujo IS NULL)` al `findMany`
- `getListaAccion()` — agregar mismo filtro al `findMany` (actualmente filtra solo por `etapaCRM NOT IN [CONFIRMADO, PERDIDO]`)

**`crm-dashboard.service.ts`** — todos los métodos:
- `getFunnelSnapshot()` — filtrar pacientes del groupBy
- `getKpis()` — filtrar los conteos
- `getMotivosPerdida()` — filtrar el groupBy
- `getPipelineIncome()` — filtrar pacientes del ingreso potencial
- `getCoordinatorPerformance()` — filtrar logs por paciente con flujo correcto

**`crm-metrics.service.ts`:**
- `getCRMMetrics()` — filtrar el `findMany` de pacientes

**NO filtrar:**
- `reportes-dashboard.service.ts:getDashboardKPIs()` — métricas operativas generales (turnos hoy, ingresos del día, próximos turnos), no es CRM

### Claude's Discretion
- Implementación exacta del try/catch para best-effort (puede ser `.catch(err => logger.warn(...))` en cadena de promise)
- Índice en `Paciente.flujo` si el query planner lo requiere (decisión de performance en runtime)
- Formato exacto del mensaje `logger.warn()`

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TurnosService.crearTurno()` (turnos.service.ts:31) — ya tiene "paso 5" CRM auto-transition: lee paciente post-creación, evalúa condición, hace update separado. El flujo update sigue el mismo patrón como "paso 5.5"
- `logger` de NestJS — ya importado en TurnosService para `warn()`
- `PacientesService.getKanban()` (pacientes.service.ts:617) — WHERE actual: `{profesionalId}`. Agregar condición flujo
- `PacientesService.getListaAccion()` (pacientes.service.ts:799) — WHERE actual: `{profesionalId, etapaCRM: {notIn: [CONFIRMADO, PERDIDO]}}`. Agregar condición flujo
- `crm-dashboard.service.ts` — 5 métodos, todos reciben `profesionalId`, todos necesitan el filtro flujo

### Established Patterns
- Auto-transitions en `crearTurno()` son best-effort y no transaccionales — etapaCRM update (línea 132) ya usa este patrón exacto
- Prisma `findMany` WHERE: las condiciones de flujo se agregan como `OR: [{flujo: 'CIRUGIA'}, {flujo: null}]` o como condición `AND` adicional según estructura
- `FlujoPaciente` enum importado de `@prisma/client` — mismo patrón que `EtapaCRM`

### Integration Points
- `backend/src/modules/turnos/turnos.service.ts` — modificar `crearTurno()` en dos lugares: (1) expandir selects de tipoTurno y paciente, (2) agregar bloque flujo update después del CRM auto-transition
- `backend/src/modules/pacientes/pacientes.service.ts` — modificar `getKanban()` y `getListaAccion()`
- `backend/src/modules/reportes/services/crm-dashboard.service.ts` — modificar los 5 métodos
- `backend/src/modules/reportes/services/crm-metrics.service.ts` — modificar `getCRMMetrics()`

</code_context>

<specifics>
## Specific Ideas

- El usuario enfatizó que el filtro legacy debe ser amplio (`flujo IS NULL` sin condición etapaCRM) para preservar la experiencia de profesionales que tienen pacientes activos al momento del deploy de v1.4
- El orden en `crearTurno()` importa: (1) crear turno, (2) CRM auto-transition, (3) flujo auto-update, (4) contacto log — mantener este orden

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 23-backend-logic*
*Context gathered: 2026-04-16*
