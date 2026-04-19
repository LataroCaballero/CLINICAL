---
phase: 24-liveturno-banner
plan: "02"
subsystem: ui
tags: [react, zustand, tailwind, lucide, live-turno, amber-banner, classification]

# Dependency graph
requires:
  - phase: 24-01
    provides: LiveTurnoStore extended with pacienteFlujo, bannerDismissed, dismissBanner
  - phase: 23-01
    provides: PATCH /pacientes/:id/flujo endpoint
provides:
  - Amber classification banner component (LiveTurnoFlujoBanner.tsx) with 3-state FSM
  - LiveTurnoPanel updated to mount banner between tabs and scrollable content
affects:
  - 25-tratamientos-tab

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "3-state FSM in React (visible -> classified -> gone) using local useState"
    - "Best-effort PATCH with silent catch — optimistic dismiss, never blocks UI"
    - "useEffect cleanup for setTimeout ref prevents memory leaks on unmount"
    - "Visibility gate using all hooks first, then early returns (React hooks rules)"

key-files:
  created:
    - frontend/src/components/live-turno/LiveTurnoFlujoBanner.tsx
  modified:
    - frontend/src/components/live-turno/LiveTurnoPanel.tsx

key-decisions:
  - "Banner visibility gate: strict === 'PENDIENTE' check — null and CIRUGIA/TRATAMIENTO never show the banner"
  - "handleClassify transitions to 'classified' phase immediately (optimistic), then fires api.patch best-effort with silent catch"
  - "handleDismiss calls dismissBanner() only — store's bannerDismissed causes early return on next render (no setPhase needed)"
  - "Timer ref pattern: useRef<ReturnType<typeof setTimeout> | null> + useEffect cleanup prevents leak on unmount"
  - "Banner is a sibling in flex column (NOT inside scrollable div) so it stays fixed while content scrolls"

patterns-established:
  - "Optimistic-dismiss pattern: transition UI state immediately, then fire async operation with silent catch"
  - "3-state FSM for transient notifications: visible -> classified (2s) -> gone (permanent for session)"
  - "All React hooks declared before conditional early returns"

requirements-completed: [LIVT-01, LIVT-02, LIVT-03]

# Metrics
duration: 25min
completed: 2026-04-16
---

# Phase 24 Plan 02: LiveTurno Banner Summary

**Amber classification banner with 3-state FSM mounted in LiveTurnoPanel — PENDIENTE patients see inline Cirugia/Tratamiento buttons; classification fires optimistic dismiss + best-effort PATCH; X dismiss hides for session only**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-16T15:18:48Z
- **Completed:** 2026-04-16T15:45:00Z
- **Tasks:** 3 (2 auto + 1 human-verify)
- **Files modified:** 2

## Accomplishments
- Created `LiveTurnoFlujoBanner.tsx` — self-contained amber compact bar (~40-48px) with 3-state FSM: visible -> classified (green check 2s) -> gone
- Classification triggers immediate optimistic dismiss to green state, fires `api.patch('/pacientes/:id/flujo')` best-effort with silent catch, then auto-dismisses after 2s
- X dismiss calls `dismissBanner()` only — banner gone for the session, patient stays PENDIENTE, resets on next `startSession()`
- Mounted `LiveTurnoFlujoBanner` in `LiveTurnoPanel` as a flex-column sibling between `LiveTurnoTabs` and the scrollable content div — banner stays fixed while tabs content scrolls
- Human verification confirmed all 8 verification scenarios correct

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LiveTurnoFlujoBanner component** - `9a052cc` (feat)
2. **Task 2: Mount LiveTurnoFlujoBanner in LiveTurnoPanel** - `a72f8bc` (feat)
3. **Task 3: Verify banner behavior end-to-end** - human-approved, no code changes

## Files Created/Modified
- `frontend/src/components/live-turno/LiveTurnoFlujoBanner.tsx` - New component: amber classification banner with 3-state FSM, store integration, best-effort PATCH
- `frontend/src/components/live-turno/LiveTurnoPanel.tsx` - Import + render LiveTurnoFlujoBanner between tabs nav and scrollable content div

## Decisions Made
- Strict `=== 'PENDIENTE'` equality check in visibility gate — `null` (legacy) and classified values never trigger banner
- `handleClassify` transitions phase immediately (optimistic) before the async PATCH — no loading states, no error UI
- `handleDismiss` does not call `setPhase('gone')` — relies purely on `bannerDismissed` store flag to return null, which is sufficient and simpler
- Timer cleanup via `useRef` + `useEffect` return function — prevents 2s timeout from firing after component unmounts (tab close, session end)
- Banner placed outside scrollable `div.flex-1.overflow-auto` so it sticks visually across all 4 tab views

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 24 complete. All LIVT requirements (LIVT-01, LIVT-02, LIVT-03) satisfied.
- Phase 25 (Tratamientos Tab) is unblocked — depends on Phase 23 (backend) which is already complete. Phase 25 adds the monthly tratamientos tab and flujo badge in the patient table.

---
*Phase: 24-liveturno-banner*
*Completed: 2026-04-16*
