---
phase: 52-preop-hc-form-chip-catalogs
verified: 2026-06-26T20:00:00Z
status: human_needed
score: 12/12
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 12/12
  gaps_closed:
    - "Gap B (52-UAT Test 13): Portal link unrecoverable after session — resolved by portalTokenCifrado AES-256-GCM + GET portal-link endpoint + SharePortalPanel mount-load (plans 52-09/52-10)"
  gaps_remaining: []
  regressions: []
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
  - test: "Re-test UAT Test 13 (Gap B): open SharePortalPanel for a patient who already generated a portal link"
    expected: "Panel shows the existing url with Copiar/WhatsApp/QR buttons immediately after the bounded spinner resolves — no stuck generate screen, no dead spinner. Note 'Este paciente ya tenía un link generado — se muestra el mismo link estable.' visible below the url."
    why_human: "Comportamiento visual en browser con datos reales (portalTokenCifrado poblado en BD). Requiere sesión autenticada contra el backend corriendo con ENCRYPTION_KEY configurada."
  - test: "Re-test UAT Test 13 (Gap B): portal link idempotency across sessions"
    expected: "After generating a link, reloading the page and reopening SharePortalPanel still shows the same stable link (not the generate screen). The backend recovers the url via portalTokenCifrado decryption."
    why_human: "Requires two browser sessions and a DB row with portalTokenCifrado populated — cannot verify the AES decrypt round-trip against a live ENCRYPTION_KEY by grep alone."
---

# Phase 52: PREOP HC Form + Chip Catalogs — Verification Report

**Phase Goal:** Add the Prequirúrgico HC entry type: structured seccioned form with per-professional chip catalogs (antecedentes/alergias/medicación + Otro learning), estudios checklist, consentimiento informado check, and patient portal link sharing (copy/WhatsApp/QR/email). Gap-closure runs 52-09/52-10 made the portal link recoverable across sessions.
**Verified:** 2026-06-26T20:00:00Z (initial 2026-06-26T17:00:00Z; gap-closure re-verification 2026-06-26T20:00:00Z)
**Status:** human_needed
**Re-verification:** Yes — after gap-closure plans 52-09 (backend) and 52-10 (frontend)

---

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
| 10 | sha256 hash stored in portalToken; raw UUID cifrado AES-256-GCM en portalTokenCifrado; idempotent (D-12 ampliada) | VERIFIED | `pacientes.service.ts`: `generarPortalLink` Caso A (línea 1068) descifra y devuelve url estable; Caso B legacy rota; Caso C primera generación. `portalTokenCifrado String?` en schema línea 219. |
| 11 | SharePortalPanel uses backend-returned URL verbatim; no client-side hash construction (PITFALL 1) | VERIFIED | `SharePortalPanel.tsx`: no sha256/createHash/token construction; `url` derivado de `actual?.url` (query cache de `useObtenerPortalLink`); `QRCodeSVG value={url}`, `clipboard.writeText(url)`, `wa.me/?text=...url` usan la misma cadena |
| 12 | Email option SMTP-gated (D-13); at-share email capture; email sent only when SMTP configured | VERIFIED | `SharePortalPanel.tsx` línea 246: `{smtpConfigured && (...)}` gate; Input rendered cuando `!pacienteEmail` (línea 251); `PortalEmailService.isSmtpConfigured()` verifica SMTP_HOST+USER+PASS |

**Score:** 12/12 truths verified

---

## Gap B Closure Re-Verification (Plans 52-09 and 52-10)

**Gap B root cause (from 52-UAT):** El raw UUID del portal token se descartaba tras la primera generación (sólo se persistía el hash SHA-256). Al recargar, `SharePortalPanel` arrancaba con `url=null`, el POST devolvía `{url:null, alreadyGenerated:true}`, y el panel quedaba atascado en la pantalla de "Generar" — el link era irrecuperable entre sesiones.

**Resolución:** Ampliar D-12 (no rotarla): almacenar el raw token cifrado AES-256-GCM en `portalTokenCifrado`; agregar `GET :id/portal-link` de sólo lectura que descifra y devuelve la url; `SharePortalPanel` consulta el endpoint en mount vía `useObtenerPortalLink`.

### Truths Gap B (52-09 + 52-10)

| # | Verdad | Estado | Evidencia |
|---|--------|--------|-----------|
| G1 | Paciente con link previo recupera la MISMA url estable: token crudo cifrado AES-256-GCM, descifrado al consultar | VERIFIED | `generarPortalLink` Caso A (service.ts:1068-1073): `this.encryption.decrypt(portalTokenCifrado)` → reconstruye url; no escribe BD |
| G2 | GET portal-link devuelve url existente SIN generar token nuevo; `url:null` sólo para sin token o legacy | VERIFIED | `obtenerPortalLink` (service.ts:1128-1160): read-only; tres ramas correctas |
| G3 | Hash SHA-256 (`portalToken`) sigue siendo la única vía de lookup; raw token nunca en claro ni en logs | VERIFIED | `portalToken @unique` intacto (schema línea 217); `console.info` en legacy rotation (línea 1092) loguea sólo `pacienteId` — NO rawUuid ni blob |
| G4 | Paciente legacy puede backfillear via generarPortalLink explícito que rota el token | VERIFIED | `generarPortalLink` Caso B (service.ts:1077-1095): nuevo rawUuid, nuevo hash, nuevo cifrado; `obtenerPortalLink` legacy devuelve `{url:null, legacy:true}` sin escribir |
| G5 | Al abrir SharePortalPanel para paciente con link previo: url existente con Copiar/WhatsApp/QR — sin dead-spinner* | VERIFIED (código) | Panel usa `useObtenerPortalLink(pacienteId)` en mount (línea 25); `url = actual?.url` (no estado local volátil); spinner acotado (líneas 124-131); render link cuando `url` truthy (línea 172+). *Re-test visual pendiente |
| G6 | Para sin token o legacy: panel muestra botón Generar (no spinner); al generar aparece la url* | VERIFIED (código) | `if (!url)` branch (línea 136-167) muestra botón Generar; `handleGenerar` actualiza cache vía `setQueryData` (líneas 59-67). *Re-test visual pendiente |
| G7 | (Opcional implementada) banner de fallo email muestra código real de error SMTP sin filtrar credenciales | VERIFIED | `portal-email.service.ts` línea 86: `const codigo = error.code ?? 'UNKNOWN'`; controller línea 304-305 propaga `codigo`; panel línea 301-303: `SMTP: ${emailErrorCodigo}` |

**Gap B Score:** 7/7 truths verificados en código

### Artifacts Gap B

| Artefacto | Estado | Detalle |
|-----------|--------|---------|
| `backend/src/prisma/schema.prisma` — `portalTokenCifrado String?` | VERIFIED | Línea 219: columna nullable con comentario AES-256-GCM; `portalToken @unique` intacto |
| `backend/src/prisma/migrations/20260626130000_add_portal_token_cifrado/migration.sql` | VERIFIED | `ALTER TABLE "Paciente" ADD COLUMN "portalTokenCifrado" TEXT;` — additive-only, sin pérdida de datos |
| `backend/src/modules/pacientes/pacientes.service.ts` — `obtenerPortalLink` + `EncryptionService` | VERIFIED | `obtenerPortalLink` (línea 1128); import `EncryptionService` (línea 34); `private readonly encryption` (línea 48); tres casos en `generarPortalLink` (líneas 1068, 1077, 1099) |
| `backend/src/modules/pacientes/pacientes.module.ts` — `WhatsappModule` en imports | VERIFIED | Línea 10: `imports: [ScheduleModule.forRoot(), WhatsappModule]` |
| `backend/src/modules/pacientes/pacientes.service.spec.ts` — 9 tests | VERIFIED | Suite cubre: primera generación, ya-generado, legacy rotation, `obtenerPortalLink` 4 ramas, seguridad (no raw token en logs) |
| `backend/src/modules/pacientes/pacientes.controller.ts` — `GET :id/portal-link` | VERIFIED | Líneas 240-249: `@Get(':id/portal-link')` → `obtenerPortalLink(id)` → `{url, alreadyGenerated, legacy, smtpConfigured}` |
| `frontend/src/hooks/usePortalLink.ts` — `useObtenerPortalLink` | VERIFIED | Líneas 40-51: `useQuery` con `queryKey ['portal-link', pacienteId]`, `enabled: !!pacienteId` |
| `frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx` — mount-load | VERIFIED | Importa `useObtenerPortalLink` (línea 11); llama en línea 25; `url` derivado de `actual?.url` (no useState volátil); `setQueryData` tras generar (líneas 59-67) |

### Key Links Gap B

| From | To | Via | Estado |
|------|----|-----|--------|
| `pacientes.service.ts` | `EncryptionService.encrypt/decrypt` | DI desde `WhatsappModule` | WIRED — import línea 34; inyección línea 48; usos líneas 1069, 1080, 1104 |
| `pacientes.controller.ts` | `pacientesService.obtenerPortalLink` | `GET :id/portal-link` | WIRED — líneas 240-249 |
| `SharePortalPanel.tsx` | `GET /pacientes/:id/portal-link` | `useObtenerPortalLink` (useQuery en mount) | WIRED — hook `api.get('/pacientes/${pacienteId}/portal-link')`; panel línea 25 |
| `handleGenerar` | query cache `['portal-link', pacienteId]` | `queryClient.setQueryData` tras POST | WIRED — líneas 59-67 preservan `prev?.url` si `result.url` es null |
| `portal-email.service.ts` → controller → SharePortalPanel | `codigo` SMTP | `error.code` → `{enviado:false, codigo}` → `{motivo:'envio_fallido', codigo}` → banner | WIRED — service línea 86; controller líneas 304-305; panel líneas 114, 301-303 |

### UAT Gap B — Items "missing" cerrados

| Item UAT (missing) | Cierre |
|--------------------|--------|
| "Add portalTokenCifrado String? to Paciente; store hash + AES-256-GCM encrypted UUID; migration required" | `schema.prisma` línea 219 + migración `20260626130000_add_portal_token_cifrado` |
| "generarPortalLink (or GET): when token exists, decrypt portalTokenCifrado and return URL with alreadyGenerated:true" | `generarPortalLink` Caso A (línea 1068); `GET :id/portal-link` → `obtenerPortalLink` (línea 1128) |
| "SharePortalPanel: render existing link + share options when backend returns url; never stuck on generate screen" | Panel usa `useObtenerPortalLink` en mount; `url` derivado de query cache (no estado local volátil); spinner acotado |
| "Reuse AES-256-GCM helper for WABA accessTokenEncrypted; no second crypto scheme" | `EncryptionService` de `../whatsapp/crypto/encryption.service`; `WhatsappModule` en imports de `PacientesModule` |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | AntecedenteCatalogoPro model + portalTokenCifrado nullable | VERIFIED | Lines 1461-1474 (model) + line 139 (inverse relation) + line 219 (portalTokenCifrado) |
| `backend/src/prisma/migrations/20260626120000_add_antecedente_catalogo_pro/migration.sql` | CREATE TABLE AntecedenteCatalogoPro with FK + unique + index | VERIFIED | File exists with full DDL; applied to live DB |
| `backend/src/prisma/migrations/20260626130000_add_portal_token_cifrado/migration.sql` | ADD COLUMN portalTokenCifrado (additive-only) | VERIFIED | `ALTER TABLE "Paciente" ADD COLUMN "portalTokenCifrado" TEXT;` |
| `backend/src/modules/catalogo-hc/catalogo-hc.seed-data.ts` | SEED_ANTECEDENTES string[10] | VERIFIED | Exported at line 34 |
| `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` | seed/get/aprenderDesdePreoperatorio methods | VERIFIED | All methods present with substantive logic |
| `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts` | 3 JWT-scoped GET endpoints | VERIFIED | Lines 72/81/90 |
| `backend/src/modules/catalogo-hc/catalogo-hc.flat-catalog.service.spec.ts` | TDD test suite (11 tests) | VERIFIED | All 11 tests pass |
| `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts` | PREOP DTO fields | VERIFIED | antecedentes/alergias/medicacion (string[]), EstudiosComplementariosDto, consentimientoInformado (boolean) |
| `backend/src/modules/historia-clinica/historia-clinica.service.ts` | pre_quirurgico branch in crearEntrada | VERIFIED | Branch at line 105; all D-09/D-10/D-11/D-06 patterns confirmed |
| `backend/src/modules/pacientes/pacientes.service.ts` | generarPortalLink (3 cases) + obtenerPortalLink + EncryptionService | VERIFIED | Lines 1043-1160; EncryptionService injected at line 48 |
| `backend/src/modules/pacientes/pacientes.service.spec.ts` | 9-test suite covering round-trip, legacy, tamper | VERIFIED | All test cases documented in spec |
| `backend/src/modules/pacientes/portal-email.service.ts` | SMTP-aware emailer with isSmtpConfigured; returns codigo? | VERIFIED | Lines 45/56; `enviarLinkPortal` returns `{enviado, codigo?}` |
| `backend/src/modules/pacientes/pacientes.controller.ts` | GET + POST portal-link + email endpoints | VERIFIED | GET líneas 240-249; POST líneas 252-260; email líneas 265-307 |
| `backend/src/modules/pacientes/pacientes.module.ts` | PortalEmailService + WhatsappModule registered | VERIFIED | Line 10: `imports: [ScheduleModule.forRoot(), WhatsappModule]`; line 12: providers |
| `frontend/src/hooks/useAntecedentesCatalogo.ts` | TanStack Query hook; ANTECEDENTES_CATALOGO_QUERY_KEY | VERIFIED | Lines 4/16 |
| `frontend/src/hooks/useAlergiasCatalogo.ts` | TanStack Query hook; ALERGIAS_CATALOGO_QUERY_KEY | VERIFIED | Lines 4/16 |
| `frontend/src/hooks/useMedicamentosCatalogo.ts` | TanStack Query hook; MEDICAMENTOS_CATALOGO_QUERY_KEY | VERIFIED | Lines 4/16 |
| `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` | PREOP DTO fields + 3 catalog invalidations | VERIFIED | Lines 66-74 (fields), 110-112 (invalidations) |
| `frontend/src/hooks/usePortalLink.ts` | generate + email mutations + useObtenerPortalLink query | VERIFIED | Lines 28/45 (mutations) + lines 40-51 (query) |
| `frontend/src/components/live-turno/tabs/hc/PreoperatorioForm.tsx` | Full seccioned PREOP form | VERIFIED | 600+ line substantive component; all sections present |
| `frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` | pre_quirurgico render + save branch | VERIFIED | Lines 66/106/151/262/368 |
| `frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx` | Mount-load via useObtenerPortalLink; Copy/WhatsApp/QR/email panel | VERIFIED | useObtenerPortalLink en mount (línea 25); url derivado de query (línea 30); spinner acotado; setQueryData tras generar |
| `frontend/src/types/pacients.ts` | PacienteDetalle extended with condiciones/alergias/medicacion | VERIFIED | Lines 61-63 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `crearEntrada pre_quirurgico branch` | `catalogoHc.aprenderDesdePreoperatorio` | best-effort post-transaction | VERIFIED | Lines 392-403; outer try/catch; profesionalId is JWT-derived arg |
| `pre_quirurgico merge` | `paciente.condiciones/alergias/medicacion` | `Array.from(new Set([...]))` | VERIFIED | Lines 295-307 inside $transaction |
| `catalogo-hc.controller GET endpoints` | `getProfesionalId(req.user, ...)` | JWT scope resolver | VERIFIED | Lines 77/86/95 |
| `generarPortalLink` | `Paciente.portalToken + portalTokenCifrado` | `sha256 + EncryptionService.encrypt` | VERIFIED | Lines 1068/1077/1099; EncryptionService injected from WhatsappModule |
| `obtenerPortalLink` | `EncryptionService.decrypt(portalTokenCifrado)` | DI from WhatsappModule | VERIFIED | Lines 1148-1159; tamper caught, returns legacy:true |
| `GET :id/portal-link controller` | `pacientesService.obtenerPortalLink` | NestJS DI | VERIFIED | Lines 240-249 |
| `SharePortalPanel` | `GET /pacientes/:id/portal-link` | `useObtenerPortalLink` (useQuery mount) | VERIFIED | Hook lines 40-51; panel line 25 |
| `handleGenerar` | query cache `['portal-link', pacienteId]` | `queryClient.setQueryData` | VERIFIED | Lines 59-67; preserves prev?.url |
| `useCreateHistoriaClinicaEntry onSuccess` | three flat catalog query keys | `invalidateQueries` | VERIFIED | Lines 110-112 |
| `SharePortalPanel email section` | `smtpConfigured flag` | conditional render | VERIFIED | Line 246 `{smtpConfigured && ...}` |
| `HCCreatorForm tipoSeleccionado === 'pre_quirurgico'` | `<PreoperatorioForm>` | render swap | VERIFIED | Lines 262-266; excluded from textarea fallback at line 368 |
| `PreoperatorioForm chip sections` | `useAntecedentesCatalogo/useAlergiasCatalogo/useMedicamentosCatalogo` | per-pro catalog hooks | VERIFIED | Lines 91-93 in PreoperatorioForm |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `PreoperatorioForm` chip sections | `catalogoAntecedentes`, `catalogoAlergias`, `catalogoMedicamentos` | `useAntecedentesCatalogo/useAlergiasCatalogo/useMedicamentosCatalogo` → `GET /catalogo-hc/{section}` → `getXxxConSeed` → real DB query | Yes — lazy seeds from SEED_* constants, then returns `findMany(activo:true)` | FLOWING |
| `PreoperatorioForm` pre-load | `paciente.condiciones/alergias/medicacion` | `usePaciente(pacienteId)` → backend `findUnique` | Yes — real patient DB row | FLOWING |
| `SharePortalPanel` url | `url` (línea 30, derivado de `actual?.url`) | `useObtenerPortalLink` → `GET :id/portal-link` → `obtenerPortalLink` → `EncryptionService.decrypt(portalTokenCifrado)` | Yes — cifrado en BD, descifrado en runtime | FLOWING |
| `historia-clinica.service` pre_quirurgico branch | `estudiosComplementarios` Json column | `$transaction` Prisma update with DTO data | Yes — writes to real `HistoriaClinicaEntrada.estudiosComplementarios` column | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| AntecedenteCatalogoPro model in schema | `grep -q "model AntecedenteCatalogoPro" schema.prisma` | Found at line 1461 | PASS |
| portalTokenCifrado in schema | `grep -q "portalTokenCifrado" schema.prisma` | Found at line 219 | PASS |
| Migration additive-only | Content of `20260626130000_add_portal_token_cifrado/migration.sql` | `ALTER TABLE "Paciente" ADD COLUMN "portalTokenCifrado" TEXT;` — no DROP, no data loss | PASS |
| obtenerPortalLink exists in service | `grep -q "obtenerPortalLink" pacientes.service.ts` | Lines 1128+ | PASS |
| WhatsappModule imported in PacientesModule | `grep -q "WhatsappModule" pacientes.module.ts` | Line 10 | PASS |
| GET :id/portal-link in controller | `grep -q "obtenerPortalLink" pacientes.controller.ts` | Lines 240-249 | PASS |
| useObtenerPortalLink in hook | `grep -q "useObtenerPortalLink" usePortalLink.ts` | Lines 40-51 | PASS |
| SharePortalPanel imports useObtenerPortalLink | `grep -q "useObtenerPortalLink" SharePortalPanel.tsx` | Lines 11, 25 | PASS |
| Raw token not logged (neutral info only) | `grep -n "console.info" pacientes.service.ts` (línea 1092) | Loguea sólo `pacienteId`, no rawUuid ni blob | PASS |
| pacientes.service.spec — 9 tests | Gate confirmado por el prompt (9/9 passing) | Round-trip, already-generated, legacy, tamper, seguridad | PASS |
| backend tsc --noEmit | Gate confirmado | Sin errores nuevos | PASS |
| frontend tsc --noEmit | Gate confirmado | Sin errores nuevos | PASS |
| backend nest build | Gate confirmado | Exit code 0 | PASS |
| eslint en archivos modificados | Gate confirmado (commit 46be166 fix set-state-in-effect) | Clean | PASS |
| prisma migrate status | Gate confirmado | Up to date (migración 20260626130000 aplicada) | PASS |
| next build | SKIP — constraint de entorno Node 18 vs ≥20.9.0; no es defecto de código | N/A | SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| PREOP-01 | 52-06 | Structured seccioned PREOP form | SATISFIED | `PreoperatorioForm.tsx` — 600+ line component with section headers |
| PREOP-02 | 52-06 | Optional dx/tratamiento check reusing PrimeraConsultaForm | SATISFIED | `incluirDx` checkbox; `<PrimeraConsultaForm>` rendered when checked |
| PREOP-03 | 52-01/02/05/06 | Antecedentes chips from per-professional catalog | SATISFIED | `useAntecedentesCatalogo` + `AntecedenteCatalogoPro` table |
| PREOP-04 | 52-02/03/05/06 | Otro learning persists to professional catalog | SATISFIED | `aprenderDesdePreoperatorio` post-transaction; `invalidateQueries` for all 3 catalog keys |
| PREOP-05 | 52-03/06 | Antecedentes saved to patient profile condiciones[] | SATISFIED | `Array.from(new Set([...]))` in $transaction |
| PREOP-06 | 52-03/06 | Alergias pattern + patient alergias[] merge | SATISFIED | Same pattern, `alergias` field |
| PREOP-07 | 52-03/06 | Medicacion pattern + patient medicacion[] merge | SATISFIED | Same pattern, `medicacion` field |
| PREOP-08 | 52-06 | Estudios checklist (laboratorio, ECG, imagenes sub-types) | SATISFIED | `IMAGENES_OPTIONS = ['Ecografía', 'Tomografía', 'Mamografía', 'Otro']`; checkboxes |
| PREOP-09 | 52-03 | Estudios queryable via dedicated column | SATISFIED | `estudiosComplementarios` Json column written; shape `{laboratorio, ecg, imagenes[]}` |
| PREOP-10 | 52-03/06 | Consentimiento informado check with audit timestamp | SATISFIED | `consentimientoInformadoAt: new Date().toISOString()` in JSONB; `consentimientoFirmadoAt` never written |
| PREOP-11 | 52-04/07 | Copy link, WhatsApp, QR scannable | SATISFIED | `SharePortalPanel.tsx`: clipboard.writeText, wa.me/?text=, QRCodeSVG |
| PREOP-12 | 52-04/07/08/09/10 | Email SMTP-gated; at-share email capture; portal link recoverable across sessions | SATISFIED | `{smtpConfigured && ...}` gate; Input cuando `!pacienteEmail`; `portalTokenCifrado` AES-256-GCM; `GET :id/portal-link` sólo lectura; `useObtenerPortalLink` en mount; banner SMTP con código real |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `SharePortalPanel.tsx` | 218 | `placeholder="Email del paciente"` | INFO | HTML input attribute — not a code stub; this is the email capture input for at-share entry |
| `PreoperatorioForm.tsx` | 415 | `placeholder="Escribir y presionar Enter para agregar..."` | INFO | HTML input attribute for the Otro text input — correct UX instruction |
| `pacientes.service.ts` | 53, 68, 338, 382, 387 | `console.log` / `console.error` | INFO | Pre-existentes en métodos `create` y `suggest` — no relacionados con portal link; no son deuda de esta fase |

Sin TBD, FIXME, XXX ni deuda no resuelta en los archivos modificados por esta fase.

### Human Verification Required

#### 1. Seccioned Form Visual Layout

**Test:** Open a live appointment, create a new HC entry, select "Pre Quirúrgico"
**Expected:** A single-page seccioned form with headers (Antecedentes/Alergias/Medicación/Estudios complementarios/Consentimiento informado/Compartir link) — no free textarea
**Why human:** Static analysis confirms the component structure; actual DOM rendering requires a browser

#### 2. Chip Pre-Load from Patient Profile

**Test:** Open PREOP form for a patient who already has condiciones/alergias/medicacion in their profile
**Expected:** Pre-existing values appear as pre-selected chips; values not in the professional's catalog appear as dashed chips
**Why human:** Requires a patient fixture with existing profile data and a running backend

#### 3. Otro Learning Round-Trip

**Test:** Enter a new value in any Otro input and press Enter; submit the PREOP form; reopen the form
**Expected:** Chip appears dashed immediately on Enter; after save the chip appears solid on next form open
**Why human:** Requires interactive browser session and a running backend

#### 4. QR Code Rendering

**Test:** In the Compartir link section, click "Generar link del portal"; toggle "Ver QR"
**Expected:** A scannable QR code appears encoding the portal URL
**Why human:** Canvas/SVG rendering is not verifiable by grep; qrcode.react wiring is confirmed but browser render required

#### 5. WhatsApp Link Behavior

**Test:** Click the WhatsApp button in SharePortalPanel
**Expected:** Opens wa.me/?text=... with the portal URL pre-filled as message
**Why human:** Link navigation requires a browser

#### 6. Email Send (SMTP-configured environment)

**Test:** Configure SMTP; generate link; use "Enviar por email" for a patient without email on file
**Expected:** Email input appears; after entering email and clicking Send, "Email enviado correctamente" shows; patient receives email
**Why human:** Requires SMTP environment configuration and live email delivery

#### 7. Re-test UAT Test 13 — Paciente con link previo (GAP B)

**Test:** Con el backend corriendo (ENCRYPTION_KEY configurada y al menos un paciente con `portalTokenCifrado` poblado), abrir `SharePortalPanel` en el turno de ese paciente.
**Expected:** El panel muestra directamente la url del portal con botones Copiar/WhatsApp/QR — no la pantalla "Generar link" ni un spinner colgado. El texto "Este paciente ya tenía un link generado — se muestra el mismo link estable." aparece bajo la url.
**Why human:** Comportamiento visual en browser. Requiere sesión autenticada, backend corriendo, `portalTokenCifrado` no-null en BD, `ENCRYPTION_KEY` presente para que `EncryptionService.decrypt` funcione.

#### 8. Re-test UAT Test 13 — Idempotencia entre sesiones (GAP B)

**Test:** Generar el link; recargar la página; reabrir SharePortalPanel para el mismo paciente.
**Expected:** El link se muestra nuevamente (misma url estable) sin necesidad de volver a generar. La url es idéntica a la primera sesión.
**Why human:** Requiere dos sesiones de browser y una BD con `portalTokenCifrado` cifrado con la `ENCRYPTION_KEY` activa — el round-trip AES decrypt no es verificable sólo con grep.

### Gaps Summary

No hay gaps bloqueantes. Los 12 truths originales de PREOP y los 7 truths de Gap B (planes 52-09/52-10) están todos verificados en código. Las gates declaradas (nest build, tsc, spec 9/9, prisma migrate, eslint) confirman la corrección técnica. El estado `human_needed` refleja 8 items de verificación visual/interactiva/SMTP que no son verificables programáticamente — los 2 nuevos (7 y 8) corresponden al re-test UAT del Gap B.

---

## Gap Closure Re-Verification — 52-08 (UAT Test 13 / PREOP-12, primera pasada)

**Context:** Post-verification UAT found Test 13 ("Enviar link por email siempre falla") failing. Gap-closure plan 52-08 fixed it; a critical code-review finding (CR-01) was then fixed inline. Verified by inline code analysis.

| Truth (52-08 must-have) | Status | Evidence |
|---|---|---|
| With SMTP + a generated link, "Enviar link por email" delivers and reports success | VERIFIED (code) | Frontend `usePortalLink.ts:54-59` POSTs `{url, email?}` with the URL held in client state; controller `enviarPortalLinkEmail` sends it via `portalEmail.enviarLinkPortal` — the idempotent `generarPortalLink` (returns `url:null` once a token exists) is no longer in the send path, eliminating the root cause. Live SMTP delivery remains a human check (item #6). |
| Foreign/other-origin/malformed URL → HTTP 400, never reflected in the email body | VERIFIED | `validarPortalUrl` throws `BadRequestException` (400) via `esPortalUrlValida`; CR-01 fix also rejects any query/fragment and returns a canonical `origin+pathname` (`normalizarPortalUrl`) that the controller reflects (never raw `dto.url`). `portal-url.helper.spec.ts` → 24/24 pass incl. query/fragment XSS payload cases. |
| No recipient → banner asks for a valid email (not "verificá la dirección") | VERIFIED | Controller returns `{enviado:false, motivo:'sin_destinatario'}`; frontend maps `motivo` to differentiated banners. |
| Raw UUID never persisted nor re-derived server-side (D-12 intact) | VERIFIED | `generarPortalLink` stores only `sha256(uuid)` (now also cifrado); the email path never calls it. |
| Email validated at runtime before persist / SMTP `to:` (WR-01) | VERIFIED | `setEmailSiFalta` rejects malformed addresses with `EMAIL_SHAPE`. |

---

_Verified: 2026-06-26T17:00:00Z (initial) · 2026-06-26 gap-closure 52-08 (inline) · 2026-06-26T20:00:00Z gap-closure 52-09/52-10 (gsd-verifier)_
_Verifier: Claude (gsd-verifier initial; orchestrator inline for 52-08; gsd-verifier for 52-09/52-10)_
