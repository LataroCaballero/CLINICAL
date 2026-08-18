---
phase: 67-tel-fono-opcional-y-guards-de-env-o-backend
plan: 02
subsystem: api
tags: [nestjs, prisma, postgresql, typescript, raw-sql]

# Dependency graph
requires:
  - phase: 67-01
    provides: "Paciente.telefono nullable end-to-end (schema, migration, Prisma client, DTO, all TypeScript declarations widened to string | null)"
provides:
  - "normalizeTelefono() — single private helper in PacientesService defining what a valid telefono is (trim, null for empty/absent, >=6 chars or BadRequestException) for the whole module"
  - "create()/update()/updateContacto() all normalized: telefono: '' from the frontend persists as null, an absent telefono in a PATCH is never forced to null"
  - "suggest() raw SQL is NULL-safe: COALESCE(p.telefono, '') in both the score CASE and the WHERE OR-clause, verified live against the DB with a rollback-only transaction"
  - "paciente-portal.service.ts pickPresent() WR-02 comment recontextualized to the deliberate staff-can-clear / patient-cannot asymmetry (D-08), behavior and test unchanged"
affects: [67-03, 67-04, 67-05, 68, 69]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-source-of-truth validation helper (normalizeTelefono) reused by all call sites instead of duplicating the threshold check"
    - "COALESCE(column, '') guard around a nullable column inside a Prisma $queryRaw LIKE, instead of relying on NULL LIKE 'x' -> NULL SQL semantics"

key-files:
  created: []
  modified:
    - backend/src/modules/pacientes/pacientes.service.ts
    - backend/src/modules/paciente-portal/paciente-portal.service.ts

key-decisions:
  - "normalizeTelefono() placed as a private helper next to ensureExists(), following the existing EMAIL_SHAPE 'DTO validation is inert, re-check at runtime' convention"
  - "update() uses a conditional spread (dto.telefono !== undefined) rather than always calling normalizeTelefono(), so a PATCH that omits telefono never forces it to null — only create() and updateContacto() unconditionally normalize"
  - "updateContacto()'s length check was fully removed and delegated to normalizeTelefono() rather than duplicated, per D-06 (single threshold definition)"
  - "updateEmergencia() and updatePacienteSection() left untouched (D-07) — git diff confirms zero changes outside updateContacto()"
  - "pickPresent()'s null !== undefined && value !== null line and the WR-02 test were NOT edited — only the comment justification was rewritten, verified via git diff --stat showing no change to the spec file"
  - "suggest() probe run against the live DB inside a $transaction that force-rolls back via a sentinel Error, using a throwaway ts-node script deleted immediately after (no test data persisted, no probe file committed)"

patterns-established:
  - "Normalize-at-the-service-boundary: telefono validity is centralized in one private method rather than repeated typeof/length checks at each call site"

requirements-completed: [TEL-01]

# Metrics
duration: ~25min
completed: 2026-08-18
---

# Phase 67 Plan 2: Validación de Teléfono en PacientesService Summary

**Single `normalizeTelefono()` helper in `PacientesService` governs `create()`, `update()`, and `updateContacto()`; `suggest()`'s raw SQL is now NULL-safe via `COALESCE`, verified live against the DB inside a rolled-back transaction.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3/3 complete
- **Files modified:** 2

## Accomplishments
- Added `private normalizeTelefono(value: unknown): string | null` to `PacientesService` — the single definition of "teléfono válido" for the module (trim → empty/absent → `null`; <6 chars or non-string → `BadRequestException('Teléfono inválido')`; ≥6 chars → trimmed value)
- `create()`: `telefono: ''` from the frontend now persists as `null` instead of an empty string
- `update()`: telefono only normalizes when present in the partial DTO — an absent field is never forced to `null`, an explicit `''` clears it
- `updateContacto()`: relaxed to allow saving the Contacto section without a phone (no more spurious 400 when only email changes), while still rejecting a too-short value via the same helper — `updateEmergencia()` and the section dispatcher are untouched
- `paciente-portal.service.ts`'s `pickPresent()` WR-02 comment rewritten to describe the deliberate staff-can-clear / patient-cannot asymmetry (D-08); behavior and its test unchanged, verified with `git diff --stat` showing zero changes to the spec file
- `suggest()`'s raw SQL score `CASE` and `WHERE` clause both wrap `p.telefono` in `COALESCE(p.telefono, '')`, replacing reliance on SQL's `NULL LIKE 'x' -> NULL` semantics; `${query}` remains a parameterized template-tag argument throughout (no `Prisma.raw`, no string concatenation)
- Live-DB probe (throwaway ts-node script, run inside a `$transaction` forced to roll back via a sentinel error, deleted immediately after): a paciente created with `telefono: null` matched by name search returned `score=1.05 > 0`, was correctly absent from an unrelated numeric search, and the `Paciente` row count was identical before/after (424 == 424)

## Task Commits

Each task was committed atomically:

1. **Task 1: Helper normalizeTelefono() + aplicarlo en create() y update()** - `0f9f845` (feat)
2. **Task 2: Relajar updateContacto, dejar updateEmergencia intacto, recontextualizar WR-02** - `cbecb5e` (feat)
3. **Task 3: suggest() a prueba de NULL en el LIKE y en el score** - `0df9882` (fix)

**Plan metadata:** (this commit, to follow)

## Files Created/Modified
- `backend/src/modules/pacientes/pacientes.service.ts` - added `normalizeTelefono()`; wired it into `create()`, `update()`, `updateContacto()`; `suggest()`'s `$queryRaw` wraps `p.telefono` in `COALESCE(p.telefono, '')` in the score and WHERE clauses
- `backend/src/modules/paciente-portal/paciente-portal.service.ts` - `pickPresent()`'s `WR-02` comment rewritten; no behavior change

## Decisions Made

- **`normalizeTelefono()` placement and shape**: private helper next to `ensureExists()`, mirroring the existing `EMAIL_SHAPE` "no global ValidationPipe, must re-check at runtime" convention already established in this file. Reuses the exact literal error message `'Teléfono inválido'` that `updateContacto` already threw, so the visible error contract does not change for existing callers.
- **`update()`'s conditional spread over an unconditional call**: `UpdatePacienteDto` fields are all optional (it's `PartialType(CreatePacienteDto)`), and editors send partial payloads. Calling `normalizeTelefono(dto.telefono)` unconditionally would have forced every PATCH that doesn't touch `telefono` to null it out. Guarding with `dto.telefono !== undefined` before normalizing was the only way to satisfy both D-01 (empty → null) and D-02 (absent → untouched) simultaneously.
- **`updateContacto()`'s length check removed, not duplicated**: per D-06, the ≥6-char threshold exists in exactly one place (`normalizeTelefono`). Confirmed via `grep -c 'length < 6'` — the substring now appears exactly once in the file, inside the helper.
- **WR-02 comment-only edit, verified via diff**: read the spec test (`paciente-portal.service.spec.ts:280-288`) before touching anything, confirmed the assertion shape (`data` excludes `telefono` when `null` is sent), then rewrote only the comment. `git diff --stat` on the spec file returned empty, confirming zero edits there. Full portal spec suite (30/30) still passes.
- **Live-DB probe methodology**: ran a standalone `ts-node` script (not committed — created inside `backend/`, executed, then deleted) that opens a `$transaction`, creates a throwaway paciente with `telefono: null` and a highly-specific unique name/DNI, runs the exact `suggest()` SQL twice (once against a matching name query, once against an unrelated numeric query), then throws a sentinel `Error` to force Prisma to roll back the transaction. `Paciente` row count was queried before and after and matched exactly (424 == 424), confirming no test data was left behind.

## Deviations from Plan

None - plan executed exactly as written. All three tasks matched their `<action>` blocks and acceptance criteria without requiring architectural changes, bug fixes, or missing-functionality additions.

## Issues Encountered

- `ts-node` failed to resolve `@prisma/client` when the probe script lived outside the `backend/` directory (module resolution walks up from the script's location, not `cwd`). Resolved by copying the script into `backend/` temporarily, running it there, then deleting it — no lasting artifact, confirmed via `git status --short` showing no untracked files after cleanup.
- `npm run lint` does not exit 0 due to the same 44 pre-existing, unrelated errors documented in `deferred-items.md` from plan 67-01 (confirmed via targeted `npx eslint` on just the two files this plan touched — the only errors reported are the already-logged `esPortalUrlValida`/`estudiosPendientes` unused-vars and pre-existing prettier formatting issues on lines this plan did not touch). No new lint errors were introduced by this plan's edits.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `normalizeTelefono()` is now available for plan 67-03 (the 4 WhatsApp guard sites + the presupuestos entrypoint) to reuse if a shape check is ever needed there — though ENVIO-01/02's guard per D-03 is a simpler falsy-after-trim check, not a re-validation.
- `suggest()`'s NULL-safety is verified end-to-end; plan 68 (autosuggest-based inline creation) can rely on phone-less pacientes surfacing correctly.
- The write side of TEL-01 is now fully closed: schema (67-01) + service-layer normalization + validation (67-02). No blockers remain for 67-03.

---
*Phase: 67-tel-fono-opcional-y-guards-de-env-o-backend*
*Completed: 2026-08-18*

## Self-Check: PASSED

- FOUND: backend/src/modules/pacientes/pacientes.service.ts
- FOUND: backend/src/modules/paciente-portal/paciente-portal.service.ts
- FOUND commit: 0f9f845 (Task 1)
- FOUND commit: cbecb5e (Task 2)
- FOUND commit: 0df9882 (Task 3)
