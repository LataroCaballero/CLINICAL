---
phase: 68-creaci-n-inline-en-el-autosuggest-frontend
plan: 06
subsystem: ui
tags: [react, nextjs, react-hook-form, autosuggest, race-condition, gap-closure]

# Dependency graph
requires:
  - phase: 68-05
    provides: "Guard de generación de sesión portado a los 3 call sites de turno + candado síncrono submittingRef en InlineCreatePaciente"
provides:
  - "SurgeryAppointmentModal resetea el formulario en AMBAS transiciones del Dialog (no sólo al cerrar), con el sello de generación de sesión corriendo después del reset y sólo en la apertura"
  - "InlineCreatePaciente ya no intercepta el Enter dirigido a un botón enfocado: Cancelar y Crear paciente ejecutan su propia activación nativa"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Efecto de ciclo de vida unificado (reset incondicional + sello condicionado a `if (open)` en el mismo cuerpo) en vez de dos efectos separados que pueden divergir en orden de declaración"
    - "Guard de target por `closest(\"button\")` en un handler de keydown de contenedor, para dejar pasar la acción por defecto del navegador (activación nativa del botón) en vez de cancelarla indiscriminadamente"

key-files:
  created: []
  modified:
    - frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx
    - frontend/src/components/InlineCreatePaciente.tsx

key-decisions:
  - "El efecto unificado usa reset() incondicional + if (open) { sello } en vez del if/else con resets duplicados que proponía CR-01: mismo comportamiento observable, sin dos ramas que puedan divergir a futuro, y hace imposible por construcción que el sello quede antes del reset"
  - "El efecto unificado se declaró ANTES de los dos efectos de seed (defaultDate y pacienteIdProp/CRM): React flushea los efectos de un componente en orden de declaración, y reset() sin argumentos restaura los defaultValues del primer render — si el unificado quedara después, borraría la precarga del flujo CRM"
  - "El guard del Gap B usa closest(\"button\") y no una comparación de tagName: los botones son el componente Button de shadcn (renderiza un <button> real), pero e.target puede ser un nodo interno si en el futuro se le agrega contenido anidado; closest cubre los dos casos"
  - "Se sumó submittingRef.current al early-return de handleKeyDown (antes sólo isPending): isPending es state de React y llega tarde; el ref ya existía (agregado en 68-05) y es síncrono, endureciendo el camino de Enter-en-un-input sin cambiar otra semántica"
  - "No se tocó NewAppointmentModal.tsx pese a que su protección contra la misma carrera es incidental (su efecto de reset lleva `open` en deps por accidente, no por el guard portado): hacerla explícita es endurecimiento separable, y WR-03 de 68-REVIEW.md ya rastrea la fragilidad de ese efecto. Se deja anotado que 68-05-SUMMARY.md afirma que el guard cerró CR-01 \"en los tres call sites\" y eso es media verdad — SurgeryAppointmentModal era el único de los tres donde el porteo mecánico del guard dejó abierta la mitad que importa (el reset al abrir)"
  - "No se deshabilitó el botón Cancelar del modal de cirugía durante el alta en vuelo, ni se cambió el montaje incondicional de turnos/page.tsx a {open && ...}: ambas son mitigaciones alternativas del mismo Gap A, pero cambian UX / ciclo de vida por encima del alcance de una ronda de gap closure"

patterns-established: []

requirements-completed: [ALTA-04]

# Metrics
duration: ~2min (Tasks 1-2, automatizadas) + tiempo de verificación humana (Task 3, no cronometrado)
completed: 2026-08-20
---

# Phase 68 Plan 06: Cierre de gaps BLOCKER — reset-on-open y Enter sobre Cancelar Summary

**SurgeryAppointmentModal resetea el formulario al abrir el Dialog (no sólo al cerrarlo) y InlineCreatePaciente deja de interceptar el Enter dirigido a un botón enfocado, cerrando los dos gaps BLOCKER que 68-VERIFICATION.md dejó abiertos tras 68-05**

## Performance

- **Duration:** ~2 min (Tasks 1-2, automatizadas: commits a las 19:01:16 y 19:01:54) + tiempo de verificación humana (Task 3, no cronometrado por separado)
- **Started:** 2026-08-20 (tras `ec16f9f`, commit del plan)
- **Completed:** 2026-08-20 (Task 3 aprobada por el usuario)
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files modified:** 2

## Accomplishments
- Gap BLOCKER `gaps[0]` / CR-01 de `68-REVIEW.md` cerrado en `SurgeryAppointmentModal`: el formulario se resetea en ambas transiciones del Dialog (antes sólo al cerrar), así que una escritura tardía de un alta abandonada ya no sobrevive a la reapertura del modal — `POST /turnos/cirugia` no puede salir con el `pacienteId` de un paciente que el usuario descartó.
- Gap BLOCKER `gaps[1]` / CR-02 de `68-REVIEW.md` cerrado en `InlineCreatePaciente`: Enter con el foco sobre el botón *Cancelar* ya no dispara el submit — la tecla de descarte deja de crear un `Paciente` real con `dni @unique` global. Cerrado en los tres modales de turno de una sola vez, porque el componente es compartido.
- Regresión guardada: la precarga del paciente desde el flujo CRM sigue funcionando (efecto unificado declarado antes de los seeds) y el candado síncrono `submittingRef` de 68-05 que garantiza un solo `POST /pacientes` queda intacto.

## Task Commits

Each task was committed atomically:

1. **Task 1: Unificar reset y sello de sesión en la apertura de SurgeryAppointmentModal (Gap A / CR-01)** - `4d5d18b` (fix)
2. **Task 2: No interceptar el Enter dirigido a un botón del mini-form (Gap B / CR-02)** - `e53f456` (fix)
3. **Task 3: Verificación humana de los dos gaps BLOCKER** - checkpoint aprobado por el usuario ("todo ok", ver sección de verificación humana abajo), sin commit de código (tarea de sólo verificación)

**Plan metadata:** (este commit — ver abajo)

## Files Created/Modified
- `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx` - Los dos efectos separados (reset sólo al cerrar, sello de generación sólo al abrir) se unificaron en un único `useEffect` con deps `[open, reset]`, declarado antes de los efectos de seed (`defaultDate`, `pacienteIdProp`/CRM). `reset()` + `setPacienteFotoUrl(null)` corren en ambas transiciones; el sello de `dialogSessionRef`/`dialogSession` corre sólo en la apertura, después del reset.
- `frontend/src/components/InlineCreatePaciente.tsx` - `handleKeyDown` obtiene `e.target as HTMLElement` y sale temprano con `if (target.closest("button")) return` antes de `preventDefault()`/`stopPropagation()`, dejando que el botón enfocado (Cancelar o Crear paciente) maneje su propio Enter. El early-return de estado se endureció a `if (isPending || submittingRef.current) return`.

## Decisions Made

Ver `key-decisions` en el frontmatter — resumen:
- Efecto unificado con `reset()` incondicional + `if (open) { sello }`, no `if/else` con resets duplicados.
- Efecto unificado declarado antes de los seeds, por el orden de flush de React y porque `reset()` restaura los `defaultValues` del primer render.
- Guard de botón con `closest("button")`, no `tagName`, por robustez ante nodos internos futuros.
- `submittingRef.current` sumado al early-return de `handleKeyDown` como endurecimiento adicional (no requerido para cerrar el gap, pero consistente con el candado existente).
- `NewAppointmentModal.tsx` no se tocó — su protección es incidental, no por el guard portado; `68-05-SUMMARY.md` afirma que el guard cerró CR-01 "en los tres call sites" y eso es media verdad, dejado anotado para que el próximo verifier no herede la conclusión equivocada.
- No se deshabilitó el botón Cancelar ni se cambió el montaje incondicional de `turnos/page.tsx` — mitigaciones alternativas fuera de alcance de una ronda de gap closure.

## Deviations from Plan

None - plan executed exactly as written. Los dos fixes (Task 1 y Task 2) se implementaron tal como especifica `68-06-PLAN.md`, sin ajustes de alcance. Todas las aserciones automatizadas de `<verify>` de ambas tasks pasaron en la primera corrida (`UNIFIED_EFFECT_OK`, `SEEDS_AFTER_RESET_OK`, `EFFECT_COUNT_OK`, `DEPS_OK`, `ONSELECT_INTACT`, `ALTA06_FENCE_OK`, `BUTTON_GUARD_ORDER_OK`, `BUTTON_GUARD_OK`, `PREVENT_STILL_THERE`, `KEYDOWN_LOCK_OK`, `WR02_LOCK_INTACT`, `BUTTONS_INTACT`, `D12_AND_ALTA06_INTACT`, `FENCES_OK`).

## Issues Encountered

None.

## Verificación humana (Task 3)

El usuario respondió al checkpoint de los cuatro escenarios (A: paciente fantasma no sobrevive a la reapertura del modal de cirugía; B: precarga desde CRM sigue viva; C: Enter sobre Cancelar no crea paciente; D: Enter sobre Crear paciente crea exactamente uno) con la respuesta textual completa:

> "todo ok"

**Nota de honestidad (mismo criterio que `68-05-SUMMARY.md`):** esta fue una **aprobación global, sin desglose por escenario**. El usuario no reportó resultados itemizados por A/B/C/D, no describió observaciones de la pestaña Network (conteo de `POST /pacientes`, ausencia de toast, etc.), y no indicó en qué modal se corrieron los Escenarios C y D (el guion sugiere "Programar cirugía" pero permite cualquiera de los tres). Esos detalles fueron solicitados por el guion del checkpoint (`<how-to-verify>` de la Task 3) pero no fueron provistos. Se registra así, sin completar con detalle no observado ni inventado:

| Escenario | Descripción | Resultado reportado |
|-----------|-------------|----------------------|
| A | Paciente fantasma no sobrevive a la reapertura de "Programar cirugía" tras un alta abandonada | Cubierto por la aprobación global "todo ok" — sin desglose individual |
| B | Precarga desde CRM sigue funcionando (guard de regresión) | Cubierto por la aprobación global "todo ok" — sin desglose individual |
| C | Enter sobre Cancelar cierra el mini-form sin crear paciente | Cubierto por la aprobación global "todo ok" — sin desglose individual; modal usado no especificado |
| D | Enter sobre Crear paciente crea exactamente un paciente | Cubierto por la aprobación global "todo ok" — sin desglose individual; modal usado no especificado |

Sin regresiones ni fallas reportadas por el usuario.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Los dos gaps BLOCKER de `68-VERIFICATION.md` (`gaps[0]`/CR-01 y `gaps[1]`/CR-02) están cerrados con verificación de fuente (todas las aserciones automatizadas del plan) + aprobación humana global. ALTA-04 queda cubierto también en `SurgeryAppointmentModal`, el único de los tres call sites donde el porteo mecánico de 68-05 había dejado abierta la mitad del fix que importaba (reset al abrir).

Este plan **no** marca la Fase 68 como Complete — esa decisión pertenece a la próxima corrida de `/gsd:verify-phase`, que debe re-evaluar contra el código actual (incluyendo la corrección de la premisa falsa de `68-VERIFICATION.md:257` sobre qué call sites estaban expuestos, y ahora también contra estos dos fixes).

**Deferred (sin código asociado, no bloquean el cierre de fase):**
- **WR-01** — `canOfferCreate` confía en `isSuccess` aunque `suggest` haya tragado una excepción (`return []` en el catch).
- **WR-02-Escape** — Escape inerte con la fila "Crear paciente" visible y el mini-form todavía sin abrir.
- **WR-03** — efecto de reset de `NewAppointmentModal` atado a la identidad inestable de `selectedEvent`.
- **WR-04** — el incremento de generación corre después del paint, y el texto del toast de descarte no distingue si la selección vino de la lista. Este plan no cambió esa ventana ni ese texto.
- **WR-05..WR-10 / IN-01..IN-08** — deuda de calidad registrada en `68-REVIEW.md`, no son gaps.
- **ALTA-06 / SC5 / D-08** — aceptado formalmente vía `overrides:` firmado en el frontmatter de `68-VERIFICATION.md`. No es deuda a planificar salvo que el desarrollador revierta el override.
- **Tabla de tracking de `.planning/REQUIREMENTS.md`** — desactualizada (marca sólo ALTA-04 como `[x]`); corregirla quedó fuera del alcance de este plan.
- **Riesgo residual del Escenario A** (documentado en el comentario de `SurgeryAppointmentModal.tsx` y en `68-06-PLAN.md`): el `reset()` vive en un `useEffect` pasivo, no en un `useLayoutEffect`. Queda una ventana teórica de microtask entre el commit de la reapertura y el flush del efecto — inalcanzable a mano, misma clase de ventana que `WR-04` ya rastrea como deuda diferida.

---
*Phase: 68-creaci-n-inline-en-el-autosuggest-frontend*
*Completed: 2026-08-20*
