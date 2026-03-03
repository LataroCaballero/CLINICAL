---
phase: 05-dashboard-de-conversion
plan: "01"
subsystem: backend-crm-dashboard
tags: [crm, dashboard, reportes, prisma, nestjs]
dependency-graph:
  requires: []
  provides: [crm-dashboard-api]
  affects: [reportes-module, prisma-schema]
tech-stack:
  added: []
  patterns: [groupBy-aggregation, Promise.all-parallel-queries, manual-prisma-migration]
key-files:
  created:
    - backend/src/modules/reportes/services/crm-dashboard.service.ts
    - backend/src/prisma/migrations/20260302000000_contactolog_registrado_por/migration.sql
  modified:
    - backend/src/prisma/schema.prisma
    - backend/src/modules/reportes/reportes.controller.ts
    - backend/src/modules/reportes/reportes.module.ts
decisions:
  - "registradoPorId uses onDelete: SetNull (not Cascade) — retrocompatible, old ContactoLogs show as Sin asignar in coordinator table"
  - "Manual migration SQL chosen over prisma migrate dev — avoids interactive prompt in CI/automation environments"
  - "ETAPAS_FUNNEL constant defined at module level — single source of truth for funnel ordering separate from EtapaCRM enum"
  - "calcularRango private method centralizes period logic — reused by 3 of 5 public methods"
metrics:
  duration: ~15min
  completed: 2026-03-02
  tasks-completed: 3
  files-changed: 5
---

# Phase 05 Plan 01: CRM Dashboard Backend API Summary

**One-liner:** 5 Prisma-backed CRM metric endpoints (funnel snapshot, KPIs, loss reasons, pipeline income, coordinator performance) added to existing ReportesController via new CrmDashboardService.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | Agregar registradoPorId a ContactoLog + migración Prisma | 5cc63ca | schema.prisma, migration.sql |
| 1 | Crear CrmDashboardService con 5 métodos de métricas | 616aaec | crm-dashboard.service.ts |
| 2 | Agregar endpoints al controlador y registrar en módulo | a743388 | reportes.controller.ts, reportes.module.ts |

## What Was Built

**Schema change:** `ContactoLog` model received optional `registradoPorId String?` field with FK to `Usuario` via named relation `ContactoLogRegistradoPor`. The inverse `contactosRegistrados ContactoLog[]` was added to `Usuario`. Manual migration SQL created for `prisma migrate deploy` in production.

**CrmDashboardService** (`backend/src/modules/reportes/services/crm-dashboard.service.ts`) with:
- `calcularRango(periodo)` — private helper computing week/quarter/month date boundaries
- `getFunnelSnapshot(profesionalId)` — groups patients by `etapaCRM`, computes step conversion rates (null when denominator=0), loss motives breakdown
- `getKpis(profesionalId, periodo)` — parallel queries for nuevos/confirmados/totalActivos, derives `tasaConversion`
- `getMotivosPerdida(profesionalId, periodo)` — groups lost patients by `motivoPerdida`, adds percentages
- `getPipelineIncome(profesionalId, periodo)` — sums totals from ENVIADO budgets with CALIENTE patients
- `getCoordinatorPerformance(profesionalId, periodo)` — groups ContactoLogs by `registradoPorId`, computes interaction counts and stage-advance conversion per coordinator

**5 new endpoints** in `ReportesController` under `GET /reportes/crm/*`:
- `crm/funnel?profesionalId=`
- `crm/kpis?profesionalId=&periodo=mes`
- `crm/motivos-perdida?profesionalId=&periodo=mes`
- `crm/pipeline-income?profesionalId=&periodo=mes`
- `crm/coordinator-performance?profesionalId=&periodo=semana`

Existing `GET /reportes/crm` endpoint remains intact.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

1. `schema.prisma` has `registradoPorId String?` in ContactoLog with relation to Usuario: PASS
2. Migration SQL file exists at `migrations/20260302000000_contactolog_registrado_por/`: PASS
3. `crm-dashboard.service.ts` has all 5 public methods: PASS
4. `npx tsc --noEmit` — only pre-existing e2e-spec.ts rootDir error (documented in MEMORY.md): PASS
5. Existing GET /reportes/crm endpoint preserved: PASS
6. 5 endpoints registered in controller under crm/* routes: PASS
7. CrmDashboardService in ReportesModule providers and exports: PASS

## Self-Check

Files created:
- `backend/src/modules/reportes/services/crm-dashboard.service.ts` — FOUND
- `backend/src/prisma/migrations/20260302000000_contactolog_registrado_por/migration.sql` — FOUND

Commits:
- 5cc63ca — Task 0 (schema + migration) — FOUND
- 616aaec — Task 1 (CrmDashboardService) — FOUND
- a743388 — Task 2 (controller + module) — FOUND

## Self-Check: PASSED
