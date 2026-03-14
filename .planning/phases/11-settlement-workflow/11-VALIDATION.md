---
phase: 11
slug: settlement-workflow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (NestJS default) |
| **Config file** | `backend/package.json` (jest config inline) |
| **Quick run command** | `cd backend && npm test -- --testPathPattern=finanzas.service --passWithNoTests` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npm test -- --testPathPattern=finanzas.service --passWithNoTests`
- **After every plan wave:** Run `cd backend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 0 | LIQ-02 | unit | `cd backend && npm test -- --testPathPattern=finanzas.service --passWithNoTests` | ❌ Wave 0 | ⬜ pending |
| 11-01-02 | 01 | 1 | LIQ-01 | manual | Navigate to `/dashboard/facturador/liquidar/[id]` and verify table loads | N/A | ⬜ pending |
| 11-01-03 | 01 | 1 | LIQ-02 | unit | `cd backend && npm test -- --testPathPattern=finanzas.service` | ❌ Wave 0 | ⬜ pending |
| 11-02-01 | 02 | 2 | LIQ-03 | manual | Confirm modal + redirect after closing lote | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Add `actualizarMontoPagado` test cases to `backend/src/modules/finanzas/finanzas.service.spec.ts` — covers LIQ-02 (normal update, not-found error, audit fields set correctly)

*LIQ-01 and LIQ-03 are already covered by existing spec from Phase 9.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OS card on dashboard navigates to `/liquidar/[obraSocialId]` | LIQ-01 | Frontend navigation flow | Click OS card, verify URL changes and table shows pending practices |
| Live total updates in header as montoPagado is edited per row | LIQ-02 | Frontend local state UX | Edit montoPagado in a row, verify header total updates in real-time |
| "Cerrar Lote" disabled when 0 prácticas | LIQ-03 | Frontend button state | Navigate to an OS with no pending practices, verify button is disabled |
| Modal shows count + total before confirming close | LIQ-03 | Frontend modal content | Click "Cerrar Lote", verify modal content matches current state |
| After confirming, redirected to dashboard and OS card disappears | LIQ-03 | Frontend post-mutation UX | Confirm close, verify redirect to `/dashboard/facturador` and closed OS no longer shown |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
