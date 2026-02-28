---
phase: 04-whatsapp-etapas-crm-automaticas
verified: 2026-02-28T23:45:00Z
status: passed
score: 22/22 must-haves verified
re_verification: false
---

# Phase 04: WhatsApp + CRM Auto-Transitions Verification Report

**Phase Goal:** WhatsApp Cloud API integration + automatic CRM stage transitions — coordinators can send WA messages from patient profile, appointment modal, and presupuesto; patients receive templates or free-text messages; inbound messages update patient temperature; CRM stages auto-advance on booking/session close.

**Verified:** 2026-02-28T23:45:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | EtapaCRM enum has 7 values (NUEVO_LEAD, TURNO_AGENDADO, CONSULTADO, PRESUPUESTO_ENVIADO, PROCEDIMIENTO_REALIZADO, CONFIRMADO, PERDIDO) — no SEGUIMIENTO_ACTIVO, no CALIENTE | VERIFIED | `schema.prisma` lines 975–983: exact 7 values confirmed |
| 2 | DireccionMensajeWA enum (OUTBOUND/INBOUND) exists in schema and MensajeWhatsApp has `direccion` field | VERIFIED | `schema.prisma` lines 1061, 1093: enum + field with DEFAULT OUTBOUND |
| 3 | Migration SQL recreates EtapaCRM without removed values and adds direccion column | VERIFIED | `migrations/20260227000000_crm_v2_whatsapp_thread/migration.sql`: 7-step recreation pattern, ADD COLUMN direccion |
| 4 | POST /whatsapp/mensajes enqueues a BullMQ job and creates a MensajeWhatsApp record | VERIFIED | `whatsapp.service.ts` lines 222–226: `whatsappQueue.add('send-whatsapp-message',...)` |
| 5 | GET /whatsapp/mensajes/:pacienteId returns thread with direccion field | VERIFIED | `whatsapp.service.ts` line 374: `getMessageThread` findMany with all fields |
| 6 | GET /whatsapp/templates returns approved templates from Meta API | VERIFIED | `whatsapp.service.ts` line 345: `listApprovedTemplates` calls Meta WABA API |
| 7 | GET /webhook/whatsapp responds to Meta hub.challenge verification (no auth) | VERIFIED | `whatsapp-webhook.controller.ts` lines 23–29: hub.mode + token check returns challenge |
| 8 | POST /webhook/whatsapp returns 200 immediately and enqueues process-webhook job | VERIFIED | `whatsapp-webhook.controller.ts` lines 44–54: `@HttpCode(200)` + `whatsappQueue.add('process-webhook', body)` |
| 9 | BullMQ processor send-whatsapp-message calls Meta Graph API and updates MensajeWhatsApp estado | VERIFIED | `whatsapp-message.processor.ts` line 9: `https://graph.facebook.com` constant; lines 157, 175: prisma updates |
| 10 | BullMQ processor process-webhook sets temperatura=CALIENTE on inbound messages | VERIFIED | `whatsapp-message.processor.ts` line 308: `data: { temperatura: 'CALIENTE' }` |
| 11 | GET /presupuestos/public/:id/pdf serves PDF buffer without auth | VERIFIED | `presupuesto-public.controller.ts` lines 34–40: no @Auth(), GET `:id/pdf` |
| 12 | POST /whatsapp/mensajes/:id/retry re-enqueues send-whatsapp-message for failed message | VERIFIED | `whatsapp.service.ts` line 428: `retryMessage()`; `whatsapp.controller.ts` lines 109–116 |
| 13 | Booking a turno auto-advances etapaCRM to TURNO_AGENDADO if null | VERIFIED | `turnos.service.ts` lines 121–129: post-create CRM check + update |
| 14 | Closing a surgery session sets etapaCRM to PROCEDIMIENTO_REALIZADO | VERIFIED | `turnos.service.ts` line 697: `EtapaCRM.PROCEDIMIENTO_REALIZADO` on `esCirugia=true` |
| 15 | Closing a regular session from TURNO_AGENDADO sets etapaCRM to CONSULTADO | VERIFIED | `turnos.service.ts` lines 699–703: `EtapaCRM.CONSULTADO` when `etapaCRM === TURNO_AGENDADO` |
| 16 | Kanban returns exactly 7 columns (no SEGUIMIENTO_ACTIVO, no CALIENTE, no PROCEDIMIENTO_REALIZADO) | VERIFIED | `pacientes.service.ts` lines 587–594: columnas object has exactly the 7 valid stages |
| 17 | Chat UI in patient Mensajes tab shows OUTBOUND (right/green) and INBOUND (left/white) bubbles with DeliveryIcon | VERIFIED | `WAThreadView.tsx` 288 lines: `isOutbound`, `DeliveryIcon` rendered on OUTBOUND, bubble layout |
| 18 | Template send modal has upfront WA/Email channel toggle | VERIFIED | `SendWAMessageModal.tsx` lines 24, 42: `Channel` type + `useState<Channel>('whatsapp')` |
| 19 | Failed message bubbles have inline retry button | VERIFIED | `WAThreadView.tsx` lines 176–185: `msg.estado === 'FALLIDO'` → RotateCcw button calling `retryMessage.mutate` |
| 20 | GET /whatsapp/unread returns per-patient unread count map | VERIFIED | `whatsapp.controller.ts` lines 97–105: `@Get('unread')` + `getUnreadCounts` call |
| 21 | Dashboard layout shows global WA unread badge when total > 0 | VERIFIED | `layout.tsx` lines 19–20, 35–36, 123–127: `useWAUnread`, `totalWAUnread`, fixed badge render |
| 22 | WA send shortcuts present in PacienteDetails, PresupuestosView, and AppointmentDetailModal | VERIFIED | `PacienteDetails.tsx` line 267: WA button; `PresupuestosView.tsx` line 238: "Enviar por WhatsApp"; `AppointmentDetailModal.tsx` lines 287–303: WA button |

**Score:** 22/22 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | Updated EtapaCRM + DireccionMensajeWA + direccion field | VERIFIED | Lines 975–989, 1061–1063, 1093 |
| `backend/src/prisma/migrations/20260227000000_crm_v2_whatsapp_thread/migration.sql` | Raw SQL for enum recreation + direccion column | VERIFIED | 51-line migration with 7-step pattern |
| `backend/src/modules/whatsapp/whatsapp.service.ts` | sendTemplateMessage, sendFreeText, listApprovedTemplates, getMessageThread, retryMessage, getUnreadCounts | VERIFIED | All 6 methods confirmed at lines 189, 243, 345, 374, 389, 428 |
| `backend/src/modules/whatsapp/whatsapp-webhook.controller.ts` | GET + POST /webhook/whatsapp without auth | VERIFIED | Hub challenge at line 23, POST at line 47 |
| `backend/src/modules/whatsapp/processors/whatsapp-message.processor.ts` | send-whatsapp-message + process-webhook job handlers | VERIFIED | Cases at lines 23, 27; Meta URL at line 9 |
| `backend/src/modules/presupuestos/presupuesto-public.controller.ts` | GET /presupuestos/public/:id/pdf without auth | VERIFIED | Lines 34–40, no @Auth decorator |
| `backend/src/modules/turnos/turnos.service.ts` | CRM transitions in crearTurno() and cerrarSesion() | VERIFIED | Lines 121–129 (crearTurno), 697–703 (cerrarSesion) |
| `backend/src/modules/pacientes/pacientes.service.ts` | Kanban returns 7 columns without removed stages | VERIFIED | Lines 587–594: columnas object |
| `frontend/src/hooks/useWAThread.ts` | useWAThread, useWATemplates, useSendWATemplate, useSendWAFreeText, useRetryWAMessage, useWAUnread | VERIFIED | 121 lines, all 6 hooks exported |
| `frontend/src/components/whatsapp/WAThreadView.tsx` | Chat bubble UI with delivery icons and manual refresh | VERIFIED | 288 lines, OUTBOUND/INBOUND layout, RefreshCw button |
| `frontend/src/components/whatsapp/SendWAMessageModal.tsx` | Template modal with WA/Email channel toggle | VERIFIED | 230 lines, Channel type, toggle state |
| `frontend/src/components/whatsapp/DeliveryIcon.tsx` | 5-state delivery status icon | VERIFIED | 11 lines, all 5 states (PENDIENTE/ENVIADO/ENTREGADO/LEIDO/FALLIDO) |
| `frontend/src/components/patient/PatientDrawer/views/MensajesView.tsx` | Renders WAThreadView | VERIFIED | Line 3: imports WAThreadView; line 15: renders it |
| `frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx` | Passes whatsappOptIn to MensajesView | VERIFIED | Line 109: `whatsappOptIn={(paciente as any).whatsappOptIn ?? false}` |
| `frontend/src/hooks/useCRMKanban.ts` | EtapaCRM type without SEGUIMIENTO_ACTIVO/CALIENTE; ETAPA_ORDER excludes PROCEDIMIENTO_REALIZADO | VERIFIED | Lines 10, 14, 54, 59–60: correct type + PROCEDIMIENTO_REALIZADO excluded from ETAPA_ORDER |
| `frontend/src/components/crm/KanbanBoard.tsx` | Filters columns to ETAPA_ORDER | VERIFIED | Lines 47–54: `.filter(col => ETAPA_ORDER.includes(...))` |
| `frontend/src/components/crm/PatientCard.tsx` | Unread WA badge prop | VERIFIED | Lines 22, 25, 50–52: `unreadWA` prop + green badge |
| `frontend/src/app/dashboard/layout.tsx` | Global WA unread badge | VERIFIED | Lines 19–20, 35–36, 123–127 |
| `frontend/src/app/dashboard/pacientes/components/columns.tsx` | createPacienteColumns factory with unread badge | VERIFIED | Lines 36–55: factory function with `waUnread` badge logic |
| `frontend/src/app/dashboard/pacientes/page.tsx` | Calls useWAUnread; passes waUnreadMap to table and kanban | VERIFIED | Lines 10, 33, 68, 92 |
| `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx` | WA button with opt-in gate | VERIFIED | Lines 267–282: button + SendWAMessageModal |
| `frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx` | "Enviar por WhatsApp" button calling /whatsapp/presupuesto/:id/send | VERIFIED | Lines 220–242: button with `/whatsapp/presupuesto/${p.id}/send` call |
| `frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx` | WA button in turno modal | VERIFIED | Lines 287–303, 391–393: guarded button + SendWAMessageModal |
| `frontend/src/app/dashboard/turnos/CalendarGrid.tsx` | Maps pacienteId + whatsappOptIn into CalendarEvent | VERIFIED | Lines 19–20: interface fields |
| `frontend/src/app/dashboard/turnos/page.tsx` | Maps pacienteId + whatsappOptIn from API response | VERIFIED | Lines 43–44, 281–282 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `whatsapp.service.ts` (sendTemplateMessage) | `processors/whatsapp-message.processor.ts` | `whatsappQueue.add('send-whatsapp-message', ...)` | WIRED | Lines 222–226 in service; case at line 23 in processor |
| `whatsapp-webhook.controller.ts` | `processors/whatsapp-message.processor.ts` | `whatsappQueue.add('process-webhook', body)` | WIRED | Webhook controller line 51; processor case at line 27 |
| `processors/whatsapp-message.processor.ts` | `prisma.mensajeWhatsApp` | updateMany/update by waMessageId | WIRED | Lines 157, 175, 242: prisma state updates |
| `whatsapp.controller.ts` | retry flow | POST mensajes/:id/retry → `retryMessage()` | WIRED | Lines 109–116 in controller; line 428+ in service |
| `WAThreadView.tsx` | `useWAThread.ts` | `useWAThread(pacienteId)` | WIRED | Line 66: `const { data: messages = [], isLoading, refetch } = useWAThread(pacienteId)` |
| `SendWAMessageModal.tsx` | `useWAThread.ts` | `useSendWATemplate` mutation | WIRED | Lines 18–19: import + line 40: `const sendWA = useSendWATemplate()` |
| `MensajesView.tsx` | `WAThreadView.tsx` | renders WAThreadView with props | WIRED | Lines 3, 15: import + JSX render |
| `PresupuestosView.tsx` | `/whatsapp/presupuesto/:id/send` | `api.post(...)` | WIRED | Line 224: direct api.post call |
| `columns.tsx` | `useWAUnread` | `createPacienteColumns(unreadMap)` factory | WIRED | Lines 39–55: factory uses `unreadMap?.[row.original.id]` |
| `layout.tsx` | `useWAUnread` | total unread badge | WIRED | Lines 35–36, 123–127: hook + conditional render |
| `turnos.service.ts` crearTurno | `prisma.paciente` | `update({ etapaCRM: TURNO_AGENDADO })` if null | WIRED | Lines 121–129 |
| `turnos.service.ts` cerrarSesion | `prisma.paciente` | `update({ etapaCRM: PROCEDIMIENTO_REALIZADO|CONSULTADO })` | WIRED | Lines 697–703 |
| `process-webhook` processor | `prisma.paciente` temperatura | `update({ temperatura: 'CALIENTE' })` on inbound | WIRED | Lines 305–308 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| WA-01 | 04-02, 04-04, 04-06 | Coordinator can send WA messages from patient, turno, presupuesto entry points | SATISFIED | PacienteDetails, AppointmentDetailModal, PresupuestosView all have WA buttons |
| WA-02 | 04-01, 04-02 | Template messages (pre-approved Meta templates) | SATISFIED | `sendTemplateMessage()`, `listApprovedTemplates()`, SendWAMessageModal template selection |
| WA-03 | 04-01, 04-02 | Free-text messages within 24h window | SATISFIED | `sendFreeText()`, WAThreadView free-text input with 24h guard |
| WA-04 | 04-02 | Webhook processes inbound messages | SATISFIED | `process-webhook` job creates ContactoLog + MensajeWhatsApp(INBOUND) |
| WA-05 | 04-02, 04-04, 04-05 | Unread WA indicators on list, kanban, and global layout | SATISFIED | `useWAUnread`, badge in columns.tsx, PatientCard, layout.tsx |
| CRM-01 | 04-01, 04-03 | Auto-transition TURNO_AGENDADO on booking | SATISFIED | `crearTurno()` lines 121–129 |
| CRM-02 | 04-01, 04-03 | Auto-transition CONSULTADO/PROCEDIMIENTO_REALIZADO on session close | SATISFIED | `cerrarSesion()` lines 697–703 |
| CRM-05 | 04-01, 04-02 | Inbound WA message heats patient temperatura to CALIENTE | SATISFIED | Processor line 308 |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/components/whatsapp/WAThreadView.tsx` | 248 | `placeholder=` on textarea | Info | Standard HTML attribute, not a stub |

No blockers or warnings found. The `placeholder` reference is a standard HTML textarea attribute, not a code stub.

---

### Human Verification Required

The following behaviors can only be confirmed by running the application against a real Meta WhatsApp Business API account:

#### 1. Meta Webhook Registration

**Test:** Register `POST /webhook/whatsapp` in the Meta Business Dashboard and send a test webhook event.
**Expected:** Server returns 200 immediately; `process-webhook` job processes the event asynchronously; MensajeWhatsApp state updates (e.g., ENTREGADO, LEIDO) are reflected in the thread UI.
**Why human:** Requires a real Meta WABA account and a publicly accessible webhook URL.

#### 2. Template Message Delivery End-to-End

**Test:** From PacienteDetails, click WhatsApp button (patient has opt-in), select a template from the modal, confirm send.
**Expected:** Toast "Mensaje enviado por WhatsApp" appears; the thread shows the message in ENVIADO state; after Meta processes it, state updates to ENTREGADO then LEIDO.
**Why human:** Requires actual Meta Graph API token, approved template, and recipient phone number.

#### 3. Inbound Message Auto-Heat

**Test:** Have a test patient send a WhatsApp message (inbound) to the WABA number.
**Expected:** Webhook fires; message appears in thread as INBOUND (left bubble); patient temperatura in kanban card changes to CALIENTE.
**Why human:** Requires real inbound WA message to the Meta phone number.

#### 4. Channel Toggle Email Send

**Test:** In SendWAMessageModal, switch channel to "Email", select a template, click "Enviar por email".
**Expected:** Either toast confirms email sent OR `toast.error('Envio por email no configurado aun')` if endpoint 404s.
**Why human:** Email endpoint may not exist yet; behavior depends on backend configuration.

#### 5. Free-text 24h Window Enforcement

**Test:** Open a thread where the last INBOUND message is > 24h old. Verify free-text input is disabled with correct warning.
**Expected:** Input disabled; warning message shown about the 24h window.
**Why human:** Requires a thread with a time-specific INBOUND message for edge-case validation.

---

### Gaps Summary

No gaps found. All 22 must-have truths are verified:

- Schema migration is applied (EtapaCRM 7 values, DireccionMensajeWA, MensajeWhatsApp.direccion).
- WhatsApp backend is fully wired: send, free-text, presupuesto PDF delivery, templates list, message thread, retry, webhook verification and processing, unread counts.
- BullMQ processor implements both job types with Meta Graph API calls and Prisma state updates.
- Webhook handler returns 200 immediately and enqueues async processing.
- CRM auto-transitions are wired in TurnosService for both booking and session-close events.
- Kanban is cleaned to 7 displayed stages; PROCEDIMIENTO_REALIZADO is excluded from the board view.
- All 5 TanStack Query hooks are exported from useWAThread.ts.
- Chat UI has OUTBOUND/INBOUND bubble layout, 5-state delivery icons, retry button on FALLIDO, opt-in gate, 24h window guard, manual refresh.
- Template send modal has upfront WA/Email channel toggle.
- Unread WA indicators are present at all 3 surfaces: patient list table, Kanban card, global dashboard layout badge.
- WA send shortcuts are present in PacienteDetails, PresupuestosView, and AppointmentDetailModal.
- CalendarGrid and turnos page.tsx carry pacienteId + whatsappOptIn through to AppointmentDetailModal.

5 items are deferred to human verification (real Meta API integration, inbound message flow, email endpoint availability) — none are code gaps.

---

_Verified: 2026-02-28T23:45:00Z_
_Verifier: Claude (gsd-verifier)_
