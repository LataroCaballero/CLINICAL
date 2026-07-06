---
phase: 53-storage-upload-consent-config
reviewed: 2026-06-30T15:33:23Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - backend/src/app.module.ts
  - backend/src/modules/catalogo-hc/catalogo-hc.controller.ts
  - backend/src/modules/catalogo-hc/catalogo-hc.service.ts
  - backend/src/modules/consentimientos/consentimientos.controller.ts
  - backend/src/modules/consentimientos/consentimientos.module.ts
  - backend/src/modules/consentimientos/consentimientos.service.ts
  - backend/src/modules/consentimientos/dto/update-indicaciones.dto.ts
  - backend/src/modules/presupuestos/presupuesto-public.controller.ts
  - backend/src/modules/storage/storage.module.ts
  - backend/src/modules/storage/storage.service.ts
  - backend/src/modules/uploads/uploads.controller.ts
  - backend/src/modules/uploads/uploads.module.ts
  - backend/src/prisma/schema.prisma
  - frontend/src/app/dashboard/configuracion/components/GestionConsentimientos.tsx
  - frontend/src/app/dashboard/configuracion/page.tsx
  - frontend/src/hooks/useConsentimientos.ts
  - frontend/src/hooks/useConsentimientosMutations.ts
  - frontend/src/types/consentimientos.ts
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 53: Code Review Report

**Reviewed:** 2026-06-30T15:33:23Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Phase 53 added file storage infrastructure (`StorageService`), a public file-serving controller, a magic-byte-validated consent-PDF upload pipeline, a global `ThrottlerGuard`, and a frontend config tab. The path-traversal defense in `StorageService.resolvePath` is solid (absolute-path rejection + `normalize` leading-`..` check + a `path.relative` re-check), the magic-byte validation correctly inspects buffer content rather than the client MIME header, and the version-roll transaction is correctly ordered. Those security-critical pieces hold up under review.

However, the headline defect is that the `UpdateIndicacionesDto` validation **never executes** — this project has no global `ValidationPipe` (confirmed in `main.ts` and documented in `pacientes/dto/*`), so the `@IsUrl()`/`@MaxLength()` decorators are inert. An arbitrary, unvalidated `indicacionesUrl` string is persisted and is explicitly intended to be surfaced to patients as a clickable link. Several robustness issues around the upload pipeline (orphaned files on transaction failure, concurrent-upload version-roll race) and an unverified `profesionalId` for ADMIN/SECRETARIA round out the findings.

## Critical Issues

### CR-01: `indicacionesUrl` validation is dead code — unvalidated URL persisted and shown to patients

**File:** `backend/src/modules/consentimientos/dto/update-indicaciones.dto.ts:12-16`, `backend/src/modules/catalogo-hc/catalogo-hc.service.ts:760-773`, `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts:122-131`

**Issue:** The DTO relies entirely on class-validator decorators (`@IsUrl()`, `@MaxLength(2048)`, `@ValidateIf`) to validate `indicacionesUrl`. But this project has **no global `ValidationPipe`** — confirmed in `backend/src/main.ts` (no `useGlobalPipes`) and explicitly documented in `backend/src/modules/pacientes/dto/enviar-portal-link-email.dto.ts` ("There is no global ValidationPipe active in this project"). Class-validator decorators only run when a `ValidationPipe` is wired up; here they are inert. The controller comment ("@IsUrl validated in DTO — T-53-11") and the service comment ("@IsUrl validated in DTO") both assert a guarantee that does not exist.

Consequences:
- Any string is written to `ZonaHC.indicacionesUrl` unchecked (no URL format check, no 2048-char cap, no type check). A non-string body value (`{ "indicacionesUrl": 123 }`) reaches `prisma.update` and 500s.
- This field is, by design, rendered to patients as a "Link de indicaciones" (see `GestionConsentimientos.tsx:120`, and the card description "se muestra a los pacientes en su portal"). A stored `javascript:...` or `data:text/html,...` URI becomes a stored-XSS payload the moment the patient portal renders it as an `href`. (The portal href sink is outside the reviewed file set, but the field's stated purpose makes this the expected sink; the config component itself only binds the value into an `<Input>`, so it is not the sink.)

**Fix:** Validate server-side in the service (the repo's established pattern — see `pacientes` manual shape checks), or enable a global `ValidationPipe`. Minimal in-service guard:
```ts
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
  // ...ownership guard + update
}
```
Remove the misleading "validated in DTO" comments. Apply the same scrutiny anywhere else in the phase relying on DTO decorators.

## Warnings

### WR-01: Uploaded PDF is written to disk before the DB transaction — orphaned PHI files on failure

**File:** `backend/src/modules/consentimientos/consentimientos.service.ts:49-66`

**Issue:** `storage.save()` writes the file to disk (step 3) before the `$transaction` that records it (step 4). If the transaction throws (DB down, constraint error, pool exhaustion), the file remains on disk with **no** DB row referencing it. Over time this leaks untracked PDF files (PHI) into the uploads directory with no cleanup path, and the caller sees a 500 with the file silently persisted.

**Fix:** Wrap the post-save transaction in a try/catch and unlink the file on failure, or perform the DB write first and the disk write last. Example:
```ts
const filePath = await this.storage.save(buffer, profesionalId);
try {
  const [, createdRow] = await this.prisma.$transaction([...]);
  return { ...createdRow, url: this.storage.getPublicUrl(filePath) };
} catch (err) {
  await this.storage.delete(filePath).catch(() => {}); // best-effort cleanup
  throw err;
}
```

### WR-02: Concurrent uploads for the same zona can leave multiple `vigente=true` rows

**File:** `backend/src/modules/consentimientos/consentimientos.service.ts:52-66`, `backend/src/prisma/schema.prisma:1402-1414`

**Issue:** The version-roll runs `updateMany(vigente:false)` then `create(vigente:true)` inside a transaction, but there is no unique constraint enforcing "at most one vigente per zona". Two concurrent uploads can interleave so both set the prior rows false and both insert a new `vigente=true` row, leaving two vigente records. The display path (`getZonasConConsentimiento`, `take: 1` ordered by `uploadedAt desc`) masks this, but the "single vigente" invariant the version-roll is meant to guarantee (D-05) is violated, and any consumer that assumes uniqueness will misbehave.

**Fix:** Add a partial unique index so the DB enforces the invariant, e.g. a Postgres partial unique index `CREATE UNIQUE INDEX ... ON "ConsentimientoZonaArchivo" ("zonaId") WHERE "vigente";` (via raw migration, since Prisma lacks native partial-unique support), and handle the resulting conflict. At minimum, document the race.

### WR-03: ADMIN/SECRETARIA-supplied `profesionalId` is trusted without scope verification

**File:** `backend/src/modules/consentimientos/consentimientos.controller.ts:46-72`, `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts:28-56`

**Issue:** `getProfesionalId` returns `targetProfesionalId` verbatim for any ADMIN or SECRETARIA caller, with no check that the requested professional is within the caller's clinic/tenant. For a multi-tenant SaaS (per `CLAUDE.md`), if clinics share a database, a SECRETARIA/ADMIN from clinic A can upload/replace consent PDFs and rewrite `indicacionesUrl` for **any** professional in the system by guessing/enumerating a `profesionalId`. The reviewed models (`ZonaHC`, `ConsentimientoZonaArchivo`) carry no tenant/clinic column, so no scoping is possible at this layer as written. This is a copied pattern (acknowledged in the code comments), so it is likely pre-existing, but the phase extends it to consent documents.

**Fix:** Verify the target professional belongs to the caller's tenant before returning the id (e.g., join through the caller's clinic/usuario relationship). If ADMIN/SECRETARIA are genuinely single-clinic-scoped by deployment, document that assumption explicitly. If clinics share a DB, treat this as a cross-tenant authorization BLOCKER.

### WR-04: Global rate limiting uses in-memory storage — ineffective across multiple instances

**File:** `backend/src/app.module.ts:47,99`

**Issue:** `ThrottlerModule.forRoot([{ ttl, limit }])` with the default in-memory storage tracks counters per process. Per the project's own memory note, this deployment runs multiple backend instances; the rate limit (both the global 100/60s tier and the strict 20/min public tier on `uploads` / `presupuestos/public`) is therefore enforced per-instance, so the effective limit is `limit × instanceCount` and counters reset on restart/redeploy. The strict tier that this phase relies on to protect the unauthenticated file-serving and presupuesto endpoints is materially weaker than it appears.

**Fix:** Back the throttler with the shared Redis instance already configured for BullMQ (e.g. `@nest-lab/throttler-storage-redis` `ThrottlerStorageRedisService`) so limits are global across instances.

### WR-05: Pre-existing public endpoints only get the global tier, not the strict tier

**File:** `backend/src/app.module.ts:47,99`; context: `backend/src/modules/auth/auth.controller.ts:14` (`POST /auth/login`), `backend/src/diagnosticos/diagnosticos.controller.ts`

**Issue:** The phase added the strict 20-req/min `@Throttle` tier to the two new public controllers (`uploads`, `presupuestos/public`) — good. But other unauthenticated endpoints are now covered only by the new global 100-req/60s tier: `POST /auth/login` (no `@Auth`, no `@Throttle`) permits up to 100 credential attempts/min/IP, and `diagnosticos` is exposed with no auth guard at all. The prompt asked whether the strict tier covers *all* unauthenticated public endpoints — it does not. Login brute-force protection in particular is weak.

**Fix:** Apply a strict `@Throttle` tier to `POST /auth/login` (e.g. 5-10/min). Separately, audit `diagnosticos.controller.ts` for a missing `@Auth` guard (out of this phase's scope but surfaced here).

## Info

### IN-01: User-controlled `filename` route param reflected into `Content-Disposition`

**File:** `backend/src/modules/uploads/uploads.controller.ts:48`

**Issue:** `Content-Disposition: attachment; filename="${filename}"` interpolates the raw `:filename` route param. It is not exploitable today (the file must exist on disk first — non-existent paths 404 before the header is set, and stored files are UUID-named), but reflecting an unsanitized param into a response header is a fragile pattern (quote/CRLF injection if filenames ever become user-influenced).

**Fix:** Derive the disposition filename from the trusted DB record (`nombreOriginal`) or sanitize/strip quotes and control characters before interpolation.

### IN-02: Internal storage `path` leaked to clients in the consentimientos response

**File:** `backend/src/modules/consentimientos/consentimientos.service.ts:100-104`, `frontend/src/types/consentimientos.ts:1-9`

**Issue:** `getZonasConConsentimiento` spreads the entire `archivo` row (`...archivo`) into the response, exposing the internal relative `path` (`{profesionalId}/{uuid}.pdf`) and `profesionalId` alongside the already-public `url`. The client only needs `url`, `nombreOriginal`, `uploadedAt`. Leaking the on-disk layout is unnecessary information disclosure.

**Fix:** Return an explicit projection rather than spreading the full row:
```ts
consentimientoVigente: archivo ? {
  id: archivo.id,
  nombreOriginal: archivo.nombreOriginal,
  uploadedAt: archivo.uploadedAt,
  vigente: archivo.vigente,
  url: this.storage.getPublicUrl(archivo.path),
} : null,
```

### IN-03: `handleSaveIndicaciones` re-saves the server value when the field was never edited

**File:** `frontend/src/app/dashboard/configuracion/components/GestionConsentimientos.tsx:33-47`

**Issue:** When the user clicks "Guardar" without editing the input (`zonaId` not in `indicacionesUrls`), the handler falls back to `currentServerUrl` and issues a PATCH that writes the existing value back. Harmless but generates a needless network round-trip and a misleading success toast for a no-op. Minor.

**Fix:** Short-circuit when there is no in-session edit for the zona (`if (!(zonaId in indicacionesUrls)) return;`) or compare against the server value before mutating.

---

_Reviewed: 2026-06-30T15:33:23Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
