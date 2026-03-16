# Phase 1: Infraestructura Async — Research

**Researched:** 2026-02-23
**Domain:** BullMQ + Redis async jobs, WABA credential storage with encryption, WhatsApp opt-in schema, message tracking
**Confidence:** HIGH (BullMQ/NestJS patterns verified via official docs + community sources), MEDIUM (Meta validation endpoint approach — official docs blocked, derived from multiple secondary sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Config WABA por clínica:**
- Las credenciales de WhatsApp (Phone Number ID, WABA ID, Access Token) se configuran desde una **página de Settings de la clínica** dentro del dashboard
- Al guardar, el sistema **valida las credenciales en vivo con la API de Meta** antes de persistirlas — si son inválidas, muestra error descriptivo
- El número de WhatsApp conectado se muestra formateado en la página de Settings para confirmación visual
- Solo **ADMIN y PROFESIONAL** pueden ver y editar la configuración de WhatsApp
- El estado de conexión (conectado/desconectado) es visible **únicamente en la página de Settings** — sin badges en sidebar ni topbar

### Claude's Discretion
- Diseño visual del formulario de Settings de WhatsApp
- Estructura de las tablas/campos Prisma para credenciales (encrypted storage recomendado)
- Setup de BullMQ (nombres de queues, concurrencia, retry policy)
- Formato del campo `whatsappOptIn` en el paciente (boolean + timestamp)
- Modelo `MensajeWhatsApp` en Prisma (campos mínimos para tracking: waMessageId, pacienteId, estado, timestamps)

### Deferred Ideas (OUT OF SCOPE)
- Wizard de onboarding guiado para conectar WhatsApp — considerarlo para UX de onboarding futuro
- Bull Board o dashboard de jobs para admin técnico — útil para debugging en producción, fuera de scope v1
- Visibilidad del log de mensajes en el perfil del paciente — se implementa en Phase 4 junto con la mensajería
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | El sistema soporta jobs asincrónicos persistentes con reintentos (BullMQ sobre Redis) | BullMQ + @nestjs/bullmq v11 is the clear standard. Redis persistence requires AOF config + `maxmemory-policy noeviction`. WorkerHost processor pattern with attempts + exponential backoff handles retries. |
| INFRA-02 | Cada clínica (tenant) puede conectar su propio número de WhatsApp (credenciales WABA separadas por tenant en base de datos) | New Prisma model `ConfiguracionWABA` keyed to `profesionalId`. Fields encrypted at rest using AES-256-GCM via Node.js built-in `crypto`. Credential validation uses `GET /{phone-number-id}` on Meta Graph API before persist. |
| INFRA-03 | Cada paciente tiene campo de consentimiento explícito para recibir mensajes de WhatsApp (`whatsappOptIn` + timestamp de aceptación) | Two Prisma fields on `Paciente`: `whatsappOptIn Boolean @default(false)` + `whatsappOptInAt DateTime?`. Backend PATCH endpoint `PATCH /pacientes/:id/whatsapp-opt-in`. Frontend: toggle in patient profile. |
| INFRA-04 | El sistema registra cada mensaje WhatsApp enviado con su estado de entrega (pendiente, enviado, entregado, leído, fallido) | New Prisma model `MensajeWhatsApp` with `waMessageId`, `pacienteId`, `profesionalId`, `estado` (enum), `tipo`, timestamps. Used as audit trail; no UI required in Phase 1 (display is Phase 4). |
</phase_requirements>

---

## Summary

Phase 1 establishes two independent pillars: (1) a persistent async job infrastructure using BullMQ over Redis, and (2) the data models and settings UI needed to store per-tenant WABA credentials, patient WhatsApp consent, and message delivery tracking. No message sending logic is written in this phase — only the plumbing.

The BullMQ integration is well-supported by the official `@nestjs/bullmq` package (v11.0.4, peer depends on bullmq v5.x). The existing project already has `redis` and `cache-manager-redis-yet` packages installed, meaning the Redis dependency is available. The STATE.md flags a known concern about BullMQ v11 + NestJS v10 compatibility — this should be confirmed with an integration smoke test in the very first plan task.

For WABA credential storage, the primary concern is security: access tokens must be encrypted at rest. Node.js built-in `crypto` with AES-256-GCM is the standard approach — no third-party library needed. The Meta credential validation call uses `GET https://graph.facebook.com/v21.0/{phone-number-id}?fields=display_phone_number,verified_name` with `Authorization: Bearer {access_token}`, which returns the formatted phone number on success and a 4xx error on failure.

**Primary recommendation:** Install `@nestjs/bullmq` + `bullmq`, create a global `WhatsappJobsModule`, write two Prisma migrations (WABA config + message table + patient opt-in fields), and build the Settings tab — in that order, as listed above.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/bullmq` | `^11.0.4` | NestJS integration wrapper for BullMQ | Official NestJS package; WorkerHost processor pattern; DI-compatible |
| `bullmq` | `^5.61.0` | Redis-backed job queue engine | De-facto standard for Node.js async jobs; persistent, retryable, durable |
| `redis` | already in project (`^5.x`) | Redis client | Already installed as `redis` package |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nestjs/config` | already in project | Inject `ENCRYPTION_KEY` and `REDIS_URL` from env | Used for `ConfigService` injection in BullMQ module and crypto service |
| Node.js built-in `crypto` | N/A | AES-256-GCM encryption of WABA credentials | No extra install; use for `encrypt()` / `decrypt()` helper service |
| `axios` | already in project (`^1.x`) | HTTP call to Meta Graph API to validate WABA credentials | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@nestjs/bullmq` | `@nestjs/bull` (older Bull library) | Bull is deprecated in favor of BullMQ; BullMQ is actively maintained |
| Node.js `crypto` AES-GCM | `nestjs-encryption`, `aes-256-gcm` npm package | Zero-dependency is better for security-sensitive code; built-in crypto is audited |
| Direct bullmq install without NestJS wrapper | Raw `bullmq` with manual DI | `@nestjs/bullmq` provides `@InjectQueue`, `@Processor`, DI container integration |

**Installation (new packages only):**
```bash
npm install --save @nestjs/bullmq bullmq
```
(Redis and axios are already installed in the project)

---

## Architecture Patterns

### Recommended Project Structure

```
backend/src/
├── modules/
│   └── whatsapp/                       # New module for all WA infrastructure
│       ├── whatsapp.module.ts           # Registers BullMQ queue + exports
│       ├── whatsapp.service.ts          # WABA config CRUD + Meta validation
│       ├── whatsapp.controller.ts       # Settings endpoints (GET/POST config)
│       ├── dto/
│       │   ├── save-waba-config.dto.ts
│       │   └── update-opt-in.dto.ts
│       └── crypto/
│           └── encryption.service.ts   # AES-256-GCM encrypt/decrypt
├── prisma/
│   └── schema.prisma                   # Add ConfiguracionWABA, MensajeWhatsApp, Paciente fields
└── app.module.ts                       # Import BullModule.forRoot() + WhatsappModule
```

### Pattern 1: BullMQ Module Setup (Global Redis Connection)

**What:** Register BullMQ's Redis connection once in `AppModule` via `BullModule.forRoot()`. Individual feature modules call `BullModule.registerQueue()` to get their specific queues.

**When to use:** Single app with multiple queues — register connection globally, register queues locally per module.

```typescript
// Source: https://docs.bullmq.io/guide/nestjs + verified from DEV article
// app.module.ts
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          // maxRetriesPerRequest: null — required for workers per BullMQ production docs
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      }),
    }),
  ],
})
export class AppModule implements NestModule { /* ... */ }
```

### Pattern 2: Queue Registration + WorkerHost Processor

```typescript
// Source: https://dev.to/railsstudent/queuing-jobs-in-nestjs-using-nestjsbullmq-package-55c1
// whatsapp.module.ts
import { BullModule } from '@nestjs/bullmq';

export const WHATSAPP_QUEUE = 'whatsapp-messages';

@Module({
  imports: [
    BullModule.registerQueue({ name: WHATSAPP_QUEUE }),
  ],
  providers: [WhatsappService, WhatsappMessageProcessor],
  controllers: [WhatsappController],
  exports: [BullModule],  // Export so other modules can inject the queue
})
export class WhatsappModule {}

// whatsapp-message.processor.ts — placeholder for Phase 4, registered now
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor(WHATSAPP_QUEUE)
export class WhatsappMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappMessageProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job: ${job.name} (id: ${job.id})`);
    // Phase 1: processor exists but does nothing yet (infrastructure validation)
    // Phase 4: actual send logic goes here
    switch (job.name) {
      case 'send-whatsapp-message':
        // TODO Phase 4: call Meta API
        break;
      default:
        throw new Error(`Unknown job: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    this.logger.error(`Job ${job.id} failed: ${job.failedReason}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }
}
```

### Pattern 3: AES-256-GCM Credential Encryption

```typescript
// Source: https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81 (verified pattern)
// encryption.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 12;  // 96-bit recommended for GCM

  constructor(private config: ConfigService) {
    const rawKey = config.get<string>('ENCRYPTION_KEY');
    if (!rawKey || rawKey.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
    }
    this.key = Buffer.from(rawKey, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Store: iv:authTag:ciphertext (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(stored: string): string {
    const [ivB64, tagB64, dataB64] = stored.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(data) + decipher.final('utf8');
  }
}
```

**Key generation for .env:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Pattern 4: Meta WABA Credential Validation

**What:** Before saving WABA credentials, call the Meta Graph API to retrieve phone number details. A successful response proves the `phone_number_id` + `access_token` are valid.

**Endpoint:** `GET https://graph.facebook.com/v21.0/{phone_number_id}?fields=display_phone_number,verified_name`
**Header:** `Authorization: Bearer {access_token}`

**Success response:**
```json
{
  "display_phone_number": "+54 9 11 1234-5678",
  "verified_name": "Clínica Ejemplo",
  "id": "1234567890"
}
```
**Failure response (invalid token):** HTTP 400/401 with `{ "error": { "code": 190, "message": "Invalid OAuth access token." } }`

```typescript
// Source: Multiple secondary sources confirm this endpoint pattern
// whatsapp.service.ts (validation method)
async validateWABACredentials(phoneNumberId: string, accessToken: string): Promise<{ displayPhone: string; verifiedName: string }> {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}`;
  try {
    const response = await this.httpService.get(url, {
      params: { fields: 'display_phone_number,verified_name' },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return {
      displayPhone: response.data.display_phone_number,
      verifiedName: response.data.verified_name,
    };
  } catch (err) {
    const metaError = err.response?.data?.error?.message ?? 'Credenciales inválidas';
    throw new BadRequestException(`Meta API: ${metaError}`);
  }
}
```

### Pattern 5: Frontend Settings Tab Integration

The existing `frontend/src/app/dashboard/configuracion/page.tsx` already uses a Tabs component to separate config sections by role. The WhatsApp config tab follows this same pattern: add a new `TabsTrigger value="whatsapp"` visible only to ADMIN and PROFESIONAL roles.

```typescript
// configuracion/page.tsx — add to PROFESIONAL and ADMIN tabs
<TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
...
<TabsContent value="whatsapp" className="mt-6">
  <WhatsappConfigTab />
</TabsContent>
```

### Prisma Schema Additions

```prisma
// New model: per-tenant WABA configuration
model ConfiguracionWABA {
  id                    String      @id @default(uuid())
  profesionalId         String      @unique
  phoneNumberId         String      // Meta Phone Number ID (plaintext — not secret)
  wabaId                String?     // Meta WABA ID (optional for now)
  accessTokenEncrypted  String      // AES-256-GCM encrypted access token
  displayPhone          String      // Formatted phone (returned by Meta on validation)
  verifiedName          String?     // Business name from Meta
  activo                Boolean     @default(true)
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
  profesional           Profesional @relation(fields: [profesionalId], references: [id])
}

// New model: WhatsApp message audit log
model MensajeWhatsApp {
  id            String             @id @default(uuid())
  waMessageId   String?            // Meta's message ID (returned after send, nullable until sent)
  pacienteId    String
  profesionalId String
  tipo          TipoMensajeWA      // PRESUPUESTO, RECORDATORIO, CUSTOM, etc.
  contenido     String?            // Template name or message body
  estado        EstadoMensajeWA    @default(PENDIENTE)
  errorMsg      String?
  sentAt        DateTime?
  deliveredAt   DateTime?
  readAt        DateTime?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  paciente      Paciente           @relation(fields: [pacienteId], references: [id])
  profesional   Profesional        @relation(fields: [profesionalId], references: [id])

  @@index([pacienteId, createdAt])
  @@index([estado])
  @@index([waMessageId])
}

// New enums
enum EstadoMensajeWA {
  PENDIENTE
  ENVIADO
  ENTREGADO
  LEIDO
  FALLIDO
}

enum TipoMensajeWA {
  PRESUPUESTO
  RECORDATORIO_TURNO
  SEGUIMIENTO
  CUSTOM
}

// Fields to add on Paciente model
// whatsappOptIn    Boolean   @default(false)
// whatsappOptInAt  DateTime?
```

### Anti-Patterns to Avoid

- **Anti-pattern: Storing access tokens in plaintext:** Meta access tokens are high-value credentials. Always encrypt before persisting with AES-256-GCM. Never return the decrypted token from any API endpoint — only use it server-side.
- **Anti-pattern: Using `@nestjs/bull` (old package) instead of `@nestjs/bullmq`:** Bull is the legacy library. BullMQ is the actively maintained successor with better TypeScript support.
- **Anti-pattern: Registering BullMQ globally without `maxRetriesPerRequest: null`:** Workers will fail to reconnect after Redis connection loss. Set this in the connection options.
- **Anti-pattern: Using `process.kill()` without graceful shutdown:** BullMQ jobs will be stuck as "stalled" if workers are killed mid-job. NestJS already handles SIGTERM gracefully — do not add `--force` kill.
- **Anti-pattern: Registering `ScheduleModule.forRoot()` in `AppModule` AND `PacientesModule` simultaneously:** The existing code has it only in `PacientesModule`. When BullMQ is added to `AppModule`, remove the duplicate `ScheduleModule.forRoot()` if it collides.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job queue with retries | Custom retry loop with setTimeout | BullMQ via `@nestjs/bullmq` | Race conditions, memory leaks, no persistence across restarts |
| Credential encryption | Base64 encoding, XOR, simple cipher | Node.js `crypto` with AES-256-GCM | GCM provides integrity check; IV randomization prevents pattern analysis |
| Stalled job detection | Manual heartbeat + cron | BullMQ stalled job detector (built-in) | BullMQ automatically promotes stalled jobs back to waiting |
| Queue connection retry | Manual reconnect logic | `maxRetriesPerRequest: null` + ioredis default retryStrategy | Exponential backoff built into ioredis |

**Key insight:** For job queues, the edge cases (network partitions, partial writes, race conditions at restart, duplicate execution) compound quickly. BullMQ + Redis solves all of them in a tested, production-hardened way.

---

## Common Pitfalls

### Pitfall 1: Redis Not Configured for Persistence
**What goes wrong:** Jobs enqueued are lost on Redis restart. The system appears to "work" in development but jobs silently disappear after server reboots in production.
**Why it happens:** Redis defaults to in-memory only (`save ""`). Most cloud Redis providers (Upstash free tier, Railway) don't enable AOF by default.
**How to avoid:** Enable AOF in Redis config: `appendonly yes`, `appendfsync everysec`. Also set `maxmemory-policy noeviction` so Redis never evicts job keys.
**Warning signs:** Jobs show as "waiting" but disappear after Redis restart; job count resets to 0.

### Pitfall 2: BullMQ v11 + NestJS v10 — Unverified Official Compatibility
**What goes wrong:** Module fails to initialize; cryptic DI errors.
**Why it happens:** `@nestjs/bullmq` v11 has peer dependency on NestJS `^10.x || ^11.x` per npm. STATE.md flags community reports of compatibility but no official declaration. The packages should be compatible but this requires a smoke test.
**How to avoid:** First plan task: install + create a minimal test queue + add one job + verify it processes. Do this BEFORE building the full queue infrastructure.
**Warning signs:** `Cannot read property of undefined` on module init; circular DI errors with `BullModule`.

### Pitfall 3: Leaking Decrypted Access Token in API Responses
**What goes wrong:** The decrypted WABA access token is returned in a GET response, exposing it to frontend clients.
**Why it happens:** Developer returns the full `ConfiguracionWABA` record from the service method.
**How to avoid:** Always create a DTO that explicitly omits `accessTokenEncrypted`. Never expose the raw encrypted string either. Return only: `{ phoneNumberId, displayPhone, verifiedName, activo }`.
**Warning signs:** Frontend console shows a long opaque string (the encrypted token) in network responses.

### Pitfall 4: Single `BullModule.forRoot()` — Misconfigured Connection Options
**What goes wrong:** Workers fail silently when Redis goes down and doesn't come back; jobs stuck in "active" state.
**Why it happens:** Default ioredis `maxRetriesPerRequest` is 20, which causes workers to throw instead of waiting for reconnect.
**How to avoid:** Always set `maxRetriesPerRequest: null` in the connection options passed to `BullModule.forRoot()`.
**Warning signs:** On Redis connection loss, workers crash with "max retries reached" error.

### Pitfall 5: Meta API Version Drift
**What goes wrong:** Validation call to Meta stops working as Meta deprecates old API versions.
**Why it happens:** Meta deprecates Graph API versions roughly every 2 years.
**How to avoid:** Parameterize the Graph API version: `const META_API_VERSION = 'v21.0'` in a config constant, not hardcoded throughout the code.
**Warning signs:** Meta returns HTTP 400 with message about deprecated version.

---

## Code Examples

### Enqueue a Job (for use in Phase 4 — pattern established in Phase 1)

```typescript
// Source: verified from BullMQ NestJS guide + DEV article
@Injectable()
export class WhatsappService {
  constructor(
    @InjectQueue(WHATSAPP_QUEUE) private readonly whatsappQueue: Queue,
  ) {}

  async enqueueMessage(pacienteId: string, templateName: string, payload: object): Promise<void> {
    await this.whatsappQueue.add(
      'send-whatsapp-message',
      { pacienteId, templateName, payload },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,  // Keep failed jobs for inspection
      },
    );
  }
}
```

### Smoke Test for BullMQ Integration

```typescript
// whatsapp.controller.ts — temporary test endpoint, to be removed after validation
@Post('test-queue')
@Roles('ADMIN')
async testQueue() {
  await this.whatsappQueue.add('test-job', { test: true }, { delay: 1000 });
  return { queued: true };
}
```

### Patient Opt-In PATCH Endpoint

```typescript
// pacientes.controller.ts
@Patch(':id/whatsapp-opt-in')
@Roles('ADMIN', 'PROFESIONAL', 'SECRETARIA')
async updateWhatsappOptIn(
  @Param('id') id: string,
  @Body() dto: UpdateWhatsappOptInDto,
) {
  return this.pacientesService.updateWhatsappOptIn(id, dto.optIn);
}

// pacientes.service.ts
async updateWhatsappOptIn(id: string, optIn: boolean) {
  return this.prisma.paciente.update({
    where: { id },
    data: {
      whatsappOptIn: optIn,
      whatsappOptInAt: optIn ? new Date() : null,
    },
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@nestjs/bull` + `bull` library | `@nestjs/bullmq` + `bullmq` | ~2022 when BullMQ released | Bull is archived; BullMQ is the maintained path |
| `@Process()` decorator for job handlers | `WorkerHost.process()` + switch on `job.name` | BullMQ release | BullMQ doesn't support `@Process()` — must use `WorkerHost` pattern |
| Redis connection without `maxRetriesPerRequest: null` | `maxRetriesPerRequest: null` required for workers | BullMQ v2+ | Workers throw instead of retry without this option |

**Deprecated/outdated:**
- `@Process('jobName')` decorator: Does NOT exist in `@nestjs/bullmq`. Use `WorkerHost.process()` with a switch statement on `job.name`.
- `@nestjs/bull` (the old package): Deprecated. Use `@nestjs/bullmq`.

---

## Open Questions

1. **BullMQ v11 + NestJS v10 Smoke Test**
   - What we know: `@nestjs/bullmq` v11 declares peer deps `@nestjs/common ^10.x || ^11.x`. Community reports it works.
   - What's unclear: No official announcement; the STATE.md flags this as a known concern.
   - Recommendation: Make smoke test the first deliverable of Plan 01. If incompatible, fall back to pinning `@nestjs/bullmq@10.x` (last NestJS v10 stable).

2. **Meta Graph API Version for Credential Validation**
   - What we know: Meta's latest API version is v23.0 (as of early 2025). The phone number retrieval endpoint `GET /{phone-number-id}?fields=display_phone_number,verified_name` is documented across multiple sources.
   - What's unclear: Cannot confirm exact error response format for invalid tokens from official docs (developers.facebook.com blocked by fetcher).
   - Recommendation: Use `v21.0` (stable, 2 versions behind latest, 18+ months until deprecation). Implement a try/catch that maps Meta error codes: `code 190` = invalid token, `code 100` = invalid phone number ID.

3. **Redis Instance for Development**
   - What we know: The project has `redis` and `cache-manager-redis-yet` installed, suggesting Redis may already be running locally or in docker-compose.
   - What's unclear: No `docker-compose.yml` was found in the project. Unknown if Redis is already configured for cache.
   - Recommendation: Verify if `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT` env vars are already set. If Redis is used for cache, the same Redis instance can be shared for BullMQ (separate key namespacing is automatic).

4. **ENCRYPTION_KEY Management**
   - What we know: A 32-byte (64 hex char) key is needed for AES-256-GCM.
   - What's unclear: Whether an encryption key should be per-tenant (profesional) or global app secret.
   - Recommendation: Use a single global `ENCRYPTION_KEY` app secret from `.env`. Per-tenant keys add complexity with no clear benefit at this scale — all data is already multi-tenant via `profesionalId`.

---

## Sources

### Primary (HIGH confidence)
- `https://docs.bullmq.io/guide/nestjs` — BullMQ NestJS integration, WorkerHost pattern, queue registration
- `https://docs.bullmq.io/guide/going-to-production` — Redis persistence (AOF), `maxRetriesPerRequest: null`, graceful shutdown
- `https://dev.to/railsstudent/queuing-jobs-in-nestjs-using-nestjsbullmq-package-55c1` — Complete `@nestjs/bullmq` implementation with WorkerHost, InjectQueue, job options
- `https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81` — AES-256-GCM Node.js crypto pattern with IV and auth tag

### Secondary (MEDIUM confidence)
- `https://github.com/nestjs/bull/releases` — Confirmed `@nestjs/bullmq` v11.0.4 latest, bullmq v5.61.0 peer dep
- Multiple WhatsApp Cloud API sources confirming `GET /{phone-number-id}?fields=display_phone_number,verified_name` endpoint pattern
- `https://developers.meta.com` (blocked, derived from secondary sources) — Graph API v21-v23 phone number endpoint

### Tertiary (LOW confidence — flag for validation)
- NestJS v10 + BullMQ v11 compatibility: no official declaration found, based on peer dep declarations + community reports

---

## Metadata

**Confidence breakdown:**
- Standard stack (BullMQ + @nestjs/bullmq): HIGH — official docs + multiple verified sources
- Architecture patterns: HIGH — verified from official NestJS BullMQ guide and implementation articles
- AES-256-GCM encryption: HIGH — Node.js built-in, well-documented, multiple sources agree
- Meta validation endpoint: MEDIUM — blocked from official docs, confirmed from multiple secondary sources
- NestJS v10 + BullMQ v11 compatibility: LOW — derived from peer dependencies only, requires smoke test

**Research date:** 2026-02-23
**Valid until:** 2026-04-23 (stable libraries; Meta API version check recommended at 60 days)
