---
phase: 67-tel-fono-opcional-y-guards-de-env-o-backend
plan: 05
subsystem: testing
tags: [jest, nestjs, bullmq, prisma, whatsapp, presupuestos]

# Dependency graph
requires:
  - phase: 67-01
    provides: "Paciente.telefono nullable end-to-end (schema, migration, Prisma client, all TypeScript declarations widened to string | null)"
  - phase: 67-02
    provides: "normalizeTelefono() en PacientesService, wired into create()/update()/updateContacto(); suggest() NULL-safe via COALESCE"
  - phase: 67-03
    provides: "requireTelefonoParaEnvio() guard en los 4 paths de WhatsappService que empujan telefono a la cola BullMQ"
  - phase: 67-04
    provides: "presupuestos.service.ts::generatePdf() propaga telefono nullable sin casts; auditoria de 12 sitios de lectura cerrada"
provides:
  - "Cobertura de test automatizada de los 5 success criteria del ROADMAP de la Fase 67 (SC#1, SC#3, SC#4, SC#5, y SC#2 referenciado desde 67-01)"
  - "whatsapp.service.spec.ts (nuevo, primer spec del modulo) — 13 tests cubriendo los 4 guards de telefono, D-03 (falsy-tras-trim), D-04 (sin fallback a telefonoAlternativo), orden de guards, y camino feliz"
  - "presupuestos.service.spec.ts (nuevo, primer spec del modulo) — 3 tests cubriendo el passthrough nullable de generatePdf()"
  - "pacientes.service.spec.ts extendido con 10 tests para normalizeTelefono() en create/update/updateContacto, incluido el contraste con updateEmergencia (D-07)"
affects: [68, 69]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getQueueToken(WHATSAPP_QUEUE) mockeado con { add: jest.fn() } para el primer spec de un servicio con @InjectQueue — replica el patron ya establecido por finanzas.service.spec.ts con CAE_QUEUE"
    - "mock-Prisma por-test con jest.fn() y jest.clearAllMocks() en beforeEach, mismo patron en los 3 archivos de test tocados"

key-files:
  created:
    - backend/src/modules/whatsapp/whatsapp.service.spec.ts
    - backend/src/modules/presupuestos/presupuestos.service.spec.ts
  modified:
    - backend/src/modules/pacientes/pacientes.service.spec.ts
    - backend/src/modules/pacientes/pacientes.service.ts

key-decisions:
  - "Bug encontrado y corregido (Rule 1): create() envolvia la llamada a normalizeTelefono() dentro de un try/catch que capturaba TODAS las excepciones — incluida su propia BadRequestException('Teléfono inválido') — y las reemplazaba por un InternalServerErrorException genérico (500). Un teléfono de menos de 6 caracteres en el alta devolvía 500 en vez de 400, contradiciendo D-06 y el criterio de aceptación explícito de la Task 1 de este plan. Fix: rethrow explícito de BadRequestException antes del catch-all de Prisma/P2002."
  - "npm run lint (project-wide --fix) no se corrió completo — reformatea archivos no relacionados, documentado desde 67-01. Se corrió npx eslint scoped a los 4 archivos tocados por este plan; se corrigieron 8 errores de formato prettier introducidos por los tests nuevos (dentro del bloque agregado, no en código preexistente); los 8 errores restantes en pacientes.service.spec.ts y los 3 en pacientes.service.ts son deuda preexistente confirmada via git diff --stat (fuera de las líneas que este plan tocó)."
  - "paciente-portal.service.spec.ts NO fue editado — verificado con git diff --stat vacío antes y después de este plan, satisfaciendo D-08 y T-67-21 del threat model"

patterns-established: []

requirements-completed: [TEL-01, ENVIO-01, ENVIO-02]

# Metrics
duration: ~45min
completed: 2026-08-18
---

# Phase 67 Plan 5: Cobertura de Test — Teléfono Opcional y Guards de Envío Summary

**33 tests nuevos en 3 archivos (2 nuevos, 1 extendido) prueban los 5 success criteria de la Fase 67 end-to-end; en el proceso se encontró y corrigió un bug real donde `create()` enmascaraba el `BadRequestException` de teléfono inválido como un 500.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 3/3 complete
- **Files modified:** 4 (2 nuevos, 2 modificados)

## Accomplishments

- `pacientes.service.spec.ts` extendido con 10 tests nuevos: SC#1 (`create()` sólo con `nombreCompleto`+`dni` persiste `telefono: null`), D-01 (`''`/`'   '` → `null`, trim), D-02 (ausente vs. vacío en `update()`), D-05/D-06 (`updatePacienteSection` sección `contacto`), D-07 (sección `emergencia` sigue exigiendo los 3 campos, sin relajarse)
- `whatsapp.service.spec.ts` — primer spec del módulo, 13 tests: los 4 paths (`sendTemplateMessage`, `sendFreeText`, `sendPresupuestoPdf`, `retryMessage`) rechazan con `BadRequestException` sin encolar ni crear/mutar registros cuando el teléfono es `null`/`''`/`'   '` (D-03); D-04 confirma que `telefonoAlternativo` no es fallback; se prueba el orden de guards (opt-in antes que teléfono); un teléfono corto (`'123'`) NO bloquea (el guard mira existencia, no validez); camino feliz confirma exactamente 1 `queue.add()` con el teléfono trimmeado en el payload
- `presupuestos.service.spec.ts` — primer spec del módulo, 3 tests: `generatePdf()` propaga `paciente.telefono === null` sin coerción, propaga un teléfono presente tal cual, y sigue lanzando `NotFoundException('Presupuesto no encontrado')` si el presupuesto no existe
- **Bug encontrado y corregido en `create()`** (ver Deviations): el `try/catch` de `create()` capturaba el `BadRequestException` lanzado por `normalizeTelefono()` para un teléfono <6 chars y lo reemplazaba por un 500 genérico — el fix agrega un rethrow explícito
- `npm run build` pasa con 0 errores; suite completa: **4 suites falladas / 18 tests fallados**, exactamente la baseline preexistente documentada en el wave context (verificada idéntica en el commit base `33c5a23`, no relacionada con teléfono)
- `paciente-portal.service.spec.ts` (WR-02) confirmado sin editar — `git diff --stat` vacío

## Task Commits

Each task was committed atomically:

1. **Task 1: Extender pacientes.service.spec.ts con la cobertura de normalizeTelefono** - `d220262` (test) — incluye el fix de `create()` (Rule 1)
2. **Task 2: Crear whatsapp.service.spec.ts con la cobertura de los 4 guards** - `7188659` (test)
3. **Task 3: Crear presupuestos.service.spec.ts y correr la verificación completa** - `f1638ac` (test) — incluye fix de formato prettier en Task 1

**Plan metadata:** (this commit, to follow)

## Files Created/Modified

- `backend/src/modules/pacientes/pacientes.service.spec.ts` - nuevo `describe('normalizeTelefono() — teléfono opcional (D-01/D-02/D-05/D-06/D-07)')` con 10 tests; describes preexistentes sin tocar
- `backend/src/modules/pacientes/pacientes.service.ts` - `create()`: rethrow explícito de `BadRequestException` antes del catch-all (7 líneas)
- `backend/src/modules/whatsapp/whatsapp.service.spec.ts` - nuevo, 13 tests cubriendo los 4 guards de `requireTelefonoParaEnvio()`
- `backend/src/modules/presupuestos/presupuestos.service.spec.ts` - nuevo, 3 tests cubriendo el passthrough nullable de `generatePdf()`

## Success Criteria del ROADMAP (Fase 67) — trazabilidad

| SC | Descripción | Evidencia concreta |
|----|-------------|---------------------|
| SC#1 | Alta de paciente con sólo `nombreCompleto` y `dni` (sin teléfono) | `pacientes.service.spec.ts` — `'SC#1: create() con sólo nombreCompleto y dni no lanza y persiste telefono: null'` |
| SC#2 | Migración de `telefono` a nullable sin pérdida de datos | Probado en 67-01 (`TEL_BASELINE=424` == `TEL_AFTER=424`), referenciado desde `67-01-SUMMARY.md` |
| SC#3 | Envío de mensaje WhatsApp a paciente sin teléfono → error controlado, sin encolar | `whatsapp.service.spec.ts` — `describe('sendTemplateMessage')`, `describe('sendFreeText')`: `BadRequestException`, `mockQueue.add` y `mensajeWhatsApp.create` con 0 llamadas |
| SC#4 | Envío de presupuesto por WhatsApp a paciente sin teléfono → error controlado, sin encolar | `whatsapp.service.spec.ts` — `describe('sendPresupuestoPdf')`: `'telefono null -> BadRequestException, sin encolar (ENVIO-02)'` |
| SC#5 | Suite completa del backend en verde (incluido WR-02 del portal sin editar) | `cd backend && npm run test -- --runInBand`: `4 failed, 37 passed, 41 total` suites / `18 failed, 513 passed, 531 total` tests — idéntico a la baseline preexistente documentada; `paciente-portal.service.spec.ts` con `git diff --stat` vacío |

## Decisions Made

- **Rethrow de `BadRequestException` en `create()`**: el `try/catch` original de `create()` fue escrito antes de que `normalizeTelefono()` existiera (plan 67-02) y sólo contemplaba errores de Prisma (`P2002`). Al integrar `normalizeTelefono()` dentro del `try`, su excepción de negocio quedaba indistinguible de un error de infraestructura real y se enmascaraba como 500. Se agregó `if (error instanceof BadRequestException) throw error;` como primera rama del catch, preservando el comportamiento de `P2002`/`ConflictException` y el catch-all genérico para errores verdaderamente inesperados.
- **Formato prettier del bloque agregado en Task 1**: corregido inline (8 correcciones) tras detectar que `npx eslint` scoped reportaba errores dentro de mi propio bloque nuevo — no se usó `--fix` completo para evitar reformatear las 8 líneas de deuda preexistente identificadas en el mismo archivo (verificadas fuera del rango de líneas que este plan tocó, via `git diff` hunks).
- **`npm run lint` full run no ejecutado**: siguiendo la guía del wave context y el patrón ya establecido en 67-01/67-02/67-03/67-04, se usó `npx eslint` scoped a los 4 archivos de este plan en su lugar. 0 errores nuevos introducidos; toda la deuda restante (11 errores combinados en `pacientes.service.spec.ts` + `pacientes.service.ts`) es preexistente y está fuera del alcance de esta fase, según `deferred-items.md`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `create()` enmascaraba `BadRequestException('Teléfono inválido')` como 500**
- **Found during:** Task 1, escribiendo el test `"D-06: create() con telefono: '123' -> BadRequestException('Teléfono inválido')..."`
- **Issue:** `create()` envuelve la construcción de `data` (que incluye `this.normalizeTelefono(dto.telefono)`) dentro de un `try` cuyo `catch` sólo reconocía `error.code === 'P2002'`; cualquier otro error, incluida la propia `BadRequestException` de `normalizeTelefono()`, caía en el `throw new InternalServerErrorException('Error interno al crear paciente')` genérico. Un teléfono `'123'` devolvía 500 en vez de 400.
- **Fix:** Agregado `if (error instanceof BadRequestException) throw error;` como primera rama del catch, antes de la verificación de `P2002`.
- **Files modified:** `backend/src/modules/pacientes/pacientes.service.ts`
- **Verification:** Test `'D-06: create() con telefono: '123' -> BadRequestException...'` pasa; `npm run build` sigue en 0 errores; el resto de la suite de `pacientes.service.spec.ts` (33/33) sigue en verde
- **Committed in:** `d220262` (Task 1 commit)

**2. [Rule 1 - Precisión, sin cambio de lógica] Formato prettier en el bloque de tests agregado en Task 1**
- **Found during:** Task 3, corriendo `npx eslint` scoped como parte de la verificación completa del plan
- **Issue:** 9 errores de formato `prettier/prettier` dentro del `describe('normalizeTelefono()...')` agregado en Task 1 (objetos mock sin salto de línea antes de la cierre `}`, `buildDto` sin trailing comma, `rejects.toThrow` sin el salto de línea que prettier prefiere)
- **Fix:** Reformateo manual de las 9 ubicaciones, sin tocar ninguna línea preexistente del archivo (confirmado via `git diff` hunks, todos con offset ≥576)
- **Files modified:** `backend/src/modules/pacientes/pacientes.service.spec.ts`
- **Verification:** `npx eslint src/modules/pacientes/pacientes.service.spec.ts` pasó de 17 a 8 errores (los 8 restantes preexistentes, verificados fuera de rango via diff); suite de 33/33 tests sigue en verde
- **Committed in:** `f1638ac` (Task 3 commit)

---

**Total deviations:** 2 (1 bug real de comportamiento corregido con Rule 1, 1 corrección de formato sin impacto de lógica)
**Impact on plan:** El bug de `create()` era necesario corregir para que el propio criterio de aceptación de la Task 1 de este plan fuera satisfacible — sin el fix, D-06 no se cumplía en `create()`. Sin scope creep: ambos fixes están acotados a las líneas que este plan ya estaba tocando.

## Issues Encountered

- **Inserción inicial de bloque de test en el lugar incorrecto**: la primera edición del `describe('normalizeTelefono()...')` en `pacientes.service.spec.ts` se insertó accidentalmente después del *segundo* `describe` de nivel superior del archivo (`getKanban consentimientosFirmados select...`, un guard estático que no instancia el `service`), en vez de dentro del `describe` principal donde `service`/`prisma` están declarados vía closure. El error se manifestó como `TS2304: Cannot find name 'service'`/`'prisma'` en cada test del bloque nuevo. Diagnosticado contando la profundidad de anidamiento de llaves con un script `node` y corregido moviendo el bloque completo al punto de inserción correcto (antes del cierre del `describe` principal, línea 576). Verificado con un segundo conteo de profundidad y la corrida exitosa de la suite.
- `npm run lint` (full, project-wide `--fix`) no se ejecutó por las razones documentadas arriba — mismo patrón que 67-01 a 67-04.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Fase 67 (Teléfono Opcional y Guards de Envío Backend) queda cerrada: TEL-01, ENVIO-01, ENVIO-02 completos con cobertura de test automatizada para los 5 success criteria del ROADMAP.
- Fases 68 (Creación Inline en el Autosuggest) y 69 (Consistencia de Teléfono Opcional Frontend) pueden ejecutarse en paralelo, ambas dependientes de esta fase 67 completa.
- El bug corregido en `create()` (rethrow de `BadRequestException`) es relevante para la Fase 69: el frontend recibirá correctamente un 400 (no un 500) cuando envíe un teléfono inválido en el alta, lo cual es el contrato que ENVIO-03/TEL-02 asumirán.
- No quedan blockers para el cierre del milestone v1.16 backend.

---
*Phase: 67-tel-fono-opcional-y-guards-de-env-o-backend*
*Completed: 2026-08-18*

## Self-Check: PASSED

- FOUND: backend/src/modules/whatsapp/whatsapp.service.spec.ts
- FOUND: backend/src/modules/presupuestos/presupuestos.service.spec.ts
- FOUND: backend/src/modules/pacientes/pacientes.service.spec.ts
- FOUND: backend/src/modules/pacientes/pacientes.service.ts
- FOUND commit: d220262 (Task 1)
- FOUND commit: 7188659 (Task 2)
- FOUND commit: f1638ac (Task 3)
