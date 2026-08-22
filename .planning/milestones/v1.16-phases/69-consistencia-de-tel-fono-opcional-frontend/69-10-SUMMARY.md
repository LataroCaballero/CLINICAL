---
phase: 69-consistencia-de-tel-fono-opcional-frontend
plan: 10
subsystem: api
tags: [nestjs, idor, access-control, turnos, resolveScope]

# Dependency graph
requires:
  - phase: 69-02
    provides: "telefono agregado al select de GET /turnos/rango"
  - phase: 69-07
    provides: "pacienteId agregado al select de GET /turnos/rango"
provides:
  - "obtenerPorRango (GET /turnos/rango) con scoping horizontal via resolveScope, alineado con findAll"
  - "guard que rechaza a un PROFESIONAL sin profesionalId en el JWT (BadRequestException, sin cast)"
  - "turnos.controller.spec.ts (nuevo) con cobertura de scoping horizontal para el controller"
affects: [69-verification, 69-review]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Handlers de turnos.controller.ts que reciben profesionalId por query deben resolver el scope con resolveScope antes de llamar al service (patron ya usado por findAll, ahora replicado en obtenerPorRango)"

key-files:
  created:
    - backend/src/modules/turnos/turnos.controller.spec.ts
  modified:
    - backend/src/modules/turnos/turnos.controller.ts

key-decisions:
  - "Se paso scope.profesionalId (no el profesionalId crudo del query ni el objeto scope entero) a turnosService.obtenerTurnosPorRango para no tocar la firma del service, que el plan 07 modifica en paralelo"
  - "Guard explicito ante scope.profesionalId falsy, sin `!` ni `as string`, para no silenciar el tipo string que el service espera"
  - "turnos.controller.spec.ts no existia: se creo desde cero instanciando el controller directamente con `new TurnosController(mock)` en vez de Test.createTestingModule con `controllers:`, porque @Auth aplica guards de clase (JwtAuthGuard/RolesGuard) cuyas dependencias no resuelven en un modulo de test aislado"

patterns-established:
  - "Unit tests de controllers con @Auth de clase: instanciar el controller directamente con new, no via TestingModule con controllers: [...]"

requirements-completed: [ENVIO-03]

# Metrics
duration: 12min
completed: 2026-08-22
---

# Phase 69 Plan 10: Cierre de IDOR en GET /turnos/rango Summary

**`obtenerPorRango` ahora resuelve el scope con `resolveScope` igual que `findAll`, cerrando el IDOR T-69-16: un `PROFESIONAL` autenticado ya no puede leer nombre, teléfono y opt-in de pacientes de otro profesional inyectando `profesionalId` por query string.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-22T02:06:00Z (aprox)
- **Completed:** 2026-08-22T02:18:26Z
- **Tasks:** 2/2
- **Files modified:** 2 (1 modificado, 1 creado)

## Accomplishments
- `obtenerPorRango` recibe `@Req()`, resuelve `scope = resolveScope({ user: req.user, requestedProfesionalId: profesionalId })` y pasa `scope.profesionalId` al service — mismo patrón que `findAll` en el mismo controller.
- Guard de robustez (T-69-28): si `scope.profesionalId` es falsy (PROFESIONAL con JWT mal aprovisionado), lanza `BadRequestException` propia en vez de dejar pasar `null` a un parámetro tipado `string`.
- `turnos.controller.spec.ts` creado desde cero con 3 tests: PROFESIONAL bloqueado, SECRETARIA sin regresión, PROFESIONAL sin `profesionalId` rechazado.

## Task Commits

Each task was committed atomically:

1. **Task 1: Aplicar resolveScope en obtenerPorRango, alineándolo con findAll** - `6a32068` (fix)
2. **Task 2: Test que prueba la restricción horizontal, con prueba negativa** - `88db980` (test)

**Plan metadata:** (este commit, docs)

## Files Created/Modified
- `backend/src/modules/turnos/turnos.controller.ts` - `obtenerPorRango` resuelve el scope antes de consultar el service; único handler tocado.
- `backend/src/modules/turnos/turnos.controller.spec.ts` - nuevo, cubre el scoping horizontal de `obtenerPorRango`.

## Decisions Made
- Se instanció `TurnosController` directamente (`new TurnosController(mockService)`) en vez de usar `Test.createTestingModule({ controllers: [...] })`, porque el `@Auth` de clase requiere `JwtAuthGuard`/`RolesGuard` que no resuelven en un módulo de test aislado sin bootstrapping completo de auth. Es consistente con probar el método, no el pipeline HTTP completo.
- Se mantuvo la firma de `turnosService.obtenerTurnosPorRango(profesionalId: string, ...)` sin cambios, pasando `scope.profesionalId` en el call site — evita tocar `turnos.service.ts`, que el plan 07 modifica en su propia wave.

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito. Único ajuste técnico (instanciar el controller con `new` en vez de `TestingModule`) fue necesario para que el test compilara/corriera, y está dentro del alcance de la Task 2 (no es un cambio de comportamiento del código de producción, solo de la estrategia de test).

## Issues Encountered

Al usar `Test.createTestingModule({ controllers: [TurnosController], providers: [...] })`, Nest intentó resolver los guards de `@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')` (JwtAuthGuard/RolesGuard) y falló por dependencias no provistas en el módulo de test aislado. Resuelto instanciando el controller directamente con `new TurnosController(turnosService)`, que evita el bootstrap de Nest DI/guards — apropiado para un unit test de método, no de integración HTTP.

## Prueba negativa (obligatoria por el plan)

Se revirtió temporalmente el cambio de la Task 1 en `turnos.controller.ts` (volviendo a pasar el `profesionalId` crudo del query al service, sin `resolveScope` ni el guard) y se corrió `npx jest src/modules/turnos/turnos.controller.spec.ts`:

- **Test 1 (PROFESIONAL bloqueado): FALLÓ**, exactamente como se esperaba — `toHaveBeenCalledWith` reportó `Expected: "prof-PROPIO" / Received: "prof-AJENO"`, confirmando que sin el fix el service recibe el `profesionalId` ajeno inyectado por query string.
- **Test 2 (SECRETARIA conserva acceso multi-profesional): PASÓ**, confirmando que el test no depende accidentalmente del fix para el caso no-PROFESIONAL.
- Test 3 (guard de `profesionalId` nulo) también falló al revertir, como era esperable — el guard forma parte del mismo cambio revertido.

Se restauró el archivo a su estado post-Task-1 inmediatamente después (verificado con `git diff` vacío contra el commit `6a32068`), y se re-corrió la suite completa de `src/modules/turnos` (13/13 tests verdes) y `npm run build` (exit 0) antes de continuar.

## Nota de cambio de comportamiento visible (T-69-27, accept registrado en el threat model)

Un usuario con rol `PROFESIONAL` que hoy consultara `GET /turnos/rango?profesionalId=<otro>` para ver la agenda de otro profesional desde el calendario **deja de poder hacerlo**: a partir de este plan, `obtenerPorRango` ignora el `profesionalId` del query para ese rol y siempre usa el propio `scope.profesionalId` del JWT, igual que ya hace `findAll` en la lista de turnos. `ADMIN` y `SECRETARIA` no se ven afectados — conservan el calendario multi-profesional sin cambios (probado por el test 2). Esta restricción es el efecto buscado y aprobado explícitamente en el threat model del plan (T-69-16 mitigate, T-69-27 accept).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- El IDOR marcado 🛑 BLOCKER en `69-VERIFICATION.md` y confirmado preexistente en `69-REVIEW.md` queda cerrado con test automatizado que falla si se revierte.
- El ensanchamiento de PII (`telefono` en 69-02, `pacienteId` en 69-07) sobre `GET /turnos/rango` queda dentro de un scope horizontal defendible.
- Listo para que `/gsd:verify-phase` re-corra sobre la fase 69 con este gap cerrado.

---
*Phase: 69-consistencia-de-tel-fono-opcional-frontend*
*Completed: 2026-08-22*

## Self-Check: PASSED

- FOUND: backend/src/modules/turnos/turnos.controller.spec.ts
- FOUND: .planning/phases/69-consistencia-de-tel-fono-opcional-frontend/69-10-SUMMARY.md
- FOUND commit: 6a32068
- FOUND commit: 88db980
