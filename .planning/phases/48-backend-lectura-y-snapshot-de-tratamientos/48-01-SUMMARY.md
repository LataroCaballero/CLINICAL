---
phase: 48-backend-lectura-y-snapshot-de-tratamientos
plan: "01"
subsystem: backend
tags: [tdd, historia-clinica, turnos, extractor, read-path]
dependency_graph:
  requires: []
  provides: [resumirTratamientosDeContenido, per-turno-ultimoTratamiento]
  affects: [turnos.service.ts, historia-clinica.contenido.helpers.ts]
tech_stack:
  added: []
  patterns: [pure-helper, tdd-red-green, resumen-con-conteo]
key_files:
  created:
    - backend/src/modules/historia-clinica/historia-clinica.contenido.spec.ts (14 new tests for resumirTratamientosDeContenido)
  modified:
    - backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts (added resumirTratamientosDeContenido + formatearResumen)
    - backend/src/modules/turnos/turnos.service.ts (per-turno resolution, removed historiaClinica.findMany)
decisions:
  - "resumen-con-conteo: single name → name; N names → first +N-1 (uniform across all 3 shapes)"
  - "TEXTO_LIMITE=80 constant for free-text truncation with ellipsis"
  - "formatearResumen extracted as private function to avoid duplication across shape branches"
  - "contenido: true added to entradaHC select — no extra query, reuses existing relation"
metrics:
  duration: "~3 minutes"
  completed_date: "2026-06-22"
  tasks: 2
  files_modified: 3
---

# Phase 48 Plan 01: Extractor puro y resolución por-turno de ultimoTratamiento Summary

Pure extractor `resumirTratamientosDeContenido` normalizing all 3 HC content shapes to string|null, integrated into `obtenerTurnosPorRango` for per-turno resolution replacing a global per-patient N+1 query.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extractor puro resumirTratamientosDeContenido (RED→GREEN) | 017ab23 | historia-clinica.contenido.helpers.ts, historia-clinica.contenido.spec.ts |
| 2 | Integrar resolución por-turno en obtenerTurnosPorRango | 80ffda8 | turnos.service.ts |

## What Was Built

### Task 1: Extractor puro (TDD RED→GREEN)

Added `resumirTratamientosDeContenido(contenido: unknown): string | null` to `historia-clinica.contenido.helpers.ts`. The function normalizes the three HC content shapes:

1. **v1.9 zona-grouped** (`contenido.zonas[]`): flattens treatments across all zones, applies resumen-con-conteo.
2. **Legacy flat** (`contenido.tratamientos[]`): applies resumen-con-conteo directly.
3. **Free-text / consultorio** (`contenido.texto`): returns catalog names if any (via `tratamientos[]`), else falls back to `texto` truncated at 80 chars with ellipsis.

Resumen-con-conteo rule: 1 name → name; N names → `"${first} +${N-1}"`. Names that are empty/whitespace are filtered out; if zero valid names remain, returns null.

14 new tests added covering all shapes, edge cases (null/undefined/empty arrays/invalid names), and free-text truncation. All 25 tests pass (11 pre-existing + 14 new).

### Task 2: Per-turno integration

In `obtenerTurnosPorRango`:
- Added `contenido: true` to the `entradaHC` select (no new query).
- Removed `historiaClinica.findMany` separate query and `ultimoTratamientoMap` (eliminates N+1 pattern).
- Removed `pacienteIds` (no longer needed).
- Each turno now resolves `ultimoTratamiento: resumirTratamientosDeContenido(entradaHC?.contenido ?? null)`.
- Output contract (`ultimoTratamiento: string | null`, `tipoEntradaHC`) unchanged — frontend untouched.

## Verification

- `npm test -- historia-clinica.contenido.spec.ts`: 25/25 PASS
- `npx tsc --noEmit -p tsconfig.build.json`: no errors
- `npm run lint -- src/modules/turnos/turnos.service.ts src/modules/historia-clinica/historia-clinica.contenido.helpers.ts`: no errors in modified files
- Manual inspection: no `historiaClinica.findMany`, `ultimoTratamientoMap`, or orphaned `pacienteIds` in `turnos.service.ts`; `entradaHC.select` includes `contenido: true`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts` — exists, contains `resumirTratamientosDeContenido`
- [x] `backend/src/modules/historia-clinica/historia-clinica.contenido.spec.ts` — exists, contains 25 passing tests
- [x] `backend/src/modules/turnos/turnos.service.ts` — modified, imports and uses extractor
- [x] Commit 017ab23 — feat(48-01): add resumirTratamientosDeContenido pure extractor (RED→GREEN)
- [x] Commit 80ffda8 — feat(48-01): integrate per-turno ultimoTratamiento resolution in obtenerTurnosPorRango
