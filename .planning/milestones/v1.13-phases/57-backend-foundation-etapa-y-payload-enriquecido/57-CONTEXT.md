# Phase 57: Backend Foundation — Etapa y Payload Enriquecido - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

El backend expone la etapa "Cirugía Realizada" y enriquece `getKanban` con todos los datos
que el frontend necesita para determinar indicadores, etiquetas y estado de pasos del stepper
(fases 58 y 59). Además relaja el guard forward-only para que un nuevo turno pueda reactivar
el embudo.

**Cubre:** EMBUDO-02 (nueva etapa después de Confirmado), EMBUDO-05 (retroceso por nuevo turno).

**Fuera de esta fase:** todo lo visual/board (fase 58), el cableado del stepper y quick-actions
(fase 59), y los conteos de estadísticas sobre registros reales (fase 60). Esta fase solo
provee los cimientos de datos + reglas de transición.
</domain>

<decisions>
## Implementation Decisions

### Etapa "Cirugía Realizada"
- **D-01:** NO renombrar el enum. Reusar el valor existente `EtapaCRM.PROCEDIMIENTO_REALIZADO`
  (orden 6 en `ETAPA_ORDEN`, ya después de CONFIRMADO). El label "Cirugía Realizada" es solo
  presentación del frontend (fase 58). Cero migración de enum, cero riesgo en guard/stats/portal/DTOs.
  El roadmap lo permite explícitamente ('"CIRUGIA_REALIZADA" (o "PROCEDIMIENTO_REALIZADO" renombrado)').
- **D-02:** El endpoint `updateEtapaCRM` ya acepta `PROCEDIMIENTO_REALIZADO` como valor válido
  (acepta cualquier `EtapaCRM`). El profesional puede mover manualmente a esta etapa.
- **D-03:** Auto-move a `PROCEDIMIENTO_REALIZADO` cuando **pasó la fecha de la cirugía**.
  Mecanismo: **job programado diario** (cron / BullMQ — ya hay Redis+BullMQ desde v1.0) que
  mueve a los pacientes cuyo registro `Cirugia` tiene fecha ya pasada. Estado **persistido** en
  DB (no computado on-read) para mantener consistencia con stats/dashboard/kanban. Esta
  auto-transición es forward (orden 6 desde etapas menores) → el guard la permite sin cambios.

### Payload de getKanban (estado computado)
- **D-04:** El backend devuelve por paciente el **estado computado de cada paso** del stepper,
  no flags crudos. Frontend solo pinta verde/naranja. Lógica de negocio centralizada y testeable.
- **D-05:** Los **5 pasos canónicos** que el backend evalúa (según EMBUDO-04 literal):
  1. **HC** — entrada de HC de consulta relevante existe
  2. **Presupuesto** — enviado o aceptado
  3. **Turno de cirugía** — existe registro `Cirugia` con fecha
  4. **Consentimiento** — firmado (data de v1.12 portal/consent)
  5. **Indicaciones preop** — cargadas (data de v1.12)
  Cada paso: `'completo' | 'pendiente'`. Incluir un flag derivado `todosCompletos` (los 5 en
  verde) que el frontend usa para **ocultar** al paciente del board (EMBUDO-04).
- **D-06:** El payload enriquecido se agrega dentro del `getKanban` existente
  (`pacientes.service.ts:619`), extendiendo el `select` y el map de salida por paciente.

### Detección del turno de cirugía
- **D-07:** Fuente de verdad = **modelo `Cirugia`** (tiene `fecha` + `estado EstadoCirugia`
  PROGRAMADA/etc.), no `Turno.esCirugia`. Es la fuente semántica de "cirugía programada/realizada",
  alimenta el auto-move por fecha pasada (D-03) y encaja con las stats reales de la fase 60.

### Guard forward-only
- **D-08:** El `updateEtapaCRM` **manual** ya NO tiene guard — el movimiento manual hacia atrás
  ya funciona. No tocar eso.
- **D-09:** **Bypass del guard en la creación de turno** (`turnos.service.ts:~162`): la
  auto-transición a `TURNO_AGENDADO` deja de pasar por `isAutoTransitionBlocked`. Un nuevo turno
  **siempre** mueve a `TURNO_AGENDADO`, reactivando el embudo desde cualquier etapa — **incluidas
  PERDIDO y PROCEDIMIENTO_REALIZADO** (reactivación completa; ej. segunda cirugía o re-engagement
  de un lead perdido).
- **D-10:** El guard `isAutoTransitionBlocked` sigue aplicando en las **otras** auto-transiciones
  (presupuestos: enviado/aceptado/rechazado). Solo se relaja la ruta de creación de turno.
  Las stats de cirugía (fase 60) no se afectan por reactivaciones porque se basan en registros
  reales (`Cirugia`/HC), no en la etapa CRM.

### Claude's Discretion
- Forma exacta del objeto de estado de pasos (nombres de keys, enum de estado) — el planner la
  fija respetando convenciones del repo, siempre que exprese los 5 pasos de D-05 + `todosCompletos`.
- Nota de duplicación técnica: `isAutoTransitionBlocked` / `ETAPA_ORDEN` están **duplicados** en
  `turnos.service.ts` y `presupuestos.service.ts`. El planner puede consolidarlos en un helper
  compartido al tocar el guard, si no agrega riesgo.
- Definición precisa de "entrada de HC relevante", "consentimiento firmado" e "indicaciones preop":
  el investigador confirma las fuentes de datos exactas de v1.12 (portal/consent) antes de planificar.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos y roadmap
- `.planning/REQUIREMENTS.md` — EMBUDO-02 y EMBUDO-05 (requisitos de esta fase); EMBUDO-03/04,
  CONTACTO-01/02, STEPPER-*, STATS-* como consumidores downstream del payload
- `.planning/ROADMAP.md` §"Phase 57" — Goal y Success Criteria (3)

### Código backend a tocar
- `backend/src/modules/pacientes/pacientes.service.ts:619` — `getKanban` (extender select + payload)
- `backend/src/modules/pacientes/pacientes.service.ts:532` — `updateEtapaCRM` (ya sin guard; acepta enum)
- `backend/src/modules/turnos/turnos.service.ts:27-50` — `ETAPA_ORDEN`, `etapaOrden`,
  `isAutoTransitionBlocked` (guard a relajar en creación de turno, ~línea 162)
- `backend/src/modules/presupuestos/presupuestos.service.ts` — copia del guard; el guard SIGUE
  aplicando acá (no tocar la lógica de bloqueo, solo consolidar si se decide)
- `backend/src/prisma/schema.prisma:1166` — enum `EtapaCRM` (`PROCEDIMIENTO_REALIZADO` reusado)
- `backend/src/prisma/schema.prisma:855` — modelo `Cirugia` (`fecha` + `estado EstadoCirugia`),
  fuente del turno de cirugía y del auto-move

### Mapas de codebase
- `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/INTEGRATIONS.md` — infra async
  (BullMQ/Redis) para el job diario del auto-move

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getKanban` (`pacientes.service.ts:619`): ya trae `presupuestos`, `turnos` (último), `contactos`,
  `autorizaciones`. Se extiende — no se reescribe.
- `isAutoTransitionBlocked` + `ETAPA_ORDEN`: la infraestructura del guard ya existe; solo se
  bypassa en la ruta de turno.
- Infra BullMQ/Redis (desde v1.0, Phase 1 "Infraestructura Async") disponible para el job diario.
- Modelo `Cirugia` con `estado EstadoCirugia` y `fecha` — fuente lista para detección y auto-move.

### Established Patterns
- `ETAPA_ORDEN` es la fuente de verdad del orden CRM (NO derivar del enum Prisma, que está
  desordenado — ver comentario en `turnos.service.ts:27-29`). `PROCEDIMIENTO_REALIZADO` = orden 6.
- Auto-transiciones CRM viven en los services de dominio (turnos, presupuestos) y usan el guard
  compartido conceptualmente (hoy duplicado).
- `getKanban` agrupa por `etapaCRM`; hoy `PROCEDIMIENTO_REALIZADO` cae a `SIN_CLASIFICAR` porque
  no está en `columnas` — habrá que agregar su columna al agrupador (o dejar que fase 58 lo maneje;
  el backend debe al menos NO ocultarlo del payload).

### Integration Points
- Job diario nuevo → lee `Cirugia` con fecha pasada → update `paciente.etapaCRM = PROCEDIMIENTO_REALIZADO`.
- `getKanban` → nuevo bloque de estado de pasos por paciente (consume Cirugia, HC, presupuesto,
  consentimiento, preop).
- `turnos.service` creación de turno → bypass del guard hacia `TURNO_AGENDADO`.

</code_context>

<specifics>
## Specific Ideas

- El auto-move se dispara por **fecha de cirugía pasada** (no por "turno completado" manual),
  con job **diario**, y coexiste con el movimiento manual del profesional.
- Reactivación total: un nuevo turno reabre el seguimiento incluso desde PERDIDO / CIRUGIA_REALIZADA.
- "Cirugía Realizada" es puramente un label de UI sobre `PROCEDIMIENTO_REALIZADO`.

</specifics>

<deferred>
## Deferred Ideas

- Renombrado real del enum a `CIRUGIA_REALIZADA` — descartado por riesgo/costo de migración;
  el label de UI resuelve la necesidad. Reconsiderar solo si aparece una razón semántica fuerte.
- Consolidar el guard duplicado (`turnos` / `presupuestos`) en un único helper compartido —
  oportunista, a discreción del planner; no es objetivo de la fase.
- Reordenar/mostrar la columna en el board, indicadores naranja, etiquetas de contacto → **fase 58**.
- Cablear el stepper y quick-actions al payload de estado de pasos → **fase 59**.
- Conteos de stats sobre registros reales → **fase 60**.

</deferred>

---

*Phase: 57-Backend Foundation — Etapa y Payload Enriquecido*
*Context gathered: 2026-07-03*
