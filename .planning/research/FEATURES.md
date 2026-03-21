# Feature Research

**Domain:** AFIP/ARCA Electronic Invoicing (CAE real) — v1.2 milestone for Argentine aesthetic surgery clinic SaaS
**Researched:** 2026-03-16
**Confidence:** HIGH (technical spec from AFIP-INTEGRATION.md, codebase analysis) / MEDIUM (UX flow conventions for Argentine facturador role)

> **Scope:** This document covers ONLY features needed for v1.2 — real CAE emission and management.
> Everything built in v1.1 (stub, dashboard, settlement workflow, schema prep) is already shipped and is NOT re-researched here.

---

## Context: What v1.1 Already Built (Do Not Re-Build)

The following exists and works:

- `/dashboard/facturador` — dedicated FACTURADOR home with KPIs by OS, monthly cap progress bar, config limit
- `/dashboard/facturador/liquidar/[obraSocialId]` — settlement flow: inline `montoPagado` editing, `CerrarLoteModal`, atomic `LiquidacionObraSocial` creation
- `AfipStubService` — implements `AfipService` interface, returns fake CAE (`74397704790943`)
- `Factura` model with `condicionIVAReceptor` (CondicionIVA enum), `tipoCambio` (Decimal 10,4), `moneda` (MonedaFactura enum)
- `EmitirComprobanteParams` / `EmitirComprobanteResult` interfaces in `afip.interfaces.ts`
- `LimiteFacturacionMensual` model and config UI

What is NOT in the schema yet (v1.2 must add):
- `Factura.cae` — the real CAE number from AFIP
- `Factura.caeFchVto` — CAE expiry date
- `Factura.nroComprobante` — confirmed invoice number from AFIP sequence
- `ConfiguracionAFIP` model — per-professional encrypted certificate storage
- `CAEA` model — pre-fetched contingency authorization codes
- `AmbienteAFIP` enum — HOMOLOGACION / PRODUCCION

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the FACTURADOR role expects once CAE emission is announced. Missing these = the feature is unusable in production.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Real CAE returned and stored on Factura | The entire point of v1.2. Without a real CAE stored against the Factura, the comprobante has no legal validity. Facturador expects to see the 14-digit CAE after emitting. | HIGH | Requires WSFEv1 `FECAESolicitar` + advisory lock + schema migration to add `cae`, `caeFchVto`, `nroComprobante` columns to `Factura`. Swaps `AfipStubService` for real `WsfevService`. |
| Certificate upload by ADMIN for each professional | Someone must put the X.509 certificate into the system before any CAE can be issued. FACTURADOR cannot do their job without this being set up first. | MEDIUM | Secure file upload endpoint (ADMIN-only). Encrypts cert+key using existing `EncryptionService` (AES-256-GCM). Creates `ConfiguracionAFIP` record. FACTURADOR never touches certs — only ADMIN. |
| Certificate status indicator visible to FACTURADOR | FACTURADOR needs to know whether the certificate is configured and valid before attempting to emit. If cert is missing or expired, they must be told immediately — not after a failed CAE request. | LOW | Banner or badge on facturador home: "Certificado AFIP: configurado / vencido en X días / no configurado." Reads from `ConfiguracionAFIP.certExpiresAt`. No cert data exposed. |
| AFIP environment selector (homologacion vs produccion) per tenant | Every tenant must test in homologacion before going live. If the environment is not configurable, the facturador cannot validate the integration before processing real comprobantes. | LOW | `AmbienteAFIP` enum on `ConfiguracionAFIP`. ADMIN sets it. Displayed prominently in FACTURADOR home: "Modo: HOMOLOGACION" badge. Prevents accidental production submission during testing. |
| Invoice number (nroComprobante) visible on Factura after emission | Argentine accountants and OS auditors ask for the comprobante number. Facturador must see it on screen and it must match what AFIP registered. | LOW | Store `cbtDesde` from `EmitirComprobanteResult` as `Factura.nroComprobante`. Display alongside CAE in Factura detail. |
| Error feedback when AFIP rejects or is unreachable | AFIP returns rejection codes with Spanish descriptions. Facturador needs to know specifically what went wrong ("CUIT no autorizado", "Numeración duplicada") not a generic error toast. | MEDIUM | Map AFIP rejection codes to user-readable Spanish messages. Show in a modal or alert with the raw AFIP observation. Log full AFIP response server-side. |
| CAE expiry date displayed on Factura | Argentine regulation: a comprobante is only valid until the CAE expires. Facturador must see `caeFchVto` and ideally be warned if a comprobante is approaching expiry without being delivered. | LOW | Display `caeFchVto` on Factura card/row in YYYY-MM-DD format. No action required — informational. |
| "Emitir Comprobante AFIP" action wired to real service | The `CerrarLoteModal` currently calls the stub. The FACTURADOR's primary action — closing a settlement batch — must trigger real CAE emission. Must be clearly labeled as "Emitir con CAE" in production vs "Modo prueba" in homologacion. | MEDIUM | Replace `AfipStubService` injection with real `WsfevService` behind NestJS DI token. Frontend label conditional on ambiente. |

### Differentiators (Competitive Advantage)

Features that distinguish this from manually calling AFIP or using a generic billing tool.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Certificate expiry warning 30 days before (email or dashboard alert) | AFIP certs expire every 2 years. Missing renewal = all billing stops for that tenant with no warning. A 30-day alert turns a catastrophic surprise into a scheduled task. | LOW | Cron job or check on WSAA call: if `certExpiresAt < now + 30d`, create a banner on FACTURADOR home and optionally notify ADMIN by email. |
| CAEA contingency mode: silent fallback when AFIP is down | AFIP production outages are real (fiscal year-end, month-end congestion). If the system falls back to CAEA automatically, billing continues without the facturador needing to call their accountant. | HIGH | Pre-fetch CAEA via cron (`0 6 27,11,12 * *`). On `FECAESolicitar` timeout/5xx, assign CAEA code to invoice. Facturador sees "Emitido en modo contingencia — CAEA" badge. Requires `FECAEAInformar` batch job within 30 days after period end. **Verify RG 5782/2025 against Boletín Oficial before implementing.** |
| QR code embedded in Factura PDF | RG 5616/2024 mandates QR codes on electronic comprobantes. Including it makes the PDF legally compliant and eliminates a manual step. The FACTURADOR never needs to know how it is generated — it just appears on the PDF. | MEDIUM | QR encodes the AFIP-specified URL: `https://www.afip.gob.ar/fe/qr/?p=BASE64({json})`. JSON fields: ver, fecha, cuit, ptoVta, tipoCbte, nroCbte, importe, moneda, ctz, tipoDocRec, nroDocRec, tipoCodAut ("E" for CAE), codAut (CAE number). Generate with `qrcode` npm package. Embed in existing PDF generation flow. |
| Advisory-locked sequential numbering (transparent to user) | Duplicate sequence errors from concurrent CAE requests crash the billing flow. With advisory locking, concurrent requests for the same professional always get the correct next number. Facturador never sees this work — they just never get a "duplicate comprobante" error. | MEDIUM | `pg_advisory_xact_lock` within Prisma `$transaction` wrapping `FECompUltimoAutorizado → FECAESolicitar`. Fully described in AFIP-INTEGRATION.md Section 3. |
| BNA exchange rate field with link to official source for USD invoices | When a clinic invoices in USD (some OS agreements or private patients), RG 5616/2024 requires the BNA selling rate for the prior business day. Providing a direct link to `bna.com.ar` and a pre-filled input avoids the facturador needing to find the rate manually. | LOW | `tipoCambio` field already in schema. In "Nuevo Comprobante" modal, show the field when `moneda = USD` with a link: "Ver cotización BNA". Manual entry — no scraping. |
| Punto de Venta (PtoVta) configured per professional with validation | Argentine AFIP requires a registered PtoVta number. If it's wrong, all CAE requests fail. Storing and validating it per professional (not per request) means the facturador never has to remember or type it. | LOW | Add `ptoVta` to `ConfiguracionAFIP`. Validate it's a positive integer on save. Display in ADMIN cert config screen. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-fetch BNA exchange rate via scraping | Facturadores want the current rate pre-filled automatically | BNA has no official API. Scraping breaks when BNA changes their HTML (happened multiple times). A broken scraper silently fills in `0` or last-known rate — causing incorrect invoices. | Manual entry with prominent link to `bna.com.ar/Personas`. Audit-friendly: facturador explicitly confirmed the rate. |
| Automatic CAEA as primary invoicing path (before June 2026) | CAEA avoids real-time AFIP call — faster emission | RG 5782/2025 restricts CAEA to contingency-only from June 2026. Building CAEA as primary now creates a regulatory violation and requires a full rewrite by June. | Always attempt `FECAESolicitar` first. CAEA only on confirmed AFIP failure. |
| Let facturador upload their own certificate | Reduces ADMIN friction | Certificate + private key are secrets. Giving upload access to FACTURADOR role violates the principle of least privilege. If the key leaks, all electronic signatures are compromised. | ADMIN-only upload. FACTURADOR sees status only (configured/expiring/missing). |
| Multi-comprobante batch CAE in a single FECAESolicitar | Seems efficient — one AFIP call for the whole settlement batch | `CbteDesde ≠ CbteHasta` batches are valid in WSFEv1 but require all invoices to have identical header fields (same recipient, same IVA condition). OS liquidations often mix practice types. One comprobante per liquidacion batch is safer and maps correctly to the existing `LiquidacionObraSocial` model. | One `FECAESolicitar` per settlement batch (CbteDesde = CbteHasta). The advisory lock already handles sequencing. |
| Storing decrypted certificate in memory for the session | Reduces latency — cert already decrypted after first WSAA call | If the process crashes or is forked, decrypted key material is in memory with no TTL. | Decrypt only at the moment of the WSAA call. Cache the ACCESS TICKET (token+sign), not the key. Token cache has 12h TTL with 5-minute buffer. |
| Factura PDF generated by the frontend | Some SPA patterns generate PDFs client-side | PDF with QR requires CAE + sequence number — data that only exists server-side after the AFIP call. Generating client-side would require exposing the full AFIP response to the browser. | PDF generated server-side (existing pattern for presupuesto PDFs). Served as download via `/finanzas/facturas/:id/pdf`. |

---

## Feature Dependencies

```
[Real CAE Emission]
    └──requires──> [ConfiguracionAFIP model in schema]
                       └──requires──> [ADMIN cert upload endpoint]
                       └──requires──> [AmbienteAFIP enum]
    └──requires──> [Factura.cae + caeFchVto + nroComprobante columns (migration)]
    └──requires──> [Advisory lock pattern in WsfevService]
                       └──wraps──> [FECompUltimoAutorizado + FECAESolicitar]
    └──requires──> [WsaaService — token management + TRA signing]
                       └──depends on──> [CMS signing: openssl smime subprocess decision]

[QR Code in PDF]
    └──requires──> [Real CAE Emission] (CAE number must exist before PDF can encode it)
    └──requires──> [Factura.nroComprobante + Factura.cae stored]
    └──enhances──> [existing PDF generation flow (presupuesto pattern)]

[Certificate Expiry Warning]
    └──requires──> [ConfiguracionAFIP.certExpiresAt stored at upload time]
    └──enhances──> [FACTURADOR home dashboard (v1.1 already built)]

[CAEA Contingency Mode]
    └──requires──> [Real CAE Emission] (CAEA is the fallback, not the primary)
    └──requires──> [CAEA model in schema: caea, fchVigDesde, fchVigHasta, fchTopeInf, profesionalId]
    └──requires──> [@nestjs/schedule cron job for pre-request]
    └──requires──> [FECAEAInformar batch job within 30d after period end]
    └──requires──> [RG 5782/2025 verification against Boletín Oficial before implementing]

[BNA Rate Field for USD Invoices]
    └──requires──> [Factura.tipoCambio already in schema — v1.1 done]
    └──requires──> [moneda=USD UI path in Nuevo Comprobante modal]

[Environment Badge on FACTURADOR Home]
    └──requires──> [ConfiguracionAFIP.ambiente readable by FACTURADOR (without exposing cert)]
```

### Dependency Notes

- **Certificate upload is the gate for everything.** No cert = no WSAA token = no CAE. ADMIN must complete onboarding before FACTURADOR can emit. Certificate status display on FACTURADOR home is the user-visible indicator of this gate.
- **Schema migration must land before service swap.** Adding `cae`, `caeFchVto`, `nroComprobante` to `Factura` and creating `ConfiguracionAFIP` must be in a migration that deploys before the real `WsfevService` is activated. The stub can still run after the migration is applied.
- **CAEA depends on CAE path being stable first.** Do not build CAEA until the primary CAE flow is working in homologacion. Contingency mode that is never tested against a working primary is itself a source of bugs.
- **QR code cannot precede CAE.** QR encodes the CAE number. The PDF generation must happen after `FECAESolicitar` returns successfully and the CAE is persisted.
- **CMS signing decision (openssl vs node-forge) must be made before WsaaService is built.** This is a team decision with no wrong answer, but it affects the Docker image (openssl binary present on server) and has no backtracking path without rewriting the signing logic.

---

## MVP Definition

### Launch With (v1.2)

Minimum scope to replace the stub with a real CAE that is legally valid in Argentina.

- [ ] Schema migration: `ConfiguracionAFIP` model + `AmbienteAFIP` enum + `Factura.cae` + `Factura.caeFchVto` + `Factura.nroComprobante` + `ConfiguracionAFIP.ptoVta`
- [ ] ADMIN cert upload endpoint — encrypts cert.pem + key.pem via `EncryptionService`, stores in `ConfiguracionAFIP`
- [ ] `WsaaService` — `buildTRA()`, CMS signing (openssl smime subprocess), token cache with 12h TTL and 5-min buffer
- [ ] `WsfevService` — `FECompUltimoAutorizado()`, `FECAESolicitar()` within `pg_advisory_xact_lock` Prisma transaction, AFIP rejection code mapping to Spanish messages
- [ ] Swap `AfipStubService` for real service in NestJS DI (keep stub available for test environment via env var toggle)
- [ ] Store real CAE + nroComprobante + caeFchVto on `Factura` after successful emission
- [ ] Certificate status indicator on FACTURADOR home (configured / expiring / missing / ambiente badge)
- [ ] BNA rate field in "Nuevo Comprobante" modal when moneda=USD, with link to bna.com.ar
- [ ] QR code in Factura PDF (encode AFIP JSON spec, generate via `qrcode` package)
- [ ] Error feedback UI: map AFIP rejection codes to readable messages, show in modal not generic toast
- [ ] ADMIN configuration screen for `ConfiguracionAFIP` (upload cert, set ptoVta, toggle ambiente)

### Add After Validation (v1.2.x)

- [ ] Certificate expiry warning cron + email to ADMIN (30-day notice) — add once cert upload is working in production
- [ ] CAEA contingency mode — add after primary CAE flow is stable in production AND RG 5782/2025 is verified against Boletín Oficial
- [ ] `FECAEAInformar` batch job — add together with CAEA mode (they are one feature)

### Future Consideration (v2+)

- [ ] Liquidation history per OS with amount variance tracking (authorized vs paid) — deferred from v1.1
- [ ] Multi-professional certificate management (bulk upload, status dashboard for all tenants) — SaaS operator tooling, not clinic-facing
- [ ] OS portal submission (Webcred integration) — requires individual OS business agreements

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Schema migration (ConfiguracionAFIP + Factura CAE fields) | HIGH | LOW (migration only) | P1 |
| ADMIN cert upload endpoint | HIGH | MEDIUM | P1 |
| WsaaService (TRA + signing + token cache) | HIGH | HIGH | P1 |
| WsfevService (FECAESolicitar + advisory lock) | HIGH | HIGH | P1 |
| NestJS DI swap: stub → real | HIGH | LOW | P1 |
| Store CAE + nroComprobante on Factura | HIGH | LOW | P1 |
| AFIP rejection code mapping to Spanish messages | HIGH | MEDIUM | P1 |
| Certificate status indicator on FACTURADOR home | HIGH | LOW | P1 |
| ADMIN config screen for ConfiguracionAFIP | HIGH | MEDIUM | P1 |
| QR code in Factura PDF | MEDIUM | MEDIUM | P1 |
| BNA rate field for USD invoices | MEDIUM | LOW | P1 |
| Environment (homologacion/produccion) badge | MEDIUM | LOW | P1 |
| Certificate expiry warning (30-day cron) | HIGH | LOW | P2 |
| CAEA contingency mode | HIGH | HIGH | P2 |
| FECAEAInformar batch job | HIGH | MEDIUM | P2 (with CAEA) |
| Liquidation history with variance tracking | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.2 launch (real CAE, legally compliant PDF)
- P2: Add after v1.2 is stable in production
- P3: Future milestone

---

## User Journey: FACTURADOR Perspective

### Before First CAE Emission (Onboarding)

1. **Accountant / professional generates CSR** using their CUIT as CN. Submits to AFIP homologacion portal (WSASS). Downloads `.pem` certificate.
2. **ADMIN uploads cert** via a new "Configuracion AFIP" section. Uploads `cert.pem` + `key.pem`. System shows: "Certificado configurado. Vence: 2028-03-15. Ambiente: HOMOLOGACION."
3. **ADMIN configures PtoVta** — the registered Point of Sale number from AFIP portal. One-time entry.
4. **FACTURADOR sees on their home:** green "Certificado AFIP: Activo" badge and "Modo: HOMOLOGACION" warning banner. They know they are ready to test.

### Emitting a CAE (Primary Flow — User's Perspective)

1. FACTURADOR opens settlement for OS "OSDE — 3 practicas — $45.000".
2. Edits `montoPagado` inline for each practice if needed.
3. Opens `CerrarLoteModal`. Sees total, confirms condicionIVA receptor, tipoCambio if USD.
4. Clicks "Emitir Comprobante con CAE".
5. System calls AFIP (1-3 seconds). Button shows spinner: "Solicitando CAE..."
6. On success: modal closes, toast: "Comprobante emitido. CAE: 74397704790943. Vence: 2026-03-23."
7. Factura row in `ComprobantesTab` shows: number, CAE badge, vencimiento, monto.
8. PDF available for download includes the QR code. Legally valid.

### Error States (What FACTURADOR Sees)

| Situation | What FACTURADOR Sees | What They Should Do |
|-----------|---------------------|---------------------|
| AFIP rejects (wrong CUIT in condicionIVA mapping) | Modal: "AFIP rechazó el comprobante: Código 10015 — El receptor debe ser Responsable Inscripto para Factura A. Revisá la condición de IVA del receptor." | Change condicionIVAReceptor and retry |
| AFIP unreachable (timeout, HTTP 5xx) — CAE mode, no CAEA configured | Toast error: "AFIP no respondió. Reintentá en unos minutos o contactá a tu contador." | Wait and retry manually |
| AFIP unreachable — CAEA configured and valid | Badge on emitted invoice: "Emitido en modo contingencia (CAEA)". Flow continues normally. | Nothing — system handled it |
| Certificate expired | Banner on home: "Certificado AFIP vencido el 2026-03-15. No podés emitir comprobantes. Solicitá uno nuevo a tu contador." | Contact accountant to generate new CSR |
| Certificate not yet uploaded | Banner on home: "Certificado AFIP no configurado. Pedile al administrador que lo suba." | Notify ADMIN |
| Duplicate sequence (edge case, advisory lock prevents this) | If somehow reached: "Error de secuencia AFIP. El equipo de soporte fue notificado." Sentry alert server-side. | Support handles — user cannot fix |

### After CAE Emission

- FACTURADOR can download PDF with QR from ComprobantesTab.
- Factura shows CAE number, sequence number, vencimiento.
- At period end (if CAEA was used): system runs `FECAEAInformar` automatically — user sees no action required.

---

## Argentine Regulatory Notes for v1.2

**RG 5616/2024 — Full enforcement from April 1, 2026.** From that date, `FECAESolicitar` rejects invoices missing `CondicionIVAReceptorId` or `MonCotiz` (for foreign currency). The schema already has `condicionIVAReceptor` and `tipoCambio`. The WSFEv1 service must map them to AFIP integer IDs at submission time. No schema change needed for this compliance requirement.

**RG 5782/2025 — CAEA contingency-only from June 2026.** Community-sourced finding. MUST be verified against Boletín Oficial before CAEA is implemented. If confirmed, CAEA is always a fallback path only — not an optimization. Design requires `FECAESolicitar` to always be attempted first.

**IVA treatment for aesthetic surgery and obras sociales.** Medical services to obras sociales are typically `IVA_SUJETO_EXENTO` (AFIP ID 4) or `CONSUMIDOR_FINAL` (ID 5) depending on the OS's legal status. This is not a system decision — it must be validated with the clinic's accountant before go-live. The `condicionIVAReceptor` field already allows per-Factura configuration. Document this requirement clearly in the ADMIN cert config screen.

**Clock synchronization.** WSAA validates `generationTime` against its own clock. Server NTP sync is a deployment prerequisite. Add an NTP check or at minimum document it in the deployment runbook. Clock drift causes cryptic WSAA rejections.

---

## Sources

- `.planning/research/AFIP-INTEGRATION.md` — complete technical reference (WSAA, WSFEv1, CAEA, RG 5616/2024, RG 5782/2025) — HIGH confidence
- `backend/src/prisma/schema.prisma` — current schema state, existing `Factura` fields — HIGH confidence
- `backend/src/modules/finanzas/afip/afip.interfaces.ts` — contract interface between stub and real service — HIGH confidence
- `backend/src/modules/finanzas/afip/afip-stub.service.ts` — existing stub behavior — HIGH confidence
- `frontend/src/app/dashboard/facturador/page.tsx`, `liquidar/[obraSocialId]/page.tsx` — existing FACTURADOR UI — HIGH confidence
- `.planning/PROJECT.md` — milestone scope, deferred items, technical decisions — HIGH confidence
- AFIP RG 5616/2024: [ARCA official documentation](https://www.afip.gob.ar/ws/documentacion/ws-factura-electronica.asp) — MEDIUM confidence (verified via AFIP-INTEGRATION.md research)
- RG 5782/2025 CAEA restriction — LOW confidence (community sources only, must verify against Boletín Oficial)

---

*Feature research for: v1.2 AFIP Real — CAE emission, certificate management, QR PDF compliance*
*Researched: 2026-03-16*
*Supersedes: v1.1 FEATURES.md entries for "Future Consideration (v2+): AFIP/ARCA CAE issuance"*
