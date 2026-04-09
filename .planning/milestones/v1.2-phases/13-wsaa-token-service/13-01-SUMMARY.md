---
phase: 13-wsaa-token-service
plan: 01
subsystem: infra
tags: [node-forge, ioredis, async-mutex, afip, wsaa, cms, pkcs7, redis-cache]

# Dependency graph
requires:
  - phase: 12-schema-afip-extendido-gestion-certificados
    provides: ConfiguracionAFIP DB model with certPemEncrypted/keyPemEncrypted, EncryptionService, AfipConfigModule

provides:
  - WsaaModule with conditional stub/real provider swap via USE_AFIP_STUB
  - WsaaService.getTicket(): Redis-cached + per-CUIT mutex WSAA token retrieval
  - WsaaService.getTicketTransient(): direct WSAA call (no cache/mutex) for cert validation
  - WsaaStubService: hardcoded ticket for local dev without Redis/WSAA
  - AccessTicket interface + WsaaServiceInterface contract
  - WSAA_SERVICE + WSAA_REDIS_CLIENT DI tokens

affects:
  - 13-02 (AfipConfigModule plan — will replace getWsaaTicketTransient openssl subprocess with WsaaService.getTicketTransient)
  - 14-wsaa-cae-real (WSFEv1 service will inject WSAA_SERVICE for per-invoice token)

# Tech tracking
tech-stack:
  added:
    - node-forge@1.3.3 (CMS/PKCS#7 signing in-process, eliminates openssl subprocess)
    - ioredis@^5.10.1 (Redis client for WSAA ticket cache)
    - async-mutex@^0.5.0 (per-CUIT mutex to serialize concurrent WSAA calls)
    - "@types/node-forge@^1.3.14" (TypeScript types for node-forge)
  patterns:
    - Redis degradation pattern: redisSafeGet/redisSafeSet wrap all Redis calls in try/catch, warn+continue on failure
    - Per-key mutex pattern: Map<string, Mutex> keyed by "profesionalId:cuit" to serialize concurrent token requests
    - Conditional NestJS DI swap: useFactory checks USE_AFIP_STUB env to return stub or real instance

key-files:
  created:
    - backend/src/modules/wsaa/wsaa.interfaces.ts
    - backend/src/modules/wsaa/wsaa.constants.ts
    - backend/src/modules/wsaa/wsaa-stub.service.ts
    - backend/src/modules/wsaa/wsaa.module.ts
    - backend/src/modules/wsaa/wsaa.service.ts
    - backend/src/modules/wsaa/wsaa.service.spec.ts
  modified:
    - backend/package.json (added node-forge, ioredis, async-mutex, @types/node-forge)

key-decisions:
  - "signTra() is public (not private) to allow Jest to spy on it in tests — CMS signing tested indirectly via mock spy"
  - "signingTime authenticatedAttribute uses ISO string value (not Date object) — @types/node-forge requires string type"
  - "buildWsaaResponse test helper uses UTC ISO-8601 (not AFIP -03:00 format) to avoid timezone offset inflating TTL in tests"
  - "Test 3 simulates Redis caching behavior via mutable closure in mock.mockImplementation to prove mutex serialization"
  - "AFIP_WSAA_URL_HOMO / AFIP_WSAA_URL_PROD env vars supported in callWsaa() with sane defaults (per STATE.md research flag)"

patterns-established:
  - "WSAA_SERVICE injection token pattern: downstream modules inject via @Inject(WSAA_SERVICE) to get real or stub automatically"
  - "Redis TTL guard: ttlSeconds = floor((expiresAt - now)/1000 - 300); skip SET if <= 0"
  - "Mutex key format: {profesionalId}:{cuit} — scoped to tenant+identity pair"
  - "Redis cache key format: afip_ta:{profesionalId}:{cuit}:{service}"

requirements-completed: [CAE-01]

# Metrics
duration: 35min
completed: 2026-03-20
---

# Phase 13 Plan 01: WSAA Token Service Summary

**node-forge CMS signing + Redis-cached per-CUIT mutex WSAA token service eliminating openssl subprocess security risk**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-03-20T00:00:00Z
- **Completed:** 2026-03-20T00:35:00Z
- **Tasks:** 2 (Task 1: contracts + stub + dependencies; Task 2: TDD WsaaService implementation)
- **Files modified:** 7 created, 2 modified (package.json, package-lock.json)

## Accomplishments

- WsaaModule with USE_AFIP_STUB conditional DI swap — stub returns hardcoded ticket with zero Redis/WSAA dependency
- WsaaService.getTicket() with Redis cache (afip_ta:{profesionalId}:{cuit}:{service}), per-CUIT async-mutex, and graceful Redis degradation (warn + continue, never throw)
- WsaaService.getTicketTransient() for transient cert validation calls — no mutex, no cache
- node-forge CMS PKCS#7 SignedData signing (detached: false) — eliminates the openssl subprocess + /tmp key exposure security risk from AfipConfigService
- 9 unit tests passing covering all CAE-01 behaviors: cache hit/miss, concurrency, Redis failure (GET + SET), signTra base64 output, transient no-Redis, TTL guard, WSAA 5xx propagation

## Task Commits

1. **Task 1: Install dependencies and create WsaaModule contracts + stub** - `878d177` (feat)
2. **Task 2: Implement WsaaService with CMS signing, Redis cache, per-CUIT mutex** - `58f318c` (feat)

## Files Created/Modified

- `backend/src/modules/wsaa/wsaa.interfaces.ts` - AccessTicket interface + WsaaServiceInterface contract
- `backend/src/modules/wsaa/wsaa.constants.ts` - WSAA_SERVICE + WSAA_REDIS_CLIENT DI tokens
- `backend/src/modules/wsaa/wsaa-stub.service.ts` - Stub returning hardcoded ticket, no external deps
- `backend/src/modules/wsaa/wsaa.module.ts` - NestJS module with conditional Redis + service factory providers
- `backend/src/modules/wsaa/wsaa.service.ts` - Real service: loadConfig, buildTra, signTra (node-forge), callWsaa, getTicket, getTicketTransient
- `backend/src/modules/wsaa/wsaa.service.spec.ts` - 9 unit tests (TDD, all passing)
- `backend/package.json` - Added node-forge@1.3.3, ioredis, async-mutex, @types/node-forge

## Decisions Made

- `signTra()` made public (not private) to enable Jest spy in unit tests — the alternative of testing forge directly would require real AFIP PEM certs in test fixtures
- `signingTime` authenticatedAttribute value uses `.toISOString()` string (not `new Date()`) to satisfy `@types/node-forge` type constraint (`value?: string`)
- Test helper `buildWsaaResponse()` uses UTC ISO-8601 string (not `-03:00` offset) to avoid the `replace('Z', '-03:00')` timezone trick inflating parsed expiry by 3h and breaking TTL assertions
- `AFIP_WSAA_URL_HOMO` / `AFIP_WSAA_URL_PROD` env vars supported in `callWsaa()` with sane defaults, per the STATE.md research flag recommending env-configurable WSAA URLs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed node-forge signingTime type error**
- **Found during:** Task 2 (WsaaService implementation)
- **Issue:** `@types/node-forge` requires `authenticatedAttributes[].value` to be `string | undefined`, but code passed `new Date()` object
- **Fix:** Changed `value: new Date()` to `value: new Date().toISOString()`
- **Files modified:** `backend/src/modules/wsaa/wsaa.service.ts`
- **Verification:** `npx tsc --noEmit` passes; tests pass
- **Committed in:** `58f318c` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed three unit test assertions (timezone, TTL bound, concurrency mock)**
- **Found during:** Task 2 GREEN phase (test run)
- **Issue:** (a) `buildWsaaResponse` helper used `.replace('Z', '-03:00')` causing Date to parse as +3h offset, inflating TTL; (b) Test 2 TTL bound used 12h cap that didn't account for offset; (c) Test 3 redis mock always returned null so second concurrent call couldn't see what first cached
- **Fix:** (a) Changed helper to use plain `.toISOString()` (UTC); (b) Updated TTL bound to `42910s`; (c) Replaced `mockResolvedValue(null)` with a closure-based mock that updates on SET
- **Files modified:** `backend/src/modules/wsaa/wsaa.service.spec.ts`
- **Verification:** All 9 tests pass
- **Committed in:** `58f318c` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2x Rule 1 - Bug)
**Impact on plan:** Both fixes were correctness issues found during TDD RED→GREEN cycle. No scope creep.

## Issues Encountered

- Pre-existing TypeScript error in `backend/test/app.e2e-spec.ts` (`rootDir` mismatch) — pre-existing, out of scope, not introduced by this plan

## User Setup Required

None - no external service configuration required for this plan. Redis uses existing REDIS_HOST/REDIS_PORT env vars. USE_AFIP_STUB=true bypasses Redis and WSAA entirely for local dev.

## Next Phase Readiness

- WsaaModule is ready to be imported by Plan 13-02 (AfipConfigModule update — replace openssl subprocess getWsaaTicketTransient with WsaaService.getTicketTransient injection)
- WSAA_SERVICE token ready for Phase 14 (WSFEv1) to inject for per-invoice token retrieval
- No blockers

## Self-Check: PASSED

- FOUND: backend/src/modules/wsaa/wsaa.interfaces.ts
- FOUND: backend/src/modules/wsaa/wsaa.constants.ts
- FOUND: backend/src/modules/wsaa/wsaa-stub.service.ts
- FOUND: backend/src/modules/wsaa/wsaa.module.ts
- FOUND: backend/src/modules/wsaa/wsaa.service.ts
- FOUND: backend/src/modules/wsaa/wsaa.service.spec.ts
- FOUND commit: 878d177 (Task 1)
- FOUND commit: 58f318c (Task 2)
- All 9 unit tests pass (verified via npx jest)
- TypeScript compiles clean (only pre-existing e2e-spec rootDir error, out of scope)

---
*Phase: 13-wsaa-token-service*
*Completed: 2026-03-20*
