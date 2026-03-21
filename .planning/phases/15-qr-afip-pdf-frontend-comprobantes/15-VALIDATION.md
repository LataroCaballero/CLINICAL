---
phase: 15
slug: qr-afip-pdf-frontend-comprobantes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 (backend) |
| **Config file** | `backend/package.json` → `jest` key |
| **Quick run command** | `cd backend && npx jest --testPathPattern=finanzas --passWithNoTests` |
| **Full suite command** | `cd backend && npx jest` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx jest --testPathPattern=finanzas --passWithNoTests`
- **After every plan wave:** Run `cd backend && npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 0 | QR-01 | unit | `cd backend && npx jest --testPathPattern=factura-pdf` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | QR-01 | unit | `cd backend && npx jest --testPathPattern=factura-pdf` | ❌ W0 | ⬜ pending |
| 15-01-03 | 01 | 1 | QR-01 | unit (spy) | `cd backend && npx jest --testPathPattern=afip-real` | ✅ extend | ⬜ pending |
| 15-02-01 | 02 | 2 | QR-02 | unit | `cd backend && npx jest --testPathPattern=finanzas.service` | ✅ extend | ⬜ pending |
| 15-02-02 | 02 | 2 | QR-03 | unit | `cd backend && npx jest --testPathPattern=finanzas.service` | ✅ extend | ⬜ pending |
| 15-03-01 | 03 | 3 | QR-02 | manual | — | — | ⬜ pending |
| 15-03-02 | 03 | 3 | QR-03 | manual | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/modules/finanzas/factura-pdf.service.spec.ts` — covers QR-01 (qrUrl builder unit test + PDF buffer smoke test)
- [ ] `cd backend && npm install qrcode@1.5.4 && npm install --save-dev @types/qrcode` — `qrcode` not yet in package.json

*All other test files already exist (finanzas.service.spec.ts, afip-real.service.spec.ts).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| QR scan opens https://www.afip.gob.ar/fe/qr/?p= with correct JSON | QR-01 | Requires physical QR scan / camera | Download PDF, scan QR with phone, verify AFIP URL loads correctly |
| Frontend renders QR image in factura detail modal | QR-02 | UI rendering requires browser | Open factura detail, confirm QR image visible, CAE and vencimiento displayed |
| USD invoice shows BNA link and accepts manual cotización | QR-03 | UI interaction + data persistence | Create USD invoice, verify BNA link visible, enter cotización, confirm saved |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
