---
phase: 52-preop-hc-form-chip-catalogs
verified: 2026-06-26T17:00:00Z
status: human_needed
score: 12/12
overrides_applied: 0
human_verification:
  - test: "Visual check: selecting 'Pre Quirúrgico' renders the seccioned form"
    expected: "Three chip sections (Antecedentes/Alergias/Medicación), estudios checklist, consentimiento check, and Compartir link section — no free textarea"
    why_human: "Component renders correctly by static analysis; actual DOM layout and section visibility require browser rendering"
  - test: "Chip pre-load: open the PREOP form for a patient who already has condiciones/alergias in their profile"
    expected: "Pre-existing items appear as pre-selected (solid) chips on form open; items not in the catalog appear as dashed chips"
    why_human: "Requires a patient fixture with existing profile data and a running backend"
  - test: "Otro Enter-to-chip flow: type a new value in any Otro input and press Enter"
    expected: "New chip appears dashed immediately; on save it is persisted to the professional's catalog and appears solid on next form open"
    why_human: "Requires interactive browser session and a running backend to verify learning round-trip"
  - test: "SharePortalPanel QR render: open the Compartir link section and generate the link"
    expected: "A scannable QR code is displayed that encodes the portal URL"
    why_human: "QR rendering requires a browser; qrcode.react <QRCodeSVG> is wired but canvas output is not verifiable by grep"
  - test: "SharePortalPanel: WhatsApp button opens pre-filled message"
    expected: "Clicking 'WhatsApp' opens wa.me with the URL in the text param (opens contact picker)"
    why_human: "Link click behavior requires a browser"
  - test: "Email path: test with a configured SMTP server and a patient who has no email"
    expected: "Email input appears, professional can enter email, send button triggers delivery; on success 'Email enviado correctamente' feedback appears"
    why_human: "Requires SMTP environment configuration and a live email deliver attempt"
  - test: "Portal link idempotency: generate the link twice (two separate sessions)"
    expected: "Second generation shows alreadyGenerated note; URL is the same stable link"
    why_human: "Requires two full browser sessions; note that after page reload url state is null (raw UUID not recoverable by design D-12) — staff must share the link in the same session as generation"
---

# Phase 52: PREOP HC Form + Chip Catalogs — Verification Report

**Phase Goal:** Add the Prequirúrgico HC entry type: structured seccioned form with per-professional chip catalogs (antecedentes/alergias/medicación + Otro learning), estudios checklist, consentimiento informado check, and patient portal link sharing (copy/WhatsApp/QR/email).
**Verified:** 2026-06-26
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | AntecedenteCatalogoPro table exists in DB with @@unique([nombre,profesionalId]) and FK to Profesional | VERIFIED | `schema.prisma` lines 1461-1474; migration `20260626120000_add_antecedente_catalogo_pro/migration.sql` applied; `prisma migrate status` → "Database schema is up to date!" (48 migrations) |
| 2 | SEED_ANTECEDENTES mirrors the 10 frontend PREDEFINED conditions exactly | VERIFIED | `catalogo-hc.seed-data.ts` lines 34-44 matches `CondicionesChips.tsx` PREDEFINED list 1:1 (Hipertensión…Epilepsia) |
| 3 | catalogo-hc service exposes lazy-seed getters and aprenderDesdePreoperatorio best-effort (D-06) | VERIFIED | `catalogo-hc.service.ts`: `getAntecedentesConSeed` (293), `getAlergiasConSeed` (317), `getMedicamentosConSeed` (341), `aprenderDesdePreoperatorio` (435) with per-section try/catch; `normalizarNombre` used for dedup in `aprenderDesdeFlat` |
| 4 | Three JWT-scoped GET endpoints exist for the flat catalogs (PITFALL 12) | VERIFIED | `catalogo-hc.controller.ts` lines 72/81/90: `@Get('antecedentes')`, `@Get('alergias')`, `@Get('medicamentos')`; each resolves scope via `getProfesionalId(req.user, profesionalId)` |
| 5 | pre_quirurgico branch in crearEntrada builds contenido JSONB + tipoEntrada PREOPERATORIO | VERIFIED | `historia-clinica.service.ts` lines 105-116: branch builds `{tipo, antecedentes, alergias, medicacion, estudiosComplementarios, consentimientoInformadoAt, comentario}`; tipoEntrada forced to `'PREOPERATORIO'` at line 249 |
| 6 | estudios stored in dedicated queryable estudiosComplementarios Json column (D-10/PREOP-09) | VERIFIED | `historia-clinica.service.ts` lines 254-258: `estudiosComplementarios: dto.estudiosComplementarios as unknown as Prisma.InputJsonValue` written to dedicated column when type is pre_quirurgico |
| 7 | consentimientoInformadoAt written to contenido JSONB; consentimientoFirmadoAt NEVER touched (D-11) | VERIFIED | JSONB key `consentimientoInformadoAt` set at line 112; grep for `consentimientoFirmadoAt` in the service returns only a comment on line 288 (never assigned) |
| 8 | Union-dedup merge into condiciones/alergias/medicacion (D-09); never replace | VERIFIED | `historia-clinica.service.ts` lines 295-307: `Array.from(new Set([...perfil.condiciones, ...(dto.antecedentes ?? [])]))` inside $transaction; staging fields (`*AutoReportada(o)s`) untouched |
| 9 | Catalog learning fires post-transaction best-effort, JWT-derived profesionalId | VERIFIED | Lines 388-403: `catalogoHc.aprenderDesdePreoperatorio(profesionalId, {...})` in outer try/catch with `logger.warn` on failure; `profesionalId` is the crearEntrada argument (JWT), never from dto |
| 10 | sha256 hash stored in portalToken; raw UUID only in returned URL; idempotent (D-12/PITFALL 1) | VERIFIED | `pacientes.service.ts` lines 1030-1048: `crypto.randomUUID()` → `sha256(rawUuid).digest('hex')`; comment "raw UUID is NEVER persisted"; second call returns `{url:null, alreadyGenerated:true}` without DB update |
| 11 | SharePortalPanel uses backend-returned URL verbatim; no client-side hash construction (PITFALL 1) | VERIFIED | `SharePortalPanel.tsx`: no `sha256`/`createHash`/`token` construction; `url` state set only from `result.url` returned by backend; `QRCodeSVG value={url}` and `clipboard.writeText(url)` and `wa.me/?text=...url` all use the same string |
| 12 | Email option SMTP-gated (D-13); at-share email capture; email sent only when SMTP configured | VERIFIED | `SharePortalPanel.tsx` line 207: `{smtpConfigured && (...)}` gates the email section; Input rendered when `!pacienteEmail` (line 212); `PortalEmailService.isSmtpConfigured()` returns false when any of SMTP_HOST/USER/PASS is absent |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | AntecedenteCatalogoPro model + Profesional inverse relation | VERIFIED | Lines 1461-1474 (model) + line 139 (inverse relation) |
| `backend/src/prisma/migrations/20260626120000_add_antecedente_catalogo_pro/migration.sql` | CREATE TABLE AntecedenteCatalogoPro with FK + unique + index | VERIFIED | File exists with full DDL; applied to live DB |
| `backend/src/modules/catalogo-hc/catalogo-hc.seed-data.ts` | SEED_ANTECEDENTES string[10] | VERIFIED | Exported at line 34 |
| `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` | seed/get/aprenderDesdePreoperatorio methods | VERIFIED | All methods present with substantive logic |
| `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts` | 3 JWT-scoped GET endpoints | VERIFIED | Lines 72/81/90 |
| `backend/src/modules/catalogo-hc/catalogo-hc.flat-catalog.service.spec.ts` | TDD test suite (11 tests) | VERIFIED | All 11 tests pass |
| `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts` | PREOP DTO fields | VERIFIED | antecedentes/alergias/medicacion (string[]), EstudiosComplementariosDto, consentimientoInformado (boolean) |
| `backend/src/modules/historia-clinica/historia-clinica.service.ts` | pre_quirurgico branch in crearEntrada | VERIFIED | Branch at line 105; all D-09/D-10/D-11/D-06 patterns confirmed |
| `backend/src/modules/pacientes/pacientes.service.ts` | generarPortalLink idempotent sha256 | VERIFIED | Lines 1016-1048 |
| `backend/src/modules/pacientes/portal-email.service.ts` | SMTP-aware emailer with isSmtpConfigured | VERIFIED | Lines 45/56 |
| `backend/src/modules/pacientes/pacientes.controller.ts` | portal-link + email endpoints | VERIFIED | Lines 238/249 |
| `backend/src/modules/pacientes/pacientes.module.ts` | PortalEmailService registered | VERIFIED | Line 11: providers array |
| `frontend/src/hooks/useAntecedentesCatalogo.ts` | TanStack Query hook; ANTECEDENTES_CATALOGO_QUERY_KEY | VERIFIED | Lines 4/16 |
| `frontend/src/hooks/useAlergiasCatalogo.ts` | TanStack Query hook; ALERGIAS_CATALOGO_QUERY_KEY | VERIFIED | Lines 4/16 |
| `frontend/src/hooks/useMedicamentosCatalogo.ts` | TanStack Query hook; MEDICAMENTOS_CATALOGO_QUERY_KEY | VERIFIED | Lines 4/16 |
| `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` | PREOP DTO fields + 3 catalog invalidations | VERIFIED | Lines 66-74 (fields), 110-112 (invalidations) |
| `frontend/src/hooks/usePortalLink.ts` | generate + email mutations | VERIFIED | Lines 28/45 |
| `frontend/src/components/live-turno/tabs/hc/PreoperatorioForm.tsx` | Full seccioned PREOP form | VERIFIED | 600+ line substantive component; all sections present |
| `frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` | pre_quirurgico render + save branch | VERIFIED | Lines 66/106/151/262/368 |
| `frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx` | Copy/WhatsApp/QR/email panel | VERIFIED | Lines 4 (QRCodeSVG), 58 (clipboard), 177 (wa.me), 207 (SMTP gate) |
| `frontend/src/types/pacients.ts` | PacienteDetalle extended with condiciones/alergias/medicacion | VERIFIED | Lines 61-63 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `crearEntrada pre_quirurgico branch` | `catalogoHc.aprenderDesdePreoperatorio` | best-effort post-transaction | VERIFIED | Lines 392-403; outer try/catch; profesionalId is JWT-derived arg |
| `pre_quirurgico merge` | `paciente.condiciones/alergias/medicacion` | `Array.from(new Set([...]))` | VERIFIED | Lines 295-307 inside $transaction |
| `catalogo-hc.controller GET endpoints` | `getProfesionalId(req.user, ...)` | JWT scope resolver | VERIFIED | Lines 77/86/95 |
| `generarPortalLink` | `Paciente.portalToken (sha256 hash)` | `createHash('sha256')` | VERIFIED | Line 1032-1034; raw UUID comment confirmed |
| `useCreateHistoriaClinicaEntry onSuccess` | three flat catalog query keys | `invalidateQueries` | VERIFIED | Lines 110-112 |
| `SharePortalPanel email section` | `smtpConfigured flag` | conditional render | VERIFIED | Line 207 `{smtpConfigured && ...}` |
| `HCCreatorForm tipoSeleccionado === 'pre_quirurgico'` | `<PreoperatorioForm>` | render swap | VERIFIED | Lines 262-266; excluded from textarea fallback at line 368 |
| `PreoperatorioForm chip sections` | `useAntecedentesCatalogo/useAlergiasCatalogo/useMedicamentosCatalogo` | per-pro catalog hooks | VERIFIED | Lines 91-93 in PreoperatorioForm |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `PreoperatorioForm` chip sections | `catalogoAntecedentes`, `catalogoAlergias`, `catalogoMedicamentos` | `useAntecedentesCatalogo/useAlergiasCatalogo/useMedicamentosCatalogo` → `GET /catalogo-hc/{section}` → `getXxxConSeed` → real DB query | Yes — lazy seeds from SEED_* constants, then returns `findMany(activo:true)` | FLOWING |
| `PreoperatorioForm` pre-load | `paciente.condiciones/alergias/medicacion` | `usePaciente(pacienteId)` → backend `findUnique` | Yes — real patient DB row | FLOWING |
| `SharePortalPanel` url | `url` state | `POST /pacientes/:id/portal-link` → `generarPortalLink` → real DB write/read | Yes — sha256 hash stored, raw UUID returned | FLOWING |
| `historia-clinica.service` pre_quirurgico branch | `estudiosComplementarios` Json column | `$transaction` Prisma update with DTO data | Yes — writes to real `HistoriaClinicaEntrada.estudiosComplementarios` column | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| AntecedenteCatalogoPro model in schema | `grep -q "model AntecedenteCatalogoPro" schema.prisma` | Found at line 1461 | PASS |
| Migration applied, DB up to date | `prisma migrate status` | "Database schema is up to date!" (48 migrations) | PASS |
| aprenderDesdePreoperatorio best-effort tests | `npm test -- --testPathPattern=flat-catalog` | 11/11 tests pass | PASS |
| Frontend tsc --noEmit | `tsc --noEmit -p tsconfig.json` | Exit code 0 | PASS |
| Backend nest build | `npm run build` | Exit code 0 | PASS |
| Prisma validate | `prisma validate` | "schema is valid" | PASS |
| sha256 hash in DB (never raw UUID) | `grep "NEVER persisted" pacientes.service.ts` | Comment at line 1034 confirms | PASS |
| consentimientoFirmadoAt never written | `grep "consentimientoFirmadoAt" historia-clinica.service.ts` | Only appears in comment (line 288), never assigned | PASS |
| smtpConfigured gates email section | `grep "smtpConfigured &&" SharePortalPanel.tsx` | Line 207 confirmed | PASS |
| SEED_ANTECEDENTES = PREDEFINED (10 items) | Content comparison | Exact match: Hipertensión, Diabetes, Asma, Enfermedad cardíaca, Obesidad, Artritis, Alergia severa, Hipotiroidismo, Cannabis, Epilepsia | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| PREOP-01 | 52-06 | Structured seccioned PREOP form | SATISFIED | `PreoperatorioForm.tsx` — 600+ line component with section headers, NOT a free textarea |
| PREOP-02 | 52-06 | Optional dx/tratamiento check reusing PrimeraConsultaForm | SATISFIED | `incluirDx` checkbox (line 479); `<PrimeraConsultaForm>` imported and rendered when checked (line 500) |
| PREOP-03 | 52-01/02/05/06 | Antecedentes chips from per-professional catalog | SATISFIED | `useAntecedentesCatalogo` + `AntecedenteCatalogoPro` table |
| PREOP-04 | 52-02/03/05/06 | Otro learning persists to professional catalog | SATISFIED | `aprenderDesdePreoperatorio` post-transaction; `invalidateQueries` for all 3 catalog keys |
| PREOP-05 | 52-03/06 | Antecedentes saved to patient profile condiciones[] | SATISFIED | `Array.from(new Set([...perfil.condiciones, ...(dto.antecedentes ?? [])]))` in $transaction |
| PREOP-06 | 52-03/06 | Alergias pattern + patient alergias[] merge | SATISFIED | Same pattern, `alergias` field |
| PREOP-07 | 52-03/06 | Medicacion pattern + patient medicacion[] merge | SATISFIED | Same pattern, `medicacion` field |
| PREOP-08 | 52-06 | Estudios checklist (laboratorio, ECG, imagenes sub-types) | SATISFIED | `IMAGENES_OPTIONS = ['Ecografía', 'Tomografía', 'Mamografía', 'Otro']`; checkboxes at lines 524/535 |
| PREOP-09 | 52-03 | Estudios queryable via dedicated column | SATISFIED | `estudiosComplementarios` Json column written (lines 254-258); shape `{laboratorio, ecg, imagenes[]}` |
| PREOP-10 | 52-03/06 | Consentimiento informado check with audit timestamp | SATISFIED | `consentimientoInformadoAt: new Date().toISOString()` in JSONB; label "informado" (not "firmado"); `consentimientoFirmadoAt` never written |
| PREOP-11 | 52-04/07 | Copy link, WhatsApp, QR scannable | SATISFIED | `SharePortalPanel.tsx`: clipboard.writeText, wa.me/?text=, QRCodeSVG |
| PREOP-12 | 52-04/07 | Email SMTP-gated; at-share email capture | SATISFIED | `{smtpConfigured && ...}` gate; Input shown when `!pacienteEmail`; `PortalEmailService.isSmtpConfigured()` checks SMTP_HOST+USER+PASS |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `SharePortalPanel.tsx` | 218 | `placeholder="Email del paciente"` | INFO | HTML input attribute — not a code stub; this is the email capture input for at-share entry |
| `PreoperatorioForm.tsx` | 415 | `placeholder="Escribir y presionar Enter para agregar..."` | INFO | HTML input attribute for the Otro text input — correct UX instruction |

No TBD, FIXME, XXX, or unreferenced debt markers found in any Phase 52 modified files.

### Notable Design Limitation (Not a Defect)

**Portal link not recoverable across sessions (D-12/PITFALL 1):** When the professional generates the portal link, the raw UUID is returned once in the URL and never persisted (only the sha256 hash is stored). If the professional closes the form and reopens it later (new session/page reload), clicking "Generar link del portal" returns `{url: null, alreadyGenerated: true}` and the share panel stays in the "before generation" state — the link cannot be re-displayed. This is an explicit design decision documented in D-12 and PITFALL 1 (security requirement). Phase 54 (portal identity verification) will build on this foundation. Staff must share the link within the same session as first generation. This is acceptable scope for F52.

### Human Verification Required

#### 1. Seccioned Form Visual Layout

**Test:** Open a live appointment, create a new HC entry, select "Pre Quirúrgico"
**Expected:** A single-page seccioned form with headers (Antecedentes/Alergias/Medicación/Estudios complementarios/Consentimiento informado/Compartir link) — no free textarea, no step-by-step wizard
**Why human:** Static analysis confirms the component structure; actual DOM rendering and section accordion/scroll behavior requires a browser

#### 2. Chip Pre-Load from Patient Profile

**Test:** Open PREOP form for a patient who already has condiciones/alergias/medicacion in their profile
**Expected:** Pre-existing values appear as pre-selected chips; values not in the professional's catalog appear as dashed chips
**Why human:** Requires a patient fixture with existing profile data and a running backend

#### 3. Otro Learning Round-Trip

**Test:** Enter a new value in any Otro input and press Enter; submit the PREOP form; reopen the form
**Expected:** Chip appears dashed immediately on Enter; after save the professional's catalog contains the new item; on next form open the chip appears as a solid catalog chip
**Why human:** Requires interactive browser session and a running backend

#### 4. QR Code Rendering

**Test:** In the Compartir link section, click "Generar link del portal"; toggle "Ver QR"
**Expected:** A scannable QR code appears encoding the portal URL
**Why human:** Canvas/SVG rendering is not verifiable by grep; qrcode.react wiring is confirmed but browser render required

#### 5. WhatsApp Link Behavior

**Test:** Click the WhatsApp button in SharePortalPanel
**Expected:** Opens wa.me/?text=... with the portal URL pre-filled as message; contact picker appears
**Why human:** Link navigation requires a browser

#### 6. Email Send (SMTP-configured environment)

**Test:** Configure SMTP; open PREOP form; generate link; use "Enviar por email" for a patient without an email on file
**Expected:** Email input appears; after entering email and clicking Send, "Email enviado correctamente" feedback shows; patient receives the email
**Why human:** Requires SMTP environment configuration and live email delivery

#### 7. Portal Link Idempotency

**Test:** Generate the link; refresh the page; try to generate again from the same patient's PREOP form
**Expected:** Second click returns `alreadyGenerated: true`; the "Este paciente ya tenía un link generado" note appears BUT the URL display is not available (design limitation D-12 — raw UUID not recoverable after session)
**Why human:** Requires two browser sessions; confirms the design limitation is surfaced correctly to the user

### Gaps Summary

No blocking gaps found. All 12 PREOP requirements are implemented with substantive, wired, data-flowing code. The TypeScript type system confirms correctness (tsc --noEmit exits 0 for frontend; nest build exits 0 for backend). The TDD test suite for the flat catalogs passes (11/11). Prisma schema and migration are valid and applied.

The only open items are 7 human verification scenarios covering visual/interactive/email behavior that cannot be verified programmatically.

---

## Gap Closure Re-Verification — 52-08 (UAT Test 13 / PREOP-12)

**Context:** Post-verification UAT found Test 13 ("Enviar link por email siempre falla") failing. Gap-closure plan 52-08 fixed it; a critical code-review finding (CR-01) was then fixed inline. Verified by inline code analysis (the gsd-verifier subagent was unavailable due to a provider session limit).

| Truth (52-08 must-have) | Status | Evidence |
|---|---|---|
| With SMTP + a generated link, "Enviar link por email" delivers and reports success | VERIFIED (code) | Frontend `usePortalLink.ts:54-59` POSTs `{url, email?}` with the URL held in client state; controller `enviarPortalLinkEmail` sends it via `portalEmail.enviarLinkPortal` — the idempotent `generarPortalLink` (returns `url:null` once a token exists) is no longer in the send path, eliminating the root cause. Live SMTP delivery remains a human check (human_verification #6). |
| Foreign/other-origin/malformed URL → HTTP 400, never reflected in the email body | VERIFIED | `validarPortalUrl` throws `BadRequestException` (400) via `esPortalUrlValida`; CR-01 fix also rejects any query/fragment and returns a canonical `origin+pathname` (`normalizarPortalUrl`) that the controller reflects (never raw `dto.url`). `portal-url.helper.spec.ts` → 24/24 pass incl. query/fragment XSS payload cases. |
| No recipient → banner asks for a valid email (not "verificá la dirección") | VERIFIED | Controller returns `{enviado:false, motivo:'sin_destinatario'}`; frontend maps `motivo` to differentiated banners. |
| Raw UUID never persisted nor re-derived server-side (D-12 intact) | VERIFIED | `generarPortalLink` stores only `sha256(uuid)`; the email path never calls it. |
| Email validated at runtime before persist / SMTP `to:` (WR-01) | VERIFIED | `setEmailSiFalta` rejects malformed addresses with `EMAIL_SHAPE` (the `@IsEmail()` decorator is inert — no global ValidationPipe). |

**Regression:** 52-08 + the CR-01 fix touched only the pacientes module and the frontend portal hook/panel — PREOP-01..11 untouched. `nest build` exits 0. The 4 failing backend suites (diagnosticos/usuarios/reportes) fail identically at the pre-52-08 base — pre-existing, not regressions.

**Verdict:** PREOP-12 gap CLOSED at code level. Remaining open item is unchanged: live SMTP delivery (human_verification #6).

---

_Verified: 2026-06-26T17:00:00Z (initial) · 2026-06-26 gap-closure re-verification (52-08, inline)_
_Verifier: Claude (gsd-verifier initial; orchestrator inline for 52-08 gap closure)_
