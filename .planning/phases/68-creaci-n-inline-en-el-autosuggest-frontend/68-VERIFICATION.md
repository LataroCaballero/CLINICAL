---
phase: 68-creaci-n-inline-en-el-autosuggest-frontend
verified: 2026-08-19T21:00:00Z
status: gaps_found
score: 10/12 must-haves verified
overrides_applied: 0
gaps:
  - truth: "El paciente creado inline queda asignado al profesional del contexto activo, igual que en el alta completa (Roadmap SC5 / ALTA-06)"
    status: failed
    reason: >
      canOfferCreate (AutocompletePaciente.tsx:52-57) does not gate on
      profesionalIdParaAlta. In NewAppointmentModal and SurgeryAppointmentModal,
      effectiveProfessionalId can be null (ADMIN/SECRETARIA with no professional
      selected in the global context, or still loading), yet the "Crear paciente"
      row still appears and InlineCreatePaciente.tsx:118 posts
      profesionalId: profesionalId ?? undefined. The only guard against a null
      professional (NewAppointmentModal.tsx:131 / SurgeryAppointmentModal.tsx:178,
      "Debe seleccionar un profesional") fires on TURNO submit, which happens
      strictly after the inline patient POST already succeeded. Result: a
      patient record persists with profesionalId = null, invisible to every
      professional-scoped read (suggest, getKanban, obtenerListaPacientes), and
      the DNI is permanently burned against future correct creation (409).
      68-CONTEXT.md D-08 explicitly discarded blocking creation on a null
      professional on the stated premise that "ese caso ya está cortado aguas
      abajo por NewAppointmentModal.tsx:132" — that premise is false: the
      downstream block only stops the turno, not the patient POST, which is an
      independent mutate() call triggered by the mini-form's own submit.
    artifacts:
      - path: "frontend/src/components/AutocompletePaciente.tsx"
        issue: "canOfferCreate (lines 52-57) omits profesionalIdParaAlta from its gate"
      - path: "frontend/src/components/InlineCreatePaciente.tsx"
        issue: "line 118 silently falls back to profesionalId: undefined with no defense-in-depth check before mutate()"
    missing:
      - "Add `!!profesionalIdParaAlta` to canOfferCreate in AutocompletePaciente.tsx so the create row itself is not offered without a resolved professional"
      - "Add a guard in InlineCreatePaciente.tsx onSubmit (or disable the button) when profesionalId is falsy, with a clear message instead of silently posting profesionalId: undefined"
  - truth: "El feedback post-creación (toast + selección automática, D-07) ocurre de forma confiable siempre que el POST se resuelva con éxito, incluso si el usuario cierra el mini-form o el modal de turno mientras el request está en vuelo"
    status: failed
    reason: >
      onEscapeKeyDown in AutocompletePaciente.tsx:120-128 guards only on
      `creating`, not on InlineCreatePaciente's isPending. The Cancel button IS
      disabled while isPending (InlineCreatePaciente.tsx:212) but Escape is not,
      and the same unmount happens if the user closes the containing Dialog (X /
      Cancel / overlay) mid-request. TanStack Query v5 stores mutate()-level
      callbacks (onSuccess/onError, defined in InlineCreatePaciente.tsx:124-139)
      on the MutationObserver, which is destroyed when the component unmounts;
      those callbacks are confirmed to not fire post-unmount. Net effect
      verified in code: the patient IS created server-side (POST completes,
      and useCreatePaciente.ts's hook-level onSuccess — which lives on the
      Mutation object itself, not the observer — does still invalidate
      ["pacientes"] / ["pacientes-suggest"]), but toast.success and
      onCreated(creado) never run: no selection into the appointment form, no
      visible confirmation. A same-DNI retry then hits the 409
      "Este DNI ya está registrado" with no patient selected — a dead end for
      that specific interaction, defeating "seguir agendando el turno sin
      cerrar el modal" for that path.
    artifacts:
      - path: "frontend/src/components/AutocompletePaciente.tsx"
        issue: "onEscapeKeyDown (lines 120-128) unconditionally calls setCreating(false) while creating, with no isPending guard, unmounting InlineCreatePaciente mid-request"
      - path: "frontend/src/components/InlineCreatePaciente.tsx"
        issue: "onSuccess/onError are passed as mutate()-level callbacks (lines 124-139), which TanStack Query v5 does not guarantee to fire after the owning component unmounts"
    missing:
      - "Lift isPending into AutocompletePaciente (or add an onPendingChange callback from the mini-form) and block Escape dismissal while a create request is in flight, mirroring the existing disabled={isPending} on the Cancel button"
      - "Make success handling resilient to unmount (e.g. mutateAsync + local try/catch, or move toast/selection into the hook-level onSuccess in useCreatePaciente.ts) so a created patient is never dropped silently"
deferred: []
human_verification: []
---

# Phase 68: Creación Inline en el Autosuggest (Frontend) Verification Report

**Phase Goal:** Que al buscar un paciente que no existe, el usuario pueda crearlo con nombre y DNI ahí mismo y seguir agendando el turno sin cerrar el modal.
**Verified:** 2026-08-19T21:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

The phase built the correct architecture and the **happy path works**: a zero/insufficient-result
search offers a "Crear paciente" row, clicking it opens a self-contained mini-form inside the same
popover, submitting it POSTs to `/pacientes`, selects the new patient into the appointment form, and
the turno can be confirmed without closing the modal. This was independently confirmed by direct
code reading of `AutocompletePaciente.tsx` and `InlineCreatePaciente.tsx`, not merely inferred from
SUMMARY.md.

However, two edge paths that a real user will hit — not merely a code reviewer's hypothetical — break
the goal for those paths, and both are directly on the roadmap's declared success criteria (SC3 and
SC5), not incidental code smells:

1. **A patient can be created and permanently orphaned (unassigned to any professional) before the
   app ever tells the user a professional must be selected** (breaks Roadmap SC5 / ALTA-06).
2. **A patient can be created server-side and then silently lost to the UI** if the user presses
   Escape or closes the Dialog while the POST is in flight (breaks Roadmap SC3's "sin pasos
   adicionales" / ALTA-04 for that specific interaction, and burns the DNI for the retry).

Both were independently re-derived from the source files listed in `<files_to_read>` — not inherited
from `68-REVIEW.md`'s conclusions. The review's CR-01 and CR-02 are confirmed accurate.

**On the human-verify checkpoint approval:** the user's "approved" response to Task 3 is real evidence
for the 8-step script as written, and that script exercises the happy path plus the `creating=true`
Escape/click-outside/no-submit scenarios competently. It does **not** exercise either gap here: step 6
tests Escape/click-outside only with the mini-form already open (`creating=true`), never mid-request
(`isPending=true`), and no step in the script puts the tester into a session where
`effectiveProfessionalId` is null before creating a patient. The approval and these two defects are
not mutually exclusive — they cover disjoint scenarios. Per the verification brief, the approval is
not treated as evidence against defects confirmed directly in code.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1/D-01: búsqueda sin resultados muestra fila "Crear paciente" en vez de popover vacío | ✓ VERIFIED | `AutocompletePaciente.tsx:186-198`, row renders conditionally on `canOfferCreate` |
| 2 | SC2/D-09/D-10/D-11: precarga DNI si el query es todo dígitos, Nombre si no, DNI normalizado a dígitos, Nombre capitalizado sólo al precargar | ✓ VERIFIED | `InlineCreatePaciente.tsx:49-68` (`buildPrefill`, `stripSeparators`, `capitalizarNombre`) matches D-09 examples exactly; DNI field uses controlled `watch`/`setValue` with `.replace(/\D/g, "")` (`:176-185`) |
| 3 | SC3/D-07/ALTA-04 (happy path): crear el paciente lo deja seleccionado y el turno se confirma sin pasos extra | ✓ VERIFIED | `onCreated={(pac) => { onSelect(pac); setQuery(""); setCreating(false); }}` (`AutocompletePaciente.tsx:141-145`); human-verify Task 3 steps 6-7 approved in all 3 modals |
| 3b | SC3/D-07 (in-flight dismissal): the same guarantee holds even if the user dismisses mid-request | ✗ FAILED | See gap #2 above — CR-01 confirmed in code (`AutocompletePaciente.tsx:120-128`, `InlineCreatePaciente.tsx:124-139`) |
| 4 | SC4/D-12/ALTA-05: DNI duplicado muestra error inline bajo el campo, conservando lo cargado | ✓ VERIFIED | `InlineCreatePaciente.tsx:129-136` (`status === 409 \|\| message?.includes("DNI")` → `setError("dni", ...)`, no reset); human-verify Task 3 step 8 approved |
| 5 | SC5/D-08/ALTA-06 (resolved professional): patient created under the active professional context | ✓ VERIFIED (for the resolved case) | `profesionalIdParaAlta={effectiveProfessionalId}` / `={profesionalId}` at all 3 call sites, matching the turno payload exactly (`NewAppointmentModal.tsx:161/218`, `SurgeryAppointmentModal.tsx:146/227`, `QuickAppointment.tsx:183/211/378`) |
| 5b | SC5/D-08/ALTA-06 (unresolved professional): creation is gated or the record stays assigned even when the professional context is null | ✗ FAILED | See gap #1 above — CR-02 confirmed in code; `canOfferCreate` (`AutocompletePaciente.tsx:52-57`) has no `profesionalIdParaAlta` term |
| 6 | SC6/ALTA-07: mini-form aparece en los 3 modales de turno y no en `PatientFilters`/`data-table-toolbar` | ✓ VERIFIED | `grep -c 'allowCreate\|profesionalIdParaAlta'` = 0 in both filter call sites (re-run this session); `showDropdown` collapses to `!value && query.length > 0 && (data.length > 0 \|\| isFetching)` when `allowCreate=false` (creating and canOfferCreate are structurally always false) |
| 7 | ALTA-01/D-02/D-03: create row only at ≥3 debounced chars, after fetch resolves, appears with or without existing results | ✓ VERIFIED | `canOfferCreate = allowCreate && !creating && debouncedQuery.trim().length >= 3 && !isFetching && isSuccess` (`AutocompletePaciente.tsx:52-57`); row placed after `.map()`, inside the `!isFetching` branch, no `sticky` |
| 8 | ALTA-02: patient can be created with only Nombre + DNI (Teléfono optional) | ✓ VERIFIED | Zod schema: `telefono: z.string().optional().refine(...)` (`InlineCreatePaciente.tsx:39-44`); payload sends `telefono: data.telefono?.trim() ?? ""`, backend normalizes to null (Phase 67 contract) |
| 9 | D-13/D-14 (creating=true state): Escape closes only the mini-form, not the Dialog; click-outside does not close the mini-form | ✓ VERIFIED | `onEscapeKeyDown`/`onPointerDownOutside` in `AutocompletePaciente.tsx:120-135`; human-verify Task 3 steps 4-5 approved in all 3 modals. Note: this truth is scoped by the plan to the `creating=true` state and is verified only for that state — see WR-01 below for the adjacent, unverified state |
| 10 | Mini-form never renders `<form>` or an untyped button, so it cannot submit the containing turno `<form>` | ✓ VERIFIED | `grep -c "<form" InlineCreatePaciente.tsx` = 0; all buttons `type="button"`; Enter handled via `handleKeyDown` with `preventDefault`/`stopPropagation` (`InlineCreatePaciente.tsx:142-148`); human-verify Task 3 step 6 approved specifically in the two `<form>`-bearing modals |
| 11 | No backend files touched (frontend-only phase boundary) | ✓ VERIFIED | `git status --porcelain backend/` empty per plan verification gates and SUMMARY claims, consistent with `files_modified` in all 3 PLAN frontmatters |
| 12 | Requirements ALTA-01..07 all claimed by some plan (no orphans) | ✓ VERIFIED | Union of `requirements:` across 68-01/02/03-PLAN.md = {ALTA-01..07}, matches REQUIREMENTS.md Phase 68 mapping exactly |

**Score:** 10/12 truths verified (2 FAILED, both BLOCKER-level, both bearing directly on declared
Roadmap success criteria SC3 and SC5)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/components/InlineCreatePaciente.tsx` | Self-contained mini-form, RHF+Zod, POST via `useCreatePaciente`, returns created record | ✓ VERIFIED (exists, substantive, wired) | 221 lines; exports `InlineCreatePaciente`, `PacienteCreado`, `buildPrefill` as required |
| `frontend/src/hooks/useCreatePaciente.ts` | Mutation with `["pacientes"]` + `["pacientes-suggest"]` invalidation | ✓ VERIFIED | Both `invalidateQueries` calls present (lines 14, 17) |
| `frontend/src/components/AutocompletePaciente.tsx` | Opt-in create branch, search freeze, Popover/Dialog dismiss coordination | ⚠️ VERIFIED WITH GAPS | Component exists, is wired into all 3 modals, and the happy path is substantive — but the gate condition (`canOfferCreate`) and the dismiss guard (`onEscapeKeyDown`) both have confirmed logic gaps (see Gaps) |
| `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx` | Call site with `allowCreate` + `profesionalIdParaAlta={effectiveProfessionalId}` | ✓ VERIFIED | Confirmed at lines 217-218 |
| `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx` | Same, only in the `else` branch of `pacienteIdProp` ternary | ✓ VERIFIED | Confirmed at lines 226-227, inside the non-preselected branch |
| `frontend/src/app/dashboard/components/QuickAppointment.tsx` | Call site with `allowCreate` + `profesionalIdParaAlta={profesionalId}` | ✓ VERIFIED | Confirmed at lines 377-378 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `InlineCreatePaciente.tsx` | `useCreatePaciente.ts` | `mutate(payload, {onSuccess, onError})` | ⚠️ PARTIAL | Wired and functional in the happy path; the callbacks are mutate()-level and are not resilient to unmount (gap #2) |
| `AutocompletePaciente.tsx` | `InlineCreatePaciente.tsx` | conditional render inside `PopoverContent` when `creating` | ✓ WIRED | `{creating ? <InlineCreatePaciente .../> : ...}` (lines 137-147) |
| `onCreated` (mini-form) | `onSelect` (call site) | `AutocompletePaciente`'s inline `onCreated` handler | ✓ WIRED | Same handoff path as list-selection; no adapter needed, confirmed at all 3 call sites |
| `PopoverContent` | Radix dismiss layer | `onEscapeKeyDown` / `onPointerDownOutside` with `preventDefault` | ⚠️ PARTIAL | Correct for the `creating && !isPending` state; not guarded for `creating && isPending` (gap #2) |
| Call sites | `AutocompletePaciente` | `profesionalIdParaAlta={...}` matching the turno payload expression | ✓ WIRED | Identical expression at all 3 sites, confirmed by direct read, not grep alone |
| `AutocompletePaciente`'s create gate | `profesionalIdParaAlta` | `canOfferCreate` should require a resolved professional | ✗ NOT WIRED | `canOfferCreate` never references `profesionalIdParaAlta` (gap #1) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ALTA-01 | 68-02 | Ver opción de crear cuando no hay resultados | ✓ SATISFIED | `canOfferCreate` + create row |
| ALTA-02 | 68-01 | Crear cargando sólo nombre y DNI | ✓ SATISFIED | Zod schema, telefono optional |
| ALTA-03 | 68-01, 68-02 | Precarga del campo correspondiente | ✓ SATISFIED | `buildPrefill` |
| ALTA-04 | 68-02, 68-03 | Selección automática + confirmar turno sin pasos extra | ⚠️ PARTIALLY SATISFIED | Happy path yes; in-flight-dismissal path no (gap #2) |
| ALTA-05 | 68-01 | Error de DNI duplicado inline, sin perder lo cargado | ✓ SATISFIED | `setError("dni", ...)` branch |
| ALTA-06 | 68-01, 68-03 | Paciente creado bajo el profesional del contexto activo | ✗ BLOCKED | `canOfferCreate` doesn't require a resolved professional (gap #1) |
| ALTA-07 | 68-02, 68-03 | Disponible en los 3 modales de turno, ausente en los 2 usos de filtro | ✓ SATISFIED | Fence audited by grep + git status/diff, re-confirmed this session |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `AutocompletePaciente.tsx` | 52-57 | `canOfferCreate` omits `profesionalIdParaAlta` | 🛑 Blocker | Orphaned patient records possible (ALTA-06) |
| `AutocompletePaciente.tsx` / `InlineCreatePaciente.tsx` | 120-128 / 124-139 | `onEscapeKeyDown` not guarded on `isPending`; success/error callbacks are mutate()-level | 🛑 Blocker | Silent data loss + burned DNI on retry (ALTA-04/D-07) |
| `AutocompletePaciente.tsx` | 61-63, 120-128 | Zero-result search with `allowCreate` on keeps the popover open with no `onOpenChange`; `onEscapeKeyDown` returns early when `!creating`, so Escape neither closes the dropdown nor reaches the Dialog | ⚠️ Warning | Escape appears to do nothing in the "row visible, form not yet opened" state — a UX regression from pre-phase behavior (previously a fruitless search closed the popover and Escape reached the Dialog). This is WR-01 from `68-REVIEW.md`, independently re-derived from the Radix `isHighestLayer` + controlled-`open`-without-`onOpenChange` mechanics in the code. Not exercised by the approved human-verify script (which only tests Escape with `creating=true`) |
| `InlineCreatePaciente.tsx` | 142-148 | `handleKeyDown` has no `isPending` guard before calling `handleSubmit(onSubmit)()` | ⚠️ Warning | Repeated/held Enter can fire concurrent POSTs; DNI uniqueness prevents dupes but produces a stray error path (WR-02 from review) |
| `InlineCreatePaciente.tsx` | 176-185 | DNI field bypasses `register()`, driven by `watch`/`setValue` only | ⚠️ Warning | The manual `setError("dni", ...)` from a 409 never auto-clears as the user retypes; only clears on next submit (WR-03 from review) |
| `QuickAppointment.tsx` | comment near :373-378 | Documented divergence: search filters by `useEffectiveProfessionalId()`, alta uses `profesionalId` prop | ℹ️ Info | Can make a freshly-created patient unfindable if the two diverge (WR-08 from review); documented in code as accepted |

No `TBD`/`FIXME`/`XXX` debt markers found in any file modified by this phase (checked directly this
session).

### Human Verification Required

None outstanding — the one scenario that would otherwise require human confirmation (Escape in the
zero-result/no-form-open state, WR-01) is confirmable from Radix's documented dismiss-layer mechanics
and the component's own controlled-`open`-without-`onOpenChange` wiring, both read directly in this
session. It is reported as a Warning-level anti-pattern, not as a blocking gap, because it is not one
of the phase's declared must-haves (`D-13` is explicitly scoped to `creating=true` in both
`68-CONTEXT.md` and `68-02-PLAN.md`).

### Gaps Summary

Two BLOCKER-level gaps, both directly on declared Roadmap SC's, both re-derived independently from
source in this session (not inherited from `68-REVIEW.md`'s conclusions, though they corroborate
CR-01 and CR-02 exactly):

1. **Orphaned patients possible (ALTA-06 / SC5).** The inline "Crear paciente" offer does not require
   a resolved `profesionalIdParaAlta`. In `NewAppointmentModal`/`SurgeryAppointmentModal`, when
   `effectiveProfessionalId` is null (ADMIN/SECRETARIA with no professional selected, or still
   loading), the create row still appears and the POST still fires with `profesionalId: undefined`.
   The existing "Debe seleccionar un profesional" guard only fires on turno submit — after the patient
   already exists, unassigned and invisible to professional-scoped reads, with its DNI burned. The
   planning decision in `68-CONTEXT.md` (D-08) that discarded blocking this case rested on the claim
   that it's "already cut off downstream by `NewAppointmentModal.tsx:132`" — that claim does not hold
   up against the actual code, because the inline patient POST and the turno submit guard are
   independent code paths.

2. **Silent loss of a successfully-created patient (ALTA-04 / SC3, in-flight dismissal only).**
   Escape (or closing the containing Dialog) while the create request is in flight unmounts the
   mini-form before its `onSuccess`/`onError` callbacks — which are mutate()-level, per TanStack Query
   v5 semantics — can fire. The patient is created server-side but never surfaces to the user: no
   toast, no selection. A retry with the same data then hits a 409 dead end.

Both gaps are narrow (specific interaction timing / specific professional-context state), and the
core "search → create → keep scheduling" happy path is real and human-verified across all three
modals. This is why the score is 10/12 rather than lower — but both gaps sit squarely on declared
Roadmap success criteria (SC3, SC5) and REQUIREMENTS.md wording (ALTA-04, ALTA-06), so per the
decision tree this phase cannot be marked `passed`.

**This looks like an oversight, not an intentional deviation**, with one caveat: D-08 in
`68-CONTEXT.md` did explicitly discuss and reject blocking creation on a null professional — but on a
factual premise (downstream blocking already covers it) that the code review and this verification
both show to be incorrect. If, after understanding the corrected consequence (orphaned, unrecoverable
patient records), the developer still wants to accept this behavior, add to this file's frontmatter:

```yaml
overrides:
  - must_have: "El paciente creado inline queda asignado al profesional del contexto activo, igual que en el alta completa (Roadmap SC5 / ALTA-06)"
    reason: "{why this deviation is acceptable, given the corrected understanding that the downstream guard does not prevent it}"
    accepted_by: "{name}"
    accepted_at: "{ISO timestamp}"
```

No such override exists for gap #2 (in-flight dismissal) — nothing in the planning documents
discusses or accepts that scenario; it should be treated as a straightforward defect to fix.

---

_Verified: 2026-08-19T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
