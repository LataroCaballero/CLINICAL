---
phase: 68-creaci-n-inline-en-el-autosuggest-frontend
plan: 05
subsystem: ui
tags: [react, nextjs, react-hook-form, autosuggest, race-condition, gap-closure]

# Dependency graph
requires:
  - phase: 68-04
    provides: "Alta inline resistente al desmontaje (mutateAsync + await) y guard de createPending que bloquea Escape mientras el POST /pacientes está en vuelo"
provides:
  - "onClear cableado en QuickAppointment: la X del chip de paciente deja de ser un no-op"
  - "resetForm() único invocado en los 4 puntos del ciclo de vida del Dialog de turno rápido (abrir/cerrar/cancelar/confirmar)"
  - "Guard de generación de sesión (dialogSessionRef + dialogSession) en los 3 call sites de turno (QuickAppointment, NewAppointmentModal, SurgeryAppointmentModal) que descarta un onSelect sellado en una sesión anterior en vez de pisar la selección vigente"
  - "Candado síncrono submittingRef en InlineCreatePaciente que garantiza exactamente un POST /pacientes por submit"
affects: [69-consistencia-de-tel-fono-opcional-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guard de generación de sesión (useRef + useState pareados) para invalidar closures asíncronos sellados en una apertura anterior de un Dialog/Modal que permanece montado"
    - "Candado síncrono con useRef (no useState) para cerrar ventanas de doble-submit dentro del mismo tick de evento, donde un guard basado en estado de React llega tarde"

key-files:
  created: []
  modified:
    - frontend/src/app/dashboard/components/QuickAppointment.tsx
    - frontend/src/components/InlineCreatePaciente.tsx
    - frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx
    - frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx

key-decisions:
  - "resetForm() no incluye setSelectedTime(null): el slot horario lo elige el usuario en la tarjeta de atrás y el botón Continuar lo exige antes de abrir el Dialog; limpiarlo en la apertura dejaría el Dialog con Hora: — y confirmarTurno() cortaría"
  - "Se agregó la invocación de resetForm() también al abrir (no sólo al cerrar): Radix no dispara onOpenChange en un setOpen(true) programático, así que el reset al cerrar no cubre la reapertura"
  - "El reset por evento no cerraba la carrera tardía (hallazgo del plan-checker); se sumó el guard de generación de sesión porque los resetForm() son snapshots por evento que no pueden anticipar una continuación asíncrona que aterriza después de que ya corrieron"
  - "El guard se portó a los tres modales de turno, no sólo a QuickAppointment: la premisa de 68-VERIFICATION.md:257 (los otros dos se desmontan completos) es falsa — turnos/page.tsx los monta incondicionalmente en :493/:516. Decisión tomada durante /gsd:plan-phase 68 --gaps (iteración 2 del plan-checker), extendiendo el fix en vez de firmar un override de riesgo residual"
  - "SurgeryAppointmentModal no tiene escenario humano propio: mismo cambio línea por línea que NewAppointmentModal, y su camino de alta exige día de cirugía configurado. Queda verificado por aserciones de fuente, no a mano"
  - "El incremento de generación en NewAppointmentModal/SurgeryAppointmentModal vive en un useEffect dedicado con dep [open] (no en un handler propio, porque su apertura la controla el padre por prop). Ventana conocida de un tick entre el flush del efecto y el re-render; modo de falla seguro (descarta con aviso, nunca postea un paciente equivocado)"
  - "El guard usa el par useRef + useState (no sólo un ref): sellar la generación en el closure del render requiere leerla en fase de render, y hacerlo desde ref.current sería leer estado mutable durante el render. El useState la entrega por la vía normal de React sin agregar renders extra"
  - "No se montaron los modales condicionalmente en page.tsx ({open && <Modal/>}) como alternativa: cambiaría el ciclo de vida de dos modales grandes, muy por encima del alcance de una ronda de gap closure"

patterns-established:
  - "Session-generation guard: par useRef (lectura síncrona) + useState (valor sellado en closures del render) para invalidar callbacks asíncronos de una sesión de Dialog/Modal anterior sin desmontar el componente padre"
  - "Synchronous submit lock: useRef seteado antes de cualquier await en la primera línea de un onSubmit async, liberado en finally, para cerrar ventanas de doble-submit que un guard de useState (isPending) no cubre por el delay del resolver de RHF"

requirements-completed: [ALTA-04]

# Metrics
duration: ~15min (Tasks 1-3 automatizadas) + verificación humana (Task 4)
completed: 2026-08-20
---

# Phase 68 Plan 05: Cierre de gaps — chip fantasma y doble submit en los 3 modales de turno Summary

**Guard de generación de sesión en los 3 call sites de turno (QuickAppointment, NewAppointmentModal, SurgeryAppointmentModal) que invalida un `onSelect` de alta abandonada sellado en una sesión anterior, más `onClear` cableado y candado síncrono contra el doble submit del alta inline**

## Performance

- **Duration:** ~15 min (Tasks 1-3, automatizadas) + tiempo de verificación humana (Task 4, no cronometrado por separado)
- **Started:** 2026-08-20T13:51:00-03:00 (aprox., tras `3ac6419`)
- **Completed:** 2026-08-20 (Task 4 aprobada por el usuario)
- **Tasks:** 4 (3 auto + 1 checkpoint:human-verify)
- **Files modified:** 4

## Accomplishments
- Gap BLOCKER (`gaps[0]` / CR-01 de `68-REVIEW.md`) cerrado en `QuickAppointment`: la X del chip de paciente deja de ser un no-op, y ninguna secuencia de cierre/apertura del Dialog —ni la del gap original, ni la carrera tardía encontrada por el plan-checker— puede dejar un `pacienteId` ajeno listo para postear.
- El mismo guard de generación de sesión se portó a `NewAppointmentModal` y `SurgeryAppointmentModal`, corrigiendo la premisa falsa de `68-VERIFICATION.md:257` de que sólo `QuickAppointment` estaba expuesto — los tres se montan incondicionalmente en `turnos/page.tsx`.
- Gap WARNING (truth #13 / WR-02) cerrado de forma estructural: `InlineCreatePaciente` garantiza exactamente un `POST /pacientes` por submit vía un candado síncrono, sin depender de evidencia humana de conteo de requests.

## Task Commits

Each task was committed atomically:

1. **Task 1: Cablear onClear y resetForm() único en QuickAppointment + guard de generación** - `6b45fe1` (fix)
2. **Task 2: Candado síncrono contra el doble submit del alta inline (WR-02)** - `08894f5` (fix)
3. **Task 3: Portar el guard de generación a NewAppointmentModal y SurgeryAppointmentModal** - `bf19afe` (fix)
4. **Task 4: Verificación humana del chip fantasma en los modales de turno** - checkpoint aprobado por el usuario ("ok todo", ver tabla de escenarios abajo), sin commit de código (tarea de sólo verificación)

**Plan metadata:** (este commit — ver abajo)

## Files Created/Modified
- `frontend/src/app/dashboard/components/QuickAppointment.tsx` - `onClear` cableado a `setPaciente(null)`, `resetForm()` único (paciente + tipo de turno + observaciones) invocado al abrir (`abrirDialogTurno()`), al cerrar (`onOpenChange`), al cancelar y en el camino de éxito de `confirmarTurno()`; guard de generación de sesión (`dialogSessionRef` + `dialogSession`) en `onSelect`
- `frontend/src/components/InlineCreatePaciente.tsx` - candado síncrono `submittingRef` en `onSubmit`, seteado antes de cualquier `await` y liberado en `finally`
- `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx` - mismo guard de generación portado, adaptado a `open` por prop (incremento en `useEffect([open])`) y a `setValue` de RHF
- `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx` - mismo guard de generación portado, mismo mecanismo que `NewAppointmentModal`

## Decisions Made

Ver `key-decisions` en el frontmatter — resumen:
- `resetForm()` excluye deliberadamente `selectedTime` (pertenece a la tarjeta de atrás, no al Dialog).
- El reset se invoca también al abrir (Radix no dispara `onOpenChange` en `setOpen(true)` programático).
- El reset por evento no cerraba la carrera tardía; se agregó el guard de generación de sesión (hallazgo del plan-checker en la ronda de planning).
- El guard se portó a los tres modales de turno porque los tres se montan incondicionalmente en `turnos/page.tsx` (la premisa contraria de `68-VERIFICATION.md:257` es falsa).
- `SurgeryAppointmentModal` se verifica por fuente, no a mano (mismo cambio línea por línea, setup de escenario humano costoso).
- El par `useRef` + `useState` (no sólo un ref) es necesario para sellar la generación correctamente en fase de render.
- No se optó por montar los modales condicionalmente en `page.tsx` — fuera de alcance de una ronda de gap closure.

## Deviations from Plan

None - plan executed exactly as written. Las cinco piezas de la Task 1 (a-e), el candado de la Task 2, y el porteo de la Task 3 se implementaron tal como especifica `68-05-PLAN.md`, sin ajustes de alcance.

## Issues Encountered

Durante la Task 1, dos comentarios explicativos agregados junto al guard de generación contenían literalmente el texto `setOpen(true)`, lo que hacía que `grep -c 'setOpen(true)'` devolviera `3` en vez de `1` (la aserción de "única puerta de apertura" de la Task 1). Se reescribieron esos dos comentarios para describir el comportamiento sin repetir el string literal, dejando el conteo en `1` (sólo la invocación real dentro de `abrirDialogTurno()`). No es un deviation de las Reglas 1-4 — fue una corrección de redacción de comentario hecha en el curso normal de pasar la verificación de la propia task, sin cambiar ningún comportamiento de código.

## Verificación humana (Task 4)

El usuario ejecutó los 4 escenarios y respondió "ok todo", con desglose explícito por escenario:

| Escenario | Descripción | Resultado |
|-----------|--------------|-----------|
| A | La X del chip indigo vacía el campo de paciente y restituye el input de búsqueda | PASS |
| B | Alta abandonada en vuelo → cerrar Dialog → reabrir con Continuar → campo de paciente vacío, sin chip heredado | PASS |
| C | Carrera tardía en el panel Turno rápido (Slow 3G): el `POST /pacientes` de un alta abandonada aterriza después de reabrir y elegir otro paciente a mano → la selección manual sobrevive, aparece el toast informativo de descarte | PASS |
| D | Misma carrera tardía en el modal "Nuevo turno" (Slow 3G): la selección manual sobrevive | PASS |

`SurgeryAppointmentModal` **no** tuvo escenario humano propio (por diseño del plan: mismo cambio línea por línea que `NewAppointmentModal`, camino de alta exige día de cirugía configurado) — queda verificado exclusivamente por las aserciones de fuente de la Task 3 (`grep` sobre `dialogSessionRef`, `dialogSessionRef.current += 1`, `dialogSession !== dialogSessionRef.current` y el string del `toast.info`, todas con match confirmado).

Sin issues reportados por el usuario en ninguno de los 4 escenarios.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

ALTA-04 queda cerrado sobre los tres call sites de turno declarados en alcance por `68-CONTEXT.md` (D-07). Los dos gaps abiertos de `68-VERIFICATION.md` (gap BLOCKER `gaps[0]`/CR-01 y gap WARNING truth #13/WR-02) están cerrados con verificación de fuente + verificación humana itemizada. Fase 68 lista para `/gsd:verify-phase` — la afirmación errónea de `68-VERIFICATION.md:257` (que sólo `QuickAppointment` estaba expuesto) debe corregirse en la próxima corrida del verifier, no en este plan.

**Deferred (sin código asociado, no bloquean el cierre de fase):**
- **WR-01** — Escape inerte con la fila "Crear paciente" visible y el mini-form aún sin abrir. Diferido desde 68-04; D-13 está acotado a `creating=true`.
- **WR-03** — el campo DNI evita `register()`, el `setError("dni")` del 409 no se auto-limpia al retipear. Diferido desde 68-04.
- **CR-02 / WR-10** — deuda de backend (`dni @unique` global vs `suggest` filtrado por profesional; falta `ValidationPipe` global en `main.ts`). Preexistentes, fuera de la frontera frontend-only de la fase.
- **WR-04..WR-09 / IN-01..IN-08** — deuda de calidad registrada en `68-REVIEW.md`, no son gaps.
- **Gap #1 / ALTA-06 / D-08** — aceptado formalmente vía `overrides:` en el frontmatter de `68-VERIFICATION.md`. No es deuda a planificar salvo que el desarrollador revierta el override.
- **T-68-05-04** (residuo aceptado) — cerrar el Dialog en vuelo sigue sin agendar el turno; el paciente se crea, se anuncia por toast y queda encontrable, y el formulario arranca limpio la próxima vez.

---
*Phase: 68-creaci-n-inline-en-el-autosuggest-frontend*
*Completed: 2026-08-20*

## Self-Check: PASSED

Todos los archivos declarados (4 archivos frontend modificados + este SUMMARY.md) y los 4 commits de tareas (`6b45fe1`, `08894f5`, `bf19afe`, `65f7019`) se verificaron presentes en el filesystem y en `git log --oneline --all`. Sin items faltantes.
