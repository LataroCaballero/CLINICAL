# Phase 68: Creación Inline en el Autosuggest (Frontend) - Pattern Map

**Mapped:** 2026-08-18
**Files analyzed:** 6 (1 central component modified, 3 call sites modified, 1 hook optionally modified, 1 new component optional)
**Analogs found:** 5 / 6 — one behavior (an RHF form rendered inside a `PopoverContent`) has **no analog anywhere in the repo**; see "No Analog Found"

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/components/AutocompletePaciente.tsx` (`:15-20` Props, `:32-33` `showDropdown`, `:84-90` `PopoverContent`, `:97-125` result rows) | component (search + create widget) | request-response (query) + CRUD (create) | itself (extend in place) + `frontend/src/components/ObjectionSelect.tsx` (search-popover that also creates from the typed query) | exact for the row/visual pattern; role-match for the create behavior |
| the mini-form (inside `AutocompletePaciente.tsx` **or** new `frontend/src/components/InlineCreatePaciente.tsx`) | component (form) | CRUD (create) | `frontend/src/app/dashboard/pacientes/components/NewPacienteModal.tsx` | exact for schema/payload/mutate/error-routing; **no analog** for "form rendered inside a Popover" |
| the `➕ Crear paciente "«query»"` row (D-01/D-02) | component (list row) | — | `AutocompletePaciente.tsx:99-125` (visual) + `frontend/src/components/CategoriaProductoCombobox.tsx:84-92` (the `Plus` + `Crear …: "{query}"` copy/gating idiom) | exact (composite of two in-repo rows) |
| `PopoverContent` `onEscapeKeyDown` / `onPointerDownOutside` (D-13/D-14) | component (interaction) | event-driven | `frontend/src/components/ObjectionSelect.tsx:79-82` — the **only** outside-interaction interception in the whole frontend | partial — it uses `onInteractOutside` + `stopPropagation()`, which is **not** the same as `preventDefault()`. See the caveat below; do not copy it blindly |
| `frontend/src/app/dashboard/components/QuickAppointment.tsx:363-367` | component (call site) | — | `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx:214-227` | exact — same component, same prop set |
| `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx:214-227` | component (call site) | — | `SurgeryAppointmentModal.tsx:223-236` | exact |
| `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx:223-236` | component (call site) | — | `NewAppointmentModal.tsx:214-227` | exact |
| `frontend/src/hooks/useCreatePaciente.ts` (optional, Claude's Discretion) | hook (mutation) | CRUD | itself (`:12-15`) + `frontend/src/hooks/usePacienteSuggest.ts:11` for the query-key shape | exact |

## Pattern Assignments

### `frontend/src/components/AutocompletePaciente.tsx` (component, request-response + CRUD)

**Analog:** itself — everything the new code needs is already in this file. Extend, do not restructure.

**Imports pattern** (`:1-13`) — note `useUIStore` comes from `@/lib/stores/useUIStore`, `cn` from `@/lib/utils`, icons from `lucide-react`:
```tsx
"use client";

import { useState } from "react";
import { usePacienteSuggest } from "@/hooks/usePacienteSuggest";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/lib/stores/useUIStore";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Loader2, X } from "lucide-react";
```

**Props block to extend** (`:15-27`) — all props are optional except `onSelect`; the two new props (D-08 + the enable flag) must be optional so the two filter call sites stay untouched (ALTA-07):
```tsx
type Props = {
  onSelect: (paciente: any) => void;
  value?: string;
  avatarUrl?: string | null;
  onClear?: () => void;
};

export default function AutocompletePaciente({
  onSelect,
  value,
  avatarUrl,
  onClear,
}: Props) {
```

**State + open condition** (`:28-33`) — the single integration point for D-02/D-03:
```tsx
const [query, setQuery] = useState("");
const { data = [], isFetching } = usePacienteSuggest(query);
const { focusModeEnabled: fm } = useUIStore();

const showDropdown =
  !value && query.length > 0 && (data.length > 0 || isFetching);
```

**Popover shell** (`:39`, `:84-90`) — `modal={false}` and `onOpenAutoFocus` prevented are already set; `open` is fully controlled by `showDropdown` and there is **no `onOpenChange`**, so today the popover cannot be closed by Radix at all — it closes only when `showDropdown` flips false:
```tsx
<Popover open={showDropdown} modal={false}>
  ...
  <PopoverContent
    className="p-0 overflow-y-auto max-h-60"
    align="start"
    sideOffset={4}
    style={{ width: "var(--radix-popper-anchor-width)" }}
    onOpenAutoFocus={(e) => e.preventDefault()}
  >
```
Consequence for D-04/D-13/D-14: while the mini-form is open, `showDropdown` must be forced true (or the form state must be part of the open condition), otherwise a late-arriving `data`/`isFetching` transition unmounts the form. `onOpenAutoFocus={(e) => e.preventDefault()}` currently blocks autofocus — D-04 requires focusing the first empty field, so that has to be done explicitly (`setTimeout(() => ref.current?.focus(), 50)`, per the `NewPacienteModal.tsx:77-81` idiom) rather than by removing this line, which would steal focus from the search input in the normal search flow.

**Result row — the exact visual mold for the `➕ Crear` row** (`:97-125`). Note `type="button"` at `:101` and the `w-full … hover:bg-gray-100` shape:
```tsx
{!isFetching &&
  data.map((pac: any) => (
    <button
      key={pac.id}
      type="button"
      onClick={() => {
        onSelect(pac);
        setQuery("");
      }}
      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 cursor-pointer"
    >
      {pac.fotoUrl ? (
        <img src={pac.fotoUrl} className="h-7 w-7 rounded-full object-cover" />
      ) : (
        <div className="h-7 w-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-semibold">
          {getInitial(pac.nombreCompleto)}
        </div>
      )}
      <div className="flex flex-col">
        <span className="font-medium">{pac.nombreCompleto}</span>
        <span className="text-xs text-gray-500">
          DNI: {pac.dni} — Tel: {pac.telefono}
        </span>
      </div>
    </button>
  ))}
```
Also note `{!isFetching && ...}` gates the whole list — the `➕ Crear` row belongs **inside/after** this same `!isFetching` branch so it never renders while the spinner (`:91-95`) is up, which is exactly the D-03 "fetch already resolved" requirement.

**Loading row** (`:91-95`) — reuse this padding/typography scale for any status line the mini-form adds:
```tsx
{isFetching && (
  <div className="flex items-center gap-2 p-2 text-sm text-gray-500">
    <Loader2 className="w-4 h-4 animate-spin" /> Buscando...
  </div>
)}
```

**Focus-mode treatment** (`:73-79`) — the pattern the new form fields must copy:
```tsx
{!value && (
  <Input
    placeholder="Buscar paciente por nombre, DNI o teléfono"
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    className={cn(fm && "bg-[var(--fc-bg-surface)] border-[var(--fc-border)] text-[var(--fc-text-primary)] placeholder:text-slate-500")}
  />
)}
```

**`type="button"` precedent inside this component** (`:59-68`) — the clear button already does it:
```tsx
<button
  type="button"
  onClick={() => {
    onClear?.();
    setQuery("");
  }}
  className="text-indigo-900/60 hover:text-indigo-900 transition"
>
```

---

### The mini-form (component, CRUD) — mold: `NewPacienteModal.tsx`

**Analog:** `frontend/src/app/dashboard/pacientes/components/NewPacienteModal.tsx`

**Imports pattern** (`:1-29`, trimmed to what a 3-field form needs) — `@hookform/resolvers/zod`, `sonner`, `@/hooks/useCreatePaciente`:
```tsx
"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreatePaciente } from "@/hooks/useCreatePaciente";
import { toast } from "sonner";
```

**Zod schema** (`:31-46`) — **read with D-15: `telefono` at `:34` is REQUIRED here and must NOT be replicated.** The `min(7)` / `min(3)` rules and the Spanish message style DO carry over; the `email` field (`:35-41`) shows the repo's "optional but validated if present" idiom, which is the shape `telefono` needs in the mini-form:
```tsx
const schema = z.object({
  dni: z.string().min(7, "Mínimo 7 dígitos"),
  nombreCompleto: z.string().min(3, "Mínimo 3 caracteres"),
  telefono: z.string().min(6, "Teléfono inválido"),   // <-- D-15: do NOT copy as-is
  email: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()),
      { message: "Email inválido" }
    ),
  obraSocialId: z.string().optional(),
  plan: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
```
The `email` `.optional().refine((val) => !val || val.trim() === "" || <rule>)` shape is the in-repo template for the D-15 optional-telefono rule (empty is valid, non-empty must satisfy ≥6).

**RHF wiring** (`:60-71`) — note `setError` is already destructured, which is what the 409 path needs:
```tsx
const {
  register,
  handleSubmit,
  reset,
  watch,
  setValue,
  setError,
  formState: { errors },
} = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { dni: "", nombreCompleto: "", telefono: "", email: "", obraSocialId: "", plan: "" },
});
```

**Focus-on-open idiom** (`:58`, `:76-81`) — the pattern for D-04 ("focus jumps to the first empty field"):
```tsx
const nombreRef = useRef<HTMLInputElement>(null);
...
// Focus DNI al abrir
useEffect(() => {
  if (open) {
    setTimeout(() => nombreRef.current?.focus(), 50);
  }
}, [open]);
```
and the ref-merge hack it uses to combine `register()`'s ref with a local ref (`:135-142`):
```tsx
<Input
  {...register("nombreCompleto")}
  ref={(el) => {
    register("nombreCompleto").ref(el);
    (nombreRef as any).current = el;
  }}
  placeholder="Juan Pérez"
/>
```

**Payload shape (D-06)** (`:83-95`) — copy verbatim minus `email`/`obraSocialId`/`plan`, keeping `profesionalId: profesionalId ?? undefined`:
```tsx
function onSubmit(data: FormValues) {
  const payload = {
    dni: data.dni.trim(),
    nombreCompleto: data.nombreCompleto.trim(),
    telefono: data.telefono.trim(),
    email: data.email?.trim() || undefined,
    obraSocialId: data.obraSocialId || undefined,
    plan: data.plan || undefined,
    profesionalId: profesionalId ?? undefined,
    estado: "ACTIVO",
    consentimientoFirmado: false,
    indicacionesEnviadas: false,
  };
```
Difference for D-08: here `profesionalId` comes from `useEffectiveProfessionalId()` called inside the component (`:55`); in the mini-form it arrives as a **prop** instead — same `?? undefined` fallback, different source.

**`mutate` + error routing (D-07/D-12) — THE pattern to clone** (`:97-115`):
```tsx
mutate(payload, {
  onSuccess: () => {
    toast.success(`${data.nombreCompleto} creado correctamente`);
    reset();
    // Focus de vuelta al primer campo para cargar otro inmediatamente
    setTimeout(() => nombreRef.current?.focus(), 50);
  },
  onError: (error: any) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error?.message;

    if (status === 409 || message?.includes("DNI")) {
      setError("dni", { message: "Este DNI ya está registrado" });
      return;
    }
    toast.error(message || "Error al crear el paciente");
  },
});
```
For D-07 the `onSuccess` body changes to: `toast.success(...)` → `onSelect(createdPaciente)` (the `mutate` `onSuccess` first arg is the POST response body, a full Prisma `Paciente`, superset of `{ id, nombreCompleto, fotoUrl }`) → `setQuery("")` → close the form. The `onError` branch is copied unchanged.

**Field + inline error block** (`:150-165`) — the repo's error rendering (`Alert variant="destructive"`, not a bare `<p>`); this is where the 409 `setError('dni')` surfaces:
```tsx
<div className="grid gap-1.5">
  <label className="text-sm font-medium text-muted-foreground">
    DNI <span className="text-destructive">*</span>
  </label>
  <Input
    {...register("dni")}
    placeholder="40111222"
    inputMode="numeric"
  />
  {errors.dni && (
    <Alert variant="destructive" className="py-2">
      <AlertDescription>{errors.dni.message}</AlertDescription>
    </Alert>
  )}
</div>
```
Optional-field label variant (`:184-187`) — the exact copy for "Teléfono (opcional)":
```tsx
<label className="text-sm font-medium text-muted-foreground">
  Email <span className="text-muted-foreground/60 font-normal">(opcional)</span>
</label>
```

**Footer buttons + `isPending`** (`:237-244`) — the Cancelar/Crear pair and the pending label:
```tsx
<div className="flex justify-end gap-2 pt-2">
  <Button type="button" variant="outline" onClick={handleClose}>
    Cerrar
  </Button>
  <Button type="submit" disabled={isPending}>
    {isPending ? "Creando..." : "Crear paciente"}
  </Button>
</div>
```
**Critical deviation:** `type="submit"` here is safe because this form is the only form on screen. In the mini-form it is **not** — see "Shared Patterns → No nested `<form>`" below.

**Teléfono input — `PhoneInput` caveat.** `NewPacienteModal.tsx:172-175` uses `PhoneInput` (controlled via `watch`/`setValue`, not `register`):
```tsx
<PhoneInput
  value={watch("telefono") || ""}
  onChange={(v: string) => setValue("telefono", v)}
/>
```
`frontend/src/components/PhoneInput.tsx` renders **its own `Popover`** for the country selector (`:263-315`) and a tooltip wrapper (`:258-260`). Dropping it into the mini-form nests Popover-inside-Popover-inside-Dialog — three layers of Radix dismiss handling, on top of the D-13/D-14 risk. It also strips non-digits on input (`:321-324`) and the dial code is **not** part of the emitted value. A plain `<Input inputMode="tel" {...register("telefono")} />` avoids the extra layer; if `PhoneInput` is used, its inner popover must be verified against Escape/click-outside in all three modals.

---

### The `➕ Crear paciente "«query»"` row (D-01/D-02)

**Analog A — visual/structural:** `AutocompletePaciente.tsx:99-125` (quoted above). Same `<button type="button" className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 cursor-pointer">`, icon slot on the left, text stack on the right.

**Analog B — copy + gating idiom:** `frontend/src/components/CategoriaProductoCombobox.tsx:84-92`:
```tsx
{!exists && query && (
  <CommandItem
    className="flex items-center gap-2 cursor-pointer px-3 py-2"
    onSelect={handleCreate}
  >
    <Plus className="h-4 w-4" />
    Crear categoría: "{query}"
  </CommandItem>
)}
```
Uses `Plus` from `lucide-react` (imported at `:14`), not a literal `➕` emoji — and CLAUDE.md/repo convention is lucide icons everywhere. `Crear categoría: "{query}"` is the existing copy shape.

**Analog C — create-from-query inside a search popover:** `frontend/src/components/ObjectionSelect.tsx:92-108`:
```tsx
<CommandEmpty>
  {query.length === 0 ? (
    <span className="text-gray-500 px-2 py-1 text-sm">
      Escribí para buscar
    </span>
  ) : (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleCreate();
      }}
      className="text-blue-600 underline px-2 py-1 text-sm"
    >
      Crear "{query}"
    </button>
  )}
</CommandEmpty>
```
This is the nearest behavioral precedent (search popover that creates the missing entity from the typed text) but it creates with a **single field and no form** — it is not a model for the mini-form itself.

---

### `PopoverContent` dismiss interception (D-13/D-14) — component, event-driven

**Wrapper confirmation** — `frontend/src/components/ui/popover.tsx:20-40`. `PopoverContent` destructures only `className`/`align`/`sideOffset` and spreads `...props` onto the primitive (`:36`), so `onEscapeKeyDown` and `onPointerDownOutside` reach `PopoverPrimitive.Content` with **no wrapper change needed** (confirms the CONTEXT.md assumption):
```tsx
function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn("bg-popover text-popover-foreground … z-50 w-72 … rounded-md border p-4 shadow-md outline-hidden", className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
```
Two things the planner must carry from this snippet: (a) the content is rendered through `PopoverPrimitive.Portal` (`:27`) — DOM-wise it lands on `document.body`, **outside** the turno modal's `<form>`; (b) the base class includes `p-4`, which `AutocompletePaciente` currently overrides with `p-0` (`:85`) — the mini-form needs its own padding wrapper since `p-0` stays for the result rows.

**The only outside-interaction interception in the repo** — `frontend/src/components/ObjectionSelect.tsx:79-82`:
```tsx
<PopoverContent
  className="p-0 w-64"
  onInteractOutside={(e) => e.stopPropagation()}
>
```
**Caveat — do not copy this verbatim for D-14.** Radix dismiss events are cancelled with `e.preventDefault()`; `e.stopPropagation()` on the custom event does not stop the Popover from closing (it only stops the DOM event from reaching outer layers). `ObjectionSelect` gets away with it because its popover *should* close on outside click — its intent is to keep the click from reaching the enclosing card. For D-14 the required call is `onPointerDownOutside={(e) => e.preventDefault()}` (and, given `AutocompletePaciente` has no `onOpenChange`, the `open` prop must also stay true while the form is mounted — otherwise the state-driven close wins regardless of the handler). Likewise D-13 needs `onEscapeKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); closeMiniForm(); }}` — `preventDefault()` stops Radix's Popover close, `stopPropagation()` stops the keydown from reaching the Dialog's own escape handler.

**There is no in-repo precedent for `onEscapeKeyDown`, `onPointerDownOutside`, or for a Popover intentionally refusing to close.** Zero matches across `frontend/src`. This is genuinely new ground — flag it for manual verification in all three modals (CONTEXT.md "Integration Points").

---

### `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx` (call site) — the template for all three

**Professional source** (`:39`, `:74`):
```tsx
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";
...
const effectiveProfessionalId = useEffectiveProfessionalId();
```

**Guard it already has** (`:130-134`) — the reason D-08 does not block creation when the id is null:
```tsx
const onSubmit = async (data: FormValues) => {
  if (!effectiveProfessionalId) {
    toast.error("Debe seleccionar un profesional");
    return;
  }
```

**Call site to extend** (`:210-228`) — note the `<form onSubmit={handleSubmit(onSubmit)}>` wrapper at `:210`:
```tsx
<form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
  {/* Paciente */}
  <div className="space-y-1">
    <Label>Paciente</Label>
    <AutocompletePaciente
      value={pacienteNombre}
      avatarUrl={pacienteFotoUrl}
      onClear={() => {
        setValue("pacienteId", "");
        setValue("pacienteNombre", "");
        setPacienteFotoUrl(null);
      }}
      onSelect={(pac) => {
        setValue("pacienteId", pac.id);
        setValue("pacienteNombre", pac.nombreCompleto);
        setPacienteFotoUrl(pac.fotoUrl || null);
      }}
    />
  </div>
```

**`SurgeryAppointmentModal.tsx`** is the same shape: `useEffectiveProfessionalId()` at `:86`, `<form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">` at `:214`, and the autocomplete at `:223-236` — except it is inside a `pacienteIdProp ? readOnlyDiv : <AutocompletePaciente …>` ternary (`:218-237`), so the new props go on the `else` branch only.

**`QuickAppointment.tsx`** differs in two ways worth planning around:
- Professional comes from its own prop, not the hook (`:147-151`):
```tsx
type Props = {
  profesionalId: string;
};

export default function QuickAppointment({ profesionalId }: Props) {
```
  It is typed `string` (non-nullable), unlike `effectiveProfessionalId: string | null` in the other two — the new prop on `AutocompletePaciente` should be `string | null | undefined` to accept both.
- **There is no `<form>` element anywhere in this file** (zero matches for `<form`). The autocomplete sits in a plain `div` (`:361-367`) and submission is a `Button onClick`:
```tsx
<div className="grid gap-4 py-4">
  {/* Paciente */}
  <AutocompletePaciente
    onSelect={(p) => setPaciente(p)}
    value={paciente?.nombreCompleto}
    avatarUrl={paciente?.fotoUrl}
  />
```
  It also passes **no `onClear`** — confirming every added prop must be optional.

---

### `frontend/src/hooks/useCreatePaciente.ts` (hook, CRUD) — optional extension

**Analog:** itself, plus `usePacienteSuggest.ts:11` for the key shape.

**Current state** (whole file):
```tsx
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreatePaciente() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post("/pacientes", data);
            return response.data;
        },
        onSuccess: () => {
            // Invalidar queries de pacientes para refrescar la lista
            queryClient.invalidateQueries({ queryKey: ["pacientes"] });
        },
    });
}
```
`mutationFn` returns `response.data` — the full Prisma `Paciente` — which is what `onSuccess`'s first callback arg receives and what gets handed to `onSelect` (D-07/ALTA-04, no adapter needed).

**Query key to invalidate** (`usePacienteSuggest.ts:10-11`) — the key is a 3-tuple, so the `["pacientes-suggest"]` prefix matches every debounce/professional variant:
```tsx
return useQuery({
  queryKey: ["pacientes-suggest", debounced, profesionalId],
```
Add a second `queryClient.invalidateQueries({ queryKey: ["pacientes-suggest"] });` next to the existing line if the discretionary item is taken.

**Import-path caveat:** this hook imports `api` from `@/lib/api`, while `usePacienteSuggest.ts:2` and `ObjectionSelect.tsx:19` import from `@/lib/axios`. Both exist in the repo; new code touching each file should keep that file's existing import, not unify them.

---

### `frontend/src/hooks/usePacienteSuggest.ts` — read-only, but two gotchas for D-03/D-08

**Whole file:**
```tsx
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useDebounce } from "@/hooks/useDebounce";
import { useEffectiveProfessionalId } from "@/hooks/useEffectiveProfessionalId";

export function usePacienteSuggest(query: string) {
  const debounced = useDebounce(query, 300);
  const profesionalId = useEffectiveProfessionalId();

  return useQuery({
    queryKey: ["pacientes-suggest", debounced, profesionalId],
    queryFn: async () => {
      const res = await api.get("/pacientes/suggest", {
        params: { q: debounced, ...(profesionalId ? { profesionalId } : {}) },
        withCredentials: true,
      });
      return res.data;
    },
    enabled: debounced.length > 0,
  });
}
```

1. **The debounced value is not exposed.** `AutocompletePaciente` only holds the raw `query`. D-03's "≥3 chars **in the debounced query**, fetch already resolved" therefore cannot be expressed from the component with what the hook returns today. Options for the planner: call `useDebounce(query, 300)` a second time in `AutocompletePaciente` (`frontend/src/hooks/useDebounce.ts` is a plain generic hook — a second call with the same input/delay converges to the same value, at the cost of a second timer), or widen the hook's return to include `debounced`. Pair the char check with `!isFetching` and TanStack's `isSuccess`/`isFetched` so the pre-first-fetch `data=[] && !isFetching` window (the exact false negative D-03 calls out) is excluded.
2. **The search filter's professional is resolved internally** via `useEffectiveProfessionalId()`, *not* from a prop. So after this phase the same component will filter its search by the hook value while creating with the prop value (D-08). For `NewAppointmentModal`/`SurgeryAppointmentModal` those are the same value; for `QuickAppointment` (prop-driven, possibly a professional other than the globally selected one) they can diverge — a patient can be created under professional A while the search list is filtered by professional B. Worth an explicit note in the plan; changing the search filter is **not** in scope.

**`frontend/src/hooks/useEffectiveProfessionalId.ts`** (whole file) — the `null` case D-08 is built around:
```tsx
export function useEffectiveProfessionalId(): string | null {
    const { selectedProfessionalId } = useProfessionalContext();
    const { data: user } = useCurrentUser();

    if (!user) return null;

    // Profesional → siempre su propio profesionalId
    if (user.rol === 'PROFESIONAL') {
        return user.profesionalId;
    }

    // Admin / Secretaria / Facturador
    return selectedProfessionalId;
}
```

---

## Shared Patterns

### No nested `<form>` — submit via `handleSubmit(onSubmit)()` from a `type="button"` button

**Source:** `AutocompletePaciente.tsx:60` and `:101` (`type="button"` on every clickable inside the popover), plus `NewAppointmentModal.tsx:210` / `SurgeryAppointmentModal.tsx:214` (the enclosing `<form onSubmit={handleSubmit(onSubmit)}>`).

**Apply to:** every button and every submit path in the mini-form.

Two independent hazards, both real here:
- A `<button>` with no `type` defaults to `type="submit"` and, inside the turno modal's `<form>`, submits the **turno** instead of creating the patient (CONTEXT.md flags this).
- Rendering a real `<form>` inside `PopoverContent` looks safe because of the Portal (`popover.tsx:27` puts it on `document.body`, so there is no invalid DOM form-in-form), **but React synthetic events propagate along the React tree, not the DOM tree** — a `submit` from the portaled inner form still bubbles to the outer `<form onSubmit={handleSubmit(onSubmit)}>` handler in `NewAppointmentModal`/`SurgeryAppointmentModal`. Safest shape: no inner `<form>` element at all; a `<div>` plus `<Button type="button" onClick={handleSubmit(onCreate)}>`, with Enter handled explicitly via `onKeyDown` if wanted. `QuickAppointment` has no `<form>` and would not expose this, which is exactly why it must not be the only modal tested.

### Backend error reading: `error.response.data.message`, no structured codes

**Source:** `NewPacienteModal.tsx:104-113` (quoted above). Same shape at `NewAppointmentModal.tsx:172-174` and `SurgeryAppointmentModal.tsx:171-174`:
```tsx
} catch (err: any) {
  const msg = err?.response?.data?.message || "Error al crear el turno";
  toast.error(msg);
}
```
**Apply to:** the mini-form's `onError`. Discriminant for the 409 stays `status === 409 || message?.includes("DNI")` — the backend throws a plain `ConflictException('El DNI ingresado ya está registrado.')` (Phase 67, D-10; `pacientes.service.ts:94-96`), so there is no error code to switch on.

### `sonner` toasts for mutation feedback

**Source:** `NewPacienteModal.tsx:29` (`import { toast } from "sonner";`), `:99` (`toast.success(...)`), `:112` (`toast.error(...)`); same import/usage in all three turno modals.
**Apply to:** the mini-form's success (D-07) and non-409 error (D-12) paths.

### Inline field errors via `Alert variant="destructive"`

**Source:** `NewPacienteModal.tsx:143-147`, `:160-164`, `:176-180`, `:192-196` — four identical blocks:
```tsx
{errors.<field> && (
  <Alert variant="destructive" className="py-2">
    <AlertDescription>{errors.<field>.message}</AlertDescription>
  </Alert>
)}
```
**Apply to:** all three mini-form fields, and specifically to the DNI field where the 409 `setError("dni", …)` lands (ALTA-05). Inside a `max-h-60` popover this block adds vertical height — the popover's `overflow-y-auto` (`AutocompletePaciente.tsx:85`) already handles it, but the planner should consider raising `max-h` while the form is open.

### Focus mode (`useUIStore` + `--fc-*` CSS variables)

**Source:** `AutocompletePaciente.tsx:30` (`const { focusModeEnabled: fm } = useUIStore();`) and `:78`:
```tsx
className={cn(fm && "bg-[var(--fc-bg-surface)] border-[var(--fc-border)] text-[var(--fc-text-primary)] placeholder:text-slate-500")}
```
Fuller variant including hover, from `ObjectionSelect.tsx:72`:
```tsx
className={cn("w-full flex items-center justify-between border rounded px-2 py-1 text-sm", fm ? "bg-[var(--fc-bg-surface)] border-[var(--fc-border)] text-[var(--fc-text-primary)] hover:bg-[var(--fc-bg-hover)]" : "bg-white hover:bg-gray-50")}
```
**Apply to:** the three mini-form `Input`s and the `➕ Crear` row's hover state. Note: `fm` is already destructured in `AutocompletePaciente` — if the mini-form becomes its own component it must call `useUIStore()` itself or receive `fm` as a prop. Also note the popover **panel** never gets `--fc-*` treatment anywhere in the repo (`popover.tsx:33` hardcodes `bg-popover`), and the result rows use `hover:bg-gray-100` unconditionally — matching existing behavior means styling the inputs, not the panel.

### `cn()` from `@/lib/utils` for all conditional classes

**Source:** `AutocompletePaciente.tsx:7`, `ObjectionSelect.tsx:22`, `CategoriaProductoCombobox.tsx:15`. No template-literal class concatenation in these files (`PhoneInput.tsx:297-301` does use one — it is the outlier, not the convention).

## No Analog Found

| File / behavior | Role | Data Flow | Reason |
|---|---|---|---|
| An RHF + zodResolver form rendered **inside** a `PopoverContent` | component (form) | CRUD | Zero instances in `frontend/src`. Cross-checking every file that imports `PopoverContent` (22 files) against those containing `<form`, the only 4 hits are `NewAppointmentModal.tsx`, `SurgeryAppointmentModal.tsx`, `NewOrdenCompraModal.tsx`, `CargaFacturaModal.tsx` — in all four the `<form>` is in the Dialog body and the Popover holds a date picker or combobox, never a form. Every existing multi-field form in the repo lives in a `DialogContent`. The planner should treat layout/padding/height inside the popover as new work, using `NewPacienteModal`'s field markup for the field internals only. |
| `onEscapeKeyDown` / `onPointerDownOutside` interception (D-13/D-14) | component (interaction) | event-driven | Zero matches for either prop across `frontend/src`. The single nearest neighbor is `ObjectionSelect.tsx:81` (`onInteractOutside={(e) => e.stopPropagation()}`), whose intent is the opposite (let the popover close, keep the click from the parent) and whose `stopPropagation()` does **not** cancel a Radix dismiss. There is also no existing case of a Popover deliberately staying open. This is the phase's main technical risk and has no copyable precedent. |
| Radix Popover **inside** a Radix Dialog with dismiss coordination | component (interaction) | event-driven | The nesting itself is common (`AutocompletePaciente`, `BirthDatePicker`, `PlanCombobox`, `PhoneInput` all sit inside Dialogs), but **no** call site anywhere coordinates the two dismiss layers — every one accepts the default cascade. So the nesting has precedent; the coordination does not. |
| A component that both searches and creates a **multi-field** entity from one popover | component | CRUD | `ObjectionSelect`, `PlanCombobox`, `TratamientosCombobox`, `DiagnosticoCombobox` and `CategoriaProductoCombobox` all create from a **single** free-text field with no validation and no error routing. None is a usable mold for a validated 3-field creation; `NewPacienteModal` is, but it is a Dialog. |

## Metadata

**Analog search scope:** `frontend/src/components/`, `frontend/src/components/ui/`, `frontend/src/components/data-table/`, `frontend/src/hooks/`, `frontend/src/app/dashboard/turnos/`, `frontend/src/app/dashboard/components/`, `frontend/src/app/dashboard/pacientes/components/`; repo-wide greps over `frontend/src` for `onPointerDownOutside|onEscapeKeyDown|onInteractOutside|onFocusOutside`, `stopPropagation`, `PopoverContent`, `AutocompletePaciente`, `--fc-`
**Files scanned:** ~14 (7 read in full: `AutocompletePaciente.tsx`, `NewPacienteModal.tsx`, `ui/popover.tsx`, `usePacienteSuggest.ts`, `useCreatePaciente.ts`, `useEffectiveProfessionalId.ts`, `ObjectionSelect.tsx`; 5 read partially: the three turno modals, `PhoneInput.tsx`, `CategoriaProductoCombobox.tsx`, `PlanCombobox.tsx`; 2 grepped only: `PatientFilters.tsx`, `data-table-toolbar.tsx`)
**Project skills:** none — neither `.claude/skills/` nor `.agents/skills/` exists in this repo
**Pattern extraction date:** 2026-08-18
