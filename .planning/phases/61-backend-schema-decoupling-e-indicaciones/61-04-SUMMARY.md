---
phase: 61-backend-schema-decoupling-e-indicaciones
plan: 04
subsystem: api
tags: [prisma, nestjs, jest, crm-kanban, indicaciones]

# Dependency graph
requires:
  - phase: 61-backend-schema-decoupling-e-indicaciones (plan 03)
    provides: computePasosCrm Paso 5 3-source OR (Paciente.indicacionesLeidasAt primary, ConsentimientoFirmado.indicacionesLeidasAt fallback 1, Paciente.indicacionesEnviadas fallback 2)
provides:
  - getKanban consentimientosFirmados select without take:1 truncation — full array of signed rows reaches computePasosCrm
  - Boundary test (pacientes.service.spec.ts) exercising the real getKanban select shape against computePasosCrm, covering multi-zone legacy receipt non-regression
affects: [62-frontend-kanban-board]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Prisma select over one-to-many relations consumed via .some() in a pure helper must NOT use take:N — truncation silently breaks any fallback logic that depends on seeing all rows, not just the most recent"]

key-files:
  created: []
  modified:
    - backend/src/modules/pacientes/pacientes.service.ts
    - backend/src/modules/pacientes/pacientes.service.spec.ts

key-decisions:
  - "Removed take:1/orderBy from consentimientosFirmados select in getKanban — the array size is naturally bounded by the patient's number of signed zones (a handful), so removing take:1 is not a meaningful over-fetch"
  - "Boundary test mocks prisma.paciente.findMany directly with the exact select shape rather than hitting a real DB — this validates computePasosCrm wiring correctness for the multi-row case, but (per Prisma-mock limitations) cannot itself detect a re-introduced take:1 in the source select; that regression is caught by Task 1's grep-based automated verify (rg -A6 'consentimientosFirmados: {' | rg -q 'take: 1')"
  - "Restored the worktree's missing backend/node_modules via `npm ci` (from the existing, already-committed package-lock.json) to unblock Jest execution — not a new/unverified package install, so outside the Rule 3 package-legitimacy exclusion"

requirements-completed: [INDIC-04]

# Metrics
duration: 25min
completed: 2026-07-17
---

# Phase 61 Plan 04: getKanban consentimientosFirmados take:1 gap closure Summary

**Removed the `take:1`/`orderBy` truncation from `getKanban`'s `consentimientosFirmados` Prisma select so `computePasosCrm`'s `.some()`-based fallbacks see the full array of signed rows, restoring the v1.12 legacy indicaciones-receipt non-regression guarantee (WR-01/SC#3) for multi-zone patients, plus a boundary test in `pacientes.service.spec.ts` covering the fix.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-07-17
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments
- `getKanban`'s `consentimientosFirmados` select now returns ALL signed rows for a patient (previously truncated to the single most-recent via `take: 1` + `orderBy firmadoAt desc`), restoring the Fallback 1 legacy v1.12 read-receipt logic in `computePasosCrm` Paso 5 for patients who signed multiple zones.
- Added a boundary `describe` block (`getKanban -> computePasosCrm boundary (WR-01/SC#3)`) in `pacientes.service.spec.ts` with 3 cases (regression, Paso 4 non-regression, real-pendiente), exercising the actual shape of `getKanban`'s return value end-to-end through `computePasosCrm`.
- INDIC-04 gap (SC#3 fallback shadowing, flagged in `61-VERIFICATION.md`/`61-REVIEW.md`) closed at the wired-system level — the pure helper was already correct; the defect lived exclusively in the Prisma select.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remover take:1 de consentimientosFirmados en getKanban (WR-01, SC#3, INDIC-04)** - `a4cb2e9` (fix)
2. **Task 2: Test de frontera getKanban -> computePasosCrm (regresion multi-zona legacy receipt)** - `bbbeb6e` (test)

**Plan metadata:** committed alongside this summary (worktree mode — orchestrator finalizes STATE.md/ROADMAP.md after merge).

_Note: Task 2 is a test-only task (`tdd="true"`); since the Task 1 implementation was already applied and committed first, the RED phase was not literally reproduced as a separate failing commit — see Deviations for the TDD Gate Compliance note._

## Files Created/Modified
- `backend/src/modules/pacientes/pacientes.service.ts` - `getKanban`'s `consentimientosFirmados` select: removed `take: 1` and `orderBy: { firmadoAt: 'desc' }`, kept only `select: { firmadoAt: true, indicacionesLeidasAt: true }`; added a comment documenting the WR-01/SC#3 rationale.
- `backend/src/modules/pacientes/pacientes.service.spec.ts` - Added `findMany: jest.fn()` to `mockPrisma.paciente`; added `getKanban -> computePasosCrm boundary (WR-01/SC#3)` describe block with Test A (multi-zone legacy receipt regression → `indicacionesPreop` completo), Test B (Paso 4 consentimiento non-regression), Test C (real pendiente case).

## Decisions Made
- Select scope stays limited to exactly the 2 fields `computePasosCrm` reads (`firmadoAt`, `indicacionesLeidasAt`) — no widening to other `ConsentimientoFirmado` fields (forensic hash/ip/userAgent/PDF), per T-61-10 mitigation in the plan's threat model.
- The boundary test mocks `prisma.paciente.findMany` directly (standard pattern in this spec file) rather than standing up a real Prisma/DB integration test. This means the test validates `computePasosCrm` wiring correctness given a realistic multi-row payload, but — because a Jest mock's `mockResolvedValue` is independent of the source's `select`/`take` options — it cannot, by itself, detect if `take: 1` is re-introduced in `pacientes.service.ts`. That specific regression is caught by Task 1's automated `rg`-based verify command, which is the durable guard against re-introduction.
- Restored `backend/node_modules` in this worktree via `npm ci` against the existing, already-committed `package-lock.json` (not a new/unverified package) — the worktree had no `node_modules` at all (a structural gap, not the previously-documented Jest CPU hang from 61-01/61-02/61-03), which blocked all test execution. This is a Rule 3 auto-fix (blocking issue, dependency restoration from an existing lockfile), not a new package install requiring human verification.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored missing backend/node_modules via `npm ci`**
- **Found during:** Task 2 (attempting `npx jest --runTestsByPath pacientes.service.spec.ts`)
- **Issue:** This worktree had no `backend/node_modules` directory at all (`ts-jest` transform module not found; `npx jest --version` silently fell back to a temporarily-fetched npx-cached version). This is distinct from the previously-documented near-zero-CPU Jest hang (61-01/61-02/61-03) — here the dependency tree simply wasn't installed in the worktree checkout.
- **Fix:** Ran `npm ci` in `backend/` against the existing, already-committed `package-lock.json` (hash `268ac2992c6eaccb36160b636b4f50e7facdaaf3`), which is not a new/unverified package — it restores the exact locked dependency tree already used by the main repo checkout.
- **Files modified:** None tracked (`node_modules/` is gitignored; no `package.json`/`package-lock.json` changes).
- **Verification:** `node -e "require.resolve('ts-jest')"` resolved post-install; `npx jest --runTestsByPath src/modules/pacientes/pacientes.service.spec.ts` ran to completion (12/12 pass) instead of failing to even start.
- **Committed in:** N/A (no trackable file changes; environment-only fix)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to run the plan's mandated automated Jest verification at all in this worktree. No scope creep — no source files touched beyond the plan's declared `files_modified`.

## TDD Gate Compliance

Task 2 (`tdd="true"`) does not have a separate failing `test(...)` commit followed by a `feat(...)` commit, because Task 1 (the `fix(...)` implementation) was completed and committed first per the plan's task ordering (Task 1 removes `take:1`; Task 2 adds the regression test). When the boundary test was first written and run, it passed immediately (12/12) against the already-fixed source — there was no RED phase to observe in this run.

To validate the anti-regression intent, the source's `take:1`/`orderBy` were temporarily re-introduced in a scratch edit (not committed) to check whether the new tests would catch the regression. Because the test's `prisma.paciente.findMany` is a Jest mock with a hand-crafted `mockResolvedValue` (the file's existing established pattern), the mock's returned array is independent of the source's Prisma `select`/`take` options — reintroducing `take:1` does not change what the mock returns, so the boundary test alone cannot detect that specific regression. The scratch edit was reverted immediately (confirmed via `git diff` showing no changes) before Task 2 was committed. The durable guard against `take:1` re-introduction is Task 1's automated `rg`-based verify command (`rg -A6 "consentimientosFirmados: {" ... | rg -q "take: 1"`), not the Jest boundary test. This is a known limitation of mocked-ORM unit testing, not a code-correctness gap — flagging per plan-level TDD gate enforcement instructions.

## Issues Encountered
- `computePasosCrm`'s return value is `{ pasos: PasosCrm; todosCompletos: boolean }`, spread into the patient object by `getKanban` — the first draft of the boundary test read `paciente.indicacionesPreop`/`paciente.consentimiento` directly (TS2339 compile errors); fixed to `paciente.pasos.indicacionesPreop`/`paciente.pasos.consentimiento`. Caught immediately by the first `npx jest` run (test suite failed to compile), fixed, and confirmed with a passing re-run — resolved within Task 2, no separate deviation needed.
- Worktree had no `backend/node_modules` — see Deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

SC#3 (ROADMAP) is restored in the wired system: `computePasosCrm` correctly marks `indicacionesPreop` completo from the legacy v1.12 acuse for multi-zone patients, with a boundary test guarding the wiring behavior and an automated grep guarding the select shape. INDIC-04 moves from PARTIALLY SATISFIED to SATISFIED. This closes the 61-04 gap-closure plan; Phase 62 (frontend/board) can rely on `getKanban`'s `indicacionesPreop` reflecting the real portal acuse for all patients, including pre-v1.14 multi-zone signers.

**Recommended before Phase 62 starts (or before merge):** since this worktree's `node_modules` had to be restored via `npm ci`, re-run `npm test -- pacientes.service.spec` and `npm run build` once more after merge in the canonical environment to get a hard automated PASS on record from a fully clean checkout.

---
*Phase: 61-backend-schema-decoupling-e-indicaciones*
*Completed: 2026-07-17*

## Self-Check: PASSED

- FOUND: backend/src/modules/pacientes/pacientes.service.ts
- FOUND: backend/src/modules/pacientes/pacientes.service.spec.ts
- FOUND: commit a4cb2e9 (Task 1)
- FOUND: commit bbbeb6e (Task 2)
