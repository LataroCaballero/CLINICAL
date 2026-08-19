---
phase: 68-creaci-n-inline-en-el-autosuggest-frontend
verified: 2026-08-19T23:10:00Z
status: gaps_found
score: 12/14 must-haves verified
overrides_applied: 1
overrides:
  - must_have: "El paciente creado inline queda asignado al profesional del contexto activo, igual que en el alta completa (Roadmap SC5 / ALTA-06)"
    reason: >
      Desviación aceptada explícitamente por el desarrollador durante
      /gsd:plan-phase 68 --gaps, con la consecuencia corregida a la vista: se
      confirmó que la premisa de D-08 (68-CONTEXT.md) es falsa — el guard
      "Debe seleccionar un profesional" de NewAppointmentModal.tsx:131 /
      SurgeryAppointmentModal.tsx:178 corta el submit del turno, no el POST
      inline del paciente, que es una mutate() independiente. Con este override
      se acepta que un ADMIN/SECRETARIA en vista global (o durante la carga del
      contexto) pueda crear un paciente con profesionalId = null: el registro
      queda invisible a toda lectura profesional-scoped (suggest, getKanban,
      obtenerListaPacientes) y su DNI queda quemado contra un alta correcta
      posterior (409). No se planifica remediación para ALTA-06 en esta ronda de
      gap closure; sólo se cierra el gap #2 (pérdida silenciosa del paciente
      creado ante desmontaje in-flight).
    accepted_by: "Lautaro Caballero"
    accepted_at: "2026-08-19T00:00:00Z"
re_verification:
  previous_status: gaps_found
  previous_score: 10/12
  gaps_closed:
    - "El feedback post-creación (toast + selección automática, D-07) ocurre de forma confiable incluso si el usuario descarta el mini-form (Escape) o cierra el Dialog del turno mientras el POST está en vuelo — cerrado por 68-04 (mutateAsync + try/catch local, createPending + guard en onEscapeKeyDown). Confirmado por lectura directa de fuente, no sólo por la SUMMARY."
  gaps_remaining:
    - "El paciente creado inline queda asignado al profesional del contexto activo (ALTA-06/SC5) — sigue sin gate; cubierto por el override firmado arriba, no reabierto."
  regressions: []
gaps:
  - truth: "SC3/ALTA-04 en QuickAppointment: cerrar el Dialog del turno mientras el alta está en vuelo no deja un paciente pre-seleccionado, huérfano de un turno distinto, que además no se puede quitar con la X"
    status: failed
    reason: >
      Confirmado por lectura directa de código (no heredado de 68-REVIEW.md,
      re-derivado independientemente esta sesión). QuickAppointment.tsx monta
      <AutocompletePaciente> sin `onClear` (único de los tres call sites que no
      lo pasa — NewAppointmentModal.tsx:219 y SurgeryAppointmentModal.tsx:228 sí
      lo pasan), y `paciente` sólo se resetea en el camino de éxito de
      `confirmarTurno` (:224-229); ni `onOpenChange={setOpen}` (:352) ni el botón
      Cancelar (:419) lo limpian. Antes de 68-04 esto era inofensivo porque un
      alta abandonada en vuelo simplemente se perdía en silencio (gap #2
      original) y nunca llegaba a `onSelect`. El propio arreglo de 68-04 (Capa 2:
      `mutateAsync` + `await` que sobrevive al desmontaje) hace que la
      continuación SÍ corra tras cerrar el Dialog — pero a diferencia de lo que
      documenta el residuo aceptado T-68-04 ("el usuario ve el toast pero el
      paciente no queda seleccionado, porque el formulario ya no está en
      pantalla"), en QuickAppointment el componente padre NO se desmonta al
      cerrar su Dialog interno (sólo se desmonta el `DialogContent` de Radix; el
      panel deslizable que contiene a `QuickAppointment` sigue montado mientras
      `quickAppointmentOpen` sea true en `turnos/page.tsx`). Por eso
      `onCreated → onSelect(pac) → setPaciente(p)` sí corre y sí muta estado
      real: el paciente creado queda seleccionado, pero para el PRÓXIMO turno
      que el usuario abra en ese panel — no el que estaba creando — y sin forma
      de quitarlo (X es no-op). Riesgo confirmado: `confirmarTurno()` puede
      postear un turno con el `pacienteId` equivocado si el usuario no repara en
      el chip precargado.
    artifacts:
      - path: "frontend/src/app/dashboard/components/QuickAppointment.tsx"
        issue: "<AutocompletePaciente> (líneas ~373-379) no recibe onClear; `paciente` sólo se limpia en el camino de éxito de confirmarTurno (:224-229), no en onOpenChange ni en Cancelar (:419)"
    missing:
      - "Agregar onClear={() => setPaciente(null)} al <AutocompletePaciente> de QuickAppointment.tsx, igual que en los otros dos call sites"
      - "Resetear paciente (y el resto del form) en onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}, no sólo en el camino de éxito, para que cerrar el Dialog por X/overlay/Cancelar no deje estado contaminado para la próxima apertura"
missing_reevaluate_context: false
deferred: []
human_verification:
  - test: "Confirmar en vivo (throttling Slow 3G) que un Enter sostenido/repetido en el mini-form de InlineCreatePaciente dispara exactamente un único POST /pacientes en la pestaña Network, en los 3 modales."
    expected: "Un solo POST /pacientes, un solo toast, sin error 409 espurio."
    why_human: >
      El checkpoint humano de la Task 3 de 68-04 recibió una aprobación global
      ('approved') sin el desglose granular que el plan pedía explícitamente
      (conteo exacto de POSTs en el Escenario C, resultado por modal en el
      Escenario E) — documentado con honestidad en 68-04-SUMMARY.md. Por otro
      lado, la traza de código de WR-02 (68-REVIEW.md) muestra que
      `handleSubmit` de RHF es asíncrono (espera al resolver de zod antes de
      invocar `onSubmit`, que es recién donde `isPending` pasa a `true`), así
      que dos Enter en el mismo tick pueden ambos leer `isPending === false` y
      disparar dos POST antes de que el guard de 68-04 (`if (isPending) return`)
      surta efecto. El `@unique` de `dni` acota el daño a un 409 silencioso, no a
      duplicación de pacientes, pero la garantía "un solo POST" que el plan 04
      declaró cerrada no está confirmada de forma concluyente ni por código
      (guard basado en estado, no en un ref síncrono) ni por evidencia humana
      itemizada.
---

# Phase 68: Creación Inline en el Autosuggest (Frontend) Verification Report

**Phase Goal:** Que al buscar un paciente que no existe, el usuario pueda crearlo con nombre y DNI ahí mismo y seguir agendando el turno sin cerrar el modal.
**Verified:** 2026-08-19T23:10:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap closure (plan 68-04)

## Goal Achievement

68-04 closed the previously-identified gap #2 (silent loss of a successfully-created patient on
in-flight dismissal) with a two-layer fix confirmed by direct source reading: `onEscapeKeyDown` now
blocks dismissal while a `createPending` flag is true, and `InlineCreatePaciente`'s success/error
handling moved from `mutate()`-level callbacks (destroyed with the MutationObserver on unmount) to a
local `try`/`catch` around `await mutateAsync(...)` (a JS closure that survives unmount). This is
verified directly in `frontend/src/components/AutocompletePaciente.tsx:121-137` and
`frontend/src/components/InlineCreatePaciente.tsx:118-161`, not merely inferred from the SUMMARY.

Gap #1 (ALTA-06 / orphaned patient when `profesionalIdParaAlta` is null) remains formally accepted
via the signed `overrides:` block from the prior verification pass. It is preserved unchanged — the
override is **not** re-opened here. `canOfferCreate` still omits `profesionalIdParaAlta` and
`InlineCreatePaciente.tsx:135` still posts `profesionalId: profesionalId ?? undefined` with no guard,
exactly as the override describes.

**However, closing gap #2 surfaced a new, distinct defect that neither the original verification nor
68-04's plan anticipated:** `QuickAppointment.tsx` is the one call site (of three) that never passed
`onClear` to `AutocompletePaciente`, and it only resets `paciente` on the turno-submit success path —
not on Dialog close. Before 68-04, an abandoned in-flight creation was lost silently (that was gap #2
itself) and never reached `onSelect`. Now that the success continuation survives unmount by design
(Capa 2), it *does* reach `onSelect(pac) → setPaciente(p)` in `QuickAppointment` even after its Dialog
is closed — because closing that Dialog only unmounts the Radix `DialogContent` portal, not the
`QuickAppointment` component itself (which stays mounted as long as the sliding "Turno rápido" panel
in `turnos/page.tsx` is open). The result is a stale, unremovable patient chip pre-loaded into the
*next* unrelated appointment created from that panel — worse than the residual the plan documented
("no autoselection because the form isn't on screen"), because here the wrong patient *is* selected,
with no way to clear it (`onClear` is absent, so the X button is a no-op). This was independently
re-derived from source in this session (`QuickAppointment.tsx`, `AutocompletePaciente.tsx`), and
corroborates `68-REVIEW.md`'s CR-01 exactly, run after 68-04 and read directly, not inherited as a
conclusion.

This sits on the same declared Roadmap success criterion as the original gap #2 (SC3 / ALTA-04:
"crear el paciente lo deja seleccionado ... y confirmar el turno funciona sin pasos adicionales") and
carries a materially higher risk than the closed gap — a clinic user can submit a turno against the
wrong patient without realizing it. Per the decision tree, this phase cannot be marked `passed`.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1/D-01: búsqueda sin resultados muestra fila "Crear paciente" en vez de popover vacío | ✓ VERIFIED | `AutocompletePaciente.tsx:196-208`, unchanged since prior pass |
| 2 | SC2/D-09/D-10/D-11: precarga DNI si el query es todo dígitos, Nombre si es texto | ✓ VERIFIED | `InlineCreatePaciente.tsx:67-74` (`buildPrefill`), unchanged |
| 3 | SC3/D-07/ALTA-04 (happy path, los 3 modales): crear el paciente lo deja seleccionado y el turno se confirma sin pasos extra | ✓ VERIFIED | `onCreated={(pac) => { onSelect(pac); setQuery(""); setCreating(false); }}` (`AutocompletePaciente.tsx:150-154`); human-verify aprobado en 68-03 |
| 3b | SC3/D-07/ALTA-04 (descarte en vuelo, gap #2 original): Escape en vuelo no cierra el mini-form ni pierde el paciente; el toast/selección corre igual si sobrevive el árbol | ✓ VERIFIED | `onEscapeKeyDown` corta con `if (createPending) return` (`AutocompletePaciente.tsx:132-136`); `onSubmit` usa `await mutateAsync` en `try`/`catch` local (`InlineCreatePaciente.tsx:130-160`), sobrevive al desmontaje. Confirmado por lectura de código, corroborado por CR-01/IN-03 de `68-REVIEW.md` |
| 3c | SC3/ALTA-04 en `QuickAppointment` específicamente: cerrar el Dialog en vuelo no deja un paciente huérfano/irremovible preseleccionado en un turno futuro distinto | ✗ FAILED | Ver gap arriba — `QuickAppointment.tsx` sin `onClear`, reset sólo en el camino de éxito; confirmado por lectura directa (CR-01) |
| 4 | SC4/D-12/ALTA-05: DNI duplicado muestra error inline bajo el campo, conservando lo cargado | ✓ VERIFIED | `InlineCreatePaciente.tsx:155-158` (`status === 409` → `setError("dni", ...)`), unchanged |
| 5 | SC5/D-08/ALTA-06 (profesional resuelto): paciente creado bajo el profesional del contexto activo | ✓ VERIFIED (caso resuelto) | `profesionalIdParaAlta={...}` idéntico al payload del turno en los 3 call sites, unchanged |
| 5b | SC5/D-08/ALTA-06 (profesional no resuelto): creación gateada o registro correctamente asignado incluso con contexto nulo | PASSED (override) | Override firmado, ver frontmatter. `canOfferCreate` sigue sin `profesionalIdParaAlta`, submit sigue sin guard — comportamiento aceptado explícitamente, no reabierto |
| 6 | SC6/ALTA-07: mini-form en los 3 modales de turno, ausente en `PatientFilters`/`data-table-toolbar` | ✓ VERIFIED | `grep -c 'allowCreate\|profesionalIdParaAlta'` = 0 en ambos call sites de filtro, re-confirmado esta sesión |
| 7 | ALTA-01/D-02/D-03: fila de crear sólo a ≥3 caracteres debounceados, tras resolver el fetch | ✓ VERIFIED | `canOfferCreate` expression unchanged (`AutocompletePaciente.tsx:53-58`), confirmado idéntico al plan 04 (prohibición explícita de tocarla, verificada) |
| 8 | ALTA-02: paciente creable con sólo Nombre + DNI (Teléfono opcional) | ✓ VERIFIED | Zod schema unchanged (`InlineCreatePaciente.tsx:45-51`) |
| 9 | D-13/D-14 (creating=true, sin alta en vuelo): Escape cierra sólo el mini-form; click-outside no lo cierra | ✓ VERIFIED | `onEscapeKeyDown`/`onPointerDownOutside` (`AutocompletePaciente.tsx:121-144`), lógica D-13/D-14 preservada, sólo se agregó el early-return de `createPending` |
| 10 | Mini-form nunca renderiza `<form>` ni un botón sin `type`, no puede submitear el `<form>` del turno | ✓ VERIFIED | `grep -c "<form" InlineCreatePaciente.tsx` = 0 (re-confirmado esta sesión); todos los botones `type="button"` |
| 11 | Frontera de fase: sin archivos de backend tocados | ✓ VERIFIED | `git diff --name-only d19435f..HEAD` lista sólo `AutocompletePaciente.tsx`, `InlineCreatePaciente.tsx` y archivos de `.planning/`; `git status --porcelain backend/` sólo tiene ruido preexistente (`tsconfig.build.tsbuildinfo`, `tsconfig.tsbuildinfo`) |
| 12 | ALTA-01..07 todos reclamados por algún plan (sin huérfanos) | ✓ VERIFIED | Unión de `requirements:` en 68-01..04 = {ALTA-01..07} |
| 13 | WR-02 (must-have explícito de 68-04-PLAN): Enter repetido/sostenido no dispara `POST /pacientes` concurrentes | ? UNCERTAIN | Guard `if (isPending) return` presente (`InlineCreatePaciente.tsx:163-171`), pero es un guard de estado, no síncrono: `handleSubmit` de RHF espera al resolver de zod antes de invocar `onSubmit` (que es donde `mutateAsync`/`isPending=true` arranca), dejando una ventana de mismo-tick donde dos Enter pueden ambos leer `isPending===false`. Acotado por `dni @unique` (409 silencioso, no duplicación), pero no cerrado de forma comprobable. Evidencia humana del Escenario C no fue itemizada (ver `68-04-SUMMARY.md`, "Evidencia del checkpoint humano") — ver Human Verification |

**Score:** 12/14 truths resolved favorably (10 VERIFIED + 1 PASSED-override + 1 that flips from FAILED
to VERIFIED since the prior pass), **1 new FAILED (BLOCKER)**, **1 UNCERTAIN (WARNING)**.

### Deferred Items (per 68-04's own scope fence, not re-opened here)

- **WR-01** — Escape es inerte con la fila "Crear paciente" visible pero el mini-form aún sin abrir. Diferido explícitamente; D-13 está acotado a `creating=true`.
- **WR-03** — el campo DNI evita `register()`, el error 409 no se auto-limpia al retipear. Diferido explícitamente.
- **CR-02** (backend, preexistente) — `Paciente.dni` `@unique` global vs `suggest` filtrado por `profesionalId` produce un 409 sin salida de recuperación en escenarios multi-profesional. Preexistente al modelo de datos, esta fase amplía la superficie pero no lo introduce. Fuera de alcance del frontend-only boundary de esta fase.
- **WR-10** (backend, preexistente) — `backend/src/main.ts` no registra `ValidationPipe` global; los decoradores de `CreatePacienteDto` no corren. Preexistente, fuera de alcance de esta fase.
- **WR-04 a WR-09, IN-01 a IN-08** (`68-REVIEW.md`) — warnings/info de calidad (a11y, tipado `any`, foot-guns de dependencias, timers sin cleanup) que no bloquean el goal de la fase; quedan como deuda registrada, no como gaps de este reporte.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/components/InlineCreatePaciente.tsx` | Mini-form resistente al desmontaje, `mutateAsync` + `try`/`catch` | ✓ VERIFIED | 244 líneas; `await mutateAsync(payload)` dentro de `try`, `onPendingChange` presente |
| `frontend/src/components/AutocompletePaciente.tsx` | `createPending` + guard de Escape en vuelo, `canOfferCreate`/D-14 intactos | ✓ VERIFIED | 214 líneas; `createPending` state + `onPendingChange={setCreatePending}` + `if (createPending) return` en `onEscapeKeyDown` |
| `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx` | `onClear` + `allowCreate` + `profesionalIdParaAlta` | ✓ VERIFIED | `onClear` presente (:219), sin cambios en esta ronda |
| `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx` | Idem, sólo rama sin preselección | ✓ VERIFIED | `onClear` presente (:228), sin cambios en esta ronda |
| `frontend/src/app/dashboard/components/QuickAppointment.tsx` | `allowCreate` + `profesionalIdParaAlta` | ⚠️ VERIFIED WITH GAP | Props presentes, pero **sin `onClear`** y sin reset en `onOpenChange`/Cancelar — no tocado por 68-04 (fuera de su alcance declarado), pero es la fuente del nuevo gap (CR-01) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `InlineCreatePaciente.tsx` | `useCreatePaciente.ts` | `await mutateAsync(payload)` en closure local | ✓ WIRED | Sobrevive al desmontaje, confirmado por lectura directa |
| `AutocompletePaciente.tsx` | `InlineCreatePaciente.tsx` | `onPendingChange={setCreatePending}` | ✓ WIRED | Setter de estado pasado directo (identidad estable), efecto con cleanup a `false` |
| `PopoverContent` (Escape) | dismiss layer | `if (createPending) return` antes de `setCreating(false)` | ✓ WIRED | Orden confirmado: `preventDefault`/`stopPropagation` primero, guard de pending después |
| `onCreated` (mini-form) | `onSelect` (call site) | handler inline de `AutocompletePaciente` | ⚠️ PARTIAL en `QuickAppointment` | El handoff funciona técnicamente, pero sin `onClear`/reset en el call site el resultado es un estado contaminado tras cierre en vuelo — ver gap CR-01 |
| `AutocompletePaciente`'s create gate | `profesionalIdParaAlta` | `canOfferCreate` | ✗ NOT WIRED (aceptado por override) | Sin cambios respecto a la ronda anterior |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ALTA-01 | 68-02 | Ver opción de crear cuando no hay resultados | ✓ SATISFIED | Sin cambios |
| ALTA-02 | 68-01 | Crear cargando sólo nombre y DNI | ✓ SATISFIED | Sin cambios |
| ALTA-03 | 68-01, 68-02 | Precarga del campo correspondiente | ✓ SATISFIED | Sin cambios |
| ALTA-04 | 68-02, 68-03, 68-04 | Selección automática + confirmar turno sin pasos extra | ⚠️ PARTIALLY SATISFIED | Descarte en vuelo cerrado en `NewAppointmentModal`/`SurgeryAppointmentModal`; **`QuickAppointment` tiene un defecto nuevo (CR-01)** que puede seleccionar el paciente equivocado en un turno futuro |
| ALTA-05 | 68-01 | Error de DNI duplicado inline, sin perder lo cargado | ✓ SATISFIED | Sin cambios |
| ALTA-06 | 68-01, 68-03 | Paciente creado bajo el profesional del contexto activo | PASSED (override) | Ver frontmatter `overrides:` |
| ALTA-07 | 68-02, 68-03 | Disponible en los 3 modales de turno, ausente en los 2 usos de filtro | ✓ SATISFIED | Fence re-auditado esta sesión, intacto |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `QuickAppointment.tsx` | ~373-379, 224-229, 352, 419 | `<AutocompletePaciente>` sin `onClear`; `paciente` sólo se resetea en el camino de éxito | 🛑 Blocker | Chip de paciente irremovible + posible turno con `pacienteId` equivocado tras cierre en vuelo (CR-01) |
| `InlineCreatePaciente.tsx` | 163-171 | Guard `isPending` en `handleKeyDown` es de estado, no síncrono; `handleSubmit` de RHF es async | ⚠️ Warning | Ventana de mismo-tick para doble `POST /pacientes` en Enter sostenido; acotada por `dni @unique` (WR-02, no cerrado del todo pese a lo declarado en 68-04) |
| `AutocompletePaciente.tsx` | 61-63, 121-137 | Búsqueda con `allowCreate` deja Escape inerte cuando la fila está visible pero el mini-form no está abierto | ⚠️ Warning (diferido) | WR-01, ya diferido explícitamente por 68-04 |
| `InlineCreatePaciente.tsx` | 199-208 | Campo DNI no pasa por `register()`, error 409 no se auto-limpia al retipear | ⚠️ Warning (diferido) | WR-03, ya diferido explícitamente por 68-04 |
| `AutocompletePaciente.tsx` / `pacientes.service.ts` | — | `dni @unique` global vs `suggest` filtrado por profesional | ℹ️ Info (preexistente) | CR-02, fuera de alcance frontend-only, deuda de backend |
| `main.ts` | — | Sin `ValidationPipe` global | ℹ️ Info (preexistente) | WR-10, fuera de alcance frontend-only, deuda de backend |

No `TBD`/`FIXME`/`XXX` sin referencia formal encontrados en los archivos tocados por esta fase.

### Behavioral Spot-Checks

Sin runner de tests en `frontend/`. Gates ya corridos y reportados por el orquestador (no re-ejecutados
en esta pasada, per instrucción explícita):
- `npx next build`: exit 0, 33 rutas prerenderizadas (requiere Node ≥20.9; el shell default 18.20.8 no
  corre el build — limitación de entorno, no defecto de código).
- Sin test runner en `frontend/` (`package.json` scripts = dev/build/start/lint).
- Regresión backend: 81/81 specs de la fase 67, igual al baseline documentado.
- Drift de schema: ninguno. Drift de codebase: `warn` sólo en tooling/docs de raíz, no relacionado a esta fase.

### Probe Execution

No aplica — fase de UI de frontend sin probes declarados ni convencionales (`scripts/*/tests/probe-*.sh`
no encontrados relacionados a esta fase).

### Human Verification Required

### 1. Conteo exacto de `POST /pacientes` en Enter sostenido (WR-02, Escenario C de 68-04)

**Test:** Con throttling Slow 3G, abrir el mini-form de creación en cada uno de los 3 modales, cargar
un DNI nuevo y mantener/golpear Enter 5-6 veces desde el campo Teléfono. Contar en la pestaña Network
del navegador cuántos `POST /pacientes` se disparan.
**Expected:** Exactamente un `POST /pacientes`, un solo toast verde, sin error 409.
**Why human:** El guard `if (isPending) return` de 68-04 es de estado (`useState`), y `handleSubmit`
de React Hook Form es asíncrono (espera al resolver de zod antes de invocar `onSubmit`, que es donde
recién arranca `mutateAsync`/`isPending=true`) — hay una ventana de mismo-tick donde dos eventos de
teclado pueden ambos leer `isPending===false`. El checkpoint humano de la Task 3 de 68-04 recibió una
aprobación global sin este conteo específico (documentado honestamente en `68-04-SUMMARY.md`). El
impacto está acotado por `dni @unique` (un 409 silencioso, no duplicación de pacientes), pero la
garantía "un solo POST" declarada cerrada por el plan no está confirmada de forma concluyente.

### Gaps Summary

**Un gap BLOCKER nuevo, surgido como efecto colateral del propio arreglo de 68-04:**

`QuickAppointment.tsx` es el único de los tres call sites que nunca recibió `onClear`, y su `paciente`
sólo se resetea en el camino de éxito de `confirmarTurno()`. Antes de 68-04 esto era inofensivo: un
alta abandonada en vuelo se perdía en silencio (gap #2 original) y nunca llegaba a `onSelect`. La Capa
2 de 68-04 (hacer el éxito resistente al desmontaje vía `mutateAsync` + `await`) es exactamente lo que
convierte esto en un defecto activo: la continuación del `await` sí corre tras cerrar el Dialog interno
de `QuickAppointment` (porque el componente padre no se desmonta — sólo el `DialogContent` de Radix se
desmonta; el panel deslizable que lo contiene sigue montado), así que `setPaciente(p)` muta estado real
sobre un componente vivo. Resultado: un paciente creado durante un alta abandonada queda pre-seleccionado
e irremovible (sin `onClear`, la X es no-op) para el **próximo** turno que el usuario abra en ese panel —
no el que estaba creando —, con riesgo de que `confirmarTurno()` postee el `pacienteId` equivocado.

Esto es peor que el residuo T-68-04 que el plan documentó y aceptó ("el usuario ve el toast pero el
paciente no queda seleccionado, porque el form ya no está en pantalla"): esa afirmación es correcta para
`NewAppointmentModal`/`SurgeryAppointmentModal` (que sí desmontan completos y sí tienen `onClear`), pero
falsa para `QuickAppointment`. El threat model de 68-04 (T-68-04, disposición "accept") no distinguió
esta diferencia estructural entre call sites.

**Esto no parece intencional.** A diferencia del gap #1 (ALTA-06), no hay ninguna decisión de
`68-CONTEXT.md` ni discusión en los planes que contemple este caso — 68-03-PLAN.md sí decidió
explícitamente no pasar `onClear` en `QuickAppointment` ("Este call site no pasa `onClear` y sigue sin
pasarlo"), pero esa decisión se tomó **antes** de que existiera la Capa 2 de 68-04 que hace que la
selección post-cierre sea alcanzable; nada en el registro de decisiones evalúa esa combinación.

```yaml
overrides:
  - must_have: "SC3/ALTA-04 en QuickAppointment: cerrar el Dialog del turno mientras el alta está en vuelo no deja un paciente pre-seleccionado, huérfano de un turno distinto, que además no se puede quitar con la X"
    reason: "{por qué esta desviación es aceptable, entendiendo el riesgo de postear un turno con el pacienteId equivocado}"
    accepted_by: "{nombre}"
    accepted_at: "{timestamp ISO}"
```

Si no se acepta el override, el fix es acotado: agregar `onClear={() => setPaciente(null)}` al
`<AutocompletePaciente>` de `QuickAppointment.tsx` (igual que en los otros dos call sites) y resetear el
formulario en `onOpenChange` (no sólo en el camino de éxito de `confirmarTurno`).

**Adicionalmente, un ítem UNCERTAIN (WARNING) que requiere confirmación humana** antes de dar por cerrado
WR-02 tal como 68-04 lo declaró: ver "Human Verification Required" arriba.

---

_Verified: 2026-08-19T23:10:00Z_
_Verifier: Claude (gsd-verifier)_
