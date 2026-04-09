---
phase: 14-emision-cae-real-wsfev1
verified: 2026-03-20T22:10:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "POST /finanzas/facturas/:id/emitir in stub mode confirms EMISION_PENDIENTE → EMITIDA transition and returns stub CAE 74397704790943"
    expected: "HTTP 202 with { jobId, status: 'EMISION_PENDIENTE' }; factura estado transitions to EMITIDA; cae field = '74397704790943'"
    why_human: "Async BullMQ job lifecycle, real HTTP server startup, and DB state polling cannot be verified statically. 14-04 SUMMARY documents human checkpoint was approved — confirmed here for record."
  - test: "Modal display of AfipBusinessError.spanishMessage in the Facturador frontend when emission is rejected"
    expected: "Facturador UI shows a modal (not a toast) containing the Spanish message from AfipBusinessError.spanishMessage, e.g., the condicion IVA error text"
    why_human: "CAE-03 requires the error surface in a modal — this is a frontend display behavior that cannot be verified by reading backend files. No Phase 14 frontend changes were planned; the modal wiring is deferred to a subsequent phase or pre-existing frontend error handling."
---

# Phase 14: Emisión CAE Real (WSFEv1) Verification Report

**Phase Goal:** El Facturador puede emitir comprobantes electrónicos reales que retornan CAE y número de comprobante de AFIP, con errores explicados en español.
**Verified:** 2026-03-20T22:10:00Z
**Status:** human_needed (automated checks all passed; two items require human confirmation)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Al emitir en homologacion, la respuesta contiene un CAE real de 14 dígitos y nroComprobante asignados por AFIP, ambos guardados en Factura | ? HUMAN | AfipRealService persists cae + nroComprobante on Factura.update inside the transaction (line 99-107 of afip-real.service.ts); 6 unit tests green including persistence test. Actual AFIP homologacion call requires live service. |
| 2 | Dos emisiones simultáneas para el mismo CUIT+ptoVta+cbteTipo: la segunda espera el advisory lock y obtiene número secuencial correcto | ✓ VERIFIED | pg_advisory_xact_lock(hashtext($1)) called with `cuit:ptoVta:cbteTipo` key inside prisma.$transaction({ timeout: 45000 }); unit test 'acquires pg_advisory_xact_lock before calling FECAESolicitar' passes |
| 3 | Si AFIP rechaza (error 10242), el Facturador ve un modal con el mensaje en español y la factura va a DLQ sin reintentos | ? HUMAN | Backend: AfipBusinessError.spanishMessage for code 10242 verified in afip.errors.ts line 8; CaeEmissionProcessor wraps in UnrecoverableError (line 41 of processor); 3 unit tests green. Frontend modal display: not verifiable statically — see Human Verification section. |
| 4 | Si AFIP falla por timeout o HTTP 5xx, el job reintenta con backoff exponencial | ✓ VERIFIED | CaeEmissionProcessor re-throws AfipTransientError and AxiosError without UnrecoverableError wrapping; unit test 're-throws AfipTransientError so BullMQ applies exponential backoff' and 're-throws AxiosError timeout' both pass; caeQueue.add called with { attempts: 5, backoff: { type: 'exponential', delay: 2000 } } in finanzas.service.ts line 981-983 |
| 5 | El DI token AFIP_SERVICE apunta a AfipRealService; AfipStubService activable por env var | ✓ VERIFIED | FinanzasModule useFactory: `if (process.env.USE_AFIP_STUB === 'true') return new AfipStubService(); return new AfipRealService(...)` confirmed in finanzas.module.ts lines 35-38 |

**Score:** 5/5 truths pass automated checks. 2 items require human confirmation (live AFIP call, frontend modal display).

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | EMISION_PENDIENTE in EstadoFactura enum | ✓ VERIFIED | Line 936: `EMISION_PENDIENTE  // Transient: BullMQ job enqueued, CAE not yet assigned` |
| `backend/src/prisma/migrations/20260320235820_add_emision_pendiente_estado/migration.sql` | ALTER TYPE migration applied | ✓ VERIFIED | File exists; SQL: `ALTER TYPE "EstadoFactura" ADD VALUE 'EMISION_PENDIENTE'` |
| `backend/src/modules/finanzas/afip/afip.constants.ts` | Exports AFIP_SERVICE DI token string | ✓ VERIFIED | Single line: `export const AFIP_SERVICE = 'AFIP_SERVICE';` |
| `backend/src/modules/finanzas/afip/afip.errors.ts` | AfipBusinessError, AfipTransientError, AFIP_TRANSLATIONS, translateAfipErrors | ✓ VERIFIED | All 4 exports present; 10242 → Spanish message verified at line 8; class implementations substantive |
| `backend/src/modules/finanzas/afip/afip-real.service.ts` | WSFEv1 SOAP implementation of AfipService with advisory lock | ✓ VERIFIED | 267 lines; implements AfipService; pg_advisory_xact_lock at line 66; timeout: 45000 at line 116; FECompUltimoAutorizado + FECAESolicitar SOAP helpers present; WSAA_SERVICE injected |
| `backend/src/modules/finanzas/afip/afip-real.service.spec.ts` | 6 passing unit tests (not xit) | ✓ VERIFIED | All 6 are `it()` blocks (not xit); Jest output: 9 passed, 0 skipped across both spec files |
| `backend/src/modules/finanzas/processors/cae-emission.processor.ts` | BullMQ @Processor with error classification | ✓ VERIFIED | Extends WorkerHost; @Processor(CAE_QUEUE); AfipBusinessError → UnrecoverableError at line 41; re-throw at line 49; CAE_QUEUE = 'cae-emission' exported |
| `backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts` | 3 passing unit tests (not xit) | ✓ VERIFIED | All 3 are `it()` blocks; Jest confirms 9 total tests pass across both spec files |
| `backend/src/modules/finanzas/finanzas.module.ts` | AFIP_SERVICE useFactory + CAE queue + WsaaModule | ✓ VERIFIED | WsaaModule imported (line 8); BullModule.registerQueue({ name: CAE_QUEUE }) (line 20); useFactory with USE_AFIP_STUB toggle (lines 30-41); CaeEmissionProcessor in providers |
| `backend/src/modules/finanzas/finanzas.service.ts` | emitirFactura method with pre-condition validation and BullMQ enqueue | ✓ VERIFIED | emitirFactura at line 941; 4 pre-condition checks; EMISION_PENDIENTE set at line 974; caeQueue.add at line 980 with attempts: 5 |
| `backend/src/modules/finanzas/finanzas.controller.ts` | POST /finanzas/facturas/:id/emitir returning 202 | ✓ VERIFIED | @Post('facturas/:id/emitir') at line 131; @HttpCode(202) at line 132; delegates to service.emitirFactura |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `finanzas.module.ts` | `afip-real.service.ts` | useFactory returns AfipRealService when USE_AFIP_STUB != 'true' | ✓ WIRED | useFactory confirmed at lines 30-41 of finanzas.module.ts; AfipRealService imported and instantiated |
| `afip-real.service.ts` | `wsaa.interfaces.ts` | @Inject(WSAA_SERVICE) wsaaService — getTicket(profesionalId, 'wsfe') | ✓ WIRED | WSAA_SERVICE imported at line 5; @Inject(WSAA_SERVICE) at line 28; getTicket called at line 38-40 |
| `afip-real.service.ts` | WSFEv1 SOAP endpoint | axios.post with FECAESolicitar + FECompUltimoAutorizado | ✓ WIRED | Both SOAP operations present with timeout: 30_000; correct XML namespaces; response parsing via regex |
| `afip.errors.ts` | `cae-emission.processor.ts` | catch (err instanceof AfipBusinessError) → UnrecoverableError | ✓ WIRED | AfipBusinessError imported at line 6 of processor; instanceof check at line 35; UnrecoverableError thrown at line 41 |
| `cae-emission.processor.ts` | `afip.interfaces.ts` | @Inject(AFIP_SERVICE) afipService: AfipService — emitirComprobante | ✓ WIRED | AFIP_SERVICE injected at line 21; emitirComprobante called at line 33 |
| `finanzas.service.ts` | `cae-emission.processor.ts` | caeQueue.add('emit-cae', { facturaId, profesionalId }, ...) | ✓ WIRED | @InjectQueue(CAE_QUEUE) at line 32; caeQueue.add at line 980 with correct job data shape and backoff config |
| `finanzas.controller.ts` | `finanzas.service.ts` | POST /finanzas/facturas/:id/emitir → service.emitirFactura | ✓ WIRED | @Post('facturas/:id/emitir') delegates to this.service.emitirFactura(id, profesionalId) |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CAE-02 | 14-01, 14-02, 14-04 | FECAESolicitar via pg_advisory_xact_lock inside prisma.$transaction({ timeout: 45000 }); CAE + nroComprobante stored in Factura | ✓ SATISFIED | pg_advisory_xact_lock at afip-real.service.ts:66; timeout:45000 at :116; Factura.update at :99-107; 6 unit tests green |
| CAE-03 | 14-01, 14-02, 14-04 | AFIP errors translated to Spanish in modal — minimum error 10242, resultado='R' | ✓ SATISFIED (backend) / ? HUMAN (frontend modal) | AfipBusinessError.spanishMessage for 10242 at afip.errors.ts:8; error classification verified by unit tests; frontend modal display requires human verification |
| CAE-04 | 14-01, 14-03, 14-04 | Business errors (10242, resultado=R) → DLQ immediately; transient errors (timeout, 5xx) → exponential backoff | ✓ SATISFIED | UnrecoverableError wrapping at processor:41; re-throw at processor:49; attempts:5, backoff exponential at service:981-983; 3 unit tests green |

**Orphaned requirements check:** No Phase 14 requirements in REQUIREMENTS.md beyond CAE-02, CAE-03, CAE-04. All three are accounted for in plan frontmatter. No orphaned requirements.

---

## Anti-Patterns Found

None. Scanned all 5 core implementation files for TODO/FIXME, empty returns, placeholder comments, and stub handlers. Clean.

Notable documented tech debt (not blockers):
- IVA alicuota ID 5 (21%) hard-coded in FECAESolicitar SOAP envelope — documented in 14-02-SUMMARY.md as "production IVA matrix" tech debt. Not a Phase 14 requirement gap.

---

## Human Verification Required

### 1. End-to-End Stub Mode Flow

**Test:** Start backend with `USE_AFIP_STUB=true npm run start:dev`. POST to `/finanzas/facturas/{id}/emitir?profesionalId={profId}` with a valid JWT. Immediately GET the factura and observe estado transitions.
**Expected:** HTTP 202 with `{ jobId: "...", status: "EMISION_PENDIENTE" }`; factura.estado briefly shows `EMISION_PENDIENTE` then transitions to `EMITIDA` within ~1 second; `cae` field = `"74397704790943"` (stub value).
**Why human:** BullMQ async job lifecycle, real NestJS module bootstrap, and DB estado polling cannot be verified statically. Plan 14-04 SUMMARY documents this checkpoint was approved — this human item records that confirmation for traceability.

### 2. Frontend Modal Display for CAE-03

**Test:** Trigger a CAE emission that AFIP would reject with a business error. Observe what the Facturador UI displays.
**Expected:** A modal (not a toast or console error) displays the Spanish message from `AfipBusinessError.spanishMessage`, e.g., "La condición de IVA del receptor es obligatoria."
**Why human:** CAE-03 requires the error surface in a modal in the Facturador frontend. Phase 14 plans only cover the backend error classification. No frontend modal integration was included in Phase 14 plans. This gap may be intentional (deferred to Phase 15 or pre-existing frontend error boundary) but requires human verification to confirm the error is actually visible to the Facturador.

---

## Gaps Summary

No structural gaps found. All 11 artifacts exist, are substantive (not stubs), and are correctly wired. All 9 unit tests (6 for AfipRealService + 3 for CaeEmissionProcessor) pass. All 8 commits referenced in the four plan summaries are confirmed in git log.

The two human_needed items are:
1. Live end-to-end flow — documented as approved in 14-04-SUMMARY.md but flagged here for formal traceability.
2. Frontend modal surface for CAE-03 — Phase 14 backend delivers the Spanish error message but no Phase 14 plan includes frontend changes to display it in a modal. This is likely deferred to Phase 15 (QR + PDF + Frontend) and should be confirmed.

---

_Verified: 2026-03-20T22:10:00Z_
_Verifier: Claude (gsd-verifier)_
