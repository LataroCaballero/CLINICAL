---
phase: 09-backend-api-layer
plan: "03"
subsystem: finanzas/afip
tags: [afip, stub, tdd, typescript-interfaces]
dependency_graph:
  requires: [09-01]
  provides: [AfipService interface, AfipStubService injectable]
  affects: [finanzas.module.ts]
tech_stack:
  added: []
  patterns: [implements-interface, injectable-stub, TDD-red-green]
key_files:
  created:
    - backend/src/modules/finanzas/afip/afip.interfaces.ts
    - backend/src/modules/finanzas/afip/afip-stub.service.ts
    - backend/src/modules/finanzas/afip/afip-stub.service.spec.ts
  modified:
    - backend/src/modules/finanzas/finanzas.module.ts
decisions:
  - "MOCK_CAE and MOCK_CAE_VENCIMIENTO defined as named constants — makes mock nature explicit and avoids inline magic strings"
  - "AfipStubService registered in both providers and exports of FinanzasModule — allows other modules to inject it for v1.2 swap-out"
  - "No controller endpoint added — emitirComprobante HTTP route belongs in 09-02 scope per plan notes"
metrics:
  duration: 1m 27s
  completed_date: "2026-03-13"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
requirements_fulfilled: [AFIP-02]
---

# Phase 9 Plan 03: AfipStubService AFIP Integration Contract Summary

**One-liner:** Typed AFIP stub service implementing AfipService interface with MOCK_CAE constants, injectable into FinanzasModule for v1.2 swap-out.

## What Was Built

- `afip/afip.interfaces.ts` — three TypeScript interface exports: `AfipService`, `EmitirComprobanteParams`, `EmitirComprobanteResult` matching AFIP-INTEGRATION.md Section 3 exactly
- `afip/afip-stub.service.ts` — `@Injectable()` class implementing `AfipService`, returns `MOCK_CAE='74397704790943'` and `resultado='A'` synchronously
- `afip/afip-stub.service.spec.ts` — 5 unit tests covering all contract points (all green)
- `finanzas.module.ts` — updated to include `AfipStubService` in both `providers` and `exports`

## TDD Cycle

**RED (Task 1):** Created `afip.interfaces.ts` and `afip-stub.service.spec.ts`. Tests failed with TS2307 (module not found) — confirmed RED state.

**GREEN (Task 2):** Created `afip-stub.service.ts` implementing the interface with named constants. All 5 tests pass. `npm run build` exits 0 (TypeScript validates `implements AfipService` at compile time).

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `afip/afip.interfaces.ts` exports `AfipService`, `EmitirComprobanteParams`, `EmitirComprobanteResult`
- [x] `afip/afip-stub.service.ts` `@Injectable` implements `AfipService` with `MOCK_CAE` constants
- [x] `afip/afip-stub.service.spec.ts` has 5 tests, all green
- [x] `finanzas.module.ts` lists `AfipStubService` in both `providers` and `exports`
- [x] `npm run build` exits 0
- [x] Our test suite (finanzas + afip-stub) all green; pre-existing failures in diagnosticos/usuarios/reportes.controller are out of scope
