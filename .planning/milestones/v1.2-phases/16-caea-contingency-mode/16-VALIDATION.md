---
phase: 16
slug: caea-contingency-mode
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x (NestJS built-in) |
| **Config file** | `backend/package.json` (jest config) |
| **Quick run command** | `cd backend && npm test -- --testPathPattern=caea --passWithNoTests` |
| **Full suite command** | `cd backend && npm test -- --passWithNoTests` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npm test -- --testPathPattern=caea --passWithNoTests`
- **After every plan wave:** Run `cd backend && npm test -- --passWithNoTests`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | CAEA-01 | unit | `npm test -- --testPathPattern=caea.service` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | CAEA-01 | unit | `npm test -- --testPathPattern=caea.scheduler` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 1 | CAEA-02 | unit | `npm test -- --testPathPattern=cae-emission` | ❌ W0 | ⬜ pending |
| 16-03-01 | 03 | 2 | CAEA-03 | unit | `npm test -- --testPathPattern=caea-informar` | ❌ W0 | ⬜ pending |
| 16-04-01 | 04 | 2 | CAEA-04 | unit | `npm test -- --testPathPattern=caea-alert` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/modules/facturacion/caea/__tests__/caea.service.spec.ts` — stubs for CAEA-01
- [ ] `backend/src/modules/facturacion/caea/__tests__/caea.scheduler.spec.ts` — stubs for CAEA-01 cron
- [ ] `backend/src/modules/facturacion/caea/__tests__/caea-informar.processor.spec.ts` — stubs for CAEA-03
- [ ] `backend/src/modules/facturacion/__tests__/cae-emission.fallback.spec.ts` — stubs for CAEA-02
- [ ] `backend/src/modules/facturacion/caea/__tests__/caea-alert.service.spec.ts` — stubs for CAEA-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AFIP CAEA stub returns correct FECAEASolicitar response | CAEA-01 | Requires AfipStubService CAEA path extension | Add CAEA stub response, call solicitar, check CaeaVigente row created |
| Cron fires on días 27 and 12 at 06:00 | CAEA-01 | Scheduler timing not unit-testable | Verify cron expression `0 6 12,27 * *` in code review |
| Fallback triggers on AfipUnavailableException | CAEA-02 | Integration path through AfipTransientError | Simulate AFIP timeout in staging; confirm CAEA_PENDIENTE_INFORMAR estado |
| FECAEARegInformativo informs all pending | CAEA-03 | Requires AFIP stub CAEA inform response | Seed CAEA_PENDIENTE_INFORMAR invoices, run job, verify estado → EMITIDA |
| Email alert sent before 8-day deadline | CAEA-04 | Requires mail transport mock | Check nodemailer mock called with correct deadline date |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
