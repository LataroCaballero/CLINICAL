---
phase: 14
slug: emision-cae-real-wsfev1
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (NestJS default, already configured) |
| **Config file** | `backend/package.json` → `"jest"` key |
| **Quick run command** | `cd backend && npx jest --testPathPattern "afip-real|cae-emission" --no-coverage` |
| **Full suite command** | `cd backend && npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx jest --testPathPattern "afip-real|cae-emission" --no-coverage`
- **After every plan wave:** Run `cd backend && npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 0 | CAE-02 | unit | `npx jest afip-real.service.spec.ts -x` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 0 | CAE-04 | unit | `npx jest cae-emission.processor.spec.ts -x` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 1 | CAE-02 | unit | `npx jest afip-real.service.spec.ts -x` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 1 | CAE-02 | unit | `npx jest afip-real.service.spec.ts -x` | ❌ W0 | ⬜ pending |
| 14-02-03 | 02 | 1 | CAE-03 | unit | `npx jest afip-real.service.spec.ts -x` | ❌ W0 | ⬜ pending |
| 14-03-01 | 03 | 1 | CAE-04 | unit | `npx jest cae-emission.processor.spec.ts -x` | ❌ W0 | ⬜ pending |
| 14-03-02 | 03 | 1 | CAE-04 | unit | `npx jest cae-emission.processor.spec.ts -x` | ❌ W0 | ⬜ pending |
| 14-04-01 | 04 | 2 | CAE-02,CAE-04 | unit | `npx jest finanzas.module.spec.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/modules/finanzas/afip/afip-real.service.spec.ts` — stubs for CAE-02, CAE-03
- [ ] `backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts` — stubs for CAE-04
- [ ] Prisma migration: add `EMISION_PENDIENTE` to `EstadoFactura` enum (transient estado while BullMQ job in flight)

*Existing infrastructure: Jest configured, finanzas.service.spec.ts passing, wsaa.service.spec.ts passing — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CAE real de 14 dígitos returned from AFIP homologación | CAE-02 | Requires live AFIP homologación environment | Run `POST /finanzas/facturas/:id/emitir` with valid AfipConfig in homo environment; check DB for `cae` field 14 chars |
| Modal en español visible para error de negocio | CAE-03 | Frontend UI behavior requires browser verification | Trigger error 10242 (null condicionIVA); verify modal shows human-readable Spanish message |
| Facturador no ve error durante reintentos transitorios | CAE-04 | Requires simulated AFIP timeout + UI observation | Use `USE_AFIP_STUB=false`, simulate AFIP 5xx; verify frontend shows "pendiente" not error |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
