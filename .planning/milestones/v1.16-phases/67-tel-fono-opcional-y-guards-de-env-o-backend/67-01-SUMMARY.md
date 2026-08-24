---
phase: 67-tel-fono-opcional-y-guards-de-env-o-backend
plan: 01
subsystem: database
tags: [prisma, postgresql, nestjs, typescript, class-validator]

# Dependency graph
requires: []
provides:
  - "Paciente.telefono nullable end-to-end: schema, applied migration, live DB column, generated Prisma client, DTO, and all TypeScript declarations"
  - "normalizeTelefono groundwork foundation (bare nullable column) for plan 67-02's normalization helper"
affects: [67-02, 67-03, 67-04, 67-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "String? Prisma field + matching @IsOptional() @IsString() DTO field (mirrors telefonoAlternativo sibling)"
    - "$queryRaw typed generics widened to string | null without touching SQL when the query doesn't filter/compare on the column"

key-files:
  created:
    - backend/src/prisma/migrations/20260818214917_telefono_opcional/migration.sql
    - .planning/phases/67-tel-fono-opcional-y-guards-de-env-o-backend/deferred-items.md
  modified:
    - backend/src/prisma/schema.prisma
    - backend/src/modules/pacientes/dto/create-paciente.dto.ts
    - backend/src/common/types/paciente-suggest.type.ts
    - backend/src/modules/pacientes/dto/paciente-lista.dto.ts
    - backend/src/modules/reportes/types/reportes.types.ts
    - backend/src/modules/pacientes/pacientes.service.ts
    - backend/src/modules/reportes/services/reportes-financieros.service.ts

key-decisions:
  - "pacientes.service.ts:166 (obtenerListaPacientes) audited: PacienteListaDto widened + satisfies check already enforces string | null, no edit needed"
  - "pacientes.service.ts:973 (getListaAccion) audited: no return-type annotation on the method, no satisfies/nominal type on the .map() literal — telefono: p.telefono flows by structural inference, no edit needed"
  - "getMorosidad() SQL left untouched: it only SELECTs/GROUP BYs pac.telefono, never filters or compares against it — only the $queryRaw generic needed widening"
  - "Pre-existing repo-wide lint debt (44 errors, dates to March 2026 via git blame, unrelated to telefono) logged to deferred-items.md instead of auto-fixed, per Scope Boundary rule"

patterns-established:
  - "Optional String? Prisma field pairs with @IsOptional() @IsString() DTO field, copying the telefonoAlternativo sibling shape exactly"

requirements-completed: [TEL-01]

# Metrics
duration: ~35min (this session, Task 2+3 only — Task 1 was completed in a prior session)
completed: 2026-08-18
---

# Phase 67 Plan 1: Teléfono Opcional (Schema + Migración + Tipos) Summary

**`Paciente.telefono` is nullable end-to-end — schema, applied migration (`DROP NOT NULL`, zero data loss, 424/424 phones preserved), regenerated Prisma client, `CreatePacienteDto`, and all 6 TypeScript declarations/generics that previously lied with `telefono: string`.**

## Performance

- **Duration:** ~35 min (this continuation session — Task 2 and Task 3 only; Task 1 was completed and committed in an earlier session)
- **Tasks:** 3/3 complete (Task 1 done previously, Task 2 and Task 3 done this session)
- **Files modified:** 7 source files + 1 new migration + 1 new deferred-items log

## Accomplishments
- Applied `20260818214917_telefono_opcional` migration to the live database: `ALTER TABLE "Paciente" ALTER COLUMN "telefono" DROP NOT NULL` — the only statement, no destructive SQL
- Verified zero data loss: `TEL_BASELINE=424` (pre-migration count) == `TEL_AFTER=424` (post-migration non-null count)
- Widened 6 TypeScript declarations from `telefono: string` to `telefono: string | null`: `PacienteSuggest`, `PacienteListaDto`, `CuentaPorCobrar`, `CuentaMorosa`, and the `$queryRaw` generics in `suggest()` and `getMorosidad()`
- First-hand audited the two ROADMAP-named list sites (`pacientes.service.ts:166` and `:973`) — both confirmed to correctly propagate `string | null` without any code change
- `npm run build` passes with 0 errors after the schema/type changes
- Unblocked all three prior blockers (DB connectivity, pre-existing migration-history drift, P3006 shadow-database timestamp-ordering bug) that had stopped this plan across three previous execution attempts — all resolved by the orchestrator before this run, verified fresh in this session (`migrate status`: 55→56 migrations, up to date both before and after)

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema Prisma nullable + @IsOptional() en CreatePacienteDto** - `8ed5da9` (feat) — completed in a prior session
2. **Task 2: [BLOCKING] Generar y aplicar la migración Prisma a la base viva** - `df0386f` (feat)
3. **Task 3: Ensanchar las declaraciones de tipo que afirman telefono: string** - `7c04b0c` (feat)

**Plan metadata:** (this commit, to follow)

## Files Created/Modified
- `backend/src/prisma/schema.prisma` - `Paciente.telefono` declared `String?` (Task 1, prior session)
- `backend/src/modules/pacientes/dto/create-paciente.dto.ts` - `telefono?: string` with `@IsOptional()` (Task 1, prior session)
- `backend/src/prisma/migrations/20260818214917_telefono_opcional/migration.sql` - `DROP NOT NULL` on `Paciente.telefono`, applied to live DB
- `backend/src/common/types/paciente-suggest.type.ts` - `telefono: string | null`
- `backend/src/modules/pacientes/dto/paciente-lista.dto.ts` - `telefono: string | null`
- `backend/src/modules/reportes/types/reportes.types.ts` - `CuentaPorCobrar.telefono` and `CuentaMorosa.telefono` both `string | null`
- `backend/src/modules/pacientes/pacientes.service.ts` - `suggest()`'s `$queryRaw` generic widened; `:166`/`:973` audited, no edit needed
- `backend/src/modules/reportes/services/reportes-financieros.service.ts` - `getMorosidad()`'s `$queryRaw` generic widened (SQL untouched — no filter/compare on `telefono`)
- `.planning/phases/67-tel-fono-opcional-y-guards-de-env-o-backend/deferred-items.md` - logged pre-existing repo-wide lint debt, out of scope

## Decisions Made

- **`pacientes.service.ts:166`** (`obtenerListaPacientes`): disposition = **auditado sin cambios**. The method has an explicit `Promise<PacienteListaDto[]>` return annotation and the `.map()` literal uses `satisfies PacienteListaDto`, so widening the DTO (Task 3, item 1) automatically makes this site typecheck against `string | null` — no separate edit was needed or made.
- **`pacientes.service.ts:973`** (`getListaAccion`, declared `:879`): disposition = **auditado sin cambios**. Confirmed first-hand: the method has no explicit return-type annotation, its caller (`pacientes.controller.ts:94-95`) also has no return annotation, and the `.map()` literal at `:970-981` is a plain object literal with no `satisfies` or nominal type — `telefono: p.telefono` flows by structural inference alone. Since Prisma's regenerated client now types `paciente.telefono` as `string | null`, this flows through correctly with zero edits.
- **`getMorosidad()` SQL**: left untouched. Read the query body (`reportes-financieros.service.ts:559-576`) — it only does `SELECT pac.telefono` and `GROUP BY ... pac.telefono`, never a `WHERE`/`LIKE`/comparison against the column, so the `NULL`-in-`LIKE` risk documented in `67-PATTERNS.md` for `suggest()` does not apply here. Only the `$queryRaw` typed generic needed widening.
- **Pre-existing lint debt**: not auto-fixed. `npm run lint` (project-wide `eslint --fix`) surfaces 44 pre-existing `no-unused-vars`/`no-require-imports` errors across 21 files, none introduced by this plan's edits (confirmed via `git blame` — e.g. the oldest one dates to 2026-03-13, five months before this phase started). Two of the 44 sit in files this plan touched (`pacientes.service.ts:34,146`, `reportes-financieros.service.ts:453`) but on lines untouched by the telefono changes. Logged to `deferred-items.md` per the Scope Boundary rule rather than fixed inline.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking, resolved by orchestrator before this run] Migration-history reconciliation**
- **Found during:** Task 2, across three prior execution attempts (this is the continuation/4th attempt)
- **Issue:** Three sequential blockers stopped Task 2: (a) DB unreachable, (b) pre-existing migration drift (deleted migration directory + undocumented table + missing index), (c) P3006 shadow-database replay failure caused by a timestamp-ordering bug in the restored `20260415221758_flujo_paciente` migration
- **Fix:** All three were resolved by the orchestrator in commits `d7d59f4` (drift reconciliation) and `e450793` (neutralized `20260415221758_flujo_paciente` to a no-op, matching its recorded checksum) *before* this session started. This session verified the fix end-to-end: `migrate status` reported 55 migrations/up to date beforehand, `migrate dev --name telefono_opcional` succeeded generating exactly one statement, and `migrate status` reported 56 migrations/up to date afterward.
- **Files modified:** none in this session (pre-resolved); this session only added the new migration directory
- **Verification:** `TEL_BASELINE=424` == `TEL_AFTER=424`; migration SQL contains only `DROP NOT NULL`, no destructive statements
- **Committed in:** `df0386f` (Task 2 commit)

**2. [Rule 3 - Blocking, no code change] Lint auto-fix side effect scoped down**
- **Found during:** Task 3, running the plan-mandated `npm run lint` verification
- **Issue:** `npm run lint` runs `eslint "{src,apps,libs,test}/**/*.ts" --fix` — project-wide, not scoped to changed files. Its first run reformatted (pure prettier, no logic change) 11 files entirely unrelated to this plan's telefono scope, plus non-telefono lines within `pacientes.service.ts` and `pacientes.service.spec.ts`.
- **Fix:** Reverted the 11 unrelated files via `git checkout --` and manually reverted the non-telefono-related formatting hunks within `pacientes.service.ts`, keeping only the intentional `telefono: string | null` generic-widening edit. Verified with a targeted `npx eslint` run on just the 5 task-scoped files that no new lint errors were introduced by the telefono edits themselves.
- **Files modified:** none beyond the original Task 3 scope (reverted collateral, did not commit it)
- **Verification:** `git diff` on `pacientes.service.ts` shows only the intended one-line change; `npm run build` still passes 0 errors after the revert
- **Committed in:** not committed (correctly excluded — this is why it doesn't appear in `7c04b0c`)

---

**Total deviations:** 2 (1 pre-resolved blocker verified end-to-end, 1 lint-collateral scope correction — neither introduced new code)
**Impact on plan:** No scope creep. All fixes either pre-existing (verified, not re-litigated) or defensive scoping to keep the commit minimal.

## Issues Encountered

- `npm run lint`'s project-wide `--fix` behavior reformatted many unrelated files as a side effect of running the plan's mandated verification command — see Deviation #2 above. Resolved by reverting out-of-scope files before committing.
- `npm run lint` does not exit 0 due to 44 pre-existing, unrelated errors repo-wide (see Decisions Made and `deferred-items.md`). This is a known limitation against the plan's literal acceptance criterion but does not block Task 3's actual goal (widened types compile cleanly, no new lint errors introduced).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 67-01 is the wave-1 foundation for the rest of Phase 67 — plans 67-02 and 67-03 (wave 2) can now build `normalizeTelefono()` and the WhatsApp send guards against a genuinely nullable, migrated `telefono` column.
- `pacientes.service.ts:166`/`:973` dispositions are recorded above for plan 67-04's audit table to consume directly.
- Known follow-up already scoped to plan 67-02 (not this plan): `suggest()`'s `LIKE` on `p.telefono` returns SQL `NULL` (not `false`) for patients without a phone — needs verification that they still appear in autosuggest with correct ordering.
- No blockers remain for Phase 67.

---
*Phase: 67-tel-fono-opcional-y-guards-de-env-o-backend*
*Completed: 2026-08-18*

## Self-Check: PASSED

- FOUND: backend/src/prisma/migrations/20260818214917_telefono_opcional/migration.sql
- FOUND: .planning/phases/67-tel-fono-opcional-y-guards-de-env-o-backend/deferred-items.md
- FOUND: .planning/phases/67-tel-fono-opcional-y-guards-de-env-o-backend/67-01-SUMMARY.md
- FOUND commit: 8ed5da9 (Task 1)
- FOUND commit: df0386f (Task 2)
- FOUND commit: 7c04b0c (Task 3)
