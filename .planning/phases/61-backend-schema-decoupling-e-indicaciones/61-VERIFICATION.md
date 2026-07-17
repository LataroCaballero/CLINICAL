---
phase: 61-backend-schema-decoupling-e-indicaciones
verified: 2026-07-17T14:00:00Z
status: gaps_found
score: 4/5 must-haves verified (all 4 ROADMAP Success Criteria VERIFIED; 1 additional 61-04-PLAN must-have about test regression-detection is FAILED)
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/4
  gaps_closed:
    - "SC#3 fallback shadowing: getKanban's consentimientosFirmados select no longer truncates to take:1 — Fallback 1 (legacy v1.12 read-receipt on a non-latest signed-zona row) now reaches computePasosCrm correctly for multi-zone patients"
  gaps_remaining: []
  regressions: []
gaps:
  - truth: "Existe un test que ejercita la forma real del select de getKanban contra computePasosCrm y falla si se reintroduce la truncacion (take:1) en consentimientosFirmados (61-04-PLAN.md must_have #3)"
    status: failed
    reason: "Empirically falsified. I reintroduced `take: 1, orderBy: { firmadoAt: 'desc' }` into the consentimientosFirmados select in pacientes.service.ts, re-ran `npx jest --runTestsByPath src/modules/pacientes/pacientes.service.spec.ts`, and all 12 tests — including the 3 new boundary tests (Test A/B/C) — still PASSED. The boundary test mocks `prisma.paciente.findMany` directly with a hand-crafted array via `mockResolvedValue`; a Jest mock's return value is independent of the real Prisma `select`/`take` clause, so the test never actually exercises the production select object at all. This matches the SUMMARY's own disclosed limitation (61-04-SUMMARY.md 'Decisions Made' and 'TDD Gate Compliance' sections both admit this), but the PLAN's own must_have text and Task 2 acceptance criteria explicitly and specifically claim the test 'FALLA si se reintroduce take:1' — a claim I have now directly disproven by reproducing the exact scenario, not just trusting the SUMMARY's narrative. I reverted my scratch edit immediately after (confirmed via `git diff --stat` showing a clean tree)."
    artifacts:
      - path: "backend/src/modules/pacientes/pacientes.service.spec.ts"
        issue: "The 'getKanban -> computePasosCrm boundary (WR-01/SC#3)' describe block (lines 268-381) validates that computePasosCrm's mapping/OR logic is correct given a realistic multi-row payload, but cannot detect a re-introduced take:1/orderBy truncation in pacientes.service.ts's Prisma select, because prisma.paciente.findMany is fully mocked and its mockResolvedValue array is hand-written independent of the source's select clause."
    missing:
      - "A durable, automatically-run guard against take:1 re-introduction in this specific select. The only current guard is the ad hoc `rg -A4 \"consentimientosFirmados: {\" ... | rg -q \"take: 1\"` command inside 61-04-PLAN.md's <verify> block — this ran once during that plan's execution (and again during this verification) but is NOT wired into `npm test`, `npm run lint`, `.github/workflows/*.yml`, or any pre-commit hook, so it will not automatically catch a future regression."
      - "Either: (a) wire the grep check into a permanent CI/lint step (e.g. a custom ESLint rule, a package.json test script, or a workflow step), or (b) replace/augment the boundary test with something that actually exercises the real select shape (e.g. an integration test against a test DB, or a source-parsing assertion), or (c) accept the current state via an override, since the production code itself IS correct as of this verification and the underlying functional intent (no take:1 truncation) is met."
---

# Phase 61: Backend — Schema, Decoupling e Indicaciones Verification Report

**Phase Goal:** El backend almacena correctamente el timestamp de lectura de indicaciones en el perfil del paciente (`Paciente.indicacionesLeidasAt`, set-once), desacopla `firmarConsentimiento` de cualquier estado de indicaciones, y ajusta `computePasosCrm` para derivar el paso `indicacionesPreop` del campo del perfil (con fallbacks legacy de no-regresión).
**Verified:** 2026-07-17T14:00:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap closure (61-04 gap-closure plan, addressing the prior SC#3 fallback-shadowing finding)

## Goal Achievement

### Observable Truths

| # | Truth (Success Criterion) | Status | Evidence |
|---|---------|------------|----------|
| 1 | SC#1: `firmarConsentimiento` acepta y procesa la firma sin requerir `indicacionesLeidas=true` ni leer/escribir `ConsentimientoFirmado.indicacionesLeidasAt` | VERIFIED | `paciente-portal.service.ts:560-664` read directly — no `dto.indicacionesLeidas` guard, `consentimientoFirmado.create` data block has no `indicacionesLeidasAt` key (comment at line ~638 explicitly documents its removal per CONS-11/D-02). `grep -n "indicacionesLeidas\b" backend/src --include="*.ts"` excluding specs returns zero matches. DTO (`firmar-consentimiento-portal.dto.ts`) declares only `zonaId` + `signaturePngDataUrl`. |
| 2 | SC#2: existe un endpoint portal-scoped que registra el acuse con timestamp en `Paciente.indicacionesLeidasAt` | VERIFIED | `paciente-portal.controller.ts:172-175` — `@UseGuards(PortalJwtGuard) @Post('indicaciones/acuse')` resolves `req.user.pacienteId` only. Service (`paciente-portal.service.ts:675-682`) uses `prisma.paciente.updateMany({ where: { id, indicacionesLeidasAt: null }, data: { indicacionesLeidasAt: new Date() } })` — set-once. Unit tests exist (`paciente-portal.service.spec.ts:576-597`) and were re-run: PASS. |
| 3 | SC#3: `computePasosCrm` marca `indicacionesPreop` completo a partir de `Paciente.indicacionesLeidasAt != null`, no del acto de firma — con fallbacks legacy de no-regresión intactos en el sistema cableado | VERIFIED (gap closed) | Pure helper (`crm-steps.helper.ts:105-108`) unchanged and correct — primary source first, OR'd with 2 legacy fallbacks. **`getKanban`'s `consentimientosFirmados` select no longer has `take: 1`/`orderBy`** (`pacientes.service.ts:674-681`, confirmed by direct read: `rg -A6 "consentimientosFirmados: {" pacientes.service.ts` shows only `select: { firmadoAt: true, indicacionesLeidasAt: true }`, no truncation). This is the exact WR-01/SC#3 gap from the prior verification, now closed. Boundary test in `pacientes.service.spec.ts` (Test A: multi-zone patient with legacy receipt on a non-latest row → `indicacionesPreop` = completo) ran directly by me: **12/12 PASS**. |
| 4 | SC#4: la migración sigue el patrón pgBouncer (`prisma diff + db execute + migrate resolve`) y no rompe registros de consentimiento existentes | VERIFIED | `migration.sql` (`20260708000000_add_indicaciones_leidas`) contains exactly the two additive/relax ALTER statements (`ADD COLUMN`, `DROP NOT NULL`) — no UPDATE/DELETE. `schema.prisma` matches exactly (`Paciente.indicacionesLeidasAt` line 217, `ConsentimientoFirmado.indicacionesLeidasAt` line 1438, both `DateTime?`). |
| 5 | (61-04-PLAN must_have, additive to SC#3) Existe un test que ejercita la forma real del select de `getKanban` contra `computePasosCrm` y **falla si se reintroduce la truncación (take:1)** | ✗ FAILED | Empirically falsified — see Gaps below. The boundary test passes 12/12 both with and without `take: 1` in the source select, because it mocks `prisma.paciente.findMany` directly and never exercises the real select object. |

**Score:** 4/4 ROADMAP Success Criteria VERIFIED (phase goal, as literally worded in ROADMAP.md, is achieved in the current codebase). 1 additional must-have from the 61-04 gap-closure plan's own frontmatter (a durable regression-detecting test) is FAILED — the underlying production defect it targeted (take:1 truncation) IS fixed and verified correct right now, but the specific mechanism promised to guard against a *future* re-introduction does not function as claimed.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | `Paciente.indicacionesLeidasAt DateTime?` + `ConsentimientoFirmado.indicacionesLeidasAt DateTime?` | VERIFIED | Lines 217, 1438 — exact match |
| `backend/src/prisma/migrations/20260708000000_add_indicaciones_leidas/migration.sql` | pgBouncer additive/DROP NOT NULL migration | VERIFIED | Both ALTER statements present, no UPDATE/DELETE |
| `backend/src/modules/paciente-portal/paciente-portal.service.ts` | `firmarConsentimiento` decoupled + `registrarAcuseIndicaciones` set-once | VERIFIED | Both methods read directly, confirmed correct |
| `backend/src/modules/paciente-portal/paciente-portal.controller.ts` | `POST indicaciones/acuse` under `PortalJwtGuard` | VERIFIED | Route present, per-route guard, identity from JWT only |
| `backend/src/modules/paciente-portal/dto/firmar-consentimiento-portal.dto.ts` | DTO without `indicacionesLeidas` | VERIFIED | Only `zonaId` + `signaturePngDataUrl` |
| `backend/src/modules/pacientes/crm-steps.helper.ts` | `PacientePasosInput.indicacionesLeidasAt` + 3-source OR | VERIFIED | Unchanged from prior verification, still correct; 27/27 unit tests re-run and PASS |
| `backend/src/modules/pacientes/pacientes.service.ts` | `getKanban` select without `take:1` truncation on `consentimientosFirmados` | VERIFIED (gap closed) | Lines 674-681 — `take: 1`/`orderBy` removed, comment documents WR-01/SC#3/T-61-10 rationale; only `firmadoAt`/`indicacionesLeidasAt` selected |
| `backend/src/modules/pacientes/pacientes.service.spec.ts` | Boundary test getKanban → computePasosCrm covering multi-zone legacy receipt | PARTIAL | Test exists, passes (12/12), but does NOT detect take:1 re-introduction as its own acceptance criteria claims (see gap) |
| `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` | cr-01 docstring corrected, validation present | VERIFIED | Unchanged from prior verification |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `paciente-portal.controller.ts` POST acuse | `registrarAcuseIndicaciones(req.user.pacienteId)` | `PortalJwtGuard` → `req.user.pacienteId` | WIRED | Confirmed by direct read |
| `registrarAcuseIndicaciones` | `prisma.paciente.updateMany` | `where indicacionesLeidasAt: null` (set-once) | WIRED | Confirmed exact where/data shape |
| `pacientes.service.ts getKanban` select | `computePasosCrm({ ..., indicacionesLeidasAt })` | select key → call arg | WIRED | Confirmed |
| `getKanban consentimientosFirmados` select | `computePasosCrm` Fallback 1 (`.some()`) | full array, no `take:1` | WIRED (fixed) | Confirmed via direct read + falsification test (reintroduced take:1, re-verified original state restored via clean `git diff`) |
| `pacientes.service.spec.ts` boundary test | `pacientes.service.ts` select shape | `prisma.paciente.findMany` mock | NOT WIRED (as a regression guard) | The mock bypasses the real select entirely — see gap |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `computePasosCrm` (indicacionesPreop primary source) | `p.indicacionesLeidasAt` | `getKanban` select → `Paciente.indicacionesLeidasAt` | Yes | FLOWING |
| `computePasosCrm` (indicacionesPreop fallback 1) | `p.consentimientosFirmados[].indicacionesLeidasAt` | `getKanban` select — full array, no `take:1` | Yes (all rows now reach the helper) | FLOWING (was HOLLOW in prior verification, now fixed) |
| `paciente-portal.controller.ts` acuse route | `req.user.pacienteId` | `PortalJwtGuard` / `portal-jwt.strategy.ts` | Yes | FLOWING |

### Behavioral Spot-Checks

Live test execution was possible in this environment (unlike the prior verification run, `backend/node_modules` was present/restored and Jest ran to completion).

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `getKanban` select has no `take: 1` on `consentimientosFirmados` | `rg -A6 "consentimientosFirmados: {" pacientes.service.ts \| rg -q "take: 1"` | NO_TAKE_PASS | PASS |
| `pacientes.service.spec.ts` full suite (incl. 3 new boundary tests) | `npx jest --runTestsByPath src/modules/pacientes/pacientes.service.spec.ts` | 12/12 PASS | PASS |
| `crm-steps.helper.spec.ts` full suite (unchanged) | `npx jest --runTestsByPath src/modules/pacientes/crm-steps.helper.spec.ts` | 27/27 PASS | PASS |
| Falsification: re-introduce `take: 1, orderBy: { firmadoAt: 'desc' }` in source, re-run boundary tests | scratch edit + `npx jest --runTestsByPath pacientes.service.spec.ts`, then revert (confirmed clean via `git diff --stat`) | 12/12 PASS (unchanged — test did NOT fail) | FAIL (disproves the must-have's specific "falla si se reintroduce take:1" claim) |
| No stale `indicacionesLeidas` (boolean) in production code | `grep -rn "indicacionesLeidas\b" backend/src --include="*.ts"` excluding specs | Zero matches | PASS |
| Task commits exist in git history | `git show a4cb2e9 --stat`, `git show bbbeb6e --stat` | Both present, scoped exactly as claimed (5 lines changed in service, 121 lines added in spec) | PASS |

### Probe Execution

Step 7c: N/A — no `scripts/*/tests/probe-*.sh` conventions or phase-declared probes for this backend schema/service phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CONS-11 | 61-02 | Firmar el consentimiento se desacopla de las indicaciones | SATISFIED | SC#1 above |
| INDIC-03 | 61-01, 61-02 | El acuse de lectura de indicaciones se persiste en el perfil del paciente con fecha/hora | SATISFIED | SC#2 above |
| INDIC-04 | 61-03, 61-04 | El paso `indicacionesPreop` del board CRM se computa a partir del acuse del perfil del paciente | SATISFIED | SC#3 above — the prior PARTIALLY SATISFIED wiring gap (take:1 truncation) is now closed and directly verified in the wired system. The one remaining issue (truth #5 above) concerns test durability for future regressions, not current correctness of the requirement's behavior. |

REQUIREMENTS.md traceability table cross-checked: CONS-11, INDIC-03, INDIC-04 all map to Phase 61 with status "Complete", no orphaned requirements for this phase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/src/modules/pacientes/pacientes.service.spec.ts` | 268-381 | Boundary test's acceptance criteria over-claims regression-detection capability the mocked-Prisma approach cannot deliver | WARNING | Does not affect current correctness (production select is fixed and verified); does mean a future accidental re-introduction of `take:1` in this select would NOT be caught by `npm test` — only by manually re-running the ad hoc `rg` command from 61-04-PLAN.md's `<verify>` block, which is not wired into CI |

No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers found in any file modified across all 4 plans of this phase.

### Human Verification Required

None required for the ROADMAP-level truths — all are verifiable through static code analysis, live test execution, and a falsification test I performed directly (not simulated). The one open item (truth #5 / gap above) is also fully resolved through direct evidence, not something requiring human judgment to determine truth — it needs a human **decision** (fix vs. override), not human **testing**.

### Gaps Summary

**The core phase goal is achieved.** All 4 ROADMAP Success Criteria are VERIFIED in the current codebase: `firmarConsentimiento` is fully decoupled from indicaciones state (SC#1), the portal-scoped set-once acuse endpoint exists and works (SC#2), `computePasosCrm` correctly derives `indicacionesPreop` from `Paciente.indicacionesLeidasAt` with both legacy fallbacks now reliably reachable in the wired `getKanban` system (SC#3 — this closes the gap from the prior verification run), and the migration follows the pgBouncer pattern without touching existing data (SC#4). CONS-11, INDIC-03, and INDIC-04 are all SATISFIED.

**One narrow, non-blocking gap remains**, sourced from the 61-04 gap-closure plan's own frontmatter (an additive must-have, not a ROADMAP SC): the plan promised a test that "falla si se reintroduce la truncación (take:1)" as a durable regression guard. I directly falsified this claim by temporarily reintroducing `take: 1` into the production select and re-running the test suite — all 12 tests, including the 3 new boundary tests, still passed. This is because the test mocks `prisma.paciente.findMany` with a hand-crafted array independent of the real Prisma `select` clause, so it validates `computePasosCrm`'s wiring/mapping logic correctly but cannot detect a select-shape regression. The 61-04-SUMMARY.md candidly discloses this exact limitation in its own "Decisions Made" and "TDD Gate Compliance" sections — this is not a concealed defect, but the plan's `must_have` and `acceptance_criteria` text still asserts a capability the test does not have, and no CI/lint step currently substitutes for it (the only guard is an ad hoc `rg` command in the plan's `<verify>` block, run manually).

**This looks intentional/disclosed-but-unresolved** rather than concealed. Two paths forward:
1. **Fix**: add a durable guard — e.g., a small ESLint custom rule or a source-parsing Jest test (`fs.readFileSync` + regex/AST check that the `consentimientosFirmados` select block has no `take` key) wired into the normal `npm test`/CI run, replacing the reliance on manually re-running the ad hoc grep.
2. **Override**: accept that the current state (production code correct + a documented, transparent limitation) is sufficient, since the functional intent of WR-01/SC#3 is fully met right now.

**Override suggestion** (if the developer wants to accept this and close the phase):
```yaml
overrides:
  - must_have: "Existe un test que ejercita la forma real del select de getKanban contra computePasosCrm y falla si se reintroduce la truncacion (take:1)"
    reason: "Production code is verified correct (no take:1 in the select, confirmed by direct read and a live falsification test). The boundary test validates computePasosCrm wiring/mapping correctness given a realistic multi-row payload but cannot detect select-shape regressions due to full Prisma mocking — a known, disclosed limitation of this test approach. The ad hoc grep check in 61-04-PLAN.md's <verify> block is accepted as the interim guard; a durable CI-wired guard is deferred."
    accepted_by: "{name}"
    accepted_at: "{ISO timestamp}"
```

---

_Verified: 2026-07-17T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
