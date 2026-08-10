---
phase: 63-flujo-crm-autom-tico-backend
plan: 01
subsystem: api
tags: [nestjs, prisma, crm, pacientes, kanban]

# Dependency graph
requires: []
provides:
  - "create() default etapaCRM=NUEVO_LEAD + flujo=null (incondicional, D-01/D-03)"
  - "Regresión de visibilidad: lead nuevo cae en columna NUEVO_LEAD de getKanban"
affects: [63-flujo-crm-autom-tico-backend, 64-portal-staff-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Default de campos server-side no derivados del DTO (evita tampering, T-63-01)"

key-files:
  created: []
  modified:
    - backend/src/modules/pacientes/pacientes.service.ts
    - backend/src/modules/pacientes/pacientes.service.spec.ts

key-decisions:
  - "flujo=null (no PENDIENTE del schema default) en create() para que el lead pase el filtro OR:[{flujo:CIRUGIA},{flujo:null}] de getKanban sin tocar el filtro (D-03 opción 1)"
  - "Eliminado console.log('DTO RECIBIDO', dto) — exponía PII en logs (T-63-02, tech debt de STATE.md)"
  - "Task 1 y Task 2 se commitearon juntos (mismo archivo de test, feature acoplada) en vez de dos commits separados — ver Deviations"

patterns-established:
  - "Default incondicional de etapaCRM/flujo en create() (no `dto.X ?? default` porque el DTO no declara esos campos — evita TS2339)"

requirements-completed: [EMBUDO-07]

# Metrics
duration: ~25min
completed: 2026-07-31
---

# Phase 63 Plan 01: Default NUEVO_LEAD al crear paciente Summary

**`pacientes.service.ts::create()` setea `etapaCRM=NUEVO_LEAD` y `flujo=null` de forma incondicional; el lead nuevo aparece en la columna NUEVO_LEAD del kanban en vez de "Sin clasificar".**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-31T21:07:00Z (aprox.)
- **Completed:** 2026-07-31T21:32:42Z
- **Tasks:** 2/2 completed
- **Files modified:** 2

## Accomplishments
- `create()` ahora persiste todo paciente nuevo con `etapaCRM=NUEVO_LEAD` (nunca `null`) sin depender de que el DTO transporte el campo — el `CreatePacienteDto` no lo declara, así que el default es incondicional y no manipulable por el cliente (D-01, T-63-01 accept).
- `flujo=null` (en vez del default de schema `PENDIENTE`) para que el lead pase el filtro `OR:[{flujo:CIRUGIA},{flujo:null}]` de `getKanban` sin tocar `getKanban`/`getListaAccion` (D-03 opción 1, menor blast radius).
- Eliminado `console.log('DTO RECIBIDO', dto)` que exponía PII del paciente en logs (T-63-02, ítem de deuda técnica de v1.2 en STATE.md).
- 6 tests nuevos (4 de `create()` + 2 de regresión de `getKanban`) anclando el comportamiento end-to-end: el lead cae en NUEVO_LEAD y no en SIN_CLASIFICAR, y el invariante `where.OR` de v1.13 se preserva.

## Task Commits

Ambos tasks se implementaron y verificaron juntos (ver Deviations) en un único commit atómico:

1. **Task 1 + Task 2: Default etapaCRM=NUEVO_LEAD/flujo=null en create() + regresión getKanban** - `b2d5a1a` (feat)

**Plan metadata:** (pendiente — se agrega en el commit final de este plan)

## Files Created/Modified
- `backend/src/modules/pacientes/pacientes.service.ts` - `create()` agrega `etapaCRM: EtapaCRM.NUEVO_LEAD` y `flujo: null` al `data` literal; elimina `console.log('DTO RECIBIDO', dto)`.
- `backend/src/modules/pacientes/pacientes.service.spec.ts` - agrega `create: jest.fn()` al mock compartido de `prisma.paciente`; import de `EtapaCRM`/`EstadoPaciente`/`CreatePacienteDto`; describe `create() — default etapaCRM=NUEVO_LEAD + flujo=null (D-01/D-03)` (4 tests A-D) y describe `getKanban — lead nuevo (etapaCRM=NUEVO_LEAD, flujo=null) es visible` (2 tests de regresión).

## Decisions Made
- **D-01/D-03 aplicados tal cual el plan:** default incondicional server-side, sin backfill de históricos (D-02, fuera de alcance por diseño — no se tocó ningún paciente existente).
- **flujo=null vs. ampliar el filtro de getKanban:** se eligió setear `flujo=null` en `create()` en vez de agregar `PENDIENTE` al `OR` de `getKanban`, siguiendo PATTERNS.md opción 1 — evita que pacientes `PENDIENTE` históricos (no-leads) aparezcan de golpe en el board.
- **Eliminación del console.log PII:** aplicado como parte de Rule 2 (mitigación del threat register T-63-02), no rompió ningún test existente.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical / Threat Mitigation] Eliminado console.log('DTO RECIBIDO', dto) que exponía PII**
- **Found during:** Task 1 (lectura de `create()` antes de editar)
- **Issue:** El threat register del plan (T-63-02) marca este log como `mitigate` — expone datos personales del paciente en logs de servidor.
- **Fix:** Removida la línea `console.log('DTO RECIBIDO:', dto);` al inicio de `create()`. El `console.log('ERROR CAPTURADO EN CATCH:', error)` del catch no fue tocado (fuera de alcance del threat T-63-02, no expone PII del paciente sino el objeto error).
- **Files modified:** `backend/src/modules/pacientes/pacientes.service.ts`
- **Verification:** Suite completa de `pacientes.service.spec.ts` sigue en verde (19/19).
- **Committed in:** `b2d5a1a` (Task 1 commit)

**Nota de proceso (no es un auto-fix de código):** Task 1 y Task 2 del plan están declarados como dos tasks separados (Task 2 solo toca el spec file, es test-only sobre el mismo `describe` block). Al implementar el spec, ambos conjuntos de tests (A-D de Task 1 + regresión de Task 2) se escribieron y verificaron en la misma edición del archivo `pacientes.service.spec.ts`, por lo que se commitearon juntos en `b2d5a1a` en vez de en dos commits separados. No hay impacto funcional — ambos conjuntos de tests están presentes, verdes, y cubren exactamente lo que sus acceptance criteria piden. Se documenta para transparencia del historial de commits atómicos por task.

---

**Total deviations:** 1 auto-fixed (Rule 2 - threat mitigation) + 1 nota de proceso (combinación de commits Task 1/2)
**Impact on plan:** El auto-fix es una mitigación de seguridad ya prevista en el threat model del propio plan (T-63-02, disposition=mitigate). Sin scope creep — ningún cambio fuera de `create()` y su spec.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- EMBUDO-07 completado: todo paciente nuevo entra al kanban en NUEVO_LEAD automáticamente.
- Sin bloqueos para 63-02 (EMBUDO-08, agendar cirugía → CONFIRMADO) ni 63-03 (EMBUDO-09) — ambos son independientes de este cambio salvo que reutilizan `etapaCRM`/`flujo` del mismo modelo `Paciente`.
- `getKanban`/`getListaAccion` no fueron modificados — su filtro `OR:[{flujo:CIRUGIA},{flujo:null}]` queda intacto y verificado por test de regresión.

---
*Phase: 63-flujo-crm-autom-tico-backend*
*Completed: 2026-07-31*

## Self-Check: PASSED

- FOUND: backend/src/modules/pacientes/pacientes.service.ts
- FOUND: backend/src/modules/pacientes/pacientes.service.spec.ts
- FOUND: .planning/phases/63-flujo-crm-autom-tico-backend/63-01-SUMMARY.md
- FOUND commit: b2d5a1a
