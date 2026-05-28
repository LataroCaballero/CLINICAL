# Architecture Patterns: v1.7 CRM Flexible

**Domain:** Flexible CRM stage transitions + redesigned kanban sheet
**Researched:** 2026-05-23
**Confidence:** HIGH — based on direct code inspection of all relevant files

---

## Existing Architecture — What Was Found

### Endpoint

```
PATCH /pacientes/:id/etapa-crm
Body: { etapaCRM: EtapaCRM; motivoPerdida?: MotivoPerdidaCRM }
```

Single endpoint in `PacientesController` → `PacientesService.updateEtapaCRM()`.
Both drag-and-drop and the sheet stepper must call this same endpoint.

### Current Backend Guards — Exact Code

Two guards exist in `pacientes.service.ts:updateEtapaCRM()`:

**Guard 1 — PERDIDO requires motivoPerdida (line 513–517):**
```typescript
if (dto.etapaCRM === EtapaCRM.PERDIDO && !dto.motivoPerdida) {
  throw new BadRequestException('Se requiere motivoPerdida al mover a etapa PERDIDO');
}
```
This guard MUST stay. It enforces a data-completeness invariant (the loss reason modal already handles it on the frontend). This is a data integrity rule, not a workflow restriction.

**Guard 2 — CONFIRMADO requires accepted presupuesto (line 519–528):**
```typescript
if (dto.etapaCRM === EtapaCRM.CONFIRMADO) {
  const tienePresupuestoAceptado = paciente.presupuestos.some(
    (p) => p.estado === EstadoPresupuesto.ACEPTADO,
  );
  if (!tienePresupuestoAceptado) {
    throw new BadRequestException(
      'El paciente debe tener al menos un presupuesto ACEPTADO para pasar a CONFIRMADO',
    );
  }
}
```
This guard MUST BE REMOVED for v1.7. It is the only backend blocker to free transitions. Currently it causes the `onError` toast in `KanbanBoard` ("No se pudo mover el paciente. Verificá los requisitos.") to fire when a user legitimately tries to manually confirm a patient.

### Side Effects in updateEtapaCRM (must be preserved)

After the DB write, the service does two things:
1. Auto-creates a `ContactoLog` of type SISTEMA for stages NUEVO_LEAD, CONSULTADO, and PRESUPUESTO_ENVIADO.
2. Creates 3 `TareaSeguimiento` records (day 3, 7, 14) when moving to PRESUPUESTO_ENVIADO.

These side effects are correct and must not be touched.

### Automatic Transitions (separate code path — DO NOT TOUCH)

In `presupuestos.service.ts`, three automatic transitions write directly to `Paciente.etapaCRM` via `$transaction`:
- `marcarEnviado()` sets `PRESUPUESTO_ENVIADO`
- `aceptarPresupuesto()` sets `CONFIRMADO`
- `rechazar()` sets `PERDIDO`

These bypass `updateEtapaCRM()` entirely — they write straight to Prisma. They have their own guards (presupuesto state machine checks). They are unaffected by v1.7 changes and must remain untouched.

### Frontend Data Available in KanbanPatient

The `KanbanPatient` object (already in the kanban query response) contains:
```typescript
presupuesto: {
  total: number;
  estado: string;       // 'ACEPTADO' | 'ENVIADO' | 'BORRADOR' | 'RECHAZADO' | 'VENCIDO'
  fechaEnviado: string | null;
} | null
```

This is critical: **the frontend already has enough data to evaluate both warning conditions without a new API call.**

- Warning for PRESUPUESTO_ENVIADO: `patient.presupuesto === null`
- Warning for CONFIRMADO: `patient.presupuesto?.estado !== 'ACEPTADO'`

The frontend performs these checks and emits toasts before calling the mutation. The mutation proceeds regardless.

---

## Recommended Architecture for v1.7

### Q1: What to do with backend guards?

**Remove the CONFIRMADO guard. Keep the PERDIDO guard.**

The CONFIRMADO guard (lines 519–528 of `pacientes.service.ts`) must be deleted. This is the only backend change needed. The check logic moves entirely to the frontend as a warning — the mutation succeeds regardless of presupuesto state.

The PERDIDO guard stays because it enforces data integrity (motivoPerdida is a required field for loss reason analytics), not a business workflow restriction. The frontend already enforces this via `LossReasonModal`.

No "opt-in" flag, no bypass parameter, no dual-mode. Delete the guard block cleanly.

### Q2: Should drag-and-drop and the stepper use the same mutation?

Yes. One hook, one endpoint.

`useUpdateEtapaCRM` already does optimistic UI via `pendingMoves` in `KanbanBoard`. The sheet stepper will call the same hook. No new endpoint is needed.

The warning logic is the same for both entry points. Extract it to a shared helper function `checkCRMTransitionWarnings(patient, targetEtapa): string | null` that returns a warning message or null. Both drag-and-drop and stepper click call this function, emit the toast if a warning exists, then proceed with the mutation unconditionally.

### Q3: Where does warning context come from?

Frontend only. No new backend endpoint needed.

The `KanbanPatient` already carries `presupuesto.estado`. The sheet receives the `KanbanPatient` object via the existing `patient` prop. Warning evaluation is synchronous and pure:

```typescript
// frontend/src/lib/crmTransitions.ts
export function checkCRMTransitionWarnings(
  patient: KanbanPatient,
  targetEtapa: EtapaCRM
): string | null {
  if (targetEtapa === 'PRESUPUESTO_ENVIADO' && !patient.presupuesto) {
    return 'Este paciente no tiene presupuesto. Podés crearlo desde "Ver presupuesto".';
  }
  if (targetEtapa === 'CONFIRMADO' && patient.presupuesto?.estado !== 'ACEPTADO') {
    return 'El paciente no tiene presupuesto aceptado. La etapa se actualizará igual.';
  }
  return null;
}
```

Place this in `frontend/src/lib/crmTransitions.ts`. Both `KanbanBoard` and the new stepper import it.

### Q4: What components are new vs modified?

#### Backend: 1 file modified

| File | Change | Type |
|------|--------|------|
| `backend/src/modules/pacientes/pacientes.service.ts` | Delete the CONFIRMADO guard block (lines 519–528) | Modify — 10 lines deleted |

#### Frontend: New files

| File | Purpose |
|------|---------|
| `frontend/src/lib/crmTransitions.ts` | `checkCRMTransitionWarnings()` pure helper |
| `frontend/src/components/crm/EtapaStepper.tsx` | Clickable horizontal stepper showing 6 CRM stages |
| `frontend/src/components/crm/ContactoRapidoModal.tsx` | Small Dialog wrapping the contacto form extracted from CardActionsSheet |

#### Frontend: Modified files

| File | Change |
|------|--------|
| `frontend/src/components/crm/CardActionsSheet.tsx` | Full layout redesign: compact header with FlujoBadge, compact action buttons, remove inline contacto form (→ ContactoRapidoModal), add EtapaStepper, remove quick actions panel |
| `frontend/src/components/crm/KanbanBoard.tsx` | Import `checkCRMTransitionWarnings`, call it in `handleDragEnd` before mutation, show warning toast |
| `backend/src/modules/pacientes/pacientes.service.ts` | (listed above) |

#### Frontend: Requires a small data addition

`getKanban()` in `pacientes.service.ts` and the `KanbanPatient` type do not currently include `flujo`. The sheet header needs it to render `FlujoBadge`. One field addition to the Prisma select and the TypeScript type.

| File | Change |
|------|--------|
| `backend/src/modules/pacientes/pacientes.service.ts` | Add `flujo: true` to `getKanban()` select |
| `frontend/src/hooks/useCRMKanban.ts` | Add `flujo: FlujoPaciente \| null` to `KanbanPatient` interface |

---

## Component Boundaries

### CardActionsSheet — Redesigned Layout

```
SheetHeader
  ├── Patient name (text-base font-semibold)          [existing]
  ├── FlujoBadge (uses new flujo field)               [new]
  └── Compact action row (horizontal flex):
       ├── [Registrar contacto] button → opens ContactoRapidoModal  [new]
       └── Lista de espera Switch (instant toggle, no save button)   [redesigned]

EtapaStepper                                          [new component]
  ├── Steps: NUEVO_LEAD → TURNO_AGENDADO → CONSULTADO → PRESUPUESTO_ENVIADO → CONFIRMADO → PERDIDO
  ├── Current stage highlighted
  ├── On click → checkCRMTransitionWarnings → toast if warning → mutate
  └── Per-step contextual action shown below active step:
       PRESUPUESTO_ENVIADO → "Ver/Crear presupuesto" (calls onOpenPresupuestos)
       CONSULTADO          → "Registrar HC" (opens HCCreatorDialog)
       PROCEDIMIENTO_REALIZADO → "Marcar como realizado" (mutate to that stage)

[Ver perfil completo] button                          [existing, keep]
```

### ContactoRapidoModal

Wraps the contacto form currently inline in `CardActionsSheet`. Uses a `Dialog` (not Sheet) to stay compact. Props: `pacienteId`, `open`, `onOpenChange`. On success: closes modal, sheet stays open.

### EtapaStepper

```typescript
interface EtapaStepperProps {
  currentEtapa: EtapaCRM | null;
  patient: KanbanPatient;
  profesionalId: string;            // for HCCreatorDialog
  onEtapaChange: (etapa: EtapaCRM) => void;
  onOpenPresupuestos: () => void;
}
```

`onEtapaChange` goes to `CardActionsSheet`, which calls `checkCRMTransitionWarnings` then `useUpdateEtapaCRM`. The mutation is owned by `CardActionsSheet`, not by the stepper component itself. This keeps the stepper purely presentational.

---

## Data Flow

```
[Drag-and-drop in KanbanBoard]          [Stepper click in CardActionsSheet]
         │                                          │
         ▼                                          ▼
checkCRMTransitionWarnings(patient, targetEtapa)    (same function)
         │                                          │
    warning?──yes──► toast.warning(msg)        warning?──yes──► toast.warning(msg)
         │                                          │
         ▼ (always proceeds)                        ▼ (always proceeds)
useUpdateEtapaCRM.mutate(...)              useUpdateEtapaCRM.mutate(...)
         │                                          │
         └──────────────────┬─────────────────────-┘
                            ▼
            PATCH /pacientes/:id/etapa-crm
                            │
                            ▼
            PacientesService.updateEtapaCRM()
              ├── PERDIDO guard (kept — requires motivoPerdida)
              ├── [CONFIRMADO guard REMOVED]
              ├── prisma.paciente.update(etapaCRM)
              ├── ContactoLog auto-create (NUEVO_LEAD / CONSULTADO / PRESUPUESTO_ENVIADO)
              └── TareaSeguimiento create (if PRESUPUESTO_ENVIADO)
                            │
                            ▼
            onSuccess → invalidate ["crm-kanban"] + ["pacientes"]
            onError   → toast.error (network/DB errors only)
```

---

## Patterns to Follow

### Pattern: Warning helper is a pure function, not a hook

Warning evaluation is synchronous and takes only the patient object and target stage. No React hooks, no async. A plain exported function in `lib/crmTransitions.ts` is trivially testable and avoids hook overhead.

### Pattern: Mutation stays at the container level

`EtapaStepper` calls `onEtapaChange(etapa)`. `CardActionsSheet` applies warnings and calls the mutation. This prevents two mutation instances fighting over the same patient and keeps the `pendingMoves` optimistic state concentrated in `KanbanBoard` (for drag-and-drop) and sheet-level state (for stepper clicks).

### Pattern: FlujoBadge reuse across contexts

`FlujoBadge` currently lives in `frontend/src/app/dashboard/pacientes/components/FlujoBadge.tsx`. For reuse in the CRM sheet, either move it to `frontend/src/components/ui/FlujoBadge.tsx` or import it from its current location. The latter avoids a migration step — prefer importing from the existing path.

---

## Anti-Patterns to Avoid

### Do not add a prerequisite status endpoint

No `GET /pacientes/:id/crm-prerequisites`. The frontend already has all needed data from the kanban query payload. A roundtrip adds latency for advisory information.

### Do not add a bypass parameter to the PATCH endpoint

No `{ force: true }` or `{ bypassGuards: true }`. Just delete the CONFIRMADO guard. Keeping it in any "soft" form adds dead code paths and misleads future developers about the intended workflow.

### Do not move the PERDIDO guard to frontend-only

The `motivoPerdida` required rule stays on the backend as a data integrity safety net. The frontend modal already enforces it — the backend guard will never trigger in normal usage, but it prevents data corruption from direct API calls or future bugs.

### Do not merge CardActionsSheet and PatientDrawer

The sheet is the kanban quick-action surface. The drawer is the full patient profile. Keep them separate. The sheet triggers the drawer via `onOpenDrawer` for anything that needs full context.

---

## Build Order (accounts for dependencies)

**Step 1 — Backend guard removal** (unblocks everything, 5 minutes)
- Delete the CONFIRMADO guard block from `pacientes.service.ts`
- Add `flujo: true` to `getKanban()` select

**Step 2 — Frontend type + warning infrastructure** (depends on Step 1)
- Add `flujo` field to `KanbanPatient` in `useCRMKanban.ts`
- Create `lib/crmTransitions.ts` with `checkCRMTransitionWarnings()`
- Modify `KanbanBoard.handleDragEnd` to call it and emit toast before mutation

At this point drag-and-drop is fully functional with warnings. Steps 3–4 can be done together.

**Step 3 — Sheet redesign**
- Build `ContactoRapidoModal` (extract existing form)
- Build `EtapaStepper` (pure UI component, no data dependencies beyond props)
- Rewrite `CardActionsSheet` layout: compact header, compact action row, EtapaStepper, remove quick actions panel

**Step 4 — Per-step contextual actions**
- Wire PRESUPUESTO_ENVIADO step action → `onOpenPresupuestos` (prop already exists on CardActionsSheet)
- Wire CONSULTADO step action → `HCCreatorDialog` (already exists; needs `profesionalId` added to `KanbanPatient` or passed from the page level via `CardActionsSheet` props)
- Wire PROCEDIMIENTO_REALIZADO step action → mutate to that stage directly

**Dependency note on profesionalId for HCCreatorDialog:**
`HCCreatorDialog` requires `profesionalId`. The `KanbanBoard` is rendered inside the pacientes page which has access to the effective professional context via `useEffectiveProfessionalId`. Thread `profesionalId` as a prop through `KanbanBoard → CardActionsSheet → HCCreatorDialog`. This is a 2-line prop addition to `KanbanBoard` and `CardActionsSheet`.

---

## Open Questions

1. **SIN_CLASIFICAR in stepper:** Should the stepper include SIN_CLASIFICAR as step 0? Recommend hiding it — it is a system-assigned entry state, not a meaningful manual target for the secretaria.

2. **Lista de espera comment on instant toggle:** If the toggle fires immediately (no save button), what happens to the comment text? Recommend: keep the comment textarea, fire the mutation with the current comment text on toggle. Add a separate "Guardar comentario" link below for text-only changes.

3. **PROCEDIMIENTO_REALIZADO excluded from kanban board columns:** Patients in this stage appear as SIN_CLASIFICAR on the board (the kanban server groups them there). The stepper in the sheet should still allow moving TO this stage ("Marcar como realizado"). When the mutation fires, the patient card will disappear from its current column and re-appear in SIN_CLASIFICAR — this is existing behavior and acceptable.

---

## Sources

All findings based on direct inspection of:
- `backend/src/modules/pacientes/pacientes.service.ts` (lines 503–588, 603–697)
- `backend/src/modules/presupuestos/presupuestos.service.ts` (lines 155–292)
- `frontend/src/components/crm/KanbanBoard.tsx`
- `frontend/src/components/crm/CardActionsSheet.tsx`
- `frontend/src/components/crm/KanbanColumn.tsx`
- `frontend/src/components/crm/PatientCard.tsx`
- `frontend/src/hooks/useUpdateEtapaCRM.ts`
- `frontend/src/hooks/useCRMKanban.ts`
- `frontend/src/components/patient/PatientDrawer/views/HCCreatorDialog.tsx`
- `.planning/PROJECT.md` (v1.7 requirements)

Confidence: HIGH — no external sources needed; all findings grounded in the actual codebase.
