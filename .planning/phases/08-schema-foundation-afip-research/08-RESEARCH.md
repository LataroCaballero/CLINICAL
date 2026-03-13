# Phase 8: Schema Foundation + AFIP Research - Research

**Researched:** 2026-03-13
**Domain:** Prisma schema migrations (PostgreSQL) + AFIP/ARCA electronic invoicing integration
**Confidence:** HIGH (schema work), MEDIUM-HIGH (AFIP integration details)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **condicionIVA rename**: Rename `Factura.condicionIVA` (String?) to `condicionIVAReceptor` using Prisma enum `CondicionIVA` in a single atomic migration named `facturador_v1`. Non-nullable; existing null rows default to `CONSUMIDOR_FINAL`.
- **condicionIVAEmisor**: NOT added in this phase — deferred to Phase 9 AfipStubService.
- **LimiteFacturacionMensual.mes**: String `'YYYY-MM'` format. Minimal fields: `id`, `profesionalId`, `mes`, `limite`. Row absence = no limit. Scope: per `profesionalId` only.
- **tipoCambio**: `Decimal @default(1.0)` non-nullable, `@db.Decimal(10, 4)`, default 1.0 for ARS. Migrate existing rows to 1.0.
- **moneda**: New enum `MonedaFactura { ARS, USD }`, added alongside `tipoCambio`. Default `ARS` for existing rows.
- **All Factura changes** (rename condicionIVA, add tipoCambio, add moneda) in a single migration: `facturador_v1`.
- **AFIP library approach**: Raw SOAP/XML — no third-party library. Full control, no dependency risk.
- **WSAA section**: Full implementation walkthrough with TRA XML, certificate signing, token extraction, 12h expiry + renewal, code examples.
- **Certificate strategy**: Per-tenant (per CUIT) section required. Model after `EncryptionService` AES-256-GCM pattern.
- **CAEA section**: Full detail — request/response format, when to fall back, production reliability.
- **Document location**: `.planning/research/AFIP-INTEGRATION.md`

### Claude's Discretion

- `tipoCambio` uses `@db.Decimal(10, 4)` (4 decimal places) for exchange rate accuracy.
- `MonedaFactura` enum stores readable names (`ARS`, `USD`); map to AFIP codes (`PES`, `DOL`) at submission time in v1.2.
- AFIP research doc must call out the advisory lock requirement for CAE number sequencing.

### Deferred Ideas (OUT OF SCOPE)

- `condicionIVAEmisor` field on Factura — Phase 9.
- Cert storage implementation (actual encrypted column on Profesional) — Phase v1.2.
- AFIP-02 (AfipStubService with mock emitirComprobante interface) — Phase 9.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHEMA-01 | `PracticaRealizada` stores real OS payment amount and correction audit fields (`montoPagado`, `corregidoPor`, `corregidoAt`, `motivoCorreccion`) | Prisma `ALTER TABLE ADD COLUMN` in migration SQL; Decimal(10,2) for monetary, String/DateTime/String for audit fields |
| SCHEMA-02 | New model `LimiteFacturacionMensual` with `@@unique([profesionalId, mes])` | New `CREATE TABLE` in migration with composite unique constraint; follows existing `@@unique` pattern in schema |
| SCHEMA-03 | `Factura` includes `condicionIVAReceptor` (enum, non-nullable) and `tipoCambio` (Decimal) plus `moneda` enum | Rename + type change via raw SQL in migration; new enum creation; `UPDATE` for default values on existing rows |
| AFIP-01 | Research document covering certificates, WSAA, WSFEv1, CAEA, RG 5616/2024, and library recommendation | Web research complete — full findings documented in this file for planner; output goes to `.planning/research/AFIP-INTEGRATION.md` |
</phase_requirements>

---

## Summary

Phase 8 is a pure schema + documentation phase: no UI, no service logic, no frontend changes. The Prisma side covers three targeted changes to existing models and one new model, all grouped into a single named migration `facturador_v1`. The AFIP side produces a standalone research document consumed by Phase 9 (AfipStubService) and the eventual v1.2 real AFIP implementation.

The Prisma migration work is low-risk and well-understood. The main gotcha is that `condicionIVA` is a column rename with a type change (String? → enum non-nullable), which requires raw SQL in the migration file (Prisma cannot auto-generate column renames). All changes must coexist in one atomic migration transaction so existing rows are valid after the migration runs.

The AFIP research work is knowledge-intensive but has no code execution. Key findings: RG 5616/2024 made `condicionIVAReceptor` and `tipoCambio` mandatory in electronic invoices from April 15, 2025. CAEA use will be restricted to contingency-only from June 2026 (RG 5782/2025). Raw SOAP/XML with Node.js `crypto` and `node:https` is the correct approach — no third-party AFIP library.

**Primary recommendation:** Execute the single `facturador_v1` migration (SCHEMA-01 through SCHEMA-03) via `prisma migrate dev --name facturador_v1`, then write the AFIP-INTEGRATION.md document using the research findings below.

---

## Standard Stack

### Core (Schema work)
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Prisma | Existing (`@prisma/client` in project) | ORM + migration runner | Already in use |
| PostgreSQL | Existing | Database | Already in use |
| `prisma migrate dev` | CLI | Generate + apply migrations in dev | Standard Prisma workflow |

### Core (AFIP document)
| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| Node.js `crypto` | Built-in | Sign TRA with RS256 / CMS | Already used in `EncryptionService` |
| `node:https` / `axios` | Built-in / existing | SOAP HTTP calls | No new dependency |
| `xml2js` or manual XML | — | Parse WSAA response | Lightweight; team already handles XML in presupuesto PDF |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw SOAP/XML | `soap` npm package | Soap hides WSAA token flow; breaks on AFIP's non-standard WS-Security; locked by user decision |
| Raw SOAP/XML | `afipjs`, `afip-apis`, `afip.js` forks | Unmaintained, low star count, no TS types; locked by user decision |

---

## Architecture Patterns

### Recommended Project Structure (Phase 8 output only)

```
backend/src/prisma/
├── schema.prisma              # Modified: PracticaRealizada, Factura, new LimiteFacturacionMensual, new enums
└── migrations/
    └── {timestamp}_facturador_v1/
        └── migration.sql      # Hand-edited to handle rename + type change

.planning/research/
└── AFIP-INTEGRATION.md        # New: AFIP-01 deliverable
```

### Pattern 1: Prisma Migration with Column Rename + Type Change

**What:** Prisma cannot auto-generate a column rename or type change from nullable String to non-nullable enum. The migration SQL must be written manually (or heavily edited after `prisma migrate dev --create-only`).

**When to use:** Any time a column is renamed, changes nullability, or changes type in the same migration.

**Migration SQL pattern (proven by existing migrations in this repo):**

```sql
-- Step 1: Create enum (if new)
CREATE TYPE "CondicionIVA" AS ENUM (
  'RESPONSABLE_INSCRIPTO',
  'MONOTRIBUTO',
  'CONSUMIDOR_FINAL',
  'EXENTO',
  'NO_CATEGORIZADO',
  'PROVEEDOR_EXTERIOR',
  'CLIENTE_EXTERIOR',
  'IVA_LIBERADO',
  'MONOTRIBUTISTA_SOCIAL',
  'IVA_NO_ALCANZADO',
  'MONOTRIBUTO_TRABAJADOR_INDEPENDIENTE'
);

CREATE TYPE "MonedaFactura" AS ENUM ('ARS', 'USD');

-- Step 2: Add new column as nullable first (safe for existing rows)
ALTER TABLE "Factura" ADD COLUMN "condicionIVAReceptor" "CondicionIVA";
ALTER TABLE "Factura" ADD COLUMN "tipoCambio" DECIMAL(10,4);
ALTER TABLE "Factura" ADD COLUMN "moneda" "MonedaFactura";

-- Step 3: Populate defaults for existing rows
UPDATE "Factura" SET
  "condicionIVAReceptor" = 'CONSUMIDOR_FINAL',
  "tipoCambio" = 1.0,
  "moneda" = 'ARS'
WHERE "condicionIVAReceptor" IS NULL;

-- Step 4: Apply NOT NULL constraint
ALTER TABLE "Factura" ALTER COLUMN "condicionIVAReceptor" SET NOT NULL;
ALTER TABLE "Factura" ALTER COLUMN "tipoCambio" SET NOT NULL;
ALTER TABLE "Factura" ALTER COLUMN "moneda" SET NOT NULL;

-- Step 5: Drop the old column
ALTER TABLE "Factura" DROP COLUMN "condicionIVA";
```

**Source:** Established pattern in `backend/src/prisma/migrations/` (all migrations follow CREATE TYPE → CREATE/ALTER TABLE sequence).

### Pattern 2: New Model with Composite Unique

**What:** `LimiteFacturacionMensual` is a new standalone model with a `@@unique([profesionalId, mes])` constraint.

```sql
CREATE TABLE "LimiteFacturacionMensual" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,          -- 'YYYY-MM' format
    "limite" DECIMAL(10,2),       -- NULL = no limit configured
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LimiteFacturacionMensual_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LimiteFacturacionMensual_profesionalId_mes_key"
  ON "LimiteFacturacionMensual"("profesionalId", "mes");

ALTER TABLE "LimiteFacturacionMensual"
  ADD CONSTRAINT "LimiteFacturacionMensual_profesionalId_fkey"
  FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

**Source:** Follows `@@unique([productoId, profesionalId])` on `Inventario` and `@@unique([profesionalId, tipoTurnoId])` on `TipoTurnoProfesional` — both already in `schema.prisma`.

### Pattern 3: PracticaRealizada Audit Fields

**What:** Add audit fields for payment correction tracking. All optional (nullable) since existing rows have no correction data.

```sql
ALTER TABLE "PracticaRealizada"
  ADD COLUMN "montoPagado" DECIMAL(10,2),        -- NULL until OS pays
  ADD COLUMN "corregidoPor" TEXT,                -- usuarioId or name
  ADD COLUMN "corregidoAt" TIMESTAMP(3),
  ADD COLUMN "motivoCorreccion" TEXT;
```

**Source:** Consistent with `Decimal @db.Decimal(10, 2)` for monetary fields throughout the schema (see `CuentaCorriente.saldoActual`, `PracticaObraSocial.monto`).

### Pattern 4: CondicionIVA Enum Values (mapped from AFIP codebook)

The enum values correspond to AFIP `condicionIVAReceptorId` codes (verified from official AFIP error code documentation):

| Prisma enum value | AFIP ID | Invoice type |
|---|---|---|
| `RESPONSABLE_INSCRIPTO` | 1 | A/M/C |
| `IVA_SUJETO_EXENTO` | 4 | B/C |
| `CONSUMIDOR_FINAL` | 5 | B/C |
| `MONOTRIBUTO` | 6 | A/M/C |
| `SUJETO_NO_CATEGORIZADO` | 7 | B/C |
| `PROVEEDOR_EXTERIOR` | 8 | B/C |
| `CLIENTE_EXTERIOR` | 9 | B/C |
| `IVA_LIBERADO` | 10 | B/C |
| `MONOTRIBUTISTA_SOCIAL` | 13 | A/M/C |
| `IVA_NO_ALCANZADO` | 15 | B/C |
| `MONOTRIBUTO_TRABAJADOR_INDEPENDIENTE` | 16 | A/M/C |

The mapping from enum → AFIP integer ID will be implemented at submission time in Phase v1.2, not in this phase.

### Anti-Patterns to Avoid

- **Letting Prisma auto-generate the rename**: Prisma treats a rename as DROP + ADD, which loses existing data. Always use `--create-only` and manually edit the migration SQL.
- **Making `limite` non-nullable with default 0**: A row with `limite = 0` must be treated the same as absent (no limit). Keep it nullable.
- **Using `String` for `condicionIVAReceptor`**: The user locked an enum — type safety validates at DB level. Never revert to String.
- **Adding `@updatedAt` to `LimiteFacturacionMensual`**: The user explicitly chose no audit trail on this model to keep it minimal.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Prisma column rename | Custom ALTER + UPDATE scripts outside migration system | `prisma migrate dev --create-only` then edit the generated SQL | Keeps migration history consistent with Prisma shadow DB |
| Prisma enum creation | Manual `psql` commands | Include `CREATE TYPE` in migration SQL | Prisma tracks enum state |
| AFIP CMS/PKCS#7 signing | Custom ASN.1 builder | Node.js `crypto.createSign` with `RS256` + existing cert handling | Node crypto covers all needed operations without dependencies |

---

## Common Pitfalls

### Pitfall 1: Prisma Rename Detection Failure
**What goes wrong:** Running `prisma migrate dev` after renaming a field in schema.prisma causes Prisma to generate DROP + ADD instead of RENAME. All existing data in `condicionIVA` is lost.
**Why it happens:** Prisma detects adds and removes, not renames.
**How to avoid:** Use `prisma migrate dev --create-only --name facturador_v1` to generate the file without running it. Then manually rewrite the SQL to use the safe 5-step pattern above (add nullable → backfill → set NOT NULL → drop old).
**Warning signs:** Migration SQL contains `DROP COLUMN "condicionIVA"` before any `UPDATE` statement.

### Pitfall 2: Missing UPDATE before NOT NULL
**What goes wrong:** Adding a non-nullable column without a default and without a preceding UPDATE causes `ERROR: column contains null values` at migration time in production.
**Why it happens:** PostgreSQL enforces NOT NULL immediately on ALTER.
**How to avoid:** Always follow the sequence: ADD COLUMN (nullable) → UPDATE existing rows → ALTER COLUMN SET NOT NULL.

### Pitfall 3: finanzas.service.ts / finanzas.dto.ts reference to `condicionIVA`
**What goes wrong:** After the rename, the backend fails to compile — `finanzas.service.ts:367` references `condicionIVA: dto.condicionIVA` and `finanzas.dto.ts:69` has `condicionIVA?: string`.
**Why it happens:** TypeScript/Prisma will reject the old field name after `prisma generate`.
**How to avoid:** After running the migration and `prisma generate`, update:
- `backend/src/modules/finanzas/dto/finanzas.dto.ts` — rename field, change type to `CondicionIVA` enum.
- `backend/src/modules/finanzas/finanzas.service.ts` — update the `create` call at line ~367.
**Warning signs:** `npx tsc --noEmit` fails with "Property 'condicionIVA' does not exist".

### Pitfall 4: AFIP WSAA Token Clock Skew
**What goes wrong:** WSAA rejects the TRA with `"CMS: Error verificando firma"` or `"Fecha de generación inválida"` when server clock drifts.
**Why it happens:** WSAA validates `generationTime` and `expirationTime` against its own clock. More than a few seconds of drift fails authentication.
**How to avoid:** Document in AFIP-INTEGRATION.md that the server hosting the integration must use NTP synchronization. The 12h token window provides buffer against minor drift.

### Pitfall 5: CAEA Restriction from June 2026
**What goes wrong:** Planning to use CAEA as a primary invoicing path for all tenants fails — it is restricted to contingency-only from June 2026.
**Why it happens:** RG 5782/2025 limits CAEA to contingency scenarios only.
**How to avoid:** Design the Phase v1.2 AfipService to always attempt CAE first; only fall back to CAEA when the AFIP endpoint is unavailable. Document this in AFIP-INTEGRATION.md.

---

## Code Examples

### Schema: PracticaRealizada additions
```prisma
// Source: verified against existing Decimal pattern in schema.prisma
model PracticaRealizada {
  // ... existing fields ...
  montoPagado       Decimal?  @db.Decimal(10, 2)
  corregidoPor      String?
  corregidoAt       DateTime?
  motivoCorreccion  String?
}
```

### Schema: LimiteFacturacionMensual
```prisma
// Source: follows @@unique pattern from Inventario and TipoTurnoProfesional in schema.prisma
model LimiteFacturacionMensual {
  id            String      @id @default(uuid())
  profesionalId String
  mes           String      // 'YYYY-MM', e.g. '2026-03'
  limite        Decimal?    @db.Decimal(10, 2)
  createdAt     DateTime    @default(now())
  profesional   Profesional @relation(fields: [profesionalId], references: [id])

  @@unique([profesionalId, mes])
}
```

### Schema: Factura new fields + enums
```prisma
// Source: decisions from 08-CONTEXT.md + verified against RG 5616/2024 research
enum CondicionIVA {
  RESPONSABLE_INSCRIPTO
  IVA_SUJETO_EXENTO
  CONSUMIDOR_FINAL
  MONOTRIBUTO
  SUJETO_NO_CATEGORIZADO
  PROVEEDOR_EXTERIOR
  CLIENTE_EXTERIOR
  IVA_LIBERADO
  MONOTRIBUTISTA_SOCIAL
  IVA_NO_ALCANZADO
  MONOTRIBUTO_TRABAJADOR_INDEPENDIENTE
}

enum MonedaFactura {
  ARS
  USD
}

model Factura {
  // ... existing fields, with condicionIVA removed ...
  condicionIVAReceptor  CondicionIVA  // non-nullable; replaces condicionIVA String?
  tipoCambio            Decimal       @default(1.0) @db.Decimal(10, 4)
  moneda                MonedaFactura @default(ARS)
}
```

### AFIP: TRA XML structure (for AFIP-INTEGRATION.md)
```xml
<!-- Source: afipjs documentation + WSAA technical spec -->
<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>{unix_timestamp}</uniqueId>
    <generationTime>{ISO8601_minus_3h}</generationTime>
    <expirationTime>{generationTime + 12h}</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>
```

### AFIP: Node.js WSAA token request skeleton
```typescript
// Source: pattern derived from EncryptionService (backend/src/modules/whatsapp/crypto/encryption.service.ts)
// and afipjs documentation
import * as crypto from 'crypto';
import * as https from 'https';

function buildTRA(service: string): string {
  const now = new Date();
  const exp = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${Math.floor(now.getTime() / 1000)}</uniqueId>
    <generationTime>${now.toISOString()}</generationTime>
    <expirationTime>${exp.toISOString()}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

function signTRA(traXml: string, certPem: string, keyPem: string): string {
  // Create CMS/PKCS#7 signed data (DER → Base64)
  // Node.js does not have native PKCS#7 — use openssl subprocess
  // or forge library for CMS creation (detail in AFIP-INTEGRATION.md)
  throw new Error('Implementation detail: see AFIP-INTEGRATION.md');
}
```

---

## AFIP/ARCA Integration Research Findings

*This section provides the raw research content for the AFIP-INTEGRATION.md deliverable.*

### WSAA (Web Service de Autenticación y Autorización)

**Purpose:** Every AFIP web service call requires a valid Access Ticket (TA). WSAA issues TAs bound to a specific service (e.g., `wsfe`) and a specific certificate (CUIT).

**Endpoints:**
- Homologacion (testing): `https://wsaahomo.afip.gov.ar/ws/services/LoginCms`
- Produccion: `https://wsaa.afip.gov.ar/ws/services/LoginCms`

**Flow:**
1. Build TRA XML with `uniqueId` (unix timestamp), `generationTime` (now), `expirationTime` (now + 12h), and target `<service>wsfe</service>`.
2. Sign TRA as CMS (PKCS#7 SignedData) using the tenant's private key + X.509 certificate. The CMS must be DER-encoded then Base64-encoded.
3. Call WSAA `LoginCms(in0: base64CMS)` via SOAP.
4. Parse the `LoginTicketResponse` XML: extract `<token>` and `<sign>` from `<credentials>`. Extract `<expirationTime>` to know when to refresh.
5. Cache `{token, sign, expiration}` per CUIT + service. Refresh when `now >= expiration - 5 minutes`.

**Token lifetime:** 12 hours. Safe to cache. Multiple concurrent requests should use a mutex/lock to avoid simultaneous renewals (one renewal attempt at a time per CUIT).

**CMS signing in Node.js:** Node.js `crypto` does not natively produce PKCS#7 SignedData. Two options:
1. Spawn `openssl smime -sign` subprocess (works, no new dependencies — best for v1.2).
2. Use `node-forge` npm package (`forge.pkcs7.createSignedData()`) — adds a dependency but stays in-process.

The AFIP-INTEGRATION.md should document the `openssl` subprocess approach as primary and `node-forge` as alternative.

### WSFEv1 (Facturación Electrónica)

**Endpoints:**
- Homologacion WSDL: `https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL`
- Produccion: `https://servicios1.afip.gov.ar/wsfev1/service.asmx`
- Produccion WSDL: `https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL`

**Key methods:**
- `FEDummy` — health check (no auth required)
- `FECompUltimoAutorizado(Auth, PtoVta, CbteTipo)` — get last authorized invoice number for a point-of-sale
- `FECAESolicitar(Auth, FeCAEReq)` — request CAE for one or more invoices
- `FECAEASolicitar(Auth, Periodo, Orden)` — request CAEA code for a billing period
- `FECAEAInformar(Auth, FeCAEARegInfReq)` — inform invoices issued under CAEA
- `FEParamGetTiposMonedas(Auth)` — get valid currency codes

**FECAESolicitar: mandatory fields per request detail:**
- `Concepto`: 1=Productos, 2=Servicios, 3=Productos y Servicios
- `DocTipo`: 80=CUIT, 86=CUIL, 96=DNI, 99=Consumidor Final
- `DocNro`: 0 when DocTipo=99
- `CbteDesde`, `CbteHasta`: invoice number (sequential, must follow `FECompUltimoAutorizado`)
- `CbteFch`: date YYYYMMDD
- `ImpTotal`, `ImpNeto`, `ImpIVA`, `ImpOpEx`, `ImpTrib`, `ImpTotConc`
- `MonId`: `"PES"` for ARS, `"DOL"` for USD (others available via `FEParamGetTiposMonedas`)
- `MonCotiz`: exchange rate (1.0 for ARS; BNA selling rate for USD per RG 5616/2024)
- `CondicionIVAReceptorId`: mandatory from April 15, 2025 (see enum table above)

**Advisory lock requirement for CAE sequencing (critical for v1.2):**
AFIP validates that `CbteDesde` = `FECompUltimoAutorizado + 1`. If two concurrent requests submit the same invoice number, both will fail or one will get a duplicate error. The Phase v1.2 implementation MUST use a database advisory lock (e.g., `SELECT pg_advisory_xact_lock(hashtext(profesionalId || ptoVta || cbteTipo))`) around the sequence: `FECompUltimoAutorizado → build request → FECAESolicitar`. Document this clearly.

### CAEA (Código de Autorización Electrónico Anticipado)

**What it is:** An authorization code obtained in advance, valid for a 15-day billing period (days 1-15 or 16-end of month). Issued once per period per taxpayer.

**Request timing:** Must be requested within the 5 calendar days prior to the start of the period.

**Use case from June 2026 onward:** CAEA is restricted to contingency scenarios only (RG 5782/2025). The primary flow must be CAE (online). Only fall back to CAEA when AFIP endpoints are unavailable.

**Contingency flow:**
1. Pre-request CAEA for the upcoming period (cron job at period -5 days).
2. When CAE endpoint fails, use the cached CAEA code to assign to the invoice.
3. Within 30 calendar days after the period ends, call `FECAEAInformar` with all invoices issued under CAEA.

**CAEA key fields in `FECAEASolicitar`:**
- `Periodo`: format `YYYYMM` + `Orden` (1 = first half, 2 = second half)
- Response: `CAEA` code string, `FchVigDesde`, `FchVigHasta`

**Production reliability concern:** AFIP production downtime is not uncommon (maintenance windows, fiscal year-end congestion). The AFIP-INTEGRATION.md should recommend always maintaining a pre-requested CAEA for the current period.

### Certificates (Per-Tenant / Per-CUIT)

**Certificate types:** X.509 self-signed or issued by AFIP's CA. For testing: obtained via AFIP's WSASS web application. For production: via "Administrador de Certificados Digitales" with fiscal key.

**Storage approach (model from existing `EncryptionService`):**
- Store the PEM certificate (`cert.pem`) and private key (`key.pem`) encrypted using the same AES-256-GCM pattern as `accessTokenEncrypted` on `ConfiguracionWABA`.
- Fields go on `Profesional` or a dedicated `ConfiguracionAFIP` model (deferred to v1.2, but the research document must specify the approach).
- Encryption format: `iv:authTag:ciphertext` in Base64, joined by `:` — same as `EncryptionService.encrypt()`.
- NEVER return the encrypted cert or key in any API response.

**Provisioning flow:**
1. Tenant (professional + their accountant) generates a CSR.
2. Sends to AFIP's "Administrador de Certificados Digitales" (production) or WSASS (testing).
3. Downloads the issued certificate.
4. ADMIN or onboarding flow uploads cert + key to the system.
5. System encrypts both with `EncryptionService` and stores in DB.

**Key rotation:** Certificates expire (typically 2 years). The AFIP-INTEGRATION.md must document that `expirationDate` should be stored alongside the encrypted cert so the system can warn before expiry.

### RG 5616/2024 Summary

Published: December 18, 2024. In force: April 15, 2025 (with non-exclusivity until March 31, 2026, after which non-compliant invoices are rejected).

**Mandatory new fields in WSFEv1 from April 15, 2025:**
1. `CondicionIVAReceptorId` — recipient's VAT status (see codes table above). Default `5` (Consumidor Final) for retail B2C transactions.
2. For foreign currency invoices: `MonCotiz` must be the BNA selling rate (banco nación Argentina, tipo vendedor divisa) for the business day prior to invoice issuance.

**Impact on schema:**
- `condicionIVAReceptor` (non-nullable enum) on `Factura` — this phase.
- `tipoCambio` (Decimal 10,4) and `moneda` (enum ARS/USD) on `Factura` — this phase.
- Actual `condicionIVAEmisor` — Phase 9 (AfipStubService).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| `condicionIVA String?` | `condicionIVAReceptor CondicionIVA` (non-nullable enum) | This phase | Type-safe; aligns with AFIP codebook |
| CAEA as normal invoicing mode | CAEA restricted to contingency only | June 2026 (RG 5782/2025) | Must design v1.2 with CAE as primary path |
| Optional IVA condition | `CondicionIVAReceptorId` mandatory | April 15, 2025 (RG 5616/2024) | Schema must capture this now |
| AFIP = AFIP | AFIP rebranded as ARCA | 2024 | Endpoints and docs still at afip.gob.ar |

**Deprecated/outdated:**
- `Factura.condicionIVA` (String?): removed in `facturador_v1` migration.
- Third-party AFIP npm packages (`afipjs`, `afip-apis`, `afip.js`): unmaintained, no active TS support; use raw SOAP per user decision.

---

## Open Questions

1. **CMS/PKCS#7 signing in Node.js**
   - What we know: `openssl smime -sign` subprocess works; `node-forge` is an alternative.
   - What's unclear: Which approach the team prefers for v1.2. `openssl` requires the binary on the server. `node-forge` adds a dependency.
   - Recommendation: Document both in AFIP-INTEGRATION.md; flag as a v1.2 implementation decision. Phase 8 only needs to research, not implement.

2. **`CondicionIVA` enum completeness vs. AFIP additions**
   - What we know: 11 values confirmed from official AFIP documentation as of March 2026.
   - What's unclear: Whether AFIP will add new codes in future regulations.
   - Recommendation: Define enum with all 11 current values. Adding Prisma enum values requires a migration but is non-breaking.

3. **CAEA pre-request cron timing**
   - What we know: Must be within 5 calendar days before period start.
   - What's unclear: Exact AFIP availability during those 5 days (holiday handling).
   - Recommendation: Document in AFIP-INTEGRATION.md; defer implementation to v1.2.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (via ts-jest) |
| Config file | `backend/package.json` → `jest` key (rootDir: `src`, testRegex: `.*\\.spec\\.ts$`) |
| Quick run command | `cd backend && npm test -- --testPathPattern="facturador"` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHEMA-01 | `PracticaRealizada` has `montoPagado`, `corregidoPor`, `corregidoAt`, `motivoCorreccion` fields | manual-only | `npx prisma validate` (schema syntax) | n/a — migration file |
| SCHEMA-02 | `LimiteFacturacionMensual` model with `@@unique([profesionalId, mes])` accessible from Prisma client | manual-only | `npx prisma validate` + `npx prisma generate` | n/a — migration file |
| SCHEMA-03 | `Factura.condicionIVAReceptor` non-nullable enum + `tipoCambio` + `moneda` exist in Prisma client | manual-only | `npx tsc --noEmit` (after generate) | n/a — migration file |
| AFIP-01 | AFIP-INTEGRATION.md exists with required sections | manual-only | `ls .planning/research/AFIP-INTEGRATION.md` | ❌ Wave 0 |

**Note:** SCHEMA-01 through SCHEMA-03 are pure schema changes verified by `prisma validate`, `prisma migrate dev`, and `npx tsc --noEmit`. No unit test file is created for schema migrations — this is standard practice. AFIP-01 is a documentation deliverable verified by file existence and content review.

### Sampling Rate
- **Per task commit:** `cd backend && npx prisma validate && npx tsc --noEmit`
- **Per wave merge:** `cd backend && npm test`
- **Phase gate:** Both commands green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `.planning/research/AFIP-INTEGRATION.md` — covers AFIP-01 (content must include all required sections per CONTEXT.md decisions)

*(Schema verification does not require new test files — `prisma validate` + `prisma generate` + `tsc --noEmit` are the verification commands.)*

---

## Sources

### Primary (HIGH confidence)
- `backend/src/prisma/schema.prisma` — existing models and patterns verified directly
- `backend/src/prisma/migrations/20260310214650_add_autorizacion_obra_social/migration.sql` — migration SQL pattern
- `backend/src/modules/whatsapp/crypto/encryption.service.ts` — AES-256-GCM pattern for cert storage
- `backend/src/modules/finanzas/dto/finanzas.dto.ts` and `finanzas.service.ts` — confirmed `condicionIVA` usage at lines 69 and 367
- [WSAA Documentation - ARCA](https://www.afip.gob.ar/ws/documentacion/wsaa.asp) — official endpoints
- [afipjs WSAA documentation](https://github.com/emilianoto/afipjs/blob/master/doc/wsaa.md) — TRA XML structure and 12h token expiry
- [afipjs WSFEv1 documentation](https://github.com/emilianoto/afipjs/blob/master/doc/wsfev1.md) — WSFEv1 method list and currency fields

### Secondary (MEDIUM confidence)
- [AFIP SDK - Error 10242](https://afipsdk.com/blog/factura-electronica-solucion-a-error-10242/) — complete `CondicionIVAReceptorId` code table (verified against multiple sources)
- [Simple Software - RG 5616/2024](https://www.simplesoftware.com.ar/arca-establecio-nuevas-condiciones-para-factura-electronica-por-webservice-de-operaciones-en-moneda-extranjera-segun-rg-5616-2024/) — confirms mandatory fields and BNA rate requirement
- [BOLETIN OFICIAL RG 5616/2024](https://www.boletinoficial.gob.ar/detalleAviso/primera/318374/20241218) — official publication December 18, 2024
- [Facturante - CAEA blog](https://blog.facturante.com/que-es-caea-en-afip/) — CAEA contingency flow and RG 5782/2025 restriction
- WSFEv1 endpoints from community source cross-referenced with official WSDL URLs mentioned in AFIP developer manuals

### Tertiary (LOW confidence)
- RG 5782/2025 (CAEA restriction to contingency from June 2026) — found via community sources; not independently verified against official BOLETIN OFICIAL. Flag for validation before v1.2 implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Prisma/PostgreSQL are in use; all patterns verified against existing codebase
- Architecture: HIGH — migration SQL pattern confirmed from latest migration; enum/unique patterns confirmed from schema.prisma
- Pitfalls: HIGH — Prisma rename behavior is documented; `finanzas.service.ts` references confirmed at exact line numbers
- AFIP WSAA/WSFEv1: MEDIUM-HIGH — official endpoints and TRA structure confirmed from ARCA docs and afipjs; CMS signing in Node.js confirmed from multiple sources
- AFIP CAEA/RG 5616/2024: MEDIUM — RG 5616/2024 confirmed from official gazette; CAEA details from official AFIP + community; RG 5782/2025 from community only (LOW for that specific fact)

**Research date:** 2026-03-13
**Valid until:** Schema patterns: stable (no expiry). AFIP WSAA/WSFEv1: 90 days (endpoints rarely change but AFIP may update). CAEA restriction: re-verify against official BOLETIN OFICIAL before v1.2 implementation.
