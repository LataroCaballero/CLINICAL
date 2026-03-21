# Architecture Patterns: v1.2 AFIP Real

**Domain:** Medical SaaS — AFIP/ARCA Electronic Invoicing (real CAE)
**Researched:** 2026-03-16
**Confidence:** HIGH (based on direct codebase inspection + AFIP-INTEGRATION.md reference)
**Scope:** What changes from the stub (AfipStubService) to the real implementation. Does NOT redocument v1.1 architecture.

---

## Recommended Architecture

### System Overview: v1.2 Delta

The v1.2 change is **surgical**: one DI token (`AfipStubService`) is replaced by a real implementation (`AfipRealService`) organized in a new sub-module (`AfipModule`) that is imported into the existing `FinanzasModule`. No new routes. No new frontend pages beyond a certificate upload form and QR display in the existing factura view.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Next.js 16 App Router                               │
│                                                                             │
│  /dashboard/facturador/**        (EXISTING — no structural changes)         │
│  /dashboard/facturador/config/   (NEW — certificate upload for ADMIN only)  │
├─────────────────────────────────────────────────────────────────────────────┤
│  TanStack Query hooks                                                       │
│  useEmitirAfip (EXISTING — already calls POST /finanzas/facturas/:id/emitir-afip) │
│  useAfipConfig (NEW — GET/POST /afip/config/:profesionalId)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Axios API client (lib/api.ts)  — no change                                 │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ HTTP/JWT
┌──────────────────────────────────▼──────────────────────────────────────────┐
│                           NestJS Backend                                     │
│                                                                             │
│  FinanzasController (MODIFY — emitir-afip now returns real CAE + QR data)   │
│  FinanzasService (MODIFY — post-emission: store CAE, caeFchVto, qrData)     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  AfipModule (NEW — separate NestJS module, imported by FinanzasModule)│   │
│  │                                                                      │    │
│  │  AfipConfigService   WsaaService        Wsfev1Service                │    │
│  │  (cert CRUD,         (TRA build,        (FECAESolicitar,             │    │
│  │   encryption)         signing, cache)    advisory lock,              │    │
│  │                                          FECompUltimoAutorizado)     │    │
│  │                                                                      │    │
│  │  CaeaService         AfipModule                                      │    │
│  │  (pre-fetch cron,    (providers + DI                                 │    │
│  │   contingency mode)   wiring)                                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  WhatsappModule (re-exports EncryptionService — imported by AfipModule)      │
├─────────────────────────────────────────────────────────────────────────────┤
│  PrismaService / PostgreSQL                                                  │
│  Factura (MODIFY — add cae, caeFchVto, qrData, ptoVta, nroComprobante)      │
│  ConfiguracionAFIP (NEW model — cert storage per profesional)                │
│  CaeaVigente (NEW model — current period CAEA per profesional)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### New Components

| Component | Responsibility | Location | Status |
|-----------|---------------|----------|--------|
| `AfipModule` | NestJS module that wires AfipConfigService, WsaaService, Wsfev1Service, CaeaService. Imports WhatsappModule for EncryptionService. | `backend/src/modules/finanzas/afip/afip.module.ts` | NEW |
| `AfipConfigService` | CRUD for `ConfiguracionAFIP` per tenant. Encrypts/decrypts cert and key PEM using EncryptionService. Parses `certExpiresAt` from cert. | `backend/src/modules/finanzas/afip/afip-config.service.ts` | NEW |
| `AfipConfigController` | `POST /afip/config/:profesionalId` (upload cert+key), `GET /afip/config/:profesionalId` (expiry status only — NEVER returns encrypted fields). ADMIN only. | `backend/src/modules/finanzas/afip/afip-config.controller.ts` | NEW |
| `WsaaService` | Builds TRA XML, signs via `openssl smime` subprocess, calls WSAA LoginCms SOAP endpoint, extracts token+sign, caches in Redis keyed `wsaa:{cuit}:{service}` with TTL = expiration - 5min. | `backend/src/modules/finanzas/afip/wsaa.service.ts` | NEW |
| `Wsfev1Service` | Calls `FECompUltimoAutorizado` + `FECAESolicitar` wrapped in Prisma `$transaction` with `pg_advisory_xact_lock`. Returns `EmitirComprobanteResult`. Falls back to CaeaService on timeout/5xx. | `backend/src/modules/finanzas/afip/wsfev1.service.ts` | NEW |
| `CaeaService` | Calls `FECAEASolicitar` on a cron schedule, stores `CaeaVigente` per profesional. On contingency: retrieves current CAEA, assigns to invoice. On inform window: calls `FECAEAInformar`. | `backend/src/modules/finanzas/afip/caea.service.ts` | NEW |
| `AfipRealService` | Implements `AfipService` interface. Orchestrates: get config → get token (WsaaService) → call WSFEv1 (Wsfev1Service) → fallback to CAEA (CaeaService) → return result. This is the class that replaces AfipStubService as the DI provider. | `backend/src/modules/finanzas/afip/afip-real.service.ts` | NEW |
| `FacturaPdfService` | Reuses PDFKit (already installed). Adds QR AFIP code to existing factura PDF layout. Reads `qrData` from `Factura` record. | `backend/src/modules/finanzas/afip/factura-pdf.service.ts` | NEW |

### Modified Components

| Component | What Changes | Location | Status |
|-----------|-------------|----------|--------|
| `AfipStubService` | Replaced as the active DI provider by `AfipRealService` in `AfipModule`. The class file stays for local dev / testing toggle. | `backend/src/modules/finanzas/afip/afip-stub.service.ts` | MODIFY (DI binding only) |
| `FinanzasModule` | Remove `AfipStubService` from providers/exports. Add `AfipModule` to imports. The `FinanzasService` receives `AfipService` (interface token) via DI — no import path change. | `backend/src/modules/finanzas/finanzas.module.ts` | MODIFY |
| `FinanzasService` | `emitirAfip(facturaId)` method: after getting result from AfipService, writes `cae`, `caeFchVto`, `qrData`, `nroComprobante`, `ptoVta` back to `Factura`. Also generates QR data string. | `backend/src/modules/finanzas/finanzas.service.ts` | MODIFY |
| `FinanzasController` | `POST /finanzas/facturas/:id/emitir-afip` response shape now includes `{ cae, caeFchVto, qrUrl }` with real data. No route change. | `backend/src/modules/finanzas/finanzas.controller.ts` | MODIFY (response only) |
| `Factura` (Prisma model) | Add fields: `cae String?`, `caeFchVto String?`, `qrData String?`, `ptoVta Int?`, `nroComprobante Int?`. These are null until AFIP emission. | `backend/src/prisma/schema.prisma` | MODIFY |
| `ConfiguracionAFIP` | New model added to schema. | `backend/src/prisma/schema.prisma` | NEW MODEL |
| `CaeaVigente` | New model added to schema. | `backend/src/prisma/schema.prisma` | NEW MODEL |
| `AppModule` | If `AfipModule` is standalone (not just FinanzasModule-internal), register in AppModule imports after FinanzasModule. Needed only if AfipConfigController registers routes directly. | `backend/src/app.module.ts` | MAYBE MODIFY |

---

## DI Token Strategy: Swap Without Changing Call Sites

The stub-to-real swap uses NestJS custom provider tokens. `AfipStubService` was registered directly as a class provider in `FinanzasModule`. For v1.2, this changes to an interface token:

```typescript
// backend/src/modules/finanzas/afip/afip.interfaces.ts  (already exists)
// Add:
export const AFIP_SERVICE = 'AFIP_SERVICE';  // injection token

// AfipModule providers array:
{
  provide: AFIP_SERVICE,
  useClass: AfipRealService,   // swap to AfipStubService for local dev/tests
}

// FinanzasService constructor (MODIFY):
constructor(
  @Inject(AFIP_SERVICE) private readonly afipService: AfipService,
  // ... existing injections
)
```

`FinanzasService` already calls `this.afipService.emitirComprobante(params)` — no change to call sites. The `AFIP_SERVICE` token is the only wiring change.

To switch back to stub for local development, change `useClass: AfipRealService` to `useClass: AfipStubService` in `AfipModule`. No other code changes.

---

## Data Flow

### Primary Flow: CAE Emission (WSFEv1)

```
FACTURADOR clicks "Emitir AFIP" on a Factura
    |
POST /finanzas/facturas/:id/emitir-afip  (FinanzasController)
    |
FinanzasService.emitirAfip(facturaId)
    |
Load Factura from DB (get profesionalId, condicionIVAReceptor, moneda, tipoCambio, total)
    |
AfipRealService.emitirComprobante(params)
    |
    ├─► AfipConfigService.getConfig(profesionalId)
    │     → loads ConfiguracionAFIP from DB
    │     → decrypts certPem + keyPem via EncryptionService
    │
    ├─► WsaaService.getAccessTicket(cuit, 'wsfe', certPem, keyPem)
    │     → check Redis cache key "wsaa:{cuit}:wsfe"
    │     → if hit and not expiring: return cached {token, sign}
    │     → if miss: buildTRA() → signTRA() via openssl smime subprocess
    │               → POST WSAA SOAP LoginCms
    │               → parse token/sign/expiration from XML
    │               → SET Redis key with TTL = (expiration - now - 5min)
    │
    ├─► Wsfev1Service.emitir(params, auth)
    │     → prisma.$transaction(async tx => {
    │           SELECT pg_advisory_xact_lock(hashtext(profesionalId||ptoVta||cbteTipo))
    │           FECompUltimoAutorizado → lastNum
    │           cbteDesde = lastNum + 1
    │           FECAESolicitar → { cae, caeFchVto, resultado }
    │       })
    │     → if AFIP returns resultado='R': throw AfipRejectionException
    │     → if timeout/5xx: throw AfipUnavailableException → caller falls back to CAEA
    │
    └─► (fallback) CaeaService.getActiveCaea(profesionalId)
          → load CaeaVigente from DB for current period
          → assign caea as authorization code
          → mark Factura as CAEA_PENDIENTE_INFORMAR

    |
FinanzasService (post-emission)
    |
Build QR data string (AFIP spec: JSON → base64 → URL)
    |
prisma.factura.update({
  cae, caeFchVto, qrData, nroComprobante: cbteDesde, ptoVta,
  estado: EstadoFactura.EMITIDA
})
    |
Return { cae, caeFchVto, qrData } to controller → frontend
    |
Frontend: invalidate factura query → re-render with QR badge + CAE number
```

### CAEA Pre-fetch Flow (Cron)

```
CaeaService cron: '0 6 27,11,12 * *'  (6 AM ART on days 27, 11, 12)
    |
For each Profesional with ConfiguracionAFIP.ambiente = PRODUCCION
    |
WsaaService.getAccessTicket(cuit, 'wsfe', ...) — reuses token cache
    |
FECAEASolicitar(Periodo: YYYYMM, Orden: 1 or 2)
    |
prisma.caeaVigente.upsert({
  profesionalId, periodo, orden,
  caea, fchVigDesde, fchVigHasta, fchTopeInf
})
```

### CAEA Inform Flow (Cron, post-period)

```
CaeaService cron: runs within 30 days after period end
    |
Find all Factura with estado = CAEA_PENDIENTE_INFORMAR for the expired period
    |
FECAEAInformar with those invoices
    |
Update Factura.estado to EMITIDA (CAEA confirmed)
```

### Certificate Upload Flow

```
ADMIN opens /dashboard/facturador/config (NEW page)
    |
Uploads cert.pem + key.pem files (multipart/form-data)
    |
POST /afip/config/:profesionalId  (AfipConfigController, @Auth('ADMIN') only)
    |
AfipConfigService.upsertConfig(profesionalId, certPem, keyPem, ambiente)
    |
EncryptionService.encrypt(certPem) → certPemEncrypted
EncryptionService.encrypt(keyPem) → keyPemEncrypted
Parse certExpiresAt from cert (node crypto — X.509 notAfter field)
    |
prisma.configuracionAFIP.upsert({ profesionalId, cuit, certPemEncrypted,
  keyPemEncrypted, certExpiresAt, ambiente })
    |
Return { certExpiresAt, ambiente } — NEVER return encrypted fields
```

---

## Database Schema Changes

### New Model: ConfiguracionAFIP

```prisma
model ConfiguracionAFIP {
  id                String       @id @default(uuid())
  profesionalId     String       @unique
  cuit              String       // CUIT the cert was issued for (no hyphens)
  certPemEncrypted  String       // AES-256-GCM: iv:authTag:ciphertext — NEVER in API responses
  keyPemEncrypted   String       // AES-256-GCM: iv:authTag:ciphertext — NEVER in API responses
  certExpiresAt     DateTime     // Parsed from cert's notAfter field
  ambiente          AmbienteAFIP @default(HOMOLOGACION)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  profesional       Profesional  @relation(fields: [profesionalId], references: [id])
}

enum AmbienteAFIP {
  HOMOLOGACION
  PRODUCCION
}
```

### New Model: CaeaVigente

```prisma
model CaeaVigente {
  id            String      @id @default(uuid())
  profesionalId String
  periodo       String      // "YYYYMM"
  orden         Int         // 1 = first half (days 1-15), 2 = second half (days 16-end)
  caea          String      // The authorization code — store as plaintext (not a secret, unlike certs)
  fchVigDesde   String      // YYYYMMDD
  fchVigHasta   String      // YYYYMMDD
  fchTopeInf    String      // YYYYMMDD — last date to inform invoices under this CAEA
  createdAt     DateTime    @default(now())
  profesional   Profesional @relation(fields: [profesionalId], references: [id])

  @@unique([profesionalId, periodo, orden])
}
```

### Modified Model: Factura (additions only)

```prisma
// Add to existing Factura model:
cae             String?     // 14-digit CAE from AFIP — null until EMITIDA
caeFchVto       String?     // YYYYMMDD CAE expiry — null until EMITIDA
qrData          String?     // Base64 QR content per AFIP spec — null until EMITIDA
ptoVta          Int?        // AFIP punto de venta used for this invoice
nroComprobante  Int?        // Sequential invoice number confirmed by AFIP
```

New `EstadoFactura` enum value needed:

```prisma
enum EstadoFactura {
  EMITIDA
  ANULADA
  CAEA_PENDIENTE_INFORMAR  // NEW: emitted under CAEA, awaiting inform call
}
```

---

## Advisory Lock: Concrete NestJS/Prisma Pattern

This is required for correctness. Two concurrent requests for the same professional + punto de venta + tipo comprobante must not both query `FECompUltimoAutorizado` and submit with the same sequence number.

The lock must wrap the sequence `FECompUltimoAutorizado → FECAESolicitar` inside a single Prisma interactive transaction (`$transaction(async tx => ...)`). The `pg_advisory_xact_lock` releases automatically at transaction end.

```typescript
// In Wsfev1Service (backend/src/modules/finanzas/afip/wsfev1.service.ts):

async emitir(
  params: EmitirComprobanteParams,
  auth: { token: string; sign: string; cuit: string },
): Promise<EmitirComprobanteResult> {
  return this.prisma.$transaction(async (tx) => {
    // Lock key: deterministic integer from (profesionalId, ptoVta, cbteTipo)
    // hashtext() is PostgreSQL's built-in string hash → int4
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${params.cuitEmisor} || ':' || ${params.puntoVenta}::text || ':' || ${params.tipoComprobante}::text)
      )
    `;

    // Safely read last authorized number AFTER lock is held
    const lastNum = await this.callFECompUltimoAutorizado(
      params.puntoVenta,
      params.tipoComprobante,
      auth,
    );

    const cbteDesde = lastNum + 1;
    const cbteHasta = cbteDesde; // single invoice

    // Submit to AFIP — if this throws, lock releases and transaction rolls back
    return this.callFECAESolicitar({ ...params, cbteDesde, cbteHasta }, auth);
    // pg_advisory_xact_lock releases here (transaction commit)
  });
}
```

Key constraints:
- The entire method must run inside `prisma.$transaction(async tx => ...)` — not a batch transaction.
- `tx.$executeRaw` (not `this.prisma.$executeRaw`) to ensure the lock is within the same connection.
- The AFIP SOAP calls (`callFECompUltimoAutorizado`, `callFECAESolicitar`) happen inside the transaction scope but are external HTTP calls — Prisma's transaction timeout must be set high enough (default is 5s; AFIP can take 3-8s).

Set Prisma transaction timeout in the call:

```typescript
return this.prisma.$transaction(async (tx) => { ... }, { timeout: 15000 }); // 15 seconds
```

---

## WSAA Token Caching: Redis Pattern

The in-memory Map from AFIP-INTEGRATION.md section 2 works for single-instance but not horizontal scaling. Since Redis is already configured for BullMQ, use it for token caching.

```
Redis key:   "wsaa:{cuit}:{service}"      e.g. "wsaa:20123456789:wsfe"
Redis value: JSON.stringify({ token, sign })
Redis TTL:   (expiration.getTime() - Date.now() - 5*60*1000) / 1000  seconds
```

The cache is a plain `redis` client (already in `package.json` as `"redis": "^5.9.0"`). Use `cache-manager-redis-yet` (already in package.json) or the raw `redis` client directly in `WsaaService`. Do not add a new Redis client — reuse the existing connection.

Multi-instance safe: all instances share the same Redis key. First instance to miss cache calls WSAA and sets the key. Subsequent instances hit the cache.

Race condition between two instances both missing cache simultaneously is acceptable — both call WSAA, last writer wins in Redis. AFIP does not reject duplicate TRA calls for the same CUIT+service as long as `uniqueId` (unix timestamp) differs slightly (it will, since they run milliseconds apart).

---

## QR Code Generation

AFIP requires a QR code on printed/digital comprobantes per RG 5616/2024. The QR encodes a URL pointing to AFIP's verification portal with a base64-encoded JSON payload.

### QR Data Format

```typescript
// Content to encode in the QR (AFIP spec):
const qrPayload = {
  ver: 1,
  fecha: cbteFch,           // "YYYY-MM-DD"
  cuit: cuitEmisor,         // number
  ptoVta: puntoVenta,       // number
  tipoCmp: tipoComprobante, // number
  nroCmp: nroComprobante,   // number
  importe: importeTotal,    // number
  moneda: monId,            // "PES" or "DOL"
  ctz: monCotiz,            // number
  tipoDocRec: docTipo,      // number
  nroDocRec: docNro,        // number (parse to int for non-CUIT types)
  tipoCodAut: 'E',          // "E" for CAE, "A" for CAEA
  codAut: cae,              // number
};

const qrData = Buffer.from(JSON.stringify(qrPayload)).toString('base64');
const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${qrData}`;
```

### Generation Strategy: At Emission Time, Synchronous

Generate `qrData` synchronously in `FinanzasService.emitirAfip()` immediately after receiving the CAE from AfipRealService. Store the `qrData` string in `Factura.qrData`. No async QR image rendering is needed on the backend — the frontend or PDF service generates the actual scannable image from this string.

For the PDF (`FacturaPdfService`), use `qrcode` npm package (`npm install qrcode @types/qrcode`) to render the QR image into the PDFKit document. The `qrData` column stores the URL string; PDFKit renders it as a QR image using the qrcode library.

```typescript
// In FacturaPdfService:
import * as QRCode from 'qrcode';

const qrImageBuffer: Buffer = await QRCode.toBuffer(factura.qrData, {
  width: 80,
  margin: 1,
});
doc.image(qrImageBuffer, { width: 80 });
```

---

## Certificate Storage: Per-Tenant Isolation

Each `Profesional` has at most one `ConfiguracionAFIP` record (`@unique` on `profesionalId`). This maps 1:1 to a CUIT — each professional has their own CUIT and therefore their own AFIP certificate.

Security rules (enforced in `AfipConfigService`):
1. `certPemEncrypted` and `keyPemEncrypted` are NEVER included in any `select` clause that feeds a DTO response.
2. Decryption happens only inside `AfipConfigService.getDecryptedCredentials()`, called only by `WsaaService`.
3. The upload endpoint (`POST /afip/config/:profesionalId`) is `@Auth('ADMIN')` only — no FACTURADOR or PROFESIONAL access.
4. Certificate files are never written to disk permanently — they arrive as multipart upload, are processed in memory, and the temp file (if any) is deleted immediately after encryption.

The `@unique` constraint on `profesionalId` means upsert semantics: uploading a new cert replaces the old one. No versioning — if key rotation is needed, replace in full.

---

## Frontend Changes

The frontend surface area for v1.2 is small. The existing emission flow already exists (AfipStubService returned a fake CAE). What changes is:

### 1. Factura detail view: show real CAE and QR

The existing factura table/detail does not yet render CAE or QR (stub returns a fake CAE that is not stored). After v1.2:
- Factura row shows CAE badge (14-digit number) when `cae` is not null.
- Factura detail panel shows QR code (rendered from `qrData`).

**Frontend QR rendering:** Use `qrcode.react` (`npm install qrcode.react`) in the frontend. The backend stores the `qrData` string (the URL). The frontend renders it as a QR image with `<QRCodeSVG value={factura.qrData} size={80} />`.

No backend change to the emission endpoint URL or response shape — just the data is real now.

### 2. Certificate upload page: ADMIN only

New page at `/dashboard/facturador/config` (or `/dashboard/configuracion/afip`). Accessible only to ADMIN role. Contains:
- File inputs for `cert.pem` and `key.pem`.
- Dropdown for `ambiente` (HOMOLOGACION / PRODUCCION).
- CUIT text field.
- Submit button: `POST /afip/config/:profesionalId` as `multipart/form-data`.
- Display of current cert expiry (from `GET /afip/config/:profesionalId`).

### 3. No new hooks beyond the above

The emission hook (`useEmitirAfip`) already exists and calls `POST /finanzas/facturas/:id/emitir-afip`. No structural change. Two new hooks needed:
- `useAfipConfig(profesionalId)` — GET cert expiry status.
- `useUploadAfipConfig()` — POST cert upload mutation.

---

## Suggested Build Order

Dependencies are strict: DB schema must exist before any backend code that references new fields, AfipModule must exist before FinanzasModule imports it, WSAA must work before WSFEv1 can be tested.

### Step 1: Database migration (blocks everything else)

- Add `ConfiguracionAFIP` model and `AmbienteAFIP` enum to `schema.prisma`.
- Add `CaeaVigente` model to `schema.prisma`.
- Add nullable fields to `Factura`: `cae`, `caeFchVto`, `qrData`, `ptoVta`, `nroComprobante`.
- Add `CAEA_PENDIENTE_INFORMAR` to `EstadoFactura` enum.
- Run `npx prisma migrate dev --name afip_real_v1` from `backend/`.
- Run `npx prisma generate`.

No data migration needed — all new fields are nullable with no backfill requirement.

### Step 2: AfipModule skeleton + DI token (unblocks Steps 3-6)

- Create `backend/src/modules/finanzas/afip/afip.module.ts` with empty providers.
- Add `export const AFIP_SERVICE = 'AFIP_SERVICE'` to `afip.interfaces.ts`.
- Update `FinanzasModule`: remove `AfipStubService` from providers/exports, add `AfipModule` to imports.
- Update `FinanzasService` constructor: `@Inject(AFIP_SERVICE) private readonly afipService: AfipService`.
- Register `AfipStubService` as `{ provide: AFIP_SERVICE, useClass: AfipStubService }` in AfipModule initially — keeps existing behavior while building the real services.

Verify: `npm run start:dev` must still boot and existing stub endpoint must still work.

### Step 3: AfipConfigService + Controller + cert upload endpoint

- Create `AfipConfigService`: `upsertConfig()`, `getConfig()` (returns decrypted for internal use), `getConfigPublic()` (returns expiry only for API response).
- Import `WhatsappModule` in `AfipModule` to get `EncryptionService`.
- Create `AfipConfigController` with `POST /afip/config/:profesionalId` (multipart) and `GET /afip/config/:profesionalId`.
- Add to `AppModule` imports if controller has its own route prefix.

At this point: certificates can be uploaded and stored for a professional. WSAA not yet wired.

### Step 4: WsaaService + Redis token cache

- Implement `WsaaService`: `buildTRA()`, `signTRA()` (openssl subprocess), `callWsaa()` (axios SOAP), `extractCredentials()` (regex), `getAccessTicket()` (Redis cache).
- Add `WsaaService` to `AfipModule` providers.
- Add integration test: with a test cert (self-signed), call `getAccessTicket()` against AFIP homologacion. Verify token is returned and cached.

This step requires a real AFIP homologacion certificate to test. Use a throwaway self-signed cert against `wsaahomo.afip.gov.ar`.

### Step 5: Wsfev1Service + advisory lock

- Implement `Wsfev1Service`: `callFECompUltimoAutorizado()`, `callFECAESolicitar()`, `emitir()` with `prisma.$transaction` and `pg_advisory_xact_lock`.
- Add `Wsfev1Service` to `AfipModule` providers.
- Set Prisma transaction timeout to 15000ms in the `$transaction` call.
- Test with AFIP homologacion (test CUIT): submit a B invoice for Consumidor Final.

### Step 6: AfipRealService (orchestrator) + swap DI token

- Create `AfipRealService` implementing `AfipService` interface.
- It calls: `AfipConfigService.getConfig()` → `WsaaService.getAccessTicket()` → `Wsfev1Service.emitir()`.
- On `AfipUnavailableException`: call `CaeaService.getActiveCaea()` (stub implementation for now — CAEA comes in Step 7).
- Update `AfipModule`: change `{ provide: AFIP_SERVICE, useClass: AfipStubService }` to `{ provide: AFIP_SERVICE, useClass: AfipRealService }`.

At this point: the end-to-end emission flow works for CAE (no CAEA fallback yet).

### Step 7: FinanzasService post-emission logic + QR generation

- After `afipService.emitirComprobante()` returns, build `qrData` URL string.
- `prisma.factura.update()` with `cae`, `caeFchVto`, `qrData`, `nroComprobante`, `ptoVta`.
- Install `qrcode` package (`npm install qrcode @types/qrcode`).
- Implement `FacturaPdfService.generateFacturaPdf()` using PDFKit + qrcode.

### Step 8: CAEA service + pre-fetch cron

- Implement `CaeaService`: `prefetchCaea()` (cron), `getActiveCaea()` (contingency fallback), `informCaea()` (post-period inform).
- Register `@nestjs/schedule` `ScheduleModule.forRoot()` in `AppModule` (already installed in package.json — check if registered; add if missing).
- Cron expression: `'0 6 27,11,12 * *'` (6 AM ART on days 27, 11, 12).

### Step 9: Frontend — CAE/QR display in factura views

- Install `qrcode.react` in frontend (`npm install qrcode.react`).
- Add `cae`, `caeFchVto`, `qrData` to the Factura type in `frontend/src/types/finanzas.ts`.
- Add QR display in factura detail panel (existing component).
- Add CAE badge in factura table row (existing component).

### Step 10: Frontend — Certificate upload page (ADMIN only)

- New page at `/dashboard/configuracion/afip` or `/dashboard/facturador/config`.
- Add to `ROUTE_PERMISSIONS` in `permissions.ts` (ADMIN only).
- Build form: file inputs + CUIT + ambiente dropdown + submit.
- Display current `certExpiresAt` with warning if < 30 days.

---

## Integration Points Summary

| Boundary | Communication | New vs Existing |
|----------|---------------|-----------------|
| `FinanzasModule` → `AfipModule` | NestJS module import + `AFIP_SERVICE` token | NEW |
| `AfipModule` → `WhatsappModule` | Import for `EncryptionService` | NEW |
| `AfipModule` → `PrismaService` | `@Global()` PrismaModule — no explicit import needed | EXISTING |
| `WsaaService` → Redis | `redis` package client (already installed) — new usage in new module | NEW |
| `Wsfev1Service` → PostgreSQL | `pg_advisory_xact_lock` via `prisma.$executeRaw` | NEW |
| `WsaaService` → AFIP WSAA | SOAP 1.1 via axios (already installed) | NEW (external) |
| `Wsfev1Service` → AFIP WSFEv1 | SOAP 1.1 via axios | NEW (external) |
| `CaeaService` → `@nestjs/schedule` | `ScheduleModule.forRoot()` in AppModule | NEW (package already installed) |
| `AfipConfigController` → `EncryptionService` | Via `AfipConfigService` | NEW |
| Frontend `useEmitirAfip` | No change — same endpoint URL, response now has real data | EXISTING |
| Frontend `useAfipConfig` | `GET /afip/config/:profesionalId` | NEW |
| Frontend `useUploadAfipConfig` | `POST /afip/config/:profesionalId` | NEW |

---

## Patterns to Follow

### Pattern 1: AfipModule as isolated sub-module (not inline in FinanzasModule)

**What:** All AFIP-specific services (`WsaaService`, `Wsfev1Service`, `CaeaService`, `AfipConfigService`) live in `AfipModule`. `FinanzasModule` imports `AfipModule` and injects via `AFIP_SERVICE` token. No AFIP-specific code bleeds into `FinanzasService` beyond the single `emitirComprobante()` call.

**Why:** AFIP services have their own infrastructure concerns (Redis, subprocess signing, SOAP, cron). Keeping them isolated from the financial billing logic prevents coupling and makes the stub-to-real swap clean.

**Boundary:** `FinanzasService` knows nothing about WSAA, tokens, or certs. It only knows `AfipService.emitirComprobante(params)`.

### Pattern 2: openssl smime subprocess over node-forge

**Decision:** Use `openssl smime -sign` subprocess for CMS/PKCS#7 signing.

**Why:** No new npm dependency. `openssl` binary is standard on Linux. More battle-tested against AFIP's specific CMS requirements. The subprocess has ~20ms latency, which is negligible compared to the WSAA SOAP round trip (~200-500ms). Temp files are written to `os.tmpdir()` with mode `0o600` and deleted in a `finally` block.

**Implication:** The deployment environment (Docker image or server) must have the `openssl` binary. Standard on any Debian/Ubuntu/Alpine base image. Add `RUN which openssl` to CI to verify.

### Pattern 3: Manual BNA rate entry for USD invoices

**Decision:** FACTURADOR enters the BNA exchange rate manually when creating a USD invoice.

**Why:** The BNA does not have a public API. Scraping is fragile and an audit liability. Manual entry is explicit, auditable, and immune to third-party failures. A link to `https://www.bna.com.ar/Personas` is shown next to the field as reference.

**When USD invoices are created:** The `CreateFacturaDto` already has `tipoCambio` and `moneda` fields from v1.1. The emission flow maps `Factura.moneda` to `MonId` and `Factura.tipoCambio` to `MonCotiz` using the lookup objects from AFIP-INTEGRATION.md section 3.

### Pattern 4: CondicionIVA mapping at emission time (not stored as AFIP integer)

**What:** `Factura.condicionIVAReceptor` stores the Prisma enum value (e.g., `CONSUMIDOR_FINAL`). The AFIP integer ID (e.g., `5`) is derived at emission time via a static lookup map in `Wsfev1Service`.

**Why:** AFIP codes may change with new regulations. Storing the semantic enum keeps the data meaningful independent of AFIP's numbering scheme. The lookup map is the single place to update if AFIP adds new IDs.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Hardcoding the certificate path on the filesystem

**What goes wrong:** Storing cert.pem and key.pem as files in the repo or on a shared filesystem path.

**Why bad:** Certs are credentials. File system paths break in multi-instance deployments. No per-tenant isolation.

**Instead:** Store encrypted in `ConfiguracionAFIP.certPemEncrypted` using the existing `EncryptionService`. Decrypt in memory at call time. Never touch the filesystem for persistent storage.

### Anti-Pattern 2: Calling FECAESolicitar without pg_advisory_xact_lock

**What goes wrong:** Two concurrent requests for the same professional + punto de venta + tipo comprobante may read the same last authorized number and submit with the same sequence number. AFIP rejects both (or produces a gap in sequence).

**Why bad:** Sequence errors are hard to recover — AFIP does not allow retroactive re-numbering.

**Instead:** The advisory lock in `Wsfev1Service.emitir()` (Step 5) is mandatory, not optional.

### Anti-Pattern 3: Using the same DI class name (AfipStubService) for the real implementation

**What goes wrong:** If `AfipRealService` is named `AfipStubService` (overwriting the stub), toggling back for local dev requires a code change.

**Instead:** Keep both classes. The DI token `AFIP_SERVICE` determines which is active. Switch by changing `useClass` in `AfipModule`. No other code changes.

### Anti-Pattern 4: Generating QR as a server-side image and storing it in the DB

**What goes wrong:** Storing a large PNG/SVG blob in PostgreSQL. Increases row size. Requires regeneration if QR spec changes.

**Instead:** Store the `qrData` string (the URL, ~300 chars). Render the QR image in the PDF service (at PDF generation time) and in the frontend (at display time). The data string is stable and small.

### Anti-Pattern 5: Using CAEA as the primary invoicing path

**What goes wrong:** Violates RG 5782/2025 (effective June 2026), which restricts CAEA to contingency only. Could trigger AFIP penalties.

**Instead:** Always attempt CAE first. Only fall back to CAEA when `FECAESolicitar` returns a network timeout or HTTP 5xx. The contingency branch must be clearly logged and the invoice marked `CAEA_PENDIENTE_INFORMAR` for the inform step.

---

## Scalability Considerations

| Concern | Current scale (single clinic) | 50+ tenants | Notes |
|---------|-------------------------------|-------------|-------|
| WSAA token calls | 1 token per 12h per CUIT — negligible | Redis cache shared across instances — already solved | No action needed |
| Advisory lock contention | Zero — single professional, sequential invoicing | Lock is per (cuit, ptoVta, cbteTipo) — parallel emission for different professionals is safe | Acceptable |
| AFIP latency per emission | 3-8s round trip (WSAA + WSFEv1) — synchronous | At 50+ simultaneous emissions: queue-based async emission to avoid HTTP timeout on frontend | Out of scope for v1.2 |
| CAEA cron | Runs for all professionals — O(N) AFIP calls | At 100+ tenants: add jitter to cron (stagger calls by 1-5s per tenant) to avoid rate-limiting | Note for future |
| Cert expiry monitoring | Check on each WSAA call (already done via certExpiresAt comparison) | Add dedicated cron for 30-day warning email to ADMIN | Nice to have in v1.2 |

---

## Sources

All findings are HIGH confidence — derived entirely from direct codebase inspection and the pre-researched AFIP-INTEGRATION.md reference document.

- `backend/src/modules/finanzas/afip/afip.interfaces.ts` — existing TypeScript contract
- `backend/src/modules/finanzas/afip/afip-stub.service.ts` — existing stub (DI baseline)
- `backend/src/modules/finanzas/finanzas.module.ts` — current DI wiring
- `backend/src/modules/finanzas/finanzas.service.ts` — emitirAfip call site
- `backend/src/modules/whatsapp/whatsapp.module.ts` — EncryptionService export pattern
- `backend/src/modules/whatsapp/crypto/encryption.service.ts` — AES-256-GCM interface
- `backend/src/prisma/schema.prisma` — Factura model, CondicionIVA enum, MonedaFactura enum
- `backend/src/app.module.ts` — module registration pattern, BullMQ, Redis wiring
- `backend/package.json` — confirmed: `@nestjs/schedule`, `pdfkit`, `redis`, `axios` already installed; `xml2js`, `node-forge`, `qrcode` NOT installed
- `.planning/research/AFIP-INTEGRATION.md` — WSAA, WSFEv1, CAEA, advisory lock, signing options, QR spec

---

*Architecture research for: CLINICAL SaaS v1.2 — AFIP Real Implementation*
*Researched: 2026-03-16*
*Supersedes: v1.1 ARCHITECTURE.md sections on AfipStubService placement*
