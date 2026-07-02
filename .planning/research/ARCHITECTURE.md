# Architecture Research — v1.12 Integration

**Domain:** Medical SaaS — pre-surgical HC template + patient self-service portal
**Researched:** 2026-06-25
**Confidence:** HIGH — based on direct codebase review (schema.prisma, controller files, services, frontend pages)

---

## Context: What Already Exists

Before describing changes, the stable integration points confirmed in code:

| Existing piece | Location | Relevant for v1.12 |
|---|---|---|
| `Paciente.alergias String[]` | schema.prisma:161 | Extend, do not duplicate |
| `Paciente.condiciones String[]` | schema.prisma:162 | Maps to "antecedentes médicos" |
| `Paciente.consentimientoFirmado Boolean` | schema.prisma:169 | Add audit fields alongside |
| `Paciente.consentimientosDocumentos Archivo[]` | schema.prisma:179 | Archive path for signed PDFs already exists |
| `Archivo.consentimientoPacienteId String?` | schema.prisma:346 | FK already modeled |
| `TipoEntradaHC.PREOPERATORIO` | schema.prisma:1178 | HC entry type already in enum |
| `EstudioPaciente` model | schema.prisma:257 | Complementary studies model exists |
| `PresupuestoPublicController` | presupuesto-public.controller.ts | Pattern for auth-less token controllers |
| `HistoriaClinica.crearEntrada()` | historia-clinica.service.ts:79 | Entry creation with JSONB `contenido` |
| `ZonaHC / DiagnosticoHC / TratamientoHC` | schema.prisma:1361+ | Catalog pattern: esSistema, activo, profesionalId, soft-delete, auto-learn |
| `MensajeInterno.esSistema Boolean` | schema.prisma:225 | System-origin flag exists; need patient-origin |
| `signature_pad` v5.1.1 | frontend/package.json | Signature canvas already in frontend deps |
| `pdfkit` v0.17 | backend/package.json | PDF generation already available |
| `ConfigClinica` model | schema.prisma:431 | Extend for consent template text |

---

## 1. Data Model Changes

### 1.1 Paciente — New Fields

```prisma
// Add to existing Paciente model
medicacion              String[]              // New: habitual medications (mirrors alergias pattern)
adicciones              String[]              // New: smoking, alcohol, drugs (self-reported)

// Consent audit
consentimientoFirmadoAt DateTime?             // New: timestamp of digital signature

// Patient portal
portalToken             String?   @unique     // New: persistent reusable token (UUID)
portalTokenGeneradoAt   DateTime?             // New: when token was generated
```

What NOT to add: do not add a `tratamientosPrevios` structured field. Previous treatments are captured in HC entries (the existing JSONB `contenido` covers this). Free text in the PREOPERATORIO entry `contenido` is sufficient.

What NOT to change: `condiciones String[]` already serves as "antecedentes médicos". Do not rename or duplicate it. The PREOPERATORIO form reads from `condiciones` and writes back.

### 1.2 New Catalog Models — AlergiaCatalogoPro and MedicamentoCatalogoPro

These mirror the `ZonaHC/DiagnosticoHC/TratamientoHC` pattern exactly: flat (no parent-child), per-professional, `esSistema` guard, soft-delete via `activo`, auto-learn from free text entry.

```prisma
model AlergiaCatalogoPro {
  id            String      @id @default(uuid())
  nombre        String
  orden         Int         @default(0)
  activo        Boolean     @default(true)
  esSistema     Boolean     @default(false)
  profesionalId String
  profesional   Profesional @relation(fields: [profesionalId], references: [id])
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@unique([nombre, profesionalId])
  @@index([profesionalId, activo])
}

model MedicamentoCatalogoPro {
  id            String      @id @default(uuid())
  nombre        String
  orden         Int         @default(0)
  activo        Boolean     @default(true)
  esSistema     Boolean     @default(false)
  profesionalId String
  profesional   Profesional @relation(fields: [profesionalId], references: [id])
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@unique([nombre, profesionalId])
  @@index([profesionalId, activo])
}
```

No separate `AntecedenteCatalogoPro` is needed. `condiciones String[]` on Paciente already stores antecedentes as free text, and the PREOPERATORIO form can offer pre-filled chips from the patient's existing `condiciones` values. If per-professional antecedente catalogs become necessary (user feedback), add them in a future milestone.

Seed strategy: idempotent seed at deploy time with `esSistema=true` entries (common allergies: Penicilina, Látex, AINEs, Yodo, Contraste; common medications: Anticoagulantes, Antiagregantes, Corticoides, Metformina). Same pattern as ZonaHC seed in v1.9.

### 1.3 ConfigClinica — Consent Template Extension

```prisma
// Add to existing ConfigClinica model
consentimientoTexto     String?   @db.Text   // Rich text body of the consent document
consentimientoVersion   String?              // Version label (e.g. "v2 — junio 2026")
```

Decision: store consent as TEXT in ConfigClinica (not as an uploaded PDF file). The clinic pastes or types their consent text into a textarea in Configuracion. At signing time, the backend generates a fresh PDF with pdfkit (already available) containing: clinic header, consent text, patient identification block, drawn signature image, timestamp. This avoids adding pdf-lib as a new dependency and avoids a multer file-upload infrastructure for templates. The signed PDF IS stored on disk (see Section 3).

### 1.4 TareaSeguimiento — Dedupe Guard

```prisma
// Add to existing TareaSeguimiento model
notificada Boolean @default(false)   // Set true after first MensajeInterno is created
```

The scheduler WHERE clause changes from `{ completada: false, fechaProgramada: { lte: now } }` to `{ completada: false, notificada: false, fechaProgramada: { lte: now } }`, and the loop sets `notificada: true` immediately after creating the message. Existing spam messages are left in place (no backfill needed; staff can mark them read).

### 1.5 MensajeInterno — Patient-Origin Flag and Nullable autorId

```prisma
// Add to existing MensajeInterno model
origenPaciente Boolean @default(false)   // true when message comes from patient portal

// Change autorId from required to optional
autorId String?   // was String NOT NULL
```

Making `autorId` nullable is the correct schema-level decision: patient portal messages have no staff `autorId`. In the service layer, when `origenPaciente=true`, `autorId` is set to `null` and `pacienteId` is the identity. The existing `findChats` and `findByPaciente` queries handle nullable authors (check for null before rendering the author name chip). SQL: `ALTER TABLE "MensajeInterno" ALTER COLUMN "autorId" DROP NOT NULL;` (safe, no table rewrite).

---

## 2. Module and Endpoint Structure

### 2.1 New Module: paciente-portal

Create `backend/src/modules/paciente-portal/` as a dedicated module. Do NOT extend `PacientesController` (it is JWT-guarded at class level) and do NOT create a public controller inside the pacientes module. The pattern is exactly the presupuesto public controller: a separate `@Controller` class with no `@Auth()` decorator, registered in its own module.

```
paciente-portal/
  paciente-portal.controller.ts    <- @Controller('pacientes/portal'), no @Auth()
  paciente-portal.service.ts
  paciente-portal.module.ts        <- imports PrismaModule, MensajesInternosModule
  dto/
    verificar-portal.dto.ts
    firmar-consentimiento.dto.ts
    enviar-consulta.dto.ts
```

Endpoint list:

```
GET  /pacientes/portal/:token              -> validate token exists, return { ok, nombreClinica }
POST /pacientes/portal/:token/verificar    -> DNI gate, returns patient data + short portalJwt
GET  /pacientes/portal/:token/data         -> full patient portal payload (requires portalJwt header)
GET  /pacientes/portal/:token/consent      -> returns consent text for display (no auth)
POST /pacientes/portal/:token/firmar       -> sign consent (requires portalJwt + signatureBase64)
POST /pacientes/portal/:token/consulta     -> patient question -> MensajeInterno (requires portalJwt)
```

portalJwt design: `POST /verificar` returns `{ patientJwt: string, ...patientData }`. The JWT is signed with `JWT_SECRET`, payload `{ sub: pacienteId, scope: "patient-portal", iat, exp: now+4h }`. A `PortalJwtGuard` (not the main `JwtAuthGuard`) verifies `scope === "patient-portal"`. This avoids repeated DNI entry while keeping sensitive writes protected. The guard is applied via `@UseGuards(PortalJwtGuard)` on write endpoints; read endpoints remain open.

Token generation: add `POST /pacientes/:id/generar-portal-token` to the existing (JWT-guarded) `PacientesController`. Returns `{ portalUrl: string }`. Sets `Paciente.portalToken = crypto.randomUUID()` and `portalTokenGeneradoAt = now()`. The token persists forever (reusable). Regenerating invalidates the old token because the old URL fails the `findUnique({ where: { portalToken } })` lookup.

### 2.2 Extend catalogo-hc module for new catalogs

Add `AlergiaCatalogoPro` and `MedicamentoCatalogoPro` endpoints to the existing `catalogo-hc` module (it already houses ZonaHC/DiagnosticoHC/TratamientoHC). This keeps all per-professional HC catalogs co-located. New endpoints follow the same GET/POST/PATCH/DELETE pattern with esSistema guard on mutations.

### 2.3 Extend historia-clinica module for PREOPERATORIO entries

No new module needed. The existing `crearEntrada` endpoint already accepts `tipoEntrada: PREOPERATORIO`. What changes:

1. Add a new `dto.tipo === 'preoperatorio'` branch in `crearEntrada` that builds the PREOPERATORIO `contenido` JSONB shape (see Section 4)
2. After creating the entry, run `aprenderDesdePreoperatorio` best-effort (same pattern as `aprenderDesdeZonas` in v1.9) to upsert new alergias to `AlergiaCatalogoPro`, upsert new medicamentos to `MedicamentoCatalogoPro`, and sync `Paciente.alergias` and `Paciente.medicacion` arrays
3. If consent is captured in the form, update `Paciente.consentimientoFirmado = true` and `consentimientoFirmadoAt = now()` in the same transaction

### 2.4 File serving for signed consent PDFs

No multer exists today. Add `StreamableFile` (built into NestJS, no new dep) for serving files from `uploads/`. The backend reads the file with `fs.createReadStream()` and returns `StreamableFile`. The signed PDF is served via a portal endpoint `GET /pacientes/portal/:token/consent-pdf/:archivoId` which verifies the portalJwt before serving.

Signed PDFs path: `{UPLOAD_DIR}/signed-consents/{pacienteId}-{timestamp}.pdf`. `UPLOAD_DIR` defaults to `./uploads/` and is configurable via env var for production.

---

## 3. Signed Consent Flow — End to End

```
[CONFIGURACION - Doctor]
  Staff opens Configuracion -> Consentimiento tab
  Pastes/edits consent text in textarea
  Saves -> PATCH /configuracion/:profesionalId/consentimiento
    -> ConfigClinica.consentimientoTexto = text
    -> ConfigClinica.consentimientoVersion = label

[TRIGGER - Staff sends portal link]
  Staff clicks "Enviar portal al paciente" in PatientDrawer
  -> POST /pacientes/:id/generar-portal-token (if no portalToken exists)
  -> Builds URL: {FRONTEND_URL}/portal/{portalToken}
  -> Sends via WhatsApp (existing BullMQ) or email (existing nodemailer)

[PATIENT ACCESSES PORTAL]
  GET /pacientes/portal/:token
    -> finds Paciente by portalToken, returns { ok: true, nombreClinica }
    -> if no Paciente found: 404

  Patient enters DNI
  POST /pacientes/portal/:token/verificar { dni }
    -> loads Paciente, compares DNI (same normalization as presupuesto verificarYCargar)
    -> on match: signs and returns portalJwt (4h) + patient payload
    -> payload: { nombreCompleto, consentimientoFirmado, instruccionesPre,
                  instruccionesPost, turnoProximo, consentimientoTexto }

[PATIENT READS CONSENT]
  GET /pacientes/portal/:token/consent
    -> returns { texto: string, version: string }
    -> no auth required (text is not PII)

[PATIENT SIGNS]
  Patient draws signature on Canvas (signature_pad already in frontend deps)
  Clicks "Firmar consentimiento"
  POST /pacientes/portal/:token/firmar { signatureBase64: string }
    Authorization: Bearer {portalJwt}

  Backend (PacientePortalService.firmarConsentimiento):
  1. Validate PortalJwt -> extract pacienteId
  2. Load Paciente + profesional.configClinica (consentimientoTexto, nombreClinica, logoUrl)
  3. Decode signatureBase64 -> PNG buffer
  4. Generate signed PDF with pdfkit:
       - Header: clinic name, consent version
       - Body: consentimientoTexto rendered as paragraphs
       - Footer block: "Paciente: {nombreCompleto} - DNI: {dni}"
                       "Fecha de firma: {now ISO8601}"
       - Signature image: embed via pdfkit .image() from PNG buffer
  5. Write PDF to {UPLOAD_DIR}/signed-consents/{pacienteId}-{Date.now()}.pdf
  6. In $transaction:
       a. Create Archivo { url: filePath, tipo: 'consentimiento-firmado',
                          descripcion: 'Consentimiento firmado digitalmente via portal',
                          consentimientoPacienteId: pacienteId }
       b. Update Paciente { consentimientoFirmado: true, consentimientoFirmadoAt: now() }
  7. Post-transaction (best-effort): create MensajeInterno {
       esSistema: true,
       origenPaciente: false,
       autorId: null,           <- requires nullable autorId migration from Phase 1
       pacienteId,
       mensaje: "El paciente {nombreCompleto} firmo el consentimiento informado digitalmente.",
       prioridad: 'ALTA'
     }
  8. Return { ok: true, archivoId }

[STAFF VIEWS IN PATIENT DRAWER]
  PatientDrawer -> shows consentimientoFirmado badge + consentimientoFirmadoAt date
  -> link to download signed PDF (via portal endpoint or admin endpoint serving the Archivo)
```

---

## 4. PREOPERATORIO HC Entry — JSONB contenido Shape

The PREOPERATORIO entry integrates into `crearEntrada` as a new `dto.tipo === 'preoperatorio'` branch. The `contenido` JSONB shape:

```typescript
interface ContenidoPreoperatorio {
  tipo: 'preoperatorio';  // discriminator for HCEntryContent renderer

  // Patient health status (chips from catalogs + free text)
  alergias: string[];
  medicacion: string[];
  antecedentes: string[];   // maps to Paciente.condiciones
  adicciones: string[];

  // Pre-surgical notes
  estadoActual: string;     // free text: "Buen estado general, sin intercurrencias"
  aptoQuirurgico: boolean;  // clinical clearance flag
  observaciones: string;

  // Complementary studies (snapshot; live list comes from EstudioPaciente table)
  estudiosResumen: Array<{
    nombre: string;
    entregado: boolean;
  }>;

  // Consent captured in this session
  consentimientoRegistrado: boolean;
}
```

EstudioPaciente sync: if the PREOPERATORIO DTO includes new studies, the service creates `EstudioPaciente` records post-transaction (best-effort, same pattern as aprenderDesdeZonas). The `estudiosResumen` array in `contenido` is a snapshot for the HC record. The live checklist comes from querying `EstudioPaciente` directly.

Renderer: `HCEntryContent.tsx` needs a new branch for `tipo === 'preoperatorio'`. Display chips for alergias/medicacion/antecedentes similar to the zona chips in v1.9 shape, plus an "Apto quirurgico" badge and consent status indicator.

Backward compatibility: the new `tipo` discriminator means existing `HCEntryContent` renders fall through to the text branch for legacy entries. No backfill needed.

---

## 5. Chat Integration and Seguimiento Spam Fix

### 5.1 Patient questions in MensajeInterno

The portal endpoint `POST /pacientes/portal/:token/consulta` creates a `MensajeInterno` with `origenPaciente: true` and `autorId: null`. Staff see this in the existing Mensajes Internos UI with a "Paciente" badge instead of a staff name avatar.

UI change required: in the chat message renderer, check `origenPaciente`. If true, render sender as "Paciente" with a patient icon instead of the staff avatar. No new data model needed.

Staff replies continue via the existing MensajeInterno creation flow (autorId = staff userId, origenPaciente = false). The patient does not see replies via the portal in v1.12 scope (replies go to WhatsApp/email per existing channels). The portal shows "Tu consulta fue recibida" confirmation.

### 5.2 Seguimiento scheduler — dedupe fix (HIGH PRIORITY, isolated change)

Current bug confirmed in code: `processSeguimientos()` runs daily and creates a new `MensajeInterno` for every `TareaSeguimiento` where `completada=false AND fechaProgramada <= now`. Since tasks are never auto-completed, each task generates a new notification every day indefinitely.

Fix: one migration field + three-line change in the service:

```typescript
// SeguimientoSchedulerService.processSeguimientos() - changed query
const tareasPendientes = await this.prisma.tareaSeguimiento.findMany({
  where: {
    completada: false,
    notificada: false,              // <- NEW guard (requires Phase 1 migration)
    fechaProgramada: { lte: ahora },
  },
  // ... rest unchanged
});

// Inside the for loop, after creating the MensajeInterno:
await this.prisma.tareaSeguimiento.update({
  where: { id: tarea.id },
  data: { notificada: true },       // <- NEW: mark notified
});
```

Semantics: scheduler notifies once. Staff must manually complete the task. If re-notification is needed, a staff member creates a new TareaSeguimiento. This is intentional.

Existing spam messages: no cleanup migration. Staff mark them read. If the client reports noise after deploy, add a one-time admin endpoint that archives system messages older than the deploy date.

### 5.3 Disambiguating MensajeInterno origins in the UI

After `origenPaciente` and nullable `autorId` migration, the rendering logic:

| esSistema | origenPaciente | autorId | Display as |
|---|---|---|---|
| true | false | non-null | System notification (yellow/orange, automated) |
| false | false | non-null | Staff message (staff avatar + name) |
| false | true | null | Patient question (patient icon + "Paciente" badge, teal) |

No new enum needed. Two boolean flags cover all cases.

---

## 6. Component Boundaries

```
PATIENT PORTAL (public, no JWT)
  frontend/src/app/portal/[token]/page.tsx
  frontend/src/app/portal/[token]/layout.tsx
  frontend/src/components/portal/
    SignatureCanvas.tsx     <- wraps signature_pad (already in deps)
    ConsentDisplay.tsx
    PortalInstrucciones.tsx
    PortalConsultaForm.tsx
  backend/src/modules/paciente-portal/
    paciente-portal.controller.ts   <- no @Auth()
    paciente-portal.service.ts
    -> imports: PrismaModule, MensajesInternosModule
    -> uses: PortalJwtGuard (new, lightweight)

PREOPERATORIO HC ENTRY (staff, JWT-guarded)
  frontend/src/components/hc/PreoperatorioForm.tsx
    <- chip inputs: alergias/medicacion/antecedentes from new catalogs
    <- estudios checklist from EstudioPaciente
  frontend/src/components/patient/.../HCEntryContent.tsx
    <- new 'preoperatorio' renderer branch
  backend/src/modules/historia-clinica/historia-clinica.service.ts
    <- crearEntrada() new preoperatorio branch
    <- aprenderDesdePreoperatorio() best-effort post-tx
  backend/src/modules/catalogo-hc/
    <- +AlergiaCatalogoPro endpoints
    <- +MedicamentoCatalogoPro endpoints

CONSENT TEMPLATE MANAGEMENT (staff, Configuracion)
  frontend/src/app/dashboard/configuracion/
    <- new ConsentimientoEditor tab component
  backend config module
    <- PATCH /configuracion/:id/consentimiento
    <- -> ConfigClinica.consentimientoTexto + consentimientoVersion
```

---

## 7. Portal Token Security

| Property | Presupuesto token | Patient portal token |
|---|---|---|
| Generation | crypto.randomUUID() at send time | crypto.randomUUID() on demand |
| Storage | Presupuesto.tokenAceptacion String? @unique | Paciente.portalToken String? @unique |
| Lifetime | One-time (invalidated after accept/reject) | Persistent until regenerated |
| PII gate | DNI verification per action | DNI once -> short portalJwt (4h) |
| Write protection | Token alone is sufficient (it is the nonce) | portalJwt required for writes |
| Revocation | Implicit (state change makes old state invalid) | Regenerate replaces the UUID; old URL returns 404 |

Brute-force protection: the 128-bit UUID token space makes enumeration infeasible. Rate-limiting on `POST /portal/:token/verificar` via NestJS Throttler (add `@nestjs/throttler` if not yet configured). Limit: 5 DNI attempts per token per 15 minutes.

HTTPS requirement: the portal token in the URL must only be shared over HTTPS in production. Document as a deploy requirement, not an in-app concern.

---

## 8. Dependency-Aware Build Order

The ordering respects: (a) schema migrations before code that uses them, (b) backend before frontend consuming it, (c) lower-risk standalone pieces before integrated flows.

### Phase 1 — Schema Foundation (migration only, no functional change)

- Paciente: `medicacion String[]`, `adicciones String[]`, `consentimientoFirmadoAt DateTime?`, `portalToken String? @unique`, `portalTokenGeneradoAt DateTime?`
- TareaSeguimiento: `notificada Boolean @default(false)`
- MensajeInterno: `origenPaciente Boolean @default(false)`, `autorId String?` (drop NOT NULL)
- ConfigClinica: `consentimientoTexto String? @db.Text`, `consentimientoVersion String?`
- New models: `AlergiaCatalogoPro`, `MedicamentoCatalogoPro` (with Profesional FK + relations)
- Idempotent seed for new catalog models

pgBouncer note: all new columns have defaults. The NOT NULL drop for `autorId` is safe: `ALTER TABLE "MensajeInterno" ALTER COLUMN "autorId" DROP NOT NULL;`. Write migration SQL manually as done in v1.6/v1.8/v1.9.

### Phase 2 — Seguimiento Scheduler Fix (isolated, high value)

Unblocks clean inbox for all future work. Self-contained: 1 migration field (from Phase 1) + 3-line service change.

### Phase 3 — Catalogs API + Preoperatorio Form (staff-facing)

Depends on Phase 1 (new catalog models and Paciente fields).

- Backend: AlergiaCatalogoPro + MedicamentoCatalogoPro CRUD in catalogo-hc module (seed + 4 endpoints each)
- Backend: crearEntrada new preoperatorio branch with aprenderDesdePreoperatorio best-effort
- Frontend: PreoperatorioForm component
- Frontend: HCEntryContent.tsx new preoperatorio renderer branch
- Frontend: HCCreatorForm swap to PreoperatorioForm when tipoEntrada = PREOPERATORIO

### Phase 4 — Consent Template Management (staff-facing config)

Depends on Phase 1 (ConfigClinica fields).

- Backend: PATCH endpoint for consentimientoTexto + consentimientoVersion in config module
- Frontend: ConsentimientoEditor component in Configuracion (new tab or section)

### Phase 5 — Patient Portal Backend (new module)

Depends on Phases 1 and 4.

- Backend: paciente-portal.module.ts, controller, service
- Endpoints: GET /:token, POST /:token/verificar, GET /:token/consent, POST /:token/consulta
- PortalJwtGuard (lightweight, checks scope claim)
- Backend: POST /pacientes/:id/generar-portal-token in PacientesController
- MensajeInterno service: handle origenPaciente=true, autorId=null create path

### Phase 6 — Patient Portal Frontend

Depends on Phase 5.

- frontend/src/app/portal/[token]/page.tsx + layout.tsx
- Components: PortalPage, PortalInstrucciones, PortalConsultaForm
- DNI gate -> store portalJwt in sessionStorage (not localStorage — expires on tab close)
- Shows: next appointment, pre/post instructions, question form
- Does NOT include consent signing UI (Phase 7 adds it)

### Phase 7 — Signed Consent Flow (PDF generation)

Depends on Phases 4, 5, and 6.

- Backend: firmarConsentimiento() in PacientePortalService
  - pdfkit PDF generation (header + consent text + patient block + signature image)
  - Write to uploads/signed-consents/
  - Create Archivo record (consentimientoPacienteId)
  - Update Paciente.consentimientoFirmado + consentimientoFirmadoAt
  - Post-transaction: MensajeInterno notification to staff
- Backend: StreamableFile endpoint to serve signed PDF
- Frontend: portal ConsentTab (consent text display + SignatureCanvas + confirm button)
- Frontend: PatientDrawer consent status badge + download link

### Phase 8 — Chat Inbox Patient Badge

Depends on Phase 1 (origenPaciente field) and Phase 5 (portal consulta endpoint).

- Frontend: update MensajeInterno chat message renderer for origenPaciente=true messages
- Optional: cleanup endpoint for pre-fix system message spam (admin-only, defer to user request)

---

## 9. What Each Component Touches

| Component | Status | Phase |
|---|---|---|
| schema.prisma | MODIFIED (5 new Paciente fields + 2 new models + 3 field additions) | 1 |
| seguimiento-scheduler.service.ts | MODIFIED (3 lines: WHERE guard + update notificada) | 2 |
| catalogo-hc module | EXTENDED (2 new catalog types + endpoints + seed) | 3 |
| historia-clinica.service.ts | EXTENDED (preoperatorio branch in crearEntrada) | 3 |
| historia-clinica.contenido.helpers.ts | EXTENDED (construirContenidoPreoperatorio) | 3 |
| HCCreatorForm.tsx | MODIFIED (swap form on PREOPERATORIO tipoEntrada) | 3 |
| HCEntryContent.tsx | EXTENDED (preoperatorio renderer branch) | 3 |
| PreoperatorioForm.tsx | NEW | 3 |
| Config module | EXTENDED (consent text endpoints) | 4 |
| ConsentimientoEditor.tsx | NEW | 4 |
| paciente-portal module | NEW (controller + service + guard) | 5 |
| pacientes.controller.ts | EXTENDED (generar-portal-token endpoint) | 5 |
| mensajes-internos.service.ts | MODIFIED (origenPaciente support, nullable autorId) | 5 |
| frontend/src/app/portal/[token]/ | NEW | 6 |
| PacientePortalService.firmarConsentimiento() | NEW | 7 |
| PatientDrawer consent status display | MODIFIED | 7 |
| MensajeInterno chat renderer | MODIFIED (origenPaciente badge) | 8 |

---

## Sources

- Codebase direct review: `backend/src/prisma/schema.prisma` (full, 1413 lines)
- `backend/src/modules/presupuestos/presupuesto-public.controller.ts` (public controller pattern confirmed)
- `backend/src/modules/presupuestos/presupuestos.service.ts` lines 482-574 (verificarYCargar + findByToken pattern)
- `backend/src/modules/pacientes/seguimiento-scheduler.service.ts` (spam bug confirmed in code)
- `backend/src/modules/mensajes-internos/mensajes-internos.service.ts` (full read)
- `frontend/src/app/presupuesto/[token]/page.tsx` (DNI gate + accordion pattern)
- `backend/package.json`: pdfkit v0.17 confirmed, no multer, no pdf-lib
- `frontend/package.json`: signature_pad v5.1.1 confirmed

---

*Architecture research for: CLINICAL v1.12 pre-surgical HC + patient portal*
*Researched: 2026-06-25*
