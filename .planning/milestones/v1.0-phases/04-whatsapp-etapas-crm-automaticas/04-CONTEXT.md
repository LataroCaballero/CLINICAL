# Phase 4: WhatsApp + Etapas CRM Automaticas - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Send WhatsApp messages to patients using Meta-approved templates, auto-update CRM stages on appointment events (turno creado → Consulta Agendada, turno tipo Cirugía completado → Procedimiento Realizado, LiveTurno completado → Consulta Realizada), and auto-heat patient temperature when a patient replies via WhatsApp. Includes a dedicated message thread UI inside patient profile and PDF presupuesto delivery via WhatsApp.

Also includes a CRM stage schema simplification (Phase 3 patch): remove Seguimiento Activo, add Procedimiento Realizado (hidden from kanban).

</domain>

<decisions>
## Implementation Decisions

### Message send entry points
- Coordinator can trigger a WhatsApp send from **both** the patient profile page and from the appointment list/turno view
- Not limited to one entry point

### Template selection flow
- Opens a **modal with preview** — coordinator can read the template content before confirming
- Modal has a confirm "Send" button — no immediate send on selection
- Default channel suggestion is WhatsApp; upfront choice to send via **email instead** is also available in the send modal (not just as fallback after failure)

### Opt-in gate
- If patient does not have WhatsApp opt-in: **button is disabled with a tooltip** ("No tiene opt-in")
- Same behavior for the "Enviar presupuesto por WA" button in the presupuesto detail

### Message thread — location and style
- Dedicated **"Mensajes" tab** inside the patient profile (not inline in the existing overview)
- **Chat-style bubbles**: sent messages (coordinator) on the right, patient replies on the left, grouped by date
- Coordinator can send **free-text replies** directly in the thread (valid within the 24h WhatsApp customer service window)
- Thread has a **manual refresh button** — no auto-polling or WebSocket required for this phase

### Message bubble content
- **Minimal info per bubble**: message content + timestamp + WhatsApp-style delivery icon
  - Single check = sent
  - Double check = delivered
  - Blue double check = read
  - Red X icon = failed

### Failed message UX
- When a message fails (webhook received): **toast notification** appears + the bubble is marked red/failed
- Failed bubble has a **retry button** inline

### Patient reply notifications
- **Unread indicator on the patient row** (list view)
- **Unread indicator on the patient card** (Kanban/Embudo view)
- **Global in-app notification** for the logged-in coordinator

### PDF presupuesto via WhatsApp
- Triggered via a **manual button inside the presupuesto detail** ("Enviar por WhatsApp")
- No preview step needed — coordinator is already viewing the presupuesto
- If no opt-in: button disabled with tooltip (same pattern as messaging)
- After sending, the event **appears in the message thread as a bubble with attachment** (so delivery status is trackable from the thread)

### CRM stage simplification (requires Phase 3 schema patch)
- **Keep**: Sin Clasificar, Nuevo Lead, Consulta Agendada, Consulta Realizada, Presupuesto Enviado, Confirmado, Perdido
- **Remove**: Seguimiento Activo — delete from EtapaCRM enum and remove from kanban
- **Add**: Procedimiento Realizado — new stage that is **NOT shown in the Kanban board** (excluded from kanban query); used only for post-surgery follow-up messaging
- Auto-transition to Procedimiento Realizado: when a turno of type "Cirugía" is marked completed
- This change needs a Prisma migration + kanban filter update + new auto-transition in turnos module

### Note on "Caliente"
- "Caliente" is a **TemperaturaPaciente** value (badge indicator), not a CRM stage/column — no change needed to the temperature enum or its display

### Claude's Discretion
- Exact tab layout within patient profile (position of "Mensajes" tab relative to existing tabs)
- Loading skeleton for message thread
- Error state if WhatsApp API is unreachable
- Exact wording of tooltip and toast messages
- How free-text reply handles the 24h window expiry (disable input or show warning)

</decisions>

<specifics>
## Specific Ideas

- The message thread should feel like a WhatsApp chat — familiar icons, bubble direction, timestamp style
- "Procedimiento Realizado" stage is invisible in the funnel but exists in the DB for post-op loyalty flows — think of it as a hidden CRM state, not a kanban column
- The send modal should suggest WA first (preferred channel) but let the coordinator switch to email upfront — no forced fallback after failure only

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within Phase 4 scope and the CRM schema patch tightly related to it

</deferred>

---

*Phase: 04-whatsapp-etapas-crm-automaticas*
*Context gathered: 2026-02-27*
