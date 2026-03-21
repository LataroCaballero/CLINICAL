---
phase: 14-emision-cae-real-wsfev1
plan: "04"
subsystem: api
tags: [nestjs, bullmq, afip, cae, finanzas, di]

# Dependency graph
requires:
  - phase: 14-02
    provides: AfipRealService with emitirComprobante (WSFEv1 SOAP + advisory lock + CAE persistence)
  - phase: 14-03
    provides: CaeEmissionProcessor BullMQ processor with AfipBusinessError → UnrecoverableError DLQ
  - phase: 13-02
    provides: WsaaModule with WSAA_SERVICE injection pattern

provides:
  - FinanzasModule wired with AFIP_SERVICE DI token (real vs stub via USE_AFIP_STUB env var)
  - BullMQ cae-emission queue registered in FinanzasModule
  - POST /finanzas/facturas/:id/emitir endpoint returning 202 with jobId
  - emitirFactura service method with pre-condition validation (owner, estado, condicionIVA, ConfiguracionAFIP)
  - Full end-to-end async CAE emission pipeline verified by human checkpoint (stub mode)

affects:
  - 15-qr-afip-pdf-frontend
  - 16-caea-contingency

# Tech tracking
tech-stack:
  added: []
  patterns:
    - AFIP_SERVICE useFactory DI swap via USE_AFIP_STUB env var (mirrors WSAA_SERVICE pattern from Phase 13)
    - Pre-condition validation before BullMQ enqueue to prevent retrying bad data (STATE.md Pitfall 2 and 6)
    - 202 Accepted + jobId pattern for async AFIP jobs (client polls GET /finanzas/facturas/:id for estado)

key-files:
  created: []
  modified:
    - backend/src/modules/finanzas/finanzas.module.ts
    - backend/src/modules/finanzas/finanzas.service.ts
    - backend/src/modules/finanzas/finanzas.controller.ts
    - backend/src/modules/finanzas/finanzas.service.spec.ts

key-decisions:
  - "AFIP_SERVICE useFactory in FinanzasModule routes to AfipRealService (USE_AFIP_STUB != 'true') or AfipStubService (USE_AFIP_STUB='true') — env toggle pattern mirrors WSAA_SERVICE from Phase 13"
  - "condicionIVAReceptor null check performed in emitirFactura before enqueue (not in processor) — prevents AFIP error 10242 from being retried 5 times with exponential backoff"
  - "ConfiguracionAFIP existence validated before setting EMISION_PENDIENTE — prevents orphaned estado if cert not uploaded"
  - "POST /finanzas/facturas/:id/emitir uses profesionalId as query param (not body) — consistent with existing GET endpoints; FACTURADOR has no Profesional record so explicit param required"

patterns-established:
  - "Pre-condition validation pattern: load entity → check estado → check required fields → check config → update estado → enqueue"
  - "202 Accepted response with { jobId, status } for async BullMQ operations"

requirements-completed: [CAE-02, CAE-03, CAE-04]

# Metrics
duration: 18min
completed: 2026-03-21
---

# Phase 14 Plan 04: FinanzasModule Wiring — AFIP_SERVICE DI Swap + Emission Endpoint Summary

**FinanzasModule wired with AFIP_SERVICE useFactory (real/stub toggle), BullMQ CAE queue, and POST /finanzas/facturas/:id/emitir returning 202 with pre-condition validation — human-verified end-to-end in stub mode, Phase 14 async CAE emission pipeline complete**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-21T00:00:00Z
- **Completed:** 2026-03-21T00:45:00Z
- **Tasks:** 4 (3 auto + 1 human-verify approved)
- **Files modified:** 4

## Accomplishments

- FinanzasModule rewired: imports WsaaModule, registers BullMQ cae-emission queue, provides AFIP_SERVICE via useFactory (routes to AfipRealService or AfipStubService based on USE_AFIP_STUB env var)
- `emitirFactura` service method added with full pre-condition validation: factura ownership, EMISION_PENDIENTE in-flight guard, condicionIVAReceptor null guard, ConfiguracionAFIP existence check
- POST `/finanzas/facturas/:id/emitir` endpoint added to controller returning HTTP 202 with `{ jobId, status: 'EMISION_PENDIENTE' }`
- 5 new unit tests for `emitirFactura` + CAE_QUEUE mock injection fix in finanzas.service.spec.ts — all 31 finanzas tests green
- Human checkpoint approved: stub mode confirmed working end-to-end (202 response, EMISION_PENDIENTE→EMITIDA transition, stub CAE value `74397704790943`, error path for missing ConfiguracionAFIP returning Spanish 400 message)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire FinanzasModule — AFIP_SERVICE swap, CAE queue, WsaaModule import** - `9738b41` (feat)
2. **Task 2: Add emitirFactura service method and POST /finanzas/facturas/:id/emitir endpoint** - `612bb17` (feat)
3. **Task 3: Run full test suite to verify no regressions** - `34491ea` (test)
4. **Task 4: Human verification of end-to-end async CAE emission pipeline** - approved (human checkpoint)

**Plan metadata:** (docs commit — see final commit hash)

## Files Created/Modified

- `backend/src/modules/finanzas/finanzas.module.ts` - Full rewire: WsaaModule import, BullModule.registerQueue(CAE_QUEUE), AFIP_SERVICE useFactory, CaeEmissionProcessor in providers; AfipStubService removed from exports
- `backend/src/modules/finanzas/finanzas.service.ts` - Added @InjectQueue(CAE_QUEUE) to constructor, CAE_QUEUE import, and emitirFactura method with pre-condition validation + BullMQ enqueue
- `backend/src/modules/finanzas/finanzas.controller.ts` - Added POST facturas/:id/emitir endpoint with @HttpCode(202); added HttpCode and BadRequestException to imports
- `backend/src/modules/finanzas/finanzas.service.spec.ts` - Added getQueueToken(CAE_QUEUE) mock provider, configuracionAFIP prisma mock, and 5 emitirFactura unit tests

## Decisions Made

- `condicionIVAReceptor` null check in `emitirFactura` (not in processor): prevents AFIP error 10242 from being retried 5 times with exponential backoff — aligns with STATE.md Pitfall 6
- `ConfiguracionAFIP` existence check before updating estado: prevents orphaned `EMISION_PENDIENTE` if the tenant never uploaded their cert
- Removed `AfipStubService` from module exports: consumers should inject via `AFIP_SERVICE` token, not directly

## Deviations from Plan

None — plan executed exactly as written. The test fixture update (adding CAE_QUEUE mock provider to finanzas.service.spec.ts) was anticipated in the plan's Task 3 action block.

## Issues Encountered

4 pre-existing test failures in usuarios.controller.spec.ts, diagnosticos.service.spec.ts, diagnosticos.controller.spec.ts, and reportes.controller.spec.ts — all fail due to JwtRolesGuard DI issues unrelated to this plan's changes. All 31 finanzas-module tests pass green.

## Next Phase Readiness

- Full async CAE emission pipeline assembled and human-verified end-to-end in stub mode
- Phase 15 (QR AFIP + PDF + Frontend) can proceed: GET /finanzas/facturas/:id returns cae, caeFchVto, nroComprobante, estado fields needed for QR generation
- Phase 16 (CAEA Contingency) blocked by gate: Phase 14 + production invoice validation required before CAEA work begins

---
*Phase: 14-emision-cae-real-wsfev1*
*Completed: 2026-03-21*

## Self-Check: PASSED

Files verified:
- `backend/src/modules/finanzas/finanzas.module.ts` — FOUND
- `backend/src/modules/finanzas/finanzas.service.ts` — FOUND
- `backend/src/modules/finanzas/finanzas.controller.ts` — FOUND
- `backend/src/modules/finanzas/finanzas.service.spec.ts` — FOUND

Commits verified:
- `9738b41` — FOUND (Task 1)
- `612bb17` — FOUND (Task 2)
- `34491ea` — FOUND (Task 3)

Key assertions:
- `grep -q "AFIP_SERVICE" finanzas.module.ts` — TRUE
- `grep -q "EMISION_PENDIENTE" finanzas.service.ts` — TRUE
- `grep -q "emitir" finanzas.controller.ts` — TRUE
