# Project Research Summary

**Project:** CLINICAL v1.12 — Pre-Surgical HC Template + Patient Self-Management Portal
**Domain:** Medical SaaS — aesthetic surgery; structured pre-op intake + token-based patient portal with drawn-signature consent
**Researched:** 2026-06-25
**Confidence:** HIGH

---

## Executive Summary

v1.12 adds two tightly coupled features to an existing, established SaaS codebase: (A) a structured PREOPERATORIO entry in the clinical history — replacing free text with a chip-driven form for antecedentes, alergias, medicación, and complementary studies — and (B) a public token-based patient portal through which the patient corrects contact data, self-reports health information, draws a signature on the clinic's uploaded consent PDF, and sends questions to the staff inbox. Both features map directly onto existing architectural patterns: the presupuesto public-portal pattern for token access, and the ZonaHC/DiagnosticoHC/TratamientoHC chip-and-learning catalog pattern for the clinical chips. This is extension work, not greenfield.

The recommended approach is an 8-phase dependency-ordered build: schema first, scheduler bug fix second (isolated, high-value), staff-facing HC form third, consent PDF upload infrastructure fourth, portal backend fifth, portal frontend sixth, consent stamping seventh, and chat inbox polish last. Two new backend packages are required (`@cantoo/pdf-lib`, `@types/multer`); zero new frontend packages are needed — `signature_pad@5.1.1` is already installed. The consent PDF flow is locked: the doctor uploads a base PDF, and when the patient signs, `@cantoo/pdf-lib` stamps the drawn signature image + forensic metadata directly onto that uploaded PDF, producing an immutable signed archive.

The highest risks are legal and security, not technical. Signed consent PDFs are legal evidence under Argentine Ley 26529 (15-year retention). Three non-negotiables before go-live: (1) portal token stored SHA-256 hashed, not plaintext; (2) `@nestjs/throttler` wired into `AppModule` (it is installed but completely unconnected today); (3) patient-reported health data staged for doctor review, never auto-written to the professionally managed `alergias[]`/`condiciones[]` fields. A pre-go-live legal review is recommended given the signed consent document's evidentiary status.

---

## Key Findings

### Recommended Stack

v1.12 requires exactly two new backend packages. `@cantoo/pdf-lib@^2.7.1` is the only viable tool for loading an existing PDF and stamping a PNG image onto it — PDFKit (already in the stack) can only create PDFs from scratch and cannot modify an uploaded file. `@types/multer@^2.1.0` provides TypeScript types for the multer runtime already bundled inside `@nestjs/platform-express`. Static file serving uses `app.useStaticAssets()` from the existing Express adapter — no additional serve-static module is needed (the `@nestjs/serve-static@5.x` version requires NestJS 11, incompatible with this project's NestJS 10). The `pdf-lib@1.17.1` original package is inactive (last release Nov 2021); always use the `@cantoo/pdf-lib` fork which is actively maintained (last release May 2026).

**Core technologies:**
- `@cantoo/pdf-lib@^2.7.1` (NEW): Load doctor-uploaded consent PDF, embed PNG signature, stamp timestamp — the only pure-JS option for modifying existing PDFs
- `@types/multer@^2.1.0` (NEW devDep): TypeScript types for `Express.Multer.File`; multer runtime already bundled with `@nestjs/platform-express`
- `signature_pad@^5.1.1` (EXISTING): Already installed; write a thin `'use client'` React wrapper (~40 lines); do NOT use the alpha `react-signature-canvas` wrapper
- `pdfkit@^0.17.2` (EXISTING): Unchanged — continues generating presupuesto/factura PDFs; NOT used for consent (cannot modify uploaded files)
- `crypto` / `fs/promises` / `path` (Node built-ins): `crypto.randomUUID()` for filenames, `crypto.createHash('sha256')` for PDF hash and portal token hashing; no `uuid` package needed
- `@nestjs/platform-express` (EXISTING): Provides multer runtime, `MulterModule`, `@FileInterceptor`, `diskStorage`, and `app.useStaticAssets()` — all without additional installs

**Version constraint:** Do NOT install `@nestjs/serve-static@5.x` — requires NestJS 11; this project is on NestJS 10. Use `app.useStaticAssets()` in `main.ts` instead.

### Expected Features

**Must have (table stakes — v1.12 core):**
- HCP-02/03/04: Antecedentes, alergias, medicación as chip selectors with "Otro" free-text entry and auto-learning — data persists to `Paciente.condiciones[]`, `Paciente.alergias[]`, new `Paciente.medicacion[]` — mirrors v1.9 ZonaHC pattern exactly
- HCP-05: Complementary studies checklist (Laboratorio, ECG, Imágenes — Ecografía/Tomografía/Mamografía/Otro) stored as JSONB on HC entry; synchronous storage enables future "pending studies" reporting
- HCP-06: "Paciente informado del consentimiento" checkbox on HC form with server-side audit timestamp + userId (separate from the patient-signed PDF — both coexist)
- PP-00: Long-lived reusable per-patient portal token; token stored SHA-256 hashed in DB (NOT plaintext); generated via `POST /pacientes/:id/generar-portal-token`
- PP-01: Patient reviews and corrects contact data (nombre, telefono, email, direccion) — basic contact fields update directly; obra social, alergias, condiciones, and all clinical/financial fields are off-limits
- PP-02: Patient self-reports condiciones, alergias, medicación, tratamientos previos — ALL staged to separate `*AutoReportad*` fields; never written directly to `Paciente.alergias[]`/`condiciones[]`
- PP-03: Patient views uploaded consent PDF, draws signature, backend stamps onto uploaded PDF using `@cantoo/pdf-lib`, signed PDF archived with full forensic metadata
- PP-04: Patient sends optional question to staff inbox (MensajeInterno with `origenPaciente: true`, `autorId: null`)
- SHARE-01/02: Share portal link via WhatsApp (existing BullMQ) and QR code (existing `qrcode` library) from the appointment card
- CHAT-01: `origenPaciente` boolean on MensajeInterno to distinguish patient messages from system-generated messages; UI collapses system messages by default

**Should have (competitive differentiators — v1.12.x after validation):**
- PRE-FILL: HC Preoperatoria form pre-populates from staged PortalRespuesta when doctor opens the form (saves 5–10 min per pre-op visit)
- PENDING-STUDIES: Coordinator view of patients with outstanding complementary studies not yet confirmed received
- SHARE-03: Email portal link (WhatsApp covers primary; email infra exists for later)

**Defer to v2+:**
- External lab API integration for study results
- Per-procedure consent template builder (current: one PDF per profesional/clinic)
- Automated pre-op instructions email N days before appointment
- Patient-visible signed PDF download self-service

**Anti-features (do not build):**
- Real-time chat in portal (splits staff attention; WhatsApp is the real-time channel)
- Obra social editing in portal (financial data requires staff verification)
- Patient uploads lab results (uncontrolled file management burden)
- Automated drug interaction checking (requires licensed database, creates liability)
- Full patient-visible clinical record (scope, privacy, sanitization complexity)

### Architecture Approach

The codebase already provides all integration points needed: `Paciente.alergias String[]` and `condiciones String[]` exist, `TipoEntradaHC.PREOPERATORIO` is already in the enum, `EstudioPaciente` model exists for complementary studies, `Archivo.consentimientoPacienteId` FK is already modeled, `PresupuestoPublicController` provides the exact token-auth-less controller pattern, and `signature_pad` is already a frontend dependency. The architecture is extension, not creation. Two new catalog models (`AlergiaCatalogoPro`, `MedicamentoCatalogoPro`) follow the ZonaHC pattern with `esSistema`, `activo`, `profesionalId`, `@@unique([nombre, profesionalId])`, and idempotent seed.

**CONFLICT FLAGGED — locked decision overrides ARCHITECTURE.md section 1.3 and 3:**
ARCHITECTURE.md proposes storing consent text in `ConfigClinica.consentimientoTexto` (textarea) and generating the signed PDF fresh with PDFKit. This is REJECTED by the locked decision. The correct flow: doctor uploads a base PDF (multer → local disk); patient's drawn signature PNG is stamped onto that uploaded PDF using `@cantoo/pdf-lib`'s `PDFDocument.load()` + `embedPng()` + `drawImage()`; the resulting signed PDF is the archived artifact. `ConfigClinica.consentimientoTexto` is NOT added. PDFKit is NOT used for consent.

**Major components:**
1. `paciente-portal` module (NEW) — public controller (no `@Auth()`), `PortalJwtGuard` (scope claim check), service methods for token validation, datos update (narrow DTO allowlist), staged health submit, consent signing, portal question creation; all pacienteId derived exclusively from token lookup
2. Consent PDF upload infrastructure (NEW in config module) — multer `diskStorage`, UUID filename, PDF magic-byte validation, `StorageService` abstraction (disk now, cloud later), `app.useStaticAssets()` with `Content-Disposition: attachment`
3. `AlergiaCatalogoPro` + `MedicamentoCatalogoPro` (NEW in `catalogo-hc` module) — same CRUD + seed + esSistema guard + `@@unique([nombre, profesionalId])` as ZonaHC
4. PREOPERATORIO HC form (EXTENDED in `historia-clinica` module) — new `tipo === 'preoperatorio'` branch in `crearEntrada`, `aprenderDesdePreoperatorio` best-effort post-tx, `HCEntryContent.tsx` new renderer branch
5. Seguimiento scheduler fix (MODIFIED, isolated) — `notificada Boolean` field + 3-line service change + cleanup migration deployed atomically

### Critical Pitfalls

1. **Portal token plaintext in DB** — Store SHA-256 hash (64-char hex), not the raw UUID. URL carries raw token; DB stores hash. Stolen DB dump must not expose valid portal credentials. Do NOT copy the presupuesto token pattern which stores plaintext.

2. **`@nestjs/throttler` installed but completely unwired** — Package confirmed in `backend/package.json` v6.4.0; `ThrottlerModule` confirmed absent from `AppModule`. Zero rate limiting on any endpoint today, including existing presupuesto public portal. Wire before any portal endpoint is deployed. Apply retroactively to `presupuesto/public` as well. Add IP-based lockout after 3 failed DNI attempts per token per 15 min.

3. **Seguimiento spam requires atomic deployment of dedupe guard + cleanup** — Confirmed in code: `SeguimientoSchedulerService` never sets `completada` or `notificada`, creating a new MensajeInterno for every overdue TareaSeguimiento every day. The `notificada` field + 3-line scheduler change + `DELETE FROM "MensajeInterno" WHERE "esSistema" = true` cleanup migration MUST ship in the same release or the spam regrows within one cron cycle. Cleanup SQL is cascade-safe (`MensajeLectura.onDelete: Cascade` confirmed).

4. **Patient health data must be staged, never direct-merged** — Portal service must write to staging columns (`alergiasAutoReportadas String[]`, `antecedentesAutoReportados Json?`, `medicacionAutoReportada String[]`) only. `Paciente.alergias[]` and `condiciones[]` are staff-only. Any portal service call to `prisma.paciente.update({ data: { alergias: body.alergias } })` is a patient safety violation — a patient who misspells their allergy list could erase clinically significant data.

5. **Consent archival requires all 5 forensic fields — legally non-negotiable** — Store on consent record: `firmadoAt` (UTC, server-side only), `ipCliente`, `userAgent`, `versionConsentimiento` (integer counter, increments on each PDF upload), `pdfHash` (SHA-256 of signed PDF bytes). Argentine Ley 26529 requires 15-year medical record retention. A consent record with only `consentimientoFirmado: true` and a file path is legally indefensible. Store `pdfPath` as a relative path (not `http://localhost:...`) so it survives server changes.

6. **Drawn signature PNG prefix must be stripped before pdf-lib** — `canvas.toDataURL('image/png')` returns `data:image/png;base64,...`. `Buffer.from(fullDataUrl, 'base64')` produces garbage bytes. Always: `const buf = Buffer.from(dataUrl.split(',')[1], 'base64')`. Validate PNG magic bytes (`\x89\x50\x4e\x47\x0d\x0a\x1a\x0a`) before embedding. pdf-lib may silently render nothing for an invalid buffer rather than throwing.

7. **IDOR via body-supplied pacienteId** — Every portal endpoint must derive `pacienteId` exclusively from the token hash lookup. Never accept `pacienteId` in the request body. Write an integration test: POST to patient A's token with patient B's ID in the body; verify B is unmodified.

8. **Multer `originalname` path traversal** — Never use `file.originalname` as stored filename. Always `crypto.randomUUID() + '.pdf'`. Validate magic bytes post-write; serve with `Content-Disposition: attachment`; absolute-path guard before serving.

9. **Multi-tenant chip catalog isolation** — `AlergiaCatalogoPro` and `MedicamentoCatalogoPro` must enforce `@@unique([nombre, profesionalId])`. The `profesionalId` for portal auto-learn writes must come from the token-resolved patient's `profesionalId`, never from the request body. Patient A's "Metformina" from Professional X must not appear in Professional Y's medication dropdown.

---

## Implications for Roadmap

Based on research, suggested 8-phase dependency-ordered structure:

### Phase 1 — Schema Foundation
**Rationale:** Every subsequent phase depends on new DB columns. All new columns have `DEFAULT` values; the one NOT NULL drop (`MensajeInterno.autorId`) is safe with `ALTER COLUMN ... DROP NOT NULL`. Must run before any code uses new fields.
**Delivers:** Runnable migration; no user-visible functional change.
**Schema changes:**
- `Paciente`: `medicacion String[]`, `adicciones String[]`, `consentimientoFirmadoAt DateTime?`, `portalToken String? @unique` (stores SHA-256 hash — 64 hex chars, NOT a UUID), `portalTokenGeneradoAt DateTime?`, staging fields: `alergiasAutoReportadas String[]`, `antecedentesAutoReportados Json?`, `medicacionAutoReportada String[]`, `tratamientosPreviosAutoReportados String?`
- `TareaSeguimiento`: `notificada Boolean @default(false)`, `notificadaEn DateTime?`
- `MensajeInterno`: `origenPaciente Boolean @default(false)`; `autorId` NOT NULL → nullable
- New models: `AlergiaCatalogoPro`, `MedicamentoCatalogoPro` with `esSistema`, `activo`, `profesionalId` FK, `@@unique([nombre, profesionalId])`
- Idempotent seed: common allergies (Penicilina, Látex, AINEs, Yodo, Contraste); common medications (Anticoagulantes, Corticoides, Metformina, Levotiroxina, Aspirina, Enalapril)
- NOTE: `ConfigClinica.consentimientoTexto` is NOT added — the locked decision uses uploaded PDFs, not stored text
**Avoids:** Pitfalls 1 (token hashed from creation), 10/11 (notificada field), 13 (staging fields defined before portal writes)

### Phase 2 — Seguimiento Scheduler Fix + Chat Cleanup
**Rationale:** Isolated, high-value bug fix. Stops active daily damage. Self-contained: uses only the `notificada` field from Phase 1 + 3-line service change. Guard and cleanup migration MUST deploy atomically.
**Delivers:** Clean staff chat inbox; no more infinite system message spam; `origenPaciente` distinction ready for portal messages.
**Changes:**
- `SeguimientoSchedulerService.processSeguimientos()`: add `notificada: false` to WHERE; add `update({ notificada: true, notificadaEn: now() })` after creating each MensajeInterno
- Cleanup migration: `DELETE FROM "MensajeInterno" WHERE "esSistema" = true` — run off-peak (not 9am when cron fires); cascade-safe; idempotent
**Avoids:** Pitfalls 10, 11.

### Phase 3 — Catalogs API + PREOPERATORIO HC Form (staff-facing, JWT-guarded)
**Rationale:** Staff-only, no public exposure. Establishes chip catalogs and Paciente fields before the portal reuses them. Depends on Phase 1.
**Delivers:** Fully functional PREOPERATORIO HC entry with chip selectors (antecedentes/alergias/medicacion), studies checklist, consent checkbox, auto-learning.
**Changes:**
- Backend: `AlergiaCatalogoPro` + `MedicamentoCatalogoPro` CRUD in `catalogo-hc` module (4 endpoints each; esSistema guard on mutations; same pattern as ZonaHC)
- Backend: `tipo === 'preoperatorio'` branch in `crearEntrada`; `aprenderDesdePreoperatorio()` best-effort post-tx (upserts to catalogs; syncs `Paciente.alergias[]` and `Paciente.medicacion[]`)
- JSONB contenido shape: `{ tipo, alergias[], medicacion[], antecedentes[], adicciones[], estadoActual, aptoQuirurgico, observaciones, estudiosResumen[{nombre, entregado}], consentimientoRegistrado }`
- Frontend: `PreoperatorioForm.tsx` — chip inputs from new catalogs + studies checklist
- Frontend: `HCEntryContent.tsx` — new `'preoperatorio'` renderer branch (chips + apto quirurgico badge + consent status)
- Frontend: `HCCreatorForm` swap to `PreoperatorioForm` when `tipoEntrada === PREOPERATORIO`
**Avoids:** Pitfall 12 (catalog scoped to profesionalId from JWT, never from request body).

### Phase 4 — Consent PDF Upload Infrastructure (staff-facing config)
**Rationale:** Doctor must upload the base consent PDF before the portal can serve it for signing. Establishes multer infrastructure, StorageService abstraction, and static file serving. Must precede Phase 5.
**LOCKED DECISION:** Doctor uploads a real PDF file; there is NO consent text textarea. `ConfigClinica.consentimientoTexto` is NOT added. The uploaded PDF is the consent template.
**CONFLICT WITH ARCHITECTURE.md §1.3, §3:** ARCHITECTURE.md proposed storing consent as plain text + regenerating with PDFKit. REJECTED. Correct implementation: multer upload → disk → `@cantoo/pdf-lib` stamp in Phase 7.
**Delivers:** Doctor can upload consent PDF from Configuracion; file stored at `uploads/consentimientos/{uuid}.pdf`; accessible at `${BACKEND_URL}/uploads/consentimientos/{uuid}.pdf`.
**Changes:**
- Install: `npm install @cantoo/pdf-lib && npm install -D @types/multer` (backend only)
- `StorageService` abstraction: `save(buffer, filename): Promise<string>` returning relative path (never `http://localhost:...`). Disk is first impl; S3/GCS/R2 is later swap-in.
- Multer: `diskStorage`, `crypto.randomUUID() + '.pdf'` filename (NEVER `originalname`), `limits: { fileSize: 10MB }`, `fileFilter` on mimetype + post-write `file-type` magic-byte validation; delete file and return 400 if not valid PDF
- `app.useStaticAssets(path.join(process.cwd(), 'uploads'), { prefix: '/uploads/' })` in `main.ts`; serve with `Content-Disposition: attachment`; path-traversal guard middleware
- Backend: PATCH endpoint to accept uploaded PDF, store via StorageService, update `ConfigClinica.consentimientoPdfPath` + increment `consentimientoVersion` (integer)
- Frontend: ConsentimientoEditor in Configuracion — file upload input + current PDF preview/download link
- **Go-live blocker:** Daily backup of `uploads/` directory is a mandatory deployment requirement; document in acceptance criteria. Loss of consent PDFs = irreversible legal exposure.
**Avoids:** Pitfalls 7, 8, 9.

### Phase 5 — Patient Portal Backend + Rate Limiting
**Rationale:** Portal backend before portal frontend. Rate limiting MUST be wired as the first action of this phase — before any public endpoint exists. Depends on Phases 1 and 4.
**CRITICAL:** Wire `ThrottlerModule.forRoot()` into `AppModule` first. `@nestjs/throttler@6.4.0` is installed but completely unconnected — confirmed by `app.module.ts` and `main.ts` inspection. Zero rate limiting on any endpoint today.
**Delivers:** All portal API endpoints; portal token generation from staff panel; patient question routing to staff MensajeInterno; rate limiting on all public endpoints.
**Changes:**
- Wire `ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])` + global `ThrottlerGuard` in `AppModule`
- Strict portal controller overrides: 10 req/min reads, 3 req/min writes, IP lockout after 3 failed DNI attempts per token per 15 min + MensajeInterno staff notification
- Apply retroactively to `presupuesto/public` endpoints (existing vulnerability)
- New `paciente-portal` module: controller (no `@Auth()`), service, `PortalJwtGuard` (checks `scope === 'patient-portal'` JWT claim)
- Endpoints: `GET /pacientes/portal/:token` (lookup by SHA-256 hash), `POST /pacientes/portal/:token/verificar` (DNI gate → portalJwt 4h), `GET /pacientes/portal/:token/data`, `PATCH /pacientes/portal/:token/datos-personales` (narrow `UpdatePacientePortalDto`: telefono/email/direccion/contacto emergencia only — no alergias, condiciones, DNI, etapaCRM), `POST /pacientes/portal/:token/salud` (writes to staging fields ONLY), `POST /pacientes/portal/:token/consulta` (MensajeInterno with `origenPaciente: true`, `autorId: null`)
- `POST /pacientes/:id/generar-portal-token` in `PacientesController`: generate raw UUID, store `crypto.createHash('sha256').update(rawUUID).digest('hex')` in `Paciente.portalToken`, return `{ portalUrl: '${FRONTEND_URL}/portal/${rawUUID}' }`
- Add portal origin to `allowedOrigins` in `main.ts` CORS config
- All pacienteId derived exclusively from token hash lookup — never from request body
**Avoids:** Pitfalls 1, 2, 3, 4, 13.

### Phase 6 — Patient Portal Frontend
**Rationale:** Depends on backend endpoints. Wizard UX requires mobile-first design. Does NOT include consent signing canvas (added Phase 7).
**Delivers:** 4-step portal wizard (datos personales, salud, consentimiento placeholder, preguntas); auto-save per step; resume capability; mobile-first UX.
**Changes:**
- `frontend/src/app/portal/[token]/page.tsx` + `layout.tsx` (public, no dashboard JWT)
- Step 1: contact data (read-only display + editable nombre/telefono/email/direccion)
- Step 2: salud chips (condiciones/alergias/medicacion from seeded catalogs + "Otra" free text) + tratamientos previos free text field
- Step 3: consent placeholder (PDF download button; signature canvas added Phase 7)
- Step 4: optional message textarea + send/skip
- `SignaturePad.tsx` wrapper: `dynamic(() => import(...), { ssr: false })` (canvas is browser-only); validate touch events for iOS Safari
- portalJwt in `sessionStorage` (not localStorage — expires on tab close)
- Progress bar "Paso X de 4"; informal Spanish ("tu"/"tenés"); minimum `text-base` (16px)
- Auto-save wizard state to localStorage keyed on token; restore on re-visit
- Explicit confirm screen: "Listo, tu información fue enviada"
- Validate signature non-emptiness before enabling submit (non-transparent pixels check)

### Phase 7 — Signed Consent Flow (pdf-lib stamp)
**Rationale:** Most complex and highest legal-stakes phase. All dependencies must be confirmed working. Forensic metadata model must be finalized before any real patient signs.
**LOCKED DECISION:** Use `@cantoo/pdf-lib` to load the doctor-uploaded PDF and stamp signature onto it. Do NOT use PDFKit to generate from scratch. The stamped PDF is the legal artifact.
**Delivers:** End-to-end consent signing: patient draws signature → backend stamps onto uploaded PDF → signed PDF archived with forensic metadata → PatientDrawer shows consent status + download link.
**Changes:**
- Backend `PacientePortalService.firmarConsentimiento()`:
  1. Validate portalJwt → extract pacienteId (from token, never from body)
  2. Load uploaded consent PDF: `fs.promises.readFile(configClinica.consentimientoPdfPath)`
  3. Strip data URL prefix: `Buffer.from(dataUrl.split(',')[1], 'base64')`; validate PNG magic bytes — reject 400 if invalid or blank
  4. `@cantoo/pdf-lib`: `PDFDocument.load(pdfBytes)` → `pdfDoc.embedPng(signatureBuffer)` → stamp signature image on last page + visible footer text: patient name, last 4 DNI digits, `firmadoAt` ISO8601, `versionConsentimiento`
  5. `crypto.createHash('sha256').update(signedPdfBytes).digest('hex')` → `pdfHash`
  6. `StorageService.save()` → relative path
  7. Prisma `$transaction`: create consent audit record with `firmadoAt` (server UTC, NEVER device clock), `ipCliente` (`req.ip`), `userAgent` (`req.headers['user-agent']`), `versionConsentimiento` (from ConfigClinica), `pdfHash`, `pdfPath` (relative); update `Paciente.consentimientoFirmado = true`, `consentimientoFirmadoAt = now()`
  8. Post-transaction best-effort: `MensajeInterno` staff notification (prioridad ALTA)
- Backend: `GET /pacientes/portal/:token/consent-pdf/:archivoId` — `StreamableFile`; verify portalJwt; `Content-Disposition: attachment`
- Frontend: portal Step 3 — PDF view button, `SignaturePad` canvas, "Confirmar firma" (disabled until non-empty), "Leí las instrucciones preoperatorias" checkbox
- Frontend: PatientDrawer — `consentimientoFirmado` badge + `consentimientoFirmadoAt` date + signed PDF download link
- **Pre-go-live gate:** Legal review of drawn signature archival approach under Ley 25506 / Ley 26529 before first real surgical patient signs
**Avoids:** Pitfalls 5, 6, 7.

### Phase 8 — Chat Inbox Patient Badge + Studies View
**Rationale:** Additive polish. Depends on Phase 1 (`origenPaciente` field) and Phase 5 (portal consulta endpoint). No blocking dependencies on other phases.
**Delivers:** Staff can distinguish patient questions from system notifications; coordinator visibility into pending studies.
**Changes:**
- Frontend MensajeInterno chat renderer: `origenPaciente: true` → "Paciente" badge + patient icon (teal); `esSistema: true` + `origenPaciente: false` → dimmed/collapsible system style; otherwise standard staff message
- Frontend (P2 differentiator): "Pacientes con estudios pendientes" filter — query PREOPERATORIO HC entries with at least one `estudiosResumen[].entregado === false`; secretary marks `entregado: true` when results arrive
- Optional admin-only cleanup endpoint to archive pre-fix system message spam (defer to user request)

### Phase Ordering Rationale

- Schema always first — every subsequent phase touches new fields; code before schema is a runtime crash
- Scheduler fix second — stops active daily damage with zero public surface area risk; isolated
- Staff HC form third — JWT-guarded, establishes chip catalogs before portal reuses them
- Consent upload fourth — portal cannot serve consent PDFs that do not exist yet; StorageService abstraction set before legal artifacts are written
- Portal backend fifth — after upload infra is in place; rate limiting wired before any public endpoint
- Portal frontend sixth — depends on backend API shapes being finalized
- Consent stamping seventh — all dependencies confirmed; highest complexity and legal stakes last in the chain
- Chat polish and studies view last — additive, no blocking dependencies

### Research Flags

Phases needing careful review during planning:
- **Phase 7 (Consent Stamping):** Exact x/y stamp coordinates on the last page depend on the clinic's actual PDF layout. Add acceptance criterion: "open signed PDF in a PDF reader and verify signature is visible and non-blank." Also: legal review timing with client's counsel.
- **Phase 4 (File Upload):** Define the `StorageService` interface contract before any code is written so cloud migration later is a true drop-in swap. Agree on whether consent PDF is per-profesional (one global) or per-TipoTurno (multiple procedure types) — see Gaps section.
- **Phase 5 (Rate Limiting + CORS):** Whether the portal runs on the same domain or a subdomain affects `allowedOrigins`, cookie isolation, and token URL format. Decide before Phase 5 planning.

Phases with standard patterns (no additional research needed):
- **Phase 1:** Standard Prisma migration — proven pattern from v1.6/v1.8/v1.9; all new columns have defaults
- **Phase 2:** 3-line service change + idempotent DELETE migration — fully specified, no unknowns
- **Phase 3:** Exact copy of ZonaHC pattern — no new patterns required
- **Phase 8:** Frontend rendering only — no new data model

---

## Locked Decision Conflicts — Explicit Flags

| Research File | Conflicting Proposal | Locked Decision | Resolution |
|---------------|---------------------|-----------------|------------|
| ARCHITECTURE.md §1.3, §3 | Store consent as plain text in `ConfigClinica.consentimientoTexto`; generate signed PDF with PDFKit | Doctor uploads a base PDF; patient signature stamped onto it using `@cantoo/pdf-lib` | Use multer upload + `@cantoo/pdf-lib` stamping. Do NOT add `consentimientoTexto`. PDFKit NOT used for consent. |
| FEATURES.md §PP-03 | "requires file storage (S3-compatible or Supabase Storage)" — implies Supabase already used | Local disk now; cloud later. No Supabase Storage configured. Explore confirmed: no upload handler exists; logo is an external URL. | Use `diskStorage` via multer behind `StorageService` abstraction. Cloud is a later swap-in, not v1.12. |
| ARCHITECTURE.md §7, §1.1 | `portalToken` stored as `crypto.randomUUID()` plaintext in `Paciente.portalToken` | Token stored SHA-256 hashed (64-char hex). Raw token goes in URL only; hash goes in DB. | Generate raw UUID, compute `crypto.createHash('sha256').update(rawToken).digest('hex')`, store hash. Column named `portalToken`; value is the hash. Document in migration comment. |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified via direct `package.json` inspection, `npm view` for new packages, and `main.ts` review. All compatibility constraints confirmed. Only 2 new packages needed. |
| Features | HIGH | Validated against codebase (existing models, enum values, component patterns), Argentine legal context (Ley 25506, Ley 26529), and competitor analysis (Aesthetic Record, Pabau, Symplast, ModMed). |
| Architecture | HIGH | Based on direct full-codebase read: `schema.prisma` (1413 lines), `presupuesto-public.controller.ts`, `seguimiento-scheduler.service.ts`, `mensajes-internos.service.ts`. Architecture conflicts with locked decisions are identified and resolved. |
| Pitfalls | HIGH | Confirmed from code inspection: ThrottlerModule missing (confirmed in `app.module.ts`), scheduler spam bug active with code comment, Archivo model lacks forensic fields, presupuesto token stored plaintext (confirmed in `schema.prisma`). All pitfalls are code-verified, not theoretical. |

**Overall confidence:** HIGH

### Gaps to Address

- **Consent PDF stamping coordinates:** Exact x/y offsets on last page depend on the clinic's actual PDF layout. Calibrate against a real document during Phase 7. Add "open signed PDF in a reader and confirm signature visible" as an explicit acceptance criterion.
- **Consent PDF scope — per-profesional vs. per-TipoTurno:** The locked decision says "uploads from Configuracion," implying one PDF per clinic/profesional. If different procedure types require different consent PDFs, `consentimientoPdfPath` must move to `TipoTurno`. Validate with client in Phase 4 planning.
- **Portal domain decision:** Same domain as staff dashboard vs. a subdomain affects CORS `allowedOrigins`, cookie isolation, and whether the portal URL could accidentally share the staff auth session. Decide before Phase 5.
- **Legal review timing:** Ley 25506 drawn signature is "firma electrónica" (evidential, not certified "firma digital"). The audit trail described is defensible but the client's legal counsel should confirm before the feature goes live with surgical patients. This is a go-live gate, not a development blocker.
- **PDF generation under concurrent load:** PDFKit and `@cantoo/pdf-lib` run synchronously on the Node.js event loop. If multiple patients sign concurrently (e.g., a batch pre-op day), consider BullMQ offloading. Flag for load testing before production launch.

---

## Sources

### Primary (HIGH confidence — direct codebase or official docs)
- `backend/src/prisma/schema.prisma` (full, 1413 lines) — existing models, field types, FK structure, enum values
- `backend/src/modules/presupuestos/presupuesto-public.controller.ts` — confirmed public controller pattern
- `backend/src/modules/pacientes/seguimiento-scheduler.service.ts` — confirmed spam bug in code with comment; `completada` never set
- `backend/src/modules/mensajes-internos/mensajes-internos.service.ts` — confirmed N+1 unread count, esSistema flag structure
- `backend/src/main.ts` — confirmed no ThrottlerModule, no `useStaticAssets`, no helmet, hardcoded `allowedOrigins`
- `backend/package.json` — `@nestjs/throttler@6.4.0` installed but unused; `pdfkit@^0.17.2` present; no multer types; no pdf-lib
- `frontend/package.json` — `signature_pad@^5.1.1`, React 19.2.0, Next.js 16.0.7 confirmed
- `npm view @cantoo/pdf-lib` — v2.7.1, last published 2026-05-27 (active)
- `npm view pdf-lib` — v1.17.1, last modified 2022-05-12 (inactive)
- `npm view @nestjs/serve-static@5.0.5 peerDependencies` — requires `@nestjs/core@^11.0.2`; incompatible with NestJS 10
- [pdf-lib.js.org](https://pdf-lib.js.org/) — confirmed `PDFDocument.load()`, `embedPng()`, `drawImage()`, `drawText()`, `save()` API
- Argentine Ley 26529 (Derechos del Paciente) art. 7, 18 — informed consent documentation and 15-year retention requirement
- Argentine Ley 25506 (Firma Digital) — drawn signature constitutes "firma electrónica" (evidential, not certified)

### Secondary (MEDIUM confidence — established community consensus)
- [Buddy Healthcare — Electronic Pre-Op Assessment](https://www.buddyhealthcare.com/en/electronic-pre-operative-assessment) — pre-op digital intake workflow patterns
- [Aesthetic Record Patient Portal](https://www.aestheticrecord.com/patient-portal/) — competitor feature reference
- [Pabau — Best Plastic Surgery Software](https://pabau.com/blog/best-plastic-surgery-software/) — competitor analysis
- [Blueink — Audit Trail E-Signature](https://www.blueink.com/blog/audit-trail-esignature) — IP, userAgent, timestamp, doc hash requirements for legal defensibility
- [Formfy — Audit Trail for E-Signatures](https://formfy.ai/compliance/audit-trail-e-signature) — minimum required fields
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) — multer path traversal and MIME spoofing vectors
- [MSD Manual ES — Evaluación Prequirúrgica](https://www.msdmanuals.com/es/professional/temas-especiales/atenci%C3%B3n-del-paciente-quir%C3%BArgico/evaluaci%C3%B3n-prequir%C3%BArgica) — standard pre-op assessment content (antecedentes, alergias, medicación checklist)
- [freecodecamp — NestJS Multer guide](https://www.freecodecamp.org/news/how-to-handle-file-uploads-in-nestjs-with-multer/) — diskStorage, fileFilter, limits pattern

---

*Research completed: 2026-06-25*
*Ready for roadmap: yes*
