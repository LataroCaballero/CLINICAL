---
phase: 28-presupuestos-catalog-integration
plan: "01"
subsystem: ui
tags: [react, presupuesto, catalog, popover, command, cirugias, tratamientos]

# Dependency graph
requires:
  - phase: 26-catalogo-cirugias
    provides: useCirugiasCatalogo hook and CirugiaCatalogo type
  - phase: 25-tratamientos-tab
    provides: useTratamientosProfesional hook and TratamientoConInsumos type
provides:
  - GenerarPresupuestoModal with Popover/Command catalog selector
  - Snapshot price capture per currency (ARS/USD) at selection time
  - Visual "Catálogo" badge on catalog-sourced items
  - fromCatalog stripped before backend send
affects: [presupuesto-flow, live-turno, patient-drawer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ItemWithMeta extends PresupuestoItemInput with fromCatalog flag — local UI metadata stripped before API call"
    - "Snapshot pricing: precio captured at selection time, never re-read from catalog"

key-files:
  created: []
  modified:
    - frontend/src/components/live-turno/tabs/hc/GenerarPresupuestoModal.tsx

key-decisions:
  - "ItemWithMeta local type keeps fromCatalog flag without polluting PresupuestoItemInput backend contract — stripped via map() in handleCreate"
  - "USD snapshot uses precioUSD ?? precioARS fallback — cirugía price is pre-captured at selection time"

patterns-established:
  - "Catalog selection popover pattern: Popover/Command with CommandGroup per entity type, onSelect calls addFromCatalog then closes popover"

requirements-completed:
  - PRESUP-01
  - PRESUP-02
  - PRESUP-03
  - PRESUP-04

# Metrics
duration: 15min
completed: 2026-04-29
---

# Phase 28 Plan 01: Presupuestos Catalog Integration Summary

**Popover/Command catalog selector in GenerarPresupuestoModal with snapshot pricing, 'Catalogo' badge, and dual currency support for Cirugias and Tratamientos**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-29T00:00:00Z
- **Completed:** 2026-04-29T00:15:00Z
- **Tasks:** 2 of 2 complete
- **Files modified:** 1

## Accomplishments
- Extended GenerarPresupuestoModal with ItemWithMeta type to carry fromCatalog flag locally
- Wired useCirugiasCatalogo(profesionalId) and useTratamientosProfesional(false, profesionalId) inside modal
- Added Popover/Command with two CommandGroups (Cirugias and Tratamientos) with search input
- Snapshot price captured at selection: USD uses precioUSD ?? precioARS; ARS uses precioARS
- Badge "Catalogo" renders between descripcion and precio inputs for catalog-sourced rows
- handleCreate strips fromCatalog via destructuring map — backend receives only { descripcion, precioTotal }
- "Agregar item libre" button preserved with identical behavior (renamed label only)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend item state and add catalog selection logic** - `42e8163` (feat)

## Files Created/Modified
- `frontend/src/components/live-turno/tabs/hc/GenerarPresupuestoModal.tsx` - Added catalog Popover/Command selector, ItemWithMeta type, snapshot price handlers, Catalogo badge

## Decisions Made
- ItemWithMeta local type: keeps fromCatalog flag out of PresupuestoItemInput backend contract; stripped via map() in handleCreate
- USD snapshot: precioUSD ?? precioARS fallback — matches plan specification exactly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 28-01 fully complete — human verification approved 2026-04-29
- Requirements PRESUP-01 through PRESUP-04 satisfied
- GenerarPresupuestoModal catalog selector ready for production use

---
*Phase: 28-presupuestos-catalog-integration*
*Completed: 2026-04-29*
