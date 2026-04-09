---
phase: 13-wsaa-token-service
plan: 02
subsystem: api
tags: [afip, wsaa, nestjs, redis, node-forge, openssl-removal]

# Dependency graph
requires:
  - phase: 13-01
    provides: WsaaModule with WsaaService (node-forge CMS signing, Redis cache, mutex) + WSAA_SERVICE token
provides:
  - AfipConfigService fully wired to WsaaService (no openssl subprocess, no child_process, no /tmp)
  - Warm Redis cache after cert save — first invoice hits cache, not WSAA cold-start
  - WsaaModule registered in AppModule — importable by any future module (Phase 14 FinanzasModule)
affects: [14-emision-cae-real, afip-config, finanzas]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Token injection pattern: @Inject(WSAA_SERVICE) wsaaService: WsaaServiceInterface — avoids circular dep between AfipConfigModule and WsaaModule"
    - "Non-blocking cache warm: try/catch wrapping getTicket() after cert save — cert save success is independent of Redis availability"

key-files:
  created: []
  modified:
    - backend/src/modules/afip-config/afip-config.service.ts
    - backend/src/modules/afip-config/afip-config.module.ts
    - backend/src/modules/afip-config/afip-config.service.spec.ts
    - backend/src/modules/wsaa/wsaa.module.ts
    - backend/src/app.module.ts

key-decisions:
  - "WsaaModule does NOT import AfipConfigModule — WsaaService loads cert+key directly via PrismaService. AfipConfigModule imports WsaaModule. This breaks the circular dependency."
  - "Warm cache call (getTicket) is non-blocking (try/catch) — cert save already succeeded at that point; Redis unavailability must not fail the cert upload"
  - "afip-config.service.spec.ts updated with WSAA_SERVICE mock — all 17 tests pass with new injection signature"

patterns-established:
  - "WSAA_SERVICE injection pattern: any module that needs AFIP auth tokens imports WsaaModule and injects @Inject(WSAA_SERVICE) wsaaService: WsaaServiceInterface"

requirements-completed: [CAE-01]

# Metrics
duration: 15min
completed: 2026-03-20
---

# Phase 13 Plan 02: AfipConfigService Rewired to WsaaService Summary

**openssl subprocess eliminated from AfipConfigService — all WSAA calls now delegate to WsaaService via node-forge in-process CMS signing, with warm Redis cache after cert save**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-20T23:12:00Z
- **Completed:** 2026-03-20T23:27:11Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Replaced `getWsaaTicketTransient()` subprocess (openssl + child_process + /tmp writes) with `wsaaService.getTicketTransient()` in AfipConfigService
- Added warm Redis cache call (`wsaaService.getTicket()`) after cert upsert — first invoice emission hits cache, zero cold-start WSAA latency
- Removed circular dependency: `WsaaModule` no longer imports `AfipConfigModule` (WsaaService loads cert/key via PrismaService directly); `AfipConfigModule` imports `WsaaModule`
- WsaaModule registered in AppModule — globally available for Phase 14 FinanzasModule
- All 26 tests pass (9 wsaa + 17 afip-config)

## Task Commits

1. **Task 1: Rewire AfipConfigService + fix circular dep** - `3d3ee1c` (feat)
2. **Task 2: Register WsaaModule in AppModule + fix tests** - `18cbac4` (feat)

## Files Created/Modified

- `backend/src/modules/afip-config/afip-config.service.ts` — removed getWsaaTicketTransient/buildTra methods; injected WSAA_SERVICE; added warm cache call
- `backend/src/modules/afip-config/afip-config.module.ts` — added WsaaModule to imports
- `backend/src/modules/afip-config/afip-config.service.spec.ts` — added WSAA_SERVICE mock provider (Rule 1 fix)
- `backend/src/modules/wsaa/wsaa.module.ts` — removed AfipConfigModule import (broke circular dep)
- `backend/src/app.module.ts` — added WsaaModule registration

## Decisions Made

- WsaaModule removes AfipConfigModule from its imports — WsaaService uses PrismaService directly to load encrypted cert/key, which avoids the circular dependency entirely. This was the clean architectural choice since WsaaService never needed AfipConfigService (only the raw DB data).
- Warm cache call is non-blocking: wrapped in try/catch so Redis failure never fails cert upload. Cert save is a rare admin operation; any warm-cache failure is just a minor latency penalty on the first invoice.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] afip-config.service.spec.ts missing WSAA_SERVICE mock after injection added**
- **Found during:** Task 2 (verification)
- **Issue:** Test module setup did not provide WSAA_SERVICE token; all 13 service tests failing with "Nest can't resolve dependencies"
- **Fix:** Added `{ provide: WSAA_SERVICE, useValue: mockWsaaService }` to test module providers; added import for WSAA_SERVICE constant
- **Files modified:** backend/src/modules/afip-config/afip-config.service.spec.ts
- **Verification:** 17/17 afip-config tests pass
- **Committed in:** 18cbac4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — test setup bug caused by new dependency injection)
**Impact on plan:** Necessary correctness fix. Tests were broken by the new WsaaService injection; mock was the standard NestJS testing pattern.

## Issues Encountered

- Circular dependency between WsaaModule and AfipConfigModule was anticipated in the plan (Task 2 explicitly describes the fix). Resolution was straightforward: remove AfipConfigModule from WsaaModule imports since WsaaService never used AfipConfigService — it only needs PrismaService (global) and EncryptionService (from WhatsappModule).

## Next Phase Readiness

- Phase 14 (WSFEv1 CAE emission): import WsaaModule in FinanzasModule, inject `@Inject(WSAA_SERVICE) wsaaService: WsaaServiceInterface`, call `wsaaService.getTicket(profesionalId, 'wsfe')` to get token+sign for SOAP calls
- No openssl subprocess remains anywhere in the AFIP path
- Security fix complete: private keys never touch /tmp

---
*Phase: 13-wsaa-token-service*
*Completed: 2026-03-20*
