---
phase: 14-emision-cae-real-wsfev1
plan: 02
subsystem: api
tags: [afip, soap, wsfev1, cae, nestjs, prisma, advisory-lock, bullmq]

# Dependency graph
requires:
  - phase: 14-01
    provides: AFIP_SERVICE DI token, EMISION_PENDIENTE enum, xit spec scaffolds
  - phase: 13-wsaa-token-service
    provides: WSAA_SERVICE injection pattern, WsaaServiceInterface, AccessTicket

provides:
  - AfipRealService: WSFEv1 SOAP implementation of AfipService interface
  - AfipBusinessError: permanent AFIP rejection error with Spanish translation
  - AfipTransientError: network/timeout AFIP error for BullMQ retry
  - AFIP_TRANSLATIONS map: error codes 10242, 10243, 10016, 10040 → Spanish
  - translateAfipErrors(): AFIP message string → human-readable Spanish
  - 6 unit tests covering CAE-02 (SOAP call, advisory lock, sequence, persistence) and CAE-03 (error translation)

affects:
  - 14-03 (CaeEmissionProcessor uses AfipBusinessError → UnrecoverableError pattern)
  - 15-qr-afip (AfipRealService result feeds QR generation)
  - 16-caea (same SOAP+advisory-lock pattern for CAEA fallback)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WSFEv1 raw SOAP via axios.post with text/xml content-type and timeout 30_000"
    - "pg_advisory_xact_lock(hashtext(cuit:ptoVta:cbteTipo)) inside prisma.$transaction({ timeout: 45000 }) for CAE sequencing"
    - "AfipBusinessError (permanent) vs AfipTransientError (retryable) error type split for BullMQ DLQ routing"
    - "EmitirComprobanteRealParams extends base params with profesionalId, facturaId, condicionIVAReceptorId, fecha"

key-files:
  created:
    - backend/src/modules/finanzas/afip/afip.errors.ts
    - backend/src/modules/finanzas/afip/afip-real.service.ts
  modified:
    - backend/src/modules/finanzas/afip/afip-real.service.spec.ts

key-decisions:
  - "SOAP namespace prefix ar: used in FECAESolicitar envelope — test assertions must use <ar:CbteDesde> not <CbteDesde>"
  - "callFECAESolicitar catches axios errors and re-throws as AfipTransientError; AfipBusinessError from resultado=R is thrown from emitirComprobante after parsing, not from within callFECAESolicitar try/catch"
  - "configuracionAFIP.findUniqueOrThrow called before prisma.$transaction — cfg.cuit/ptoVta needed for both URL selection and lock key"
  - "IVA alicuota ID 5 (21%) hard-coded for Phase 14 homologacion — production IVA matrix is documented tech debt"

patterns-established:
  - "SOAP XML building: template literals with ar: namespace prefix matching AFIP WSDL"
  - "XML parsing: lightweight regex matching on response string instead of full XML parser"
  - "Error class pattern: spanishMessage public field for direct display to Facturador without additional translation"

requirements-completed: [CAE-02, CAE-03]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 14 Plan 02: AfipRealService Summary

**WSFEv1 CAE emission via raw SOAP+axios with pg_advisory_xact_lock serialization, AfipBusinessError/AfipTransientError error split, and 6 passing unit tests covering sequence numbering, advisory lock, Factura persistence, and Spanish error translation for AFIP code 10242**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-21T00:03:43Z
- **Completed:** 2026-03-21T00:06:43Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- AfipRealService implements AfipService with full WSFEv1 SOAP integration: FECompUltimoAutorizado for sequence number + FECAESolicitar for CAE emission, wrapped in prisma.$transaction({ timeout: 45000 }) with pg_advisory_xact_lock
- AfipBusinessError and AfipTransientError split enables BullMQ processor to route permanent rejections (resultado=R, error 10242) to DLQ immediately while retrying transient network failures with exponential backoff
- 6 xit stubs converted to passing it tests; all 11 afip tests (stub + real) passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AfipBusinessError, AfipTransientError, and AFIP_TRANSLATIONS map** - `96952d6` (feat)
2. **Task 2: Implement AfipRealService + 6 passing unit tests** - `48548f9` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `backend/src/modules/finanzas/afip/afip.errors.ts` - AfipBusinessError, AfipTransientError, AFIP_TRANSLATIONS map, translateAfipErrors function
- `backend/src/modules/finanzas/afip/afip-real.service.ts` - WSFEv1 SOAP implementation of AfipService; emitirComprobante with advisory lock and transaction; private SOAP helper methods
- `backend/src/modules/finanzas/afip/afip-real.service.spec.ts` - 6 xit stubs converted to passing it tests with axios mock and PrismaService mock

## Decisions Made

- SOAP namespace prefix `ar:` used throughout FECAESolicitar envelope (matches AFIP WSDL) — test assertion fixed to use `<ar:CbteDesde>43</ar:CbteDesde>` not bare `<CbteDesde>` (discovered during RED phase)
- `configuracionAFIP.findUniqueOrThrow` called outside `$transaction` — cfg needed for both WSAA URL and advisory lock key before transaction opens
- `callFECAESolicitar` re-throws only `AfipTransientError` from axios catch; the `resultado='R'` business error is checked and thrown from `emitirComprobante` after successful HTTP response
- IVA alicuota ID 5 (21%) hard-coded per plan spec — documented as tech debt for production IVA matrix validation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertion used wrong XML namespace prefix**
- **Found during:** Task 2 (GREEN phase, first test run)
- **Issue:** Test expected `<CbteDesde>43</CbteDesde>` but service generates `<ar:CbteDesde>43</ar:CbteDesde>` per WSDL namespace
- **Fix:** Updated spec assertion to `<ar:CbteDesde>43</ar:CbteDesde>`
- **Files modified:** afip-real.service.spec.ts
- **Verification:** 6/6 tests pass after fix
- **Committed in:** `48548f9` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug in test assertion)
**Impact on plan:** Minor — namespace prefix in test assertion. No behavioral change to service implementation.

## Issues Encountered

None beyond the test assertion namespace prefix fix documented above.

## Next Phase Readiness

- AfipRealService ready to be injected by CaeEmissionProcessor (Plan 14-03)
- AfipBusinessError → UnrecoverableError pattern established for Plan 14-03
- Both error classes exported from afip.errors.ts for processor import
- All success criteria from Plan 02 met: 6 tests green, pg_advisory_xact_lock present, timeout: 45000 present

---
*Phase: 14-emision-cae-real-wsfev1*
*Completed: 2026-03-21*
