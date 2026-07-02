---
phase: 45-formulario-primera-consulta
plan: "01"
subsystem: api
tags: [nestjs, prisma, historia-clinica, typescript, tdd, jsonb]

# Dependency graph
requires:
  - phase: 44-schema-catalogo-en-bd
    provides: ZonaHC/DiagnosticoHC/TratamientoHC models in DB schema
provides:
  - ZonaSeleccionInput interface and pure helpers for primera_vez content construction
  - construirContenidoPrimeraVez: builds JSONB grouped by zona or falls back to legacy shape
  - derivarPerfilPrimeraVez: derives diagnosticoStr/tratamientoStr from new or legacy input
  - ZonaSeleccionDto + zonas field in CreateEntradaDto (backwards compatible)
  - historia-clinica.service.ts wired to helpers instead of inline logic
affects: [45-02-frontend-form, 45-03-pdf-presupuesto]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure helper file pattern (*.contenido.helpers.ts) mirroring *.flujo.helpers.ts for testability"
    - "Dual-shape JSONB: zonas[] path for new form, legacy diagnostico/tratamientos fallback — no migration needed"
    - "TDD RED/GREEN: spec created with failing imports, then implementation makes all pass"

key-files:
  created:
    - backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts
    - backend/src/modules/historia-clinica/historia-clinica.contenido.spec.ts
  modified:
    - backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts
    - backend/src/modules/historia-clinica/historia-clinica.service.ts

key-decisions:
  - "zonas[] present and non-empty triggers new grouped JSONB shape; empty array [] treated as legacy (guards against accidental breakage)"
  - "Legacy diagnostico/tratamientos fields kept in DTO — LiveTurnoFooter draft path sends legacy shape and must not break"
  - "derivarPerfilPrimeraVez exactly replicates old inline service logic for legacy path — byte-compatible strings for paciente.diagnostico/tratamiento profile fields"

patterns-established:
  - "historia-clinica.contenido.helpers.ts: pure function helpers for JSONB content — no NestJS/Prisma deps, directly unit-testable"
  - "Dual-input helper pattern: same function handles both new and legacy shapes via zonas presence check"

requirements-completed: [FORM-03]

# Metrics
duration: 3min
completed: 2026-06-12
---

# Phase 45 Plan 01: Backend HC primera_vez agrupada por zona Summary

**Pure helpers construirContenidoPrimeraVez + derivarPerfilPrimeraVez enable zona-grouped JSONB persistence for primera_vez HC entries while preserving full legacy compatibility**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-12T22:45:08Z
- **Completed:** 2026-06-12T22:47:08Z
- **Tasks:** 2 (Task 1 TDD: RED + GREEN commits; Task 2: DTO + service)
- **Files modified:** 4

## Accomplishments
- Created `historia-clinica.contenido.helpers.ts` with two pure exported functions (ZonaSeleccionInput interface + construirContenidoPrimeraVez + derivarPerfilPrimeraVez) — zero NestJS/Prisma dependencies
- 11 unit tests covering new zonas path, legacy fallback, edge cases (empty array), and profile string derivation
- Service `crearEntrada` now delegates to helpers instead of 35 lines of inline logic; behavior is identical for legacy callers
- `ZonaSeleccionDto` + `zonas?: ZonaSeleccionDto[]` added to DTO — plan 45-02 frontend form can now POST grouped structure

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: failing spec** - `a7cb469` (test)
2. **Task 1 GREEN: helpers implementation** - `dc33adf` (feat)
3. **Task 2: DTO + service wiring** - `42190ca` (feat)

_Note: Task 1 was TDD — test commit followed by implementation commit_

## Files Created/Modified
- `backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts` - Pure helpers: ZonaSeleccionInput, construirContenidoPrimeraVez, derivarPerfilPrimeraVez
- `backend/src/modules/historia-clinica/historia-clinica.contenido.spec.ts` - 11 unit tests (6 for construct, 5 for derive)
- `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts` - Added ZonaSeleccionDto class + zonas field on CreateEntradaDto
- `backend/src/modules/historia-clinica/historia-clinica.service.ts` - Replaced inline primera_vez content/profile logic with helper calls + imported helpers

## Decisions Made
- Empty `zonas: []` array treated as legacy (not new path) — prevents accidental empty-zona entries triggering new JSONB shape
- Legacy fields kept in DTO unchanged — LiveTurnoFooter (auto-save draft) sends diagnostico/tratamientos and must continue working without modification
- derivarPerfilPrimeraVez legacy branch is byte-identical to old inline code — verified via tests replicating exact join behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend accepts `zonas[]` in POST /pacientes/:id/historia-clinica/entradas — plan 45-02 frontend can POST grouped structure
- Legacy draft auto-save path (LiveTurnoFooter) unchanged and tested
- FORM-03 requirement satisfied: HC entrada persists zona-grouped contenido JSONB

---
*Phase: 45-formulario-primera-consulta*
*Completed: 2026-06-12*
