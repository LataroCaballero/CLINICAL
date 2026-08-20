---
phase: 68-creaci-n-inline-en-el-autosuggest-frontend
verified: 2026-08-20T16:00:00Z
status: gaps_found
score: 12/14 must-haves verified
overrides_applied: 1
overrides:
  - must_have: "El paciente creado inline queda asignado al profesional del contexto activo, igual que en el alta completa (Roadmap SC5 / ALTA-06)"
    reason: >
      Desviación aceptada explícitamente por el desarrollador durante
      /gsd:plan-phase 68 --gaps (ronda anterior), con la consecuencia
      corregida a la vista: el guard "Debe seleccionar un profesional" de
      NewAppointmentModal.tsx / SurgeryAppointmentModal.tsx corta el submit
      del turno, no el POST inline del paciente, que es una mutate()
      independiente. Con este override se acepta que un ADMIN/SECRETARIA en
      vista global (o durante la carga del contexto) pueda crear un paciente
      con profesionalId = null. Carried forward unchanged — 68-05 declaró
      explícitamente esta fence fuera de alcance y el código confirma que
      sigue así (canOfferCreate sin profesionalIdParaAlta, sin guard nuevo en
      el submit). No reabierto en esta ronda.
    accepted_by: "Lautaro Caballero"
    accepted_at: "2026-08-19T00:00:00Z"
re_verification:
  previous_status: gaps_found
  previous_score: 12/14
  gaps_closed:
    - "SC3/ALTA-04 en QuickAppointment: la X del chip deja de ser un no-op (onClear={() => setPaciente(null)} en QuickAppointment.tsx:418), y un resetForm() único corre en los 4 puntos del ciclo de vida del Dialog (abrirDialogTurno :225-229, onOpenChange :390-393, Cancelar :478, camino de éxito de confirmarTurno). Confirmado por lectura directa de fuente."
    - "SC3/ALTA-04 en QuickAppointment, carrera tardía (una continuación de alta abandonada que aterriza DESPUÉS de reabrir y de que el usuario eligió otro paciente a mano): cerrada por el guard de generación de sesión (dialogSessionRef + dialogSession, QuickAppointment.tsx:176-177,225-229,428) — un onSelect sellado en una sesión vieja se descarta con toast.info en vez de pisar la selección vigente. Confirmado por lectura de fuente."
    - "Truth #13 / WR-02 (doble POST /pacientes en Enter sostenido): cerrado estructuralmente vía candado síncrono submittingRef en InlineCreatePaciente.tsx (:96, seteado en :141 antes de cualquier await, liberado en finally :172-173). La verificación humana pendiente de la ronda anterior queda innecesaria — la garantía es demostrable por código."
  gaps_remaining:
    - "El paciente creado inline queda asignado al profesional del contexto activo (ALTA-06/SC5) — sigue sin gate; cubierto por el override firmado, no reabierto."
  regressions: []
gaps:
  - truth: "SC3/ALTA-04 en SurgeryAppointmentModal: el guard de generación de sesión, portado desde QuickAppointment, cierra la misma carrera de paciente-fantasma que en los otros dos call sites"
    status: failed
    reason: >
      Confirmado por lectura directa de código (no heredado de 68-REVIEW.md,
      re-derivado independientemente esta sesión). El guard de generación se
      portó mecánicamente pero SurgeryAppointmentModal es el único de los tres
      modales cuyo efecto de reset está condicionado a `!open`
      (SurgeryAppointmentModal.tsx:139-144: `if (!open) { reset();
      setPacienteFotoUrl(null); }`) — nunca resetea AL ABRIR. El incremento de
      generación (:156-161, `useEffect(() => { if (open) {
      dialogSessionRef.current += 1; setDialogSession(...); } }, [open])`)
      corre en la misma transición de apertura, así que en el ciclo
      cerrar→reabrir la generación SÍ avanza (1→2), pero eso no ayuda: el
      closure viejo aterriza mientras el modal está CERRADO, con la
      generación todavía en el valor de la sesión que lo creó (ref===session,
      ambos siguen en 1 porque no hubo una reapertura previa a la resolución
      del POST) y el guard `dialogSession !== dialogSessionRef.current`
      (:259-269, dentro del `onSelect` del `<AutocompletePaciente>`) da
      `false` → pasa. El closure ejecuta `setValue("pacienteId", X)`,
      `setValue("pacienteNombre", ...)`, `setPacienteFotoUrl(...)` sobre el
      formulario RHF vivo aunque el `DialogContent` esté desmontado (el
      componente padre no se desmonta — confirmado: `page.tsx` monta
      `<SurgeryAppointmentModal>` incondicionalmente, sin `{open && ...}`).
      Al reabrir el modal para OTRA cirugía, ningún efecto resetea (el único
      reset vive en la rama `else`, que sólo corre cuando `open` pasa a
      `false`) — el paciente fantasma sigue precargado, `data.pacienteId` ya
      está poblado, y la validación de `onSubmit` (`if (!data.pacienteId)`)
      no lo detecta porque el campo SÍ tiene un valor, sólo que es el
      equivocado. `confirmarTurno()`/`createMutation.mutate()` puede postear
      `POST /turnos/cirugia` con el `pacienteId` de un alta abandonada, no el
      paciente que el usuario cree estar programando. El botón Cancelar
      (`SurgeryAppointmentModal.tsx:409-416`, `onClick={() =>
      onOpenChange(false)}`) no está deshabilitado durante el alta en vuelo,
      así que la traza completa es alcanzable a mano. Esto es exactamente el
      defecto CR-01 que el plan 68-05 declaró cerrado "en los tres call
      sites" — sólo se cerró en dos.
      Nota: NewAppointmentModal.tsx sí queda protegido, aunque por una razón
      distinta a la que documenta 68-05-SUMMARY.md ("mismo guard, mismo
      mecanismo"): su efecto de reset (:110-133) tiene `open` en su lista de
      dependencias y corre en AMBAS transiciones (abrir y cerrar), no sólo al
      cerrar. Verificado por lectura directa — confirmado funcional, aunque
      es una protección incidental (WR-03 de 68-REVIEW.md señala que ese
      mismo efecto es frágil por otras razones, no relacionadas con este
      gap).
    artifacts:
      - path: "frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx"
        issue: "Efecto de reset en :139-144 sólo corre en la rama `!open` (cierre); no existe una rama equivalente en la apertura. El efecto de generación de sesión (:156-161) avanza en la apertura pero eso no cierra la ventana cerrar→(POST tardío)→reabrir, porque el POST tardío aterriza mientras el modal sigue cerrado con la MISMA generación con la que se creó."
    missing:
      - "Unificar los dos efectos de :139-144 y :156-161 en uno solo que, en la rama `if (open)`, también llame reset() + setPacienteFotoUrl(null) ANTES de incrementar la generación — igual que abrirDialogTurno() hace en QuickAppointment.tsx. El fix debe ir antes de los efectos de seed (defaultDate, pacienteIdProp) para no pisar el precargado legítimo del flujo CRM."
  - truth: "El mini-form de InlineCreatePaciente no crea un paciente cuando el usuario intenta cancelarlo con el teclado (Enter sobre el botón Cancelar)"
    status: failed
    reason: >
      Confirmado por lectura directa de código, no relacionado con el guard
      de generación de sesión — es un defecto independiente y determinista
      (no una carrera), presente en el único componente compartido por los
      tres modales. `handleKeyDown` (`InlineCreatePaciente.tsx:177-185`) está
      montado en el `<div>` contenedor del mini-form (`:188`,
      `onKeyDown={handleKeyDown}`) y hace `e.preventDefault()` sobre
      CUALQUIER Enter que burbujee desde el subárbol, sin mirar
      `e.target`, y a continuación evalúa `if (isPending) return; void
      handleSubmit(onSubmit)();` sin excepción. La activación de un
      `<button>` con Enter es la acción por defecto del evento keydown (el
      click se sintetiza como default action); `preventDefault()` la
      cancela. Consecuencia: un usuario que tabula hasta el botón *Cancelar*
      (`:249-251`, `<Button type="button" ... onClick={onCancel}
      disabled={isPending}>`) y presiona Enter — el gesto estándar para
      activar el botón enfocado — NO dispara `onCancel` (el click nativo
      nunca se sintetiza) y SÍ dispara `handleSubmit(onSubmit)()`, creando el
      paciente. En un sistema clínico con `dni @unique` global esto deja un
      registro real, no removible desde este flujo, atribuido al profesional
      del turno — la tecla que el usuario usa para descartar ejecuta la
      escritura. Reproducible al 100%, en los tres modales por igual (el
      componente es compartido). No fue tocado por el plan 68-05 (fuera de su
      alcance declarado — el plan sólo tocó `submittingRef`/candado
      síncrono).
    artifacts:
      - path: "frontend/src/components/InlineCreatePaciente.tsx"
        issue: "handleKeyDown (:177-185) llama e.preventDefault() sobre todo Enter del subárbol sin verificar si e.target es un <button>, matando la activación nativa de Cancelar y cayendo igual al submit"
    missing:
      - "Verificar (e.target as HTMLElement).closest('button') antes de preventDefault()/stopPropagation()/submit en handleKeyDown, y dejar que el botón enfocado maneje su propio Enter — el fix propuesto en 68-REVIEW.md (CR-02) es directo: `if (target.closest(\"button\")) return;`"
missing_reevaluate_context: false
deferred: []
human_verification: []
---

# Phase 68: Creación Inline en el Autosuggest (Frontend) Verification Report

**Phase Goal:** Que al buscar un paciente que no existe, el usuario pueda crearlo con nombre y DNI ahí mismo y seguir agendando el turno sin cerrar el modal.
**Verified:** 2026-08-20T16:00:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap closure (plan 68-05)

## Goal Achievement

Plan 68-05 closed the two items open at the end of the previous round: it wired `onClear` and a
consolidated `resetForm()` into `QuickAppointment.tsx`'s four Dialog lifecycle points, added a
session-generation guard (`dialogSessionRef` + `dialogSession`) that invalidates a stale `onSelect`
closure from an abandoned in-flight alta instead of letting it overwrite the live selection, ported
that same guard to `NewAppointmentModal.tsx` and `SurgeryAppointmentModal.tsx` (correcting a false
premise in the previous verification pass — all three call sites are mounted unconditionally in
`turnos/page.tsx`, not just `QuickAppointment`), and added a synchronous `submittingRef` lock in
`InlineCreatePaciente.tsx` that closes the same-tick double-submit window a `useState`-based
`isPending` guard could not. All four of these claims are confirmed by direct source reading in this
session, not accepted from SUMMARY.md.

**However, a fresh adversarial code review (`68-REVIEW.md`, run after 68-05, status: issues_found)
surfaced two BLOCKER defects that this verification confirms independently against source and that
directly contradict 68-05-SUMMARY.md's closure claim ("el guard... se portó a los tres call sites").**
Both are re-derived from the actual files below, not inherited as conclusions:

1. **`SurgeryAppointmentModal.tsx` is the one of the three modals whose form-reset effect only fires
   on close (`if (!open) { reset(); ... }`, :139-144), never on open.** The session-generation guard
   was ported mechanically without re-deriving this modal's specific lifecycle, so it protects exactly
   the case that was already safe and leaves open the case that matters: an alta abandoned in-flight,
   whose `POST /pacientes` resolves *after* the Dialog is closed, writes into the closed (but still
   mounted) RHF form because the generation hasn't advanced since the sale — and on the next reopening,
   nothing resets it. A phantom patient can ride into a *different* surgery submission. `QuickAppointment`
   avoids this because `abrirDialogTurno()` resets on open; `NewAppointmentModal` avoids it only because
   its unrelated reset effect happens to list `open` in its dependency array. This is exactly the failure
   class the phase's ALTA-04 success criterion is meant to close, now isolated to one of the three call
   sites instead of all three — the phase cannot claim ALTA-04 is closed across the three modals.

2. **`InlineCreatePaciente.tsx`'s `handleKeyDown` calls `e.preventDefault()` on every bubbled Enter
   without checking the event target**, so pressing Enter while the *Cancelar* button is focused kills
   the button's native click synthesis and falls through to `handleSubmit(onSubmit)()` anyway — Enter on
   Cancel creates the patient. This is fully deterministic (not a race), reachable in all three modals
   (the component is shared), and was never in 68-05's scope.

Per the decision tree, any FAILED must-have blocks a `passed` status regardless of the two closed items.
This phase remains `gaps_found`.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1/ALTA-01: búsqueda sin resultados muestra fila "Crear paciente" en vez de popover vacío | ✓ VERIFIED | `AutocompletePaciente.tsx` unchanged since prior pass, re-confirmed |
| 2 | SC2/ALTA-03: precarga DNI si el query es todo dígitos, Nombre si es texto | ✓ VERIFIED | `InlineCreatePaciente.tsx` `buildPrefill` unchanged |
| 3 | SC3/ALTA-04 (happy path, los 3 modales): crear el paciente lo deja seleccionado y el turno se confirma sin pasos extra | ✓ VERIFIED | `onCreated={(pac) => { onSelect(pac); ... }}` unchanged, `AutocompletePaciente.tsx` |
| 3b | SC3/ALTA-04 en `QuickAppointment` (gap previo, ahora cerrado): cerrar el Dialog en vuelo no deja un chip irremovible/huérfano; carrera tardía descartada con aviso | ✓ VERIFIED | `onClear={() => setPaciente(null)}` (:418), `resetForm()` en 4 puntos (:225-229 abrir, :390-393 cerrar, :478 confirmar, Cancelar), guard `dialogSession !== dialogSessionRef.current` (:428) — todo confirmado por lectura directa |
| 3c | SC3/ALTA-04 en `SurgeryAppointmentModal`: el guard de generación cierra la misma carrera que en `QuickAppointment` | ✗ FAILED | Ver gap arriba — reset condicionado a `!open` (:139-144), sin reset al abrir; guard deja pasar un closure de alta abandonada que aterriza con el modal cerrado (CR-01 de `68-REVIEW.md`, re-derivado) |
| 3d | SC3/ALTA-04 en `NewAppointmentModal`: la carrera tardía queda cerrada | ✓ VERIFIED (protección incidental) | El efecto de reset (:110-133) lleva `open` en deps y corre también al abrir; confirmado por lectura directa. Nota: WR-03 de `68-REVIEW.md` señala fragilidad no relacionada a este gap (identidad inestable de `selectedEvent`) |
| 4 | SC4/ALTA-05: DNI duplicado muestra error inline bajo el campo, conservando lo cargado | ✓ VERIFIED | `InlineCreatePaciente.tsx:167-170` (`status === 409` → `setError("dni", ...)`), unchanged |
| 5 | SC5/ALTA-06 (profesional resuelto): paciente creado bajo el profesional del contexto activo | ✓ VERIFIED | `profesionalIdParaAlta={...}` idéntico al payload del turno en los 3 call sites |
| 5b | SC5/ALTA-06 (profesional no resuelto) | PASSED (override) | Override firmado carried forward, ver frontmatter |
| 6 | SC6/ALTA-07: mini-form en los 3 modales de turno, ausente en `PatientFilters`/`data-table-toolbar` | ✓ VERIFIED | `grep -rn 'allowCreate\|profesionalIdParaAlta'` en ambos call sites de filtro = 0, re-confirmado |
| 7 | ALTA-02: paciente creable con sólo Nombre + DNI (Teléfono opcional) | ✓ VERIFIED | Zod schema unchanged |
| 8 | D-13/D-14: `AutocompletePaciente.tsx` no fue tocado por 68-05 (declarado fuera de alcance) | ✓ VERIFIED | `git status --porcelain -- frontend/src/components/AutocompletePaciente.tsx` vacío |
| 9 | Frontera de fase: sin archivos de backend tocados | ✓ VERIFIED | `git diff --name-only 321929d^..HEAD -- . ':!.planning/'` lista exactamente los 6 archivos frontend declarados; `git status --porcelain backend/src` vacío |
| 10 | ALTA-01..07 todos reclamados por algún plan (sin huérfanos) | ✓ VERIFIED | Unión de `requirements:` en 68-01..05 = {ALTA-01..07} |
| 11 | Truth #13 previa / WR-02: Enter repetido/sostenido no dispara `POST /pacientes` concurrentes | ✓ VERIFIED | `submittingRef` (`InlineCreatePaciente.tsx:96`), seteado en `:141` antes de cualquier `await`, liberado en `finally` (:172-173). Guard síncrono, cierra la ventana de mismo-tick que el `isPending` de `useState` no cerraba. Confirmado por lectura directa — la verificación humana pendiente de la ronda anterior ya no es necesaria |
| 12 | Enter sobre el botón Cancelar del mini-form no crea el paciente | ✗ FAILED | Ver gap arriba — `handleKeyDown` (:177-185) hace `preventDefault()` sobre todo Enter sin mirar el target, mata la activación nativa de *Cancelar* y cae al submit igual (CR-02 de `68-REVIEW.md`, re-derivado, 100% determinista) |

**Score:** 12/14 truths resolved favorably (10 VERIFIED + 1 PASSED-override + 1 that flips from
UNCERTAIN to VERIFIED since the prior pass), **2 FAILED (BLOCKER)** — one carried forward under a new
guise (CR-01 migrated from `QuickAppointment` to `SurgeryAppointmentModal`), one newly found
(CR-02, independent of the session-generation work).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/app/dashboard/components/QuickAppointment.tsx` | `onClear` + `resetForm()` en 4 puntos + guard de generación | ✓ VERIFIED | Todas las piezas presentes y wired, confirmado línea por línea |
| `frontend/src/components/InlineCreatePaciente.tsx` | Candado síncrono `submittingRef` | ✓ VERIFIED | Presente, guard antes del `await`, liberado en `finally` |
| `frontend/src/components/InlineCreatePaciente.tsx` | `handleKeyDown` no debe interceptar Enter dirigido a un botón | ✗ STUB (defecto no atendido) | `:177-185` sigue interceptando todo Enter sin mirar `e.target`; el plan 68-05 no tocó esta función (fuera de su alcance declarado) |
| `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx` | Guard de generación + `onClear` (ya existente) | ✓ VERIFIED | `dialogSessionRef`/`dialogSession` presentes (:87-88,145-150), efecto de reset protege por accidente vía dep `open` |
| `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx` | Guard de generación + reset simétrico al de los otros dos call sites | ⚠️ STUB PARCIAL | Guard presente (:156-161,259-269) pero sin reset-on-open — la mitad del fix que cierra la carrera real está ausente |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `QuickAppointment.tsx` `<AutocompletePaciente>` | `onClear` | `onClear={() => setPaciente(null)}` (:418) | ✓ WIRED | Confirmado |
| `QuickAppointment.tsx` Dialog lifecycle | `resetForm()` | 4 puntos de invocación (:225-229, :390-393, :478, `abrirDialogTurno`) | ✓ WIRED | Confirmado, único helper de apertura (`setOpen(true)` aparece 1 vez) |
| `SurgeryAppointmentModal.tsx` apertura del Dialog | reset del formulario | — | ✗ NOT WIRED | El único reset vive en la rama `!open` (:139-144); no hay contraparte en `if (open)` |
| `InlineCreatePaciente.tsx onSubmit` | `useCreatePaciente` (POST /pacientes) | `submittingRef` guard antes de `await mutateAsync` | ✓ WIRED | Confirmado, `finally` libera en las 3 salidas |
| `InlineCreatePaciente.tsx handleKeyDown` | botón Cancelar (`e.target`) | — | ✗ NOT WIRED | `handleKeyDown` no distingue el target; Enter enfocado en Cancelar cae al submit |
| `AutocompletePaciente`'s create gate | `profesionalIdParaAlta` | `canOfferCreate` | ✗ NOT WIRED (aceptado por override) | Sin cambios respecto a la ronda anterior |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ALTA-01 | 68-02 | Ver opción de crear cuando no hay resultados | ✓ SATISFIED | Sin cambios |
| ALTA-02 | 68-01 | Crear cargando sólo nombre y DNI | ✓ SATISFIED | Sin cambios |
| ALTA-03 | 68-01, 68-02 | Precarga del campo correspondiente | ✓ SATISFIED | Sin cambios |
| ALTA-04 | 68-02, 68-03, 68-04, 68-05 | Selección automática + confirmar turno sin pasos extra, en los tres modales | ⚠️ PARTIALLY SATISFIED | Cerrado en `QuickAppointment`/`NewAppointmentModal`; **`SurgeryAppointmentModal` tiene el mismo defecto estructural (CR-01) sin cerrar**; además el Enter-sobre-Cancelar (CR-02) compromete el flujo de creación en los tres modales |
| ALTA-05 | 68-01 | Error de DNI duplicado inline, sin perder lo cargado | ✓ SATISFIED | Sin cambios |
| ALTA-06 | 68-01, 68-03 | Paciente creado bajo el profesional del contexto activo | PASSED (override) | Ver frontmatter `overrides:`, carried forward |
| ALTA-07 | 68-02, 68-03 | Disponible en los 3 modales de turno, ausente en los 2 usos de filtro | ✓ SATISFIED | Fence re-auditado esta sesión, intacto |

**Nota sobre `.planning/REQUIREMENTS.md`:** la tabla de tracking de ese archivo marca sólo `ALTA-04`
como `[x]` y el resto como `[ ]` pendientes, pese a que esta y la verificación anterior confirman
ALTA-01/02/03/05/06/07 satisfechos por código. Esa tabla es un artefacto de tracking manual/lag, no una
fuente de verdad — no se corrige acá (fuera del alcance del verifier), pero se deja anotado porque
diverge de la evidencia de código.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `SurgeryAppointmentModal.tsx` | 139-144, 156-161, 259-269 | Reset del formulario condicionado sólo a `!open`; guard de generación sin reset simétrico en la apertura | 🛑 Blocker | Chip fantasma + posible `POST /turnos/cirugia` con `pacienteId` equivocado tras una carrera cerrar→(POST tardío)→reabrir (CR-01, migrado) |
| `InlineCreatePaciente.tsx` | 177-185 | `handleKeyDown` intercepta Enter sin mirar `e.target`, matando la activación nativa de botones enfocados | 🛑 Blocker | Enter sobre *Cancelar* crea el paciente en vez de descartarlo (CR-02) |
| `AutocompletePaciente.tsx` | 53-58, 61-64 | `canOfferCreate` confía en `isSuccess` que el backend produce incluso cuando `suggest` tragó una excepción (`return []` en el catch) | ⚠️ Warning (diferido, WR-01 de `68-REVIEW.md`) | Riesgo de duplicado real de un paciente existente si `suggest` falla silenciosamente; no bloquea el goal de esta fase, backend preexistente |
| `AutocompletePaciente.tsx` | 62-64, 121-137 | Escape queda inerte con la fila "Crear paciente" visible pero el mini-form aún sin abrir (regresión de esta fase vs. comportamiento previo) | ⚠️ Warning (diferido, WR-02 de `68-REVIEW.md`, ya diferido desde 68-04 bajo otro número) | No bloquea el goal, deuda registrada |
| `NewAppointmentModal.tsx` | 110-133 | Efecto de reset atado a `selectedEvent`, cuyo padre lo reconstruye como objeto literal en cada render — puede borrar un `pacienteId` recién creado en un re-render no relacionado | ⚠️ Warning (diferido, WR-03 de `68-REVIEW.md`) | Mitigado hoy por `staleTime`/`refetchOnWindowFocus: false`, no por diseño; no bloquea el goal de esta fase |
| Varios (`InlineCreatePaciente.tsx`, `AutocompletePaciente.tsx`, `useCreatePaciente.ts`, `QuickAppointment.tsx`) | — | WR-05 a WR-10, IN-01 a IN-08 de `68-REVIEW.md` (a11y, `any` sin validar en la frontera, `dni @unique` global, falta `ValidationPipe`, etc.) | ℹ️ Info / Warning (diferidos) | Deuda de calidad registrada, no gaps de esta fase |

No `TBD`/`FIXME`/`XXX` sin referencia formal encontrados en los 6 archivos del diff de la fase.

### Behavioral Spot-Checks

Sin runner de tests en `frontend/` (`package.json` scripts = dev/build/start/lint).
- `cd frontend && npx tsc --noEmit` → exit 0, sin output. Confirmado en esta sesión.
- `git diff --name-only 321929d^..HEAD -- . ':!.planning/'` → exactamente los 6 archivos frontend
  declarados por el orquestador, cero archivos de `backend/`. Confirmado en esta sesión.
- `git status --porcelain backend/src` → vacío. Confirmado en esta sesión.
- Los dos BLOCKERS (CR-01, CR-02) se confirmaron por lectura directa de código y son deterministas o
  estructuralmente alcanzables (no requieren ejecutar la app para probar su existencia) — no se marcan
  como "needs human", se marcan como FAILED con evidencia de código.

### Probe Execution

No aplica — fase de UI de frontend sin probes declarados ni convencionales
(`scripts/*/tests/probe-*.sh` no encontrados relacionados a esta fase).

### Human Verification Required

Ninguno. Los dos gaps de esta ronda están confirmados de forma concluyente por lectura de código
(uno es una traza de estado alcanzable paso a paso; el otro es determinista, no depende de timing).
El ítem de verificación humana de la ronda anterior (conteo de `POST /pacientes` en Enter sostenido)
queda cerrado por el candado síncrono `submittingRef` y no se re-abre.

### Gaps Summary

**Dos gaps BLOCKER, ambos independientes del trabajo cerrado por 68-05, y ambos con fix acotado a
menos de 10 líneas cada uno:**

1. **`SurgeryAppointmentModal.tsx` no resetea el formulario al abrir el Dialog** — el guard de
   generación de sesión que 68-05 portó desde `QuickAppointment` protege sólo cuando hay un reset con
   el que sincronizarse, y este modal es el único de los tres sin esa mitad del fix. Es la misma clase
   de defecto que motivó todo el plan 68-05 (CR-01), ahora aislado a un solo call site en vez de los
   tres. El fix es unificar los dos efectos de `:139-144`/`:156-161` en uno solo que resetee también en
   la rama `if (open)`, antes de sellar la nueva generación — el mismo patrón que `abrirDialogTurno()`
   ya implementa en `QuickAppointment.tsx`.

2. **Enter sobre el botón *Cancelar* del mini-form crea el paciente en vez de cancelar** — defecto
   nuevo, determinista, no relacionado con el guard de generación, presente en los tres modales porque
   `InlineCreatePaciente` es compartido. `handleKeyDown` intercepta cualquier Enter del subárbol sin
   mirar el target. El fix es agregar una guarda de `e.target.closest("button")` antes de
   `preventDefault()`.

**Esto no parece intencional en ninguno de los dos casos** — no hay ninguna decisión de
`68-CONTEXT.md` ni ningún fence de plan que contemple dejar `SurgeryAppointmentModal` sin reset al
abrir, ni que contemple el comportamiento de Enter sobre Cancelar. Ambos son candidatos directos a un
plan de gap closure, no a un override.

```yaml
overrides:
  - must_have: "SC3/ALTA-04 en SurgeryAppointmentModal: el guard de generación de sesión cierra la carrera de paciente-fantasma igual que en los otros dos call sites"
    reason: "{por qué esta desviación es aceptable, entendiendo el riesgo de programar una cirugía al paciente equivocado}"
    accepted_by: "{nombre}"
    accepted_at: "{timestamp ISO}"
  - must_have: "Enter sobre el botón Cancelar del mini-form no crea el paciente"
    reason: "{por qué esta desviación es aceptable, entendiendo que crea un registro de paciente real, no removible desde este flujo, cuando el usuario intenta descartar}"
    accepted_by: "{nombre}"
    accepted_at: "{timestamp ISO}"
```

Si no se aceptan los overrides, ambos fixes son acotados y ya están completamente especificados en
`68-REVIEW.md` (secciones CR-01 y CR-02, con diffs propuestos).

---

_Verified: 2026-08-20T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
