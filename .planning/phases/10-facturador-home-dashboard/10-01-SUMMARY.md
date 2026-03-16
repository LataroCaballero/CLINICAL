---
phase: 10-facturador-home-dashboard
plan: "01"
subsystem: ui
tags: [nextjs, routing, permissions, rbac, facturador]

# Dependency graph
requires: []
provides:
  - ROUTE_PERMISSIONS entry for /dashboard/facturador (ADMIN + FACTURADOR only)
  - FACTURADOR auto-redirect from /dashboard to /dashboard/facturador in DashboardLayout
  - Dynamic Sidebar "Inicio" href pointing to /dashboard/facturador for FACTURADOR role
affects:
  - 10-02-facturador-dashboard-page
  - Any plan that adds routes accessible to FACTURADOR

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ROUTE_PERMISSIONS prefix ordering — more-specific prefixes MUST precede catch-all /dashboard for startsWith matching"
    - "Third useEffect in DashboardLayout for role-based landing page redirect (separate from auth guard and generic route guard)"
    - "Dynamic allLinks href ternary in Sidebar — user guaranteed non-null at construction point"

key-files:
  created: []
  modified:
    - frontend/src/lib/permissions.ts
    - frontend/src/app/dashboard/layout.tsx
    - frontend/src/app/dashboard/components/Sidebar.tsx

key-decisions:
  - "FACTURADOR redirect placed in a THIRD useEffect after the route-guard — avoids ordering conflict with the existing guard that redirects blocked users to /dashboard"
  - "Exact pathname === '/dashboard' match (not startsWith) in redirect useEffect — prevents firing on /dashboard/pacientes etc."
  - "ADMIN excluded from FACTURADOR redirect — ADMIN should land on the normal CRM dashboard"

patterns-established:
  - "Role-based href ternary in Sidebar allLinks: evaluated after the `if (isLoading || !user) return null` guard so user is always defined"

requirements-completed: [DASH-01]

# Metrics
duration: 8min
completed: 2026-03-14
---

# Phase 10 Plan 01: FACTURADOR Routing Wiring Summary

**Role-based routing for FACTURADOR: permission rule, auto-redirect from /dashboard, and dynamic Sidebar Inicio link all wired to /dashboard/facturador**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-14T15:00:00Z
- **Completed:** 2026-03-14T15:08:16Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `/dashboard/facturador` as first entry in ROUTE_PERMISSIONS, gated to ADMIN and FACTURADOR (prevents PROFESIONAL/SECRETARIA access)
- Added third useEffect in DashboardLayout that redirects `user.rol === 'FACTURADOR'` from `/dashboard` to `/dashboard/facturador`
- Updated Sidebar "Inicio" link to use ternary: `/dashboard/facturador` for FACTURADOR, `/dashboard` for all other roles

## Task Commits

Each task was committed atomically:

1. **Task 1: Add /dashboard/facturador permission rule** - `edae21e` (feat)
2. **Task 2: FACTURADOR redirect + Sidebar Inicio link** - `8df3b09` (feat)

## Files Created/Modified

- `frontend/src/lib/permissions.ts` - New entry `{ prefix: '/dashboard/facturador', roles: ['ADMIN', 'FACTURADOR'] }` inserted as first element of ROUTE_PERMISSIONS array
- `frontend/src/app/dashboard/layout.tsx` - Third useEffect added after route-guard; fires when `pathname === '/dashboard'` and `user.rol === 'FACTURADOR'`
- `frontend/src/app/dashboard/components/Sidebar.tsx` - "Inicio" href changed to ternary based on `user.rol`

## Decisions Made

- Third useEffect placed AFTER the route-guard useEffect — the route-guard redirects unauthorized users to `/dashboard`, and the new FACTURADOR redirect must fire after to catch them on that exact path
- Exact `pathname === '/dashboard'` match used — prevents the redirect from firing when FACTURADOR navigates to `/dashboard/pacientes` or other allowed subroutes
- ADMIN deliberately excluded from the FACTURADOR redirect — ADMIN should see the full CRM dashboard as the default landing page

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `src/app/dashboard/components/PatientsTable.tsx` were present before this plan and unrelated to the changes made here. No errors exist in the three modified files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Routing infrastructure for FACTURADOR is complete
- `/dashboard/facturador` route is gated, FACTURADOR auto-redirects to it, and Sidebar "Inicio" points there
- Plan 10-02 can now create the actual `/dashboard/facturador` page component without routing conflicts

---
*Phase: 10-facturador-home-dashboard*
*Completed: 2026-03-14*
