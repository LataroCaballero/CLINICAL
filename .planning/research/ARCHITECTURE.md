# Architecture Research

**Domain:** NestJS SaaS monolith — WhatsApp messaging, automated follow-up sequences, PDF generation
**Researched:** 2026-02-21
**Confidence:** HIGH (patterns verified against official NestJS, BullMQ, and WhatsApp Cloud API docs)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                            │
│  Dashboard  │  Pacientes (Kanban)  │  Presupuestos  │  Automatizaciones│
└───────────────────────────┬──────────────────────────────────────────┘
                            │ HTTPS / JWT
┌───────────────────────────▼──────────────────────────────────────────┐
│                       NestJS Monolith (port 3001)                     │
│                                                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌────────────┐  │
│  │  mensajeria │  │automatizacion│  │ documentos │  │ (existing) │  │
│  │   module    │  │    module    │  │   module   │  │  modules   │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘  └────────────┘  │
│         │                │                 │                           │
│  ┌──────▼──────────────────────────────────▼──────────────────────┐  │
│  │                   BullMQ Queue Layer (Redis)                    │  │
│  │   mensajes-queue  │  automatizaciones-queue  │  documentos-queue│  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │          @Cron Scheduler (existing: SeguimientoScheduler)       │  │
│  │          Extended: enqueue BullMQ jobs instead of direct DB ops │  │
│  └────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
         │                          │                    │
         ▼                          ▼                    ▼
  WhatsApp Cloud API           Redis (BullMQ)       PostgreSQL
  (Meta / Cloud API)           job store            (existing)
         │
         ▼
  Webhook callbacks → POST /mensajeria/webhook
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `mensajeria` module | Send/receive WhatsApp messages; handle webhook events; track delivery status per message | WhatsApp Cloud API, BullMQ (mensajes-queue), Prisma (MensajeWhatsApp model) |
| `automatizaciones` module | Define, activate, and evaluate trigger rules; enqueue timed follow-up messages | BullMQ (automatizaciones-queue), pacientes service, mensajeria service |
| `documentos` module | Generate PDF buffers from Presupuesto data; store in Archivo model; return download URL | Presupuesto service, Prisma (Archivo model), BullMQ (optional: async generation) |
| BullMQ workers (per module) | Process queued jobs asynchronously; retry on failure; respect rate limits | Redis, external APIs, Prisma |
| WhatsApp Cloud API | Receive outbound messages; deliver inbound events via webhook | mensajeria module webhook endpoint |
| Existing `presupuestos` | Trigger "marcar enviado" + PDF generation + WhatsApp send as atomic workflow | mensajeria service, documentos service |
| Existing `SeguimientoScheduler` | Detect due TareaSeguimiento records; enqueue automatizaciones jobs instead of creating MensajeInterno directly | BullMQ automatizaciones-queue |

## Recommended Project Structure

```
backend/src/modules/
├── mensajeria/                        # NEW module
│   ├── mensajeria.module.ts
│   ├── mensajeria.controller.ts       # POST /mensajeria/webhook, GET /mensajeria/conversaciones
│   ├── mensajeria.service.ts          # send(), getConversacion(), handleWebhookEvent()
│   ├── mensajeria-whatsapp.service.ts # WhatsApp Cloud API HTTP client (axios)
│   ├── mensajeria.processor.ts        # BullMQ @Processor('mensajes-queue')
│   ├── dto/
│   │   ├── webhook-payload.dto.ts
│   │   └── send-message.dto.ts
│   └── types/
│       └── whatsapp-payload.types.ts  # Typed interfaces for Cloud API payloads
│
├── automatizaciones/                  # NEW module
│   ├── automatizaciones.module.ts
│   ├── automatizaciones.controller.ts # CRUD for AutomatizacionRegla
│   ├── automatizaciones.service.ts    # evaluateTriggers(), scheduleNextStep()
│   ├── automatizaciones.processor.ts  # BullMQ @Processor('automatizaciones-queue')
│   └── dto/
│       └── create-automatizacion.dto.ts
│
├── documentos/                        # NEW module
│   ├── documentos.module.ts
│   ├── documentos.controller.ts       # GET /documentos/presupuesto/:id/pdf
│   ├── documentos.service.ts          # generatePresupuestoPdf(): Buffer
│   └── templates/
│       └── presupuesto.template.html  # Handlebars/EJS template for PDF
│
└── (existing modules unchanged)
```

### Structure Rationale

- **mensajeria/:** Isolated from presupuestos and automatizaciones so WhatsApp credentials and API calls are in one place. The controller owns the webhook endpoint exclusively.
- **automatizaciones/:** Decoupled from mensajeria — it enqueues jobs; mensajeria executes sends. This allows non-WhatsApp channels (email) to use the same automation engine.
- **documentos/:** PDF generation is CPU-bound and potentially slow; isolating it lets it run async via BullMQ without blocking HTTP responses.

## Architectural Patterns

### Pattern 1: Acknowledge-First Webhook Processing

**What:** The WhatsApp Cloud API webhook endpoint returns HTTP 200 immediately, then enqueues the event payload to BullMQ for async processing.
**When to use:** Any webhook endpoint where processing takes > 5 seconds or could fail. WhatsApp will retry for up to 7 days after exponential backoff; failing to acknowledge causes duplicate delivery.
**Trade-offs:** Adds Redis dependency; gains resilience against downstream failures (DB unavailable, external API timeout).

```typescript
// mensajeria.controller.ts
@Post('webhook')
async handleWebhook(@Body() payload: WhatsAppWebhookPayload, @Res() res: Response) {
  // 1. Verify X-Hub-Signature-256 header BEFORE parsing body
  this.mensajeriaService.verifySignature(rawBody, signature);
  // 2. Acknowledge immediately — WhatsApp requires < 5s
  res.status(200).send('EVENT_RECEIVED');
  // 3. Enqueue for async processing (fire-and-forget)
  await this.mensajesQueue.add('process-webhook', payload);
}
```

### Pattern 2: BullMQ Delayed Jobs for Drip Sequences

**What:** When a trigger fires (e.g., `EtapaCRM` changes to `PRESUPUESTO_ENVIADO`), enqueue a delayed BullMQ job with `delay: daysToMs(3)`. The processor sends the message when the job executes.
**When to use:** All time-based follow-up sequences (day 3, day 7, day 14). Replaces the current pattern of creating `TareaSeguimiento` + running `@Cron` to detect them. Both can coexist during transition.
**Trade-offs:** Requires Redis persistence (configure `maxmemory-policy: noeviction` for job durability). Delayed jobs survive server restarts if Redis is durable (AOF enabled). More complex than `@Cron` but far more flexible.

```typescript
// automatizaciones.service.ts
async scheduleFollowUp(pacienteId: string, profesionalId: string, delayDays: number) {
  await this.automatizacionesQueue.add(
    'send-followup',
    { pacienteId, profesionalId, tipoMensaje: `SEGUIMIENTO_DIA_${delayDays}` },
    { delay: delayDays * 24 * 60 * 60 * 1000, attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
  );
}
```

### Pattern 3: Puppeteer PDF Service with Browser Pool

**What:** A singleton `DocumentosService` launches one headless Chromium instance at app startup (via `onApplicationBootstrap`) and reuses it for all PDF generation requests. It renders a compiled HTML template with patient/budget data and calls `page.pdf()`.
**When to use:** Budget PDF generation. Budget PDFs require formatting fidelity (fonts, tables, clinic logo) that PDFKit (canvas API) cannot match without significant effort.
**Trade-offs:** Adds ~150MB memory for Chromium. Must sanitize template variables to prevent HTML injection. Use `waitUntil: 'networkidle0'` before `.pdf()`. On serverless deployments, use `browserless.io` instead of embedded Chromium.

```typescript
// documentos.service.ts
@Injectable()
export class DocumentosService implements OnApplicationBootstrap {
  private browser: Browser;

  async onApplicationBootstrap() {
    this.browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  }

  async generatePresupuestoPdf(presupuestoId: string): Promise<Buffer> {
    const presupuesto = await this.prisma.presupuesto.findUnique({ where: { id: presupuestoId }, include: { items: true, paciente: true, profesional: { include: { usuario: true } } } });
    const html = this.templateService.render('presupuesto', presupuesto);
    const page = await this.browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({ format: 'A4', printBackground: true });
    await page.close();
    return buffer;
  }
}
```

### Pattern 4: Idempotent Webhook Event Processing

**What:** Store processed WhatsApp `message_id` values in Redis with a 24h TTL. The processor checks before acting, skipping duplicates silently.
**When to use:** All incoming webhook events. WhatsApp may deliver the same event multiple times during retries.
**Trade-offs:** Small Redis storage overhead; eliminates risk of double-processing a patient CRM update.

```typescript
// mensajeria.processor.ts
async processWebhookEvent(event: WhatsAppWebhookEvent) {
  const key = `wa:processed:${event.messageId}`;
  const alreadyProcessed = await this.redis.get(key);
  if (alreadyProcessed) return;
  await this.redis.set(key, '1', 'EX', 86400); // 24h TTL
  // ... actual processing
}
```

## Data Flow

### Data Flow 1: WhatsApp Webhook → Patient Record Update

```
WhatsApp Cloud API (Meta servers)
    │
    │ POST /mensajeria/webhook
    │ Headers: X-Hub-Signature-256: sha256=<hmac>
    │ Body: { object: "whatsapp_business_account", entry: [...] }
    ▼
mensajeria.controller.ts
    │ 1. Verify HMAC-SHA256 signature against raw body (NOT parsed JSON)
    │ 2. Return HTTP 200 immediately (< 5 seconds, per Meta requirement)
    │ 3. Add job to mensajes-queue
    ▼
BullMQ: mensajes-queue
    │
    ▼
mensajeria.processor.ts (@Processor('mensajes-queue'))
    │ 4. Check Redis idempotency key (skip if already processed)
    │ 5. Parse event type:
    │    a. messages.type == "text" → inbound patient message
    │       → prisma.mensajeWhatsApp.create() + notify CRM via mensajes internos
    │    b. statuses[].status == "delivered" → update MensajeWhatsApp.estadoEntrega = ENTREGADO
    │    c. statuses[].status == "read"      → update MensajeWhatsApp.estadoEntrega = LEIDO
    │    d. statuses[].status == "failed"    → update estadoEntrega = FALLIDO, log error code
    │       → if critical: create MensajeInterno alert for profesional
    ▼
Prisma → PostgreSQL (MensajeWhatsApp table)
    │
    ▼
Frontend: React Query invalidates ['mensajes', pacienteId]
    → Conversation thread updates in patient drawer
```

### Data Flow 2: Automated Sequence Trigger → Message Sent

```
Trigger Event (any of):
  A. presupuesto.marcarEnviado() sets EtapaCRM = PRESUPUESTO_ENVIADO
  B. SeguimientoSchedulerService detects due TareaSeguimiento
  C. Admin creates automatización manual from UI
    │
    ▼
automatizaciones.service.evaluateTriggers(pacienteId)
    │ 1. Load active AutomatizacionRegla records for profesional
    │ 2. Match trigger condition (etapaCRM, diasSinContacto, tipoEvento)
    │ 3. For each matching step: enqueue delayed BullMQ job
    ▼
BullMQ: automatizaciones-queue (with delay: N days in ms)
    │
    ... time passes (3 days / 7 days / 14 days) ...
    │
    ▼
automatizaciones.processor.ts (@Processor('automatizaciones-queue'))
    │ 4. Re-check if patient still in expected stage (may have converted)
    │    → If stage changed to CONFIRMADO or PERDIDO: cancel/skip job
    │ 5. Resolve message template for this step
    │ 6. Call mensajeria.service.send(pacienteId, mensajeTexto)
    ▼
mensajeria.service.send()
    │ 7. Look up patient's telefono
    │ 8. POST to WhatsApp Cloud API: messages endpoint
    │    Body: { to: "+54...", type: "text", text: { body: "..." } }
    │    OR:  { type: "template", template: { name: "...", ... } }
    │ 9. Save MensajeWhatsApp record (estado: ENVIADO, waMessageId: response.messages[0].id)
    ▼
WhatsApp delivers message to patient
    │
    ▼
Webhook callback: status "delivered" / "read" / "failed"
    → Data Flow 1 handles status update
```

### Data Flow 3: Budget PDF Generation and Delivery

```
Frontend: "Enviar Presupuesto" button
    │
    │ POST /presupuestos/:id/marcar-enviado
    ▼
presupuestos.service.marcarEnviado()
    │ 1. Update Presupuesto.estado = ENVIADO
    │ 2. Update Paciente.etapaCRM = PRESUPUESTO_ENVIADO
    │ 3. Call documentos.service.generatePresupuestoPdf(presupuestoId)
    ▼
documentos.service.generatePresupuestoPdf()
    │ 4. Fetch Presupuesto with items, paciente, profesional from Prisma
    │ 5. Render HTML template (Handlebars/EJS) with data
    │ 6. Open Puppeteer page, setContent(html), page.pdf() → Buffer
    │ 7. Store PDF buffer as Archivo record (url = base64 or upload to storage)
    │ 8. Return Archivo.id
    ▼
presupuestos.service (resumes)
    │ 9. Call mensajeria.service.sendDocument(pacienteId, pdfBuffer, filename)
    ▼
mensajeria.service.sendDocument()
    │ 10. Upload PDF to WhatsApp media endpoint → mediaId
    │ 11. POST message with type: "document", document.id: mediaId
    │ 12. Save MensajeWhatsApp record
    ▼
Patient receives PDF on WhatsApp
```

## Build Order (Dependencies)

The following order respects hard dependencies — each phase requires the previous to be complete before integration:

```
Phase 1: Infrastructure — Redis + BullMQ setup (MUST be first)
    Prerequisite for: all async processing in phases below
    Tasks: Add Redis to docker-compose, install @nestjs/bullmq, configure BullModule in AppModule

Phase 2: mensajeria module — WhatsApp send + webhook skeleton
    Prerequisite for: PDF delivery, automated messages
    Tasks: MensajeriaService.send(), webhook endpoint + signature verification,
           MensajeWhatsApp Prisma model, BullMQ processor skeleton,
           idempotency key pattern in Redis

Phase 3: documentos module — PDF generation
    Prerequisite for: presupuesto delivery via WhatsApp
    Tasks: Puppeteer setup, presupuesto HTML template, generatePresupuestoPdf(),
           integration into presupuestos.service.marcarEnviado()

Phase 4: automatizaciones module — drip sequences
    Prerequisite: mensajeria (Phase 2) must exist to send messages
    Tasks: AutomatizacionRegla Prisma model, BullMQ delayed jobs,
           trigger evaluation in presupuestos + SeguimientoScheduler,
           guard logic (skip if patient converted)

Phase 5: WhatsApp status webhook processing
    Prerequisite: mensajeria module (Phase 2), MensajeWhatsApp model (Phase 2)
    Tasks: delivered/read/failed status handling in mensajeria.processor,
           UI display of delivery status in patient conversation thread

Phase 6: Fallback email channel
    Prerequisite: documentos (Phase 3), mensajeria service interface defined
    Tasks: nodemailer/resend integration, same service interface as WhatsApp send,
           channel selection logic (WhatsApp primary, email fallback)
```

## BullMQ: Is It Needed?

**Yes. BullMQ is required for this feature set.** The existing `@Cron` scheduler is suitable for "check DB every day at 9am" tasks. It is not suitable for:

1. **Webhook processing** — WhatsApp requires HTTP 200 within 5 seconds. Any DB operation or API call in the webhook handler risks timeout. BullMQ decouples acknowledgment from processing.
2. **Per-patient delayed jobs** — Sending a message 3 days after a specific event for a specific patient requires job-level scheduling, not a daily batch scan. `@Cron` would require scanning all patients daily and checking elapsed time; BullMQ fires exactly when needed.
3. **Retry with backoff** — WhatsApp Cloud API rate-limits sends. BullMQ provides automatic retry with exponential backoff out of the box.
4. **Cancellation** — If a patient converts before day-7 message fires, BullMQ jobs can be removed by ID. `@Cron`-based approaches require a separate "should-skip" flag checked at execution time.

The `SeguimientoSchedulerService` (`@Cron`) should be retained for its current role (batch alerting) and extended to enqueue BullMQ automatizaciones jobs instead of (or in addition to) creating `MensajeInterno` records directly.

### Queues to Create

| Queue Name | Purpose | Job Types |
|------------|---------|-----------|
| `mensajes-queue` | Process inbound webhook events from WhatsApp | `process-webhook` |
| `automatizaciones-queue` | Execute timed follow-up message sends | `send-followup`, `send-template` |
| `documentos-queue` | Async PDF generation for large/complex budgets (optional) | `generate-pdf` |

## Webhook Status Updates: Handling Strategy

WhatsApp delivers status updates (sent → delivered → read, or failed) as separate webhook POST requests referencing the original `wamid` (WhatsApp message ID). The system must:

| Status | Action | DB Update |
|--------|--------|-----------|
| `sent` | No action needed (we already saved on send) | — |
| `delivered` | Update `MensajeWhatsApp.estadoEntrega = ENTREGADO` | Yes |
| `read` | Update `MensajeWhatsApp.estadoEntrega = LEIDO` | Yes |
| `failed` | Update `estadoEntrega = FALLIDO`, store `error.code` + `error.message` | Yes + alert |

For `failed` status updates, create a `MensajeInterno` for the profesional indicating the send failed and suggesting manual contact. This integrates with the existing alert infrastructure.

The `MensajeWhatsApp` Prisma model must include a `waMessageId` field (the `wamid` returned by the Cloud API) indexed for fast lookup during status webhook processing.

```prisma
// Schema addition required before Phase 2
model MensajeWhatsApp {
  id              String              @id @default(uuid())
  pacienteId      String
  profesionalId   String
  waMessageId     String?             @unique  // wamid from Cloud API response
  direccion       DireccionMensaje    // ENTRANTE / SALIENTE
  tipo            TipoMensajeWA       // TEXTO / DOCUMENTO / PLANTILLA
  contenido       String?
  archivoId       String?
  estadoEntrega   EstadoEntregaWA     @default(PENDIENTE)
  errorCode       String?
  errorMessage    String?
  automatizacionId String?            // FK to automatizacion job if sent by drip
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  paciente        Paciente            @relation(fields: [pacienteId], references: [id])
  profesional     Profesional         @relation(fields: [profesionalId], references: [id])

  @@index([pacienteId, createdAt])
  @@index([waMessageId])
}

enum DireccionMensaje { ENTRANTE  SALIENTE }
enum TipoMensajeWA    { TEXTO  DOCUMENTO  PLANTILLA  IMAGEN }
enum EstadoEntregaWA  { PENDIENTE  ENVIADO  ENTREGADO  LEIDO  FALLIDO }
```

## Anti-Patterns

### Anti-Pattern 1: Processing Webhooks Synchronously

**What people do:** Run DB queries, call external APIs, or generate PDFs inside the webhook HTTP handler before returning 200.
**Why it's wrong:** WhatsApp requires a response within 5 seconds. Any downstream failure (slow DB query, Puppeteer cold start) causes WhatsApp to retry, resulting in duplicate processing.
**Do this instead:** Return 200 immediately; enqueue to BullMQ; process in the worker.

### Anti-Pattern 2: Using @Cron for Per-Patient Delayed Messages

**What people do:** Create a daily cron that scans all patients for "días desde presupuesto enviado >= 3" and sends messages.
**Why it's wrong:** Sends happen at a fixed daily time rather than exactly N days after the event. Misses patients in edge cases. Becomes a table scan as patient volume grows.
**Do this instead:** Enqueue a BullMQ delayed job at the moment the triggering event occurs (e.g., `marcarEnviado()`). The job fires exactly N days later regardless of cron schedules.

### Anti-Pattern 3: Storing WhatsApp Phone Numbers Without Validation

**What people do:** Send to `paciente.telefono` directly, which may contain spaces, dashes, or lack country code.
**Why it's wrong:** WhatsApp Cloud API requires E.164 format (`+5491112345678`). Malformed numbers cause API errors that look like delivery failures.
**Do this instead:** Normalize phone numbers to E.164 in `MensajeriaService.send()` before every API call. Store the original in `Paciente.telefono` for display; normalize on the fly.

### Anti-Pattern 4: Launching a New Puppeteer Browser per PDF Request

**What people do:** Call `puppeteer.launch()` inside `generatePresupuestoPdf()` for each request.
**Why it's wrong:** Chromium takes 1-3 seconds to cold-start. Under concurrent requests, this creates N browser processes simultaneously, consuming hundreds of MB of RAM.
**Do this instead:** Launch one browser at module bootstrap (`OnApplicationBootstrap`), reuse it per request by opening/closing individual pages only.

### Anti-Pattern 5: Skipping Signature Verification in Development

**What people do:** Comment out HMAC verification during local testing, forget to re-enable it.
**Why it's wrong:** Leaves the webhook endpoint open to spoofed events that could spam patients or corrupt CRM stages.
**Do this instead:** Implement verification from day one with a configurable env var (`WHATSAPP_WEBHOOK_SECRET`). Use a short-circuit bypass only via explicit env flag (`SKIP_WEBHOOK_VERIFY=true`) never in committed code.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| WhatsApp Cloud API (Meta) | HTTP via axios from `MensajeriaWhatsappService`. Auth: `Bearer WHATSAPP_TOKEN` header. Base URL: `https://graph.facebook.com/v18.0/{phone-number-id}/` | Cloud API only (On-Premises deprecated Oct 2025). Requires Meta Business account approval. Webhook verification token set in Meta dashboard. |
| Redis (BullMQ backend) | `BullModule.forRoot({ connection: { host, port } })` in `AppModule`. Separate from any cache Redis if used. | Configure `maxmemory-policy: noeviction` for job durability. AOF persistence recommended for delayed jobs. |
| Puppeteer (headless Chromium) | Singleton browser instance in `DocumentosService`. Install `puppeteer` (bundles Chromium) or `puppeteer-core` + system Chrome. | Add `--no-sandbox` flag for Docker/Linux deployments. |
| Email (nodemailer / Resend) | Phase 6 fallback. Abstract behind same `INotificacionService` interface as WhatsApp send. | Use Resend (SaaS) rather than raw SMTP to avoid deliverability issues. |

### Internal Module Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `presupuestos` → `mensajeria` | Direct service injection (`MensajeriaService`) | presupuestos.module imports MensajeriaModule |
| `presupuestos` → `documentos` | Direct service injection (`DocumentosService`) | presupuestos.module imports DocumentosModule |
| `automatizaciones` → `mensajeria` | Direct service injection for send; BullMQ for delayed execution | automatizaciones.processor calls mensajeria.service.send() |
| `pacientes` → `automatizaciones` | Event: when `EtapaCRM` changes, call `automatizaciones.service.evaluateTriggers()` | Keep pacientes.service thin — delegate trigger evaluation |
| `SeguimientoScheduler` → `automatizaciones-queue` | BullMQ job enqueue (replaces direct MensajeInterno creation) | Scheduler stays in pacientes module; only changes its output |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k patients | Single Redis instance, embedded Chromium, single NestJS process. Current monolith is fine. |
| 1k-20k patients | Add Redis sentinel/cluster for job durability. Separate BullMQ worker process (`nestjs start --entryFile worker`) to isolate PDF/WhatsApp load from HTTP. Consider `browserless.io` instead of embedded Chromium. |
| 20k+ patients | Extract `mensajeria` and `automatizaciones` as separate microservices. Multi-tenant Redis namespacing. WhatsApp rate limit (1,000 msg/sec per number) becomes real constraint — implement per-tenant send rate throttling with BullMQ rate limiters. |

### Scaling Priorities

1. **First bottleneck:** Puppeteer PDF generation under concurrent requests (each page uses ~50MB). Fix: BullMQ `documentos-queue` with concurrency: 2, or move to `browserless.io`.
2. **Second bottleneck:** WhatsApp Cloud API rate limits on bulk follow-up sends. Fix: BullMQ rate limiter (`{ max: 100, duration: 1000 }`) on `mensajes-queue`.

## Sources

- [WhatsApp Cloud API — only supported architecture as of October 2025](https://gurusup.com/blog/whatsapp-api-developers)
- [WhatsApp Webhook Guide — event types, status updates, signature verification, 5s response requirement](https://hookdeck.com/webhooks/platforms/guide-to-whatsapp-webhooks-features-and-best-practices)
- [NestJS BullMQ official docs — @Processor, BullModule.forRoot, delayed jobs](https://docs.bullmq.io/guide/nestjs)
- [NestJS Queues official docs](https://docs.nestjs.com/techniques/queues)
- [Puppeteer PDF generation with NestJS — browser pool, template rendering pattern](https://medium.com/@mprasad96/from-html-templates-to-well-formatted-pdfs-using-puppeteer-and-nestjs-1263bdff641c)
- [WhatsApp Drip Campaign architecture — trigger-based enrollment, CRM integration patterns](https://zixflow.com/blog/whatsapp-drip-campaigns/)
- [BullMQ delayed jobs and job schedulers](https://docs.bullmq.io/guide/job-schedulers)
- [Production NestJS WhatsApp integration — Infobip example with webhook pattern](https://www.sent.dm/resources/infobip-node-js-nestjs-whatsapp-integration)
- [WhatsApp Cloud API Node.js SDK — Meta official](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/)

---
*Architecture research for: CLINICAL — WhatsApp messaging, automated sequences, PDF generation*
*Researched: 2026-02-21*
