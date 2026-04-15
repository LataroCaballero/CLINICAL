# Feature Research

**Domain:** Patient flow classification and treatment list — v1.4 milestone for Argentine aesthetic surgery clinic SaaS
**Researched:** 2026-04-15
**Confidence:** HIGH (codebase analysis, domain patterns from clinical SaaS conventions) / MEDIUM (UX patterns for classification alerts — based on clinical software conventions and general SaaS research)

> **Scope:** This document covers ONLY features needed for v1.4 — patient segmentation (CIRUGIA / TRATAMIENTO / PENDIENTE), CRM funnel filtering, LiveTurno classification banner, and the new "Tratamientos" tab.
> Everything built in v1.0–v1.3 (CRM funnel, LiveTurno session, patient list, kanban board, appointment booking, TipoTurno) is already shipped and is NOT re-researched here.

---

## Context: What Already Exists (Do Not Re-Build)

The following is live in the codebase and must be extended, not replaced:

- `TipoTurno` model with `esCirugia` boolean, `TipoTurnoProfesional` per-professional config
- `Turno` model with `tipoTurnoId` FK
- `Paciente` model with `etapaCRM`, `temperatura`, `scoreConversion` — no `flujo` field yet
- `LiveTurnoPanel` — full-screen overlay (`fixed inset-0 z-50`) with Header / Tabs / Footer structure
- `LiveTurnoHeader` — shows `session.tipoTurno` name badge, patient info, timer
- `/dashboard/pacientes` page — "Embudo" (kanban) and "Lista" (data table) views, toggle buttons in header
- `KanbanBoard` + `CRMMetricsBar` — CRM embudo across all 6 stages, currently unfiltered by patient flow
- `Tratamiento` model — per-professional catalog (id, nombre, descripcion, precio, duracionMinutos, activo)
- `TratamientoCatalogo` model — shared catalog entries for lookup/autocomplete

What does NOT exist yet (v1.4 must add):

- `flujo` enum (`CIRUGIA | TRATAMIENTO | PENDIENTE`) on `Paciente`
- Auto-assignment logic: creating a turno with a flow-classifying `TipoTurno` sets `Paciente.flujo`
- CRM kanban and metrics filtered to `flujo = CIRUGIA` patients only
- Classification alert in LiveTurno for `flujo = PENDIENTE` patients
- "Tratamientos" tab on `/dashboard/pacientes` with monthly list, per-treatment filter

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the Secretaria/Coordinadora and Profesional expect once patient flow classification is announced. Missing these = the feature is misleading or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `flujo` field auto-set when booking specific appointment types | The entire value of the feature is that flow is inferred without manual entry. If the user must manually tag every patient, adoption will be near zero — the secretary who books appointments is not going to open each patient record separately. | MEDIUM | Backend: `TipoTurno` needs a `flujoAsignado` enum field (`CIRUGIA \| TRATAMIENTO \| null`). On `Turno` creation, if `flujoAsignado` is set and the patient's current `flujo` is `PENDIENTE` or `null`, update `Paciente.flujo` to that value. Atomic in the same `$transaction` as the turno insert. |
| CRM kanban and embudo metrics show only `CIRUGIA` patients | The core complaint this milestone solves: treatment patients (botox, peeling, fillers) pollute conversion funnel metrics. A surgeon with 200 treatment patients and 10 surgery candidates needs to see 10 in the funnel, not 210. Missing this filter makes the v1.4 milestone pointless. | LOW | Backend: add `flujo: 'CIRUGIA'` filter to CRM kanban query and metrics aggregation. Frontend: no change to UI — filter is transparent to the user. Add an explanatory subtext "Solo pacientes de cirugía" near the funnel header. |
| Classification banner in LiveTurno for PENDIENTE patients | The Profesional is the most reliable classification point — they are the one who knows after the consultation whether the patient is a surgery candidate or a treatment patient. Without a prompt in the session, PENDIENTE patients accumulate indefinitely. | MEDIUM | Non-blocking banner inside `LiveTurnoPanel` (not a modal blocking the workflow). Shows when `session.pacienteFlujo === 'PENDIENTE'`. Two buttons: "Paciente de cirugía" and "Paciente de tratamiento". Dismissible. Calls a PATCH endpoint to update `Paciente.flujo`. No navigation required — session continues normally. |
| "Tratamientos" tab in `/dashboard/pacientes` — monthly list | Treatment patients generate recurring revenue but are invisible in the current CRM funnel. The Secretaria needs to see who came in this month for treatments, sorted by day, to chase pending patients and manage scheduling. Without this view, treatment volume is completely dark. | MEDIUM | New tab alongside "Lista" and "Embudo". Fetches turnos where the associated `TipoTurno.flujoAsignado = 'TRATAMIENTO'`, grouped/paginated by month. Default to current month. |
| Treatment list: patient name, date/time, treatment type | Minimum useful row — without these three columns the list is not actionable. The secretary must be able to identify who came, when, and for what. | LOW | Columns: fecha (date + time), paciente (name, clickable to patient drawer), tipoTurno (name badge), estado (turno state badge). |
| Treatment list: filter by appointment type / treatment | The professional's catalog may have 10+ treatment types (laser, botox, peeling, fillers, etc.). Without filtering, the list becomes noise. Common clinical SaaS pattern: dropdown filter by treatment type, multi-select or single. | LOW | Filter uses existing `TipoTurno` names from the professional's configured types with `flujoAsignado = 'TRATAMIENTO'`. Single-select dropdown ("Todos" default). Client-side filter on the fetched month's data is acceptable given expected monthly volume (< 200 rows). |
| Treatment list: month navigation (prev/next) | Monthly pagination is standard for clinical practice management. It maps to how clinics think about their schedule and billing. A flat infinite scroll with no temporal grouping is unusable in practice. | LOW | "< Mes anterior" / "Mes actual" / "Mes siguiente" nav buttons. Display formatted as "Marzo 2026". Fetch data per month via query param `?month=2026-03&flujo=TRATAMIENTO`. |
| The 5 new appointment types seeded in DB | Without the seed data, no auto-classification works and the calendar booking flow has no new types to offer. This is the foundation of the entire milestone. | LOW | DB seed / migration: "Consulta para cirugía" (`flujoAsignado: CIRUGIA`), "Consulta para tratamiento en consultorio" (`flujoAsignado: TRATAMIENTO`), "Pre-operatorio" (`flujoAsignado: CIRUGIA`), "Control" (`flujoAsignado: null` — intentionally ambiguous), "Consulta pendiente" (`flujoAsignado: null`). The `null` types do not update `Paciente.flujo`. |
| PENDIENTE patients excluded from CRM surgery funnel | If PENDIENTE patients appear in the funnel alongside CIRUGIA patients, coordinators will waste time following up on patients who may end up being treatment-only. The funnel should represent only patients explicitly classified as surgery candidates. | LOW | Same backend filter as "CRM kanban shows only CIRUGIA" — trivial once `flujo` field exists. |

### Differentiators (Competitive Advantage)

Features that go beyond basic segmentation and create meaningful operational value for the clinic.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Classify later" badge on PENDIENTE patients in the patient list | Coordinators can see at a glance which patients still need classification without entering each patient record. One column in the existing patient list showing a "Pendiente clasificar" badge helps the secretary triage efficiently. | LOW | Add a `flujo` badge column to the existing `PacientesDataTable` columns: "Cirugía" (blue), "Tratamiento" (green), "Sin clasificar" (amber). Amber rows are the secretary's task queue. No new page required. |
| Automatic CRM stage assignment when `flujo` changes to CIRUGIA | When a PENDIENTE patient is classified as CIRUGIA (either via LiveTurno banner or manually), their CRM stage should auto-advance to at least `CONSULTADO` if it was still `TURNO_AGENDADO`. Without this, classified surgery patients silently enter the funnel at the wrong stage. | MEDIUM | On `Paciente.flujo` update to `CIRUGIA`: if `etapaCRM === 'TURNO_AGENDADO'`, promote to `CONSULTADO`. This matches the existing logic: booking a "Consulta para cirugía" implies the consultation happened or is in progress. Implement in the PATCH `/pacientes/:id/flujo` endpoint. |
| Treatment list shows accumulated revenue per patient in the month | Clinics doing treatments want to see not just who came but how much each patient spent. A "monto" column on the treatment list surfaces this without requiring navigation to the financial module. | MEDIUM | Requires joining `Turno → Cobro/Factura`. Optional for v1.4. Worth including if the financial data is already associated with turnos (which it is via `CobrarConsultaTab` in LiveTurno). |
| Monthly treatment count KPI in page header | A simple "X tratamientos este mes" counter at the top of the Tratamientos tab gives the secretary immediate context. Clinical SaaS products with scheduling + CRM universally include this type of at-a-glance summary. | LOW | Count of rows in the current month's fetch. Static text: "23 tratamientos en Marzo 2026". Computed from the same query, no separate endpoint. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Manual `flujo` selector on every patient form | Feels thorough — admins want control over every field | Creates a "please fill this field" UX tax on every new patient creation, which happens dozens of times per day. Users will skip it or fill it wrong. Classification is more accurate when it comes from the appointment type at booking time. | Auto-classify via `TipoTurno.flujoAsignado` at turno creation. Offer reclassification only via the LiveTurno banner (at the point of care) and an optional override in the patient drawer for edge cases. |
| Separate CRM funnel for TRATAMIENTO patients | Product managers instinctively want two funnels — one for surgery, one for treatment | Treatment patients are recurring and do not follow the same lifecycle (TURNO_AGENDADO → CONSULTADO → PRESUPUESTO_ENVIADO → CONFIRMADO → PROCEDIMIENTO_REALIZADO). A treatment funnel would need entirely different stages, different KPIs, and different follow-up logic. It's a separate product, not a tab. | The "Tratamientos" monthly list IS the treatment management view. It is date-centric, not stage-centric, which matches how treatment revenue actually works. |
| Blocking modal in LiveTurno forcing classification before closing session | Ensures no PENDIENTE patients slip through | This breaks the LiveTurno UX contract. Professionals who are mid-consultation with another patient, or closing a session for a patient with a complex record, will be frustrated by a forced interruption. | Non-blocking inline banner in LiveTurnoPanel. The professional can dismiss it and classify later. PENDIENTE badge on patient list is the fallback reminder. |
| Treatment list with infinite scroll and date range picker | Feels more powerful | Monthly pagination maps to how clinical practice billing and scheduling actually works — by month. A date range picker adds configuration complexity without real value at this stage. Infinite scroll makes it impossible to reason about "how many treatments this month". | Month-by-month navigation with a clear current month indicator. Simple, predictable. |
| Retroactively re-classify all existing patients via bulk action | Seems necessary to clean up legacy data | Most existing patients have `flujo = null` (not PENDIENTE). A bulk classification screen requires UI, confirmation flows, and audit logging. It is a separate feature with real UX requirements. | Existing patients without `flujo` should display as "Sin clasificar" with an amber badge. They are classified naturally as they book new appointments or are seen by the professional. No bulk action needed for v1.4. |

---

## Feature Dependencies

```
[5 New TipoTurno seed records with flujoAsignado]
    └──required by──> [flujo auto-set on Turno creation]
    └──required by──> [Treatment list filter uses TRATAMIENTO types]

[flujo enum on Paciente + migration]
    └──required by──> [CRM kanban filter to CIRUGIA]
    └──required by──> [LiveTurno PENDIENTE banner]
    └──required by──> [flujo badge in patient list]
    └──required by──> [automatic CRM stage advance on flujo→CIRUGIA]

[flujo auto-set on Turno creation (backend)]
    └──requires──> [flujo field on Paciente]
    └──requires──> [flujoAsignado on TipoTurno]
    └──enhances──> [Existing NewAppointmentModal — no frontend change needed]

[LiveTurno PENDIENTE classification banner]
    └──requires──> [flujo field on Paciente]
    └──requires──> [session object exposes pacienteFlujo]
    └──requires──> [PATCH /pacientes/:id/flujo endpoint]
    └──enhances──> [LiveTurnoPanel — inserted between Header and Tabs]

[CRM kanban + metrics filter to CIRUGIA]
    └──requires──> [flujo field on Paciente]
    └──independent──> [LiveTurno banner — no coupling]

["Tratamientos" tab in /dashboard/pacientes]
    └──requires──> [flujoAsignado on TipoTurno]
    └──requires──> [new GET endpoint: turnos by month + flujo=TRATAMIENTO]
    └──independent──> [flujo field on Paciente — tab queries turnos, not Paciente.flujo directly]

[Auto CRM stage advance on flujo→CIRUGIA]
    └──requires──> [PATCH /pacientes/:id/flujo]
    └──requires──> [flujo field on Paciente]
    └──enhances──> [Existing CRM stage machine — same logic as auto-CONSULTADO on LiveTurno close]
```

### Dependency Notes

- **Schema migration is the hard gate.** `flujo` enum on `Paciente` and `flujoAsignado` nullable enum on `TipoTurno` must be in the same migration. Everything else is additive. The 5 new TipoTurno records can be in the seed after the migration.
- **Treatment list queries turnos, not Paciente.flujo.** This is intentional. A treatment patient is defined by booking a TRATAMIENTO-type appointment, not by having `flujo = TRATAMIENTO`. This avoids a stale-classification problem: if a patient changes flow, their past treatment turnos remain in the treatment list.
- **LiveTurno banner needs `pacienteFlujo` in the session object.** The `useLiveTurnoStore` session already holds patient details (nombre, telefono, obraSocial). Adding `flujo` to the session DTO is a minor backend change but must be done before the banner can render conditionally.
- **CRM filter is transparent to the user.** The Kanban and metrics endpoints add a backend `WHERE flujo = 'CIRUGIA'` filter. No UI change is required in `KanbanBoard` or `CRMMetricsBar` — they receive the already-filtered data. A subtext label "Solo pacientes de cirugía" is the only frontend change.
- **`flujoAsignado: null` on "Control" and "Consulta pendiente" is intentional.** These types should NOT auto-classify because "Control" applies to both surgery follow-ups and treatment checkups. Let the existing classification persist.

---

## MVP Definition

### Launch With (v1.4)

Minimum scope to make the segmentation useful in production.

- [ ] Schema migration: `FlujoPaciente` enum (`CIRUGIA | TRATAMIENTO | PENDIENTE`), `flujo FlujoPaciente?` on `Paciente` (nullable, default null = legacy "sin clasificar"), `flujoAsignado FlujoPaciente?` on `TipoTurno`
- [ ] Seed 5 new TipoTurno records with correct `flujoAsignado` values
- [ ] Backend: auto-set `Paciente.flujo` in turno creation transaction when `TipoTurno.flujoAsignado` is non-null and patient `flujo` is null or PENDIENTE
- [ ] Backend: PATCH `/pacientes/:id/flujo` endpoint (PROFESIONAL + SECRETARIA + ADMIN roles) with optional CRM stage auto-advance
- [ ] Backend: CRM kanban + metrics queries filter to `flujo = CIRUGIA` (or null-but-has-CRM-stage for legacy patients)
- [ ] Backend: new GET endpoint for tratamientos list — turnos by professional + month + `tipoTurno.flujoAsignado = TRATAMIENTO`
- [ ] Frontend: `flujo` badge column in `PacientesDataTable` (azul / verde / ámbar)
- [ ] Frontend: LiveTurno PENDIENTE classification banner in `LiveTurnoPanel` (non-blocking, dismissible, two action buttons)
- [ ] Frontend: "Solo pacientes de cirugía" subtext on CRM embudo view
- [ ] Frontend: "Tratamientos" tab in `/dashboard/pacientes` — monthly list, month nav, type filter

### Add After Validation (v1.4.x)

- [ ] Accumulated monthly revenue per patient in the treatment list (requires joining cobros/facturas — add once basic list is stable)
- [ ] Treatment list export to CSV — add once professional has expressed need (likely when accountant asks for monthly summary)
- [ ] Bulk reclassification screen for existing PENDIENTE patients — add if manual accumulation of PENDIENTE badges becomes operationally painful

### Future Consideration (v2+)

- [ ] Treatment scheduling patterns (recurring frequency, reminders) — separate product feature
- [ ] Treatment plan (series of sessions) — requires new data model
- [ ] Surgery vs treatment split in financial reports — depends on v2 executive reports milestone

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Schema migration + TipoTurno seed | HIGH | LOW | P1 |
| Auto-set `Paciente.flujo` on turno creation | HIGH | LOW | P1 |
| PATCH `/pacientes/:id/flujo` endpoint | HIGH | LOW | P1 |
| CRM kanban + metrics filter to CIRUGIA | HIGH | LOW | P1 |
| LiveTurno PENDIENTE classification banner | HIGH | MEDIUM | P1 |
| "Tratamientos" tab — monthly list | HIGH | MEDIUM | P1 |
| flujo badge in patient list | MEDIUM | LOW | P1 |
| "Solo pacientes de cirugía" subtext in embudo | LOW | LOW | P1 |
| Auto CRM stage advance on flujo→CIRUGIA | MEDIUM | LOW | P1 |
| Monthly KPI counter in Tratamientos header | MEDIUM | LOW | P1 |
| Treatment type filter (dropdown) | MEDIUM | LOW | P1 |
| Accumulated revenue in treatment list | MEDIUM | MEDIUM | P2 |
| Treatment list CSV export | LOW | LOW | P2 |
| Bulk reclassification screen | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.4 launch — needed for classification to work at all
- P2: Add once P1 is validated in production
- P3: Separate milestone

---

## Treatment List: Required Columns

This is the primary deliverable for the downstream roadmap consumer.

### Minimum Viable Columns (v1.4 launch)

| Column | Data Source | Display | Notes |
|--------|-------------|---------|-------|
| Fecha | `Turno.inicio` | "Mar 15 · 10:30" | Date + time, sorted ascending within month |
| Paciente | `Paciente.nombre + apellido` | Clickable → opens `PatientDrawer` | Existing drawer pattern |
| Tipo de turno | `TipoTurno.nombre` | Badge with color from `TipoTurnoProfesional.colorHex` | Uses existing per-professional color config |
| Estado | `Turno.estado` | Status badge (AGENDADO / EN_CURSO / FINALIZADO / CANCELADO) | Existing state enum |

### Secondary Columns (add if space permits, or in v1.4.x)

| Column | Data Source | Notes |
|--------|-------------|-------|
| Monto cobrado | `Cobro.monto` (if exists) | JOIN to cobros — adds query complexity |
| Obra Social | `Paciente.obraSocial.nombre` | Useful for billing context |

### Columns to Explicitly NOT Include in v1.4

| Column | Reason to Exclude |
|--------|------------------|
| Historia clínica notes | Sensitive, belongs in patient drawer, not in list view |
| Patient contact info (phone, email) | Privacy — visible on drawer, not in paginated list |
| Presupuesto data | Treatment patients rarely have presupuestos; this is CRM funnel logic |

---

## Classification Banner UX Pattern: Justified Decision

**Chosen pattern: Non-blocking inline banner at the top of LiveTurnoPanel content area, dismissible.**

### Why Not a Modal

A blocking modal in LiveTurno would interrupt the professional mid-consultation. LiveTurno is a full-screen, time-sensitive workflow (it shows a running timer). Forced interruptions in clinical software create friction that leads to professionals skipping the entire flow. Clinical SaaS conventions (EMR systems like eClinicalWorks, Kareo, Elation) consistently use inline alerts rather than blocking modals for "complete this later" classification tasks.

### Why Not a Toast

Toasts are transient (disappear after 3-5 seconds). The classification decision requires deliberate action (CIRUGIA vs TRATAMIENTO). A transient notification will be missed or dismissed accidentally, defeating the purpose.

### Recommended Implementation

```
[ LiveTurnoHeader ]  ← existing, unchanged

[ CLASSIFICATION BANNER — only if session.pacienteFlujo === 'PENDIENTE' ]
┌──────────────────────────────────────────────────────────────────────┐
│  ⚠  Este paciente no tiene flujo asignado todavía.                   │
│  ¿Es paciente de cirugía o de tratamiento?                           │
│  [ Cirugía ]  [ Tratamiento ]                            [ × ]      │
└──────────────────────────────────────────────────────────────────────┘

[ LiveTurnoTabs ]   ← existing, unchanged
[ Tab Content ]     ← existing, unchanged
[ LiveTurnoFooter ] ← existing, unchanged
```

- Background: amber-50, border amber-200, icon amber warning (consistent with shadcn/ui alert pattern)
- Two action buttons: primary style for "Cirugía", secondary for "Tratamiento"
- Dismiss (×) button: hides for this session only — does NOT permanently classify. Patient remains PENDIENTE.
- On button click: calls PATCH `/pacientes/:id/flujo`, updates store, banner disappears.
- If patient is already CIRUGIA or TRATAMIENTO: banner never renders.

### Why Amber, Not Red

Red suggests an error. Classification is a data enrichment task, not an error state. Amber ("attention, but not broken") is the correct severity level for clinical SaaS. Red is reserved for session errors (sync failure, timeout) which already exist in `LiveTurnoSyncChecker`.

---

## Legacy Patient Handling

Patients created before v1.4 have `flujo = null`. These are NOT the same as `flujo = PENDIENTE`.

- `null` = legacy / unclassified. Show as "Sin clasificar" with a gray badge (not amber). Do not include in the PENDIENTE classification count.
- `PENDIENTE` = explicitly set by booking a "Consulta pendiente" appointment type. Show amber badge. These are the patients the LiveTurno banner targets.

This distinction prevents the banner from firing for every existing patient on upgrade, which would be overwhelming. Only patients who explicitly booked a PENDIENTE appointment type will see the classification prompt in LiveTurno.

---

## CRM Funnel Filter: Edge Cases

| Patient State | In Funnel? | Rationale |
|---------------|------------|-----------|
| `flujo = CIRUGIA` | YES | Core funnel target |
| `flujo = TRATAMIENTO` | NO | Has separate Tratamientos tab |
| `flujo = PENDIENTE` | NO | Not yet classified as surgery candidate — including them distorts conversion metrics |
| `flujo = null` (legacy) | YES, if has a CRM stage | Legacy patients already in the funnel should not vanish. Filter: `flujo = CIRUGIA OR (flujo IS NULL AND etapaCRM IS NOT NULL)` |
| `flujo = null`, no CRM stage | NO | No history in the system — not in funnel |

This nuanced filter is critical. A naive `WHERE flujo = 'CIRUGIA'` would silently drop all pre-v1.4 patients from the CRM funnel, which is a data loss regression for existing users.

---

## Sources

- `.planning/PROJECT.md` — v1.4 milestone scope, existing features, constraints — HIGH confidence
- `backend/src/prisma/schema.prisma` — current `TipoTurno`, `Paciente`, `Turno`, `Tratamiento` models — HIGH confidence
- `frontend/src/components/live-turno/LiveTurnoPanel.tsx` — existing panel structure — HIGH confidence
- `frontend/src/components/live-turno/LiveTurnoHeader.tsx` — session object shape, existing badge patterns — HIGH confidence
- `frontend/src/app/dashboard/pacientes/page.tsx` — existing tabs, toggle pattern, component structure — HIGH confidence
- `frontend/src/app/dashboard/pacientes/components/PacientesDataTable.tsx` — existing column pattern — HIGH confidence
- Clinical SaaS UX conventions (eClinicalWorks, Kareo, Elation EMR) — inline alert vs modal for classification tasks — MEDIUM confidence (industry pattern, not directly verified)

---

*Feature research for: v1.4 Flujo de Pacientes — patient flow classification (CIRUGIA / TRATAMIENTO / PENDIENTE)*
*Researched: 2026-04-15*
*Supersedes: previous FEATURES.md scoped to v1.2 AFIP/CAE*
