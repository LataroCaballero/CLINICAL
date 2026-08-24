---
phase: 61-backend-schema-decoupling-e-indicaciones
verified: 2026-07-17T15:30:00Z
status: passed
score: 5/5 must-haves verified (4/4 ROADMAP Success Criteria + the 61-04 gap-closure additive must-have, now closed by 61-05)
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Existe un test que ejercita la forma real del select de getKanban contra computePasosCrm y falla si se reintroduce la truncacion (take:1) en consentimientosFirmados (61-04-PLAN.md must_have #3) — closed by 61-05's source-shape guard, independently falsification-tested by this verifier"
  gaps_remaining: []
  regressions: []
---

# Phase 61: Backend — Schema, Decoupling e Indicaciones Verification Report

**Phase Goal:** El backend almacena correctamente el timestamp de lectura de indicaciones en el perfil del paciente, desacopla `firmarConsentimiento` de cualquier estado de indicaciones, y ajusta `computePasosCrm` para derivar el paso `indicacionesPreop` del campo del perfil.
**Verified:** 2026-07-17T15:30:00Z
**Status:** passed
**Re-verification:** Yes — after 61-05 gap-closure plan (durable take:1 source-shape guard), superseding the prior 61-VERIFICATION.md (gaps_found, 4/5)

## Goal Achievement

### Observable Truths

| # | Truth (Success Criterion) | Status | Evidence |
|---|---------|------------|----------|
| 1 | SC#1: `firmarConsentimiento` acepta y procesa la firma sin requerir `indicacionesLeidas=true` ni leer/escribir `ConsentimientoFirmado.indicacionesLeidasAt` | VERIFIED | Directly read `paciente-portal.service.ts:562-664` — no `dto.indicacionesLeidas` guard anywhere in the method; the `consentimientoFirmado.create` data block (lines ~630-638) contains no `indicacionesLeidasAt` key, with an explicit comment documenting the removal per CONS-11/D-02. `grep -n "indicacionesLeidas\b" backend/src --include="*.ts"` excluding spec files: zero matches in production code. DTO declares only `zonaId` + `signaturePngDataUrl`. |
| 2 | SC#2: existe un endpoint portal-scoped que registra el acuse con timestamp en `Paciente.indicacionesLeidasAt` | VERIFIED | `paciente-portal.controller.ts:173-175` — `@Post('indicaciones/acuse')` under the controller's `PortalJwtGuard`, resolves `req.user.pacienteId` only (no client-supplied id). Service `registrarAcuseIndicaciones` (line 675) uses `prisma.paciente.updateMany({ where: { id, indicacionesLeidasAt: null }, data: { indicacionesLeidasAt: new Date() } })` — set-once. Re-ran `paciente-portal.service.spec.ts` directly: 57/57 tests PASS (includes `registrarAcuseIndicaciones` describe block). |
| 3 | SC#3: `computePasosCrm` marca `indicacionesPreop` completo a partir de `Paciente.indicacionesLeidasAt != null`, no del acto de firma — con fallbacks legacy intactos en el sistema cableado | VERIFIED | `crm-steps.helper.ts:105-108` — primary source `p.indicacionesLeidasAt`, OR'd with 2 legacy fallbacks, read directly and confirmed correct. `pacientes.service.ts:679-681` `consentimientosFirmados` select has no `take`/`orderBy` (confirmed by direct read, not grep-only) — the full array reaches `computePasosCrm`'s `.some()` call, so Fallback 1 (legacy v1.12 read-receipt on a non-latest signed-zona row) is reachable for multi-zone patients. Re-ran `pacientes.service.spec.ts` directly: 13/13 PASS (includes 3 boundary tests: A/B/C). |
| 4 | SC#4: la migración sigue el patrón pgBouncer (`prisma diff + db execute + migrate resolve`) y no rompe registros de consentimiento existentes | VERIFIED | `migration.sql` (`20260708000000_add_indicaciones_leidas`) read directly — exactly two additive/relax statements: `ALTER TABLE "Paciente" ADD COLUMN "indicacionesLeidasAt" TIMESTAMP(3)` (no default, no rewrite) and `ALTER TABLE "ConsentimientoFirmado" ALTER COLUMN "indicacionesLeidasAt" DROP NOT NULL` (existing rows untouched, no UPDATE/DELETE). `schema.prisma` matches: `Paciente.indicacionesLeidasAt` line 217, `ConsentimientoFirmado.indicacionesLeidasAt` line 1438, both `DateTime?`. |
| 5 | (61-04/61-05 additive must-have) Existe un guard durable que corre con `npm test` y falla si se reintroduce `take`/`orderBy` en el select `consentimientosFirmados` de `getKanban`, sin depender del `rg` ad hoc del 61-04-PLAN | **VERIFIED (gap closed)** | `pacientes.service.spec.ts:394-431` — new `describe('getKanban consentimientosFirmados select — source-shape guard (take regression, INDIC-04)')` reads the real `pacientes.service.ts` with `readFileSync(join(__dirname, 'pacientes.service.ts'))`, isolates the `consentimientosFirmados: { ... }` block by brace-balance from its opening brace (correctly excluding the preceding multi-line comment that contains the literal text "take:1"), and asserts no `take`/`orderBy` plus presence of `firmadoAt`/`indicacionesLeidasAt`. **I independently falsified this**, not just re-read the SUMMARY's claim: reintroduced `take: 1, orderBy: { firmadoAt: 'desc' }` into the production select in my own tool call, re-ran `npx jest --runTestsByPath src/modules/pacientes/pacientes.service.spec.ts` — the new guard **FAILED** with a clear assertion diff showing the injected `take: 1`, while the pre-existing 61-04 boundary test suite remained green (12 passed, 1 failed = 13 total, confirming the guard is the only test that catches this regression). Reverted the scratch edit via `git checkout --`, confirmed `git status --porcelain` clean on the file, then re-ran the suite: 13/13 PASS restored. The guard is a plain `describe`/`it` in `pacientes.service.spec.ts`, matched by the repo's default Jest `testMatch` (`npm test` → `jest`, no exclusion patterns), so it is wired into the normal test run — not an opt-in or separately-invoked script. |

**Score:** 5/5 must-haves verified. All 4 ROADMAP Success Criteria are VERIFIED, and the additional durable-regression-guard must-have carried over from the 61-04 gap-closure plan (previously FAILED in the prior verification run) is now VERIFIED, closed by plan 61-05.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | `Paciente.indicacionesLeidasAt DateTime?` + `ConsentimientoFirmado.indicacionesLeidasAt DateTime?` | VERIFIED | Lines 217, 1438 — exact match, direct read |
| `backend/src/prisma/migrations/20260708000000_add_indicaciones_leidas/migration.sql` | pgBouncer additive/DROP NOT NULL migration | VERIFIED | Both ALTER statements present, no UPDATE/DELETE, direct read |
| `backend/src/modules/paciente-portal/paciente-portal.service.ts` | `firmarConsentimiento` decoupled + `registrarAcuseIndicaciones` set-once | VERIFIED | Both methods read directly, confirmed correct |
| `backend/src/modules/paciente-portal/paciente-portal.controller.ts` | `POST indicaciones/acuse` under `PortalJwtGuard` | VERIFIED | Route present, guard applies, identity from JWT only |
| `backend/src/modules/paciente-portal/dto/firmar-consentimiento-portal.dto.ts` | DTO without `indicacionesLeidas` | VERIFIED | Only `zonaId` + `signaturePngDataUrl` |
| `backend/src/modules/pacientes/crm-steps.helper.ts` | `PacientePasosInput.indicacionesLeidasAt` + 3-source OR | VERIFIED | Read directly, unchanged and correct; test suite re-run PASS |
| `backend/src/modules/pacientes/pacientes.service.ts` | `getKanban` select without `take:1` truncation on `consentimientosFirmados` | VERIFIED | Lines 674-681 — no `take`/`orderBy`, only `select: { firmadoAt, indicacionesLeidasAt }`; direct read, not just grep |
| `backend/src/modules/pacientes/pacientes.service.spec.ts` | Boundary test + durable source-shape guard against `take:1` regression | **VERIFIED** | Boundary test (13→now with guard) passes; NEW source-shape guard (lines 394-431, added by 61-05) independently falsification-tested by this verifier — genuinely detects the regression the boundary test could not |
| `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` | cr-01 docstring corrected, validation present | VERIFIED | Unchanged from prior verification, spot-checked |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `paciente-portal.controller.ts` POST acuse | `registrarAcuseIndicaciones(req.user.pacienteId)` | `PortalJwtGuard` → `req.user.pacienteId` | WIRED | Confirmed by direct read |
| `registrarAcuseIndicaciones` | `prisma.paciente.updateMany` | `where indicacionesLeidasAt: null` (set-once) | WIRED | Confirmed exact where/data shape |
| `pacientes.service.ts getKanban` select | `computePasosCrm({ ..., indicacionesLeidasAt })` | select key → call arg | WIRED | Confirmed |
| `getKanban consentimientosFirmados` select | `computePasosCrm` Fallback 1 (`.some()`) | full array, no `take:1` | WIRED | Confirmed via direct read + falsification test (reintroduced take:1 myself, re-verified original state restored via clean `git status --porcelain`) |
| `pacientes.service.spec.ts` source-shape guard | `pacientes.service.ts` real select shape | `fs.readFileSync` + brace-balance isolation | **WIRED (gap closed)** | Independently falsified: guard FAILS when `take:1` is reintroduced in the real source, PASSES in the current correct state, and does not false-positive on the preceding comment containing literal "take:1" text. Runs under plain `npm test` (default Jest `testMatch`, no special invocation required). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `computePasosCrm` (indicacionesPreop primary source) | `p.indicacionesLeidasAt` | `getKanban` select → `Paciente.indicacionesLeidasAt` | Yes | FLOWING |
| `computePasosCrm` (indicacionesPreop fallback 1) | `p.consentimientosFirmados[].indicacionesLeidasAt` | `getKanban` select — full array, no `take:1` | Yes (all rows reach the helper) | FLOWING |
| `paciente-portal.controller.ts` acuse route | `req.user.pacienteId` | `PortalJwtGuard` / `portal-jwt.strategy.ts` | Yes | FLOWING |

### Behavioral Spot-Checks

All commands below were executed directly by this verifier in this session (not copied from SUMMARY.md narration).

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `getKanban` select has no `take: 1` on `consentimientosFirmados` (direct source read) | `sed -n '640,690p' pacientes.service.ts` | Confirmed: only `select: { firmadoAt: true, indicacionesLeidasAt: true }`, comment documents the intentional absence | PASS |
| `pacientes.service.spec.ts` full suite (incl. new source-shape guard) | `npx jest --runTestsByPath src/modules/pacientes/pacientes.service.spec.ts` | 13/13 PASS | PASS |
| Falsification: reintroduce `take: 1, orderBy: { firmadoAt: 'desc' }` in the real source, re-run suite | Python-scripted edit + `npx jest --runTestsByPath pacientes.service.spec.ts` | New source-shape guard FAILED (1 failed, 12 passed); boundary test remained green as expected | PASS (guard behaves exactly as claimed) |
| Revert scratch edit, confirm clean tree | `git checkout -- pacientes.service.ts && git status --porcelain` | Clean (no diff on the file) | PASS |
| Re-run suite after revert | `npx jest --runTestsByPath pacientes.service.spec.ts` | 13/13 PASS restored | PASS |
| `crm-steps.helper.spec.ts` + `paciente-portal.service.spec.ts` regression check | `npx jest --runTestsByPath src/modules/pacientes/crm-steps.helper.spec.ts src/modules/paciente-portal/paciente-portal.service.spec.ts` | 57/57 PASS | PASS |
| No stale `indicacionesLeidas` (boolean) in production code | `grep -rn "indicacionesLeidas\b" backend/src --include="*.ts"` excluding specs | Zero matches | PASS |
| Guard is wired into plain `npm test` (no special invocation) | `grep -A3 '"test"' package.json` | `"test": "jest"` — default `testMatch`, guard's `.spec.ts` file picked up automatically | PASS |

### Probe Execution

Step 7c: N/A — no `scripts/*/tests/probe-*.sh` conventions or phase-declared probes for this backend schema/service phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CONS-11 | 61-02 | Firmar el consentimiento se desacopla de las indicaciones | SATISFIED | SC#1 above |
| INDIC-03 | 61-01, 61-02 | El acuse de lectura de indicaciones se persiste en el perfil del paciente con fecha/hora | SATISFIED | SC#2 above |
| INDIC-04 | 61-03, 61-04, 61-05 | El paso `indicacionesPreop` del board CRM se computa a partir del acuse del perfil del paciente | SATISFIED | SC#3 above (correctness) + truth #5 above (durable regression protection, closed by 61-05) |

REQUIREMENTS.md traceability table cross-checked: `.planning/REQUIREMENTS.md` lines 16, 25-26, 59, 63-64 — CONS-11, INDIC-03, INDIC-04 all map to Phase 61 with status "Complete". No orphaned requirements for this phase.

### Anti-Patterns Found

None in files modified by this phase (61-01 through 61-05). No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers. The previously-flagged WARNING (boundary test over-claiming regression-detection capability) is resolved — the new source-shape guard genuinely provides that capability, independently confirmed by falsification.

### Human Verification Required

None. All truths for this phase are verifiable through static code analysis and live test execution (including a falsification test performed directly by this verifier, not simulated or trusted from SUMMARY narration).

### Gaps Summary

No gaps remain. All 4 ROADMAP Success Criteria are VERIFIED, and the single additive must-have carried over from the prior verification run (a durable, `npm test`-wired guard against `take:1` re-introduction in `getKanban`'s `consentimientosFirmados` select) is now VERIFIED — closed by gap-closure plan 61-05.

This verifier did not trust the 61-05-SUMMARY.md's claim of a successful falsification test at face value. It was reproduced independently in this session: the guard was shown to fail when `take:1`/`orderBy` is reintroduced into the real production select, and to pass (without false-positiving on the adjacent documentation comment containing the literal string "take:1") in the current, correct state. The scratch edit was reverted and the working tree confirmed clean before writing this report.

CONS-11, INDIC-03, and INDIC-04 are all SATISFIED with no orphaned requirements. Phase 61 goal is achieved.

---

_Verified: 2026-07-17T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
