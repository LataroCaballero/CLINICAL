---
phase: 13
slug: wsaa-token-service
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (NestJS default, already configured) |
| **Config file** | `backend/package.json` `jest` section |
| **Quick run command** | `cd backend && npx jest wsaa --testPathPattern=wsaa` |
| **Full suite command** | `cd backend && npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx jest wsaa --testPathPattern=wsaa`
- **After every plan wave:** Run `cd backend && npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 0 | CAE-01 | unit | `cd backend && npx jest wsaa.service --testPathPattern=wsaa.service` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 0 | CAE-01 | unit | `cd backend && npx jest wsaa.service --testPathPattern=wsaa.service` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | CAE-01 | unit | `cd backend && npx jest wsaa.service --testPathPattern=wsaa.service` | ❌ W0 | ⬜ pending |
| 13-01-04 | 01 | 1 | CAE-01 | unit | `cd backend && npx jest wsaa.service --testPathPattern=wsaa.service` | ❌ W0 | ⬜ pending |
| 13-01-05 | 01 | 1 | CAE-01 | unit | `cd backend && npx jest wsaa.service --testPathPattern=wsaa.service` | ❌ W0 | ⬜ pending |
| 13-01-06 | 01 | 1 | CAE-01 | unit | `cd backend && npx jest wsaa-stub --testPathPattern=wsaa-stub` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/modules/wsaa/wsaa.service.spec.ts` — stubs for CAE-01: cache hit, cache miss→WSAA, concurrent serialization, Redis key format, TTL calc, Redis failure degradation
- [ ] `backend/src/modules/wsaa/wsaa-stub.service.spec.ts` — trivial coverage for stub service
- [ ] `backend/src/modules/wsaa/wsaa.module.ts` — module shell must exist before spec can be compiled

*Wave 0 creates test files BEFORE implementation so failures are visible immediately.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real WSAA homologación ticket obtained from wsaahomo.afip.gov.ar | CAE-01 | Requires real cert + AFIP test env | Check logs for `token`, `sign`, `expirationTime` fields in response |
| Redis TTL set correctly (expiry - 5min) | CAE-01 | TTL inspection requires Redis CLI | `redis-cli TTL "afip_ta:{profesionalId}:{cuit}:wsfe"` after real call |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
