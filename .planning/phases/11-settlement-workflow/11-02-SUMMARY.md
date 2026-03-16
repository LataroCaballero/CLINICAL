---
phase: 11-settlement-workflow
plan: 02
subsystem: ui
tags: [react, nextjs, tanstack-query, shadcn, finanzas, liquidaciones]

# Dependency graph
requires:
  - phase: 11-01
    provides: usePracticasPendientesPorOS, useActualizarMontoPagado, OS card navigation with ?nombre param
  - phase: 09-backend-api-layer
    provides: POST /finanzas/liquidaciones/crear-lote endpoint (atomic transaction)
provides:
  - Lote page at /dashboard/facturador/liquidar/[obraSocialId] with inline-editable Pagado cells
  - useCerrarLote hook — POST crear-lote + cache invalidation + redirect
  - Full settlement workflow end-to-end: browse OS cards → edit montos → confirm close → redirect
affects:
  - Any future facturador or liquidacion feature building on the settlement flow

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Local overrides Map<string, number> for live total without server round-trips
    - Controlled Dialog via manual isModalOpen state (button in header, modal elsewhere in tree)
    - "Inline EditableCell: empty localMonto + placeholder = current monto pattern"

key-files:
  created:
    - frontend/src/hooks/useCerrarLote.ts
    - frontend/src/app/dashboard/facturador/liquidar/[obraSocialId]/page.tsx
  modified: []

key-decisions:
  - "Initialize localMonto to empty string not to String(montoPagado) — triggers native placeholder display with formatted current value"
  - "overrides Map held in page state, not server cache — avoids N+1 PATCH-then-GET round-trips while keeping header total live"
  - "Do NOT use DialogTrigger — header button and Dialog are siblings; controlled via isModalOpen boolean"
  - "periodo derived from new Date().toISOString().slice(0, 7) — YYYY-MM, same pattern as mesActual in dashboard"

patterns-established:
  - "EditableCell pattern: local string state + placeholder = formatted server value + onBlur no-op guards"
  - "Post-mutation redirect: useCerrarLote invalidates agrupadas + por-os caches then router.push to parent page"

requirements-completed: [LIQ-01, LIQ-02, LIQ-03]

# Metrics
duration: ~10min
completed: 2026-03-16
---

# Phase 11 Plan 02: Settlement Workflow Summary

**Full FACTURADOR settlement workflow: lote page with inline montoPagado editing, live running total, and confirmation modal that atomically closes the lote via POST /finanzas/liquidaciones/crear-lote**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-16
- **Completed:** 2026-03-16
- **Tasks:** 3 (2 auto + 1 human-verify, approved)
- **Files modified:** 2

## Accomplishments
- useCerrarLote hook: fires POST crear-lote, invalidates agrupadas + por-os caches, toasts success, redirects to /dashboard/facturador
- Lote page: 6-column table (Paciente | Codigo | Descripcion | Fecha | Autorizado | Pagado) with per-cell inline editing, live header total via local overrides Map, loading skeleton, empty state
- CerrarLoteModal: controlled Dialog showing practice count + derived total; confirming triggers useCerrarLote
- Human verification passed — full end-to-end workflow confirmed working: OS card click → lote table → edit monto → cerrar → redirect + OS card disappears

## Task Commits

Each task was committed atomically:

1. **Task 1: useCerrarLote hook** - `317d025` (feat)
2. **Task 2: Lote page — table with inline editing + CerrarLoteModal** - `670973d` (feat)
3. **Task 3: Human verify — approved** - (checkpoint, no code commit)

## Files Created/Modified
- `frontend/src/hooks/useCerrarLote.ts` - useMutation: POST /finanzas/liquidaciones/crear-lote, onSuccess invalidates two queryKeys and redirects
- `frontend/src/app/dashboard/facturador/liquidar/[obraSocialId]/page.tsx` - Client component: reads obraSocialId + ?nombre from URL, renders practices table with EditableCell per row, live header total, CerrarLoteModal

## Decisions Made
- `localMonto` initialized to `''` (not `String(practica.montoPagado)`) — empty string lets the `placeholder` attribute show the formatted current value; typing replaces it naturally
- `overrides: Map<string, number>` held in page state — updated on each successful PATCH without re-fetching the full list, keeping header total reactive without server round-trips
- `Dialog` controlled via `isModalOpen` boolean rather than `DialogTrigger` — the "Cerrar Lote" button lives in the page header while the Dialog is rendered at the bottom of the component tree
- Only PATCH when `parsed !== (practica.montoPagado ?? practica.monto)` — prevents spurious network requests when user focuses and blurs without changing value

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 11 complete. All v1.1 requirements for the settlement workflow (LIQ-01, LIQ-02, LIQ-03) are satisfied:
1. FACTURADOR can filter by OS — lote page at /liquidar/[obraSocialId]
2. Editable montoPagado cell per row — saves on blur via PATCH, reverts + toasts on error
3. Modal shows count + total before close; confirming fires POST crear-lote; redirect clears closed OS from dashboard

Milestone v1.1 (Vista del Facturador) is now complete.

---
*Phase: 11-settlement-workflow*
*Completed: 2026-03-16*
