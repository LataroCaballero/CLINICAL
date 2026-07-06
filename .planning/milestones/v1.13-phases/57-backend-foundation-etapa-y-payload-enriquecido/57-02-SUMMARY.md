---
phase: 57-backend-foundation-etapa-y-payload-enriquecido
plan: "02"
subsystem: backend/crm-transitions
tags: [scheduler, crm, etapa, turno, embudo]
dependency_graph:
  requires: []
  provides:
    - CirugiaRealizadaSchedulerService — daily @Cron auto-move to PROCEDIMIENTO_REALIZADO
    - crearTurno unconditional TURNO_AGENDADO reactivation (bypasses forward-only guard)
  affects:
    - backend/src/modules/pacientes/pacientes.module.ts
    - backend/src/modules/turnos/turnos.service.ts
tech_stack:
  added: []
  patterns:
    - "@Cron daily sweep with per-item try/catch resilience (seguimiento-scheduler pattern)"
    - "forward-only gate via ETAPA_ORDEN map (PERDIDO excluded explicitly)"
    - "unconditional CRM reactivation on turno creation (D-09)"
key_files:
  created:
    - backend/src/modules/pacientes/cirugia-realizada-scheduler.service.ts
    - backend/src/modules/pacientes/cirugia-realizada-scheduler.service.spec.ts
  modified:
    - backend/src/modules/pacientes/pacientes.module.ts
    - backend/src/modules/turnos/turnos.service.ts
decisions:
  - "Used EVERY_DAY_AT_6AM for cirugia scheduler (seguimiento uses 9AM — different time to spread DB load)"
  - "ETAPA_ORDEN/etapaOrden/isAutoTransitionBlocked removed from turnos.service.ts as dead code post-bypass"
  - "Guard in presupuestos.service.ts left fully intact (D-10)"
  - "PERDIDO excluded via explicit continue check before etapaOrden gate (PERDIDO has no order in ETAPA_ORDEN)"
metrics:
  duration: "~20 minutes"
  completed: "2026-07-04T22:04:00Z"
  tasks_completed: 3
  files_changed: 4
---

# Phase 57 Plan 02: CRM Transitions — Scheduler + Guard Bypass Summary

**One-liner:** Daily @Cron job auto-moves patients to PROCEDIMIENTO_REALIZADO on past surgery date (forward-only), plus unconditional TURNO_AGENDADO reactivation on new turno creation from any CRM stage.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CirugiaRealizadaSchedulerService + spec (TDD) | ed216fc | cirugia-realizada-scheduler.service.ts, .spec.ts |
| 2 | Register scheduler in PacientesModule | bce5886 | pacientes.module.ts |
| 3 | Bypass guard in crearTurno (TURNO_AGENDADO reactivation) | 11141a1 | turnos.service.ts |

## What Was Built

### Task 1: CirugiaRealizadaSchedulerService
New injectable service following the `seguimiento-scheduler.service.ts` pattern exactly:
- `@Cron(CronExpression.EVERY_DAY_AT_6AM)` daily sweep
- Queries `Cirugia` records with `fecha < now` and `estado notIn [CANCELADA, SUSPENDIDA]`
- Per-item forward-only gate: skips `PERDIDO` explicitly and any patient with `etapaOrden >= 6`
- Moves qualifying patients to `PROCEDIMIENTO_REALIZADO` via `prisma.paciente.update`
- Per-item `try/catch` + `logger.error` — one failed row never aborts the sweep

Spec covers all 6 behavior cases: forward move, gate >= 6, PERDIDO exclusion, future date filter verification, CANCELADA/SUSPENDIDA filter verification, and resilience on update failure.

### Task 2: PacientesModule registration
Added `CirugiaRealizadaSchedulerService` import and provider entry. `ScheduleModule.forRoot()` was already present — no duplicate imports.

### Task 3: crearTurno guard bypass
Removed `ETAPA_ORDEN`, `etapaOrden`, and `isAutoTransitionBlocked` definitions from `turnos.service.ts` (now dead code). Replaced the guarded `if (!isAutoTransitionBlocked(...))` block with an unconditional `prisma.paciente.update` to `TURNO_AGENDADO`. The `pacienteCRM` read is preserved because `flujo` and `profesionalId` fields are used downstream. The guard in `presupuestos.service.ts` was not touched (D-10).

## Verification Results

- `npx jest cirugia-realizada-scheduler.service.spec` — 6/6 tests pass
- `npx tsc -p tsconfig.build.json --noEmit` — no errors
- `npx eslint src/modules/turnos/turnos.service.ts` — no errors/warnings
- `grep isAutoTransitionBlocked turnos.service.ts` — no results (guard removed)
- `grep -c isAutoTransitionBlocked presupuestos.service.ts` — 4 (guard intact, D-10)
- `grep CirugiaRealizadaSchedulerService pacientes.module.ts` — shows import + provider

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extra blank line after removing ETAPA_ORDEN block**
- **Found during:** Task 3 lint run
- **Issue:** Removing the 24-line ETAPA_ORDEN/etapaOrden/isAutoTransitionBlocked block left two consecutive blank lines, triggering a prettier/prettier ESLint error
- **Fix:** Reduced to single blank line between imports and `@Injectable()` class
- **Files modified:** backend/src/modules/turnos/turnos.service.ts
- **Commit:** 11141a1 (included in task commit)

## Known Stubs

None. All implementations are fully wired: scheduler queries real DB via PrismaService, module registration activates @Cron, and the unconditional update writes to the patients table.

## Threat Flags

None. All surfaces identified in plan's threat model were addressed:
- T-57-03-E: Scheduler only writes `Paciente.etapaCRM` for the `pacienteId` owned by each `Cirugia` (FK guarantees no cross-tenant writes)
- T-57-04-T: Forward-only gate implemented (PERDIDO explicit skip + etapaOrden >= 6 skip + estado filter)
- T-57-05-E: crearTurno reactivation scoped to `dto.pacienteId` only; no cross-tenant movement; entity validation checks preserved

## Self-Check: PASSED

Files exist:
- FOUND: backend/src/modules/pacientes/cirugia-realizada-scheduler.service.ts
- FOUND: backend/src/modules/pacientes/cirugia-realizada-scheduler.service.spec.ts
- FOUND: backend/src/modules/pacientes/pacientes.module.ts (modified)
- FOUND: backend/src/modules/turnos/turnos.service.ts (modified)

Commits exist:
- FOUND: ed216fc (Task 1 — scheduler + spec)
- FOUND: bce5886 (Task 2 — module registration)
- FOUND: 11141a1 (Task 3 — guard bypass)
