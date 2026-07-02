# Pitfalls Research — v1.12 Pre-surgical HC Template + Patient Portal

**Domain:** Aesthetic surgery SaaS — public patient portal, drawn-signature consent PDF, local file uploads, CRM chat cleanup, auto-learning chip catalogs
**Researched:** 2026-06-25
**Confidence:** HIGH (based on direct codebase inspection + established security/legal patterns)

---

## Critical Pitfalls

### Pitfall 1: Persistent Token in URL — PII Leakage and Log Exposure

**What goes wrong:**
The patient portal URL contains the token in the path (e.g., `/portal/abc123`). That token is the only credential granting access to the patient's profile and allowing consent signing. When the patient shares the URL, copies it from browser history, or visits any third-party link from the portal page, the token leaks in server logs, Referer headers, browser history, and Next.js server-side logs. Unlike the presupuesto token (which burns itself on use once `estado` leaves ENVIADO), this token is persistent and reusable — a leak is permanent until the token is explicitly rotated.

**Why it happens:**
Developers follow the existing `presupuesto/public/:token` pattern from `PresupuestoPublicController` without considering that the presupuesto token is short-lived (it becomes invalid once the state transitions). A persistent portal token has a much larger window of exposure.

**How to avoid:**
- Store the token hashed in the DB (SHA-256 of the raw token). The URL carries the raw token; the DB stores the hash. A stolen DB dump does not expose valid tokens.
- Add `Referrer-Policy: no-referrer` and `Cache-Control: no-store` headers on all portal API responses and the Next.js portal page.
- Never log the raw token — log only the first 8 characters + `...` for traceability.
- Scope the portal URL to `NEXT_PUBLIC_PORTAL_URL` (could be a subdomain) so it does not share cookies/auth state with the staff dashboard.
- When a new pre-surgical HC entry is created for the patient, rotate the token so the previous URL shared by SMS/email is invalidated. This is the practical substitute for one-time tokens when the use case requires re-entry.

**Warning signs:**
- Token appears in NestJS access logs as plaintext (default Nest logger logs full URLs).
- Browser DevTools Network tab shows the token in the Request URL of any API call.
- Next.js `console.log` during SSR includes the full token in Vercel log drain.

**Phase to address:**
Token generation and storage phase — before ANY endpoint that reads the token from the DB. Must be done before the first portal GET endpoint exists.

---

### Pitfall 2: No Rate Limiting on Public Endpoints — DNI/Token Brute Force

**What goes wrong:**
The public portal has no authentication. An attacker who guesses or obtains a patient token can try arbitrary DNI values to unlock the full profile. Conversely, an attacker who has a valid DNI can enumerate tokens until they find a match. The existing `presupuesto/public/:token/verificar` endpoint already has this vulnerability today. The patient portal, with its ability to edit profile data AND sign legal consent, multiplies the impact.

**Why it happens:**
`@nestjs/throttler` v6.4.0 is already installed as a dependency but is NOT wired into `AppModule` (confirmed by codebase inspection of `app.module.ts` and `main.ts` — zero throttler configuration exists). Zero rate limiting exists on any public endpoint today.

**How to avoid:**
- Wire `ThrottlerModule.forRoot()` in `AppModule` with a global guard.
- Apply a strict per-IP limit on the portal controller: 10 requests/minute on read endpoints, 3 attempts/minute on write endpoints (edit profile, sign consent).
- On `/portal/:token/verificar-dni` specifically: after 3 failed DNI attempts for the same token within 15 minutes, lock that token's verification for 30 minutes and notify the staff via a `MensajeInterno`.
- The throttler guard must be applied to public controllers — do not rely on the absence of `@Auth()` as a signal.

**Warning signs:**
- Logs show hundreds of 401/403 responses to the same IP within minutes.
- No `X-RateLimit-*` headers in portal API responses.
- `ThrottlerModule` import absent from `AppModule`.

**Phase to address:**
First portal backend phase, before exposing any public GET or POST endpoint. Apply retroactively to `presupuesto/public` as well (existing vulnerability).

---

### Pitfall 3: IDOR — Patient Edits Another Patient's Data via Token Scope Confusion

**What goes wrong:**
The token resolves to a `Paciente` record, but if any portal sub-endpoint accepts a `pacienteId` in the request body and trusts it rather than deriving it from the token, a patient with a valid token can send any `pacienteId` and overwrite another patient's profile. This is especially dangerous because the portal allows consent signing — a patient could sign consent on behalf of another.

**Why it happens:**
The existing pattern in `presupuestosService.aceptarByToken(token)` correctly derives the `presupuestoId` from the token lookup and never trusts client-supplied IDs. But when building multi-step flows (GET token, render form, POST update), developers sometimes refactor into a shared update endpoint that accepts a body `pacienteId`, forgetting to re-derive from the token.

**How to avoid:**
- In every portal service method, the `pacienteId` MUST be derived exclusively from the token lookup: `const { pacienteId } = await this.findByPortalToken(token)`. Never accept `pacienteId` in request body or query params.
- The portal controller must accept only `token` in the route param. All identity comes from the token; never from the body.
- Add an integration test: attempt to POST `/portal/:tokenA/update` with `{ pacienteId: patientB_id, ... }` and verify that Patient B is NOT modified.

**Warning signs:**
- Any portal endpoint that accepts `pacienteId`, `paciente`, or `id` in the request body.
- Service methods that call `updatePacienteSection` with a body-supplied ID rather than a token-derived one.

**Phase to address:**
Portal backend phase — reviewed at code-review time for every POST/PATCH portal endpoint.

---

### Pitfall 4: Patient Can Overwrite Professional-Managed Clinical Fields

**What goes wrong:**
The `Paciente` model has patient-supplied fields (name, phone, email, address, emergency contact) and professionally managed fields (`etapaCRM`, `temperatura`, `flujo`, `motivoPerdida`, `scoreConversion`, `crmArchivado`, `profesionalId`, `condiciones[]`, `alergias[]`, `consentimientoFirmado`, `dni`). If the portal update endpoint uses `UpdatePacienteSectionDto` or any DTO that includes professional-only fields, a patient who inspects the API can send those fields and alter their CRM stage, mark themselves as having signed consent before actually doing so, or erase professional-catalogued allergies.

**Why it happens:**
The existing `PATCH /pacientes/:id` endpoint is designed for staff and passes through `UpdatePacienteSectionDto`. Reusing that endpoint for the portal (even with token auth) exposes the same DTO surface.

**How to avoid:**
- Create a separate, narrowly scoped `UpdatePacientePortalDto` that only allows: `telefono`, `telefonoAlternativo`, `email`, `direccion`, `contactoEmergenciaNombre`, `contactoEmergenciaTelefono`, `contactoEmergenciaRelacion`, and the new patient-reported staging fields (NOT directly `condiciones[]` or `alergias[]` — see Pitfall 13).
- `consentimientoFirmado` must be set ONLY server-side when the consent PDF is generated and archived, never via a patient-submitted body.
- `DNI` must be read-only at all times via the portal.

**Warning signs:**
- `UpdatePacienteSectionDto` or any DTO with `etapaCRM`, `temperatura`, `flujo`, `consentimientoFirmado`, `profesionalId`, or `dni` being imported in a portal controller or service.
- A portal endpoint that passes `req.body` directly to a service without field-allow-listing.

**Phase to address:**
Portal backend phase — the DTO must be designed before any portal update endpoint is implemented.

---

### Pitfall 5: Medico-Legal Gap — Consent Record Has No Tamper-Evidence or Version Anchor

**What goes wrong:**
A patient signs a consent form in the portal. The clinic later edits the consent text. In a legal dispute, there is no way to prove (a) which version of the document the patient signed, (b) the exact moment of signing, or (c) that the PDF stored on disk is the same one presented to the patient. Argentine Ley 26.529 (Derechos del Paciente, art. 7) requires that medical consent be traceable to the specific moment and context. The current `Archivo` model stores only `url`, `tipo`, and `createdAt` — no forensic trail.

**Why it happens:**
Developers store the PDF file path and set `consentimientoFirmado: true` on the patient. No version hash, no IP, no exact UTC timestamp of the signing action, no hash of the PDF content at archival time is recorded.

**How to avoid:**
- Store a `ConsentimientoFirmado` record (expand `Archivo` or create a new model) with: `pacienteId`, `profesionalId`, `firmadoAt` (UTC DateTime exact), `ipCliente`, `tokenPortal` (last 8 chars for traceability), `versionConsentimiento` (integer counter), `pdfHash` (SHA-256 of the archived PDF bytes), `pdfPath`.
- Version the consent template text in `ConfigClinica` with a `consentimientoVersion` integer that increments on every edit. When generating the PDF, snapshot the exact text and include the version number in the PDF body.
- The PDF must embed the signing metadata (patient name, DNI last 4 digits, timestamp, version number) as visible text in the document body — not only as PDF metadata, which is invisible to a reader without tools.
- Include the signing timestamp and IP as visible footer text on every page of the consent PDF.

**Warning signs:**
- `Archivo` record for consent has only `url` and `tipo` — no hash, no IP, no version metadata.
- `consentimientoFirmado` is a Boolean with no associated record of when or under what conditions it was set.
- Consent text editable in `ConfigClinica` with no version counter.

**Phase to address:**
Consent signing phase — the DB model must include these fields before any consent endpoint exists.

---

### Pitfall 6: Drawn Signature PNG Breaks PDF Embedding or Produces Invisible Output

**What goes wrong:**
The canvas-drawn signature is captured as a PNG data URL (`data:image/png;base64,...`). PDFKit's `doc.image()` requires a raw Buffer, not a data URL string. If the `;base64,` prefix is not stripped before decoding, the resulting Buffer is invalid binary. PDFKit may silently render nothing in the signature area rather than throwing an error. The generated PDF appears complete, passes no error checks, but contains no visible signature — making it legally void.

**Why it happens:**
Frontend sends `canvas.toDataURL('image/png')`. Backend receives a string. `Buffer.from(str, 'base64')` on the full data URL (including the `data:image/png;base64,` prefix) produces garbage bytes because the prefix is not base64.

**How to avoid:**
- Strip the data URL prefix server-side: `const b64 = dataUrl.split(',')[1]; const buf = Buffer.from(b64, 'base64')`.
- Validate the resulting buffer: check the first 8 bytes against the PNG magic number (`\x89\x50\x4e\x47\x0d\x0a\x1a\x0a`). Reject with a 400 if not a valid PNG.
- Validate the signature is not empty: reject if image dimensions are below a minimum (e.g., 100x30 px) or if all non-alpha pixels are white.
- Use `file-type` (already a transitive dependency in the project) to verify the buffer is actually a PNG.
- Set a max payload size (e.g., 500 KB base64 = ~375 KB PNG) to prevent oversized canvases from being sent.
- When embedding with PDFKit, draw a white background rectangle under the signature image to flatten alpha transparency, ensuring the signature is visible when the PDF is printed.

**Warning signs:**
- PDF opens without error but the signature area is blank or shows only a white box.
- No server-side PNG magic byte check before calling `doc.image()`.
- Frontend sends the raw `canvas.toDataURL()` result without any stripping.

**Phase to address:**
Consent PDF generation phase. Signature validation belongs in the portal endpoint that receives the drawn signature, before calling the PDF generation service.

---

### Pitfall 7: Consent PDF Stored on Local Disk — Irreversible Loss of Legal Artifact

**What goes wrong:**
Consent PDFs archived on local disk are permanently lost if the server is reprovisioned, the volume is not backed up, or disk fills up. Since consent PDFs are legal evidence for surgical procedures, their loss exposes the clinic to liability in malpractice disputes. Local disk also prevents horizontal scaling without a shared filesystem.

**Why it happens:**
The milestone explicitly defers cloud storage and uses multer to disk as the initial implementation. This is acceptable for development but becomes an irreversible risk the moment a real surgical patient signs consent on that instance.

**How to avoid:**
- Implement disk storage behind a `StorageService` abstraction: `save(buffer, filename): Promise<string>` returning a URL. The multer disk implementation is the first impl; S3/GCS/R2 is a drop-in replacement.
- As a minimum safeguard for local disk: configure a daily `rsync` or `tar` backup of the uploads directory. Document this requirement explicitly in the phase's acceptance criteria — it is a go-live blocker.
- Store `pdfHash` (SHA-256) in the DB at archival time. On any retrieval, recompute and compare hashes. A mismatch indicates tampering or bit-rot.
- Store `Archivo.url` as a **relative path** (`/uploads/consent/uuid.pdf`), resolved to an absolute path server-side. Absolute `localhost` URLs in `Archivo.url` break after any server IP change and block cloud migration.

**Warning signs:**
- Deploy scripts with no backup of the `uploads/` directory.
- `Archivo.url` contains `http://localhost:3001/uploads/...` in production records.
- No `StorageService` abstraction — PDF path construction duplicated in controller and service.

**Phase to address:**
File upload infrastructure phase. The `StorageService` abstraction and the backup requirement must be established before the first consent PDF is archived.

---

### Pitfall 8: Multer Path Traversal from Unsanitized Original Filename

**What goes wrong:**
If multer's `diskStorage.filename` callback uses `file.originalname`, an attacker can upload a file named `../../backend/src/prisma/schema.prisma` and overwrite arbitrary files on the server's filesystem — or at minimum escape the uploads directory. There is no multer infrastructure in this codebase today; the pattern will be written from scratch and is highly vulnerable to the default documentation example.

**Why it happens:**
The most common multer documentation example uses `file.originalname` directly in the filename callback. There is no linting rule that catches this.

**How to avoid:**
- NEVER use `file.originalname` in the stored filename.
- Use a deterministic safe name: `${crypto.randomUUID()}.pdf` for consent PDFs. Extension derived server-side from MIME validation, never from the client-supplied name.
- Set `destination` to an absolute hardcoded path: `path.join(process.cwd(), 'uploads', 'consent')`. Never interpolate request params or body fields into the path.
- Set `limits: { fileSize: 5 * 1024 * 1024 }` (5 MB) on the multer instance.

**Warning signs:**
- `filename: (req, file, cb) => cb(null, file.originalname)` in any multer configuration.
- `destination` constructed with string concatenation including any value from `req.params` or `req.body`.

**Phase to address:**
File upload infrastructure phase — must be correct before any multer handler is deployed.

---

### Pitfall 9: MIME Type Spoofing and Unsafe Static File Serving

**What goes wrong:**
`file.mimetype` in multer's `fileFilter` callback is the browser-reported MIME type — it is entirely client-controlled and can be spoofed. An attacker uploads a JavaScript file with `Content-Type: application/pdf`. If the server then serves that file inline from a static URL under the app's domain, the script executes in the patient's or staff's browser (stored XSS via file upload).

**Why it happens:**
Developers use `mimetype === 'application/pdf'` as a security check, not understanding it is client-provided. No `fileFilter` validation is done on the actual bytes.

**How to avoid:**
- After multer writes the file to disk, use `file-type` (already a transitive dep) to read the magic bytes from the saved file and verify they match the expected format. Delete the file and return 400 if they do not match.
- Serve all uploaded files with `Content-Disposition: attachment` (never `inline`) to prevent browsers from rendering or executing uploaded content.
- Set `X-Content-Type-Options: nosniff` on static file serving responses.
- Add a path traversal guard in the static file serving middleware: `if (!resolvedPath.startsWith(UPLOAD_ROOT)) throw 403`.

**Warning signs:**
- `fileFilter` that calls `cb(null, true)` based only on `file.mimetype`.
- `ServeStaticModule` with a `rootPath` pointing to the project root or the `backend/` directory.
- Uploaded files served without `Content-Disposition: attachment`.

**Phase to address:**
File upload infrastructure phase. MIME validation must be added as a post-write step. Serving configuration reviewed at deploy time.

---

### Pitfall 10: SeguimientoScheduler Infinite Message Generator — No Dedupe Guard

**What goes wrong:**
The existing `SeguimientoSchedulerService` cron runs daily at 9am and creates one `MensajeInterno` per `TareaSeguimiento` where `completada: false AND fechaProgramada <= now`. It deliberately does NOT mark tasks as `completada` — the code comment says "la dejamos pendiente para que el profesional la marque". This means every task that is never manually completed creates a new chat message every single day forever. A patient scheduled for a 7-day follow-up who is never marked as contacted accumulates 365 chat messages per year, making the chat interface unusable and unread counters meaningless.

**Why it happens:**
The comment in the code confirms this was intentional ("solo registramos en log por ahora") — deduplication was deferred. The milestone requires cleaning up existing spam messages AND preventing new ones, but without a guard the cleanup immediately regrows within 24 hours.

**How to avoid:**
- Add a `notificada` Boolean (and `notificadaEn` DateTime) to `TareaSeguimiento`. The cron filters `notificada: false` and sets `notificada: true` on first notification.
- Alternative (simpler): in the cron loop, check whether a `MensajeInterno` with `esSistema: true` and same `pacienteId` and matching `tipo`-derived message was created within the last 22 hours. Skip if yes.
- The dedupe guard must be deployed simultaneously with the cleanup migration. If cleanup runs first without the guard, messages regrow within one cron cycle.

**Warning signs:**
- Any CRM patient with `TareaSeguimiento.completada: false` and `fechaProgramada` weeks in the past has many `MensajeInterno.esSistema: true` rows.
- Chat list shows unread count in the hundreds for any active patient.
- `TareaSeguimiento` model has no `notificada` column.

**Phase to address:**
Scheduler/chat cleanup phase — the dedupe guard must be deployed before or simultaneously with the cleanup migration.

---

### Pitfall 11: Destructive Cleanup Migration Partial Application — Inconsistent State

**What goes wrong:**
The cleanup deletes `MensajeInterno` records where `esSistema = true`. The `MensajeLectura` model has `onDelete: Cascade` from `MensajeInterno` at the database level, so bulk deletes will cascade correctly. However, running this migration at 9am (same time as the cron) can cause lock contention. If the migration is run but the application deploy with the dedupe guard fails, the messages are deleted but new ones are created immediately by the next cron cycle.

**Why it happens:**
Cleanup scripts written as one-shot migrations are often not tested against production data volumes. A table with many `MensajeLectura` rows being cascade-deleted during peak traffic can cause transient query timeouts.

**How to avoid:**
- Write the cleanup as a Prisma migration SQL file: `DELETE FROM "MensajeInterno" WHERE "esSistema" = true;` — PostgreSQL handles cascade at DB level; Prisma cascade definitions are consistent.
- Run during off-peak hours (not at 9am when the cron fires). Add a comment in the migration file: "Run between 11pm and 7am ART to avoid lock contention with cron."
- Test the migration on a copy of production data first to measure execution time.
- Make the cleanup idempotent: running it twice must produce the same result (already true for DELETE WHERE — re-running on an empty set is a no-op).
- Do NOT delete `TareaSeguimiento` records — they are legitimate business data. Only delete `MensajeInterno` notifications derived from them.

**Warning signs:**
- Migration script that also deletes `TareaSeguimiento` rows.
- Cleanup migration scheduled to run at 9am.
- Cleanup script that manually pre-deletes `MensajeLectura` rows rather than relying on DB cascade.

**Phase to address:**
Scheduler/chat cleanup phase — migration and dedupe guard deployed as a single atomic release.

---

### Pitfall 12: Auto-Learning Chip Catalog Leaks Across Tenants (Multi-Tenant Violation)

**What goes wrong:**
The new auto-learning catalogs for antecedentes, alergias, and medicacion must be scoped per professional, following the `ZonaHC` pattern (`@@unique([nombre, profesionalId])`). If any catalog table lacks `profesionalId` scoping — or if the auto-learn endpoint derives `profesionalId` from a query param rather than from the portal token's resolved patient — a patient's self-reported data from Professional A's portal can appear in Professional B's dropdown. Exposing Patient A's medication list to Professional B is a violation of Argentine Ley 26.529 (patient data confidentiality).

**Why it happens:**
Portal endpoints are public (no JWT). The `profesionalId` must be derived from the token's patient record (`paciente.profesionalId`) — but if the catalog write uses a different source (a body field, or no WHERE clause at all), it scopes incorrectly. The bug is silent: the catalog grows cross-tenant with no error thrown.

**How to avoid:**
- The portal token lookup always returns `{ pacienteId, profesionalId }`. The `profesionalId` from this lookup is the ONLY valid scope for any catalog write from the portal.
- Chip catalog models must have `@@unique([nombre, profesionalId])` exactly as `ZonaHC` does. Use `upsert` on that pair for idempotent auto-learning.
- Add an integration test: two professionals with separate patients, Patient A submits a unique medication name, verify Professional B's catalog API returns nothing for that name.

**Warning signs:**
- Chip catalog model without a `profesionalId` column.
- Auto-learn service method that derives `profesionalId` from `req.body` rather than from the token-resolved patient.
- `findMany` on chip catalog without a `profesionalId` WHERE clause.

**Phase to address:**
Auto-learning catalog phase. Schema migration must include `profesionalId` with the unique constraint before any data is written.

---

### Pitfall 13: Patient-Reported Data Directly Overwrites Professional-Managed Arrays

**What goes wrong:**
`Paciente.alergias: String[]` and `Paciente.condiciones: String[]` are currently written by staff in the PatientDrawer. If the portal update endpoint writes patient-submitted health data directly into these arrays, the professional's curated list is silently replaced with whatever the patient types. A patient who misremembers or misspells their allergy list can erase medically significant data that the surgeon relied on for surgical safety decisions.

**Why it happens:**
The natural implementation path is to re-use the existing `alergias`/`condiciones` fields since they exist and match the concept. The distinction between "professionally curated" and "patient self-reported" is not encoded in the current schema.

**How to avoid:**
- Add staging fields to the `Paciente` model via migration: `antecedentesAutoReportados: Json?`, `alergiasAutoReportadas: String[]`, `medicacionAutoReportada: String[]`. These are written only by the portal.
- The portal update endpoint writes ONLY to staging fields. Canonical fields (`alergias`, `condiciones`) remain staff-only.
- The PatientDrawer shows a "Self-reported by patient [date]" section with a "Promote to record" action that copies staging into canonical fields — with professional review in between.

**Warning signs:**
- Portal service that calls `prisma.paciente.update({ data: { alergias: body.alergias } })`.
- No staging columns in the `Paciente` schema migration for v1.12.
- No UI distinction in PatientDrawer between staff-entered and patient-reported health data.

**Phase to address:**
Portal backend phase — staging fields must be in the migration before the portal update endpoint is implemented.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store PDF on local disk | No cloud setup needed | Lost on redeploy; not scalable; legal liability if disk fails | Development/staging only — never once real patients sign surgical consent |
| `file.mimetype` for MIME validation | Simple one-liner | Spoofable by any client | Never for legal documents |
| Reuse `UpdatePacienteSectionDto` in portal | No new DTO needed | Exposes clinical fields to patient overwrites | Never |
| Skip consent version tracking | Faster initial build | Legally indefensible if consent text changes and dispute arises | Never if used in production with surgical patients |
| Omit IP/timestamp from consent record | Simpler DB model | Consent has no forensic trace for any legal challenge | Never for surgical consent |
| Auto-learn catalog without `profesionalId` | Slightly simpler query | Cross-tenant data leakage; regulatory violation | Never |
| Portal dedupe guard before cleanup migration | Can skip the guard if moving fast | Cleanup messages regenerate within 24 hours from cron | Never — guard and cleanup must deploy together |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| PDFKit + PNG signature from canvas | Pass `canvas.toDataURL()` data URL string directly to `doc.image()` | Strip prefix: `Buffer.from(dataUrl.split(',')[1], 'base64')`; validate PNG magic bytes before calling `doc.image()` |
| Multer + NestJS | Use `MulterModule.register()` globally with permissive defaults | Use `@UseInterceptors(FileInterceptor(...))` per-endpoint with explicit `limits`, `fileFilter`, and `storage` config |
| NestJS static file serving | `ServeStaticModule` pointing to project root or `uploads/` parent | Serve only `uploads/consent` subdirectory; add absolute path guard middleware |
| `@nestjs/throttler` | Already installed but never wired into `AppModule` | Add `ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])` to `AppModule.imports` and apply `ThrottlerGuard` globally |
| Portal CORS | Forget to add portal origin to the `allowedOrigins` array in `main.ts` | Add portal origin to `allowedOrigins` before portal deploy — the current array is hardcoded and does not read from env |
| Prisma `deleteMany` + cascade | Assume Prisma model-level cascade fires on `deleteMany` | DB-level `onDelete: Cascade` fires correctly for bulk deletes (confirmed on `MensajeLectura`) — Prisma model cascade is only for Prisma Client soft cascades |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unread count N+1 in `findChats` | Chat list page slow as patient count grows | Current impl runs a `count` query per-patient in `Promise.all` — acceptable up to ~50 patients | At ~200 patients with messages |
| Scheduler with no dedupe creating unbounded rows | `MensajeInterno` table grows indefinitely; all chat queries slow | Add `notificada` flag; existing `[profesionalId, completada, fechaProgramada]` index already in schema | Immediately — already happening if any tasks are overdue |
| PDF generation blocking the event loop | Portal requests queue up during PDF + signature assembly | PDFKit is synchronous; move to a BullMQ job if generation takes > 200ms | At concurrent portal usage from multiple patients |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Token as plaintext in DB | DB dump exposes all patient portal access credentials | Hash token (SHA-256) before storing; query by hash |
| No rate limit on `/portal/:token/*` | Token enumeration; DNI brute force | Wire `ThrottlerModule`; add IP-based lockout after 3 failed DNI attempts |
| `originalname` in multer filename | Path traversal to overwrite arbitrary server files | Use `crypto.randomUUID() + '.pdf'` as filename always |
| MIME from client for validation | Upload arbitrary file type; potential XSS via stored file | Use `file-type` on saved bytes; serve with `Content-Disposition: attachment` |
| Patient-supplied `pacienteId` in portal body | IDOR — overwrite any patient's data | Derive `pacienteId` exclusively from token lookup |
| No consent version in signed PDF | Legally unverifiable which text patient saw | Version counter on consent template; embed version + timestamp in PDF body |
| Local disk consent PDF without backup | Irreversible loss of legal evidence | `StorageService` abstraction; mandatory backup script as go-live requirement |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Portal URL expiration with no re-send flow | Patient cannot access form if token is rotated; staff has no way to send new link | Add "Regenerate portal link" button in PatientDrawer that rotates the token and copies the new URL to clipboard |
| Consent form with no save-draft | Patient fills form, session expires or browser closes, loses all progress | Auto-save portal form state to localStorage keyed on token; portal re-populates on next visit |
| Signature canvas broken on mobile | Patients complete forms on phones; canvas touch events differ from mouse events on iOS Safari | Verify touch event handling before release; use a well-tested signature library |
| Empty signature accepted silently | Consent signed with blank signature is legally void | Validate signature non-emptiness (non-transparent pixels exist) before enabling submit; visual indicator if canvas is still empty |
| Staff chat flooded with patient questions mixed with system alerts | Chat interface unusable when both message types appear without differentiation | Visual distinction between `esSistema: true` (system alert) and patient-originated messages; consider a separate "Patient Questions" inbox tab |

---

## "Looks Done But Isn't" Checklist

- [ ] **Patient portal token in DB:** Must be a 64-char hex string (SHA-256 hash), not a UUID — run `SELECT "portalToken" FROM "Paciente" LIMIT 1` and verify format
- [ ] **Consent record:** After a test consent signing, verify the record has non-null `firmadoAt`, `ipCliente`, `versionConsentimiento`, and `pdfHash` — all four
- [ ] **PDF signature visibility:** Open the generated PDF in a PDF reader — if the signature area is blank, the PNG buffer was invalid or fully transparent
- [ ] **Multer filename on disk:** After a test upload, inspect the `uploads/consent/` directory — filenames must be UUIDs, not the original client-supplied filename
- [ ] **Rate limiting active:** `curl` the portal endpoint 20 times in one second — verify `429 Too Many Requests` responses after the threshold
- [ ] **Multi-tenant chip catalog isolation:** Submit a portal form from Professional A's patient, then verify Professional B's catalog API returns no data from that submission
- [ ] **Staging vs canonical fields:** After patient submits health data via portal, verify `alergias[]` on `Paciente` is UNCHANGED and data appears only in `alergiasAutoReportadas[]`
- [ ] **Scheduler dedupe guard active:** After the cleanup migration, trigger the cron manually — verify zero new `esSistema: true` messages are created for tasks already notified today
- [ ] **Cleanup migration idempotency:** Run the cleanup migration twice in sequence — second run must report 0 affected rows
- [ ] **Static file path traversal blocked:** Attempt `GET /uploads/../src/prisma/schema.prisma` — must return 403 or 404, never the schema content

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Token leaked via server logs or referrer | MEDIUM | Add token rotation endpoint; rotate token for affected patients; staff re-sends portal link via SMS/email |
| Patient overwrote canonical `alergias[]` | HIGH | Restore from DB backup or from prior `HistoriaClinica` entries that recorded allergies; no automatic recovery if backup absent |
| Consent PDF lost due to disk failure | HIGH | If `pdfHash` stored and patient can re-sign: regenerate. If no backup: irreversible legal exposure — clinic must obtain physical paper consent and consult legal counsel |
| Scheduler spam already in production | MEDIUM | Run `DELETE FROM "MensajeInterno" WHERE "esSistema" = true` off-peak in a transaction; deploy dedupe guard simultaneously |
| Multer path traversal exploit | CRITICAL | Restore overwritten files from backup; audit all uploaded files for malicious content; rotate all secrets if `schema.prisma` or `.env` files were overwritten |
| Cross-tenant chip catalog data | MEDIUM | Write a targeted migration: `DELETE FROM <ChipTable> WHERE "profesionalId" != (SELECT "profesionalId" FROM "Paciente" WHERE <origin condition>)`; review audit log for scope |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Token plaintext in URL/DB (P1) | Portal token generation phase | DB query: `SELECT "portalToken" FROM "Paciente" LIMIT 1` — must be 64-char hex, not UUID |
| No rate limiting on public endpoints (P2) | Portal backend phase — first endpoint | `curl` flood test returns 429 after threshold; `ThrottlerModule` in `AppModule` |
| IDOR via body pacienteId (P3) | Portal backend phase — every POST/PATCH endpoint | Integration test: cross-patient update attempt is rejected |
| Patient overwrites professional fields (P4) | Portal backend phase — DTO design | Unit test: portal DTO rejects `etapaCRM`, `flujo`, `consentimientoFirmado`, `dni` |
| Consent has no legal anchoring (P5) | Consent signing phase | Record after signing has all 4 metadata fields non-null |
| Drawn signature breaks PDF (P6) | Consent PDF generation phase | End-to-end test: open generated PDF and confirm signature image is visible and non-blank |
| PDF on local disk without backup (P7) | File upload infrastructure phase | `StorageService` abstraction in place; backup script in deployment runbook |
| Multer path traversal (P8) | File upload infrastructure phase | Filename on disk is UUID-only; no client filename visible |
| MIME spoofing + XSS via upload (P9) | File upload infrastructure phase | Upload a `.js` file with `Content-Type: application/pdf` — rejected after byte inspection |
| Scheduler infinite messages (P10) | Scheduler/chat cleanup phase | After deploy: cron creates 0 duplicate messages for already-notified tasks |
| Cleanup migration partial state (P11) | Scheduler/chat cleanup phase — migration authoring | Second run of migration affects 0 rows; cron and migration deployed as one release |
| Cross-tenant chip catalog leak (P12) | Auto-learning catalog phase | Two-professional integration test: catalogs stay isolated |
| Patient data in canonical arrays (P13) | Portal backend phase — staging fields | After portal submit: `alergias[]` unchanged; `alergiasAutoReportadas[]` has submitted value |

---

## Sources

- Codebase inspection: `backend/src/modules/presupuestos/presupuesto-public.controller.ts` — existing public token pattern, confirmed no rate limiting
- Codebase inspection: `backend/src/modules/pacientes/seguimiento-scheduler.service.ts` line 63 comment — confirmed `completada` flag is never set; infinite message generation confirmed
- Codebase inspection: `backend/src/prisma/schema.prisma` — `MensajeLectura.onDelete: Cascade` confirmed; `Archivo` model structure; `Paciente.alergias String[]` as staff-managed field; `Presupuesto.tokenAceptacion @unique` plaintext storage pattern
- Codebase inspection: `backend/src/main.ts` — no `ThrottlerModule`, no `helmet`, no `compression` wired; `@nestjs/throttler` v6.4.0 confirmed installed in `package.json` but not configured
- Codebase inspection: `backend/src/modules/mensajes-internos/mensajes-internos.service.ts` — unread count N+1 pattern confirmed in `findChats`
- Argentine Ley 26.529 (Derechos del Paciente) art. 7 — informed consent must be documented, dated, and attributed to the specific patient and procedure
- OWASP File Upload Cheat Sheet — multer path traversal and MIME spoofing attack vectors
- PDFKit 0.13.x behavior: `doc.image()` requires a Buffer of raw PNG/JPEG bytes, not a data URL string

---
*Pitfalls research for: v1.12 Pre-surgical HC Template + Patient Portal*
*Researched: 2026-06-25*
