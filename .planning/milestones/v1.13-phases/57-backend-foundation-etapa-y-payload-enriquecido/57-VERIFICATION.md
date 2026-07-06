---
phase: 57-backend-foundation-etapa-y-payload-enriquecido
verified: 2026-07-04T22:40:00Z
status: passed
score: 11/11 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: null
---

# Phase 57: Backend Foundation — Etapa y Payload Enriquecido Verification Report

**Phase Goal:** El backend expone la nueva etapa "Cirugía Realizada" (implementada como el valor de enum existente PROCEDIMIENTO_REALIZADO, por decisión de CONTEXT) y enriquece `getKanban` con todos los datos que el frontend necesita para determinar indicadores, etiquetas y estado de pasos del stepper.
**Verified:** 2026-07-04T22:40:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | getKanban devuelve `pasos` con los 5 pasos (hc, presupuesto, cirugia, consentimiento, indicacionesPreop), cada uno 'completo'/'pendiente' | ✓ VERIFIED | `crm-steps.helper.ts:101-107` construye el objeto `PasosCrm` con las 5 llaves literales; spread en `pacientes.service.ts:741` dentro del `items.map`. Helper spec: 32 tests verdes. |
| 2 | getKanban devuelve `todosCompletos` (boolean) — todos los 5 pasos en 'completo' | ✓ VERIFIED | `crm-steps.helper.ts:110` `Object.values(pasos).every(v==='completo')`; devuelto y esparcido en el payload por paciente. |
| 3 | Pacientes PROCEDIMIENTO_REALIZADO ya NO caen a SIN_CLASIFICAR — columna propia | ✓ VERIFIED | `pacientes.service.ts:690` clave `PROCEDIMIENTO_REALIZADO: []` presente en `columnas`, entre CONFIRMADO y PERDIDO; agrupador `:694-701` la respeta. |
| 4 | updateEtapaCRM acepta PROCEDIMIENTO_REALIZADO como valor válido sin cambios | ✓ VERIFIED | `pacientes.service.ts:533-536` firma `dto: { etapaCRM: EtapaCRM }` acepta cualquier valor del enum; controller `:190-196` idem. Sin whitelist que excluya el valor. |
| 5 | El paso 'cirugia' deriva del modelo `Cirugia` (fecha + estado), no de Turno.esCirugia | ✓ VERIFIED | `crm-steps.helper.ts:85` `cirugias.length > 0`; select en `pacientes.service.ts:662-665` trae `cirugias { fecha, estado }`. No usa `Turno.esCirugia`. |
| 6 | Lógica de estado de pasos centralizada en función pura testeable | ✓ VERIFIED | `crm-steps.helper.ts:58` `export function computePasosCrm` sin `@Injectable`; spec dedicado con 26 casos. |
| 7 | Job diario mueve a PROCEDIMIENTO_REALIZADO por fecha de cirugía pasada, forward-only, persistido | ✓ VERIFIED | `cirugia-realizada-scheduler.service.ts:32` `@Cron(EVERY_DAY_AT_6AM)`; `findMany` `fecha < ahora` `:37-46`; gate `etapaOrden >= 6` `:62`; `prisma.paciente.update` etapaCRM `:66-69`. |
| 8 | Scheduler ignora cirugías CANCELADA/SUSPENDIDA + try/catch por-item con Logger | ✓ VERIFIED | `where estado: { notIn: ['CANCELADA','SUSPENDIDA'] }` `:40`; loop con `try/catch` + `logger.error` `:53-78`; PERDIDO skip explícito `:57`. Spec: 6/6 verdes. |
| 9 | Al crear turno el paciente SIEMPRE pasa a TURNO_AGENDADO desde cualquier etapa | ✓ VERIFIED | `turnos.service.ts:138-141` `prisma.paciente.update` a `TURNO_AGENDADO` INCONDICIONAL (sin `if` de guard); comentario `:131-133` documenta reactivación total (D-09). |
| 10 | isAutoTransitionBlocked eliminado de turnos.service.ts pero intacto en presupuestos.service.ts | ✓ VERIFIED | grep en `turnos.service.ts` → 0 resultados (ETAPA_ORDEN/etapaOrden/isAutoTransitionBlocked eliminados); `presupuestos.service.ts` → `grep -c isAutoTransitionBlocked` = 4 (guard intacto, D-10). |
| 11 | Movimiento manual vía updateEtapaCRM permanece sin guard y sin cambios | ✓ VERIFIED | `updateEtapaCRM` `:533-548` no invoca ningún guard forward-only; solo valida motivoPerdida para PERDIDO. No fue tocado por la fase. |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `backend/src/modules/pacientes/crm-steps.helper.ts` | `export function computePasosCrm` puro | ✓ VERIFIED | Exporta `computePasosCrm`, tipos `PasosCrm`/`PacientePasosInput`; sin `@Injectable`; deriva 5 pasos + todosCompletos con precedencia v1.12→legacy. |
| `backend/src/modules/pacientes/crm-steps.helper.spec.ts` | Tests de las 5 reglas + todosCompletos + robustez | ✓ VERIFIED | 26 tests pasan (parte de los 32 verdes). |
| `backend/src/modules/pacientes/pacientes.service.ts` | getKanban con select enriquecido + pasos + columna | ✓ VERIFIED | Select `:659-677`, columna `:690`, import `:34`, spread `:741`. |
| `backend/src/modules/pacientes/cirugia-realizada-scheduler.service.ts` | `@Cron` diario auto-move | ✓ VERIFIED | `@Cron` + query + forward-only gate + resiliencia por-item. |
| `backend/src/modules/pacientes/cirugia-realizada-scheduler.service.spec.ts` | Tests forward-only + exclusiones | ✓ VERIFIED | 6/6 tests verdes. |
| `backend/src/modules/pacientes/pacientes.module.ts` | Registro del scheduler | ✓ VERIFIED | Import `:6` + provider `:13`; `ScheduleModule.forRoot()` presente `:11`. |
| `backend/src/modules/turnos/turnos.service.ts` | crearTurno con auto-transición incondicional | ✓ VERIFIED | Update incondicional a TURNO_AGENDADO; guard eliminado. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| pacientes.service.ts (getKanban) | computePasosCrm | import + llamada en items.map | ✓ WIRED | Import `:34`, invocación con spread `:741-748`. |
| cirugia-realizada-scheduler | prisma.cirugia.findMany / prisma.paciente.update | sweep diario + update etapaCRM | ✓ WIRED | `:37` findMany, `:66` update. |
| pacientes.module.ts (providers) | CirugiaRealizadaSchedulerService | registro en providers array | ✓ WIRED | `:13` presente en providers. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| getKanban payload `pasos`/`todosCompletos` | `p.cirugias`, `p.historiasClinicas`, `p.presupuestos`, `p.consentimientosFirmados`, flags legacy | Prisma `findMany` select enriquecido `:659-677` | ✓ FLOWING | Todas las relaciones son selects anidados sobre `paciente` filtrado por `profesionalId`; no hay valores hardcodeados. computePasosCrm consume el shape real. |
| scheduler update | `candidatos` de `prisma.cirugia.findMany` | Query real con `fecha < ahora` + estado filter | ✓ FLOWING | Actualiza `Paciente.etapaCRM` real por `pacienteId` de cada Cirugia. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| computePasosCrm 5 reglas + todosCompletos + robustez null/undefined | `npx jest crm-steps.helper.spec` | 26 tests passing | ✓ PASS |
| Scheduler forward-only + exclusión PERDIDO/CANCELADA/SUSPENDIDA + resiliencia | `npx jest cirugia-realizada-scheduler.service.spec` | 6 tests passing | ✓ PASS |
| Guard eliminado en turnos, intacto en presupuestos | `grep isAutoTransitionBlocked` (turnos=0, presupuestos=4) | Confirmed | ✓ PASS |

### Probe Execution

No probes declared for this phase (no `scripts/*/tests/probe-*.sh`). Verification uses jest specs + grep. N/A.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| EMBUDO-02 | 57-01, 57-02 | Nueva etapa "Cirugía Realizada" después de "Confirmado" | ✓ SATISFIED | Columna `PROCEDIMIENTO_REALIZADO` en getKanban (`:690`) + scheduler que la puebla por fecha de cirugía pasada. Etapa expuesta y aceptada por updateEtapaCRM. |
| EMBUDO-05 | 57-02 | Paciente puede volver a etapa anterior sin bloqueo del guard forward-only | ✓ SATISFIED | crearTurno reactiva incondicionalmente a TURNO_AGENDADO desde cualquier etapa (`turnos.service.ts:138-141`); guard eliminado de este path, intacto en presupuestos (D-10). |

Ambos IDs declarados en PLAN frontmatter (EMBUDO-02 en 57-01/57-02, EMBUDO-05 en 57-02) mapean a Phase 57 en REQUIREMENTS.md (`:65`, `:68`). No hay IDs huérfanos: REQUIREMENTS.md asigna solo EMBUDO-02 y EMBUDO-05 a Phase 57, ambos cubiertos.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | Ninguno bloqueante | — | Sin TBD/FIXME/XXX en archivos modificados. Los `= []`/`?? []` en el helper son defaults de robustez sobrescritos por el shape real de Prisma (patrón de fallback documentado), no stubs. |

Nota advisory (no bloquea el goal): 57-REVIEW.md reportó 0 critical / 4 warnings / 2 info. Las warnings son concerns de calidad/consistencia alineados con decisiones explícitas de la fase:
- WR-01 (crearTurno "downgradea" etapas avanzadas a TURNO_AGENDADO en cualquier turno) es exactamente el comportamiento especificado por D-09/EMBUDO-05 ("reactivación total del embudo desde cualquier etapa"). Intencional.
- WR-02 (paso 'cirugia' cuenta cirugías CANCELADA/SUSPENDIDA como completas, a diferencia del scheduler) es consistente con la spec del plan (D-07: `cirugias.length > 0`, cualquier registro cuenta). Divergencia de consistencia, no del goal.
- Restantes (update no best-effort tras commit del turno; updates duplicados del scheduler para múltiples cirugías pasadas) son mejoras de robustez, no fallos del goal.

Estas warnings quedan como deuda de calidad para revisión humana opcional; no afectan la verificación del goal.

### Human Verification Required

Ninguno. Esta fase es fundación backend puramente lógica: toda la superficie es verificable por specs unitarios (32/32 verdes) y grep de cableado. No hay UI, apariencia visual, ni integración con servicio externo. Los planes no difirieron ítems `<human-check>`. El comportamiento del `@Cron` está cubierto por specs de su lógica (el disparo horario lo garantiza `ScheduleModule.forRoot()` ya presente y registrado).

### Gaps Summary

Sin gaps. Los 11 must-haves (6 de 57-01 + 5 de 57-02) están verificados en código real, con specs verdes y cableado confirmado. Los 3 Success Criteria del ROADMAP están satisfechos:
1. API expone/actualiza PROCEDIMIENTO_REALIZADO — columna en getKanban + updateEtapaCRM acepta el enum.
2. getKanban incluye por paciente cirugía/HC/presupuesto/consentimiento/indicaciones — vía computePasosCrm.
3. Retroceso sin bloqueo del guard forward-only — bypass en crearTurno, guard de presupuestos intacto, movimiento manual sin guard.

Las warnings del code review son deuda de calidad advisory, no bloquean el goal de la fase.

---

_Verified: 2026-07-04T22:40:00Z_
_Verifier: Claude (gsd-verifier)_
