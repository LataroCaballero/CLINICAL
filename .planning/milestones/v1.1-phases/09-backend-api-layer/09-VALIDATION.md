---
phase: 9
slug: backend-api-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (NestJS default) |
| **Config file** | `backend/package.json` → `jest` key |
| **Quick run command** | `cd backend && npm run test -- --testPathPattern=finanzas --passWithNoTests` |
| **Full suite command** | `cd backend && npm run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npm run test -- --testPathPattern=finanzas --passWithNoTests`
- **After every plan wave:** Run `cd backend && npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 0 | LMIT-02 | unit | `cd backend && npm run test -- --testPathPattern=month-boundaries` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 0 | LIQ-03 | unit | `cd backend && npm run test -- --testPathPattern=finanzas.service` | ❌ W0 | ⬜ pending |
| 9-01-03 | 01 | 1 | LMIT-02 | unit | `cd backend && npm run test -- --testPathPattern=month-boundaries` | ❌ W0 | ⬜ pending |
| 9-01-04 | 01 | 1 | LIQ-03 | unit | `cd backend && npm run test -- --testPathPattern=finanzas.service` | ❌ W0 | ⬜ pending |
| 9-02-01 | 02 | 2 | LMIT-02 | unit | `cd backend && npm run test -- --testPathPattern=finanzas --passWithNoTests` | ❌ W0 | ⬜ pending |
| 9-02-02 | 02 | 2 | LIQ-03 | unit | `cd backend && npm run test -- --testPathPattern=finanzas --passWithNoTests` | ❌ W0 | ⬜ pending |
| 9-03-01 | 03 | 3 | AFIP-02 | unit | `cd backend && npm run test -- --testPathPattern=afip-stub` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/modules/finanzas/utils/month-boundaries.spec.ts` — stubs for LMIT-02 boundary arithmetic
- [ ] `backend/src/modules/finanzas/finanzas.service.spec.ts` — stubs for LIQ-03 transaction behavior (mock prisma)
- [ ] `backend/src/modules/finanzas/afip/afip-stub.service.spec.ts` — stubs for AFIP-02 stub contract

*All three test files must be created in Wave 0 before implementation tasks run.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| JwtRolesGuard method-level @Auth override | LMIT-02, LIQ-03, AFIP-02 | Guard behavior depends on Reflector API — cannot be unit tested without a full NestJS app context | Boot the backend, call a new FACTURADOR-only endpoint as a PROFESIONAL user, confirm 403 response |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
