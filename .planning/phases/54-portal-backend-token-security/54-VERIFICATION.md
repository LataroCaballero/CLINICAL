---
phase: 54-portal-backend-token-security
verified: 2026-06-30T20:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification: false
human_verification:
  - test: "HTTP-level whitelist stripping on public write routes"
    expected: "PATCH /paciente-portal/public/datos-personales with body { alergias: ['x'], etapaCRM: 'GANADO', telefono: '111' } returns 200 and only updates telefono; alergias/etapaCRM columns remain unchanged in the DB"
    why_human: "ValidationPipe({ whitelist: true }) strip behavior is provable at code-read level but only confirms at runtime with a live server + DB. The service-layer pickPresent is spec-covered; the HTTP-layer pipe stripping requires an integration call."
  - test: "Public route throttle tier (20 req/min) rejects burst traffic"
    expected: "21st request to GET /paciente-portal/public/:token within 60 s returns 429 from the ThrottlerGuard"
    why_human: "Throttle behavior requires a running server + Redis; cannot be verified with static analysis or unit tests."
  - test: "Portal JWT auth: a staff JWT (scope absent) is rejected on guarded routes"
    expected: "GET /paciente-portal/public with a valid staff JWT (no scope=portal-paciente claim) returns 401"
    why_human: "The strategy validate() returning null for wrong scope causes Passport to return 401; confirmed in code but full behavior needs a live server call to exercise the Passport/Express pipeline."
---

# Phase 54: Portal Backend + Token Security — Verification Report

**Phase Goal:** El backend del portal de autogestión está operativo: cada paciente tiene un link persistente cuyo token está SHA-256 hasheado en la BD, los endpoints públicos usan DTOs estrictos que protegen campos clínicos y los datos de salud se almacenan staged sin tocar los registros curados.
**Verified:** 2026-06-30T20:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Raw URL token is SHA-256-hashed (64-char hex) and looked up by `Paciente.portalToken`; unknown token → 404 with no patient data | VERIFIED | `service.ts:42` — `crypto.createHash('sha256').update(raw).digest('hex')`; `service.ts:52` — `findUnique({ where: { portalToken: tokenHash } })`; spec asserts `whereArg.portalToken.toHaveLength(64)` and `!== RAW_TOKEN`; `NotFoundException` thrown (no fields returned) on miss |
| SC2 | After 3 consecutive failed DNI attempts for the same token within 15 min, the endpoint returns 429; correct DNI resets counter and emits a portal-scoped JWT | VERIFIED | `service.ts:165-233` implements block-duration lock; `portalIntentosFallidos` + `portalBloqueadoHasta` columns in schema (`:220-221`); spec 15/15 PASS — tests cover 1st/2nd accumulation, 3rd 429, active-block 429 before DNI check, expired-block reset, correct-DNI reset + JWT emission |
| SC3 | Portal write endpoints do not allow modification of `alergias`, `condiciones`, `etapaCRM`, `flujo`, `DNI`, or any curated clinical field — requests including those in the body are silently ignored (not 400) | VERIFIED | `update-contacto-portal.dto.ts` — no forbidden fields; controller has `@Body(new ValidationPipe({ whitelist: true }))` on both write routes (lines 86, 102); no `forbidNonWhitelisted` in controller; service-layer `pickPresent` allow-list is defense-in-depth (spec proves curated keys absent from prisma data object) |
| SC4 | Patient-submitted health data lands in `*AutoReportad*` staging fields only; curated clinical arrays are never modified | VERIFIED | `update-salud-staged.dto.ts` — only four `*AutoReportad*` keys declared; `updateSaludStaged` `pickPresent` allow-list is `['alergiasAutoReportadas','antecedentesAutoReportados','medicacionAutoReportada','tratamientosPreviosAutoReportados']` (`:277-282`); spec asserts `alergias`/`condiciones`/`medicacion` keys absent from prisma `data` object |
| CR-01 | Write method responses are scoped via a `select` to their safe field subset — no full `Paciente` row (portalTokenCifrado, curated clinical, CRM columns) is ever echoed back in the 200 PATCH response | VERIFIED | `updateContacto` `select` (`:258-267`) returns exactly 7 contact fields; `updateSaludStaged` `select` (`:289-295`) returns exactly 4 staged fields; neither select includes `portalToken`, `portalTokenCifrado`, `alergias`, `condiciones`, `etapaCRM`, CRM columns; confirmed in commit `ed568d8`; spec has explicit CR-01 assertions on `select` object |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | `portalIntentosFallidos` (Int @default(0)) + `portalBloqueadoHasta` (DateTime?) on Paciente | VERIFIED | Lines 220-221; column-aligned with existing portal block |
| `backend/src/prisma/migrations/20260630000000_portal_intentos_bloqueo/migration.sql` | Additive ALTER TABLE adding both columns | VERIFIED | `ALTER TABLE "Paciente" ADD COLUMN "portalBloqueadoHasta" TIMESTAMP(3), ADD COLUMN "portalIntentosFallidos" INTEGER NOT NULL DEFAULT 0` |
| `backend/src/modules/paciente-portal/dto/update-contacto-portal.dto.ts` | Contact-only optional DTO; no clinical/CRM fields | VERIFIED | 7 contact fields, all `@IsOptional()`; grep for `obraSocial\|alergias\|condiciones\|etapaCRM\|flujo\|dni` → no matches |
| `backend/src/modules/paciente-portal/dto/update-salud-staged.dto.ts` | *AutoReportad* staging DTO; no curated clinical keys | VERIFIED | 4 fields (`alergiasAutoReportadas`, `antecedentesAutoReportados`, `medicacionAutoReportada`, `tratamientosPreviosAutoReportados`); no bare `alergias`/`condiciones`/`medicacion` |
| `backend/src/modules/paciente-portal/strategies/portal-jwt.strategy.ts` | Named `'portal-jwt'` strategy; `ignoreExpiration: false`; scope check; returns `{ pacienteId }` | VERIFIED | `PassportStrategy(Strategy, 'portal-jwt')` at line 24; `ignoreExpiration: false` at line 29; `payload?.scope !== 'portal-paciente'` at line 35; returns `{ pacienteId: paciente.id }` |
| `backend/src/modules/paciente-portal/guards/portal-jwt.guard.ts` | `AuthGuard('portal-jwt')` | VERIFIED | `extends AuthGuard('portal-jwt')` |
| `backend/src/modules/paciente-portal/paciente-portal.service.ts` | Hash lookup, lock, JWT emission, confined writes; >90 lines | VERIFIED | 335 lines; all methods implemented (preVerify, getDatos, verificar, updateContacto, updateSaludStaged, pickPresent, hashToken, findByRawToken) |
| `backend/src/modules/paciente-portal/paciente-portal.service.spec.ts` | Unit coverage for lock, reset, no-DNI, hash lookup, write confinement, CR-01 | VERIFIED | 15 tests across 6 describe blocks; 15/15 PASS |
| `backend/src/modules/paciente-portal/paciente-portal.controller.ts` | Public + guarded routes; strict throttle; whitelist pipes; no class-level guard | VERIFIED | `@Throttle({ default: { ttl: 60000, limit: 20 } })` at class level (line 39); no class-level `@UseGuards`; `@UseGuards(PortalJwtGuard)` on GET, PATCH datos-personales, PATCH salud; `new ValidationPipe({ whitelist: true })` on both write routes |
| `backend/src/modules/paciente-portal/paciente-portal.module.ts` | Registers PassportModule + JwtModule + controller + service + strategy + guard | VERIFIED | `PassportModule`, `JwtModule.register({ secret: process.env.JWT_SECRET })` in imports; all 4 providers present |
| `backend/src/app.module.ts` | `PacientePortalModule` in imports array | VERIFIED | Import line 34 + imports array line 96 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `paciente-portal.service.ts` | `prisma.paciente` (hash lookup) | `findUnique({ where: { portalToken: sha256(rawToken) } })` | WIRED | `hashToken` helper at line 42; `findByRawToken` uses hashed value at line 52 |
| `paciente-portal.service.ts` | `JwtService` | `this.jwt.sign({ sub, scope: 'portal-paciente' }, { expiresIn: '45m' })` | WIRED | Line 230-233; `JwtService` injected in constructor; spec mock verifies `scope: 'portal-paciente'` in sign payload |
| `portal-jwt.strategy.ts` | scope claim check | `validate() rejects payload.scope !== 'portal-paciente'` | WIRED | Line 35 `if (payload?.scope !== 'portal-paciente') { return null; }` |
| `paciente-portal.controller.ts` | write routes | `@Body(new ValidationPipe({ whitelist: true }))` | WIRED | Lines 86 and 102; `forbidNonWhitelisted` absent (grep: 0 occurrences) |
| `paciente-portal.controller.ts` | authenticated routes | `@UseGuards(PortalJwtGuard)` | WIRED | Lines 68, 82, 98 — per-route only, NOT at class level |
| `app.module.ts` | `PacientePortalModule` | import + imports array | WIRED | Lines 34 + 96 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `getDatos()` | `paciente` + `proximaCirugia` | `prisma.paciente.findUnique({ select: {...} })` + `prisma.cirugia.findFirst()` | Yes — explicit select returns contact + staged fields, never curated clinical | FLOWING |
| `updateContacto()` response | contact fields | `prisma.paciente.update({ data, select: {7 contact fields} })` | Yes — select scopes response to safe contact subset only | FLOWING |
| `updateSaludStaged()` response | staged fields | `prisma.paciente.update({ data, select: {4 AutoReportad fields} })` | Yes — select scopes response to 4 staged fields only | FLOWING |
| `pickPresent()` data object | allowed field map | `UpdateContactoPortalDto` / `UpdateSaludStagedDto` keys | Yes — allow-list enforced; `null` dropped (WR-02 fix); curated keys cannot enter | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit spec — 15 cases covering lock, JWT, write confinement, CR-01 selects | `cd backend && npm run test -- paciente-portal.service --no-coverage` | 15/15 PASS (1.515 s) | PASS |
| Backend build compiles with module registered | `cd backend && npm run build` | exit 0 — `nest build` succeeded | PASS |
| `portalIntentosFallidos` + `portalBloqueadoHasta` in schema | `grep portalIntentosFallidos src/prisma/schema.prisma` | Lines 220-221 found | PASS |
| Contact DTO has no clinical/CRM fields | `grep -E "obraSocial\|alergias\|etapaCRM\|flujo\|dni" update-contacto-portal.dto.ts` | No matches | PASS |
| Staged-health DTO has no curated clinical keys | `grep "^  alergias\|^  condiciones\|^  medicacion\b" update-salud-staged.dto.ts` | No matches | PASS |
| CR-01: both write methods have `select` | Inspect service.ts:255-267 and 286-295 | Both `prisma.paciente.update` calls include explicit `select` that excludes portalToken*/curated-clinical/CRM | PASS |
| `forbidNonWhitelisted` absent from controller | `grep forbidNonWhitelisted paciente-portal.controller.ts` | 0 occurrences | PASS |
| `ValidationPipe({ whitelist: true })` present on write routes | `grep -c "ValidationPipe({ whitelist: true })" paciente-portal.controller.ts` | 4 matches (2 in code, 2 in docblock comments) — both write routes covered | PASS |
| `PacientePortalModule` registered in AppModule | `grep PacientePortalModule src/app.module.ts` | Lines 34 + 96 | PASS |
| HTTP-level throttle enforcement (20/min) | Requires live server + Redis | Cannot verify without running server | SKIP (human needed) |

---

### Requirements Coverage

| Requirement | Plans | Description | Status | Evidence |
|-------------|-------|-------------|--------|----------|
| PORTAL-01 | 54-02, 54-03 | Persistent reutilizable portal link; token stored hashed, accessed without login | SATISFIED | `preVerify` + `verificar` endpoints; SHA-256 lookup by `portalToken`; 3-strike lock (service.ts + spec); public controller routes under throttle |
| PORTAL-04 | 54-01, 54-02, 54-03 | Patient cannot edit obra social or sensitive clinical fields from portal | SATISFIED | `UpdateContactoPortalDto` omits obraSocial/clinical fields; `ValidationPipe({ whitelist: true })` on write routes; `pickPresent` allow-list in service; spec proves curated keys dropped |
| PORTAL-06 | 54-01, 54-02, 54-03 | Patient self-reported health data stored staged (AutoReportad fields), never overwrites curated clinical data | SATISFIED | `UpdateSaludStagedDto` confined to 4 `*AutoReportad*` keys; `updateSaludStaged` prisma `data` object built from same 4-key allow-list; `select` on write response excludes curated `alergias`/`condiciones`/`medicacion`; spec confirms |

No orphaned requirements — PORTAL-01, PORTAL-04, PORTAL-06 are the only IDs mapped to Phase 54 in REQUIREMENTS.md, and all three appear in at least one plan's `requirements:` field.

---

### CR-01 Fix Verification (Critical Code Review Finding)

The REVIEW.md identified CR-01 as a BLOCKER: both `updateContacto` and `updateSaludStaged` originally returned a bare `prisma.paciente.update()` with no `select`, silently leaking the full Paciente row in the 200 PATCH response body — including `portalTokenCifrado`, curated clinical arrays, and CRM columns.

**Fix is confirmed in current source (commit `ed568d8`):**

`updateContacto` (service.ts:255-267):
- `select` present; returns only: `telefono`, `telefonoAlternativo`, `email`, `direccion`, `contactoEmergenciaNombre`, `contactoEmergenciaTelefono`, `contactoEmergenciaRelacion`
- Fields NOT in select: `portalToken`, `portalTokenCifrado`, `alergias`, `condiciones`, `medicacion`, `etapaCRM`, all CRM columns

`updateSaludStaged` (service.ts:286-295):
- `select` present; returns only: `alergiasAutoReportadas`, `antecedentesAutoReportados`, `medicacionAutoReportada`, `tratamientosPreviosAutoReportados`
- Fields NOT in select: `portalToken`, `portalTokenCifrado`, all curated clinical fields, all CRM columns

Spec coverage for CR-01: 2 regression tests (`'CR-01: scopes the returned payload via select to safe contact fields only'` and `'CR-01: scopes the returned payload via select to the four staged keys only'`) — both PASS in the 15/15 run.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TBD/FIXME/XXX/PLACEHOLDER found in any portal module file | — | — |
| `strategies/portal-jwt.strategy.ts:35-37` | — | `return null` in validate() | Info only | This is intentional Passport behavior — returning null causes the guard to reject with 401. Not a stub. |
| `paciente-portal.service.ts:108` | — | `throw new NotFoundException()` with no message body | Info only | Intentional — D-07 requires no patient data disclosure on unknown token; empty 404 is correct. |

No blockers. No unreferenced debt markers.

---

### Human Verification Required

### 1. HTTP-Level Whitelist Stripping (Silent Drop)

**Test:** Make a PATCH request to `POST /paciente-portal/public/:token/verificar` to get a portal JWT, then PATCH `/paciente-portal/public/datos-personales` with body `{ "telefono": "111", "alergias": ["x"], "etapaCRM": "GANADO", "dni": "12345678" }`
**Expected:** 200 response; response body contains `{ "telefono": "111" }` only (no `alergias`/`etapaCRM`/`dni` keys); checking the DB row confirms `alergias`, `etapaCRM`, `dni` columns unchanged
**Why human:** ValidationPipe({ whitelist: true }) strip behavior is verifiable by code reading, but the HTTP-layer pipe registration and strip-then-200 (not 400) behavior can only be confirmed with a live server + DB + valid portal JWT in the Authorization header.

### 2. Public Route Throttle Enforcement

**Test:** Send 21 rapid requests to `GET /paciente-portal/public/:some-token` within 60 seconds
**Expected:** First 20 return 200 or 404; 21st returns 429 from the ThrottlerGuard
**Why human:** Rate-limit enforcement requires a running NestJS server with Redis (the project's ThrottlerModule uses Redis via BullMQ config). Cannot replicate with static analysis.

### 3. Staff JWT Rejected on Portal-Guarded Routes

**Test:** Obtain a valid staff JWT (login as admin/professional), then call `GET /paciente-portal/public` with `Authorization: Bearer <staff-JWT>`
**Expected:** 401 Unauthorized — the `portal-jwt` strategy's `validate()` returns null because `payload.scope !== 'portal-paciente'`, causing Passport to reject
**Why human:** The code path is clear (strategy line 35), but exercising the full Passport/Express authentication pipeline requires a running server.

---

### Gaps Summary

None. All 5 must-haves are VERIFIED. The 3 human items above are behavioral confirmations of code that is structurally sound and spec-covered at unit level. They are not blocking gaps — they are integration-level UAT checks that require a live server.

The critical code-review BLOCKER (CR-01) has been fixed in commit `ed568d8`, is confirmed in source, and has regression specs in the passing 15-test suite.

---

_Verified: 2026-06-30T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
