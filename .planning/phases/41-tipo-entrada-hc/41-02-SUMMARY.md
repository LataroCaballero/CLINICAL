---
phase: 41-tipo-entrada-hc
plan: "02"
subsystem: ui
tags: [react, typescript, shadcn, historia-clinica, tipoEntrada]

# Dependency graph
requires:
  - phase: 41-01
    provides: "backend enum TipoEntradaHC + tipoEntrada field in HistoriaClinicaEntrada + flujo transition logic in crearEntrada"
provides:
  - "TipoEntradaHCValue alias exported from useCreateHistoriaClinicaEntry hook"
  - "HCCreatorForm with mandatory 'Tipo de consulta' Select (5 options), auto-derived from plantilla and editable"
  - "tipoEntrada payload sent in all 3 handleSave branches"
affects: [42-estado-dual, 43-archivar-crm]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PLANTILLA_TO_TIPO_ENTRADA mapping: derive clinical type from UX plantilla selection, always user-overridable"
    - "Module-level constants for select options + mapping keep component body clean"

key-files:
  created: []
  modified:
    - frontend/src/hooks/useCreateHistoriaClinicaEntry.ts
    - frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx

key-decisions:
  - "tipoEntrada field is optional in CreateEntradaDto (backend enforces via @IsOptional); UI enforces via canSave guard"
  - "TipoEntradaHCValue alias = NonNullable<CreateEntradaDto['tipoEntrada']> avoids duplicating the union literal"
  - "Selector appears only after a plantilla is chosen (tipoSeleccionado !== null) — avoids confusion before template selection"

patterns-established:
  - "Auto-derivation pattern: onClick sets both plantilla state AND derived clinical state, leaving derived state editable"

requirements-completed: [HC-02]

# Metrics
duration: 3min
completed: 2026-06-08
status: checkpoint — awaiting human verification (Task 3)
---

# Phase 41 Plan 02: Frontend TipoEntrada HC Selector Summary

**shadcn Select for 'Tipo de consulta' in HCCreatorForm: 5 options auto-derived from plantilla button, editable, mandatory, payload sent to crearEntrada via tipoEntrada field**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-08T18:04:10Z
- **Completed:** 2026-06-08T18:06:25Z (Tasks 1-2; Task 3 = checkpoint)
- **Tasks:** 2/3 complete (Task 3 = human-verify checkpoint)
- **Files modified:** 2

## Accomplishments
- `CreateEntradaDto.tipoEntrada` added with 5 enum values and `TipoEntradaHCValue` alias exported for form reuse
- `HCCreatorForm` renders mandatory "Tipo de consulta" Select after plantilla is chosen, pre-populated via `PLANTILLA_TO_TIPO_ENTRADA` mapping and manually overridable
- `canSave` requires `tipoEntradaHC !== null`; all 3 `handleSave` branches send `tipoEntrada` in the dto; reset clears the field

## Task Commits

1. **Task 1: tipoEntrada en el hook CreateEntradaDto** - `b52dc2a` (feat)
2. **Task 2: Selector 'Tipo de consulta' con auto-derivacion en HCCreatorForm** - `cb3ab0c` (feat)
3. **Task 3: Checkpoint — verificacion end-to-end** — PENDING (human-verify)

## Files Created/Modified
- `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` — Added `tipoEntrada?` to `CreateEntradaDto`; exported `TipoEntradaHCValue` alias
- `frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` — Import TipoEntradaHCValue + Select; added TIPO_ENTRADA_OPTIONS + PLANTILLA_TO_TIPO_ENTRADA constants; tipoEntradaHC state; auto-derivation in onClick; selector render block; canSave guard; payload in all 3 handleSave branches; reset on save

## Decisions Made
- `tipoEntrada` is optional in the DTO type (`?:`) — canSave in the UI enforces selection before the user can save, providing the same guarantee without breaking the backend's @IsOptional design from Plan 01
- The selector appears below the plantilla buttons but above the form area, so the user always sees it before filling in content
- PLANTILLA_TO_TIPO_ENTRADA maps `libre` and `practica` to `CONTROL` as a safe default (per context spec)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing lint errors across unrelated files (AlertsWidget, QuickAppointment, etc.) — out of scope, logged to deferred-items. Modified files (hook + HCCreatorForm) pass lint with zero errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Frontend form ready to test end-to-end with backend (Plan 01) once checkpoint is approved
- Upon checkpoint approval: plan complete, HC-02 satisfied, Phase 42 (TratamientosTab + dual state) can begin

---
*Phase: 41-tipo-entrada-hc*
*Completed: 2026-06-08 (Tasks 1-2; checkpoint pending)*
