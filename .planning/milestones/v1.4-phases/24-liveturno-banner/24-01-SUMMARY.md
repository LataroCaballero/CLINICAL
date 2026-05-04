---
phase: 24-liveturno-banner
plan: "01"
subsystem: ui
tags: [zustand, typescript, live-turno, store, banner]

# Dependency graph
requires:
  - phase: 23-backend-logic
    provides: flujo field on Paciente model returned by iniciarSesion endpoint
provides:
  - LiveTurnoSession.pacienteFlujo field persisted in store session
  - LiveTurnoState.bannerDismissed + dismissBanner() action (session-only lifetime)
  - IniciarSesionResponse.paciente.flujo TypeScript typing
  - sessionData mapping: pacienteFlujo populated from API response on session start
affects: [24-liveturno-banner/24-02, any component consuming useLiveTurnoStore]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Banner dismissal uses session-local state (excluded from partialize) — dismissed state resets automatically on every new session start"
    - "Session-level data (flujo) IS in partialize via session object — survives page reload and recovery dialog"

key-files:
  created: []
  modified:
    - frontend/src/store/live-turno.store.ts
    - frontend/src/hooks/useLiveTurnoActions.ts
    - frontend/src/components/live-turno/LiveTurnoSyncChecker.tsx

key-decisions:
  - "pacienteFlujo is part of LiveTurnoSession (persisted) — survives recovery dialog; bannerDismissed is NOT in partialize (session-only)"
  - "startSession() explicitly resets bannerDismissed: false on every call — banner always shows for new PENDIENTE sessions"
  - "LiveTurnoSyncChecker passes pacienteFlujo: null for recovered sessions — unknown flujo on recovery, no banner shown"

patterns-established:
  - "Session-level boolean flags excluded from partialize reset automatically on startSession() — use this pattern for any per-session UI state"

requirements-completed: [LIVT-01, LIVT-02, LIVT-03]

# Metrics
duration: 10min
completed: 2026-04-16
---

# Phase 24 Plan 01: LiveTurno Banner Data Layer Summary

**Zustand store extended with pacienteFlujo (persisted) and bannerDismissed (session-only) to power the PENDIENTE classification banner in Plan 02**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-16T15:06:00Z
- **Completed:** 2026-04-16T15:16:34Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `LiveTurnoSession` now carries `pacienteFlujo: 'PENDIENTE' | 'CIRUGIA' | 'TRATAMIENTO' | null` — persisted via session object in partialize
- `LiveTurnoState` has `bannerDismissed: boolean` and `dismissBanner()` action — excluded from partialize so it resets on every page load/new session
- `startSession()` resets `bannerDismissed: false` — guarantees banner always shows at start of a new session
- `IniciarSesionResponse.paciente` typed with `flujo` field; `sessionData` maps `pacienteFlujo: data.paciente.flujo ?? null`

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend LiveTurnoStore with banner fields** - `c4b5696` (feat)
2. **Task 2: Wire flujo into IniciarSesionResponse and sessionData** - `2d664ce` (feat)

## Files Created/Modified
- `frontend/src/store/live-turno.store.ts` - Added pacienteFlujo to LiveTurnoSession, bannerDismissed + dismissBanner to state, bannerDismissed reset in startSession, partialize unchanged
- `frontend/src/hooks/useLiveTurnoActions.ts` - Added flujo to IniciarSesionResponse.paciente, mapped pacienteFlujo in sessionData
- `frontend/src/components/live-turno/LiveTurnoSyncChecker.tsx` - Added pacienteFlujo: null to startSession call (Rule 1 auto-fix)

## Decisions Made
- `bannerDismissed` excluded from partialize: banner is per-session UI state, not something that should survive page reloads. If user reloads during a session, the recovery dialog restores it and the banner re-shows.
- `pacienteFlujo: null` in `LiveTurnoSyncChecker`: when recovering an orphaned session from the server, flujo is not available in the sesion-activa response. Using null means the banner component (Plan 02) will simply not render for recovered sessions — safe and correct.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed LiveTurnoSyncChecker missing pacienteFlujo in startSession call**
- **Found during:** Task 1 (TypeScript verification)
- **Issue:** Adding `pacienteFlujo` as a required field to `LiveTurnoSession` caused a TS2345 error in LiveTurnoSyncChecker.tsx — it was calling `startSession()` without the new field
- **Fix:** Added `pacienteFlujo: null` to the `startSession()` call in `handleRecuperar`. Sessions recovered from the server have unknown flujo — null is the correct value (no banner shown)
- **Files modified:** `frontend/src/components/live-turno/LiveTurnoSyncChecker.tsx`
- **Verification:** Full `npx tsc --noEmit` passes with zero errors
- **Committed in:** `c4b5696` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug fix)
**Impact on plan:** Necessary for TypeScript correctness. No scope creep — fix is the minimal change to satisfy the new required field.

## Issues Encountered
None beyond the auto-fixed TypeScript error described above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Store data layer complete — Plan 02 can build `LiveTurnoFlujoBanner` component reading `session.pacienteFlujo === 'PENDIENTE'` and `bannerDismissed` from the store
- `dismissBanner()` action ready for the banner's dismiss button
- TypeScript compiles cleanly across all frontend files

---
*Phase: 24-liveturno-banner*
*Completed: 2026-04-16*
