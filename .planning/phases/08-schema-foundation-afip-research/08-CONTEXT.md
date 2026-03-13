# Phase 8: Schema Foundation + AFIP Research - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Add Prisma schema fields for the billing flow (PracticaRealizada audit fields, LimiteFacturacionMensual model, Factura billing fields) and produce an AFIP/ARCA integration research document. No UI, no service logic, no frontend changes.

</domain>

<decisions>
## Implementation Decisions

### condicionIVA → condicionIVAReceptor migration
- Rename `Factura.condicionIVA` (String?) to `condicionIVAReceptor` in the same migration as tipoCambio (one atomic migration: `facturador_v1`)
- Type: Prisma enum `CondicionIVA` (type-safe, validates at DB level, aligns with AFIP codebook)
- Non-nullable; existing null rows default to `CONSUMIDOR_FINAL` during migration
- `condicionIVAEmisor` is NOT added in this phase — deferred to Phase 9 AfipStubService

### LimiteFacturacionMensual model
- `mes` field: String `'YYYY-MM'` format (e.g., `'2026-03'`) — lexicographically sortable, no timezone issues
- Minimal fields: `id`, `profesionalId`, `mes`, `limite` — no audit trail (no usuarioId/updatedAt)
- Row absence = no limit configured; a row with `limite = null` or `limite = 0` also means unconfigured (both must be handled as "no limit")
- Scope: per `profesionalId` only — no tenant/clinica level

### Factura billing fields
- `tipoCambio`: `Decimal @default(1.0)` — non-nullable, default 1.0 for ARS; existing rows migrate to 1.0
- `moneda`: new enum `MonedaFactura { ARS, USD }` added alongside `tipoCambio` — explicit and aligns with AFIP WSFEv1 `monedaId` field; default `ARS` for existing rows
- All `Factura` changes (rename condicionIVA, add tipoCambio, add moneda) go in a single migration named `facturador_v1`

### AFIP research document (AFIP-INTEGRATION.md)
- Library approach: **raw SOAP/XML, no third-party library** — full control, no dependency risk
- WSAA section: **full implementation walkthrough** — cover TRA XML structure, certificate signing, WSAA endpoint, access token + sign token extraction, 12h expiry + renewal with code examples
- Certificate strategy: **per-tenant (per CUIT)** section required — where to store certs, encryption approach (model the AES-256-GCM pattern from WABA tokens), provisioning flow for onboarding new professionals
- CAEA section: **full detail** — include request/response format, when to fall back, production reliability considerations
- Document location: `.planning/research/AFIP-INTEGRATION.md`

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EncryptionService` (WABA token AES-256-GCM pattern): model cert storage encryption after this — same pattern for per-tenant AFIP certificates
- `backend/src/prisma/schema.prisma`: existing `Factura`, `PracticaRealizada`, `LiquidacionObraSocial` models to extend
- `backend/src/prisma/migrations/`: existing migration pattern — new migration named `facturador_v1`

### Established Patterns
- All schema enums defined at bottom of `schema.prisma` (e.g., `EstadoFactura`, `TipoFactura`, `EstadoLiquidacion`)
- `@@unique` constraints used elsewhere: `@@unique([profesionalId, mes])` follows existing convention
- `Decimal @db.Decimal(10, 2)` for monetary fields — `tipoCambio` should use `@db.Decimal(10, 4)` for exchange rates (4 decimal places, not 2)

### Integration Points
- `Factura.condicionIVA` rename affects any service/DTO that references this field — must check `presupuestos.service.ts`, `finanzas` services
- `PracticaRealizada` extension: `liquidacion.service.ts` and any future liquidacion endpoint reads this model
- `LimiteFacturacionMensual` is a new standalone model — no existing foreign keys to update except `Profesional` relation

</code_context>

<specifics>
## Specific Ideas

- `tipoCambio` should use `@db.Decimal(10, 4)` (4 decimal places) to handle USD/ARS exchange rates accurately
- `MonedaFactura` enum values should match AFIP WSFEv1 currency codes where possible: `ARS` = "PES", `USD` = "DOL" — but store as readable enum, map to AFIP codes at submission time in v1.2
- AFIP research doc should call out the advisory lock requirement for CAE number sequencing (critical for v1.2 implementation correctness)

</specifics>

<deferred>
## Deferred Ideas

- `condicionIVAEmisor` field on Factura — Phase 9 (AfipStubService defines the interface)
- Cert storage implementation (actual encrypted column on Profesional) — Phase v1.2
- AFIP-02 (AfipStubService with mock emitirComprobante interface) — Phase 9 per REQUIREMENTS.md traceability

</deferred>

---

*Phase: 08-schema-foundation-afip-research*
*Context gathered: 2026-03-13*
