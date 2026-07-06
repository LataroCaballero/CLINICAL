# Phase 59: Stepper Accionable - Pattern Map

**Mapped:** 2026-07-04
**Files analyzed:** 6 (all MODIFIED / enriched — no new files created)
**Analogs found:** 6 / 6 (all files are their own analog — this phase enriches existing code, so the "analog" is the file's current pattern that new code must extend without breaking)

> This phase ENRICHES existing frontend files. There is no new-file scaffolding. For each
> touched file, the "pattern to copy from" is the **existing pattern already in that file**
> (and its sibling modals). The planner's job is additive: layer step-state color + action
> wiring on top of the current structure without rewriting it (CONTEXT D-01, user correction
> "enriquecer, no reemplazar").

## File Classification

| Modified File | Role | Data Flow | Closest Analog (existing pattern to extend) | Match Quality |
|---------------|------|-----------|---------------------------------------------|---------------|
| `frontend/src/components/crm/EtapaStepper.tsx` | component (presentational) | request-response (props in, click handlers out) | itself — current `STEPPER_CHAIN` circle-coloring + contextual-button pattern | exact (self) |
| `frontend/src/components/crm/CardActionsSheet.tsx` | component (container/orchestrator) | event-driven (modal open state) | itself — current `HCCreatorDialog` mount + `hcOpen` state + `handlePresupuestoClick` | exact (self) |
| `frontend/src/hooks/useCRMKanban.ts` | hook (type + query) | request-response (GET /pacientes/kanban) | itself — `PasosCrm` / `KanbanPatient.pasos` / `flujo` already typed | exact (self) — likely read-only |
| `frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx` | component (view + dialog) | CRUD (`useCreatePresupuesto`) | itself — "Nuevo Presupuesto" `Dialog` @ line 263, controlled `items` state | exact (self) |
| `frontend/src/components/patient/PatientDrawer/views/NuevoTurnoModal.tsx` | component (modal form) | CRUD (POST /turnos) | itself — RHF + zod + `useTiposTurno` select | exact (self) |
| `frontend/src/components/patient/PatientDrawer/views/HCCreatorDialog.tsx` | component (dialog wrapper) | request-response | itself — already wired via `hcOpen`; only visibility condition added | exact (self) — likely no change |

## Pattern Assignments

### `EtapaStepper.tsx` (component, presentational) — PRIMARY WORK

**Pattern to extend:** the per-step render loop over `STEPPER_CHAIN` (lines 45-146).

**Existing circle-coloring pattern** (lines 61-68) — funnel/position based. New code adds a
SECOND dimension (step state) ONLY for the 3 mapped nodes, per CONTEXT D-03. Preserve this
block for the 4 unmapped etapas (`SIN_CLASIFICAR`, `NUEVO_LEAD`, `TURNO_AGENDADO`,
`PROCEDIMIENTO_REALIZADO`):
```typescript
const circleClass = cn(
  "h-5 w-5 rounded-full border-2 flex-shrink-0",
  isCurrent
    ? "border-primary bg-primary"
    : isDone
    ? "border-primary/40 bg-primary/10"
    : "border-gray-300 bg-transparent"
);
```
For the 3 mapped nodes (`CONSULTADO`↔`pasos.hc`, `PRESUPUESTO_ENVIADO`↔`pasos.presupuesto`,
`CONFIRMADO`↔`pasos.cirugia`), the step state OVERRIDES this: green when `=== 'completo'`,
orange when `=== 'pendiente'` (D-03). Exact Tailwind classes = planner's discretion. Note the
`PERDIDO` node already establishes a non-primary color convention to mirror (lines 166-172:
`border-red-500 bg-red-500` filled vs `border-gray-200`).

**Existing contextual-button pattern** (the model to replicate for step actions) — lines 100-112:
```typescript
{etapa === "PRESUPUESTO_ENVIADO" && onPresupuestoClick && (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();          // CRITICAL: stops row-level onClickEtapa nav
      onPresupuestoClick();
    }}
    className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded px-2 py-1 hover:bg-muted/50 w-fit"
  >
    <ExternalLink className="h-3 w-3" />
    Ver/Crear presupuesto
  </button>
)}
```
The identical shape is repeated for `CONSULTADO`/`onHCClick` (lines 114-126) and
`PROCEDIMIENTO_REALIZADO` (lines 128-142). **Copy this exact button shape** for the new
"Agendar cirugía" action on `CONFIRMADO`. Per D-03, gate button visibility on
`pasos.<x> === 'pendiente'` (orange shows button; green shows none).

**`hasContextualButton` flag** (lines 54-59) drives label bottom-padding (line 72). When you
add step-state-gated buttons, extend this predicate so spacing stays correct.

**New props to add** (extend the existing `EtapaStepperProps` interface, lines 18-24):
- `pasos?: PasosCrm` — the step-state payload (import type from `@/hooks/useCRMKanban`)
- `flujo?: KanbanPatient['flujo']` — for D-05 client-side filtering
- `onCirugiaClick?: () => void` — new action handler, mirrors `onPresupuestoClick`/`onHCClick`

**Sub-indicators (D-04)** — `consentimiento` / `indicacionesPreop` rendered as green/orange
visual-only badges under `CONFIRMADO`, NO buttons. There is no existing sub-indicator pattern;
render them inside the `CONFIRMADO` node's right column (the `flex flex-col` at line 97) using
the same green/orange semantics but as small static dots/labels, not `<button>`.

**Flujo filtering (D-05)** — when `flujo === 'TRATAMIENTO'`, hide `cirugia` action +
`consentimiento`/`indicacionesPreop` sub-indicators; show only `hc`/`presupuesto`. Resolve
client-side. Edge case `PENDIENTE`/`null` = show everything (planner discretion, D-05).

---

### `CardActionsSheet.tsx` (component, orchestrator) — SECONDARY WORK

**Analog for mounting a new modal:** the existing `HCCreatorDialog` wiring is the exact template.

**State pattern** (line 52): `const [hcOpen, setHcOpen] = useState(false);` — add a sibling
`const [turnoOpen, setTurnoOpen] = useState(false);` for the cirugía modal.

**Modal mount pattern** (lines 188-193) — Radix `DialogPortal` renders in `document.body`, so
NO z-index conflict with the `Sheet` (see the load-bearing comment at line 172):
```typescript
<HCCreatorDialog
  open={hcOpen}
  onOpenChange={setHcOpen}
  pacienteId={patient.id}
  profesionalId={profesionalId ?? ""}
/>
```
**Copy this exact placement** (inside `<SheetContent>`, alongside the other dialogs at lines
173-236) to mount `NuevoTurnoModal`:
```typescript
<NuevoTurnoModal
  open={turnoOpen}
  onOpenChange={setTurnoOpen}
  pacienteId={patient.id}
/>
```

**Handler-passing pattern** (lines 120-126) — how the sheet feeds action handlers into the
stepper. Extend this call site:
```typescript
<EtapaStepper
  etapaActual={patient.etapaCRM}
  optimisticEtapa={optimisticEtapa}
  onClickEtapa={handleStepClick}
  onPresupuestoClick={handlePresupuestoClick}
  onHCClick={profesionalId ? () => setHcOpen(true) : undefined}
  // ADD: pasos={patient.pasos} flujo={patient.flujo}
  // ADD: onCirugiaClick={() => setTurnoOpen(true)}
/>
```
Note the `profesionalId ?`-gating idiom (line 125): a handler is passed as `undefined` to hide
its button when a precondition fails. Reuse this idiom for step-state gating if needed.

**Presupuesto prefill (STEPPER-04, D-07/D-08)** — CURRENT `handlePresupuestoClick` (lines 94-97)
does NOT prefill; it closes the sheet and routes to the drawer:
```typescript
function handlePresupuestoClick() {
  onOpenChange(false);
  onOpenDrawerWithView(patient!.id, "presupuestos");  // → KanbanBoard sets drawerInitialView
}
```
Confirmed downstream: `KanbanBoard.tsx:305` handles `onOpenDrawerWithView` → sets
`drawerInitialView` state (line 68) → passes `initialView` to `<PatientDrawer>` (line 315) →
`PresupuestosView`. **For prefill, the planner chooses one of two routes:**
  (a) mount the "Nuevo Presupuesto" `Dialog` directly in the sheet (copy the dialog JSX +
      controlled state from `PresupuestosView` lines 68-124, 263-379) opened pre-filled; OR
  (b) thread a `prefillItems` prop through `onOpenDrawerWithView` → `KanbanBoard` →
      `PatientDrawer` → `PresupuestosView` and seed its `items` state.
Route (a) is more consistent with the "modal inline, no navegar fuera del CRM" principle used
for HC and cirugía (D-08/D-09). Researcher must still confirm the catálogo source (D-07).

---

### `useCRMKanban.ts` (hook) — LIKELY READ-ONLY

Types are already complete (Phase 57/58). `PasosCrm` (lines 26-34), `KanbanPatient.pasos`
(line 59), `todosCompletos` (line 60), `flujo` (line 57) are all exposed. **No change expected**
unless the planner needs a derived helper. Import `PasosCrm` / `EtapaCRM` / `KanbanPatient`
from here into `EtapaStepper.tsx`.

**Step→etapa mapping (D-02)** to encode in `EtapaStepper` (constant near `STEPPER_CHAIN`):
```
CONSULTADO           ↔ pasos.hc          → onHCClick   ("Registrar HC")
PRESUPUESTO_ENVIADO  ↔ pasos.presupuesto → onPresupuestoClick
CONFIRMADO           ↔ pasos.cirugia     → onCirugiaClick ("Agendar cirugía")
```

---

### `PresupuestosView.tsx` (view + dialog, CRUD) — REUSE SOURCE

**Reusable dialog** = the "Nuevo Presupuesto" `Dialog` at lines 263-379. Its controlled state
(the prefill target) is lines 68-72:
```typescript
const [openModal, setOpenModal] = useState(false);
const [items, setItems] = useState<PresupuestoItemInput[]>([{ descripcion: "", precioTotal: 0 }]);
const [descuentos, setDescuentos] = useState("");
const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
const [fechaValidez, setFechaValidez] = useState("");
```
To prefill, seed `items` with catálogo entries mapped to `PresupuestoItemInput`
(`{ descripcion, precioTotal }` — see `useCreatePresupuesto.ts` lines 4-7). Submit path
(`handleCreate`, lines 106-125) calls `createPresupuesto.mutateAsync({ pacienteId,
profesionalId, items, ... })`. `profesionalId` comes from `useEffectiveProfessionalId()`
(line 65) — same hook already available in `CardActionsSheet` (line 57), so route (a) above is
self-sufficient.

---

### `NuevoTurnoModal.tsx` (modal form, CRUD) — REUSE + GAP FOR RESEARCH

**Props already match** the sheet's needs: `{ open, onOpenChange, pacienteId }` (lines 29-33).
Submit posts to `/turnos` and invalidates the paciente turnos query (lines 48-57):
```typescript
await api.post("/turnos", { ...values, pacienteId });
qc.invalidateQueries({ queryKey: ["turnos", "paciente", pacienteId] });
```

**⚠ CRITICAL GAP for D-11 (surface to researcher/planner):** The tipo-turno `<Select>` (lines
94-113) is populated by `useTiposTurno()` → `GET /tipos-turno`. That endpoint
(`backend/src/modules/tipos-turno/tipos-turno.service.ts:11`) filters `where: { esCirugia:
false }` — **it EXCLUDES the cirugía type**. Consequences:
- As-is, a turno created from `NuevoTurnoModal` can NEVER be a cirugía type, so the backend's
  auto-`Cirugia` creation (`turnos.service.ts:677-728`, keyed on `esCirugia: true`) will NOT
  fire, and `pasos.cirugia` will NOT flip to green. STEPPER-05→06 would break.
- After creating the turno, the modal invalidates `["turnos","paciente",…]` but NOT the CRM
  kanban query (`["crm-kanban", …]`, `useCRMKanban.ts:95`), so the stepper color won't refresh.

**Planner must resolve both:** (1) let this flow select/force the cirugía tipoTurno — e.g. a
`forceCirugia`/`tipoTurnoId` prop that bypasses the filtered select and uses a cirugía-typed
turno; and (2) invalidate `["crm-kanban"]` (and paciente `pasos`) on success so the stepper
re-colors. `esCirugia` IS available on the model and already surfaced elsewhere
(`UpcomingAppointments.tsx:70`, `TurnoHCModal.tsx:48`) — a dedicated "tipos de cirugía"
endpoint/param may be needed.

**Form pattern to preserve** (RHF + zod): `useForm({ resolver: zodResolver(createTurnoSchema) })`
(lines 41-46); schema at `schemas/createTurno.schema.ts` requires `profesionalId`,
`tipoTurnoId` (both UUID), `inicio`, optional `observaciones`.

---

### `HCCreatorDialog.tsx` (dialog wrapper) — LIKELY NO CHANGE

Already fully wired from the sheet (`hcOpen`). Phase 59 only conditions button VISIBILITY on
`pasos.hc === 'pendiente'` — that logic lives in `EtapaStepper`/`CardActionsSheet`, not here.
Props: `{ open, onOpenChange, pacienteId, profesionalId }` (lines 6-12). No edit expected.

## Shared Patterns

### Contextual action button (green=done/no-button, orange=pending/button)
**Source:** `EtapaStepper.tsx` lines 100-112 (and 114-126, 128-142)
**Apply to:** all 3 mapped step nodes. Always `e.stopPropagation()` in `onClick` (the row has a
competing `onClickEtapa` navigation handler). Standard button className:
`"mb-3 flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded px-2 py-1 hover:bg-muted/50 w-fit"`.

### Modal mounting inside a Sheet (no z-index conflict)
**Source:** `CardActionsSheet.tsx` lines 172-193
**Apply to:** the new `NuevoTurnoModal` (and, if route (a), the presupuesto Dialog). Mount as a
sibling inside `<SheetContent>`; Radix `DialogPortal` escapes to `document.body`.

### Handler gating via `undefined` prop
**Source:** `CardActionsSheet.tsx` line 125 (`onHCClick={profesionalId ? … : undefined}`)
**Apply to:** hide a step's action button by passing its handler as `undefined` (e.g. when the
precondition — profesional present, step pending, flujo allows — is not met).

### Query invalidation after mutation
**Source:** `NuevoTurnoModal.tsx` line 54; `useCreatePresupuesto.ts` lines 25-27
**Apply to:** any action that flips a `pasos.*` value MUST also invalidate `["crm-kanban", …]`
(`useCRMKanban.ts:95`) so the stepper re-colors. This is currently MISSING in `NuevoTurnoModal`.

## No Analog Found

| Concern | Role | Data Flow | Reason / Planner guidance |
|---------|------|-----------|---------------------------|
| Green/orange step-state coloring | component styling | — | No prior two-dimensional (funnel + state) coloring exists; only funnel (position) coloring in `EtapaStepper`. Planner defines Tailwind classes + precedence vs `isCurrent` primary highlight (Claude's Discretion in CONTEXT). |
| `consentimiento`/`indicacionesPreop` sub-indicators | presentational badge | — | No sub-indicator/nested-under-node pattern exists in the stepper. Build fresh, visual-only (D-04). |
| Cirugía-typed turno selection from CRM | modal form + backend endpoint | CRUD | `GET /tipos-turno` deliberately excludes `esCirugia`. No existing frontend path selects a cirugía type. Needs new prop/endpoint (D-11). |
| Presupuesto prefill from catálogo | data mapping | transform | No existing prefill of the "Nuevo Presupuesto" dialog; catálogo source unconfirmed (D-07, researcher). |

## Metadata

**Analog search scope:** `frontend/src/components/crm/`, `frontend/src/components/patient/PatientDrawer/views/`, `frontend/src/hooks/`, `frontend/src/schemas/`, `backend/src/modules/tipos-turno/`, `backend/src/modules/turnos/`
**Files scanned:** 11 (6 canonical + `useCreatePresupuesto.ts`, `createTurno.schema.ts`, `useTipoTurnos.ts`, `KanbanBoard.tsx`, `tipos-turno.service.ts`)
**Pattern extraction date:** 2026-07-04
