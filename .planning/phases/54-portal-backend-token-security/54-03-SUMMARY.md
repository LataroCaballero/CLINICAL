---
phase: 54-portal-backend-token-security
plan: 03
subsystem: api
tags: [nestjs, controller, throttler, jwt, passport, validation-pipe, portal, security]

# Dependency graph
requires:
  - phase: 54-portal-backend-token-security
    plan: 01
    provides: PortalJwtGuard, UpdateContactoPortalDto, UpdateSaludStagedDto
  - phase: 54-portal-backend-token-security
    plan: 02
    provides: PacientePortalService (preVerify, verificar, getDatos, updateContacto, updateSaludStaged)
provides:
  - PacientePortalController public routes (GET :token pre-verify 200/404, POST :token/verificar → portal JWT) under strict 20/min throttle, no guard
  - PacientePortalController JWT-guarded routes (GET datos, PATCH datos-personales, PATCH salud) with per-route ValidationPipe whitelist (SC#3)
  - PacientePortalModule wiring controller/service/strategy/guard + own JwtModule + PassportModule
  - AppModule registration of PacientePortalModule
affects: [F55 portal frontend, portal HTTP surface]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-route explicit `new ValidationPipe({ whitelist: true })` as the ONLY mass-assignment guard (no global pipe in this project) — whitelist-only, prohibited fields stripped silently (200), no reject-on-extra (D-12)"
    - "Public + JWT-guarded routes in one controller: guard applied per-route only, class-level strict @Throttle tier over the global APP_GUARD"
    - "pacienteId sourced from req.user (portal-jwt strategy), never URL/body (pitfall 12)"
    - "Feature module registers its own JwtModule + PassportModule because AuthModule (@Global) does not export JwtService"

key-files:
  created:
    - backend/src/modules/paciente-portal/paciente-portal.controller.ts
    - backend/src/modules/paciente-portal/paciente-portal.module.ts
  modified:
    - backend/src/app.module.ts

key-decisions:
  - "Reworded doc-comments to avoid the literal token `forbidNonWhitelisted` (it would trip the acceptance grep that asserts the option is absent) — same snag noted in Plans 01/02"
  - "Authenticated route paths: GET `/` (datos), PATCH `datos-personales` (contact), PATCH `salud` (staged) — paths are planner discretion per D-10"
  - "verificar route returns the service result (portal JWT string) directly; 429/401 propagate unchanged from the service"

patterns-established:
  - "Portal write routes are protected by a per-route whitelist pipe + service-side pickPresent allow-list (defense in depth)"

requirements-completed: [PORTAL-01, PORTAL-04, PORTAL-06]

# Metrics
duration: 3min
completed: 2026-06-30
---

# Phase 54 Plan 03: Portal HTTP Surface — Public + Guarded Routes & Module Wiring Summary

**The portal goes live over HTTP: a strict-throttled public controller for token pre-verify (200/404) and DNI verify (portal JWT / 429 / 401), three PortalJwtGuard-protected routes (read + two writes) where each write carries the load-bearing explicit `new ValidationPipe({ whitelist: true })` that silently strips prohibited fields (SC#3), and a module that registers its own JwtModule/PassportModule and is wired into AppModule.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-30T19:52:52Z
- **Completed:** 2026-06-30T19:55:36Z
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Public controller tier: `@Get(':token')` pre-verify (200/404, no patient data, D-07) and `@Post(':token/verificar')` DNI verify (D-05), both under class-level `@Throttle({ default: { ttl: 60000, limit: 20 } })` and NO class-level guard (PORTAL-01, T-54-09).
- Authenticated tier, each `@UseGuards(PortalJwtGuard)` with `pacienteId` from `req.user` (never URL/body, T-54-11): `@Get()` → `getDatos` (D-08/D-09); `@Patch('datos-personales')` → `updateContacto`; `@Patch('salud')` → `updateSaludStaged`.
- Both write routes apply an explicit `new ValidationPipe({ whitelist: true })` — the only place SC#3 is enforced (no global pipe). The reject-on-extra option is deliberately omitted so prohibited fields (`alergias`/`etapaCRM`/`dni`/`obraSocialId`...) are silently stripped, returning 200 (D-12/T-54-10).
- `PacientePortalModule` registers controller + service + `PortalJwtStrategy` + `PortalJwtGuard`, plus its OWN `PassportModule` + `JwtModule.register({ secret: JWT_SECRET })` (AuthModule does not export JwtService). Registered in `app.module.ts` imports next to `ConsentimientosModule`. Full backend builds.

## Task Commits

1. **Task 1: public pre-verify + verify routes under strict throttle** - `144c92f` (feat)
2. **Task 2: JWT-guarded read + write routes with per-route whitelist pipes** - `0079938` (feat)
3. **Task 3: module wiring + AppModule registration** - `bd2f5b2` (feat)

## Files Created/Modified
- `backend/src/modules/paciente-portal/paciente-portal.controller.ts` - Public (throttled, unguarded) pre-verify/verify + three PortalJwtGuard routes; both writes carry explicit whitelist pipes; `pacienteId` always from `req.user`.
- `backend/src/modules/paciente-portal/paciente-portal.module.ts` - Module wiring with own JwtModule + PassportModule; controller, service, strategy, guard providers.
- `backend/src/app.module.ts` - Added the import line and `PacientePortalModule` to the imports array.

## Decisions Made
- **Avoided the literal `forbidNonWhitelisted` token in comments.** Task 2's acceptance asserts the option does NOT appear anywhere in the controller (`! grep -q forbidNonWhitelisted`); the initial doc-comments referenced it by name and tripped the grep. Reworded to "whitelist-only / reject-on-extra omitted" — same documentation snag flagged in Plans 01/02. No functional change.
- **Authenticated route paths** `GET /`, `PATCH datos-personales`, `PATCH salud` (paths are planner discretion per D-10). The verify route returns the service's portal-JWT string directly; the service's 429/401 propagate unchanged.

## Deviations from Plan

None — plan executed exactly as written. All three tasks implemented the specified routes/wiring; every acceptance grep and `npm run build` passed.

## Issues Encountered
- The `forbidNonWhitelisted` literal in doc-comments tripped Task 2's "must NOT appear" grep; reworded the comments before committing. Documentation-only, no code impact.

## Deferred Issues
- Repo-wide pre-existing ESLint failures (in `reportes`/`stock`/`wsaa`) keep the full `npm run lint` exit non-zero. The new `paciente-portal/*` files are lint-clean (`npm run lint | grep paciente-portal` returns nothing). Out of scope per SCOPE BOUNDARY; already logged in Plan 01's `deferred-items.md`.

## Known Stubs
None — controller routes are fully bound to live service methods; module DI is complete and the backend builds.

## Threat Flags
None — no security surface beyond the plan's `<threat_model>`. T-54-09 (public-route throttle), T-54-10 (whitelist mass-assignment strip), T-54-11 (per-route guard + req.user scope), T-54-12 (pre-verify 200/404) are all mitigated.

## Verification Notes
- `cd backend && npm run build` compiles with the module registered. DI graph resolves at compile time; a live boot smoke (`npm run start`) was not run here as it requires the Supabase DB + Redis connections — the build + module wiring (own JwtModule satisfying the service's JwtService dependency) is the compile-time guarantee.
- Behavior (for verifier UAT): a PATCH `datos-personales` / `salud` body containing `alergias[]`/`etapaCRM`/`dni` returns 200 and leaves those columns unchanged (whitelist strips them silently).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The portal HTTP surface is live: F55 (portal frontend) can consume `GET /paciente-portal/public/:token`, `POST /paciente-portal/public/:token/verificar`, and the JWT-guarded `GET /paciente-portal/public`, `PATCH /paciente-portal/public/datos-personales`, `PATCH /paciente-portal/public/salud`.
- Phase 54 backend (token security, brute-force lock, confined writes, throttled public surface) is complete across Plans 01-03.

## Self-Check: PASSED

All 3 files (controller, module, app.module) exist on disk; all 3 task commits (144c92f, 0079938, bd2f5b2) present in git log.

---
*Phase: 54-portal-backend-token-security*
*Completed: 2026-06-30*
