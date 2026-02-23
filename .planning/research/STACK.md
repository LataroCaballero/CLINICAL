# Stack Research

**Domain:** Aesthetic surgery clinic SaaS — WhatsApp Business API, automated messaging, PDF generation, email delivery
**Researched:** 2026-02-21
**Confidence:** MEDIUM-HIGH (core decisions HIGH; pricing/timeline details MEDIUM due to Meta's rapid rate changes)

---

## Context: What Already Exists

The project already has partial implementations that constrain (and accelerate) choices:

| Already in Place | Version | Notes |
|-----------------|---------|-------|
| `pdfkit` | 0.17.2 | Installed, used in `reportes-export.service.ts`. Extend, don't replace. |
| `nodemailer` | 7.0.13 | Installed, SMTP-based. Already wired with `SMTP_*` env vars. |
| `@nestjs/schedule` | 6.1.0 | Cron scheduler present. BullMQ adds reliable queuing on top. |
| `redis` + `cache-manager-redis-yet` | 5.9.0 / 5.1.5 | Redis client already installed but not actively deployed. |
| `axios` (backend) | 1.13.1 | HTTP client for outbound REST calls (WhatsApp API calls). |

**Constraint:** NestJS 10.x + Node.js 20.x + Prisma 6.x + Next.js 16 + React 19. No framework changes.

---

## Recommended Stack

### 1. WhatsApp Business API — Provider

**Recommendation: 360dialog (primary) with Twilio as fallback path**

| Provider | Setup Time | Pricing Model | API Style | Sandbox | Verdict |
|----------|-----------|---------------|-----------|---------|---------|
| **360dialog** | 10–15 min | $49/mo flat + Meta rates (0% markup) | Cloud API mirror (native Meta format) | Yes | **RECOMMENDED** |
| **Twilio WhatsApp** | 2–4 weeks approval | $0.005/msg platform fee + Meta rates | Twilio REST API | Yes (free, shared number) | Fallback / dev sandbox |
| **Meta Cloud API direct** | 1–6 weeks | Meta rates only (no BSP fee) | REST/Graph API | No | Advanced option (more infra work) |

**Why 360dialog over Twilio:**
- Zero markup on Meta message rates. At clinic volumes (500–5000 msgs/month) saving 10–15% matters.
- API follows native Meta Cloud API format — documentation and template management are consistent with Meta's official docs. Less vendor lock-in.
- 10–15 min setup vs. 2–4 weeks for Twilio production approval. Critical for launching fast.
- Official BSP (Meta Business Solution Provider) — same compliance guarantees as Twilio.
- $49/month flat fee per phone number. Predictable cost.

**Why not Twilio as primary:**
- 2–4 week approval timeline blocks development velocity.
- Platform markup fee adds ~10–15% cost over Meta rates at scale.
- Twilio sandbox IS excellent for development/testing — integrate Twilio sandbox first during dev, then switch to 360dialog for production.

**Why not Meta Cloud API direct:**
- No sandbox. You must use a real phone number from day one.
- You handle all infra: token management, webhook retry logic, rate limiting. 360dialog handles this.
- Meta approval for direct access still takes 1–6 weeks.

**Integration in NestJS:** Use `axios` (already installed) for outbound REST calls to 360dialog's endpoint. Register a webhook endpoint in NestJS to receive inbound messages.

```bash
# No new SDK needed — use existing axios for 360dialog REST calls
# For Twilio sandbox during dev:
npm install twilio --save  # v5.12.2 current
```

**Confidence: MEDIUM** — 360dialog pricing verified via their docs; timeline claims from multiple sources but not Meta-official.

---

### 2. Meta Approval Timeline — Critical Planning Input

**Account verification:** 2–15 working days (documents must match legal business registration exactly)
**Display name approval:** 15 minutes to several days (medical/health names may require review)
**Message template approval:** 15 minutes to 24 hours per template
**Overall go-live estimate: 2–4 weeks minimum from application**

**Healthcare template considerations (MEDIUM confidence):**
- "Utility" category (appointment reminders, budget delivery notifications) — generally fast approval.
- "Marketing" category (follow-up campaigns, promotional sequences) — stricter review for healthcare; content must not make medical claims.
- Argentina-based businesses must have Facebook Business Manager with matching legal name.

**Pricing as of January 1, 2026 (MEDIUM confidence — Meta updates quarterly):**
- Model switched to per-message pricing (was per-conversation).
- Argentina falls in the Latin America rate card (approximately $0.04–0.06 per marketing message, lower for utility).
- Utility messages within active 24-hour service window: free.
- **Plan:** Use utility templates (appointment + budget delivery) to minimize cost. Marketing sequences are higher cost.

**Mitigation strategy:** Start Twilio sandbox integration in week 1 of development. Simultaneously submit Meta/360dialog business verification. By the time WhatsApp features are production-ready (4–6 weeks out), approval should be complete.

---

### 3. PDF Generation

**Recommendation: Keep PDFKit 0.17.2, extend with HTML template approach**

| Library | Approach | Memory | Complexity | When to Use |
|---------|---------|--------|-----------|-------------|
| **PDFKit 0.17.2** (existing) | Programmatic canvas-like | Low (~50MB) | Medium — imperative API | **KEEP. Already installed. Use for budgets/presupuestos.** |
| **Puppeteer 24.x** | HTML → PDF via headless Chrome | High (300MB+ per instance) | High — Docker config, browser pooling | Only if pixel-perfect HTML templates become a requirement |
| **@react-pdf/renderer 4.3.x** | React JSX → PDF | Low | Low-Medium — React components | If frontend team wants to own PDF templates as React components |
| **pdfmake** | JSON declarative | Low | Low | JSON-first teams; fewer customization options |

**Why stay with PDFKit:**
- Already installed and used in `reportes-export.service.ts`. Reuse patterns established.
- Low memory footprint — critical for a SaaS backend that must handle concurrent PDF requests without container bloat.
- Full control over layout — required for medical-grade presupuestos with clinic logo, itemized treatments, signature line, legal disclaimer.
- No extra Docker configuration (Puppeteer needs a Chromium binary in every container).
- `pdfkit` 0.17.2 is actively maintained (last published 6 months ago as of research date).

**Why NOT Puppeteer for this project:**
- Chromium binary adds ~300MB to Docker image — significant for a lean SaaS deployment.
- Spawning a browser instance per PDF request causes memory spikes. Browser pooling adds significant operational complexity.
- One Medium article explicitly titled "Never use Puppeteer to create NodeJS PDFs on the server" — common production mistake.
- For presupuestos (structured document, predictable layout), PDFKit's imperative API is simpler than headless browser.

**What to build:** A `PresupuestoPdfService` in the `presupuestos` module that wraps PDFKit, generating a branded PDF with: clinic logo, patient info, itemized procedures with prices, validity date, and payment terms. Return as Buffer for email attachment or streaming download.

**Confidence: HIGH** — PDFKit already in use, decision is incremental extension.

---

### 4. Email Delivery

**Recommendation: Resend (replace SMTP-only approach for transactional) + keep nodemailer as SMTP transport**

| Option | DX | Reliability | Free Tier | NestJS Integration | Verdict |
|--------|----|-----------|-----------|--------------------|---------|
| **Resend 6.x** | Excellent — React Email templates | High — managed delivery | 3,000/mo free, then $20/mo | `resend` npm package, use directly | **RECOMMENDED for transactional** |
| **Nodemailer (current)** | Good — template-based | Depends on SMTP server quality | Free (own SMTP cost) | `@nestjs-modules/mailer` | **Keep for low-volume/internal, SMTP fallback** |
| **SendGrid** | Good | High | Retired free plan May 2025; $19.95/mo | `@sendgrid/mail` | Overkill for this scale; removed free tier |
| **AWS SES** | Moderate | High | $0.10/1000 emails | `aws-sdk` | Better at 50K+ emails/month; adds AWS dependency |

**Why Resend:**
- Built by the React Email team — native integration with `react-email` for writing beautiful budget delivery emails as JSX components.
- Clean, modern REST API. No SMTP configuration drift.
- 3,000 emails/month free — sufficient for early clinic volumes.
- Works alongside `nodemailer` — you can keep existing SMTP email for scheduled reports and use Resend for transactional emails (budget delivery, WhatsApp fallback).
- `resend` npm package is 6.9.2 — current, actively maintained.

**Why not replace nodemailer entirely:**
- `nodemailer` already handles scheduled report emails via SMTP. That system works. Don't touch it.
- SMTP is the right fallback if Resend has an outage.
- Different use cases: Resend for "patient-facing transactional emails" (budget, confirmation), nodemailer for "internal/admin reports."

**React Email templates (optional enhancement):**
- `react-email` + `@react-email/components` allows writing email templates as React JSX that renders to HTML strings. Can run server-side in NestJS.
- Use `@react-email/render` to convert React component → HTML string → pass to Resend.

```bash
# Backend additions
npm install resend              # v6.9.2 — Resend SDK

# Optional: React Email templates
npm install react-email @react-email/components  # v5.2.8 / v1.0.8
```

**Confidence: HIGH** — Resend pricing and API verified via npm and official docs. React Email Node.js compatibility verified.

---

### 5. Job Queue for Automated Sequences

**Recommendation: BullMQ + @nestjs/bullmq (upgrade from @nestjs/schedule for reliable async jobs)**

| Approach | Reliability | Delayed Jobs | Retry Logic | Monitoring | Verdict |
|---------|-------------|--------------|-------------|-----------|---------|
| **@nestjs/bullmq + Redis** | High — Redis-backed persistence | Yes — native | Yes — configurable backoff | Bull Board UI | **RECOMMENDED** |
| **@nestjs/schedule** (current) | Low — in-process cron only | No | No | None | Keep for simple daily cron. Not for reliable async sequences. |
| **pg-boss** | High — Postgres-backed | Yes | Yes | Limited | Good if no Redis; adds schema to your DB |
| **Agenda** | Medium — MongoDB-based | Yes | Yes | Limited | Wrong DB for this stack |

**Why BullMQ:**
- Redis is already installed (`redis` 5.9.0, `cache-manager-redis-yet`). BullMQ adds zero new infrastructure dependencies.
- Delayed jobs: schedule "send follow-up WhatsApp in 30 days" as a persisted job — survives server restarts.
- Failed job retry with exponential backoff: if WhatsApp API call fails, retry 3x before alerting.
- Dead letter queue: failed messages go to failed queue, visible for debugging.
- `@nestjs/bullmq` v11.0.4 — current. Requires NestJS 10+ and Node.js 20+ (both already satisfied).
- Bull Board provides a web UI for monitoring queues — add to admin routes.

**Use cases for queues in this project:**
1. `whatsapp-send` queue: fire-and-forget WhatsApp message delivery with retry.
2. `email-send` queue: budget PDF + Resend email with retry.
3. `follow-up-sequence` queue: delayed job created when patient enters CRM stage, executes WhatsApp/email after N days.
4. `pdf-generation` queue: async PDF generation for large presupuestos.

```bash
# Backend additions
npm install @nestjs/bullmq bullmq  # @nestjs/bullmq v11.0.4, bullmq v5.70.0
```

**Compatibility note:** `@nestjs/bullmq` v11 is designed for NestJS v11; however NestJS v10 is compatible per community reports. The connection must be explicitly defined — no localhost default. Use the existing Redis connection from `redis` package.

**Confidence: MEDIUM-HIGH** — BullMQ and NestJS integration well-documented; v11/v10 cross-compatibility is MEDIUM (community reports, not official docs).

---

## Complete Installation Summary

```bash
# From backend/ directory

# WhatsApp (dev sandbox only — replace with 360dialog in production)
npm install twilio                    # v5.12.2

# Email — Resend for transactional patient emails
npm install resend                    # v6.9.2

# React Email templates (optional, for beautiful budget emails)
npm install react-email @react-email/components

# Job queues — reliable async sequences
npm install @nestjs/bullmq bullmq     # v11.0.4 / v5.70.0

# PDF — NO NEW INSTALL. pdfkit 0.17.2 already present. Extend existing service.
# Email SMTP — NO NEW INSTALL. nodemailer 7.0.13 already present. Keep.
```

**New environment variables needed:**
```
# WhatsApp (360dialog production)
WABA_API_KEY=                        # 360dialog API key
WABA_PHONE_NUMBER_ID=                # WhatsApp phone number ID

# WhatsApp (Twilio sandbox — dev only)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=                # whatsapp:+14155238886

# Email — Resend
RESEND_API_KEY=

# Queue — Redis (already have DATABASE_URL pattern to follow)
REDIS_URL=                           # redis://localhost:6379
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| WhatsApp provider | 360dialog | Twilio (primary) | 2–4 week approval delay; per-message markup; use Twilio sandbox for dev |
| WhatsApp provider | 360dialog | Meta Cloud API direct | No sandbox; all infra on you; same approval delay |
| WhatsApp provider | 360dialog | WATI / Interakt | Platform-focused (UI tools), not raw API for SaaS embedding |
| PDF | PDFKit (existing) | Puppeteer | +300MB Docker image; browser pooling complexity; overkill for structured documents |
| PDF | PDFKit (existing) | @react-pdf/renderer | Viable future option if team prefers React; no advantage over existing PDFKit |
| Email | Resend | SendGrid | Removed free tier (May 2025); higher complexity; overkill at clinic volumes |
| Email | Resend | AWS SES | Adds AWS dependency; complex setup; better at 50K+ emails/month |
| Job queue | BullMQ | pg-boss | Redis already installed; BullMQ has better NestJS integration |
| Job queue | BullMQ | @nestjs/schedule only | In-process, no persistence, no retry — wrong for reliable async sequences |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Twilio as primary WhatsApp provider** | 2–4 week approval delay; per-message platform markup; slower time to market | 360dialog for production; Twilio sandbox for development |
| **Puppeteer for presupuesto PDFs** | ~300MB Chromium binary per container; memory spikes; complex Docker config; browser pooling required for scale | PDFKit (already installed) — adequate for structured medical invoices |
| **Replacing nodemailer entirely** | It already handles scheduled report emails. Working system. | Keep nodemailer for SMTP reports; add Resend for patient-facing transactional emails |
| **@nestjs/bull (legacy Bull)** | Bull is in maintenance mode; BullMQ is the active successor with TypeScript-first design | `@nestjs/bullmq` with BullMQ v5 |
| **WhatsApp unofficial APIs (Baileys, whatsapp-web.js)** | Terms of Service violation; account ban risk; not suitable for SaaS | Official WhatsApp Business Cloud API via 360dialog |
| **Hardcoding WhatsApp templates** | Templates must be pre-approved by Meta. Unapproved template messages will be rejected by the API | Store templates in DB with their Meta template IDs; manage approval lifecycle |

---

## Stack Patterns by Variant

**If Redis is not available in production (early deployment):**
- Use `pg-boss` instead of BullMQ (Postgres-backed queue — same DB already running).
- Skip delayed job sequences; rely on `@nestjs/schedule` cron for daily follow-up checks.
- Migrate to BullMQ when Redis is provisioned.

**If WhatsApp approval takes >4 weeks:**
- Launch PDF + email budget delivery first (no WhatsApp dependency).
- Use Twilio sandbox for internal QA testing of WhatsApp flows.
- Email is the functional fallback for all automated sequences.

**If budget PDF needs to be pixel-perfect (clinic branding):**
- Add `Puppeteer` scoped to a separate `pdf-service` module with singleton browser instance pool.
- Do NOT use Puppeteer as a general-purpose PDF renderer — scope it only to templated HTML.

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `bullmq` | 5.70.0 | Redis >=2.8.18, Node 20+ | Requires explicit Redis connection config |
| `@nestjs/bullmq` | 11.0.4 | NestJS 10+, Node 20+ | v11 targets NestJS v11 but works with v10; test carefully |
| `resend` | 6.9.2 | Node 18+, NestJS any | Pure REST SDK, no framework coupling |
| `twilio` | 5.12.2 | Node 18+, TypeScript 4+ | Dev sandbox only; production uses 360dialog REST via axios |
| `pdfkit` | 0.17.2 (existing) | Node 14+, TypeScript via @types/pdfkit | Already installed and typed |

---

## Sources

- [360dialog pricing page](https://360dialog.com/pricing) — flat fee $49/mo, 0% message markup (MEDIUM — not dated)
- [360dialog developer docs](https://docs.360dialog.com/docs) — Cloud API setup, sandbox availability (MEDIUM)
- [Meta WhatsApp Business pricing January 2026](https://c2sms.com/meta-whatsapp-business-api-pricing-billing-updates-effective-january/) — per-message pricing model (MEDIUM)
- [WhatsApp approval timeline — Interakt](https://www.interakt.shop/whatsapp-business-api/account-approval/) — 2–15 working days (MEDIUM — third party BSP docs)
- [Twilio WhatsApp sandbox docs](https://www.twilio.com/docs/whatsapp/sandbox) — sandbox setup, free tier limits (HIGH — official Twilio)
- [Meta WhatsApp Node.js SDK GitHub](https://github.com/WhatsApp/WhatsApp-Nodejs-SDK) — official SDK exists for direct integration (HIGH — official Meta)
- [BullMQ docs — Delayed jobs](https://docs.bullmq.io/guide/jobs/delayed) — delayed job mechanism verified (HIGH — official docs)
- [BullMQ NestJS guide](https://docs.bullmq.io/guide/nestjs) — `@nestjs/bullmq` integration pattern (HIGH — official docs)
- [npm — bullmq@5.70.0](https://www.npmjs.com/package/bullmq) — version verified via `npm show` (HIGH)
- [npm — @nestjs/bullmq@11.0.4](https://www.npmjs.com/package/@nestjs/bullmq) — version verified via `npm show` (HIGH)
- [PDFKit docs](https://pdfkit.org/) — Canvas-like API, invoice generation patterns (HIGH — official)
- [LogRocket — Best HTML to PDF libraries Node.js](https://blog.logrocket.com/best-html-pdf-libraries-node-js/) — Puppeteer vs PDFKit comparison (MEDIUM — editorial)
- [npm — resend@6.9.2](https://www.npmjs.com/package/resend) — version verified via `npm show` (HIGH)
- [Resend official site](https://resend.com/nodejs) — Node.js integration, free tier (HIGH — official)
- [Resend vs SendGrid 2026](https://www.devpick.io/blog/resend-vs-sendgrid-2026) — provider comparison (MEDIUM — editorial)
- [react-email GitHub](https://github.com/resend/react-email) — JSX email templates, Resend integration (HIGH — official)
- [SendGrid retired free plan May 2025](https://forwardemail.net/en/blog/resend-vs-sendgrid-email-service-comparison) — pricing change confirmed (MEDIUM — third party)
- [Choosing WhatsApp API Provider 2026](https://prelude.so/blog/best-whatsapp-business-solution-providers) — provider comparison (LOW — editorial)
- [WhatsApp Business API healthcare templates](https://d7networks.com/blog/whatsapp-business-api-for-healthcare/) — template approval for healthcare (MEDIUM — BSP editorial)

---

*Stack research for: CLINICAL — aesthetic surgery clinic SaaS integrations milestone*
*Researched: 2026-02-21*
