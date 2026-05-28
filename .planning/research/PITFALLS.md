# Pitfalls Research

**Domain:** CRM Flexible v1.7 — removing business rule guards, stepper UX, any-to-any kanban transitions
**Researched:** 2026-05-23
**Confidence:** HIGH (based on direct code analysis of the actual codebase — all file references are verified line numbers)

---

## Critical Pitfalls

### Pitfall 1: Auto-Transition Overwriting Manual Manual Move — The Core Race Condition

**What goes wrong:**
The backend has three separate auto-transition paths that write `etapaCRM` directly to the `Paciente` row with no awareness of where the patient currently is:

1. `turnos.service.ts` `crearTurno` (line 135–139): forces `TURNO_AGENDADO` if patient is in `null` or `NUEVO_LEAD`
2. `turnos.service.ts` `cerrarSesion` (lines 893–912): forces `PROCEDIMIENTO_REALIZADO` unconditionally if `esCirugia=true`; forces `CONSULTADO` if current etapa is `TURNO_AGENDADO`
3. `presupuestos.service.ts` `marcarEnviado` (line 229): forces `PRESUPUESTO_ENVIADO` unconditionally; `aceptar` (line 182) and both `*ByToken` variants (lines 582, 641) force `CONFIRMADO` or `PERDIDO`

Today, the guard in `updateEtapaCRM` (lines 519–528 of `pacientes.service.ts`) prevents a patient from being manually moved to `CONFIRMADO` without an accepted budget, so `CONFIRMADO` and an active surgery session coexist. Remove the guard and the race becomes reachable:

- Secretaria manually moves patient to `CONFIRMADO` at 10:00 AM via drag
- At 10:00:05 the surgeon closes the session (`cerrarSesion`); `esCirugia=true` so `PROCEDIMIENTO_REALIZADO` is written unconditionally — no check against the current etapa
- Patient silently moves backwards from `CONFIRMADO` to `PROCEDIMIENTO_REALIZADO`

The same regression applies to `marcarEnviado`: if the secretaria has manually moved the patient to `CONFIRMADO`, sending the budget marks them back as `PRESUPUESTO_ENVIADO`.

**Why it happens:**
The auto-transitions were written when guards prevented backward-incompatible manual moves. Remove the manual guards and the auto-transitions are suddenly reachable in states they were never designed for.

**How to avoid:**
Add a forward-only guard to every auto-transition path before shipping unrestricted drag-and-drop. Auto-transitions should only fire if the current etapa is at or behind the target in `ETAPA_ORDER`. In `cerrarSesion`:

```typescript
const etapaActualIdx = ETAPA_ORDER.indexOf(turnoInfo.paciente.etapaCRM);
const nuevaEtapaIdx = ETAPA_ORDER.indexOf(nuevaEtapa);
if (nuevaEtapa && (turnoInfo.paciente.etapaCRM === null || nuevaEtapaIdx > etapaActualIdx)) {
  await this.prisma.paciente.update(...);
}
```

Apply the same pattern in `marcarEnviado` before the forced `PRESUPUESTO_ENVIADO` write. `crearTurno` already uses `etapasIniciales` so it is safe; verify it remains safe if `ETAPA_ORDER` changes.

**Warning signs:**
- A `CONFIRMADO` patient appears in `PROCEDIMIENTO_REALIZADO` the morning after their surgery session
- `contactoLog` shows two consecutive SISTEMA entries within seconds for the same patient
- The kanban invalidation after `cerrarSesion` fires shows an unexpected column for the patient

**Phase to address:**
Phase implementing CRM-01 backend — must fix auto-transition guards before exposing unrestricted UI. This is a 3-line change per transition path; low effort, non-negotiable.

---

### Pitfall 2: Optimistic Update Card Disappears on Backend Error

**What goes wrong:**
`KanbanBoard.tsx` uses a `pendingMoves: Record<string, EtapaCRM>` local state to visually relocate a card before the backend responds. `onSettled` always removes the entry from `pendingMoves`. `useUpdateEtapaCRM` only invalidates the cache on `onSuccess` — there is no `onError` invalidation.

Sequence on a transient 500:
1. Card moves optimistically to column B
2. Backend returns 500
3. `onSettled` fires → `pendingMoves` entry deleted → card disappears from column B visually
4. Cache still holds stale data placing the card in column A
5. `staleTime: 30_000` means no automatic refetch for 30 seconds
6. Card is invisible for up to 30 seconds — user thinks the card was lost

**Why it happens:**
`useUpdateEtapaCRM` has no `onError` invalidation call. `staleTime: 30_000` in `useCRMKanban` prevents automatic recovery within the 30s window.

**How to avoid:**
Add `onError` invalidation to `useUpdateEtapaCRM.ts`:

```typescript
onError: () => {
  queryClient.invalidateQueries({ queryKey: ["crm-kanban"] });
}
```

This is a one-liner that prevents all ghost-card scenarios regardless of the error source.

**Warning signs:**
- Dragging when the backend is briefly unavailable causes the card to disappear
- User reports "the card disappeared" without any reload; card returns after ~30s
- Impossible to reproduce on localhost (always up); only visible under network degradation or staging load

**Phase to address:**
Phase implementing CRM-01 frontend. The fix is a single line in `useUpdateEtapaCRM.ts` and must be in the same commit as the unrestricted drag-and-drop change.

---

### Pitfall 3: Stepper Step-Click Has No Optimistic Update — Visual Lag While Sheet Is Open

**What goes wrong:**
CRM-05 (stepper click moves patient) calls `useUpdateEtapaCRM` from inside `CardActionsSheet`. The `pendingMoves` optimistic state lives inside `KanbanBoard` and only covers drag-originated moves. A stepper step-click fires a mutation outside the board state — the stepper shows the new step as active immediately (if local state is updated), but the kanban column behind the sheet still shows the old position until cache invalidation resolves (1–2s).

If the user closes the sheet immediately after clicking a step, they see the card in the wrong column for 1–2 seconds. This is jarring but not incorrect.

The bigger risk: if the user clicks the same step twice rapidly, two `PATCH /pacientes/:id/etapa-crm` calls fire. The second call returns the same value as the first — unless `updateEtapaCRM` is not idempotent (see Pitfall 4), which creates duplicate `contactoLog` and `tareaSeguimiento` rows.

**Why it happens:**
No shared optimistic state between `KanbanBoard` and `CardActionsSheet` component trees. Optimistic state is local to `KanbanBoard`.

**How to avoid:**
Accept the 1–2s lag from invalidation. Do NOT add a second `pendingMoves` in the sheet — this creates coupling without meaningful UX gain (the sheet obscures the board). The choice to accept the lag must be documented explicitly in the implementation plan.

To prevent double-fires: disable the stepper button immediately on click and re-enable only after the mutation settles (`isPending` flag from `useUpdateEtapaCRM`).

**Warning signs:**
- Two `PATCH /pacientes/:id/etapa-crm` calls with the same target etapa appear in network tab
- Stepper shows new step active but closing the sheet shows the old column for 1–2s
- Duplicate `contactoLog` SISTEMA entries in the patient history

**Phase to address:**
Phase implementing SHEET-05. The decision (accept lag vs. shared state) must be made at plan time, not discovered mid-implementation.

---

### Pitfall 4: `updateEtapaCRM` is Not Idempotent — Duplicate Side Effects

**What goes wrong:**
`pacientes.service.ts` `updateEtapaCRM` (lines 538–585) always creates a `contactoLog` SISTEMA entry when called, regardless of whether the patient is already in the target etapa. It also creates three `tareaSeguimiento` rows whenever `dto.etapaCRM === PRESUPUESTO_ENVIADO`, with no deduplication.

For SHEET-08 ("Marcar procedimiento realizado"), the quick action calls `updateEtapaCRM(PROCEDIMIENTO_REALIZADO)` after `cerrarSesion` has already auto-transitioned the patient there. The result:
- Two consecutive `contactoLog` SISTEMA entries within seconds
- If a future phase adds `tareaSeguimiento` creation for `PROCEDIMIENTO_REALIZADO`, two sets of tasks are created

For any stepper stage already at the current etapa, a double-click creates duplicate `contactoLog` entries.

**Why it happens:**
`updateEtapaCRM` was written when the only callers were manual moves from stages the patient was not already in (guards enforced this). Remove the guards and the no-op case is now reachable.

**How to avoid:**
Add an idempotency check at the start of `updateEtapaCRM`:

```typescript
if (paciente.etapaCRM === dto.etapaCRM) {
  return this.prisma.paciente.findUnique({ where: { id } }); // return current, no side effects
}
```

This prevents all duplicate `contactoLog` and `tareaSeguimiento` rows regardless of the caller. It also protects against rapid double-clicks on the stepper.

**Warning signs:**
- Contact history shows two consecutive SISTEMA entries with the same etapa and similar timestamps
- `TareaSeguimiento` table has pairs of `SEGUIMIENTO_DIA_3` / `SEGUIMIENTO_DIA_7` / `SEGUIMIENTO_DIA_14` rows for the same patient created within seconds
- `SHEET-08` "Marcar como realizado" is visible for a patient whose session was already closed

**Phase to address:**
Phase implementing SHEET-08 (and before any quick action that calls `updateEtapaCRM`). Fix idempotency before wiring the button.

---

### Pitfall 5: Toast Warning Fires on Stale Cache Data — False Positives Cause Warning Fatigue

**What goes wrong:**
CRM-02 and CRM-03 warn the user when moving to `PRESUPUESTO_ENVIADO` without an existing budget or to `CONFIRMADO` without an accepted budget. The warning condition must be evaluated from `KanbanPatient.presupuesto.estado`, which comes from the kanban query cache with `staleTime: 30_000`.

Scenario for a false positive:
1. User creates a presupuesto and marks it ENVIADO (budget now exists and is ENVIADO)
2. 45 seconds later (within the 30s staleTime window) the secretaria drags the patient to `PRESUPUESTO_ENVIADO`
3. Kanban cache still shows `presupuesto: null` (budget was created after the last kanban fetch)
4. Warning fires: "paciente no tiene presupuesto enviado" — but the budget exists
5. The drag succeeds anyway (non-blocking), but the warning was wrong

Once users learn the warning fires spuriously, they ignore all warnings — including true ones about genuinely missing budgets.

**Why it happens:**
Warning condition reads from stale `KanbanPatient` data, not from a fresh check. The kanban query is not invalidated when a budget is created (only `['presupuestos', pacienteId]` is invalidated after budget creation — not `['crm-kanban']`).

**How to avoid:**
Option A (preferred if budget actions are frequent): After any budget state change (`marcarEnviado`, `aceptar`, `rechazar`), invalidate `['crm-kanban']` in the respective mutation hooks so the kanban data is fresh.

Option B (simpler for v1.7): Accept stale warnings as non-blocking and best-effort. Add copy to the toast that makes this explicit: "Es posible que el presupuesto ya exista — verificá antes de continuar." Never block the move based on stale data.

Do NOT use the stale cache check to block or roll back the drag.

**Warning signs:**
- QA scenario: create a budget, wait 5s (less than staleTime), drag to `PRESUPUESTO_ENVIADO` — warning fires erroneously
- Users ask "¿por qué dice que no hay presupuesto si yo lo acabo de enviar?"
- Warning volume is high even on patients with valid budgets

**Phase to address:**
Phase implementing CRM-02/CRM-03. Decide between option A and B at plan time; document which was chosen and why.

---

### Pitfall 6: Sheet Layout Regression — Stepper in a Narrow Sheet Breaks Scroll and Layout

**What goes wrong:**
`CardActionsSheet` is `sm:max-w-sm` (~384px). The current layout uses `flex flex-col gap-0 p-0` at SheetContent level with `overflow-y-auto` on the inner div (lines 88–102 of `CardActionsSheet.tsx`).

Adding a 6-step stepper (SHEET-04) horizontally at the top creates several failure modes:
- Six steps with text labels do not fit in 384px — labels wrap to two lines, pushing content below the fold
- If the stepper is not given a fixed height, flex children can grow unpredictably, making the scrollable body area collapse to zero height
- Radix `SheetContent side="right"` applies `h-full` and its own overflow handling; adding a second `overflow-y-auto` wrapper creates double scroll bars on some browsers
- Quick actions per step (SHEET-06, SHEET-07, SHEET-08) add variable-height content below the stepper — if this area is not inside the scrollable region, it gets clipped

**Why it happens:**
The existing layout works with a fixed set of sections. Adding a stepper with dynamic per-step content changes the layout contract. The narrow sheet constraint was not a problem before because all sections had roughly fixed height.

**How to avoid:**
- The stepper must use step numbers (circles) as primary indicators, with labels visible only for the active step — keeps total stepper height under 60px
- Layout contract: `flex flex-col h-full` on SheetContent, stepper as a `shrink-0` header, scrollable body as `flex-1 overflow-y-auto` below it
- Quick actions per step are inside the scrollable body — not fixed at the bottom of the sheet
- Test at 375px viewport width (iPhone SE) before wiring any mutation logic to the stepper
- Do not nest a second `overflow-y-auto` inside the existing one

**Warning signs:**
- Step labels wrap to two lines at any viewport width under 400px
- Sheet body is not scrollable when content exceeds viewport
- Step action buttons clipped at the bottom of the sheet on short screens

**Phase to address:**
Phase implementing SHEET-04. Prototype the layout with static content before wiring any mutations.

---

### Pitfall 7: `PROCEDIMIENTO_REALIZADO` Hidden from Kanban Board but Shown in Stepper Creates Conflicting State

**What goes wrong:**
`ETAPA_ORDER` in `useCRMKanban.ts` (line 65) explicitly excludes `PROCEDIMIENTO_REALIZADO` from kanban columns. The backend `getKanban` method maps patients in `PROCEDIMIENTO_REALIZADO` to the `SIN_CLASIFICAR` bucket (lines 655–660 of `pacientes.service.ts`).

If the stepper in SHEET-04 includes `PROCEDIMIENTO_REALIZADO` as a clickable step:
1. User clicks step `PROCEDIMIENTO_REALIZADO` in the stepper
2. `updateEtapaCRM(PROCEDIMIENTO_REALIZADO)` succeeds
3. Cache invalidates; kanban re-fetches; patient now appears in `SIN_CLASIFICAR` (the hidden etapa bucket)
4. The stepper inside the sheet correctly shows `PROCEDIMIENTO_REALIZADO` as active (read from `KanbanPatient.etapaCRM`)
5. The kanban column shows the card in `SIN_CLASIFICAR` — the two surfaces disagree

This is confusing and unsupported by the current kanban architecture.

**Why it happens:**
Two representations of `PROCEDIMIENTO_REALIZADO` exist: the actual `Paciente.etapaCRM` value and the kanban column mapping (which hides it). The stepper reads from `etapaCRM` directly; the kanban column reads from the grouped mapping.

**How to avoid:**
Decide upfront — before writing any stepper code — one of two options:
- Option A: Make `PROCEDIMIENTO_REALIZADO` a terminal step in the stepper (shown, grayed out, not clickable via step-click). Only reachable via the SHEET-08 "Marcar como realizado" quick action. This preserves the hidden-column design and avoids adding a 7th kanban column.
- Option B: Add `PROCEDIMIENTO_REALIZADO` as a visible kanban column for v1.7. This is a larger scope change (column header, color, drag target).

Option A is strongly recommended for v1.7. Document it as an explicit decision.

**Warning signs:**
- Stepper allows clicking `PROCEDIMIENTO_REALIZADO` step directly
- Patient appears in `SIN_CLASIFICAR` column after clicking that stepper step
- Kanban and stepper disagree on the current etapa badge

**Phase to address:**
Design decision that must precede SHEET-04 implementation. Resolve before writing any stepper code.

---

### Pitfall 8: `ContactoSheet` Etapa Selector Bypasses Warning Toasts Silently

**What goes wrong:**
`ContactoSheet.tsx` (lines 174–195) has an "Etapa CRM (opcional)" select that lets the user set any etapa when registering a contact. This path goes through `createContacto` in `pacientes.service.ts` (lines 865–900), which calls `tx.paciente.update({ etapaCRM: dto.etapaCRM })` inside a transaction — with no business rule checks, no `motivoPerdida` validation for `PERDIDO`, and no warning toast.

This is a completely separate code path from `updateEtapaCRM`. Even after adding toast warnings to the drag-and-drop and stepper paths (CRM-02/CRM-03), the `ContactoSheet` etapa selector remains an unguarded path to any etapa. A SECRETARIA can move a patient to `CONFIRMADO` via this selector without a budget and with no warning.

**Why it happens:**
`ContactoSheet` was designed for registering the outcome of a contact, including CRM advancement as part of that interaction. The guard removal in v1.7 is conceptually consistent with this design — but the inconsistency is that the kanban and stepper paths will have warnings while this path has none, creating an uneven user experience.

**How to avoid:**
Either:
- Apply the same warning conditions as CRM-02/CRM-03 to the ContactoSheet etapa selector (show a warning badge next to the selector, not a blocking validation)
- Or remove `etapaCRM` from `ContactoSheet` in v1.7 and route all etapa changes through the stepper (breaking change to existing UX, not recommended for v1.7)

Also: `createContacto` must validate `motivoPerdida` when `etapaCRM === PERDIDO` — currently `updateEtapaCRM` does this check (line 513–516) but `createContacto` does not.

**Warning signs:**
- Secretaria uses ContactoSheet etapa selector to move patient to CONFIRMADO — no toast appears
- `contactoLog` shows a SECRETARIA-type entry with `etapaCRMPost: CONFIRMADO` but no `motivoPerdida` for PERDIDO transitions
- QA finds a different UX for "same action, different entry point"

**Phase to address:**
Phase implementing CRM-02/CRM-03. Audit all etapa-writing paths at the same time, not just the kanban drag path.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip idempotency check in `updateEtapaCRM` | Faster implementation | Duplicate `contactoLog` and `tareaSeguimiento` rows when auto-transitions overlap with quick action buttons | Never — fix before adding SHEET-08 |
| Use stale kanban cache for toast warning conditions | No extra API call | False-positive warnings; warning fatigue; users learn to ignore toasts | Acceptable only if toasts are documented as "best-effort, not authoritative" and toast copy reflects this |
| Share `pendingMoves` between board and sheet | Fully consistent optimistic UI | Tight coupling between unrelated component trees; breaks when sheet is refactored | Never — accept the 1–2s visual lag from invalidation; the sheet obscures the board anyway |
| Keep `PROCEDIMIENTO_REALIZADO` hidden from kanban | No layout change needed | Stepper and kanban disagree for patients in that etapa | Acceptable for v1.7 only if the stepper step is non-clickable (terminal) |
| Auto-transitions without forward-only guard | No code change needed (existing behavior) | Manual advance silently overwritten by concurrent session close after guards are removed | Never acceptable once manual guards are removed |
| Leave `ContactoSheet` etapa selector without warnings | No extra UX work | Inconsistent experience: drag/stepper warn, ContactoSheet does not | Acceptable for v1.7 if documented; unacceptable permanently |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `cerrarSesion` auto-transition | After removing manual guards, assumes the auto-transition still only fires in forward direction | Add explicit `ETAPA_ORDER` index check before every auto-write in `cerrarSesion` |
| `marcarEnviado` auto-`PRESUPUESTO_ENVIADO` | Does not check if patient is already in a later etapa (e.g., `CONFIRMADO`) — silently moves them back | Guard: fetch current `etapaCRM` before writing; skip if already ahead in `ETAPA_ORDER` |
| `useUpdateEtapaCRM` on error | `onError` path does not invalidate cache — card disappears for up to 30s | Add `queryClient.invalidateQueries({ queryKey: ["crm-kanban"] })` in `onError` |
| `ContactoSheet` etapa selector | Bypasses all warning logic and `motivoPerdida` validation | Audit this path when implementing CRM-02/CRM-03; add `motivoPerdida` check for `PERDIDO` transitions |
| Toast visual level | Using `toast.error` (red) for non-blocking prerequisites confuses "something broke" with "warning" | Use `toast.warning` (amber) for missing-prerequisite conditions; reserve `toast.error` for mutation failures |
| Stepper PERDIDO step | Direct transition without `LossReasonModal` produces a patient in `PERDIDO` with no `motivoPerdida` | Stepper step-click for `PERDIDO` must open `LossReasonModal`, not call `updateEtapaCRM` directly |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `queryClient.invalidateQueries(["crm-kanban"])` after every etapa update without `profesionalId` key | All professional contexts refetch on every drag, even other users | Use exact key: `["crm-kanban", profesionalId]` for targeted invalidation | Not a current problem (single professional per tab); becomes a problem with multi-tab multi-professional usage |
| Re-rendering all 6 kanban columns on every `pendingMoves` state change | All columns re-render and re-sort on every drag update | Already mitigated by `useMemo(displayedColumns)` — do not break this memo when adding stepper state to `KanbanBoard` | No current breakpoint; risk exists if new state causes memo dependencies to change on every render |
| Opening `CardActionsSheet` re-fetches `useUpdateEtapaCRM` mutation state | Not a real trap — mutations are created fresh per mount | No action needed | N/A |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Removing CONFIRMADO guard from `updateEtapaCRM` | Patient incorrectly marked CONFIRMADO; misleading conversion metrics; audit trail shows manual CONFIRMADO without accepted budget | Not a financial risk (billing charge only created via `presupuestos.aceptar` which still requires `estado: ENVIADO`); is a data integrity and reporting risk | Document the intentional removal; the warning toast is the substitute control |
| `createContacto` path allows any `etapaCRM` without `motivoPerdida` for PERDIDO | Patient in `PERDIDO` with no `motivoPerdida`; "motivos de pérdida" dashboard shows incomplete data | Add `if dto.etapaCRM === PERDIDO && !dto.motivoPerdida throw BadRequestException` to `createContacto` path |
| Auto-transition writes `etapaCRM` in `cerrarSesion` without checking the role of who closed the session | N/A — `cerrarSesion` is already role-guarded at controller level | No action needed |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Warning toast fires on every drag to CONFIRMADO even when budget is ACEPTADO and cache is fresh | Secretaria sees warning when she correctly moved the patient; distrust in the system | Evaluate warning only when `KanbanPatient.presupuesto?.estado !== 'ACEPTADO'`; suppress warning when budget is clearly in order |
| Stepper shows all 6 stage labels simultaneously in a 384px sheet | Labels truncate or wrap; stepper is unreadable | Step numbers in circles at rest; label visible only for the active step; tooltip on hover for others |
| "Marcar como realizado" (SHEET-08) has no confirmation step | Accidental tap marks patient as procedure-done, creating follow-up tasks and log entries | Require two interactions: toggle or secondary confirm button ("Confirmar"); not a full AlertDialog (too heavy), but not a single tap |
| Compact "Registrar contacto" button opens `ContactoSheet` (a full Sheet) from inside `CardActionsSheet` | Two overlapping Sheet portals cause z-index and modal={false} conflicts, especially on iOS Safari | Open `ContactoSheet` as a separate root-level portal (already supports `modal={false}`); do not nest it inside the redesigned sheet |
| Stepper step for PERDIDO fires direct `updateEtapaCRM` | Patient lands in PERDIDO without `motivoPerdida`; funnel report breaks | Stepper PERDIDO click must open `LossReasonModal` — same as drag behavior currently implemented in `handleDragEnd` |

---

## "Looks Done But Isn't" Checklist

- [ ] **Auto-transition forward-only guard:** move patient to CONFIRMADO manually; close a surgery session for the same patient; assert `etapaCRM` remains CONFIRMADO — not overwritten to `PROCEDIMIENTO_REALIZADO`
- [ ] **`useUpdateEtapaCRM` error path:** simulate a backend 500 on drag; assert the card returns to its original column within 2 seconds — not lost for 30s
- [ ] **Stepper PERDIDO step:** clicking PERDIDO step in stepper opens `LossReasonModal`, not a direct PATCH — verify by clicking the step and confirming the modal fires
- [ ] **Idempotent `updateEtapaCRM`:** call `PATCH /pacientes/:id/etapa-crm` with the patient's current etapa; assert exactly zero new `contactoLog` rows and zero new `tareaSeguimiento` rows are created
- [ ] **SHEET-08 "Marcar como realizado":** click the button for a patient already in `PROCEDIMIENTO_REALIZADO`; assert no duplicate `contactoLog` entry is created
- [ ] **`PROCEDIMIENTO_REALIZADO` in stepper:** step is displayed but not clickable (terminal) OR if clickable, patient does not end up in `SIN_CLASIFICAR` column — verify the kanban column placement post-click
- [ ] **Sheet layout at 375px:** stepper, compact buttons, and quick actions all visible without horizontal scroll and with a working scroll for the body — verify on narrow viewport before merging
- [ ] **ContactoSheet etapa selector → PERDIDO:** selecting PERDIDO in the etapa dropdown without a `motivoPerdida` is rejected by the backend — verify the new validation fires
- [ ] **Warning toast visual level:** warning uses `toast.warning` amber style, mutation error uses `toast.error` red style — visually distinct in the UI

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Auto-transition overwrote manual CONFIRMADO move | LOW — code fix only | Add forward-only guard to `cerrarSesion` and `marcarEnviado`; no DB migration needed; one guard per transition path |
| Duplicate `contactoLog` / `tareaSeguimiento` from non-idempotent calls | MEDIUM — data cleanup needed | Add idempotency check to `updateEtapaCRM`; run SQL to delete consecutive SISTEMA duplicate entries: `DELETE FROM "ContactoLog" WHERE id IN (SELECT id FROM ...)` comparing consecutive rows by pacienteId + tipo + etapaCRMPost + timestamp within 5s window |
| Ghost card disappears on drag error | LOW — one-line fix | Add `onError: () => invalidateQueries(["crm-kanban"])` to `useUpdateEtapaCRM.ts` |
| Warning fatigue from false positives | HIGH — trust recovery required | Fix stale cache trigger conditions; communicate to users that warnings are now reliable; may require explicit in-app "this warning is now accurate" notice |
| Patient in PERDIDO with no `motivoPerdida` via ContactoSheet | MEDIUM — data backfill | Add backend validation to `createContacto`; backfill existing PERDIDO patients with `motivoPerdida = 'OTRO'` where null |
| Sheet layout broken on mobile | LOW — CSS only | Adjust stepper to number-only at rest; move quick action content inside scrollable body region |
| PROCEDIMIENTO_REALIZADO clickable in stepper — patient lands in SIN_CLASIFICAR | MEDIUM — UX confusion, data still correct | Make step non-clickable (terminal); patient etapaCRM remains PROCEDIMIENTO_REALIZADO which is correct; kanban display is the only issue |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Auto-transition conflict (Pitfall 1) | Phase implementing CRM-01 backend (guard removal) | Manual CONFIRMADO → close surgery session → assert etapaCRM stays CONFIRMADO |
| Optimistic ghost card on error (Pitfall 2) | Phase implementing CRM-01 frontend (drag-and-drop) | Simulate 500 on drag → assert card returns to original column within 2s |
| Stepper → board state desync (Pitfall 3) | Phase implementing SHEET-05 (stepper click) | Click step → close sheet → assert kanban column reflects new etapa within 2s; assert no double-PATCH |
| Duplicate side effects from idempotency gap (Pitfall 4) | Phase implementing SHEET-08 (quick actions) | Double-call `updateEtapaCRM` with current etapa → assert zero new `contactoLog` rows |
| Stale cache false-positive warnings (Pitfall 5) | Phase implementing CRM-02/CRM-03 | Create budget → drag immediately → assert no spurious warning fires |
| Sheet layout regression (Pitfall 6) | Phase implementing SHEET-04 (stepper visual) | Render sheet at 375px → stepper fits; body scrolls; no double scrollbar |
| PROCEDIMIENTO_REALIZADO state desync (Pitfall 7) | Design decision before SHEET-04 implementation | If terminal: step is non-clickable; assert patient is not moved to SIN_CLASIFICAR via stepper |
| ContactoSheet etapa bypass (Pitfall 8) | Phase implementing CRM-02/CRM-03 (audit all paths) | Select PERDIDO in ContactoSheet without motivoPerdida → assert backend rejects with 400 |

---

## Sources

- Direct code analysis: `backend/src/modules/pacientes/pacientes.service.ts` — `updateEtapaCRM` (lines 503–588), `createContacto` (lines 865–900), `getKanban` PROCEDIMIENTO_REALIZADO mapping (lines 644–660)
- Direct code analysis: `backend/src/modules/turnos/turnos.service.ts` — `crearTurno` auto-transition (lines 129–140), `cerrarSesion` auto-transition (lines 849–912)
- Direct code analysis: `backend/src/modules/presupuestos/presupuestos.service.ts` — `marcarEnviado` forced PRESUPUESTO_ENVIADO (line 229), `aceptar` forced CONFIRMADO (line 182), `rechazar` forced PERDIDO (line 278), `aceptarByToken` forced CONFIRMADO (line 582), `rechazarByToken` forced PERDIDO (line 641)
- Direct code analysis: `frontend/src/components/crm/KanbanBoard.tsx` — `pendingMoves` optimistic pattern (lines 64–183), `onError` toast without invalidation (line 179)
- Direct code analysis: `frontend/src/hooks/useUpdateEtapaCRM.ts` — missing `onError` invalidation
- Direct code analysis: `frontend/src/hooks/useCRMKanban.ts` — `ETAPA_ORDER` excluding PROCEDIMIENTO_REALIZADO (line 65), `staleTime: 30_000` (line 86)
- Direct code analysis: `frontend/src/components/crm/ContactoSheet.tsx` — unguarded etapa selector (lines 174–195)
- Direct code analysis: `frontend/src/components/crm/CardActionsSheet.tsx` — existing sheet layout contract (lines 88–102)
- `.planning/PROJECT.md` — v1.7 feature requirements (CRM-01 through SHEET-09), existing key decisions (v1.4 guard PENDIENTE-only, v1.5 optimistic update patterns, v1.6 AlertDialog e.preventDefault pattern)

---
*Pitfalls research for: CRM Flexible v1.7 — unrestricted kanban, stepper UX, non-blocking warnings*
*Researched: 2026-05-23*
