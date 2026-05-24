# Phase 35: Backend Foundation - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

El backend permite mover un paciente a cualquier etapa CRM manualmente (PATCH /etapa-crm) sin validaciones de negocio que lo bloqueen, excepto la integridad de datos de PERDIDO (motivoPerdida requerida). Las auto-transiciones del sistema (enviar/aceptar/rechazar presupuesto, crear turno) no sobreescriben etapas más avanzadas que ya tenga el paciente. El endpoint GET /kanban expone el campo `flujo` en cada paciente.

</domain>

<decisions>
## Implementation Decisions

### Validación en PATCH manual (updateEtapaCRM)
- Eliminar la validación que bloquea mover a CONFIRMADO si el paciente no tiene presupuesto ACEPTADO (lines 519-528 en pacientes.service.ts)
- Mantener la validación de `motivoPerdida` requerida al mover a PERDIDO — no es una restricción de negocio, es integridad de datos para analytics
- Los auto-contact logs del `etapaNotaMap` (NUEVO_LEAD, CONSULTADO, PRESUPUESTO_ENVIADO) se mantienen también para moves manuales — el historial de contactos debe estar completo independientemente del origen del cambio

### Forward-only guard en auto-transiciones
Ordenamiento de etapas (de menor a mayor avance):
`SIN_CLASIFICAR < NUEVO_LEAD < TURNO_AGENDADO < CONSULTADO < PRESUPUESTO_ENVIADO < CONFIRMADO < PROCEDIMIENTO_REALIZADO`
(PERDIDO es especial — no está en la cadena forward-only)

Guard aplicado a:
- `presupuestos.service.ts:marcarEnviado` → no sobreescribir si ya está en CONFIRMADO o PROCEDIMIENTO_REALIZADO
- `presupuestos.service.ts:aceptar` (admin) + `aceptarByToken` (token) → no sobreescribir si ya está en PROCEDIMIENTO_REALIZADO
- `presupuestos.service.ts:rechazarByToken` → no mover a PERDIDO si el paciente ya está en CONFIRMADO o PROCEDIMIENTO_REALIZADO
- `turnos.service.ts` → no sobreescribir con TURNO_AGENDADO si ya está en PRESUPUESTO_ENVIADO, CONFIRMADO o PROCEDIMIENTO_REALIZADO

Implementación del guard (estructura interna): Claude's Discretion

### GET /kanban — campo flujo
- Agregar `flujo: true` al `select` de la query de `getKanban`
- Agregar `flujo: p.flujo` en el response mapping de cada paciente
- Sin cambios en el WHERE filter (sigue devolviendo solo CIRUGIA + null legacy)

### Claude's Discretion
- Estructura interna del guard: inline vs función centralizada `isForwardMove(actual, nueva)`
- Si el guard bloquea una auto-transición, el update del presupuesto igual ocurre (solo se skippea el update de etapaCRM del paciente)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pacientes.service.ts:updateEtapaCRM` (línea 503) — método a modificar: eliminar validación CONFIRMADO (519-528), mantener motivoPerdida, mantener auto-logs
- `presupuestos.service.ts:marcarEnviado` (línea 200) — agregar guard antes del `$transaction` que actualiza etapaCRM
- `presupuestos.service.ts:aceptar` (línea ~130) — agregar guard antes del `$transaction`
- `presupuestos.service.ts:aceptarByToken` (línea ~545) — agregar guard antes del `$transaction`
- `presupuestos.service.ts:rechazarByToken` (línea 610) — agregar guard antes del `$transaction`
- `turnos.service.ts:132` — auto-transición a TURNO_AGENDADO al crear turno, agregar guard
- `getKanban` en `pacientes.service.ts` (línea 603) — `select` necesita `flujo: true`; response mapping línea ~667 necesita `flujo: p.flujo`

### Established Patterns
- `$transaction` para operaciones atómicas — los guards deben leerse el `etapaCRM` actual ANTES del transaction para no añadir latencia adentro
- `EtapaCRM` enum ya importado en todos los services relevantes
- El update del estado del presupuesto (ENVIADO/ACEPTADO) SIEMPRE ocurre; el guard solo afecta el update de `etapaCRM` del paciente

### Integration Points
- `pacientes.controller.ts:178` — PATCH /pacientes/:id/etapa-crm llama a `updateEtapaCRM`; no requiere cambios en el controller
- `getKanban` en `pacientes.controller.ts:60` — GET /kanban; no requiere cambios en el controller, solo en el service

</code_context>

<specifics>
## Specific Ideas

- Al testear el guard: crear un turno para un paciente en CONFIRMADO y verificar que su etapaCRM no cambia a TURNO_AGENDADO
- El `rechazarByToken` guard evita el caso real donde un profesional mueve al paciente a CONFIRMADO manualmente y luego el paciente hace click en un link viejo de rechazo — el presupuesto queda RECHAZADO pero la etapa CRM no retrocede a PERDIDO

</specifics>

<deferred>
## Deferred Ideas

None — la discusión se mantuvo dentro del scope de Phase 35.

</deferred>

---

*Phase: 35-backend-foundation*
*Context gathered: 2026-05-24*
