# Project Research Summary

**Project:** CLINICAL — Aesthetic Surgery Clinic SaaS (CRM Automation Milestone)
**Domain:** Patient conversion CRM with WhatsApp Business API, automated follow-up sequences, presupuesto PDF generation
**Researched:** 2026-02-21
**Confidence:** MEDIUM-HIGH

## Executive Summary

CLINICAL is extending an existing clinic management SaaS with CRM automation capabilities centered on WhatsApp-native patient follow-up, automated presupuesto delivery, and a structured daily workflow for coordinators. The foundation is already in place: EtapaCRM Kanban, TemperaturaPaciente, SeguimientoSchedulerService, and stub endpoints for presupuesto delivery. The next milestone fills three critical gaps that make the CRM operationally useful: a reliable async messaging infrastructure (BullMQ + WhatsApp Business API), a closed-loop presupuesto delivery flow (PDF generation + WhatsApp/email send + CRM state update), and the daily action list that gives coordinators a clear starting point each morning.

The recommended approach is to build in strict dependency order: Redis/BullMQ infrastructure first, then the mensajeria module (WhatsApp API abstraction), then presupuesto PDF delivery, then automated drip sequences. This order is non-negotiable — every downstream feature depends on the messaging layer being stable. WhatsApp approval must be initiated in sprint 1, before a single line of integration code is written, and email fallback must ship in the same phase. Without WABA approval or with a shared multi-tenant phone number, the entire WhatsApp feature set is at risk.

The critical risks are legal and operational, not technical. Missing opt-in consent (Pitfall 3), sharing a single WhatsApp number across tenants (Pitfall 4), and automated sends without rate limiting (Pitfall 2) can each result in permanent account suspension that affects all tenants simultaneously. These cannot be retrofitted — they must be in the initial schema migration and queue design. Architecture patterns are well-understood and documented (acknowledge-first webhooks, BullMQ delayed jobs, singleton Puppeteer browser or pure-JS PDF), making the technical implementation medium-confidence once the legal/compliance foundations are correct.

---

## Key Findings

### Recommended Stack

The project already has the core dependencies installed: `pdfkit` 0.17.2, `nodemailer` 7.0.13, `@nestjs/schedule`, `redis` + `cache-manager-redis-yet`, and `axios`. New additions are minimal and targeted.

**Core technologies:**
- **360dialog** (WhatsApp BSP, production): $49/mo flat + Meta rates, 10-15 min setup, native Cloud API format. Use Twilio sandbox for development only — Twilio's 2-4 week approval delay makes it unsuitable as primary.
- **BullMQ + @nestjs/bullmq** (v5.70.0 / v11.0.4): Redis-backed job queue for reliable async webhook processing, delayed follow-up sequences, and PDF generation. Redis already installed — zero new infrastructure if deployed. Required: cannot use @Cron alone for per-patient delayed messages.
- **PDFKit 0.17.2** (existing): Keep and extend for presupuesto PDFs. Pure-JS, low memory, adequate for structured medical documents. Do NOT add Puppeteer unless pixel-perfect HTML templates become an explicit requirement — Puppeteer adds 300MB to Docker image and OOM risks in production.
- **Resend** (v6.9.2): Transactional patient-facing emails (budget delivery, confirmations). 3,000/month free tier. Use alongside existing nodemailer, which stays for internal/admin SMTP reports.
- **Twilio SDK** (v5.12.2, dev sandbox only): For development/QA testing of WhatsApp flows while 360dialog WABA approval is in progress.

**Critical version constraint:** NestJS 10.x + Node.js 20.x + Prisma 6.x. No framework changes. @nestjs/bullmq v11 targets NestJS v11 but works with v10 per community reports — test carefully.

**New env vars required:** `WABA_API_KEY`, `WABA_PHONE_NUMBER_ID`, `RESEND_API_KEY`, `REDIS_URL`, `WHATSAPP_WEBHOOK_SECRET`.

See `.planning/research/STACK.md` for full provider comparison and installation commands.

---

### Expected Features

The base CRM (Kanban, temperatura, motivo de pérdida, scheduler, dashboard KPIs) is already implemented. This milestone addresses the gaps that make the CRM operationally valuable for daily clinic use.

**Must have (P1 — table stakes for this milestone):**
- **Contact log** — foundational data layer; every downstream feature (daily list, scoring, briefing) depends on interaction history. Currently missing.
- **Daily action list ("a quién contactar hoy")** — the workflow anchor. Without it, the Kanban is decorative. Requires contact log for priority logic.
- **Quote PDF generation + WhatsApp/email delivery** — closes the loop on presupuesto. Currently coordinators copy amounts to WhatsApp manually. Partially stubbed.
- **Automatic EtapaCRM transitions** — presupuesto sent → PRESUPUESTO_ENVIADO, pago received → CERRADO. Eliminates manual bookkeeping. Core moat vs. generic CRMs.
- **Appointment reminders via WhatsApp/email** — reduces no-shows. Universally expected. Not yet built.
- **Loss reason prompt on stage change to Perdido** — ensures clean data for analytics. Enum exists; UI prompt does not.
- **Prospective revenue view in dashboard** — aggregation of presupuesto amounts by EtapaCRM. High surgeon value, low implementation cost.

**Should have (P2 — add after v1 validation):**
- Automated WhatsApp follow-up sequences (30/60/90 days) — requires WhatsApp API live in production first.
- Patient scoring (rule-based, not ML) — compute from interaction recency, consultation attendance, quote status.
- Referral source tracking (fuenteOrigen field on Paciente) — single field, enables acquisition ROI.
- Loss analysis dashboard — meaningful only after consistent data capture.
- Consultation preparation briefing — assemble from existing data (historia clínica + presupuestos + contact log).

**Defer (v2+):**
- Before/after photo library — requires new storage module.
- Email drip campaigns — WhatsApp is the correct primary channel for LATAM; email drip is lower value.
- Multi-location reporting — 3-5x engineering cost; nail single-clinic first.
- AI-based lead scoring — insufficient data volume at this scale.

**Key LATAM differentiator:** WhatsApp is the primary communication channel (SMS automations used by US competitors are irrelevant here). The CRM's structural advantage is automatic stage progression when clinical events occur — no competitor does this natively. This must be protected from scope creep (no patient portal, no AI chatbot, no multi-location complexity).

See `.planning/research/FEATURES.md` for competitor analysis and full feature dependency graph.

---

### Architecture Approach

The architecture follows a strict module separation pattern: `mensajeria` (WhatsApp API client + webhook handler), `automatizaciones` (trigger engine + drip sequence scheduler), and `documentos` (PDF generation). All three delegate async work to BullMQ queues backed by the existing Redis installation. The existing `SeguimientoSchedulerService` (@Cron) is retained and extended to enqueue BullMQ jobs instead of direct DB operations.

**Major components:**
1. **`mensajeria` module** — owns all WhatsApp API calls, webhook endpoint, signature verification, delivery status tracking (MensajeWhatsApp model). Single source of truth for outbound sends and inbound events.
2. **`automatizaciones` module** — evaluates trigger conditions (EtapaCRM change, dias sin contacto, business events), enqueues delayed BullMQ jobs. Decoupled from mensajeria so non-WhatsApp channels (email) use the same trigger engine.
3. **`documentos` module** — generates presupuesto PDFs via PDFKit (or singleton Puppeteer if required). Isolates CPU-bound work; runs async via BullMQ documentos-queue.
4. **BullMQ queue layer** — three queues: `mensajes-queue` (webhook events), `automatizaciones-queue` (drip sends), `documentos-queue` (PDF generation). Provides retry with exponential backoff, delayed jobs (exact-time firing), and job cancellation (patient converts before day-7 message fires).
5. **Prisma schema additions** — `MensajeWhatsApp` model (with waMessageId index), `AutomatizacionRegla` model, per-tenant WABA credentials on Clinica/Profesional model, `whatsappOptIn`/`whatsappOptInDate` on Paciente.

**Non-negotiable patterns:**
- Webhook handler returns HTTP 200 immediately, then enqueues to BullMQ (WhatsApp requires <5s response; violations cause duplicate delivery).
- Idempotency keys in Redis for all webhook events (WhatsApp delivers the same event multiple times).
- Per-patient frequency cap enforced at queue level (max 1 automated message / 7 days / patient).
- Phone numbers normalized to E.164 format on every send (never trust `Paciente.telefono` directly).

See `.planning/research/ARCHITECTURE.md` for full data flow diagrams and build order.

---

### Critical Pitfalls

1. **WABA registration lead time (Pitfall 1)** — Meta verification takes 2-15 business days; template approval adds another 15-48 hours per template. Submit WABA registration and all message templates (presupuesto enviado, seguimiento 7d/30d, turno recordatorio, opt-in confirmation) on day 1 of the WhatsApp phase. Treat approval as a phase gate — phase cannot ship to production until at least core templates are APPROVED status in Meta Business Manager. Build with Twilio sandbox while awaiting approval. Ship email fallback in the same phase so value is delivered regardless of approval timeline.

2. **Automated sends causing account ban (Pitfall 2)** — High block/report rates reduce messaging limit tier and can permanently suspend the WABA phone number. As of Oct 2025, limits are shared across the entire Meta Business Portfolio, so one clinic's bad behavior affects all tenants. Enforce per-patient frequency caps (1 automated msg/7 days) at the BullMQ queue layer, stagger sends with rate limiter (not Promise.all), and include a one-tap opt-out in every automated message.

3. **Missing WhatsApp opt-in consent (Pitfall 3)** — Meta policy requires explicit, channel-specific consent. Existing patient phone numbers do not constitute consent. Argentine Ley 25.326 requires an auditable consent trail. Add `whatsappOptIn: Boolean` and `whatsappOptInDate: DateTime` to the Paciente schema migration before building any send endpoint. Gate every automated send behind an opt-in check; fall back to email when `whatsappOptIn = false`.

4. **Shared WhatsApp number across tenants (Pitfall 4)** — Single platform number means one clinic's spam affects all clinics, messaging limits are shared, and patients see an unfamiliar sender. Design per-tenant WABA credentials (stored on Clinica/tenant model) from the initial schema migration. Use Meta Embedded Signup for per-tenant onboarding. There is no acceptable "we'll retrofit this later" path — it requires migrating all message history and resetting all webhooks.

5. **Puppeteer memory leak in production (Pitfall 6)** — Unclosed browser pages/contexts accumulate ~10MB/hour; process OOMKills within days. Use PDFKit (already installed, sufficient for structured presupuesto layout) as the primary PDF generator. If Puppeteer is required for pixel-perfect output, use a singleton browser with page lifecycle in `finally` blocks and wrap generation in BullMQ with concurrency:1-2.

---

## Implications for Roadmap

Based on research, the build order is architecture-dictated, not preference-dictated. Each phase is a hard prerequisite for the next.

### Phase 1: Infrastructure Foundation (Redis/BullMQ + Consent Schema)

**Rationale:** BullMQ is a prerequisite for every async operation in phases 2-4. The consent and multi-tenant schema additions must exist before any send endpoint is built — retrofitting these is extremely costly. This phase has no external dependencies.
**Delivers:** Configured BullMQ with three queues, Redis connection tested, `whatsappOptIn`/`whatsappOptInDate` added to Paciente, per-tenant WABA credential fields on Profesional/Clinica model, Bull Board admin UI.
**Addresses:** STACK recommendation (BullMQ), Pitfalls 3 and 4 (consent + multi-tenant schema).
**Avoids:** The most dangerous architectural shortcut — starting to build sends without the consent and multi-tenant infrastructure.
**Research flag:** Standard patterns — skip research-phase. BullMQ + NestJS integration is well-documented with official guides.

---

### Phase 2: Contact Log + Daily Action List (CRM Operational Core)

**Rationale:** Contact log is the foundational data layer for all action-oriented features. Daily action list is the workflow anchor — without it, coordinators don't have a starting point and the CRM feels incomplete. These two features have no external API dependencies (no WhatsApp approval needed), so they can ship immediately while WABA approval is pending.
**Delivers:** `ContactoLog` Prisma model (channel, direction, notes, timestamp), contact log UI in patient drawer, daily action list view with priority sort (recency + temperatura + etapaCRM), prospective revenue widget in dashboard (simple aggregation join).
**Addresses:** FEATURES P1 gaps — contact log, daily action list, prospective revenue view.
**Uses:** Existing Prisma/NestJS patterns; no new libraries.
**Research flag:** Standard patterns — skip research-phase. CRUD + aggregation queries, established conventions in codebase.

---

### Phase 3: Presupuesto PDF + Delivery (Quote Delivery Loop)

**Rationale:** Presupuesto delivery is the highest-frequency use case for coordinators. Closing the loop from PDF generation → WhatsApp/email send → CRM state update in a single atomic operation is the most visible improvement. This phase can start while WABA approval is pending (PDF generation and email delivery are independent of WhatsApp approval).
**Delivers:** `PresupuestoPdfService` wrapping PDFKit (branded: logo, itemized procedures, validity, payment terms), `documentos` module with BullMQ async PDF generation, `presupuestos.service.marcarEnviado()` wired to PDF generation + Resend email send + EtapaCRM transition, loss reason prompt modal on Perdido stage change.
**Addresses:** FEATURES — quote send, automatic EtapaCRM transitions, loss reason prompt.
**Uses:** PDFKit 0.17.2 (existing), Resend v6.9.2 (new), BullMQ documentos-queue (Phase 1).
**Avoids:** Puppeteer memory leaks (Pitfall 6) — PDFKit is the primary choice.
**Research flag:** Low complexity — skip research-phase. PDFKit patterns established in existing `reportes-export.service.ts`; Resend API is straightforward.

---

### Phase 4: WhatsApp Integration (mensajeria module)

**Rationale:** WhatsApp is the primary communication channel for LATAM and the structural differentiator vs. US-centric competitors. However, this phase has the hardest external dependency (WABA approval) and the most compliance requirements, so it comes after all foundational work is solid. WABA registration must be submitted at the START of Phase 1, not at the start of this phase.
**Delivers:** `mensajeria` module (WhatsApp Cloud API client, webhook endpoint with signature verification, idempotency, MensajeWhatsApp model), delivery status tracking (PENDIENTE → ENVIADO → ENTREGADO → LEIDO → FALLIDO), presupuesto delivery via WhatsApp (PDF upload to media endpoint, document message send), opt-in collection UI in patient profile, per-tenant 360dialog credential connection flow, WhatsApp conversation thread in patient drawer.
**Addresses:** FEATURES — quote send via WhatsApp, appointment reminders, contact log enriched with WhatsApp direction.
**Uses:** 360dialog (production), Twilio sandbox (dev), axios (existing), BullMQ mensajes-queue (Phase 1).
**Avoids:** Pitfalls 1 (registration delay — mitigated by submitting at Phase 1 start), 2 (rate limiting via BullMQ), 3 (opt-in gate on all sends), 4 (per-tenant credentials from Phase 1 schema), 5 (templates submitted week 1 of Phase 1).
**Research flag:** Needs deeper research during planning. WhatsApp Cloud API webhook format, Meta Embedded Signup for per-tenant onboarding, and template approval mechanics should be validated against current Meta docs before implementation starts.

---

### Phase 5: Automated Follow-up Sequences (automatizaciones module)

**Rationale:** Automated sequences require the mensajeria module (Phase 4) to exist and be stable in production. Running automated sequences on a WhatsApp number that hasn't been validated for quality signals is a ban risk. This phase should only start after Phase 4 is live and the quality rating is confirmed healthy.
**Delivers:** `automatizaciones` module with `AutomatizacionRegla` model (trigger conditions, message templates, step delays), BullMQ delayed job scheduling (exactly N days after trigger event), guard logic (skip if patient converted before job fires), per-patient frequency cap enforcement, opt-out compliance in every automated message, trigger wiring in `presupuestos.marcarEnviado()` and `SeguimientoSchedulerService`, admin UI for creating/editing automation rules.
**Addresses:** FEATURES P2 — automated WhatsApp follow-up sequences, patient scoring computation, interconnected signals.
**Uses:** BullMQ automatizaciones-queue (Phase 1), mensajeria service (Phase 4).
**Avoids:** Pitfall 2 (ban from bulk sends — rate limiter + frequency cap), Pitfall 5 (template rejection — templates stored by ID in config, not hardcoded).
**Research flag:** Needs deeper research during planning. Trigger condition engine design (event-based vs. polling), delayed job cancellation when patient converts, and per-patient frequency cap implementation are non-trivial. Validate BullMQ job removal by ID and rate limiter configuration before designing the data model.

---

### Phase Ordering Rationale

- **Infrastructure before code:** BullMQ, consent fields, and per-tenant credential schema are foundational. Starting sends without these leads to unrecoverable architectural debt (Pitfall 4 recovery cost: HIGH).
- **No-dependency features ship first:** Contact log and daily action list have zero external dependencies. They deliver immediate operational value while WABA approval (2-15 business days) is pending.
- **PDF delivery before WhatsApp delivery:** Closes the presupuesto loop via email immediately. WhatsApp adds to the same flow in Phase 4 without reworking the service layer.
- **WhatsApp manual before automated:** Phase 4 establishes quality signals and confirms the WABA account is healthy before Phase 5 initiates bulk automated sends. Automated sends on a new number with unknown quality rating is a ban risk.
- **WABA registration is a Phase 1 task, not a Phase 4 task:** The external approval timeline (2-15 days) must be initiated before coding starts. Template submissions also happen in Phase 1 / early Phase 2. By the time Phase 4 development completes (4-6 weeks out), approval should be ready.

### Research Flags

Phases needing `/gsd:research-phase` during planning:
- **Phase 4 (WhatsApp Integration):** Meta Embedded Signup flow for per-tenant onboarding is not well-documented in the existing research. Webhook payload format for delivery status events needs validation against the specific Cloud API version in use. BSP (360dialog) specific quirks for LATAM phone numbers (+54 format) need verification.
- **Phase 5 (Automated Sequences):** BullMQ job removal by ID (job cancellation when patient converts), per-patient rate limiting across distributed queues, and trigger condition engine design need deeper research before data model is finalized.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Infrastructure):** BullMQ + NestJS integration is covered by official docs. Schema migrations follow established Prisma patterns.
- **Phase 2 (Contact Log + Daily List):** Standard NestJS CRUD + Prisma aggregation. Follows existing codebase patterns.
- **Phase 3 (PDF + Email Delivery):** PDFKit patterns established in `reportes-export.service.ts`. Resend SDK is a simple REST wrapper.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core packages already installed and versioned. New additions (BullMQ, Resend) verified via npm and official docs. 360dialog pricing MEDIUM — not dated on their docs. |
| Features | MEDIUM-HIGH | Competitor analysis from multiple public sources. No direct user interviews. LATAM-specific behavior (informal payments, WhatsApp as primary channel) is well-established. |
| Architecture | HIGH | Patterns verified against official NestJS, BullMQ, and WhatsApp Cloud API docs. Webhook acknowledge-first, delayed jobs, idempotency are documented patterns with code examples. |
| Pitfalls | MEDIUM-HIGH | WhatsApp API specifics HIGH (official BSP docs + multiple verified sources). Argentina/LATAM legal specifics MEDIUM (limited authoritative sources — Ley 25.326 application to WhatsApp is inferred, not sourced from a law firm). |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Meta Tech Provider / ISV enrollment status:** Research notes a December 31, 2025 deadline for ISV enrollment to use WhatsApp as a channel. This must be verified — if not enrolled, the platform cannot use Embedded Signup for per-tenant onboarding. Verify enrollment status before Phase 4 planning.
- **360dialog LATAM coverage:** Research flags that some BSPs don't support Argentine +54 phone numbers without issues. Verify 360dialog's Argentina support with their sales/support before committing to this BSP. Have Twilio as a documented fallback path.
- **BullMQ v11 + NestJS v10 compatibility:** Community reports say it works, but no official statement. Run a small integration test in Phase 1 before building the queue layer. If incompatible, use pg-boss (Postgres-backed) instead.
- **Argentine data protection law (Ley 25.326) specifics for WhatsApp:** The legal analysis in research is inferred from general principles. Before launching automated sends in production, get a brief legal review of the opt-in language and consent storage requirements for the Argentine context.
- **PDFKit vs. Puppeteer decision:** STACK.md recommends PDFKit; ARCHITECTURE.md uses Puppeteer for data flow examples. PDFKit is the correct choice for structured presupuesto documents. Confirm this with the frontend team before Phase 3 begins — if they have already designed complex HTML templates that assume Puppeteer rendering, the decision must be revisited.

---

## Sources

### Primary (HIGH confidence)
- [BullMQ official docs](https://docs.bullmq.io) — delayed jobs, NestJS integration, rate limiters, job removal
- [NestJS Queues official docs](https://docs.nestjs.com/techniques/queues) — @Processor, BullModule configuration
- [Twilio WhatsApp sandbox docs](https://www.twilio.com/docs/whatsapp/sandbox) — sandbox setup and limits
- [Resend official site](https://resend.com/nodejs) — Node.js integration, free tier
- [react-email GitHub](https://github.com/resend/react-email) — JSX email templates
- [WhatsApp Cloud API Node.js SDK](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/) — Meta official
- [Infobip WhatsApp opt-in docs](https://www.infobip.com/docs/whatsapp/compliance/user-opt-ins) — consent best practices
- [Infobip WhatsApp template compliance](https://www.infobip.com/docs/whatsapp/compliance/template-compliance) — template approval rules
- [Twilio Tech Provider integration guide](https://www.twilio.com/docs/whatsapp/isv/tech-provider-program/integration-guide) — ISV enrollment
- [Wati API prerequisites](https://www.wati.io/en/blog/whatsapp-api-prerequisites/) — sender registration

### Secondary (MEDIUM confidence)
- [360dialog pricing page](https://360dialog.com/pricing) — flat fee $49/mo, 0% markup
- [Meta WhatsApp Business pricing Jan 2026](https://c2sms.com/meta-whatsapp-business-api-pricing-billing-updates-effective-january/) — per-message model
- [Hookdeck WhatsApp webhook guide](https://hookdeck.com/webhooks/platforms/guide-to-whatsapp-webhooks-features-and-best-practices) — webhook events, 5s response requirement
- [LogRocket — Best HTML to PDF libraries for Node.js](https://blog.logrocket.com/best-html-pdf-libraries-node-js/) — Puppeteer vs PDFKit
- [PatientNow](https://www.patientnow.com/medical-aesthetics/) and [Nextech](https://www.nextech.com/plastic-surgery/practice-management-software) — competitor feature analysis
- [Dewy](https://www.dewy.io/practice-type/plastic-surgery-crm) and [Aesthetix CRM](https://aesthetixcrm.com/) — competitor analysis
- [Wati messaging rate limits](https://www.wati.io/en/blog/whatsapp-business-api/whatsapp-api-rate-limits/) — quality rating system
- [Puppeteer memory leak post-mortem](https://medium.com/@matveev.dina/the-hidden-cost-of-headless-browsers-a-puppeteer-memory-leak-journey-027e41291367) — OOM patterns

### Tertiary (LOW confidence)
- [WhatsApp Business API healthcare templates](https://d7networks.com/blog/whatsapp-business-api-for-healthcare/) — template approval for healthcare (BSP editorial)
- [AI-Resilient WhatsApp Strategies 2026](https://aijourn.com/ai-resilient-whatsapp-strategies-navigating-the-2026-account-ban-wave/) — account ban wave context

---
*Research completed: 2026-02-21*
*Ready for roadmap: yes*
