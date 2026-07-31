# Phase 63: Flujo CRM Automático (Backend) - Context

**Gathered:** 2026-07-31
**Status:** Ready for planning

<domain>
## Phase Boundary

El estado del embudo CRM (`Paciente.etapaCRM` / `Paciente.flujo`) refleja automáticamente el estado real del paciente en tres puntos del flujo, sin que la secretaria clasifique manualmente:

1. **EMBUDO-07** — Crear paciente → entra al kanban en `NUEVO_LEAD` (no "Sin clasificar").
2. **EMBUDO-08** — Agendar turno de cirugía → `CONFIRMADO`, aunque no haya presupuesto aceptado.
3. **EMBUDO-09** — Cargar entrada HC "Tratamiento en consultorio" → `flujo=TRATAMIENTO`, sale del board (patrón v1.13) y queda en la planilla de tratamientos con la fecha de la entrada.

Backend puro. La visualización en la card (badges/pendientes) es Phase 64.
</domain>

<decisions>
## Implementation Decisions

### EMBUDO-07 — Nuevo lead al crear paciente
- **D-01:** En `pacientes.service.ts::create()`, setear `etapaCRM = NUEVO_LEAD` por default cuando el DTO **no** trae `etapaCRM` explícita (respetar override si viniera desde import/otro flujo). Hoy no se setea nada → queda `null` ("Sin clasificar").
- **D-02:** Aplica solo a pacientes creados desde ahora. **Sin backfill** de históricos (ya excluido en REQUIREMENTS.md → Out of Scope).
- **D-03 (concern a resolver por research):** Un lead nuevo tomaría `flujo=PENDIENTE` (default del schema), pero `getKanban` filtra `flujo ∈ {CIRUGIA, null}` → un `PENDIENTE` **no aparecería en el board**. La implementación debe garantizar visibilidad del `NUEVO_LEAD` (ajustar el flujo default del lead a `null`, o incluir `PENDIENTE` en el filtro del board). Es la clave para que el Success Criterion #1 sea verdadero.

### EMBUDO-08 — Confirmado al agendar cirugía
- **D-04:** Al agendar un turno de cirugía (`crearTurnoCirugia`, `TipoTurno.esCirugia = true`) → `etapaCRM = CONFIRMADO`, sin depender de presupuesto aceptado.
- **D-05 (guard de degradación):** Un turno nuevo **NO** degrada una etapa avanzada (`CONFIRMADO` / `PROCEDIMIENTO_REALIZADO`) a `TURNO_AGENDADO`, **excepto** cuando el turno es de tipo **"Consulta"** (`tipoTurno.nombre === 'Consulta'`), que **sí** reinicia el ciclo → `TURNO_AGENDADO`. Fundamento del usuario: un mismo paciente recorre el embudo tantas veces como cirugías se haga; una nueva Consulta = nuevo ciclo. Esto acota el comportamiento actual (hoy `crearTurno` degrada a `TURNO_AGENDADO` en cualquier turno, líneas ~131-141).
- **D-06 (detección de "Consulta"):** Se identifica por `TipoTurno.nombre === 'Consulta'` (el nombre es `@unique`; no existe flag `esConsulta`).
- **D-07 (cirugía cancelada/suspendida):** Al cancelar/suspender un turno de cirugía, el paciente **mantiene `CONFIRMADO`** (el presupuesto fue confirmado — no se degrada solo). En cambio se disparan señales de recontacto:
  - `temperatura = CALIENTE`.
  - El paciente debe **aparecer en la lista de acción** (`getListaAccion`) con el pendiente "Cirugía cancelada, recontactar". Hoy `getListaAccion` excluye `etapaCRM IN (CONFIRMADO, PERDIDO)` (línea 888) → requiere una **excepción/flag** para surfacear este caso (mecanismo a definir por research: p.ej. flag `requiereRecontacto`, o derivar de "tiene cirugía CANCELADA/SUSPENDIDA sin cirugía futura").
  - Luego la secretaria decide **manualmente**: nueva fecha, marcar `PERDIDO`, o sacarlo del embudo.
  - El **texto del badge en la card** ("Cirugía cancelada, recontactar") es display → **handoff a Phase 64**. Backend solo expone el estado.

### EMBUDO-09 — Tratamiento en consultorio → sale del board + planilla
- **D-08 (disparo):** Se dispara cuando **alguna entrada HC del turno** tiene `dto.tipo === 'tratamiento_en_consultorio'` (equivale a `tipoEntrada = TRATAMIENTO`). El wizard de LiveTurno crea **entradas separadas** — "junto a Primera vez" = dos entradas independientes en el mismo turno, no una entrada combinada.
- **D-09 (condición de movimiento):** Mover a `flujo = TRATAMIENTO` **solo si el paciente estaba `flujo = PENDIENTE`** (comportamiento actual de `resolverNuevoFlujo`). Un candidato quirúrgico (`flujo = CIRUGIA`) que recibe un tratamiento en consultorio **se queda en el board** (sigue siendo candidato).
- **D-10 (salida + planilla):** Al pasar a `flujo = TRATAMIENTO`, el paciente se oculta del board (patrón v1.13 — `getKanban` ya filtra `flujo ∈ {CIRUGIA, null}`) y queda en la planilla de tratamientos con la **fecha de la entrada** (`HistoriaClinicaEntrada.fecha`, ya soporta fecha retroactiva). `etapaCRM` se limpia a `null` (patrón actual de `updateFlujo`).

### Claude's Discretion
- Dónde vive la lógica de transición (reutilizar helpers existentes: `crm-steps.helper.ts`, `historia-clinica.flujo.helpers.ts`, o extraer uno nuevo).
- Estructura concreta del mecanismo de "requiere recontacto" (flag persistido vs. derivado por query).
- Orden de escritura de `etapaCRM`/`flujo`/`temperatura` dentro de las transacciones existentes.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos y roadmap
- `.planning/ROADMAP.md` § "Phase 63" — Goal, Success Criteria (3), Depends on: nada.
- `.planning/REQUIREMENTS.md` — EMBUDO-07/08/09 (líneas 13-15), Out of Scope (líneas 57-61: sin nueva etapa/columna, sin migración de enum, sin backfill).
- `.planning/PROJECT.md` § Core Value — "que el cirujano cierre más cirugías; embudo automático".

### Patrón v1.13 (ocultar del board)
- `.planning/milestones/v1.13-ROADMAP.md` — patrón `flujo=TRATAMIENTO` + ocultar del board (referenciado por EMBUDO-09; no reintroducir enum/columna nueva).

### Código a modificar / respetar
- `backend/src/modules/pacientes/pacientes.service.ts` — `create()` (líneas 53-78, EMBUDO-07); `getKanban()` (líneas 620-759, filtro `flujo ∈ {CIRUGIA,null}`); `getListaAccion()` (líneas ~880-894, excluye CONFIRMADO); `updateFlujo()` (líneas 1029-1039, setea `etapaCRM=null`).
- `backend/src/modules/turnos/turnos.service.ts` — `crearTurno()` (líneas 36-158, degradación a `TURNO_AGENDADO` en ~131-141); `crearTurnoCirugia()` (líneas 661+, `esCirugia=true`); `cancelarTurno()` (línea 215, hook de cancelación); `cerrarSesion()` (~862-898, transición a `PROCEDIMIENTO_REALIZADO`).
- `backend/src/modules/pacientes/crm-steps.helper.ts` — línea 92 `cirugiaCompleto` ignora `estado` (bug conocido; ver Deferred).
- `backend/src/modules/historia-clinica/historia-clinica.service.ts` — `crearEntrada()` (líneas 79-361); discriminadores `dto.tipo` (línea ~96) y `tipoEntrada` (~248); snapshot de tratamientos → planilla (línea ~183-201, comentario línea 199).
- `backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts` — `resolverNuevoFlujo()` (líneas 17-31, `TRATAMIENTO+PENDIENTE→TRATAMIENTO`).
- `backend/src/prisma/schema.prisma` — `EtapaCRM` (1167-1175, incluye `CONFIRMADO`), `FlujoPaciente` (1193-1197), `TipoEntradaHC` (1199-1205), `TemperaturaPaciente` (1177-1181, `CALIENTE`), `TipoTurno` (792-803, `nombre @unique`, `esCirugia`, `flujoPaciente`), `Paciente` (152-232: `etapaCRM`, `flujo @default(PENDIENTE)`, `temperatura`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `resolverNuevoFlujo()` (historia-clinica.flujo.helpers.ts): ya mapea `TRATAMIENTO+PENDIENTE→TRATAMIENTO`; EMBUDO-09 se apoya en él con la condición D-09 tal cual.
- `getKanban()` ya excluye `flujo=TRATAMIENTO` (patrón v1.13): la salida del board no requiere código nuevo, solo setear el flujo.
- `crearTurnoCirugia()` ya distingue cirugía vía `TipoTurno.esCirugia`: punto de enganche para D-04 (CONFIRMADO).
- Planilla: `contenido.tratamientos` + `entrada.fecha` ya se persisten en `crearEntrada` — la fecha del tratamiento (D-10) sale de ahí, sin cambios de schema.

### Established Patterns
- Transiciones CRM ya distribuidas en services (turnos: `TURNO_AGENDADO`/`PROCEDIMIENTO_REALIZADO`/`CONSULTADO`; HC: flujo). Seguir el mismo estilo inline con guards, no introducir event bus.
- `EtapaCRM.CONFIRMADO` YA existe — no hay migración de enum (Out of Scope explícito).

### Integration Points
- `pacientes.service.create()` → default `NUEVO_LEAD` (EMBUDO-07).
- `turnos.service.crearTurno()` → guard de degradación selectivo por `tipoTurno.nombre==='Consulta'` (D-05/D-06).
- `turnos.service.crearTurnoCirugia()` → set `CONFIRMADO` (D-04).
- `turnos.service.cancelarTurno()` (+ suspensión) → mantener `CONFIRMADO`, `temperatura=CALIENTE`, marcar recontacto (D-07).
- `getListaAccion()` → excepción para el caso "cirugía cancelada + CONFIRMADO" (D-07).
- `historia-clinica.service.crearEntrada()` → disparo D-08/D-09 vía `resolverNuevoFlujo`.

</code_context>

<specifics>
## Specific Ideas

- El embudo es **cíclico**: un mismo paciente puede recorrerlo tantas veces como cirugías tenga. Un turno "Consulta" marca el inicio de un ciclo nuevo (reinicia a `TURNO_AGENDADO`); el resto de los turnos no degradan etapas avanzadas.
- La cancelación de cirugía **no** es una "pérdida" automática: el paciente sigue `CONFIRMADO` + caliente + a recontactar; la decisión de perderlo es humana.

</specifics>

<deferred>
## Deferred Ideas

- **Badge "Cirugía cancelada, recontactar" en la card** → Phase 64 (frontend, display de pendientes por etapa). Backend expone el estado en Phase 63; el render es de Phase 64.
- **Fix `crm-steps.helper.ts` línea 92** (`cirugiaCompleto` ignora `CANCELADA`/`SUSPENDIDA`): al decidir D-07 (mantener `CONFIRMADO`, sin recalcular etapa) este fix deja de ser necesario para Phase 63. Queda como tech debt existente (ya listado en STATE.md), no se folda a esta fase salvo que research encuentre que rompe la señal de recontacto.
- **Vista/endpoint dedicado de planilla server-side**: hoy la planilla se deriva client-side de las entradas HC. No se agrega en Phase 63 (fuera de scope; TRAT-07 es Phase 64).

</deferred>

---

*Phase: 63-Flujo CRM Automático (Backend)*
*Context gathered: 2026-07-31*
