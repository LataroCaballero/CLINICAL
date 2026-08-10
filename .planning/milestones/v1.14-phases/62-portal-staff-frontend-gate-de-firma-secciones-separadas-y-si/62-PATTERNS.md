# Phase 62: Portal + Staff Frontend — Pattern Map

**Mapped:** 2026-07-20
**Files analyzed:** 7 (5 modified frontend, 1 modified backend, 1 confirmed-only backend)
**Analogs found:** 7 / 7 (all are self-analogs — every file already exists and is being edited in place; the "analog" is the existing pattern within the same file or its sibling function)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `frontend/src/components/portal/PortalConsentimiento.tsx` (`ZoneCard`) | component | request-response (form gate + mutation) | itself — existing `indicacionesLeidas` checkbox + `handleFirmar` gate being replaced | exact (in-file refactor) |
| `frontend/src/app/portal/[token]/page.tsx` | component | request-response (accordion nav) | itself — existing `AccordionItem` "Consentimiento"/"Consultas" entries | exact (in-file addition, same shape) |
| `frontend/src/hooks/usePortalConsentimiento.ts` (`useAcusarIndicaciones`) | hook | request-response (mutation) | `useFirmarConsentimiento` (same file, lines 57-71) | exact |
| `frontend/src/hooks/useCRMKanban.ts` | hook | CRUD (query) | itself — existing `KanbanPatient` interface + `useQuery` options | exact (in-file addition) |
| `frontend/src/components/crm/EtapaStepper.tsx` | component | request-response (display-only) | itself — existing "Consentimiento" sub-indicator block (lines 199-212) as template for "Indicaciones preop" (lines 213-225) | exact |
| `backend/src/modules/pacientes/pacientes.service.ts` (`getKanban`) | service | CRUD (read/aggregate) | itself — sibling field `flujo: p.flujo ?? null,` (line 743) in the same `.map` return object | exact |
| `backend/src/modules/paciente-portal/paciente-portal.controller.ts` | controller | request-response | N/A — confirmation only, no code change needed | n/a |

## Pattern Assignments

### `frontend/src/components/portal/PortalConsentimiento.tsx` (component, request-response)

**Analog:** itself (in-file refactor of `ZoneCard`)

**Current state to remove** (lines 19, 171-205, 236-241):
```typescript
// line 19 — state to delete, replaced by pdfAbierto + leiConsentimiento
const [indicacionesLeidas, setIndicacionesLeidas] = useState(false);

// lines 171-205 — indicaciones checkbox block to delete entirely (D-02)
{/* 2. Indicaciones check (CONS-07 / D-11) */}
{safeIndicacionesUrl ? (
  <label className="flex items-start gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={indicacionesLeidas}
      onChange={(e) => setIndicacionesLeidas(e.target.checked)}
      className="mt-1 w-5 h-5 accent-teal-600 flex-shrink-0"
    />
    <span className="text-base text-gray-700">
      Leí las{" "}
      <a href={safeIndicacionesUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 underline font-semibold">
        indicaciones del médico
      </a>
      {" "}y confirmo que fui informado/a.
    </span>
  </label>
) : ( /* ...else-branch checkbox, also deleted... */ )}

// lines 236-241 — gate condition to replace
disabled={
  !indicacionesLeidas ||
  canvasEmpty ||
  isSubmitting ||
  !canvasSupported
}
```

**New gate pattern (D-01)** — two new booleans replace `indicacionesLeidas`:
```typescript
const [pdfAbierto, setPdfAbierto] = useState(false);
const [leiConsentimiento, setLeiConsentimiento] = useState(false);

// On the existing PDF <a> (currently lines 161-169) — add onClick:
<a
  href={zone.pdfUrl}
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => setPdfAbierto(true)}
  className="inline-flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 w-full justify-center"
>
  <FileDown className="w-5 h-5 text-gray-500" />
  Descargar / ver el consentimiento
</a>

// New checkbox replacing the deleted indicaciones block — same visual shape as
// the removed lines 171-205 (label + input[type=checkbox] + accent-teal-600):
<label className="flex items-start gap-3 cursor-pointer">
  <input
    type="checkbox"
    checked={leiConsentimiento}
    onChange={(e) => setLeiConsentimiento(e.target.checked)}
    className="mt-1 w-5 h-5 accent-teal-600 flex-shrink-0"
  />
  <span className="text-base text-gray-700">Leí el consentimiento.</span>
</label>

// Button disabled condition (replaces lines 236-241):
disabled={
  !pdfAbierto ||
  !leiConsentimiento ||
  canvasEmpty ||
  isSubmitting ||
  !canvasSupported
}
```

**Payload change (D-03-firma)** — `handleFirmar` (lines 104-126), specifically the mutate call at lines 108-112:
```typescript
// BEFORE
await firmarConsentimiento.mutateAsync({
  zonaId: zone.zonaId,
  signaturePngDataUrl,
  indicacionesLeidas: true,
});

// AFTER — indicacionesLeidas field removed entirely
await firmarConsentimiento.mutateAsync({
  zonaId: zone.zonaId,
  signaturePngDataUrl,
});
```

**Note on `safeIndicacionesUrl`:** the guard itself (lines 33-36) stays in `PortalConsentimiento.tsx` only if still referenced by `ZoneCard`. Per D-02 the consentimiento section must stop showing any indicaciones link — so `safeIndicacionesUrl` usage is removed from `ZoneCard`, but the **same guard expression** (`^https?:\/\//i.test(...)`) is the pattern to copy into the new Indicaciones section (see below), reusing `zone.indicacionesUrl` there instead.

---

### `frontend/src/app/portal/[token]/page.tsx` (component, request-response)

**Analog:** itself — existing `SECCIONES` config array (lines 33-38) and the "Consultas" `AccordionItem` (lines 362-376) as the shape template for the new "Indicaciones" section.

**Config array to extend** (lines 33-38):
```typescript
const SECCIONES = [
  { id: "info", label: "Info basica", icon: User },
  { id: "salud", label: "Salud", icon: Heart },
  { id: "consentimiento", label: "Consentimiento", icon: FileSignature },
  { id: "indicaciones", label: "Indicaciones", icon: /* new icon, e.g. ClipboardList */ },
  { id: "consultas", label: "Consultas", icon: MessageCircle },
];
```
Note: `pasoActual`/`"Paso X de 4"` copy at lines 282-300 derives its total from `SECCIONES.length` automatically — no separate hardcoded "4" to update besides the JSX label if any (currently dynamic via `{SECCIONES.length}`, confirmed at line 288).

**AccordionItem shape to copy** (from "Consultas", lines 362-376 — same shape as "Consentimiento" 346-360):
```typescript
{/* 4. Consultas */}
<AccordionItem
  value="consultas"
  className="border rounded-xl bg-white shadow-sm px-4"
>
  <AccordionTrigger className="hover:no-underline">
    <div className="flex items-center gap-2">
      <MessageCircle className="w-4 h-4 text-orange-500" />
      <span className="font-semibold text-base">Consultas</span>
    </div>
  </AccordionTrigger>
  <AccordionContent>
    <PortalConsultas />
  </AccordionContent>
</AccordionItem>
```

**New section to add** (insert between "Consentimiento" close at line 360 and "Consultas" open at line 363 — i.e. new 4th of 5, before Consultas):
```typescript
{/* 4. Indicaciones (INDIC-01) — separate from Consentimiento per CONS-12/D-02 */}
<AccordionItem
  value="indicaciones"
  className="border rounded-xl bg-white shadow-sm px-4"
>
  <AccordionTrigger className="hover:no-underline">
    <div className="flex items-center gap-2">
      <ClipboardList className="w-4 h-4 text-amber-500" />
      <span className="font-semibold text-base">Indicaciones</span>
    </div>
  </AccordionTrigger>
  <AccordionContent>
    <PortalIndicaciones />
  </AccordionContent>
</AccordionItem>
```
Requires a new import alongside line 27 (`import { PortalConsentimiento } from "@/components/portal/PortalConsentimiento";`):
```typescript
import { PortalIndicaciones } from "@/components/portal/PortalIndicaciones";
```
And a new lucide icon import alongside line 13-21's icon import block (e.g. `ClipboardList`).

**New component `PortalIndicaciones.tsx` (net-new file, not in original file list but required by D-04/D-05/D-06)** — closest analog is `PortalConsentimiento`'s data-fetch + map pattern (lines 271-349): reuse `useConsentimientosParaFirmar(true)` (same query, no new endpoint per D-04), filter for zones with `indicacionesUrl`, render link(s) with the `safeIndicacionesUrl` guard (`PortalConsentimiento.tsx:33-36`) and fire `useAcusarIndicaciones` on the link's `onClick` (D-05). Empty state pattern: copy the plain `<p className="text-base text-gray-500 py-4">` blocks used for `SIN_CIRUGIA`/`SIN_CATALOGO`/`SIN_ZONA`/`SIN_PDF` (lines 296-323).

---

### `frontend/src/hooks/usePortalConsentimiento.ts` (hook, request-response)

**Analog:** `useFirmarConsentimiento` (same file, lines 57-71) — exact structural template for the new `useAcusarIndicaciones`.

**Type change (D-03-firma)** — `FirmarConsentimientoPayload` (lines 31-38):
```typescript
// BEFORE
export interface FirmarConsentimientoPayload {
  zonaId: string;
  signaturePngDataUrl: string;
  indicacionesLeidas: boolean;
}

// AFTER — indicacionesLeidas field removed
export interface FirmarConsentimientoPayload {
  /** zonaId sourced from GET response — NEVER from user input or URL (T-56-18) */
  zonaId: string;
  /** Raw output of SignaturePad.toDataURL('image/png') — not re-encoded (T-56-19) */
  signaturePngDataUrl: string;
}
```

**Analog mutation to copy (`useFirmarConsentimiento`, lines 57-71):**
```typescript
export function useFirmarConsentimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FirmarConsentimientoPayload) => {
      const { data } = await portalApi.post(
        "/paciente-portal/public/consentimiento/firmar",
        payload
      );
      return data as { ok: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-consentimiento"] });
    },
  });
}
```

**New hook to add (`useAcusarIndicaciones`, D-06)** — confirmed route is `POST /paciente-portal/public/indicaciones/acuse` (verified against `backend/src/modules/paciente-portal/paciente-portal.controller.ts:172-176`, `@Controller('paciente-portal/public')` class prefix at line 42 + `@Post('indicaciones/acuse')` route decorator). No request body (server reads `pacienteId` from JWT only, per controller's `registrarAcuseIndicaciones(@Req() req: PortalRequest)` signature — no `@Body()`):
```typescript
// ── Mutation: POST /paciente-portal/public/indicaciones/acuse ────────────────
// Idempotent/set-once in backend (T-61-xx) — safe to call on every link click (D-06).

export function useAcusarIndicaciones() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await portalApi.post(
        "/paciente-portal/public/indicaciones/acuse"
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-consentimiento"] });
    },
  });
}
```
Note: no request payload type is needed (empty POST body) — unlike `FirmarConsentimientoPayload`, skip defining a payload interface for this hook; call `mutate()`/`mutateAsync()` with no arguments.

---

### `frontend/src/hooks/useCRMKanban.ts` (hook, CRUD)

**Analog:** itself — `KanbanPatient` interface (lines 36-61) and the `useQuery` options object (lines 93-105).

**Type addition (D-08)** — add field to `KanbanPatient` (insert near line 59, alongside the other Phase 58 comment-tagged fields):
```typescript
export interface KanbanPatient {
  // ...existing fields...
  // Phase 58 — expuesto por backend desde Phase 57 (computePasosCrm spread)
  pasos: PasosCrm;
  todosCompletos: boolean;
  // Phase 62 — fecha de lectura de indicaciones (INDIC-05), display-only,
  // NO gobierna pasos.indicacionesPreop (eso ya lo deriva computePasosCrm backend)
  indicacionesLeidasAt: string | null;
}
```

**Query options change (D-10)** — current (lines 93-105):
```typescript
export function useCRMKanban(profesionalId: string | null) {
  return useQuery<KanbanColumn[]>({
    queryKey: ["crm-kanban", profesionalId],
    queryFn: async () => {
      const { data } = await api.get("/pacientes/kanban", {
        params: { profesionalId },
      });
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 30_000,
  });
}
```
New (D-10/D-11 — query key `["crm-kanban", profesionalId]` unchanged per D-11):
```typescript
export function useCRMKanban(profesionalId: string | null) {
  return useQuery<KanbanColumn[]>({
    queryKey: ["crm-kanban", profesionalId],
    queryFn: async () => {
      const { data } = await api.get("/pacientes/kanban", {
        params: { profesionalId },
      });
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 0, // W-1 v1.13 fix — freshness over request volume (planner picks exact value 0-5000)
    refetchOnWindowFocus: true, // EMBUDO-06 — board syncs when staff returns to tab
  });
}
```

---

### `frontend/src/components/crm/EtapaStepper.tsx` (component, request-response/display-only)

**Analog:** itself — the "Consentimiento" sub-indicator block (lines 199-212), immediately preceding the "Indicaciones preop" block (lines 213-225) it must be extended to match.

**Current block to extend (lines 213-225):**
```typescript
<div className="flex items-center gap-1.5">
  <div
    className={cn(
      "h-2 w-2 rounded-full flex-shrink-0",
      pasos!.indicacionesPreop === "completo"
        ? "bg-green-500"
        : "bg-orange-500"
    )}
  />
  <span className="text-xs text-muted-foreground">
    Indicaciones preop
  </span>
</div>
```

**New pattern (D-09)** — requires `KanbanPatient["indicacionesLeidasAt"]` to be threaded into `EtapaStepperProps` (currently the component receives `pasos?: PasosCrm` at line 31 but not the raw date field — a new prop must be added, e.g. `indicacionesLeidasAt?: string | null`, passed by the parent board component wherever `<EtapaStepper pasos={...} .../>` is invoked). Date format matches the existing `toLocaleDateString("es-AR")` convention used at `PortalConsentimiento.tsx:326-328` and `page.tsx:273-275`:
```typescript
<div className="flex items-center gap-1.5">
  <div
    className={cn(
      "h-2 w-2 rounded-full flex-shrink-0",
      pasos!.indicacionesPreop === "completo"
        ? "bg-green-500"
        : "bg-orange-500"
    )}
  />
  <span className="text-xs text-muted-foreground">
    Indicaciones preop
    {indicacionesLeidasAt &&
      ` · leídas ${new Date(indicacionesLeidasAt).toLocaleDateString("es-AR")}`}
  </span>
</div>
```
Add `indicacionesLeidasAt?: string | null;` to `EtapaStepperProps` (near line 31, alongside `pasos?: PasosCrm;`) and destructure it in the function signature (near line 42, alongside `pasos,`).

---

### `backend/src/modules/pacientes/pacientes.service.ts` (`getKanban`) (service, CRUD)

**Analog:** itself — sibling field already in the same `.map` return object (line 743: `flujo: p.flujo ?? null,`). The `select` already fetches `indicacionesLeidasAt` (line 662) and it's already threaded into `computePasosCrm` (line 752) — but `computePasosCrm` only returns the derived `pasos.indicacionesPreop` state ('completo'/'pendiente'), NOT the raw date (confirmed via `crm-steps.helper.ts` — its return type has no `indicacionesLeidasAt` passthrough). D-08 requires exposing the raw date directly on the response object, not through the spread.

**Current return object (lines 715-754):**
```typescript
return {
  id: p.id,
  nombreCompleto: p.nombreCompleto,
  // ...
  pendingAutorizaciones: p.autorizaciones.length,
  flujo: p.flujo ?? null,
  // Computed step-state payload (D-04/D-05). Values: 'completo' | 'pendiente'.
  ...computePasosCrm({
    presupuestos: p.presupuestos,
    cirugias: p.cirugias,
    historiasClinicas: p.historiasClinicas,
    consentimientosFirmados: p.consentimientosFirmados,
    consentimientoFirmado: p.consentimientoFirmado,
    indicacionesEnviadas: p.indicacionesEnviadas,
    indicacionesLeidasAt: p.indicacionesLeidasAt,
  }),
};
```

**Minimal change (D-08)** — add a sibling field right next to `flujo` (line 743), same style:
```typescript
flujo: p.flujo ?? null,
// Phase 62 (D-08/INDIC-05) — raw date for staff-facing display; does NOT
// change pasos.indicacionesPreop derivation (still computed by computePasosCrm above)
indicacionesLeidasAt: p.indicacionesLeidasAt,
// Computed step-state payload (D-04/D-05). Values: 'completo' | 'pendiente'.
...computePasosCrm({ /* unchanged */ }),
```

---

### `backend/src/modules/paciente-portal/paciente-portal.controller.ts` (controller, request-response) — confirmation only, no change

**Confirmed route (D-06):** class-level `@Controller('paciente-portal/public')` (line 42) + `@Post('indicaciones/acuse')` (line 173) → full path is `POST /paciente-portal/public/indicaciones/acuse`. Matches the D-06 assumption in CONTEXT.md exactly — the front hook's URL string is `"/paciente-portal/public/indicaciones/acuse"`. Guard is per-route `@UseGuards(PortalJwtGuard)` (line 172), no request body (`registrarAcuseIndicaciones(@Req() req: PortalRequest)`, line 174 — no `@Body()` param). No backend code changes needed for this phase; this file entry is a read-only verification checkpoint for the planner/implementer.

---

## Shared Patterns

### Portal-scoped API client
**Source:** `frontend/src/lib/portal-api.ts` (imported at `usePortalConsentimiento.ts:2`)
**Apply to:** `useAcusarIndicaciones` and any new portal hook — always `portalApi`, never the bare `api` instance (that's staff-only, see `useCRMKanban.ts:2`).

### TanStack Query invalidation after mutation
**Source:** `useFirmarConsentimiento` (`usePortalConsentimiento.ts:67-69`)
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["portal-consentimiento"] });
},
```
**Apply to:** `useAcusarIndicaciones` — same invalidation target since both mutations affect the same `GET /consentimiento` response shape (zone states).

### XSS-safe URL guard for portal-rendered links
**Source:** `PortalConsentimiento.tsx:33-36`
```typescript
const safeIndicacionesUrl =
  zone.indicacionesUrl && /^https?:\/\//i.test(zone.indicacionesUrl)
    ? zone.indicacionesUrl
    : null;
```
**Apply to:** the new `PortalIndicaciones` component — same guard expression, reused per D-07 (defense-in-depth on top of Phase 61's server-side validation, cr-01).

### Date formatting convention
**Source:** `PortalConsentimiento.tsx:326-328` (`YA_FIRMADO` state) and `page.tsx:273-275` (`proximaCirugia`)
```typescript
new Date(zone.firmadoAt).toLocaleDateString("es-AR")
```
**Apply to:** `EtapaStepper.tsx`'s new "Indicaciones preop" date display (D-09) — identical format string, `'es-AR'` locale.

### Accordion section shape (icon + title + child component)
**Source:** `page.tsx` `AccordionItem` blocks (lines 314-376, four existing instances)
```typescript
<AccordionItem value="{id}" className="border rounded-xl bg-white shadow-sm px-4">
  <AccordionTrigger className="hover:no-underline">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-{color}-500" />
      <span className="font-semibold text-base">{label}</span>
    </div>
  </AccordionTrigger>
  <AccordionContent>
    <ChildComponent />
  </AccordionContent>
</AccordionItem>
```
**Apply to:** the new "Indicaciones" `AccordionItem` in `page.tsx`.

## No Analog Found

None — every file in scope is a modification of existing code with an in-file or same-module sibling pattern to copy. The one net-new file implied by the requirements (`frontend/src/components/portal/PortalIndicaciones.tsx`, not explicitly listed in CONTEXT.md's file list but required by D-04/D-05/D-06/INDIC-01) has a strong analog in `PortalConsentimiento.tsx`'s data-fetch + empty-state + zone-map pattern — see its dedicated subsection above. The planner should confirm whether this new component file is created standalone or inlined into `page.tsx`; CONTEXT.md's Claude's Discretion section leaves the exact layout open.

## Metadata

**Analog search scope:** `frontend/src/components/portal/`, `frontend/src/app/portal/[token]/`, `frontend/src/hooks/`, `frontend/src/components/crm/`, `backend/src/modules/pacientes/`, `backend/src/modules/paciente-portal/` (all paths given directly in CONTEXT.md canonical_refs — no broader glob/grep search needed since every file-to-modify was named with exact line ranges by the discuss-phase agent).
**Files scanned:** 7 read in full (all ≤ 400 lines) + 1 grep-only confirmation (`crm-steps.helper.ts`, to verify `computePasosCrm`'s return shape does not already expose the raw date).
**Pattern extraction date:** 2026-07-20
