---
phase: 57-backend-foundation-etapa-y-payload-enriquecido
plan: "01"
subsystem: backend/pacientes
tags: [crm, kanban, stepper, payload, tdd]
dependency_graph:
  requires: []
  provides:
    - computePasosCrm pure helper (crm-steps.helper.ts)
    - getKanban enriched payload with pasos + todosCompletos
    - PROCEDIMIENTO_REALIZADO kanban column (EMBUDO-02)
  affects:
    - GET /pacientes/kanban response shape (adds pasos, todosCompletos per patient)
    - frontend phases 58 (indicators/columns) and 59 (stepper/quick-actions) as consumers
tech_stack:
  added: []
  patterns:
    - Pure helper module (export function, no @Injectable) — same pattern as historia-clinica.contenido.helpers.ts
    - TDD RED/GREEN cycle for pure business-logic helpers
key_files:
  created:
    - backend/src/modules/pacientes/crm-steps.helper.ts
    - backend/src/modules/pacientes/crm-steps.helper.spec.ts
  modified:
    - backend/src/modules/pacientes/pacientes.service.ts
decisions:
  - "Paso 'hc' requires both FINALIZED status AND tipoEntrada CONSULTA_CIRUGIA (not just FINALIZED) — aligns with plan behavior specification"
  - "Paso 'cirugia' uses cirugias.length > 0 (any Cirugia record), not estado filter — fecha is required in model so any record signals a scheduled surgery (D-07)"
  - "Spread computePasosCrm result into per-patient map object to keep pasos and todosCompletos as top-level keys alongside existing keys"
  - "select consentimientosFirmados with take:1 orderBy firmadoAt desc — one signed consent is enough to prove steps 4 and 5 are complete"
metrics:
  duration: "~10 min"
  completed_date: "2026-07-04"
  tasks_completed: 2
  files_modified: 3
---

# Phase 57 Plan 01: Backend Foundation - Etapa y Payload Enriquecido Summary

**One-liner:** Pure `computePasosCrm` helper with TDD and enriched `getKanban` payload exposing 5 step-states + `todosCompletos` per patient, plus `PROCEDIMIENTO_REALIZADO` as its own kanban column.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for computePasosCrm | b53d326 | crm-steps.helper.spec.ts |
| 1 (GREEN) | computePasosCrm pure helper implementation | b872079 | crm-steps.helper.ts |
| 2 | Integrate computePasosCrm + PROCEDIMIENTO_REALIZADO in getKanban | e7d0c26 | pacientes.service.ts |

## What Was Built

### `crm-steps.helper.ts`
Pure helper function `computePasosCrm(p: PacientePasosInput)` that derives the 5 CRM stepper step states and `todosCompletos` flag:

- **hc**: FINALIZED HistoriaClinicaEntrada with tipoEntrada === CONSULTA_CIRUGIA
- **presupuesto**: any Presupuesto with estado ENVIADO or ACEPTADO
- **cirugia**: any Cirugia record exists (fecha is required in model)
- **consentimiento**: ConsentimientoFirmado.firmadoAt present (v1.12 primary) OR legacy `consentimientoFirmado` boolean
- **indicacionesPreop**: ConsentimientoFirmado.indicacionesLeidasAt present (v1.12 primary) OR legacy `indicacionesEnviadas` boolean

### `crm-steps.helper.spec.ts`
26 unit tests covering all 5 step rules, todosCompletos (all-complete and one-pendiente cases), and null/undefined robustness.

### `pacientes.service.ts` — `getKanban` extensions
1. **Select enriched** with: `consentimientoFirmado`, `indicacionesEnviadas`, `cirugias` (fecha + estado), `historiasClinicas` (entradas status + tipoEntrada), `consentimientosFirmados` (firmadoAt + indicacionesLeidasAt, take:1 latest)
2. **`PROCEDIMIENTO_REALIZADO` column** added to `columnas` map (between CONFIRMADO and PERDIDO) — patients no longer fall to SIN_CLASIFICAR (EMBUDO-02)
3. **`pasos` + `todosCompletos`** spread into per-patient payload via `computePasosCrm`

## Deviations from Plan

None — plan executed exactly as written.

## TDD Gate Compliance

- RED gate: commit `b53d326` — `test(57-01): add failing tests for computePasosCrm (RED)`
- GREEN gate: commit `b872079` — `feat(57-01): implement computePasosCrm pure helper (GREEN)`
- Both gates present in correct order.

## Security Review (Threat Model)

**T-57-01-I (Information Disclosure):** The `consentimientosFirmados` select explicitly includes only `firmadoAt` and `indicacionesLeidasAt` (timestamps). Fields `pdfFirmadoPath`, `hashSha256`, `ip`, and `userAgent` are NOT selected — verified by grep returning no results.

**T-57-02-I (payload pasos):** Payload exposes only `'completo'|'pendiente'` strings, not raw clinical data — minimal surface.

## Known Stubs

None. The helper computes real step-states from real Prisma relations. No hardcoded values or placeholder text.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. The getKanban enrichment stays within the existing `where: { profesionalId, crmArchivado: false }` scope.

## Self-Check: PASSED

- FOUND: backend/src/modules/pacientes/crm-steps.helper.ts
- FOUND: backend/src/modules/pacientes/crm-steps.helper.spec.ts
- FOUND: commit b53d326 (RED)
- FOUND: commit b872079 (GREEN)
- FOUND: commit e7d0c26 (getKanban integration)
