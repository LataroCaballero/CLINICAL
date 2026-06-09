---
phase: 42-estado-dual-y-tratamientostab
plan: "01"
subsystem: ui, api
tags: [nestjs, prisma, react, tanstack-query, typescript, tratamientos]

requires:
  - phase: 41-tipo-entrada-hc
    provides: "tipoEntrada field on HistoriaClinicaEntrada; Turno.entradaHC direct relation with tipoEntrada populated after cerrarSesion"

provides:
  - "obtenerTurnosPorRango returns tipoEntradaHC (TipoEntradaHC | null) per turno via nested Prisma select — no N+1"
  - "TurnoRango type includes tipoEntradaHC field"
  - "TratamientosTab shows fuente A (flujoPaciente=TRATAMIENTO) OR fuente B (Consulta + tipoEntradaHC=TRATAMIENTO)"
  - "Column 'Tipo de turno' shows 'Consulta → Tratamiento' for fuente B rows"
  - "Dropdown filter includes synthetic 'CONSULTA_TRATAMIENTO' option when fuente B rows exist"

affects:
  - 43-archivar-del-embudo-crm

tech-stack:
  added: []
  patterns:
    - "Dual-source filter: flujoPaciente OR (tipoTurno.nombre + tipoEntradaHC) client-side predicate"
    - "Synthetic dropdown value (CONSULTA_TRATAMIENTO) for grouped virtual filter category"
    - "Flatten nested Prisma relation to top-level field: { entradaHC, ...rest } destructure in map"

key-files:
  created: []
  modified:
    - backend/src/modules/turnos/turnos.service.ts
    - frontend/src/hooks/useTurnosRangos.ts
    - frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx

key-decisions:
  - "Phase 42 is read-only: no mutations to flujo/etapaCRM, no new endpoints, no new DTOs"
  - "isFuenteB predicate: tipoTurno.nombre === 'Consulta' && tipoEntradaHC === 'TRATAMIENTO' (client-side)"
  - "Dropdown filter: fuente-A tipos by tipoTurno.id; fuente-B by synthetic CONSULTA_TRATAMIENTO sentinel"
  - "Ordering preserved: backend returns inicio asc; filter preserves order; A and B interleaved by date automatically"

patterns-established:
  - "Flatten nested select to top-level field in service map to keep API shape consistent with frontend expectations"
  - "Dual-source filter with isFuenteB helper avoids duplicating condition across filter/render/dropdown"

requirements-completed: [DUAL-01, DUAL-02, DUAL-03]

duration: 15min
completed: 2026-06-08
---

# Phase 42 Plan 01: Estado Dual y TratamientosTab Summary

**Dual-source TratamientosTab: patients with flujoPaciente=CIRUGIA who receive treatments now appear via Consulta+tipoEntradaHC=TRATAMIENTO (fuente B), rendered as "Consulta → Tratamiento" alongside flujoPaciente=TRATAMIENTO rows (fuente A)**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-08T00:00:00Z
- **Completed:** 2026-06-08
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended `obtenerTurnosPorRango` to include `entradaHC.tipoEntrada` via Prisma nested select on the direct `Turno.entradaHC` relation (no N+1), flattened to `tipoEntradaHC` in the response map
- Added `tipoEntradaHC?: string | null` to the `TurnoRango` frontend type and implemented the `isFuenteB` predicate for dual-source filtering in `TratamientosTab`
- Column "Tipo de turno" conditionally shows "Consulta → Tratamiento" for fuente B rows; dropdown gets a synthetic `CONSULTA_TRATAMIENTO` option when fuente B rows exist in the month

## Task Commits

1. **Task 1: Exponer tipoEntradaHC por turno en obtenerTurnosPorRango** - `d59e202` (feat)
2. **Task 2: Predicado dual + columna "Consulta → Tratamiento" en TratamientosTab** - `78dda44` (feat)

## Files Created/Modified

- `backend/src/modules/turnos/turnos.service.ts` — Added `entradaHC: { select: { tipoEntrada: true } }` to findMany select; destructured in map to expose flat `tipoEntradaHC` field
- `frontend/src/hooks/useTurnosRangos.ts` — Added `tipoEntradaHC?: string | null` to `TurnoRango` type
- `frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx` — `isFuenteB` predicate, dual filter, conditional column render, synthetic dropdown option

## Decisions Made

- Phase 42 scope is strictly read-only: no flujo/etapaCRM mutations, no new endpoints, no new DTOs
- `isFuenteB` checks `tipoTurno.nombre === "Consulta"` (not by ID) to stay robust after data migrations
- Dropdown uses sentinel string `"CONSULTA_TRATAMIENTO"` (not a real tipoTurno.id) for the grouped fuente-B filter, avoiding collision with real UUIDs
- Pre-existing lint errors in unrelated files (no-explicit-any, unescaped entities, etc.) are out of scope; files I modified lint clean

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DUAL-01/02/03 requirements satisfied: fuente A non-regression confirmed, fuente B new, "Consulta → Tratamiento" column working
- Phase 43 (Archivar del Embudo CRM) can proceed: `crmArchivado` boolean on Paciente, getKanban/getListaAccion WHERE clause additions

---
*Phase: 42-estado-dual-y-tratamientostab*
*Completed: 2026-06-08*
