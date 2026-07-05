---
phase: 60-estad-sticas-sobre-registros-reales
plan: "01"
subsystem: backend/reportes/crm-dashboard
tags: [crm, kpis, statistics, multi-tenant, tdd]
dependency_graph:
  requires: []
  provides: [cirugiasRealizadas-kpi, tratamientosRealizados-kpi]
  affects: [crm-dashboard.service.ts, crm-dashboard.service.spec.ts]
tech_stack:
  added: []
  patterns: [TDD RED/GREEN, Promise.all extension, Prisma nested filter]
key_files:
  created:
    - backend/src/modules/reportes/services/crm-dashboard.service.spec.ts
  modified:
    - backend/src/modules/reportes/services/crm-dashboard.service.ts
decisions:
  - "Use enum literals (EstadoCirugia.CANCELADA/SUSPENDIDA) instead of string literals for type safety, matching the scheduler's functional intent"
  - "Cumulative counts (no periodo window) same pattern as totalActivos — getKpis returns both period-scoped and cumulative metrics"
  - "historiaClinicaEntrada scoped via nested historiaClinica.profesionalId relation since HistoriaClinicaEntrada has no direct profesionalId"
metrics:
  duration_minutes: 1
  completed_date: "2026-07-05"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
requirements_satisfied: [STATS-01, STATS-02]
---

# Phase 60 Plan 01: Estadísticas sobre Registros Reales Summary

**One-liner:** Extended `getKpis` with `cirugiasRealizadas` (Cirugia count, fecha<now, notIn CANCELADA/SUSPENDIDA) and `tratamientosRealizados` (HistoriaClinicaEntrada TRATAMIENTO/FINALIZED), both scoped by `profesionalId` and independent of `etapaCRM`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 RED | TDD failing test for getKpis output fields | 9dfbf38 | crm-dashboard.service.spec.ts |
| 1 GREEN | Implement cirugiasRealizadas + tratamientosRealizados in getKpis | 2aa303f | crm-dashboard.service.ts |
| 2 | Full spec: invariant + multi-tenant tests (A, B, C, D) | 0591720 | crm-dashboard.service.spec.ts |

## What Was Built

### `getKpis` extension (crm-dashboard.service.ts)

Two new cumulative counts added to the `Promise.all`:

- `cirugiasRealizadas`: `prisma.cirugia.count` with `where: { profesionalId, fecha: { lt: ahora }, estado: { notIn: [CANCELADA, SUSPENDIDA] } }` — exact replication of the scheduler's definition of "cirugía realizada"
- `tratamientosRealizados`: `prisma.historiaClinicaEntrada.count` with `where: { tipoEntrada: TRATAMIENTO, status: FINALIZED, historiaClinica: { profesionalId } }` — multi-tenant scoping via nested relation

Imported `EstadoCirugia`, `TipoEntradaHC`, `EstadoEntradaHC` from `@prisma/client`.

### Spec (crm-dashboard.service.spec.ts) — 8 tests, all green

- **Test A** (x2): `cirugia.count` and `historiaClinicaEntrada.count` are never called with `etapaCRM` in the where clause — changing a patient's `etapaCRM` to PERDIDO cannot alter either count
- **Test B**: `cirugia.count` where clause includes `fecha: { lt: Date }` and `estado: { notIn: [...CANCELADA, SUSPENDIDA] }`
- **Test C** (x3): both queries carry `profesionalId` scope — `cirugia.where.profesionalId` and `historiaClinicaEntrada.where.historiaClinica.profesionalId`; verified for prof-X and prof-Y
- **Test D**: `cirugia.count → 7` maps to `cirugiasRealizadas === 7`, `historiaClinicaEntrada.count → 4` maps to `tratamientosRealizados === 4`

## Verification

- `npm run test -- crm-dashboard.service.spec` exit 0 (8/8 tests pass)
- `npx tsc --noEmit` reports no errors in crm-dashboard.service.ts (`TYPECHECK_OK_NO_ERRORS_IN_FILE`)
- Manual: neither new query contains the word `etapaCRM`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — both queries are wired to live Prisma models with real filters.

## Threat Flags

No new threat surface introduced. Both T-60-01 and T-60-02 are mitigated by the scoping filters (verified by Test C). T-60-03 is mitigated by the etapaCRM absence assertion in Test A.

## TDD Gate Compliance

| Gate | Commit | Message |
|------|--------|---------|
| RED (test) | 9dfbf38 | test(60-01): add failing test for cirugiasRealizadas/tratamientosRealizados output |
| GREEN (feat) | 2aa303f | feat(60-01): extend getKpis with cirugiasRealizadas and tratamientosRealizados from real records |

## Self-Check: PASSED
