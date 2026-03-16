# Project Research Summary

**Project:** CLINICAL SaaS — v1.2 AFIP Real CAE Emission
**Domain:** Argentine electronic invoicing (facturacion electronica) for multi-tenant aesthetic surgery clinic SaaS
**Researched:** 2026-03-16
**Confidence:** HIGH (stack locked, architecture derived from direct codebase inspection); MEDIUM (CAEA regulation RG 5782/2025 — community sources only, official Boletin Oficial not directly fetched)

## Executive Summary

This milestone replaces the existing `AfipStubService` (which returns a fake CAE) with a real AFIP/ARCA integration via raw SOAP/XML against WSAA and WSFEv1. The approach is deliberately minimal: four new npm packages (`node-forge`, `qrcode`, `xml2js`, `async-mutex`) plus a new `AfipModule` that slots into the existing `FinanzasModule` via a NestJS DI token swap. No third-party AFIP SDK is used — the dependency trees of `@afipsdk/afip.js` (cloud proxy, mandatory SaaS per-tenant billing) and `@arcasdk/core` both introduce more surface area than the raw approach, with `@afipsdk/afip.js` adding a mandatory dependency on afipsdk.com infrastructure that is incompatible with a self-hosted multi-tenant model.

The recommended build order is strict: database migration first (blocks everything), then certificate storage (`ConfiguracionAFIP` per tenant), then WSAA token service with Redis caching, then WSFEv1 emission with `pg_advisory_xact_lock` sequencing, then QR PDF generation, and finally CAEA contingency mode — only after the primary CAE flow is stable in production and RG 5782/2025 is verified against the Boletin Oficial. The entire frontend surface area is small: two new hooks (`useAfipConfig`, `useUploadAfipConfig`), QR rendering in the existing factura detail view, and a new ADMIN-only certificate upload page.

The dominant risks are operational, not technical. Punto de venta misconfiguration passes silently in homologacion but blocks all production invoicing. The WSAA token cache must live in Redis from commit one — never an in-memory Map — to survive horizontal scaling and rolling deploys. The Prisma advisory lock transaction timeout must be set to 45 seconds (Prisma default is 5s; AFIP can take 30s). BullMQ must classify AFIP business rejections (e.g., error 10242 for missing CondicionIVAReceptorId) as permanent errors that go straight to DLQ, not transient failures to retry. These four properties must be correct from the first real invoice; retrofitting them after production invoices are in flight carries high recovery cost.

## Key Findings

### Recommended Stack

The architecture decision from the preceding research cycle (AFIP-INTEGRATION.md) is locked: raw SOAP with `axios` + `node-forge` + `xml2js`. Four new packages are the minimal viable additions to the existing backend — everything else (`pdfkit`, `redis`, `axios`, `@nestjs/schedule`) is already installed.

**Core technologies (new installs required):**
- `node-forge` 1.3.3: In-process PKCS#7 CMS signing of WSAA TRA — eliminates OpenSSL subprocess temp files and event-loop blocking. Preferred over `openssl smime` subprocess due to private-key filesystem exposure risk on crash paths. Compatibility with AFIP confirmed transitively via `@arcasdk/core` usage.
- `qrcode` 1.5.4: Canvas-free PNG buffer generation for AFIP-compliant QR codes on factura PDFs. Compatible with existing PDFKit 0.17.2 `doc.image()` API.
- `xml2js` 0.6.2: SOAP response parsing — handles SOAP faults and namespace variations robustly. Replaces regex extraction (adequate for stub, fragile for production fault handling).
- `async-mutex` 0.5.0: Per-CUIT in-process mutex preventing duplicate concurrent WSAA token refreshes within a single NestJS instance.

**Already installed, extended for v1.2:**
- `redis` 5.9.0: WSAA token cache keyed `afip_ta:{profesionalId}:{cuit}:{service}`, TTL = expiry minus 5 minutes (11-hour effective window on 12-hour WSAA tickets).
- `@nestjs/schedule` 6.1.0: CAEA pre-fetch cron (`0 6 27,11,12 * *`) and certificate expiry monitoring.
- `pdfkit` 0.17.2: Extended in new `FacturaPdfService` to embed QR code image in factura PDF.
- `EncryptionService` (existing in WhatsappModule): Reused for AES-256-GCM encryption of `certPemEncrypted` and `keyPemEncrypted` in `ConfiguracionAFIP`.

**Critical constraint:** AFIP environment (`HOMOLOGACION` / `PRODUCCION`) is per-tenant in `ConfiguracionAFIP.ambiente`, not a global env var. No global `AFIP_CERT` env var — certificate material lives only in the database.

### Expected Features

**Must have for v1.2 (table stakes — legally required for real CAE):**
- Schema migration: `ConfiguracionAFIP` model, `AmbienteAFIP` enum, `CaeaVigente` model, `Factura.cae` + `caeFchVto` + `nroComprobante` + `qrData` + `ptoVta`, `EstadoFactura.CAEA_PENDIENTE_INFORMAR`
- ADMIN certificate upload endpoint — `POST /afip/config/:profesionalId`, ADMIN-only, encrypts cert+key via `EncryptionService`, parses and stores `certExpiresAt`, validates CUIT against cert CN, calls `FEParamGetPtosVenta` to verify ptoVta is type RECE
- `WsaaService` — TRA building, `node-forge` CMS signing, Redis token cache with `async-mutex` per-CUIT guard
- `Wsfev1Service` — `FECompUltimoAutorizado` + `FECAESolicitar` inside `prisma.$transaction` with `pg_advisory_xact_lock`, 45-second timeout, AFIP error code mapping to Spanish messages, `CondicionIVAReceptorId` mapping
- NestJS DI token swap: `AFIP_SERVICE` token points to `AfipRealService` (stub stays available for local dev via env toggle)
- QR code in factura PDF (RG 5616/2024 — mandatory from April 2026)
- Certificate status indicator and ambiente badge on FACTURADOR home
- Error feedback: AFIP rejection codes mapped to user-readable Spanish in a modal, not generic toasts
- ADMIN config screen for `ConfiguracionAFIP` (cert upload, ptoVta, ambiente toggle)
- BNA exchange rate manual entry field for USD invoices (link to bna.com.ar; no scraping)

**Should have after v1.2 is stable in production (v1.2.x):**
- Certificate expiry warning cron (30/60-day email alert to ADMIN)
- CAEA contingency mode — only after primary CAE flow is stable AND RG 5782/2025 verified against Boletin Oficial
- `FECAEAInformar` batch job — ships with CAEA mode, never separately

**Defer to v2+:**
- Liquidation history per OS with amount variance tracking
- Multi-professional certificate management bulk dashboard (SaaS operator tooling)
- OS portal submission (Webcred integration) — requires individual OS business agreements
- Async BullMQ emission with 202 Accepted + polling (needed at 50+ concurrent tenants)

**Anti-features — confirmed do not build:**
- Auto-fetch BNA exchange rate via scraping (BNA has no official API; silently breaks)
- CAEA as primary invoicing path (RG 5782/2025 violation from June 2026)
- FACTURADOR cert upload (ADMIN-only, principle of least privilege)
- Multi-comprobante batch CAE in a single FECAESolicitar (header-field constraints make this unreliable for OS liquidations with mixed IVA conditions)

### Architecture Approach

The v1.2 change is surgical: one DI binding swaps `AfipStubService` for `AfipRealService` in a new `AfipModule`, imported by the existing `FinanzasModule`. `FinanzasService` calls `this.afipService.emitirComprobante(params)` — unchanged. All AFIP infrastructure is encapsulated within `AfipModule`. The existing `/finanzas/facturas/:id/emitir-afip` endpoint URL and request shape do not change; only the response now contains real data.

**Major components:**
1. `AfipConfigService` — per-tenant certificate CRUD; AES-256-GCM encrypt/decrypt via `EncryptionService`; parses `certExpiresAt` from cert X.509 `notAfter`; unique CUIT constraint enforcement; `FEParamGetPtosVenta` validation on upload
2. `WsaaService` — TRA XML construction; `node-forge` PKCS#7 CMS signing; SOAP POST to WSAA via axios; Redis token cache keyed `afip_ta:{profesionalId}:{cuit}:{service}` with `async-mutex` refresh guard
3. `Wsfev1Service` — `FECompUltimoAutorizado` + `FECAESolicitar` inside `prisma.$transaction` with `pg_advisory_xact_lock(hashtext(cuit:ptoVta:cbteTipo))`, 45-second timeout; `AfipBusinessError` vs `AfipTransientError` classification; CAEA fallback on `AfipUnavailableException`
4. `CaeaService` — pre-fetch cron; `CaeaVigente` upsert; contingency fallback assignment; `FECAEAInformar` with 8-day deadline tracking
5. `FacturaPdfService` — PDFKit extension; QR rendered from stored `qrData` URL string via `qrcode` npm
6. `AfipRealService` — orchestrator implementing `AfipService` interface; wires Config → WSAA → WSFEv1 → CAEA fallback

**Key data flow decision:** QR data is stored as the AFIP URL string in `Factura.qrData` (not a PNG blob). The frontend renders it via `qrcode.react`; the PDF service renders it via `QRCode.toBuffer()`. This keeps DB rows small and allows re-rendering if the QR spec changes.

### Critical Pitfalls

1. **Punto de venta not registered as type RECE in AFIP production portal** — passes in homologacion, blocks all production invoicing with error 10000/10001. Prevention: call `FEParamGetPtosVenta` during cert upload to validate PtoVta is registered and type RECE before enabling any tenant for production.

2. **In-memory WSAA token cache breaks under horizontal scale and rolling deploys** — concurrent renewal attempts cause AFIP "ya posee TA valido" rejection. Prevention: Redis cache from commit one in `WsaaService`, keyed with `profesionalId` as tenant discriminator. Add `@@unique([cuit])` on `ConfiguracionAFIP` to prevent cache key merging across tenants.

3. **Prisma transaction default timeout (5s) is shorter than AFIP's 30s SLA** — advisory lock releases mid-call; concurrent requests read the same last-authorized number and submit with the same sequence number. Prevention: explicit `{ timeout: 45000 }` on every `$transaction` wrapping WSFE calls. Verify PostgreSQL server `statement_timeout` does not override at DB level.

4. **BullMQ retrying AFIP business rejections (10242, 10016, resultado='R') indefinitely** — burns retry budget; FACTURADOR never notified. Prevention: `AfipBusinessError` class causes immediate DLQ move in `onFailed` hook. Transient errors (timeout, HTTP 5xx) get exponential backoff. Error 10242 (CondicionIVAReceptorId invalid) is never retryable.

5. **openssl smime subprocess: private key persists in /tmp on crash** — `finally` block skipped under SIGKILL; plaintext `key.pem` remains on disk. Prevention: use `node-forge` for in-process signing (recommended). If subprocess is retained, verify no `.pem` files survive a simulated exception; run container `/tmp` as `tmpfs`.

6. **CondicionIVAReceptorId null or wrong — error 10242 from April 2026** — RG 5616/2024 enforcement; stub never validated this field. Prevention: `CONDICION_IVA_TO_AFIP_ID` lookup throws `BadRequestException` for unmapped values before any WSFE call; validate at invoice creation, not inside the BullMQ job processor.

7. **CAEA inform deadline (8 calendar days after period end) missed silently** — AFIP denies future CAEA access for the tenant. Prevention: `CaeaInformJob` in BullMQ with 72 retry attempts across the 8-day window; escalate to admin alert (not silent DLQ) if deadline is exceeded.

## Implications for Roadmap

Based on the dependency graph in FEATURES.md and the build order in ARCHITECTURE.md, five phases are recommended. Phases A through D constitute the v1.2 release. Phase E is v1.2.x.

### Phase v1.2-A: Schema + Certificate Management

**Rationale:** Everything else depends on the database schema and the ability to store/retrieve tenant certificates. Certificate upload must validate PtoVta and CUIT against the cert CN — this is the gate that prevents Pitfall 1 and Pitfall 9 (CUIT cross-contamination) from ever reaching production. Schema must land before any service code references new fields.
**Delivers:** `ConfiguracionAFIP` model and `AmbienteAFIP` enum, `CaeaVigente` model, nullable CAE fields on `Factura`, `EstadoFactura.CAEA_PENDIENTE_INFORMAR`, ADMIN cert upload endpoint (encrypted storage via `EncryptionService`), `certExpiresAt` parsing from X.509 `notAfter`, CUIT-from-cert-CN validation, `FEParamGetPtosVenta` validation on upload, certificate status indicator and ambiente badge on FACTURADOR home, ADMIN config screen
**Addresses features:** Schema migration (P1), ADMIN cert upload (P1), certificate status indicator (P1), ADMIN config screen (P1)
**Avoids pitfalls:** Pitfall 1 (PtoVta not RECE), Pitfall 8 (private key on disk), Pitfall 9 (CUIT cross-contamination), Pitfall 10 (cert expiry surfaced via `certExpiresAt`)

### Phase v1.2-B: WSAA Service + Redis Token Cache

**Rationale:** No WSFEv1 call is possible without a valid WSAA access ticket. Redis caching must be implemented from the first commit — retrofitting an in-memory Map that is already in production creates a dangerous window (Pitfall 2). This phase includes the homologacion validation checkpoint: first real WSAA call against `wsaahomo.afip.gov.ar` confirms `node-forge` CMS output is accepted.
**Delivers:** `WsaaService` with `node-forge` PKCS#7 CMS signing, Redis token cache (`afip_ta:{profesionalId}:{cuit}:{service}` with TTL = expiry minus 5 minutes), `async-mutex` per-CUIT refresh guard, `xml2js` SOAP response parsing, homologacion integration test checkpoint
**Uses:** `node-forge` 1.3.3, `xml2js` 0.6.2, `async-mutex` 0.5.0, existing `redis` 5.9.0 client
**Avoids pitfalls:** Pitfall 2 (in-memory cache race), Pitfall 8 (private key on disk), Pitfall 11 (homologacion false confidence)

### Phase v1.2-C: WSFEv1 Real Emission + DI Swap

**Rationale:** Core of the milestone. Advisory lock, error classification, and BullMQ DI strategy must all be implemented together — they form one correctness unit. The DI swap (`AfipStubService` to `AfipRealService`) is the final step in this phase, after end-to-end homologacion testing. Production readiness smoke test (`FEDummy` + `FEParamGetPtosVenta`) must pass before enabling any production tenant.
**Delivers:** `Wsfev1Service` with `pg_advisory_xact_lock` (45-second transaction timeout), `AfipBusinessError` vs `AfipTransientError` classification, `CONDICION_IVA_TO_AFIP_ID` lookup with pre-queue validation, `AfipRealService` orchestrator, `AFIP_SERVICE` DI token swap, AFIP rejection code mapping to Spanish messages, real CAE + nroComprobante stored on `Factura`, production readiness smoke test
**Addresses features:** WsaaService (P1), WsfevService (P1), DI swap (P1), store CAE + nroComprobante (P1), error feedback UI (P1)
**Avoids pitfalls:** Pitfall 3 (advisory lock transaction timeout), Pitfall 4 (BullMQ business vs transient error), Pitfall 6 (CondicionIVA null), Pitfall 7 (retry classification), Pitfall 11 (production smoke test)

### Phase v1.2-D: QR PDF + Frontend Display

**Rationale:** QR cannot precede CAE — the code encodes the CAE number returned by WSFEv1. This phase extends the existing PDF pipeline and adds frontend rendering — both are low-risk, well-understood additions that do not require new backend infrastructure.
**Delivers:** `FacturaPdfService` with `qrcode` PNG embed in PDFKit, `Factura.qrData` URL stored at emission time in `FinanzasService`, CAE badge and QR display in factura detail view, `qrcode.react` QR rendering in frontend, BNA rate field for USD invoices (link to bna.com.ar), `useAfipConfig` and `useUploadAfipConfig` hooks
**Uses:** `qrcode` 1.5.4 (backend PDF), `qrcode.react` (frontend), existing `pdfkit` 0.17.2
**Addresses features:** QR code in PDF (P1), BNA rate field (P1), environment badge (P1), CAE/QR frontend display (P1)

### Phase v1.2-E: CAEA Contingency Mode

**Rationale:** Must come last — CAEA is a fallback path, not a primary. Building it before the CAE path is proven in production creates an untestable dependency. RG 5782/2025 (effective June 2026) must be verified against the official Boletin Oficial before implementation begins. The `FECAEAInformar` inform job and the inform deadline alerting must ship in the same phase — never separately (a CAEA implementation without inform tracking is a regulatory liability).
**Delivers:** `CaeaService` with pre-fetch cron (`0 6 27,11,12 * *`), `CaeaVigente` upsert per tenant, contingency assignment on `AfipUnavailableException`, `CAEA_PENDIENTE_INFORMAR` estado on Factura, `FECAEAInformar` BullMQ job with 72-retry budget across 8-day window, admin alert on deadline miss, CAEA usage ratio tracking per tenant per fortnight (alert at 3% threshold), certificate expiry warning cron (30/60-day email)
**Addresses features:** CAEA contingency (P2), FECAEAInformar (P2), certificate expiry cron (P2)
**Avoids pitfalls:** Pitfall 4 (CAEA inform deadline miss), Pitfall 5 (CAEA as primary path violation)
**Gate:** Do not start until at least one real production invoice has been emitted via the CAE path (Phase C), and RG 5782/2025 is confirmed via Boletin Oficial.

### Phase Ordering Rationale

- Schema migrations must precede all service code — every new service references new Prisma models.
- WSAA must precede WSFEv1 — a WSAA ticket is a hard prerequisite for every WSFE call.
- WSFEv1 must precede QR PDF — the QR encodes the CAE number returned by WSFEv1.
- CAEA must follow a proven CAE path in production — CAEA is a fallback that must never be the only tested path.
- This order allows each phase to be independently deployed and tested without disrupting existing ADMIN/PROFESIONAL/FACTURADOR workflows. The stub remains available via env toggle through all phases.

### Research Flags

Phases needing additional research during planning:
- **Phase v1.2-E (CAEA):** RG 5782/2025 effective date (June 2026) is MEDIUM confidence — community-sourced only. Must verify against Boletin Oficial before any CAEA work begins. If the regulation changes the inform deadline or the 5% threshold definition, the `CaeaService` design changes.
- **Phase v1.2-C (WSFEv1 production):** AFIP rebranded to ARCA; some endpoints are now under `wswhomo.arca.gob.ar`. Verify current production and homologacion URLs for WSAA and WSFEv1 at implementation time. Store in env config (`AFIP_WSAA_URL_HOMO`, `AFIP_WSFEV1_URL_HOMO`, etc.) — never hardcoded.

Phases with standard patterns (skip research-phase):
- **Phase v1.2-A (Schema + Cert):** Direct Prisma migration + NestJS CRUD. `EncryptionService` in WhatsappModule is the exact pattern to reuse for cert encryption.
- **Phase v1.2-B (WSAA):** Fully documented in AFIP-INTEGRATION.md with concrete TypeScript examples. No new architectural decisions.
- **Phase v1.2-D (QR PDF + Frontend):** `qrcode` package API is stable; PDFKit integration is already done for presupuesto PDFs. Standard pattern extension.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Four packages locked with version rationale. Raw SOAP decision made and documented in AFIP-INTEGRATION.md. Existing package versions confirmed from backend/package.json inspection. No contested alternatives. |
| Features | HIGH | P1 features derived from codebase analysis of existing stub + AFIP regulatory requirements (RG 5616/2024 officially published). P2 CAEA features are MEDIUM due to RG 5782/2025 source quality. |
| Architecture | HIGH | Derived entirely from direct codebase inspection. All file paths, DI patterns, and integration points verified against existing code. Build order reflects hard dependency graph. |
| Pitfalls | MEDIUM-HIGH | WSAA/WSFEv1 pitfalls verified via AFIP official docs and community sources. CAEA regulation (Pitfalls 4-5) is MEDIUM — community-confirmed but Boletin Oficial not directly accessed. |

**Overall confidence:** HIGH for Phases A through D (CAE primary path). MEDIUM for Phase E (CAEA) pending regulation verification.

### Gaps to Address

- **RG 5782/2025 Boletin Oficial verification:** Before Phase E begins, fetch the official publication from `boletinoficial.gob.ar` and confirm: (a) June 2026 effective date, (b) the 5% CAEA volume threshold definition, (c) the 8-calendar-day inform window. If any parameter differs from community sources, update `CaeaService` design accordingly.
- **ARCA endpoint URL migration:** Confirm current production and homologacion URLs for WSAA and WSFEv1 at Phase B/C implementation time. Store all AFIP endpoints in env config — never hardcoded in service files. Provide update path if ARCA renames endpoints again.
- **IVA treatment per obra social:** Whether each OS is `IVA_SUJETO_EXENTO` or `CONSUMIDOR_FINAL` is a business decision for each clinic's accountant — not a system default. Document this requirement in the ADMIN cert onboarding screen and flag as a required validation gate before enabling production for any tenant.
- **`node-forge` AFIP homologacion validation checkpoint:** First real WSAA call against `wsaahomo.afip.gov.ar` must confirm `node-forge` PKCS#7 SignedData output is accepted. Confirmed transitively via `@arcasdk/core` usage but not directly tested in this codebase. Flag as explicit end-of-Phase-B checkpoint.
- **PostgreSQL server timeout settings:** Verify that `statement_timeout` and `lock_timeout` at the DB server level do not override the `{ timeout: 45000 }` set on the Prisma `$transaction` wrapping WSFE calls. Long advisory-lock transactions are unusual; confirm with infrastructure.

## Sources

### Primary (HIGH confidence)
- `.planning/research/AFIP-INTEGRATION.md` — 774-line canonical reference: WSAA, WSFEv1, CAEA patterns, advisory lock, signing options, QR spec
- `backend/src/prisma/schema.prisma` — current schema state; `Factura`, `CondicionIVA`, `MonedaFactura`, `EstadoFactura` models
- `backend/src/modules/finanzas/afip/afip.interfaces.ts` — `AfipService` interface contract
- `backend/src/modules/finanzas/afip/afip-stub.service.ts` — existing DI baseline
- `backend/src/modules/whatsapp/crypto/encryption.service.ts` — AES-256-GCM pattern to reuse
- `backend/package.json` — confirmed installed packages and versions
- [AFIP QR code spec](https://www.afip.gob.ar/fe/qr/) — official QR URL format
- [RG 5616/2024 enforcement](https://www.boletinoficial.gob.ar/detalleAviso/primera/318374/20241218) — CondicionIVAReceptorId mandatory from April 1, 2026
- [node-forge npm](https://www.npmjs.com/package/node-forge) — v1.3.3, December 2025
- [qrcode npm](https://www.npmjs.com/package/qrcode) — v1.5.4, 9M+ weekly downloads

### Secondary (MEDIUM confidence)
- [@arcasdk/core GitHub](https://github.com/ralcorta/arcasdk) — confirms `node-forge` + `xml2js` are used against AFIP production; 498 commits, December 2025 release
- [AFIP QR JSON structure](https://groups.google.com/g/pyafipws/c/fRbtMUsuqDQ) — community-confirmed JSON field list corroborating the official spec
- AFIP community documentation on homologacion vs production endpoint differences and ARCA rebranding

### Tertiary (LOW confidence — needs official verification before Phase E)
- RG 5782/2025 CAEA contingency-only restriction (June 2026 effective date) — community sources only; must verify against Boletin Oficial before Phase E implementation begins

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*
