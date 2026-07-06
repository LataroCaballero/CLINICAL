---
phase: 27-hc-integration-liveturno-patientdrawer
plan: 02
subsystem: ui
tags: [react, shadcn, combobox, historia-clinica, tratamientos, sonner, tanstack-query]

# Dependency graph
requires:
  - phase: 27-01
    provides: OrdenConsumo schema + HC backend endpoint that accepts tratamientoIds and consumirInsumos
  - phase: 26-tratamientos-tab
    provides: TratamientoConInsumos type + useTratamientosProfesional hook + InsumosEditor Combobox pattern
provides:
  - HCCreatorForm autonomous reusable component for creating HC entries (no useLiveTurnoStore dependency)
  - HistoriaClinicaTab refactored as thin wrapper using HCCreatorForm
  - "Tratamiento en Consultorio" entry type with catalog multi-select combobox + pills + insumos checkbox
affects: [27-03-patientdrawer, future-hc-flows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Autonomous form component: receives all context via props, no store imports"
    - "Combobox multi-select: Popover + Command + CommandItem with check indicator"
    - "Conditional UI: insumos checkbox only when anyHasInsumos; free text behind toggle link"
    - "Toast branching: 'HC guardada. Orden de consumo creada.' vs 'HC guardada.' based on consumirInsumos"

key-files:
  created:
    - frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx
  modified:
    - frontend/src/hooks/useCreateHistoriaClinicaEntry.ts
    - frontend/src/components/live-turno/tabs/HistoriaClinicaTab.tsx

key-decisions:
  - "HCCreatorForm is autonomous — receives pacienteId, profesionalId, turnoId?, obraSocialId?, showDatePicker?, onSaved? via props; does not import useLiveTurnoStore"
  - "HistoriaClinicaTab passes session.turnoId to HCCreatorForm so backend can link entry to appointment"
  - "consumirInsumos checkbox only shown when at least one selected tratamiento has insumos (anyHasInsumos guard)"
  - "Free text textarea collapsed by default for tratamiento_en_consultorio, opened via toggle link"
  - "obraSocialId null coercion: pacienteData?.obraSocialId ?? undefined to satisfy string | undefined prop type"

patterns-established:
  - "Autonomous form pattern: extract all store reads to parent wrapper, pass everything as props to reusable component"
  - "Combobox multi-select: use CommandItem onSelect + local state toggle; check indicator via className conditional"

requirements-completed: [LIVHC-01, LIVHC-02, LIVHC-03, LIVHC-04, LIVHC-05]

# Metrics
duration: 15min
completed: 2026-04-23
---

# Phase 27 Plan 02: HC Creator Form Summary

**Reusable HCCreatorForm component with "Tratamiento en Consultorio" multi-select combobox, conditional insumos checkbox, collapsed free-text toggle, and HistoriaClinicaTab refactored to thin wrapper**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-23T21:25:00Z
- **Completed:** 2026-04-23T21:40:44Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Extended `TipoEntrada` union with `'tratamiento_en_consultorio'` and added `tratamientoIds?`, `consumirInsumos?`, `turnoId?` to `CreateEntradaDto`
- Created `HCCreatorForm.tsx` — autonomous form with type selector, PrimeraConsultaForm integration, tratamiento_en_consultorio combobox + pills, insumos checkbox, free-text toggle, DatePicker, and GenerarPresupuestoModal
- Refactored `HistoriaClinicaTab.tsx` from 251-line monolith to 44-line thin wrapper that passes LiveTurno session data to HCCreatorForm

## Task Commits

Each task was committed atomically:

1. **Task 1: Update TipoEntrada union + CreateEntradaDto** - `ed595f1` (feat)
2. **Task 2: Create HCCreatorForm + refactor HistoriaClinicaTab** - `e9a777f` (feat)

## Files Created/Modified
- `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` - Added `tratamiento_en_consultorio` to TipoEntrada; added tratamientoIds?, consumirInsumos?, turnoId? to CreateEntradaDto
- `frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` - New autonomous reusable HC entry creator; all HC form logic extracted here
- `frontend/src/components/live-turno/tabs/HistoriaClinicaTab.tsx` - Thin wrapper: reads useLiveTurnoStore session, renders HCCreatorForm + HistorialClinicoPanel

## Decisions Made
- HCCreatorForm is completely autonomous (no store imports) — enables reuse from PatientDrawer in Plan 27-03
- turnoId is optional prop — undefined means call from PatientDrawer context, present means LiveTurno context
- anyHasInsumos guard prevents showing the checkbox when no selected treatment has linked insumos
- Free text for `tratamiento_en_consultorio` uses toggle link pattern ("+ Agregar notas libres") vs always-visible textarea for other types
- `obraSocialId ?? undefined` null coercion in wrapper to satisfy TypeScript strict typing on prop

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed null/undefined type mismatch for obraSocialId**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `pacienteData?.obraSocialId` is `string | null | undefined` but HCCreatorFormProps.obraSocialId expects `string | undefined`
- **Fix:** Used `?? undefined` coercion in HistoriaClinicaTab wrapper
- **Files modified:** frontend/src/components/live-turno/tabs/HistoriaClinicaTab.tsx
- **Verification:** `npx tsc --noEmit` passes with no errors
- **Committed in:** e9a777f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 type bug)
**Impact on plan:** Minimal — null coercion is standard TypeScript practice. No scope creep.

## Issues Encountered
None beyond the obraSocialId type fix above.

## Next Phase Readiness
- HCCreatorForm is ready for Plan 27-03 (PatientDrawer integration): pass `showDatePicker={true}` and omit `turnoId` for the drawer use case
- All LIVHC requirements satisfied (LIVHC-01 through LIVHC-05)
- Backend from Plan 27-01 handles the new dto fields (tratamientoIds, consumirInsumos, turnoId)

---
*Phase: 27-hc-integration-liveturno-patientdrawer*
*Completed: 2026-04-23*
