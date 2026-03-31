---
phase: 19
slug: getcierremensual-facturaid-extension
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | `backend/jest.config.js` |
| **Quick run command** | `cd backend && npx jest --testPathPattern=finanzas.service.spec --no-coverage` |
| **Full suite command** | `cd backend && npx jest --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx jest --testPathPattern=finanzas.service.spec --no-coverage`
- **After every plan wave:** Run `cd backend && npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 0 | CAE-02 | unit | `cd backend && npx jest --testPathPattern=finanzas.service.spec --no-coverage -t "getCierreMensual"` | ❌ W0 | ⬜ pending |
| 19-01-02 | 01 | 0 | CAE-02 | unit | same | ❌ W0 | ⬜ pending |
| 19-02-01 | 02 | 1 | CAE-02 | unit | `cd backend && npx jest --testPathPattern=finanzas.service.spec --no-coverage -t "getCierreMensual"` | ✅ after W0 | ⬜ pending |
| 19-02-02 | 02 | 1 | CAE-02 | type-check | `cd backend && npx tsc --noEmit` | ✅ | ⬜ pending |
| 19-02-03 | 02 | 1 | CAE-02 | type-check | `cd frontend && npx tsc --noEmit` | ✅ | ⬜ pending |
| 19-02-04 | 02 | 1 | CAE-02 | manual | — | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/modules/finanzas/finanzas.service.spec.ts` — add `getCierreMensual` describe block + mock for `liquidacionObraSocial.findMany`

*Existing infrastructure covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Emitir Comprobante" button in LiquidacionesTab opens modal with real facturaId | CAE-02 | Requires browser + real data | Open LiquidacionesTab for an OS with existing factura, click button, verify modal loads factura data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
