---
phase: 16-caea-contingency-mode
plan: "03"
subsystem: finanzas/afip
tags: [caea, bullmq, soap, tdd, afip, contingency]
dependency_graph:
  requires: [16-01, 16-02]
  provides: [CAEA-03]
  affects: [finanzas.module, caea.service, processors]
tech_stack:
  added: []
  patterns: [TDD red-green-refactor, BullMQ fixed-delay retry, SOAP XML envelope, USE_AFIP_STUB bypass]
key_files:
  created:
    - backend/src/modules/finanzas/processors/caea-informar.processor.ts
    - backend/src/modules/finanzas/processors/caea-informar.processor.spec.ts
  modified:
    - backend/src/modules/finanzas/afip/caea.service.ts
    - backend/src/modules/finanzas/afip/caea.service.spec.ts
    - backend/src/modules/finanzas/finanzas.module.ts
decisions:
  - "cbteTipo derived from condicionIVAReceptor (RESPONSABLE_INSCRIPTO=A=1, all others=B=6) since TipoFactura enum only has FACTURA/RECIBO, not A/B sub-type"
  - "USE_AFIP_STUB bypass in solicitarYPersistir upserts stub CAEA '00000000000001' with computed period dates — skips SOAP entirely"
  - "CAEA_INFORMAR_QUEUE injected into CaeaService via @InjectQueue — enqueue happens in asignarCaeaFallback after successful factura update"
  - "CaeaInformarProcessor.onFailed is synchronous (not async) — no CAEA chaining needed unlike CaeEmissionProcessor"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-30"
  tasks_completed: 2
  files_changed: 5
---

# Phase 16 Plan 03: CaeaInformarProcessor + CaeaService.informarFactura + FinanzasModule Wiring Summary

**One-liner:** FECAEARegInformativo SOAP implementation with 72-retry BullMQ processor (8 days, fixed 160min delay), wired into FinanzasModule with USE_AFIP_STUB bypass.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CaeaService.informarFactura + CaeaInformarProcessor (TDD) | 6e979bc | caea.service.ts, caea.service.spec.ts, caea-informar.processor.ts, caea-informar.processor.spec.ts |
| 2 | FinanzasModule wiring + AfipStubService CAEA path | 02facb6 | finanzas.module.ts, caea.service.ts (stub bypass) |

## What Was Built

### CaeaService.informarFactura() (full implementation)

Replaces the Plan 01 stub shell. Calls `FECAEARegInformativo` SOAP endpoint:
- Fetches WSAA ticket, ConfiguracionAFIP, and Factura fields from DB
- Builds SOAP envelope via `buildFECAEARegInformativoEnvelope()` (private method following RESEARCH.md Pattern 3)
- `Resultado=A` → updates Factura estado to `EMITIDA`
- `Resultado=R` → throws `AfipBusinessError` (processor wraps as `UnrecoverableError`)
- Network/timeout errors → throws `AfipTransientError` for BullMQ retry

### CaeaInformarProcessor

BullMQ processor for `caea-informar` queue:
- Wraps `AfipBusinessError` → `UnrecoverableError` (permanent failure, no retry)
- Lets `AfipTransientError` propagate for BullMQ 72-retry fixed-delay backoff
- Enqueue config: `{ attempts: 72, backoff: { type: 'fixed', delay: 9_600_000 } }` (72 × 160min ≈ 8 days)
- `CAEA_INFORMAR_QUEUE = 'caea-informar'` exported constant

### CaeaService.asignarCaeaFallback() — enqueue wiring

After successfully setting Factura to `CAEA_PENDIENTE_INFORMAR`, enqueues the inform job with 72 retries.

### USE_AFIP_STUB bypass in solicitarYPersistir()

When `USE_AFIP_STUB=true`, skips SOAP entirely and upserts deterministic stub CAEA `00000000000001` with computed period dates (fchVigDesde/fchVigHasta from periodo + orden, fchTopeInf = +8 days from fchVigHasta).

### FinanzasModule

Added:
- `BullModule.registerQueue({ name: CAEA_INFORMAR_QUEUE })`
- `CaeaService`, `CaeaPrefetchScheduler`, `CaeaInformarProcessor` in providers

## Test Results

All 25 CAEA tests pass across 4 test suites:

```
PASS src/modules/finanzas/afip/caea.service.spec.ts          (6 tests)
PASS src/modules/finanzas/processors/caea-informar.processor.spec.ts (4 tests)
PASS src/modules/finanzas/schedulers/caea-prefetch.scheduler.spec.ts (10 tests)
PASS src/modules/finanzas/processors/cae-emission.processor.spec.ts  (5 tests)
Tests: 25 passed, 25 total
```

New tests added:
- Test 4: informarFactura Resultado=A → factura.update with estado EMITIDA
- Test 5: informarFactura Resultado=R → throws AfipBusinessError
- Test 1-3: CaeaInformarProcessor process() — happy path, business error, transient error
- CAEA_INFORMAR_QUEUE constant export check

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TipoFactura enum mismatch for cbteTipo derivation**
- **Found during:** Task 1 GREEN phase
- **Issue:** Plan specified `factura.tipo === 'FACTURA_A' ? 1 : 6` but schema `TipoFactura` enum only has `FACTURA` and `RECIBO` (no A/B sub-type). TypeScript error TS2367.
- **Fix:** Derived `cbteTipo` from `condicionIVAReceptor` instead — `RESPONSABLE_INSCRIPTO` → A=1 (per AFIP rules), all others → B=6. This is semantically correct since AFIP requires Factura A for registered taxpayers.
- **Files modified:** backend/src/modules/finanzas/afip/caea.service.ts
- **Commit:** 6e979bc

## Key Decisions Made

1. **cbteTipo from condicionIVAReceptor:** Since `TipoFactura` only tracks FACTURA/RECIBO (not A/B), derived the AFIP comprobante type from the receptor's IVA condition — the correct AFIP rule in practice.

2. **Queue injection in unit tests:** `CaeaService` constructor now takes 4 args including `@InjectQueue`. Unit tests pass a mock queue object `{ add: jest.fn() }` as the 4th argument.

3. **CaeaInformarProcessor.onFailed synchronous:** Unlike CaeEmissionProcessor (which calls CAEA fallback from onFailed), this processor's onFailed only logs — no chaining needed.

## Self-Check: PASSED

All created files found:
- FOUND: backend/src/modules/finanzas/processors/caea-informar.processor.ts
- FOUND: backend/src/modules/finanzas/processors/caea-informar.processor.spec.ts
- FOUND: .planning/phases/16-caea-contingency-mode/16-03-SUMMARY.md

Commits verified:
- 6e979bc: feat(16-03): CaeaService.informarFactura + CaeaInformarProcessor (TDD)
- 02facb6: feat(16-03): FinanzasModule wiring + USE_AFIP_STUB bypass in CaeaService

25/25 CAEA tests passing. Backend build clean (0 TS errors).
