---
phase: 60
slug: estad-sticas-sobre-registros-reales
status: validated-partial
nyquist_compliant: false
wave_0_complete: true
created: 2026-07-05
---

# Phase 60 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed retroactively from phase artifacts (State B). Requirements: STATS-01, STATS-02.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (backend) |
| **Config file** | `backend/package.json` (`"jest"` block) |
| **Quick run command** | `cd backend && npm run test -- crm-dashboard.service.spec` |
| **Full suite command** | `cd backend && npm run test` |
| **Estimated runtime** | ~2 seconds (spec), full backend suite longer |

> Frontend (`frontend/`) has **no test infrastructure** — no jest/vitest config, no `test` script, no existing test files. Frontend display behaviors are verified manually (see Manual-Only Verifications). Adding a frontend runner is out of scope per the v1.13 no-new-dependencies restriction carried in both plans.

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npm run test -- crm-dashboard.service.spec`
- **After every plan wave:** Run `cd backend && npm run test`
- **Before `/gsd:verify-work`:** Backend spec must be green
- **Max feedback latency:** ~2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 60-01-01 | 01 | 1 | STATS-01, STATS-02 | T-60-01 / T-60-02 / T-60-03 | Counts read real records (Cirugia, HC TRATAMIENTO), scoped by `profesionalId`, independent of `etapaCRM` | unit | `cd backend && npm run test -- crm-dashboard.service.spec` | ✅ | ✅ green |
| 60-01-02 | 01 | 1 | STATS-01, STATS-02 | T-60-01 / T-60-02 / T-60-03 | Invariant "changing etapaCRM does not change the count" + multi-tenant scoping asserted (Tests A/B/C/D) | unit | `cd backend && npm run test -- crm-dashboard.service.spec` | ✅ | ✅ green |
| 60-02-01 | 02 | 2 | STATS-01, STATS-02 | T-60-04 (accept) | Dashboard renders "Cirugías realizadas" / "Tratamientos realizados" cards bound to `crm/kpis` | manual | — (no frontend test infra) | ❌ | 🟡 manual |
| 60-02-02 | 02 | 2 | STATS-01, STATS-02 | — | KPI grid reflowed to lay out 6 cards evenly across breakpoints | manual | — (no frontend test infra) | ❌ | 🟡 manual |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · 🟡 manual-only*

---

## Wave 0 Requirements

Existing backend jest infrastructure covers all automatable phase requirements. The requirement's risk surface (record-based counting, etapaCRM-independence, multi-tenant isolation) lives in the backend service and is fully covered by `crm-dashboard.service.spec.ts` (8/8 green). No Wave 0 setup required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard shows "Cirugías realizadas" card with subtitle "registro efectivo" and a real count | STATS-01 | No frontend test infrastructure (no jest/vitest); adding one violates v1.13 no-new-deps. Thin display binding to already-tested backend data. | Log in as a professional, open the dashboard, confirm the "Cirugías realizadas" KPI card shows the count of past, non-cancelled/suspended surgeries. (UAT #1 — pass) |
| Dashboard shows "Tratamientos realizados" card fed from HC TRATAMIENTO entries | STATS-02 | Same as above | Confirm the "Tratamientos realizados" card shows the count of FINALIZED HC entries of type TRATAMIENTO for the current professional. (UAT #2 — pass) |
| 6-card KPI grid lays out evenly (2 cols mobile / 3 tablet / 6 desktop) | STATS-01/02 (UI) | Visual/responsive layout — not automatable without a browser/visual runner | Resize the dashboard viewport; confirm the 6 KPI cards align without clipping. (UAT #3 — pass) |
| Counts unchanged when a patient's etapaCRM is set to PERDIDO | STATS-01/02 | End-to-end behavioral check across UI + data | Change a patient's etapaCRM to PERDIDO; confirm both counts are unchanged. (UAT #4 — pass) *(Also enforced automatically by backend Test A.)* |
| Counts change per professional context | STATS-01/02 | End-to-end multi-tenant check across UI | Switch professional context; confirm counts reflect only that professional's records. (UAT #5 — pass) *(Also enforced automatically by backend Test C.)* |

> Note: the two highest-risk manual items (etapaCRM-independence, per-professional scoping) are **also** covered automatically at the data layer by backend Tests A and C. The manual entries verify the UI wiring end-to-end.

---

## Validation Sign-Off

- [x] All automatable tasks have `<automated>` verify (backend spec); frontend display recorded as manual-only
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (backend logic covered)
- [x] Wave 0 covers all MISSING references (none required)
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [ ] `nyquist_compliant: true` — NOT set: frontend display verified manually (no frontend test infra)

**Approval:** approved 2026-07-05 (partial — backend automated, frontend manual-only)
