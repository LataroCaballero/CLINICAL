# Phase 14: Emisión CAE Real (WSFEv1) - Research

**Researched:** 2026-03-20
**Domain:** AFIP WSFEv1 SOAP integration — CAE emission, advisory lock sequencing, BullMQ error classification
**Confidence:** HIGH (SOAP structure verified against live AFIP endpoint; BullMQ pattern verified against official docs)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAE-02 | Sistema emite comprobante electrónico real via FECAESolicitar con pg_advisory_xact_lock dentro de prisma.$transaction({ timeout: 45000 }), almacena CAE + nroComprobante en Factura | FECAESolicitar SOAP structure confirmed; advisory lock pattern documented; Prisma $queryRawUnsafe pattern established |
| CAE-03 | Facturador ve errores AFIP traducidos a mensajes legibles en español en un modal — mínimo error 10242, resultado='R', cert inválido | Error taxonomy and Spanish translation map documented; CondicionIVAReceptorId values table included |
| CAE-04 | Jobs de emisión clasifican errores de negocio AFIP (10242, resultado=R) como permanentes (DLQ inmediato); errores transitorios (timeout, HTTP 5xx) usan backoff exponencial | BullMQ UnrecoverableError pattern confirmed for immediate DLQ; exponential backoff already configured globally in AppModule |
</phase_requirements>

## Summary

Phase 14 integrates WSFEv1 to issue real CAEs. The existing codebase already has the scaffolding: `AfipService`/`AfipStubService` interfaces in `finanzas/afip/`, `EmitirComprobanteParams`/`EmitirComprobanteResult` contracts, `AFIP_SERVICE` DI token pattern, and the `Factura` schema with nullable `cae`, `caeFchVto`, `nroComprobante`, `ptoVta` fields. What does NOT yet exist is `AfipRealService` — the implementation that calls WSFEv1 via raw SOAP+axios.

The critical architecture decisions are already locked in STATE.md: pg_advisory_xact_lock for concurrency, AfipBusinessError→DLQ via `UnrecoverableError`, AfipTransientError→exponential backoff. The existing `AfipConfigService.validatePtoVta()` is the reference SOAP pattern for WSFEv1 calls — `AfipRealService` reuses the same raw XML+axios approach. BullMQ infrastructure (global connection, queue registration, `@Processor`/`WorkerHost` pattern) exists in the WhatsApp module and can be replicated directly.

The key research flag is now resolved: WSFEv1 URLs have NOT migrated to arca.gob.ar — they remain on the legacy `afip.gov.ar` domain as of 2026-03-20. Store them in env vars (`AFIP_WSFEV1_URL_HOMO`, `AFIP_WSFEV1_URL_PROD`) with the current values as defaults.

**Primary recommendation:** Build `AfipRealService` in `finanzas/afip/` following the existing `AfipStubService` interface contract; swap AFIP_SERVICE DI token in `FinanzasModule` via `useFactory` checking `USE_AFIP_STUB` env var; wrap FECAESolicitar in a BullMQ processor that acquires advisory lock inside `prisma.$transaction({ timeout: 45000 })`.

## Standard Stack

### Core (already installed — no new dependencies required)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| axios | existing | Raw SOAP HTTP POST to WSFEv1 | Already used in AfipConfigService.validatePtoVta — same pattern |
| @nestjs/bullmq + bullmq | existing | Async job processing + retries + DLQ | Already used for WhatsApp; global Redis connection in AppModule |
| @prisma/client | existing | prisma.$queryRawUnsafe for advisory lock | Already used throughout; `$transaction({ timeout: 45000 })` supported |
| UnrecoverableError | from bullmq | Permanent job failure → DLQ immediately | Built into bullmq, no import needed beyond `import { UnrecoverableError } from 'bullmq'` |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nestjs/config / ConfigService | existing | Read AFIP_WSFEV1_URL_HOMO/PROD env vars | Required for env-configurable endpoints |
| xml2js or manual regex | none needed | Parse WSFEv1 XML responses | AfipConfigService uses raw regex — same approach is viable for Phase 14 |

**Installation:** No new npm packages required. All dependencies exist.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw SOAP+axios | `soap` npm package | OUT OF SCOPE — STATE.md decision: raw SOAP only; @arcasdk/core wraps soap with known failures |
| BullMQ processor | Synchronous SOAP call from controller | Unsafe — AFIP SLA is 30s, HTTP timeout would block request; no retry possible |
| UnrecoverableError | Custom DLQ queue | UnrecoverableError is cleaner — same failed set storage, no second queue to register |

## Architecture Patterns

### Recommended File Structure (new files for Phase 14)
```
backend/src/modules/finanzas/
├── afip/
│   ├── afip.interfaces.ts          # EXISTING — AfipService, EmitirComprobanteParams, EmitirComprobanteResult
│   ├── afip-stub.service.ts        # EXISTING — unchanged
│   ├── afip-stub.service.spec.ts   # EXISTING — unchanged
│   ├── afip-real.service.ts        # NEW — WSFEv1 SOAP implementation
│   └── afip-real.service.spec.ts   # NEW — unit tests with axios mock
├── processors/
│   └── cae-emission.processor.ts   # NEW — BullMQ @Processor for async CAE jobs
├── finanzas.module.ts              # MODIFY — swap AFIP_SERVICE DI token; register CAE queue
├── finanzas.service.ts             # MODIFY — emitirFactura enqueues job instead of calling stub
└── finanzas.controller.ts          # MODIFY — expose endpoint to trigger emission + poll status
```

### Pattern 1: WSFEv1 FECAESolicitar SOAP Request

**What:** Raw XML POST to WSFEv1 endpoint, auth from WSAA ticket, returns CAE + nroComprobante
**When to use:** Every real invoice emission

```typescript
// Source: https://servicios1.afip.gov.ar/wsfev1/service.asmx?op=FECAESolicitar
// SOAP 1.1 — same pattern as AfipConfigService.validatePtoVta()
const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECAESolicitar>
      <ar:Auth>
        <ar:Token>${token}</ar:Token>
        <ar:Sign>${sign}</ar:Sign>
        <ar:Cuit>${cuit}</ar:Cuit>
      </ar:Auth>
      <ar:FeCAEReq>
        <ar:FeCabReq>
          <ar:CantReg>1</ar:CantReg>
          <ar:PtoVta>${ptoVta}</ar:PtoVta>
          <ar:CbteTipo>${tipoComprobante}</ar:CbteTipo>
        </ar:FeCabReq>
        <ar:FeDetReq>
          <ar:FECAEDetRequest>
            <ar:Concepto>${concepto}</ar:Concepto>
            <ar:DocTipo>${docTipo}</ar:DocTipo>
            <ar:DocNro>${docNro}</ar:DocNro>
            <ar:CbteDesde>${cbteDesde}</ar:CbteDesde>
            <ar:CbteHasta>${cbteHasta}</ar:CbteHasta>
            <ar:CbteFch>${cbteFch}</ar:CbteFch>
            <ar:ImpTotal>${importeTotal}</ar:ImpTotal>
            <ar:ImpTotConc>0</ar:ImpTotConc>
            <ar:ImpNeto>${importeNeto}</ar:ImpNeto>
            <ar:ImpOpEx>0</ar:ImpOpEx>
            <ar:ImpTrib>0</ar:ImpTrib>
            <ar:ImpIVA>${importeIVA}</ar:ImpIVA>
            <ar:FchServDesde>${fchServDesde}</ar:FchServDesde>
            <ar:FchServHasta>${fchServHasta}</ar:FchServHasta>
            <ar:FchVtoPago>${fchVtoPago}</ar:FchVtoPago>
            <ar:MonId>PES</ar:MonId>
            <ar:MonCotiz>1</ar:MonCotiz>
            <ar:CondicionIVAReceptorId>${condicionIVAReceptorId}</ar:CondicionIVAReceptorId>
            <ar:Iva>
              <ar:AlicIva>
                <ar:Id>5</ar:Id>
                <ar:BaseImp>${importeNeto}</ar:BaseImp>
                <ar:Importe>${importeIVA}</ar:Importe>
              </ar:AlicIva>
            </ar:Iva>
          </ar:FECAEDetRequest>
        </ar:FeDetReq>
      </ar:FeCAEReq>
    </ar:FECAESolicitar>
  </soapenv:Body>
</soapenv:Envelope>`;

const res = await axios.post(wsfev1Url, envelope, {
  headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
  timeout: 30_000,
});
```

**Response parsing targets:**
```
FECAESolicitarResult
├── FeCabResp.Resultado  — 'A' (approved) | 'R' (rejected)
├── FeDetResp.FECAEDetResponse
│   ├── CAE              — 14-digit string
│   ├── CAEFchVto        — 'YYYYMMDD'
│   ├── CbteDesde        — assigned invoice number
│   ├── CbteHasta        — same as CbteDesde for single
│   ├── Resultado        — 'A' | 'R'
│   └── Observaciones.Obs[].Msg — rejection reasons (resultado='R')
└── Errors.Err[].Code + Msg     — SOAP-level errors
```

### Pattern 2: FECompUltimoAutorizado — Get Last Authorized Number

**What:** Fetches the last-used invoice sequence number for a given ptoVta + cbteTipo
**When to use:** Before every emission, inside the advisory lock, to compute `cbteDesde = lastNro + 1`

```typescript
// Source: https://servicios1.afip.gov.ar/wsfev1/service.asmx?op=FECompUltimoAutorizado
// Response: <CbteNro>N</CbteNro> — last authorized number; next = N+1
```

### Pattern 3: Advisory Lock + Prisma Transaction

**What:** PostgreSQL transaction-level advisory lock keyed on hash(cuit:ptoVta:cbteTipo) prevents duplicate sequence numbers under concurrent emission
**When to use:** Wraps every FECAESolicitar call

```typescript
// Source: https://github.com/prisma/prisma/discussions/16740
// STATE.md decision: prisma.$transaction({ timeout: 45000 })
await this.prisma.$transaction(async (tx) => {
  // 1. Acquire lock — auto-releases at transaction end
  const lockKey = `${cuit}:${ptoVta}:${cbteTipo}`;
  await tx.$queryRawUnsafe(
    `SELECT pg_advisory_xact_lock(hashtext($1))`,
    lockKey,
  );

  // 2. Get next sequence number from AFIP
  const lastNro = await this.getUltimoAutorizado(token, sign, cuit, ptoVta, cbteTipo);
  const cbteDesde = lastNro + 1;

  // 3. Call FECAESolicitar with cbteDesde
  const result = await this.callFECAESolicitar({ ...params, cbteDesde });

  // 4. Persist CAE + nroComprobante on Factura
  await tx.factura.update({
    where: { id: facturaId },
    data: {
      cae: result.cae,
      caeFchVto: result.caeFchVto,
      nroComprobante: result.cbtDesde,
      ptoVta,
      estado: 'EMITIDA',
    },
  });

  return result;
}, { timeout: 45000 });
```

### Pattern 4: BullMQ Error Classification

**What:** AfipBusinessError (error 10242, resultado='R') → UnrecoverableError → DLQ immediately; AfipTransientError (timeout, HTTP 5xx) → re-throw → BullMQ exponential backoff
**When to use:** Inside the CAE emission BullMQ processor

```typescript
// Source: https://docs.bullmq.io/patterns/stop-retrying-jobs
import { UnrecoverableError } from 'bullmq';

// Inside processor.process():
try {
  await this.afipRealService.emitirComprobante(params);
} catch (err) {
  if (err instanceof AfipBusinessError) {
    // Permanent — send directly to failed set, no retries
    // Facturador sees Spanish modal message
    throw new UnrecoverableError(err.spanishMessage);
  }
  // Transient (AfipTransientError, AxiosError timeout, HTTP 5xx)
  // Re-throw — BullMQ applies exponential backoff per global config
  throw err;
}
```

**Global backoff already configured in AppModule:**
```typescript
defaultJobOptions: {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
},
```
Phase 14 can override `attempts` per-job for AFIP (e.g., 5) when enqueueing.

### Pattern 5: AFIP_SERVICE DI Token Swap

**What:** FinanzasModule provides AFIP_SERVICE token conditionally (real vs stub), mirroring the WSAA_SERVICE pattern from Phase 13
**When to use:** FinanzasModule providers array

```typescript
// Source: Phase 13 WSAA_SERVICE pattern (STATE.md [Plan 13-02])
{
  provide: AFIP_SERVICE,
  useFactory: () => {
    if (process.env.USE_AFIP_STUB === 'true') {
      return new AfipStubService();
    }
    // AfipRealService requires injected deps — use factory with inject:
    return afipRealServiceInstance; // use proper NestJS inject pattern
  },
  inject: [WsaaService, PrismaService, ConfigService],
}
```

### Anti-Patterns to Avoid

- **Never call FECAESolicitar without advisory lock:** Two concurrent calls for the same CUIT+ptoVta+cbteTipo will get the same lastNro and produce duplicate nroComprobante — AFIP rejects the second.
- **Never read total amounts from the client payload:** FinanzasService.createFactura() already enforces server-side totals. The BullMQ job should receive only a `facturaId` and re-read amounts from DB inside the processor.
- **Never retry AfipBusinessError:** Error 10242 (CondicionIVA) and resultado='R' are data validation failures — retrying never helps. Use UnrecoverableError.
- **Never hardcode WSFEv1 URLs:** Research flag confirmed URLs not on arca.gob.ar yet, but store in env vars per STATE.md decision.
- **Never use Prisma default transaction timeout (5s) for AFIP calls:** AFIP SLA is 30s; default `$transaction()` timeout is 5s which releases the advisory lock before AFIP responds. Always pass `{ timeout: 45000 }`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job retry with backoff | Custom retry loop with setTimeout | BullMQ `attempts` + `backoff: exponential` in AppModule global config | BullMQ survives server restarts, provides visibility, handles Redis persistence |
| Permanent job failure | Separate DLQ queue with manual routing | `throw new UnrecoverableError(msg)` | BullMQ moves to failed set with zero boilerplate; `removeOnFail: 5000` keeps history |
| Invoice sequencing lock | App-level mutex or DB unique constraint | `pg_advisory_xact_lock(hashtext(lockKey))` inside `$transaction` | Works across horizontal scale; auto-releases on transaction end; no cleanup needed |
| SOAP XML parsing | xml2js/sax parser | Manual regex targeting specific elements | AfipConfigService.validatePtoVta() uses regex — consistent, zero deps, sufficient for known AFIP response shapes |
| Error message translation | External i18n library | Inline Spanish message map (Map<number, string>) keyed by AFIP error code | Finite set of AFIP error codes; inline map is simpler and testable |

**Key insight:** The BullMQ + advisory lock combination is the correct architecture for AFIP because both problems (retry resilience and concurrency) require external coordination beyond the Node.js process.

## Common Pitfalls

### Pitfall 1: Advisory Lock Released Before AFIP Responds
**What goes wrong:** AFIP call takes >5s; Prisma default `$transaction()` timeout fires; lock releases; concurrent job grabs same lastNro → duplicate nroComprobante.
**Why it happens:** Prisma `$transaction()` default timeout is 5 seconds. AFIP WSFEv1 SLA is up to 30 seconds.
**How to avoid:** Always use `prisma.$transaction(async (tx) => { ... }, { timeout: 45000 })`. This is a project-level critical pitfall documented in STATE.md.
**Warning signs:** AFIP error on second call complaining about duplicate CbteDesde; two Factura rows with same nroComprobante.

### Pitfall 2: CondicionIVAReceptorId Missing → Error 10242
**What goes wrong:** FECAESolicitar returns resultado='R', error 10242 "El campo Condicion IVA receptor es obligatorio".
**Why it happens:** AFIP made this mandatory from April 1, 2026. Field was optional before. The `Factura.condicionIVAReceptor` Prisma enum must be mapped to AFIP numeric codes.
**How to avoid:** Validate `condicionIVAReceptor` is non-null BEFORE enqueueing the BullMQ job (in the controller/service). Map enum → AFIP ID inside AfipRealService. Never send the job if condicionIVAReceptor is null.
**CondicionIVA → CondicionIVAReceptorId mapping:**
| Prisma enum value | AFIP ID | Label |
|-------------------|---------|-------|
| RESPONSABLE_INSCRIPTO | 1 | IVA Responsable Inscripto |
| RESPONSABLE_MONOTRIBUTO | 6 | Responsable Monotributo |
| CONSUMIDOR_FINAL | 5 | Consumidor Final |
| EXENTO | 4 | IVA Sujeto Exento |
| NO_CATEGORIZADO | 7 | Sujeto No Categorizado |
*(Verify full set against `FEParamGetTiposCbte` / ARCA v4.0 manual if Prisma enum has other values)*

### Pitfall 3: BullMQ Retrying Business Errors Indefinitely
**What goes wrong:** Error 10242 (bad data) retried 5 times over 30+ seconds — each attempt bills AFIP API quota and confuses the Facturador who sees "pending" for too long.
**Why it happens:** The default is to re-throw any error and let BullMQ retry.
**How to avoid:** Catch AFIP errors inside the processor; if `resultado === 'R'` OR error code in business error set, throw `UnrecoverableError(spanishMessage)`. Log first.

### Pitfall 4: CbteFch Format
**What goes wrong:** FECAESolicitar returns error about CbteFch (invoice date) format.
**Why it happens:** AFIP expects 'YYYYMMDD' (8 chars, no separators). Factura.fecha is a JS Date.
**How to avoid:** Format date as `fecha.toISOString().slice(0,10).replace(/-/g,'')`.

### Pitfall 5: CondicionIVAReceptorId for Obra Social Invoices
**What goes wrong:** OS-directed invoices typically use CUIT as DocTipo (80) and DocNro = CUIT of the OS, but CondicionIVAReceptorId is still required.
**Why it happens:** The field is receiver-specific regardless of DocTipo.
**How to avoid:** Look up ObraSocial.condicionIVA (or default to 1 = Responsable Inscripto for registered health insurers) when docTipo=80.

### Pitfall 6: WSFEv1 URL Research Flag — Confirmed as NON-migrated
**What we verified:** As of 2026-03-20, WSFEv1 endpoints remain on legacy `afip.gov.ar` domain.
- Homologación: `https://wswhomo.afip.gov.ar/wsfev1/service.asmx`
- Producción: `https://servicios1.afip.gov.ar/wsfev1/service.asmx`

These are also used by `AfipConfigService.validatePtoVta()` already in the codebase (line 188-190 of `afip-config.service.ts`). Store as env vars `AFIP_WSFEV1_URL_HOMO` / `AFIP_WSFEV1_URL_PROD` with these defaults. Monitor ARCA migration announcements.

## Code Examples

### AfipRealService: emitirComprobante skeleton
```typescript
// Source: live WSDL https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL
// + AfipConfigService.validatePtoVta() as reference pattern

@Injectable()
export class AfipRealService implements AfipService {
  constructor(
    @Inject(WSAA_SERVICE) private readonly wsaaService: WsaaServiceInterface,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async emitirComprobante(params: EmitirComprobanteParams & { profesionalId: string; facturaId: string }): Promise<EmitirComprobanteResult> {
    const { token, sign } = await this.wsaaService.getTicket(params.profesionalId, 'wsfe');

    const cfg = await this.prisma.configuracionAFIP.findUniqueOrThrow({
      where: { profesionalId: params.profesionalId },
      select: { cuit: true, ptoVta: true, ambiente: true },
    });

    const url = cfg.ambiente === 'PRODUCCION'
      ? this.config.get('AFIP_WSFEV1_URL_PROD', 'https://servicios1.afip.gov.ar/wsfev1/service.asmx')
      : this.config.get('AFIP_WSFEV1_URL_HOMO', 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx');

    return await this.prisma.$transaction(async (tx) => {
      // Advisory lock — auto-released at transaction end
      const lockKey = `${cfg.cuit}:${cfg.ptoVta}:${params.tipoComprobante}`;
      await tx.$queryRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, lockKey);

      // Sequence number
      const lastNro = await this.getUltimoAutorizado(url, token, sign, cfg.cuit, cfg.ptoVta, params.tipoComprobante);
      const cbteDesde = lastNro + 1;

      // SOAP call
      const result = await this.callFECAESolicitar(url, token, sign, cfg.cuit, { ...params, ptoVta: cfg.ptoVta, cbteDesde, cbteHasta: cbteDesde });

      if (result.resultado === 'R') {
        throw new AfipBusinessError(result.observaciones ?? ['Rechazado por AFIP'], result);
      }

      // Persist
      await tx.factura.update({
        where: { id: params.facturaId },
        data: { cae: result.cae, caeFchVto: result.caeFchVto, nroComprobante: result.cbtDesde, ptoVta: cfg.ptoVta, estado: 'EMITIDA' },
      });

      return result;
    }, { timeout: 45000 });
  }
}
```

### CAE Emission BullMQ Processor skeleton
```typescript
// Source: WhatsappMessageProcessor pattern + BullMQ UnrecoverableError docs
import { UnrecoverableError } from 'bullmq';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

export const CAE_QUEUE = 'cae-emission';

@Injectable()
@Processor(CAE_QUEUE)
export class CaeEmissionProcessor extends WorkerHost {
  async process(job: Job<{ facturaId: string; profesionalId: string }>): Promise<void> {
    try {
      await this.afipService.emitirComprobante({
        facturaId: job.data.facturaId,
        profesionalId: job.data.profesionalId,
        // ... params read from DB inside the service
      });
    } catch (err) {
      if (err instanceof AfipBusinessError) {
        // Log, update Factura.estado, then fail permanently
        throw new UnrecoverableError(err.spanishMessage);
      }
      // Transient: timeout, 5xx → re-throw → BullMQ retries with backoff
      throw err;
    }
  }
}
```

### Custom Error Classes
```typescript
export class AfipBusinessError extends Error {
  constructor(
    public readonly afipMessages: string[],
    public readonly rawResult: EmitirComprobanteResult,
  ) {
    const spanishMessage = translateAfipErrors(afipMessages);
    super(spanishMessage);
    this.spanishMessage = spanishMessage;
  }
  spanishMessage: string;
}

export class AfipTransientError extends Error {}

// Spanish translation map (minimum required by CAE-03)
const AFIP_TRANSLATIONS: Map<number, string> = new Map([
  [10242, 'La condición de IVA del receptor es obligatoria. Completá la condición frente al IVA del paciente o del destinatario.'],
  // Add others from AFIP error code table
]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CondicionIVAReceptor opcional | Obligatorio desde 01/04/2026 | Anunciado RG 5616; enforcement desde abril 2026 | Requests sin este campo retornan error 10242 en producción |
| AFIP como organismo | ARCA (Agencia de Recaudación y Control Aduanero) | Rebranding 2024 | UI/docs usan "ARCA" pero URLs siguen en afip.gov.ar |
| SDK afipjs/afipjs-js | Raw SOAP + axios | Decisión v1.2 | SDKs unmaintained; raw SOAP verified en codebase existente |

**Deprecated/outdated:**
- `@afipsdk/afip.js`: OUT OF SCOPE — cloud proxy, requires afipsdk.com, incompatible with self-hosted model
- `soap` npm package: OUT OF SCOPE — @arcasdk/core wraps it with known failures against AFIP

## Open Questions

1. **CondicionIVA mapping for Obra Social invoices**
   - What we know: Factura.condicionIVAReceptor Prisma enum exists; OS invoices use DocTipo=80 (CUIT)
   - What's unclear: Does Prisma enum cover all AFIP CondicionIVAReceptorId values (1,4,5,6,7,8,9,10,13,15,16)?
   - Recommendation: Check Prisma enum definition during plan; if missing values, add migration. Default for OS = 1 (Responsable Inscripto) if condicionIVA is null.

2. **Concepto value for aesthetic surgery services**
   - What we know: concepto=1 (Productos), 2 (Servicios), 3 (Ambos). Cirugía estética = Servicios.
   - What's unclear: FchServDesde/FchServHasta/FchVtoPago are required when concepto=2 or 3. Are these always the invoice date?
   - Recommendation: Use concepto=2 (Servicios) always; FchServDesde=FchServHasta=FchVtoPago=CbteFch (invoice date). Verify with contador before production.

3. **IVA alícuota for aesthetic surgery**
   - What we know: STATE.md notes "IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP" as tech debt.
   - What's unclear: Is cirugía estética exenta, gravada 21%, or another rate? IVA alícuota ID 5 = 21% used in example above.
   - Recommendation: Hard-code IVA 21% for Phase 14 homologación testing; add a TODO for production validation. Do NOT block the Phase 14 implementation on this.

4. **Factura.estado flow during async emission**
   - What we know: Factura starts EMITIDA; after real AFIP emission it should still be EMITIDA with cae+nroComprobante filled.
   - What's unclear: Should there be a transient estado (e.g., EMISION_PENDIENTE) while the BullMQ job is in flight?
   - Recommendation: Add `EMISION_PENDIENTE` estado to EstadoFactura enum via migration (Phase 14 Wave 0). Controller returns 202 Accepted when job enqueued; client polls status via existing getFacturas endpoint. Plan should specify this explicitly.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (NestJS default, already configured) |
| Config file | `backend/package.json` → `"jest"` key |
| Quick run command | `cd backend && npx jest --testPathPattern afip-real --no-coverage` |
| Full suite command | `cd backend && npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAE-02 | FECAESolicitar called with correct SOAP, advisory lock acquired, CAE+nroComprobante persisted | unit (axios mock + prisma mock) | `npx jest afip-real.service.spec.ts -x` | ❌ Wave 0 |
| CAE-02 | Concurrent calls serialize: second waits for advisory lock, gets sequential number | unit (mock lock simulation) | `npx jest afip-real.service.spec.ts -x` | ❌ Wave 0 |
| CAE-03 | Error 10242 → AfipBusinessError → spanishMessage contains readable text | unit | `npx jest afip-real.service.spec.ts -x` | ❌ Wave 0 |
| CAE-04 | resultado='R' → UnrecoverableError thrown → job moves to failed (no retry) | unit (processor spec) | `npx jest cae-emission.processor.spec.ts -x` | ❌ Wave 0 |
| CAE-04 | axios timeout → regular Error thrown → BullMQ retries (not UnrecoverableError) | unit (processor spec) | `npx jest cae-emission.processor.spec.ts -x` | ❌ Wave 0 |
| CAE-04 | AfipStubService active when USE_AFIP_STUB=true | unit (module factory) | `npx jest finanzas.module.spec.ts -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && npx jest --testPathPattern "afip-real|cae-emission" --no-coverage`
- **Per wave merge:** `cd backend && npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/modules/finanzas/afip/afip-real.service.spec.ts` — covers CAE-02, CAE-03
- [ ] `backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts` — covers CAE-04
- [ ] Prisma migration: add `EMISION_PENDIENTE` to `EstadoFactura` enum (if planner decides to use transient estado)

*(Existing test infrastructure: Jest configured, finanzas.service.spec.ts passing, wsaa.service.spec.ts passing — no framework install needed)*

## Sources

### Primary (HIGH confidence)
- Live AFIP endpoint: https://servicios1.afip.gov.ar/wsfev1/service.asmx?op=FECAESolicitar — SOAP element names confirmed
- Live AFIP endpoint: https://servicios1.afip.gov.ar/wsfev1/service.asmx?op=FECompUltimoAutorizado — sequence query confirmed
- BullMQ official docs: https://docs.bullmq.io/patterns/stop-retrying-jobs — UnrecoverableError behavior confirmed
- Prisma GitHub discussion: https://github.com/prisma/prisma/discussions/16740 — `$queryRawUnsafe` advisory lock pattern confirmed
- Project codebase `afip-config.service.ts` lines 186-236 — existing SOAP+axios pattern confirmed as reusable reference

### Secondary (MEDIUM confidence)
- https://www.afip.gob.ar/ws/documentacion/ws-factura-electronica.asp — official AFIP WS documentation page
- Google Groups pyafipws thread https://groups.google.com/g/factura-electronica-y-otros-servicios-argentina-wsafipfe/c/W72uX6etmao — CondicionIVAReceptor enforcement timeline corroborated
- https://www.facturap.ar/arca-solucion-a-error-10242.html — CondicionIVA numeric codes (1,4,5,6,7) independently verified
- https://afipsdk.com/blog/factura-electronica-solucion-a-error-10242/ — additional source for error 10242 + CondicionIVA mapping

### Tertiary (LOW confidence — needs integration testing validation)
- CondicionIVAReceptorId codes 8,9,10,13,15,16: mentioned in community sources; verify against `FEParamGetTiposCbte` or ARCA v4.0 manual before using in production
- IVA alícuota for aesthetic surgery (concepto=2, 21%): unverified — requires contador confirmation before production

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; all existing; WSFEv1 endpoint URLs verified against live AFIP service
- Architecture: HIGH — SOAP pattern directly from existing codebase; advisory lock pattern confirmed via Prisma docs; BullMQ pattern confirmed via official docs
- WSFEv1 URL status: HIGH — URLs confirmed non-migrated to arca.gob.ar as of 2026-03-20 (live endpoint responds at original afip.gov.ar domain)
- CondicionIVAReceptorId values: MEDIUM — confirmed for main values (1,5,6,7); edge cases need AFIP param query
- IVA matrix for aesthetic surgery: LOW — flagged as tech debt in STATE.md; not blocking Phase 14 homologación

**Research date:** 2026-03-20
**Valid until:** 2026-06-20 (90 days — ARCA URL migration risk; re-verify env vars before production deploy)
