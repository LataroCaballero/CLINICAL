---
phase: 10-facturador-home-dashboard
verified: 2026-03-14T16:00:00Z
status: gaps_found
score: 7/8 must-haves verified
re_verification: false
gaps:
  - truth: "If a lote to close exceeds disponible, a visible warning appears BEFORE the user confirms closing the lote"
    status: partial
    reason: "Phase 10 exposes 'disponible' prominently and shows an over-limit alert on the dashboard when emitido > limite, but the warning that fires *before confirming a lote close* requires the lote-closing modal which is deferred to Phase 11. DASH-04 is partially satisfied: headroom is visible; pre-confirmation block is not yet implemented."
    artifacts:
      - path: "frontend/src/app/dashboard/facturador/page.tsx"
        issue: "Over-limit alert shows when disponible < 0 (already exceeded), but no warning surfaces before a specific lote is selected and confirmed. No lote-closing flow exists yet."
    missing:
      - "Phase 11 lote-closing modal with selectedTotal vs disponible comparison and AlertTriangle warning before confirm"
human_verification:
  - test: "FACTURADOR redirect on login"
    expected: "Navigating to /dashboard as FACTURADOR automatically redirects to /dashboard/facturador without flash"
    why_human: "Next.js router.replace in useEffect — cannot verify timing/flash programmatically"
  - test: "KPI cards render with real data"
    expected: "With a profesional selected who has pending practicas, cards show OS name, count badge, and ARS total"
    why_human: "Requires live backend + seed data; React component rendering cannot be checked statically"
  - test: "Progress bar with configured limit"
    expected: "Bar shows emitido / limite proportionally, 'Disponible' value is green when positive and red when negative"
    why_human: "Visual rendering and color logic require browser"
  - test: "Limit save + immediate refresh"
    expected: "Entering a number in the limit field and clicking Guardar triggers a toast 'Limte actualizado' and the progress bar updates without page reload"
    why_human: "Network mutation + cache invalidation timing — cannot verify without running the app"
  - test: "Sidebar Inicio link href"
    expected: "Hovering over 'Inicio' in sidebar while logged as FACTURADOR shows href /dashboard/facturador in browser DevTools"
    why_human: "Dynamic href ternary — needs browser inspection to confirm runtime value"
---

# Phase 10: FACTURADOR Home Dashboard — Verification Report

**Phase Goal:** Build the FACTURADOR role's dedicated home dashboard with billing KPIs and monthly limit management
**Verified:** 2026-03-14T16:00:00Z
**Status:** gaps_found (partial — DASH-04 deferred to Phase 11 by design)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | FACTURADOR visiting /dashboard is automatically redirected to /dashboard/facturador | VERIFIED | `layout.tsx` lines 62-68: third useEffect checks `pathname === '/dashboard'` and `user.rol === 'FACTURADOR'`, calls `router.replace('/dashboard/facturador')` |
| 2 | /dashboard/facturador route is accessible to FACTURADOR and ADMIN roles (not blocked) | VERIFIED | `permissions.ts` line 10: `{ prefix: '/dashboard/facturador', roles: ['ADMIN', 'FACTURADOR'] }` is the FIRST array entry, correctly before the `/dashboard` catch-all |
| 3 | Sidebar 'Inicio' link points to /dashboard/facturador when user.rol === 'FACTURADOR' | VERIFIED | `Sidebar.tsx` line 95: `href: user.rol === 'FACTURADOR' ? '/dashboard/facturador' : '/dashboard'` — ternary is evaluated after the `if (isLoading \|\| !user) return null` guard |
| 4 | FACTURADOR can see KPI cards listing each obra social with count and ARS total of pending practicas | VERIFIED | `page.tsx` lines 73-100 render a card grid driven by `usePracticasPendientesAgrupadas`; hook calls `GET /finanzas/practicas-pendientes-agrupadas` with `enabled: !!profesionalId` |
| 5 | FACTURADOR can see a progress bar showing limite/emitido/disponible for the current month | VERIFIED | `page.tsx` lines 102-136: Progress component with emitido/limite labels and TrendingUp "Disponible" row driven by `useLimiteDisponible` |
| 6 | FACTURADOR can type a new monthly limit value, save it, and the progress bar updates immediately without page reload | VERIFIED | `useSetLimiteMensual.onSuccess` calls `queryClient.invalidateQueries({ queryKey: ['finanzas', 'limite-disponible', variables.profesionalId, variables.mes] })` — identical queryKey to `useLimiteDisponible`; cache invalidation is guaranteed |
| 7 | Page shows a clear empty state when no profesional is selected in the sidebar | VERIFIED | `page.tsx` lines 40-47: `if (!selectedProfessionalId)` returns a centered Building2 icon with descriptive message |
| 8 | If a lote to close exceeds disponible, a visible warning appears BEFORE the user confirms closing the lote | PARTIAL | Dashboard shows an over-limit Alert when `disponible < 0` (post-breach), and the disponible value is prominently color-coded. The pre-confirmation modal warning for a specific lote is explicitly deferred to Phase 11 per RESEARCH.md line 266-268 and 10-VALIDATION.md line 68 |

**Score:** 7/8 truths verified (1 partial — intentional deferral)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/lib/permissions.ts` | ROUTE_PERMISSIONS entry for /dashboard/facturador as first element | VERIFIED | Line 10: `{ prefix: '/dashboard/facturador', roles: ['ADMIN', 'FACTURADOR'] }` is element [0] of the array |
| `frontend/src/app/dashboard/layout.tsx` | Role-based redirect useEffect for FACTURADOR | VERIFIED | Lines 62-68: third useEffect with exact `pathname === '/dashboard'` and `user.rol === 'FACTURADOR'` condition |
| `frontend/src/app/dashboard/components/Sidebar.tsx` | Dynamic Inicio href for FACTURADOR role | VERIFIED | Line 95: ternary expression, correct and non-null user guaranteed by guard above |
| `frontend/src/hooks/useFacturadorDashboard.ts` | Three hooks: usePracticasPendientesAgrupadas, useLimiteDisponible, useSetLimiteMensual | VERIFIED | All three exported (lines 12, 32, 46). Two interfaces also exported: PracticaPendienteAgrupada, LimiteDisponible. File is 63 lines — substantive, not a stub |
| `frontend/src/app/dashboard/facturador/page.tsx` | FACTURADOR landing page with KPI cards + progress bar + limit input | VERIFIED | 167 lines, full implementation with four sections (empty state, KPI grid, progress bar, limit form). All three hooks consumed |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `layout.tsx` | `/dashboard/facturador` | `router.replace` in third useEffect | WIRED | `router.replace('/dashboard/facturador')` at line 65 |
| `permissions.ts` | ROUTE_PERMISSIONS array | Array entry order — /dashboard/facturador BEFORE /dashboard | WIRED | `/dashboard/facturador` is index 0; `/dashboard` catch-all is last |
| `page.tsx` | `GET /finanzas/practicas-pendientes-agrupadas` | `usePracticasPendientesAgrupadas` hook | WIRED | Hook calls `api.get('/finanzas/practicas-pendientes-agrupadas', { params: { profesionalId } })` with `enabled: !!profesionalId` |
| `page.tsx` | `GET /finanzas/limite-disponible` | `useLimiteDisponible` hook | WIRED | Hook calls `api.get('/finanzas/limite-disponible', { params: { profesionalId, mes } })` |
| `page.tsx` | `POST /finanzas/limite-mensual` | `useSetLimiteMensual` mutation | WIRED | `mutationFn` calls `api.post('/finanzas/limite-mensual', dto)` |
| `useSetLimiteMensual onSuccess` | queryKey `['finanzas', 'limite-disponible', profesionalId, mes]` | `queryClient.invalidateQueries` | WIRED | `hook.ts` line 54-56: queryKey matches `useLimiteDisponible` queryKey exactly — cache refresh guaranteed |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| DASH-01 | 10-01-PLAN.md | FACTURADOR sees /dashboard/facturador on login with auto-redirect | SATISFIED | permissions.ts entry + layout.tsx redirect + Sidebar Inicio link — all three wiring points verified |
| DASH-02 | 10-02-PLAN.md | FACTURADOR can see count and total of pending practicas grouped by obra social | SATISFIED | KPI card grid in page.tsx driven by usePracticasPendientesAgrupadas hitting the correct endpoint |
| DASH-03 | 10-02-PLAN.md | FACTURADOR can see monthly limit progress: configured / invoiced / available | SATISFIED | Progress section with Progress component, emitido/limite labels, disponible row with color-coding |
| DASH-04 | 10-02-PLAN.md | System warns FACTURADOR when a lote to close exceeds the available monthly limit | PARTIAL | Dashboard shows over-limit alert and prominently labels disponible. Pre-confirmation lote warning explicitly deferred to Phase 11 by RESEARCH.md decision. REQUIREMENTS.md marks as Complete but the full behavior is split across phases |
| LMIT-01 | 10-02-PLAN.md | FACTURADOR can configure the monthly billing limit (value provided by the accountant) | SATISFIED | Limit input + Guardar button, mutation fires POST /finanzas/limite-mensual, onSuccess invalidates the progress bar query |

**Orphaned requirements:** None. All five IDs (DASH-01, DASH-02, DASH-03, DASH-04, LMIT-01) are claimed by plans 10-01 and 10-02.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `page.tsx` | 146 | `placeholder=` attribute on Input | Info | False positive — this is an HTML input placeholder attribute, not a stub comment |
| `layout.tsx` | 79 | `return null` | Info | False positive — standard loading guard: `if (!user) return null` after auth check |

No blocker or warning anti-patterns found.

---

## Human Verification Required

### 1. FACTURADOR Redirect on Login

**Test:** Log in with a FACTURADOR account, navigate to `http://localhost:3000/dashboard`
**Expected:** URL changes to `/dashboard/facturador` automatically without visible flash or bounce
**Why human:** Next.js `router.replace` in `useEffect` timing cannot be verified statically

### 2. KPI Cards Render with Real Data

**Test:** Select a profesional who has pending practicas in the sidebar; observe the KPI section
**Expected:** Cards appear with obra social name, count badge (e.g. "3 pract."), and ARS total formatted as currency
**Why human:** Requires live backend connection and seed data; component rendering cannot be checked statically

### 3. Progress Bar Visual

**Test:** With a limit configured for the current month, observe the "Limite mensual" section
**Expected:** Progress bar fills proportionally to emitido/limite; "Disponible" row shows green if positive, red if negative or over-limit alert fires
**Why human:** Visual rendering and color class application require a browser

### 4. Limit Save and Immediate Refresh

**Test:** Enter a number in the limit input, click "Guardar"
**Expected:** Toast "Limite actualizado" appears, progress bar and disponible values update without page reload
**Why human:** Network mutation and TanStack Query cache invalidation timing require runtime verification

### 5. Sidebar Inicio Link

**Test:** Log in as FACTURADOR, inspect the "Inicio" sidebar link in browser DevTools
**Expected:** `href` attribute is `/dashboard/facturador`, not `/dashboard`
**Why human:** Dynamic ternary evaluated at runtime; static grep can only confirm the code path exists

---

## Gaps Summary

**One gap — intentional deferral, not an implementation error:**

DASH-04 requires a warning visible *before confirming* a lote closure when the lote total exceeds `disponible`. Phase 10 delivers the prerequisite: the `disponible` value is prominently displayed and color-coded on the dashboard, and an over-limit alert fires when the cumulative emitido already exceeds the limit. However, the specific interaction — selecting practices for a lote and seeing a pre-confirmation warning — depends on the lote-closing modal which is Phase 11's responsibility.

This split was explicitly documented in:
- `10-RESEARCH.md` lines 265-268: "Phase 10 delivers the `disponible` card clearly labeled; the actual warning modal is Phase 11."
- `10-VALIDATION.md` line 68: "Phase 10: verify disponible value is clearly labeled. Phase 11 handles the modal warning."
- `10-02-PLAN.md` plan frontmatter truth: "The disponible value is visually prominent so the FACTURADOR can assess headroom before closing a lote (partial DASH-04 — full warning in Phase 11)"

REQUIREMENTS.md has marked DASH-04 as "Complete" in the tracking table, which is premature — the full behavior requires Phase 11. This gap is a planning/tracking discrepancy rather than a Phase 10 implementation defect. Phase 11 should include DASH-04 in its requirements list.

---

_Verified: 2026-03-14T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
