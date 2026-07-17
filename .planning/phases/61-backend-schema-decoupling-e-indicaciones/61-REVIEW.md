---
phase: 61-backend-schema-decoupling-e-indicaciones
reviewed: 2026-07-17T20:19:12Z
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
  warning: 7
  info: 8
  total: 15
status: issues_found
---

# Phase 61: Code Review Report (re-review after gap-closure plan 61-05)

**Reviewed:** 2026-07-17T20:19:12Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Re-review after 61-05, whose sole deliverable was the durable source-shape guard test for the `take:1` regression in `getKanban`'s `consentimientosFirmados` select. **The 61-05 gap (the one item flagged as open by 61-VERIFICATION) is RESOLVED and verified:**

- The new guard (`pacientes.service.spec.ts:394-432`) reads `pacientes.service.ts` via `readFileSync`, isolates the `consentimientosFirmados: { ... }` block by brace balancing from the opening brace (so the documentary "Sin take:1" comment preceding the key cannot false-positive), and asserts no `take`/`orderBy` plus presence of exactly the two selected fields (`firmadoAt`, `indicacionesLeidasAt`).
- **Anchor verified correct today:** `consentimientosFirmados` appears exactly twice in `pacientes.service.ts` (lines 679 and 749); the first `indexOf` hit is the getKanban select block — the intended target.
- **Falsification verified empirically:** I re-ran the guard's exact extraction logic against a mutated copy of the source with `take: 1` + `orderBy` reinserted into the select block — the guard's asserts fail as intended. Against the current source it passes. Unlike the 61-04 boundary tests (which mock `findMany` with hand-built rows), this guard cannot be satisfied by a mocked shape — it inspects the real select.
- All three changed suites pass: 70/70 tests (`pacientes.service.spec.ts`, `crm-steps.helper.spec.ts`, `paciente-portal.service.spec.ts`).

One NEW warning against the guard itself (WR-07): I empirically demonstrated an anchor-drift blind spot — if a future edit adds an earlier `consentimientosFirmados:` select above `getKanban`, the guard silently retargets and a reintroduced `take:1` in getKanban passes undetected. Cheap fix (anchor after `async getKanban(` + occurrence-count assert).

Since the prior review (2026-07-17T14:00:03Z) the only source change is the guard test itself, so **every carried finding from that review remains open** — re-verified line-by-line at HEAD below (WR-01 through WR-06, IN-01 through IN-08). None of them is in the 61-05 plan scope; they are recorded so they are not silently lost. Cross-file consistency re-confirmed: schema ↔ migration match (`Paciente.indicacionesLeidasAt DateTime?` ↔ nullable `TIMESTAMP(3)` ADD COLUMN; `ConsentimientoFirmado.indicacionesLeidasAt` `DROP NOT NULL` ↔ `DateTime?`), migration folder is newest, and the portal service is the only writer of `ConsentimientoFirmado` (its `create` correctly omits `indicacionesLeidasAt`).

The 18 pre-existing test failures in diagnosticos/usuarios/reportes specs are known legacy debt verified identical at the pre-phase base commit and are not reported as phase findings.

## Verified fixed

- **61-VERIFICATION open item (durable take:1 guard):** Closed by the `getKanban consentimientosFirmados select — source-shape guard` describe block (`pacientes.service.spec.ts:394-432`). Falsifiability confirmed by mutation simulation; suite green at HEAD.
- **Prior WR-01 of the 61-04-era review (getKanban `take: 1` truncation):** remains fixed — `pacientes.service.ts:679-681` selects all rows, 2 scalar fields only, and is now guarded both dynamically (boundary Tests A/B/C, spec lines 270-383) and statically (source-shape guard).

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: `actualizarIndicacionesUrl` throws a 500 when `indicacionesUrl` is absent from the body (carried — still open)

**File:** `backend/src/modules/catalogo-hc/catalogo-hc.service.ts:768-770` (route: `catalogo-hc.controller.ts:124-133`)
**Issue:** The route has no per-route `ValidationPipe`, and the code itself documents that the DTO decorators do not run (`catalogo-hc.controller.ts:121-122`). The service only special-cases `null`: a `PATCH` with body `{}` yields `indicacionesUrl === undefined`, which passes the `!== null` check and crashes on `undefined.length` — `TypeError` → HTTP 500. Non-string junk falls through to the `new URL()` try/catch and correctly yields 400; only the absent-field case crashes, so the cr-01 server-side-validation closure is incomplete.
**Fix:**
```ts
if (indicacionesUrl !== null) {
  if (typeof indicacionesUrl !== 'string') {
    throw new BadRequestException('indicacionesUrl debe ser un string o null');
  }
  // ... existing length/URL/protocol checks ...
}
```

### WR-02: Consent re-sign guard is TOCTOU — no unique constraint on `(pacienteId, zonaId)` (carried — still open)

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:601-608`, `backend/src/prisma/schema.prisma:1446`
**Issue:** The D-08 "no re-sign" guard is a `findFirst` followed later by a `create`, with only a plain `@@index([pacienteId, zonaId])` in the schema. Two concurrent `POST /consentimiento/firmar` requests (double-tap/retry on a slow mobile connection) both pass the check and both commit, producing duplicate legally-significant forensic rows and two archived signed PDFs for the same zona. The acuse endpoint got this right (atomic conditional `updateMany`); the sign path did not.
**Fix:** Promote to `@@unique([pacienteId, zonaId])` (verify no existing duplicates first) and map `P2002` on the `create` to the existing 409 `ConflictException`.

### WR-03: `create()` — missing `await` makes the P2002 → 409 mapping dead code (carried — still open)

**File:** `backend/src/modules/pacientes/pacientes.service.ts:65-67`
**Issue:** Inside the `try` block: `return this.prisma.paciente.create({ data })` without `await`. The promise rejection propagates to the caller and never reaches the `catch`, so the duplicate-DNI branch (lines 72-74, `P2002` → `ConflictException('El DNI ingresado ya está registrado.')`) can never execute — a duplicate DNI surfaces as a raw 500.
**Fix:** `return await this.prisma.paciente.create({ data });`

### WR-04: PHI written to logs via `console.log` in pacientes.service.ts (carried — still open)

**File:** `backend/src/modules/pacientes/pacientes.service.ts:54, 69, 339, 383, 388`
**Issue:** `console.log('DTO RECIBIDO:', dto)` dumps the full patient-creation payload (DNI, phone, email, allergies, conditions) to stdout on every create; line 69 dumps raw DB errors embedding field values; the suggest path logs raw search queries (names/DNIs) and raw errors. PHI reaches log aggregation unredacted, bypassing the Nest `Logger`.
**Fix:** Remove the debug `console.log` calls or replace with Nest `Logger` logging only non-PII identifiers; log errors as `logger.error(err.code, err.message)` without payloads.

### WR-05: `getProfesionalId` lets SECRETARIA/ADMIN operate on ANY `profesionalId` with no relationship or existence validation (carried — still open)

**File:** `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts:28-56`
**Issue:** For `SECRETARIA`/`ADMIN`, the query-param `profesionalId` is trusted verbatim — no existence check and no caller↔professional relationship check. Any SECRETARIA account can rename, soft-delete, and set `indicacionesUrl` (a patient-facing link) on any professional's catalog. The `indicacionesUrl` write is the sharpest edge: a hostile secretary account could point another professional's patients at an attacker-controlled URL. Pattern is copied from `tratamientos.controller.ts`, so the gap is systemic, but this file re-instantiates it on the phase-relevant route.
**Fix:** At minimum verify the target professional exists; ideally enforce a secretaria↔profesional relationship check, and restrict `indicacionesUrl` writes to `ADMIN`/owning `PROFESIONAL`.

### WR-06: Acuse endpoint has zero callers while the old read-receipt persistence path was removed (deployment-window data loss) (carried — still open)

**File:** `backend/src/modules/paciente-portal/paciente-portal.controller.ts:172-176`, `backend/src/modules/paciente-portal/paciente-portal.service.ts:640-651`
**Issue:** Re-verified at HEAD: `POST /paciente-portal/public/indicaciones/acuse` still has **no caller anywhere in the repository** — the current frontend still sends `indicacionesLeidas: true` inside the sign payload (`frontend/src/components/portal/PortalConsentimiento.tsx:111`, `frontend/src/hooks/usePortalConsentimiento.ts:37`), which the per-route whitelist pipe now strips. For every consent signed between deploying this backend and shipping Phase 62's frontend caller, the patient's explicit "leí las indicaciones" confirmation is captured in the UI and persisted **nowhere**, and the CRM `indicacionesPreop` step reads `pendiente` for those patients. Release-coupling risk rather than a logic bug, but nothing in code or migration enforces the coupling.
**Fix:** Ship Phases 61 and 62 in the same deploy, or add an interim bridge: accept an optional `indicacionesLeidas?: boolean` in the sign DTO and call the set-once `registrarAcuseIndicaciones(pacienteId)` when true (remove once Phase 62 ships).

### WR-07: NEW — source-shape guard silently retargets if an earlier `consentimientosFirmados:` select is ever added to the file

**File:** `backend/src/modules/pacientes/pacientes.service.spec.ts:399`
**Issue:** The guard anchors on `source.indexOf('consentimientosFirmados:')` — the FIRST occurrence file-wide, with no assertion that the occurrence is inside `getKanban` and no occurrence-count assertion. Correct today (first hit is line 679, the getKanban select). But I demonstrated the failure mode empirically: if a future method above `getKanban` (e.g. a `getPerfil` legitimately selecting `consentimientosFirmados: { ... }`) is added, the guard silently retargets to that earlier block — and a reintroduced `take: 1` in the real getKanban select then passes undetected. That silent-miss mode defeats the guard's stated purpose (durable protection of the WR-01/SC#3 fix). Secondary fragility: the brace counter does not skip braces inside strings/comments, so a future inline comment containing `{`/`}` inside the block corrupts extraction (that mode at least fails loudly).
**Fix:** Anchor inside `getKanban` and make drift loud:
```typescript
const kanbanIndex = source.indexOf('async getKanban(');
expect(kanbanIndex).not.toBe(-1);
const keyIndex = source.indexOf('consentimientosFirmados:', kanbanIndex);
expect(keyIndex).not.toBe(-1);
// Drift alarm: the select-shaped occurrence must remain unique file-wide
expect(source.match(/consentimientosFirmados:\s*\{/g)).toHaveLength(1);
```

## Info

### IN-01: `getConsentimientosParaFirmar` runs the same `cirugia.findMany` query twice per request (carried — still open)

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:382-390, 510-513`
**Issue:** The method fetches pending surgeries for the SIN_CATALOGO/SIN_ZONA signals, then `resolverZonaIdsFirmables` immediately re-runs an identical query — duplicated code and a redundant round-trip.
**Fix:** Let `resolverZonaIdsFirmables` accept an optional pre-fetched `cirugias` array, or return the raw surgeries alongside the zona set.

### IN-02: Consent resolver does not filter `ZonaHC.activo` — soft-deleted zonas remain signable (carried — still open)

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:411-425` (write path: 583-592)
**Issue:** `eliminarZona` soft-deletes (`activo=false`), but the resolver's `zonaHC.findMany({ where: { id: { in: [...] } } })` ignores `activo`. A catalog-removed zona with a `vigente` consent PDF is still offered `PARA_FIRMAR` and accepted at write time. If intentional (surgery already scheduled against that zona), document it.
**Fix:** Decide and document; if unintended, add `activo: true` to both queries or invalidate the archivo on zona deletion.

### IN-03: Acuse endpoint stamps `indicacionesLeidasAt` without verifying any indicaciones were ever associated/presented (carried — still open)

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:675-683`
**Issue:** Any authenticated portal patient can `POST /indicaciones/acuse` and permanently mark the CRM `indicacionesPreop` step `completo`, even if no zona with an `indicacionesUrl` relates to them. Matches the documented D-06 "global set-once" design — flagged for awareness.
**Fix:** (optional hardening) reject the acuse when the patient's signable zonas carry no `indicacionesUrl`, or record which URL was acknowledged.

### IN-04: `PacientesService.update()` is unrouted dead code that forwards the raw body to Prisma (carried — still open)

**File:** `backend/src/modules/pacientes/pacientes.service.ts:202-208`
**Issue:** No controller calls it (the PATCH `:id` route goes to `updatePacienteSection`). If ever wired up, `data: dto` with no global ValidationPipe is a mass-assignment hole over every `Paciente` column (including `portalToken`, `portalTokenCifrado`, `etapaCRM`, and now `indicacionesLeidasAt`).
**Fix:** Delete the method, or convert it to an explicit allow-list before it is ever routed.

### IN-05: `RenameItemDto` validators are inert on the catalogo-hc rename routes (carried — still open)

**File:** `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts:104-155`, `catalogo-hc.service.ts:732-753`
**Issue:** Unlike the indicaciones route (server-side validation) and portal routes (per-route pipe), the rename endpoints pass `dto.nombre` straight to `prisma.update`. Absent `nombre` silently no-ops with 200; a non-string produces a Prisma validation error → 500.
**Fix:** Add `@Body(new ValidationPipe({ whitelist: true }))` on these routes, or guard `typeof nombre !== 'string' || !nombre.trim()` → `BadRequestException` in the rename services.

### IN-06: Acuse read-receipt records no forensic context (ip/userAgent), unlike the flow it replaced (carried — still open)

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:675-683`
**Issue:** The doc comment calls the acuse timestamp "legally-significant", but the previous incarnation lived on the `ConsentimientoFirmado` forensic row alongside `ip`/`userAgent`. The new receipt is a bare timestamp with no capture context; the controller already demonstrates the server-side ip/UA capture pattern (`paciente-portal.controller.ts:204-208`).
**Fix:** If forensic parity matters (product/legal call), capture ip/userAgent in the controller and persist them in dedicated columns inside the same set-once `updateMany`.

### IN-07: `registrarAcuseIndicaciones` returns `{ ok: true }` for a nonexistent patient (carried — still open)

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:675-683`
**Issue:** `updateMany` matching 0 rows conflates "already acknowledged" (intended idempotency) with "patient deleted since the JWT was issued". `crearConsulta` in the same service (lines 322-327) does a defensive existence check and 404s in this exact scenario; the acuse silently reports success. Low impact (45m JWT expiry), but inconsistent within the same file.
**Fix:** Mirror `crearConsulta`'s existence check before the `updateMany`, or document the accepted inconsistency in the method comment.

### IN-08: Forensic record creation and aggregate-flag update in `firmarConsentimiento` are not transactional (carried — still open)

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:640-660`
**Issue:** `consentimientoFirmado.create` and the subsequent `paciente.update` (sets `consentimientoFirmado: true` + `consentimientoFirmadoAt`) run as two independent writes describing one event. If the second fails, a forensic row exists while the aggregate flag stays false. Drift is mostly cosmetic (CRM Paso 4 still resolves via the forensic row), but the writes belong together. Pre-existing.
**Fix:** Wrap both writes in `this.prisma.$transaction([...])`.

---

_Reviewed: 2026-07-17T20:19:12Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
