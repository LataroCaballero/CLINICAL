---
phase: 15-qr-afip-pdf-frontend-comprobantes
plan: "01"
subsystem: backend-finanzas-afip
tags: [qr-afip, pdf, factura, rg-5616-2024, tdd]
dependency_graph:
  requires: [14-04]
  provides: [factura-pdf-service, buildAfipQrUrl, qrData-persistence]
  affects: [afip-real-service, afip-stub-service, finanzas-module]
tech_stack:
  added: [qrcode@1.5.4, "@types/qrcode"]
  patterns: [pdfkit-stream-to-buffer, tdd-red-green, rg-5616-2024-qr-url]
key_files:
  created:
    - backend/src/modules/finanzas/factura-pdf.service.ts
    - backend/src/modules/finanzas/factura-pdf.service.spec.ts
  modified:
    - backend/src/modules/finanzas/afip/afip-real.service.ts
    - backend/src/modules/finanzas/afip/afip-real.service.spec.ts
    - backend/src/modules/finanzas/afip/afip-stub.service.ts
    - backend/src/modules/finanzas/afip/afip-stub.service.spec.ts
    - backend/src/modules/finanzas/afip/afip.interfaces.ts
    - backend/src/modules/finanzas/finanzas.module.ts
    - backend/package.json
    - backend/package-lock.json
decisions:
  - "buildAfipQrUrl encodes JSON as base64 via Buffer.from().toString('base64') — no external encoder needed"
  - "facturaFields fetched BEFORE $transaction (not inside) to avoid adding extra DB round-trip under advisory lock"
  - "AfipStubService returns deterministic qrData (fixed stub CUIT 20000000001) for unit test predictability"
  - "EmitirComprobanteResult.qrData is optional (?) — real service always sets it, stub always returns it, callers need not break"
  - "FacturaPdfService NOT exported from FinanzasModule — internal use only (FinanzasService uses it in Plan 02)"
metrics:
  duration_minutes: 28
  completed_date: "2026-03-20"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 8
---

# Phase 15 Plan 01: QR AFIP Install + FacturaPdfService + AfipRealService qrData Summary

**One-liner:** qrcode@1.5.4 installed, buildAfipQrUrl utility (RG 5616/2024 compliant), FacturaPdfService with QR PNG embed via PDFKit, and AfipRealService persisting qrData in same tx.factura.update as CAE.

## What Was Built

### Task 1 — qrcode + FacturaPdfService (7bc2c6e)

Installed `qrcode@1.5.4` and `@types/qrcode`. Created:

- `factura-pdf.service.ts` exporting:
  - `AfipQrPayload` interface (13 fields per RG 5616/2024 Anexo II)
  - `buildAfipQrUrl(payload)` — JSON.stringify → base64 → prepend AFIP URL
  - `toAfipMonedaCodigo(m)` — ARS→PES, USD→DOL (AFIP non-standard codes)
  - `FacturaPdfData` interface
  - `FacturaPdfService` @Injectable with `generatePdfBuffer()` using PDFKit stream-to-buffer pattern and `QRCode.toBuffer()` for QR embed

- `factura-pdf.service.spec.ts` with 7 tests (TDD red→green):
  - URL prefix assertion
  - 13-key JSON validation
  - cuit/nroCmp/codAut as JSON numbers
  - moneda 'PES' for ARS invoices
  - toAfipMonedaCodigo both directions
  - generatePdfBuffer returns non-empty Buffer

### Task 2 — AfipRealService qrData persistence (b32307e)

Updated `afip-real.service.ts`:
- Imports `buildAfipQrUrl` + `toAfipMonedaCodigo` from `factura-pdf.service`
- Fetches `facturaFields = { moneda, tipoCambio, total, cuit }` before `$transaction`
- Builds `AfipQrPayload` with all 13 RG 5616/2024 fields after successful FECAESolicitar
- Adds `qrData: buildAfipQrUrl(qrPayload)` to existing `tx.factura.update` data block

Updated `afip-stub.service.ts`:
- Returns deterministic `qrData` URL using stub CUIT 20000000001

Updated `afip.interfaces.ts`:
- Added `qrData?: string` to `EmitirComprobanteResult`

Added 2 new QR-01 tests to `afip-real.service.spec.ts`, 1 new test to `afip-stub.service.spec.ts`.
Total: 14 afip tests passing (8 real + 6 stub).

### Task 3 — FinanzasModule registration (512a458)

Added `FacturaPdfService` to `FinanzasModule` providers array (not exported — internal use).
All 41 finanzas tests green.

## Verification Results

| Check | Result |
|-------|--------|
| `npx jest --testPathPattern=factura-pdf` | 7/7 PASS |
| `npx jest --testPathPattern=afip-real` | 8/8 PASS |
| `npx jest --testPathPattern=afip-stub` | 6/6 PASS |
| `npx jest --testPathPattern=finanzas` | 41/41 PASS |
| `npx tsc -p tsconfig.build.json --noEmit` | No errors |
| `package.json "qrcode": "^1.5.4"` | Present |

## Decisions Made

1. `buildAfipQrUrl` uses `Buffer.from(json).toString('base64')` — no external encoder needed; output is URL-safe enough per AFIP spec examples.
2. `facturaFields` is fetched BEFORE `$transaction` (outside advisory lock scope) to avoid adding a DB round-trip inside the timed lock window.
3. `AfipStubService` returns a deterministic `qrData` with fixed stub CUIT `20000000001` — makes unit tests predictable regardless of date.
4. `EmitirComprobanteResult.qrData` is optional (`?`) — real service always sets it, stub always returns it; existing callers (CaeEmissionProcessor) don't break.
5. `FacturaPdfService` is NOT exported from `FinanzasModule` — it is an internal service; Plan 02 will inject it into `FinanzasService`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test 5 mock PNG buffer was not a valid PNG**
- **Found during:** Task 1 GREEN phase
- **Issue:** The spec used a truncated 16-byte PNG header; pdfkit validates PNG structure via `png-js` and threw "Incomplete or corrupt PNG file"
- **Fix:** Replaced fake bytes with a valid base64-encoded 1x1 transparent PNG (`iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAA...`)
- **Files modified:** `backend/src/modules/finanzas/factura-pdf.service.spec.ts`

**2. [Rule 1 - Bug] Existing persistence test used strict toHaveBeenCalledWith without qrData**
- **Found during:** Task 2 — planning the RED phase
- **Issue:** The existing spec assertion `toHaveBeenCalledWith({ where, data: { cae, caeFchVto, nroComprobante, ptoVta, estado } })` would fail once `qrData` was added
- **Fix:** Changed assertion to `expect.objectContaining` so it checks required fields without being broken by new qrData field
- **Files modified:** `backend/src/modules/finanzas/afip/afip-real.service.spec.ts`

**3. [Rule 2 - Missing interface field] EmitirComprobanteResult lacked qrData field**
- **Found during:** Task 2 GREEN phase
- **Issue:** AfipStubService returning `qrData` in result would cause TypeScript error since interface didn't declare it
- **Fix:** Added `qrData?: string` to `EmitirComprobanteResult` interface
- **Files modified:** `backend/src/modules/finanzas/afip/afip.interfaces.ts`

## Self-Check: PASSED

| Item | Status |
|------|--------|
| factura-pdf.service.ts | FOUND |
| factura-pdf.service.spec.ts | FOUND |
| commit 7bc2c6e (Task 1) | FOUND |
| commit b32307e (Task 2) | FOUND |
| commit 512a458 (Task 3) | FOUND |
