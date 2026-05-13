---
phase: 30-tab-tratamientos-ultimo-tratamiento
plan: 01
subsystem: ui
tags: [react, tanstack-query, prisma, nestjs, clinical-records, appointments]

# Dependency graph
requires:
  - phase: 27-hc-integration
    provides: HistoriaClinica.entradas with contenido.tratamientos JSON structure
  - phase: 29-patient-drawer-flujo
    provides: PatientDrawer with initialView prop and DrawerView type

provides:
  - TratamientosTab 5th column "Último tratamiento" showing comma-joined catalog treatment names per patient
  - obtenerTurnosPorRango enriched with ultimoTratamiento via batch sub-query (no N+1)
  - Auto-refresh of Último tratamiento column on any HC save (via invalidateQueries prefix match)

affects:
  - turnos
  - tratamientos-tab
  - patient-drawer
  - historia-clinica

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ultimoTratamientoMap: batch-query HC histories and build Map<pacienteId, string|null> in service layer"
    - "Prefix-key invalidation: ['turnos', 'rango'] invalidates all rango queries regardless of trailing params"
    - "drawerInitialView state pattern: track intended DrawerView before opening PatientDrawer"

key-files:
  created: []
  modified:
    - backend/src/modules/turnos/turnos.service.ts
    - frontend/src/hooks/useTurnosRangos.ts
    - frontend/src/hooks/useCreateHistoriaClinicaEntry.ts
    - frontend/src/hooks/useHCEntries.ts
    - frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx

key-decisions:
  - "ultimoTratamiento batch query: ONE historiaClinica.findMany for all pacienteIds, then JS filter on contenido.tratamientos — avoids N+1 and avoids unsupported Prisma JSON path equals operator"
  - "take: 10 on nested entradas: limits volume per patient while still finding the most recent entry with treatments"
  - "Prefix invalidation ['turnos', 'rango']: invalidates all rango queries across all profesional/date combos on any HC save"
  - "drawerInitialView state: patient name click opens default tab, treatment name click opens historia tab — no changes to PatientDrawer itself"

patterns-established:
  - "ultimoTratamientoMap pattern: batch sub-query returning Map for join-like enrichment without N+1"
  - "drawerInitialView state: set intended view before setSelectedPacienteId to drive PatientDrawer navigation"

requirements-completed: [PAC-01]

# Metrics
duration: 6min
completed: 2026-05-12
---

# Phase 30 Plan 01: Tab Tratamientos — Último Tratamiento Summary

**Batch-queried "Último tratamiento" column added to TratamientosTab with click-to-HC-drawer navigation and auto-refresh on HC saves**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-12T22:00:06Z
- **Completed:** 2026-05-12T22:05:48Z
- **Tasks:** 3 of 3 complete (including human-verify — approved)
- **Files modified:** 5

## Accomplishments
- Backend: `obtenerTurnosPorRango` enriched with `ultimoTratamiento: string | null` per turno via a single batch HistoriaClinica query with JS-side filtering on `contenido.tratamientos`
- Frontend: TratamientosTab now renders 5 columns; 5th column shows clickable treatment name (opens PatientDrawer on Historia tab) or "—" muted for patients with no catalog treatments
- Auto-refresh wired: `['turnos', 'rango']` prefix invalidation added to `useCreateHistoriaClinicaEntry`, `useCreateHCEntry`, and `useFinalizeHCEntry`
- Task 3 (human-verify checkpoint): user manually verified all UX checks and approved — column renders correctly, click-to-HC-drawer works, auto-refresh confirmed

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend — Enrich obtenerTurnosPorRango** - `c42cc33` (feat)
2. **Task 2: Frontend — Extend TurnoRango type, 5th column, cache invalidations** - `ecdde1c` (feat)
3. **Task 3: Verify — Último tratamiento column UX and auto-refresh** - human-verify approved

## Files Created/Modified
- `backend/src/modules/turnos/turnos.service.ts` - obtenerTurnosPorRango now returns ultimoTratamiento per turno via batch sub-query
- `frontend/src/hooks/useTurnosRangos.ts` - TurnoRango type extended with `ultimoTratamiento?: string | null`
- `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` - Added `['turnos', 'rango']` cache invalidation on HC save
- `frontend/src/hooks/useHCEntries.ts` - Added `['turnos', 'rango']` invalidation to useCreateHCEntry and useFinalizeHCEntry
- `frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx` - 5th column UI, drawerInitialView state, PatientDrawer initialView prop

## Decisions Made
- Used JS-side filter on `contenido.tratamientos` rather than Prisma JSON `path equals` — the latter throws a runtime error and is not supported for this query shape
- `take: 10` on nested entradas balances query volume vs coverage (covers virtually all real cases where recent treatment exists within last 10 entries)
- Prefix key `['turnos', 'rango']` for invalidation ensures ALL month/profesional combinations refresh when any HC entry is saved

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 30 is complete; requirement PAC-01 is satisfied
- No blockers for subsequent phases

---
*Phase: 30-tab-tratamientos-ultimo-tratamiento*
*Completed: 2026-05-12*
