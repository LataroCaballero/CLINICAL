---
phase: 04-whatsapp-etapas-crm-automaticas
plan: "02"
subsystem: whatsapp-backend
tags: [whatsapp, bullmq, webhook, meta-api, crm, pdf]
dependency_graph:
  requires: [04-01]
  provides: [whatsapp-send-api, whatsapp-webhook, whatsapp-thread-api, presupuesto-pdf-public]
  affects: [04-03, 04-04, 04-05]
tech_stack:
  added: []
  patterns: [bullmq-processor, meta-graph-api, webhook-pattern, public-endpoint]
key_files:
  created:
    - backend/src/modules/whatsapp/dto/send-wa-message.dto.ts
    - backend/src/modules/whatsapp/whatsapp-webhook.controller.ts
  modified:
    - backend/src/modules/whatsapp/whatsapp.service.ts
    - backend/src/modules/whatsapp/whatsapp.controller.ts
    - backend/src/modules/whatsapp/processors/whatsapp-message.processor.ts
    - backend/src/modules/whatsapp/whatsapp.module.ts
    - backend/src/modules/presupuestos/presupuesto-public.controller.ts
decisions:
  - "send-whatsapp-message job receives phoneNumberId+accessToken in job.data (not re-fetched) — decryption happens in service at enqueue time, processor has no crypto dependency"
  - "hasUnreadWA field skipped — not present in Prisma schema; plan noted to check schema first"
  - "PrismaModule is @Global() — no explicit import needed in WhatsappModule"
  - "Inbound phone matching uses last 8 digits (telefono contains last8) — robust against country code prefix format variations"
metrics:
  duration: 4min
  completed: 2026-02-28
  tasks_completed: 2
  files_modified: 7
---

# Phase 4 Plan 02: WhatsApp Cloud API Backend Summary

Full WhatsApp Cloud API backend infrastructure implementing the Meta Graph API integration, BullMQ job processors, webhook handling, and public PDF delivery endpoint.

## What Was Built

### New Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /whatsapp/mensajes | ADMIN/PROFESIONAL/SECRETARIA | Send template message (enqueues job) |
| POST | /whatsapp/mensajes/free-text | ADMIN/PROFESIONAL/SECRETARIA | Send free-text reply |
| GET | /whatsapp/mensajes/:pacienteId | ADMIN/PROFESIONAL/SECRETARIA | Message thread with direccion field |
| GET | /whatsapp/templates | ADMIN/PROFESIONAL/SECRETARIA | List APPROVED templates from Meta |
| POST | /whatsapp/mensajes/:id/retry | ADMIN/PROFESIONAL/SECRETARIA | Re-queue failed message |
| POST | /whatsapp/presupuesto/:id/send | ADMIN/PROFESIONAL/SECRETARIA | Send presupuesto PDF via WhatsApp |
| GET | /webhook/whatsapp | PUBLIC (no auth) | Meta hub.challenge verification |
| POST | /webhook/whatsapp | PUBLIC (no auth) | Meta webhook events (async via BullMQ) |
| GET | /presupuestos/public/:id/pdf | PUBLIC (no auth) | PDF buffer for Meta document delivery |

### BullMQ Processor Job Types

**`send-whatsapp-message`**
- Reads MensajeWhatsApp from DB (skips if not PENDIENTE — idempotency)
- Determines message type: template / free-text / document from job.data
- POSTs to `graph.facebook.com/v21.0/{phoneNumberId}/messages`
- On success: updates estado=ENVIADO, waMessageId, sentAt
- On failure: updates estado=FALLIDO, errorMsg; re-throws for BullMQ retry (exponential backoff)

**`process-webhook`**
- Parses Meta webhook body structure: `entry[0].changes[0].value`
- Status updates (sent/delivered/read/failed): `updateMany` by waMessageId
- Inbound messages: create MensajeWhatsApp(INBOUND) + ContactoLog(MENSAJE) + set temperatura=CALIENTE

### Service Methods Added to WhatsappService

- `sendTemplateMessage()` — validates opt-in, creates PENDIENTE record, enqueues
- `sendFreeText()` — same pattern, tipo=CUSTOM, no template
- `sendPresupuestoPdf()` — tipo=PRESUPUESTO, document URL pattern
- `listApprovedTemplates()` — GET from Meta WABA API with APPROVED filter
- `getMessageThread()` — findMany ordered by createdAt asc
- `retryMessage()` — ownership check + reset PENDIENTE + re-enqueue
- `getDecryptedConfig()` — private, fetches+decrypts WABA credentials

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one minor adaptation:

**1. [Schema check] hasUnreadWA field not in schema**
- **Found during:** Task 2
- **Issue:** Plan noted to check if `hasUnreadWA` field exists before using it
- **Fix:** Field confirmed absent from schema.prisma — step skipped as directed by plan
- **Impact:** No functional regression; field was only mentioned as optional step

**2. [Architecture clarification] PrismaService injection via @Global()**
- **Found during:** Task 2 (WhatsappModule update)
- **Fix:** PrismaModule is @Global() so PrismaService is available without explicit import — removed PrismaModule from WhatsappModule imports to follow existing project pattern

**3. [Design decision] Decryption in service, not processor**
- **Found during:** Task 2 (processor implementation)
- **Decision:** Rather than having the processor fetch and decrypt WABA credentials itself (which would require EncryptionService injection into processor), the service decrypts at enqueue time and passes phoneNumberId+accessToken in the job payload
- **Rationale:** Simpler processor, cleaner separation; credentials are transient in job queue (not persisted differently than encrypted in DB for this use case)

## Self-Check: PASSED

All created files exist. Both task commits verified:
- `f2577f3` — feat(04-02): WhatsApp service methods and send/thread/templates endpoints
- `85c9a0d` — feat(04-02): webhook controller, BullMQ processor, public PDF endpoint
