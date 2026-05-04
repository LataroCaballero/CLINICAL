---
phase: 27-hc-integration-liveturno-patientdrawer
plan: 03
subsystem: ui
tags: [react, nextjs, dialog, historia-clinica, patient-drawer]

# Dependency graph
requires:
  - phase: 27-02
    provides: HCCreatorForm autonomous component with showDatePicker prop and onSaved callback
provides:
  - HCCreatorDialog.tsx wrapping HCCreatorForm in a shadcn Dialog for use from PatientDrawer
  - PatientDrawer header '+ Nueva HC' button wired to hcDialogOpen state
  - Professional can create HC entries from patient profile without an active turno
affects: [PatientDrawer, historia-clinica, LiveTurno]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dialog wrapper pattern: HCCreatorDialog wraps HCCreatorForm with turnoId omitted and showDatePicker=true"
    - "Header layout: flex justify-between with w-16 spacer keeps DrawerTitle visually centered while hosting action button on right"

key-files:
  created:
    - frontend/src/components/patient/PatientDrawer/views/HCCreatorDialog.tsx
  modified:
    - frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx

key-decisions:
  - "27-03 HCCreatorDialog no turnoId: turnoId intentionally omitted from HCCreatorDialog — creates HC entry without turno context (HCDR-02)"
  - "27-03 obraSocialId via (paciente as any): field exposed via API but not in typed Paciente interface — cast consistent with existing AutorizacionesPacienteSection usage in same file"

patterns-established:
  - "HCCreatorDialog pattern: same HCCreatorForm reused across LiveTurno (turnoId, no date picker) and PatientDrawer (no turnoId, date picker shown) contexts via props"

requirements-completed: [HCDR-01, HCDR-02, HCDR-03]

# Metrics
duration: 12min
completed: 2026-04-23
---

# Phase 27 Plan 03: HC Integration PatientDrawer Summary

**HCCreatorDialog wrapping shared HCCreatorForm wired into PatientDrawer header — professionals create HC entries from patient profile without an active session, with DatePicker defaulting to today and blocking future dates**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-23T21:50:00Z
- **Completed:** 2026-04-23T22:02:00Z
- **Tasks:** 2 of 2 complete (auto + human-verify checkpoint confirmed)
- **Files modified:** 2

## Accomplishments
- Created `HCCreatorDialog.tsx` — thin Dialog wrapper around `HCCreatorForm`; passes `showDatePicker=true`, omits `turnoId` (HCDR-02); `onSaved` callback closes dialog on successful save
- Updated `PatientDrawer.tsx` header layout to flex justify-between, added `+ Nueva HC` button visible from any tab when patient data is loaded (HCDR-01)
- Reuses shared `HCCreatorForm` component — same form component in both LiveTurno and PatientDrawer contexts (HCDR-01 — no duplication)
- DatePicker shows "Hoy" by default, allows past dates, blocks future dates (HCDR-03)

## Task Commits

1. **Task 1: Create HCCreatorDialog.tsx + wire button into PatientDrawer** - `e4f408d` (feat)
2. **Task 2: Human-verify checkpoint** - approved by user (visual verification of UI, dialog, DatePicker, and LiveTurno integration)

## Files Created/Modified
- `frontend/src/components/patient/PatientDrawer/views/HCCreatorDialog.tsx` — Dialog wrapper for HCCreatorForm with showDatePicker=true and no turnoId
- `frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx` — Added hcDialogOpen state, updated DrawerHeader layout, wired HCCreatorDialog

## Decisions Made
- turnoId is intentionally omitted from HCCreatorDialog props — HC entries from PatientDrawer context have no active turno (HCDR-02)
- `(paciente as any).profesionalId` cast consistent with existing usage of `obraSocialId` and `profesionalId` in `AutorizacionesPacienteSection` within the same file

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 3 HCDR requirements met (HCDR-01, HCDR-02, HCDR-03)
- Phase 27 fully complete — human-verify checkpoint confirmed
- Ready for Phase 28+ (parallel phases can proceed)

---
*Phase: 27-hc-integration-liveturno-patientdrawer*
*Completed: 2026-04-23*
