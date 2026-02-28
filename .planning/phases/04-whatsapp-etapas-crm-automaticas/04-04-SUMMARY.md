---
phase: 04-whatsapp-etapas-crm-automaticas
plan: "04"
subsystem: whatsapp-ui
tags: [whatsapp, react, tanstack-query, chat-ui, delivery-status, template, sonner]

dependency_graph:
  requires:
    - phase: 04-02
      provides: whatsapp-send-api, whatsapp-thread-api, whatsapp-templates-api, retry-endpoint
    - phase: 04-03
      provides: kanban-types, crm-enums
  provides:
    - whatsapp-chat-ui (WAThreadView with bubble layout, date grouping, delivery icons)
    - delivery-status-component (DeliveryIcon — 5 states)
    - send-template-modal (SendWAMessageModal with upfront WA/Email channel toggle)
    - wa-query-hooks (useWAThread, useWATemplates, useSendWATemplate, useSendWAFreeText, useRetryWAMessage)
  affects: [04-05]

tech-stack:
  added: []
  patterns:
    - whatsapp-chat-bubble-layout (OUTBOUND right/green, INBOUND left/white, date separator dividers)
    - upfront-channel-toggle (WA default, Email option — not a fallback, a first-class upfront choice)
    - opt-in-gate (disabled button + Radix Tooltip when whatsappOptIn=false)
    - 24h-window-guard (free-text input disabled when no INBOUND message within 24h)
    - retry-inline (FALLIDO bubbles have RotateCcw button calling useRetryWAMessage)

key-files:
  created:
    - frontend/src/hooks/useWAThread.ts
    - frontend/src/components/whatsapp/DeliveryIcon.tsx
    - frontend/src/components/whatsapp/WAThreadView.tsx
    - frontend/src/components/whatsapp/SendWAMessageModal.tsx
  modified:
    - frontend/src/components/patient/PatientDrawer/views/MensajesView.tsx
    - frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx

key-decisions:
  - "RadioGroup (shadcn) skipped for channel toggle — component only exports RadioGroupItem, so plain button-based toggle used to avoid type mismatch"
  - "Email send calls POST /pacientes/:id/enviar-email with subject+body — 404 handled gracefully with toast.error so missing endpoint does not crash the modal"
  - "WAThreadView uses refetch() from useWAThread for manual refresh — no separate invalidateQueries call needed since refetch forces re-fetch of the same query"
  - "Free-text 24h window computed from last INBOUND message createdAt client-side — avoids extra backend call, matches Meta's 24h customer service window rule"
  - "whatsappOptIn read as (paciente as any).whatsappOptIn in PatientDrawer — pending Prisma client regeneration, consistent with 01-03 decision"

patterns-established:
  - "whatsapp/ components directory at frontend/src/components/whatsapp/ — all WA-specific UI lives here"
  - "useWAThread query key: ['wa-thread', pacienteId] — used for targeted invalidation in all WA mutations"
  - "wa-templates query key: ['wa-templates'] — 5min staleTime, not per-patient"

requirements-completed: [WA-01, WA-02, WA-03, WA-05]

duration: 2min
completed: 2026-02-28
tasks_completed: 2
files_modified: 6
---

# Phase 4 Plan 04: WhatsApp Chat Thread UI Summary

**Coordinator-facing WhatsApp chat UI in the patient Mensajes tab — bubble thread with delivery icons, template modal with WA/Email channel toggle, and opt-in gate**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T00:39:50Z
- **Completed:** 2026-02-28T00:41:50Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- 5 TanStack Query hooks covering the full WA thread lifecycle (fetch, templates, send, free-text, retry)
- Chat-style bubble UI with OUTBOUND (green/right) and INBOUND (white/left) layout, date group separators, and auto-scroll
- Delivery status icons (Clock/Check/CheckCheck gray/CheckCheck blue/XCircle red) matching WhatsApp visual conventions
- Template selection modal with upfront WA/Email channel toggle; email path handles 404 gracefully
- Opt-in gate: send button disabled with shadcn Tooltip when patient has no opt-in
- 24h customer service window enforced client-side — free-text input disabled when no recent inbound message
- Inline retry button on FALLIDO bubbles

## Task Commits

1. **Task 1: TanStack Query hooks for WA thread** — `d14cf2b` (feat)
2. **Task 2: DeliveryIcon, WAThreadView, SendWAMessageModal, MensajesView update** — `ebccae5` (feat)

## Files Created/Modified

- `frontend/src/hooks/useWAThread.ts` — 5 exported hooks: useWAThread, useWATemplates, useSendWATemplate, useSendWAFreeText, useRetryWAMessage; WAMessage/WATemplate types
- `frontend/src/components/whatsapp/DeliveryIcon.tsx` — delivery status icon, all 5 states
- `frontend/src/components/whatsapp/WAThreadView.tsx` — full chat thread component (180+ lines): header, scrollable bubble list, free-text input, template send button
- `frontend/src/components/whatsapp/SendWAMessageModal.tsx` — Dialog with upfront channel toggle, template card list with body preview, email confirmation view
- `frontend/src/components/patient/PatientDrawer/views/MensajesView.tsx` — replaced ChatView import with WAThreadView
- `frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx` — added whatsappOptIn prop pass-through to MensajesView

## Decisions Made

- **RadioGroup avoided for channel toggle:** shadcn RadioGroup only exports RadioGroupItem (not a wrapper-only component), so a plain button-based toggle was used to achieve the same visual result without type errors.
- **Email 404 handled gracefully:** Since no generic email endpoint exists yet, the modal catches 404 and shows `toast.error('Envio por email no configurado aun')` — the UI does not crash and the WA path is unaffected.
- **Free-text 24h window computed client-side:** Last INBOUND message `createdAt` checked against `Date.now()` — avoids a backend call, correctly implements Meta's 24h customer service window constraint.

## Deviations from Plan

None — plan executed exactly as written with one minor implementation adaptation:

**1. [Rule 1 - Bug] RadioGroup replaced with button toggle**
- **Found during:** Task 2 (SendWAMessageModal)
- **Issue:** shadcn RadioGroup expects RadioGroupItem children; wrapping plain inputs inside it caused type mismatch
- **Fix:** Replaced RadioGroup with two styled `<button>` elements achieving identical UX
- **Files modified:** frontend/src/components/whatsapp/SendWAMessageModal.tsx
- **Committed in:** ebccae5

---

**Total deviations:** 1 auto-fixed (Rule 1 — component API mismatch)
**Impact on plan:** No scope change. Channel toggle UX is identical; only internal implementation differs.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. WhatsApp WABA credentials were configured in Plan 04-01/04-02.

## Next Phase Readiness

- WhatsApp UI is complete and connects to all 04-02 backend endpoints
- Plan 04-05 can now build on top of the established `useWAThread` hooks and `WAThreadView` component
- The `whatsapp/` component directory and query key conventions are established for future WA features

---
*Phase: 04-whatsapp-etapas-crm-automaticas*
*Completed: 2026-02-28*
