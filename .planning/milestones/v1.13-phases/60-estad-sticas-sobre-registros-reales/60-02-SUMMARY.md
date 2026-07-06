---
phase: 60-estad-sticas-sobre-registros-reales
plan: "02"
subsystem: frontend/dashboard/crm-kpis
tags: [crm, kpis, statistics, dashboard, ui]
dependency_graph:
  requires: [cirugiasRealizadas-kpi, tratamientosRealizados-kpi]
  provides: [dashboard-realizados-kpicards]
  affects: [useCRMKpis.ts, CRMKpiCards.tsx, page.tsx]
tech_stack:
  added: []
  patterns: [interface extension, KpiCard composition, Tailwind responsive grid]
key_files:
  created: []
  modified:
    - frontend/src/hooks/useCRMKpis.ts
    - frontend/src/app/dashboard/components/CRMKpiCards.tsx
    - frontend/src/app/dashboard/page.tsx
decisions:
  - "Fields typed as required (number, not optional) since backend 60-01 always returns them in the crm/kpis payload"
  - "Grid reflowed to grid-cols-2 md:grid-cols-3 lg:grid-cols-6 to lay out 6 cards evenly across breakpoints"
  - "subtitle 'registro efectivo' signals record-based origin without placeholder/v1 language"
  - "No new endpoint or dependency — reuses the same useCRMKpis query and KpiCard component"
  - "Executed inline by the orchestrator after the spawned Wave 2 executor hit a session/quota limit mid-read (no partial state)"
metrics:
  duration_minutes: 3
  completed_date: "2026-07-05"
  tasks_completed: 2
  files_created: 0
  files_modified: 3
requirements_satisfied: [STATS-01, STATS-02]
---

# Phase 60 Plan 02: Exponer conteos "realizados" en el dashboard Summary

**One-liner:** Extended `CRMKpisData` with `cirugiasRealizadas`/`tratamientosRealizados`, rendered two new `KpiCard`s ("Cirugías realizadas", "Tratamientos realizados") fed from `crm/kpis`, and reflowed the dashboard KPI grid to fit 6 cards.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend CRMKpisData + render 2 KpiCards | 4234d33 | useCRMKpis.ts, CRMKpiCards.tsx |
| 2 | Reflow dashboard KPI grid for 6 cards | 89c59d9 | page.tsx |

## What Was Built

### `useCRMKpis.ts`
Added `cirugiasRealizadas: number` and `tratamientosRealizados: number` (required, not optional) to the `CRMKpisData` interface. QueryKey and endpoint unchanged — the fields flow through from the 60-01 backend extension of `/reportes/crm/kpis`.

### `CRMKpiCards.tsx`
Two new `<KpiCard>` appended after the existing four:
- **"Cirugías realizadas"** — `value={data ? String(data.cirugiasRealizadas) : "—"}`, subtitle "registro efectivo"
- **"Tratamientos realizados"** — `value={data ? String(data.tratamientosRealizados) : "—"}`, subtitle "registro efectivo"

Both pass `isLoading={loading}` like the existing cards. No new dependency or component (v1.13 restriction respected).

### `page.tsx`
Changed the KPI grid wrapper from `grid-cols-2 md:grid-cols-4` to `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` (kept `gap-4`) so the 6 cards lay out evenly. No other dashboard logic touched.

## Verification

- `npx tsc --noEmit` (frontend) — no errors in useCRMKpis.ts, CRMKpiCards.tsx, or dashboard/page.tsx; full typecheck clean
- The two cards bind directly to `data.cirugiasRealizadas` / `data.tratamientosRealizados` from the record-backed backend counts

## Deviations from Plan

The Wave 2 executor subagent hit a provider session/quota limit during its initial file reads (0 tasks done, no commits, no file changes). The orchestrator executed the plan inline instead — same edits, atomic per-task commits, no partial-state reconciliation needed.

## Known Stubs

None — both cards are wired to the live `crm/kpis` payload.

## Threat Flags

No new threat surface. T-60-04 accepted per plan — multi-tenant isolation is enforced in the backend (60-01); the frontend only displays values already scoped by `profesionalId`.

## Self-Check: PASSED
