---
phase: 61-backend-schema-decoupling-e-indicaciones
reviewed: 2026-07-08T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - backend/src/modules/catalogo-hc/catalogo-hc.controller.ts
  - backend/src/modules/catalogo-hc/catalogo-hc.service.ts
  - backend/src/modules/paciente-portal/dto/firmar-consentimiento-portal.dto.ts
  - backend/src/modules/paciente-portal/paciente-portal.controller.ts
  - backend/src/modules/paciente-portal/paciente-portal.service.spec.ts
  - backend/src/modules/paciente-portal/paciente-portal.service.ts
  - backend/src/modules/pacientes/crm-steps.helper.spec.ts
  - backend/src/modules/pacientes/crm-steps.helper.ts
  - backend/src/modules/pacientes/pacientes.service.ts
  - backend/src/prisma/migrations/20260708000000_add_indicaciones_leidas/migration.sql
  - backend/src/prisma/schema.prisma
findings:
  critical: 0
  warning: 6
  info: 5
  total: 11
status: issues_found
---

# Phase 61: Code Review Report

**Reviewed:** 2026-07-08
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 61 (consent/indicaciones decoupling, portal acuse endpoint, computePasosCrm derivation) was reviewed at standard depth, including cross-checks of `PortalJwtGuard`/`portal-jwt.strategy` (scope + patient-existence enforcement confirmed), `main.ts` (no global ValidationPipe — confirmed; body limit 2mb), and a repo-wide grep for stale `indicacionesLeidas` writers (none remain in backend outside the reviewed files).

The core phase invariants hold: `pacienteId` is derived exclusively from the portal JWT on all new/modified portal routes; the acuse write is atomic and set-once via a conditional `updateMany` (no read-then-write race); the migration is additive/relax-only and matches the schema; `firmarConsentimiento` no longer requires or persists the indicaciones read-receipt; test coverage for the new paths is solid.

However, the review found one phase-relevant logic defect (the `take: 1` on `consentimientosFirmados` in `getKanban` silently breaks the legacy v1.12 fallback the new `computePasosCrm` relies on), one 500-crash edge on the catalogo-hc indicaciones route, a TOCTOU on the consent re-sign guard (no DB uniqueness), plus pre-existing defects in touched files (dead `catch` from a missing `await`, PHI logged via `console.log`, unscoped SECRETARIA/ADMIN catalog writes).

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: `take: 1` on `consentimientosFirmados` defeats computePasosCrm Fallback 1 (legacy v1.12 read-receipt lost after a post-61 signature)

**File:** `backend/src/modules/pacientes/pacientes.service.ts:674-678` (interacts with `backend/src/modules/pacientes/crm-steps.helper.ts:105-108`)
**Classification:** WARNING (incorrect derived state, phase-relevant)
**Issue:** `computePasosCrm` implements Fallback 1 as `consentimientosFirmados.some((c) => c.indicacionesLeidasAt != null)` — it is written for an array. But `getKanban` selects the relation with `take: 1, orderBy: { firmadoAt: 'desc' }`, i.e. only the MOST RECENT signature. Post-Phase-61, every new `ConsentimientoFirmado` row leaves `indicacionesLeidasAt` NULL (decoupling, D-01/D-02). So a legacy patient who acknowledged indicaciones via the v1.12 flow (older row carries the timestamp) and then signs any second consent after this release will have the newest row (NULL) shadow the legacy one: `indicacionesPreop` regresses from `completo` to `pendiente` even though the acuse legally exists. `Paciente.indicacionesLeidasAt` is not backfilled for these patients, and `indicacionesEnviadas` may be false, so no other source rescues the step. The unit tests cannot catch this because the truncation happens in the Prisma select, not in the pure helper.
**Fix:**
```ts
// pacientes.service.ts (getKanban select) — remove the truncation so the
// helper's .some() sees every row (bounded by the patient's signed zonas):
consentimientosFirmados: {
  select: { firmadoAt: true, indicacionesLeidasAt: true },
},
```
(Alternative: keep `take: 1` for `firmadoAt` and add a second filtered sub-select `where: { indicacionesLeidasAt: { not: null } }, take: 1`, merging both into the helper input.)

### WR-02: `actualizarIndicacionesUrl` throws a 500 when `indicacionesUrl` is absent from the body

**File:** `backend/src/modules/catalogo-hc/catalogo-hc.service.ts:768-770` (route: `catalogo-hc.controller.ts:124-133`)
**Classification:** WARNING (unhandled edge case → 500)
**Issue:** The route has no per-route `ValidationPipe`, and the code itself documents that the DTO decorators do not run. The service only special-cases `null`: `if (indicacionesUrl !== null) { if (indicacionesUrl.length > 2048) ... }`. A `PATCH` with body `{}` (or any body missing the key) yields `indicacionesUrl === undefined`, which enters the branch and crashes on `undefined.length` → `TypeError` → HTTP 500. The server-side validation that was added specifically because the DTO is inert (cr-01) does not cover the most trivial malformed input.
**Fix:**
```ts
if (indicacionesUrl !== null) {
  if (typeof indicacionesUrl !== 'string') {
    throw new BadRequestException('indicacionesUrl debe ser un string o null');
  }
  if (indicacionesUrl.length > 2048) { ... }
  ...
}
```

### WR-03: Consent re-sign guard is TOCTOU — no unique constraint on `(pacienteId, zonaId)`

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:601-609`, `backend/src/prisma/schema.prisma:1446`
**Classification:** WARNING (data-integrity risk on forensic records)
**Issue:** The D-08 "no re-sign" guard is a `findFirst` followed later by a `create`, with only a plain `@@index([pacienteId, zonaId])` in the schema (not `@@unique`). Two concurrent `POST /consentimiento/firmar` requests (double-tap, retry after a slow response) can both pass the `findFirst` check and both create a `ConsentimientoFirmado` row, producing duplicate legally-significant forensic records and two archived signed PDFs for the same zona. The new acuse endpoint got this right (atomic conditional `updateMany`); the sign path did not.
**Fix:** Add `@@unique([pacienteId, zonaId])` to `ConsentimientoFirmado` (replaces the redundant index) with an additive migration, and map `P2002` on the `create` to the existing `ConflictException('El consentimiento para esta zona ya fue firmado.')`.

### WR-04: `create()` — missing `await` makes the P2002 → 409 mapping dead code

**File:** `backend/src/modules/pacientes/pacientes.service.ts:65-77`
**Classification:** WARNING (missing error handling; pre-existing in touched file)
**Issue:** Inside the `try` block the method does `return this.prisma.paciente.create({ data })` without `await`. The promise rejection therefore propagates to the caller and never reaches the `catch`, so the duplicate-DNI branch (`P2002` → `ConflictException('El DNI ingresado ya está registrado.')`) can never execute. Creating a patient with an existing DNI surfaces as an unhandled Prisma error (500) instead of the intended 409.
**Fix:**
```ts
return await this.prisma.paciente.create({ data });
```

### WR-05: PHI written to logs via `console.log` in pacientes.service.ts

**File:** `backend/src/modules/pacientes/pacientes.service.ts:54, 69, 339, 383, 388`
**Classification:** WARNING (sensitive-data exposure in logs; pre-existing in touched file)
**Issue:** `console.log('DTO RECIBIDO:', dto)` dumps the full patient-creation payload — DNI, phone, email, allergies, conditions, diagnosis — into stdout on every create. `console.log('ERROR CAPTURADO EN CATCH:', error)` dumps raw DB errors (which embed field values), and the `suggest` path logs raw search queries (typically names/DNIs). For a medical system this places PHI in log aggregation with no redaction, and none of it goes through the Nest `Logger`.
**Fix:** Remove the debug `console.log` calls (lines 54, 69, 339, 383) or replace with a Nest `Logger` at debug level logging only non-PII identifiers (e.g. `paciente.id`). Log errors as `logger.error(err.code, err.message)` without the payload.

### WR-06: `getProfesionalId` lets SECRETARIA/ADMIN operate on ANY `profesionalId` with no relationship or existence validation

**File:** `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts:28-56`
**Classification:** WARNING (authorization-scoping gap in a multi-tenant SaaS)
**Issue:** For `SECRETARIA`/`ADMIN`, the query-param `profesionalId` is trusted verbatim — no check that the professional exists, and no check that the caller has any relationship to that professional. The project describes itself as multi-tenant, and tenancy in this codebase is effectively per-professional; with this pattern any user holding the SECRETARIA role anywhere in the database can rename, soft-delete, and set `indicacionesUrl` (patient-facing links!) on any professional's catalog by guessing/obtaining a `profesionalId`. The comment acknowledges it was copy-pasted from `tratamientos.controller.ts`, so the gap is systemic, but this file re-instantiates it and the phase context explicitly calls out tenant scoping. The `indicacionesUrl` write is the sharpest edge: a hostile secretary account could point another professional's patients at an attacker-controlled URL.
**Fix:** At minimum verify the target professional exists; ideally introduce (or reuse, if one exists) a secretaria↔profesional relationship check before honoring `targetProfesionalId`, and restrict `indicacionesUrl` writes to `ADMIN`/owning `PROFESIONAL`.

## Info

### IN-01: `getConsentimientosParaFirmar` runs the same `cirugia.findMany` query twice per request

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:382-401, 510-518`
**Issue:** The method fetches the patient's pending surgeries for the SIN_CATALOGO/SIN_ZONA signals, then `resolverZonaIdsFirmables` immediately re-runs an identical query. Duplicated code and a redundant round-trip.
**Fix:** Let `resolverZonaIdsFirmables` accept an optional pre-fetched `cirugias` array, or return the raw surgeries alongside the zona set.

### IN-02: Consent resolver does not filter `ZonaHC.activo` — soft-deleted zonas remain signable

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:411-425` (also the write path at 583-592)
**Issue:** `eliminarZona` soft-deletes (`activo=false`), but the resolver's `zonaHC.findMany({ where: { id: { in: [...] } } })` ignores `activo`. A zona the professional removed from their catalog — if it still has a `vigente` consent PDF — continues to be offered `PARA_FIRMAR` and accepted at write time. If intentional (surgery already scheduled against that zona), document it; otherwise add `activo: true` or invalidate the archivo on zona deletion.
**Fix:** Decide and document; if unintended, add `activo: true` to both queries.

### IN-03: Acuse endpoint stamps `indicacionesLeidasAt` without verifying any indicaciones were ever associated/presented

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:675-683`
**Issue:** Any authenticated portal patient can `POST /indicaciones/acuse` and permanently mark the CRM `indicacionesPreop` step `completo`, even if no zona with an `indicacionesUrl` relates to them and staff never sent indicaciones. This matches the documented D-06 "global set-once" design, so it is flagged for awareness only: staff dashboards will show "indicaciones leídas" based on a self-service, unverifiable action.
**Fix:** (optional hardening) reject the acuse when `resolverZonaIdsFirmables`-derived zonas have no `indicacionesUrl`, or record which URL was acknowledged.

### IN-04: `PacientesService.update()` is unrouted dead code that forwards the raw body to Prisma

**File:** `backend/src/modules/pacientes/pacientes.service.ts:202-208`
**Issue:** No controller calls `pacientesService.update` (the PATCH `:id` route goes to `updatePacienteSection`). If it is ever wired up, `data: dto` with no global ValidationPipe is a mass-assignment hole over every `Paciente` column (including `portalToken`, `portalTokenCifrado`, `etapaCRM`). Dead code carrying a latent vulnerability.
**Fix:** Delete the method, or convert it to an explicit allow-list (`pickPresent`-style) before it is ever routed.

### IN-05: `RenameItemDto` validators are inert on the catalogo-hc rename routes (no per-route pipe, no service-side type check)

**File:** `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts:104-155`, `backend/src/modules/catalogo-hc/catalogo-hc.service.ts:732-753`
**Issue:** Unlike the indicaciones route (which validates server-side) and the portal routes (per-route `ValidationPipe`), the rename endpoints pass `dto.nombre` straight to `prisma.update`. An absent `nombre` (`undefined`) silently no-ops the rename (Prisma skips undefined) and returns 200 with the unchanged row; a non-string (`{ nombre: 5 }`) produces a Prisma validation error → 500.
**Fix:** Add `@Body(new ValidationPipe({ whitelist: true }))` on these routes, or add a `typeof nombre !== 'string' || !nombre.trim()` → `BadRequestException` guard in the rename services.

---

_Reviewed: 2026-07-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
