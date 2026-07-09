---
phase: 61-backend-schema-decoupling-e-indicaciones
plan: 03
subsystem: crm
tags: [nestjs, prisma, crm-kanban, pure-helper, tdd]

# Dependency graph
requires:
  - phase: 61-01
    provides: "Paciente.indicacionesLeidasAt column in schema.prisma, migration applied, Prisma client regenerated"
provides:
  - "computePasosCrm Paso 5 (indicacionesPreop) derives from Paciente.indicacionesLeidasAt as primary source, with the two legacy sources (ConsentimientoFirmado.indicacionesLeidasAt, Paciente.indicacionesEnviadas) preserved as non-regression fallbacks"
  - "getKanban selects and passes Paciente.indicacionesLeidasAt to computePasosCrm — the only consumer"
affects: [62-crm-board-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Legacy-OR non-regression pattern extended to 3 sources (new primary first, both legacy fallbacks preserved)"]

key-files:
  created: []
  modified:
    - backend/src/modules/pacientes/crm-steps.helper.ts
    - backend/src/modules/pacientes/crm-steps.helper.spec.ts
    - backend/src/modules/pacientes/pacientes.service.ts

key-decisions:
  - "D-04 applied exactly as specified: 3-source OR with Paciente.indicacionesLeidasAt (v1.14) as primary, ConsentimientoFirmado.indicacionesLeidasAt (v1.12) and Paciente.indicacionesEnviadas (pre-v1.12) as ordered fallbacks — no backfill needed, no regression for existing signed patients"
  - "Paso 4 (consentimiento) left untouched — decoupling only affects Paso 5 per plan scope"

patterns-established:
  - "Extending an existing legacy-OR derived-flag pattern to a 3rd source: prepend new primary, keep prior sources as fallback in original order"

requirements-completed: [INDIC-04]

# Metrics
duration: 10min
completed: 2026-07-09
---

# Phase 61 Plan 03: computePasosCrm Indicaciones Primary Source Summary

**`computePasosCrm` Paso 5 (indicacionesPreop) now derives completeness from `Paciente.indicacionesLeidasAt` (the profile-level read-receipt) as the primary source, with both legacy sources preserved as non-regression fallbacks; `getKanban` selects and passes the new field.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-09T00:26:53Z
- **Completed:** 2026-07-09T00:36:31Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- `PacientePasosInput` extended with `indicacionesLeidasAt?: Date | string | null` (v1.14 primary source field)
- Paso 5 OR rewritten with the new primary source first, both legacy fallbacks preserved in original order (D-04)
- `getKanban` select and `computePasosCrm` call updated to surface the new field (D-05) — the only consumer, so this closes the wiring end-to-end
- Test suite extended: primary-only completeness, both legacy fallbacks individually verified still-completo, and pendiente-with-all-3-absent case

## Task Commits

Each task was committed atomically:

1. **Task 1: Extender PacientePasosInput + Paso 5 con OR de 3 fuentes (INDIC-04, D-04, D-05)** - `4f88921` (feat)
2. **Task 2: getKanban — seleccionar y pasar Paciente.indicacionesLeidasAt (D-05, SC#3)** - `149dec2` (feat)

_Note: This plan's tasks were type="auto" (Task 1 marked `tdd="true"` but executed as a single commit extending an existing GREEN implementation + tests together, matching the existing codebase convention of one commit per task rather than separate RED/GREEN commits for incremental extensions to an already-implemented helper)._

## Files Created/Modified
- `backend/src/modules/pacientes/crm-steps.helper.ts` - `PacientePasosInput.indicacionesLeidasAt` field added; Paso 5 OR extended to 3 sources (new primary first); header docstring updated to document precedence for both consentimiento and indicacionesPreop
- `backend/src/modules/pacientes/crm-steps.helper.spec.ts` - `emptyInput()` extended with `indicacionesLeidasAt: null`; Paso 5 describe block rewritten with 4 tests (primary-only, fallback-1-only, fallback-2-only, all-absent); robustness describe block extended to cover the new field in undefined/null cases
- `backend/src/modules/pacientes/pacientes.service.ts` - `getKanban` select adds `indicacionesLeidasAt: true`; `computePasosCrm({...})` call passes `indicacionesLeidasAt: p.indicacionesLeidasAt`

## Decisions Made
- Followed PATTERNS.md section 7/8 code verbatim (exact analog already extracted during phase planning) — no deviation from the prescribed OR ordering or field placement
- Left Paso 4 (consentimiento) completely unchanged, per plan's explicit scope boundary

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Known environment issue (test/build hangs) reproduced again.** Per `<environment_notes>`, `npm test -- crm-steps.helper.spec` and `npm run build` were attempted:
- `npm run build` (`nest build`) completed successfully in the background with zero errors/output (silent success) — confirms Task 2's type changes compile cleanly against the Prisma client regenerated in 61-01.
- `npm test -- crm-steps.helper.spec` hung indefinitely at near-zero CPU (~6 min elapsed, 0.0% CPU) — consistent with the documented environment issue. The process was killed.

**Fallback verification performed (per environment notes instruction):**
1. All 4 plan-specified `grep` assertions passed (primary-source line, field type declaration, select key, call arg).
2. `ts.transpileModule` syntax validation passed with 0 diagnostics on all 3 modified files (no syntax errors).
3. Manual behavioral execution: transpiled `crm-steps.helper.ts` to CommonJS in an isolated Node context and ran the exact test scenarios from the updated spec (primary-only completeness, fallback-1-only, fallback-2-only, all-absent pendiente, Paso 4 regression checks, undefined-robustness) — all 7 assertions passed with expected values.
4. Rigorous manual review against `crm-steps.helper.spec.ts` confirms every new/modified test case's expected behavior matches the manually-verified logic above.

This is the same documented fallback pattern used in 61-01/61-02 for this environment. No code-correctness concerns — both automated (grep, transpile) and manual (behavioral simulation) checks agree with the PATTERNS.md-prescribed implementation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`computePasosCrm` and `getKanban` are fully wired to the v1.14 primary source (`Paciente.indicacionesLeidasAt`), completing the backend side of INDIC-04 with zero regression risk for v1.12/pre-v1.12 patients. This closes all 3 plans of Phase 61 (schema decoupling + indicaciones). Phase 62 (frontend/board W-1 closure) can now rely on `getKanban`'s `indicacionesPreop` step reflecting the real portal acuse, not the consent-signing act.

**Recommended before Phase 62 starts:** run `npm test -- crm-steps.helper.spec` and `npm run build` once more in a healthy environment (or CI) to get a hard automated PASS on record, since this plan's verification relied on manual/transpile fallback due to the local hang.

---
*Phase: 61-backend-schema-decoupling-e-indicaciones*
*Completed: 2026-07-09*
