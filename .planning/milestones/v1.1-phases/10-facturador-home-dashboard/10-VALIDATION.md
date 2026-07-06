---
phase: 10
slug: facturador-home-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (NestJS backend) — no frontend unit tests in project |
| **Config file** | `backend/package.json` jest config |
| **Quick run command** | `cd backend && npm test -- --testPathPattern finanzas.service --passWithNoTests` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npm test -- --testPathPattern finanzas.service --passWithNoTests`
- **After every plan wave:** Run `cd backend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | DASH-01 | manual | n/a — layout useEffect redirect | n/a | ⬜ pending |
| 10-01-02 | 01 | 1 | DASH-01 | manual | n/a — permissions.ts rule order | n/a | ⬜ pending |
| 10-02-01 | 02 | 2 | DASH-02 | backend unit (Phase 9) | `cd backend && npm test -- --testPathPattern finanzas.service` | ✅ | ⬜ pending |
| 10-02-02 | 02 | 2 | DASH-03 | backend unit (Phase 9) | `cd backend && npm test -- --testPathPattern finanzas.service` | ✅ | ⬜ pending |
| 10-02-03 | 02 | 2 | LMIT-01 | backend unit (Phase 9) | `cd backend && npm test -- --testPathPattern finanzas.service` | ✅ | ⬜ pending |
| 10-02-04 | 02 | 2 | DASH-04 | manual | n/a — client-side warning, visual check | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements. No new test files needed.
  - Backend tests for all endpoints already exist from Phase 9.
  - Project has no frontend unit test suite.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FACTURADOR redirected to /dashboard/facturador | DASH-01 | Next.js layout useEffect — no unit test target | Login as FACTURADOR, navigate to /dashboard, verify redirect to /dashboard/facturador |
| /dashboard/facturador access permitted | DASH-01 | permissions.ts rule — runtime browser check | With FACTURADOR role, directly visit /dashboard/facturador, verify no 403/redirect bounce |
| Prácticas agrupadas por obra social visible | DASH-02 | React component render — no frontend unit tests | With profesional selected, verify KPI cards show OS name, count, and total in ARS |
| Progress bar renders límite/emitido/disponible | DASH-03 | React component render — no frontend unit tests | Verify progress bar with three labeled values matches backend response |
| DASH-04 availability warning | DASH-04 | Client-side comparison, visual | Phase 10: verify disponible value is clearly labeled. Phase 11 handles the modal warning |
| Limit input saves and refreshes | LMIT-01 | Mutation + invalidation — no frontend unit tests | Enter a new limit value, save, verify progress bar updates immediately |
| Empty state when no profesional selected | DASH-01 | Visual — no frontend unit tests | Open page with no profesional selected, verify "Seleccioná un profesional" message shown |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
