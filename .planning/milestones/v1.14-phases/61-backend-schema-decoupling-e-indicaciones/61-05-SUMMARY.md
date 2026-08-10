---
phase: 61-backend-schema-decoupling-e-indicaciones
plan: 05
subsystem: testing
tags: [jest, source-parsing, regression-guard, prisma, indic-04]

# Dependency graph
requires:
  - phase: 61-backend-schema-decoupling-e-indicaciones (plan 04)
    provides: getKanban select without take:1 truncation on consentimientosFirmados, plus a mocked boundary test that cannot detect a take:1 regression because it mocks findMany directly
provides:
  - Durable Jest source-shape guard co-located in pacientes.service.spec.ts that reads the real pacientes.service.ts source and fails if take/orderBy is reintroduced into the consentimientosFirmados select
affects: [61-VERIFICATION, INDIC-04, future getKanban/consentimientosFirmados changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Source-shape guard: static Jest test that reads a source file with fs.readFileSync and isolates a target object literal by brace-balance from its opening brace (not a text-window grep), to assert on real shape while avoiding false positives from preceding comments"

key-files:
  created: []
  modified:
    - backend/src/modules/pacientes/pacientes.service.spec.ts

key-decisions:
  - "Used proper ES `import { readFileSync } from 'fs'` / `import { join } from 'path'` at top of spec file instead of inline require() — the plan allowed either pattern, but require() triggers @typescript-eslint/no-require-imports (the repo's ESLint config uses this rule name, not the older no-var-requires that the existing require('crypto') disable-comment references, which is itself a pre-existing lint gap left untouched per scope boundary)."
  - "Brace-balance isolation confirmed to correctly exclude the preceding multi-line comment (lines 674-678) containing literal text 'take:1' — verified the guard passes in the current (correct) production state without false positive."

requirements-completed: [INDIC-04]

# Metrics
duration: ~15min
completed: 2026-07-17
---

# Phase 61 Plan 05: Durable Take:1 Regression Guard Summary

**Jest source-shape guard that reads pacientes.service.ts directly and fails if `take`/`orderBy` is reintroduced into the `consentimientosFirmados` select, closing the sole remaining gap from 61-VERIFICATION.md where the 61-04 boundary test (mocked findMany) could not detect the regression.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added a new top-level `describe('getKanban consentimientosFirmados select — source-shape guard (take regression, INDIC-04)', ...)` block to `pacientes.service.spec.ts` that reads the real `pacientes.service.ts` source with `readFileSync`, isolates the `consentimientosFirmados: { ... }` block by brace-balance from its opening brace, and asserts:
  - no `take` in the isolated block
  - no `orderBy` in the isolated block
  - `firmadoAt` and `indicacionesLeidasAt` are still present (no select degradation / no over-fetch, T-61-10)
- Verified GREEN in current (correct) production state: all 13 tests pass, including the new guard, and the guard does NOT false-positive on the preceding comment containing the literal text "take:1" (lines 674-678 of `pacientes.service.ts`) — the brace-balance isolation starts from the object's opening brace, after the comment.
- **Falsification performed and confirmed (required by acceptance criteria):** temporarily reintroduced `take: 1, orderBy: { firmadoAt: 'desc' }` into the `consentimientosFirmados` select in `pacientes.service.ts`, re-ran the targeted suite, and confirmed:
  - The new source-shape guard **FAILED** with a clear assertion message showing the literal `take: 1` in the isolated block.
  - The pre-existing 61-04 boundary test (`getKanban -> computePasosCrm boundary`, mocked `findMany`) **remained green** — exactly the disclosed limitation this plan closes.
  - Reverted the scratch edit immediately after confirming the failure; `git diff --stat` / `git diff --name-only` confirm zero changes to `pacientes.service.ts` (only the spec file is modified in the final commit).
- Re-ran the full targeted suite after revert: 13/13 tests pass (GREEN restored).

## Task Commits

Each task was committed atomically:

1. **Task 1: Guard source-parsing contra reintroduccion de take en el select consentimientosFirmados (INDIC-04)** - `026c1b3` (test)

**Plan metadata:** committed separately (this SUMMARY + REQUIREMENTS.md in worktree mode; STATE.md/ROADMAP.md owned by orchestrator)

_Note: This plan's `<behavior>` is source-parsing verification, not RED/GREEN/REFACTOR of new production code — a single `test` commit was sufficient since no production code changed._

## Files Created/Modified
- `backend/src/modules/pacientes/pacientes.service.spec.ts` - Added `readFileSync`/`join` imports and a new source-shape guard describe/it block (50 lines added, no existing tests modified)

## Decisions Made
- Used top-level ES `import` for `fs`/`path` instead of inline `require()` (see key-decisions in frontmatter) — avoids introducing a new lint error under the repo's current ESLint rule name (`@typescript-eslint/no-require-imports`), since the plan explicitly allowed either pattern ("cualquiera consistente con el archivo").
- Did not touch the pre-existing `require('crypto')` inline pattern (line 33) or its now-stale `no-var-requires` disable comment — out of scope (pre-existing, unrelated to this task per scope boundary rule).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Switched from inline `require()` to top-level `import` for fs/path**
- **Found during:** Task 1 (initial implementation, lint check)
- **Issue:** The plan suggested either inline `require()` (matching the existing `require('crypto')` pattern) or top-level `import`. Using inline `require()` with `eslint-disable-next-line @typescript-eslint/no-var-requires` comments did not suppress lint errors, because the repo's installed ESLint config enforces `@typescript-eslint/no-require-imports` (a renamed/successor rule), not `no-var-requires`. The existing `require('crypto')` call at line 33 has the same stale disable-comment and already fails lint today — a pre-existing, out-of-scope issue left untouched.
- **Fix:** Replaced the two inline `require()` calls in the new guard with top-level `import { readFileSync } from 'fs'` and `import { join } from 'path'`, eliminating the need for any disable comment and introducing zero new lint errors.
- **Files modified:** `backend/src/modules/pacientes/pacientes.service.spec.ts`
- **Verification:** `npx eslint src/modules/pacientes/pacientes.service.spec.ts` shows 6 pre-existing errors (all on lines outside this task's new code — prettier formatting and the pre-existing `require('crypto')` at line 35), and zero errors on the new guard's lines. `npx jest --runTestsByPath src/modules/pacientes/pacientes.service.spec.ts` — 13/13 pass.
- **Committed in:** `026c1b3` (Task 1 commit, single commit — no separate fix commit needed since discovered before first commit)

---

**Total deviations:** 1 auto-fixed (1 bug — lint rule name mismatch caught before commit)
**Impact on plan:** No scope creep; fix was contained entirely within the new guard code being added by this task. Pre-existing lint errors elsewhere in the file were left untouched per the scope boundary rule.

## Issues Encountered
- `node_modules` was missing in this worktree (fresh worktree checkout). Restored via `npm ci` against the already-committed `package-lock.json` (same pattern as 61-04, not a new package install — no Rule 3 package-legitimacy checkpoint needed).
- Full jest suite was not run (per interfaces note: full-suite jest can hang in this environment); only the targeted invocation `npx jest --runTestsByPath src/modules/pacientes/pacientes.service.spec.ts` was used, as instructed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The sole gap identified in `61-VERIFICATION.md` is now closed: INDIC-04 has a durable, automatic guard (runs with `npm test`/targeted Jest invocation) protecting the `getKanban` `consentimientosFirmados` select shape, independent of the mocked 61-04 boundary test.
- Zero production code changes — `git diff --name-only` against the pre-plan HEAD lists only `pacientes.service.spec.ts`.
- Phase 61 is ready for override/close per this plan's success criteria; no blockers identified.

---
*Phase: 61-backend-schema-decoupling-e-indicaciones*
*Completed: 2026-07-17*

## Self-Check: PASSED

- FOUND: `backend/src/modules/pacientes/pacientes.service.spec.ts`
- FOUND: commit `026c1b3` in `git log --oneline --all`
- `git diff --name-only` (pre-plan HEAD vs current): only `pacientes.service.spec.ts` — zero production code changes
- Targeted suite (`npx jest --runTestsByPath src/modules/pacientes/pacientes.service.spec.ts`): 13/13 passed
- `INDIC-04` requirement status: already marked complete (from 61-04); this plan adds regression protection, no requirement-status change needed
