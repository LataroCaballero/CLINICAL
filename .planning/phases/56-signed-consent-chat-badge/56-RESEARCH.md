# Phase 56: Signed Consent + Chat Badge - Research

**Researched:** 2026-07-01
**Domain:** PDF stamping (pdf-lib), signature capture (signature_pad v5), forensic archival (Prisma schema), stored-XSS fix, chat badge
**Confidence:** HIGH

---

## Summary

Phase 56 closes v1.12 by wiring four capabilities: (1) patient draws signature in portal canvas → backend stamps it onto the template PDF with a visible forensic box → stores the signed PDF as an immutable archive with SHA-256 hash only in DB; (2) Prisma gains a `ConsentimientoFirmado` model plus a `version` field on `ConsentimientoZonaArchivo` plus a **critical FK addition** to `Cirugia`; (3) the `indicacionesUrl` stored-XSS blocker (CR-01) must be resolved before the link is exposed to the patient; (4) the chat gets a teal "Paciente" badge for `origenPaciente = true` messages.

The primary library for PDF stamping is **pdf-lib 1.17.1**. It ships with a CJS build (`cjs/index.js`) that NestJS consumes without configuration. Its coordinate origin is bottom-left; `StandardFonts.Helvetica` is built-in (no fontkit needed); `pdfDoc.save()` returns a `Uint8Array` that must be wrapped with `Buffer.from()`. The SHA-256 hash is computed over the final `Buffer` AFTER `save()` and is NEVER embedded in the PDF itself (circular per D-02).

There is a **critical schema gap** the planner must address: `Cirugia.procedimiento` is a free-text `String?` with no FK to `CirugiaCatalogo`. The D-09 chain (pending surgery → `CirugiaCatalogo.zonaId` → vigente consent) REQUIRES adding `cirugiaCatalogoId String?` to the `Cirugia` model. Without this FK, the resolver cannot determine which zone's consent to present.

**Primary recommendation:** Install `pdf-lib@1.17.1` on the backend; add `cirugiaCatalogoId String?` to `Cirugia`; add `version Int @default(1)` to `ConsentimientoZonaArchivo`; create new `ConsentimientoFirmado` model; increase JSON body limit to 2MB in `main.ts`; fix CR-01 at the write point before exposing `indicacionesUrl` to the patient.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Firma superpuesta sobre la ÚLTIMA página del PDF original (como firmar al pie del documento real). El PDF firmado es un artefacto SEPARADO del template (el original nunca se altera; se genera un nuevo archivo).
- D-02: Recuadro/pie forense VISIBLE en la misma página de la firma con fecha/hora (UTC), IP, userAgent y versión del consentimiento. El hash SHA-256 es del PDF firmado FINAL — NO puede imprimirse dentro del propio PDF (circular). Hash solo persiste en BD.
- D-03: Número de versión incremental por zona. Agregar `version Int` a `ConsentimientoZonaArchivo`. Backfill de existentes por `uploadedAt`. El registro forense guarda ese número.
- D-04: Modelo dedicado nuevo `ConsentimientoFirmado`. Campos mínimos: pacienteId, zonaId, consentimientoZonaArchivoId, pdfFirmadoPath, ip, userAgent, versionNumero, hashSha256, firmadoAt (UTC), indicacionesLeidasAt.
- D-05: Cardinalidad uno por zona/cirugía, varios por paciente. Un paciente multi-zona firma un consentimiento por zona.
- D-06: Artefacto inmutable. PDF firmado y registro forense NUNCA se editan ni borran.
- D-07: Paciente.consentimientoFirmado/consentimientoFirmadoAt (ya en schema) se usan como flag+fecha agregados para CONS-08. Setear al firmar (al menos una zona firmada).
- D-08: SIN re-firma en esta fase. Zona ya firmada aparece como "firmada" y NO se ofrece volver a firmar.
- D-09: Listar TODAS las zonas con cirugía pendiente. Cadena: cirugía(s) pendiente(s) → CirugiaCatalogo.zonaId → ConsentimientoZonaArchivo vigente de esa zona.
- D-10: Estados vacíos con mensaje claro, sin canvas. Casos: no hay cirugía pendiente / no tiene zona / no hay PDF vigente.
- D-11: Check "leí las indicaciones" OBLIGATORIO antes de firmar. Habilita el botón confirmar firma.
- D-12: indicacionesLeidasAt (timestamp) en ConsentimientoFirmado. Si la zona NO tiene indicacionesUrl, se muestra un check genérico "confirmo que fui informado" y se registra el timestamp igual.
- D-13: Badge "Paciente" con icono distinto + color teal para mensajes con origenPaciente=true. Backend: exponer origenPaciente en el mapeo del DTO de mensajes-internos. Frontend: renderizar la rama "paciente" en MessageBubble.tsx.

### Claude's Discretion
- Librería concreta para cargar/estampar el PDF existente (pdf-lib u otra) y mecánica del render de la firma PNG → PDF
- Layout/posición exacta del recuadro forense y de la firma en la última página
- Nombre final del modelo forense y sus campos/índices
- Criterio exacto para setear Paciente.consentimientoFirmado (al menos 1 zona firmada)
- Fallback de signature_pad si el dispositivo no soporta canvas/pointer events
- Ícono y tono exacto del badge "Paciente" del chat (teal locked)
- Estrategia de backfill del version Int incremental en ConsentimientoZonaArchivo

### Deferred Ideas (OUT OF SCOPE)
- Re-firma sobre versión nueva del consentimiento — NO en F56 (D-08)
- UI de versionado del consentimiento — FUT-05
- Migración a cloud storage del PDF firmado — FUT-01
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONS-03 | En el portal, el paciente puede ver y descargar el PDF de consentimiento subido por el médico | D-09 chain: Cirugia→CirugiaCatalogo→ZonaHC→ConsentimientoZonaArchivo vigente; servido por BACKEND_URL/uploads/... con attachment |
| CONS-04 | El paciente firma el consentimiento dibujando su firma (signature_pad), con fallback si el dispositivo no lo soporta | signature_pad v5.1.1 ya instalado; canvas ref approach; isEmpty() gate; pointer-events fallback; toDataURL('image/png') |
| CONS-05 | La firma dibujada se estampa en el PDF del consentimiento, generando un PDF firmado archivado como artefacto legal (separado del template original) | pdf-lib 1.17.1: PDFDocument.load → embedPng → drawImage → drawRectangle → drawText → save → Buffer → StorageService.save |
| CONS-06 | El consentimiento firmado registra metadata forense: fecha/hora, IP, userAgent, versión del consentimiento y hash del PDF | 5 campos en ConsentimientoFirmado model; hash computed AFTER pdfDoc.save(); IP from X-Forwarded-For; no hash in PDF body |
| CONS-07 | El paciente marca un check de "informado de indicaciones" (provistas vía link a la web del médico), registrado para auditoría | indicacionesLeidasAt timestamp; CR-01 XSS fix required before exposing indicacionesUrl as link; safe link render |
| CONS-08 | El estado de consentimiento firmado del paciente se refleja en el sistema (flag + fecha) visible para el profesional | Paciente.consentimientoFirmado + consentimientoFirmadoAt exist; findOne already returns all fields; DatosCompletos.tsx line 820 needs date display |
| CHAT-03 | El chat distingue origen de mensaje (paciente/staff/sistema) para que las consultas reales del paciente no se pierdan en el ruido | origenPaciente exists in MensajeInterno schema; needs adding to select + DTO map at line 138; MessageBubble.tsx teal branch |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Signature canvas capture | Browser/Client | — | Canvas API + signature_pad run client-side only |
| Base64 PNG transport | Browser → API | — | JSON body POST to portal endpoint |
| PDF stamping + forensic box | API/Backend | — | pdfkit/pdf-lib run server-side; template bytes from StorageService |
| SHA-256 hash computation | API/Backend | — | Must happen after PDF generation, server-side only |
| Signed PDF archival | API/Backend → Storage | — | StorageService.save(buffer, profesionalId) → relative path |
| Forensic record persistence | Database/Storage | — | ConsentimientoFirmado model in Postgres via Prisma |
| Consent status badge (staff) | Frontend Server | Browser/Client | DatosCompletos.tsx reads from TanStack Query cache |
| Chat message badge (Paciente) | Browser/Client | — | MessageBubble.tsx branch on origenPaciente prop |
| URL XSS prevention | API/Backend (write) + Browser (render) | — | Validate at write (catalogo-hc service) AND at render (frontend href only) |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdf-lib | 1.17.1 | Load existing PDF + stamp PNG + text onto last page | Only mature JS lib that can LOAD + MODIFY existing PDFs; pdfkit creates from scratch only [ASSUMED] |
| signature_pad | 5.1.1 | Canvas signature capture in portal | Already installed (frontend/package.json); official szimek/signature_pad [ASSUMED] |
| node:crypto (built-in) | Node.js built-in | SHA-256 hash of signed PDF buffer | No package needed; crypto.createHash('sha256') is stdlib [VERIFIED: Node.js stdlib] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @pdf-lib/fontkit | 1.1.1 | Custom font embedding | Only needed if clinic logo font or non-standard glyphs required; NOT needed for this phase (Helvetica built-in) [ASSUMED] |
| StandardFonts (pdf-lib built-in) | — | Helvetica/Helvetica-Bold for forensic box text | Available without additional packages via `import { StandardFonts } from 'pdf-lib'` [ASSUMED] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdf-lib | hummus-recipe, pdfmake, jsPDF | hummus-recipe is abandoned; pdfmake/jsPDF generate from scratch only (cannot load existing PDFs) |
| pdf-lib | puppeteer (render HTML→PDF) | Much heavier for simple stamping; introduces Chromium dependency |
| base64 PNG in JSON body | multipart/form-data | multipart adds complexity; base64 is simpler for a single ~200KB payload; increases body by 33% |

**Installation (backend only):**
```bash
cd backend && npm install pdf-lib@1.17.1
```

---

## Package Legitimacy Audit

> slopcheck was NOT available at research time. All packages below are tagged [ASSUMED] and the planner must gate each install behind a checkpoint:human-verify task before install.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| pdf-lib | npm | ~4 yrs (last: 2021-11-06) | High (widely cited) | github.com/Hopding/pdf-lib | unavailable | [ASSUMED] — human-verify before install |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
**slopcheck unavailable:** planner must add `checkpoint:human-verify` before `npm install pdf-lib`.

*Additional manual verification signals (do NOT substitute for slopcheck):*
- npm `main` field is `cjs/index.js` — confirmed CJS build present [CITED: npmjs.com/package/pdf-lib]
- GitHub repo github.com/Hopding/pdf-lib has 6k+ stars
- Version history consistent (incremental: 1.15→1.16→1.17→1.17.1)
- `npm view pdf-lib` returns valid metadata; no suspicious `scripts.postinstall`

---

## Architecture Patterns

### System Architecture Diagram

```
Patient Browser                Portal Backend (NestJS)          Storage (disk)     Database (Postgres)
─────────────────────────────────────────────────────────────────────────────────────────────────────
[1] User opens Step 3
    "Consentimiento"
         |
         ├─ GET /paciente-portal/public/consentimiento
         |    └─ PortalJwtGuard (pacienteId from JWT)
         |         └─ Resolver: Paciente.cirugias (PROGRAMADA/EN_CURSO)
         |              → cirugiaCatalogoId → CirugiaCatalogo.zonaId
         |              → ConsentimientoZonaArchivo (vigente=true)
         |    [empty-state] ─────────────────────────────────────────────► show message, no canvas
         |    [has PDF] ──────────────────────────────────────────────────► return { pdfUrl, zonaId, version }
         |
[2] User downloads/views PDF via pdfUrl
    (direct GET to BACKEND_URL/uploads/... no auth, UUID-guarded)

[3] User draws signature on canvas
    (signature_pad pad = new SignaturePad(canvasRef.current))
    isEmpty() === false ────────────────────────────────────────────────► enable confirm button
    indicacionesLeidas checkbox checked ─────────────────────────────────► enable confirm button

[4] User clicks "Firmar"
    dataUrl = pad.toDataURL('image/png')
         |
    POST /paciente-portal/public/consentimiento/firmar
         Body: { zonaId, signaturePngDataUrl, indicacionesLeidas: true }
         PortalJwtGuard ─── pacienteId from JWT only ───────────────────────────────────►
                                    |
                                    ├─ Strip base64 prefix server-side
                                    ├─ Validate PNG magic bytes
                                    ├─ StorageService.readFile(templatePath) → templateBuffer
                                    ├─ pdf-lib: PDFDocument.load(templateBuffer)
                                    ├─ Stamp signature PNG + forensic box on last page
                                    ├─ pdfDoc.save() → Uint8Array → Buffer
                                    ├─ crypto.createHash('sha256').update(buffer).digest('hex')
                                    ├─ StorageService.save(signedBuffer, profesionalId) → signedPath
                                    ├─ prisma.consentimientoFirmado.create({ ...5 forensic fields })
                                    ├─ prisma.paciente.update({ consentimientoFirmado: true,
                                    |                           consentimientoFirmadoAt: now() })
                                    └─ return { ok: true, pdfUrl: storageService.getPublicUrl(signedPath) }
                                                                           |
                                                                     Storage (disk)
                                                                     uploads/{profesionalId}/{uuid}.pdf

[5] Staff views PatientDrawer
    DatosCompletos.tsx ─── paciente.consentimientoFirmado + consentimientoFirmadoAt ─► green badge + date

[6] Staff views Chat
    MessageBubble.tsx ─── origenPaciente=true ─────────────────────────────────────► teal "Paciente" bubble
```

### Recommended Project Structure

```
backend/src/modules/
├── consentimientos/
│   ├── consentimientos.service.ts        # existing: upload, getZonas
│   ├── consent-stamp.service.ts          # NEW: PDF stamping logic (pdf-lib)
│   └── consentimientos.module.ts         # export ConsentStampService
├── paciente-portal/
│   ├── paciente-portal.controller.ts     # ADD: GET /consentimiento, POST /consentimiento/firmar
│   ├── paciente-portal.service.ts        # ADD: getConsentimientosParaFirmar(), firmarConsentimiento()
│   └── dto/
│       ├── firmar-consentimiento-portal.dto.ts  # NEW: { zonaId, signaturePngDataUrl, indicacionesLeidas }
│       └── ...
│
frontend/src/
├── app/portal/[token]/page.tsx            # REPLACE placeholder Consentimiento section
├── components/portal/
│   └── PortalConsentimiento.tsx           # NEW: PDF view/download + canvas + check + confirm
└── components/mensajes/
    └── MessageBubble.tsx                  # ADD: origenPaciente prop + teal branch
```

### Pattern 1: PDF Stamping with pdf-lib (D-01/D-02/CONS-05)

**What:** Load the vigente template PDF, stamp signature PNG + forensic box on the last page, return Buffer.
**When to use:** In `consent-stamp.service.ts` called from portal service after signature POST.

```typescript
// Source: pdf-lib official docs (pdf-lib.js.org) + npm CJS import
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as crypto from 'crypto';

interface StampInput {
  templateBuffer: Buffer;        // from StorageService.readFile(templatePath)
  signaturePngBuffer: Buffer;    // decoded from base64 dataUrl
  metadata: {
    fechaUtc: string;            // ISO 8601 UTC e.g. "2026-07-01T14:23:00.000Z"
    ip: string;
    userAgent: string;
    version: number;
  };
}

async function stampConsentimiento(
  input: StampInput,
): Promise<{ pdfBuffer: Buffer; hashSha256: string }> {
  // 1. Load existing PDF (never mutates the original buffer)
  const pdfDoc = await PDFDocument.load(input.templateBuffer);

  // 2. Get last page (coordinate origin: BOTTOM-LEFT, y increases upward)
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width, height } = lastPage.getSize();

  // 3. Embed standard font (Helvetica built-in — no fontkit needed)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 4. Embed PNG signature image
  const pngImage = await pdfDoc.embedPng(input.signaturePngBuffer);

  // Layout: stamp box at bottom of page, 140pt tall
  const MARGIN = 40;
  const BOX_HEIGHT = 140;
  const boxY = MARGIN;  // bottom-left origin: boxY is distance from bottom

  // 5. White background to flatten PNG alpha transparency
  lastPage.drawRectangle({
    x: MARGIN, y: boxY,
    width: width - 2 * MARGIN, height: BOX_HEIGHT,
    color: rgb(1, 1, 1),
  });

  // 6. Forensic border box
  lastPage.drawRectangle({
    x: MARGIN, y: boxY,
    width: width - 2 * MARGIN, height: BOX_HEIGHT,
    borderColor: rgb(0.3, 0.3, 0.3), borderWidth: 0.5,
  });

  // 7. Draw signature image (right ~40% of box)
  const sigWidth = (width - 2 * MARGIN) * 0.4;
  const sigHeight = 60;
  const sigX = width - MARGIN - sigWidth - 8;
  const sigY = boxY + (BOX_HEIGHT - sigHeight) / 2;
  lastPage.drawImage(pngImage, { x: sigX, y: sigY, width: sigWidth, height: sigHeight });

  // 8. Draw forensic text (left portion)
  const textX = MARGIN + 8;
  const lineGap = 13;
  let textY = boxY + BOX_HEIGHT - 18;

  lastPage.drawText('CONSENTIMIENTO FIRMADO DIGITALMENTE', {
    x: textX, y: textY, size: 8, font: boldFont, color: rgb(0, 0, 0),
  });
  textY -= lineGap;
  lastPage.drawText(`Fecha (UTC): ${input.metadata.fechaUtc}`, {
    x: textX, y: textY, size: 7, font, color: rgb(0, 0, 0),
  });
  textY -= lineGap;
  lastPage.drawText(`IP: ${input.metadata.ip}`, {
    x: textX, y: textY, size: 7, font, color: rgb(0, 0, 0),
  });
  textY -= lineGap;
  // Truncate userAgent to fit (typically 200+ chars)
  const ua = input.metadata.userAgent.slice(0, 80);
  lastPage.drawText(`Navegador: ${ua}`, {
    x: textX, y: textY, size: 7, font, color: rgb(0, 0, 0),
  });
  textY -= lineGap;
  lastPage.drawText(`Versión del consentimiento: ${input.metadata.version}`, {
    x: textX, y: textY, size: 7, font, color: rgb(0, 0, 0),
  });
  // NOTE: Hash NOT printed here — D-02 explicitly prohibits it (circular dependency)

  // 9. Serialize to Uint8Array then Buffer
  const pdfUint8 = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfUint8);

  // 10. Compute hash OVER THE FINAL BUFFER (after save — D-02 critical ordering)
  const hashSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  return { pdfBuffer, hashSha256 };
}
```

**Critical gotchas:**
- `pdf-lib` coordinate origin is bottom-left; `y` increases upward. The stamp sits at `y = MARGIN` (near the physical bottom of the page).
- `pdfDoc.save()` returns `Uint8Array`, NOT a Node `Buffer`. Wrap: `Buffer.from(uint8Array)`.
- Draw white background rectangle BEFORE the PNG to flatten alpha transparency (PNG with transparent pixels renders as black on some PDF viewers).
- `StandardFonts.Helvetica` and `HelveticaBold` are built-in — no `@pdf-lib/fontkit` install needed.
- Hash computed OVER `pdfBuffer` (after `save()`) — never inside the PDF content (D-02).

### Pattern 2: Forensic Hash — Correct Ordering (D-02 CRITICAL)

```typescript
// Source: Node.js stdlib — no package needed
import * as crypto from 'node:crypto';

// Step A: generate signed PDF buffer
const pdfUint8 = await pdfDoc.save();        // returns Uint8Array
const pdfBuffer = Buffer.from(pdfUint8);     // convert to Buffer for StorageService

// Step B: compute SHA-256 of the FINAL buffer (AFTER save, NEVER inside PDF body)
const hashSha256 = crypto
  .createHash('sha256')
  .update(pdfBuffer)        // pass Buffer directly
  .digest('hex');           // 64-char hex string

// Step C: persist signed PDF via StorageService
const signedPath = await this.storage.save(pdfBuffer, profesionalId);

// Step D: persist forensic record with hash (hash ONLY in DB, never in PDF)
await this.prisma.consentimientoFirmado.create({
  data: {
    ...
    pdfFirmadoPath: signedPath,
    hashSha256,  // persisted ONLY here — not in PDF body
  },
});
```

### Pattern 3: Signature Capture → Transport (CONS-04)

Frontend capture (portal canvas):
```typescript
// Source: signature_pad official README (github.com/szimek/signature_pad)
// signature_pad 5.1.1 is already in frontend/package.json
import SignaturePad from 'signature_pad';

// In React component
const canvasRef = useRef<HTMLCanvasElement>(null);
const padRef = useRef<SignaturePad | null>(null);

useEffect(() => {
  if (!canvasRef.current) return;
  // Fallback: if canvas not supported (rare in 2026, but guard anyway)
  if (typeof HTMLCanvasElement === 'undefined') {
    setCanvasSupported(false);
    return;
  }
  padRef.current = new SignaturePad(canvasRef.current, {
    backgroundColor: 'rgba(255, 255, 255, 0)',  // transparent bg (backend draws white rect)
    penColor: 'rgb(0, 0, 0)',
  });
  return () => padRef.current?.off();
}, []);

const handleFirmar = () => {
  if (!padRef.current || padRef.current.isEmpty()) {
    // isEmpty() = true if no strokes drawn
    setError('Dibujá tu firma antes de confirmar.');
    return;
  }
  // toDataURL returns "data:image/png;base64,<base64>" — backend strips prefix
  const dataUrl = padRef.current.toDataURL('image/png');
  // Send as JSON body; backend strips "data:image/png;base64," prefix
  submitFirma({ zonaId, signaturePngDataUrl: dataUrl, indicacionesLeidas: true });
};
```

Backend validation and strip (in `firmar-consentimiento-portal.dto.ts` + service):
```typescript
// Strip data URL prefix server-side (NEVER trust client to do this)
const b64 = dto.signaturePngDataUrl.split(',')[1];
if (!b64) throw new BadRequestException('Firma inválida');
const pngBuffer = Buffer.from(b64, 'base64');

// Validate PNG magic bytes: \x89PNG\r\n\x1a\n
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!pngBuffer.subarray(0, 8).equals(PNG_MAGIC)) {
  throw new BadRequestException('El archivo de firma no es un PNG válido');
}
// Max size guard (raw PNG from 400x150 canvas ~50-150KB; base64 +33% → ~67-200KB)
if (pngBuffer.length > 1_000_000) {
  throw new BadRequestException('Imagen de firma demasiado grande');
}
```

**Body size limit — MUST increase in main.ts:**
NestJS/Express default JSON body limit is 100KB. A base64 PNG signature at ~200KB base64 will return `413 Payload Too Large`. Fix in `backend/src/main.ts` before `app.listen()`:
```typescript
// In bootstrap() after NestFactory.create():
import * as express from 'express';
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
```

**Fallback when canvas/pointer events not supported:**
```tsx
// In PortalConsentimiento.tsx
const [canvasSupported, setCanvasSupported] = useState(true);

// Check on mount
useEffect(() => {
  if (typeof HTMLCanvasElement === 'undefined' || typeof PointerEvent === 'undefined') {
    setCanvasSupported(false);
  }
}, []);

// Render fallback
if (!canvasSupported) {
  return (
    <p className="text-base text-gray-600 py-4">
      Tu dispositivo no soporta la firma digital. Contactá a tu médico para firmar en persona.
    </p>
  );
}
```

### Pattern 4: Portal Signature Endpoints

Both endpoints go in the EXISTING `PacientePortalController` (`paciente-portal.controller.ts`), under `PortalJwtGuard`. The PDF stamping logic lives in a new `ConsentStampService` exported from `consentimientos.module.ts` and injected into `paciente-portal.module.ts`.

**GET (resolve zones for signature):**
```typescript
@UseGuards(PortalJwtGuard)
@Get('consentimiento')
getConsentimiento(@Req() req: PortalRequest) {
  // pacienteId from JWT only — pitfall 12
  return this.service.getConsentimientosParaFirmar(req.user.pacienteId);
}
```

**POST (submit signature):**
```typescript
@UseGuards(PortalJwtGuard)
@Post('consentimiento/firmar')
firmarConsentimiento(
  @Req() req: PortalRequest,
  @Body(new ValidationPipe({ whitelist: true })) dto: FirmarConsentimientoPortalDto,
) {
  // pacienteId from JWT only (pitfall 12)
  // ip + userAgent captured server-side from request headers (never from body)
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    ?? req.socket.remoteAddress
    ?? 'unknown';
  const userAgent = (req.headers['user-agent'] as string) ?? 'unknown';
  return this.service.firmarConsentimiento(req.user.pacienteId, dto, ip, userAgent);
}
```

**DTO:**
```typescript
// dto/firmar-consentimiento-portal.dto.ts
import { IsBoolean, IsString, IsUUID } from 'class-validator';

export class FirmarConsentimientoPortalDto {
  @IsUUID()
  zonaId: string;

  @IsString()
  signaturePngDataUrl: string;  // data URL — prefix stripped server-side

  @IsBoolean()
  indicacionesLeidas: boolean;  // must be true; service validates
}
```

### Pattern 5: CR-01 XSS Fix — indicacionesUrl Write Point (MANDATORY BLOCKER)

In `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` at `actualizarIndicacionesUrl` (~line 760):

```typescript
async actualizarIndicacionesUrl(
  profesionalId: string,
  zonaId: string,
  indicacionesUrl: string | null,
) {
  // CR-01 FIX — validate before persisting (no global ValidationPipe; @IsUrl is dead code)
  if (indicacionesUrl !== null) {
    if (indicacionesUrl.length > 2048) {
      throw new BadRequestException('URL demasiado larga (máx. 2048 caracteres)');
    }
    let parsed: URL;
    try {
      parsed = new URL(indicacionesUrl);
    } catch {
      throw new BadRequestException('URL de indicaciones inválida');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('Solo se permiten URLs http o https');
    }
  }

  const zona = await this.prisma.zonaHC.findUnique({ where: { id: zonaId } });
  if (!zona || zona.profesionalId !== profesionalId) {
    throw new NotFoundException('Zona no encontrada');
  }
  return this.prisma.zonaHC.update({ where: { id: zonaId }, data: { indicacionesUrl } });
}
```

**Frontend safe render in PortalConsentimiento.tsx:**
```tsx
// SAFE render — NEVER dangerouslySetInnerHTML
// Validate protocol at render point as defense-in-depth (even after server-side fix)
const safeIndicacionesUrl =
  indicacionesUrl && /^https?:\/\//i.test(indicacionesUrl) ? indicacionesUrl : null;

{safeIndicacionesUrl ? (
  <a
    href={safeIndicacionesUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="text-teal-600 underline"
  >
    Ver indicaciones del médico
  </a>
) : (
  <span className="text-gray-500">Sin link de indicaciones</span>
)}
```

### Pattern 6: Chat Badge — CHAT-03

**Backend: `mensajes-internos.service.ts` line ~112-139**

The `findByPaciente` query `select` (line 112) must include `origenPaciente`:
```typescript
select: {
  id: true,
  mensaje: true,
  prioridad: true,
  esSistema: true,
  origenPaciente: true,   // ADD — already in MensajeInterno model
  createdAt: true,
  autorId: true,
  autor: { select: { ... } },
  lecturas: { where: { usuarioId: userId }, select: { leidoAt: true } },
},
```

The `.map()` at line 135 must expose it in the DTO shape:
```typescript
return mensajes.map((m) => ({
  ...m,
  leido: m.lecturas.length > 0,
  esPropio: m.autorId === userId && !m.esSistema,
  origenPaciente: m.origenPaciente,  // ADD — already Boolean in model
}));
```

**Frontend: `MessageBubble.tsx` — add origenPaciente prop + teal branch**

```tsx
// Add to interface:
interface MessageBubbleProps {
  // ...existing props
  origenPaciente: boolean;  // NEW
}

// Add new branch BETWEEN esSistema check and the general avatar branch:
// Check order: esSistema first → origenPaciente second → staff (esPropio/other) last
if (origenPaciente && !esSistema) {
  return (
    <div className="flex gap-2 max-w-[85%] mr-auto">
      {/* Teal circle icon — UserRound from lucide-react (already installed) */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
        <UserRound className="h-4 w-4 text-teal-600" />
      </div>
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-teal-700">Paciente</span>
          <PriorityBadge prioridad={prioridad} size="sm" showLabel={false} />
        </div>
        <div className={cn(
          'rounded-2xl rounded-tl-sm px-3 py-2 text-sm',
          'bg-teal-50 border border-teal-200 text-teal-900',
          prioridad === 'ALTA' && 'border-l-2 border-red-500'
        )}>
          <p className="whitespace-pre-wrap break-words">{mensaje}</p>
        </div>
        <span className="text-[10px] text-muted-foreground mt-1">
          {fechaFormateada} {horaFormateada}
        </span>
      </div>
    </div>
  );
}
```

Add `UserRound` to the existing lucide-react import at line 8.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Load existing PDF + stamp content | Custom PDF binary parser | pdf-lib | PDF is a complex binary format; hand-rolling byte-level manipulation is error-prone and legally risky |
| SHA-256 hash | Custom hash function | `node:crypto` stdlib | Crypto is safety-critical; never roll your own |
| URL protocol validation | Regex against indicacionesUrl | `new URL(url)` + `parsed.protocol` check | `new URL()` follows the WHATWG URL Standard; regex can have edge cases |
| Canvas signature capture | Raw canvas mousedown/touchmove event tracking | signature_pad (already installed) | Bezier smoothing, iOS Safari touch quirks, pixel ratio handling all covered |

---

## Critical Schema Gap — Cirugia → CirugiaCatalogo FK (D-09)

**Current state (BROKEN for D-09):**
```
Cirugia {
  procedimiento String?  // FREE TEXT — "Mamoplastia de Aumento"
  // NO FK to CirugiaCatalogo
}
CirugiaCatalogo {
  nombre        String   // "Mamoplastia de Aumento"
  zonaId        String?  // FK to ZonaHC → where consent lives
}
```

`Cirugia.procedimiento` is free text. There is **no FK** from `Cirugia` to `CirugiaCatalogo`. The D-09 chain (pending Cirugia → `CirugiaCatalogo.zonaId` → `ConsentimientoZonaArchivo`) is **broken** in the current schema.

**Required migration addition:**
```prisma
model Cirugia {
  // ... existing fields ...
  cirugiaCatalogoId String?              // NEW FK — enables D-09 chain
  cirugiaCatalogo   CirugiaCatalogo? @relation(fields: [cirugiaCatalogoId], references: [id], onDelete: SetNull)
}

model CirugiaCatalogo {
  // ... existing fields ...
  cirugias Cirugia[]   // NEW inverse relation
}
```

**Consequence:** Existing `Cirugia` rows will have `cirugiaCatalogoId = null`. The portal resolver must handle this as an empty-state case (D-10): "Tu médico necesita completar la configuración de la cirugía."

---

## Prisma Schema Deltas

### 1. Add `version Int` to `ConsentimientoZonaArchivo` (D-03)

```prisma
model ConsentimientoZonaArchivo {
  id             String   @id @default(uuid())
  zonaId         String
  zona           ZonaHC   @relation(fields: [zonaId], references: [id], onDelete: Cascade)
  profesionalId  String
  path           String
  nombreOriginal String
  uploadedAt     DateTime @default(now())
  vigente        Boolean  @default(true)
  version        Int      @default(1)    // NEW — D-03

  consentimientosFirmados ConsentimientoFirmado[]  // NEW back-relation

  @@index([zonaId, vigente])
  @@index([profesionalId])
}
```

**Backfill SQL** (include in migration file after adding column):
```sql
-- Assign incremental version per zona ordered by uploadedAt
WITH versioned AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "zonaId"
           ORDER BY "uploadedAt" ASC
         ) AS v
  FROM "ConsentimientoZonaArchivo"
)
UPDATE "ConsentimientoZonaArchivo" czm
SET version = versioned.v
FROM versioned
WHERE czm.id = versioned.id;
```

New uploads (`consentimientos.service.ts` `uploadConsentimiento`) must set `version` automatically. Suggestion: query the current max version for the zona and increment:
```typescript
const maxVersion = await this.prisma.consentimientoZonaArchivo.aggregate({
  where: { zonaId },
  _max: { version: true },
});
const nextVersion = (maxVersion._max.version ?? 0) + 1;
// Then use nextVersion in the create() data
```

### 2. New `ConsentimientoFirmado` model (D-04)

```prisma
model ConsentimientoFirmado {
  id                          String                    @id @default(uuid())
  pacienteId                  String
  zonaId                      String
  consentimientoZonaArchivoId String                    // exact version that was signed
  pdfFirmadoPath              String                    // relative path via StorageService
  ip                          String
  userAgent                   String
  versionNumero               Int                       // snapshot from ConsentimientoZonaArchivo.version
  hashSha256                  String                    // SHA-256 of signed PDF buffer
  firmadoAt                   DateTime @default(now())  // UTC, DB default
  indicacionesLeidasAt        DateTime                  // set at signing time, required

  paciente                   Paciente                   @relation(fields: [pacienteId], references: [id])
  zona                       ZonaHC                     @relation(fields: [zonaId], references: [id])
  consentimientoZonaArchivo  ConsentimientoZonaArchivo  @relation(fields: [consentimientoZonaArchivoId], references: [id])

  @@index([pacienteId])
  @@index([zonaId])
  @@index([pacienteId, zonaId])  // for "already signed this zone?" check (D-08)
}
```

**Inverse relations needed in existing models:**
- `Paciente` model: add `consentimientosFirmados ConsentimientoFirmado[]`
- `ZonaHC` model: add `consentimientosFirmados ConsentimientoFirmado[]`

### 3. Add `cirugiaCatalogoId` FK to `Cirugia` (REQUIRED for D-09)

See "Critical Schema Gap" section above.

---

## Pending-Surgery → Zone → Template Resolution (D-09/D-10/CONS-03)

**Complete resolver chain** (service method `getConsentimientosParaFirmar(pacienteId)`):

```typescript
// Step 1: Get patient's profesionalId
const paciente = await prisma.paciente.findUnique({
  where: { id: pacienteId },
  select: { profesionalId: true },
});

// Step 2: Get pending cirugias WITH cirugiaCatalogo.zona.vigente consent
const cirugias = await prisma.cirugia.findMany({
  where: {
    pacienteId,
    estado: { in: ['PROGRAMADA', 'EN_CURSO'] },
    cirugiaCatalogoId: { not: null },  // only if catalog linked
  },
  include: {
    cirugiaCatalogo: {
      include: {
        zona: {
          include: {
            consentimientoArchivos: {
              where: { vigente: true },
              orderBy: { uploadedAt: 'desc' },
              take: 1,
            },
            // Check if patient already signed this zone (D-08)
            consentimientosFirmados: {
              where: { pacienteId },
              take: 1,
            },
          },
        },
      },
    },
  },
});
```

**Empty-state cases (D-10) — return message, no canvas for each:**

| State | Root Cause | Message to Patient |
|-------|-----------|-------------------|
| No pending Cirugias | `cirugias` array empty | "Todavía no hay una cirugía programada para firmar el consentimiento." |
| Cirugia exists but `cirugiaCatalogoId` is null | Staff didn't link to catalog | "Tu médico necesita completar la configuración de tu cirugía." |
| `CirugiaCatalogo.zonaId` is null | Catalog item has no zone | "La zona de tu cirugía no está configurada todavía." |
| Zone has no vigente `ConsentimientoZonaArchivo` | Staff hasn't uploaded consent yet | "Todavía no hay un consentimiento disponible para firmar; tu médico lo va a cargar pronto." |
| Zone has vigente consent AND patient already signed (`consentimientosFirmados` non-empty) | D-08 no re-sign | "Ya firmaste el consentimiento para esta zona. Gracias." (show, no canvas) |
| Zone has vigente consent AND not yet signed | Happy path | Show PDF link + canvas + indicaciones check |

---

## CONS-08: Staff Consent Badge

**What exists:** `Paciente.consentimientoFirmado` (Boolean) and `consentimientoFirmadoAt` (DateTime?) already in schema.

**What findOne returns:** `findOne` in `pacientes.service.ts` does `...paciente` spread → ALL Paciente model fields are returned, including `consentimientoFirmadoAt`. No backend change needed for the detail endpoint.

**What findAll returns:** `findAll` (line 169 in pacientes.service.ts) currently returns `consentimientoFirmado` but NOT `consentimientoFirmadoAt`. The planner should add `consentimientoFirmadoAt: p.consentimientoFirmadoAt` to the `PacienteListaDto` shape if the badge is needed in the list view.

**Frontend — DatosCompletos.tsx (~line 820):**
The consent state is already shown as an editable checkbox (staff can manually set it). For CONS-08, add the `consentimientoFirmadoAt` date display next to the existing checkbox:

```tsx
<FieldRow
  label="Consentimiento firmado"
  value={
    <div className="flex items-center gap-2">
      <EditableCheckbox
        disabled={!isEditing("estado") || saving}
        checked={estadoForm.consentimientoFirmado}
        onChange={(v) => setEstadoForm((f) => ({ ...f, consentimientoFirmado: v }))}
      />
      {paciente.consentimientoFirmadoAt && (
        <span className="text-xs text-teal-600 font-medium">
          {new Date(paciente.consentimientoFirmadoAt).toLocaleDateString('es-AR')}
        </span>
      )}
    </div>
  }
/>
```

---

## Common Pitfalls

### Pitfall A: PDF coordinate origin confusion (pdf-lib bottom-left)
**What goes wrong:** Developer places the stamp "near the top" visually by setting `y = page.height - 140` without remembering that y=0 is the BOTTOM of the page. The stamp renders at the visual top, covering the consent header.
**How to avoid:** `y = MARGIN` (e.g., 40pt) positions the box near the BOTTOM of the page — physically, "at the bottom" means low y values. Stamp box occupies `y=40` to `y=180`. Use `lastPage.getSize()` to get `{ width, height }`.
**Warning signs:** Stamp appears at the top of the rendered PDF when viewed.

### Pitfall B: Hash-over-template instead of hash-over-signed-PDF (D-02 CRITICAL)
**What goes wrong:** Developer computes `crypto.createHash('sha256').update(templateBuffer)` instead of computing it over the final stamped PDF buffer. The hash no longer reflects the document the patient actually signed.
**How to avoid:** Hash is the LAST step: `pdfDoc.save()` → `Buffer.from(uint8Array)` → `createHash().update(buffer).digest('hex')`. The hash goes ONLY to the DB, never inside the PDF.

### Pitfall C: Cirugia.procedimiento text-match to CirugiaCatalogo.nombre (fragile)
**What goes wrong:** Developer tries to resolve the D-09 chain by matching `Cirugia.procedimiento === CirugiaCatalogo.nombre` instead of using a proper FK. Breaks on typos, case differences, or renames.
**How to avoid:** Add `cirugiaCatalogoId String?` FK to `Cirugia` and require staff to link new surgeries to catalog. Handle existing null FKs as D-10 empty state.

### Pitfall D: Body size 413 on signature POST
**What goes wrong:** Default NestJS/Express 100KB JSON limit rejects the base64 PNG body.
**How to avoid:** Add `app.use(express.json({ limit: '2mb' }))` in `main.ts` before `app.listen()`. The `rawBody: true` flag already set in NestFactory.create does not increase the limit.

### Pitfall E: pacienteId from DTO body instead of JWT (pitfall 12)
**What goes wrong:** Developer adds `pacienteId` or `zonaId` validation that appears to scope the query but the `pacienteId` was actually accepted from the request body, allowing IDOR.
**How to avoid:** `pacienteId` derives ONLY from `req.user.pacienteId` (PortalJwtGuard injects via strategy). `zonaId` from DTO is validated by the service to belong to the patient's profesional.

### Pitfall F: PNG transparency makes signature invisible
**What goes wrong:** signature_pad defaults to `backgroundColor: 'rgba(255,255,255,0)'` (transparent). pdf-lib renders transparent PNG pixels as black on some viewers, or the signature area appears blank on others.
**How to avoid:** Draw a white `drawRectangle` with `color: rgb(1,1,1)` BEFORE calling `drawImage` for the PNG. This flattens alpha.

### Pitfall G: origenPaciente missing from Prisma select
**What goes wrong:** `findByPaciente` already has a typed `select` block (line 112). If `origenPaciente: true` is not added there, Prisma won't return the field even though it exists on the model. The `.map()` spread at line 136 will produce `origenPaciente: undefined` silently.
**How to avoid:** Add `origenPaciente: true` to the `select` block at line 112, AND add `origenPaciente: m.origenPaciente` to the `.map()` at line 135.

---

## Code Examples

### CJS import of pdf-lib in NestJS service

```typescript
// Source: npm view pdf-lib main → "cjs/index.js" (CJS native, no ESM flag needed)
// Works with NestJS CommonJS TypeScript without any tsconfig changes
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
// OR if tsconfig needs it:
// const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
```

### IP capture server-side (never from body)

```typescript
// Source: Node.js/Express documented headers
const ip =
  (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
  req.socket?.remoteAddress ??
  'unknown';
const userAgent = (req.headers['user-agent'] as string) ?? 'unknown';
```

### Check "zona already signed" for D-08 (no re-sign)

```typescript
const existingSignature = await prisma.consentimientoFirmado.findFirst({
  where: { pacienteId, zonaId: dto.zonaId },
});
if (existingSignature) {
  throw new ConflictException('El consentimiento para esta zona ya fue firmado.');
}
```

### Set Paciente aggregate flag after signing (D-07)

```typescript
// Set consentimientoFirmado=true once >= 1 ConsentimientoFirmado exists for patient
await prisma.paciente.update({
  where: { id: pacienteId },
  data: {
    consentimientoFirmado: true,
    consentimientoFirmadoAt: new Date(),  // UTC server time
  },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pdfkit (generate from scratch) | pdf-lib (load + modify existing) | Greenfield for this phase | pdfkit cannot load existing PDFs; pdf-lib is the standard for PDF modification in Node.js |
| Print hash inside PDF | Compute hash after save, store only in DB | D-02 decision (circular constraint) | Hash-over-signed-PDF is the only legally defensible approach |
| Hardcode pacienteId from body | Derive from JWT (PortalJwtGuard) | F54/PITFALL-12 | Prevents IDOR across portal tenants |

**Deprecated / never-use:**
- `pdfkit` for stamping: cannot load existing PDFs — greenfield only
- `jsPDF`: same limitation
- `@IsUrl()` decorator in NestJS DTOs without global ValidationPipe: dead code in this project (confirmed: no global ValidationPipe in main.ts)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `pdf-lib@1.17.1` is the correct install command and CJS import works in NestJS without additional tsconfig changes | Standard Stack, Code Examples | Low: CJS build is confirmed via `npm view pdf-lib main = cjs/index.js`; widely used in Node.js projects |
| A2 | Increasing body limit with `app.use(express.json({ limit: '2mb' }))` in `main.ts` works alongside `rawBody: true` | Pattern 3 | Low: `rawBody: true` is for the raw body preserve feature; JSON limit is a separate middleware option |
| A3 | `UserRound` icon is available in `lucide-react` version installed (`^0.553.0`) | Pattern 6 CHAT-03 | Low: `UserRound` has been in lucide-react since v0.259; installed version is 0.553.0 |
| A4 | `consentimientoZonaArchivoId` can reference `ConsentimientoZonaArchivo` directly (no onDelete: Cascade on the forensic record) | Prisma Schema | Low: ForensicRecord is immutable (D-06); `onDelete: Restrict` or `NoAction` is the correct choice to prevent cascade deletion |
| A5 | The `@pdf-lib/fontkit` package is NOT needed since only `StandardFonts.Helvetica` and `HelveticaBold` are used in the forensic box | Standard Stack | Low: StandardFonts are built-in pdf-lib features confirmed in official docs |

---

## Open Questions (RESOLVED)

1. **Who links Cirugia → CirugiaCatalogo in practice?** — **RESOLVED**
   - What we know: `Cirugia.cirugiaCatalogoId` doesn't exist yet; staff creates Cirugias from the agenda/operational view.
   - What's unclear: Does the staff flow for creating a `Cirugia` already use `CirugiaCatalogo`? The current schema has `Cirugia.procedimiento String?` as free text with no catalog link.
   - **RESOLUTION (user decision — CONTEXT.md "Add catalog selector"):** The professional links a surgery to a `CirugiaCatalogo` via a **catalog selector added to the agenda surgery create modal** (`SurgeryAppointmentModal.tsx`). Plan 01 adds the `Cirugia.cirugiaCatalogoId` FK (`onDelete: SetNull`); **Plan 08** adds the optional `cirugiaCatalogoId` to the create DTO (`create-cirugia-turno.dto.ts`), persists it in `turnos.service.ts crearTurnoCirugia`, and adds the `CirugiaCatalogo` `Select` to the modal. The codebase has NO cirugia edit/update endpoint (only turno-status `@Patch` routes), so linking happens at create time; this is sufficient — newly-created surgeries carry the FK, and existing unlinked cirugias fall to the D-10 `SIN_CATALOGO` empty-state gracefully (no backfill required).

2. **Should `consentimientoFirmadoAt` appear in the findAll list response (patient list view)?** — **RESOLVED**
   - What we know: `findOne` (detail) returns all Paciente fields including `consentimientoFirmadoAt`. `findAll` explicitly maps `consentimientoFirmado: p.consentimientoFirmado` but NOT the date.
   - **RESOLUTION:** CONS-08 (badge in the professional PatientSheet/drawer) is served by the **`findOne` detail view only** — no `findAll` change is needed. Plan 07 renders the emerald badge in `DatosCompletos.tsx` (drawer detail), and `findOne` already returns `consentimientoFirmadoAt`. The badge is **not** added to the patient list cards.

3. **`onDelete` behavior for `ConsentimientoFirmado.consentimientoZonaArchivoId`?** — **RESOLVED**
   - What we know: D-06 says the forensic record is immutable and must never be deleted. If a `ConsentimientoZonaArchivo` row is deleted (though the current code never deletes them), the FK would cascade/restrict.
   - **RESOLUTION:** Use **`onDelete: Restrict`** on the `consentimientoZonaArchivo` relation (implemented in Plan 01, Task 1) to block deletion of a signed template version — surfacing the D-06 immutability constraint at the DB level.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js `crypto` | SHA-256 hash (D-02) | Yes (built-in) | Node stdlib | — |
| `pdf-lib` npm package | PDF stamping (CONS-05) | Not yet installed in backend | 1.17.1 latest | — (no fallback; must install) |
| `signature_pad` npm package | Canvas signature (CONS-04) | Yes — frontend/package.json line 62 | 5.1.1 | — |
| `lucide-react` `UserRound` icon | Chat badge (CHAT-03) | Yes — package.json `^0.553.0` | 0.553.0 | Use `User` icon as minimal fallback |
| PostgreSQL | Prisma migrations | Yes (existing project DB) | existing | — |

**Missing dependencies with no fallback:**
- `pdf-lib` not yet installed in backend — must `npm install pdf-lib@1.17.1` (checkpoint:human-verify required per Package Legitimacy Audit).

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on F56 |
|-----------|---------------|
| NestJS + Prisma + PostgreSQL backend | All schema changes via `npx prisma migrate dev`; service in NestJS module pattern |
| Next.js 16 + React 19 + TypeScript frontend | Portal component uses client components (`'use client'`); canvas requires DOM |
| Tailwind CSS + shadcn/ui + Radix | Chat badge and consent badge use Tailwind classes; no custom CSS |
| TanStack Query hooks | Portal consent hook follows `usePortalDatos` pattern in `frontend/src/hooks/` |
| JWT with refresh tokens (stored in localStorage) | Portal JWT is separate (portal-scoped, short-lived); not in localStorage — in-memory or sessionStorage for portal |
| No global ValidationPipe | Per-route `new ValidationPipe({ whitelist: true })` REQUIRED on all portal POST endpoints (confirmed pattern in existing controller) |
| Multi-tenant by profesionalId | StorageService paths: `uploads/{profesionalId}/{uuid}.pdf`; all queries scoped to profesionalId from JWT |
| Token-efficient dev rules | Minimum diff; avoid repo-wide reads; frontend changes in targeted files only |
| Security: nunca leer .env* | `BACKEND_URL` used server-side only via `process.env.BACKEND_URL` |

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection: `backend/src/prisma/schema.prisma` — confirmed `Cirugia`, `CirugiaCatalogo`, `ConsentimientoZonaArchivo`, `MensajeInterno.origenPaciente`, `Paciente.consentimientoFirmado/At`
- Codebase direct inspection: `backend/src/modules/mensajes-internos/mensajes-internos.service.ts` — confirmed select/map structure at lines 112-139
- Codebase direct inspection: `backend/src/modules/paciente-portal/paciente-portal.controller.ts` — confirmed `PortalJwtGuard`, per-route `ValidationPipe`, `PortalRequest` type pattern
- Codebase direct inspection: `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` lines ~760-773 — confirmed no URL validation in `actualizarIndicacionesUrl`
- Codebase direct inspection: `backend/src/modules/storage/storage.service.ts` — confirmed `save(buffer, profesionalId)`, `getPublicUrl`, `readFile` API
- Codebase direct inspection: `backend/src/main.ts` — confirmed no global ValidationPipe, no body size configuration, `rawBody: true`
- Codebase direct inspection: `frontend/package.json` — confirmed `signature_pad: ^5.1.1`, `lucide-react: ^0.553.0`
- Codebase direct inspection: `frontend/src/components/mensajes/MessageBubble.tsx` — confirmed `esSistema` and `esPropio` branch structure, `Bot` icon pattern
- Codebase direct inspection: `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx` lines 820-831 — confirmed `consentimientoFirmado` checkbox location
- `npm view pdf-lib` — confirmed version 1.17.1, main: `cjs/index.js` (CJS native), repository: github.com/Hopding/pdf-lib
- `npm view signature_pad` — confirmed version 5.1.3 latest (5.1.1 installed), homepage: github.com/szimek/signature_pad

### Secondary (MEDIUM confidence)
- [pdf-lib official site](https://pdf-lib.js.org/) — API surface confirmed: PDFDocument.load, getPages, embedPng, drawImage, drawRectangle, drawText, save; coordinate origin bottom-left
- [github.com/Hopding/pdf-lib README](https://github.com/Hopding/pdf-lib#readme) — CJS/ESM import patterns, StandardFonts, fontkit usage

### Tertiary (LOW confidence)
- WebSearch results on NestJS body size limit — `express.json({ limit: '2mb' })` pattern widely documented; not verified against NestJS source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pdf-lib CJS confirmed via `npm view main`; signature_pad confirmed installed; Node crypto is stdlib
- Architecture: HIGH — based on direct codebase inspection of all affected files
- Prisma schema deltas: HIGH — confirmed existing fields, confirmed missing FK, confirmed existing models
- Pitfalls: HIGH — based on direct code inspection + established security patterns from PITFALLS.md
- Body size limit fix: MEDIUM — pattern widely documented but not verified against exact NestJS version

**Research date:** 2026-07-01
**Valid until:** 2026-07-31 (pdf-lib 1.17.1 is stable, last release 2021; unlikely to change)
