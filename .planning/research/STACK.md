# Stack Research — v1.12 Historia Clínica Pre-Quirúrgica y Portal del Paciente

**Domain:** Medical SaaS — surgical consent with drawn signature + token-based patient portal
**Researched:** 2026-06-25
**Confidence:** HIGH

## Summary

v1.12 requires **two new backend packages** and **zero new frontend packages**. The most
important finding is that `signature_pad@5.1.3` is already installed in the frontend — no
React wrapper library is needed. On the backend, `@cantoo/pdf-lib` handles stamping
signatures onto uploaded PDFs (PDFKit cannot modify existing documents), and `@types/multer`
provides TypeScript types for the multer bindings already bundled inside
`@nestjs/platform-express`. Static file serving requires no new package.

---

## New Dependencies Required

### Backend — add to `backend/`

| Package | Version | Why |
|---------|---------|-----|
| `@cantoo/pdf-lib` | `^2.7.1` | Load existing consent PDF, embed PNG signature, stamp timestamp text, save signed PDF |
| `@types/multer` | `^2.1.0` | TypeScript types for multer (runtime already bundled with `@nestjs/platform-express`) |

### Frontend — add to `frontend/`

**None.** `signature_pad@5.1.3` is already installed (`^5.1.1` in package.json). Write a
thin React wrapper component; no new npm dependency required.

```bash
# Backend only
cd backend && npm install @cantoo/pdf-lib
npm install -D @types/multer
```

---

## Recommended Stack

### Core Technologies (existing, role in v1.12)

| Technology | Installed Version | Role in v1.12 |
|------------|------------------|---------------|
| `signature_pad` | `^5.1.1` (frontend) | Canvas drawing surface; `toDataURL('image/png')` exports the signature as a PNG data URL to send to backend |
| `@nestjs/platform-express` | `^10.0.0` (backend) | Already includes multer runtime; powers `@FileInterceptor`, `MulterModule`, `diskStorage` — no separate multer install needed |
| `pdfkit` | `^0.17.2` (backend) | Unchanged — continues to generate presupuesto / factura PDFs from scratch |
| `@prisma/client` | `^6.1.0` (backend) | New models: `DocumentoConsentimiento`, `PlantillaPrequirurgica`, `TokenPaciente` |

### New Libraries

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| `@cantoo/pdf-lib` | `^2.7.1` | Load, modify, save existing PDFs in Node.js. API is a drop-in superset of `pdf-lib`. Actively maintained (last release May 2026). | HIGH |
| `@types/multer` | `^2.1.0` | TypeScript types for `Express.Multer.File` interface — needed as soon as you write `@UploadedFile() file: Express.Multer.File` in a controller. | HIGH |

### Supporting Libraries (already installed, newly applied)

| Library | Installed Version | New Usage in v1.12 |
|---------|------------------|--------------------|
| `signature_pad` | `^5.1.1` | Thin `'use client'` React wrapper component; `ref.current.toDataURL('image/png')` for export |
| `crypto` (Node built-in) | N/A | `crypto.randomUUID()` for unique uploaded filenames — no uuid package needed |
| `path` (Node built-in) | N/A | `path.join(process.cwd(), 'uploads', 'consentimientos')` for disk destination |
| `fs/promises` (Node built-in) | N/A | Read uploaded PDF bytes for pdf-lib processing |

---

## Integration Points

### A. Signature Capture (Frontend)

`signature_pad` is already installed and is the underlying engine of any React signature
library. Write a `SignaturePad` component directly:

```typescript
// frontend/src/components/ui/SignaturePad.tsx
'use client';
import { useEffect, useRef } from 'react';
import SignaturePadLib from 'signature_pad';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
}

export function SignaturePad({ onSave }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    padRef.current = new SignaturePadLib(canvasRef.current, {
      penColor: 'rgb(0, 0, 0)',
    });
    return () => padRef.current?.off();
  }, []);

  const handleSave = () => {
    if (padRef.current?.isEmpty()) return;
    onSave(padRef.current!.toDataURL('image/png'));
  };

  return (
    <div>
      <canvas ref={canvasRef} width={500} height={200} className="border rounded" />
      <button onClick={() => padRef.current?.clear()}>Limpiar</button>
      <button onClick={handleSave}>Confirmar firma</button>
    </div>
  );
}
```

**Next.js SSR requirement:** canvas is a browser-only API. Import with `dynamic()`:

```typescript
const SignaturePad = dynamic(
  () => import('@/components/ui/SignaturePad').then(m => m.SignaturePad),
  { ssr: false }
);
```

The `toDataURL('image/png')` result is a `data:image/png;base64,...` string. Strip the
`data:image/png;base64,` prefix before sending to the backend as a JSON string field, or
send it as-is and let the backend decode it:

```typescript
// Backend: decode base64 PNG to Buffer
const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
const signatureBuffer = Buffer.from(base64Data, 'base64');
```

### B. PDF Stamping (Backend)

`@cantoo/pdf-lib` loads the doctor-uploaded consent PDF, embeds the PNG signature drawn
by the patient, stamps a timestamp, and returns the signed PDF bytes for storage and
archiving:

```typescript
import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib';

async stampSignatureOnPdf(
  existingPdfBytes: Buffer,
  signaturePngBytes: Buffer,
  timestamp: string,
  profesionalName: string,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pngImage = await pdfDoc.embedPng(signaturePngBytes);

  // Stamp on the last page (where signature block usually lives)
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width } = lastPage.getSize();

  // Scale signature to max 200px wide, preserve aspect ratio
  const { width: imgW, height: imgH } = pngImage.size();
  const scale = Math.min(200 / imgW, 80 / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;

  lastPage.drawImage(pngImage, { x: 60, y: 100, width: drawW, height: drawH });

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  lastPage.drawText(`Firmado digitalmente el ${timestamp}`, {
    x: 60, y: 90, size: 9, font, color: rgb(0.3, 0.3, 0.3),
  });
  lastPage.drawText(`Paciente confirmó consentimiento ante: ${profesionalName}`, {
    x: 60, y: 78, size: 9, font, color: rgb(0.3, 0.3, 0.3),
  });

  return Buffer.from(await pdfDoc.save());
}
```

**Why pdf-lib and not PDFKit:** PDFKit creates PDFs from scratch using a streaming
document builder pattern (`new PDFDocument()`). It has no ability to load or modify an
existing PDF file. The consent PDF is a document the doctor uploads — we must stamp
onto it without recreating it. `@cantoo/pdf-lib`'s `PDFDocument.load()` is the only way
to do this without a native binary dependency.

### C. File Upload (Backend — NestJS + Multer)

`@nestjs/platform-express` already bundles multer at runtime. Configure a dedicated
module for consent PDF uploads:

```typescript
// backend/src/modules/consentimientos/consentimientos.module.ts
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: path.join(process.cwd(), 'uploads', 'consentimientos'),
        filename: (_req, _file, cb) =>
          cb(null, `${crypto.randomUUID()}.pdf`),
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
      fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten archivos PDF'), false);
        }
      },
    }),
  ],
})
export class ConsentimientosModule {}
```

Controller usage:

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('archivo'))
async uploadConsentimiento(
  @UploadedFile() file: Express.Multer.File,
) {
  // file.path = disk path; file.filename = uuid.pdf
}
```

### D. Serving Uploaded Files

`@nestjs/platform-express` (already installed, Express adapter) exposes
`app.useStaticAssets()`. Add to `main.ts` — no new package needed:

```typescript
// backend/src/main.ts  (add inside bootstrap())
import * as path from 'path';

app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
  prefix: '/uploads/',
});
```

Uploaded files are then accessible at:
`${BACKEND_URL}/uploads/consentimientos/{uuid}.pdf`

This mirrors the existing `BACKEND_URL` pattern already used for WhatsApp PDF delivery.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-signature-canvas@1.1.0-alpha.2` | Alpha release; medical-grade application should not depend on alpha libs; `signature_pad` (same underlying library) is already installed | Custom `'use client'` wrapper (~40 lines) around `signature_pad` |
| `react-signature-pad-v2` | Low maintenance (163 stars vs 540K downloads for signature_pad), older API | `signature_pad` direct wrapper |
| `pdf-lib@1.17.1` (original) | Unmaintained since November 2021 (zero releases in 3.5 years); npm Snyk marks as "Inactive" | `@cantoo/pdf-lib@2.7.1` — drop-in fork actively maintained (last release May 2026, same API) |
| `hummus` / `node-poppler` | Native C++ bindings, complex deployment, binary compilation on each Node version upgrade | `@cantoo/pdf-lib` (pure JS, no native deps) |
| `Puppeteer` for PDF stamping | 300MB+ binary download, headless Chrome overhead; overkill for image+text stamp | `@cantoo/pdf-lib` (pure JS) |
| `@nestjs/serve-static@5.x` | Requires NestJS 11; backend is on NestJS 10 (`@nestjs/common@^10.0.0`) | `app.useStaticAssets()` from existing Express adapter |
| `@nestjs/serve-static@4.x` | Works with NestJS 10 but adds a module dependency for a capability the Express adapter already provides | `app.useStaticAssets()` in `main.ts` |
| `multer` (standalone) | Runtime already bundled with `@nestjs/platform-express`; installing separately can cause version conflicts | Use `MulterModule` from `@nestjs/platform-express`; only add `@types/multer` as devDep |
| `sharp` for signature processing | PNG resizing not needed; `@cantoo/pdf-lib` accepts raw PNG bytes and scales via draw parameters | `@cantoo/pdf-lib` native `drawImage` with width/height params |
| `uuid` package | `crypto.randomUUID()` is available in Node 14.17+ (project runs Node 18+) | `crypto.randomUUID()` built-in |
| `file-type` for deep MIME inspection | The consent PDF upload is staff-initiated (not patient-facing public); multer `fileFilter` on `mimetype` is sufficient | Multer `fileFilter` checking `file.mimetype === 'application/pdf'` |

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `@cantoo/pdf-lib` | `pdf-lib@1.17.1` (original) | Same API, but original is unmaintained (last release Nov 2021). For a medical system archiving signed legal documents, use the actively maintained fork. |
| `@cantoo/pdf-lib` | PDFKit (existing) | PDFKit **cannot load or modify existing PDFs**. It is a document-creation-from-scratch library only. The consent template is an existing PDF uploaded by the doctor. |
| `signature_pad` (thin wrapper) | `react-signature-canvas` | `react-signature-canvas` wraps `signature_pad` but is in alpha (`1.1.0-alpha.2`). Since `signature_pad` is already installed, the wrapper adds zero value and introduces alpha risk. |
| `app.useStaticAssets()` | `@nestjs/serve-static` module | `useStaticAssets` is provided by the Express adapter (`@nestjs/platform-express`) already installed. The serve-static module adds module boilerplate without benefit at this scale. |

---

## Version Compatibility

| Package | Version | Compatibility Notes |
|---------|---------|---------------------|
| `signature_pad` | `^5.1.1` (installed) | Pure ES module, browser canvas API. Must use `dynamic(() => import(...), { ssr: false })` in Next.js App Router. React 19 compatible (no React peer dep — vanilla JS library). |
| `@cantoo/pdf-lib` | `^2.7.1` | Pure JS, no native dependencies. Works in Node 14+. API fully compatible with `pdf-lib` (same import paths: `from '@cantoo/pdf-lib'`). No conflicts with existing `pdfkit`. |
| `@types/multer` | `^2.1.0` | DevDep only; provides `Express.Multer.File` type used in NestJS controller params. Must match the multer version bundled inside `@nestjs/platform-express@^10.x` (multer 1.x). |
| `@nestjs/platform-express` | `^10.0.0` (installed) | Already includes multer 1.x runtime. `MulterModule`, `@FileInterceptor`, `diskStorage` all available without additional installs. |

---

## Sources

- `frontend/package.json` — confirmed `signature_pad@^5.1.1` installed, React 19.2.0, Next 16.0.7 (HIGH)
- `backend/package.json` — confirmed `@nestjs/platform-express@^10.0.0`, `pdfkit@^0.17.2`, NestJS 10; no `multer`, no `@types/multer`, no `pdf-lib` (HIGH)
- `backend/src/main.ts` — confirmed Express adapter, no existing `useStaticAssets` call (HIGH)
- `npm view react-signature-canvas` — version `1.1.0-alpha.2`, peerDependencies `react: '0.14 - 19'` (HIGH)
- `npm view @cantoo/pdf-lib` — version `2.7.1`, last published `2026-05-27` (HIGH)
- `npm view pdf-lib` — version `1.17.1`, `time.modified: 2022-05-12` (HIGH — confirms inactive)
- `npm view @nestjs/serve-static@5.0.5 peerDependencies` — requires `@nestjs/core@^11.0.2`, incompatible with NestJS 10 (HIGH)
- `npm view @nestjs/serve-static@4.0.2 peerDependencies` — supports `@nestjs/core@^9||^10` (HIGH)
- [pdf-lib.js.org](https://pdf-lib.js.org/) — confirmed `PDFDocument.load()`, `embedPng()`, `drawImage()`, `drawText()`, `save()` API (HIGH)
- [Snyk pdf-lib](https://snyk.io/advisor/npm-package/pdf-lib) — confirmed "Inactive" maintenance status (MEDIUM — third-party assessment)
- [freecodecamp NestJS Multer guide](https://www.freecodecamp.org/news/how-to-handle-file-uploads-in-nestjs-with-multer/) — confirmed diskStorage, fileFilter, size limits pattern (MEDIUM)
- [github.com/Hopding/pdf-lib](https://github.com/Hopding/pdf-lib) — confirmed v1.17.1 last release Nov 2021 (HIGH)

---

*Stack research for: CLINICAL v1.12 — Historia Pre-Quirúrgica y Portal del Paciente*
*Researched: 2026-06-25*
*Supersedes: v1.5 STACK.md (2026-04-22) for this milestone*
