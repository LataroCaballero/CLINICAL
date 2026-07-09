---
phase: 61-backend-schema-decoupling-e-indicaciones
verified: 2026-07-09T01:06:01Z
status: gaps_found
score: 3/4 must-haves verified (SC#3 partially verified — primary source correct, legacy-fallback wiring has a pre-existing regression path)
overrides_applied: 0
gaps:
  - truth: "Los dos fallbacks legacy (ConsentimientoFirmado.indicacionesLeidasAt, Paciente.indicacionesEnviadas) se conservan para no regresionar pacientes v1.12/pre-v1.12 (61-03-PLAN.md must_have; part of SC#3/INDIC-04 non-regression guarantee, D-04)"
    status: partial
    reason: "computePasosCrm's pure helper correctly implements the 3-source OR with Paciente.indicacionesLeidasAt as primary (verified in code + unit tests). However, getKanban's Prisma select for consentimientosFirmados uses `take: 1, orderBy: { firmadoAt: 'desc' }` (pacientes.service.ts:674-678), which only returns the patient's MOST RECENT signed-zona row to the helper. A patient can legally have multiple ConsentimientoFirmado rows (one per zona — no re-sign guard is per-zona, not per-patient; schema has no unique/limit on rows per patient). Any patient who (a) has a legacy v1.12 indicacionesLeidasAt timestamp on an OLDER signed-zona row, and (b) signs ANY additional zona consent after Phase 61 ships (new rows always leave indicacionesLeidasAt NULL per D-01/D-02), will have the legacy timestamp shadowed: the newest row (NULL) is the only one the helper's `.some()` sees, so Fallback 1 silently stops matching and indicacionesPreop can flip from completo to pendiente for an already-acknowledged patient. This is the WR-01 finding from 61-REVIEW.md, confirmed as a genuine code-review finding by reading pacientes.service.ts directly (not just trusting the review doc)."
    artifacts:
      - path: "backend/src/modules/pacientes/pacientes.service.ts"
        issue: "getKanban select at line 674-678 truncates consentimientosFirmados to take:1 (most recent only), which defeats the Fallback-1 non-regression path the phase's own crm-steps.helper.ts:105-108 (.some() over an array) and 61-03-PLAN.md must_haves rely on. This truncation predates Phase 61 (confirmed via `git show 149dec2 --stat`, which shows the phase-61 diff to this file added only 2 lines — the indicacionesLeidasAt select key and call arg — and did not touch the pre-existing take:1 clause), but Phase 61's D-04 design newly depends on this data path holding for its non-regression guarantee, and no test exercises the getKanban -> computePasosCrm integration boundary to catch it."
    missing:
      - "Remove `take: 1` from the consentimientosFirmados select in getKanban (or add a second filtered sub-select scoped to indicacionesLeidasAt != null) so the helper's .some() sees every signed-zona row for the patient, per the fix already proposed in 61-REVIEW.md WR-01."
      - "An integration-level test (or an extended crm-steps.helper caller test) that exercises getKanban's actual select shape against computePasosCrm to catch future truncation regressions at this boundary — none currently exists (pacientes.service.spec.ts does not exist)."
---

# Phase 61: Backend — Schema, Decoupling e Indicaciones Verification Report

**Phase Goal:** El backend almacena correctamente el timestamp de lectura de indicaciones en el perfil del paciente, desacopla `firmarConsentimiento` de cualquier estado de indicaciones, y ajusta `computePasosCrm` para derivar el paso `indicacionesPreop` del campo del perfil.
**Verified:** 2026-07-09T01:06:01Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (Success Criterion) | Status | Evidence |
|---|---------|------------|----------|
| 1 | SC#1: `firmarConsentimiento` acepta y procesa la firma sin requerir `indicacionesLeidas=true` ni leer/escribir `ConsentimientoFirmado.indicacionesLeidasAt` | VERIFIED | `paciente-portal.service.ts:560-664` — no guard string `Debe confirmar que ha leido las indicaciones` anywhere in the file; `consentimientoFirmado.create` data block (line ~640-650) has no `indicacionesLeidasAt` key; only remaining `indicacionesLeidasAt: new Date()` write is inside the unrelated `registrarAcuseIndicaciones` method writing to `Paciente`, not `ConsentimientoFirmado`. DTO (`firmar-consentimiento-portal.dto.ts`) declares only `zonaId` + `signaturePngDataUrl`, no `indicacionesLeidas` field anywhere in production code (`grep` confirms zero matches outside `.spec.ts` regression-test comments). |
| 2 | SC#2: existe un endpoint portal-scoped que registra el acuse con timestamp en `Paciente.indicacionesLeidasAt` | VERIFIED | `paciente-portal.controller.ts:172-175` — `@UseGuards(PortalJwtGuard) @Post('indicaciones/acuse') registrarAcuseIndicaciones(@Req() req: PortalRequest) { return this.service.registrarAcuseIndicaciones(req.user.pacienteId); }`. Route declared as a static path BEFORE the `:token` param routes are irrelevant here (route order confirmed correct — `indicaciones/acuse` sits among the other guarded static routes, no shadowing risk since Express matches static segments before params of different methods/paths). Service method (`paciente-portal.service.ts:675-682`) uses `prisma.paciente.updateMany({ where: { id: pacienteId, indicacionesLeidasAt: null }, data: { indicacionesLeidasAt: new Date() } })` — set-once idempotent, pacienteId resolved exclusively from JWT (`req.user.pacienteId`), never from `@Param`/`@Body`. Unit tests exist for both first-acuse and idempotent-retry cases (`paciente-portal.service.spec.ts:576-597`). |
| 3 | SC#3: `computePasosCrm` marca `indicacionesPreop` completo a partir de `Paciente.indicacionesLeidasAt != null`, no del acto de firma | PARTIAL | Pure helper VERIFIED correct: `crm-steps.helper.ts:105-108` — `p.indicacionesLeidasAt != null` is the first operand of the OR, ahead of both legacy fallbacks; unit-tested for primary-only, each fallback individually, and all-absent cases (`crm-steps.helper.spec.ts:199-228`). `getKanban` VERIFIED to select and pass the new field (`pacientes.service.ts:662, 749`). **However**, the non-regression guarantee (both legacy fallbacks preserved) that this same success criterion's supporting must-have commits to is undermined by a wiring defect: `getKanban`'s `consentimientosFirmados` select uses `take: 1, orderBy: { firmadoAt: 'desc' }` (`pacientes.service.ts:674-678`), which can shadow Fallback 1 for patients with multiple signed-zona rows where the legacy read-receipt lives on a non-latest row. See Gap below. |
| 4 | SC#4: la migración sigue el patrón pgBouncer (`prisma diff + db execute + migrate resolve`) y no rompe registros de consentimiento existentes | VERIFIED | `migration.sql` contains exactly the two additive/relax ALTER statements documented in the plan (`ALTER TABLE "Paciente" ADD COLUMN "indicacionesLeidasAt" TIMESTAMP(3)` and `ALTER TABLE "ConsentimientoFirmado" ALTER COLUMN "indicacionesLeidasAt" DROP NOT NULL`) — no `UPDATE`/`DELETE`, no `DROP COLUMN`. Migration file is present in the migrations directory in correct chronological sequence (`20260708000000_add_indicaciones_leidas`, after `20260701000000_signed_consent_forensic`). `schema.prisma` matches the migration exactly (`Paciente.indicacionesLeidasAt DateTime?` at line 217; `ConsentimientoFirmado.indicacionesLeidasAt DateTime?` at line 1438). 61-01-SUMMARY.md documents the exact pgBouncer command sequence (`migrate diff` → `db execute` via `directUrl` → `migrate resolve --applied`) and a live `information_schema.columns` check confirming the column exists nullable in the live DB — per environment_constraints, this documented evidence (combined with the migration file / schema alignment I verified directly) is accepted as sufficient without re-querying the live DB. |

**Score:** 3/4 truths fully verified; 1 (SC#3) partially verified — primary-source behavior correct and tested, but the phase's own non-regression must-have (legacy fallback preservation) has an unresolved data-flow gap at the `getKanban` wiring level.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | `Paciente.indicacionesLeidasAt DateTime?` + `ConsentimientoFirmado.indicacionesLeidasAt DateTime?` | VERIFIED | Both fields present, exact form matches plan (lines 217, 1438) |
| `backend/src/prisma/migrations/20260708000000_add_indicaciones_leidas/migration.sql` | pgBouncer additive/DROP NOT NULL migration | VERIFIED | Both ALTER statements present, header comment present, no UPDATE/DELETE |
| `backend/src/modules/paciente-portal/paciente-portal.service.ts` | `firmarConsentimiento` decoupled + `registrarAcuseIndicaciones` set-once | VERIFIED | Both methods confirmed by direct read; guard/write removed, new method present and correctly implemented |
| `backend/src/modules/paciente-portal/paciente-portal.controller.ts` | `POST indicaciones/acuse` under `PortalJwtGuard` | VERIFIED | Route present, guard per-route, identity from JWT only |
| `backend/src/modules/paciente-portal/dto/firmar-consentimiento-portal.dto.ts` | DTO without `indicacionesLeidas` | VERIFIED | Only `zonaId` + `signaturePngDataUrl` declared |
| `backend/src/modules/pacientes/crm-steps.helper.ts` | `PacientePasosInput.indicacionesLeidasAt` + 3-source OR | VERIFIED | Field present, OR ordering matches D-04 exactly |
| `backend/src/modules/pacientes/pacientes.service.ts` | `getKanban` select + call arg for new field | VERIFIED (with wiring caveat) | New field selected/passed correctly; pre-existing `take: 1` on `consentimientosFirmados` undermines Fallback 1 (see gap) |
| `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` | cr-01 docstring corrected, validation confirmed present | VERIFIED | `new URL(indicacionesUrl)` + `protocol !== 'http:'` present; misleading `@IsUrl validated in DTO` string absent |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `paciente-portal.controller.ts` POST acuse | `registrarAcuseIndicaciones(req.user.pacienteId)` | `PortalJwtGuard` → `req.user.pacienteId` | WIRED | Confirmed via direct grep + read; no `@Param`/`@Body` usage for identity |
| `registrarAcuseIndicaciones` | `prisma.paciente.updateMany` | `where indicacionesLeidasAt: null` (set-once) | WIRED | Confirmed exact where/data shape |
| `pacientes.service.ts getKanban` select | `computePasosCrm({ ..., indicacionesLeidasAt })` | select key → call arg | WIRED | `indicacionesLeidasAt: true` (select) → `indicacionesLeidasAt: p.indicacionesLeidasAt` (call arg) confirmed |
| `computePasosCrm` Paso 5 | `indicacionesPreop = p.indicacionesLeidasAt != null \|\| ...` | OR de 3 fuentes | WIRED (primary source) / PARTIAL (fallback 1 data source truncated upstream) | Helper logic correct; upstream `getKanban` select truncates the array the helper needs for Fallback 1 to work reliably across multi-zona-signature patients |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `computePasosCrm` (indicacionesPreop primary source) | `p.indicacionesLeidasAt` | `getKanban` select → `Paciente.indicacionesLeidasAt` | Yes | FLOWING |
| `computePasosCrm` (indicacionesPreop fallback 1) | `p.consentimientosFirmados[].indicacionesLeidasAt` | `getKanban` select with `take: 1, orderBy: firmadoAt desc` | Partially — only the single most-recent signed-zona row reaches the helper, not the full set | HOLLOW (for multi-zona-signature patients with the legacy timestamp on a non-latest row) |
| `paciente-portal.controller.ts` acuse route | `req.user.pacienteId` | `PortalJwtGuard` / `portal-jwt.strategy.ts` | Yes | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for live execution (no server running, per environment_constraints — jest/build hang in this environment). Verification instead relied on direct source reading, `git show` diffs against committed hashes, and cross-referencing unit test files. All grep-based acceptance criteria from the three plans were independently re-run and passed (not just trusted from SUMMARY.md).

| Behavior | Check Method | Result | Status |
|----------|--------------|--------|--------|
| Migration SQL matches schema.prisma deltas exactly | Direct file read + diff of both fields | Match confirmed | PASS |
| No stale `indicacionesLeidas` (boolean) in production code | `grep -rn "indicacionesLeidas\b" backend/src --include="*.ts"` excluding specs | Zero matches | PASS |
| Task commits exist in git history | `git log --oneline` for all 6 claimed commit hashes | All 6 present (b217129, 4b2a9a9, d6d866f, 9335cd5, 4f88921, 149dec2) | PASS |
| `pacientes.service.ts` phase-61 diff scope | `git show 149dec2 --stat` | Confirms only 2 lines added (select key + call arg); `take: 1` predates this phase | PASS (confirms gap is pre-existing, not newly introduced) |

### Probe Execution

Step 7c: N/A — no `scripts/*/tests/probe-*.sh` conventions or phase-declared probes found for this phase (backend schema/service phase, not a migration-tooling phase with probe scripts).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CONS-11 | 61-02 | Firmar el consentimiento se desacopla de las indicaciones | SATISFIED | `firmarConsentimiento` guard + write removed, confirmed by direct read (SC#1 above) |
| INDIC-03 | 61-01, 61-02 | El acuse de lectura de indicaciones se persiste en el perfil del paciente con fecha/hora | SATISFIED | Field added to schema+DB (61-01), endpoint persists it set-once (61-02) |
| INDIC-04 | 61-03 | El paso `indicacionesPreop` del board CRM se computa a partir del acuse del perfil del paciente | PARTIALLY SATISFIED | Primary-source derivation correct and tested; non-regression fallback guarantee has an unresolved wiring gap (see SC#3 above) |

REQUIREMENTS.md traceability table cross-checked: all three IDs (CONS-11, INDIC-03, INDIC-04) map to Phase 61 with no orphaned requirements for this phase. No requirement IDs declared in the three PLAN frontmatters are missing from REQUIREMENTS.md, and no REQUIREMENTS.md entries mapped to Phase 61 are absent from the plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/src/modules/pacientes/pacientes.service.ts` | 674-678 | Pre-existing `take: 1` Prisma select truncation now undermines a phase-61 non-regression must-have | WARNING (data-flow) | See gap above — not a code-smell debt marker, but a genuine logic defect surfaced by this phase's design |

No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers found in any of the 8 files modified by this phase. No dead-code stubs, no empty handlers, no hardcoded-empty return values introduced by this phase's commits.

Other findings from 61-REVIEW.md (WR-02 through WR-06, IN-01 through IN-05) are pre-existing defects in touched files or edge cases explicitly flagged as advisory/out-of-scope by the review itself (e.g., IN-03 documents the set-once design as intentional). None of them contradict a Phase 61 success criterion except WR-01, which is elevated to a gap above per the environment_constraints instruction to judge it against SC#3.

### Human Verification Required

None. All must-haves are verifiable through static code analysis, git history, and cross-referencing test files — no visual, real-time, or external-service behavior is in scope for this backend-only phase.

### Gaps Summary

Three of four ROADMAP success criteria (SC#1, SC#2, SC#4) are fully and cleanly verified with no caveats — the decoupling of `firmarConsentimiento`, the new portal-scoped acuse endpoint, and the pgBouncer migration pattern are all correctly implemented and match their plans exactly.

SC#3 is verified correct at the pure-function level (`computePasosCrm` derives `indicacionesPreop` primarily from `Paciente.indicacionesLeidasAt`, exactly as required) but the phase's own must-have commitment to preserve both legacy fallbacks for non-regression is broken in the wired system: `getKanban`'s `consentimientosFirmados` select truncates to the single most-recent signed-zona row (`take: 1`), which can shadow the legacy v1.12 read-receipt timestamp for any patient who has signed more than one zona's consent — a scenario the schema explicitly supports (no unique constraint or count limit per patient, only per pacienteId+zonaId). This is not a new defect introduced by this phase (confirmed via `git show` that the phase's diff to this file was 2 lines, unrelated to the `take: 1` clause), but it directly undermines a truth this phase's own plan (61-03-PLAN.md) commits to delivering, and no test exists at the `getKanban` → `computePasosCrm` integration boundary to catch it.

This looks like an oversight rather than an intentional deviation — the fix is a one-line change (documented in 61-REVIEW.md WR-01 and reproduced in this report's gap entry) and does not require replanning the phase's approach, only closing the wiring gap in `getKanban`'s select.

---

_Verified: 2026-07-09T01:06:01Z_
_Verifier: Claude (gsd-verifier)_
