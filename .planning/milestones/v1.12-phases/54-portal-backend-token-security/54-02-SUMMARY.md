---
phase: 54-portal-backend-token-security
plan: 02
subsystem: api
tags: [nestjs, prisma, jwt, brute-force, sha256, portal, security, tdd]

# Dependency graph
requires:
  - phase: 54-portal-backend-token-security
    plan: 01
    provides: Paciente portal brute-force columns, UpdateContactoPortalDto + UpdateSaludStagedDto, portal-jwt strategy/guard
  - phase: 52-portal-link-generation
    provides: SHA-256 portalToken hash lookup contract
provides:
  - PacientePortalService.preVerify (existence-only 200/404, no patient data, D-07)
  - PacientePortalService.getDatos (editable contact + read-only context + staged values, never curated clinical/CRM, D-08/D-09)
  - PacientePortalService.verificar (hash lookup + persistent 3-strike lock → 429 + portal-scoped JWT, D-01..D-05)
  - PacientePortalService.updateContacto / updateSaludStaged (allow-list confined prisma writes, SC#4)
affects: [54-03, paciente-portal controller, portal public + authenticated routes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SHA-256 hash lookup by Paciente.portalToken; raw URL token never stored/compared (T-54-04)"
    - "Block-duration brute-force lock over 2 columns (counter + bloqueadoHasta), no per-attempt timestamp (D-03)"
    - "Prisma data object built from a key allow-list (pickPresent) as the mass-assignment guard (defense in depth alongside Plan 03 whitelist pipe)"
    - "Portal-scoped JWT (scope=portal-paciente, 45m TTL) emitted only on successful DNI verify"

key-files:
  created:
    - backend/src/modules/paciente-portal/paciente-portal.service.ts
    - backend/src/modules/paciente-portal/paciente-portal.service.spec.ts
  modified: []

key-decisions:
  - "Block-duration lock model (not rolling window): 3 consecutive failures → single 15-min block → fresh 3 attempts only after expiry; counter resets only when bloqueadoHasta is SET and < now (avoids dead 429 branch)"
  - "getDatos includes próxima cirugía PROGRAMADA as read-only context (planner discretion per D-08); obra social surfaced via nested relation select"
  - "429 body shape: { statusCode, message, bloqueadoHasta, retryAfter } (Claude discretion per D)"

patterns-established:
  - "pickPresent<T>(input, allowed[]) confines prisma update data to an explicit allow-list — curated clinical fields never reachable"

requirements-completed: [PORTAL-01, PORTAL-04, PORTAL-06]

# Metrics
duration: 5min
completed: 2026-06-30
---

# Phase 54 Plan 02: Portal Service — Token Security, Brute-Force Lock & Confined Writes Summary

**The security heart of the portal: SHA-256 token lookup (no patient data on unknown token), a persistent block-duration brute-force lock that 429s after 3 failed DNI attempts and emits a portal-scoped JWT on success, a clinical-safe authenticated read, and two writes confined to a key allow-list — proven by an 11-case unit spec written TDD-first.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-30T19:45:51Z
- **Completed:** 2026-06-30T19:50:57Z
- **Tasks:** 3 (Task 2 executed TDD: RED → GREEN)
- **Files modified:** 2 (both created)

## Accomplishments
- `preVerify(rawToken)` hashes the raw URL token, looks it up by `portalToken`, and returns existence + a `bloqueado` flag only — an unknown token throws `NotFoundException` (404) leaking no patient data (D-07, T-54-04).
- `getDatos(pacienteId)` assembles editable contact + read-only context (name, dni, obra social, próxima cirugía) + the four `*AutoReportad*` staged values, and NEVER selects/returns curated clinical arrays or CRM-routing columns (D-08/D-09, PORTAL-04).
- `verificar(rawToken, dni)` implements the persistent block-duration lock: active block → immediate 429; no-DNI patient rejected; 3 consecutive wrong DNIs set a 15-min block + 429; correct DNI resets the counter/block and returns a `scope: 'portal-paciente'` JWT (D-01..D-05, PORTAL-01).
- `updateContacto` / `updateSaludStaged` build the prisma `data` object from an explicit key allow-list (`pickPresent`), so injected curated `alergias`/`condiciones`/`medicacion` or identity/CRM keys can never be mass-assigned (SC#4, T-54-06).

## Task Commits

Each task was committed atomically:

1. **Task 1: Token hash lookup + pre-verify + clinical-safe read** - `5e7ac2b` (feat)
2. **Task 2 (TDD RED): failing brute-force lock spec** - `908dcea` (test)
3. **Task 2 (TDD GREEN): verify + lock + portal JWT** - `a68f5e0` (feat)
4. **Task 3: confined contact + staged-health writes** - `1acb07e` (feat)

## Files Created/Modified
- `backend/src/modules/paciente-portal/paciente-portal.service.ts` - The portal service: `hashToken`/`findByRawToken`, `preVerify`, `getDatos`, `verificar` (lock + JWT), `updateContacto`/`updateSaludStaged`, `pickPresent` allow-list helper, `bloqueadoException` (429).
- `backend/src/modules/paciente-portal/paciente-portal.service.spec.ts` - 11 unit cases: hash lookup, 404, bloqueado flag, counter accumulation, 3rd-strike 429 with ~15-min block, active-block 429, expired-block reset, reset-on-success JWT, no-DNI rejection, and write-confinement for both methods.

## Decisions Made
- **Block-duration lock, not a rolling window.** With only `portalIntentosFallidos` + `portalBloqueadoHasta` (no per-attempt timestamp) a true rolling 15-min counting window is not implementable. Implemented per D-03: 3 consecutive failures → one 15-min block → a fresh 3 attempts only once the block expires. The counter resets to 0 ONLY when `portalBloqueadoHasta` is SET and `< now`; it is never reset on the `null` case (attempts 1-2), which would otherwise zero the counter on every normal failure and make the 429 branch dead code. The spec explicitly asserts the 1st/2nd failures accumulate (1→2) and only the 3rd 429s.
- **`getDatos` read-only context includes próxima cirugía PROGRAMADA** (planner discretion per D-08) via a separate `cirugia.findFirst`, plus obra social name via a nested relation select. No curated clinical or CRM field is ever selected.
- **429 body shape** `{ statusCode, message, bloqueadoHasta, retryAfter }` (Claude discretion per D) — gives the F55 frontend enough to render a countdown.

## Deviations from Plan

None — plan executed exactly as written. All three tasks implemented the specified methods, the TDD gate sequence for Task 2 produced a `test(...)` commit (RED) followed by a `feat(...)` commit (GREEN), and every acceptance grep/test passed.

## Issues Encountered
- The service doc-comments initially contained the literal forbidden tokens (`etapaCRM`/`flujo` and bare `alergias`/`condiciones`/`medicacion`), which tripped Task 1's acceptance grep (the same snag noted in Plan 01). Reworded the comments to describe the omitted categories without the literal tokens before committing Task 1. Not a code change — no functional impact.

## Deferred Issues
- Repo-wide pre-existing ESLint failures (45 `no-unused-vars`/etc. errors in `reportes`/`stock`/`wsaa`) keep `npm run lint` exit non-zero. The new `paciente-portal/*` files are lint-clean (`npm run lint | grep paciente-portal` returns nothing). Out of scope per SCOPE BOUNDARY; already logged in Plan 01's `deferred-items.md`.

## Known Stubs
None — every method is fully wired against `PrismaService`/`JwtService`. HTTP wiring (controller, per-route guards + `ValidationPipe({ whitelist: true })`, module registration) is intentionally Plan 03's scope.

## User Setup Required
None - no external service configuration required.

## TDD Gate Compliance
Task 2 followed RED → GREEN: `908dcea` (test, failing) precedes `a68f5e0` (feat, passing). No REFACTOR commit was needed (implementation was clean on first green). Gate satisfied.

## Threat Flags
None — no new security surface beyond the plan's `<threat_model>`. T-54-04 (hash lookup), T-54-05 (3-strike lock), T-54-06 (mass-assignment guard), T-54-07 (no-DNI rejection) and T-54-08 (scoped JWT) are all mitigated and unit-covered.

## Next Phase Readiness
- The service exposes the five public methods Plan 03 binds to its public + JWT-guarded routes: `preVerify` (`@Get(':token')`), `verificar` (`@Post(':token/verificar')`), `getDatos` (guarded `@Get()`), `updateContacto`/`updateSaludStaged` (guarded `@Patch`).
- Reminder for Plan 03: there is NO global `ValidationPipe` — each write route MUST apply `@Body(new ValidationPipe({ whitelist: true }))` for the narrow DTOs to strip extra keys. The service-level `pickPresent` allow-list is defense-in-depth, not a replacement for the route pipe.

## Self-Check: PASSED

Both created files exist on disk; all 4 commits (5e7ac2b, 908dcea, a68f5e0, 1acb07e) present in git log.

---
*Phase: 54-portal-backend-token-security*
*Completed: 2026-06-30*
