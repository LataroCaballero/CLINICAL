---
phase: 57-backend-foundation-etapa-y-payload-enriquecido
reviewed: 2026-07-04T22:12:03Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - backend/src/modules/pacientes/crm-steps.helper.ts
  - backend/src/modules/pacientes/crm-steps.helper.spec.ts
  - backend/src/modules/pacientes/pacientes.service.ts
  - backend/src/modules/pacientes/cirugia-realizada-scheduler.service.ts
  - backend/src/modules/pacientes/cirugia-realizada-scheduler.service.spec.ts
  - backend/src/modules/pacientes/pacientes.module.ts
  - backend/src/modules/turnos/turnos.service.ts
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 57: Code Review Report

**Reviewed:** 2026-07-04T22:12:03Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed the backend foundation changes for the CRM "etapa" auto-transition and the
enriched kanban payload: a new pure helper (`computePasosCrm`), a daily scheduler
(`CirugiaRealizadaSchedulerService`), the enriched `getKanban` select, and the
removal of the forward-only guard when a new turno is created.

No security vulnerabilities or injection risks: all DB access is parameterized via
Prisma and no secrets/dangerous sinks were introduced. The pure helper and both
spec files are well-structured. However, several logic/consistency defects were
found that can produce wrong CRM stage data and wrong stepper state.

Key concerns:
- Removal of the forward-only guard in `crearTurno` now regresses mid/late-funnel
  patients (e.g. `CONFIRMADO`) back to `TURNO_AGENDADO` on *any* new turno.
- The kanban "cirugia" step counts `CANCELADA`/`SUSPENDIDA` surgeries as complete,
  contradicting the scheduler which excludes those exact states.
- The unconditional `etapaCRM` update runs after the turno is already committed and
  is not best-effort, so a failure surfaces an error to the caller for an
  already-created turno.
- Scheduler issues redundant duplicate updates for patients with multiple past
  surgeries.

## Warnings

### WR-01: Forward-only guard removal regresses advanced-stage patients on any new turno

**File:** `backend/src/modules/turnos/turnos.service.ts:131-141`
**Issue:** The old `isAutoTransitionBlocked` guard was removed and `crearTurno` now
*unconditionally* sets `etapaCRM = TURNO_AGENDADO` for every turno created, from any
stage. The comment justifies reactivating terminal stages (`PERDIDO`,
`PROCEDIMIENTO_REALIZADO`), but the unconditional update also *downgrades*
legitimately-advanced patients. Concretely: a `CONFIRMADO` patient (budget accepted,
surgery pending) who has the actual surgery turno booked will be knocked back to
`TURNO_AGENDADO`, and a `PRESUPUESTO_ENVIADO` or `CONSULTADO` patient regresses on any
follow-up appointment. This corrupts funnel state/analytics for the common case,
whereas the design goal (reactivation) only requires overriding the two terminal
stages.
**Fix:** Reactivate only from terminal stages; keep forward-only for the rest, e.g.:
```ts
const actual = pacienteCRM?.etapaCRM ?? null;
const esTerminal =
  actual === EtapaCRM.PERDIDO || actual === EtapaCRM.PROCEDIMIENTO_REALIZADO;
if (esTerminal || etapaOrden(actual) < etapaOrden(EtapaCRM.TURNO_AGENDADO)) {
  await this.prisma.paciente.update({
    where: { id: dto.pacienteId },
    data: { etapaCRM: EtapaCRM.TURNO_AGENDADO },
  });
}
```
If the unconditional downgrade is genuinely intended for all stages, confirm against
the spec (D-09/EMBUDO-05) and document the CONFIRMADO-regression consequence explicitly.

### WR-02: "cirugia" stepper step counts CANCELADA/SUSPENDIDA surgeries as complete

**File:** `backend/src/modules/pacientes/pacientes.service.ts:662-665` and `backend/src/modules/pacientes/crm-steps.helper.ts:83-85`
**Issue:** The `cirugias` relation in `getKanban` is selected with **no `where`
filter**, and `computePasosCrm` marks the cirugia step complete whenever
`cirugias.length > 0` regardless of `estado`. A patient whose only surgery is
`CANCELADA` or `SUSPENDIDA` shows cirugia = `completo` (and can flip
`todosCompletos` true), yet `CirugiaRealizadaSchedulerService` explicitly excludes
those exact states (`notIn: ['CANCELADA','SUSPENDIDA']`) when advancing to
`PROCEDIMIENTO_REALIZADO`. The stepper and the funnel logic therefore disagree on
what "has a surgery" means.
**Fix:** Filter out cancelled/suspended surgeries in the select (and/or in the
helper) so the two agree:
```ts
cirugias: {
  select: { fecha: true, estado: true },
  where: { estado: { notIn: ['CANCELADA', 'SUSPENDIDA'] } },
  orderBy: { fecha: 'desc' },
},
```

### WR-03: etapaCRM update after turno creation is not best-effort (partial-failure inconsistency)

**File:** `backend/src/modules/turnos/turnos.service.ts:138-141`
**Issue:** The turno is already created and committed at line 105. The subsequent
`paciente.update` for `etapaCRM` is `await`-ed without a try/catch, so if it throws
(e.g. transient DB error) the whole `crearTurno` rejects and the caller receives an
error even though the turno already persisted — leaving an inconsistent state and a
misleading failure response. This is inconsistent with the immediately-following
flujo auto-update (lines 148-157), which is deliberately best-effort with `.catch`.
**Fix:** Either wrap the CRM stage transition in the same best-effort pattern
(`.catch` + `logger.warn`) so a stage-update failure does not fail an already-created
turno, or perform the turno creation and stage transition inside a single
`prisma.$transaction` so both commit atomically.

### WR-04: Scheduler issues redundant duplicate updates for patients with multiple past surgeries

**File:** `backend/src/modules/pacientes/cirugia-realizada-scheduler.service.ts:37-69`
**Issue:** `findMany` returns one row per `Cirugia`, not per patient. A patient with
two past (non-cancelled) surgeries yields two candidatos with the same `pacienteId`.
The loop reads `c.paciente?.etapaCRM` from the *stale* snapshot fetched at query time,
so the forward-only gate (`>= 6`) never sees the first iteration's update and the
patient's `paciente.update` runs twice. It is idempotent (same target value) but
produces redundant writes and duplicate "movido" log lines.
**Fix:** Deduplicate by patient before iterating, e.g. build a `Map<pacienteId,
etapaCRM>` (or `select: { pacienteId: true }, distinct: ['pacienteId']` plus a
single patient fetch) and update each patient at most once per run.

## Info

### IN-01: Unused `etapaCRM` field in the pacienteCRM select

**File:** `backend/src/modules/turnos/turnos.service.ts:134-137`
**Issue:** After the guard removal, `pacienteCRM` is only used for `flujo` (line 146)
and `profesionalId` (line 161). The selected `etapaCRM` is no longer read, making it
a dead select field.
**Fix:** Drop `etapaCRM: true` from the select (or re-introduce it if WR-01 restores
a conditional guard).

### IN-02: indicacionesPreop only reflects the single latest consent (take: 1)

**File:** `backend/src/modules/pacientes/pacientes.service.ts:673-677` and `backend/src/modules/pacientes/crm-steps.helper.ts:97-99`
**Issue:** `consentimientosFirmados` is fetched with `take: 1, orderBy: { firmadoAt:
'desc' }`, so the helper's `.some(c => c.indicacionesLeidasAt != null)` only ever
inspects the most recently signed consent. If a patient's latest consent has not had
indications marked read but an earlier consent did, `indicacionesPreop` reports
`pendiente`. This is likely the intended "latest consent wins" semantics, but the
`.some(...)` over a forced single-element array is misleading and hides the coupling.
**Fix:** Either document that only the latest consent is considered, or drop `take: 1`
and let the `.some(...)` scan all consents if any-consent-with-indicaciones should
qualify.

---

_Reviewed: 2026-07-04T22:12:03Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
