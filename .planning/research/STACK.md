# Stack Research

**Domain:** Argentine medical clinic SaaS — AFIP/ARCA electronic invoicing (WSFE), OS settlement workflow, billing limit dashboard
**Researched:** 2026-03-12
**Confidence:** MEDIUM (AFIP library landscape fragmented; core recommendation HIGH; third-party API pricing MEDIUM)

---

## Context: Milestone Scope

The v1.1 Vista del Facturador milestone has two clearly separable concerns:

1. **Billing limit dashboard + OS liquidation workflow** — pure NestJS/Prisma work, no new libraries needed. Uses existing `Factura`, `PracticaRealizada`, `LiquidacionObraSocial` models.
2. **AFIP WSFE integration** — researched here. The PROJECT.md explicitly says: "Research e informe de integración AFIP para emisión de comprobantes desde la plataforma" — this is a *research deliverable*, not a build deliverable for v1.1.

> **Key finding:** AFIP integration is NOT in scope for v1.1 implementation. The goal is to document what stack is needed, what friction points exist, and what would be required in a future milestone. The dashboard and OS liquidation features need zero new libraries.

---

## Context: What Already Exists

| Already in Place | Version | Notes |
|-----------------|---------|-------|
| `pdfkit` | 0.17.2 | Installed, used in `reportes-export.service.ts`. Extend for invoice PDFs. |
| `@nestjs/schedule` | 6.1.0 | Cron for daily billing summaries. |
| `redis` + `cache-manager-redis-yet` | 5.9.0 / 5.1.5 | Redis present. Can cache WSAA tokens. |
| `Decimal.js` (via Prisma) | — | All monetary fields already use `@db.Decimal(10, 2)`. |
| Existing `Factura` model | — | Has `tipo`, `numero`, `cuit`, `razonSocial`, `condicionIVA`, `subtotal`, `impuestos`, `total`. Structure is partially AFIP-compatible. |

**Constraint:** NestJS 10.x + Node.js 20.x + Prisma 6.x. No framework changes.

---

## Recommended Stack

### 1. AFIP WSFE Integration Library

**Recommendation: `@arcasdk/core` (self-hosted, TypeScript-native, no cloud proxy required)**

| Library | Type | TS Support | Active | Self-Hosted | Last Version | Verdict |
|---------|------|-----------|--------|------------|-------------|---------|
| **`@arcasdk/core`** | Open source npm | Native TS | Yes | Yes — direct SOAP to ARCA | 0.3.6 (Dec 2025) | **RECOMMENDED** |
| `@afipsdk/afip.js` | npm + cloud proxy | Native TS | Yes (v1.2.3 Feb 2026) | No — requires `access_token` from afipsdk.com | v1.2.3 | Viable but cloud dependency |
| `facturajs` | Open source npm | Partial TS | Stale | Yes | 0.3.2 (Sep 2025) | Usable, JS-first |
| `afipjs` (egnuez) | Open source npm | No (JS only) | Stale | Yes | Old | Avoid — no TS, unmaintained |
| `afip-apis` | Open source npm | Yes | Low activity | Yes | — | Avoid — low adoption |

**Why `@arcasdk/core` over `@afipsdk/afip.js`:**

`@afipsdk/afip.js` is the most popular option (100k+ downloads since 2017), **but** it requires an `access_token` obtained from `app.afipsdk.com` — their SaaS platform. This creates:
- A mandatory third-party cloud dependency for every invoice emission in production.
- A per-request pricing model ($25–$250/mo depending on volume) on top of your own infrastructure.
- Single point of failure: if afipsdk.com is down, your clinic cannot emit invoices.
- Per-tenant cost multiplication in a SaaS context (each tenant's CUIT counts toward the tier limit).

`@arcasdk/core` evolved from the `afip.ts` project (same maintainer, rebranded). It is entirely self-hosted: you pass your CUIT, `cert` (certificate content), and `key` (private key content) directly. No intermediary service. Direct SOAP calls to ARCA endpoints. MIT licensed.

```typescript
// @arcasdk/core constructor — no cloud token required
const arca = new Arca({
  key: process.env.AFIP_PRIVATE_KEY,   // PEM content, stored encrypted
  cert: process.env.AFIP_CERT,          // PEM content, stored encrypted
  cuit: parseInt(process.env.AFIP_CUIT),
});

const invoiceService = arca.electronicBillingService;
const result = await invoiceService.createInvoice(payload);
```

**Why not `facturajs`:**
- JavaScript-first with partial TypeScript types — adds type friction in a TypeScript-strict codebase.
- Last meaningful update September 2025 — not tracking RG 5616/2024 compliance deadline (December 2025).
- No native NestJS DI pattern support.

```bash
# Backend — AFIP integration
npm install @arcasdk/core   # v0.3.6
```

**Confidence: MEDIUM** — `@arcasdk/core` verified as self-hosted, TS-native, and recently updated. Version 0.3.6 confirmed current as of Dec 2025. Community adoption is lower than `@afipsdk/afip.js` but architecture is superior for a SaaS product.

---

### 2. SOAP Client (Transitive Dependency — Verify)

AFIP WSFE is a SOAP web service. All Node.js AFIP libraries use `soap` or `strong-soap` internally. You do not install this directly — it comes as a dependency of `@arcasdk/core`. Verify it includes a compatible SOAP client:

```bash
# After install, verify transitive deps:
cat node_modules/@arcasdk/core/package.json | grep soap
```

If the project ever needs to call AFIP web services directly (e.g., WSFEX for export invoices, or WSPADRON for CUIT lookup), use:

```bash
npm install soap   # v1.0.x — the canonical Node.js SOAP client
```

Do NOT use `strong-soap` — it is abandoned (last commit 2021).

**Confidence: HIGH** — AFIP exclusively uses SOAP. `soap` npm package is the established standard.

---

### 3. WSAA Token Caching

AFIP's WSAA (Authentication and Authorization Web Service) issues access tickets (TA) with a **12-hour TTL**. Every call to WSFE must be accompanied by a valid TA. The pattern is:

1. Authenticate with WSAA using your certificate → receive `Token` + `Sign` (valid 12h).
2. Cache the `Token`+`Sign` pair for the duration of validity.
3. Use cached credentials for all WSFE calls until expiry.
4. On expiry, re-authenticate.

**Recommendation: Cache in Redis (already installed)**

Redis is already deployed for BullMQ queues and session caching. Store WSAA tokens per-CUIT with TTL:

```typescript
// In AfipTokenService (NestJS injectable)
const TOKEN_TTL_SECONDS = 11 * 60 * 60; // 11 hours (1h buffer before AFIP's 12h expiry)
await this.redis.set(`wsaa:token:${cuit}`, JSON.stringify({ token, sign }), 'EX', TOKEN_TTL_SECONDS);
```

**Why not file-based caching (facturajs default):**
- File-based token cache (`cacheTokensPath` param in some libraries) doesn't work correctly in containerized deployments where the filesystem is ephemeral.
- Redis survives container restarts, handles multi-instance deployments correctly.
- Per-tenant CUIT tokens can be namespaced: `wsaa:token:{cuit}`.

**No new library needed** — use the existing `redis` client (5.9.0) already installed.

**Confidence: HIGH** — WSAA 12-hour TTL is documented in official AFIP specs. Redis TTL pattern is standard NestJS practice.

---

### 4. Invoice PDF Generation (AFIP-compliant)

AFIP electronic invoices require a specific PDF format including:
- CAE (Código de Autorización Electrónica) number and expiry date.
- QR code linking to the AFIP invoice verification portal (`https://www.afip.gob.ar/fe/qr/`).
- Sender/receiver fiscal data (CUIT, razon social, condicion IVA).
- Invoice number, punto de venta, and date.

**Recommendation: Extend existing PDFKit 0.17.2 + add `qrcode` for QR generation**

| Requirement | Solution | Library | Already Installed? |
|-------------|----------|---------|-------------------|
| Invoice PDF layout | PDFKit | `pdfkit` 0.17.2 | Yes |
| AFIP QR code | QR PNG embedded in PDF | `qrcode` | No |
| Barcode (optional) | CAE barcode | `jsbarcode` | No |

```bash
# New additions for AFIP-compliant invoice PDF
npm install qrcode          # v1.5.4 — QR code generation (PNG buffer → embed in PDFKit)
npm install @types/qrcode   # TypeScript types
```

**Why `qrcode` over alternatives:**
- `qrcode` is the established standard (9M+ weekly downloads). Canvas-free, generates PNG buffers directly — compatible with PDFKit's `doc.image(buffer)` method.
- QR code format for AFIP invoices is specified in official documentation (`https://www.afip.gob.ar/fe/qr/`): URL-encoded JSON embedded in QR pointing to the AFIP verification service.

**Why NOT generate PDFs via a third-party service (afipsdk.com PDF add-on):**
- Sends invoice data (patient/clinic financial data) to external service — privacy concern in medical context.
- Additional cost per PDF.
- PDFKit is already installed and adequate for structured financial documents.

**Confidence: HIGH** — `qrcode` library verified as standard for QR PNG generation in Node.js. AFIP QR spec is public documentation.

---

### 5. Schema Additions Required (No New Libraries)

The existing `Factura` model needs additions to support AFIP electronic invoicing fields. This is schema work (Prisma migration), not library work:

```prisma
// Fields to ADD to existing Factura model
cae           String?   // Código de Autorización Electrónica (AFIP response)
caeFechaVto   DateTime? // CAE expiration date
puntoVenta    Int?      // Punto de venta registrado en AFIP (e.g., 1, 2...)
tipoComprobante Int?    // AFIP numeric code (1=Factura A, 6=Factura B, 11=Factura C)
// condicionIVA, cuit, razonSocial already exist in current model
```

Also needed: a new `ConfigAfip` model (per-tenant AFIP credentials):

```prisma
model ConfigAfip {
  id              String   @id @default(uuid())
  profesionalId   String   @unique
  cuit            String
  certEncrypted   String   // AES-256-GCM encrypted PEM cert
  keyEncrypted    String   // AES-256-GCM encrypted private key
  puntoVenta      Int      @default(1)
  produccion      Boolean  @default(false) // false = homologacion
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  profesional     Profesional @relation(fields: [profesionalId], references: [id])
}
```

Use the existing `EncryptionService` (AES-256-GCM) already in the codebase to encrypt `cert` and `key` before persisting — same pattern as `ConfiguracionWABA.accessTokenEncrypted`.

**Confidence: HIGH** — This is purely additive Prisma schema work following established patterns in the codebase.

---

### 6. Billing Limit Tracking (Dashboard Feature)

The monthly billing limit feature (facturador sets configurable limit, dashboard shows progress) requires:

- A `LimiteMensualFacturacion` config model (or a `Json` config field on `ConfigAfip`).
- A query aggregating `Factura.total` for the current month (filtered by `profesionalId` and `fecha`).
- No new libraries — standard Prisma aggregate (`_sum`, `_count`) and `@nestjs/schedule` cron for daily reset.

```typescript
// Prisma aggregate pattern — no library needed
const totalesMes = await this.prisma.factura.aggregate({
  _sum: { total: true },
  _count: true,
  where: {
    profesionalId,
    fecha: { gte: startOfMonth, lte: endOfMonth },
    estado: 'EMITIDA',
  },
});
```

**No new libraries needed for this feature.**

---

## Complete Installation Summary

```bash
# From backend/ directory

# AFIP WSFE integration (future milestone — research confirmed viable)
npm install @arcasdk/core    # v0.3.6 — self-hosted SOAP client for ARCA WSFE

# AFIP-compliant invoice PDF (QR code for CAE verification)
npm install qrcode @types/qrcode   # v1.5.4

# Billing limit dashboard — NO NEW LIBRARIES. Pure Prisma + existing stack.
# WSAA token caching — NO NEW LIBRARIES. Use existing redis@5.9.0.
```

**New environment variables needed (AFIP integration phase):**
```
AFIP_CUIT=                    # Clinic CUIT (per-tenant via ConfigAfip table, or global for single-tenant)
AFIP_CERT=                    # PEM certificate (store encrypted in DB; env var for single-tenant deploy)
AFIP_PRIVATE_KEY=             # PEM private key (store encrypted in DB via EncryptionService)
AFIP_PUNTO_VENTA=1            # Registered punto de venta number in ARCA
AFIP_PRODUCCION=false         # false = homologacion (testing), true = production
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| AFIP library | `@arcasdk/core` | `@afipsdk/afip.js` | Requires afipsdk.com cloud service ($25–250/mo); per-tenant pricing multiplies costs in SaaS |
| AFIP library | `@arcasdk/core` | `facturajs` | JS-first, stale, not tracking RG 5616/2024 compliance deadline |
| AFIP library | `@arcasdk/core` | TusFacturasAPP REST API | Third-party API; same cloud dependency problem as afipsdk.com; subscription required |
| Token caching | Redis (existing) | File-based (`ta_folder` param) | Ephemeral filesystem in containers; doesn't work multi-instance |
| Invoice PDF | PDFKit (existing) + qrcode | afipsdk.com PDF add-on | Sends financial data to external service; extra cost per PDF |
| Invoice PDF | PDFKit + qrcode | Puppeteer | +300MB Chromium; overkill for structured invoice layout |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **`@afipsdk/afip.js` as primary integration** | Requires cloud access token from afipsdk.com — mandatory third-party dependency for every invoice emission. In a multi-tenant SaaS, each CUIT counts toward their tier ($25/mo for 10 CUITs). | `@arcasdk/core` — same functionality, fully self-hosted |
| **`afipjs` (egnuez/afipjs)** | JavaScript-only, no TypeScript support, no recent updates, doesn't track RG 5616/2024 spec changes | `@arcasdk/core` |
| **`strong-soap`** | Abandoned (no commits since 2021) | `soap` npm package (if direct SOAP calls needed) |
| **TusFacturasAPP API** | Third-party SaaS REST API wrapping AFIP — introduces same cloud dependency problem as afipsdk.com. Monthly subscription required. | `@arcasdk/core` direct SOAP integration |
| **File-based WSAA token cache** | Fails in containerized environments (ephemeral filesystem). Doesn't work with multiple NestJS instances. | Redis (already installed) with TTL matching WSAA ticket validity |
| **Storing AFIP cert/key in plaintext** | Private key compromise allows fraudulent invoice emission in your CUIT | AES-256-GCM via existing `EncryptionService` (same pattern as WABA tokens) |

---

## Stack Patterns by Variant

**If building AFIP integration (future milestone):**
- Use `@arcasdk/core` with certificates stored encrypted in DB via `ConfigAfip` model.
- Cache WSAA tokens in Redis with 11-hour TTL.
- Wrap in a `NestJS @Injectable() AfipService` with constructor DI for `PrismaService`, `EncryptionService`, `RedisService`.
- Test in homologacion (AFIP sandbox) first — different WSDL endpoints, test CUIT available.
- Compliance: RG 5616/2024 requires `condicionIVA` of receiver and exchange rate for USD invoices, effective 01/12/2025. Verify `@arcasdk/core` v0.3.6 includes this.

**If v1.1 scope stays as research-only for AFIP:**
- Ship the dashboard + OS liquidation workflow with zero AFIP library additions.
- Only add `qrcode` to support adding QR to manually-tracked invoices if needed.
- AFIP integration becomes its own milestone (v1.2 or later) with proper certificate provisioning per tenant.

**If a single-tenant (one clinic, one CUIT) deploy is acceptable first:**
- Manage AFIP credentials via environment variables (`AFIP_CERT`, `AFIP_PRIVATE_KEY`).
- Simpler than per-tenant DB encryption; acceptable for initial launch.
- Migrate to per-tenant `ConfigAfip` model when second tenant onboards.

---

## Critical Integration Requirements (AFIP-Specific)

These are AFIP/ARCA requirements that constrain implementation decisions, independent of library choice:

| Requirement | Detail | Impact |
|-------------|--------|--------|
| **Certificate provisioning** | Each CUIT must generate a CSR with OpenSSL, submit to ARCA, download signed cert. Manual per-tenant step. | Cannot automate without external service; operator must configure per clinic |
| **Punto de venta registration** | Must register a "punto de venta tipo WSFEV1" in ARCA panel before first invoice | One-time setup per CUIT; no API to create it programmatically |
| **Invoice date limit** | Cannot submit invoices dated more than 10 days in the past; cannot backdate beyond that | Do not allow bulk-backdating from the UI |
| **Consecutive numbering** | Invoice numbers must be strictly consecutive per punto de venta + comprobante type | Always call `FECompUltimoAutorizado` before issuing; never assume the next number |
| **RG 5616/2024 compliance** | From 01/12/2025: must include receiver's IVA condition and exchange rate (for USD). Non-compliant systems cannot generate valid invoices. | Verify library supports these fields before using |
| **Homologacion vs Produccion** | Different WSDL endpoints and test certificates. Homologacion accepts any CUIT for testing. | Always build + test against homologacion; production credentials require ARCA approval |
| **CAE validity** | CAE has an expiration date (typically ~10 days). Invoice is legally invalid after CAE expiry. | Store `caeFechaVto` and warn if invoice PDF is generated after expiry |

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `@arcasdk/core` | 0.3.6 | Node 18+, TypeScript 4+ | Dec 2025; verify RG 5616 compliance |
| `qrcode` | 1.5.4 | Node 14+, NestJS any | Canvas-free PNG buffer mode compatible with PDFKit |
| `@types/qrcode` | — | TypeScript 4+ | Dev dependency |
| `pdfkit` | 0.17.2 (existing) | Node 14+, @types/pdfkit installed | Already typed; extend existing service |
| `redis` | 5.9.0 (existing) | Node 18+, Redis 7+ | Already installed; use for WSAA token TTL cache |

---

## Sources

- [ARCA/AFIP WSFE official documentation](https://www.afip.gob.ar/ws/documentacion/ws-factura-electronica.asp) — WSDL endpoints, homologacion/produccion URLs, WSFEv1 spec (HIGH — official)
- [Resolución General 5616/2024 — Boletín Oficial](https://www.boletinoficial.gob.ar/detalleAviso/primera/318374/20241218) — IVA condition + exchange rate requirements (HIGH — official, effective 01/12/2025)
- [AFIP QR code specification](https://www.afip.gob.ar/fe/qr/) — QR format for invoice verification URL (HIGH — official)
- [@arcasdk/core GitHub README](https://github.com/ralcorta/afip.ts) — constructor params, self-hosted model confirmed (MEDIUM — single source, project actively maintained)
- [@arcasdk/core npm](https://www.npmjs.com/package/@arcasdk/core) — version 0.3.6, last published Dec 2025 (HIGH — verified via npm)
- [@afipsdk/afip.js npm](https://www.npmjs.com/~afipsdk) — version 1.2.3, Feb 2026; requires afipsdk.com access_token (HIGH — verified)
- [AfipSDK pricing page](https://afipsdk.com/pricing) — $25/mo Pro (10 CUITs), $80/mo Growth (100 CUITs); free tier 1 CUIT 1k req (MEDIUM — pricing may change)
- [AfipSDK blog — usar web services en NodeJS](https://afipsdk.com/blog/usar-web-services-de-afip-en-nodejs/) — confirmed access_token requirement (MEDIUM — vendor blog)
- [facturajs npm](https://www.npmjs.com/package/facturajs) — v0.3.2, Sep 2025; JS-first (MEDIUM — npm registry)
- [afipjs GitHub](https://github.com/egnuez/afipjs) — JS only, stale; avoid (LOW — community project, inactive)
- [qrcode npm](https://www.npmjs.com/package/qrcode) — v1.5.4, 9M+ weekly downloads (HIGH — npm registry)
- [DevelopArgentina — guía AFIP/ARCA 2025](https://developargentina.com/blog/facturacion-electronica-arca-guia-completa-2025) — practical integration guide, RG 5616 impact (MEDIUM — technical blog)
- [AFIP WSFEv1 ProyectoWSFEv1 spec](https://www.sistemasagiles.com.ar/trac/wiki/ProyectoWSFEv1) — WSFEv1 method reference, FECAESolicitar parameters (MEDIUM — community technical reference)

---

*Stack research for: CLINICAL v1.1 — Vista del Facturador (AFIP WSFE integration research)*
*Researched: 2026-03-12*
