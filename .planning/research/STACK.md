# Stack Research

**Domain:** Argentine medical clinic SaaS — AFIP/ARCA real CAE emission (v1.2)
**Researched:** 2026-03-16
**Confidence:** HIGH (raw SOAP approach locked; package versions verified; QR spec confirmed)

---

## Milestone Scope

This document supersedes the v1.1 STACK.md (which was a research deliverable). v1.2 is the **real implementation** milestone. The architecture decision from AFIP-INTEGRATION.md is locked:

> **Raw SOAP/XML — no third-party AFIP library.**

This means `@arcasdk/core` (recommended in v1.1 research) is NOT used for v1.2. The rationale for this reversal is documented below.

---

## Context: What Already Exists

| Already in Place | Version | Notes |
|-----------------|---------|-------|
| `pdfkit` | 0.17.2 | Installed, used in `reportes-export.service.ts`. Extend for invoice PDFs with QR. |
| `axios` | 1.13.1 | Used for all HTTP. Will handle SOAP calls to WSAA and WSFEv1 directly. |
| `@nestjs/schedule` | 6.1.0 | Already installed. Use for CAEA pre-request cron job. |
| `redis` + `cache-manager-redis-yet` | 5.9.0 / 5.1.5 | Redis in place. Use for WSAA token caching per-CUIT. |
| `EncryptionService` | — | AES-256-GCM at `backend/src/modules/whatsapp/crypto/encryption.service.ts`. Reuse for cert/key encryption. |
| `AfipStubService` | — | Interface `emitirComprobante()` already defined. Real service swaps in. |
| `@nestjs/schedule` | 6.1.0 | Already installed for CAEA cron. No additional install needed. |

**Constraint:** NestJS 10.x + Node.js 20.x + Prisma 6.x. No framework changes.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `node-forge` | 1.3.3 | CMS/PKCS#7 signing of WSAA TRA | In-process signing — no subprocess, no temp files, no OpenSSL binary dependency. Works on any OS. The only viable pure-JS PKCS#7 SignedData implementation. |
| `qrcode` | 1.5.4 | QR code PNG generation for AFIP invoice PDFs | 9M+ weekly downloads, canvas-free, outputs PNG `Buffer` directly compatible with `PDFKit.doc.image()`. Stable — last published 2 years ago but AFIP QR format has not changed. |
| `xml2js` | 0.6.2 | XML parsing of WSAA and WSFEv1 SOAP responses | Established standard (10K+ dependents). Simpler and safer than manual regex for structured SOAP response parsing in production. |
| `async-mutex` | 0.5.0 | Per-CUIT mutex for WSAA token refresh | Prevents duplicate concurrent WSAA calls when two requests arrive for the same CUIT simultaneously. Zero-overhead when token is cached. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/node-forge` | 1.3.14 | TypeScript types for `node-forge` | Always — dev dependency |
| `@types/qrcode` | latest | TypeScript types for `qrcode` | Always — dev dependency |
| `@types/xml2js` | 0.4.14 | TypeScript types for `xml2js` | Always — dev dependency |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| OpenSSL CLI | CSR generation for AFIP cert provisioning | Not a runtime dependency — only for onboarding. Must be available on developer/admin machine, not the server. |
| AFIP Homologacion portal | Test CUIT and sandbox cert issuance | `https://wsass-homo.afip.gov.ar/wsass/` — manual step per tenant during onboarding |

---

## Installation

```bash
# From backend/ directory

# CMS/PKCS#7 signing (WSAA TRA signing — replaces openssl subprocess)
npm install node-forge
npm install -D @types/node-forge

# QR code PNG for AFIP-compliant invoice PDF
npm install qrcode
npm install -D @types/qrcode

# XML parsing for SOAP responses (WSAA LoginTicketResponse, WSFEv1 CAE response)
npm install xml2js
npm install -D @types/xml2js

# Per-CUIT mutex for WSAA token refresh concurrency
npm install async-mutex
```

No new backend framework packages. No new frontend packages. No cloud services.

---

## Architecture Decisions

### Decision 1: Raw SOAP/XML — No Third-Party AFIP Library

**Locked in AFIP-INTEGRATION.md. Do not reopen.**

`@arcasdk/core` (recommended in v1.1 research) is architecturally superior to `@afipsdk/afip.js`, but it still adds unnecessary abstraction. Its own dependency tree includes `node-forge`, `soap`, `xml2js`, `moment`, and `winston` — which means installing `@arcasdk/core` installs exactly the same packages we would install for raw SOAP, plus the `soap` npm package (which causes AFIP WS-Security failures on specific endpoints) and `moment` (deprecated, 300KB, already covered by `date-fns`).

Raw SOAP with `axios` + `node-forge` + `xml2js` gives us:
- Full control over SOAP envelope construction (required because AFIP uses non-standard WS-Security variants)
- Debuggable request/response at the HTTP level
- No surprise library updates changing AFIP field mappings
- Smaller dependency surface

### Decision 2: `node-forge` for CMS Signing (Over `openssl` Subprocess)

AFIP-INTEGRATION.md documented two options for PKCS#7 CMS signing of the WSAA TRA:

**Option A (subprocess):** `openssl smime -sign` via `execSync` with temp files.
**Option B (in-process):** `node-forge`.

**Use Option B (`node-forge`) for v1.2.**

Rationale:
- Temp file approach has a security surface: PEM files on disk (even briefly) during cert operations, especially under high concurrency where cleanup may race
- `execSync` blocks the Node.js event loop thread during the ~20ms OpenSSL call — under load, this degrades throughput
- `openssl` binary must be present on the production host — adds an infrastructure constraint that is not currently documented anywhere
- `node-forge` 1.3.3 is actively maintained (last published December 2025), MIT licensed, 11M+ weekly downloads
- AFIP-specific CMS signing with `node-forge` is a known working pattern (used by `@arcasdk/core` internally)

**Confidence: MEDIUM** — `node-forge` against AFIP production is confirmed working via `@arcasdk/core`'s use of it, but direct integration has not been validated in this codebase. Flag the first WSAA call in homologacion as a validation checkpoint.

### Decision 3: Redis for WSAA Token Cache (11-Hour TTL Per CUIT)

WSAA tickets are valid for 12 hours. Cache per CUIT with an 11-hour TTL (1-hour safety buffer) to avoid serving near-expired tokens.

```
Redis key pattern: wsaa:token:{ambiente}:{cuit}
Example:          wsaa:token:homologacion:20111111112
TTL:              39600 seconds (11 hours)
Value:            JSON { token, sign, expiration }
```

The existing `redis` client (v5.9.0) handles this. No new library needed. This is multi-instance safe — all NestJS pods share the same Redis, so only one WSAA call fires per CUIT per 11 hours regardless of horizontal scaling.

### Decision 4: `xml2js` for SOAP Response Parsing (Over Manual Regex)

AFIP-INTEGRATION.md showed manual regex extraction of `<token>`, `<sign>`, and `<expirationTime>` from the WSAA response. This is adequate for a stub but fragile in production:
- AFIP occasionally changes whitespace and namespace prefixes in responses
- SOAP faults (error responses) have a different XML structure than success responses — regex silently misses them

Use `xml2js.parseStringPromise()` instead. It handles SOAP faults, namespace stripping, and attribute extraction robustly. The manual regex patterns from AFIP-INTEGRATION.md serve as documentation of what to extract — implement them as `xml2js` path lookups.

### Decision 5: `async-mutex` for Per-CUIT WSAA Refresh

Without a mutex, two concurrent requests for Tenant A's invoice can each find the Redis token expired and both call WSAA simultaneously. WSAA does not block duplicate requests — it issues two tickets, wastes one call, and creates a race condition on which ticket gets cached.

`async-mutex` provides an in-process `Mutex` per CUIT. The pattern:

```typescript
// In WsaaService
private mutexes = new Map<string, Mutex>();

private getMutex(cuit: string): Mutex {
  if (!this.mutexes.has(cuit)) {
    this.mutexes.set(cuit, new Mutex());
  }
  return this.mutexes.get(cuit);
}

async getAccessTicket(cuit: string): Promise<AccessTicket> {
  return this.getMutex(cuit).runExclusive(async () => {
    // Check Redis first (another pod may have refreshed already)
    const cached = await this.redis.get(`wsaa:token:${ambiente}:${cuit}`);
    if (cached) return JSON.parse(cached);
    // Refresh WSAA, store in Redis, return
    ...
  });
}
```

For multi-instance deployments, the Redis check inside the mutex means a pod that wins the lock will find the token already refreshed by another pod — eliminating redundant WSAA calls even across instances.

---

## Environment Variables Needed (v1.2 Additions)

These are PER-TENANT values stored encrypted in the `ConfiguracionAFIP` DB model (see AFIP-INTEGRATION.md Section 1), NOT environment variables. The only env vars needed are infrastructure-level:

```bash
# Already exists — no new env vars for per-tenant AFIP config
# Per-tenant cert/key are stored AES-256-GCM encrypted in ConfiguracionAFIP table

# New optional env var for global ambient default:
AFIP_AMBIENTE=HOMOLOGACION   # or PRODUCCION — controls which AFIP endpoints are used
                              # Can also be set per-tenant in ConfiguracionAFIP.ambiente
```

No `AFIP_CERT`, `AFIP_PRIVATE_KEY`, or `AFIP_CUIT` global env vars. Certificate material must live in the database per-tenant, following the same pattern as `ConfiguracionWABA.accessTokenEncrypted`.

---

## AFIP QR Code Format (Implementation Reference)

The QR embedded in invoice PDFs encodes a URL:

```
https://www.afip.gob.ar/fe/qr/?p={base64_encoded_json}
```

The JSON payload fields:

| Field | Type | Description |
|-------|------|-------------|
| `ver` | Integer | Format version — always `1` |
| `fecha` | String | Invoice date `YYYY-MM-DD` |
| `cuit` | Integer | Issuer CUIT (no hyphens) |
| `ptoVta` | Integer | Punto de venta |
| `tipoCmp` | Integer | Invoice type (1=FA, 6=FB, 11=FC) |
| `nroCmp` | Integer | Invoice number |
| `importe` | Decimal | Total amount |
| `moneda` | String | `"PES"` or `"DOL"` |
| `ctz` | Decimal | Exchange rate (1 for ARS) |
| `tipoDocRec` | Integer | Recipient doc type (80=CUIT, 96=DNI, 99=CF) |
| `nroDocRec` | Integer | Recipient document number (0 for CF) |
| `tipoCodAut` | String | `"E"` for CAE, `"A"` for CAEA |
| `codAut` | Integer | CAE or CAEA code |

Implementation pattern:
```typescript
const payload = { ver: 1, fecha, cuit, ptoVta, tipoCmp, nroCmp, importe, moneda, ctz, tipoDocRec, nroDocRec, tipoCodAut: 'E', codAut: cae };
const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
const url = `https://www.afip.gob.ar/fe/qr/?p=${b64}`;
const qrBuffer = await QRCode.toBuffer(url, { type: 'png', width: 120 });
doc.image(qrBuffer, x, y, { width: 80 }); // PDFKit embed
```

**Confidence: HIGH** — QR JSON structure confirmed from official AFIP QR spec page and multiple corroborating community sources.

---

## Schema Additions (No New Libraries — Prisma Only)

From AFIP-INTEGRATION.md Section 1, add a dedicated `ConfiguracionAFIP` model:

```prisma
model ConfiguracionAFIP {
  id                String       @id @default(uuid())
  profesionalId     String       @unique
  cuit              String
  certPemEncrypted  String       // AES-256-GCM encrypted — iv:authTag:ciphertext
  keyPemEncrypted   String       // AES-256-GCM encrypted — iv:authTag:ciphertext
  certExpiresAt     DateTime     // Parsed from cert notAfter — warn 30 days before
  puntoVenta        Int          @default(1)
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

Also add to `Factura` model (fields for emitted electronic invoices):

```prisma
cae             String?   // CAE code from FECAESolicitar response
caeFechaVto     DateTime? // CAE expiry date — invoice legally invalid after this
ptoVta          Int?      // Punto de venta used for emission
cbteTipo        Int?      // 1=FA, 6=FB, 11=FC, 51=FM
cbteNumero      Int?      // Sequential invoice number confirmed by AFIP
caea            String?   // CAEA code if emitted in contingency mode
```

CAEA contingency storage — add a `CaeaVigente` model per tenant:

```prisma
model CaeaVigente {
  id            String       @id @default(uuid())
  profesionalId String
  caea          String       // Authorization code
  fchVigDesde   DateTime     // Period start
  fchVigHasta   DateTime     // Period end
  fchTopeInf    DateTime     // Last date to inform invoices under this CAEA
  createdAt     DateTime     @default(now())
  profesional   Profesional  @relation(fields: [profesionalId], references: [id])
}
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `node-forge` (in-process PKCS#7) | `openssl smime -sign` subprocess | Use if node-forge AFIP compatibility issues arise in homologacion testing. Both approaches are documented in AFIP-INTEGRATION.md. Switch is a single-function change. |
| Raw SOAP/XML via `axios` | `@arcasdk/core` | Use only if raw SOAP approach hits an undocumented AFIP endpoint behavior that `@arcasdk/core` handles internally. Its dependency tree (`soap`, `xml2js`, `node-forge`) is a superset of what we install anyway. |
| `xml2js` for SOAP parsing | Manual regex extraction | Regex is acceptable for Phase 9 stub only (already documented in AFIP-INTEGRATION.md). Replace with `xml2js` in v1.2 real implementation for fault handling robustness. |
| `async-mutex` for in-process lock | Redis-based distributed lock | Use Redis lock (`SET NX EX`) only if the deployment uses more than 3 NestJS instances — the Redis check inside the `async-mutex` block handles the multi-instance case adequately at current scale. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **`@afipsdk/afip.js`** | Routes all AFIP calls through afipsdk.com cloud infrastructure. Requires their `access_token`. In a SaaS with multiple tenant CUITs, this is a mandatory third-party dependency for every invoice emission with tiered pricing ($25–$250/mo). Single point of failure for billing. | Raw SOAP via `axios` + `node-forge` |
| **`@arcasdk/core`** | Good architecture but adds `soap` + `moment` + `winston` dependencies beyond what the raw approach requires. `soap` npm package has known issues with AFIP's non-standard WS-Security. `moment` is deprecated and replaced by `date-fns` already in the project. | Raw SOAP approach — installs only what is actually needed |
| **`afipjs` (egnuez)** | JavaScript-only, no TypeScript types, no updates since 2020, does not support RG 5616/2024 fields | `node-forge` + raw SOAP |
| **`soap` npm package** | Causes failures on AFIP-specific WS-Security variants. The `@arcasdk/core` team moved away from it. For raw SOAP, using `axios` to POST the raw XML envelope is simpler and more reliable. | `axios` with raw SOAP XML strings |
| **`strong-soap`** | Abandoned — last commit 2021 | `axios` with raw XML |
| **File-based WSAA token cache** | Ephemeral filesystem in containers; fails with multiple NestJS instances | Redis with 11-hour TTL (existing Redis client) |
| **Global `AFIP_CERT` env var** | Single global cert is wrong for multi-tenant SaaS — each clinic has a different CUIT and therefore a different AFIP certificate | `ConfiguracionAFIP` DB model with per-tenant AES-256-GCM encrypted PEM fields |
| **Storing AFIP cert/key in plaintext** | Private key compromise allows fraudulent invoice emission from the tenant's CUIT | `EncryptionService.encrypt()` — same AES-256-GCM pattern as WABA tokens |

---

## Stack Patterns by Variant

**CAEA Contingency Cron Pattern:**
- Use existing `@nestjs/schedule` 6.1.0 (already installed — no new install)
- Cron expression: `0 6 27,11,12 * *` — runs at 6AM UTC-3 on days 27, 11, and 12 of each month
- Day 27: pre-request CAEA for next month's first half (days 1–15)
- Day 11: pre-request CAEA for current month's second half (days 16–end)
- Day 12: retry in case day 11 failed
- Store result in `CaeaVigente` table per profesionalId

**Multi-Instance Deployment:**
- WSAA token in Redis (not in-memory Map) — already handled by Redis cache recommendation
- `async-mutex` prevents intra-pod duplicate calls; Redis check inside the lock handles inter-pod cases
- BullMQ advisory lock pattern is NOT applicable here — advisory lock must be a PostgreSQL `pg_advisory_xact_lock` inside a `$transaction` (per AFIP-INTEGRATION.md Section 3 for CAE sequencing)

**Homologacion vs Produccion:**
- Switch via `ConfiguracionAFIP.ambiente` per tenant (or `AFIP_AMBIENTE` env var for global default)
- Different WSAA endpoints: `wsaahomo.afip.gov.ar` vs `wsaa.afip.gov.ar`
- Different WSFEv1 endpoints: `wswhomo.afip.gov.ar` vs `servicios1.afip.gov.ar`
- Test CUIT `20111111112` available for homologacion (no real certificate required for testing)

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `node-forge` | 1.3.3 | Node 18+, TypeScript 5+ | Dec 2025. Used by `@arcasdk/core` against AFIP production — compatibility confirmed transitively. |
| `qrcode` | 1.5.4 | Node 14+, PDFKit 0.17.x | Canvas-free. `QRCode.toBuffer(url, { type: 'png' })` returns `Buffer` compatible with `doc.image()`. |
| `xml2js` | 0.6.2 | Node 14+, TypeScript 5+ | Stable since 2023, 10K+ dependents in npm. |
| `async-mutex` | 0.5.0 | Node 18+, TypeScript 5+ | Zero deps. Stable since 2024. |
| `@nestjs/schedule` | 6.1.0 | NestJS 10.x (already installed) | No version change needed. |
| `pdfkit` | 0.17.2 (existing) | Node 14+ | Already installed. Extend existing PDF service for CAE/QR fields. |
| `redis` | 5.9.0 (existing) | Redis 7+ | Already installed. Use `SET key value EX ttl` for WSAA token TTL cache. |
| `axios` | 1.13.1 (existing) | Node 18+ | Already installed. Use for raw SOAP POST to WSAA and WSFEv1. |

---

## Sources

- [AFIP-INTEGRATION.md](/.planning/research/AFIP-INTEGRATION.md) — canonical reference doc (774 lines); WSAA/WSFEv1/CAEA patterns; locked architecture decisions (HIGH — project-internal)
- [@arcasdk/core package.json](https://github.com/ralcorta/arcasdk) — confirmed `node-forge` + `xml2js` as its signing/parsing dependencies; v0.3.6 (HIGH — direct inspection)
- [@arcasdk/core GitHub README](https://github.com/ralcorta/arcasdk) — 498 commits, 93 stars, Dec 2025 release; actively maintained (MEDIUM — single source)
- [@afipsdk/afip.js docs](https://docs.afipsdk.com/integracion/node.js) — confirmed cloud proxy model requires `access_token` from app.afipsdk.com (HIGH — vendor docs)
- [node-forge npm](https://www.npmjs.com/package/node-forge) — v1.3.3, last published ~3 months ago (December 2025) (HIGH — npm registry)
- [qrcode npm](https://www.npmjs.com/package/qrcode) — v1.5.4, 9M+ weekly downloads, canvas-free PNG buffer mode (HIGH — npm registry)
- [xml2js npm](https://www.npmjs.com/package/xml2js) — v0.6.2, 10K+ dependents (HIGH — npm registry)
- [async-mutex npm](https://www.npmjs.com/package/async-mutex) — v0.5.0, last published ~2 years ago (stable) (HIGH — npm registry)
- [AFIP QR code spec](https://www.afip.gob.ar/fe/qr/) — official AFIP QR documentation confirming URL format (HIGH — official AFIP)
- [AFIP QR JSON structure](https://groups.google.com/g/pyafipws/c/fRbtMUsuqDQ) — community-confirmed JSON field list: ver, fecha, cuit, ptoVta, tipoCmp, nroCmp, importe, moneda, ctz, tipoDocRec, nroDocRec, tipoCodAut, codAut (MEDIUM — community, corroborates multiple sources)
- [RG 5616/2024 enforcement](https://www.boletinoficial.gob.ar/detalleAviso/primera/318374/20241218) — CondicionIVAReceptorId mandatory from April 1, 2026 (HIGH — official Boletín Oficial)
- [@nestjs/schedule npm](https://www.npmjs.com/package/@nestjs/schedule) — v6.1.1, last published ~1 month ago; already installed at 6.1.0 in project (HIGH — npm registry)

---

*Stack research for: CLINICAL v1.2 — AFIP Real CAE Emission*
*Researched: 2026-03-16*
*Supersedes: v1.1 STACK.md (2026-03-12)*
