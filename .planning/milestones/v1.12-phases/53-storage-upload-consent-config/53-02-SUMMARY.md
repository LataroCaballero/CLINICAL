---
phase: 53-storage-upload-consent-config
plan: "02"
subsystem: backend-consent
tags: [consent, pdf-upload, magic-byte-validation, prisma-migration, multi-tenant, version-history]
dependency_graph:
  requires: [StorageService (53-01), UploadsModule (53-01), ThrottlerModule-global (53-01)]
  provides: [ConsentimientosModule, ConsentimientosService, ConsentimientosController, UpdateIndicacionesDto, actualizarIndicacionesUrl]
  affects: [backend/src/prisma/schema.prisma, backend/src/app.module.ts, backend/src/modules/catalogo-hc/catalogo-hc.controller.ts, backend/src/modules/catalogo-hc/catalogo-hc.service.ts]
tech_stack:
  added: [FileInterceptor+memoryStorage (multer via @nestjs/platform-express), consentimientoZonaArchivo Prisma model]
  patterns: [magic-byte-validation, version-roll (vigente boolean), ownership-guard-service-layer, getProfesionalId-JWT-scope, TDD-RED-GREEN]
key_files:
  created:
    - backend/src/prisma/migrations/20260629000000_consent_zona_archivos_indicaciones/migration.sql
    - backend/src/modules/consentimientos/consentimientos.service.ts
    - backend/src/modules/consentimientos/consentimientos.service.spec.ts
    - backend/src/modules/consentimientos/consentimientos.controller.ts
    - backend/src/modules/consentimientos/consentimientos.module.ts
    - backend/src/modules/consentimientos/dto/update-indicaciones.dto.ts
  modified:
    - backend/src/prisma/schema.prisma
    - backend/src/app.module.ts
    - backend/src/modules/catalogo-hc/catalogo-hc.controller.ts
    - backend/src/modules/catalogo-hc/catalogo-hc.service.ts
decisions:
  - "D-02: ZonaHC.indicacionesUrl String? added — stores URL link to external indicaciones document (CONS-02)"
  - "D-03: CirugiaCatalogo.zonaId FK to ZonaHC — optional link for portal phases 55/56"
  - "D-04/D-05: ConsentimientoZonaArchivo version table — one vigente row per zona per profesional; history never deleted (vigente=false on prior row)"
  - "D-14: Magic-byte check (%PDF- first 5 bytes of buffer, not client mimetype) — non-PDF rejected before StorageService.save, nothing persists"
  - "Rule 1 deviation: local MulterFile interface used instead of Express.Multer.File (@types/multer not in devDeps per T-53-SC no-new-packages constraint)"
  - "Migration applied via prisma diff + db execute + migrate resolve --applied (Supabase pgBouncer pattern from Phase 51 — prisma migrate dev blocked by DB drift)"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-29"
  tasks_completed: 3
  files_count: 10
---

# Phase 53 Plan 02: Consent + Indicaciones Backend Summary

**One-liner:** ConsentimientosModule with magic-byte PDF upload (BadRequestException on non-PDF, nothing persists D-14), version-preserving vigente history (D-05), zona listing with vigente consent and indicacionesUrl; PATCH indicaciones endpoint on catalogo-hc with ownership guard and URL validation; Prisma migration adding ConsentimientoZonaArchivo table, ZonaHC.indicacionesUrl, CirugiaCatalogo.zonaId.

## What Was Built

### Task 1: Schema changes + Prisma migration (BLOCKING gate)

`backend/src/prisma/schema.prisma` — three changes:
- `model ZonaHC`: added `indicacionesUrl String?` (D-02/CONS-02), `consentimientoArchivos ConsentimientoZonaArchivo[]` (back-relation), `cirugiasCatalogo CirugiaCatalogo[]` (inverse FK for D-03)
- `model CirugiaCatalogo`: added `zonaId String?` + `zona ZonaHC? @relation(...)` + `@@index([zonaId])` (D-03 — portal phases 55/56)
- New `model ConsentimientoZonaArchivo`: id, zonaId (FK ZonaHC Cascade), profesionalId, path, nombreOriginal, uploadedAt, vigente, `@@index([zonaId, vigente])`, `@@index([profesionalId])`

Migration `20260629000000_consent_zona_archivos_indicaciones`:
- Applied via `prisma diff (--from-schema-datasource)` → `db execute` → `migrate resolve --applied` (same Supabase/pgBouncer pattern as Phase 51 — `migrate dev` blocked by pre-existing DB drift)
- `prisma generate` succeeded; `prisma.consentimientoZonaArchivo` now available in typed client

### Task 2: ConsentimientosModule — secure PDF upload + zona listing (TDD RED→GREEN)

`backend/src/modules/consentimientos/consentimientos.service.ts`:
- `uploadConsentimiento(profesionalId, zonaId, buffer, originalName)`:
  1. Ownership guard: `zonaHC.findUnique` + `zona.profesionalId !== profesionalId` → NotFoundException
  2. Magic-byte validation (D-14, INFRA-03, T-53-06): `buffer.subarray(0, 5).toString('latin1') !== '%PDF-'` → BadRequestException BEFORE save (nothing persists)
  3. `StorageService.save(buffer, profesionalId)` — UUID filename (D-13)
  4. `$transaction([updateMany(vigente=false), create(vigente=true)])` — version roll, no deletes (D-05)
  5. Returns row + `url: storage.getPublicUrl(path)`
- `getZonasConConsentimiento(profesionalId)`: `zonaHC.findMany` with `consentimientoArchivos` include (vigente=true, take:1), maps to `{ id, nombre, orden, esSistema, indicacionesUrl, consentimientoVigente }` + url

`backend/src/modules/consentimientos/consentimientos.controller.ts`:
- `@Controller('consentimientos')` + `@Auth('ADMIN','PROFESIONAL','SECRETARIA')`
- `getProfesionalId` helper copied from catalogo-hc (JWT scope, SECRETARIA/ADMIN via query param, profesionalId never from body — T-53-08)
- `POST zonas/:zonaId/pdf`: `@UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10MB } }))` (D-11, T-53-07)
- `GET zonas`: delegates to `service.getZonasConConsentimiento(pid)`

`backend/src/modules/consentimientos/consentimientos.module.ts`:
- `imports: [StorageModule]`, `providers: [ConsentimientosService]`, `exports: [ConsentimientosService]`

`backend/src/app.module.ts`: `ConsentimientosModule` added to `imports[]`

**TDD gate:** RED commit `bf0e42c` (spec only, suite fails — service not found) → GREEN commit `3a5c3ed` (implementation, 6/6 tests pass)

### Task 3: catalogo-hc indicaciones URL endpoint (CONS-02)

`backend/src/modules/consentimientos/dto/update-indicaciones.dto.ts`:
- `indicacionesUrl: string | null` with `@IsOptional()`, `@ValidateIf(o => o.indicacionesUrl !== null)`, `@IsUrl()`, `@MaxLength(2048)` — null permitted to clear (T-53-11)

`backend/src/modules/catalogo-hc/catalogo-hc.controller.ts`:
- Added `@Patch('zonas/:id/indicaciones')` with `@Body() dto: UpdateIndicacionesDto`, ownership resolved via existing `getProfesionalId` (not from body — T-53-08)

`backend/src/modules/catalogo-hc/catalogo-hc.service.ts`:
- Added `actualizarIndicacionesUrl(profesionalId, zonaId, indicacionesUrl)`: `zonaHC.findUnique` ownership guard → `zonaHC.update({ indicacionesUrl })` (CONS-02/D-02)

## Verification Results

| Check | Result |
|-------|--------|
| `npx jest src/modules/consentimientos/consentimientos.service.spec.ts` | 6/6 PASSED |
| `npm run build` | EXIT 0 |
| `npm run lint` (new files only) | 0 new errors |
| `npx prisma migrate status` | Database schema is up to date! |
| `npx prisma generate` | Succeeded — consentimientoZonaArchivo in typed client |

## Success Criteria Status

- [x] Consent PDF upload stored with UUID name, version-preserving, served-ready via StorageService (CONS-01, SC#1 storage half)
- [x] Non-PDF upload → HTTP 400, nothing persists — magic-byte check before StorageService.save (SC#2, INFRA-03 validation half, D-14, T-53-06)
- [x] Indicaciones URL persists per zona and survives reload via GET (CONS-02, SC#3, D-02)
- [x] ConsentimientoZonaArchivo table live in DB; CirugiaCatalogo.zonaId ready for portal phases (D-03, D-04, D-05)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Local MulterFile interface instead of Express.Multer.File**
- **Found during:** Task 2 — `npm run build` failed with `Namespace 'global.Express' has no exported member 'Multer'`
- **Issue:** `@types/multer` is not in devDependencies; plan threat model T-53-SC explicitly states "no new package installed"
- **Fix:** Declared a minimal `MulterFile` interface inline in the controller (`buffer: Buffer, originalname: string, mimetype: string, size: number`) — functionally equivalent, avoids the missing types dependency
- **Files modified:** `consentimientos.controller.ts`
- **Commit:** `3a5c3ed`

**2. [Rule 3 - Blocking] Prisma migration via diff+execute+resolve (not migrate dev)**
- **Found during:** Task 1 — `prisma migrate dev` blocked by pre-existing DB drift (OrdenConsumo/OrdenConsumoInsumo tables and missing migration `20260415221758_flujo_paciente` from Supabase pgBouncer environment)
- **Fix:** Same pattern as Phase 51: `prisma migrate diff --from-schema-datasource` → `db execute` → `migrate resolve --applied`. Migration `20260629000000_consent_zona_archivos_indicaciones` applied and marked as applied.
- **Files modified:** `backend/src/prisma/migrations/20260629000000_consent_zona_archivos_indicaciones/migration.sql`
- **Commit:** `0803d9b`

## Known Stubs

None — all methods fully implemented and wired.

## Threat Flags

No new threat surface beyond what the plan's threat model documents. All T-53-06 through T-53-11 mitigations applied:
- T-53-06 (Tampering, content type): magic-byte check implemented, non-PDF → 400, nothing persists
- T-53-07 (DoS, file size): `limits: { fileSize: 10MB }` in FileInterceptor
- T-53-08 (EoP, cross-tenant): `getProfesionalId` JWT scope + service ownership guard
- T-53-09 (Repudiation, consent history): version-roll (vigente=false) not delete; history preserved
- T-53-10 (Info Disclosure, filename): UUID filenames via StorageService; `nombreOriginal` metadata only
- T-53-11 (Tampering, indicacionesUrl): `@IsUrl + @MaxLength(2048)` in UpdateIndicacionesDto

## TDD Gate Compliance

- RED gate: commit `bf0e42c` (test only, suite failed — service not found)
- GREEN gate: commit `3a5c3ed` (implementation, 6/6 tests pass)
- Both gates present in git log — compliant

## Self-Check

Files created:
- backend/src/prisma/migrations/20260629000000_consent_zona_archivos_indicaciones/migration.sql ✓
- backend/src/modules/consentimientos/consentimientos.service.ts ✓
- backend/src/modules/consentimientos/consentimientos.service.spec.ts ✓
- backend/src/modules/consentimientos/consentimientos.controller.ts ✓
- backend/src/modules/consentimientos/consentimientos.module.ts ✓
- backend/src/modules/consentimientos/dto/update-indicaciones.dto.ts ✓

Files modified:
- backend/src/prisma/schema.prisma ✓
- backend/src/app.module.ts ✓
- backend/src/modules/catalogo-hc/catalogo-hc.controller.ts ✓
- backend/src/modules/catalogo-hc/catalogo-hc.service.ts ✓

Commits:
- 0803d9b: feat(53-02): extend schema — ConsentimientoZonaArchivo, ZonaHC.indicacionesUrl, CirugiaCatalogo.zonaId ✓
- bf0e42c: test(53-02): add failing spec for ConsentimientosService (TDD RED) ✓
- 3a5c3ed: feat(53-02): add ConsentimientosModule — magic-byte PDF upload + zona listing ✓
- e892c20: feat(53-02): add PATCH /catalogo-hc/zonas/:id/indicaciones endpoint (CONS-02) ✓

## Self-Check: PASSED
