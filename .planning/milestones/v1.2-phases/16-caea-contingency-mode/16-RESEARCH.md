# Phase 16: CAEA Contingency Mode - Research

**Researched:** 2026-03-30
**Domain:** AFIP WSFEv1 CAEA — pre-fetch, contingency fallback, FECAEARegInformativo, deadline alerting
**Confidence:** MEDIUM (SOAP operations verified via official AFIP endpoint docs + pyafipws reference; RG 5782/2025 verified in Boletín Oficial; 5% threshold confirmed absent from regulation)

---

## Summary

Phase 16 adds CAEA (Código de Autorización Electrónico Anticipado) contingency support to the existing WSFEv1 emission pipeline. The system already has the DB schema (`CaeaVigente`, `EstadoFactura.CAEA_PENDIENTE_INFORMAR`) and the `AfipTransientError` classification needed to trigger CAEA fallback — Phase 16 wires up the four missing pieces: pre-fetch cron, emission fallback, inform job, and deadline alerting.

**RG 5782/2025 verification (Boletín Oficial, published 2025-10-30, effective 2026-06-01):**
- Effective date: **June 1, 2026** — confirmed.
- 5% volume threshold: **does not exist** in RG 5782/2025. The regulation restricts CAEA to contingency-only with no quantitative threshold. Community sources referencing "5%" are inaccurate — this constraint is absent from the official text.
- 8-day window: **8 días corridos** (calendar days) after period end. Exact text: "hasta el octavo día corrido posterior al de su finalización" — confirmed.
- Period structure: two semi-monthly periods per month — Period 1 (days 1–15), Period 2 (days 16–last day). One CAEA per taxpayer per period.
- Request window: CAEA can be requested "desde los CINCO (5) días corridos inmediatos anteriores al inicio de cada período o dentro del período".

The system needs three SOAP operations beyond FECAESolicitar: `FECAEASolicitar` (pre-fetch), `FECAEARegInformativo` (inform invoices), and optionally `FECAEASinMovimientoInformar` (report period with no CAEA invoices). All use the same WSFEv1 endpoint and Auth block already established in Phase 14.

**Primary recommendation:** Implement CaeaService (pre-fetch + informar), CaeaScheduler (bimensual cron), CaeaInformarProcessor (BullMQ), and integrate fallback in CaeEmissionProcessor via `AfipTransientError` catch → check `CaeaVigente` → save `CAEA_PENDIENTE_INFORMAR`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAEA-01 | Cron bimensual (days 27 and 12 at 6:00) pre-fetches and stores CAEA vigente in CaeaVigente per tenant; retries before period close if failure | FECAEASolicitar SOAP verified; CronExpression `'0 6 27,11,12 * *'` covers both "5 days before period 2" (day 27) and "1 day before period 1 AND same-day-as-period-2-start" (day 12); CertExpiryScheduler pattern shows exact retry approach |
| CAEA-02 | AfipUnavailableException during emission → factura CAEA_PENDIENTE_INFORMAR with CAEA vigente assigned, no Facturador intervention | AfipTransientError is the existing signal; CaeEmissionProcessor already catches it; CaeaVigente lookup by profesionalId + current period needed; Factura schema has no caeaCode field — cae column will store CAEA code |
| CAEA-03 | FECAEAInformar job reports pending invoices within 8 calendar days; on confirmation → EMITIDA | FECAEARegInformativo SOAP structure verified (pyafipws + official WSDL); BullMQ with 72 distributed retries; status change logic clear |
| CAEA-04 | Admin email alert if 8-day deadline at risk with pending invoices | Deadline date = fchTopeInf from CaeaVigente; compare to now + threshold; nodemailer pattern already in CertExpiryScheduler |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/schedule` | already installed | `@Cron` decorator for bimensual pre-fetch | Already in use by CertExpiryScheduler, ReportesModule, PacientesModule |
| `@nestjs/bullmq` | already installed | BullMQ processor for FECAEARegInformativo | CaeEmissionProcessor already uses this pattern |
| `axios` | already installed | Raw SOAP/XML POST to WSFEv1 | Same pattern as FECAESolicitar in AfipRealService |
| `nodemailer` | already installed | Email alert to Admin for deadline risk | Already used in CertExpiryScheduler |
| `@prisma/client` | already installed | CaeaVigente CRUD + Factura status update | PrismaService is @Global() |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `bullmq` `UnrecoverableError` | already installed | Stop retrying AFIP business errors | Same pattern as CaeEmissionProcessor for inform errors |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BullMQ for inform retries | Simple Prisma + cron loop | BullMQ gives distributed retry, DLQ, visibility — matches existing pattern |
| Separate `caeaCode` Factura field | Reuse existing `cae` column | CAEA code is 14 chars like CAE — `cae` column can store it; avoids migration; `tipoCodAut:'A'` in QR distinguishes it from CAE |

**No new dependencies needed.** All required libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
backend/src/modules/finanzas/
├── afip/
│   ├── caea.service.ts          # NEW: FECAEASolicitar + FECAEARegInformativo SOAP calls
│   ├── caea.service.spec.ts     # NEW: unit tests
│   ├── afip-real.service.ts     # MODIFY: catch AfipTransientError → CAEA fallback
│   ├── afip.errors.ts           # MODIFY: add AfipUnavailableError (subclass of AfipTransientError)
│   ├── afip.interfaces.ts       # existing
│   └── afip.constants.ts        # existing
├── processors/
│   ├── cae-emission.processor.ts  # MODIFY: after max retries exhausted, check CAEA
│   └── caea-informar.processor.ts # NEW: BullMQ processor for FECAEARegInformativo
├── schedulers/
│   └── caea-prefetch.scheduler.ts # NEW: @Cron bimensual pre-fetch + deadline alert
└── finanzas.module.ts             # MODIFY: register new providers + queue
```

### Pattern 1: CAEA Pre-fetch Cron (CAEA-01)
**What:** Scheduler runs on days 27 and 12 (at 6:00 AM) to request CAEA for upcoming period, upsert into CaeaVigente.
**When to use:** Bimensual, one per tenant with ConfiguracionAFIP configured.

```typescript
// Source: @nestjs/schedule + CertExpiryScheduler pattern (afip-config/cert-expiry.scheduler.ts)
@Cron('0 6 27,11,12 * *')  // day 27 = 5 days before period 2; day 12 = day after period 1 starts
async prefetchCaea(): Promise<void> {
  const configs = await this.prisma.configuracionAFIP.findMany({});
  for (const cfg of configs) {
    await this.caeaService.solicitarYPersistir(cfg.profesionalId);
  }
}
```

**Cron expression rationale:**
- `27`: 5 calendar days before period 2 start (day 1 of next month → day 27 this month opens the window for the first-half of next month). Wait — CAEA period 1 is days 1–15, period 2 is days 16–end. Request window opens 5 days before period start:
  - Period 1 (days 1–15): window opens day 27 of previous month
  - Period 2 (days 16–end): window opens day 11 of current month
- `11,12` covers both: day 11 opens the window for period 2; day 12 is one day into period 2 as fallback.
- The requirements document specifies `'0 6 27,11,12 * *'` — use this verbatim.

### Pattern 2: CAEA Fallback in Emission (CAEA-02)
**What:** After BullMQ exhausts transient retries (3 attempts), processor checks for CaeaVigente and saves `CAEA_PENDIENTE_INFORMAR` instead of failing permanently.
**When to use:** When `AfipTransientError` causes job to be moved to failed state.

```typescript
// Source: CaeEmissionProcessor pattern (finanzas/processors/cae-emission.processor.ts)
// In CaeEmissionProcessor.process() — after catch:
// Option A: Override attempt exhaustion in @OnWorkerEvent('failed') handler
// Option B: Check job.attemptsMade === job.opts.attempts inside catch block
@OnWorkerEvent('failed')
async onFailed(job: Job<CaeJobData>): Promise<void> {
  // Only assign CAEA if all retries exhausted AND it's a transient failure
  const maxAttempts = job.opts.attempts ?? 3;
  if (job.attemptsMade >= maxAttempts) {
    await this.caeaService.asignarCaeaFallback(job.data.facturaId, job.data.profesionalId);
  }
}
```

**Note on `cae` field reuse:** The Factura.`cae` column (String?) can store the CAEA code. The `qrData` field's `tipoCodAut` will be `'A'` for CAEA (vs `'E'` for CAE) per RG 5616/2024. The QR is not generated for CAEA invoices until FECAEARegInformativo confirms EMITIDA.

### Pattern 3: FECAEARegInformativo SOAP (CAEA-03)
**What:** BullMQ processor calls FECAEARegInformativo with one or more `FECAEADetRequest` per CAEA period.

```typescript
// Source: pyafipws CAEARegInformativo + official WSDL FECAEARegInformativo
// Same WSFEv1 endpoint, same Auth block as FECAESolicitar
const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECAEARegInformativo>
      <ar:Auth><ar:Token>${token}</ar:Token><ar:Sign>${sign}</ar:Sign><ar:Cuit>${cuit}</ar:Cuit></ar:Auth>
      <ar:FeCAEARegInfReq>
        <ar:FeCabReq>
          <ar:CantReg>1</ar:CantReg>
          <ar:PtoVta>${ptoVta}</ar:PtoVta>
          <ar:CbteTipo>${cbteTipo}</ar:CbteTipo>
        </ar:FeCabReq>
        <ar:FeDetReq>
          <ar:FECAEADetRequest>
            <ar:Concepto>${concepto}</ar:Concepto>
            <ar:DocTipo>${docTipo}</ar:DocTipo>
            <ar:DocNro>${docNro}</ar:DocNro>
            <ar:CbteDesde>${cbteDesde}</ar:CbteDesde>
            <ar:CbteHasta>${cbteHasta}</ar:CbteHasta>
            <ar:CbteFch>${cbteFch}</ar:CbteFch>
            <ar:ImpTotal>${impTotal}</ar:ImpTotal>
            <ar:ImpTotConc>0</ar:ImpTotConc>
            <ar:ImpNeto>${impNeto}</ar:ImpNeto>
            <ar:ImpOpEx>0</ar:ImpOpEx>
            <ar:ImpTrib>0</ar:ImpTrib>
            <ar:ImpIVA>${impIVA}</ar:ImpIVA>
            <ar:FchServDesde>${cbteFch}</ar:FchServDesde>
            <ar:FchServHasta>${cbteFch}</ar:FchServHasta>
            <ar:FchVtoPago>${cbteFch}</ar:FchVtoPago>
            <ar:MonId>PES</ar:MonId>
            <ar:MonCotiz>1</ar:MonCotiz>
            <ar:CondicionIVAReceptorId>${condicionIVAReceptorId}</ar:CondicionIVAReceptorId>
            <ar:CAEA>${caea}</ar:CAEA>
            <ar:CbteFchHsGen>${cbteFchHsGen}</ar:CbteFchHsGen>
            <ar:Iva>
              <ar:AlicIva>
                <ar:Id>5</ar:Id>
                <ar:BaseImp>${impNeto}</ar:BaseImp>
                <ar:Importe>${impIVA}</ar:Importe>
              </ar:AlicIva>
            </ar:Iva>
          </ar:FECAEADetRequest>
        </ar:FeDetReq>
      </ar:FeCAEARegInfReq>
    </ar:FECAEARegInformativo>
  </soapenv:Body>
</soapenv:Envelope>`;
```

**Key fields specific to CAEA inform (not present in FECAESolicitar):**
- `<ar:CAEA>` — the 14-char CAEA code (stored in Factura.cae during fallback)
- `<ar:CbteFchHsGen>` — invoice generation datetime (ISO string or YYYYMMDDHHMMSS format per pyafipws)
- Response: `<Resultado>A</Resultado>` → update Factura estado to EMITIDA

### Pattern 4: FECAEASolicitar SOAP (CAEA-01)
**What:** Requests a new CAEA for a given period and orden.

```typescript
// Source: official AFIP WSDL at servicios1.afip.gov.ar/wsfev1/service.asmx?op=FECAEASolicitar
const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECAEASolicitar>
      <ar:Auth><ar:Token>${token}</ar:Token><ar:Sign>${sign}</ar:Sign><ar:Cuit>${cuit}</ar:Cuit></ar:Auth>
      <ar:Periodo>${periodo}</ar:Periodo>
      <ar:Orden>${orden}</ar:Orden>
    </ar:FECAEASolicitar>
  </soapenv:Body>
</soapenv:Envelope>`;

// Response fields to parse:
// <CAEA>14-char-code</CAEA>
// <Periodo>YYYYMM</Periodo>
// <Orden>1 or 2</Orden>
// <FchVigDesde>YYYYMMDD</FchVigDesde>
// <FchVigHasta>YYYYMMDD</FchVigHasta>
// <FchTopeInf>YYYYMMDD</FchTopeInf>
```

**Period/Orden calculation:**
```typescript
function getCurrentPeriodAndOrden(now: Date): { periodo: string; orden: 1 | 2 } {
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const orden = now.getDate() <= 15 ? 1 : 2;
  return { periodo: yyyymm, orden };
}

function getNextPeriodAndOrden(now: Date): { periodo: string; orden: 1 | 2 } {
  // If day >= 27: next period is first half of next month
  // If day >= 11 and day < 16: next period is second half of this month
  // (scheduler fires on days 27, 11, 12 — use now.getDate() to determine)
}
```

### Pattern 5: Deadline Alert (CAEA-04)
**What:** CaeaPrefetchScheduler also runs a deadline check: for each CaeaVigente with pending `CAEA_PENDIENTE_INFORMAR` invoices, if today + alertThresholdDays >= fchTopeInf, send email to Admin.
**When:** Same daily or bimensual cron, or a separate daily cron at 7:00 AM.

```typescript
// Source: CertExpiryScheduler nodemailer pattern
const daysUntilDeadline = diffInCalendarDays(parseAfipDate(caeaVigente.fchTopeInf), now);
if (daysUntilDeadline <= 2 && pendingCount > 0) {
  await this.sendDeadlineAlert(profesional, caeaVigente, pendingCount, daysUntilDeadline);
}
```

### Anti-Patterns to Avoid
- **Building a separate AFIP client class:** Extend CaeaService as a plain `@Injectable()` that follows the same axios raw SOAP pattern — no separate client abstraction.
- **Persisting CAEA code in a new Factura column:** Reuse `Factura.cae` (no new migration needed). Distinguish via `EstadoFactura.CAEA_PENDIENTE_INFORMAR`.
- **Batch FECAEARegInformativo per-period:** Inform one invoice per job call for retry granularity. AFIP accepts one `FECAEADetRequest` per request in the existing pattern (matches Phase 14 approach of one comprobante per FECAESolicitar).
- **Running ScheduleModule.forRoot() again in FinanzasModule:** Already registered in ReportesModule and PacientesModule. Do NOT add it again.
- **Ignoring FECAEASinMovimientoInformar:** If a CAEA period expires with zero CAEA invoices, AFIP requires informing "sin movimiento" to close the period. CaeaPrefetchScheduler must check and call this at period close.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry logic for FECAEARegInformativo | Manual retry loop | BullMQ with 72 distributed retries over 8 days | BullMQ handles backoff, DLQ, visibility — already wired |
| Date math for CAEA period boundaries | Custom date arithmetic | Simple JS Date math (day-of-month check) | Periods are simple: day <= 15 = orden 1, else orden 2 |
| SOAP client | npm `soap` package | Raw axios POST (same as Phases 13–15) | Avoids soap npm faults; pattern already proven in this codebase |
| Email transport | New email service | nodemailer createTransport reuse from CertExpiryScheduler | DRY — extract private helper or extend existing service |

**Key insight:** The hardest problem in CAEA is the retry window — 72 retries distributed over 8 days is `8 * 24 * 60 / 72 ≈ 160 minutes per retry` (roughly every 2.5 hours). BullMQ delay configuration handles this; don't implement a manual timer.

---

## Common Pitfalls

### Pitfall 1: CAEA Not Pre-fetched When Fallback Triggers
**What goes wrong:** Emission fails with AfipTransientError, system tries to assign CAEA fallback, but `CaeaVigente` is empty for that tenant because the pre-fetch cron hasn't run yet or AFIP was also unavailable for FECAEASolicitar.
**Why it happens:** Race condition — AFIP downtime hits both primary CAE and pre-fetch CAEA endpoints.
**How to avoid:** `asignarCaeaFallback()` must handle null CaeaVigente gracefully — log error, leave Factura in `EMISION_PENDIENTE` for manual recovery. Never throw an unhandled error from the fallback path.
**Warning signs:** Factura stuck in EMISION_PENDIENTE after multiple retries with no CAEA assigned.

### Pitfall 2: FchTopeInf Parsing Error
**What goes wrong:** `fchTopeInf` from AFIP is `'YYYYMMDD'` string. Treating it as a Date without parsing causes wrong deadline calculations.
**Why it happens:** JavaScript's `new Date('20260116')` is unreliable — may parse as UTC midnight or throw.
**How to avoid:** Use the existing `formatAfipDate` helper pattern from Phase 15: parse via string slicing, construct `new Date(year, month-1, day)`.

### Pitfall 3: 72 Retries Exhausted Before Deadline
**What goes wrong:** BullMQ delay between retries is set too short, 72 retries fire within hours instead of spread over 8 days.
**Why it happens:** Default BullMQ backoff is seconds-based, not hours-based.
**How to avoid:** Use fixed delay: `delay: 8 * 24 * 60 * 60 * 1000 / 72 ≈ 9_600_000ms` (≈160 min per retry), `attempts: 72`, `backoff: { type: 'fixed', delay: 9600000 }`.

### Pitfall 4: CaeaVigente Unique Constraint Violation on Re-fetch
**What goes wrong:** Cron runs twice for same period (e.g., day 12 cron + day 11 cron both succeed), second upsert throws unique constraint on `(profesionalId, periodo, orden)`.
**Why it happens:** Cron fires on days 11, 12, AND 27 — may hit same period twice.
**How to avoid:** Use Prisma `upsert` with `where: { profesionalId_periodo_orden: ... }` — the schema already has `@@unique([profesionalId, periodo, orden])`.

### Pitfall 5: FECAEASinMovimientoInformar Forgotten
**What goes wrong:** AFIP may penalize tenants who obtained a CAEA for a period but never informed invoices AND never reported "sin movimiento". Period stays open in AFIP's books.
**Why it happens:** Implementation focuses on the happy path (CAEA assigned → informed → EMITIDA) but forgets the "no invoices were needed" case.
**How to avoid:** CaeaPrefetchScheduler post-fetch step: check if previous period's CaeaVigente has zero `CAEA_PENDIENTE_INFORMAR` invoices → call FECAEASinMovimientoInformar.

### Pitfall 6: Wrong `orden` Calculation on Day 15 and 16 Boundaries
**What goes wrong:** Day 15 is still in period 1; day 16 opens period 2. Off-by-one moves CAEA pre-fetch to wrong period.
**Why it happens:** Developer treats day 16 as period 1 or day 15 as period 2.
**How to avoid:** `orden = date.getDate() <= 15 ? 1 : 2`. When requesting upcoming period from day 27, next period is orden=1 of `(currentMonth + 1)`.

---

## Code Examples

### Period Calculation Helper
```typescript
// Source: RG 5782/2025 Article 4 — period definitions
export function calcularPeriodoYOrden(now: Date): { periodo: string; orden: 1 | 2 } {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const orden: 1 | 2 = now.getDate() <= 15 ? 1 : 2;
  return { periodo: `${year}${month}`, orden };
}

export function calcularProximoPeriodoYOrden(now: Date): { periodo: string; orden: 1 | 2 } {
  const day = now.getDate();
  if (day >= 27) {
    // Window for next month period 1 opens on day 27
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
      periodo: `${nextMonth.getFullYear()}${String(nextMonth.getMonth() + 1).padStart(2, '0')}`,
      orden: 1,
    };
  }
  if (day >= 11) {
    // Window for current month period 2 opens on day 11
    return { periodo: calcularPeriodoYOrden(now).periodo, orden: 2 };
  }
  // Fallback: re-fetch current period
  return calcularPeriodoYOrden(now);
}
```

### CaeaVigente Upsert (after FECAEASolicitar response)
```typescript
// Source: Prisma upsert with @@unique([profesionalId, periodo, orden])
await this.prisma.caeaVigente.upsert({
  where: {
    profesionalId_periodo_orden: { profesionalId, periodo, orden },
  },
  create: { profesionalId, cuit, caea, periodo, orden, fchVigDesde, fchVigHasta, fchTopeInf },
  update: { caea, fchVigDesde, fchVigHasta, fchTopeInf },
});
```

### Finding Active CaeaVigente for Fallback
```typescript
// Source: CaeaVigente schema index on (profesionalId, fchVigHasta)
// Today's date in YYYYMMDD format
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const caeaVigente = await this.prisma.caeaVigente.findFirst({
  where: {
    profesionalId,
    fchVigDesde: { lte: today },
    fchVigHasta: { gte: today },
  },
});
```

### AFIP Response Parsing for FECAEASolicitar
```typescript
// Source: official WSDL response schema
const caea = (xml.match(/<CAEA>(\w{14})<\/CAEA>/) ?? [])[1] ?? '';
const fchTopeInf = (xml.match(/<FchTopeInf>(\d{8})<\/FchTopeInf>/) ?? [])[1] ?? '';
const fchVigDesde = (xml.match(/<FchVigDesde>(\d{8})<\/FchVigDesde>/) ?? [])[1] ?? '';
const fchVigHasta = (xml.match(/<FchVigHasta>(\d{8})<\/FchVigHasta>/) ?? [])[1] ?? '';
```

### BullMQ Job Config for 72 Retries Spread Over 8 Days
```typescript
// Source: BullMQ docs — fixed delay pattern
// 8 days * 86400s / 72 attempts ≈ 9600s ≈ 160 min per attempt
const CAEA_QUEUE = 'caea-informar';
await this.caeaInformarQueue.add('informar', { facturaId, profesionalId }, {
  attempts: 72,
  backoff: { type: 'fixed', delay: 9_600_000 }, // ms
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CAEA usable as primary emission method | CAEA restricted to contingency only | RG 5782/2025, effective June 2026 | Must not offer CAEA as a choice — only triggered by AfipTransientError |
| AFIP domain `afip.gov.ar` | ARCA domain `arca.gob.ar` (rebrand) | 2024 | WSFEv1 endpoints not yet migrated as of 2026-03-20 (per Phase 14 decision) — use env vars |

**Deprecated/outdated:**
- "5% volume threshold" for CAEA: sourced from pre-RG community discussions — **does not exist** in official text. Do not implement any volumetric check.
- RG 2926: superseded by RG 5782/2025 — do not reference in implementation comments.

---

## Open Questions

1. **CbteFchHsGen format in FECAEARegInformativo**
   - What we know: pyafipws uses `fecha_hs_gen` — a datetime string; official WSDL type is `string`
   - What's unclear: Whether AFIP accepts ISO format (`2026-01-15T10:30:00`) or requires `YYYYMMDDHHMMSS`
   - Recommendation: Use `YYYYMMDDHHMMSS` format (matching other AFIP date fields) — e.g., `new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)`; store `cbteFchHsGen` in Factura at time of CAEA assignment in fallback

2. **Factura.cae field for CAEA code storage**
   - What we know: Schema has no dedicated CAEA field on Factura; `cae` column is String? used for CAE
   - What's unclear: Whether storing CAEA code in `cae` creates confusion for downstream QR/PDF logic
   - Recommendation: Store CAEA in `cae` column since `EstadoFactura.CAEA_PENDIENTE_INFORMAR` disambiguates; add a separate `cbteFchHsGen` field to Factura (migration needed) or derive it from `createdAt`

3. **Homologation testing for FECAEASolicitar**
   - What we know: AFIP homologation (`wswhomo.afip.gov.ar`) supports CAEA operations
   - What's unclear: Whether HOMO environment has valid CAEA periods active at any given time
   - Recommendation: Add CAEA stub path in `AfipStubService` returning deterministic CaeaVigente data when `USE_AFIP_STUB=true`

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (already configured in backend) |
| Config file | `backend/jest.config.js` or package.json |
| Quick run command | `npm run test -- --testPathPattern=caea` (from `backend/`) |
| Full suite command | `npm run test` (from `backend/`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAEA-01 | `solicitarYPersistir()` calls FECAEASolicitar + upserts CaeaVigente | unit | `npm run test -- --testPathPattern=caea.service` | ❌ Wave 0 |
| CAEA-01 | Cron fires on days 27, 11, 12 — calculates correct periodo/orden | unit | `npm run test -- --testPathPattern=caea-prefetch.scheduler` | ❌ Wave 0 |
| CAEA-02 | `asignarCaeaFallback()` sets CAEA_PENDIENTE_INFORMAR + stores caea code | unit | `npm run test -- --testPathPattern=caea.service` | ❌ Wave 0 |
| CAEA-02 | `asignarCaeaFallback()` handles null CaeaVigente gracefully | unit | `npm run test -- --testPathPattern=caea.service` | ❌ Wave 0 |
| CAEA-03 | `CaeaInformarProcessor` calls FECAEARegInformativo + updates EMITIDA | unit | `npm run test -- --testPathPattern=caea-informar.processor` | ❌ Wave 0 |
| CAEA-03 | Processor throws UnrecoverableError on AFIP business rejection | unit | `npm run test -- --testPathPattern=caea-informar.processor` | ❌ Wave 0 |
| CAEA-04 | Deadline alert fires when daysUntilDeadline <= 2 and pendingCount > 0 | unit | `npm run test -- --testPathPattern=caea-prefetch.scheduler` | ❌ Wave 0 |
| CAEA-04 | No alert when pendingCount === 0 | unit | `npm run test -- --testPathPattern=caea-prefetch.scheduler` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- --testPathPattern=caea`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/modules/finanzas/afip/caea.service.spec.ts` — covers CAEA-01, CAEA-02
- [ ] `backend/src/modules/finanzas/processors/caea-informar.processor.spec.ts` — covers CAEA-03
- [ ] `backend/src/modules/finanzas/schedulers/caea-prefetch.scheduler.spec.ts` — covers CAEA-01, CAEA-04

---

## Sources

### Primary (HIGH confidence)
- `https://servicios1.afip.gov.ar/wsfev1/service.asmx?op=FECAEASolicitar` — SOAP request/response structure confirmed
- `https://servicios1.afip.gov.ar/wsfev1/service.asmx?op=FECAEARegInformativo` — SOAP structure confirmed; FECAEADetRequest fields verified
- `https://servicios1.afip.gov.ar/wsfev1/service.asmx?op=FECAEASinMovimientoInformar` — Purpose and fields confirmed
- `https://servicios1.afip.gov.ar/wsfev1/service.asmx?op=FECAEAConsultar` — Response fields confirmed (same as FECAEASolicitar response)
- `https://www.boletinoficial.gob.ar/detalleAviso/primera/333664/20251030` — RG 5782/2025 official text: effective June 1 2026, 8 días corridos window, period structure, no 5% threshold

### Secondary (MEDIUM confidence)
- `https://github.com/reingart/pyafipws/blob/master/wsfev1.py` — FECAEARegInformativo full field set including `CAEA` and `CbteFchHsGen` child elements
- `https://contadoresenred.com/facturacion-uso-del-caea-se-limita-su-uso-para-contingencias/` — RG 5782/2025 summary; corroborates effective date and contingency-only restriction

### Tertiary (LOW confidence)
- Community references to "5% threshold" — **INVALIDATED** by primary source check of Boletín Oficial text

---

## Metadata

**Confidence breakdown:**
- RG 5782/2025 parameters: HIGH — verified in Boletín Oficial primary source
- SOAP operation structures (FECAEASolicitar, FECAEARegInformativo): HIGH — verified via official WSDL endpoint pages
- FECAEARegInformativo full field set (CAEA, CbteFchHsGen): MEDIUM — verified via pyafipws reference implementation cross-referenced with WSDL
- BullMQ 72-retry configuration: MEDIUM — BullMQ fixed-delay pattern is standard; 9600s interval is derived from 8-day window
- CbteFchHsGen format: LOW — WSDL type is `string`; exact format (ISO vs YYYYMMDDHHMMSS) not confirmed from official docs

**Research date:** 2026-03-30
**Valid until:** 2026-06-01 (RG 5782/2025 effective date — verify no amendments before implementation)
