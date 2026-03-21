# Phase 15: QR AFIP + PDF + Frontend de Comprobantes - Research

**Researched:** 2026-03-20
**Domain:** AFIP QR RG 5616/2024 + PDFKit + NestJS + React/Next.js frontend
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QR-01 | PDF de factura incluye código QR AFIP (`https://www.afip.gob.ar/fe/qr/?p=` + Base64 JSON con 13 campos RG 5616/2024) embebido via `qrcode` 1.5.4 + PDFKit | `qrcode` not yet installed — needs `npm install qrcode @types/qrcode`; PDFKit already in use (`pdfkit` 0.17.2); `qrcode` can emit PNG Buffer for embedding into PDFKit via `doc.image()` |
| QR-02 | Facturador ve número de CAE y código QR renderizado en el detalle de la factura emitida | Requires: (a) new GET `/finanzas/facturas/:id` endpoint returning `cae`, `caeFchVto`, `qrData`; (b) detail modal/panel in `ComprobantesTab.tsx` with CAE display + `qrData` rendered as `<img>`; (c) `Factura` type extended with AFIP fields |
| QR-03 | Facturador puede ingresar cotización BNA manualmente para facturas en USD, con link directo a bna.com.ar | `Factura.tipoCambio` field already exists (`Decimal @default(1.0)`), `Factura.moneda` field already exists (`MonedaFactura @default(ARS)`); needs PATCH endpoint + frontend input in the detail/emit flow |
</phase_requirements>

---

## Summary

Phase 15 has three tightly related deliverables: (1) generate a QR-embedded PDF for each emitted invoice using the `qrcode` package (not yet installed) and the existing PDFKit infrastructure; (2) expose a GET `/finanzas/facturas/:id` endpoint that returns CAE fields and the stored `qrData` URL, and render this in a frontend detail view; (3) allow manual BNA exchange-rate entry for USD invoices, using the already-existing `Factura.tipoCambio` DB field.

The `qrcode` package is not yet installed in the backend (`backend/package.json` has no `qrcode` entry). The `pdfkit` 0.17.2 and `@types/pdfkit` 0.17.4 are already installed. The presupuesto module already demonstrates the exact PDFKit pattern: `new PDFDocument()`, stream to Buffer, `doc.image(buffer, x, y, {width, height})`. This pattern is directly reusable for embedding a QR PNG buffer.

The `Factura` model already has the fields Phase 15 needs: `cae`, `caeFchVto`, `nroComprobante`, `qrData`, `ptoVta`, `moneda`, and `tipoCambio`. The frontend `Factura` type and `getFacturas` service method do NOT yet expose these fields. A single GET `/finanzas/facturas/:id` endpoint is missing entirely — the `emitirFactura` service doc says "poll GET /finanzas/facturas/:id" but this endpoint does not yet exist.

**Primary recommendation:** Install `qrcode` 1.5.4, create a `FacturaPdfService` in the `finanzas` module mirroring `PresupuestoPdfService`, add GET `/finanzas/facturas/:id`, add PATCH `/finanzas/facturas/:id/tipo-cambio`, extend the `Factura` frontend type with AFIP fields, and add a detail drawer/modal to `ComprobantesTab`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `pdfkit` | 0.17.2 | PDF generation server-side | Already installed; presupuesto module uses it |
| `@types/pdfkit` | 0.17.4 | TypeScript types for PDFKit | Already installed |
| `qrcode` | 1.5.4 | Generate QR code as PNG Buffer | Required by RG 5616/2024 spec; project decision (STATE.md) |
| `@types/qrcode` | ~1.5.x | TypeScript types for qrcode | Companion to `qrcode` package |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack Query | (already installed) | Data fetching in frontend | All new hooks follow existing pattern |
| shadcn/ui | (already installed) | UI primitives (Dialog, Badge, etc.) | All new frontend components |
| Next.js Image or plain `<img>` | (already installed) | Render QR from base64 data URL | `qrData` stored as URL string — render as `<img src={...}>` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `qrcode` toBuffer PNG | `qrcode` toDataURL | toBuffer is cleaner for PDFKit embed; toDataURL is fine for frontend img tag |
| New `FacturaPdfService` | Extend `PresupuestoPdfService` | Separate service is cleaner; invoice PDF has different layout and AFIP-specific sections |

**Installation (backend only):**
```bash
cd backend && npm install qrcode@1.5.4 && npm install --save-dev @types/qrcode
```

---

## Architecture Patterns

### Recommended File Structure

```
backend/src/modules/finanzas/
├── factura-pdf.service.ts      # NEW — mirrors presupuesto-pdf.service.ts pattern
├── finanzas.controller.ts      # Add GET :id + GET :id/pdf + PATCH :id/tipo-cambio
├── finanzas.service.ts         # Add getFacturaById(), generateFacturaPdf(), updateTipoCambio()
├── finanzas.module.ts          # Register FacturaPdfService as provider

frontend/src/
├── types/finanzas.ts           # Extend Factura interface with cae, caeFchVto, qrData, moneda, tipoCambio
├── hooks/useFinanzas.ts        # Add useFactura(id), useUpdateTipoCambio()
└── app/dashboard/finanzas/facturacion/components/
    └── FacturaDetailModal.tsx  # NEW — CAE badge, QR image, PDF download, USD tipoCambio input
```

### Pattern 1: QR data construction per RG 5616/2024

The 13-field JSON required by AFIP is documented in RG 5616/2024. The `qrData` field in `Factura` is stored as the full URL (decision in STATE.md: "QR data almacenada como URL string en Factura.qrData — re-renderizable si spec cambia"). This means the AfipRealService in Phase 14 computes and stores the URL but currently does not store it yet (Phase 14 only stores `cae`, `caeFchVto`, `nroComprobante`).

**RG 5616/2024 — 13 mandatory JSON fields:**
```typescript
// Source: AFIP RG 5616/2024 Anexo II
interface AfipQrPayload {
  ver: number;        // 1 — version del formato
  fecha: string;      // 'YYYY-MM-DD' — fecha de emisión del comprobante
  cuit: number;       // CUIT del emisor (sin guiones, sin espacios)
  ptoVta: number;     // Punto de venta
  tipoCmp: number;    // Tipo comprobante (1=FactA, 6=FactB, 11=FactC, etc.)
  nroCmp: number;     // Número de comprobante
  importe: number;    // Importe total
  moneda: string;     // 'PES'=ARS, 'DOL'=USD (código ISO AFIP)
  ctz: number;        // Cotización (1.000 para ARS)
  tipoDocRec: number; // Tipo doc receptor (80=CUIT, 96=DNI, 99=SIN_ID)
  nroDocRec: number;  // Nro doc receptor
  tipoCodAut: string; // 'E' = CAE, 'A' = CAEA
  codAut: number;     // CAE or CAEA code (14 digits)
}

function buildQrUrl(payload: AfipQrPayload): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString('base64');
  return `https://www.afip.gob.ar/fe/qr/?p=${b64}`;
}
```

**Where to compute qrData:** The AfipRealService already has all needed data at CAE-write time inside `emitirComprobante()`. Phase 15 must add `qrData` computation and persistence to `AfipRealService.emitirComprobante()` — not in a separate pass. This requires updating `AfipRealService` to call `buildQrUrl()` and write `qrData` in the same `prisma.factura.update()` call that writes `cae`.

### Pattern 2: PDFKit QR embed

```typescript
// Source: presupuesto-pdf.service.ts + qrcode docs
import * as QRCode from 'qrcode';

// In FacturaPdfService.buildAfipSection():
async buildAfipQrSection(doc: PDFKit.PDFDocument, qrUrl: string, cae: string, caeFchVto: string) {
  // Generate PNG buffer from URL
  const qrBuffer: Buffer = await QRCode.toBuffer(qrUrl, {
    errorCorrectionLevel: 'M',
    width: 100,
    margin: 1,
  });

  const y = doc.y + 10;
  doc.image(qrBuffer, 50, y, { width: 80, height: 80 });

  // CAE text alongside QR
  doc.fontSize(8).font('Helvetica')
     .text(`CAE: ${cae}`, 145, y)
     .text(`Vto. CAE: ${formatCaeFchVto(caeFchVto)}`, 145, y + 14)
     .text('Comprobante emitido via AFIP WSFEv1', 145, y + 28);
}
```

### Pattern 3: Backend PDF endpoint (mirrors presupuesto pattern)

```typescript
// GET /finanzas/facturas/:id/pdf — mirrors GET /presupuestos/:id/pdf
@Get('facturas/:id/pdf')
async downloadFacturaPdf(@Param('id') id: string, @Res() res: Response) {
  const { buffer, filename } = await this.service.generateFacturaPdf(id);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': buffer.length,
  });
  res.end(buffer);
}
```

### Pattern 4: GET /finanzas/facturas/:id (missing endpoint)

The existing `getFacturas()` list query does NOT include AFIP fields. Phase 15 needs a dedicated single-factura endpoint:

```typescript
// finanzas.service.ts
async getFacturaById(id: string): Promise<FacturaDetailDto> {
  const f = await this.prisma.factura.findUniqueOrThrow({
    where: { id },
    include: {
      paciente: { select: { id: true, nombreCompleto: true, dni: true } },
      profesional: {
        include: { usuario: { select: { nombre: true, apellido: true } } },
        include: { configClinica: true },  // for PDF header
      },
    },
  });
  return {
    id: f.id, tipo: f.tipo, numero: f.numero, fecha: f.fecha, estado: f.estado,
    cuit: f.cuit, razonSocial: f.razonSocial,
    subtotal: Number(f.subtotal), impuestos: Number(f.impuestos), total: Number(f.total),
    cae: f.cae, caeFchVto: f.caeFchVto, nroComprobante: f.nroComprobante,
    qrData: f.qrData, ptoVta: f.ptoVta,
    moneda: f.moneda, tipoCambio: Number(f.tipoCambio),
    paciente: f.paciente, profesional: ...,
  };
}
```

### Pattern 5: PATCH tipoCambio for USD (QR-03)

`Factura.tipoCambio` already exists in DB (Decimal, default 1.0). A PATCH endpoint updates it before emission:

```typescript
// PATCH /finanzas/facturas/:id/tipo-cambio
@Patch('facturas/:id/tipo-cambio')
async updateTipoCambio(
  @Param('id') id: string,
  @Body() dto: { tipoCambio: number },
) {
  return this.service.updateTipoCambio(id, dto.tipoCambio);
}
```

Guard: only allow update if `estado === 'EMITIDA'` is false (i.e., before emission) OR if already EMITIDA and the invoice has USD moneda. The `tipoCambio` is used in the QR payload `ctz` field and in the PDF display.

### Anti-Patterns to Avoid

- **Computing qrData at PDF generation time (not at CAE write time):** The decision (STATE.md) is to store `qrData` in the DB as a URL string. The PDF service reads it from DB — never recomputes. This is correct.
- **Generating QR as SVG instead of PNG buffer:** PDFKit's `doc.image()` requires raster (PNG/JPEG). Use `QRCode.toBuffer()` not `toDataURL('svg')`.
- **Rendering QR in frontend via canvas/SVG:** The frontend receives the stored `qrData` URL string. The simplest rendering is `<img src={qrData} />` where `qrData` is the AFIP URL — this does NOT render a QR, it is just a URL. The frontend must use a QR-rendering library (e.g., `qrcode.react`) or render the QR as a data URL. **Best pattern**: the GET /finanzas/facturas/:id response additionally returns a `qrImageDataUrl` field computed server-side (base64 PNG) so the frontend just renders `<img src={qrImageDataUrl} />`. This avoids shipping a QR library to the frontend.
- **Blocking Response for PDF generation:** Use async/await properly; `QRCode.toBuffer()` returns a Promise — must be awaited inside `buildContent`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code generation | Custom QR matrix algorithm | `qrcode` 1.5.4 | ISO 18004 compliance, error correction modes, tested |
| Base64 JSON URL construction | Custom URL encoding | `Buffer.from(JSON.stringify(payload)).toString('base64')` (Node stdlib) | Trivial — no library needed |
| PDF stream to Buffer | Custom stream collector | Existing pattern from `PresupuestoPdfService` | Already validated |

**Key insight:** The entire QR generation stack is trivially assembled from already-used patterns. The risk is in the correctness of the 13 JSON fields, not in the QR generation mechanics.

---

## Common Pitfalls

### Pitfall 1: qrData not populated by AfipRealService (Phase 14 gap)

**What goes wrong:** `Factura.qrData` is NULL for all invoices emitted in stub mode during Phase 14. Phase 15 must update `AfipRealService.emitirComprobante()` to compute and persist `qrData` at CAE write time.

**Why it happens:** Phase 14 was implemented and human-verified in stub mode. The stub returns a hardcoded CAE (`74397704790943`) but no qrData. Real emission path in `AfipRealService` also does not write `qrData` (confirmed: schema says "Phase 15 renders this as a QR code" — it was intentionally deferred).

**How to avoid:** Task 1 of Phase 15 must update `AfipRealService` to call `buildQrUrl()` and add `qrData` to the `prisma.factura.update()` call inside `emitirComprobante()`. The `AfipStubService` should also be updated to return a deterministic qrData URL for testability.

**Warning signs:** `Factura.qrData` is null on EMITIDA invoices after running test emission.

### Pitfall 2: AFIP moneda code mismatch ('PES' vs 'ARS')

**What goes wrong:** AFIP uses non-standard currency codes in the QR payload — `'PES'` for Argentine peso (NOT `'ARS'`), `'DOL'` for USD (NOT `'USD'`). The `Factura.moneda` enum uses `ARS`/`USD`.

**How to avoid:** Mapping function required:
```typescript
function toAfipMoneda(m: MonedaFactura): string {
  return m === 'USD' ? 'DOL' : 'PES';
}
```

**Source:** AFIP RG 5616/2024 Anexo II, moneda codes table (same codes as FECAESolicitar).

### Pitfall 3: QR JSON field types — all numbers, no strings for numeric fields

**What goes wrong:** AFIP validates that `cuit`, `nroCmp`, `codAut`, `tipoDocRec`, `nroDocRec` are JSON numbers (not strings). If passed as strings, the QR validation URL fails with an unreadable error.

**How to avoid:** Use `parseInt()` / `parseFloat()` when building the payload. `cae` comes from DB as a `String` — cast to `Number` for the payload.

### Pitfall 4: `tipoCambio` not captured before emission

**What goes wrong:** For USD invoices, `tipoCambio` default is `1.0`. If the Facturador doesn't update it before emitting, the QR payload has `ctz: 1` which is factually wrong (AFIP may accept it but the document is legally defective).

**How to avoid:** The frontend detail view for USD invoices must show a prominent warning + BNA link + editable field before the "Emitir" button is active. Guard: require `tipoCambio > 1` for `moneda === USD` before enabling emission (or show a strong warning).

### Pitfall 5: PDF download button in ComprobantesTab is currently no-op

**What goes wrong:** The existing `<Download>` button in `ComprobantesTab` has no `onClick` handler — it silently does nothing. Phase 15 must wire this up to call `GET /finanzas/facturas/:id/pdf`.

**Warning signs:** Click on Download produces no network request.

### Pitfall 6: Frontend `Factura` type missing AFIP fields

**What goes wrong:** `frontend/src/types/finanzas.ts` `Factura` interface lacks `cae`, `caeFchVto`, `qrData`, `moneda`, `tipoCambio`, `nroComprobante`. The `EstadoFactura` enum is also missing `EMISION_PENDIENTE` and `CAEA_PENDIENTE_INFORMAR` (added in Phase 14 schema but not reflected in frontend types).

**How to avoid:** Update `types/finanzas.ts` as one of the first tasks. The `ESTADO_BADGE` map in `ComprobantesTab` also needs entries for the new states to avoid runtime errors.

---

## Code Examples

### QR URL builder (backend utility)

```typescript
// Source: AFIP RG 5616/2024 Anexo II + STATE.md decision
import { MonedaFactura } from '@prisma/client';

export interface AfipQrPayload {
  ver: number;
  fecha: string;
  cuit: number;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  importe: number;
  moneda: string;
  ctz: number;
  tipoDocRec: number;
  nroDocRec: number;
  tipoCodAut: string;
  codAut: number;
}

export function buildAfipQrUrl(payload: AfipQrPayload): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString('base64');
  return `https://www.afip.gob.ar/fe/qr/?p=${b64}`;
}

export function toAfipMonedaCodigo(m: MonedaFactura): string {
  return m === 'USD' ? 'DOL' : 'PES';
}
```

### AfipRealService — qrData computation at CAE write time

```typescript
// In AfipRealService.emitirComprobante() — after successful FECAESolicitar
// Source: existing afip-real.service.ts pattern + buildAfipQrUrl above
const qrPayload: AfipQrPayload = {
  ver: 1,
  fecha: factura.fecha.toISOString().split('T')[0],  // 'YYYY-MM-DD'
  cuit: parseInt(cfg.cuit),
  ptoVta: cfg.ptoVta,
  tipoCmp: tipoComprobante,
  nroCmp: result.cbtDesde,
  importe: Number(factura.total),
  moneda: toAfipMonedaCodigo(factura.moneda),
  ctz: Number(factura.tipoCambio),
  tipoDocRec: factura.cuit ? 80 : (factura.cuit ? 96 : 99),
  nroDocRec: parseInt(factura.cuit ?? '0'),
  tipoCodAut: 'E',
  codAut: parseInt(result.cae),
};

await this.prisma.factura.update({
  where: { id: factura.id },
  data: {
    cae: result.cae,
    caeFchVto: result.caeFchVto,
    nroComprobante: result.cbtDesde,
    qrData: buildAfipQrUrl(qrPayload),
    estado: EstadoFactura.EMITIDA,
  },
});
```

### QRCode.toBuffer usage in FacturaPdfService

```typescript
// Source: qrcode npm docs (stable API since v1.0)
import * as QRCode from 'qrcode';

const qrPngBuffer: Buffer = await QRCode.toBuffer(qrUrl, {
  errorCorrectionLevel: 'M',
  width: 100,   // pixels
  margin: 1,    // quiet zone modules
});
doc.image(qrPngBuffer, x, y, { width: 80, height: 80 });
```

### Frontend: FacturaDetailModal skeleton

```tsx
// New component: FacturaDetailModal.tsx
// Uses pattern: Dialog + useFactura(id) TanStack Query hook
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

function useFactura(id: string | null) {
  return useQuery({
    queryKey: ['finanzas', 'facturas', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/finanzas/facturas/${id}`);
      return data as FacturaDetail;
    },
  });
}

// In FacturaDetailModal render: show cae, caeFchVto, <img src={qrImageDataUrl} />
// For USD: show tipoCambio input + bna.com.ar link
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AFIP QR voluntary | QR obligatorio RG 5616/2024 | RG 5616 vigencia plena | Every emitted invoice PDF MUST include the QR |
| Manual cotización BNA | No API oficial BNA | Pre-existing (out of scope per REQUIREMENTS.md) | FACTURADOR enters cotización manually |

**Confirmed out of scope (per REQUIREMENTS.md):**
- Auto-fetch cotización BNA: "BNA no tiene API oficial; scraping fragile y viola TOS"

---

## Phase 14 Gap: qrData not written

The STATE.md accumulated decisions record: "QR data almacenada como URL string en Factura.qrData — re-renderizable si spec cambia." However, Phase 14's `AfipRealService` was implemented and human-verified in stub mode. The current `AfipRealService.emitirComprobante()` writes `cae`, `caeFchVto`, `nroComprobante` — but NOT `qrData`. Phase 15 **Wave 0** or **Task 1** must extend `AfipRealService` to compute and persist `qrData`.

This is not a schema migration — the column already exists (added in Phase 12). It is purely a service code change.

---

## Open Questions

1. **docTipo / nroDocRec for obra social invoices**
   - What we know: When `Factura.obraSocialId` is set, the receptor is an OS (CUIT-identified). When `Factura.pacienteId` is set, it may be DNI or without document (CONSUMIDOR_FINAL).
   - What's unclear: The `Factura` model has `cuit` (nullable) and `condicionIVAReceptor`. For `CONSUMIDOR_FINAL` the AFIP expects `tipoDocRec=99, nroDocRec=0`.
   - Recommendation: Map `condicionIVAReceptor` → `(tipoDocRec, nroDocRec)`: if cuit non-null → 80/parseInt(cuit); if DNI on paciente → 96/parseInt(dni); else → 99/0. Document as a helper function.

2. **tipoComprobante mapping for PDF filename / display**
   - What we know: `Factura.tipo` is `FACTURA | RECIBO`. The AFIP `tipoComprobante` (1, 6, 11, etc.) is determined at emission time from `condicionIVAReceptor`.
   - What's unclear: Should the PDF display the AFIP comprobante type (e.g., "Factura B") or the internal type?
   - Recommendation: Display `Factura B` / `Factura A` / `Factura C` based on `nroComprobante` and `cae` presence. If `cae` is null, display as internal receipt.

3. **`qrImageDataUrl` server-side vs. frontend QR library**
   - What we know: STATE.md says `qrData` stores the URL string, not a PNG blob.
   - What's unclear: Frontend rendering strategy — `<img src={qrData}>` would show the AFIP URL page, not a QR image. The frontend needs either (a) a QR rendering library like `qrcode.react`, or (b) the backend returns `qrImageDataUrl` as a base64 PNG in the GET /facturas/:id response.
   - Recommendation: Option (b) — compute `QRCode.toDataURL(qrData)` in `getFacturaById()` and return as `qrImageDataUrl: string`. Avoids a frontend dependency and keeps QR rendering server-side (already have the library).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29 (backend) |
| Config file | `backend/package.json` → `jest` key |
| Quick run command | `cd backend && npx jest --testPathPattern=finanzas --passWithNoTests` |
| Full suite command | `cd backend && npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QR-01 | `buildAfipQrUrl()` produces correct base64 URL with all 13 fields | unit | `npx jest --testPathPattern=factura-pdf` | ❌ Wave 0 |
| QR-01 | `FacturaPdfService.generatePdfBuffer()` returns non-empty Buffer when qrData present | unit | `npx jest --testPathPattern=factura-pdf` | ❌ Wave 0 |
| QR-01 | AfipRealService writes qrData on successful CAE | unit (spy) | `npx jest --testPathPattern=afip-real` | ✅ (extend existing) |
| QR-02 | GET /finanzas/facturas/:id returns cae + caeFchVto + qrImageDataUrl | unit | `npx jest --testPathPattern=finanzas.service` | ✅ (extend existing) |
| QR-03 | PATCH /finanzas/facturas/:id/tipo-cambio updates tipoCambio | unit | `npx jest --testPathPattern=finanzas.service` | ✅ (extend existing) |

### Sampling Rate

- **Per task commit:** `cd backend && npx jest --testPathPattern=finanzas --passWithNoTests`
- **Per wave merge:** `cd backend && npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/src/modules/finanzas/factura-pdf.service.spec.ts` — covers QR-01 (qrUrl builder unit test + PDF buffer smoke test)
- [ ] Framework install: `cd backend && npm install qrcode@1.5.4 && npm install --save-dev @types/qrcode` — `qrcode` not yet in package.json

---

## Sources

### Primary (HIGH confidence)

- `backend/src/modules/presupuestos/presupuesto-pdf.service.ts` — PDFKit stream-to-buffer pattern, `doc.image()` usage
- `backend/package.json` — confirmed `pdfkit` 0.17.2, `@types/pdfkit` 0.17.4 installed; `qrcode` NOT installed
- `backend/src/prisma/schema.prisma` — confirmed `Factura` fields: `cae`, `caeFchVto`, `nroComprobante`, `qrData`, `ptoVta`, `moneda`, `tipoCambio`, `condicionIVAReceptor`; `EstadoFactura` enum with all 4 values
- `backend/src/modules/finanzas/finanzas.service.ts` — confirmed no `getFacturaById()` method exists; `getFacturas()` does not expose AFIP fields
- `backend/src/modules/finanzas/afip/afip.interfaces.ts` — `EmitirComprobanteParams` and `EmitirComprobanteResult` shape
- `.planning/STATE.md` — decision: qrData as URL string; FACTURADOR has no Profesional record; montos server-side
- `.planning/REQUIREMENTS.md` — QR-01, QR-02, QR-03 requirements; auto-fetch BNA out of scope

### Secondary (MEDIUM confidence)

- AFIP RG 5616/2024 — 13-field QR JSON payload specification (Anexo II). The `ver`, field ordering, and AFIP moneda codes ('PES', 'DOL') are standard and stable.
- `qrcode` npm package v1.5.x API — `toBuffer(text, options)` returning Promise<Buffer> is stable since v1.0.

### Tertiary (LOW confidence)

- None — all claims in this document are backed by codebase inspection or official AFIP regulation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pdfkit already in use; qrcode is the project-mandated package; all confirmed from package.json
- Architecture: HIGH — all patterns derived from existing codebase (presupuesto PDF, BullMQ, controller structure)
- Pitfalls: HIGH — identified from direct inspection of Phase 14 artifacts and schema

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable domain; qrcode 1.5.4 API has been stable for years)
