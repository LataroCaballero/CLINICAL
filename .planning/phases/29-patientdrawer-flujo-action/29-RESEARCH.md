# Phase 29: PatientDrawer Flujo Action - Research

**Researched:** 2026-04-29
**Domain:** TanStack Query optimistic updates + NestJS Prisma $transaction + shadcn Dialog + sonner toast
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Placement del trigger**
- PencilIcon pequeño (Lucide, w-3 h-3) junto al FlujoBadge en `PacienteDetails`, en el bloque del nombre/info básica
- Siempre visible para cualquier flujo (PENDIENTE, CIRUGIA, TRATAMIENTO) — el profesional puede reclasificar en cualquier momento
- Después del cambio exitoso: el drawer permanece abierto mostrando el nuevo FlujoBadge (actualización optimista visible inmediatamente)

**Contenido del modal de confirmación**
- El modal muestra los efectos automáticos explícitamente: "El paciente quedará en la etapa Sin Clasificar y se registrará un contacto automático."
- Tono de acción normal (primario/azul), no destructivo — el cambio es reversible
- La nota del contacto automático es fija: "Paciente pendiente de clasificación" — sin campo editable en el modal

**Selector de flujo en el modal**
- 3 cards/botones seleccionables con los colores del FlujoBadge existente: azul (CIRUGÍA), verde (TRATAMIENTO), ámbar (PENDIENTE)
- El flujo actual del paciente viene pre-seleccionado
- El botón "Confirmar" permanece deshabilitado si la selección no cambia respecto al flujo actual (previene noop calls al backend)
- Al seleccionar un flujo diferente → botón se habilita → click → optimistic update → llamada al backend

**Caché post-cambio y feedback**
- Queries a invalidar en TanStack Query al cambio exitoso: `['paciente', id]`, `['pacientes']`, `['kanban']`
- Toast sonner: "✓ Flujo actualizado a CIRUGÍA" + link "Ver en CRM →" (navega al Kanban CRM)
- En caso de error de backend: revert del optimistic update + toast de error (PAC-03)

### Claude's Discretion
- Copy exacto del modal (título, descripción, label de botones)
- Diseño del hover state del PencilIcon (visible siempre vs solo en hover del área del badge)
- Loading state del botón Confirmar mientras espera respuesta del backend
- Tipo de Lucide icon para el PencilIcon (Pencil, PencilLine, Edit2, etc.)

### Deferred Ideas (OUT OF SCOPE)
None — la discusión se mantuvo dentro del scope de Phase 29.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAC-02 | El profesional puede cambiar el flujo de un paciente desde el PatientDrawer mediante un modal de confirmación | FlujoBadge colors verified, PencilIcon placement at line ~108 in PacienteDetails.tsx, shadcn Dialog pattern confirmed from existing modals |
| PAC-03 | El cambio de flujo en PatientDrawer es optimista — se aplica de inmediato en UI, con toast de error si el endpoint falla | TanStack Query optimistic update via local state + invalidate pattern; sonner `toast.error()` established in AppointmentDetailModal; `toast()` with `action:` confirmed in dashboard/page.tsx |
| PAC-04 | Al cambiar el flujo, el paciente se asigna automáticamente a la etapa CRM "Sin Clasificar" en la misma transacción | `EtapaCRM` enum has no `SIN_CLASIFICAR` value — backend represents it as `null`; updateFlujo() at service line 952 must be extended with `$transaction`; kanban service reads `null` etapaCRM as SIN_CLASIFICAR at line 671 |
| PAC-05 | Al cambiar el flujo, se registra automáticamente un contacto con nota "Paciente pendiente de clasificación" | `ContactoLog` model confirmed — fields: pacienteId, profesionalId, tipo (SISTEMA), nota; updateFlujo must receive profesionalId to create the log; paciente.profesionalId is available on the record |
</phase_requirements>

---

## Summary

Phase 29 adds a single UX touch-point (PencilIcon next to FlujoBadge in PacienteDetails) that opens a shadcn Dialog modal. The modal presents three color-coded cards matching FlujoBadge colors, pre-selects the current flujo, and only enables the Confirm button when the selection differs. On confirm, the UI updates optimistically (local state on the paciente object), the backend runs one extended `$transaction`, and TanStack Query caches are invalidated.

The backend side is the most nuanced piece. The existing `updateFlujo()` method in `pacientes.service.ts` (line 952) only does a plain `prisma.paciente.update({ data: { flujo } })`. It must be extended to a three-step `$transaction`: (1) update `flujo`, (2) set `etapaCRM = null` (which the kanban already maps to SIN_CLASIFICAR at line 671), and (3) create a `ContactoLog` with `tipo: SISTEMA, nota: "Paciente pendiente de clasificación"`. The `profesionalId` is already on the `Paciente` record so no new API parameter is needed — the service can read it from the pre-fetched row.

The frontend hook (`useUpdateFlujo`) follows the exact same pattern as `useUpdateListaEspera` and `useCreateContacto` — `useMutation` from TanStack Query, `api.patch(...)`, and `queryClient.invalidateQueries` in `onSuccess`. The optimistic update is managed with local state inside `PacienteDetails` (or lifted to the modal component), reverting in the hook's `onError`. The success toast uses sonner's `action` field (pattern confirmed in `dashboard/page.tsx`) to render the "Ver en CRM →" link that switches the pacientes page view to "embudo".

**Primary recommendation:** Implement as two tasks — (1) backend: extend `updateFlujo` service method with `$transaction`, (2) frontend: new `useUpdateFlujo` hook + `CambiarFlujoModal` component + PencilIcon trigger in `PacienteDetails`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TanStack Query | ^5 (existing) | `useMutation` for optimistic update + cache invalidation | Already in use across all hooks |
| sonner | existing | `toast()` with `action` field for success link | Already installed; `Toaster` in `app/layout.tsx` |
| shadcn Dialog | existing | Confirmation modal | Same pattern as `HCCreatorDialog`, `PatientFormModal` |
| Prisma `$transaction` | existing | Atomic flujo + etapaCRM + ContactoLog write | Established in `setInsumos`, `updateEtapaCRM` patterns |
| Lucide React | existing | PencilLine icon (w-3 h-3) | Already imported in `PacienteDetails.tsx` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useEffectiveProfessionalId` | internal hook | Get profesionalId for ContactoLog | Called in modal to pass to mutation |
| `useQueryClient` | TanStack Query | Cache invalidation in `onSuccess` | Inside `useUpdateFlujo` hook |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local state optimistic update | TanStack `onMutate`/`cancelQueries` | Full TanStack optimistic adds complexity; local state simpler given single component owns the badge display |
| etapaCRM = null for SIN_CLASIFICAR | New enum value SIN_CLASIFICAR | Schema change not needed — backend already uses null → SIN_CLASIFICAR mapping in kanban (line 671); no migration required |

**Installation:** No new packages needed — all dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── hooks/
│   └── useUpdateFlujo.ts          # NEW: useMutation hook
├── app/dashboard/pacientes/
│   └── components/
│       ├── PacienteDetails.tsx    # MODIFY: add PencilIcon + modal state
│       └── CambiarFlujoModal.tsx  # NEW: Dialog with flujo selector cards
backend/src/modules/pacientes/
├── pacientes.service.ts           # MODIFY: extend updateFlujo()
└── (dto/update-flujo.dto.ts)      # NO CHANGE NEEDED
```

### Pattern 1: useMutation hook for PATCH /pacientes/:id/flujo
**What:** Thin mutation hook following repo conventions (`useUpdateListaEspera` pattern)
**When to use:** Any component needing to trigger the flujo change

```typescript
// frontend/src/hooks/useUpdateFlujo.ts
// Source: pattern from useUpdateListaEspera.ts + useCreateContacto.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useUpdateFlujo(pacienteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flujo: "CIRUGIA" | "TRATAMIENTO" | "PENDIENTE") => {
      const { data } = await api.patch(`/pacientes/${pacienteId}/flujo`, { flujo });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paciente", pacienteId] });
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban"] });
    },
  });
}
```

### Pattern 2: Optimistic update with local state + revert
**What:** Apply flujo change immediately in local state before API response; revert on error
**When to use:** PAC-03 — immediate UI feedback without full TanStack `onMutate` cycle

```typescript
// Inside CambiarFlujoModal or PacienteDetails
// Source: established pattern from AppointmentDetailModal + useActualizarMontoPagado comments
const [optimisticFlujo, setOptimisticFlujo] = useState<string | null>(null);
const displayFlujo = optimisticFlujo ?? paciente.flujo;

const handleConfirmar = async () => {
  const previousFlujo = paciente.flujo;
  setOptimisticFlujo(selectedFlujo);
  onClose();
  mutation.mutate(selectedFlujo, {
    onError: () => {
      setOptimisticFlujo(previousFlujo); // revert
      toast.error("Error al actualizar el flujo. Intenta nuevamente.");
    },
    onSuccess: () => {
      toast("Flujo actualizado a " + FLUJO_LABELS[selectedFlujo], {
        action: {
          label: "Ver en CRM →",
          onClick: () => { /* switch pacientes page to embudo view */ },
        },
      });
    },
  });
};
```

### Pattern 3: Backend $transaction in updateFlujo
**What:** Extend service method to atomically update flujo + etapaCRM + create ContactoLog
**When to use:** PAC-04 + PAC-05 — side effects must not be orphaned

```typescript
// backend/src/modules/pacientes/pacientes.service.ts — updateFlujo method
// Source: $transaction pattern from setInsumos (Phase 26) + updateEtapaCRM (lines 545-568)
async updateFlujo(id: string, flujo: FlujoPaciente) {
  const paciente = await this.prisma.paciente.findUnique({
    where: { id },
    select: { id: true, profesionalId: true },
  });
  if (!paciente) throw new NotFoundException('Paciente no encontrado');

  return this.prisma.$transaction([
    this.prisma.paciente.update({
      where: { id },
      data: { flujo, etapaCRM: null },   // null = SIN_CLASIFICAR in kanban
    }),
    ...(paciente.profesionalId
      ? [
          this.prisma.contactoLog.create({
            data: {
              pacienteId: id,
              profesionalId: paciente.profesionalId,
              tipo: TipoContacto.SISTEMA,
              nota: 'Paciente pendiente de clasificación',
            },
          }),
        ]
      : []),
  ]);
}
```

### Pattern 4: CambiarFlujoModal component
**What:** shadcn Dialog with 3 color-coded selector cards + Confirm button
**When to use:** Triggered by PencilIcon click in PacienteDetails

The three card states reuse FlujoBadge colors exactly:
- CIRUGIA: `bg-blue-100 text-blue-700 ring-blue-400`
- TRATAMIENTO: `bg-green-100 text-green-700 ring-green-400`
- PENDIENTE: `bg-amber-100 text-amber-700 ring-amber-400`

Selected state: add `ring-2` to the matching card. Unselected: no ring. The "Confirmar" button is disabled when `selectedFlujo === currentFlujo` or `mutation.isPending`.

### Pattern 5: Toast with "Ver en CRM →" action
**What:** sonner `toast()` with `action` field; onClick navigates to CRM tab
**When to use:** PAC-02 success feedback per CONTEXT.md

The CRM Kanban is not a separate route — it is the "embudo" view of `/dashboard/pacientes`. The state is managed via `localStorage.setItem("pacientes-vista", "embudo")` + a `useState` in the page component. Since the modal is deep in the component tree, the `onClick` action should use `router.push("/dashboard/pacientes?vista=embudo")` or set a shared state. Investigation shows the page reads from `localStorage` on mount via `useState(() => localStorage.getItem(STORAGE_KEY))`. Writing to localStorage and pushing to the same route will trigger a re-render with the embudo view.

```typescript
// Toast action pattern — source: dashboard/page.tsx line 34-43
toast("Flujo actualizado a " + FLUJO_LABELS[selectedFlujo], {
  action: {
    label: "Ver en CRM →",
    onClick: () => {
      localStorage.setItem("pacientes-vista", "embudo");
      router.push("/dashboard/pacientes");
    },
  },
});
```

### Anti-Patterns to Avoid
- **Setting etapaCRM to a string "SIN_CLASIFICAR":** The DB enum `EtapaCRM` has no such value. The kanban backend maps `null` to SIN_CLASIFICAR at service line 671. Always set `etapaCRM: null`.
- **Skipping profesionalId check before creating ContactoLog:** `paciente.profesionalId` can be null (legacy data). Guard with a conditional or use `profesionalId || undefined` — the ContactoLog model requires `profesionalId` as non-optional FK.
- **Not resetting optimisticFlujo after invalidation:** TanStack Query refetch will update the paciente object; optimisticFlujo local state should be cleared in `onSettled` or after the query refetches (the `usePaciente` query will return updated data, so clearing on `onSuccess` is fine).
- **Passing `['kanban']` as invalidation key:** The actual query key in `useCRMKanban` is `["crm-kanban", profesionalId]`. Use `{ queryKey: ["crm-kanban"] }` (prefix match) to invalidate all professional variants.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic multi-table write | Manual sequential awaits | `prisma.$transaction([...])` | Sequential awaits leave orphaned records if one fails; $transaction rolls back all on error |
| Cache invalidation after mutation | Manual refetch calls | `queryClient.invalidateQueries` in `onSuccess` | TanStack Query handles stale checks, deduplication, and subscriber updates |
| Toast with navigation action | Custom toast component | `sonner toast() + action field` | Already wired in app/layout.tsx; action callback pattern confirmed |
| Dialog | Custom modal with portal | `shadcn Dialog` | Already used for HCCreatorDialog, PatientFormModal, NewHistoryEntryModal |

**Key insight:** The entire feature is an assembly of existing patterns. No new primitives are needed.

---

## Common Pitfalls

### Pitfall 1: etapaCRM null vs SIN_CLASIFICAR mismatch
**What goes wrong:** Developer sets `etapaCRM: 'SIN_CLASIFICAR'` in the Prisma update, causing a Prisma validation error (invalid enum value).
**Why it happens:** The frontend `useCRMKanban.ts` defines `EtapaCRM` as a TypeScript union that includes `"SIN_CLASIFICAR"` as a display concept. The actual Prisma `EtapaCRM` DB enum does NOT include this value — null is the sentinel.
**How to avoid:** In `updateFlujo`, set `etapaCRM: null`. The kanban service already handles `null` → SIN_CLASIFICAR at line 671.
**Warning signs:** Prisma will throw `Invalid value for argument 'etapaCRM'` at runtime; TypeScript will catch it at compile if Prisma-generated types are used.

### Pitfall 2: Optimistic revert not working because paciente prop is stale
**What goes wrong:** After error + revert, `setOptimisticFlujo(previousFlujo)` has no effect because parent re-renders with the original (correct) `paciente.flujo` from cache anyway — but if query is not yet refetched, the badge stays incorrect.
**Why it happens:** The local `optimisticFlujo` state is in `PacienteDetails`, but `paciente` prop comes from `usePaciente` in `PatientDrawer`. After error, the server data is unchanged, so the next `usePaciente` refetch returns the original flujo.
**How to avoid:** On `onError`, simply call `setOptimisticFlujo(null)` (clear optimistic state and fall back to server data). This is simpler and correct — `displayFlujo = optimisticFlujo ?? paciente.flujo` will render the original value when optimisticFlujo is null.
**Warning signs:** Badge stuck on wrong flujo after backend error.

### Pitfall 3: Double-fire if Confirm button not disabled during pending
**What goes wrong:** User clicks Confirm twice before first request resolves; two PATCH requests race to the backend.
**Why it happens:** Button only has `disabled={selectedFlujo === currentFlujo}` check but not `disabled={mutation.isPending}`.
**How to avoid:** `disabled={selectedFlujo === currentFlujo || mutation.isPending}`.

### Pitfall 4: profesionalId missing from ContactoLog creation
**What goes wrong:** `ContactoLog` requires `profesionalId` (non-nullable FK). If `paciente.profesionalId` is null (legacy patient not assigned to a professional), the `$transaction` will fail.
**Why it happens:** Legacy patients have null `profesionalId`. The existing `updateEtapaCRM` already guards this (line 559: `if (paciente.profesionalId && etapaNotaMap[...])`).
**How to avoid:** Use the same guard: create ContactoLog only when `paciente.profesionalId` is non-null. The flujo update itself should always proceed.

### Pitfall 5: Toast "Ver en CRM →" navigation not switching view
**What goes wrong:** `router.push("/dashboard/pacientes")` does nothing visible because the page is already at that path and React doesn't re-mount.
**Why it happens:** Next.js App Router won't re-render a page component when navigating to the same path (same segment).
**How to avoid:** Write `localStorage.setItem("pacientes-vista", "embudo")` before `router.push`. Since `useState(() => localStorage.getItem(STORAGE_KEY))` only reads on mount, a full navigation IS needed. From within the drawer (which is on the same page), use `window.location.href = "/dashboard/pacientes"` or close the drawer and use a state-lifting callback. The simplest approach: the toast `onClick` sets localStorage + calls `router.replace("/dashboard/pacientes")` with a hard reload trick, or better: lift a `setVista` callback from the page into context or pass it as prop.

**Simpler resolution:** Since PatientDrawer is rendered inside `/dashboard/pacientes/page.tsx`, lift the `cambiarVista` function as a callback passed down, or use a shared Zustand store to set the active vista. The page already uses `useUIStore` for focusModeEnabled — a similar small store or direct localStorage write + router.push from within the same page context will work.

---

## Code Examples

### Verified: FlujoBadge exact color classes
```typescript
// Source: frontend/src/app/dashboard/pacientes/components/FlujoBadge.tsx (read directly)
const FLUJO_CONFIG = {
  CIRUGIA:     { label: 'CIR',  className: 'bg-blue-100 text-blue-700' },
  TRATAMIENTO: { label: 'TRAT', className: 'bg-green-100 text-green-700' },
  PENDIENTE:   { label: 'PEND', className: 'bg-amber-100 text-amber-700' },
};
// Selected card ring colors to match:
// CIRUGIA → ring-blue-400, TRATAMIENTO → ring-green-400, PENDIENTE → ring-amber-400
```

### Verified: PacienteDetails FlujoBadge location
```tsx
// Source: frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx line 108-110
<div className="mt-1.5">
  <FlujoBadge flujo={(paciente.flujo as any) ?? null} />
  {/* ADD: <PencilIcon> trigger here, inline after FlujoBadge in the same div */}
</div>
```

### Verified: sonner toast with action
```typescript
// Source: frontend/src/app/dashboard/page.tsx lines 34-43
toast("Modo Consulta activado", {
  description: "La interfaz se adaptó para tu consulta.",
  action: {
    label: "Desactivar",
    onClick: () => { ... },
  },
});
```

### Verified: crm-kanban query key for invalidation
```typescript
// Source: frontend/src/hooks/useCRMKanban.ts line 77
queryKey: ["crm-kanban", profesionalId],
// Invalidate all professional variants with prefix match:
queryClient.invalidateQueries({ queryKey: ["crm-kanban"] });
```

### Verified: $transaction pattern in service
```typescript
// Source: backend pattern used in updateEtapaCRM (service lines 545-568)
// and OrdenConsumo creation in Phase 27 (27-01 accumulated context)
return this.prisma.$transaction([
  this.prisma.paciente.update({ where: { id }, data: { ... } }),
  this.prisma.contactoLog.create({ data: { ... } }),
]);
```

### Verified: PATCH /pacientes/:id/flujo controller
```typescript
// Source: backend/src/modules/pacientes/pacientes.controller.ts lines 210-218
@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
@Patch(':id/flujo')
updateFlujo(
  @Param('id') id: string,
  @Body() dto: UpdateFlujoDto,
) {
  return this.pacientesService.updateFlujo(id, dto.flujo);
}
// DTO: { flujo: FlujoPaciente } — no change needed to DTO or controller
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| updateFlujo: plain update | updateFlujo: $transaction with etapaCRM + ContactoLog | Phase 29 | PAC-04 + PAC-05 satisfied atomically |
| No flujo change in PatientDrawer | PencilIcon trigger + CambiarFlujoModal | Phase 29 | Professionals can reclassify without leaving context |

**Deprecated/outdated:**
- None for this phase — all patterns are current.

---

## Open Questions

1. **"Ver en CRM →" toast navigation when already on /dashboard/pacientes**
   - What we know: The embudo/lista/tratamientos view is `useState` in PacientesPage, not URL-based. `router.push` to same path won't re-mount.
   - What's unclear: Best mechanism to switch `vista` from inside the drawer / toast callback without prop-drilling or a new store.
   - Recommendation: Simplest option is to write to `localStorage("pacientes-vista", "embudo")` then call `router.refresh()` which triggers Next.js server component re-render. Alternatively, pass a `onFlujoChanged` callback from `PacientesPage` → `PatientDrawer` → `PacienteDetails` → modal. The planner should pick one approach and document it. The localStorage + router.refresh approach requires no new state infrastructure.

2. **optimisticFlujo state ownership**
   - What we know: `PacienteDetails` receives `paciente` as a prop from `usePaciente` in `PatientDrawer`. The optimistic state needs to override the `flujo` field for the badge.
   - What's unclear: Whether optimisticFlujo should live in `PacienteDetails` (local) or be lifted to `PatientDrawer`.
   - Recommendation: Keep it local to `PacienteDetails` (or even inside `CambiarFlujoModal`). The display logic `displayFlujo = optimisticFlujo ?? paciente.flujo` is simple and self-contained. Clear on `onSettled`.

---

## Sources

### Primary (HIGH confidence)
- Direct file reads: `pacientes.service.ts`, `pacientes.controller.ts`, `schema.prisma`, `PacienteDetails.tsx`, `PatientDrawer.tsx`, `FlujoBadge.tsx`, `useCRMKanban.ts`, `useCreateContacto.ts`, `useUpdateListaEspera.ts`, `useEffectiveProfessionalId.ts`, `HCCreatorDialog.tsx`, `dashboard/page.tsx` (toast action pattern)

### Secondary (MEDIUM confidence)
- Context from `.planning/STATE.md` accumulated decisions: "Flujo change CRM side effects: updateFlujo() must run etapaCRM assignment inside $transaction; frontend must invalidate ['kanban'], ['tratamientos'], ['listaAccion'] caches" — NOTE: STATE.md says `['kanban']` but actual query key is `['crm-kanban']`; verified from useCRMKanban.ts source.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified by direct file reads; no new dependencies
- Architecture: HIGH — patterns extracted directly from existing codebase; $transaction from schema + service, toast from page.tsx, Dialog from HCCreatorDialog
- Pitfalls: HIGH for etapaCRM null (verified from schema + kanban service line 671); MEDIUM for toast navigation (requires planner decision on mechanism)

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (stable patterns, 30-day window)
