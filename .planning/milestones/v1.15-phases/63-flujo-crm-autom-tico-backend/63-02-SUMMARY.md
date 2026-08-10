---
phase: 63-flujo-crm-autom-tico-backend
plan: 02
subsystem: api
tags: [nestjs, prisma, crm, turnos, pacientes, cirugia]

# Dependency graph
requires: ["63-01"]
provides:
  - "crearTurnoCirugia confirma al paciente (etapaCRM=CONFIRMADO) dentro de la misma $transaction, sin depender de presupuesto"
  - "crearTurno respeta etapas avanzadas (CONFIRMADO/PROCEDIMIENTO_REALIZADO) salvo turno tipo Consulta (D-06, nuevo ciclo)"
  - "cancelarTurno mantiene CONFIRMADO + marca CALIENTE + cirugia CANCELADA en turnos de cirugia (D-07)"
  - "getListaAccion expone requiereRecontacto derivado (schema-free) para pacientes CONFIRMADO con cirugia cancelada sin reprogramar"
affects: [63-flujo-crm-autom-tico-backend, 64-portal-staff-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guard selectivo de degradación de etapaCRM (esConsulta || !etapaAvanzada) en vez de forward-only genérico"
    - "$transaction array-form (no callback) para cancelarTurno — cada operación ya es una PrismaPromise construida contra this.prisma"
    - "Flag derivado en el .map() de una query (requiereRecontacto) en vez de persistir estado — evita migración de schema"

key-files:
  created: []
  modified:
    - backend/src/modules/turnos/turnos.service.ts
    - backend/src/modules/turnos/turnos.service.spec.ts
    - backend/src/modules/pacientes/pacientes.service.ts
    - backend/src/modules/pacientes/pacientes.service.spec.ts
    - backend/package.json

key-decisions:
  - "D-04/D-05/D-06/D-07 implementados tal cual el plan y el CONTEXT.md de la fase — sin desviaciones de diseño"
  - "cancelarTurno usa $transaction(array) en vez de $transaction(callback) porque el plan lo especifica explícitamente para este método (a diferencia de crearTurnoCirugia, que sigue usando callback+tx)"
  - "requiereRecontacto se computa en el .map() de getListaAccion a partir de p.cirugias (incluido en el include), replicando exactamente la condición del where — no se persiste ningún campo nuevo"
  - "[Rule 3] jest moduleNameMapper no resolvía el alias @/src/* (usado por turnos.service.ts::getDayRange) — bloqueaba CUALQUIER spec de ese módulo, incluido el nuevo turnos.service.spec.ts requerido por este plan"

requirements-completed: [EMBUDO-08]

# Metrics
duration: ~35min
completed: 2026-07-31
---

# Phase 63 Plan 02: Confirmado al agendar cirugía (EMBUDO-08) Summary

**El embudo CRM ahora refleja el ciclo quirúrgico automáticamente: agendar cirugía confirma al paciente sin presupuesto, un turno nuevo no rompe una etapa avanzada salvo que sea Consulta, y cancelar la cirugía deja al paciente confirmado + caliente + visible en la lista de acción para recontacto.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3/3 completed
- **Files modified:** 5 (incluye 1 fix de infraestructura de test)

## Accomplishments

- `crearTurnoCirugia()` confirma al paciente (`etapaCRM = CONFIRMADO`) dentro de la misma `$transaction` que crea la cirugía y el turno — atómico, sin depender de que exista un presupuesto aceptado (D-04). Se agregó un `contactoLog` de auditoría en paridad con el patrón de `cerrarSesion()`.
- `crearTurno()` dejó de degradar incondicionalmente a `TURNO_AGENDADO`: ahora un guard selectivo (`esConsulta || !etapaAvanzada`) protege `CONFIRMADO`/`PROCEDIMIENTO_REALIZADO` de cualquier turno nuevo — **excepto** cuando el turno es de tipo `Consulta` (`tipoTurno.nombre === 'Consulta'`), que reinicia el ciclo del embudo a propósito (D-05/D-06). `PERDIDO`/`CONSULTADO`/etc. siguen reactivando siempre, sin cambios.
- `cancelarTurno()` distingue turnos de cirugía: cuando `esCirugia=true`, cancela el turno, marca la cirugía asociada `CANCELADA`, sube `temperatura=CALIENTE` y registra un `contactoLog` — todo en una `$transaction` array-form — **sin tocar `etapaCRM`** (el paciente sigue `CONFIRMADO`, la decisión de perderlo es humana, D-07). Turnos no-cirugía mantienen el comportamiento simple previo.
- `getListaAccion()` gana una rama `OR` de recontacto: pacientes `CONFIRMADO` con al menos una cirugía `CANCELADA`/`SUSPENDIDA` y sin ninguna cirugía `PROGRAMADA` futura vuelven a aparecer en la lista, con un campo `requiereRecontacto: boolean` **derivado** (no persistido — sin migración de schema, respetando Out of Scope). Si la cirugía se reprograma (nueva `PROGRAMADA` futura), el paciente sale de la lista automáticamente.
- 14 tests nuevos en `turnos.service.spec.ts` (archivo nuevo, no existía) + 4 tests nuevos en `pacientes.service.spec.ts`, todos en verde. `tsc --noEmit` sin errores.

## Task Commits

1. **Task 1: crearTurnoCirugia → CONFIRMADO (D-04)** - `79445e1` (feat) — incluye el fix de infraestructura de test (Rule 3, ver Deviations)
2. **Task 2: Guard selectivo de degradación en crearTurno (D-05/D-06)** - `7f2e520` (feat)
3. **Task 3: cancelarTurno mantiene CONFIRMADO + recontacto surfacing (D-07)** - `a491383` (feat)

**Plan metadata:** commit final de documentación (este SUMMARY + STATE + ROADMAP) — ver commit tras este archivo.

## Files Created/Modified

- `backend/src/modules/turnos/turnos.service.ts` — `crearTurnoCirugia()` agrega `tx.paciente.update(etapaCRM=CONFIRMADO)` + `tx.contactoLog.create` dentro de la tx existente (D-04); `crearTurno()` amplía el select de `tipoTurno` con `nombre:true` y reemplaza la degradación incondicional por el guard `esConsulta || !etapaAvanzada` (D-05/D-06); `cancelarTurno()` amplía el select a `{esCirugia, cirugiaId, pacienteId, profesionalId}` y, cuando `esCirugia`, envuelve las 3-4 escrituras (turno, cirugía opcional, paciente, contactoLog) en `$transaction([...])` array-form (D-07).
- `backend/src/modules/turnos/turnos.service.spec.ts` — **archivo nuevo**. TestingModule + mock de `PrismaService` (incluye `$transaction` que soporta ambas formas: callback y array) + `CuentasCorrientesService` vacío. 10 tests: 3 de `crearTurnoCirugia` (D-04), 5 de `crearTurno` guard (D-05/D-06, Test A-E), 2 de `cancelarTurno` (D-07, Test A-B).
- `backend/src/modules/pacientes/pacientes.service.ts` — importa `EstadoCirugia`; `getListaAccion()` reestructura el `where` a `OR` de dos ramas (normal + recontacto), agrega `cirugias` al `include`, y computa `requiereRecontacto` en el `.map()` de resultados.
- `backend/src/modules/pacientes/pacientes.service.spec.ts` — agrega `contactoLog.count` al mock compartido de Prisma (requerido por `getListaAccion`); 4 tests nuevos (Test C/D/E de recontacto + invariante del `where`).
- `backend/package.json` — `jest.moduleNameMapper` gana la entrada `"^@/src/(.*)$": "<rootDir>/$1"` (ver Deviations, Rule 3).

## Decisions Made

- **D-04/D-05/D-06/D-07 aplicados tal cual el CONTEXT.md y PATTERNS.md de la fase** — sin desviaciones de diseño respecto a lo decidido en la etapa de planning.
- **`$transaction` array-form en `cancelarTurno` vs. callback-form en `crearTurnoCirugia`:** el plan especifica explícitamente la forma array para `cancelarTurno` (cada operación como `this.prisma.x.y(...)` ya construida, no `tx.x.y(...)`). Se respetó tal cual — ambas formas conviven en el mismo archivo con propósitos distintos (crear vs. cancelar).
- **`requiereRecontacto` derivado, no persistido:** exactamente como sugiere PATTERNS.md ("Prefer the derived-query approach — no schema change"). El flag se computa en TypeScript replicando la misma condición que el `where` de Prisma, evitando doble fuente de verdad divergente.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] jest `moduleNameMapper` no resolvía el alias `@/src/*`**
- **Found during:** Task 1, al intentar correr `turnos.service.spec.ts` por primera vez (archivo nuevo requerido por el plan).
- **Issue:** `turnos.service.ts` importa `getDayRange` desde `@/src/common/utils/date-range` (alias de `tsconfig.json` → raíz de `backend/`). El `jest.moduleNameMapper` de `package.json` solo mapeaba `^src/(.*)$`, no `^@/src/(.*)$` — cualquier spec en el módulo `turnos` fallaba en tiempo de carga con `Cannot find module '@/src/common/utils/date-range'`. Esto bloqueaba por completo la verificación automatizada exigida por el plan (`npx jest src/modules/turnos/turnos.service.spec.ts`).
- **Fix:** Se agregó `"^@/src/(.*)$": "<rootDir>/$1"` a `jest.moduleNameMapper` en `backend/package.json`, replicando el mismo mapeo que ya existía para `src/*` sin alias. Se verificó que **todos** los usos de `@/` en el codebase siguen el patrón `@/src/...` (grep confirmó 3 archivos, ninguno usa `@/` sin `src/`), por lo que el fix es completo y no requiere una segunda entrada.
- **Files modified:** `backend/package.json`
- **Verification:** Suite completa de `pacientes.service.spec.ts` (19/19 antes del fix) sigue en verde tras el cambio; `turnos.service.spec.ts` pasa a resolver módulos correctamente.
- **Committed in:** `79445e1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking issue de infraestructura de test).
**Impact on plan:** Ninguno funcional — el fix es puramente de configuración de test runner, no toca lógica de negocio ni ningún archivo listado como `files_modified` del plan original (era un pre-requisito implícito para poder crear `turnos.service.spec.ts` como pide el plan).

## Issues Encountered

- `npx jest` (suite completa del backend) reporta 4 test suites pre-existentes fallando por errores de DI no relacionados a este plan (`reportes.controller.spec.ts`, `diagnosticos.controller.spec.ts`, `usuarios.controller.spec.ts`, y un cuarto): módulos de test que no proveen `PrismaService`/`JwtAuthGuard` en su `TestingModule`. Se verificó que este mismo conjunto de 4 suites/18 tests falla también en el estado previo a este plan (comparado vía `git stash`) — es deuda técnica pre-existente, fuera del scope de este plan (Scope Boundary), no se tocó.

## User Setup Required

None — no se requiere configuración externa.

## Next Phase Readiness

- EMBUDO-08 completado: agendar cirugía confirma sin presupuesto, un turno nuevo respeta etapas avanzadas salvo Consulta, y cancelar cirugía deja al paciente confirmado + caliente + recontactable.
- Fase 63 (backend del embudo CRM) queda **completa**: 63-01 (EMBUDO-07), 63-02 (EMBUDO-08), 63-03 (EMBUDO-09) — los 3 planes ejecutados.
- El campo `requiereRecontacto` está expuesto por `getListaAccion` pero su **badge/texto visual** ("Cirugía cancelada, recontactar") queda diferido a Phase 64 (frontend), tal como documenta el CONTEXT.md de esta fase.
- Sin bloqueos para Phase 64 (indicadores + planilla frontend).

---

*Phase: 63-flujo-crm-autom-tico-backend*
*Completed: 2026-07-31*

## Self-Check: PASSED

- FOUND: backend/src/modules/turnos/turnos.service.ts
- FOUND: backend/src/modules/turnos/turnos.service.spec.ts
- FOUND: backend/src/modules/pacientes/pacientes.service.ts
- FOUND: backend/src/modules/pacientes/pacientes.service.spec.ts
- FOUND: .planning/phases/63-flujo-crm-autom-tico-backend/63-02-SUMMARY.md
- FOUND commit: 79445e1
- FOUND commit: 7f2e520
- FOUND commit: a491383
