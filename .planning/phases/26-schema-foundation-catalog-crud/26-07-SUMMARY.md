---
phase: 26-schema-foundation-catalog-crud
plan: "07"
subsystem: ui
tags: [react, nextjs, tanstack-query, shadcn-ui, cirugias, catalogo, insumos]

requires:
  - phase: 26-03
    provides: cirugias-catalogo backend endpoints (CRUD + insumos + recalcular)
  - phase: 26-05
    provides: InsumosEditor shared component and useCirugiasCatalogo hooks

provides:
  - GestionCirugias.tsx — full cirugías CRUD UI with inline InsumosEditor and recalcular button
  - Cirugías tab wired into PROFESIONAL (grid-cols-10) and SECRETARIA (grid-cols-5) Configuración views

affects:
  - configuracion-page
  - cirugias-catalogo
  - tratamientos-catalogo

tech-stack:
  added: []
  patterns:
    - "Mirror GestionTratamientos pattern for cirugías: InsumosEditor shown in both create and edit modals (unlike tratamientos which is edit-only)"
    - "useSetInsumosCirugia called after every create/update save to persist insumos atomically"

key-files:
  created:
    - frontend/src/app/dashboard/configuracion/components/GestionCirugias.tsx
  modified:
    - frontend/src/app/dashboard/configuracion/page.tsx

key-decisions:
  - "GestionCirugias shows InsumosEditor in both create and edit modals (cirugías have id returned from createMutation, so insumos can be set immediately after creation)"
  - "Recalcular button only shown in edit mode (requires existing id for POST /recalcular-precio)"
  - "PROFESIONAL grid-cols-9 → grid-cols-10; SECRETARIA grid-cols-4 → grid-cols-5"

patterns-established:
  - "Cirugías CRUD pattern: create → setInsumos in same save handler using returned id"

requirements-completed:
  - CATLOG-03
  - CATLOG-04
  - CATLOG-05
  - CATLOG-06

duration: 15min
completed: 2026-04-22
---

# Phase 26 Plan 07: GestionCirugias UI + Configuración Tab Wiring Summary

**GestionCirugias component with full CRUD, inline InsumosEditor and Recalcular button wired into Configuración for PROFESIONAL (grid-cols-10) and SECRETARIA (grid-cols-5) views**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-22T21:30:00Z
- **Completed:** 2026-04-22T21:45:00Z
- **Tasks:** 1 auto task + 1 checkpoint
- **Files modified:** 2

## Accomplishments
- Built GestionCirugias.tsx mirroring GestionTratamientos structure with table columns: Nombre | Precio ARS | Precio USD | Duración | Costo insumos | Acciones
- Modal includes InsumosEditor for all saves (both create and edit), amber warning for null costoBase, and Recalcular button in edit mode
- Added Cirugías tab to PROFESIONAL (9→10 cols) and SECRETARIA (4→5 cols) Configuración views
- TypeScript passes clean with no errors

## Task Commits

1. **Task 1: Build GestionCirugias.tsx + wire page.tsx** - `33674e4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `frontend/src/app/dashboard/configuracion/components/GestionCirugias.tsx` - Full cirugías CRUD UI with InsumosEditor inline
- `frontend/src/app/dashboard/configuracion/page.tsx` - Added GestionCirugias import and Cirugías tab in PROFESIONAL and SECRETARIA views

## Decisions Made
- InsumosEditor shown in both create and edit modals for cirugías (unlike tratamientos where it is edit-only). This is safe because createMutation returns the new record id immediately, allowing setInsumosCirugia to be called in the same save handler.
- Recalcular button restricted to edit mode since it calls POST /:id/recalcular-precio on an existing record.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 26 complete: all 7 plans delivered (schema migrations, backend services, InsumosEditor, tratamientos UI, cirugías UI)
- Phases 27/28/29 can run in parallel now that Phase 26 is the strict prerequisite satisfied
- Awaiting human verification checkpoint before advancing STATE

---
*Phase: 26-schema-foundation-catalog-crud*
*Completed: 2026-04-22*
