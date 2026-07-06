---
phase: 54-portal-backend-token-security
plan: 01
subsystem: api
tags: [prisma, jwt, passport, class-validator, nestjs, portal, brute-force]

# Dependency graph
requires:
  - phase: 51-schema-foundation
    provides: Paciente portal/staging columns (portalToken, *AutoReportad* fields)
  - phase: 52-portal-link-generation
    provides: SHA-256 portalToken hash + AES-256-GCM portalTokenCifrado lookup contract
provides:
  - Paciente.portalIntentosFallidos (Int default 0) + portalBloqueadoHasta (DateTime?) brute-force columns + migration
  - UpdateContactoPortalDto (contact-only narrow write surface)
  - UpdateSaludStagedDto (*AutoReportad* staged-health narrow write surface)
  - Named 'portal-jwt' passport strategy enforcing scope=portal-paciente, returning { pacienteId }
  - PortalJwtGuard (AuthGuard('portal-jwt'))
affects: [54-02, 54-03, paciente-portal controller/service, portal authenticated routes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Named passport strategy (PassportStrategy(Strategy, 'portal-jwt')) to isolate portal auth from staff 'jwt'"
    - "Scope-claim check in validate() rejecting non-portal tokens before any DB load"
    - "Narrow optional-only DTOs as the write-surface contract (whitelist enforced per-route in Plan 03)"

key-files:
  created:
    - backend/src/prisma/migrations/20260630000000_portal_intentos_bloqueo/migration.sql
    - backend/src/modules/paciente-portal/dto/update-contacto-portal.dto.ts
    - backend/src/modules/paciente-portal/dto/update-salud-staged.dto.ts
    - backend/src/modules/paciente-portal/strategies/portal-jwt.strategy.ts
    - backend/src/modules/paciente-portal/guards/portal-jwt.guard.ts
  modified:
    - backend/src/prisma/schema.prisma

key-decisions:
  - "Migration applied via prisma migrate diff + db execute + migrate resolve --applied (documented pgBouncer/Supabase pattern) instead of migrate dev"
  - "Manual migration timestamp 20260630000000 to preserve chronological order after 20260629000000"
  - "antecedentesAutoReportados typed as Record<string, unknown> with @IsObject() (Json shape, Claude discretion per D-13)"

patterns-established:
  - "Named portal-jwt strategy + scope-claim gate keeps staff tokens out of portal routes (T-54-01)"
  - "Narrow optional-only portal write DTOs define the SC#3/SC#4 protection surface"

requirements-completed: [PORTAL-04, PORTAL-06]

# Metrics
duration: 4min
completed: 2026-06-30
---

# Phase 54 Plan 01: Portal Backend Token Security Foundation Summary

**Persistent brute-force tracking columns + migration, two narrow portal write DTOs, and a named portal-jwt passport strategy/guard enforcing scope=portal-paciente — the contracts the portal controller/service build against.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-30T19:39:03Z
- **Completed:** 2026-06-30T19:43:21Z
- **Tasks:** 3
- **Files modified:** 6 (5 created, 1 modified)

## Accomplishments
- Added `portalIntentosFallidos` (Int @default(0)) and `portalBloqueadoHasta` (DateTime?) to `Paciente` and applied the additive migration to the live Supabase DB (51 migrations, `migrate status` clean).
- Created `UpdateContactoPortalDto` (contact-only, all optional) and `UpdateSaludStagedDto` (only `*AutoReportad*` keys) — the safe write surface for SC#3/SC#4.
- Created the named `'portal-jwt'` passport strategy (rejects `scope !== 'portal-paciente'`, returns `{ pacienteId }`, never loads `Usuario`) plus `PortalJwtGuard`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Brute-force tracking columns + migration** - `394c187` (feat)
2. **Task 2: Two narrow write DTOs** - `6a2fc92` (feat)
3. **Task 3: portal-jwt strategy + guard** - `9a9255e` (feat)

**Plan metadata:** see final docs commit.

## Files Created/Modified
- `backend/src/prisma/schema.prisma` - Added the two brute-force columns to `Paciente`, column-aligned with the existing portal block.
- `backend/src/prisma/migrations/20260630000000_portal_intentos_bloqueo/migration.sql` - Additive ALTER TABLE (TIMESTAMP nullable + INTEGER NOT NULL DEFAULT 0).
- `backend/src/modules/paciente-portal/dto/update-contacto-portal.dto.ts` - Contact-only optional DTO (D-11).
- `backend/src/modules/paciente-portal/dto/update-salud-staged.dto.ts` - Staged-health DTO, `*AutoReportad*` keys only (D-13).
- `backend/src/modules/paciente-portal/strategies/portal-jwt.strategy.ts` - Named strategy enforcing portal scope, `ignoreExpiration: false` (D-05/D-06).
- `backend/src/modules/paciente-portal/guards/portal-jwt.guard.ts` - `AuthGuard('portal-jwt')`.

## Decisions Made
- **Migration applied via diff + db execute + resolve, not `migrate dev`.** The plan's literal instruction was `npx prisma migrate dev --name portal_intentos_bloqueo`, but this project's documented convention (STATE decisions [51-02], [53-02]) is that `migrate dev` is blocked against the Supabase pooler; migrations are hand-written with a manual timestamp and applied via `prisma migrate diff --script` → `prisma db execute` → `prisma migrate resolve --applied`. The generated diff was purely additive (`ALTER TABLE "Paciente" ADD COLUMN ...`), so no data-loss risk. `migrate status` is clean (51 migrations).
- **`antecedentesAutoReportados` typed `Record<string, unknown>` with `@IsObject()`** — Json shape was Claude's discretion per D-13; an object map keeps it consistent with a future F55 structured payload while staying compatible with the Prisma `Json?` column.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration applied via diff+execute+resolve instead of `migrate dev`**
- **Found during:** Task 1 (brute-force columns + migration)
- **Issue:** Plan specified `npx prisma migrate dev`, but the documented project convention is that `migrate dev` is unreliable against the Supabase pooler (decisions [51-02], [53-02]); existing migrations use manual timestamps applied via diff+execute+resolve.
- **Fix:** Generated the additive SQL with `prisma migrate diff --from-schema-datasource --to-schema-datamodel --script`, wrote it to `20260630000000_portal_intentos_bloqueo/migration.sql`, applied via `prisma db execute`, marked applied via `prisma migrate resolve --applied`.
- **Files modified:** backend/src/prisma/migrations/20260630000000_portal_intentos_bloqueo/migration.sql
- **Verification:** `npx prisma migrate status` reports "Database schema is up to date!" (51 migrations); `npx prisma generate` succeeded with the new fields.
- **Committed in:** 394c187 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Applied the established repo migration pattern; same end state (columns live in DB + history). No scope creep.

## Issues Encountered
None blocking. The minor item: the contact DTO doc-comment originally listed the forbidden field names (`obraSocialId`, `etapaCRM`, `flujo`) verbatim, which would have tripped the acceptance whitelist grep — reworded to describe the omitted categories without the literal tokens before committing Task 2.

## Deferred Issues
- Repo-wide pre-existing ESLint failures (44 `no-unused-vars` errors in `reportes`/`stock`/`wsaa`) make `npm run lint` exit non-zero. The new `paciente-portal/*` files are lint-clean (`npm run lint | grep paciente-portal` returns nothing). Logged to `deferred-items.md`; out of scope per SCOPE BOUNDARY.

## Known Stubs
None — this plan establishes contracts (DTOs, strategy/guard, schema). No controller/service wiring yet; that is intentional and lands in Plans 02/03.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema columns, narrow DTOs, and portal-jwt strategy/guard are ready for Plan 02/03 to wire the public controller, brute-force lock service, JWT emission, and per-route `ValidationPipe({ whitelist: true })`.
- Reminder for downstream: the project has NO global `ValidationPipe` — the narrow DTOs only enforce SC#3/SC#4 once each write route applies `@Body(new ValidationPipe({ whitelist: true }))`.

## Self-Check: PASSED

All 5 created files + SUMMARY exist on disk; all 4 commits (394c187, 6a2fc92, 9a9255e, 366be28) present in git log.

---
*Phase: 54-portal-backend-token-security*
*Completed: 2026-06-30*
