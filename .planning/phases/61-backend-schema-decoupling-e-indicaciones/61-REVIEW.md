---
phase: 61-backend-schema-decoupling-e-indicaciones
reviewed: 2026-07-17T14:00:03Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - backend/src/modules/catalogo-hc/catalogo-hc.controller.ts
  - backend/src/modules/catalogo-hc/catalogo-hc.service.ts
  - backend/src/modules/paciente-portal/dto/firmar-consentimiento-portal.dto.ts
  - backend/src/modules/paciente-portal/paciente-portal.controller.ts
  - backend/src/modules/paciente-portal/paciente-portal.service.spec.ts
  - backend/src/modules/paciente-portal/paciente-portal.service.ts
  - backend/src/modules/pacientes/crm-steps.helper.spec.ts
  - backend/src/modules/pacientes/crm-steps.helper.ts
  - backend/src/modules/pacientes/pacientes.service.spec.ts
  - backend/src/modules/pacientes/pacientes.service.ts
  - backend/src/prisma/migrations/20260708000000_add_indicaciones_leidas/migration.sql
  - backend/src/prisma/schema.prisma
findings:
  critical: 0
  warning: 6
  info: 8
  total: 14
status: issues_found
---

# Phase 61: Code Review Report (re-review after 61-04 gap closure)

**Reviewed:** 2026-07-17T14:00:03Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Re-review of Phase 61 after gap-closure plan 61-04 (commits a4cb2e9, bbbeb6e). The prior review's WR-01 is **verified fixed**: the `take: 1` truncation on `consentimientosFirmados` in `getKanban` is gone (`pacientes.service.ts:679-681` now selects all rows, 2 scalar fields only), `computePasosCrm` iterates every row with `.some()` for Paso 4 (`firmadoAt`) and Paso 5 Fallback 1 (`indicacionesLeidasAt`), and a boundary test suite (`pacientes.service.spec.ts:268-381`, Tests A/B/C) exercises the multi-row shape end-to-end through `getKanban` and would fail if the truncation were reintroduced. The three-tier Paso 5 precedence in `crm-steps.helper.ts:105-108` is correct and null/undefined-safe (`!= null` covers both).

Core phase invariants continue to hold: `pacienteId` derives exclusively from the portal JWT on all portal routes; the acuse write is atomic set-once via conditional `updateMany` (no read-then-write race); the migration is additive/relax-only and matches the schema (`Paciente.indicacionesLeidasAt` nullable at `schema.prisma:217`, `ConsentimientoFirmado.indicacionesLeidasAt` relaxed at `schema.prisma:1438`); `firmarConsentimiento` no longer reads or writes any indicaciones state; the `@Post('indicaciones/acuse')` route cannot be shadowed by `@Post(':token/verificar')` and stays inside the public tier's 20 req/min throttle with a per-route guard.

However, every other finding from the prior review remains open in the current files (verified line-by-line below), and this pass surfaced one new phase-relevant warning: the new acuse endpoint has **zero callers** in the repository while the old read-receipt persistence path was removed, creating a data-loss window for a legally significant confirmation if Phase 61 deploys before Phase 62.

## Warnings

### WR-01: `actualizarIndicacionesUrl` throws a 500 when `indicacionesUrl` is absent from the body (carried from prior review WR-02 — still open)

**File:** `backend/src/modules/catalogo-hc/catalogo-hc.service.ts:768-770` (route: `catalogo-hc.controller.ts:124-133`)
**Issue:** The route has no per-route `ValidationPipe`, and the code itself documents that the DTO decorators do not run (`catalogo-hc.controller.ts:121-122`). The service only special-cases `null`: `if (indicacionesUrl !== null) { if (indicacionesUrl.length > 2048) ... }`. A `PATCH` with body `{}` (or any body missing the key) yields `indicacionesUrl === undefined`, which passes the `!== null` check and crashes on `undefined.length` — `TypeError` → HTTP 500 (behavior confirmed by execution). Non-string junk (numbers, objects, arrays) happens to fall through to the `new URL()` try/catch and correctly yields 400; only the absent-field case crashes. The comment claims full server-side validation (cr-01), but the guard does not cover the most trivial malformed input, so the cr-01 closure is incomplete.
**Fix:**
```ts
if (indicacionesUrl !== null) {
  if (typeof indicacionesUrl !== 'string') {
    // covers undefined (absent field) and non-string junk — no ValidationPipe runs
    throw new BadRequestException('indicacionesUrl debe ser un string o null');
  }
  if (indicacionesUrl.length > 2048) { /* ... existing checks ... */ }
  ...
}
```

### WR-02: Consent re-sign guard is TOCTOU — no unique constraint on `(pacienteId, zonaId)` (carried from prior review WR-03 — still open)

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:601-608`, `backend/src/prisma/schema.prisma:1446`
**Issue:** The D-08 "no re-sign" guard is a `findFirst` followed later by a `create`, with only a plain `@@index([pacienteId, zonaId])` in the schema (whose own comment says it exists for the D-08 check). A non-unique index cannot enforce the invariant. Two concurrent `POST /consentimiento/firmar` requests (double-tap or retry on a slow mobile connection) both pass the `findFirst` check and both create `ConsentimientoFirmado` rows, producing duplicate legally significant forensic records and two archived signed PDFs for the same zona. The new acuse endpoint got this right (atomic conditional `updateMany`); the sign path did not.
**Fix:** Promote the index to `@@unique([pacienteId, zonaId])` (additive migration; verify no existing duplicates first) and map `P2002` on the `create` to the existing 409:
```ts
try {
  await this.prisma.consentimientoFirmado.create({ data: { ... } });
} catch (err) {
  if ((err as { code?: string })?.code === 'P2002') {
    throw new ConflictException('El consentimiento para esta zona ya fue firmado.');
  }
  throw err;
}
```

### WR-03: `create()` — missing `await` makes the P2002 → 409 mapping dead code (carried from prior review WR-04 — still open)

**File:** `backend/src/modules/pacientes/pacientes.service.ts:65-67`
**Issue:** Inside the `try` block the method does `return this.prisma.paciente.create({ data })` without `await`. The promise rejection propagates to the caller and never reaches the `catch`, so the duplicate-DNI branch (`P2002` → `ConflictException('El DNI ingresado ya está registrado.')` at lines 72-74) can never execute. Creating a patient with an existing DNI surfaces as an unhandled Prisma error (500) instead of the intended 409.
**Fix:**
```ts
return await this.prisma.paciente.create({ data });
```

### WR-04: PHI written to logs via `console.log` in pacientes.service.ts (carried from prior review WR-05 — still open)

**File:** `backend/src/modules/pacientes/pacientes.service.ts:54, 69, 339, 383, 388`
**Issue:** `console.log('DTO RECIBIDO:', dto)` (line 54) dumps the full patient-creation payload — DNI, phone, email, allergies, conditions — to stdout on every create. `console.log('ERROR CAPTURADO EN CATCH:', error)` (line 69) dumps raw DB errors that embed field values, and the `suggest` path (lines 339, 388) logs raw search queries (typically names/DNIs) and raw errors. For a medical system this places PHI in log aggregation with no redaction, bypassing the Nest `Logger`.
**Fix:** Remove the debug `console.log` calls or replace with Nest `Logger` at debug level logging only non-PII identifiers (e.g. `paciente.id`); log errors as `logger.error(err.code, err.message)` without payloads.

### WR-05: `getProfesionalId` lets SECRETARIA/ADMIN operate on ANY `profesionalId` with no relationship or existence validation (carried from prior review WR-06 — still open)

**File:** `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts:28-56`
**Issue:** For `SECRETARIA`/`ADMIN`, the query-param `profesionalId` is trusted verbatim — no check that the professional exists, and no check that the caller has any relationship to that professional. Tenancy in this codebase is per-professional; any SECRETARIA account can rename, soft-delete, and set `indicacionesUrl` (a patient-facing link) on any professional's catalog by supplying a `profesionalId`. The `indicacionesUrl` write is the sharpest edge: a hostile secretary account could point another professional's patients at an attacker-controlled URL. The comment acknowledges the pattern was copied from `tratamientos.controller.ts`, so the gap is systemic, but this file re-instantiates it on the phase-relevant route.
**Fix:** At minimum verify the target professional exists; ideally enforce a secretaria↔profesional relationship check before honoring `targetProfesionalId`, and restrict `indicacionesUrl` writes to `ADMIN`/owning `PROFESIONAL`.

### WR-06: NEW — acuse endpoint has zero callers while the old read-receipt persistence path was removed (deployment-window data loss)

**File:** `backend/src/modules/paciente-portal/paciente-portal.controller.ts:172-176` (new endpoint), `backend/src/modules/paciente-portal/paciente-portal.service.ts:640-651` (removed write)
**Issue:** This phase removed the only persistence of the indicaciones read confirmation: `firmarConsentimiento` no longer writes `ConsentimientoFirmado.indicacionesLeidasAt`, and the `indicacionesLeidas` field a stale client sends is whitelist-stripped before reaching the service. The replacement, `POST /paciente-portal/public/indicaciones/acuse`, has **no caller anywhere in the repository**: the current frontend still sends `indicacionesLeidas: true` inside the sign payload (`frontend/src/components/portal/PortalConsentimiento.tsx:111`, `frontend/src/hooks/usePortalConsentimiento.ts:37`) and never calls the acuse route. For every consent signed between deploying this backend and shipping Phase 62, the patient's explicit "leí las indicaciones" confirmation is captured in the UI and then persisted **nowhere** — and the CRM `indicacionesPreop` step reads `pendiente` for those patients. For a record the code itself documents as "legally-significant", that is a silent data-loss window. Phase 62 (roadmap lines 226-234) plans the frontend caller, so this is a release-coupling risk rather than a logic bug — but nothing in code, migration, or docs enforces the coupling.
**Fix:** Ship Phases 61 and 62 in the same deploy, or add an interim bridge so the confirmation the current frontend already sends is not dropped:
```ts
// firmar-consentimiento-portal.dto.ts (interim, remove when Phase 62 ships)
@IsOptional()
@IsBoolean()
indicacionesLeidas?: boolean;

// paciente-portal.service.ts — end of firmarConsentimiento
if (dto.indicacionesLeidas) {
  await this.registrarAcuseIndicaciones(pacienteId); // set-once, idempotent
}
```

## Info

### IN-01: `getConsentimientosParaFirmar` runs the same `cirugia.findMany` query twice per request (carried — still open)

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:382-390, 510-513`
**Issue:** The method fetches pending surgeries for the SIN_CATALOGO/SIN_ZONA signals, then `resolverZonaIdsFirmables` immediately re-runs an identical query. Duplicated code and a redundant round-trip.
**Fix:** Let `resolverZonaIdsFirmables` accept an optional pre-fetched `cirugias` array, or return the raw surgeries alongside the zona set.

### IN-02: Consent resolver does not filter `ZonaHC.activo` — soft-deleted zonas remain signable (carried — still open)

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:411-425` (also write path at 583-592)
**Issue:** `eliminarZona` soft-deletes (`activo=false`), but the resolver's `zonaHC.findMany({ where: { id: { in: [...] } } })` ignores `activo`. A zona removed from the catalog — if it still has a `vigente` consent PDF — continues to be offered `PARA_FIRMAR` and accepted at write time. If intentional (surgery already scheduled against that zona), document it.
**Fix:** Decide and document; if unintended, add `activo: true` to both queries or invalidate the archivo on zona deletion.

### IN-03: Acuse endpoint stamps `indicacionesLeidasAt` without verifying any indicaciones were ever associated/presented (carried — still open)

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:675-683`
**Issue:** Any authenticated portal patient can `POST /indicaciones/acuse` and permanently mark the CRM `indicacionesPreop` step `completo`, even if no zona with an `indicacionesUrl` relates to them. Matches the documented D-06 "global set-once" design — flagged for awareness: staff dashboards show "indicaciones leídas" based on a self-service, unverifiable action.
**Fix:** (optional hardening) reject the acuse when the patient's signable zonas carry no `indicacionesUrl`, or record which URL was acknowledged.

### IN-04: `PacientesService.update()` is unrouted dead code that forwards the raw body to Prisma (carried — still open)

**File:** `backend/src/modules/pacientes/pacientes.service.ts:201-208`
**Issue:** No controller calls `pacientesService.update` (the PATCH `:id` route goes to `updatePacienteSection`). If ever wired up, `data: dto` with no global ValidationPipe is a mass-assignment hole over every `Paciente` column (including `portalToken`, `portalTokenCifrado`, `etapaCRM`, and now `indicacionesLeidasAt`). Dead code carrying a latent vulnerability.
**Fix:** Delete the method, or convert it to an explicit allow-list (`pickPresent`-style) before it is ever routed.

### IN-05: `RenameItemDto` validators are inert on the catalogo-hc rename routes (carried — still open)

**File:** `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts:104-155`, `backend/src/modules/catalogo-hc/catalogo-hc.service.ts:732-753`
**Issue:** Unlike the indicaciones route (server-side validation) and the portal routes (per-route `ValidationPipe`), the rename endpoints pass `dto.nombre` straight to `prisma.update`. An absent `nombre` (`undefined`) silently no-ops the rename and returns 200 with the unchanged row; a non-string (`{ nombre: 5 }`) produces a Prisma validation error → 500.
**Fix:** Add `@Body(new ValidationPipe({ whitelist: true }))` on these routes, or guard `typeof nombre !== 'string' || !nombre.trim()` → `BadRequestException` in the rename services.

### IN-06: NEW — acuse read-receipt records no forensic context (ip/userAgent), unlike the flow it replaced

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:675-683`
**Issue:** The doc comment calls the acuse timestamp "legally-significant", but the previous incarnation of this receipt lived on the `ConsentimientoFirmado` forensic row alongside `ip` and `userAgent`. The new receipt is a bare timestamp on the patient profile — no capture context if ever needed as evidence. The controller already demonstrates the server-side ip/UA capture pattern (`paciente-portal.controller.ts:204-208`).
**Fix:** If forensic parity matters (product/legal call), capture ip/userAgent in the controller and persist them in dedicated columns (e.g. `indicacionesLeidasIp`, `indicacionesLeidasUserAgent`) inside the same set-once `updateMany`.

### IN-07: NEW — `registrarAcuseIndicaciones` returns `{ ok: true }` for a nonexistent patient

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:675-683`
**Issue:** `updateMany` matching 0 rows conflates "already acknowledged" (intended idempotent case) with "patient deleted since the JWT was issued". `crearConsulta` in the same service (lines 322-327) does a defensive existence check and throws 404 for this exact scenario; the acuse silently reports success. Low impact (portal JWTs expire in 45m), but inconsistent within the same file.
**Fix:** Mirror `crearConsulta` (`findUnique({ select: { id: true } })` → `NotFoundException` before the `updateMany`), or document the accepted inconsistency in the method comment.

### IN-08: NEW — forensic record creation and aggregate-flag update in `firmarConsentimiento` are not transactional

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:640-660`
**Issue:** `consentimientoFirmado.create` and the subsequent `paciente.update` (sets `consentimientoFirmado: true` + `consentimientoFirmadoAt`) run as two independent writes describing one event. If the second fails, a signed forensic row exists while the aggregate flag stays false. Drift is mostly cosmetic (CRM Paso 4 still resolves `completo` via the forensic row, `crm-steps.helper.ts:97-99`), but the writes belong together. Pre-existing.
**Fix:** Wrap both writes in `this.prisma.$transaction([...])`.

## Verified fixed (from prior review at this path)

- **Prior WR-01 (getKanban `take: 1` truncation shadowing legacy v1.12 receipts):** Fixed in a4cb2e9. `pacientes.service.ts:679-681` selects all `consentimientosFirmados` rows; the explanatory comment (lines 674-678) documents why `take: 1` must not return. Boundary tests added in bbbeb6e (`pacientes.service.spec.ts:268-381`): Test A proves an older row's legacy receipt survives a newer NULL row; Test B guards Paso 4 non-regression; Test C proves genuine `pendiente`. Closed.

---

_Reviewed: 2026-07-17T14:00:03Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
