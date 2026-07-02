---
phase: 29-patientdrawer-flujo-action
plan: "02"
subsystem: ui
tags: [react, tanstack-query, optimistic-update, dialog, lucide-icons, sonner]

# Dependency graph
requires:
  - phase: 29-01
    provides: PATCH /pacientes/:id/flujo endpoint with $transaction (flujo + etapaCRM:null + ContactoLog)
provides:
  - useUpdateFlujo hook for PATCH /pacientes/:id/flujo
  - CambiarFlujoModal with 3 colored selector cards and optimistic update pattern
  - PencilLine trigger in PacienteDetails wired to CambiarFlujoModal
affects: [crm-kanban, pacientes-list]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optimistic update via local state (optimisticFlujo) with null-fallback revert
    - Pre-close-then-mutate pattern for immediate modal dismiss before server response

key-files:
  created:
    - frontend/src/hooks/useUpdateFlujo.ts
    - frontend/src/app/dashboard/pacientes/components/CambiarFlujoModal.tsx
  modified:
    - frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx

key-decisions:
  - "29-02 CambiarFlujoModal pre-close pattern: onOptimisticUpdate + onOpenChange(false) fire before mutation.mutate so UI updates immediately"
  - "29-02 onRevert sets optimisticFlujo to null: displayFlujo falls back to paciente.flujo from server cache on error"

patterns-established:
  - "Pre-close-then-mutate: close modal + optimistic update before mutation for snappy UX"
  - "Null-fallback revert: clear optimistic state to null; server cache value takes over automatically"

requirements-completed: [PAC-02, PAC-03]

# Metrics
duration: 8min
completed: 2026-04-29
---

# Phase 29 Plan 02: PatientDrawer Flujo Action Summary

**PencilLine trigger + CambiarFlujoModal with 3-card selector, optimistic FlujoBadge update, and sonner toast with CRM navigation action**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-29T23:58:52Z
- **Completed:** 2026-04-29T00:07:00Z
- **Tasks:** 3 of 3 (including checkpoint:human-verify — approved by user)
- **Files modified:** 3

## Accomplishments
- Created `useUpdateFlujo(pacienteId)` hook following `useUpdateListaEspera` pattern — PATCHes `/pacientes/:id/flujo`, invalidates paciente/pacientes/crm-kanban on success
- Created `CambiarFlujoModal` with 3 colored selector cards matching exact FlujoBadge color classes, confirm button disabled on no-change or pending, optimistic close before mutation
- Wired PencilLine icon (w-3 h-3) alongside FlujoBadge in PacienteDetails with optimisticFlujo state driving displayFlujo, null-fallback revert on error

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useUpdateFlujo hook** - `af878bc` (feat)
2. **Task 2: Create CambiarFlujoModal + wire PencilLine in PacienteDetails** - `3eea7f9` (feat)

## Files Created/Modified
- `frontend/src/hooks/useUpdateFlujo.ts` - TanStack Query mutation hook for PATCH /pacientes/:id/flujo
- `frontend/src/app/dashboard/pacientes/components/CambiarFlujoModal.tsx` - Dialog modal with 3 colored cards, optimistic close pattern, sonner toast with CRM action
- `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx` - Added PencilLine import + CambiarFlujoModal import, optimisticFlujo state, displayFlujo derivation, PencilLine button, CambiarFlujoModal render

## Decisions Made
- Pre-close-then-mutate pattern: `onOptimisticUpdate` and `onOpenChange(false)` fire before `mutation.mutate` so the drawer reflects the change immediately without waiting for network
- Revert via `onRevert={() => setOptimisticFlujo(null)}`: clearing optimistic state causes `displayFlujo` to fall back to `paciente.flujo` from TanStack Query cache — no manual cache manipulation needed

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Human-verify checkpoint approved. Requirements PAC-02 and PAC-03 are fully satisfied.
- Phase 29 (PatientDrawer Flujo Action) is complete — both plans 29-01 and 29-02 done.
- CRM kanban reflects flujo changes immediately on next load (crm-kanban cache invalidated).
- Ready for subsequent phases that depend on Phase 27+ output.

---
*Phase: 29-patientdrawer-flujo-action*
*Completed: 2026-04-29*
