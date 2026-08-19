---
phase: 68-creaci-n-inline-en-el-autosuggest-frontend
plan: 04
subsystem: ui
tags: [react, tanstack-query, radix, autosuggest, mutateAsync]

# Dependency graph
requires:
  - phase: 68-01/68-02/68-03
    provides: Mini-form de alta inline dentro del autosuggest de paciente (creating, canOfferCreate, D-13/D-14 base)
provides:
  - "Éxito/error del alta inline resistente al desmontaje (mutateAsync + await, closure de JS en vez de callbacks de MutationObserver)"
  - "Guard de isPending contra Enter repetido (WR-02 cerrado, 1 POST por submit)"
  - "Guard de Escape en vuelo (createPending) que impide que el mini-form se cierre mientras el alta está en curso, sin alterar el bloqueo del Dialog contenedor (D-13)"
affects: [69-consistencia-de-telefono-opcional-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "mutateAsync + try/catch local en vez de callbacks de nivel mutate() para sobrevivir al desmontaje de React (TanStack Query v5 destruye el MutationObserver, no el closure del await)"
    - "Reporte de isPending del hijo al padre vía prop callback (onPendingChange) con cleanup en useEffect para no dejar estado colgado tras desmontaje"

key-files:
  created: []
  modified:
    - frontend/src/components/InlineCreatePaciente.tsx
    - frontend/src/components/AutocompletePaciente.tsx

key-decisions:
  - "Capa 1 (bloquear el descarte que se controla) + Capa 2 (hacer el éxito resistente al desmontaje) — dos defensas independientes, no una sola. Capa 2 cubre el residuo aceptado T-68-04 (cierre del Dialog contenedor)."
  - "onEscapeKeyDown sigue haciendo preventDefault()/stopPropagation() antes de cualquier chequeo de pending; la protección real contra el Dialog es el short-circuit isHighestLayer de Radix + preventDefault(), no stopPropagation() (atribución corregida por IN-03 de 68-REVIEW.md)"
  - "Gap #1 / ALTA-06 / CR-02 permanece con el override aceptado: canOfferCreate sin profesionalIdParaAlta, submit sin guard de profesionalId falsy"

patterns-established:
  - "Prop onPendingChange (setter de estado pasado directo, no arrow inline) para exponer isPending de un mini-form hijo a un padre que controla el descarte por teclado"

requirements-completed: [ALTA-04]

# Metrics
duration: "~5min (continuación; Tasks 1-2 ejecutadas en sesión previa)"
completed: 2026-08-19
---

# Phase 68 Plan 04: Gap-closure — descarte en vuelo del alta inline Summary

**Alta inline resistente al desmontaje (mutateAsync + await sobrevive al cierre del mini-form o del Dialog) y Escape bloqueado mientras el POST /pacientes está en vuelo, cerrando el gap #2 de 68-VERIFICATION.md sin regresionar D-13/D-14 ni el override de ALTA-06.**

## Performance

- **Duration:** ~5 min en esta sesión de continuación (Tasks 1 y 2 fueron ejecutadas y commiteadas en la sesión previa, ~19:11 ART del 2026-08-19; esta sesión sólo cierra Task 3 con la aprobación del usuario y escribe este Summary)
- **Started (Tasks 1-2):** 2026-08-19T19:11:14-03:00 (commit 829cdf6)
- **Completed (Task 2):** 2026-08-19T19:11:46-03:00 (commit 37e74ec)
- **Continuation session:** 2026-08-19T22:14Z
- **Tasks:** 3/3 (2 `auto` + 1 `checkpoint:human-verify`)
- **Files modified:** 2

## Accomplishments
- `InlineCreatePaciente.tsx`: `onSubmit` pasa de `mutate(payload, {onSuccess, onError})` a `await mutateAsync(payload)` dentro de un `try`/`catch` local — el toast de éxito y `onCreated(creado)` ahora corren aunque el componente ya se haya desmontado (D-07/ALTA-04 restaurado en el camino de descarte en vuelo).
- Nueva prop `onPendingChange` reporta `isPending` al padre vía `useEffect` con cleanup, para que `AutocompletePaciente` sepa cuándo hay un alta en curso.
- `handleKeyDown` gatea sobre `isPending` después de `preventDefault`/`stopPropagation`, cerrando WR-02 (Enter repetido ya no dispara POSTs concurrentes).
- `AutocompletePaciente.tsx`: estado `createPending` alimentado por `onPendingChange={setCreatePending}`; `onEscapeKeyDown` corta con `if (createPending) return` antes de `setCreating(false)`, sin tocar el orden ni el comportamiento de `preventDefault`/`stopPropagation` que protege al Dialog contenedor (D-13).
- Comentario de `onEscapeKeyDown` corregido para atribuir la protección del Dialog al short-circuit `isHighestLayer` de Radix + `preventDefault()`, no a `stopPropagation()` (IN-03 de 68-REVIEW.md).

## Task Commits

Each task was committed atomically:

1. **Task 1: Hacer el éxito/error del alta inline resistente al desmontaje y bloquear el Enter en vuelo** - `829cdf6` (feat)
2. **Task 2: Bloquear el descarte por Escape mientras el alta está en vuelo** - `37e74ec` (feat)
3. **Task 3: Verificación humana del descarte en vuelo (isPending=true)** - checkpoint, sin código; ver "Evidencia del checkpoint humano" abajo.

**Plan metadata:** (ver commit de este SUMMARY)

## Files Created/Modified
- `frontend/src/components/InlineCreatePaciente.tsx` - `mutateAsync` + `try`/`catch` local, prop `onPendingChange`, guard `isPending` en `handleKeyDown`.
- `frontend/src/components/AutocompletePaciente.tsx` - estado `createPending`, `onPendingChange={setCreatePending}`, guard `if (createPending) return` en `onEscapeKeyDown`.

## Evidencia del checkpoint humano (Task 3)

El usuario respondió al checkpoint con la palabra literal **"approved"** — una aprobación global, sin desglose por escenario.

**Nota de fidelidad (obligatoria):** el plan pedía explícitamente una tabla A–E con resultado observado por escenario, sin colapsar en un "verificado OK" global, incluyendo para el Escenario C el número exacto de `POST /pacientes` contados en la pestaña Network y para el Escenario E el resultado por cada uno de los tres modales. **Esa evidencia granular no fue provista por el usuario.** La tabla de abajo registra la aprobación recibida por escenario (todos aprobados, ya que la aprobación fue blanket sobre el guion completo de 5 escenarios), pero **no se inventa** ningún número de POST ni se afirma que los tres modales del Escenario E fueron confirmados individualmente — eso no fue reportado.

| # | Escenario | Resultado registrado |
|---|-----------|----------------------|
| A | Escape en vuelo (gap #2, camino principal) | Aprobado por el usuario (aprobación global, sin detalle por paso) |
| B | Cerrar el Dialog del turno en vuelo (Capa 2) | Aprobado por el usuario (aprobación global, sin detalle por paso) |
| C | Enter spam en vuelo (WR-02) | Aprobado por el usuario. **El número exacto de `POST /pacientes` en la pestaña Network NO fue reportado** — no se registra un conteo porque no fue observado/comunicado. |
| D | No regresión de D-13 / D-14 (sin alta en vuelo) | Aprobado por el usuario (aprobación global, sin detalle por paso) |
| E | Repetir A y D en los otros dos modales (Quirúrgico, Turno Rápido) | Aprobado por el usuario. **El desglose por modal NO fue reportado** — no se registra confirmación individual de los tres modales porque no fue itemizada. |

**Interpretación:** la aprobación blanket cierra el checkpoint conforme al `<resume-signal>` del plan ("Escribí 'approved' si los 5 escenarios se comportan como se describe"), que es exactamente lo que el usuario escribió. El plan queda cerrado sobre esa base, dejando constancia honesta de que la evidencia granular (conteo de Network en C, desglose de modales en E) que el `<action>` de la Task 3 pedía registrar no llegó a este nivel de detalle.

## Decisions Made
- Ninguna decisión de diseño nueva en esta sesión de continuación — Task 3 es un checkpoint de verificación sin código, y la aprobación del usuario fue tomada literalmente (blanket "approved"), sin inventar detalle que no fue reportado.
- Ver `key-decisions` en el frontmatter para las decisiones tomadas durante las Tasks 1-2 (sesión previa).

## Deviations from Plan

None - plan ejecutado según lo escrito. Único punto a señalar: el plan pedía que Task 3 registrara la evidencia granular por escenario (conteo de POST en C, desglose de modales en E) y el usuario dio una aprobación global en su lugar; esto se documenta explícitamente arriba en vez de rellenarse con datos no observados. No es una desviación del ejecutor — es una limitación de la evidencia recibida, reportada con honestidad tal como instruyó el usuario.

## Issues Encountered
None.

## Verificación automatizada (re-confirmada en esta sesión de continuación)

1. `cd frontend && npx tsc --noEmit` → exit 0, sin output. ✅
2. `npx eslint src/components/InlineCreatePaciente.tsx` → `errorCount=0`, `warningCount=0` (baseline 0). ✅
3. `npx eslint src/components/AutocompletePaciente.tsx` → `errorCount=2`, `warningCount=3` (baseline ≤2 errors). ✅
4. `git diff --name-only d19435f..HEAD` → exactamente `frontend/src/components/AutocompletePaciente.tsx` y `frontend/src/components/InlineCreatePaciente.tsx`. ✅
5. `git status --porcelain backend/` → `backend/tsconfig.build.tsbuildinfo` y `backend/tsconfig.tsbuildinfo` modificados. **Esto NO es una regresión de esta fase**: ambos archivos ya figuraban modificados en el `git status` al inicio de la conversación (junto con `.DS_Store`), antes de que este plan tocara nada — son artefactos de build de TypeScript que se regeneran solos en cualquier `tsc`/`nest build` local y no forman parte del `files_modified` declarado en el frontmatter del plan. No se stagearon ni se commitearon.
6. `awk '/const canOfferCreate/,/isSuccess;/' src/components/AutocompletePaciente.tsx | grep -c 'profesionalIdParaAlta'` → `0` (override de gap #1 preservado). ✅
7. `grep -c 'Seleccioná un profesional' src/components/InlineCreatePaciente.tsx` → `0` (guard de CR-02 no agregado, conforme al override). ✅
8. `grep -v '^\s*//' src/components/InlineCreatePaciente.tsx | grep -c 'mutate(payload'` → `0` (ya no queda `mutate(payload, {...})`). ✅
9. `grep -c 'allowCreate\|profesionalIdParaAlta'` → `0` en `PatientFilters.tsx` y `0` en `data-table-toolbar.tsx` (fence de ALTA-07 intacto). ✅
10. Task 3 aprobada por el usuario ("approved") — ver sección "Evidencia del checkpoint humano" arriba para el nivel de detalle real recibido. ✅ (aprobación blanket, no desglosada)

Precondición de la Task 3 (aserciones de fuente que el plan exige correr antes de presentar el checkpoint) — re-confirmadas en esta sesión: `await mutateAsync(payload)` presente en `InlineCreatePaciente.tsx`; `onPendingChange={setCreatePending}` y `if (createPending) return` presentes en `AutocompletePaciente.tsx`.

## Deferred

- **WR-01** — Escape parece inerte en el estado "fila de crear visible, mini-form aún sin abrir" (`AutocompletePaciente.tsx:61-63, 120-128`). Warning, no es un must-have declarado; D-13 está acotado a `creating=true`. No planificado en esta ronda.
- **WR-03** — el campo DNI evita `register()` (`InlineCreatePaciente.tsx:176-185`), así que el `setError("dni", ...)` del 409 no se auto-limpia al retipear. Warning, concern separado. No planificado en esta ronda.
- **Gap #1 / ALTA-06 / CR-02** — aceptado formalmente vía `overrides:` en el frontmatter de `68-VERIFICATION.md`. No es deuda a planificar salvo que el desarrollador revierta el override.
- **T-68-04 (residuo aceptado, threat register del plan)** — cerrar el Dialog contenedor del turno (X / botón Cancelar del modal / overlay) mientras el alta sigue en vuelo todavía desmonta el árbol completo, incluido `InlineCreatePaciente`: la Capa 2 (mutateAsync/await) garantiza que el toast de éxito y la invalidación de `pacientes-suggest` corran igual, pero no hay autoselección posible porque el formulario de turno ya no está en pantalla. Interceptar ese cierre exigiría tocar los tres modales de turno (`NewAppointmentModal`, `SurgeryAppointmentModal`, `QuickAppointment`), fuera de la superficie mínima de este plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ALTA-04 / Roadmap SC3 cerrado también en el camino de descarte en vuelo (Escape bloqueado, éxito resistente al desmontaje, WR-02 cerrado).
- Phase 68 queda con sus 4 planes (01-04) completados; listo para verificación de fase.
- Sin bloqueos para Phase 69 (Consistencia de Teléfono Opcional Frontend), que es independiente de este cierre.

---
*Phase: 68-creaci-n-inline-en-el-autosuggest-frontend*
*Completed: 2026-08-19*
