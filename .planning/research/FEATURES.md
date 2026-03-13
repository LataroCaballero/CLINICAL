# Feature Research

**Domain:** FACTURADOR dashboard — medical billing clerk for Argentine aesthetic surgery clinic (SaaS)
**Researched:** 2026-03-12
**Confidence:** HIGH (codebase analysis) / MEDIUM (Argentine billing domain patterns) / LOW (AFIP integration specifics)

---

## Context: What Already Exists

The following is already built and in production. This research covers only NEW features for the v1.1 milestone.

**Existing in `/dashboard/finanzas/facturacion`:**
- `LiquidacionesTab`: table of `PracticaRealizada` records, filter by PENDIENTE/PAGADO, bulk checkbox select, "Marcar como Pagadas" bulk action, cierre mensual summary by OS. No per-practice amount editing.
- `ComprobantesTab`: list of `Factura` records (type FACTURA/RECIBO), create modal with CUIT/razonSocial/condicionIVA/subtotal/impuestos, filter by date range and type.
- `FinanzasPage` (shared dashboard at `/dashboard/finanzas`): generic alert cards (Balance, Presupuestos, Facturacion) plus monthly KPIs. Not specialized for FACTURADOR role.

**Existing data models in schema.prisma:**
- `PracticaRealizada`: id, pacienteId, profesionalId, obraSocialId, codigo, descripcion, monto, coseguro, fecha, estadoLiquidacion (PENDIENTE/PAGADO), liquidacionId, facturaId
- `LiquidacionObraSocial`: id, obraSocialId, periodo, fechaPago, montoTotal, usuarioId, facturaId, practicas[]
- `Factura`: id, tipo, numero, fecha, estado (EMITIDA/ANULADA), cuit, razonSocial, condicionIVA, concepto, subtotal, impuestos, total

**Existing flow (AutorizacionObraSocial to PracticaRealizada):**
- Secretaria/Admin creates `AutorizacionObraSocial` (PENDIENTE). On AUTORIZADO, `autorizaciones.service.ts` creates `PracticaRealizada` records per code with `estadoLiquidacion: PENDIENTE` and `monto` from the authorization codes. This is the upstream source of all billing work.

**Gap identified:** `LiquidacionObraSocial.montoTotal` is not auto-populated on batch close. The "Cierre Mensual" tab shows totals but the "Emitir Comprobante" button is a no-op. Per-practice monto correction does not exist. No dedicated FACTURADOR home route exists.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the FACTURADOR role expects. Missing these = the dedicated role is useless.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Dedicated FACTURADOR home dashboard | FACTURADOR currently sees the generic finanzas overview built for ADMIN/PROFESIONAL. Billing clerks work on a fixed daily task list — they need their own first screen. | MEDIUM | New route plus role-gated redirect. Existing `/dashboard/finanzas` stays for ADMIN. FACTURADOR gets a focused home. |
| Practicas pendientes count + total ARS as hero KPIs | The primary job of the facturador is to settle pending practices. The count and total of PENDIENTE practices is the first thing they check each day. | LOW | Query already exists (`usePracticasPendientes`). Needs surfacing on dedicated page. |
| Practicas pendientes grouped by Obra Social | OS liquidations are submitted per-OS, not as a single batch. The facturador needs to see "OSDE: 3 practicas, $45.000" at a glance. | LOW | Aggregation of existing data. No schema change needed. |
| Per-practice amount correction on liquidation | Obras sociales frequently pay a different amount than what was authorized (due to cobertura rules, nomenclature caps, audit deductions). The facturador must record the actual amount paid per practice at liquidation time. | MEDIUM | Requires adding `montoPagado` field to `PracticaRealizada` schema (migration). Edit modal or inline edit on liquidation screen. |
| Bulk select + mark paid WITH amount correction | Extend existing bulk-mark flow to capture the actual amount paid per practice before confirming. Without this, `LiquidacionObraSocial.montoTotal` will be wrong. | MEDIUM | Replaces current bulk-mark mutation. Backend needs updated `marcarPagadas` endpoint accepting `[{id, montoPagado}]`. |
| Create LiquidacionObraSocial on settlement batch close | Currently the "Cierre Mensual" tab shows totals but the "Emitir Comprobante" button is a no-op. Closing a liquidation batch (all practices for a given OS + period) must create a `LiquidacionObraSocial` record and link the practices to it. | MEDIUM | Backend endpoint: POST `/finanzas/liquidaciones` with obraSocialId, periodo, practicaIds, montoTotal. Links to existing `Factura` if emitted. |
| Quick "Nuevo Comprobante" CTA from FACTURADOR home | Creating invoices (`Factura`) is a core daily action. It must be reachable in one click from the home screen, not buried in a sub-tab. | LOW | Button/link from dashboard home to `/dashboard/finanzas/facturacion?tab=comprobantes`. |
| Monthly billing cap (limite mensual) display | Argentine aesthetic surgery practices operate under OS contract limits. The facturador needs to see "used $X of $Y limit" before settling to avoid over-billing. | MEDIUM | New concept not in schema. Requires `LimiteFacturacionMensual` model (profesionalId, periodo, montoLimite) or a simpler config approach. |
| Filter comprobantes by OS and period | Auditing invoices per OS per month is a routine task when a clinic is questioned by an OS. | LOW | Extend existing `FacturasFilters` with `obraSocialId` and `periodo` (YYYY-MM). Backend query filter already supports custom `where`. |

### Differentiators (Competitive Advantage)

Features that set this product apart from generic medical billing tools in the Argentine market.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Monthly cap progress bar with OS breakdown | Generic tools show a raw number. Showing "you have billed $180.000 of $250.000 limit — 72% used — $70.000 remaining — OSDE accounts for 60%" turns a number into an action cue. | MEDIUM | Requires `LimiteFacturacionMensual` in DB plus calculation service. Displayed as a progress widget on FACTURADOR home. |
| Warning when settlement batch would exceed monthly limit | Proactive alert: before confirming a batch, check if `sum(montoPagado) + totalFacturadoMes > limiteFacturacionMensual` and warn the facturador. Prevents over-commitment that the OS will reject. | MEDIUM | Validation on the frontend before calling the settlement endpoint. Same data already needed for the cap display KPI. |
| Practices ready to settle grouped by OS as action cards | Rather than a flat table, show "OSDE — 5 practicas — $92.000 — Liquidar" as a card. One click opens a pre-populated settlement modal for that OS batch. | MEDIUM | Reorganizes existing LiquidacionesTab UX. No new data, different presentation. |
| AFIP/ARCA integration research document (internal deliverable) | While actual AFIP CAE issuance is out of scope for v1.1, documenting the integration path (WSAA + WSFEv1 endpoints, certificate requirements, third-party API options like TusFacturasAPP or AfipSDK) gives the clinic owner a concrete migration plan and differentiates the platform from those that ignore AFIP entirely. | LOW (research only) | Output is a written document. No code needed for v1.1. |
| Liquidation history per OS with amount variance tracking | Show the difference between authorized monto and actual montoPagado for each practice over time. This surfaces systematic OS payment shortfalls the clinic can dispute. | HIGH | Requires `montoPagado` field (already needed for table stakes) plus a history view. Defer to v1.2. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full AFIP/ARCA CAE issuance from within the app | Clinics want a single tool. Emitting comprobantes con CAE eliminates external tools. | Requires: (1) X.509 digital certificate per-tenant managed by the platform, (2) WSAA token rotation every 12h, (3) certificate renewal every 2 years, (4) ARCA homologation environment for testing, (5) handling all ARCA rejection codes. This is a separate regulatory project. The existing `Factura` model has no CAE field; adding it forces schema plus workflow rewrite. | Document the AFIP/ARCA integration path (WSAA+WSFEv1 or TusFacturasAPP API) as a research artifact. Defer AFIP integration to a dedicated milestone after validating the manual billing flow works well. |
| Automatic monto calculation from OS nomenclador nacional | Facturadores ask the system to auto-fill the correct OS payment amount from the nomenclador. | Nomenclador data changes multiple times per year, requires per-OS config, and varies by plan and region. Maintaining this is an ongoing data-ops commitment. | Let the facturador enter the actual amount paid. Keep `montoPagado` as a manual field. |
| PDF generation of liquidation batches to submit to OS | Some facturadores want the system to generate the submission PDF for the OS. | Each OS has its own submission format (some use Webcred, others email, others proprietary portals). A generic PDF matches no OS's required format and creates more work than it saves. | The existing Factura PDF infrastructure can generate a summary for records. Route is "export for your own records" not "ready to submit to OS." |
| Real-time sync with OS portals (Webcred, etc.) | Would eliminate manual data entry. | OS APIs are either non-existent or require individual OS agreements and homologation. This is a multi-year business development effort. | Not in scope. Document as future consideration. |
| Full accounting module (libro diario, libro mayor, balances) | FACTURADOR role implies accounting needs. | This platform manages clinical operations and billing settlements, not formal accounting. Adding double-entry bookkeeping requires a complete separate module and CPA-level domain expertise. The existing `MovimientoCC` plus `CuentaCorriente` is sufficient for internal records. | Keep the existing CC module. Recommend integration with dedicated accounting software (Xubio, Tango) for formal accounting. |

---

## Feature Dependencies

```
[FACTURADOR Dedicated Home Dashboard]
    └──displays──> [Practicas Pendientes KPIs grouped by OS]
    └──displays──> [Monthly Cap Progress Widget]
                       └──requires──> [LimiteFacturacionMensual model in schema]
    └──CTA──> [Quick Nuevo Comprobante]
                  └──uses──> [existing ComprobantesTab + CreateComprobanteModal]

[Per-Practice Amount Correction (montoPagado)]
    └──requires──> [schema migration: montoPagado field on PracticaRealizada]
    └──enables──> [Bulk Mark Paid WITH Amount Correction]
                      └──enables──> [Create LiquidacionObraSocial on Settlement Close]
                                        └──links──> [existing Factura model]

[Monthly Cap Warning on Settlement]
    └──requires──> [Monthly Cap configured (LimiteFacturacionMensual)]
    └──requires──> [Per-Practice montoPagado available before confirm]

[AFIP Research Document]
    └──no code dependencies — standalone deliverable]
```

### Dependency Notes

- **montoPagado migration must land before settlement batch close.** The `LiquidacionObraSocial.montoTotal` is meaningless without knowing actual paid amounts per practice. The migration is the prerequisite for all liquidation correctness.
- **LimiteFacturacionMensual requires a new model.** There is no existing config model for this. Recommended: a new `LimiteFacturacionMensual` table (profesionalId, periodo YYYY-MM, montoLimite Decimal). This is explicit and auditable versus a key-value config.
- **FACTURADOR home must not overlap with /dashboard/finanzas.** The existing `/dashboard/finanzas` page is used by ADMIN and PROFESIONAL with full financials context. The FACTURADOR home is a narrower, task-focused view. They should be separate routes. `permissions.ts` already gates `/dashboard/finanzas` to FACTURADOR — the new home should render role-conditional content at `/dashboard` or be a dedicated `/dashboard/facturador` route.
- **AutorizacionObraSocial flow is upstream.** PracticaRealizada records are created when an authorization is approved. If the secretaria or admin is not using the authorization flow, there will be no practices to settle. The FACTURADOR dashboard's usefulness depends on upstream adoption.

---

## MVP Definition

### Launch With (v1.1)

Minimum scope to make the FACTURADOR role genuinely useful instead of a restricted ADMIN view.

- [ ] Dedicated FACTURADOR home — shows pending practices count and total by OS, monthly cap widget, quick CTA to Nuevo Comprobante
- [ ] `montoPagado` field on `PracticaRealizada` schema migration — required for all downstream correctness
- [ ] Per-practice amount editing in liquidation flow — edit modal or inline input when marking practices as paid
- [ ] Updated settlement mutation accepting `[{id, montoPagado}]` and creating `LiquidacionObraSocial` correctly
- [ ] `LimiteFacturacionMensual` model plus config UI (simple form: select period, enter amount) — facturador sets their own limit from accountant's number
- [ ] Monthly cap progress display on FACTURADOR home
- [ ] AFIP/ARCA integration research document (written deliverable, no code)

### Add After Validation (v1.x)

- [ ] Warning before settlement if batch would exceed monthly cap — add after confirming the cap display is actually used daily
- [ ] Liquidation history per OS with variance tracking (authorized vs paid) — add when facturadores report needing audit trail
- [ ] Filter comprobantes by OS and period — add when facturadores report audit friction in ComprobantesTab

### Future Consideration (v2+)

- [ ] AFIP/ARCA CAE issuance (full ARCA+WSAA integration) — dedicated milestone after manual flow is validated in production
- [ ] OS nomenclador auto-fill — requires ongoing data maintenance commitment, validate demand first
- [ ] OS portal submission (Webcred integration) — requires individual OS business agreements

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Dedicated FACTURADOR home with KPIs | HIGH | LOW | P1 |
| montoPagado field migration | HIGH | LOW (migration only) | P1 |
| Per-practice amount editing at liquidation | HIGH | MEDIUM | P1 |
| Create LiquidacionObraSocial on batch close | HIGH | MEDIUM | P1 |
| LimiteFacturacionMensual config and display | HIGH | MEDIUM | P1 |
| Quick Nuevo Comprobante CTA | MEDIUM | LOW | P1 |
| AFIP/ARCA research document | MEDIUM | LOW (no code) | P1 |
| Cap warning before settlement commit | MEDIUM | LOW | P2 |
| Liquidation history and variance tracking | MEDIUM | MEDIUM | P2 |
| Filter comprobantes by OS and period | LOW | LOW | P2 |
| Full AFIP CAE issuance | HIGH | VERY HIGH | P3 |

**Priority key:**
- P1: Must have for v1.1 launch
- P2: Should have, add in v1.x
- P3: Future milestone

---

## Argentine Medical Billing Domain Notes

These notes are specific to the Argentine context and inform what "correct" looks like for this domain.

**Obra Social liquidation cycle.** Clinics typically settle OS practices monthly. The process is: (1) render the service (turno/practica), (2) receive OS authorization codes, (3) submit a liquidation batch to the OS with practice codes and amounts, (4) the OS audits and pays — sometimes with reductions. The facturador manages steps 3 and 4.

**Monto discrepancy is normal, not exceptional.** OS payment amounts differ from authorized amounts due to nomenclador nacional caps, cobertura percentage by plan, audit deductions, and proration. The `montoPagado` field is not a "correction" edge case — it is the standard workflow for every settlement.

**Limite de facturacion mensual.** This is a contractual cap set by the professional's agreement with each OS or by their AFIP/ARCA fiscal category (e.g., monotributista category limits). The facturador tracks this to prevent issuing comprobantes that exceed the allowed amount, which would trigger ARCA penalties or OS rejections. This is a manually maintained number provided by the clinic's accountant (contador). It is not fetched from any API — it must be entered by the facturador.

**AFIP renamed to ARCA.** As of October 2024, AFIP became ARCA (Agencia de Recaudacion y Control Aduanero). The WSFEv1 web service for electronic invoicing remains at the same endpoints under the ARCA domain. Third-party wrappers like TusFacturasAPP and AfipSDK abstract the SOAP/certificate complexity into REST APIs. For v1.1 research purposes: document TusFacturasAPP REST API and AfipSDK as the recommended integration path rather than raw ARCA SOAP.

**Comprobantes and nomenclature.** Argentine medical invoices to obras sociales must reference the nomenclador nacional de prestaciones medicas (practice codes). The existing `PracticaRealizada.codigo` field stores this. The `Factura` model stores the comprobante. The link between PracticaRealizada and Factura already exists via `facturaId` on PracticaRealizada — this is the correct data model for Argentine billing.

**ARCA integration technical requirements (for research document).** Integrating directly with ARCA requires: (1) X.509 certificate per emisor obtained from ARCA, (2) WSAA (Web Service de Autenticacion y Autorizacion) to get tokens valid 12h, (3) WSFEv1 (Web Service Facturacion Electronica) to request CAE, (4) test environment (homologacion) before production. Third-party option: TusFacturasAPP offers a REST JSON API that handles all ARCA complexity and is production-proven since 2015. AfipSDK offers SDKs in multiple languages. Either eliminates the need to manage certificates directly.

---

## Competitor Feature Analysis

| Feature | Generic HIS / admin software | Hisopet / Ostowin-style medical | Our Approach |
|---------|------------------------------|--------------------------------|--------------|
| Dedicated billing clerk view | Usually merged with admin, no role differentiation | Separate billing module, heavy UX, cluttered | Role-gated page within existing dashboard shell — focused, not cluttered |
| Monthly billing cap | Manual spreadsheet outside the system | Config per OS contract, often hidden in settings | Single limit per professional per period, displayed as progress bar |
| Liquidation amount correction | Manual edit before submission in separate form | Inline edit per row | Edit modal per practice plus bulk confirm with montoPagado |
| AFIP integration | Manual or external tool (AFIP web app) | Sometimes Bejerman integration for large clinics | Research doc for v1.1, TusFacturasAPP/AfipSDK path for v2 |
| Settlement batch creation | Often implicit, no explicit batch entity | Explicit batch with PDF generation | Explicit LiquidacionObraSocial creation with Factura link |

---

## Sources

- Codebase analysis: `LiquidacionesTab.tsx`, `ComprobantesTab.tsx`, `autorizaciones.service.ts`, `schema.prisma` (HIGH confidence — direct source)
- Argentine medical billing domain: [Instructivo Facturacion Obras Sociales - Colegio Medico Parana](https://www.cmparana.com.ar/wp-content/uploads/2020/02/Instructivo-de-facturacion-de-obras-sociales.pdf) (MEDIUM confidence)
- Argentine billing clerk role description: [Capacitarte — Liquidacion de Prestaciones Medicas](https://www.capacitarte.org/blog/nota/liiquidacion-prestaciones-medicas-ART) (MEDIUM confidence)
- ARCA/AFIP electronic invoicing: [ARCA WSFEv1 documentation](https://www.afip.gob.ar/ws/documentacion/ws-factura-electronica.asp) (MEDIUM confidence)
- Third-party ARCA wrappers: [TusFacturasAPP API](https://developers.tusfacturas.app/), [AfipSDK](https://afipsdk.com/) (MEDIUM confidence)
- PROJECT.md milestone context and requirements (HIGH confidence — authoritative for this product)

---

*Feature research for: FACTURADOR dashboard — Argentine medical clinic billing clerk (v1.1 milestone)*
*Researched: 2026-03-12*
