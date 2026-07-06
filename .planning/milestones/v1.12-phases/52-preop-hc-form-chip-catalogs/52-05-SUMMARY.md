---
phase: 52-preop-hc-form-chip-catalogs
plan: 05
subsystem: frontend/hooks
tags: [react, tanstack-query, preoperatorio, catalogo-hc, antecedentes, alergias, medicamentos]

# Dependency graph
requires:
  - phase: 52
    plan: 02
    provides: "GET /catalogo-hc/antecedentes, /catalogo-hc/alergias, /catalogo-hc/medicamentos endpoints"
  - phase: 52
    plan: 03
    provides: "CreateEntradaDto PREOP fields (antecedentes/alergias/medicacion/estudiosComplementarios/consentimientoInformado)"
provides:
  - "useAntecedentesCatalogo(profesionalId?) — TanStack Query hook for antecedentes catalog; exports ANTECEDENTES_CATALOGO_QUERY_KEY"
  - "useAlergiasCatalogo(profesionalId?) — TanStack Query hook for alergias catalog; exports ALERGIAS_CATALOGO_QUERY_KEY"
  - "useMedicamentosCatalogo(profesionalId?) — TanStack Query hook for medicamentos catalog; exports MEDICAMENTOS_CATALOGO_QUERY_KEY"
  - "CreateEntradaDto with PREOP optional fields + onSuccess invalidation of three flat catalog query keys"
affects:
  - 52-06  # PreoperatorioForm component consumes these hooks and the extended DTO

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Flat catalog hook pattern: useQuery with enabled: !!profesionalId, staleTime 5min, gcTime 30min, matching useCatalogoHC"
    - "Catalog invalidation: onSuccess in create-entry hook invalidates all three flat catalog keys so learned Otro values surface next open (PREOP-04)"
    - "Query key constants exported from hook files so consumers (Plan 06) can reference by name without repeating string literals"

key-files:
  created:
    - frontend/src/hooks/useAntecedentesCatalogo.ts
    - frontend/src/hooks/useAlergiasCatalogo.ts
    - frontend/src/hooks/useMedicamentosCatalogo.ts
  modified:
    - frontend/src/hooks/useCreateHistoriaClinicaEntry.ts

key-decisions:
  - "enabled: !!profesionalId (not always-on like useCatalogoHC) — these catalogs are per-professional and meaningless without a profesionalId"
  - "ANTECEDENTES/ALERGIAS/MEDICAMENTOS_CATALOGO_QUERY_KEY constants exported from each hook file and imported via named import in useCreateHistoriaClinicaEntry (single source of truth for key strings)"
  - "CatalogoItem interface { id, nombre, esSistema } defined in each hook file — no shared types file added to avoid a premature abstraction that would need to be moved in Plan 06"

patterns-established:
  - "Flat catalog hook: enabled only when profesionalId is provided (different from useCatalogoHC which has an explicit enabled override option)"

requirements-completed: [PREOP-03, PREOP-04, PREOP-06, PREOP-07]

# Metrics
duration: 12min
completed: 2026-06-26
---

# Phase 52 Plan 05: Frontend Catalog Hooks + PREOP DTO Extension Summary

**Three per-professional catalog hooks (antecedentes/alergias/medicamentos) added mirroring useCatalogoHC, and useCreateHistoriaClinicaEntry extended with PREOP DTO fields and post-save invalidation of all three flat catalog query keys**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-26T13:20:00Z
- **Completed:** 2026-06-26T13:32:00Z
- **Tasks:** 2/2
- **Files modified:** 1 existing + 3 new

## Accomplishments

### Task 1: Three flat-catalog TanStack Query hooks

Created `useAntecedentesCatalogo.ts`, `useAlergiasCatalogo.ts`, `useMedicamentosCatalogo.ts`:
- Each exports a named query-key constant (`ANTECEDENTES_CATALOGO_QUERY_KEY = 'antecedentes-catalogo'`, etc.)
- Each exports a `CatalogoItem` interface `{ id: string; nombre: string; esSistema: boolean }`
- Each hook calls the matching backend endpoint (`/catalogo-hc/antecedentes`, etc.)
- `enabled: !!profesionalId` — disabled when no profesional context is available
- `staleTime: 5min`, `gcTime: 30min` — matches the existing `useCatalogoHC` cache policy

### Task 2: PREOP fields + catalog invalidation in useCreateHistoriaClinicaEntry

Extended `CreateEntradaDto` with optional PREOP fields:
- `antecedentes?: string[]`
- `alergias?: string[]`
- `medicacion?: string[]`
- `estudiosComplementarios?: { laboratorio: boolean; ecg: boolean; imagenes: string[] }` (D-10 shape)
- `consentimientoInformado?: boolean`

Added `onSuccess` invalidations for all three flat catalog query keys (imported via exported constants), so newly-learned "Otro" values appear the next time the form is opened (PREOP-04). Existing invalidations (`historia-clinica`, `paciente`, `catalogo-hc`, etc.) are unchanged.

## Task Commits

1. **feat(52-05): add three flat-catalog TanStack Query hooks** — `88f15f5`
2. **feat(52-05): extend useCreateHistoriaClinicaEntry with PREOP fields and catalog invalidations** — `88f5d6d`

## Files Created/Modified

- `frontend/src/hooks/useAntecedentesCatalogo.ts` — new hook + ANTECEDENTES_CATALOGO_QUERY_KEY + CatalogoItem
- `frontend/src/hooks/useAlergiasCatalogo.ts` — new hook + ALERGIAS_CATALOGO_QUERY_KEY + CatalogoItem
- `frontend/src/hooks/useMedicamentosCatalogo.ts` — new hook + MEDICAMENTOS_CATALOGO_QUERY_KEY + CatalogoItem
- `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` — PREOP DTO fields + three catalog invalidations added

## Decisions Made

- `enabled: !!profesionalId` for the three new hooks (unlike `useCatalogoHC` which exposes an `options.enabled` override). These catalogs are per-professional seeded data and never useful without a profesionalId.
- Query-key constants are exported from each hook file and imported into `useCreateHistoriaClinicaEntry` — avoids repeating string literals and provides a single source of truth for key changes.
- `CatalogoItem` interface is defined locally in each hook file. A shared types module would be premature here; Plan 06 (the form component) will import from whichever hook it uses.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **npm run build fails in this environment (Node.js 18.20.8; Next.js requires >=20.9.0)** — pre-existing environment constraint, not introduced by this plan. `npx tsc --noEmit` exits 0 confirming the code is type-correct. Prior plans (52-02/03) were backend-only builds that also passed.

## Known Stubs

None — all three hooks call real backend endpoints (shipped in Plan 02). The DTO extension passes real fields to the existing backend POST route.

## Threat Flags

None — no new network surfaces. T-52-14 mitigated: all requests flow through the shared `api` axios instance that attaches the JWT. T-52-15 accepted: profesionalId is a non-secret advisory scoping hint, backend authorizes server-side.

## Next Phase Readiness

- Three catalog hooks ready to be consumed by the PreoperatorioForm component (Plan 06)
- `useCreateHistoriaClinicaEntry` mutation hook ready to receive full PREOP DTO from the form
- Catalog refresh on save wired — newly learned "Otro" values will surface immediately on next form open

---
*Phase: 52-preop-hc-form-chip-catalogs*
*Completed: 2026-06-26*
