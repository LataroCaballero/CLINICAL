# Feature Research

**Domain:** Patient conversion CRM for aesthetic surgery / elective medical procedures (SaaS, single surgeon to small multi-professional clinic)
**Researched:** 2026-02-21
**Confidence:** MEDIUM-HIGH (competitor analysis from multiple public sources; no direct user interviews)

---

## Context: What "Conversion" Means Here

The funnel for a plastic/aesthetic surgery practice runs:

```
Inquiry (lead) → Consultation booked → Consultation attended → Quote sent →
Quote accepted → Surgery scheduled → Surgery performed → Post-op follow-up → Loyalty / referral
```

Every handoff in this funnel is a drop-off risk. The CRM's job is to make those handoffs visible and automatically assisted. The existing platform already has: Kanban by EtapaCRM, temperatura, motivo de pérdida, scheduler diario, dashboard with KPIs. Research below addresses what is still missing.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features clinics assume any CRM has. Missing these means the product feels broken or incomplete — clinics won't pay for it.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Kanban / pipeline visual** | Industry standard. Every competitor (Nextech, PatientNow, Dewy, Aesthetix) has a visual pipeline. Users think in "stages." | LOW | Already implemented (EtapaCRM + Kanban board). |
| **Lead temperature / priority signal** | Coordinators need to triage dozens of patients quickly. Hot/warm/cold is the minimum vocabulary. | LOW | Already implemented (TemperaturaPaciente). |
| **Quote / presupuesto tracking** | Sending a quote is a critical funnel event. Knowing if it was seen/accepted/rejected is table stakes. | MEDIUM | Partially implemented (PATCH rechazar / marcar-enviado). PDF generation and delivery tracking are still stubs. |
| **Automated appointment reminders** (SMS/WhatsApp/email) | Reduces no-shows. Universally present in all competitors. Patients expect it. | MEDIUM | Not implemented. No-show rate reduction is cited as major ROI driver. |
| **Loss reason tracking** | Clinics want to know *why* patients don't convert. Minimum: price / timing / decided elsewhere / ghosted / not a candidate. | LOW | Partially implemented (MotivoPerdidaCRM enum). UI to log and report this must be surfaced. |
| **Basic conversion analytics** | Funnel drop-off by stage, weekly consultation-to-surgery rate. Every competitor dashboard shows this. | MEDIUM | Partially implemented (GET /reportes/crm, CRMFunnelWidget). Needs more granularity. |
| **Multi-channel contact log** | Every interaction (call, WhatsApp, email, in-person) must be logged against the patient. Coordinators need to see history before calling. | MEDIUM | Not implemented. Currently no contact-log model. |
| **Daily action list ("a quién contactar hoy")** | Without this, coordinators open the kanban and don't know where to start. Every effective sales CRM has a "today's tasks" view. | MEDIUM | Listed as active requirement in PROJECT.md. Not yet built. |
| **Patient search with CRM context** | Search should surface CRM stage and temperature alongside name/procedure. Clinics with 200+ leads can't operate without this. | LOW | Patient search exists; CRM fields visible in kanban. Needs integration in search/list view. |
| **Consultation outcome recording** | After a consultation, what happened? (Interested, needs time, declined, ready to book). This drives next stage. | LOW | Maps to EtapaCRM transition. Currently manual via kanban. Needs prompted workflow. |

---

### Differentiators (Competitive Advantage)

Features not universally present, but ones that set a simpler, focused SaaS apart from the heavy incumbents (Nextech, PatientNow). The sweet spot: things that large platforms do poorly because they're built for enterprise, but that a single-surgeon clinic needs urgently.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **WhatsApp integration (send from platform)** | WhatsApp is the default communication channel in Latin America. Competitors focus on SMS/email. A WhatsApp-native CRM is a structural advantage for LATAM market. | HIGH | Requires Meta Business API approval. Must plan email fallback. Already in PROJECT.md active requirements. |
| **One-click quote send via WhatsApp/email with PDF** | Closing the loop from presupuesto → delivery → acceptance tracking in one flow eliminates manual steps that cause quotes to go cold. | MEDIUM | Presupuesto module exists; PDF and delivery channel are stubs. High impact, moderate complexity. |
| **Context-rich daily task card** | Not just "call patient X" — show last interaction date, stage, temperatura, procedure interest, and last note. Makes coordinators 3x faster. | MEDIUM | No competitor does this elegantly for small clinics. Large ones have it but buried in complexity. |
| **Automated follow-up sequences by trigger** | "30 days since consultation with no response → send WhatsApp message automatically." Reduces coordinator workload. Competitors charge enterprise pricing for this. | HIGH | Scheduler service exists (SeguimientoSchedulerService). Needs trigger-condition engine and message templates. |
| **Interconnected signals: turno → etapa, presupuesto → temperatura, pago → cierre** | Automatic stage progression when business events happen (quote sent → moves to "Presupuestado", payment received → moves to "Cerrado"). Eliminates manual bookkeeping. | MEDIUM | Partially designed in PROJECT.md. Not yet wired. Core differentiator against generic CRMs (HubSpot etc). |
| **Loss analysis dashboard** | "We lose 60% of leads at the 'quote sent' stage, and price is the #1 reason in December." Competitors report conversion rate but not structured loss analysis. | MEDIUM | Requires consistent loss reason capture + reporting. motivo_perdida field exists. |
| **Prospective revenue view** | Show the total potential revenue sitting in each funnel stage (e.g., "8 patients in 'Evaluando' representing $2.4M in potential surgeries"). Gives surgeons a financial perspective on pipeline health. | LOW | Requires linking presupuesto amounts to EtapaCRM. High perceived value, low implementation cost. |
| **Patient scoring (auto-calculated)** | scoreConversion field exists. Automatically compute score from: days since inquiry, # interactions, quote sent Y/N, consultation attended Y/N, temperature. Surface as priority sort in daily list. | MEDIUM | scoreConversion field exists in schema. No computation logic yet. |
| **Consultation preparation briefing** | Before a consultation, show coordinator/surgeon a summary: what the patient inquired about, their medical history highlights, past presupuestos, last interaction. | LOW | Can be assembled from existing data (paciente + historia clínica + presupuestos). High UX value. |
| **Before/after photo presentation in consultation** | During the consultation, show comparable anonymized results to build trust and accelerate decision. Aesthetic Record built its market around this. | HIGH | Requires photo management module (not currently in scope). Defer to v2. |
| **Referral source tracking** | Where did this lead come from? (Instagram, referral, Google, walk-in). Allows ROI by channel. Currently no campo for this. | LOW | Add campo `fuenteOrigen` to Paciente. Low complexity, high reporting value. |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that appear on wishlists but create more problems than they solve for this audience and stage.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| **Full email marketing suite (newsletters, campaigns, open tracking)** | Clinics see Mailchimp/PatientNow doing this and want it. | Email open rates in medical aesthetics are 15-20%. Building a compliant bulk email sender is a 3-month project (SPF/DKIM, unsubscribe, spam compliance). For a single surgeon, 1:1 WhatsApp always outperforms bulk email. | Provide WhatsApp message templates for 1:1 outreach. Integrate with Mailchimp if needed via webhook later. |
| **AI lead scoring with ML models** | Sounds impressive in demos. | For a single-surgeon clinic with <500 active leads, there isn't enough data to train a meaningful model. Outputs will feel arbitrary and erode trust. | Rule-based scoring (explicit formula) that users can understand and adjust. Transparency beats magic for this audience. |
| **Real-time patient chat (in-app messaging)** | Clinics want one inbox. | Patients do not use in-app chat. They use WhatsApp. Building a chat widget patients won't use is wasted effort. WhatsApp is the actual inbox. | WhatsApp Business API integration. |
| **Social media post scheduling / management** | Marketing agencies pitch "full stack" to clinics. | Out of scope for a clinic management platform. Creates feature bloat, distracts from clinical core. | Keep focus on patient relationship management post-inquiry. |
| **Automated AI-generated responses to patient inquiries** | Aesthetix CRM, Dewy both offer AI chatbots. | Legal and reputational risk in medical context. AI misquoting a price or a procedure creates liability. For Argentine/LATAM context, regulation is murky. | Provide message templates that staff personalize in one click. "Semi-auto" not "fully-auto." |
| **Multi-location / franchise reporting** | Ambitious founders project future growth. | Engineering cost is 3-5x higher (cross-tenant analytics, consolidated billing). Current architecture is per-professional. | Nail single-clinic experience first. Multi-location can be a tier-3 feature after PMF. |
| **Patient portal (patient-facing login)** | Seems like a nice patient experience. | Patients don't want another app/login. They want WhatsApp. Patient portals have <10% adoption in aesthetic medicine. | Send PDFs, confirmations, and prep materials via WhatsApp/email directly. |
| **Procedure simulation (3D/AI morphing)** | NextMotion, Crisalix offer this. | Dedicated hardware/software, expensive licensing, training requirement. Wrong tier for this product. | Partner integration (link to Crisalix from patient profile) as a v3 consideration. |

---

## Feature Dependencies

```
[Daily Action List]
    └──requires──> [Patient scoring / prioritization logic]
                       └──requires──> [Contact log (interaction history)]
                       └──enhances──> [Automated triggers / sequences]

[Quote send via WhatsApp]
    └──requires──> [WhatsApp Business API integration]
    └──requires──> [Presupuesto PDF generation]
    └──enhances──> [Quote status tracking (sent / viewed / accepted / rejected)]
                       └──enhances──> [Automatic EtapaCRM transition]

[Automated follow-up sequences]
    └──requires──> [WhatsApp Business API integration] OR [email fallback]
    └──requires──> [Trigger condition engine (time-based + event-based)]
    └──requires──> [Message template library]
    └──enhances──> [Patient scoring]

[Loss analysis dashboard]
    └──requires──> [Loss reason capture (UI prompt on Perdido stage)]
    └──requires──> [Consistent stage transition history]

[Prospective revenue view]
    └──requires──> [Presupuesto amounts linked to EtapaCRM]

[Interconnected signals (turno/pago → etapa)]
    └──requires──> [Event hooks in turnos and pagos modules]
    └──enhances──> [Patient scoring]

[Consultation preparation briefing]
    └──requires──> [Contact log]
    └──requires──> [Presupuesto listing per paciente]
    └──requires──> [Historia clínica summary]
```

### Dependency Notes

- **Daily Action List requires Contact Log:** Without a history of when the last interaction happened and what was said, the "contact today" priority is meaningless. Contact log is the foundational data layer for all action-oriented features.
- **Automated sequences require WhatsApp API:** WhatsApp is the only channel with >60% open rate for this audience in LATAM. Building sequences on email first is lower value. However, email fallback must exist for Meta approval delays.
- **Prospective revenue is a quick win:** Presupuesto amounts already exist in the DB. Joining them to EtapaCRM is a simple aggregation query. Very high perceived value for surgeons who think in revenue.
- **Interconnected signals are the core moat:** Automatic EtapaCRM progression when domain events happen (turno attended, presupuesto sent, pago received) makes CLINICAL structurally different from generic CRMs like HubSpot. It must be wired carefully with proper rollback if actions are undone.

---

## MVP Recommendation

This is a *subsequent milestone* — the base CRM already exists. The MVP for this milestone is the minimum set that makes the CRM *operationally useful* for a real clinic running it daily, without the WhatsApp integration (which has approval risk).

### Launch With (v1 — milestone deliverable)

- [x] **Daily action list** — coordinators open this first thing every morning. Without it, the kanban is decorative. Core workflow anchor.
- [x] **Contact log** — record every call/message/meeting against a patient. Enables action list priority. Required for all downstream features.
- [x] **Quote → WhatsApp/email send + PDF** — close the quote delivery loop. Currently coordinators copy amounts to WhatsApp manually.
- [x] **Automatic EtapaCRM transitions** — presupuesto sent moves to Presupuestado, pago received moves to Cerrado. Reduces manual bookkeeping.
- [x] **Prospective revenue view in dashboard** — simple aggregation, very high impact for surgeon decision-making.
- [x] **Loss reason prompt on stage change to Perdido** — ensure clean data for analytics.

### Add After Validation (v1.x)

- [ ] **Automated WhatsApp follow-up sequences** — once WhatsApp API is approved and v1 is stable. Trigger: 30/60/90 days without response.
- [ ] **Patient scoring (rule-based)** — compute from interaction recency, consultation attendance, quote status. Surface in daily list.
- [ ] **Referral source tracking (fuenteOrigen)** — single field addition, enables acquisition ROI reporting.
- [ ] **Loss analysis dashboard** — after enough data is captured with consistent loss reasons.

### Future Consideration (v2+)

- [ ] **Before/after photo library** — requires new module and storage strategy. High value but large scope.
- [ ] **Email drip campaigns** — if WhatsApp proves insufficient for some patient segments.
- [ ] **Multi-location reporting** — only after multi-clinic tier is defined commercially.
- [ ] **AI-based lead scoring** — only after >1000 closed leads provide training data.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Daily action list | HIGH | MEDIUM | P1 |
| Contact log | HIGH | MEDIUM | P1 |
| Quote PDF + send (WhatsApp/email) | HIGH | MEDIUM | P1 |
| Automatic EtapaCRM transitions | HIGH | MEDIUM | P1 |
| Prospective revenue in dashboard | HIGH | LOW | P1 |
| Loss reason prompt on Perdido | MEDIUM | LOW | P1 |
| Appointment reminders (WhatsApp/email) | HIGH | MEDIUM | P1 |
| Patient scoring (rule-based) | MEDIUM | MEDIUM | P2 |
| Automated follow-up sequences | HIGH | HIGH | P2 |
| Referral source tracking | MEDIUM | LOW | P2 |
| Consultation preparation briefing | MEDIUM | LOW | P2 |
| Loss analysis dashboard | MEDIUM | MEDIUM | P2 |
| Before/after photo library | HIGH | HIGH | P3 |
| Email drip campaigns | LOW | HIGH | P3 |
| Multi-location reporting | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for this milestone
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | PatientNow | Nextech | Aesthetix CRM / Dewy | Our Approach |
|---------|------------|---------|-----------------------|--------------|
| Pipeline/Kanban | Yes (CRM module) | Yes (Lead Mgmt) | Yes (visual pipeline) | Done (EtapaCRM + Kanban) |
| Lead temperature | Implicit (engagement score) | Score-based | Hot/warm/cold labels | Done (TemperaturaPaciente) |
| Automated reminders | Yes (SMS + email) | Yes (2-way text) | Yes | Not yet — P1 gap |
| Quote tracking | Integrated with EMR billing | Yes | Limited | Partial — needs delivery + accept flow |
| Drip campaigns | Yes (email + SMS) | Yes | Yes | Not yet — P2 (WhatsApp first) |
| Daily task list | Partial (notifications) | Partial | Task assignments | Not yet — P1 gap |
| Contact log | Yes | Yes | Yes | Not yet — P1 foundational gap |
| Loss reason capture | Not prominent | Not prominent | Not prominent | Partially (enum exists) — needs UI prompt |
| WhatsApp native | No (US-focused, SMS) | No | No | Key LATAM differentiator |
| Revenue pipeline view | Not emphasized | Limited | Not emphasized | Simple win — presupuesto join |
| Before/after photos | Yes (EMR-linked) | Yes | Yes | Defer to v2 |
| Patient scoring | AI-based (PatientNow Concierge) | Score-based | AI-based | Rule-based simpler version |
| Automatic stage transitions | No (manual) | No (manual) | No (manual) | Structural differentiator |
| Multi-channel inbox | Yes (unified) | Yes | Yes | WhatsApp + email is sufficient for LATAM |

**Key insight from competitor analysis:** The big platforms (PatientNow, Nextech) are US-centric, built around SMS and email, and complex to operate. They are expensive ($500-$2000+/month). The smaller players (Dewy, Aesthetix CRM) are marketing-first and don't integrate with clinical records. CLINICAL's structural advantage is being the only system that bridges the CRM funnel *with* the clinical record — when a turno is attended or a pago is made, the CRM updates automatically. No competitor does this natively for a single-surgeon scale.

---

## Specific Context: Argentine / LATAM Aesthetic Surgery Market

This section addresses features that differ from the US-centric research above.

| Context Factor | Impact on Features |
|----------------|--------------------|
| **WhatsApp is primary** | SMS automations (core in US competitors) are irrelevant. WhatsApp Business API is table stakes for LATAM. |
| **Informal payment flows** | Pagos may be cash, transfer, installments. The presupuesto → pago → cierre flow must handle partial payments and informal confirmation. |
| **Price sensitivity context** | "Precio" is top loss reason in LATAM aesthetics. Loss reason tracking must surface price objections specifically. |
| **No equivalent of HIPAA** | Argentina has Ley 25.326 (data protection). Patient data stays in-country. WhatsApp is widely used in clinical contexts without strong regulatory bar — lower compliance barrier than US but still requires informed consent for automated messaging. |
| **Single-surgeon / small team norm** | The primary target runs a clinic with 1 surgeon + 1-2 coordinators. Features designed for 10-person sales teams (complex role permissions, lead routing queues) are anti-features here. |
| **Consultation is the pivot point** | In LATAM aesthetics, the in-person consultation is where surgeons close deals. Anything that helps prepare for and follow up from that consultation has outsized impact. |

---

## Sources

- [PatientNow — 10 Med Spa Software Features That Drive Revenue](https://www.patientnow.com/resources/blog/med-spa-software-features-drive-revenue/)
- [PatientNow — Medical Aesthetics & Plastic Surgery Software](https://www.patientnow.com/medical-aesthetics/)
- [Nextech — Plastic Surgery Practice Management Software](https://www.nextech.com/plastic-surgery/practice-management-software)
- [Aesthetix CRM — 3 Features That Make AX CRM the Best Plastic Surgery Software](https://aesthetixcrm.com/3-features-that-make-aesthetix-crm-the-best-plastic-surgery-software/)
- [Dewy — Lead Conversion: 5 Essential Principles For Medical Aesthetic Practices](https://www.dewy.io/blog/lead-conversion-best-practices-for-medical-aesthetic-practices)
- [Dewy — Plastic Surgery CRM](https://www.dewy.io/practice-type/plastic-surgery-crm)
- [AdVital — Lead Management CRM For Plastic Surgeons & Aesthetic Clinics](https://advitalmd.com/lead-management-crm-for-plastic-surgeons-aesthetic-clinics/)
- [SymplastCRM — Boost Revenue & Efficiency](https://symplast.com/crm/)
- [Onspire Health Marketing — Optimizing Patient Acquisition Funnels in Cosmetic & Aesthetic Medicine](https://onspirehealthmarketing.com/aesthetics-dermatology/optimizing-patient-acquisition-funnels-in-cosmetic-aesthetic-medicine/)
- [Etna Interactive — 9 Expert CRM Automations That Transform Aesthetic Practice Performance](https://www.etnainteractive.com/blog/getting-the-most-from-your-crm-9-expert-automations-that-transform-aesthetic-practice-performance/)
- [Plasthetix — Best CRM for Plastic Surgeons in 2025](https://plasthetix.com/best-crm-for-plastic-surgeons/)
- [Symplast — 5 Rookie Mistakes New Practices Make When Choosing Plastic Surgery Practice Management Software](https://symplast.com/plastic-surgery-practice-management-software/)
- [Prospyrmed — Best CRM and EMR Systems for Aesthetic Clinics](https://www.prospyrmed.com/blog/post/best-crm-and-emr-systems-for-aesthetic-clinics)
- [HubSpot — 5 Best Healthcare CRM Software in 2025](https://blog.hubspot.com/marketing/best-crm-for-healthcare)
- [Rapitek — CRM for Aesthetic Clinics](https://rapitek.com/en/aesthetic-clinic-crm/)

---

*Feature research for: Patient conversion CRM — aesthetic surgery clinic SaaS (subsequent milestone)*
*Researched: 2026-02-21*
