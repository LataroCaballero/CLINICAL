# Project Research Summary

**Project:** CLINICAL v1.1 — Vista del Facturador
**Domain:** Argentine medical clinic SaaS — FACTURADOR role dashboard, obra social settlement workflow, AFIP/ARCA electronic invoicing research
**Researched:** 2026-03-12
**Confidence:** MEDIUM-HIGH

## Executive Summary

The v1.1 milestone has a clear two-part structure: (1) building a functional, role-specific billing clerk dashboard with obra social settlement workflows, and (2) delivering an AFIP/ARCA integration research document as a written deliverable — not a code deliverable. The first part requires no new libraries and works entirely within the existing NestJS/Prisma/Next.js stack. The key schema gaps are the absence of a `montoPagado` field on `PracticaRealizada` (actual OS payment vs. billed amount) and a `LimiteFacturacionMensual` model for monthly cap tracking. These two migrations unblock every downstream billing feature and must land first.

The research firmly recommends scoping AFIP CAE issuance out of v1.1 entirely. Actual WSFE integration carries 10 documented failure modes: from certificate provisioning requiring manual clinic accountant involvement (1-3 business days per tenant), to comprobante sequential numbering that creates permanent corruption on a single concurrency event, to RG 5616/2024 compliance fields that post-date most community tutorials. The research confirms `@arcasdk/core` v0.3.6 as the correct self-hosted library for a future milestone, but the risk/effort ratio makes it a dedicated v1.2+ project. The v1.1 deliverable is a documented integration path plus an `AfipStubService` that pins the interface shape for future implementation.

The most consequential architectural decision is keeping all new backend logic inside the existing `FinanzasModule` rather than creating a new NestJS module. All new entities (`LimiteFacturacionMensual`, batch close, `montoPagado`) belong to the financial domain, the `FACTURADOR` role guard is already in place on `FinanzasController`, and a separate module would create cross-module dependencies with no benefit. The only structural addition on the frontend is a dedicated `/dashboard/facturador/page.tsx` with a layout-level redirect — clean role separation without polluting the existing PROFESIONAL CRM home.

---

## Key Findings

### Recommended Stack

The v1.1 dashboard and settlement workflow require zero new npm packages. The existing stack (NestJS 10.x, Prisma 6.x, Node 20.x, Redis 5.9.0, PDFKit 0.17.2, `@nestjs/schedule`) covers all requirements. The only additions documented here are for a future AFIP integration milestone, not for v1.1 implementation.

**Core technologies for v1.1 (no new installs):**
- `Prisma 6.x` — two schema additions: `montoPagado Decimal?` on `PracticaRealizada`; new `LimiteFacturacionMensual` model with `@@unique([profesionalId, mes])`
- `TanStack Query` — five new hooks in `useFinanzas.ts` following established per-entity hook patterns
- `FinanzasModule` (NestJS) — extends existing service and controller; no new module
- `shadcn/ui Dialog + Progress` — `CerrarLoteModal` and `LimiteFacturacionCard` use existing UI primitives already installed

**Future AFIP milestone additions (not v1.1 — research deliverable only):**
- `@arcasdk/core` v0.3.6 — self-hosted, TypeScript-native, direct SOAP to ARCA; preferred over `@afipsdk/afip.js` which requires afipsdk.com SaaS ($25-250/mo per tenant in a multi-CUIT deployment)
- `qrcode` v1.5.4 — CAE verification QR code embedded in PDFKit invoice PDFs
- Redis (existing) — WSAA token caching with 11-hour TTL per-tenant, no new library required

See `.planning/research/STACK.md` for full library comparison, version compatibility matrix, and AFIP-specific environment variable requirements.

### Expected Features

The FACTURADOR role currently sees a generic finanzas overview built for ADMIN/PROFESIONAL. Without these v1.1 features, the dedicated role is effectively a restricted ADMIN view with no operational value for a billing clerk.

**Must have for v1.1 (P1 — table stakes):**
- Dedicated FACTURADOR home at `/dashboard/facturador` showing pending practices count + total grouped by OS, monthly cap progress bar, quick CTA to Nuevo Comprobante
- `montoPagado` schema migration on `PracticaRealizada` — prerequisite for all downstream correctness; `monto` (originally billed) must be preserved as immutable; `montoPagado` records actual OS payment
- Per-practice amount editing in the liquidation flow before closing a batch (inline edit on blur with immediate PATCH)
- Atomic batch close: single `POST /finanzas/liquidaciones/crear-lote` using Prisma `$transaction` creating `LiquidacionObraSocial` and marking practices PAGADO in one operation — eliminates the existing two-call gap
- `LimiteFacturacionMensual` model with config UI (facturador enters accountant-provided limit per period) and monthly cap progress display
- AFIP/ARCA integration research document (written deliverable: certificate provisioning guide, WSAA + WSFEv1 architecture, library recommendation, CAEA contingency documentation, RG 5616/2024 requirements)

**Should have after validation (v1.x):**
- Pre-settlement warning when a batch total would exceed the monthly cap
- Liquidation history per OS with authorized vs. paid variance tracking (audit trail for OS payment disputes)
- Filter comprobantes by OS and period

**Defer to v2+:**
- Full AFIP/ARCA CAE issuance — dedicated milestone requiring certificate provisioning, WSAA lifecycle management, CAEA contingency mode, RG 5616/2024 compliance, and sequential numbering advisory locks
- OS nomenclador auto-fill (requires ongoing data maintenance commitment)
- OS portal submission (Webcred etc.) — requires individual OS business agreements

See `.planning/research/FEATURES.md` for feature dependency graph, Argentine billing domain notes, and competitor analysis.

### Architecture Approach

All new backend logic extends the existing `FinanzasModule`. The frontend gains a single new route (`/dashboard/facturador`) with three components plus a `CerrarLoteModal` in the enhanced `LiquidacionesPage`. State management stays entirely in TanStack Query — no new Zustand store needed. Multi-tenant note: FACTURADOR has no `Profesional` record, so `profesionalId` is passed explicitly in all requests (never derived from JWT), consistent with the existing `FinanzasController.getDashboard` pattern.

**Major components:**
1. `FacturadorDashboardPage` — KPI display, limit progress, pending practices by OS, quick links; uses `useFacturadorKpis` and `useLimiteFacturacion`
2. `LiquidacionesPage` (enhanced) — `montoPagado` inline edit column, OS filter, "Cerrar lote" button, `CerrarLoteModal` confirmation dialog
3. `FinanzasService` (extended) — five new methods: `crearLiquidacion()`, `setLimiteFacturacion()`, `getLimiteFacturacion()`, `getFacturadorKpis()`, `actualizarMontoPagado()`
4. `FinanzasController` (extended) — seven new route handlers all scoped to `@Auth('ADMIN', 'FACTURADOR')`
5. `AfipStubService` (new) — mock `emitirComprobante()` returning fake CAE structure; pins the interface shape for when real AFIP integration lands

**Suggested build order (strict dependency chain):** DB migration → backend DTOs and service methods → controller endpoints → AFIP stub → frontend permissions/routing → TanStack Query hooks → enhanced LiquidacionesPage → Facturador home dashboard.

See `.planning/research/ARCHITECTURE.md` for full data flow diagrams, exact Prisma schema additions, DTO definitions, and anti-pattern documentation.

### Critical Pitfalls

1. **Comprobante sequential numbering corruption** — Always call `FECompUltimoAutorizado` from AFIP before each invoice emission; never use a local counter. Add PostgreSQL advisory lock `pg_advisory_xact_lock` on `(profesionalId, puntoVenta, tipoComprobante)`. A single concurrency event creates a permanent gap that requires AFIP support intervention to recover. This pitfall is in scope for the AFIP research document, not v1.1 implementation. (AFIP Integration Phase)

2. **ART timezone month boundary errors** — Argentina is UTC-3, no DST. `new Date()` in UTC computes wrong month ranges at the end/beginning of every month. All month boundary queries must use `America/Argentina/Buenos_Aires` via `date-fns-tz` or `luxon`. Add a shared `getMonthBoundariesART()` utility from the first commit. Unit test: a practice at `2026-03-01T02:30:00Z` is February 28 in ART. (FACTURADOR Dashboard Phase — critical)

3. **Settlement amount correction without audit trail** — Never mutate `PracticaRealizada.monto` in place. The initial schema migration must include `montoPagado` (actual paid), `corregidoPor`, `corregidoAt`, and `motivoCorreccion`. Original billed amount is immutable. Retrofitting audit fields after go-live requires reprocessing historical financial data. (Schema Migration — critical)

4. **Non-atomic batch close** — Two separate API calls (`marcarPracticasPagadas` then `crearLiquidacion`) leave practices in PAGADO state with no parent `LiquidacionObraSocial` if the second call fails. The existing endpoint has this gap. The single `POST /finanzas/liquidaciones/crear-lote` with Prisma `$transaction` closes it. (Backend Phase)

5. **FACTURADOR role data leakage** — FACTURADOR must only see practices within their clinic's professional set, never cross-tenant data. Response DTOs must exclude clinical (`HistoriaClinicaEntrada`), CRM (`etapaCRM`, `temperatura`), and communication fields. An integration test confirming cross-tenant isolation must be written before any UI is shipped. (FACTURADOR Dashboard Phase)

6. **RG 5616/2024 missing fields on Factura model** — Effective July 2025, ARCA requires `condicionIVAReceptor` and `tipoCambio` on all electronic comprobantes. The existing `Factura.condicionIVA` is a nullable free-text field. The schema must add `condicionIVAReceptor String` (non-nullable) and `tipoCambio Decimal? @db.Decimal(10,6)` before any AFIP integration code is written. This is a research deliverable finding for v1.1. (AFIP Research Phase)

---

## Implications for Roadmap

The milestone breaks naturally into four phases plus a research deliverable that runs parallel to Phase 1.

### Phase 1: Schema Foundation + AFIP Research Document

**Rationale:** Two schema additions are hard prerequisites for every downstream feature. Schema work first avoids mid-feature migrations. The AFIP research document is a pure writing task with no code dependency — it parallelizes with DB migration work.
**Delivers:** Migration `facturador_v1` adding `montoPagado Decimal?` + audit fields to `PracticaRealizada`; new `LimiteFacturacionMensual` model; `condicionIVAReceptor`/`tipoCambio` additions to `Factura`; written AFIP/ARCA integration research document
**Addresses:** All P1 schema requirements from FEATURES.md; PITFALLS Pitfalls 3, 6, and 10
**Avoids:** Audit trail absence (Pitfall 3 — schema includes correction audit fields from day one); RG 5616 non-compliance (Pitfall 6/10 — fields added before any AFIP code is written)

### Phase 2: Backend API Layer

**Rationale:** Service methods and controller endpoints must exist before frontend hooks can be written. Grouping all backend work makes the API contract explicit before any frontend development begins.
**Delivers:** Five new service methods in `FinanzasService`, seven new endpoints in `FinanzasController`, three new DTOs (`CrearLiquidacionDto`, `SetLimiteFacturacionDto`, `ActualizarMontoPagadoDto`), `AfipStubService` with mock CAE endpoint
**Uses:** Prisma `$transaction` for atomic batch close (Pitfall 4 prevention); `getMonthBoundariesART()` utility for KPI date ranges (Pitfall 2 prevention); explicit `profesionalId` parameter pattern in all new endpoints (Pitfall 5 prevention)
**Implements:** FinanzasService extension, FinanzasController extension, AfipStubService registration in FinanzasModule

### Phase 3: FACTURADOR Home Dashboard

**Rationale:** Role-specific routing must be established before any FACTURADOR component is built, to avoid the anti-pattern of a middleware-based redirect conflicting with the existing DashboardLayout client-side redirect logic. Permissions entry in `permissions.ts` must be added BEFORE the `/dashboard` catch-all (prefix-matching order is critical).
**Delivers:** `/dashboard/facturador/page.tsx`, `LimiteFacturacionCard` (progress bar), `PracticasPendientesSummary` (count + total by OS), `AccionesRapidasFacturador` (quick links), `permissions.ts` update, DashboardLayout redirect for FACTURADOR role, `useFacturadorKpis` and `useLimiteFacturacion` TanStack Query hooks
**Avoids:** Double-redirect anti-pattern (single `useEffect` in DashboardLayout — not a separate `middleware.ts`); N+1 `getPracticasPendientes` query documented as known tech debt with a separate fix task

### Phase 4: Settlement Workflow Enhancement

**Rationale:** The enhanced liquidation flow depends on all backend endpoints from Phase 2 and the `montoPagado` schema from Phase 1. It is the most workflow-critical change for the FACTURADOR role and comes last when all dependencies are stable.
**Delivers:** Enhanced `LiquidacionesPage` with `montoPagado` inline edit column (saves on blur), OS filter to restrict batch to a single obra social, "Cerrar lote" button, `CerrarLoteModal` confirmation dialog (shows practice count + total before commit), `useCrearLiquidacion` and `useActualizarMontoPagado` hooks
**Avoids:** Non-atomic batch close (Pitfall 4 — single POST with `$transaction`); correction without audit trail (Pitfall 3 — `corregidoPor`/`corregidoAt` written atomically); confusing editable state on locked liquidations (UX pitfalls from PITFALLS.md)

### Phase Ordering Rationale

- Schema migrations must land first because every service method, frontend hook, and UI component depends on Prisma client regeneration with the new fields
- AFIP research document is parallelizable with Phase 1 DB work — it has no code dependency
- Backend before frontend because TanStack Query hooks depend on endpoint contracts being defined
- FACTURADOR home before settlement workflow because the home establishes routing and permission patterns that the settlement flow inherits
- This order allows each phase to be tested independently and deployed incrementally without breaking existing ADMIN/PROFESIONAL workflows

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (AFIP Research Document):** IVA treatment matrix for aesthetic surgery + obras sociales requires accountant sign-off before any `Factura` schema is designed for AFIP integration. PITFALLS.md Pitfall 5 is explicit: hardcoded 21% IVA is wrong for medical services to OS affiliados obligatorios. The correct IVA treatment must be validated with a contador, not inferred from code.
- **Phase 2 (Backend):** The N+1 query in `getPracticasPendientes` (uses `Promise.all` for per-patient lookups) documented in ARCHITECTURE.md Scaling section should be assessed before building FACTURADOR KPI endpoints on top of it. If practice volume is already significant, this degrades home dashboard load time from day one.

Phases with standard patterns (skip research-phase):
- **Phase 3 (FACTURADOR Home):** Role-gated routing and TanStack Query hooks follow well-established patterns already in the codebase. ARCHITECTURE.md provides exact code snippets for the DashboardLayout redirect and permissions.ts entry.
- **Phase 4 (Settlement Workflow):** Prisma `$transaction` for atomic batch close is documented NestJS/Prisma practice. shadcn/ui Dialog for confirmation modal follows the same pattern as `CerrarLoteModal` components already in the dashboard.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | v1.1 requires no new libraries — fully existing stack. Future AFIP library (`@arcasdk/core`) verified as self-hosted and TypeScript-native at v0.3.6 (Dec 2025). MEDIUM on community adoption versus `@afipsdk/afip.js`. |
| Features | HIGH | Derived primarily from direct codebase analysis of existing `LiquidacionesTab.tsx`, `ComprobantesTab.tsx`, `autorizaciones.service.ts`, and `schema.prisma`. Argentine billing domain specifics (OS liquidation cycle, montoPagado normality) verified via medical association instructivos and Argentine accounting practice blogs. |
| Architecture | HIGH | Based entirely on direct codebase inspection — all architecture sources rated HIGH confidence. No novel patterns required; all decisions are extensions of existing NestJS module conventions and TanStack Query patterns already in use. |
| Pitfalls | MEDIUM-HIGH | AFIP-specific pitfalls (numbering gaps, WSAA token expiry, certificate provisioning, CAEA) verified against official AFIP developer documentation (HIGH). Argentine medical billing pitfalls (IVA treatment, partial OS payments) verified via official medical association documents and accounting practice blogs (MEDIUM). Role isolation and timezone pitfalls are HIGH confidence standard patterns. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **IVA treatment matrix:** PITFALLS.md Pitfall 5 identifies this as a critical pre-implementation gap for the AFIP integration milestone. The correct IVA category for aesthetic surgery services billed to obras sociales obligatorias must be validated with the clinic's contador before any `Factura` schema or invoice emission logic is designed. Not blocking for v1.1, but must be resolved before v1.2 planning begins.

- **Partial payment model decision:** PITFALLS.md Pitfall 8 identifies that a two-state `PENDIENTE/PAGADO` enum on `LiquidacionObraSocial` cannot represent partial OS payments (which are a normal occurrence in Argentine medical billing). The Phase 1 schema work must include a decision: ship with two-state model + committed v1.x fix milestone, or add `PAGO_PARCIAL` state + `PagoLiquidacion` child table in v1.1. Deferring is acceptable but must be documented as a known gap with an explicit timeline.

- **`@arcasdk/core` RG 5616/2024 compliance verification:** STACK.md notes that v0.3.6 should be explicitly verified against RG 5616/2024 mandatory fields before any AFIP integration code is written. If verification fails, the fallback option is `@afipsdk/afip.js` v4+ (which explicitly documents RG 5616 support in its changelog) accepting its cloud proxy cost, or a thin direct SOAP wrapper against the ARCA WSDL.

- **FACTURADOR multi-tenant scope without a formal Clinica model:** Until a `Clinica`/tenant model exists in the schema, FACTURADOR queries must be scoped to the set of `Profesional.id` values belonging to the same implicit clinic. ARCHITECTURE.md notes this as an acceptable v1.1 gap for single-clinic deployment, but the integration test for cross-tenant isolation must be written even in v1.1 to prevent silent data leakage when a second clinic is onboarded.

---

## Sources

### Primary (HIGH confidence)
- `backend/src/modules/finanzas/finanzas.service.ts` — direct codebase inspection
- `backend/src/modules/finanzas/finanzas.controller.ts` — direct codebase inspection
- `backend/src/prisma/schema.prisma` — direct codebase inspection
- `frontend/src/lib/permissions.ts` — direct codebase inspection
- `frontend/src/app/dashboard/layout.tsx` — direct codebase inspection
- `frontend/src/hooks/useFinanzas.ts` — direct codebase inspection
- `.planning/PROJECT.md` — authoritative milestone requirements
- [ARCA/AFIP WSFE official documentation](https://www.afip.gob.ar/ws/documentacion/ws-factura-electronica.asp)
- [ARCA RG 5616/2024 official text](https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-5616-2024-407369/texto)
- [AFIP WSFE Manual del Desarrollador COMPG v4.0](https://www.afip.gob.ar/fe/documentos/manual-desarrollador-ARCA-COMPG-v4-0.pdf)
- [AFIP WSAA Manual del Desarrollador](https://www.afip.gob.ar/ws/WSAA/WSAAmanualDev.pdf)
- [AFIP QR code specification](https://www.afip.gob.ar/fe/qr/)

### Secondary (MEDIUM confidence)
- [@arcasdk/core npm](https://www.npmjs.com/package/@arcasdk/core) v0.3.6 — self-hosted AFIP library verification
- [@afipsdk/afip.js npm](https://www.npmjs.com/~afipsdk) v1.2.3 — cloud dependency and pricing confirmed
- [DevelopArgentina — guía AFIP/ARCA 2025](https://developargentina.com/blog/facturacion-electronica-arca-guia-completa-2025)
- [AfipSDK blog — Error 10016 comprobante numbering](https://afipsdk.com/blog/factura-electronica-solucion-a-error-10016/)
- [Instructivo de Facturación de Obras Sociales — Círculo Médico Paraná](https://www.cmparana.com.ar/2026/03/instructivo-de-facturacion-de-obras-sociales-3/)
- [IVA en servicios médicos en Argentina — Calim](https://calim.com.ar/cual-iva-servicios-medicos/)
- [Capacitarte — Liquidación de Prestaciones Médicas](https://www.capacitarte.org/blog/nota/liiquidacion-prestaciones-medicas-ART)
- [AfipSDK pricing page](https://afipsdk.com/pricing) — $25-250/mo per tier for hosted AFIP proxy
- [CAEA contingency mode — Facturante blog](https://blog.facturante.com/que-es-caea-en-afip/)

---

*Research completed: 2026-03-12*
*Ready for roadmap: yes*
