---
phase: 15-qr-afip-pdf-frontend-comprobantes
verified: 2026-03-30T22:10:00Z
status: human_needed
score: 11/11 automated must-haves verified
human_verification:
  - test: "Download PDF from ComprobantesTab, scan QR with a phone or online decoder"
    expected: "QR decodes to URL starting with https://www.afip.gob.ar/fe/qr/?p= and AFIP page loads"
    why_human: "Cannot programmatically scan a rendered PDF QR image — requires a real QR reader"
  - test: "Open FacturaDetailModal for an EMITIDA invoice and inspect AFIP section"
    expected: "CAE 14-digit number visible in monospace, CAE vencimiento formatted DD/MM/YYYY, QR img tag renders (not broken), 'Escanear para verificar en AFIP' label present"
    why_human: "Rendering of img with base64 data URL requires visual browser inspection"
  - test: "Open FacturaDetailModal for a USD invoice"
    expected: "Amber BNA warning appears, bna.com.ar link opens in new tab, Cotizacion BNA input saves and persists on modal re-open"
    why_human: "tipoCambio persistence requires live DB roundtrip — cannot verify statically"
---

# Phase 15: QR AFIP PDF + Frontend Comprobantes Verification Report

**Phase Goal:** QR AFIP RG 5616/2024 embedded in PDF comprobantes, CAE/QR display in frontend FacturaDetailModal, USD tipoCambio flow
**Verified:** 2026-03-30T22:10:00Z
**Status:** human_needed — all automated checks passed; 3 items require human browser/device confirmation
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | AfipRealService persists qrData URL in Factura at CAE write time (same prisma.factura.update that writes cae) | VERIFIED | `afip-real.service.ts` line 131: `qrData: buildAfipQrUrl(qrPayload)` inside the `tx.factura.update` data block alongside `cae`, `caeFchVto`, `nroComprobante` |
| 2 | AfipStubService returns a deterministic non-null qrData string | VERIFIED | `afip-stub.service.ts` lines 18-32: calls `buildAfipQrUrl({...stub payload...})` and includes `qrData` in return value |
| 3 | FacturaPdfService.generatePdfBuffer() returns non-empty Buffer with embedded QR PNG when qrData is present | VERIFIED | `factura-pdf.service.ts` lines 97-193: full PDFKit stream-to-buffer with `QRCode.toBuffer()` → `doc.image()` wiring; 7 tests green per SUMMARY-01 |
| 4 | buildAfipQrUrl() produces a valid base64 URL with all 13 RG 5616/2024 fields as JSON numbers where required | VERIFIED | `factura-pdf.service.ts` lines 40-44: JSON.stringify → base64 → AFIP URL prefix; tests 1-4 in spec confirm 13 keys, number types for cuit/nroCmp/codAut |
| 5 | GET /finanzas/facturas/:id returns cae, caeFchVto, nroComprobante, qrData, qrImageDataUrl, moneda, tipoCambio, ptoVta | VERIFIED | `finanzas.service.ts` lines 404-462: `getFacturaById()` returns all required fields including server-side `qrImageDataUrl` via `QRCode.toDataURL()` |
| 6 | GET /finanzas/facturas/:id/pdf returns a PDF binary for EMITIDA invoices | VERIFIED | `finanzas.controller.ts` line 134-143: `downloadFacturaPdf` sets `Content-Type: application/pdf`, calls `service.generateFacturaPdf(id)`, streams buffer |
| 7 | PATCH /finanzas/facturas/:id/tipo-cambio updates Factura.tipoCambio and validates > 0 | VERIFIED | `finanzas.service.ts` lines 528-537: guard `if (tipoCambio <= 0) throw BadRequestException`, then `prisma.factura.update({ data: { tipoCambio } })` |
| 8 | Facturador can click a ComprobantesTab row to open FacturaDetailModal with CAE/QR display | VERIFIED | `ComprobantesTab.tsx` lines 341-347: `onClick` sets `selectedFacturaId` and `detailModalOpen=true`; `FacturaDetailModal` rendered at line 451-458 |
| 9 | FacturaDetailModal shows CAE, CAE vencimiento, QR image for EMITIDA invoices | VERIFIED | `FacturaDetailModal.tsx` lines 181-211: AFIP section conditionally rendered only when `factura.cae` is not null; `<img src={factura.qrImageDataUrl}>` at line 201 |
| 10 | For USD invoices, modal shows BNA link and tipoCambio input | VERIFIED | `FacturaDetailModal.tsx` lines 215-261: USD section guarded by `factura.moneda === 'USD'`; bna.com.ar link at line 225-233; Input bound to `tipoCambioInput` state |
| 11 | EstadoFactura frontend enum includes EMISION_PENDIENTE and CAEA_PENDIENTE_INFORMAR; ESTADO_BADGE in both components handles all 4 values | VERIFIED | `finanzas.ts` lines 29-34: enum has all 4 values; `ComprobantesTab.tsx` lines 79-84 and `FacturaDetailModal.tsx` lines 46-51: both ESTADO_BADGE maps cover all 4 states |

**Score:** 11/11 truths verified (automated)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/modules/finanzas/factura-pdf.service.ts` | PDF generation with QR AFIP section; exports buildAfipQrUrl, toAfipMonedaCodigo, FacturaPdfService | VERIFIED | 195 lines; all 3 exports present; QR embed via QRCode.toBuffer + doc.image() fully implemented |
| `backend/src/modules/finanzas/factura-pdf.service.spec.ts` | Unit tests for buildAfipQrUrl and PDF buffer | VERIFIED | 115 lines; 7 tests covering URL prefix, 13-key JSON, number types, moneda mapping, generatePdfBuffer smoke test |
| `backend/src/modules/finanzas/afip/afip-real.service.ts` | qrData computed and persisted after successful FECAESolicitar | VERIFIED | Lines 63-66: facturaFields fetched before transaction; lines 106-120: qrPayload built; line 131: qrData in tx.factura.update |
| `backend/src/modules/finanzas/afip/afip-stub.service.ts` | Returns deterministic qrData | VERIFIED | Lines 18-42: buildAfipQrUrl called with fixed stub CUIT 20000000001; qrData in return value |
| `backend/src/modules/finanzas/finanzas.service.ts` | getFacturaById(), generateFacturaPdf(), updateTipoCambio() methods | VERIFIED | All three methods implemented at lines 404, 467, 528 with full logic and guards |
| `backend/src/modules/finanzas/finanzas.controller.ts` | GET facturas/:id, GET facturas/:id/pdf, PATCH facturas/:id/tipo-cambio | VERIFIED | All three endpoints present at lines 126, 134, 149; route order safe (segment-depth prevents GET /:id shadowing GET /:id/pdf) |
| `frontend/src/types/finanzas.ts` | EstadoFactura with 4 values; Factura with AFIP fields; FacturaDetail with qrImageDataUrl | VERIFIED | EstadoFactura has EMITIDA, ANULADA, EMISION_PENDIENTE, CAEA_PENDIENTE_INFORMAR; Factura has moneda, tipoCambio, cae, caeFchVto, nroComprobante, qrData; FacturaDetail extends with qrImageDataUrl and ptoVta |
| `frontend/src/hooks/useFinanzas.ts` | useFactura(id) and useUpdateTipoCambio() hooks | VERIFIED | useFactura at line 364: enabled: !!id, calls GET /finanzas/facturas/${id}; useUpdateTipoCambio at line 375: PATCH with invalidateQueries on success |
| `frontend/src/app/dashboard/finanzas/facturacion/components/FacturaDetailModal.tsx` | Detail modal with CAE badge, QR image, PDF download, USD tipoCambio input | VERIFIED | 284 lines; all sections implemented and conditionally gated; download wired to /pdf endpoint via Blob API |
| `frontend/src/app/dashboard/finanzas/facturacion/components/ComprobantesTab.tsx` | Row click opens FacturaDetailModal; Download button wired; new estado badges | VERIFIED | selectedFacturaId/detailModalOpen state at lines 101-102; onClick at lines 343-346; downloadFacturaPdf wired at lines 406-413; FacturaDetailModal rendered at lines 451-458 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `afip-real.service.ts` | `factura-pdf.service.ts` | `buildAfipQrUrl` import | WIRED | Line 14: `import { buildAfipQrUrl, toAfipMonedaCodigo } from '../factura-pdf.service'`; called at line 131 |
| `afip-real.service.ts` | `prisma.factura` | `tx.factura.update — data.qrData = buildAfipQrUrl(payload)` | WIRED | Lines 123-133: update includes `qrData: buildAfipQrUrl(qrPayload)` in same transaction as cae+caeFchVto |
| `finanzas.service.ts` | `factura-pdf.service.ts` | `FacturaPdfService` injected in constructor | WIRED | Line 36: `private readonly factPdfService: FacturaPdfService`; called at line 519 in generateFacturaPdf |
| `finanzas.service.ts` | `prisma.factura` | `findUniqueOrThrow` + `factura.update` | WIRED | getFacturaById at line 405, updateTipoCambio at line 532 |
| `finanzas.controller.ts` | `finanzas.service.ts` | `getFacturaById`, `generateFacturaPdf`, `updateTipoCambio` | WIRED | Lines 128, 136, 155 |
| `FacturaDetailModal.tsx` | `useFinanzas.ts` | `useFactura(facturaId)` TanStack Query hook | WIRED | Line 74: `const { data: factura, isLoading } = useFactura(facturaId)` |
| `ComprobantesTab.tsx` | `FacturaDetailModal.tsx` | `selectedFacturaId` state + `<FacturaDetailModal facturaId={selectedFacturaId} />` | WIRED | State at line 101-102; component at line 451-458 |
| `ComprobantesTab.tsx` | `/finanzas/facturas/:id/pdf` | `downloadFacturaPdf` with `api.get(url, {responseType:'blob'})` | WIRED | Lines 86-93: function defined; called at line 409 in Download button onClick |
| `FacturaPdfService` | `finanzas.module.ts` | Registered in providers array | WIRED | `finanzas.module.ts` line 15 import, line 29 in providers array |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| QR-01 | 15-01, 15-02, 15-04 | PDF de factura incluye código QR AFIP (https://www.afip.gob.ar/fe/qr/?p= + Base64 JSON con 13 campos RG 5616/2024) embebido via qrcode 1.5.4 + PDFKit | SATISFIED (human gate: 15-04 SUMMARY confirms "PDF QR embeds AFIP-compliant JSON base64 URL per RG 5616/2024") | buildAfipQrUrl produces 13-key JSON; qrcode@1.5.4 in package.json; QRCode.toBuffer embedded in PDFKit; 7 tests green |
| QR-02 | 15-02, 15-03, 15-04 | Facturador ve número de CAE y código QR renderizado en el detalle de la factura emitida | SATISFIED (human gate: 15-04 SUMMARY confirms modal shows CAE + QR image) | FacturaDetailModal AFIP section shows cae in monospace + qrImageDataUrl in img tag; useFactura hook calls GET /finanzas/facturas/:id |
| QR-03 | 15-02, 15-03, 15-04 | Facturador puede ingresar cotización BNA manualmente para facturas en USD, con link directo a bna.com.ar | SATISFIED (human gate: 15-04 SUMMARY confirms PATCH persists and modal reflects on re-open) | USD section in FacturaDetailModal; PATCH /finanzas/facturas/:id/tipo-cambio implemented; useUpdateTipoCambio invalidates query on success |

No orphaned requirements found — all three QR-0x IDs are claimed by plans 15-01 through 15-04 and present in REQUIREMENTS.md with status Complete.

---

## Anti-Patterns Found

No blockers or stubs detected.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `ComprobantesTab.tsx` | 216, 251, 564, 574 | HTML input `placeholder` attribute | Info | Normal UI — not a code stub |
| `finanzas.service.ts` | 476-487 | generateFacturaPdf executes a second `prisma.factura.findUniqueOrThrow` to fetch profesional/configClinica (same data already loaded in getFacturaById) | Info | Minor redundant DB query — not a correctness issue; no functional gap |

---

## Human Verification Required

Plan 15-04 was a human-verification checkpoint that the SUMMARY claims passed. The automated verification confirmed all code exists, is substantive, and is wired. However, the following items cannot be confirmed programmatically and require human testing in the running application:

### 1. QR Code Scannability in PDF (QR-01)

**Test:** Start backend + frontend. Navigate to Finanzas → Comprobantes tab. Click the Download button on an EMITIDA invoice (one with `cae` set). Open the downloaded PDF. Scan the QR code with a phone or use an online QR decoder tool.
**Expected:** QR decodes to a URL starting with `https://www.afip.gob.ar/fe/qr/?p=`. The AFIP validation page loads when that URL is opened in a browser.
**Why human:** Rendering and scannability of an embedded QR PNG inside a PDFKit-generated PDF cannot be verified via static code analysis.

### 2. CAE Display and QR Image Render in FacturaDetailModal (QR-02)

**Test:** In the Comprobantes table, click on any row with an EMITIDA invoice. Inspect the detail modal that opens.
**Expected:** (a) 14-digit CAE number visible in monospace font. (b) CAE vencimiento date visible as DD/MM/YYYY. (c) QR image renders as a visible square barcode — NOT a broken img tag. (d) "Escanear para verificar en AFIP" label present below QR image.
**Why human:** The `qrImageDataUrl` field is a `data:image/png;base64,...` string computed server-side. Whether the browser renders it correctly as a visible image requires visual inspection.

### 3. USD tipoCambio Persistence (QR-03)

**Test:** Identify or create a USD invoice (moneda='USD') in the DB. Click its row to open FacturaDetailModal. Verify the BNA warning and bna.com.ar link appear. Enter a tipoCambio value (e.g. 950.50) and click Save. Close and reopen the modal.
**Expected:** Toast success on save. On modal re-open, tipoCambio input shows 950.50.
**Why human:** Verifying that PATCH /finanzas/facturas/:id/tipo-cambio persists and that the TanStack Query invalidation causes the modal to re-fetch the updated value requires a live DB roundtrip.

---

## Gaps Summary

No gaps found. All 11 automated truths verified, all artifacts exist and are substantive and wired, all 3 requirement IDs satisfied. No blocker anti-patterns. Three items flagged for human verification reflect real-time/visual behavior that static analysis cannot confirm — these were addressed by the Plan 04 human checkpoint (SUMMARY-04 claims all 5 scenarios approved).

---

_Verified: 2026-03-30T22:10:00Z_
_Verifier: Claude (gsd-verifier)_
