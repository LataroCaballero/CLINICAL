---
phase: 47-admin-ui-en-configuracion
plan: 02
subsystem: ui
tags: [react, tanstack-query, shadcn, nestjs, catalogo-hc]

# Dependency graph
requires:
  - phase: 47-01
    provides: PATCH/DELETE endpoints for zonas/diagnosticos/tratamientos in CatalogoHCService
  - phase: 44-schema-catalogo-en-bd
    provides: ZonaHC/DiagnosticoHC/TratamientoHC models, useCatalogoHC hook, CATALOGO_HC_QUERY_KEY
provides:
  - useCatalogoHCMutations hook (6 mutations: renombrar + eliminar for zonas/diagnosticos/tratamientos)
  - GestionCatalogoHC component (expandable hierarchy view with inline rename/delete)
  - 'Catálogo HC' tab in Configuración page wired for PROFESIONAL and SECRETARIA roles
affects:
  - formulario-primera-consulta (shared CATALOGO_HC_QUERY_KEY invalidation)
  - historia-clinica (historical entries unaffected by renames/deletes)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "6 TanStack mutations with shared CATALOGO_HC_QUERY_KEY prefix invalidation"
    - "Expandable set state (Set<string> of expanded zone IDs) for hierarchical UI"
    - "Discriminated union { tipo: 'zona'|'diagnostico'|'tratamiento', id, nombreActual } for shared rename dialog"

key-files:
  created:
    - frontend/src/hooks/useCatalogoHCMutations.ts
    - frontend/src/app/dashboard/configuracion/components/GestionCatalogoHC.tsx
  modified:
    - frontend/src/app/dashboard/configuracion/page.tsx

key-decisions:
  - "GestionCatalogoHC enabled guard: profesionalId undefined → enabled true (PROFESIONAL, backend resolves via JWT); profesionalId provided → enabled !!profesionalId (SECRETARIA)"
  - "Discriminated union state for shared rename dialog avoids 3 separate dialog states"
  - "esSistema items show badge 'Sistema' and have no rename/delete buttons — Otros protected"

patterns-established:
  - "useCatalogoHCMutations: same api.patch/api.delete + profesionalId params pattern as useTratamientosProfesional"
  - "Expandable list UI: local Set<string> state toggled by item ID — reusable for future hierarchical views"

requirements-completed: [ADM-01, ADM-02, ADM-03]

# Metrics
duration: ~90min (Tasks 1-3 prior session + Task 4 human-verify approved)
completed: 2026-06-13
---

# Phase 47 Plan 02: Admin UI en Configuración Summary

**React Admin UI for HC Catalog management: expandable zonas→diagnósticos→tratamientos hierarchy with rename (Dialog) and delete (AlertDialog) for non-system items, wired as a new "Catálogo HC" tab in Configuración for PROFESIONAL and SECRETARIA roles, with cache invalidation shared with the Primera Consulta form**

## Performance

- **Duration:** ~90 min (Tasks 1-3 in prior session; Task 4 human-verify approved continuation)
- **Started:** 2026-06-13T00:00:00Z
- **Completed:** 2026-06-13
- **Tasks:** 4 (including 1 human-verify checkpoint)
- **Files modified:** 3

## Accomplishments
- Built `useCatalogoHCMutations` hook with 6 mutations (renombrarZona/Diagnostico/Tratamiento + eliminarZona/Diagnostico/Tratamiento) following the useTratamientosProfesional pattern, all invalidating CATALOGO_HC_QUERY_KEY on success
- Built `GestionCatalogoHC` component with expandable zone rows (ChevronRight/ChevronDown toggle), nested Diagnósticos and Tratamientos sub-sections, inline rename via Dialog, and delete via AlertDialog with confirmation; esSistema items protected with "Sistema" badge and no action buttons
- Wired a new "Catálogo HC" tab in Configuración for PROFESIONAL (no profesionalId, backend resolves via JWT) and SECRETARIA (profesionalId from selectedProfesional.id); ADM-01/02/03 verified end-to-end by user

## Task Commits

Each task was committed atomically:

1. **Task 1: Hook useCatalogoHCMutations (renombrar + eliminar)** - `591a7d0` (feat)
2. **Task 2: Componente GestionCatalogoHC (vista expandible + rename + delete)** - `3038fe0` (feat)
3. **Task 3: Wire pestaña 'Catálogo HC' en Configuración (PROFESIONAL + SECRETARIA)** - `2601eb8` (feat)
4. **Task 4: Verificación end-to-end del Admin UI del catálogo** - checkpoint:human-verify, approved by user

**Plan metadata:** (docs commit — see final_commit)

## Files Created/Modified
- `frontend/src/hooks/useCatalogoHCMutations.ts` - 6 TanStack mutations for rename/delete of zonas/diagnosticos/tratamientos with CATALOGO_HC_QUERY_KEY invalidation
- `frontend/src/app/dashboard/configuracion/components/GestionCatalogoHC.tsx` - Expandable hierarchy component with rename Dialog and delete AlertDialog; esSistema items protected
- `frontend/src/app/dashboard/configuracion/page.tsx` - Added "Catálogo HC" TabsTrigger + TabsContent for PROFESIONAL and SECRETARIA views (grid-cols adjusted)

## Decisions Made
- GestionCatalogoHC `enabled` guard: `profesionalId === undefined → enabled: true` (PROFESIONAL, backend resolves via JWT); `profesionalId provided → enabled: !!profesionalId` (SECRETARIA avoids query until ID available)
- Discriminated union `{ tipo: 'zona'|'diagnostico'|'tratamiento', id, nombreActual }` for shared rename dialog state avoids duplicating three separate dialog states
- esSistema items show a "Sistema" badge and have no rename/delete buttons — Otros is fully protected per plan

## Deviations from Plan

None — plan executed exactly as written. All 4 tasks completed per specification; human-verify (Task 4) approved on first pass.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- ADM-01/02/03 closed; Phase 47 Plan 02 complete
- The shared CATALOGO_HC_QUERY_KEY pattern is now used by both Primera Consulta (read) and Configuración (mutate) — any future mutation to catalog items should use this same key for cache consistency
- Phase 47 remaining plans (if any) can proceed; no blockers

---
*Phase: 47-admin-ui-en-configuracion*
*Completed: 2026-06-13*
