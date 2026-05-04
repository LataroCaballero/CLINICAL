---
phase: 24-liveturno-banner
verified: 2026-04-16T16:00:00Z
status: human_needed
score: 14/14 must-haves verified
re_verification: false
human_verification:
  - test: "Amber banner appears for PENDIENTE patient during live session"
    expected: "Compact amber bar visible between tabs row and scrollable tab content when session has pacienteFlujo === 'PENDIENTE'"
    why_human: "Visual rendering and correct DOM placement cannot be verified programmatically"
  - test: "Banner is visible when switching between all 4 tabs (HC, Datos, Turno, Cobro)"
    expected: "Banner stays fixed outside the scrollable div — it does not scroll away or disappear on tab change"
    why_human: "Tab-switch persistence requires runtime observation"
  - test: "Clicking Cirugía transitions to green check state for ~2 seconds then disappears"
    expected: "Immediate green 'Clasificado como Cirugía' state, auto-dismiss after 2s, banner area gone for the rest of the session"
    why_human: "Timed state transition requires runtime observation"
  - test: "PATCH /pacientes/:id/flujo fires on classification"
    expected: "Network tab shows PATCH to /pacientes/{id}/flujo with body {\"flujo\":\"CIRUGIA\"} or {\"flujo\":\"TRATAMIENTO\"}"
    why_human: "Network request can only be observed via browser DevTools"
  - test: "X dismiss hides banner for session only"
    expected: "Banner disappears immediately; patient remains PENDIENTE; banner reappears on the next startSession() for any PENDIENTE patient"
    why_human: "Session-scoped behavior and reappearance on next session require runtime observation across two sessions"
  - test: "No banner for flujo=null or classified patients"
    expected: "Opening LiveTurno for patients with flujo=null, CIRUGIA, or TRATAMIENTO shows no amber banner at all"
    why_human: "Requires database setup and runtime verification"
---

# Phase 24: LiveTurno Banner Verification Report

**Phase Goal:** Add an amber classification banner to LiveTurno that prompts classification of PENDIENTE patients
**Verified:** 2026-04-16T16:00:00Z
**Status:** human_needed (all automated checks pass; 6 behavioral items require human testing)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | When a PENDIENTE patient's session starts, pacienteFlujo is captured in the store | VERIFIED | `useLiveTurnoActions.ts:60` — `pacienteFlujo: data.paciente.flujo ?? null` in sessionData mapping |
| 2 | bannerDismissed resets to false on every startSession() call | VERIFIED | `live-turno.store.ts:118` — `bannerDismissed: false` inside `set({})` in `startSession` |
| 3 | bannerDismissed is NOT in the Zustand partialize config | VERIFIED | `live-turno.store.ts:188-193` — partialize covers only `session, draftData, isMinimized, activeTab`; bannerDismissed absent |
| 4 | pacienteFlujo is part of LiveTurnoSession (IS persisted via session object) | VERIFIED | `live-turno.store.ts:17` — field in `LiveTurnoSession` interface; session is in partialize |
| 5 | The store exposes a dismissBanner() action that sets bannerDismissed: true | VERIFIED | `live-turno.store.ts:166` — `dismissBanner: () => set({ bannerDismissed: true })` |
| 6 | TypeScript — flujo typed as 'PENDIENTE' | 'CIRUGIA' | 'TRATAMIENTO' | null | VERIFIED | `live-turno.store.ts:17`, `useLiveTurnoActions.ts:17` — both files typed correctly; tsc --noEmit passes with zero errors |
| 7 | Opening LiveTurno for a PENDIENTE patient shows amber compact banner between tabs and content | HUMAN_NEEDED | Component code correct; visual placement requires runtime check |
| 8 | Clicking Cirugía or Tratamiento immediately hides amber banner and shows green check for ~2s | HUMAN_NEEDED | `LiveTurnoFlujoBanner.tsx:31-44` — logic correct; timed behavior needs runtime observation |
| 9 | After green check state, banner area disappears completely and does not return in that session | HUMAN_NEEDED | `LiveTurnoFlujoBanner.tsx:40-43` — `dismissBanner()` + `setPhase('gone')` after 2000ms; needs runtime check |
| 10 | Clicking X hides banner for session; patient stays PENDIENTE; banner returns on next startSession() | HUMAN_NEEDED | `handleDismiss` calls `dismissBanner()` only; reset on `startSession()` confirmed (truth 2); session persistence needs runtime check |
| 11 | Patients with flujo = null or CIRUGIA/TRATAMIENTO do NOT see the banner | HUMAN_NEEDED | `LiveTurnoFlujoBanner.tsx:28` — strict `!== 'PENDIENTE'` gate confirmed in code; runtime check with real DB records needed |
| 12 | PATCH /pacientes/:id/flujo is called best-effort — failure does not block UI | VERIFIED | `LiveTurnoFlujoBanner.tsx:36-38` — `api.patch().catch(() => {})` — silent catch, no await, no loading state |
| 13 | setTimeout for 2-second check state is cleaned up on component unmount | VERIFIED | `LiveTurnoFlujoBanner.tsx:20-26` — `useEffect` returns `clearTimeout(timerRef.current)` cleanup |
| 14 | Banner is mounted between LiveTurnoTabs and the flex-1 overflow-auto div in LiveTurnoPanel | VERIFIED | `LiveTurnoPanel.tsx:25-31` — `<LiveTurnoFlujoBanner />` at line 28, between `<LiveTurnoTabs />` (line 25) and `<div className="flex-1 overflow-auto">` (line 31) |

**Score:** 8/8 automated truths VERIFIED; 6/6 behavioral truths need human validation

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/store/live-turno.store.ts` | Extended LiveTurnoSession + LiveTurnoState with banner fields and dismissBanner action | VERIFIED | Contains `pacienteFlujo`, `bannerDismissed`, `dismissBanner`, `startSession` reset |
| `frontend/src/hooks/useLiveTurnoActions.ts` | flujo mapped from IniciarSesionResponse into sessionData | VERIFIED | `IniciarSesionResponse.paciente.flujo` typed; `pacienteFlujo: data.paciente.flujo ?? null` in onSuccess |
| `frontend/src/components/live-turno/LiveTurnoFlujoBanner.tsx` | Self-contained amber classification banner component | VERIFIED | 89 lines; full 3-state FSM (visible -> classified -> gone); store integration; best-effort PATCH |
| `frontend/src/components/live-turno/LiveTurnoPanel.tsx` | Banner mounted between LiveTurnoTabs and content div | VERIFIED | Import at line 7; render at line 28 between `LiveTurnoTabs` and `flex-1 overflow-auto` div |
| `frontend/src/components/live-turno/LiveTurnoSyncChecker.tsx` | pacienteFlujo: null added to startSession call (auto-fix) | VERIFIED | `pacienteFlujo: null` at line 61 with explanatory comment |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `useLiveTurnoActions.ts` | `live-turno.store.ts` | `startSession(sessionData)` with pacienteFlujo field | WIRED | `pacienteFlujo: data.paciente.flujo ?? null` at line 60; `startSession(sessionData)` called at line 62 |
| `LiveTurnoFlujoBanner.tsx` | `live-turno.store.ts` | `useLiveTurnoStore()` — reads session.pacienteFlujo + bannerDismissed; calls dismissBanner() | WIRED | Lines 16-18: three separate store selectors; `dismissBanner()` called in both `handleClassify` and `handleDismiss` |
| `LiveTurnoFlujoBanner.tsx` | `/api (PATCH /pacientes/:id/flujo)` | `api.patch()` — best-effort, silent catch | WIRED | `api.patch(\`/pacientes/${session!.pacienteId}/flujo\`, { flujo })` at line 37 with `.catch(() => {})` |
| `LiveTurnoPanel.tsx` | `LiveTurnoFlujoBanner.tsx` | JSX import and render | WIRED | Import at line 7; `<LiveTurnoFlujoBanner />` rendered at line 28 |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LIVT-01 | 24-01, 24-02 | En LiveTurno, si el paciente tiene flujo = PENDIENTE, aparece un banner amber no bloqueante indicando que debe clasificarse | SATISFIED | `LiveTurnoFlujoBanner.tsx:28` strict `=== 'PENDIENTE'` gate; amber bar rendered; non-blocking (does not prevent interaction) |
| LIVT-02 | 24-01, 24-02 | Desde el banner, el profesional puede clasificar al paciente como "Cirugía" o "Tratamiento"; el banner desaparece tras la acción y el flujo del paciente queda guardado | SATISFIED | Two classification buttons wired to `handleClassify`; optimistic dismiss to green state; `api.patch` fires to persist flujo |
| LIVT-03 | 24-01, 24-02 | El banner es dismissible por sesión; el paciente permanece PENDIENTE; el banner vuelve a aparecer en la próxima sesión | SATISFIED | `handleDismiss` calls `dismissBanner()` only (no flujo change); `bannerDismissed` excluded from partialize; reset to `false` in `startSession()` |

No orphaned requirements found — all three LIVT IDs claimed by plans 01 and 02 are defined in REQUIREMENTS.md and confirmed complete.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `LiveTurnoFlujoBanner.tsx` | 28-29 | `return null` | Info | Legitimate visibility gates — correct React pattern; not stubs |
| `LiveTurnoPanel.tsx` | 16 | `return null` | Info | Legitimate guard when panel is not open — not a stub |
| `useLiveTurnoActions.ts` | 124 | `return null` | Info | Legitimate early return when profesionalId absent — not a stub |

No blocker or warning anti-patterns found. All `return null` occurrences are intentional visibility/guard logic.

---

## Human Verification Required

### 1. Amber Banner Visibility

**Test:** Open a LiveTurno session for a patient with `flujo = 'PENDIENTE'` in the database
**Expected:** A compact amber bar (~40-48px) appears between the tabs navigation row and the tab content area, reading "Paciente sin clasificar — ¿Cirugía o Tratamiento?" with two buttons and an X
**Why human:** Visual rendering and DOM placement cannot be asserted programmatically

### 2. Banner Persists Across Tab Switches

**Test:** With the amber banner visible, switch between all 4 tabs (HC, Datos, Turno, Cobro)
**Expected:** Banner remains visible on every tab — it does not disappear or reposition itself
**Why human:** Requires runtime interaction; the banner being outside `flex-1.overflow-auto` must be visually confirmed

### 3. Classification — Green Check State Timing

**Test:** Click "Cirugía" in the amber banner
**Expected:** Banner immediately shows green "Clasificado como Cirugía"; after approximately 2 seconds the banner area disappears completely; it does not reappear when switching tabs for the rest of that session
**Why human:** Timed 2-second state transition requires runtime observation

### 4. PATCH Network Request on Classification

**Test:** With browser DevTools Network tab open, click a classification button
**Expected:** A PATCH request to `/pacientes/{id}/flujo` with body `{"flujo":"CIRUGIA"}` or `{"flujo":"TRATAMIENTO"}` appears in the network log
**Why human:** Network requests can only be observed via browser DevTools at runtime

### 5. X Dismiss — Session Scope

**Test:** Start a new LiveTurno session for a PENDIENTE patient; click X on the banner; switch tabs; then end the session and start a new one for another PENDIENTE patient
**Expected:** After clicking X, banner disappears and does not return during that session; in the new session for a different PENDIENTE patient, the amber banner reappears
**Why human:** Session-scoped behavior and cross-session reset require observing two separate session lifecycles

### 6. No Banner for Non-PENDIENTE Patients

**Test:** Open LiveTurno for patients with `flujo = null`, `flujo = 'CIRUGIA'`, and `flujo = 'TRATAMIENTO'`
**Expected:** No amber banner appears in any of these cases
**Why human:** Requires database records with each flujo value and runtime observation

---

## Summary

Phase 24 data layer and UI are complete and correctly wired. All 14 automated must-haves pass:

- **Store (Plan 01):** `LiveTurnoSession.pacienteFlujo` added and persisted; `bannerDismissed` added and excluded from partialize; `startSession()` resets `bannerDismissed: false`; `dismissBanner()` action wired; TypeScript compiles with zero errors across the full frontend
- **Banner (Plan 02):** `LiveTurnoFlujoBanner.tsx` implements the 3-state FSM (visible -> classified -> gone) with strict PENDIENTE gate, optimistic dismiss, best-effort PATCH with silent catch, timer cleanup on unmount; mounted correctly in `LiveTurnoPanel.tsx` between `LiveTurnoTabs` and the scrollable content div
- **All 4 documented commits verified** in git history: `c4b5696`, `2d664ce`, `9a052cc`, `a72f8bc`
- **All 3 LIVT requirements** (LIVT-01, LIVT-02, LIVT-03) are satisfied by implementation evidence

6 items are flagged for human behavioral verification — these concern visual rendering, timed transitions, and network requests that cannot be asserted by static code analysis.

---

_Verified: 2026-04-16T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
