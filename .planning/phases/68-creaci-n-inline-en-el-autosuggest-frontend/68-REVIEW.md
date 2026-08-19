---
phase: 68-creaci-n-inline-en-el-autosuggest-frontend
reviewed: 2026-08-19T20:26:27Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - frontend/src/components/InlineCreatePaciente.tsx
  - frontend/src/components/AutocompletePaciente.tsx
  - frontend/src/hooks/useCreatePaciente.ts
  - frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx
  - frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx
  - frontend/src/app/dashboard/components/QuickAppointment.tsx
findings:
  critical: 2
  warning: 9
  info: 5
  total: 16
status: issues_found
---

# Phase 68: Code Review Report

**Reviewed:** 2026-08-19T20:26:27Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 68 adds an opt-in inline patient-creation mini-form inside the patient autosuggest popover,
wired into the three appointment modals. Cross-referenced against `usePacienteSuggest.ts`,
`useDebounce.ts`, `components/ui/popover.tsx`, `components/ui/input.tsx`, the two non-opt-in call
sites (`PatientFilters.tsx`, `data-table-toolbar.tsx`), and the backend contract
(`pacientes.controller.ts`, `pacientes.service.ts::create`, `create-paciente.dto.ts`,
`schema.prisma`, `prisma-client-exception.filter.ts`).

What holds up:

- **The opt-in fence is real.** `PatientFilters.tsx:38` and `data-table-toolbar.tsx:66` pass neither
  `allowCreate` nor `profesionalIdParaAlta`; with `allowCreate=false`, `canOfferCreate` is
  unconditionally false and `creating` can never be set true (its only setter is the create button,
  which is gated by `canOfferCreate`), so `showDropdown` collapses to the pre-phase expression.
  Verified in code paths, not by prop absence.
- **Submit does not bubble into the appointment `<form>`.** `PopoverContent` is portaled to
  `document.body` (`popover.tsx:29`), so the mini-form inputs are not form-associated with the
  appointment `<form>` and cannot trigger implicit submission; every button in the new code is
  `type="button"`; `handleKeyDown` (`InlineCreatePaciente.tsx:142-148`) additionally stops React
  synthetic propagation (which *does* traverse portals). This highest-risk class is clean.
- **`profesionalIdParaAlta` matches the appointment payload at all three call sites**
  (`NewAppointmentModal.tsx:218` vs `:161`; `SurgeryAppointmentModal.tsx:227` vs `:146`;
  `QuickAppointment.tsx:378` vs `:211`). No divergence between alta and turno scoping.
- **`["pacientes-suggest"]` invalidation key is correct** — it is a prefix of the actual query key
  `["pacientes-suggest", debounced, profesionalId]` (`usePacienteSuggest.ts:11`).
- **409 handling is live** — `dni` is `@unique` globally (`schema.prisma:156`) and although
  `PacientesService.create` never awaits the Prisma promise (pre-existing, phase-67 CR-03), the
  global `PrismaClientExceptionFilter` maps `P2002 → 409`, so `status === 409` in the mini-form's
  `onError` does fire.

What does not hold up: two blockers around the *unhappy* paths (in-flight dismissal and a null
professional) that create real, unrecoverable patient records, plus an Escape-key behavioral
regression introduced by keeping the popover open on zero-result searches.

## Critical Issues

### CR-01: Escape (or closing the Dialog) mid-request silently creates an orphan patient

**Classification:** BLOCKER
**File:** `frontend/src/components/AutocompletePaciente.tsx:120-128`, `frontend/src/components/InlineCreatePaciente.tsx:124-139`

**Issue:** The Cancel button is disabled while `isPending` (`InlineCreatePaciente.tsx:212`), but the
Escape path is not: `onEscapeKeyDown` calls `setCreating(false)` unconditionally, which unmounts
`InlineCreatePaciente` while `POST /pacientes` is in flight. The same happens if the user closes the
appointment Dialog (X / Cancel / overlay) during the request.

TanStack Query v5 only invokes the callbacks passed to `mutate(vars, { onSuccess, onError })` when
the observer still `hasListeners()`. After unmount there are no listeners, so:

- the patient **is** created server-side,
- `onCreated` never runs → the patient is never selected into the appointment form,
- the success toast never appears → the user has no idea the record exists.

The user then retries the same DNI and gets `Este DNI ya está registrado` with no patient in the
field — a dead end. When the record also landed with `profesionalId = null` (see CR-02) it is
invisible to the professional-scoped autosuggest, and the globally-unique DNI is permanently burned.

**Fix:** Block dismissal while the mutation is in flight. Lift `isPending` into
`AutocompletePaciente` (or expose an `onPendingChange` callback from the mini-form) and guard both
dismiss handlers:

```tsx
// AutocompletePaciente.tsx
const [creatingBusy, setCreatingBusy] = useState(false);
...
onEscapeKeyDown={(e) => {
  if (!creating) return;
  e.preventDefault();
  if (creatingBusy) return;   // no cancelar un alta en vuelo
  setCreating(false);
}}
...
<InlineCreatePaciente ... onPendingChange={setCreatingBusy} />
```

Additionally, make the mutation resilient to unmount by moving the toast + selection out of the
`mutate` callbacks (e.g. `mutateAsync` with a local `try/catch`, or hook-level `onSuccess`), so a
created patient is never dropped on the floor.

---

### CR-02: Inline alta is offered even when `profesionalIdParaAlta` is `null`, producing unassigned patients

**Classification:** BLOCKER
**File:** `frontend/src/components/InlineCreatePaciente.tsx:118`, `frontend/src/components/AutocompletePaciente.tsx:52-57`, `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx:218`, `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx:227`

**Issue:** `canOfferCreate` does not consider `profesionalIdParaAlta`, and the payload does
`profesionalId: profesionalId ?? undefined`. `useEffectiveProfessionalId()` returns `null` whenever
`useCurrentUser()` has not resolved yet **or** an ADMIN/SECRETARIA/FACTURADOR has not picked a
professional in the global context (`useEffectiveProfessionalId.ts:8,16`). `CreatePacienteDto`
marks `profesionalId` optional and `Paciente.profesionalId` is nullable, so the backend happily
creates the record with `profesionalId = null` and `etapaCRM = NUEVO_LEAD`.

Consequences of that orphan record:

- invisible to every professional-scoped read path (`suggest` adds `AND p."profesionalId" = $x`,
  `getKanban(profesionalId)`, `obtenerListaPacientes(profesionalId)`),
- the globally-unique DNI is consumed, so re-creating the patient correctly is impossible (409),
- asymmetric with the turno itself: both `NewAppointmentModal.tsx:131-134` and
  `SurgeryAppointmentModal.tsx:178-181` *do* hard-block submission when
  `!effectiveProfessionalId`, so the user is told "Debe seleccionar un profesional" only **after**
  the orphan patient has already been persisted.

**Fix:** Gate the offer on a resolved professional, and stop silently dropping the field:

```tsx
// AutocompletePaciente.tsx
const canOfferCreate =
  allowCreate &&
  !!profesionalIdParaAlta &&   // sin profesional no se puede dar de alta
  !creating &&
  debouncedQuery.trim().length >= 3 &&
  !isFetching &&
  isSuccess;
```

```tsx
// InlineCreatePaciente.tsx — defensa en profundidad
if (!profesionalId) {
  toast.error("Seleccioná un profesional antes de crear el paciente");
  return;
}
```

## Warnings

### WR-01: Enter no longer closes the appointment modal after a fruitless search (regression)

**Classification:** WARNING
**File:** `frontend/src/components/AutocompletePaciente.tsx:61-63, 120-128`

**Issue:** Before this phase, `showDropdown` was
`!value && query.length > 0 && (data.length > 0 || isFetching)` — a zero-result idle search **closed**
the popover, so `Escape` reached the Dialog's DismissableLayer and closed the appointment modal. Now
`canOfferCreate` keeps the popover open on exactly that state. Radix DismissableLayer (v1.1.x) only
lets the **highest** layer react to Escape (`isHighestLayer` check), so the Dialog's handler returns
early; and the popover's own `onDismiss` is inert because `open={showDropdown}` is controlled with
no `onOpenChange`. Net effect for the three modal call sites: with the "Crear paciente" row on
screen, `Escape` does nothing at all — it neither dismisses the dropdown nor the Dialog. (The
`if (!creating) return;` branch is what leaves this state unhandled.)

**Fix:** Handle the non-creating case explicitly instead of falling through:

```tsx
onEscapeKeyDown={(e) => {
  if (creating) {
    e.preventDefault();
    setCreating(false);
    return;
  }
  if (query.length > 0) {
    e.preventDefault();   // primer Escape: cerrar el dropdown
    setQuery("");
  }
  // sin query: dejar que Radix/el Dialog manejen el Escape
}}
```

Note that a dropdown-open Escape still cannot reach the Dialog while the popover is the top layer;
clearing `query` (which closes the popover) makes the *second* Escape work as users expect.

---

### WR-02: Enter spam re-submits the alta while the mutation is in flight

**Classification:** WARNING
**File:** `frontend/src/components/InlineCreatePaciente.tsx:142-148`

**Issue:** Both buttons are `disabled={isPending}`, but the container's `onKeyDown` calls
`handleSubmit(onSubmit)()` with no `isPending` guard. `onSubmit` is synchronous (it fires `mutate`
and returns), so RHF's internal `isSubmitting` flips back immediately and offers no protection.
Holding/repeating Enter issues N concurrent `POST /pacientes`. The unique DNI constraint prevents
duplicate rows, but the losing requests return 409, and if the winner already resolved the component
is gone — producing a success toast plus a stray error path, or (worse) a `setError` race.

**Fix:**

```tsx
function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  e.stopPropagation();
  if (isPending) return;
  handleSubmit(onSubmit)();
}
```

---

### WR-03: The DNI field bypasses `register()`, so the duplicate-DNI error never clears

**Classification:** WARNING
**File:** `frontend/src/components/InlineCreatePaciente.tsx:176-185`

**Issue:** Unlike its siblings, `dni` is driven by `value={watch("dni")}` +
`setValue(..., { shouldValidate: false })` and is never registered. Two consequences:

1. The field has no RHF onChange/validation subscription, so the manual
   `setError("dni", { message: "Este DNI ya está registrado" })` (line 134) stays on screen while the
   user types a corrected DNI — it only disappears on the next submit. The user sees a red error
   under a DNI they already fixed.
2. Submission works only because RHF v7 writes `setValue` results into `_formValues` for unregistered
   names and the zod resolver returns the parsed values — an internal-behaviour dependency that the
   sibling `NewPacienteModal.tsx:154` (`{...register("dni")}`) does not take.

**Fix:** Register the field and normalize inside its `onChange`:

```tsx
<Input
  {...register("dni", {
    onChange: (e) => setValue("dni", e.target.value.replace(/\D/g, "")),
  })}
  ref={(el) => { register("dni").ref(el); dniRef.current = el; }}
  placeholder="40111222"
  inputMode="numeric"
  className={fieldClassName}
/>
```

(or keep the controlled input but call `clearErrors("dni")` on every change).

---

### WR-04: `canOfferCreate` gates on a second, independent debounce while the label/prefill use the raw query

**Classification:** WARNING
**File:** `frontend/src/components/AutocompletePaciente.tsx:48-57, 186-197`

**Issue:** The gate uses `debouncedQuery` (a *second* `useDebounce(query, 300)` instance), but the
button label (`line 196`) and the value handed to `InlineCreatePaciente` (`query`, line 139) use the
raw input. During the 300 ms window after the user shortens/replaces the text, the stale
`debouncedQuery` still satisfies `>= 3` while `isSuccess` is still true for the *previous* key, so:

- the row renders as `Crear paciente: "ab"` for a term that was never searched, and
- clicking it prefills `nombreCompleto = "Ab"`, which immediately fails the `min(3)` rule.

The comment on line 45-47 ("mismo delay converge al mismo valor") is an undeclared coupling to
`usePacienteSuggest`'s private 300 ms constant: if that hook's delay ever changes, this gate silently
starts firing on unsearched terms.

**Fix:** Use one source of truth for the term. Either render the label/prefill from
`debouncedQuery`, or (better) have `usePacienteSuggest` return its debounced value:

```ts
// usePacienteSuggest.ts
const q = useQuery({...});
return { ...q, debouncedQuery: debounced };
```

```tsx
const { data = [], isFetching, isSuccess, debouncedQuery } = usePacienteSuggest(query);
...
<span>{`Crear paciente: "${debouncedQuery}"`}</span>
<InlineCreatePaciente query={debouncedQuery} ... />
```

---

### WR-05: `creating` is never reset when the search term changes, stranding the user

**Classification:** WARNING
**File:** `frontend/src/components/AutocompletePaciente.tsx:41, 61-63, 103-110`

**Issue:** While the mini-form is open the anchor `Input` stays rendered and editable (`!value` is
still true), and `showDropdown` keeps the popover open via `creating ||` regardless of `query`. If
the user goes back to the search box and types a different name, the mini-form remains mounted with
the *original* prefill (read once at mount, line 78) and the suggestion list is unreachable — the
only escape is Cancel/Escape. The suggest query also keeps refetching for a term whose results can
never be displayed.

**Fix:** Either disable/read-only the search input while `creating`, or reset the state when the
term changes:

```tsx
onChange={(e) => { setQuery(e.target.value); setCreating(false); }}
```

---

### WR-06: Enter in the patient search box submits the appointment form

**Classification:** WARNING (pre-existing, now on the primary path of this feature)
**File:** `frontend/src/components/AutocompletePaciente.tsx:104-109` (as used by `NewAppointmentModal.tsx:210` and `SurgeryAppointmentModal.tsx:214`)

**Issue:** The search `Input` *is* a DOM descendant of the appointment `<form>` (only
`PopoverContent` is portaled out). Both modals contain a `type="submit"` button, so pressing Enter
in the search box triggers implicit form submission → `onSubmit` runs and fires
`toast.error("Debe seleccionar un paciente")` (or posts an incomplete turno in edit flows). This
predates the phase, but the new interaction model ("type a name, get no hits, create") makes Enter
the single most likely key a user presses at that exact moment.

**Fix:** Swallow Enter in the search input and route it to the create affordance:

```tsx
<Input
  ...
  onKeyDown={(e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();               // nunca submitear el form del turno
    if (canOfferCreate) setCreating(true);
  }}
/>
```

---

### WR-07: Mini-form focus depends on an uncancelled 50 ms timer racing Radix's focus management

**Classification:** WARNING
**File:** `frontend/src/components/InlineCreatePaciente.tsx:99-106`

**Issue:** `onOpenAutoFocus` is `preventDefault`-ed on the popover and, critically, never fires again
when `creating` flips to true (the popover content is already mounted — only its children swap). The
only focus path is therefore a bare `setTimeout(..., 50)` with no `clearTimeout` on unmount and no
fallback if focus lands elsewhere first. It also depends on the Dialog's `FocusScope` being paused by
the popover's own `FocusScope`; nothing in the code documents or asserts that invariant, and the
magic 50 ms has no relation to any real event.

**Fix:** Focus deterministically on mount via a ref callback or `requestAnimationFrame`, and clean
up:

```tsx
useEffect(() => {
  const id = window.setTimeout(() => {
    (prefill.nombreCompleto ? dniRef : nombreRef).current?.focus();
  }, 0);
  return () => window.clearTimeout(id);
}, [prefill.nombreCompleto]);
```

---

### WR-08: In `QuickAppointment` the patient created inline can be unfindable immediately afterwards

**Classification:** WARNING
**File:** `frontend/src/app/dashboard/components/QuickAppointment.tsx:362-379`

**Issue:** The documented divergence (search scoped by `useEffectiveProfessionalId`, alta scoped by
the `profesionalId` prop) has a concrete failure mode that the comment does not spell out: when the
two differ, the patient is created under professional B while the autosuggest keeps filtering by
professional A. The `["pacientes-suggest"]` invalidation added in `useCreatePaciente.ts:17` refetches
a query that **cannot** return the new record. If the user then clears the field (or reopens the
modal) the patient is unreachable, and re-creating it hits the 409 dead end from CR-01.

**Fix:** At minimum, pass the same id to both sides for this call site by scoping the search too
(e.g. add an optional `profesionalIdParaBusqueda` that `usePacienteSuggest` honours), or surface the
mismatch in the UI. If the divergence is truly accepted, at least keep the created patient selected
(which the current `onCreated` does) and disable the clear button until the turno is saved.

---

### WR-09: Validation contract diverges from the existing patient-creation path

**Classification:** WARNING
**File:** `frontend/src/components/InlineCreatePaciente.tsx:36-45`

**Issue:** `InlineCreatePaciente` is a fork of `NewPacienteModal` but relaxes the phone rule:
`NewPacienteModal.tsx:34` requires `telefono` (`z.string().min(6)`), here it is optional and an empty
string is posted. Two paths now write the same entity with different invariants, so patients created
from the appointment flow can land without a phone — the field the WhatsApp reminder/presupuesto
flows key on. Nothing in the reviewed code marks this as a deliberate relaxation.

**Fix:** Either align the rule (`telefono: z.string().min(6, "Teléfono inválido")`) or, if optional
is intentional for this flow, record it in the component doc-comment and confirm downstream
messaging handles `telefono === null` (the service normalizes `""` to `null`).

## Info

### IN-01: `buildPrefill` is exported but never imported, and has no test

**Classification:** INFO
**File:** `frontend/src/components/InlineCreatePaciente.tsx:62`
**Issue:** `grep` across `frontend/src` finds no importer of `buildPrefill` and no test file
references it. The export exists only to be testable, yet the D-09 heuristic it encodes is untested.
**Fix:** Add a unit test (`buildPrefill("40111222")`, `buildPrefill("40.111.222")`,
`buildPrefill("juan perez")`, `buildPrefill("")`) or drop the `export`.

---

### IN-02: The DNI heuristic swallows phone-number searches, and DNI has no upper bound

**Classification:** INFO
**File:** `frontend/src/components/InlineCreatePaciente.tsx:36-38, 62-68`
**Issue:** The autosuggest searches by phone too (`pacientes.service.ts` scores
`p.telefono LIKE '%q%'`), so a fruitless search for `1122334455` prefills a 10-digit **DNI**.
`z.string().min(7)` has no `max`, so it saves. Argentine DNIs are 7–8 digits.
**Fix:** Bound the field (`.max(8, "Máximo 8 dígitos")`) and only treat all-digit queries of length
7–8 as a DNI; otherwise prefill `telefono`.

---

### IN-03: `stopPropagation()` in `onEscapeKeyDown` is inert and the comment misstates the mechanism

**Classification:** INFO
**File:** `frontend/src/components/AutocompletePaciente.tsx:120-128`
**Issue:** Radix registers escape handlers with `document.addEventListener('keydown', …, {capture:true})`
for every layer; `stopPropagation()` on a document-level listener does not prevent the sibling
listeners on the same node (that would require `stopImmediatePropagation`). What actually keeps the
Dialog from closing is Radix's `isHighestLayer` short-circuit plus the `preventDefault()`. The
comment attributes the behaviour to the wrong call, which will mislead the next maintainer.
**Fix:** Drop `e.stopPropagation()` and correct the comment to cite the layer-stack behaviour.

---

### IN-04: ~35 lines duplicated from `NewPacienteModal`, including a case-sensitive message check

**Classification:** INFO
**File:** `frontend/src/components/InlineCreatePaciente.tsx:113-140` vs `frontend/src/app/dashboard/pacientes/components/NewPacienteModal.tsx:82-115`
**Issue:** The payload assembly (`estado: "ACTIVO"`, `consentimientoFirmado`, `indicacionesEnviadas`)
and the entire `onError` 409 branch are copy-pasted, including `message?.includes("DNI")` — the
Prisma/filter message is lowercase (`Unique constraint failed on the fields: (\`dni\`)`), so that
fallback can never match. It is currently harmless (the `status === 409` branch fires first) but it
is dead code in both copies.
**Fix:** Extract `buildCreatePacientePayload()` and `handleCreatePacienteError(setError)` into a
shared module (e.g. `frontend/src/lib/pacientes.ts`) and make the message check case-insensitive
(`/dni/i.test(message)`).

---

### IN-05: Magic numbers with no named constants

**Classification:** INFO
**File:** `frontend/src/components/AutocompletePaciente.tsx:48, 55`, `frontend/src/components/InlineCreatePaciente.tsx:101, 103`
**Issue:** `300` (must match `usePacienteSuggest`'s private delay), `3` (minimum length to offer
creation), `50` (focus delay) are inline literals.
**Fix:** Hoist to named constants (`SUGGEST_DEBOUNCE_MS`, `MIN_CHARS_TO_OFFER_CREATE`) and export the
debounce constant from `usePacienteSuggest` so the two stay in sync.

---

### Out-of-scope note (backend, pre-existing)

`POST /pacientes` accepts a client-supplied `profesionalId` and never cross-checks it against
`req.user` (`pacientes.controller.ts:48-52`), while the class-level `@Auth('ADMIN','PROFESIONAL','SECRETARIA','FACTURADOR')`
only checks the role. The new `profesionalIdParaAlta` prop makes three more UI paths depend on that
trust. Not introduced by this phase and outside the reviewed file set, but worth a backend ticket:
a SECRETARIA can assign a new patient to any professional in the tenant.

---

_Reviewed: 2026-08-19T20:26:27Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
