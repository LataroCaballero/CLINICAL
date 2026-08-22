---
phase: 69-consistencia-de-tel-fono-opcional-frontend
plan: 07
subsystem: fullstack
tags: [nestjs, prisma, nextjs, react, vitest, testing-library, calendario, whatsapp]

# Dependency graph
requires:
  - phase: 69-09
    provides: "runner de tests (vitest + Testing Library + jsdom) capaz de renderizar componentes y assertar sobre el DOM"
  - phase: 69-10
    provides: "resolveScope en GET /turnos/rango — acota horizontalmente la PII que este plan ensancha"
  - phase: 69-02
    provides: "telefono y whatsappOptIn en el select de obtenerTurnosPorRango"
  - phase: 69-06
    provides: "el guard de teléfono en el atajo de WhatsApp de AppointmentDetailModal (código correcto pero inalcanzable hasta este plan)"
provides:
  - "pacienteId y esSobreturno en la respuesta de GET /turnos/rango"
  - "TurnoRango tipado de verdad (sin `as any[]` en el mapeo a CalendarEvent), con EstadoTurnoRango exportado"
  - "el atajo de WhatsApp del detalle de turno EXISTE en el DOM — CR-01 cerrado"
  - "primer test de render de un componente de la app (AppointmentDetailModal + CalendarGrid en jsdom)"
affects: [69-verification, 69-review]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Los criterios de comportamiento de UI se verifican montando el componente en jsdom y asserteando sobre el DOM, no releyendo el fuente — es la regla que esta fase falló en el plan 06"
    - "El límite de la API del calendario se tipa en useTurnosRangos.ts (TurnoRango); el mapeo a CalendarEvent corre tipado, sin cast"

key-files:
  created:
    - frontend/src/app/dashboard/turnos/__tests__/AppointmentDetailModal.test.tsx
  modified:
    - backend/src/modules/turnos/turnos.service.ts
    - backend/src/modules/turnos/turnos.service.spec.ts
    - frontend/src/hooks/useTurnosRangos.ts
    - frontend/src/app/dashboard/turnos/page.tsx

key-decisions:
  - "pacienteId se agrega al select como FK escalar, no se deriva de paciente.id: la condición de visibilidad del atajo cuelga de event.pacienteId, y el campo anidado ya existía sin resolver el bug"
  - "El mapeo usa el fallback `t.pacienteId ?? t.paciente?.id ?? undefined` para cubrir despliegues donde el backend todavía no traiga el campo a nivel raíz"
  - "estado se angostó de string a la unión literal EstadoTurnoRango (espeja el enum EstadoTurno de Prisma); los tres consumidores fueron verificados por tsc"
  - "Task 4 se resolvió por el camino (a): CalendarGrid resultó montable sin providers extra (trae su propio TooltipProvider, no necesita QueryClientProvider ni mocks de red), así que la ampliación de alcance de esSobreturno quedó verificada por test en vez de revertida"

patterns-established:
  - "Tests de componentes del dashboard en frontend/src/app/**/__tests__/*.test.tsx, sobre el runner del plan 69-09"

requirements-completed: [TEL-03, ENVIO-03]

# Metrics
duration: ~45min (2 ejecuciones interrumpidas + cierre por orquestador)
completed: 2026-08-22
---

# Phase 69 Plan 07: CR-01 — el atajo de WhatsApp existe en el DOM Summary

**El atajo de WhatsApp del detalle de turno ahora renderiza de verdad: el bloque colgaba de `{event.pacienteId && (...)}` y ese campo era siempre `undefined` porque el `select` de `obtenerTurnosPorRango` nunca lo traía. El guard que el plan 06 había escrito bien era inalcanzable; ahora es alcanzable y está probado en el DOM.**

## Performance

- **Duration:** ~45 min de reloj (ver "Issues Encountered" — dos executors se colgaron)
- **Completed:** 2026-08-22
- **Tasks:** 4/4
- **Files modified:** 5 (4 modificados, 1 creado)

## Accomplishments

- **Backend:** el `select` de `obtenerTurnosPorRango` (`turnos.service.ts:564-569`) agrega `pacienteId` y `esSobreturno`. Test de contrato en `turnos.service.spec.ts` que falla si alguien vuelve a angostar el select.
- **Tipado del límite de la API:** `TurnoRango` en `useTurnosRangos.ts` pasa a espejar la respuesta real — `pacienteId` y `esSobreturno` obligatorios, `paciente.whatsappOptIn`/`paciente.telefono` declarados, y `estado` angostado de `string` a la unión literal `EstadoTurnoRango` (exportada). Cae el `as any[]` de `page.tsx:283`: el mapeo a `CalendarEvent` corre tipado.
- **CR-01 cerrado y probado en el DOM:** 4 tests de render en `AppointmentDetailModal.test.tsx`, los primeros tests de componente de toda la app.
- **Ampliación de alcance verificada, no aceptada a ciegas:** `esSobreturno` en el select hace aparecer el borde punteado naranja de sobreturnos — un cambio de UI que no estaba en los gaps. La Task 4 lo cubrió con un test que monta `CalendarGrid` con `esSobreturno: true` vs `false`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Devolver pacienteId (y esSobreturno) desde obtenerTurnosPorRango, con test de regresión** - `dfbe3b0` (fix)
2. **Task 2: Tipar el límite de la API del calendario y poblar pacienteId en el mapeo** - `4df33fe` (fix)
3. **Task 3: Test de render que prueba que el atajo de WhatsApp EXISTE en el DOM** - `f34544e` (test)
4. **Task 4: Verificar el efecto colateral declarado del borde de sobreturnos** - `6f56b18` (test)

**Plan metadata:** (este commit, docs)

## Files Created/Modified

- `backend/src/modules/turnos/turnos.service.ts` — `+pacienteId`, `+esSobreturno` en el select de `obtenerTurnosPorRango`. Único cambio; `turnos.controller.ts` sin tocar (es del plan 69-10).
- `backend/src/modules/turnos/turnos.service.spec.ts` — test de contrato del select + test de passthrough del `...rest` del mapper.
- `frontend/src/hooks/useTurnosRangos.ts` — `TurnoRango` completado, `EstadoTurnoRango` exportado.
- `frontend/src/app/dashboard/turnos/page.tsx` — cae el cast `as any[]`; `pacienteId: t.pacienteId ?? t.paciente?.id ?? undefined`.
- `frontend/src/app/dashboard/turnos/__tests__/AppointmentDetailModal.test.tsx` — **nuevo**, 4 tests de render.

## Cobertura de los 4 tests de render

| Test | Qué prueba |
|------|-----------|
| paciente CON teléfono y CON opt-in | el botón está en el documento **y habilitado** |
| paciente SIN teléfono | el botón está en el documento, **deshabilitado**, y `MOTIVO_SIN_TELEFONO` es alcanzable en hover |
| `pacienteId` ausente (estado PRE-fix) | el botón **NO** está en el documento — es exactamente el CR-01 original, congelado como test |
| `esSobreturno` true vs false | la clase `border-dashed`/`border-orange-400` aparece sólo en el primero |

El tercero es el que importa para la verificación de la fase: distingue "el botón renderiza deshabilitado" de "el botón no renderiza", que es la distinción que ningún `rg` sobre el fuente puede hacer y que hizo fallar al plan 06.

## Decisions Made

- **`pacienteId` como FK escalar y no derivado de `paciente.id`:** la condición de visibilidad del atajo lee `event.pacienteId`. El campo anidado `paciente.id` ya venía en el select desde antes y el bug existía igual, así que traer el escalar es el fix real; el fallback al anidado en el mapeo es defensa en profundidad para despliegues desfasados.
- **Angostar `estado` a unión literal:** riesgo declarado en el threat model (T-69-18, tres consumidores no relacionados). Verificado por `tsc --noEmit`: `QuickAppointment`, `NuevoTurnoTab` y `TratamientosTab` compilan — todas sus comparaciones usan literales de la unión y `getEstadoTurnoChip` acepta `string`.
- **Task 4 por el camino (a):** `CalendarGrid` monta sin providers adicionales a los que ya renderiza internamente, así que la ampliación de alcance se verificó en vez de revertirse.

## Deviations from Plan

Ninguna desviación de contenido — los 4 tasks se ejecutaron como estaban escritos. La desviación fue de **proceso**: el plan se completó en tres tramos por cuelgues de executor (ver abajo).

## Issues Encountered

**Dos executors se colgaron (watchdog de 600s sin progreso), sin perder trabajo:**

1. El primer executor completó las Tasks 1-3, commiteó 1 y 2, dejó el archivo de test de la Task 3 staged y se colgó antes de commitearlo. El orquestador re-corrió el test de forma independiente (3/3 verde, render real) y lo commiteó como `f34544e`.
2. El executor de continuación completó y commiteó la Task 4 (`6f56b18`) y se colgó corriendo lint, antes de escribir el SUMMARY.
3. El orquestador cerró el plan: re-corrió las tres verificaciones del plan de forma independiente y escribió este SUMMARY.

Este es el mismo modo de falla ya registrado en el proyecto para executors con verificación de superficie amplia. Ningún commit se perdió y ninguna verificación se dio por buena sin correrla.

**Node 18 vs Node 20 (preexistente, fuera de alcance):** el shell por defecto corre Node 18.20.8 pero Next 16 exige Node ≥ 20.9.0. `npm run build` y `npx tsc --noEmit` en `frontend/` requieren `nvm use 20`. `npm test` (vitest) corre en ambos. No lo introdujo esta fase.

**Warning de a11y no relacionado:** los tests emiten `Warning: Missing 'Description' or 'aria-describedby={undefined}' for {DialogContent}` — es un hallazgo preexistente de `AppointmentDetailModal`, no lo introdujo este plan. No rompe ningún test. Queda registrado para una fase futura.

## Verificación final (re-corrida por el orquestador, no heredada de los executors)

| Comando | Resultado |
|---------|-----------|
| `cd frontend && npm test` | exit 0 — 2 archivos, **15/15 tests** |
| `cd frontend && npx tsc --noEmit` (Node 20.19.6) | exit 0 |
| `cd backend && npm run build` | exit 0 |
| `cd backend && npx jest src/modules/turnos` | exit 0 — 2 suites, 13/13 |

No quedó el estado intermedio prohibido: `esSobreturno: true` está en el select **y** hay test que verifica el borde (`AppointmentDetailModal.test.tsx:115-126`).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CR-01 del `69-REVIEW.md` queda cerrado con test de DOM que falla si alguien revierte el `select`.
- El plan 69-08 (CR-02) puede apoyarse en el mismo runner para su criterio de comportamiento.
- La PII ensanchada por este plan (`pacienteId`) queda dentro del scope horizontal que cerró el plan 69-10.

---
*Phase: 69-consistencia-de-tel-fono-opcional-frontend*
*Completed: 2026-08-22*

## Self-Check: PASSED

- FOUND: frontend/src/app/dashboard/turnos/__tests__/AppointmentDetailModal.test.tsx
- FOUND: .planning/phases/69-consistencia-de-tel-fono-opcional-frontend/69-07-SUMMARY.md
- FOUND commit: dfbe3b0
- FOUND commit: 4df33fe
- FOUND commit: f34544e
- FOUND commit: 6f56b18
