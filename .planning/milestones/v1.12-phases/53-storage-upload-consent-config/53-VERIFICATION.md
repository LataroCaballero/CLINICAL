---
phase: 53-storage-upload-consent-config
verified: 2026-06-30T00:00:00Z
status: human_needed
score: 16/16 must-haves structurally verified; human checkpoint pending
overrides_applied: 0
human_verification:
  - test: "Subir un PDF real para una zona y confirmar que el nombre del archivo vigente + fecha aparecen en la UI"
    expected: "El PDF se almacena, el componente muestra nombreOriginal + fecha de upload, y el link 'Ver PDF' descarga el archivo con Content-Disposition: attachment"
    why_human: "Requiere backend + frontend corriendo con token JWT válido y una zona configurada"
  - test: "Intentar subir un archivo no-PDF (ej. un .txt renombrado como .pdf) y confirmar rechazo"
    expected: "Toast de error en la UI; ningún archivo vigente aparece para la zona; el endpoint devuelve 400"
    why_human: "La validación magic-byte es server-side; el resultado visible en la UI requiere navegador"
  - test: "Ingresar una URL de indicaciones para una zona, guardar, y recargar la página"
    expected: "La URL persiste en el Input después de recargar — confirma que el PATCH escribe en BD y la query re-fetching la devuelve"
    why_human: "La persistencia real (BD → recarga de página) sólo es verificable en navegador"
  - test: "Repetir pasos 1-3 como SECRETARIA (con un profesional seleccionado en el sidebar)"
    expected: "El tab 'Consentimientos' aparece y las operaciones quedan dentro del scope del profesional seleccionado"
    why_human: "El scoping multi-tenant (profesionalId como query param) requiere verificación visual de rol"
---

# Phase 53: Storage + Upload + Consent Config — Verification Report

**Phase Goal:** La clínica puede subir el PDF de consentimiento y configurar links de indicaciones preoperatorias desde Configuración, respaldado por un StorageService preparado para cloud, validación de upload segura y rate limiting activo en todos los endpoints de la API.
**Verified:** 2026-06-30
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

All 16 must-have truths across the three plans pass source-level verification. The phase delivers what it committed to at the code level. Status is `human_needed` because Plan 03 includes a blocking `checkpoint:human-verify` gate (Task 3) that has not been completed — the 53-03-SUMMARY.md explicitly marks it as PENDING. One WARNING from the code review (CR-01) is tracked below and must be resolved before Phase 54 ships.

---

### Observable Truths

#### Plan 01 — Infrastructure (INFRA-01, INFRA-02, INFRA-03 serving half)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | StorageService.save(buffer, profesionalId) writes UUID-named file under uploads/{profesionalId}/ and returns relative path | ✓ VERIFIED | `storage.service.ts:21-34` — `randomUUID()` filename, `return '${profesionalId}/${filename}'` |
| 2 | Consumers obtain paths via resolvePath() and URLs via getPublicUrl(); never import fs directly | ✓ VERIFIED | `uploads.controller.ts`: no `fs` import, delegates to `storage.readFile()`. `consentimientos.service.ts`: no `fs` import, uses `storage.save()` |
| 3 | GET /uploads/{profesionalId}/{filename} streams PDF with Content-Disposition: attachment, no auth required | ✓ VERIFIED | `uploads.controller.ts:16-52` — no @Auth, `'Content-Disposition': 'attachment; filename="${filename}"'`, `res.end(buffer)` |
| 4 | Path traversal attempts rejected with HTTP 400, no file read outside uploads root | ✓ VERIFIED | `storage.service.ts:40-63` — three-layer guard: isAbsolute check, normalize + startsWith('..'), path.relative re-check. `uploads.controller.ts` re-throws BadRequestException |
| 5 | Requests exceeding throttle limit receive HTTP 429 | ✓ VERIFIED (source) | `app.module.ts:47` — `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])`. `app.module.ts:99` — `{ provide: APP_GUARD, useClass: ThrottlerGuard }`. Behavioral confirmation requires running server |
| 6 | Both unauthenticated public routes (presupuestos/public AND uploads) carry the strict @Throttle tier (limit 20/min) | ✓ VERIFIED | `presupuesto-public.controller.ts:10` — `@Throttle({ default: { ttl: 60000, limit: 20 } })` class-level. `uploads.controller.ts:16` — same decorator class-level |

#### Plan 02 — Consent Backend (CONS-01, CONS-02, INFRA-03 validation half)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 7 | ConsentimientoZonaArchivo table exists in DB with zonaId, profesionalId, path, nombreOriginal, uploadedAt, vigente | ✓ VERIFIED | `schema.prisma:1402-1414` — model present with all fields, @@index([zonaId, vigente]), @@index([profesionalId]). Migration dir: `20260629000000_consent_zona_archivos_indicaciones` exists |
| 8 | ZonaHC has indicacionesUrl column; CirugiaCatalogo has zonaId FK to ZonaHC | ✓ VERIFIED | `schema.prisma:1392` — `indicacionesUrl String?` in ZonaHC. `schema.prisma:949-959` — `zonaId String?`, relation, `@@index([zonaId])` in CirugiaCatalogo |
| 9 | Valid PDF upload stores file via StorageService, marks prior vigente=false, creates new vigente row | ✓ VERIFIED | `consentimientos.service.ts:49-71` — `storage.save()` then `$transaction([updateMany({vigente:false}), create({vigente:true})])` |
| 10 | Non-PDF upload returns HTTP 400 and no file is persisted | ✓ VERIFIED | `consentimientos.service.ts:44-46` — magic-byte check (`buffer.subarray(0,5).toString('latin1') !== '%PDF-'`) throws BadRequestException BEFORE `storage.save()` call |
| 11 | GET /consentimientos/zonas returns zonas with vigente consent and indicacionesUrl | ✓ VERIFIED | `consentimientos.service.ts:79-108` — `zonaHC.findMany` includes `consentimientoArchivos` where `vigente:true`, `take:1`, maps to `{ indicacionesUrl, consentimientoVigente }` with public url |
| 12 | PATCH /catalogo-hc/zonas/:id/indicaciones saves indicacionesUrl scoped to owning profesional | ✓ VERIFIED (functional) | `catalogo-hc.service.ts:760-773` — ownership guard + `zonaHC.update({ indicacionesUrl })`. `catalogo-hc.controller.ts:122-131` — Patch endpoint with getProfesionalId |

**WARNING — CR-01 applies to truth #12**: The `@IsUrl()`/`@MaxLength(2048)` decorators in `update-indicaciones.dto.ts` are inert because `main.ts` has no `app.useGlobalPipes(new ValidationPipe(...))`. Any string (including `javascript:` URIs) is written to `ZonaHC.indicacionesUrl` unchecked. Truth #12 as written ("saves… scoped to owning profesional") is functionally VERIFIED, but the T-53-11 threat mitigation is dead code. See Gaps Summary.

#### Plan 03 — Frontend Tab (CONS-01, CONS-02)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 13 | 'Consentimientos' tab appears in Configuración for PROFESIONAL and SECRETARIA views | ✓ VERIFIED | `page.tsx:109` — PROFESIONAL TabsList `grid-cols-12`, `TabsTrigger value="consentimientos"` at line 117 and `TabsContent` at 152-153. `page.tsx:217` — SECRETARIA TabsList `grid-cols-7`, same trigger/content at 224/251-252 |
| 14 | Tab lists the professional's ZonaHC zonas | ✓ VERIFIED | `GestionConsentimientos.tsx:17-20` — calls `useConsentimientos(profesionalId)` which GETs `/consentimientos/zonas` |
| 15 | Per zona, user can upload consent PDF and see vigente filename + upload date | ✓ VERIFIED | `GestionConsentimientos.tsx:162-186` — renders `consentimientoVigente.nombreOriginal`, `formatUploadDate(uploadedAt)`, ExternalLink anchor to PDF url. File input with `accept="application/pdf,.pdf"` |
| 16 | Per zona, user can enter and save indicaciones URL that persists after page reload | ✓ VERIFIED (structural) | `useConsentimientosMutations.ts:40-43` — PATCH `/catalogo-hc/zonas/${zonaId}/indicaciones`. `onSuccess` invalidates CATALOGO_HC_QUERY_KEY + CONSENTIMIENTOS_QUERY_KEY. Inline fallback `zona.indicacionesUrl ?? ''`. Persistence needs browser confirmation — see Human Verification |

**Score:** 16/16 truths structurally verified

---

### SC-2 Wording Note

ROADMAP SC-2 says "verificado por magic bytes **tras escritura a disco**". The implementation validates magic bytes **before** writing to disk (before `storage.save()`), which is actually stricter and explains the WR-01 warning (no orphaned files on validation failure). The observable outcome (400, nothing persisted) matches SC-2. The implementation is a better approach than what the wording implied — no gap.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/modules/storage/storage.service.ts` | Cloud-ready storage abstraction (save/resolvePath/getPublicUrl/readFile) | ✓ VERIFIED | All 4 methods implemented. No delete method. 87 lines |
| `backend/src/modules/storage/storage.module.ts` | Module exporting StorageService | ✓ VERIFIED | `exports: [StorageService]` — line 7 |
| `backend/src/modules/uploads/uploads.controller.ts` | Public file serving with @Throttle strict tier | ✓ VERIFIED | class-level `@Throttle({ default: { ttl: 60000, limit: 20 } })`, no @Auth, Content-Disposition: attachment |
| `backend/src/app.module.ts` | Global ThrottlerModule + APP_GUARD | ✓ VERIFIED | `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])` + `{ provide: APP_GUARD, useClass: ThrottlerGuard }` |
| `backend/src/prisma/schema.prisma` | ConsentimientoZonaArchivo + ZonaHC.indicacionesUrl + CirugiaCatalogo.zonaId | ✓ VERIFIED | All three changes present at lines 949-959, 1392-1394, 1402-1414 |
| `backend/src/modules/consentimientos/consentimientos.service.ts` | uploadConsentimiento + getZonasConConsentimiento | ✓ VERIFIED | Magic-byte check before save, $transaction version-roll, vigente listing |
| `backend/src/modules/consentimientos/consentimientos.controller.ts` | FileInterceptor 10MB + getProfesionalId helper | ✓ VERIFIED | `FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })` |
| `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` | actualizarIndicacionesUrl with ownership guard | ✓ VERIFIED | Lines 760-773: findUnique ownership check + zonaHC.update |
| `backend/src/modules/consentimientos/dto/update-indicaciones.dto.ts` | @IsUrl + @MaxLength(2048) + @ValidateIf(null) | ORPHANED VALIDATION | DTO exists and is syntactically correct, but decorators are inert (no global ValidationPipe) — CR-01 |
| `frontend/src/types/consentimientos.ts` | ZonaConConsentimiento + ConsentimientoZonaArchivo types | ✓ VERIFIED | Both interfaces defined |
| `frontend/src/hooks/useConsentimientos.ts` | Query hook for /consentimientos/zonas | ✓ VERIFIED | staleTime 5min, gcTime 30min, queryKey with profesionalId |
| `frontend/src/hooks/useConsentimientosMutations.ts` | useUploadConsentimiento + useUpdateIndicaciones | ✓ VERIFIED | FormData POST + PATCH, invalidates both query keys |
| `frontend/src/app/dashboard/configuracion/components/GestionConsentimientos.tsx` | Per-zona consent upload + indicaciones URL UI | ✓ VERIFIED | Loading/error/empty states, zona Cards, file input, mutation handlers |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `uploads.controller.ts` | `StorageService.resolvePath` | injected StorageService | ✓ VERIFIED | `storage.readFile(relativePath)` at line 37 — resolvePath called internally |
| `uploads.controller.ts` | ThrottlerModule | class-level `@Throttle({ default: { ttl: 60000, limit: 20 } })` | ✓ VERIFIED | Line 16 |
| `app.module.ts` | ThrottlerGuard | APP_GUARD provider | ✓ VERIFIED | Line 99 |
| `presupuesto-public.controller.ts` | @Throttle strict tier | class-level decorator | ✓ VERIFIED | Line 10 |
| `consentimientos.service.ts` | StorageService.save | injected StorageService | ✓ VERIFIED | `this.storage.save(buffer, profesionalId)` at line 49 |
| `consentimientos.service.ts` | `prisma.consentimientoZonaArchivo` | Prisma client | ✓ VERIFIED | `updateMany` + `create` inside `$transaction` |
| `catalogo-hc.service.ts` | `prisma.zonaHC.update indicacionesUrl` | Prisma client | ✓ VERIFIED | `data: { indicacionesUrl }` at line 771 |
| `GestionConsentimientos.tsx` | `useConsentimientos` + `useUploadConsentimiento` + `useUpdateIndicaciones` | hook calls | ✓ VERIFIED | Lines 17-23 |
| `configuracion/page.tsx` | `GestionConsentimientos` | `TabsContent value="consentimientos"` | ✓ VERIFIED | Lines 117+152 (PROFESIONAL), lines 224+251 (SECRETARIA) |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `GestionConsentimientos.tsx` | `zonas` | `useConsentimientos` → GET `/consentimientos/zonas` → `getZonasConConsentimiento` → `zonaHC.findMany` | ✓ Yes — Prisma query against live DB | ✓ FLOWING |
| `consentimientos.service.ts` | `createdRow` | `$transaction([updateMany, create])` | ✓ Yes — DB writes, returns created row | ✓ FLOWING |
| `catalogo-hc.service.ts` | `indicacionesUrl` | `zonaHC.update({ data: { indicacionesUrl } })` | ✓ Yes — DB write | ✓ FLOWING |

---

### Behavioral Spot-Checks

Behavioral checks that require a running server are deferred to the Human Verification section. Source-level checks:

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| Non-PDF rejected before save | `grep 'storage.save' consentimientos.service.ts` — appears AFTER the `%PDF-` check | BadRequestException thrown at line 45, save() at line 49 | ✓ PASS |
| No direct fs import in controller | `grep -n "node:fs\|require('fs'" uploads.controller.ts consentimientos.service.ts` | No matches | ✓ PASS |
| @Throttle strict tier on both public controllers | grep for `@Throttle` with `limit: 20` | Present in both presupuesto-public.controller.ts:10 and uploads.controller.ts:16 | ✓ PASS |
| StorageService has no delete method | grep for `delete` in storage.service.ts | No delete method — only save/resolvePath/readFile/getPublicUrl | ✓ PASS |
| Path traversal guard multi-layer | Three checks in resolvePath: isAbsolute + normalize+startsWith + path.relative | Lines 42-62 — all three present | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INFRA-01 | 53-01 | StorageService abstraction (disk local, cloud-ready); consumers don't use fs directly | ✓ SATISFIED | StorageService with save/resolvePath/getPublicUrl/readFile implemented; no direct fs in consumers |
| INFRA-02 | 53-01 | Public endpoints protected with rate limiting (ThrottlerModule wired) | ✓ SATISFIED | ThrottlerModule.forRoot + APP_GUARD + strict @Throttle on both public routes |
| INFRA-03 | 53-01, 53-02 | Upload validates MIME+size, prevents path traversal, serves securely | ✓ SATISFIED | Magic-byte check (not MIME header), 10MB FileInterceptor limit, resolvePath traversal guard |
| CONS-01 | 53-02, 53-03 | Doctor can upload consent PDF from Configuración | ✓ SATISFIED | POST /consentimientos/zonas/:zonaId/pdf wired from GestionConsentimientos.tsx; UUID filename, StorageService save |
| CONS-02 | 53-02, 53-03 | Doctor can load indicaciones links per procedure from Configuración | ✓ SATISFIED (functional) | PATCH /catalogo-hc/zonas/:id/indicaciones + frontend Input+Guardar — URL validation inactive (CR-01 WARNING) |

**REQUIREMENTS.md documentation gap (INFO):** INFRA-01 and INFRA-02 remain unchecked (`[ ]`) in REQUIREMENTS.md and marked "Pending" in the traceability table, despite the implementation being complete. The checkboxes were not updated as part of this phase. This is a documentation-only issue — the code is present.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/src/modules/consentimientos/dto/update-indicaciones.dto.ts` | 12-16 | @IsUrl/@MaxLength decorators with no active ValidationPipe | WARNING (CR-01) | URL validation is dead code; any string persisted to ZonaHC.indicacionesUrl unchecked |
| `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` | 758 | Comment `"@IsUrl validated in DTO"` — misleading | WARNING | False security documentation; the validation does not actually run |
| `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts` | (comment) | Comment references T-53-11 "validated in DTO" | WARNING | Same misleading comment |
| `backend/src/modules/consentimientos/consentimientos.service.ts` | 100-103 | `...archivo` spread exposes internal `path` and `profesionalId` in response | INFO (IN-02) | Minor info disclosure of on-disk layout; no client-side functional impact in this phase |

No `TBD`, `FIXME`, or `XXX` markers were found in phase-53 files.

---

### Human Verification Required

#### 1. Consent PDF Upload End-to-End

**Test:** Log in as PROFESIONAL → Configuración → "Consentimientos" tab → select a zona → upload a real PDF → confirm
**Expected:**
- The zona card shows the uploaded file's `nombreOriginal` and the formatted `uploadedAt` date
- A "Ver PDF" link appears; clicking it downloads the file (Content-Disposition: attachment) rather than rendering inline
- SC-1 confirmed
**Why human:** Requires running backend + frontend with a valid JWT, a configured zona in the DB, and a real PDF file to upload

#### 2. Non-PDF Rejection

**Test:** For a zona, attempt to upload a non-PDF (e.g. a `.txt` file renamed `.pdf` or a `.png`)
**Expected:**
- Toast error appears: "Error al subir el consentimiento. Verificá que sea un archivo PDF válido."
- No vigente consent appears for that zona
- Backend returns HTTP 400 (magic-byte check in `consentimientos.service.ts:44-46`)
- SC-2 confirmed
**Why human:** The magic-byte check is server-side; the rejection toast and absence of a vigente row need browser confirmation

#### 3. Indicaciones URL Persistence After Reload

**Test:** Enter a URL for a zona's indicaciones field → click "Guardar" → reload the page (hard refresh)
**Expected:**
- After reload, the Input pre-fills with the saved URL (from `zona.indicacionesUrl` via `GET /consentimientos/zonas`)
- SC-3 confirmed
**Why human:** Real persistence (DB write + re-fetch after page navigation) only verifiable in browser; staleTime 5min means a SPA navigation might show cached data, but full reload forces a re-fetch

#### 4. SECRETARIA Role Scoping

**Test:** Log in as SECRETARIA with a selected professional → Configuración → "Consentimientos" tab → perform upload and indicaciones save
**Expected:**
- Tab appears in SECRETARIA view (grid-cols-7, verified in source)
- Operations use the selected professional's scope (profesionalId passed as query param)
- Zone list reflects the selected professional's zonas only
**Why human:** SECRETARIA role + profesional selector interaction requires a multi-user test environment

---

### Gaps Summary

No must-have truth FAILED. The `human_needed` status is driven by the Plan 03 `checkpoint:human-verify` gate (Task 3) which is explicitly marked PENDING in 53-03-SUMMARY.md.

**CR-01 (WARNING) — DTO validation dead code:**
The `UpdateIndicacionesDto` uses class-validator decorators (`@IsUrl`, `@MaxLength(2048)`, `@ValidateIf`) to validate `indicacionesUrl`. These decorators are silent no-ops because this project has no global `ValidationPipe` — confirmed in `backend/src/main.ts` (no `useGlobalPipes` call), and noted in `backend/src/modules/pacientes/dto/enviar-portal-link-email.dto.ts`. Consequences:
- Any string (including `javascript:` URIs) is written to `ZonaHC.indicacionesUrl` unchecked
- A numeric body value `{ "indicacionesUrl": 123 }` reaches `prisma.update` and produces an unhandled 500
- The T-53-11 threat mitigation in the plan's threat model ("@IsUrl + @MaxLength(2048) validation") is not active
- The value will be rendered as an href in Phase 54's patient portal, creating a stored-XSS attack surface if exploited before the fix

**Impact on phase goal:** Functional delivery is complete (URL saves and scopes correctly). The "validación de upload segura" in the phase goal primarily refers to PDF upload validation (magic bytes, path traversal, size cap), which ARE implemented and working. CR-01 is a security debt in the URL-field path, not the file-upload path. The functional must-have truths pass.

**Mandatory fix before Phase 54:** CR-01 must be resolved before Phase 54 ships the patient portal, where `indicacionesUrl` will be rendered as a patient-facing href. Minimum fix (per code review recommendation):

```typescript
// backend/src/modules/catalogo-hc/catalogo-hc.service.ts
async actualizarIndicacionesUrl(profesionalId, zonaId, indicacionesUrl: string | null) {
  if (indicacionesUrl !== null) {
    if (typeof indicacionesUrl !== 'string' || indicacionesUrl.length > 2048) {
      throw new BadRequestException('URL inválida');
    }
    let parsed: URL;
    try { parsed = new URL(indicacionesUrl); } catch { throw new BadRequestException('URL inválida'); }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('URL inválida'); // blocks javascript:/data:
    }
  }
  // ...existing ownership guard + update
}
```

Remove the misleading "validated in DTO" comments in both `catalogo-hc.service.ts:758` and the controller.

**WR-01 (INFO) — Orphaned file on DB transaction failure:** `storage.save()` writes to disk before the `$transaction`. If the DB transaction fails, the uploaded PDF file remains on disk with no DB row. No cleanup path exists (StorageService has no delete per D-05). This is a low-probability data leak scenario — not a functional blocker for this phase.

**WR-02 (INFO) — Concurrent upload race condition:** No unique DB constraint enforces "at most one vigente row per zona". Two simultaneous uploads can produce two vigente rows. The `take:1` in `getZonasConConsentimiento` masks this. Consider a partial unique index if concurrent uploads are expected.

---

_Verified: 2026-06-30_
_Verifier: Claude (gsd-verifier)_
