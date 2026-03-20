---
phase: 13-wsaa-token-service
verified: 2026-03-20T23:45:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 13: WSAA Token Service Verification Report

**Phase Goal:** Build a production-ready WsaaService (CMS signing, Redis cache, per-CUIT mutex) and integrate it into AfipConfigService, eliminating the openssl subprocess risk.
**Verified:** 2026-03-20T23:45:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | WsaaService.getTicket() returns a valid AccessTicket (token, sign, expiresAt) from WSAA via CMS-signed TRA | VERIFIED | wsaa.service.ts:38-82 — full implementation with loadConfig, signTra (node-forge), callWsaa, XML parse |
| 2 | WsaaService.getTicket() caches the ticket in Redis with key `afip_ta:{profesionalId}:{cuit}:{service}` and TTL = expiry - 5min | VERIFIED | wsaa.service.ts:41,69-78 — exact key format and TTL guard; Test 2 asserts key format and TTL bounds |
| 3 | Two concurrent getTicket() calls for the same CUIT serialize via async-mutex — only one WSAA call fires | VERIFIED | wsaa.service.ts:25,43-45 — mutexMap + runExclusive; Test 3 passes with Promise.all (axiosPostSpy called exactly 1 time) |
| 4 | Redis failure degrades gracefully — getTicket() falls through to live WSAA call without throwing | VERIFIED | wsaa.service.ts:221-238 — redisSafeGet/redisSafeSet wrap all Redis calls in try/catch; Tests 4 and 5 pass |
| 5 | WsaaStubService returns hardcoded stub ticket without Redis or WSAA dependency | VERIFIED | wsaa-stub.service.ts:23-29 — stubTicket() returns `{ token: 'stub-token', sign: 'stub-sign', expiresAt: +12h }` with zero external imports |
| 6 | WsaaModule conditionally provides WsaaStubService when USE_AFIP_STUB=true | VERIFIED | wsaa.module.ts:47-50 — useFactory checks `USE_AFIP_STUB === 'true'` and returns `new WsaaStubService()` |
| 7 | AfipConfigService.saveCert() uses WsaaService.getTicketTransient() instead of openssl subprocess | VERIFIED | afip-config.service.ts:114-119 — `wsaaService.getTicketTransient(dto.certPem, dto.keyPem, dto.ambiente, 'wsfe')` |
| 8 | After cert save, WsaaService.getTicket() is called to warm the Redis cache | VERIFIED | afip-config.service.ts:149-154 — try/catch wrapped `wsaaService.getTicket(profesionalId, 'wsfe')` after upsert |
| 9 | No openssl subprocess, child_process import, or /tmp file writes remain in AfipConfigService | VERIFIED | grep of afip-config/ for execSync, child_process, openssl, mkdtemp — zero matches |
| 10 | WsaaModule is registered in app.module.ts and importable by any module | VERIFIED | app.module.ts:28,76 — import and array entry confirmed |
| 11 | Backend compiles and all tests pass (26 total: 9 wsaa + 17 afip-config) | VERIFIED | `npx tsc --noEmit` zero errors (excl. pre-existing e2e-spec rootDir issue); all 26 tests pass |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact | Min Lines | Actual Lines | Status | Details |
|----------|-----------|--------------|--------|---------|
| `backend/src/modules/wsaa/wsaa.interfaces.ts` | — | 27 | VERIFIED | Exports `AccessTicket` and `WsaaServiceInterface` with correct signatures |
| `backend/src/modules/wsaa/wsaa.constants.ts` | — | 2 | VERIFIED | Exports `WSAA_SERVICE` and `WSAA_REDIS_CLIENT` as string constants |
| `backend/src/modules/wsaa/wsaa.service.ts` | 120 | 239 | VERIFIED | Full implementation: loadConfig, buildTra, signTra (node-forge), callWsaa, getTicket, getTicketTransient, redisSafeGet/Set |
| `backend/src/modules/wsaa/wsaa-stub.service.ts` | 20 | 30 | VERIFIED | Implements `WsaaServiceInterface`, no external dependencies |
| `backend/src/modules/wsaa/wsaa.module.ts` | 30 | 57 | VERIFIED | Conditional Redis factory + WSAA_SERVICE factory; exports WSAA_SERVICE |
| `backend/src/modules/wsaa/wsaa.service.spec.ts` | 80 | 288 | VERIFIED | 9 unit tests, all passing; covers all CAE-01 behaviors |
| `backend/src/modules/afip-config/afip-config.service.ts` | — | 239 | VERIFIED | Contains `wsaaService.getTicketTransient` (line 114, 169) and `wsaaService.getTicket` (line 151) |
| `backend/src/modules/afip-config/afip-config.module.ts` | — | 19 | VERIFIED | Imports `WsaaModule` in the imports array |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `wsaa.service.ts` | ioredis | `@Inject(WSAA_REDIS_CLIENT)` constructor injection | WIRED | Line 31: `@Inject(WSAA_REDIS_CLIENT) private readonly redis: Redis \| null` |
| `wsaa.service.ts` | node-forge | `signTra()` using `forge.pkcs7.createSignedData()` | WIRED | Lines 148-166: full CMS PKCS#7 SignedData signing, `detached: false` |
| `wsaa.service.ts` | async-mutex | `Mutex` per CUIT in mutexMap | WIRED | Lines 6,25,43-45: `new Mutex()`, `mutexMap.set`, `mutex.runExclusive` |
| `wsaa.module.ts` | `wsaa.service.ts` | Conditional provider under `WSAA_SERVICE` token | WIRED | Lines 39-53: useFactory returns WsaaService or WsaaStubService based on USE_AFIP_STUB |
| `afip-config.service.ts` | `wsaa.service.ts` | `@Inject(WSAA_SERVICE) wsaaService: WsaaServiceInterface` | WIRED | Line 31: injection; lines 114, 151, 169: active usage |
| `afip-config.service.ts` | `WsaaService.getTicket()` | warm cache call after cert save | WIRED | Lines 149-154: try/catch `wsaaService.getTicket(profesionalId, 'wsfe')` |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CAE-01 | 13-01, 13-02 | Sistema obtiene Access Ticket de WSAA con firma CMS in-process via `node-forge`, cacheado en Redis (clave `afip_ta:{profesionalId}:{cuit}:{service}`, TTL = expiry menos 5 min, ~11hs), con `async-mutex` por CUIT para evitar renovaciones concurrentes | SATISFIED | WsaaService implements every element: node-forge CMS signing (wsaa.service.ts:147-167), Redis cache with exact key format (line 41) and TTL guard (lines 69-78), async-mutex per profesionalId:cuit (lines 25,43-45); 9 unit tests verify all behaviors; AfipConfigService fully rewired (no openssl) |

No orphaned requirements detected. REQUIREMENTS.md marks CAE-01 as Phase 13 / Complete.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `wsaa.service.spec.ts` | 15-16 | `CERT_PEM_PLACEHOLDER`, `KEY_PEM_PLACEHOLDER` as constant names | Info | Intentional mock constant names — signTra is spied out to avoid needing real PEM certs. Not a stub anti-pattern. |
| `afip-config.service.ts` | 210-212 | `NOTE: Verify element name against live WSDL during integration testing` | Info | Informational comment about future integration test validation of SOAP element name variant. Implementation is complete and functional; this is a documentation note for QA, not a code gap. |

No blocker or warning-level anti-patterns found.

---

### Human Verification Required

The following items cannot be verified programmatically:

#### 1. Live WSAA SOAP Round-trip (HOMOLOGACION)

**Test:** Configure a real AFIP homologacion certificate via the cert upload endpoint, then call an invoice endpoint to trigger `getTicket()`.
**Expected:** Backend logs show Redis miss on first call, WSAA responds with a valid token/sign pair, and subsequent calls within ~11h return the cached ticket without contacting WSAA.
**Why human:** Requires a real AFIP homologacion CUIT, valid PEM cert+key, live Redis instance, and AFIP WSAA endpoint availability. Cannot be automated without production credentials.

#### 2. Redis Degradation Under Live Conditions

**Test:** Start the backend with Redis intentionally stopped (REDIS_HOST pointing to unreachable host), upload a cert, and attempt a billing action that triggers `getTicket()`.
**Expected:** The operation completes successfully (WSAA called directly), and the backend logs a `warn` about Redis GET/SET failure without throwing a 500 error to the client.
**Why human:** Requires environment control (Redis down) and end-to-end request tracing. Behavior is unit-tested but runtime degradation path needs confirmation in integration.

#### 3. Concurrent Token Request Serialization Under Load

**Test:** Fire 5+ simultaneous invoice emission requests for the same CUIT (e.g., via k6 or curl with `&`) when Redis is empty.
**Expected:** Exactly one WSAA SOAP call appears in backend logs; all 5 requests receive valid tickets.
**Why human:** Concurrent behavior beyond what unit tests can fully validate with mocked mutex state.

---

### Gaps Summary

No gaps. All automated checks passed. Phase goal fully achieved.

The WsaaModule is a complete, production-grade implementation:
- CMS signing via node-forge (in-process, no openssl subprocess, no /tmp key exposure)
- Redis caching with the exact key format and TTL strategy specified in CAE-01
- Per-CUIT mutex via async-mutex serializing concurrent WSAA calls
- Graceful Redis degradation (warn + continue, never throw to callers)
- Conditional DI swap via USE_AFIP_STUB for local development
- AfipConfigService fully rewired, openssl subprocess deleted, warm cache call added
- WsaaModule registered in AppModule with no circular dependencies
- 26 unit tests passing (9 wsaa + 17 afip-config)

---

_Verified: 2026-03-20T23:45:00Z_
_Verifier: Claude (gsd-verifier)_
