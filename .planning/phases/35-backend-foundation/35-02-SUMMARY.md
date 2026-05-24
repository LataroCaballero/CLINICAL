---
phase: 35-backend-foundation
plan: "02"
subsystem: api
tags: [crm, prisma, nestjs, state-machine, forward-only-guard]

# Dependency graph
requires: []
provides:
  - "Guard forward-only (isAutoTransitionBlocked) para auto-transiciones CRM en presupuestos y turnos"
  - "ETAPA_ORDEN constante como fuente de verdad del orden lógico de etapas CRM"
  - "5 call sites protegidos: marcarEnviado, aceptar, aceptarByToken, rechazarByToken, crearTurno"
affects:
  - 36-drag-drop-warning-infrastructure
  - 37-sheet-redesign
  - 38-stepper-interactions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Forward-only CRM guard: auto-transiciones solo avanzan etapas, nunca retroceden"
    - "ETAPA_ORDEN como Record<string, number> — nunca derivar orden del enum Prisma"
    - "Spread condicional en $transaction para operaciones opcionales (maybeCRMUpdate pattern)"
    - "Guard especial para PERDIDO: lista explícita de etapasProtegidas en lugar de ETAPA_ORDEN"

key-files:
  created: []
  modified:
    - "backend/src/modules/presupuestos/presupuestos.service.ts"
    - "backend/src/modules/turnos/turnos.service.ts"

key-decisions:
  - "ETAPA_ORDEN duplicado en cada archivo (no shared module) — intencional para evitar acoplamiento de módulos"
  - "PERDIDO excluido de ETAPA_ORDEN — manejo especial con etapasProtegidas (lista explícita) en rechazarByToken"
  - "El update del estado del presupuesto SIEMPRE ocurre — solo el update de etapaCRM es condicional"
  - "isAutoTransitionBlocked usa >=: etapa actual >= etapa destino significa bloquear (incluye misma etapa)"

patterns-established:
  - "maybeCRMUpdate pattern: const maybe = blocked ? [] : [prisma.update(...)]; $transaction([...always, ...maybe])"
  - "Guard especial PERDIDO: etapasProtegidas: EtapaCRM[] = [CONFIRMADO, PROCEDIMIENTO_REALIZADO]"

requirements-completed:
  - CRM-04

# Metrics
duration: 3min
completed: "2026-05-24"
---

# Phase 35 Plan 02: CRM Forward-Only Guard Summary

**Guard forward-only implementado en 5 call sites de auto-transicion CRM, usando ETAPA_ORDEN como fuente de verdad de orden logico — las decisiones manuales del profesional ya no pueden ser revertidas por eventos automaticos del sistema**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-24T16:08:31Z
- **Completed:** 2026-05-24T16:11:15Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Constante `ETAPA_ORDEN` y funciones `etapaOrden`/`isAutoTransitionBlocked` definidas como module-level helpers en ambos archivos de servicio
- 4 call sites protegidos en `presupuestos.service.ts`: `marcarEnviado` (PRESUPUESTO_ENVIADO), `aceptar` (CONFIRMADO), `aceptarByToken` (CONFIRMADO), `rechazarByToken` (PERDIDO con guard especial)
- 1 call site protegido en `turnos.service.ts`: `crearTurno` (TURNO_AGENDADO), reemplazando la whitelist `etapasIniciales` con guard generico

## Task Commits

Cada tarea fue commiteada atomicamente:

1. **Task 1: Guard forward-only en presupuestos.service.ts** - `54bbd39` (feat)
2. **Task 2: Reemplazar whitelist por guard en turnos.service.ts** - `720da99` (feat)

## Files Created/Modified

- `/Users/laucaballero/Desktop/Lautaro/AndesCode/CLINICAL/backend/src/modules/presupuestos/presupuestos.service.ts` - Agregados ETAPA_ORDEN/isAutoTransitionBlocked, guard en 4 metodos de auto-transicion CRM
- `/Users/laucaballero/Desktop/Lautaro/AndesCode/CLINICAL/backend/src/modules/turnos/turnos.service.ts` - Agregados ETAPA_ORDEN/isAutoTransitionBlocked, reemplazada whitelist etapasIniciales por guard generico

## Decisions Made

- **ETAPA_ORDEN duplicado (no shared):** Duplicar en cada archivo es intencional segun el plan — evita acoplamiento cross-module. Si a futuro se centraliza, seria en un archivo `crm-helpers.ts` dentro de `common/`.
- **PERDIDO excluido de ETAPA_ORDEN:** Por diseno — PERDIDO es un estado terminal/lateral que no forma parte de la progresion lineal. Se usa `etapasProtegidas` (lista explicita) para el guard de `rechazarByToken`.
- **TypeScript fix para etapasProtegidas:** La inferencia de tipo estrecha de `includes` requirio declarar `const etapasProtegidas: EtapaCRM[]` (en lugar de dejar inferir) y usar `paciente?.etapaCRM != null &&` para evitar el cast inseguro `as EtapaCRM`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error en etapasProtegidas.includes()**
- **Found during:** Task 1 (primer build check)
- **Issue:** `etapasProtegidas.includes(paciente?.etapaCRM as EtapaCRM)` falla con TS2345 — el tipo inferido es `("PROCEDIMIENTO_REALIZADO" | "CONFIRMADO")[]` que no acepta `EtapaCRM` general
- **Fix:** Declarar `const etapasProtegidas: EtapaCRM[]` y cambiar a `paciente?.etapaCRM != null && etapasProtegidas.includes(paciente.etapaCRM)`
- **Files modified:** `backend/src/modules/presupuestos/presupuestos.service.ts`
- **Verification:** `npm run build` pasa sin errores
- **Committed in:** `54bbd39` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type error)
**Impact on plan:** Fix necesario para que el build pase. Sin cambio de semantica ni scope creep.

## Issues Encountered

None — el plan incluia el patron correcto de tipos, solo requirio ajuste menor de TypeScript.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Guard forward-only listo para ser referenciado por Phase 36 (drag-and-drop + warning infrastructure)
- El patron `isAutoTransitionBlocked` esta disponible para reutilizar en cualquier nuevo call site CRM
- `etapasIniciales` whitelist eliminada de `turnos.service.ts` — no hay codigo legado que limpiar

---
*Phase: 35-backend-foundation*
*Completed: 2026-05-24*
