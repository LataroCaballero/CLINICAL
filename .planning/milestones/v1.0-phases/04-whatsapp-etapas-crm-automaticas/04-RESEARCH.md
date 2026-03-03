# Phase 4: WhatsApp + Etapas CRM Automaticas - Research

**Researched:** 2026-02-27
**Domain:** Meta WhatsApp Cloud API (v21.0), webhook handling, BullMQ job processing, NestJS event hooks, CRM schema migration
**Confidence:** MEDIUM-HIGH (Meta API stable; webhook patterns verified; schema changes well-understood)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Message send entry points**: Coordinator can trigger WhatsApp send from both patient profile page AND appointment list/turno view.
- **Template selection flow**: Opens a modal with preview — coordinator reads content before confirming. Modal has "Send" button. Default channel is WhatsApp; upfront choice to send via email instead is available in the modal (not just as post-failure fallback).
- **Opt-in gate**: If patient does not have WhatsApp opt-in → button disabled with tooltip ("No tiene opt-in"). Same for "Enviar presupuesto por WA" button.
- **Message thread location**: Dedicated "Mensajes" tab inside patient profile (currently the `MensajesView` exists in PatientDrawer as a view, but serves internal messages). Phase 4 replaces/extends it with WhatsApp chat-style bubbles.
- **Chat-style bubbles**: Sent messages (coordinator) right, patient replies left, grouped by date. Coordinator can send free-text replies within 24h window.
- **Thread refresh**: Manual refresh button only — no auto-polling or WebSocket.
- **Message bubble content**: content + timestamp + WhatsApp delivery icon (single check=sent, double=delivered, blue double=read, red X=failed).
- **Failed message UX**: Toast notification + bubble marked red/failed with inline retry button.
- **Patient reply notifications**: Unread indicator on patient row (list), unread indicator on Kanban card, global in-app notification for logged-in coordinator.
- **PDF presupuesto via WhatsApp**: Manual button inside presupuesto detail ("Enviar por WhatsApp"). No preview step. After sending, appears in thread as bubble with attachment icon.
- **CRM stage simplification (Phase 3 patch)**:
  - REMOVE: `SEGUIMIENTO_ACTIVO` from EtapaCRM enum
  - ADD: `PROCEDIMIENTO_REALIZADO` — NOT shown in Kanban; only for post-surgery tracking
  - Auto-transition to `PROCEDIMIENTO_REALIZADO` when turno type "Cirugía" is marked completed (cerrarSesion or finalizarTurno with esCirugia=true)
  - Requires Prisma migration + kanban filter update + new auto-transition in turnos module
- **"Caliente"**: TemperaturaPaciente value, not an EtapaCRM stage — no change to temperature enum

### Claude's Discretion

- Exact tab layout within patient profile (position of "Mensajes" tab relative to existing tabs)
- Loading skeleton for message thread
- Error state if WhatsApp API is unreachable
- Exact wording of tooltip and toast messages
- How free-text reply handles the 24h window expiry (disable input or show warning)

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within Phase 4 scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WA-01 | Coordinator can send a WhatsApp message to a patient from their profile using Meta-approved templates | Meta Cloud API POST `/{phoneNumberId}/messages` with `type: "template"` — see Architecture Patterns |
| WA-02 | System shows delivery status of each sent message (sent, delivered, read, failed) | MensajeWhatsApp model already has `estado` field (PENDIENTE/ENVIADO/ENTREGADO/LEIDO/FALLIDO); webhook status updates via POST webhook handler |
| WA-03 | Incoming patient WhatsApp replies are recorded in patient contact log | Webhook `messages[]` object (inbound) → create ContactoLog + MensajeWhatsApp with direction INBOUND |
| WA-04 | System correctly handles Meta webhooks to update message status in real time | GET verification endpoint (hub.mode + hub.verify_token + hub.challenge) + POST handler returning 200 immediately, async processing via BullMQ |
| WA-05 | If a message fails via WhatsApp, system notifies coordinator with option to retry or send by email | Failed status from webhook → update MensajeWhatsApp.estado=FALLIDO → frontend toast + retry button in bubble |
| CRM-01 | When a turno is created for a patient without a CRM stage, automatically assign "Consulta agendada" | Hook into `TurnosService.crearTurno()` — after turno creation, if `paciente.etapaCRM` is null, set to `TURNO_AGENDADO` |
| CRM-02 | When a turno attendance is recorded (LiveTurno completed / cerrarSesion), CRM stage auto-advances to "Consulta realizada" | Hook into `TurnosService.cerrarSesion()` — on finalization, if `paciente.etapaCRM === TURNO_AGENDADO`, advance to `CONSULTADO` |
| CRM-05 | When a patient replies to a WhatsApp message, their temperature auto-rises to "Caliente" | Webhook inbound message → `paciente.temperatura = CALIENTE` via prisma.paciente.update |
</phase_requirements>

---

## Summary

Phase 4 integrates Meta WhatsApp Cloud API (v21.0) directly — no BSP intermediary (decision from Phase 1). The backend already has the `ConfiguracionWABA` model with encrypted credentials, `MensajeWhatsApp` model with status tracking, and a `WhatsappMessageProcessor` BullMQ worker stub (`TODO Phase 4`). The processor stub for `send-whatsapp-message` already exists and needs implementation.

The two primary technical challenges are: (1) the Meta webhook surface, which requires a public HTTPS endpoint with GET verification and POST event handling that returns 200 immediately before async processing; and (2) the CRM schema migration, which involves removing `SEGUIMIENTO_ACTIVO` and adding `PROCEDIMIENTO_REALIZADO` from the `EtapaCRM` enum — PostgreSQL enum alterations in production require careful migration sequencing.

The frontend already has `MensajesView` in the PatientDrawer (`view === "mensajes"`) rendering a `ChatView` component for internal messages. Phase 4 needs to replace or extend this with a WhatsApp-specific thread component that renders delivery icons and supports template sends — distinct from the existing internal messaging chat.

**Primary recommendation:** Implement backend first (webhook endpoint + BullMQ processor + CRM auto-transitions), then build frontend WhatsApp chat thread separately from the existing internal messages system, reusing the PatientDrawer `view === "mensajes"` slot.

---

## Standard Stack

### Core (already installed in project)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@nestjs/bullmq` | 11.0.4 | BullMQ queue for async WA send jobs | Installed (Phase 1) |
| `bullmq` | 5.70.1 | Worker processor for WA messages | Installed (Phase 1) |
| `axios` | (NestJS default) | Call Meta Graph API | Already used in WhatsappService |
| `@nestjs/schedule` | (installed) | Cron jobs / scheduler | Already in PacientesModule |
| `@tanstack/react-query` | (installed) | Data fetching hooks for WA thread | Already used |
| `shadcn/ui` + Radix | (installed) | Dialog (template modal), Tooltip (opt-in gate) | Already used |
| `sonner` or `react-hot-toast` | (check) | Toast for failed message notification | Verify installed |

### Supporting (needs install check)

| Library | Purpose | When to Use |
|---------|---------|-------------|
| File upload / presigned URL | PDF document must be publicly accessible for WA API | Only if PDFs are stored locally — verify current Archivo storage |

### New Dependencies to Verify

```bash
# Check if sonner (toast) is already in frontend
grep -r "sonner\|react-hot-toast\|useToast" frontend/src --include="*.ts" --include="*.tsx" | head -5

# No new backend dependencies needed — axios and BullMQ already present
```

**Installation:** No new npm packages required for core WA functionality — axios + BullMQ already installed. Verify PDF hosting (Archivo model has `url` field — if it's an S3/CDN URL it's already public; if local, needs presigned URL approach).

---

## Architecture Patterns

### Recommended Backend Structure

```
backend/src/modules/whatsapp/
├── crypto/
│   └── encryption.service.ts        # existing
├── dto/
│   ├── save-waba-config.dto.ts      # existing
│   ├── waba-config-response.dto.ts  # existing
│   ├── send-wa-message.dto.ts       # NEW: {pacienteId, templateName, templateParams?, tipo}
│   └── wa-webhook-payload.dto.ts    # NEW: typed webhook payload
├── processors/
│   └── whatsapp-message.processor.ts  # existing stub — needs implementation
├── whatsapp.module.ts               # existing — add WebhookController
├── whatsapp.service.ts              # existing — add sendTemplateMessage(), sendFreeText(), listTemplates()
├── whatsapp.controller.ts           # existing — add POST /whatsapp/mensajes, GET /whatsapp/mensajes/:pacienteId
└── whatsapp-webhook.controller.ts   # NEW: GET /webhook/whatsapp + POST /webhook/whatsapp
```

```
backend/src/modules/turnos/
└── turnos.service.ts  # existing — add CRM auto-transitions in crearTurno() and cerrarSesion()
```

```
backend/src/prisma/migrations/
└── YYYYMMDD_crm_schema_v2/         # NEW: SEGUIMIENTO_ACTIVO removal, PROCEDIMIENTO_REALIZADO addition
    └── migration.sql
```

### Pattern 1: Meta API — Send Template Message

**What:** POST to Meta Graph API to send a pre-approved template to a patient's phone.
**Endpoint:** `POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages`
**Auth:** `Bearer {accessToken}` (decrypted from ConfiguracionWABA.accessTokenEncrypted)

```typescript
// Source: Meta Cloud API official docs + WhatsApp SDK reference
// backend/src/modules/whatsapp/whatsapp.service.ts

async sendTemplateMessage(
  profesionalId: string,
  pacienteId: string,
  templateName: string,
  languageCode: string = 'es',
  components?: object[],
): Promise<string> { // returns waMessageId
  const config = await this.getDecryptedConfig(profesionalId);
  const paciente = await this.prisma.paciente.findUniqueOrThrow({
    where: { id: pacienteId },
    select: { telefono: true, whatsappOptIn: true },
  });

  if (!paciente.whatsappOptIn) throw new BadRequestException('Paciente sin opt-in');

  const payload = {
    messaging_product: 'whatsapp',
    to: paciente.telefono.replace(/\D/g, ''), // strip non-digits
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components ? { components } : {}),
    },
  };

  const res = await axios.post(
    `https://graph.facebook.com/${this.META_API_VERSION}/${config.phoneNumberId}/messages`,
    payload,
    { headers: { Authorization: `Bearer ${config.accessToken}` } },
  );

  const waMessageId: string = res.data.messages[0].id;
  return waMessageId;
}
```

### Pattern 2: Meta API — Send Document (PDF Presupuesto)

**What:** Send a PDF document using a template with document header component.
**Constraint:** PDF must be at a publicly accessible HTTPS URL. The `Archivo.url` field should already hold a CDN/S3 URL.

```typescript
// Source: Meta Cloud API official docs
// components array for document header template
const components = [
  {
    type: 'header',
    parameters: [
      {
        type: 'document',
        document: {
          link: pdfPublicUrl,
          filename: `Presupuesto_${presupuestoId}.pdf`,
        },
      },
    ],
  },
  // optional body parameters
];
```

**Alternative (no template approval needed):** Use `type: "document"` for a plain document send within 24h customer service window (free-form session):
```typescript
{
  messaging_product: 'whatsapp',
  to: phone,
  type: 'document',
  document: {
    link: pdfPublicUrl,
    caption: 'Tu presupuesto',
    filename: 'Presupuesto.pdf',
  },
}
```

### Pattern 3: Meta Webhook — GET Verification

**What:** Meta sends GET request to verify the endpoint before sending events.
**When:** On initial webhook URL registration in Meta Business Dashboard.

```typescript
// Source: Meta official webhook docs
// backend/src/modules/whatsapp/whatsapp-webhook.controller.ts

@Get('webhook/whatsapp')
verifyWebhook(@Query() query: any, @Res() res: Response) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WA_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Forbidden');
}
```

### Pattern 4: Meta Webhook — POST Event Handling

**What:** Meta POSTs status updates (DELIVERED, READ, FAILED) and inbound messages.
**Critical rule:** Return HTTP 200 immediately, then process asynchronously.

```typescript
// Source: Meta official webhook docs + community best practices
// Webhook payload structure for status update:
// entry[].changes[].value.statuses[]: { id, recipient_id, status, timestamp }
// status values: 'sent' | 'delivered' | 'read' | 'failed'
//
// Webhook payload structure for inbound message:
// entry[].changes[].value.messages[]: { from, id, timestamp, text.body, type }

@Post('webhook/whatsapp')
@HttpCode(200) // Always 200 first
async handleWebhook(@Body() body: any): Promise<'OK'> {
  // Enqueue for async processing — never block here
  await this.whatsappQueue.add('process-webhook', body, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
  return 'OK';
}
```

### Pattern 5: CRM Auto-Transitions in TurnosService

**What:** Inject PacientesService or use Prisma directly within crearTurno() and cerrarSesion() to update etapaCRM.

```typescript
// In TurnosService.crearTurno() — after turno creation:
const paciente = await this.prisma.paciente.findUnique({
  where: { id: dto.pacienteId },
  select: { etapaCRM: true },
});
if (!paciente?.etapaCRM) {
  await this.prisma.paciente.update({
    where: { id: dto.pacienteId },
    data: { etapaCRM: EtapaCRM.TURNO_AGENDADO },
  });
}

// In TurnosService.cerrarSesion() — after update:
// Get the turno's pacienteId and check etapaCRM
const turnoFull = await this.prisma.turno.findUnique({
  where: { id: turnoId },
  select: { pacienteId: true, esCirugia: true, paciente: { select: { etapaCRM: true } } },
});
if (turnoFull.esCirugia) {
  // Surgery completed → PROCEDIMIENTO_REALIZADO
  await this.prisma.paciente.update({
    where: { id: turnoFull.pacienteId },
    data: { etapaCRM: EtapaCRM.PROCEDIMIENTO_REALIZADO },
  });
} else if (turnoFull.paciente.etapaCRM === EtapaCRM.TURNO_AGENDADO) {
  // Regular consult completed → CONSULTADO
  await this.prisma.paciente.update({
    where: { id: turnoFull.pacienteId },
    data: { etapaCRM: EtapaCRM.CONSULTADO },
  });
}
```

### Pattern 6: CRM Enum Migration — PostgreSQL Enum Alteration

**What:** Prisma does NOT support removing enum values via `npx prisma migrate dev` directly — it generates invalid SQL for removal. Must write raw SQL.

**SQL for SEGUIMIENTO_ACTIVO removal + PROCEDIMIENTO_REALIZADO addition:**
```sql
-- Step 1: Add new value
ALTER TYPE "EtapaCRM" ADD VALUE 'PROCEDIMIENTO_REALIZADO';

-- Step 2: Migrate any existing SEGUIMIENTO_ACTIVO patients to another stage
UPDATE "Paciente" SET "etapaCRM" = 'CONSULTADO'
WHERE "etapaCRM" = 'SEGUIMIENTO_ACTIVO';

-- Step 3: PostgreSQL enum value removal requires recreation
-- Cannot do ALTER TYPE ... DROP VALUE directly in PostgreSQL < 16
-- For PostgreSQL 16+: ALTER TYPE "EtapaCRM" RENAME VALUE 'SEGUIMIENTO_ACTIVO' TO '_deprecated_SEGUIMIENTO_ACTIVO'; -- workaround
-- Or full recreate:
ALTER TYPE "EtapaCRM" RENAME TO "EtapaCRM_old";
CREATE TYPE "EtapaCRM" AS ENUM (
  'NUEVO_LEAD', 'TURNO_AGENDADO', 'CONSULTADO',
  'PRESUPUESTO_ENVIADO', 'PROCEDIMIENTO_REALIZADO',
  'CONFIRMADO', 'PERDIDO'
);
ALTER TABLE "Paciente" ALTER COLUMN "etapaCRM" TYPE "EtapaCRM"
  USING "etapaCRM"::text::"EtapaCRM";
ALTER TABLE "ContactoLog" ALTER COLUMN "etapaCRMPost" TYPE "EtapaCRM"
  USING "etapaCRMPost"::text::"EtapaCRM";
DROP TYPE "EtapaCRM_old";
```

**Confidence:** HIGH — this is the standard PostgreSQL pattern for enum recreation. Must also update Prisma schema enum definition.

### Pattern 7: List Templates from Meta Business Management API

**What:** Fetch approved templates to populate the template selection modal.
**Endpoint:** `GET https://graph.facebook.com/v21.0/{wabaId}/message_templates?fields=name,language,status,components&status=APPROVED`

```typescript
// backend/src/modules/whatsapp/whatsapp.service.ts
async listApprovedTemplates(profesionalId: string) {
  const config = await this.getDecryptedConfig(profesionalId);
  if (!config.wabaId) throw new BadRequestException('WABA ID no configurado');

  const res = await axios.get(
    `https://graph.facebook.com/${this.META_API_VERSION}/${config.wabaId}/message_templates`,
    {
      params: { fields: 'name,language,status,components', status: 'APPROVED' },
      headers: { Authorization: `Bearer ${config.accessToken}` },
    },
  );
  return res.data.data; // array of templates
}
```

### Pattern 8: MensajeWhatsApp Thread Query

**What:** Backend endpoint to list WA messages for a patient as a thread.
**Endpoint:** `GET /whatsapp/mensajes/:pacienteId`

```typescript
// Needs direction field to distinguish sent vs received
// MensajeWhatsApp model currently has no `direction` field
// Add: direction String @default("OUTBOUND") — OR derive from whether content was sent by coordinator
// Recommendation: add `direccion` enum field: OUTBOUND | INBOUND
```

**Action needed:** Add `direccion` field to `MensajeWhatsApp` model (and migration) to distinguish coordinator-sent vs patient-received messages for bubble direction in UI.

### Anti-Patterns to Avoid

- **Blocking on webhook POST:** Never await heavy processing in the webhook handler. Return 200 first, enqueue job, then process asynchronously.
- **Storing tokens in plaintext:** Already handled by EncryptionService — maintain this pattern for `getDecryptedConfig()`.
- **Calling crearTurno CRM logic on every turno type:** Only set `TURNO_AGENDADO` if `etapaCRM` is null — do not overwrite a patient already in a later stage.
- **Re-registering BullMQ queue:** WhatsappModule already exports `BullModule` — import WhatsappModule into TurnosModule if needed rather than re-registering the queue.
- **Phone number format:** Meta requires international format without `+`, spaces, or dashes (e.g., `5491112345678`). Strip all non-digits before sending.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Message deduplication (duplicate webhooks) | Custom lock table | `waMessageId` as dedup key in processor | Meta sends duplicate webhooks; upsert by waMessageId prevents double-processing |
| PDF public URL generation | Custom file server | Use existing `Archivo.url` (CDN/S3) | URLs already stored per Phase 3 PDF work |
| Webhook signature verification | Custom HMAC lib | Node.js built-in `crypto.createHmac` | Meta signs webhook payloads with `X-Hub-Signature-256` header |
| 24h window enforcement | Timer/cron | Frontend input disable based on last inbound message timestamp | Backend returns `lastInboundAt` per conversation |
| Template preview rendering | Parse template components manually | Map `components` array from Meta API response | Components are structured; just display `body[0].text` with placeholders |

---

## Common Pitfalls

### Pitfall 1: Enum Value Removal in PostgreSQL
**What goes wrong:** `npx prisma migrate dev` fails or generates invalid migration SQL when removing an enum value. Prisma cannot drop enum values in PostgreSQL < 16; it requires full type recreation.
**Why it happens:** PostgreSQL design — you can add enum values but not remove them without recreating the type.
**How to avoid:** Write the migration SQL manually (see Pattern 6 above). Use `prisma migrate dev --create-only` to create an empty migration file, then add the raw SQL.
**Warning signs:** Migration fails with "cannot drop type" or type cast errors.

### Pitfall 2: EtapaCRM Enum References in Multiple Tables
**What goes wrong:** After recreating EtapaCRM enum, the `ContactoLog.etapaCRMPost` column also uses it — missing this column in the migration causes the `ALTER TABLE ... USING` to fail.
**Why it happens:** Enum is referenced by both `Paciente.etapaCRM` and `ContactoLog.etapaCRMPost`.
**How to avoid:** Update BOTH columns in the migration (and any other tables using EtapaCRM).
**Warning signs:** `ERROR: column "etapaCRMPost" cannot be cast automatically to type "EtapaCRM"`.

### Pitfall 3: Webhook Endpoint Without Auth Guard
**What goes wrong:** The existing `WhatsappController` uses `@Auth()` decorator — the webhook endpoint must NOT require JWT auth (Meta sends unauthenticated requests).
**Why it happens:** Copying the controller pattern from the existing authenticated endpoints.
**How to avoid:** Create a separate `WhatsappWebhookController` without `@Auth()` decorator. Validate only via `hub.verify_token` (GET) and `X-Hub-Signature-256` HMAC (POST).
**Warning signs:** Meta webhook registration fails with 403 during the GET challenge.

### Pitfall 4: Phone Number Format Mismatch
**What goes wrong:** Meta requires E.164 format without `+` (e.g., `5491112345678`), but `Paciente.telefono` may store `+54 9 11 1234-5678` or other formats.
**Why it happens:** No normalization enforced at patient creation.
**How to avoid:** Always strip non-digits: `telefono.replace(/\D/g, '')` before sending to Meta API.
**Warning signs:** Meta returns error code 131030 ("Recipient phone number not in allowed list") or 131026 ("Message undeliverable").

### Pitfall 5: MensajeWhatsApp Missing Direction Field
**What goes wrong:** Cannot distinguish coordinator-sent messages from patient-replied messages in the thread UI (needed for left/right bubble direction).
**Why it happens:** Current `MensajeWhatsApp` model has `tipo` (PRESUPUESTO, RECORDATORIO_TURNO, etc.) but no `direccion` field.
**How to avoid:** Add `direccion` field to MensajeWhatsApp in this phase's migration. Store inbound messages from webhook with `direccion = 'INBOUND'`, outbound with `direccion = 'OUTBOUND'`.

### Pitfall 6: Template Approval Lead Time
**What goes wrong:** Phase 4 cannot deploy messaging if templates are not yet approved by Meta.
**Why it happens:** Meta template review takes 24-48h; some categories take longer.
**How to avoid:** Submit templates BEFORE starting Phase 4 coding. At minimum have `hello_world` (pre-approved by Meta) for smoke testing. The system must gracefully handle empty template list.

### Pitfall 7: kanban Query Still Including SEGUIMIENTO_ACTIVO
**What goes wrong:** After removing the enum value, the Kanban query `WHERE etapaCRM IN (...)` may have a hardcoded reference to `SEGUIMIENTO_ACTIVO` or frontend may try to render a column for it.
**Why it happens:** The CRM kanban endpoint and `KanbanBoard.tsx` were built with `SEGUIMIENTO_ACTIVO` in mind.
**How to avoid:** Audit `GET /pacientes/kanban` service and `KanbanBoard.tsx` for hardcoded references. Remove `SEGUIMIENTO_ACTIVO` column; exclude `PROCEDIMIENTO_REALIZADO` from kanban stage list.

---

## Code Examples

### Existing Processor Stub (ready for implementation)

```typescript
// Source: backend/src/modules/whatsapp/processors/whatsapp-message.processor.ts (existing)
// The `send-whatsapp-message` case is already registered — just needs implementation:
case 'send-whatsapp-message':
  // TODO Phase 4: implementar envío real via WABA API
  this.logger.log(`[Phase 1 smoke test] job procesado: ${JSON.stringify(job.data)}`);
  break;
```

Phase 4 replaces the TODO with actual API call + MensajeWhatsApp DB update.

### Frontend: WhatsApp Thread Hook Pattern

```typescript
// frontend/src/hooks/useWAThread.ts — new hook following existing pattern
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useWAThread(pacienteId: string) {
  return useQuery({
    queryKey: ['wa-thread', pacienteId],
    queryFn: async () => {
      const res = await api.get(`/whatsapp/mensajes/${pacienteId}`);
      return res.data;
    },
    enabled: !!pacienteId,
  });
}

export function useSendWATemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { pacienteId: string; templateName: string; tipo: string }) => {
      const res = await api.post('/whatsapp/mensajes', data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wa-thread', variables.pacienteId] });
    },
  });
}
```

### Frontend: Delivery Status Icons Pattern

```typescript
// Delivery icon per EstadoMensajeWA value — following WhatsApp conventions
const DeliveryIcon = ({ estado }: { estado: string }) => {
  if (estado === 'PENDIENTE') return <Check className="h-3 w-3 text-gray-400" />;           // single check
  if (estado === 'ENVIADO')   return <CheckCheck className="h-3 w-3 text-gray-400" />;      // double check gray
  if (estado === 'ENTREGADO') return <CheckCheck className="h-3 w-3 text-gray-500" />;      // double check darker
  if (estado === 'LEIDO')     return <CheckCheck className="h-3 w-3 text-blue-500" />;      // double check blue
  if (estado === 'FALLIDO')   return <XCircle className="h-3 w-3 text-red-500" />;          // red X
  return null;
};
// Lucide-react has Check, CheckCheck, XCircle — already installed
```

### Existing PatientDrawer Integration Point

```typescript
// frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx (existing)
// The "mensajes" view slot already exists:
{view === "mensajes" && paciente &&
  <MensajesView
    pacienteId={paciente.id}
    pacienteNombre={paciente.nombreCompleto}
    onBack={() => setView("default")}
  />
}
// MensajesView currently renders internal ChatView.
// Phase 4: Replace with WAThreadView (WhatsApp-specific) OR
// keep MensajesView as a tab chooser between internal/WA — but CONTEXT says dedicated "Mensajes" tab = WhatsApp chat
// Recommendation: rename current internal view to "InternalChat", make "mensajes" tab = WAThreadView
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| BSP intermediary (360dialog, Twilio) | Meta Cloud API direct | Phase 1 decision | No per-message BSP fee; requires own WABA registration |
| Polling for message status | Webhook push from Meta | Standard since Cloud API launch | Webhook returns status in near real-time (seconds) |
| PostgreSQL enum removal via ALTER | Full type recreation | PostgreSQL < 16 limitation | Must write raw migration SQL; Prisma can't generate it |
| Template-only messaging (24h cold open) | Template + free-text in session window | Meta policy | Free text allowed within 24h of patient reply; template required for cold outreach |

**Deprecated/outdated:**
- `SEGUIMIENTO_ACTIVO`: Removed in Phase 4 schema migration per user decision.
- `test-queue` endpoint in WhatsappController: Should be removed or guarded as ADMIN-only post-Phase 1.

---

## Open Questions

1. **PDF URL accessibility for Meta**
   - What we know: `Archivo.url` stores the PDF URL (from Phase 3 PDFKit work); presupuesto PDF is generated server-side.
   - What's unclear: Whether the URL is a public S3/CDN URL or a local/signed URL that expires. Meta cannot access signed URLs after they expire.
   - Recommendation: Read Phase 3 `PresupuestoPdfService` to verify how PDFs are stored. If local, add a public `/presupuestos/:id/pdf` endpoint that serves the file without auth for WA delivery.

2. **Webhook HMAC verification**
   - What we know: Meta signs POST payloads with `X-Hub-Signature-256` header (SHA-256 HMAC of body using app secret).
   - What's unclear: The app secret (`WA_APP_SECRET`) is separate from the access token and needs to be stored in env vars.
   - Recommendation: Add `WA_APP_SECRET` and `WA_WEBHOOK_VERIFY_TOKEN` to `.env` and document both. HMAC verification is optional but strongly recommended for production.

3. **Unread indicators in Kanban/PatientCard**
   - What we know: Context decision requires unread indicators on Kanban patient cards.
   - What's unclear: The `PatientCard.tsx` in `frontend/src/components/crm/` needs to receive unread WA message count — currently has no WA awareness.
   - Recommendation: Add `unreadWA?: number` prop to PatientCard; compute from `GET /pacientes/kanban` which should include WA unread count per patient.

4. **Global coordinator notification channel**
   - What we know: Context requires global in-app notification when patient replies.
   - What's unclear: No real-time push channel exists (WebSocket/SSE excluded this phase). The manual refresh pattern means the coordinator won't see new replies until refresh.
   - Recommendation: Use polling on the notifications endpoint (short interval, e.g., 30s) or a badge counter on the "Mensajes" nav item that increments via query invalidation. This is Claude's Discretion area.

5. **EtapaCRM enum value: CALIENTE**
   - What we know: Current schema has `CALIENTE` as an `EtapaCRM` value AND `TemperaturaPaciente.CALIENTE` as a separate field. Context says "Caliente is TemperaturaPaciente, not a CRM stage."
   - What's unclear: Should `EtapaCRM.CALIENTE` also be removed from the enum during Phase 4 migration? It was in the Phase 3 schema but the context says it's not a stage.
   - Recommendation: Confirm with user before migration — if `EtapaCRM.CALIENTE` is unused in production, remove it in the Phase 4 migration to avoid confusion. If it has production data, migrate to another stage first.

---

## Sources

### Primary (HIGH confidence)
- Meta Cloud API official docs (accessed via WebSearch + WebFetch) — send message endpoint, template structure, webhook patterns
- `backend/src/prisma/schema.prisma` — existing models (MensajeWhatsApp, ConfiguracionWABA, EtapaCRM, TipoMensajeWA, EstadoMensajeWA)
- `backend/src/modules/whatsapp/whatsapp.service.ts` — existing validateWABACredentials and Meta API call pattern (axios + Bearer token)
- `backend/src/modules/whatsapp/processors/whatsapp-message.processor.ts` — existing BullMQ processor stub
- `backend/src/modules/turnos/turnos.service.ts` — crearTurno(), cerrarSesion() hooks for CRM transitions
- `frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx` — existing view slot for "mensajes"
- `frontend/src/components/mensajes/ChatView.tsx` — existing internal chat component (pattern reference)
- `frontend/src/hooks/useWabaConfig.ts`, `useUpdateWhatsappOptIn.ts` — existing WA hook patterns

### Secondary (MEDIUM confidence)
- WhatsApp GitHub SDK docs (`whatsapp.github.io/WhatsApp-Nodejs-SDK`) — template message JSON structure
- Meta Business Management API (via WebSearch) — list templates endpoint `/{wabaId}/message_templates`
- hookdeck.com guide on WhatsApp Webhooks — webhook structure, status values, dedup strategy
- Medium / DEV articles on webhook verification pattern — hub.mode, hub.verify_token, hub.challenge

### Tertiary (LOW confidence)
- PostgreSQL enum recreation pattern — verified by cross-referencing known PostgreSQL behavior (< 16 limitation) and existing Phase 3 migration SQL patterns in the project.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — same stack as phases 1-3, no new dependencies
- Architecture (Meta API calls): MEDIUM-HIGH — endpoint structure verified, exact response shape from docs
- Architecture (webhook): MEDIUM — structure verified from multiple sources; HMAC verification details need prod validation
- Enum migration: HIGH — PostgreSQL behavior is deterministic; pattern is well-known
- CRM auto-transitions: HIGH — direct Prisma update inside existing service methods
- Pitfalls: HIGH — most are project-specific or based on verified DB behavior

**Research date:** 2026-02-27
**Valid until:** 2026-03-30 (Meta API version stability; 30-day estimate for stable API)
