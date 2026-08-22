---
phase: 69-consistencia-de-tel-fono-opcional-frontend
reviewed: 2026-08-21T21:31:27Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - backend/src/modules/turnos/turnos.service.ts
  - frontend/src/app/dashboard/pacientes/components/NewPacienteModal.tsx
  - frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx
  - frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx
  - frontend/src/app/dashboard/reportes/financieros/cuentas/page.tsx
  - frontend/src/app/dashboard/reportes/operativos/ausentismo/page.tsx
  - frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx
  - frontend/src/app/dashboard/turnos/CalendarGrid.tsx
  - frontend/src/app/dashboard/turnos/page.tsx
  - frontend/src/components/AutocompletePaciente.tsx
  - frontend/src/components/crm/ListaEsperaSheet.tsx
  - frontend/src/components/live-turno/tabs/DatosPacienteTab.tsx
  - frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx
  - frontend/src/components/patient/PatientDrawer/views/MensajesView.tsx
  - frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx
  - frontend/src/components/whatsapp/WAThreadView.tsx
  - frontend/src/hooks/useListaEspera.ts
  - frontend/src/hooks/useReportesFinancieros.ts
  - frontend/src/lib/telefono.ts
  - frontend/src/types/pacients.ts
  - frontend/src/types/reportes.ts
findings:
  critical: 2
  warning: 5
  info: 7
  total: 14
status: issues_found
---

# Phase 69: Code Review Report

**Reviewed:** 2026-08-21T21:31:27Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Phase 69 propagates "teléfono opcional" to the frontend: a new `lib/telefono.ts` SSOT
(`formatTelefono` / `tieneTelefono` / `getMotivoBloqueoWhatsApp`), 6 widened types, 2 relaxed Zod
schemas, 5 display sites and 5 WhatsApp send guards.

The helper module itself is correct: `formatTelefono`, `tieneTelefono` and
`getMotivoBloqueoWhatsApp` all implement the documented "falsy tras trim" semantics, the
teléfono-over-opt-in precedence holds, and the relaxed Zod `min 6` matches the backend's
`normalizeTelefono()` (`''` → `null`, `< 6` → `BadRequestException`), so `telefono: ''` from
`NewPacienteModal` is accepted and stored as `NULL` as intended. The disabled-button-inside-`<span>`
tooltip pattern is correct at all 5 guard sites, and `<Tooltip>` self-provides its Radix provider,
so no runtime provider error.

Two findings block, however. **The entire calendar branch of this phase is unreachable at
runtime**: the WhatsApp control in `AppointmentDetailModal` is rendered behind
`{event.pacienteId && ...}`, and `/turnos/rango` never returns `pacienteId` (the Prisma `select`
the phase edited omits it and only exposes `paciente.id`). So the new `telefono` field in the 3
`CalendarEvent` copies, the new `motivoBloqueoWA`, and the newly widened PII in the payload buy
exactly nothing. And in the patient drawer, the phone that the new guards read is never refreshed
after `DatosCompletos.saveContacto()` (no query invalidation anywhere in that file, global
`staleTime: 30_000` + `refetchOnWindowFocus: false`, and `PatientDrawer` stays mounted), so adding
a phone leaves the WhatsApp button disabled with the misleading "El paciente no tiene teléfono
cargado" for the rest of the session.

Secondary theme: the phase created a SSOT for display/blocking text but left the *validation* rule
duplicated inline in three forms with divergent bounds, and left two `telefono` type declarations
un-widened (`TurnoRango`, `CuentaCorrienteResumen`) — the same class of drift the phase set out to
eliminate.

**Confirmed (already recorded by the executor, not a new finding):** `obtenerPorRango` in
`turnos.controller.ts:122-127` reads `profesionalId` straight from the query string with no
`resolveScope`, so adding `telefono` to that select widens PII on an already-exposed path. Confirmed
as accurate. Note the aggravating factor from CR-01: the only consumer of that field cannot render,
so the phase paid the PII cost for zero functional gain.

## Critical Issues

### CR-01: The WhatsApp guard added to `AppointmentDetailModal` can never render — `/turnos/rango` does not return `pacienteId`

**File:** `backend/src/modules/turnos/turnos.service.ts:558-588` (select), `frontend/src/app/dashboard/turnos/page.tsx:290`, `frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx:159,370-390,474-477`

**Issue:** `obtenerTurnosPorRango` uses an explicit Prisma `select` that lists
`id, inicio, fin, estado, observaciones, paciente{ id, nombreCompleto, whatsappOptIn, telefono }, tipoTurno{...}, entradaHC{...}`.
It does **not** select the scalar FK `pacienteId`, and the post-`findMany` `.map()`
(`const { entradaHC, ...rest } = t`) does not synthesize it either. `turnos/page.tsx:290` therefore
evaluates `pacienteId: t.pacienteId ?? undefined` → always `undefined`. In
`AppointmentDetailModal`, both the WhatsApp button (line 371) and `SendWAMessageModal` (line 474)
are gated on `{event.pacienteId && (...)}`, so they are dead branches for every calendar event.

Everything this phase added on that path is unreachable: `telefono` in the 3 `CalendarEvent`
copies, `const motivoBloqueoWA = getMotivoBloqueoWhatsApp(event.telefono, event.whatsappOptIn)`
(line 159), and the `telefono: true` added to the backend select. The TS `as any[]` cast at
`page.tsx:283` is why the compiler never flagged the mismatch (see WR-01).

This also means the phase-69 acceptance criterion "WhatsApp send guard applied at the turno detail
control" is not actually satisfied in the running app, and the extra PII (patient phone numbers for
a whole date range, on an endpoint with no `resolveScope`) is now shipped for no benefit.

**Fix:** select the FK next to the field the phase already touched, and keep the frontend mapping
resilient:

```ts
// backend/src/modules/turnos/turnos.service.ts — obtenerTurnosPorRango select
select: {
  id: true,
  pacienteId: true,   // <-- required by AppointmentDetailModal's WhatsApp branch
  inicio: true,
  fin: true,
  estado: true,
  observaciones: true,
  paciente: { select: { id: true, nombreCompleto: true, whatsappOptIn: true, telefono: true } },
  // ...
}
```

```tsx
// frontend/src/app/dashboard/turnos/page.tsx:290
pacienteId: t.pacienteId ?? t.paciente?.id ?? undefined,
```

If instead the decision is that the calendar should not carry patient phones at all, revert
`telefono: true` from the select and the 3 `CalendarEvent` copies rather than leaving unreachable
code plus widened PII.

### CR-02: Saving a phone in `DatosCompletos` never refreshes the cached patient — the new WhatsApp guards stay stuck on "no tiene teléfono cargado"

**File:** `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx:222-240`, `frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx:39,134-146`, `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx:38-41`

**Issue:** `saveContacto()` does `await api.patch('/pacientes/:id', { section: 'contacto', data })`,
then `toast.success(...)` and `setEditingSection(null)`. There is **no** `useQueryClient` /
`invalidateQueries` / `refetch` anywhere in `DatosCompletos.tsx` (grep for
`queryClient|invalidate|refetch` returns nothing). The `usePaciente(pacienteId)` observer lives in
`PatientDrawer` (line 39), which is mounted permanently by `data-table.tsx:228-232` (only `open`
toggles), and the global query defaults are `staleTime: 30_000` with `refetchOnWindowFocus: false`
(`frontend/src/app/providers.tsx:10-15`). So nothing re-fetches the patient after the PATCH for the
rest of the session.

Before this phase that only produced a stale *display* string. Now `paciente.telefono` gates
behavior at three of the five new guard sites — `PacienteDetails` line 322 (`disabled={!!motivoBloqueoWA}`),
`PresupuestosView` (via `pacienteTelefono={paciente.telefono ?? null}`) and `MensajesView`/`WAThreadView`.
Reproduction: open a phone-less patient → Datos completos → type a phone → Guardar → Volver → the
WhatsApp button is still disabled and the tooltip still claims "El paciente no tiene teléfono
cargado", contradicting what the user just saved and what the backend would now accept. The user
has no in-UI remedy (closing/reopening the drawer does not remount the observer).

**Fix:** invalidate the patient query after every section save:

```tsx
import { useQueryClient } from "@tanstack/react-query";
// ...
const queryClient = useQueryClient();
// inside saveContacto (and the other save* handlers), after the successful PATCH:
await api.patch(`/pacientes/${paciente.id}`, { section: "contacto", data: result.data });
await queryClient.invalidateQueries({ queryKey: ["paciente", paciente.id] });
toast.success("Datos de contacto actualizados correctamente");
```

(`usePaciente`'s key is `["paciente", id, effectiveProfessionalId]`, so the 2-element prefix above
matches it.) Alternatively lift the save into a mutation hook that owns the invalidation, matching
the `useCreatePaciente` pattern used elsewhere in the repo.

## Warnings

### WR-01: `TurnoRango` was not widened and `turnosRango as any[]` erases the API boundary

**File:** `frontend/src/hooks/useTurnosRangos.ts:4-16`, `frontend/src/app/dashboard/turnos/page.tsx:283-300`

**Issue:** `TurnoRango.paciente` is declared `{ id: string; nombreCompleto: string }` — it has
neither `whatsappOptIn` (pre-existing drift) nor the `telefono` this phase added to the payload, and
it lacks `pacienteId` entirely. The mapper compensates with `(turnosRango as any[])`, which disables
every type check on the response shape. That cast is precisely why CR-01 (`t.pacienteId` always
`undefined`) compiles clean. The phase brief says the response type was "plumbed into 3 copies of
the `CalendarEvent` interface", but the *contract* type at the fetch boundary — the one that would
have caught the bug — was left stale.

**Fix:**

```ts
export type TurnoRango = {
  id: string;
  pacienteId: string;
  inicio: string;
  fin: string;
  estado: string;
  observaciones?: string | null;
  paciente: {
    id: string;
    nombreCompleto: string;
    whatsappOptIn?: boolean;
    telefono: string | null;
  };
  // ...
};
```

and drop the `as any[]` in `page.tsx:283` so the mapper is type-checked against it.

### WR-02: `CuentaCorrienteResumen.paciente.telefono` still declared non-nullable

**File:** `frontend/src/types/finanzas.ts:74-84`

**Issue:** `Paciente.telefono` is `String?` in Prisma (`backend/src/prisma/schema.prisma:158`), yet
this type still declares `telefono: string`. The widening pass covered `pacients.ts`, `reportes.ts`,
`useReportesFinancieros.ts` and `useListaEspera.ts` but missed this one. It is currently unread by
any component, so nothing crashes today — but the type actively lies, and the first consumer that
writes `cuenta.paciente.telefono.trim()` or `.length` will get a `TypeError` with no compiler
warning. Same class of latent defect as the ones this phase was created to close.

**Fix:**

```ts
paciente: {
  id: string;
  nombreCompleto: string;
  dni: string;
  telefono: string | null;
  obraSocial?: { nombre: string } | null;
};
```

### WR-03: `getMotivoBloqueoWhatsApp` call dereferences `paciente` above the component's null guard

**File:** `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx:37-46`

**Issue:** The new statement at lines 38-41 reads `paciente.telefono` and `(paciente as any).whatsappOptIn`,
but the component's own defensive `if (!paciente) return null;` is at line 46. With `paciente: any`,
any caller passing `null`/`undefined` throws `TypeError: Cannot read properties of null` before the
guard runs — the guard is dead code with respect to this line. Today the only caller
(`PatientDrawer.tsx:85-90`) renders behind `{paciente && !isLoading && ...}`, so it is latent, but
the phase added a second dereference to an already-broken pattern (`displayFlujo` at line 44 has the
same problem) rather than fixing or removing the guard. Interleaving a non-hook computation between
two `useState` calls also obscures the hook block.

**Fix:** move the guard to the top of the component and compute the motive after it (or delete the
now-unreachable guard and type the prop honestly):

```tsx
export default function PacienteDetails({ paciente, onAction }: Props) {
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [cambiarFlujoOpen, setCambiarFlujoOpen] = useState(false);
  const [optimisticFlujo, setOptimisticFlujo] = useState<Flujo | null>(null);

  if (!paciente) return null;

  const motivoBloqueoWA = getMotivoBloqueoWhatsApp(paciente.telefono, paciente.whatsappOptIn);
  const displayFlujo = optimisticFlujo ?? paciente.flujo ?? null;
```

### WR-04: The teléfono validation rule is duplicated inline in 3 forms with divergent bounds instead of living in `lib/telefono.ts`

**File:** `frontend/src/app/dashboard/pacientes/components/NewPacienteModal.tsx:34-39`, `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx:106-111`, `frontend/src/components/InlineCreatePaciente.tsx:45-50`

**Issue:** The phase created `lib/telefono.ts` explicitly to stop "una quinta copia divergente" of
the WhatsApp blocking text — but the *validation* predicate, which is the piece with real behavioral
consequences, is still hand-copied into three Zod schemas. They already disagree:

- `NewPacienteModal`: `>= 6`, no upper bound.
- `InlineCreatePaciente`: `>= 6`, no upper bound.
- `DatosCompletos`: `>= 6 && <= 20`.

The backend (`pacientes.service.ts:372-383`) enforces `>= 6` with **no** maximum, so a 21-character
international number is accepted at creation and by the API, but is rejected when the same patient
is edited from the drawer — a user-visible inconsistency in the exact field this phase normalized.
A fourth copy will drift the moment another form is added.

**Fix:** export the rule alongside the other helpers and reuse it:

```ts
// frontend/src/lib/telefono.ts
export const TELEFONO_MIN_LENGTH = 6;
export const telefonoOpcionalSchema = z
  .string()
  .optional()
  .refine((v) => !v?.trim() || v.trim().length >= TELEFONO_MIN_LENGTH, {
    message: "Teléfono inválido",
  });
```

Then `telefono: telefonoOpcionalSchema` in all three schemas, and either drop the drawer-only
`<= 20` or add the matching `@MaxLength` to `normalizeTelefono()` so both ends agree.

### WR-05: Three hand-maintained copies of `CalendarEvent` that have already drifted

**File:** `frontend/src/app/dashboard/turnos/page.tsx:41-55`, `frontend/src/app/dashboard/turnos/CalendarGrid.tsx:15-29`, `frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx:52-64`

**Issue:** The phase had to apply the same one-line edit (`telefono?: string | null;`) in three
places — the definition of a maintenance hazard. They are already out of sync: the modal's copy
lacks `tipoTurnoId` and `esSobreturno`. Because the objects flow untyped through
`onSelectEvent`/`event` props, a future field added to only one or two copies silently produces
`undefined` at the consumer — which is exactly the failure shape of CR-01. `telefono` being
*optional* (`?`) makes it worse: a consumer that forgets to populate it gets a fail-closed
"El paciente no tiene teléfono cargado" instead of a compile error.

**Fix:** extract one shared type (e.g. `frontend/src/types/calendar.ts`) exporting `CalendarEvent`,
import it in all three files, and make `telefono: string | null` required (not optional) so every
producer must state the value explicitly.

## Info

### IN-01: Column `render` callbacks annotate `value: string` for a `string | null` column

**File:** `frontend/src/app/dashboard/reportes/financieros/cuentas/page.tsx:34-38,65-69`, `frontend/src/app/dashboard/reportes/operativos/ausentismo/page.tsx:27-31`
**Issue:** `render: (value: string) => formatTelefono(value)` — `ColumnDef.render` is typed
`(value: any, row: T)` (`TablaReporte.tsx:19`), so the `string` annotation is accepted but is false:
`CuentaPorCobrar.telefono`, `CuentaMorosa.telefono` and `PacienteAusentista.telefono` are all
`string | null`. Harmless today because `formatTelefono` accepts `null`, but it removes the
compiler's ability to object if the body ever becomes `value.trim()`.
**Fix:** `render: (value: string | null) => formatTelefono(value)` at all three sites.

### IN-02: `tel:` href uses the raw, unencoded, untrimmed value

**File:** `frontend/src/components/crm/ListaEsperaSheet.tsx:92-99`
**Issue:** The presence branch renders `href={`tel:${p.telefono}`}` and `{p.telefono}` raw, while the
absence branch goes through `formatTelefono` (which trims). Since `normalizeTelefono` only enforces
`length >= 6` and no character set, a stored value with spaces or `#` produces a malformed `tel:`
URI and the displayed number differs in whitespace from every other screen.
**Fix:** `href={`tel:${encodeURIComponent(p.telefono!.trim())}`}` and render
`{formatTelefono(p.telefono)}` in both branches.

### IN-03: `AutocompletePaciente` omits the field instead of using the "-" placeholder

**File:** `frontend/src/components/AutocompletePaciente.tsx:190-193`
**Issue:** `{tieneTelefono(pac.telefono) ? ` — Tel: ${pac.telefono}` : ""}` drops the whole
"Tel:" segment, diverging from the D-03 placeholder contract that every other display site follows,
and interpolates the untrimmed raw value. Defensible for a dense suggestion row, but it is an
undocumented exception to the phase's own display rule.
**Fix:** either use `` — Tel: ${formatTelefono(pac.telefono)}`` for consistency, or add a short
comment recording the deliberate exception so the next reviewer does not "fix" it.

### IN-04: Blocked free-text placeholder still blames the 24h window

**File:** `frontend/src/components/whatsapp/WAThreadView.tsx:252-258`
**Issue:** The textarea is now disabled by `!canSendFreeText || !!motivoBloqueoWA`, but the
placeholder only branches on `canSendFreeText`. A patient inside an open 24h window with no phone
sees an enabled-looking "Responder directamente..." placeholder on a disabled field, with the real
reason only reachable via the send-button tooltip.
**Fix:** `placeholder={motivoBloqueoWA ?? (canSendFreeText ? 'Responder directamente...' : 'Sin ventana de 24h activa')}`.

### IN-05: `handleSendFreeText` does not re-check the block

**File:** `frontend/src/components/whatsapp/WAThreadView.tsx:86-91`
**Issue:** The handler guards only `if (!text) return;`. It is reachable from the Enter keydown and
the button, both currently disabled, and the backend `requireTelefonoParaEnvio` is the real
enforcement — so this is defense-in-depth only, not a live hole. Still, the guard lives entirely in
the render tree, so any future refactor that re-enables the control leaks a send attempt.
**Fix:** `if (!text || motivoBloqueoWA) return;`.

### IN-06: Read-only contacto row shows an empty input rather than the "-" placeholder

**File:** `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx:593-599`
**Issue:** Outside edit mode the teléfono field renders `<EditableInput disabled value={contactoForm.telefono ?? ""} />`,
so a phone-less patient sees a blank box here while every other surface shows `-`. The `?? ""` added
by this phase silences the type error without addressing the display contract.
**Fix:** render `formatTelefono(contactoForm.telefono)` as static text when `!isEditing("contacto")`.

### IN-07: `formatTelefono` doc comment says it does not format, but it trims

**File:** `frontend/src/lib/telefono.ts:17-26`
**Issue:** The JSDoc states "No formatea el número, sin separadores ni prefijo de país; sólo
resuelve la ausencia", yet the implementation returns `value.trim()`, not `value`. Callers that
compare a rendered value against the stored one (or that mix raw interpolation with
`formatTelefono`, as in IN-02) can observe the difference.
**Fix:** amend the comment to "devuelve el valor recortado (trim) o `-`", or return `value`
unchanged and let callers trim.

---

_Reviewed: 2026-08-21T21:31:27Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
