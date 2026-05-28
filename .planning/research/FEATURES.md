# Feature Research

**Domain:** Medical clinic CRM — flexible pipeline stage transitions and redesigned kanban sheet (v1.7)
**Researched:** 2026-05-23
**Confidence:** HIGH (existing codebase reviewed end-to-end; UX patterns verified against NN/g, UX Patterns Dev, LogRocket, Foundey)

---

## Context

This is a milestone research file, not a greenfield project. The kanban board, stage system, sheet, and auto-transitions are already built. v1.7 adds: (1) unrestricted drag-and-drop, (2) non-blocking toast warnings for unmet prerequisites, (3) a redesigned sheet with a clickable stage stepper and compact actions. Research answers "what does this ecosystem expect?" for those three domains.

Existing code baseline:
- `KanbanBoard.tsx` — dnd-kit with optimistic moves, already open to any stage except PERDIDO (which triggers LossReasonModal)
- `CardActionsSheet.tsx` — full-width sheet with always-visible "Registrar contacto" form, quick action buttons, lista de espera section
- `ContactoSheet.tsx` — separate fuller sheet with CRM stage selector and follow-up scheduling (used from PatientDrawer)
- `useUpdateEtapaCRM` — PATCH `/pacientes/:id/etapa-crm`; backend may currently reject moves that skip prerequisites

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the secretaria assumes exist once the "flexible CRM" framing is presented. Missing any of these = the redesign feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Drag any card to any column without hard block | Core premise of v1.7; users already test boundaries with current kanban | LOW | Backend guard removal is the critical path; optimistic move already works client-side |
| Toast warning when moving without prerequisites met | Industry standard: CRM platforms (HubSpot, Pipedrive) show inline nudges, not hard stops | LOW | `sonner` already imported and used in KanbanBoard.tsx; logic is a client-side check before or after PATCH |
| Stage stepper in sheet showing all 6 stages | Users need orientation: "where is this patient in the funnel?" is the primary question on open | MEDIUM | shadcn/ui has no built-in stepper; implement with flex + conditional styling using ETAPA_ORDER from useCRMKanban |
| Clicking a stepper step moves patient to that stage | If the stepper is read-only it confuses users who expect it to be interactive | MEDIUM | Reuses useUpdateEtapaCRM; PERDIDO step must still trigger LossReasonModal |
| Compact "Registrar contacto" button opening a small modal | Current always-visible form occupies ~40% of sheet height; users expect quick-action CTA, not inline form | MEDIUM | Pattern: use Dialog (not Sheet-within-Sheet); form stays simple (tipo + nota) |
| Lista de espera as a single toggle button (not a section) | Full section with textarea for optional comment is overbuilt for a binary opt-in | LOW | Compact button with inline state indicator; comment field removed or collapsed behind expansion |
| Stage-specific contextual action per stepper step | Users expect the sheet to surface "what do I do here?" — this is the core value of the stage stepper UX | MEDIUM | Conditional rendering based on current etapaCRM; reuses HCCreatorForm, existing presupuesto navigation |
| Flujo badge in sheet header | v1.4 introduced flujo (CIRUGIA/TRATAMIENTO); the CRM kanban only shows CIRUGIA patients; the badge is orientation context | LOW | KanbanPatient already has `procedimiento`; need to add `flujo` field to the kanban API response |
| Automatic transitions continue working unchanged | Sending a presupuesto still auto-advances to PRESUPUESTO_ENVIADO; accepting still auto-advances to CONFIRMADO | LOW | No changes needed to existing auto-transition logic; only the manual drag guard is relaxed |

### Differentiators (Competitive Advantage)

Features that make this CRM sheet meaningfully better than the current design and better than generic CRM tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Stepper as navigation + action surface (not just progress indicator) | Generic CRM tools (Pipedrive, HubSpot) show a dropdown to change stage; a visual stepper that doubles as action shortcuts is materially better UX for non-technical operators | MEDIUM | Each step node should show: completed state, current state, future state — plus the contextual action button only when on that step |
| Contextual action collapses/expands per active step | Reduces cognitive load: "Registrar HC" only appears when patient is in CONSULTADO, "Ver presupuesto" only in PRESUPUESTO_ENVIADO — users do not need to hunt for the right action | MEDIUM | Conditional rendering inside stepper, not a separate panel; removes the existing "Acciones rapidas" section entirely |
| Warning toast with specific actionable text | Generic CRMs show "stage requires X"; this system can be specific: "Moviste a CONFIRMADO sin presupuesto aceptado" with a link to create one | LOW | `sonner` supports JSX in toast content; action button inside toast can be added in v1.x |
| PERDIDO always requires loss reason (unblockable) | All major CRM tools enforce this gate because losing without tagging reason destroys analytics | LOW | Already implemented via LossReasonModal; preserve this as the only hard gate |
| Optimistic move with visual pending state | Card dims with dashed border during in-flight PATCH (already implemented); users feel the system is fast even over slow connections | LOW | Already built; no change needed |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Hard blocking all stage skips | "Data integrity" — managers want to enforce process | Creates warning fatigue avoidance: users route around blocks by doing prerequisite actions meaninglessly just to advance the stage. NN/g: hard blocks on workflow steps increase error rates when users are experienced operators who legitimately need to override. | Non-blocking toast warnings that inform without blocking; PERDIDO remains the only hard gate because loss-reason capture has direct analytics value |
| Modal confirmation for every stage change | Feels "safe" — confirms the user meant to do it | Every kanban drag requiring a confirmation destroys the speed advantage of the kanban view. Users abandon drag-and-drop for a slower list view if each drag produces a popup. | Toast warnings only when prerequisites are actually unmet; silent success when transition is clean |
| CRM stage selector inside "Registrar contacto" modal | ContactoSheet.tsx already has this; users can update stage when logging contact | Conflates two concerns: "I talked to them" and "I'm advancing the stage". Users get confused about which action triggers the stage change. | Separate the stage change (stepper click) from the contact log (compact modal). Stage change in ContactoSheet becomes optional/advanced; stepper is the primary UX for stage movement |
| Sheet-within-Sheet for "Registrar contacto" | Seems natural to open another sheet from within the sheet | Radix Sheet nesting has known portal/focus-trap conflicts. ContactoSheet already has `modal={false}` to paper over this. | Use `Dialog` (not `Sheet`) for the compact contact log modal inside the actions sheet |
| Inline contact form always visible in sheet | Reduces clicks | 40% of vertical space wasted on a form the user may not use on every open. Sheet height is limited, and the stepper needs that space. | Button-triggered compact Dialog; form only appears when user explicitly needs it |
| Lista de espera comment textarea always visible | Completeness | Optional comment competes with the stepper for vertical space | Toggle/expand: show comment field only after enabling the switch, or move to a secondary edit flow |
| Adding NUEVO_LEAD or SIN_CLASIFICAR to the stepper | Completeness | These are not actionable conversion stages for a patient who already has a turno. Showing SIN_CLASIFICAR in the stepper creates confusion about what "going back" means. | Stepper shows: TURNO_AGENDADO -> CONSULTADO -> PRESUPUESTO_ENVIADO -> CONFIRMADO -> PROCEDIMIENTO_REALIZADO -> PERDIDO (same 6 stages as the funnel dashboard) |

---

## Feature Dependencies

```
[Unrestricted drag-and-drop (CRM-01)]
    └──requires──> [Backend guard removal on etapa-crm PATCH]
                       └──requires──> [Verify no business logic in turnos service depends on CRM gate]

[Toast warnings (CRM-02, CRM-03)]
    └──requires──> [Client-side prerequisite check in handleDragEnd]
    └──enhances──> [Unrestricted drag-and-drop (CRM-01)]

[Stage stepper in sheet (SHEET-04)]
    └──requires──> [ETAPA_ORDER definition] (exists in useCRMKanban.ts)
    └──requires──> [Flujo field added to KanbanPatient type + API response]

[Stepper click moves to stage (SHEET-05)]
    └──requires──> [Stage stepper in sheet (SHEET-04)]
    └──requires──> [useUpdateEtapaCRM hook] (exists)
    └──special-case──> [PERDIDO step triggers LossReasonModal instead of direct PATCH]

[Stage-specific contextual actions (SHEET-06, SHEET-07, SHEET-08)]
    └──requires──> [Stage stepper in sheet (SHEET-04)]
    └──requires──> [HCCreatorForm component] (exists, v1.5)
    └──requires──> [onOpenPresupuestos callback] (already threaded through KanbanBoard -> CardActionsSheet)

[Compact "Registrar contacto" modal (SHEET-02)]
    └──requires──> [useCreateContacto hook] (exists)
    └──conflicts-with──> [Sheet-within-Sheet pattern] -- use Dialog instead

[Lista de espera compact button (SHEET-03)]
    └──requires──> [useUpdateListaEspera hook] (exists in CardActionsSheet.tsx)

[Remove quick actions panel (SHEET-09)]
    └──enables──> [Stage-specific contextual actions (SHEET-06, SHEET-07, SHEET-08)]
    └──note──> ["Dar un turno" button removed; access via PatientDrawer if needed]
```

### Dependency Notes

- **Unrestricted drag-and-drop requires backend guard removal:** Client-side optimistic move already works. The backend `PATCH /pacientes/:id/etapa-crm` may enforce business rules (e.g., reject CONFIRMADO without accepted presupuesto). This must be verified; the guard should be softened to a warning-only response or removed entirely.
- **Toast warnings check prerequisites client-side:** The check needs the patient's presupuesto state, available on `KanbanPatient.presupuesto`. No extra API call needed for the two specified warnings (CRM-02: no presupuesto at all when moving to PRESUPUESTO_ENVIADO; CRM-03: presupuesto.estado !== 'ACEPTADO' when moving to CONFIRMADO).
- **Stepper conflicts with current ETAPA_ORDER:** `ETAPA_ORDER` in `useCRMKanban.ts` currently excludes PROCEDIMIENTO_REALIZADO (hidden from kanban per v1.0 decision). The stepper should include it (it's a valid CRM milestone), but it should not become a droppable kanban column. These are separate concerns.
- **Compact contact modal must use Dialog, not Sheet:** Radix Sheet nested inside Sheet has portal conflicts already documented in ContactoSheet.tsx (`modal={false}` workaround). Use `Dialog` for the inner component.
- **"Dar un turno" quick action is removed (SHEET-09):** Currently in the quick actions panel. Once the panel is removed, turno creation is accessible via PatientDrawer. Verify with product owner before removing.

---

## MVP Definition

### Launch With (v1.7 — all items)

All items are explicitly in scope per PROJECT.md CRM-01 through SHEET-09.

- [ ] CRM-01: Unrestricted drag-and-drop (any stage -> any stage) — requires backend guard removal
- [ ] CRM-02: Toast warning when moving to PRESUPUESTO_ENVIADO without existing presupuesto
- [ ] CRM-03: Toast warning when moving to CONFIRMADO without accepted presupuesto
- [ ] CRM-04: Auto-transitions continue working (no regression)
- [ ] CRM-05: Stepper click moves patient to stage (same path as drag-and-drop)
- [ ] SHEET-01: Sheet header with patient name + flujo badge
- [ ] SHEET-02: "Registrar contacto" as compact button opening Dialog (not Sheet)
- [ ] SHEET-03: Lista de espera as compact toggle button
- [ ] SHEET-04: Stage stepper showing all 6 funnel stages with current stage highlighted
- [ ] SHEET-05: Clicking stepper step triggers stage transition
- [ ] SHEET-06: "Ver/Crear presupuesto" action in PRESUPUESTO_ENVIADO step
- [ ] SHEET-07: "Registrar HC" action in CONSULTADO step (opens HCCreatorForm)
- [ ] SHEET-08: "Marcar como realizado" action in PROCEDIMIENTO_REALIZADO step
- [ ] SHEET-09: Remove existing quick actions panel from sheet

### Add After Validation (v1.x)

- [ ] Action-button toast: "Moviste a CONFIRMADO sin presupuesto. Crear uno ->" with JSX button inside sonner toast
- [ ] Flujo badge in stepper step for TRATAMIENTO patients if kanban ever shows them
- [ ] Animated stepper transitions (smooth highlight movement between steps)

### Future Consideration (v2+)

- [ ] Time-in-stage indicator per stepper step (how many days patient has been in this stage)
- [ ] Automated follow-up triggers based on stage + days elapsed (deferred in PROJECT.md)
- [ ] Stage-change audit log visible in sheet (who moved them, when)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Unrestricted drag-and-drop (CRM-01) | HIGH | LOW (client done; backend guard removal) | P1 |
| Toast warnings (CRM-02, CRM-03) | HIGH | LOW (client-side check + sonner) | P1 |
| Stage stepper UI (SHEET-04) | HIGH | MEDIUM (custom component; no shadcn stepper) | P1 |
| Compact "Registrar contacto" modal (SHEET-02) | HIGH | MEDIUM (refactor CardActionsSheet; new Dialog) | P1 |
| Stepper click -> stage change (SHEET-05) | HIGH | LOW (reuses useUpdateEtapaCRM) | P1 |
| Contextual step actions (SHEET-06/07/08) | HIGH | LOW (conditional rendering inside stepper) | P1 |
| Sheet header with name + flujo badge (SHEET-01) | MEDIUM | LOW (minor CardActionsSheet header refactor) | P1 |
| Lista de espera compact button (SHEET-03) | MEDIUM | LOW (simplify existing section) | P1 |
| Remove quick actions panel (SHEET-09) | MEDIUM | LOW (delete JSX block) | P1 |
| Auto-transitions unchanged (CRM-04) | HIGH | LOW (verify, no code change expected) | P1 |

---

## Competitor Feature Analysis

| Feature | HubSpot Deals | Pipedrive | Our Approach |
|---------|--------------|-----------|--------------|
| Stage restriction | Optional hard blocks (admin-configurable per stage) | No hard blocks; any stage -> any stage via drag | Non-blocking toasts only; PERDIDO remains only hard gate (loss reason required) |
| Stage change UX | Dropdown picker in deal detail sidebar | Drag-and-drop + clickable stage bar at top of deal | Drag-and-drop (existing) + stepper in sheet (new) |
| Contextual actions per stage | "Required fields" modal per stage | No per-stage actions built-in | Contextual action button rendered inside each stepper step |
| Log contact / note | Persistent "Activity" section always visible | Activity panel always in deal sidebar | Compact button -> Dialog (removes always-visible form to free vertical space) |
| Pipeline flexibility | Any deal can skip stages freely | Any deal can skip stages freely | Same: flexible with informational warnings |

---

## Warning Pattern Specification

The non-blocking warning behavior is the highest-risk UX decision in v1.7 because it replaces a safety mechanism. This section is opinionated to prevent scope creep and warning fatigue.

### When to warn

| Trigger | Warning text | Blocking? |
|---------|-------------|-----------|
| Move to PRESUPUESTO_ENVIADO, `patient.presupuesto === null` | "Este paciente no tiene presupuesto creado. Podes crear uno desde el perfil." | No |
| Move to CONFIRMADO, `patient.presupuesto?.estado !== 'ACEPTADO'` | "Este paciente no tiene presupuesto aceptado. El sistema lo movio de todas formas." | No |
| Move to PERDIDO (any origin) | LossReasonModal — reason required | Yes (modal gate) |
| Move to any other stage with any state | No warning | — |

### Why exactly two warnings

More warnings = warning fatigue. NN/g research confirms users trained to dismiss warnings stop reading them after 3-5 occurrences. Two warnings cover the analytically meaningful cases: PRESUPUESTO_ENVIADO without a budget is a data quality issue; CONFIRMADO without accepted budget is a revenue integrity issue. All other stage combinations are routine operations that should be silent.

### Implementation location

Check prerequisites in `handleDragEnd` (KanbanBoard.tsx) after optimistic move is applied. The prerequisite data is on `KanbanPatient` which is already in scope at drag-end. No additional API calls needed. Use `toast.warning()` variant, not `toast.error()` — the move succeeded; this is informational, not a failure. Duration: 6 seconds (default 4s is too short for actionable messages in Spanish).

---

## Stepper Design Specification

Opinionated implementation guidance to reduce ambiguity in planning.

1. **Stages to show (6):** TURNO_AGENDADO -> CONSULTADO -> PRESUPUESTO_ENVIADO -> CONFIRMADO -> PROCEDIMIENTO_REALIZADO -> PERDIDO (mirrors the dashboard funnel; excludes SIN_CLASIFICAR and NUEVO_LEAD)
2. **Current stage:** filled/highlighted circle node; steps before shown as completed (checkmark or filled); steps after shown as future (empty circle)
3. **Clickability:** all steps clickable; PERDIDO click triggers LossReasonModal; all others trigger useUpdateEtapaCRM directly
4. **Contextual action:** renders immediately below the current (active) step node only:
   - CONSULTADO -> "Registrar HC" (opens HCCreatorForm in a Dialog)
   - PRESUPUESTO_ENVIADO -> "Ver/Crear presupuesto" (calls `onOpenPresupuestos`)
   - PROCEDIMIENTO_REALIZADO -> "Marcar como realizado" (calls updateEtapa to PROCEDIMIENTO_REALIZADO if not already there)
5. **Layout:** horizontal stepper with abbreviated labels fitting `max-w-sm` sheet width; overflow handled with small text or wrapped labels; connector line between nodes
6. **No shadcn built-in stepper exists** — implement with flex row, conditional classNames per step state (completed/current/future), and a thin connector line between nodes. Estimated 60-80 lines of TSX.

---

## Sources

- [Stepper UI Best Practices — Foundey](https://foundey.com/blog/stepper-ui-best-practices) — sidebar stepper UX, linear vs. non-linear navigation, clickable steps
- [Indicators, Validations, and Notifications — NN/g](https://www.nngroup.com/articles/indicators-validations-notifications/) — when to use toast vs. modal vs. inline; urgency and required-action framework
- [Toast Notification UX — LogRocket](https://blog.logrocket.com/ux-design/toast-notifications/) — toast for non-critical messages; warning vs. error tone
- [Modal vs. Popover vs. Tooltip — UX Patterns Dev](https://uxpatterns.dev/pattern-guide/modal-vs-popover-guide) — use Dialog (not Sheet) for compact contact log inside an open sheet
- [CRM UX Design 2025 — Yellow Slice](https://yellowslice.in/bed/crm-ux-design-in-2025-what-works-what-fails-and-whats-next/) — proliferation-of-screens failure mode; inline action patterns
- [SaaS CRM Design Trends 2025 — EseOSpace](https://eseospace.com/blog/saas-crm-design-trends-for-2025/) — kanban + detail drawer pattern dominance
- Codebase: `KanbanBoard.tsx`, `CardActionsSheet.tsx`, `ContactoSheet.tsx`, `useCRMKanban.ts`, `useUpdateEtapaCRM.ts`
- `PROJECT.md` — v1.7 milestone definition, ticket list CRM-01 through SHEET-09

---

*Feature research for: CRM Flexible stage transitions and kanban sheet redesign (v1.7)*
*Researched: 2026-05-23*
