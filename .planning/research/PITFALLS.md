# Pitfalls Research

**Domain:** Argentine medical clinic SaaS — AFIP electronic invoicing (WSFE/WSAA), obra social settlement workflows, FACTURADOR role isolation (multi-tenant aesthetic surgery platform)
**Researched:** 2026-03-12
**Confidence:** MEDIUM-HIGH (AFIP WSFE specifics: MEDIUM — verified via official AFIP docs and community sources; billing workflow patterns: MEDIUM — verified via Argentine professional billing instructivos and community sources; role isolation: HIGH — standard patterns)

---

## Critical Pitfalls

### Pitfall 1: Conflating AFIP homologation certificates with production certificates

**What goes wrong:**
The team builds and tests the entire WSFE integration using a homologation certificate obtained via WSASS (the testing environment self-service portal). Everything works in staging. At go-live, they swap the URL to production and the service throws authentication errors. The production certificate is an entirely different artifact: it must be generated via the "Administrador de Certificados Digitales" portal on the clinic's fiscal key, then explicitly associated with the WSFE service by the clinic's accountant or authorized representative. This requires the clinic's CUIT, their Clave Fiscal nivel 3, and a separate AFIP administrative step that can take 1–3 business days.

**Why it happens:**
Homologation certificates are self-service and instant. Developers assume production is the same process with a different URL. In reality, production certificate management requires the end-user (the clinic) to act — the SaaS developer cannot do it for them.

**How to avoid:**
- Document the production certificate provisioning process as a clinic onboarding requirement, not a developer task. Prepare a step-by-step guide for the accountant.
- Build the system to accept externally-provided certificate files (`.crt` / `.key` pair), stored encrypted per-tenant in the DB. Never bundle a certificate in the codebase.
- Treat production AFIP access as a per-clinic gate: feature is unavailable until the clinic has uploaded their certificate and it has been validated against WSAA.
- In the NestJS service, validate the certificate on upload: call WSAA `LoginCms` in production mode and surface a clear error if authentication fails, before any invoice is attempted.
- Certificates expire (typically 2 years from issuance). Build an expiry alert system that warns 60 days in advance — expired certificates cause silent failures at invoice time.

**Warning signs:**
- "We'll ask the clinic for their certificate later" in planning notes.
- No per-tenant encrypted certificate storage in the Prisma schema.
- Test suite only runs against homologation; no smoke test against production WSAA before launch.

**Phase to address:**
AFIP Research / Architecture Phase — certificate provisioning model must be defined before any WSFE code is written.

---

### Pitfall 2: WSFE comprobante numbering gaps causing permanent sequential corruption

**What goes wrong:**
AFIP WSFE enforces strict correlative comprobante numbering per punto de venta and tipo de comprobante. If invoice #1043 is attempted and rejected (for any reason — validation error, network timeout, concurrent request), and the system then issues #1044, AFIP permanently rejects #1044 with error 10016 ("El numero o fecha del comprobante no se corresponde con el proximo a autorizar"). All future invoices for that punto de venta are also rejected. Recovery requires AFIP support intervention, which can take days.

**Why it happens:**
Developers implement a naive "get last number + 1" approach without distributed locking. Under concurrent load (two secretaries billing simultaneously) or after a failed request that incremented the local counter but not AFIP's, a gap forms. The system believes it issued #1042 and #1043, but AFIP only recorded #1042. The next request sends #1044, which AFIP sees as a gap.

**How to avoid:**
- Always call `FECompUltimoAutorizado` from AFIP before generating the next number — never rely on a local counter. Use AFIP's authoritative "last authorized" as the source of truth.
- Implement a database-level advisory lock (PostgreSQL `SELECT pg_advisory_xact_lock(id)`) on the (profesionalId, puntoVenta, tipoComprobante) combination before calling WSFE. Release after CAE is received.
- If the WSFE call fails without returning a CAE, do NOT increment the local counter. Log the attempt, surface the error to the user, and let them retry — which will resend the same number.
- Handle error 10016 explicitly: query `FECompUltimoAutorizado`, resync the local counter, and retry once before surfacing to user.

**Warning signs:**
- `ultimoComprobante = await db.factura.count(...)` pattern in the invoicing service.
- No distributed lock around the WSFE call.
- No explicit handling of error 10016 in the error handler.

**Phase to address:**
AFIP Integration Phase — locking must be in the initial design, not added after the first production numbering incident.

---

### Pitfall 3: WSAA access token (TA) expiration causing silent invoice failures in production

**What goes wrong:**
The WSAA access token (Ticket de Acceso) is valid for 12 hours. The system obtains a token at startup and caches it in memory. A clinic that invoices only in the morning is fine. A clinic that invoices sporadically throughout a long day hits a 13-hour window where the token is expired. The first invoice attempt of the afternoon fails silently or with an opaque SOAP error. Secretaries think the system is broken. Invoice was not issued.

**Why it happens:**
12 hours feels long. Developers cache the token in an in-memory variable and don't implement expiry checks. After a server restart (deploy, crash) the token is regenerated. The failure mode only appears in specific usage patterns.

**How to avoid:**
- Store the TA (`token`, `sign`, `expirationTime`) in Redis or the DB per-tenant, not in application memory.
- Before every WSFE call, check if `expirationTime - now() < 15 minutes`. If so, request a new TA proactively (do not wait for the call to fail).
- AFIP will reject a second TA request if the first is still valid — the error is "El CEE ya posee un TA valido". The 15-minute proactive buffer avoids this race condition on simultaneous requests.
- Wrap every WSFE call in retry logic: on TA-expired errors, force-refresh the token and retry once before surfacing to the user.
- NB: Each clinic has its own CUIT and certificate — TA management is strictly per-tenant.

**Warning signs:**
- `wsfeToken` stored as a module-level variable in the NestJS service.
- No expiry check before WSFE calls.
- No per-tenant TA storage in the DB/Redis schema.

**Phase to address:**
AFIP Integration Phase — TA lifecycle must be designed as part of the WSFE client abstraction, not bolted on after the first expiry-related support ticket.

---

### Pitfall 4: AFIP WSFE offline / CAEA not planned, leaving clinic unable to bill during AFIP outages

**What goes wrong:**
AFIP's production WSFE service has scheduled maintenance windows and unplanned outages. When WSFE is unreachable, no CAE can be obtained, and therefore no compliant invoice can be issued. A clinic that needs to close out a month-end billing run is completely blocked if the system has no contingency mode.

**Why it happens:**
Teams build the "happy path" integration first and defer contingency handling. AFIP outages are infrequent enough that they don't surface during testing.

**How to avoid:**
- For the research milestone: document CAEA (Código de Autorización Electrónico Anticipado) as the official AFIP offline contingency mechanism. CAEA is requested fortnightly (before the 1st and 16th of each month) and allows invoicing without real-time WSFE connectivity.
- For the implementation milestone: implement a CAEA fallback mode that activates automatically when WSFE is unreachable after 3 retries. Store the current CAEA in the DB per-tenant.
- Surface a clear UI warning when CAEA mode is active: "Facturando en modo contingencia — los comprobantes serán validados con AFIP automáticamente cuando el servicio esté disponible".
- CAEA comprobantes must be "informed" to AFIP via `FECAEASolicitar` once connectivity is restored — build this reconciliation step.

**Warning signs:**
- No AFIP outage handling in the service layer (only `try/catch → throw HttpException`).
- No CAEA requested or stored in the DB.
- No UI distinction between CAE and CAEA mode.

**Phase to address:**
AFIP Integration Phase — CAEA is a research deliverable for v1.1 and an implementation requirement for v1.2+.

---

### Pitfall 5: IVA treatment errors for medical services billing to obras sociales

**What goes wrong:**
The system emits Factura A with 21% IVA on all services. Argentine tax law treats medical services differently: services to affiliados obligatorios of obras sociales are IVA-exempt (code 3 — exento); services to voluntary affiliates may be subject to reduced 10.5% IVA; services under ART are IVA-exempt. Emitting the wrong IVA category results in incorrect tax liability for the clinic and a comprobante that the obra social's audit will reject.

**Why it happens:**
IVA treatment for medical services is non-obvious. The assumption "professional = Responsable Inscripto = 21% IVA" is wrong for health services. The developer builds a generic invoicing form without consulting a domain-specialist (contador).

**How to avoid:**
- For the research milestone: document the IVA treatment matrix for the specific use case (aesthetic surgery + obras sociales) as a deliverable, with accountant sign-off before implementation.
- The `Factura` model must support IVA-exempt comprobantes (tipo C for monotributistas, or tipo B with concepto "exento" for RI exempt from IVA on this activity).
- Do not expose IVA category as a free-form field to the FACTURADOR. Derive it from the clinic's fiscal condition (which is a configuration field) and the patient's coverage type (obra social vs. particular).
- Build a pre-emission validation that checks the IVA derivation logic against the clinic's contadora before enabling production.

**Warning signs:**
- Hardcoded `ivaAlicuota: 21` in the invoice creation DTO.
- No `condicionIVA` field on the clinic/tenant configuration model.
- No accountant review step in the AFIP integration plan.

**Phase to address:**
AFIP Research Phase — IVA treatment must be documented and verified with a domain expert before any invoice schema or UI is built.

---

### Pitfall 6: Monthly billing limit tracked in application memory or without timezone awareness, causing boundary errors

**What goes wrong:**
The facturador's monthly limit is checked by `WHERE fecha >= startOfMonth AND fecha <= endOfMonth`. If `startOfMonth` is computed in UTC (JavaScript's `new Date()` with no timezone handling), an invoice issued at 21:00 UTC on February 28 is actually 18:00 ART on February 28 — correctly within February. But an invoice at 21:30 UTC on February 28 is 18:30 ART — still February 28, but the server running in UTC reports it as March 1 at 00:30. The limit resets a month too early, or a February invoice is counted against March's limit.

**Why it happens:**
Argentina is UTC-3 with no DST. Developers storing `DateTime` as UTC in PostgreSQL and comparing month boundaries without converting to ART timezone produce off-by-one errors on the last/first day of every month.

**How to avoid:**
- All month boundary calculations must use `America/Argentina/Buenos_Aires` timezone explicitly. In NestJS, use `date-fns-tz` or `luxon` with `setZone('America/Argentina/Buenos_Aires')` when computing `startOfMonth` / `endOfMonth`.
- Store the `periodo` of a LiquidacionObraSocial as a `String` in `YYYY-MM` format (already done in the schema — verify this is computed in ART, not UTC).
- Add a DB constraint or service-level check: the `periodo` assigned to a `PracticaRealizada` must match the ART month of `fecha`.
- Write unit tests specifically for the UTC-3 boundary: a practice at `2026-03-01T02:30:00Z` is February 28 in ART — verify the month assignment is "2026-02", not "2026-03".

**Warning signs:**
- `new Date()` used directly for month range queries without timezone conversion.
- `periodo` string computed on the frontend (which may be in user's local timezone) rather than server-side in a canonical ART timezone.
- No unit tests for month-boundary dates.

**Phase to address:**
FACTURADOR Dashboard Phase — all date range queries must use ART-aware helpers from the first commit. Add a shared `getMonthBoundariesART(year, month)` utility to prevent this recurring across every query.

---

### Pitfall 7: Settlement amount corrections creating untracked modifications without audit trail

**What goes wrong:**
The facturador edits the `monto` of a `PracticaRealizada` record (to reflect what the OS actually paid vs. what was billed). The edit is saved directly to the `monto` field. Three months later, the clinic disputes a payment. There is no record of: the original billed amount, who changed it, when, and what reason was given. The audit trail is the accountant's notebook, not the system.

**Why it happens:**
Simple `PATCH /practicas/:id` endpoint that updates `monto` in place is the most direct implementation. Audit logging is added "later" and then never prioritized.

**How to avoid:**
- Never mutate `PracticaRealizada.monto` in place after the initial billing. Instead, add a `montoReal` field (nullable) that stores the OS-paid amount, preserving `monto` as the originally billed amount.
- Add `corregidoPor: String?` (usuarioId), `corregidoAt: DateTime?`, and `motivoCorreccion: String?` fields to `PracticaRealizada`.
- In the service layer, any correction must set all three audit fields atomically in the same Prisma transaction.
- The FACTURADOR role may only set `montoReal`, never `monto`. Original billed amount is immutable after the practice is created.
- Surface the correction audit trail in the UI: show "Monto original: $X → Corregido a: $Y por [Usuario] el [Fecha]".

**Warning signs:**
- `PATCH /practicas/:id` updates the `monto` field directly.
- No `montoReal`, `corregidoPor`, or `corregidoAt` columns in the schema.
- Correction history is not visible anywhere in the UI.

**Phase to address:**
Settlement Workflow Phase — schema must include audit fields from the initial migration. Retrofitting audit trails requires reprocessing historical data.

---

### Pitfall 8: Partial OS payments spanning multiple liquidations causing double-counting

**What goes wrong:**
An obra social partially pays a liquidation (e.g., 70% of a batch of practices). The facturador marks the liquidation as PAGADO. The remaining 30% is owed but has no tracking. When the OS pays the remainder in the next billing cycle, there is no way to link it back to the original practices or liquidation — it either gets recorded as a duplicate payment or gets lost.

**Why it happens:**
The `LiquidacionObraSocial.estadoLiquidacion` enum only has PENDIENTE/PAGADO. There is no intermediate state and no partial payment tracking. The data model assumes settlements are either fully unpaid or fully paid.

**How to avoid:**
- For the research milestone: document this as a known schema gap. Recommend adding a `PAGO_PARCIAL` state to `EstadoLiquidacion` and a `montoPagado` field to `LiquidacionObraSocial`.
- Add a `PagoLiquidacion` child table that records each payment event: amount, date, usuarioId, reference number. This supports multiple partial payments without losing history.
- The `montoTotal` stays as billed; `montoPagado` accumulates from `PagoLiquidacion` records; estado transitions: PENDIENTE → PAGO_PARCIAL (when montoPagado > 0 but < montoTotal) → PAGADO (when montoPagado >= montoTotal).
- Expose a "registrar pago parcial" action in the UI, distinct from "marcar como pagado en su totalidad".

**Warning signs:**
- `estadoLiquidacion` is a two-state enum with no PAGO_PARCIAL.
- No `montoPagado` or payment event log on LiquidacionObraSocial.
- "Registrar pago" UI action only offers binary paid/unpaid.

**Phase to address:**
Settlement Workflow Phase — schema must support partial payments before any settlement UI is built. Adding this after go-live requires a migration and UI rework.

---

### Pitfall 9: FACTURADOR role leaking clinical data or operating across tenant boundaries

**What goes wrong:**
The FACTURADOR role is given broad read access to `Paciente`, `Turno`, and `PracticaRealizada` to enable billing workflows. In a multi-professional clinic (multiple `Profesional` records under the same implicit tenant), the facturador sees practices from all professionals — which may include sensitive or commercially sensitive patients of competing professionals sharing the same system. In a multi-tenant scenario, a bug in the profesionalId filter exposes another clinic's data.

**Why it happens:**
The existing codebase filters by `profesionalId` for PROFESIONAL role but the FACTURADOR role (which spans multiple professionals in a clinic) uses looser filtering. The nuance between "facturador sees all practices in their clinic" vs "facturador sees all practices in the system" is easy to miss.

**How to avoid:**
- Define the FACTURADOR's data scope precisely: all practices belonging to professionals in the same `clinicaId` (tenant), never practices from other tenants.
- Until a formal `Clinica`/tenant model exists in the schema: scope FACTURADOR queries to the set of `Profesional.id` values that belong to the same clinic as the facturador's `usuarioId`. This set must be computed server-side, never passed from the frontend.
- Add an integration test: create a facturador user, create a practice for a different tenant's professional, verify the FACTURADOR endpoint returns 0 results for that practice.
- The FACTURADOR must never access `HistoriaClinicaEntrada` (clinical notes), `Presupuesto` content, or WhatsApp message logs — these are outside billing scope.
- Add explicit column-level guards in DTOs: the FACTURADOR response shape for a patient should include only `id`, `nombre`, `apellido`, `obraSocialId`, `nroAfiliado` — not clinical, CRM, or communication data.

**Warning signs:**
- FACTURADOR controller reuses the same `PacienteService.findAll()` as ADMIN without an additional scope filter.
- No test asserting cross-tenant isolation for the FACTURADOR role.
- FACTURADOR API response includes CRM fields (`etapaCRM`, `temperatura`) or clinical fields.

**Phase to address:**
FACTURADOR Dashboard Phase — role scope must be the first thing defined before any controller is written. Permissions are harder to tighten after the UI has been built around broad access.

---

### Pitfall 10: RG 5616/2024 (ARCA) comprobante changes not accounted for in schema

**What goes wrong:**
ARCA Resolución General 5616/2024 (effective July 2025 for most contributors, with the manual for developers published January 2025) requires all electronic comprobantes to include: (a) the receptor's IVA condition specifically for the operation being documented, and (b) for foreign currency operations, the exchange rate (tipo de cambio vendedor divisa Banco Nación of the prior business day). The existing `Factura` model has `condicionIVA` as a free-text `String?` and no `tipoCambio` field. If the integration is built without accounting for these fields, every comprobante will be rejected by AFIP once the new schema is enforced.

**Why it happens:**
The regulation was published in December 2024. Developers building the integration in early 2026 from older tutorials or pre-RG5616 library versions will miss these new mandatory fields.

**How to avoid:**
- Use `@afipsdk/afip.js` v4+ which already incorporates RG 5616/2024 changes (per library changelog verified 2025). Do not use `facturajs` (last meaningful commit 2020) or unversioned snippets.
- Add `condicionIVAReceptor: String` (non-nullable, AFIP enum code) and `tipoCambio: Decimal? @db.Decimal(10,6)` to the `Factura` model in the migration for this milestone.
- For ARS invoices (the common case in OS billing), `tipoCambio` is null and `condicionIVAReceptor` is derived from the OS/patient's fiscal registration.
- Test all comprobante types (A, B, C) in homologation before production — the ARCA homologation environment has been updated to validate RG 5616 fields.

**Warning signs:**
- Using `facturajs` npm package (outdated, no RG 5616 support).
- `Factura.condicionIVA` is a nullable free-text field with no validation.
- No `tipoCambio` field in the schema.
- Tests run only on homologation pre-July 2025 schema (old validation rules).

**Phase to address:**
AFIP Research Phase — identify the correct library version and verify RG 5616 field requirements before designing the migration.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Local counter for comprobante numbering instead of querying `FECompUltimoAutorizado` | Faster, fewer AFIP round-trips | One concurrency event creates permanent sequential corruption for the punto de venta | Never — always use AFIP as source of truth |
| In-memory WSAA token with no expiry management | Simple code, works for days | Token expires silently mid-day; invoice failures no one understands | Never in production |
| Single WSFE punto de venta across all clinic tenants | No per-tenant AFIP onboarding required | One clinic's numbering gap corrupts all others; regulatory exposure mixing CUITs | Never — WSFE is per-CUIT, multi-CUIT sharing is legally invalid |
| Updating `monto` in place without audit columns | Simpler schema, fewer fields | No audit trail; disputes unresolvable; potential regulatory issue | Never for financial records |
| Two-state liquidation (PENDIENTE/PAGADO) | Simple implementation | Partial OS payments cannot be tracked; reconciliation requires external spreadsheets | Only for MVP if documented as known gap with a fix milestone committed |
| Hardcoded IVA 21% on all invoices | No IVA logic to build | Wrong tax treatment for medical services; OS audit rejection; clinic tax liability | Never — must be derived from fiscal condition |
| Skipping CAEA contingency mode | Faster integration build | Clinic cannot bill during any AFIP outage; month-end billing blocked | Acceptable for research milestone if documented as v1.2+ requirement |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| AFIP WSAA | Requesting a new TA while the previous one is still valid | Check `expirationTime` before requesting; request only when `< 15 minutes remaining` to avoid "ya posee TA valido" rejection |
| AFIP WSFE | Sending the next comprobante number without querying `FECompUltimoAutorizado` first | Always get the authoritative last number from AFIP before every single invoice emission |
| AFIP WSFE homologation | Testing with homologation certificate and assuming production works the same way | Homologation uses WSASS self-service cert; production requires Administrador de Certificados Digitales + explicit WSFE service association by clinic accountant |
| AFIP WSFE | Handling SOAP errors as generic HTTP errors | WSFE returns HTTP 200 even for business rule rejections; must parse the SOAP envelope's `FECompConsultarResult.Errors` array to detect real errors |
| AFIP WSFE RG 5616 | Using pre-2025 library or tutorial examples | RG 5616/2024 added mandatory fields in July 2025; use `@afipsdk/afip.js` v4+ which already incorporates these changes |
| Obra social liquidation | Treating OS statement amount as equivalent to invoice amount | OS often pays a different amount than billed (audit deductions, aranceles revision); `monto` (billed) and `montoReal` (paid) must be separate fields |
| PostgreSQL DateTime vs ART timezone | Storing `fecha` as UTC, computing month ranges in UTC | Month boundary is 21:00 UTC = 18:00 ART; always convert to `America/Argentina/Buenos_Aires` before month range queries |
| AFIP comprobante date | Setting `fchVtoPago` (payment due date) to far future | WSFE validates that `fchVtoPago >= fechaEmision`; some comprobante types require the due date to be within a regulated window |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous WSFE HTTP call in the NestJS request handler | Invoice endpoint times out on slow AFIP connections (>5s); user retries; duplicate invoice attempt | Wrap WSFE calls in a BullMQ job with idempotency key; respond 202 Accepted immediately; webhook/polling for result | Under any AFIP latency spike |
| Querying all practices for billing totals without date index | KPI dashboard slow to load as practice volume grows | Ensure `@@index([profesionalId, fecha])` on `PracticaRealizada` (add to schema); use monthly aggregate materialized view for KPI queries | At ~5,000+ practices per profesional |
| Fetching full liquidacion list without pagination | FACTURADOR dashboard loads all OS liquidaciones ever created | Server-side pagination with `cursor` or `offset` on `/liquidaciones`; default to current month | At 12+ months of history (hundreds of records per OS) |
| Building monthly total by summing all Factura records at query time | Slow KPI card loads; DB load spikes on dashboard open | Pre-compute monthly totals in a `ResumenFacturacion` cache table or use a Prisma aggregate with proper index | At 500+ invoices per month |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing AFIP certificates (`.crt`/`.key` files) in the filesystem or environment variables | Certificate theft = unauthorized invoicing under clinic's CUIT; tax fraud exposure | Store certificate bytes encrypted with AES-256-GCM in the DB (same pattern as WABA tokens already implemented); never on disk |
| FACTURADOR endpoint not scoped to clinic tenant | Cross-tenant data leakage; a facturador sees another clinic's patients and OS billing | All FACTURADOR queries must include an explicit `clinicaId` (or profesional set) scope derived from the JWT, not from query params |
| Logging invoice content (CUIT, patient name, amount) at INFO level | PII and financial data in production logs | Log only comprobante number, estado, and CAE code — never CUIT, nombre, or monto in logs |
| `condicionIVA` accepted as free-text from frontend | Malformed IVA code causes WSFE rejection; or deliberate manipulation of tax category | Validate against AFIP's fixed enum of IVA condition codes server-side; reject anything not in the allowed set |
| Exposing the AFIP homologation CUIT (20409378472, used for dev testing) in production config | Homologation invoices appear valid to unsuspecting users but have no fiscal validity | Require production CUIT to be explicitly configured; fail fast with a clear error if the homologation CUIT is detected in a production environment |
| Allowing FACTURADOR to read `HistoriaClinicaEntrada` or CRM fields via the patient endpoint | Clinical and commercial data leakage to a billing role | Create a dedicated `PacienteFacturadorView` DTO with only billing-relevant fields; never reuse the clinical patient response in billing endpoints |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw AFIP error codes to the facturador | "Error 10016" is meaningless to a non-technical user | Map all known AFIP error codes to plain-language Spanish messages: "El número de comprobante no coincide con el esperado por AFIP. Contactá al soporte." |
| No clear distinction between CAE mode and CAEA contingency mode in the UI | User doesn't know if invoices are being validated in real time | Show a persistent banner when CAEA mode is active: "Facturando en modo contingencia — los comprobantes serán validados automáticamente cuando AFIP esté disponible" |
| Monthly limit progress bar updating only on full page reload | Facturador issues several invoices without knowing they're approaching the limit | Real-time (or optimistic) update of the limit progress bar after each invoice emission; use TanStack Query `invalidateQueries` after mutation |
| Allowing "close settlement batch" without confirming all practices are assigned to it | Facturador closes a lote prematurely; practices added afterward don't belong to any lote | Require explicit review step: "Estas cerrando este lote con X prácticas por $Y. Confirmar?" with list of included practices before final close |
| Amount correction field always editable, no visual diff | Facturador makes a typo in the correction; no way to notice the original billed amount | Show original billed amount alongside the editable `montoReal` field; only enable save if `montoReal != monto`; require a `motivoCorreccion` text input |
| "Liquidación cerrada" state still showing edit controls | Confuses facturador about whether changes are persisted | Locked liquidations render as read-only with a clear lock icon; show who closed it and when |

---

## "Looks Done But Isn't" Checklist

- [ ] **AFIP certificate upload:** UI accepts a file — verify the certificate is stored encrypted per-tenant in DB, validated against WSAA on upload, and expiry date is tracked with alert logic
- [ ] **Invoice emission:** First invoice emits in homologation — verify (a) comprobante number is fetched from `FECompUltimoAutorizado` not from local count, (b) advisory lock prevents concurrent numbering, (c) error 10016 is handled with auto-resync
- [ ] **WSAA token:** Token obtained at startup — verify per-tenant storage in Redis/DB, expiry check before every WSFE call, and proactive renewal at T-15 minutes
- [ ] **Monthly limit KPI:** Counter displays correct number — verify all month-boundary queries use ART timezone (`America/Argentina/Buenos_Aires`), not UTC
- [ ] **Settlement correction:** `montoReal` saves successfully — verify `monto` (original) is preserved, `corregidoPor`/`corregidoAt`/`motivoCorreccion` are written in the same transaction
- [ ] **Liquidation close:** Lote closes without error — verify partial payment state (`PAGO_PARCIAL`) is handled and remaining balance is surfaced, not silently dropped
- [ ] **FACTURADOR role scope:** Dashboard shows practices — verify a cross-tenant integration test passes (facturador A cannot see clinic B's data)
- [ ] **RG 5616/2024 fields:** Comprobante emits in homologation — verify `condicionIVAReceptor` is present and `@afipsdk/afip.js` version is v4+
- [ ] **IVA treatment:** Invoice shows correct IVA — verify IVA is derived from fiscal condition config, not hardcoded; verify obra social practices use correct exención code
- [ ] **AFIP outage handling:** Network errors surface to user — verify CAEA is documented as fallback even if not yet implemented; error message is actionable, not "Error 500"

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Comprobante numbering gap (sequential corruption) | HIGH | 1. Stop all invoice emission immediately. 2. Call `FECompUltimoAutorizado` to get AFIP's authoritative last number. 3. If gap exists, contact AFIP soporte técnico — they can manually authorize the gap or advance the sequence. 4. Re-sync local counter. 5. Add advisory lock to prevent recurrence. |
| Expired certificate at invoice time | MEDIUM | 1. Surface clear error to facturador: "Certificado AFIP vencido. El contador debe renovarlo en AFIP.". 2. Clinic accountant generates new cert via AFIP portal and re-uploads. 3. Validate new cert against WSAA. Turnaround: 1–3 days. |
| WSAA token expired mid-invoice | LOW | 1. Catch the SOAP auth error. 2. Force-refresh TA. 3. Retry the WSFE call once. 4. If still failing, surface actionable error. Automation makes this transparent to user. |
| Wrong IVA emitted on past comprobantes | HIGH | 1. Identify all affected comprobantes. 2. Issue Notas de Crédito to reverse them. 3. Re-emit with correct IVA. Requires accountant involvement. Nota de Crédito is the only AFIP-compliant way to correct a comprobante — there is no edit operation. |
| FACTURADOR cross-tenant data leak discovered post-deploy | HIGH | 1. Immediately restrict endpoint with emergency hotfix. 2. Audit all queries made by FACTURADOR users since deploy. 3. Notify affected clinic if their data was exposed. 4. Document for potential Ley 25.326 notification requirement. |
| Partial payment lost (not tracked) | MEDIUM | 1. Reconstruct payment history from bank records / OS statements. 2. Migrate to partial payment model. 3. Backfill `montoPagado` on affected liquidaciones. Manual work per clinic. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Homologation vs. production certificate confusion | AFIP Research Phase | Deliverable: documented certificate onboarding guide for clinic accountant; schema includes encrypted per-tenant cert storage |
| Comprobante numbering gap | AFIP Integration Phase (implementation) | Integration test: two concurrent invoice requests for same punto de venta result in sequential numbers with no gap |
| WSAA token expiry | AFIP Integration Phase (implementation) | Test: mock token with 10-min expiry, verify auto-renewal before WSFE call; verify per-tenant Redis storage |
| CAEA contingency mode missing | AFIP Research Phase (document); AFIP Phase v1.2+ (implement) | Research deliverable: CAEA flow documented; implementation deferred with explicit milestone |
| IVA treatment errors | AFIP Research Phase | Deliverable: IVA matrix for aesthetic surgery + OS, signed off by a contador before any schema design |
| ART timezone month boundary | FACTURADOR Dashboard Phase | Unit tests: 12 date/time boundary cases including last day of month at 20:00–23:59 UTC |
| Settlement correction without audit trail | Settlement Workflow Phase | Schema review: `montoReal`, `corregidoPor`, `corregidoAt`, `motivoCorreccion` exist; service test confirms atomicity |
| Partial payment not tracked | Settlement Workflow Phase | Schema: `PAGO_PARCIAL` enum state + `montoPagado` field + `PagoLiquidacion` table (or documented deferral with explicit milestone) |
| FACTURADOR role data leakage | FACTURADOR Dashboard Phase | Integration test: facturador from clinic A returns 403/empty for clinic B data; response DTO excludes clinical/CRM fields |
| RG 5616/2024 missing fields | AFIP Research Phase | Schema review: `condicionIVAReceptor` and `tipoCambio` fields present; library version pinned to v4+ |

---

## Sources

- [AFIP WSFE Manual del Desarrollador COMPG v4.0](https://www.afip.gob.ar/fe/documentos/manual-desarrollador-ARCA-COMPG-v4-0.pdf) — HIGH confidence (official AFIP documentation)
- [AFIP WSAA Manual del Desarrollador](https://www.afip.gob.ar/ws/WSAA/WSAAmanualDev.pdf) — HIGH confidence (official AFIP documentation)
- [AFIP Certificados Digitales — Producción](https://www.afip.gob.ar/ws/wsaa/wsaa.obtenercertificado.pdf) — HIGH confidence (official AFIP documentation)
- [AFIP Certificados Digitales — Documentación](https://www.afip.gob.ar/ws/documentacion/certificados.asp) — HIGH confidence (official AFIP portal)
- [AFIP WSAA WSASS Manual del Usuario](https://www.afip.gob.ar/ws/WSASS/WSASS_manual.pdf) — HIGH confidence (official AFIP documentation)
- [AfipSDK/afip.js — GitHub](https://github.com/afipsdk/afip.js) — MEDIUM confidence (actively maintained open-source library with RG 5616 support)
- [Afip SDK — Crear Factura Electrónica en NodeJS](https://afipsdk.com/blog/crear-factura-electronica-de-afip-en-nodejs/) — MEDIUM confidence (official SDK blog, updated February 2025)
- [AfipSDK — Error 10016 "El número o fecha del comprobante no se corresponde"](https://afipsdk.com/blog/factura-electronica-solucion-a-error-10016/) — MEDIUM confidence (SDK blog post-mortem)
- [AFIP WSFE — Numeración de Comprobantes (facturaelectronicax.com)](https://sites.google.com/site/facturaelectronicax/wsfev1/wsfev1/wsfev1-numeraci%C3%B3n) — MEDIUM confidence (community documentation, Argentina)
- [AFIP WSFE — Fallos de Conexión y CAEA](https://sites.google.com/site/facturaelectronicax/wsfev1/wsfev1/wsfev1-fallos-conexi%C3%B3n) — MEDIUM confidence (community documentation)
- [CAEA — Qué es y cómo emitir comprobantes de contingencia (Facturante)](https://blog.facturante.com/que-es-caea-en-afip/) — MEDIUM confidence (AFIP SaaS provider blog)
- [ARCA RG 5616/2024 — Normativa oficial](https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-5616-2024-407369/texto) — HIGH confidence (official Argentine government registry)
- [RG 5616/2024 — Cambios clave en Facturación Electrónica ARCA](https://radio3cadenapatagonia.com.ar/nueva-rg-5616-2024-cambios-clave-en-la-facturacion-electronica-arca/) — MEDIUM confidence (news article summarizing RG 5616)
- [Profesionales de la salud: cómo facturar a obras sociales — Calim](https://calim.com.ar/como-facturar-obras-sociales/) — MEDIUM confidence (Argentine accounting practice blog)
- [IVA en servicios médicos en Argentina — Calim](https://calim.com.ar/cual-iva-servicios-medicos/) — MEDIUM confidence (Argentine accounting practice blog)
- [Instructivo de Facturación de Obras Sociales — Círculo Médico Paraná](https://www.cmparana.com.ar/2026/03/instructivo-de-facturacion-de-obras-sociales-3/) — MEDIUM confidence (Argentine medical association instructivo, March 2026)
- [AFIP WSFE — Ticket de Acceso (TA) y expiración](https://sites.google.com/site/facturaelectronicax/wsfev1/wsfev1/wsfev1-m%C3%A9todos/wsfev1-ticket-de-acceso) — MEDIUM confidence (community documentation)
- [Time in Argentina — UTC-3 no DST — Wikipedia](https://en.wikipedia.org/wiki/Time_in_Argentina) — HIGH confidence (reference)
- [SaaS Multi-Tenant Isolation Patterns — AWS Blog (ES)](https://aws.amazon.com/es/blogs/aws-spanish/aislamiento-de-datos-multi-usuario-con-seguridad-a-nivel-fila-de-postgresql/) — HIGH confidence (AWS official blog)

---

*Pitfalls research for: Argentine medical clinic SaaS — AFIP WSFE electronic invoicing + obra social settlement workflows + FACTURADOR role isolation (multi-tenant aesthetic surgery platform)*
*Researched: 2026-03-12*
