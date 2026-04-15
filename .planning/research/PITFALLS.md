# Pitfalls Research

**Domain:** Patient flow classification added to existing clinical CRM (v1.4 FlujoPaciente milestone)
**Researched:** 2026-04-15
**Confidence:** HIGH — derived from direct codebase analysis of turnos.service.ts, crm-dashboard.service.ts, schema.prisma, and the existing auto-CRM-transition logic

---

## Critical Pitfalls

### Pitfall 1: Migration sets flujo=CIRUGIA for all existing funnel patients, polluting treatments data

**What goes wrong:**
The migration script marks every patient currently in the CRM funnel (etapaCRM not null) as `flujo=CIRUGIA`, because "they're in the funnel." But some of those patients were booked for aesthetic treatments (botox, laser, etc.) and only landed in the funnel because `crearTurno()` auto-transitioned them to `TURNO_AGENDADO`. Their `esCirugia=false` on the Turno record is the only surviving signal of their real intent.

**Why it happens:**
The current schema has no `flujo` field on Paciente. The only proxy for "this is a surgery patient" is `turno.esCirugia` or `tipoTurno.esCirugia`, which are fields on the booking — not the patient. Developers writing the migration naturally reach for "whoever has an etapaCRM is a surgery lead," which is wrong.

**How to avoid:**
Migration SQL must back-derive intent from existing booking data:
```sql
UPDATE "Paciente" p
SET "flujo" = CASE
  WHEN EXISTS (
    SELECT 1 FROM "Turno" t
    WHERE t."pacienteId" = p.id
      AND t."esCirugia" = true
  ) THEN 'CIRUGIA'
  WHEN p."etapaCRM" IS NOT NULL THEN 'CIRUGIA'
  ELSE 'PENDIENTE'
END;
```
The heuristic: if any past turno has `esCirugia=true`, classify CIRUGIA. If they have an etapaCRM but no cirugia turno, still default to CIRUGIA (they entered the funnel, they are a surgery lead). Patients with no etapaCRM and no cirugia turno default to PENDIENTE. Document this assumption explicitly in the migration comment.

**Warning signs:**
After migration, if the treatments tab (`flujo=TRATAMIENTO`) shows 0 patients but the clinic knows they have regulars — the migration missed them. Cross-check: `SELECT COUNT(*) FROM "Paciente" WHERE "flujo"='TRATAMIENTO'` should be > 0 if any past turno had `tipoTurno.esCirugia = false` for patients never touched by a cirugia booking.

**Phase to address:**
Phase that introduces the `flujo` Prisma migration — must include and review the backfill SQL before running `prisma migrate deploy`.

---

### Pitfall 2: CRM auto-transitions fire on TRATAMIENTO and PENDIENTE patients, poisoning funnel metrics

**What goes wrong:**
`crearTurno()` in `turnos.service.ts` always advances any patient with `etapaCRM = null | NUEVO_LEAD` to `TURNO_AGENDADO`. After v1.4, a patient classified as `flujo=TRATAMIENTO` who books a follow-up gets pushed into the CRM funnel — appearing in the surgery conversion funnel even though they are a treatment patient.

Similarly, `cerrarSesion()` advances `etapaCRM` to `CONSULTADO` whenever `turno.esCirugia=false` and `etapaCRM=TURNO_AGENDADO`. A TRATAMIENTO patient completing their appointment inflates the CONSULTADO stage count.

**Why it happens:**
The auto-CRM-transition logic predates the `flujo` field. It branches only on `esCirugia` (the turno-level flag), not on the patient-level `flujo`. These are different concepts: `turno.esCirugia` is "this specific appointment is a surgery"; `paciente.flujo` is "this patient's care pathway."

**How to avoid:**
Gate ALL CRM auto-transitions on `paciente.flujo === 'CIRUGIA'`. In `crearTurno()`:

```typescript
if (etapasIniciales.includes(pacienteCRM?.etapaCRM ?? null) && paciente.flujo === 'CIRUGIA') {
  await this.prisma.paciente.update({ ... etapaCRM: EtapaCRM.TURNO_AGENDADO });
}
```

In `cerrarSesion()`, the `PROCEDIMIENTO_REALIZADO` transition for `esCirugia=true` is fine (surgery-specific turno). The `CONSULTADO` fallback must also require `flujo === 'CIRUGIA'`.

**Warning signs:**
CRM funnel shows `CONSULTADO` counts climbing unexpectedly, or TRATAMIENTO patients appearing in the kanban board. Query: `SELECT COUNT(*) FROM "Paciente" WHERE "flujo" != 'CIRUGIA' AND "etapaCRM" IS NOT NULL` — any new entries after v1.4 deployment indicate the guard is missing.

**Phase to address:**
Phase implementing the `flujo` field AND the `crearTurno`/`cerrarSesion` guard together — these cannot be split into separate deploys or there is a window where treatment patients contaminate the funnel.

---

### Pitfall 3: getFunnelSnapshot() and all CRM reporting queries remain unfiltered after flujo field added

**What goes wrong:**
`crm-dashboard.service.ts` `getFunnelSnapshot()` queries `prisma.paciente.groupBy({ where: { profesionalId } })` with no `flujo` filter. After v1.4, the dashboard funnel widget continues counting TRATAMIENTO patients in every stage.

The same applies to `getKpis()`, `getListaAccion()`, `getIngresosPotenciales()`, and `getCoordinatorPerformance()` — all use `profesionalId` as the sole filter with no flujo gate. The lista de accion would show treatment patients as leads to follow up, the pipeline income widget would count treatment presupuestos as surgery revenue.

**Why it happens:**
The funnel was built when all patients were implicitly surgery leads. The `flujo` field does not exist yet, so no filter was possible at time of writing.

**How to avoid:**
Every CRM reporting query must add `flujo: 'CIRUGIA'` to its `where` clause as part of the same phase that ships the `flujo` migration. Create a shared constant:

```typescript
const CIRUGIA_FILTER = { flujo: FlujoPaciente.CIRUGIA };
```

Apply it in: `getFunnelSnapshot`, `getKpis`, `getListaAccion`, `getCRMKanban`, `getIngresosPotenciales`, `getCoordinatorPerformance`.

**Warning signs:**
After deploying the `flujo` field but before updating reporting queries: funnel numbers do not change at all even though some patients were classified as TRATAMIENTO. Developers incorrectly conclude the migration worked correctly — the funnel just happens to show the same numbers.

**Phase to address:**
Same phase as the `flujo` migration — reporting queries and migration must ship atomically.

---

### Pitfall 4: CIRUGIA patient books a "Control" turno — flujo regresses to PENDIENTE or TRATAMIENTO

**What goes wrong:**
The auto-update logic sets `paciente.flujo` based on the new TipoTurno's classification signal. If a patient already classified as `flujo=CIRUGIA` books a post-op "Control" appointment (a neutral tipoTurno), the auto-update logic may overwrite their flujo — demoting them from CIRUGIA. They disappear from the kanban unexpectedly.

**Why it happens:**
The most natural implementation is: "when a turno is created, derive flujo from tipoTurno." That is a stateless lookup, not a state machine with a monotonic rule.

**How to avoid:**
Flujo updates must follow a precedence hierarchy — never downgrade. The valid auto-update transitions are:

- `PENDIENTE → CIRUGIA` (books "Consulta para cirugía" tipoTurno)
- `PENDIENTE → TRATAMIENTO` (books "Consulta para tratamiento" tipoTurno)
- `TRATAMIENTO → CIRUGIA` (patient changed their mind)
- `CIRUGIA → CIRUGIA` (any subsequent booking including Control, Pre-operatorio)
- NEVER: `CIRUGIA → TRATAMIENTO` or `CIRUGIA → PENDIENTE` via auto-update

Implement the guard in `crearTurno()`:

```typescript
const currentFlujo = paciente.flujo;
const derivedFlujo = deriveFlujFromTipoTurno(tipoTurno);
if (derivedFlujo && shouldUpgradeFlujo(currentFlujo, derivedFlujo)) {
  await prisma.paciente.update({ data: { flujo: derivedFlujo } });
}
// shouldUpgradeFlujo: returns false if currentFlujo is already CIRUGIA
```

**Warning signs:**
A patient who had a surgery consultation gets their flujo reset to TRATAMIENTO or PENDIENTE after booking a follow-up control. In production: a surgeon notices a confirmed surgery patient missing from their kanban after a post-op appointment.

**Phase to address:**
Phase implementing `flujo` auto-update in `crearTurno()` — the precedence rule must be part of the initial implementation, not a follow-up fix.

---

### Pitfall 5: LiveTurno classification banner implemented as dismissible — PENDIENTE patients never get classified

**What goes wrong:**
If the banner for classifying PENDIENTE patients is a closeable toast, alert, or optional callout inside the LiveTurno panel, the coordinator dismisses it once and never sees it again. Patients stay PENDIENTE indefinitely. The treatments tab remains empty and the CRM funnel has noise from unclassified patients.

**Why it happens:**
Developers default to non-blocking UI (banner with X button) to avoid annoying users. But for a classification action that must happen exactly once per patient, the UX must be blocking or at minimum persistently visible without a dismiss option.

**How to avoid:**
The banner must be:
1. Rendered inline in the LiveTurnoPanel as a distinct non-dismissible section (not a toast, not a closeable alert)
2. Only visible when `session.paciente.flujo === 'PENDIENTE'`
3. The two action buttons ("Es para cirugía" / "Es para tratamiento") are the only way to make the banner disappear
4. The classification mutation must call the backend and update the LiveTurno store so the banner disappears immediately on selection

Do not use `useState(dismissed)` or `localStorage` to hide it.

**Warning signs:**
After shipping the banner, query after one week: `SELECT COUNT(*) FROM "Paciente" WHERE "flujo" = 'PENDIENTE' AND "updatedAt" < NOW() - INTERVAL '7 days'` — a high count means patients are being seen in LiveTurno but not classified.

**Phase to address:**
Phase implementing the LiveTurno classification banner — UX spec must be explicit: "non-dismissible, inline, requires user action to resolve."

---

### Pitfall 6: profesionalId null-guard missing for flujo update in SECRETARIA flow

**What goes wrong:**
The `SECRETARIA null-guard pattern` (established in Phase 2.1, documented in Key Decisions) resolves `profesionalId` via DB lookup when the JWT does not carry it. If `crearTurno()` uses the wrong profesionalId to scope the flujo update, the update fires with a null profesionalId — Prisma silently skips the write. The patient's flujo never updates even though the turno was created successfully.

**Why it happens:**
The flujo update will be added as a new block inside `crearTurno()`. If the developer writes it after the CRM transition block without tracing which `profesionalId` reference is used, they may inadvertently use `dto.profesionalId` (null for SECRETARIA) rather than the resolved `effectiveProfesionalId`.

**How to avoid:**
Resolve the effective profesionalId at the top of `crearTurno()` using the same pattern already in the CRM transition block:

```typescript
const effectiveProfesionalId = dto.profesionalId ?? pacienteCRM?.profesionalId;
```

Use `effectiveProfesionalId` for ALL downstream operations: CRM transition, contactoLog creation, and flujo update. Assert it is non-null before the flujo write; throw `BadRequestException` if null.

**Warning signs:**
In development, create a turno as a SECRETARIA user (no profesionalId in JWT) and check whether `paciente.flujo` updates. If the turno is created but flujo remains unchanged, the null-guard is missing from the flujo update path.

**Phase to address:**
Phase implementing `flujo` auto-update in `crearTurno()` — include SECRETARIA role in the integration testing checklist.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Default all existing CRM patients to CIRUGIA in migration | Simple one-liner migration | Treatment patients permanently misclassified; treatments tab always empty for tenant | Never — back-derive from `turno.esCirugia` |
| Add flujo filter to funnel widget only, not KPIs/accion/income | Funnel looks correct quickly | KPI tasa de conversion and lista de accion still include treatment patients; metrics mislead surgeon | Never — update all CRM queries atomically |
| Allow flujo to be overwritten by any turno type (no monotonic rule) | Simpler logic in crearTurno | Surgery patients disappear from funnel after booking a control appointment | Never — enforce upgrade-only rule |
| Use the existing `turno.esCirugia` boolean as flujo proxy (no new field) | No migration needed | PENDIENTE state impossible to represent; confusion between per-appointment flag and patient pathway | Never — they are different concepts |
| Implement classification banner as dismissible toast | Faster to ship | PENDIENTE patients never get classified; feature fails silently in production | Never for the one-time classification action |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `crearTurno()` + CRM auto-transition + flujo update | Three separate Prisma calls in sequence — partial failure leaves inconsistent state | Wrap CRM transition + flujo update in a single `$transaction` |
| `cerrarSesion()` + PROCEDIMIENTO_REALIZADO | Assuming `turno.esCirugia=true` means the patient is `flujo=CIRUGIA` | The existing `turnoInfo` select already fetches `paciente.etapaCRM` — add `flujo` to that select and gate the transition |
| `getFunnelSnapshot()` after adding flujo filter | Testing with the single real tenant where all patients happen to be CIRUGIA — filter appears to work correctly | Seed a TRATAMIENTO patient before testing; the count should visibly drop |
| LiveTurno store after classification | Reading stale `session.paciente.flujo` from the store after the classification mutation | Call `queryClient.invalidateQueries(['turno-sesion-activa'])` after the classification mutation succeeds |
| `tipoTurno.esCirugia` and the 5 new seeds | Seeding all 5 new types with `esCirugia=true` by mistake | Only "Consulta para cirugía" and "Pre-operatorio" should set `esCirugia=true`; "Control", "Consulta para tratamiento", "Consulta pendiente" must have `esCirugia=false` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `groupBy etapaCRM` without flujo index | `getFunnelSnapshot()` slows as patient count grows | Add `@@index([profesionalId, flujo, etapaCRM])` to Paciente in schema.prisma | ~5k+ patients per profesional |
| Treatments tab loads all `flujo=TRATAMIENTO` patients without pagination | Page freezes or takes > 3s | Default to current month, paginate by month window | ~300+ treatment sessions per month |
| LiveTurno banner triggers full paciente refetch to check flujo | 200ms+ delay on every session start | Include `flujo` in the existing `obtenerSesionActiva()` select — paciente is already nested there | Always — fix from day one |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Classification endpoint `PATCH /pacientes/:id/flujo` without role guard | Any authenticated user reclassifies any patient | Restrict to PROFESIONAL, SECRETARIA, ADMIN; validate target patient belongs to profesionalId in scope |
| Returning `flujo` field in unscoped patient search | Multi-tenant leak: tenant A sees tenant B's classification | Ensure `flujo` is only included in queries already scoped by `profesionalId` |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Classification banner uses `flujo` terminology ("Flujo: CIRUGIA") | Coordinator does not know what "flujo" means | Use plain language: "Este paciente vino para cirugía" / "Este paciente vino para tratamiento en consultorio" |
| Treatments tab shows all months with no default | 300-row table with no period context overwhelms coordinator | Default to current month, add month-picker in header, show count badge on tab |
| No feedback when flujo auto-updates silently at booking | Coordinator books "Consulta para cirugía" turno and does not notice the patient moved out of PENDIENTE | Show a small toast: "Paciente clasificado como Cirugía" if flujo changed during turno creation |
| Classification banner visible for already-classified patients | Banner shown unnecessarily, breaks coordinator trust | Render ONLY when `paciente.flujo === 'PENDIENTE'` — guard in the LiveTurno store selector, not only in the component |

---

## "Looks Done But Isn't" Checklist

- [ ] **Funnel filter:** CRMFunnelWidget shows reduced numbers after migration — verify TRATAMIENTO patients are truly excluded, not just that they happened to have no etapaCRM
- [ ] **Lista de Accion:** `getListaAccion()` excludes TRATAMIENTO patients — query `SELECT COUNT(*) FROM "Paciente" WHERE flujo != 'CIRUGIA' AND "etapaCRM" NOT IN ('CONFIRMADO','PERDIDO')` confirms none appear after v1.4 deploy
- [ ] **Pipeline income widget:** `getIngresosPotenciales()` only sums presupuestos from CIRUGIA patients — a treatment patient with a presupuesto ENVIADO does not inflate the number
- [ ] **Migration idempotency:** The backfill SQL is safe to re-run — test by running the migration SQL twice on a copy of the production DB with no errors or changed rows on second run
- [ ] **PENDIENTE classification in LiveTurno:** After classifying, the banner disappears without page reload — requires store update + TanStack Query invalidation
- [ ] **5 new TipoTurno seeds:** Exactly which types have `esCirugia=true` is explicitly documented in the seed/migration comment
- [ ] **SECRETARIA role:** Classification via LiveTurno works when the logged-in user is SECRETARIA — test explicitly with SECRETARIA JWT, confirm `paciente.flujo` updates

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong migration classifies treatment patients as CIRUGIA | MEDIUM | Write a corrective migration re-running the back-derive logic; cosmetic impact only (no financial data affected) |
| CRM transitions fire on TRATAMIENTO patients post-deploy | MEDIUM | Add flujo guard in service and redeploy; then run cleanup script: reset `etapaCRM = null` for TRATAMIENTO patients who entered the funnel after v1.4 deploy date |
| Funnel queries not updated, metrics still show all patients | LOW | Add flujo filter to all CRM queries, redeploy; no data correction needed |
| CIRUGIA patient flujo overwritten to TRATAMIENTO | HIGH | No automatic recovery — requires manual re-classification per affected patient; prevent via monotonic upgrade rule |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Wrong migration classification | Phase adding `flujo` migration — review backfill SQL before `prisma migrate deploy` | Post-migration: `SELECT flujo, COUNT(*) FROM "Paciente" GROUP BY flujo` matches expected distribution |
| CRM transitions fire on TRATAMIENTO | Phase implementing flujo auto-update in `crearTurno`/`cerrarSesion` | Integration test: create TRATAMIENTO patient, book turno, assert etapaCRM stays null |
| Funnel/KPI queries not filtered | Same phase as flujo migration — all reporting queries updated atomically | `getFunnelSnapshot` count drops when TRATAMIENTO patients exist |
| Flujo regression on CIRUGIA patient | Phase implementing flujo auto-update — monotonic rule included from day one | Test: CIRUGIA patient books "Control" turno, assert flujo stays CIRUGIA |
| Dismissible classification banner | Phase implementing LiveTurno banner — UX spec explicit | PENDIENTE patient in LiveTurno without classifying: banner persists through entire session |
| profesionalId null-guard for flujo update | Phase implementing flujo auto-update | SECRETARIA creates turno: paciente.flujo updates correctly |

---

## Sources

- Direct analysis of `backend/src/modules/turnos/turnos.service.ts` (crearTurno, cerrarSesion, CRM auto-transition logic at lines 125–148 and 730–760)
- Direct analysis of `backend/src/modules/reportes/services/crm-dashboard.service.ts` (getFunnelSnapshot, getKpis, getListaAccion)
- Direct analysis of `backend/src/prisma/schema.prisma` (Paciente model, TipoTurno model, Turno.esCirugia boolean)
- Direct analysis of `frontend/src/app/dashboard/components/CRMFunnelWidget.tsx` (funnel rendering, no flujo filter)
- Direct analysis of `frontend/src/app/dashboard/pacientes/page.tsx` (kanban/lista view toggle, vista state in localStorage)
- Direct analysis of `frontend/src/components/live-turno/LiveTurnoPanel.tsx` (tab structure, no current classification banner)
- `.planning/PROJECT.md` Key Decisions: SECRETARIA null-guard pattern, Prisma migrate deploy precedent, montos server-side in transaction

---
*Pitfalls research for: v1.4 FlujoPaciente — patient flow classification added to existing CRM*
*Researched: 2026-04-15*
