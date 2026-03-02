---
phase: 05-dashboard-de-conversion
plan: "02"
subsystem: frontend-crm-data-layer
tags: [crm, dashboard, tanstack-query, hooks, periodo-filter]
dependency-graph:
  requires: [crm-dashboard-api]
  provides: [crm-frontend-data-hooks, periodo-filter-ui]
  affects: [frontend-hooks, frontend-components-crm]
tech-stack:
  added: []
  patterns: [tanstack-query-useQuery, localStorage-lazy-init, SSR-safe-init, named-params-axios]
key-files:
  created:
    - frontend/src/hooks/usePeriodoFilter.ts
    - frontend/src/components/crm/PeriodoSelector.tsx
    - frontend/src/hooks/useCRMFunnel.ts
    - frontend/src/hooks/useCRMKpis.ts
    - frontend/src/hooks/useCRMLossReasons.ts
    - frontend/src/hooks/useCRMPipelineIncome.ts
    - frontend/src/hooks/useCoordinatorPerformance.ts
  modified: []
decisions:
  - "Named import { api } used (not default) — api.ts uses export const api, no default export exists"
  - "axios params object pattern used (not string interpolation) — consistent with useCRMMetrics.ts async/await style"
metrics:
  duration: ~2min
  completed: 2026-03-02
  tasks-completed: 2
  files-changed: 7
---

# Phase 05 Plan 02: CRM Dashboard Frontend Data Layer Summary

**One-liner:** 7-file frontend data layer — `usePeriodoFilter` hook with localStorage persistence, `PeriodoSelector` 3-button UI component, and 5 typed TanStack Query hooks connecting to the 5 CRM dashboard endpoints from Plan 01.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Hook usePeriodoFilter y componente PeriodoSelector | 10988ea | usePeriodoFilter.ts, PeriodoSelector.tsx |
| 2 | Los 5 hooks de datos TanStack Query | 47ee67b | useCRMFunnel.ts, useCRMKpis.ts, useCRMLossReasons.ts, useCRMPipelineIncome.ts, useCoordinatorPerformance.ts |

## What Was Built

**`usePeriodoFilter`** (`frontend/src/hooks/usePeriodoFilter.ts`):
- Generic hook `usePeriodoFilter(storageKey, defaultPeriodo)` returning `[periodo, setPeriodo] as const`
- `Periodo` type exported: `'semana' | 'mes' | 'trimestre'`
- SSR-safe lazy init with `typeof window === 'undefined'` guard prevents hydration crash
- `useEffect` persists selection to `localStorage` on every change

**`PeriodoSelector`** (`frontend/src/components/crm/PeriodoSelector.tsx`):
- `"use client"` directive for Next.js App Router
- 3 buttons (Esta semana / Este mes / Este trimestre) with `type="button"` to prevent accidental form submit
- Active button highlighted with `bg-blue-50 text-blue-700 font-medium`
- Props: `{ value: Periodo; onChange: (p: Periodo) => void }`

**5 TanStack Query hooks** — all follow the pattern: `useQuery<T>` with `enabled: !!profesionalId`, `staleTime: 5min`, queryKey includes `[..., profesionalId, periodo]`:
- `useCRMFunnel` — funnel stages snapshot with step conversion rates and loss motives (no periodo — funnel is always current state)
- `useCRMKpis` — nuevos/confirmados/totalActivos/tasaConversion for the selected period
- `useCRMLossReasons` — motivo breakdown with counts and percentages for the period
- `useCRMPipelineIncome` — pipeline total and count for the period
- `useCoordinatorPerformance` — per-coordinator interaction metrics, defaults to 'semana'

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed named vs default import of api client**
- **Found during:** Task 2 (writing the 5 hooks)
- **Issue:** Plan template code used `import api from '@/lib/api'` (default import), but `api.ts` exports `export const api` — no default export. Would cause a TypeScript compile error.
- **Fix:** Used `import { api } from '@/lib/api'` consistent with existing `useCRMMetrics.ts` pattern
- **Files modified:** All 5 hook files
- **Commit:** 47ee67b

**2. [Rule 1 - Bug] Used axios params object pattern instead of string interpolation**
- **Found during:** Task 2 (writing the 5 hooks)
- **Issue:** Plan template used URL string interpolation `?profesionalId=${profesionalId}&periodo=${periodo}` which doesn't handle null/undefined safely and differs from existing repo pattern
- **Fix:** Used `api.get('/path', { params: { profesionalId, periodo } })` with `async/await` + destructured `{ data }`, consistent with `useCRMMetrics.ts`
- **Files modified:** All 5 hook files
- **Commit:** 47ee67b

## Verification Results

1. All 7 files exist in specified paths: PASS
2. `usePeriodoFilter` has SSR-safe lazy init (`typeof window === 'undefined'`): PASS
3. `PeriodoSelector` has `type="button"` on each button: PASS
4. All hooks have `enabled: !!profesionalId`: PASS
5. QueryKeys include `periodo` for independent per-period cache (funnel excluded by design — no period param): PASS

## Self-Check

Files created:
- `frontend/src/hooks/usePeriodoFilter.ts` — FOUND
- `frontend/src/components/crm/PeriodoSelector.tsx` — FOUND
- `frontend/src/hooks/useCRMFunnel.ts` — FOUND
- `frontend/src/hooks/useCRMKpis.ts` — FOUND
- `frontend/src/hooks/useCRMLossReasons.ts` — FOUND
- `frontend/src/hooks/useCRMPipelineIncome.ts` — FOUND
- `frontend/src/hooks/useCoordinatorPerformance.ts` — FOUND

Commits:
- 10988ea — Task 1 (usePeriodoFilter + PeriodoSelector) — FOUND
- 47ee67b — Task 2 (5 data hooks) — FOUND

## Self-Check: PASSED
