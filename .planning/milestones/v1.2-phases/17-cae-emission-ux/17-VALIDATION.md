---
phase: 17
slug: cae-emission-ux
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (backend) |
| **Config file** | `backend/package.json` scripts.test |
| **Quick run command** | `cd backend && npm test -- --testPathPattern=cae-emission` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | ~15 seconds (quick), ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npm test -- --testPathPattern=cae-emission.processor`
- **After every plan wave:** Run `cd backend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 0 | CAE-03 | unit | `cd backend && npm test -- --testPathPattern=cae-emission.processor` | ✅ (needs new test case) | ⬜ pending |
| 17-01-02 | 01 | 1 | CAE-03 | unit | `cd backend && npm test -- --testPathPattern=cae-emission.processor` | ✅ | ⬜ pending |
| 17-02-01 | 02 | 1 | CAE-02 | unit | `cd backend && npm test -- --testPathPattern=finanzas.service` | ✅ | ⬜ pending |
| 17-02-02 | 02 | 1 | CAE-02 | manual | Visual: click Emitir Comprobante → check EMISION_PENDIENTE state | N/A | ⬜ pending |
| 17-02-03 | 02 | 2 | CAE-02 | manual | Visual: polling auto-updates factura state without page reload | N/A | ⬜ pending |
| 17-03-01 | 03 | 2 | CAE-03 | manual | Visual: AFIP business error shows spanishMessage in modal, not toast | N/A | ⬜ pending |
| 17-03-02 | 03 | 2 | CAE-03 | manual | Visual: useGenerarFacturaPDF removed, no TypeScript errors | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] New test case in `backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts` — covers that `onFailed` calls `prisma.factura.update({ data: { afipError: job.failedReason } })` when max retries reached (UnrecoverableError path)
- [ ] Prisma migration — `afipError String?` on Factura model: `cd backend && npx prisma migrate dev --name add-factura-afip-error`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FacturaDetailModal shows afipError panel when non-null | CAE-03 | Frontend UI rendering, no test infra for React components | Set USE_AFIP_STUB=true, trigger emission, inject mock afipError into DB row, reload modal, verify error panel appears |
| Polling auto-updates status without page reload | CAE-02 | Browser-level behavior, requires real or simulated BullMQ job completion | Open FacturaDetailModal with EMISION_PENDIENTE factura, wait for job to complete, verify UI updates within 6s |
| LiquidacionesTab Emitir button opens correct modal | CAE-02 | Integration between tab and modal | Click "Emitir Comprobante" in LiquidacionesTab row, verify FacturaDetailModal opens |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
