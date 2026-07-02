# Feature Research

**Domain:** Aesthetic surgery SaaS — structured pre-surgical HC template + patient self-management portal (v1.12)
**Researched:** 2026-06-25
**Confidence:** HIGH (existing codebase reviewed; domain verified against competitor products, clinical literature, and Argentine legal context)

---

## Context

This is a milestone research file for an established product, not greenfield. The features described here extend an existing clinical history system (v1.8–v1.11), an existing token-based public portal (presupuesto acceptance, v1.0), an existing WhatsApp/email delivery stack (v1.0), and an existing in-app staff chat (MensajeInterno). Research answers "what does this domain expect?" for two areas:

**Area A:** Structured PREOPERATORIO entry in the clinical history — replacing free-text with a step-by-step form capturing antecedentes, alergias, medicación, estudios complementarios, and consent checkbox.

**Area B:** Public token-based patient portal — patient corrects/completes personal data, self-reports health info, signs consent PDF with a drawn signature, and sends messages to the doctor's inbox.

Existing capabilities not to re-research: JWT auth + roles, patient CRUD, HC with templates and TipoEntradaHC (PREOPERATORIO already exists), ZonaHC/DiagnosticoHC/TratamientoHC catalog with learning (v1.9), token-based presupuesto portal (v1.0), WhatsApp Cloud API + BullMQ (v1.0), email/PDF (v1.0), QR code generation via qrcode library (v1.2), MensajeInterno in-app chat.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that any pre-op or patient portal product is assumed to have. Missing these = the product feels incomplete or unsafe.

#### Sub-area A: Structured Pre-Surgical HC Template

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Antecedentes patológicos as selectable chips | Every pre-op form worldwide captures pathological history (HTA, DBT, cardiopatías, EPOC, etc.) as a checklist, not free text. Chips prevent misspelling and enable downstream reporting. | MEDIUM | Chips + "Otro" pattern mirrors v1.9 catalog learning. Persist selected items to `Paciente.condiciones[]`. Seed common conditions (HTA, Diabetes tipo 1, Diabetes tipo 2, Cardiopatía, EPOC, Hipotiroidismo, Obesidad, Insuficiencia renal, etc.). |
| Alergias as selectable chips | Allergies are a patient safety field; anesthesiologists, nurses, and surgeons all check them before any procedure. Latex and AINES are especially critical in aesthetic surgery. | MEDIUM | Same chip + learning pattern. Persist to `Paciente.alergias[]`. Seed: Penicilina, AINES (aspirina/ibuprofeno), Látex, Yodo, Anestesia local, Sulfas. Allergy type/reaction free-text is a nice-to-have, NOT required for v1.12. |
| Medicación preexistente as selectable chips | Anticoagulants, antihypertensives, SSRIs, and corticosteroids all directly affect surgical risk. Every anesthesiologist checklist includes current medications. | MEDIUM | New `Paciente.medicacion[]` field. Seed common: Aspirina, Metformina, Enalapril, Atorvastatina, Levotiroxina, Sertralina, Corticoides, Anticoagulantes orales. Chip + learning: same pattern as alergias. |
| Complementary studies checklist | Laboratorio, Electrocardiograma, and Imágenes are universally ordered before aesthetic surgery under general or regional anesthesia. A checklist confirms they have been ordered, not just that they exist. | LOW | Structured checkboxes: Laboratorio (checkbox), ECG (checkbox), Imágenes > Ecografía / Tomografía / Mamografía / Otro (sub-options). Store as JSONB on the HC entry. Each item has a boolean "solicitado" state. "Pending studies" reporting is a differentiator (see below). |
| Informed consent checkbox (audit field) | Any surgical system must capture that the patient was informed and consented. Ley 26529 (Argentina) requires written consent for surgical procedures. A checkbox in the HC creates the staff-side audit record. | LOW | Audit fields: `consentimientoVerbalRegistradoPor` (userId), `consentimientoVerbalRegistradoAt` (server timestamp). This is separate from the patient-signed consent PDF in Area B. Both can and should coexist. |
| Optional zona/diagnóstico/tratamiento catalog selector | Clinicians adding a PREOPERATORIO HC entry may want to associate the planned surgical zone and diagnosis (e.g., "Mamas / Hipoplasia / Mamoplastia de aumento"). This links the pre-op record to the existing clinical catalog. | LOW | Optional step — can be skipped. Reuse PrimeraConsultaForm's zone selector with multi-zone support (v1.9). No new backend work beyond the existing HC entry creation flow. |

#### Sub-area B: Patient Self-Management Portal

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Token-based portal access (no password) | Every modern patient portal for one-off surgical workflows uses a single-use or long-lived token link sent via WhatsApp or email. No app install, no account creation. Reduces friction to near zero. | MEDIUM | Reuse the existing token-based presupuesto acceptance portal architecture. New `PortalToken` type: `PREQUIRURGICO`. Token tied to a specific Paciente + Turno (the pre-quirúrgico appointment). |
| Basic info review/update (name, phone, email, address) | Every pre-admission workflow lets the patient correct their contact data before the procedure so the clinic has accurate emergency contact info. | LOW | Read the current Paciente fields, let patient edit: nombre, apellido, telefono, email, direccion. Explicitly exclude: obra social, nro afiliado, fecha de nacimiento (clinical/financial), any clinical fields. Backend: `PATCH /portal/:token/datos-personales`. |
| Health self-report: addictions, diseases, prior treatments | Equivalent of the nurse triage questionnaire. Patient self-reporting before the appointment frees clinical staff time and gives the surgeon a baseline to verify during the pre-op visit. | MEDIUM | Map to: condiciones[] (diseases), alergias[] (allergies), medicacion[] (medications), and a free-text field "tratamientos previos relacionados". Patient answers are staged, not written directly to the HC — the surgeon reviews and confirms in the structured HC template (Area A). |
| Consent PDF view and download | Patients expect to read what they are signing before signing it. Providing the PDF upfront — rather than a printed copy at the clinic — is standard in modern surgical consent workflows. | MEDIUM | Doctor uploads a PDF per procedure (or per turno). PDF stored as a file reference. Portal serves a signed URL to the PDF. This requires file storage (S3-compatible or Supabase Storage). |
| Drawn signature on consent (canvas, mobile-optimized) | A drawn signature on a consent document has materially higher legal standing than a checkbox in Argentina and anywhere. Under Ley 25506 it constitutes a "firma electrónica" (not "firma digital" certified, but valid as acknowledgment evidence). | HIGH | Use `szimek/signature_pad` (HTML5 canvas, widely used, MIT license). Capture as Base64 PNG. Generate a signed PDF embedding the signature image using PDFKit (already in the stack). Store the signed PDF immutably. Audit trail fields required — see Consent Audit section. |
| "Informed of pre-op instructions" checkbox | Standard in pre-admission portals: patient confirms they read the pre-op preparation instructions (what to eat/drink, medications to stop, etc.). The instructions are typically on the clinic's website per procedure. | LOW | Checkbox with link to the pre-op instructions URL. The URL is configurable per procedure type (stored in TipoTurno or per-turno). Audit: timestamp + boolean stored on the portal session. |
| Patient question inbox (async, not real-time) | Patients consistently have questions after receiving the portal link ("Can I take my blood pressure medication?", "When do I need to stop eating?"). A structured inbox is table-stakes — the alternative (calling the clinic) has worse UX and creates phone burden for the secretary. | MEDIUM | Patient writes a text message in the portal. Message is stored and appears in the in-app staff chat (MensajeInterno) flagged as `origen: PACIENTE_PORTAL`. Staff responds in the existing in-app chat. No real-time response in the portal itself — async only. |

---

### Differentiators (Competitive Advantage)

Features that distinguish this product from commodity clinical software in the Argentine aesthetic surgery market.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Share portal link via WhatsApp + QR code in clinic | WhatsApp link delivery is expected; QR in the pre-op appointment widget lets the secretary show the code on screen or print it. A patient scanning a QR in the waiting room and completing their form before the appointment ends is a meaningful UX win. | LOW | WhatsApp: reuse existing WA Cloud API send infrastructure. QR: `qrcode` library already in stack (v1.2). QR encodes the portal URL for the specific token. Both triggered from the pre-quirúrgico appointment card in the agenda. |
| "Pending studies" tracking dashboard | When the complementary studies checklist marks Laboratorio or ECG as "solicitado", the system can surface all patients with pending studies as a filterable list for the coordinator. Today, coordinators track this in paper or memory. No competitor in this market segment surfaces this automatically. | MEDIUM | New view or filter: "Pacientes con estudios pendientes". Filter: HC entries with TipoEntradaHC=PREOPERATORIO and at least one estudio marked solicitado but no confirmed result. Confirmation: a simple "recibido" checkbox the secretary checks when lab results arrive. This needs a new `resultadosConfirmados` boolean per study type. |
| Patient health self-report pre-fills doctor's HC form | When a patient completes the portal health questionnaire, their responses appear in the structured HC Preoperatoria template as a suggested draft. The doctor reviews, corrects, and confirms — not entering from scratch. This is the "pre-fill from patient" pattern used by Buddy Healthcare and Synopsis in the NHS. Saves 5-10 minutes per pre-op visit. | MEDIUM | Requires the portal responses to be staged in a `PortalRespuesta` model linked to Paciente. When the doctor opens the PREOPERATORIO HC creator, the system loads the portal responses as defaults. Doctor can override any field. |
| Chat cleanup: filter system messages from in-app chat | The in-app MensajeInterno chat is currently saturated with automatic "Seguimiento CRM" messages, making real messages hard to find. Filtering or visually segregating system messages from human messages is a direct usability improvement. | LOW | Add a `tipo` field (or `esAutomatico` boolean) to MensajeInterno. Existing CRM automation messages get `esAutomatico: true`. UI renders them in a collapsed/dimmed style or behind a "show system messages" toggle. No new endpoint needed — same data model, different render. |
| Step-by-step wizard UX for portal (one section per screen) | For a non-technical patient completing the portal on their phone (likely 5+ years of smartphone experience, not tech-savvy), a single-page form with 30 fields is abandonment-inducing. A step-by-step flow (4 steps, progress bar) matches the UX pattern of successful patient intake products (Klara, ModMed, Symplast). | MEDIUM | 4 wizard steps: (1) Datos personales, (2) Salud: condiciones + alergias + medicación, (3) Consentimiento: view PDF + sign + instructions checkbox, (4) Preguntas: optional message to doctor. Progress bar at top. Each step saves independently. If patient closes and reopens the link, they resume at the step they left off. |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time chat channel in patient portal | "Patients want to message us instantly" | Creates a third communication channel (alongside WhatsApp and phone). Staff must monitor three inboxes. WhatsApp already provides near-real-time messaging. Adding another channel splits attention without adding value. | Async question inbox in the portal routes to MensajeInterno. WhatsApp remains the real-time channel. |
| Obra social / plan editing in patient portal | "Let patients correct their insurance info" | Obra social data is financial and affects billing. Patient entry without staff verification creates data integrity problems. Insurance changes require staff confirmation. | Staff edits obra social in the admin panel. Portal is limited to contact data (name, phone, email, address). |
| Appointment booking from portal | "Self-scheduling reduces phone calls" | Entire product scope change. Requires slot availability logic, booking rules, cancellation policy, calendar sync — a separate product feature. Argentine aesthetic surgery practices use phone/WhatsApp for scheduling culturally. | The pre-op portal is triggered by an existing appointment. The portal completes the pre-admission workflow for a turno the clinic already created. |
| Patient uploads their own lab results to the portal | "Digital convenience" | Patients would upload photos of paper results, wrong documents, or corrupted files. Staff can't validate format or completeness. Creates a file management burden. Storage costs grow unpredictably. | Secretary receives paper/digital results and confirms them in the studies checklist. The "recibido" boolean captures completion without patient file upload. |
| Automated drug interaction checking | "Patient safety" | Requires a licensed drug interaction database (e.g., Multum, Lexi-Comp). These are expensive, require maintenance, and create regulatory/liability exposure if the check is wrong or incomplete. This is the anesthesiologist's job, not the software's. | Surface the medication list clearly in the pre-op template so the anesthesiologist can review. Warn staff if the medication list is empty. Do not auto-check interactions. |
| Video-recorded consent | "More defensible" | Complex infrastructure (video storage, streaming, consent-to-record). Argentine courts do not specifically require video consent. Massive scope creep. | Drawn signature + PDF with audit trail is legally sufficient and simpler. |
| Biometric identity verification in patient portal | "Verify the right patient signed" | No Argentine patient has a biometric-verified account in this system. Any verification method would require the patient to onboard a separate identity system. Over-engineered for the use case. | Token is sent to the patient's registered phone/WhatsApp. Possession of the token is the identity verification method, same as the presupuesto acceptance portal. Document in audit trail as `authMethod: "portal_token"`. |
| Full patient-visible clinical record | "Patient right to access their record" | Exposing the full HC (with professional notes, treatment costs, diagnostic codes) to patients creates privacy complexity, requires careful data sanitization, and is out of scope for a pre-op intake portal. | Portal shows only the consent PDF the doctor explicitly uploaded. No other HC data is exposed. |
| PDF editing or consent form builder | "Custom consent templates" | A consent form builder is a product in itself. Clinicians in Argentina already have Word/PDF templates they use. | Doctor uploads an existing PDF per procedure. The platform is not a form builder — it is a signing and delivery mechanism. |

---

## Consent Audit Trail: Required Fields

This is a legally and medically sensitive area. The drawn signature on the consent PDF creates a document that may be used in a malpractice dispute. The audit trail must be immutable and complete.

### Minimum Required Fields (store on `ConsentimientoFirmado` model)

| Field | Type | Why Required |
|-------|------|--------------|
| `firmadoAt` | DateTime (server UTC) | Timestamping must be server-side, never from the patient's device clock. Prevents backdating. |
| `ipFirmante` | String | IP address of the device that completed the signature. Geographic and identity evidence. |
| `userAgent` | String | Browser/device fingerprint. Confirms signature was done from a real device. |
| `documentoVersion` | String | SHA-256 hash or version identifier of the PDF that was shown to the patient. Proves the patient signed the current version, not an older one. |
| `firmaImagenBase64` | Text | The drawn signature as a Base64 PNG. Stored separately from the PDF in case the PDF needs to be regenerated. |
| `pdfFirmadoUrl` | String | URL to the generated signed PDF (consent PDF + signature embedded). Must be immutable — this URL should never be overwritten. |
| `portalToken` | String | The token used to authenticate the portal session. Links the signature to the patient's portal access event. |
| `authMethod` | String | Always `"portal_token"` for portal-based signatures. Future-proofs against other auth methods. |
| `pacienteId` | Int | Foreign key to Paciente. |
| `turnoId` | Int | Foreign key to Turno (the pre-quirúrgico appointment this consent belongs to). |
| `profesionalId` | Int | Foreign key to Profesional (tenant isolation). |

### Retention requirement
The signed PDF must never be deletable by normal application flows. Ley 26529 (Argentina) requires medical records to be retained for a minimum of 15 years for adults. The signed consent is part of the medical record. Implement soft-delete only; physical deletion should require an admin override with explicit reason.

---

## UX Design: Non-Technical Patient on Mobile

### Context
The typical patient completing this portal is: 35–65 years old, using a WhatsApp link on an Android phone, comfortable with social media but not with multi-page web forms. They are likely doing this at home, possibly anxious about the upcoming surgery.

### Non-negotiable UX rules

| Rule | Rationale |
|------|-----------|
| One section per screen (wizard, not multi-column form) | Research on patient portal completion rates consistently shows that single-question or single-section flows outperform long-form pages by 40-60%. Source: Pabau, Klara, ModMed design documentation. |
| Show a progress indicator ("Paso 2 de 4") | Patients abandon forms when they don't know how long they'll take. A progress bar is table-stakes for wizard flows. |
| Chips > radio buttons > text inputs for health questions | Touch targets on chips are larger and more forgiving than radio inputs. Chips can be pre-seeded with common answers. Free text ("Otro") appears only when the chip list doesn't cover the answer. This mirrors v1.9 catalog UX. |
| Auto-save on each step completion | If the patient closes the link and reopens it, they must resume at the step they left off. Losing progress causes immediate abandonment and angry phone calls to the clinic. |
| Confirm screen when done | Explicit "Listo, tu información fue enviada" screen. No ambiguity about whether the form was submitted. |
| Large font, high contrast | Patients 50+ are primary users. Tailwind `text-base` minimum (16px). |
| Spanish, informal register | "tu" not "usted". "¿Cuáles de estas condiciones tenés?" not "Seleccione sus antecedentes patológicos". |
| No login, no password creation | Token link is the only authentication. Every additional step (create account, verify email) reduces completion by 15-30% based on healthcare form research. |

### Wizard step structure

```
Step 1: Tus datos
  - Revisá y corregí tu nombre, teléfono, email y dirección
  - Read-only display of current data; editable fields

Step 2: Tu salud
  - Condiciones: chips (HTA, Diabetes, etc.) + "Otra"
  - Alergias: chips (Penicilina, AINES, Látex, etc.) + "Otra"
  - Medicamentos: chips + "Otro"
  - Tratamientos previos relacionados: one free-text field

Step 3: Consentimiento
  - View/download consent PDF button
  - Signature pad: "Firmá con tu dedo" (large canvas area)
  - Checkbox: "Leí las instrucciones preoperatorias" (with link)

Step 4: ¿Tenés preguntas?
  - Optional: text area for a message to the doctor
  - "Enviar mensaje" or "No tengo preguntas, terminar"
```

---

## Feature Dependencies

```
[HC Preoperatoria: antecedentes/alergias/medicacion chips (HCP-02, HCP-03, HCP-04)]
    └──requires──> [New DB fields: Paciente.condiciones[], Paciente.alergias[], Paciente.medicacion[]]
    └──requires──> [Seed chips catalog (common conditions, allergies, medications)]
    └──reuses──> [chip + learning pattern from v1.9 ZonaHC/DiagnosticoHC/TratamientoHC]
    └──must precede──> [Patient portal health self-report (PP-02)] — same fields

[HC Preoperatoria: estudios complementarios checklist (HCP-05)]
    └──requires──> [New JSONB sub-structure in HC entry: estudiosComplementarios{}]
    └──enables──> [Pending studies reporting view] (differentiator)

[HC Preoperatoria: consent checkbox (HCP-06)]
    └──standalone──> [No dependencies; simple audit fields on HC entry]
    └──distinct from──> [Patient-signed consent PDF (PP-03)] — both can coexist

[Portal link sharing (SHARE-01: WA, SHARE-02: QR, SHARE-03: email)]
    └──requires──> [Patient portal token exists for the turno (PP-00)]
    └──reuses──> [WhatsApp Cloud API send (v1.0)]
    └──reuses──> [qrcode library in stack (v1.2)]
    └──triggered from──> [Pre-quirúrgico turno card in agenda or PatientDrawer]

[Patient portal: token auth (PP-00)]
    └──requires──> [New PortalToken type PREQUIRURGICO in DB]
    └──reuses──> [Token-based portal pattern from presupuesto acceptance (v1.0)]
    └──must precede──> ALL other portal steps (PP-01 through PP-04)

[Patient portal: datos personales (PP-01)]
    └──requires──> [PP-00]
    └──new endpoint──> [PATCH /portal/:token/datos-personales]

[Patient portal: health self-report (PP-02)]
    └──requires──> [PP-01]
    └──requires──> [Paciente.condiciones[], alergias[], medicacion[] fields]
    └──stages──> responses as PortalRespuesta (not written directly to HC)
    └──enhances──> [HC Preoperatoria form — pre-fills doctor's view]

[Patient portal: consent signing (PP-03)]
    └──requires──> [PP-02]
    └──requires──> [File upload: doctor uploads consent PDF per procedure/turno]
    └──requires──> [File storage (Supabase Storage or S3)]
    └──requires──> [szimek/signature_pad (new dependency)]
    └──requires──> [PDFKit (already in stack) to embed signature into PDF]
    └──requires──> [ConsentimientoFirmado model with full audit fields]
    └──CRITICAL──> Signed PDF must be immutable (no delete)

[Patient portal: inbox (PP-04)]
    └──requires──> [PP-00]
    └──reuses──> [MensajeInterno model]
    └──requires──> [New field MensajeInterno.origen: "PACIENTE_PORTAL" | "STAFF"]

[Chat cleanup (CHAT-01)]
    └──standalone──> [No dependency on portal; can ship independently]
    └──requires──> [New MensajeInterno.esAutomatico boolean]
    └──requires──> [Backfill or forward-only: only new auto messages get the flag]

[Pre-fill HC from portal responses]
    └──requires──> [PP-02 complete]
    └──requires──> [PortalRespuesta model]
    └──enhances──> [HC Preoperatoria form UX — low priority if time-constrained]
```

---

## MVP Definition

### Core for v1.12 (must ship)

#### Area A: Structured HC Preoperatoria
- [ ] HCP-01: Optional zona/diagnóstico/tratamiento selector in PREOPERATORIO HC entry (reuse existing catalog)
- [ ] HCP-02: Antecedentes patológicos chips + "Otro" with learning → persists to `Paciente.condiciones[]`
- [ ] HCP-03: Alergias chips + "Otro" with learning → persists to `Paciente.alergias[]`
- [ ] HCP-04: Medicación preexistente chips + "Otro" with learning → persists to new `Paciente.medicacion[]`
- [ ] HCP-05: Complementary studies checklist (Laboratorio, ECG, Imágenes sub-options) stored on HC entry
- [ ] HCP-06: "Paciente informado del consentimiento" checkbox with audit timestamp + userId
- [ ] SHARE-01: Share portal link via WhatsApp from the pre-quirúrgico appointment card
- [ ] SHARE-02: Display portal link as QR code from the appointment card

#### Area B: Patient Portal
- [ ] PP-00: New PREQUIRURGICO portal token type; endpoint to generate and serve
- [ ] PP-01: Step 1 — patient reviews and corrects personal contact data
- [ ] PP-02: Step 2 — patient reports condiciones, alergias, medicacion, tratamientos previos
- [ ] PP-03: Step 3 — patient views consent PDF, draws signature, PDF with embedded signature generated and stored with full audit trail; "read pre-op instructions" checkbox
- [ ] PP-04: Step 4 — patient sends optional question to in-app staff chat
- [ ] CHAT-01: Chat cleanup — `esAutomatico` flag on MensajeInterno; UI hides/collapses system messages by default

### Add after validation (v1.12.x)

- [ ] SHARE-03: Portal link via email (delivery infrastructure exists; lower priority than WA)
- [ ] PRE-FILL: HC Preoperatoria form pre-fills from PortalRespuesta when doctor opens the form
- [ ] PENDING-STUDIES: "Pacientes con estudios pendientes" filter view for the coordinator

### Future consideration (v2+)

- [ ] Studies result upload integration (external lab APIs — huge scope)
- [ ] Consent form per-procedure template builder (current: single PDF upload per turno)
- [ ] Automated pre-op instructions email N days before appointment
- [ ] Patient-accessible signed PDF download after signing (re-send from staff)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| HCP-02/03/04: antecedentes/alergias/medicacion chips | HIGH (clinical safety, saves 10 min/visit) | MEDIUM (new DB fields + chip UI) | P1 |
| HCP-05: estudios complementarios checklist | HIGH (patient safety, avoids missing ECG/lab) | LOW (JSONB sub-structure + checkboxes) | P1 |
| HCP-06: consent checkbox audit field | HIGH (Ley 26529 compliance evidence) | LOW (2 audit fields on HC entry) | P1 |
| PP-00: portal token (PREQUIRURGICO type) | HIGH (enables all portal features) | LOW (pattern already exists) | P1 |
| PP-01: datos personales update | MEDIUM (operational convenience) | LOW (simple PATCH endpoint) | P1 |
| PP-02: health self-report | HIGH (reduces pre-op data entry by staff) | MEDIUM (wizard UI + staging model) | P1 |
| PP-03: consent PDF sign with audit trail | HIGH (legal, patient safety, surgeon confidence) | HIGH (file storage + sig_pad + PDF embed + audit model) | P1 |
| PP-04: patient inbox | MEDIUM (reduces phone burden on secretary) | MEDIUM (new MensajeInterno.origen field + portal UI) | P1 |
| SHARE-01/02: WA + QR portal link sharing | HIGH (frictionless patient access) | LOW (existing WA + qrcode infra) | P1 |
| CHAT-01: chat cleanup (hide system messages) | HIGH (direct UX fix for existing pain) | LOW (boolean field + conditional render) | P1 |
| HCP-01: zona/diagnóstico/tratamiento selector | MEDIUM (optional; existing catalog works) | LOW (reuse v1.9 component) | P2 |
| PRE-FILL: HC from portal responses | HIGH (saves time in pre-op visit) | MEDIUM (PortalRespuesta model + form default injection) | P2 |
| PENDING-STUDIES: coordinator view | MEDIUM (operational safety net) | MEDIUM (new query + filter view) | P2 |
| SHARE-03: email portal link | LOW (WA covers primary use case) | LOW (existing email infra) | P3 |

---

## Competitor Feature Analysis

| Feature | Aesthetic Record | Pabau | PatientNow / Symplast | Our Approach |
|---------|-----------------|-------|----------------------|--------------|
| Patient intake portal | Web portal; patients fill forms + sign consents before appointment | Web portal with pre-care automation triggered by appointment type | Mobile-first (Symplast is app-based; PatientNow web) | Token link via WA/QR; no app install; wizard UX |
| Pre-op health questionnaire | Custom forms builder; captures medical history, allergies, medications | Custom forms sent automatically before appointment | Patient fills medical history in portal before visit | Structured chips with learning; maps to Paciente profile fields |
| Digital consent | In-portal consent signing; drawn or typed signature | In-portal consent signing | Digital consent signing in portal | PDF upload by doctor + drawn canvas signature + audit trail PDF |
| Studies checklist | Not a primary feature; usually in the doctor's template | Not specifically mentioned | Not specifically mentioned | Structured checkboxes with "pending" status; coordinator view |
| Patient messaging | Secure portal messaging | Two-way messaging within portal | In-app messaging between patient and staff | Async portal → MensajeInterno in staff chat; WhatsApp for real-time |
| Portal access method | Login-based (patient creates account) | Appointment-triggered link via SMS/email | App install (Symplast) or portal login | Token link (no login, no install); pattern from existing presupuesto portal |
| Mobile UX | Responsive web | Responsive web | Symplast: native app | Responsive wizard; chip-based inputs; mobile-first from design |

**Key differentiation:** competitors (Aesthetic Record, Pabau) require patient account creation, which creates friction. Our token-based approach (already proven in the presupuesto portal) avoids this entirely. The chip + learning pattern for health questionnaires (with data persisting to the patient profile) is more sophisticated than form-builder approaches that generate orphaned form responses.

---

## Legal and Medical Sensitivity Flags

| Area | Sensitivity | Implication |
|------|-------------|-------------|
| Signed consent PDF | HIGH — legal document, Ley 26529 | Signed PDF must be immutable. No delete endpoint. Requires `firmadoAt` server timestamp, IP, userAgent, document hash. Store separately from the consent PDF template. |
| Patient signature | HIGH — legal evidence | Drawn signature has higher legal standing than checkbox in Argentina. Under Ley 25506, a drawn signature is "firma electrónica" (valid as evidence, not as "firma digital certificada"). Store signature image separately from the PDF. |
| Medications and allergies | HIGH — patient safety | If a patient adds an allergy in the portal and it is later overwritten by a staff edit, the original must still be recoverable. Use append-only behavior or versioning for `alergias[]` and `medicacion[]`. |
| Studies checklist | MEDIUM — patient safety | Missing an ECG before a surgery with a cardiac patient is a serious adverse event risk. The pending studies view (differentiator) directly mitigates this. |
| Portal health self-report | MEDIUM — clinical validity | Patient-reported data is not validated by a clinician. The data MUST be clearly marked as "declarado por el paciente" in the HC and the doctor must explicitly confirm or override it. Do not auto-populate the HC without doctor review. |
| Medical record retention | HIGH — regulatory | Ley 26529 Art. 18: records must be retained for a minimum of 15 years for adults. Signed consent PDFs are part of the medical record. Physical deletion must require admin-level override with an explicit reason log. |
| WhatsApp portal link | LOW — privacy | The portal link contains a token. If the patient's WhatsApp is accessed by a third party, they can access the patient's data. Token should expire after use (or 30 days). This is the same risk accepted in the presupuesto portal — document and accept. |

---

## Sources

- [Electronic Pre-Operative Assessment — Buddy Healthcare](https://www.buddyhealthcare.com/en/electronic-pre-operative-assessment) — pre-op digital workflow, patient acceptability scores
- [Digital Consent in Gynecology — PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10808288/) — effectiveness of digital consent vs. paper
- [Patient Portal for Aesthetic Practices — Aesthetic Record](https://www.aestheticrecord.com/patient-portal/) — competitor feature reference
- [5 Best Plastic Surgery Software — Pabau](https://pabau.com/blog/best-plastic-surgery-software/) — competitor feature analysis
- [Audit Trail for E-Signatures — Formfy](https://formfy.ai/compliance/audit-trail-e-signature) — required audit fields
- [Audit Trail E-Signature — Blueink](https://www.blueink.com/blog/audit-trail-esignature) — IP, userAgent, timestamp, doc hash requirements
- [eConsent Software — Personify Care](https://personifycare.com/how-we-help/digital-consent-software/) — consent flow best practices
- [Evaluación Prequirúrgica — MSD Manual ES](https://www.msdmanuals.com/es/professional/temas-especiales/atenci%C3%B3n-del-paciente-quir%C3%BArgico/evaluaci%C3%B3n-prequir%C3%BArgica) — standard pre-op assessment content
- [Consentimiento Informado — Argentina.gob.ar](https://www.argentina.gob.ar/justicia/derechofacil/leysimple/derechos-del-paciente) — Ley 26529 requirements
- [Consentimiento Informado Cirugía Estética — cirugiacosmedica.com](https://cirugiacosmedica.com/consentimiento-informado-en-cirugia-estetica/) — Argentine aesthetic surgery specific
- [JavaScript Signature Pad — szimek/signature_pad GitHub](https://github.com/szimek/signature_pad) — implementation reference
- Codebase: `backend/src/prisma/schema.prisma`, `frontend/src/components/patient/`, HC entry creation flow (v1.9), token-based portal (v1.0), WhatsApp send (v1.0), PDFKit usage (v1.2)

---

*Feature research for: structured pre-surgical HC template + patient self-management portal (v1.12)*
*Researched: 2026-06-25*
