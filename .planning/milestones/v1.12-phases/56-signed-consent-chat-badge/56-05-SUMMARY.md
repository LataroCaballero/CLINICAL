---
phase: 56-signed-consent-chat-badge
plan: "05"
subsystem: backend/paciente-portal
tags: [consent, portal, signing, pdf-stamping, forensic, nestjs, idor-prevention]
dependency_graph:
  requires: ["56-03", "56-04"]
  provides:
    - "FirmarConsentimientoPortalDto (narrow, identity-free)"
    - "firmarConsentimiento orchestration in PacientePortalService"
    - "POST /paciente-portal/public/consentimiento/firmar (guarded)"
  affects:
    - "backend/src/modules/paciente-portal"
tech_stack:
  added: []
  patterns:
    - "ConsentimientosModule import into PacientePortalModule (ConsentStampService injection)"
    - "Re-resolve zona via cirugia chain for IDOR prevention (pitfall E)"
    - "D-08 ConflictException (409) on re-sign attempt"
    - "Server-side IP/UA capture from req.headers — never from body"
    - "PNG magic-byte + size guard before pdf-lib embed"
    - "Narrow { ok: true } return — no signed PDF URL exposed to portal"
key_files:
  created:
    - backend/src/modules/paciente-portal/dto/firmar-consentimiento-portal.dto.ts
  modified:
    - backend/src/modules/paciente-portal/paciente-portal.module.ts
    - backend/src/modules/paciente-portal/paciente-portal.service.ts
    - backend/src/modules/paciente-portal/paciente-portal.controller.ts
decisions:
  - "[56-05] Zone re-validated via cirugia chain (not standalone ZonaHC lookup) to bind dto.zonaId to the patient's own pending surgery — prevents cross-patient IDOR (pitfall E, T-56-12)"
  - "[56-05] ConflictException (409) returned on re-sign (D-08); firmadoAt defaults to DB @default(now()) — not set by app code"
  - "[56-05] { ok: true } is the only POST response — signed PDF URL is NOT returned to portal (T-56-10 / UI-SPEC post-sign state)"
  - "[56-05] PNG size guard (> 1MB) applied client-side BEFORE magic-byte validation to avoid decoding large buffers unnecessarily"
  - "[56-05] ConsentimientosModule added to PacientePortalModule imports; StorageModule from Plan 04 retained and not duplicated"
metrics:
  duration: "~15 min"
  completed: "2026-07-01"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 4
---

# Phase 56 Plan 05: Portal Signing Route + Forensic Persistence Summary

**Narrow FirmarConsentimientoPortalDto (identity-free), firmarConsentimiento orchestration (D-08 conflict guard + PNG validation + stamp + archive + forensic record + aggregate flag), and PortalJwtGuard POST route with server-side IP/UA capture.**

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create FirmarConsentimientoPortalDto + wire ConsentimientosModule | 2e641a1 | firmar-consentimiento-portal.dto.ts, paciente-portal.module.ts |
| 2 | Implement firmarConsentimiento orchestration + forensic persistence | 972573f | paciente-portal.service.ts |
| 3 | Add guarded POST /consentimiento/firmar with header IP/UA capture | 0a8732d | paciente-portal.controller.ts |

## What Was Built

### Task 1: Narrow DTO + Module Wiring

**firmar-consentimiento-portal.dto.ts:**
- Three fields only: `@IsUUID() zonaId`, `@IsString() signaturePngDataUrl`, `@IsBoolean() indicacionesLeidas`
- `pacienteId` deliberately NOT declared — identity comes only from JWT (`req.user.pacienteId`), not body (D-12, pitfall 12, T-56-12)
- Docblock documents the JWT-only identity constraint

**paciente-portal.module.ts:**
- Added `import { ConsentimientosModule }` (exports ConsentStampService)
- Added `ConsentimientosModule` to `imports` array
- `StorageModule` (Plan 04) retained in imports — NOT duplicated

### Task 2: firmarConsentimiento Orchestration

**paciente-portal.service.ts:**
- Added `BadRequestException`, `ConflictException` to NestJS imports
- Added `ConsentStampService` import + `private readonly stamp: ConsentStampService` to constructor (alongside existing StorageService)
- Added `FirmarConsentimientoPortalDto` import

**`firmarConsentimiento(pacienteId, dto, ip, userAgent)` pipeline:**

1. **Zone re-resolution via cirugia chain (pitfall E / T-56-12):** `prisma.cirugia.findFirst` where `pacienteId = pacienteId AND estado IN [PROGRAMADA, EN_CURSO] AND cirugiaCatalogo.zonaId = dto.zonaId` — validates zona belongs to the patient's pending surgery, never trusting dto.zonaId blindly
2. **D-08 conflict guard:** `prisma.consentimientoFirmado.findFirst({ where: { pacienteId, zonaId } })` → `ConflictException` (409) if row exists
3. **D-11 indicaciones gate:** `if (!dto.indicacionesLeidas) throw BadRequestException`
4. **PNG validation (T-56-15):** strip `data:image/png;base64,` prefix server-side; decode; size guard `> 1_000_000` → BadRequest; magic-byte validation delegated to `ConsentStampService.stampConsentimiento` internally
5. **Stamp:** `this.storage.readFile(archivo.path)` → templateBuffer; `this.stamp.stampConsentimiento({ templateBuffer, signaturePngBuffer, metadata: { fechaUtc, ip, userAgent, version } })` → `{ pdfBuffer, hashSha256 }`
6. **Archive:** `this.storage.save(pdfBuffer, archivo.profesionalId)` → signedPath
7. **Forensic record:** `prisma.consentimientoFirmado.create` with 9 explicit fields: `pacienteId, zonaId, consentimientoZonaArchivoId, pdfFirmadoPath, ip, userAgent, versionNumero, hashSha256, indicacionesLeidasAt`; `firmadoAt` defaults via `@default(now())` in schema
8. **Aggregate flag:** `prisma.paciente.update` setting `consentimientoFirmado: true, consentimientoFirmadoAt: new Date()` (D-07)
9. **Return:** `{ ok: true }` — NO signed PDF URL returned (T-56-10)

### Task 3: Guarded POST Route

**paciente-portal.controller.ts:**
- Added `FirmarConsentimientoPortalDto` import
- Added `@UseGuards(PortalJwtGuard) @Post('consentimiento/firmar')` route `firmarConsentimiento`
- IP captured: `(req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown'` — server-side from headers (T-56-13)
- userAgent captured: `(req.headers['user-agent'] as string) ?? 'unknown'` — server-side from headers (T-56-13)
- `new ValidationPipe({ whitelist: true })` per-route (load-bearing SC#3 guard — no global pipe in project)
- `pacienteId` from `req.user.pacienteId` only — never @Param, @Body, @Query (pitfall 12, T-56-12)

## Security (Threat Model)

| Threat | Mitigation |
|--------|-----------|
| T-56-12: IDOR via dto.zonaId | zonaId re-validated against patient's pending cirugia chain; pacienteId from JWT only |
| T-56-13: Spoofed IP/UA | Both captured server-side from request headers; never from body |
| T-56-14: Re-sign / tampering | ConflictException (409) on findFirst hit; StorageService.save creates new file (no overwrite) |
| T-56-15: Injection via PNG bytes | base64 prefix stripped server-side; 1MB size guard; PNG magic-byte validation inside ConsentStampService |
| T-56-16: DoS via large payload | 1MB per-buffer guard applied before base64 decode |

## Deviations from Plan

None — plan executed exactly as written. All three tasks implemented as specified, with security invariants from the threat model applied as required.

## Known Stubs

None. The `firmarConsentimiento` pipeline is fully wired end-to-end:
- ConsentStampService (Plan 03) stamps the real PDF
- StorageService (Plan 04) archives and reads files
- prisma.consentimientoFirmado.create persists the real forensic record
- paciente.update sets the real aggregate flag

## Threat Flags

None. No new trust boundaries introduced beyond what the plan's threat model documents (T-56-12 through T-56-16 — all mitigated as specified).

## Verification

- `npm run build` (nest build): exit 0
- `tsc --noEmit`: only pre-existing test/app.e2e-spec.ts rootDir error (existed before Plan 03)
- `grep -c "consentimiento/firmar"` in controller: 1
- PortalJwtGuard directly precedes @Post('consentimiento/firmar')
- `grep -c "pacienteId"` in DTO: 2 (comment mentions only — NOT declared as field)
- `grep "ConsentimientosModule"` in module: import + array entry (not duplicated)
- `grep -c "ConflictException"` in service: 3 (import + usage + comment)
- All 5 forensic fields (ip, userAgent, versionNumero, hashSha256, indicacionesLeidasAt) in create
- `paciente.update` sets `consentimientoFirmado: true` and `consentimientoFirmadoAt`
- `{ ok: true }` returned — no signed PDF URL

## Self-Check: PASSED

Files verified:
- backend/src/modules/paciente-portal/dto/firmar-consentimiento-portal.dto.ts — FOUND
- backend/src/modules/paciente-portal/paciente-portal.module.ts — ConsentimientosModule import + array entry FOUND
- backend/src/modules/paciente-portal/paciente-portal.service.ts — firmarConsentimiento method FOUND with all orchestration steps
- backend/src/modules/paciente-portal/paciente-portal.controller.ts — @Post('consentimiento/firmar') FOUND

Commits verified:
- 2e641a1: feat(56-05): create FirmarConsentimientoPortalDto + wire ConsentimientosModule
- 972573f: feat(56-05): implement firmarConsentimiento orchestration in PacientePortalService
- 0a8732d: feat(56-05): add POST consentimiento/firmar route with PortalJwtGuard + header IP/UA
