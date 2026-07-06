---
phase: 44-schema-cat-logo-en-bd
plan: "03"
subsystem: ui
tags: [react, tanstack-query, typescript, axios]

requires:
  - phase: 44-01
    provides: "ZonaHC/DiagnosticoHC/TratamientoHC Prisma models + frontend types + hook committed as part of schema plan"

provides:
  - "frontend/src/types/catalogo-hc.ts — ZonaHC, DiagnosticoHC, TratamientoHC interfaces typed to GET /catalogo-hc contract"
  - "frontend/src/hooks/useCatalogoHC.ts — TanStack Query hook with CATALOGO_HC_QUERY_KEY exported and enabled guard"

affects:
  - phase-45-primera-consulta-form
  - phase-46-catalogo-mutations
  - phase-47-catalogo-admin

tech-stack:
  added: []
  patterns:
    - "useCatalogoHC follows repo hook pattern: api.get via lib/api.ts axios instance, queryKey array with [key, profesionalId], enabled guard via options?.enabled ?? true"
    - "CATALOGO_HC_QUERY_KEY exported as named const for onSettled invalidation by key prefix in future mutation hooks"

key-files:
  created:
    - frontend/src/types/catalogo-hc.ts
    - frontend/src/hooks/useCatalogoHC.ts
  modified: []

key-decisions:
  - "enabled guard via options?.enabled — allows SECRETARIA/ADMIN callers to delay query until profesionalId available from professional context (without profesionalId, backend returns ForbiddenException for those roles)"
  - "No mutations in this hook — Phase 47 owns rename/delete mutations; keeping hook read-only avoids premature scope"
  - "Files were committed as part of plan 44-01 commit (64a9f2c) — plan 44-03 verified they match the contract exactly"

patterns-established:
  - "Query key as exported const: export const CATALOGO_HC_QUERY_KEY = 'catalogo-hc' — enables cache invalidation by prefix from sibling hooks"

requirements-completed: [ZONA-01]

duration: 2min
completed: "2026-06-12"
---

# Phase 44 Plan 03: Frontend Hook + Types for Catálogo HC Summary

**TanStack Query hook `useCatalogoHC` + TypeScript interfaces `ZonaHC/DiagnosticoHC/TratamientoHC` typed to the GET /catalogo-hc contract, with exported query key for future invalidation**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-12T21:34:32Z
- **Completed:** 2026-06-12T21:35:51Z
- **Tasks:** 1
- **Files modified:** 2 (created)

## Accomplishments
- Types `ZonaHC`, `DiagnosticoHC`, `TratamientoHC` match the GET /catalogo-hc response contract exactly (including `precio: number | null` resolved by backend join, `tratamientoId: string | null` FK, `esSistema` flags)
- `useCatalogoHC` hook with `enabled` guard prevents premature queries for SECRETARIA/ADMIN roles awaiting profesionalId from professional context
- `CATALOGO_HC_QUERY_KEY` exported as named const enabling Phase 46/47 mutation hooks to invalidate cache by key prefix (onSettled pattern)

## Task Commits

Each task was committed atomically:

1. **Task 1: Tipos catalogo-hc + hook useCatalogoHC** - `64a9f2c` (feat) — committed as part of plan 44-01

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `frontend/src/types/catalogo-hc.ts` — Interfaces DiagnosticoHC, TratamientoHC, ZonaHC typed to GET /catalogo-hc response contract
- `frontend/src/hooks/useCatalogoHC.ts` — TanStack Query hook with profesionalId param, enabled guard, exported query key

## Decisions Made
- `enabled` option defaults to `true` but can be overridden — PROFESIONAL callers (JWT-resolved) need no guard; SECRETARIA/ADMIN callers pass `enabled: !!profesionalId` from `useEffectiveProfessionalId`
- No mutations created — plan explicitly deferred to Phase 47 to keep scope minimal

## Deviations from Plan

### Discovery: Files already committed in 44-01

- **Found during:** Task 1 verification
- **Issue:** Both `catalogo-hc.ts` and `useCatalogoHC.ts` were included in commit `64a9f2c` (plan 44-01) alongside the Prisma schema changes
- **Resolution:** Verified the committed content matches the 44-03 contract exactly — no changes needed
- **Impact:** None — deliverables are in place, plan 44-03 is satisfied

---

**Total deviations:** None that required code changes — files pre-committed in 44-01 with identical content.

## Issues Encountered
None - files verified against contract and TypeScript compilation passes cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 45 (PrimeraConsultaForm redesign) can import `useCatalogoHC` and `ZonaHC` immediately
- Query key `CATALOGO_HC_QUERY_KEY` ready for mutation invalidation in Phase 46/47
- No blockers

---
*Phase: 44-schema-cat-logo-en-bd*
*Completed: 2026-06-12*
