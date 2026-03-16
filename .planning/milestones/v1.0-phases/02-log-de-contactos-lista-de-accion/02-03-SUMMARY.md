---
phase: 02-log-de-contactos-lista-de-accion
plan: 03
subsystem: ui
tags: [nextjs, react, tanstack-query, framer-motion, crm, lista-accion]

# Dependency graph
requires:
  - phase: 02-log-de-contactos-lista-de-accion
    provides: ContactoLog API endpoints (GET /pacientes/lista-accion, POST /pacientes/:id/contactos) and ContactoSheet component

provides:
  - useListaAccion hook querying GET /pacientes/lista-accion with profesionalId
  - /dashboard/accion page with prioritized patient cards, contact animation, and "Contactados hoy" counter
  - ListaAccionWidget component (top 3 + link to full page, accessible from sidebar)
  - Sidebar nav item "Accion" with ListChecks icon
  - Permission entry for /dashboard/accion (ADMIN, PROFESIONAL, SECRETARIA)

affects:
  - Phase 3 and beyond (sidebar shape established, CRM daily workflow UX complete)

# Tech tracking
tech-stack:
  added: [framer-motion (AnimatePresence for card exit animation)]
  patterns:
    - Optimistic removal + invalidateQueries combo for contacto registration flow
    - contactadosIds local Set for instant UI feedback before server refetch

key-files:
  created:
    - frontend/src/hooks/useListaAccion.ts
    - frontend/src/app/dashboard/accion/page.tsx
    - frontend/src/app/dashboard/components/ListaAccionWidget.tsx
  modified:
    - frontend/src/lib/permissions.ts
    - frontend/src/app/dashboard/components/Sidebar.tsx
    - frontend/src/app/dashboard/page.tsx
    - frontend/src/components/crm/ContactoSheet.tsx
    - frontend/src/components/ui/sheet.tsx

key-decisions:
  - "ListaAccionWidget removed from dashboard home — available from sidebar only, avoids adding noise to already-dense dashboard"
  - "EtapaCRM enum values in frontend corrected post-checkpoint: TURNO_AGENDADO and CONSULTADO (not CONSULTA_AGENDADA/CONSULTA_REALIZADA)"
  - "Sheet overlay darkened to bg-black/70 (from /50) to improve focus when ContactoSheet opens over the accion list"
  - "Optimistic removal via local contactadosIds Set + query invalidation ensures instant UX without waiting for refetch"

patterns-established:
  - "Optimistic list removal: local Set of IDs filters items instantly, then invalidateQueries syncs with server"
  - "AnimatePresence mode=popLayout for smooth card exit with height collapse"
  - "framer-motion exit animation: opacity 0, scale 0.95, height 0 over 250ms easeOut"

requirements-completed: [ACCION-01, ACCION-02, ACCION-03, ACCION-04]

# Metrics
duration: 35min
completed: 2026-02-23
---

# Phase 2 Plan 03: Lista de Accion Summary

**Daily coordinator workflow: /dashboard/accion page with prioritized patient cards, one-click contact registration via ContactoSheet, optimistic card removal, and "Contactados hoy" counter**

## Performance

- **Duration:** 35 min (23:09 → 23:44 UTC-3)
- **Started:** 2026-02-23T23:09:07-03:00
- **Completed:** 2026-02-23T23:44:33-03:00
- **Tasks:** 2 auto + 1 checkpoint (human-verified)
- **Files modified:** 8

## Accomplishments

- `useListaAccion` hook queries `/pacientes/lista-accion?profesionalId=X` with 1-min staleTime and window-focus refetch
- `/dashboard/accion` page renders prioritized patient cards with temperatura badges, diasSinContacto color coding, and inline ContactoSheet trigger
- Optimistic card disappearance on contact registration: card turns green, fades out with AnimatePresence after 800ms delay, then query invalidates
- "Contactados hoy" counter increments instantly and persists across reloads (server-side filter)
- Sidebar "Accion" nav item with ListChecks icon added; permission guard allows ADMIN, PROFESIONAL, SECRETARIA
- Post-checkpoint enum fix: ETAPA_LABELS and ETAPAS_CRM corrected to match actual Prisma schema values

## Task Commits

1. **Task 1: useListaAccion hook + permisos + sidebar nav** - `51d9375` (feat)
2. **Task 2: /dashboard/accion page + ListaAccionWidget + dashboard integration** - `938abe9` (feat)
3. **Task 3: Checkpoint human-verify — post-approval fixes** - `bf0df93` (fix)

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified

- `frontend/src/hooks/useListaAccion.ts` - TanStack Query hook for lista-accion endpoint, exports ListaAccionItem and ListaAccionResponse types
- `frontend/src/app/dashboard/accion/page.tsx` - Full page with PatientActionCard, AnimatePresence, contactadosHoy counter
- `frontend/src/app/dashboard/components/ListaAccionWidget.tsx` - Compact widget with top 3 patients, total count badge, link to full page
- `frontend/src/lib/permissions.ts` - Added /dashboard/accion route for ADMIN/PROFESIONAL/SECRETARIA
- `frontend/src/app/dashboard/components/Sidebar.tsx` - Added "Accion" nav item with ListChecks icon
- `frontend/src/app/dashboard/page.tsx` - Removed ListaAccionWidget (accessible from sidebar only)
- `frontend/src/components/crm/ContactoSheet.tsx` - Fixed EtapaCRM enum values (TURNO_AGENDADO, CONSULTADO), added px-4 form padding
- `frontend/src/components/ui/sheet.tsx` - Darkened overlay to bg-black/70

## Decisions Made

- **ListaAccionWidget removed from dashboard:** After human review, the dashboard home was already dense with CRM KPIs and funnel. The widget is better accessed from the sidebar nav item directly.
- **EtapaCRM enum correction:** Plan originally had wrong enum values (CONSULTA_AGENDADA, CONSULTA_REALIZADA). Both ContactoSheet and accion/page.tsx corrected to match Prisma schema (TURNO_AGENDADO, CONSULTADO).
- **Sheet overlay darkening:** bg-black/70 provides better visual separation when ContactoSheet opens over the action list cards.

## Deviations from Plan

### Post-Checkpoint Fixes (Human-Identified)

**1. [Rule 1 - Bug] Fixed EtapaCRM enum values in ContactoSheet and accion/page.tsx**
- **Found during:** Task 3 (human-verify checkpoint)
- **Issue:** Plan had incorrect enum values CONSULTA_AGENDADA and CONSULTA_REALIZADA; actual Prisma schema uses TURNO_AGENDADO and CONSULTADO
- **Fix:** Updated ETAPAS_CRM array in ContactoSheet.tsx and ETAPA_LABELS map in accion/page.tsx
- **Files modified:** frontend/src/components/crm/ContactoSheet.tsx, frontend/src/app/dashboard/accion/page.tsx
- **Committed in:** bf0df93

**2. [Rule 2 - UX] Added px-4 padding to ContactoSheet form**
- **Found during:** Task 3 (human-verify checkpoint) — form content was flush against sheet edges
- **Fix:** Added px-4 class to form element in ContactoSheet.tsx
- **Files modified:** frontend/src/components/crm/ContactoSheet.tsx
- **Committed in:** bf0df93

**3. [Rule 2 - UX] Darkened sheet overlay to bg-black/70**
- **Found during:** Task 3 (human-verify checkpoint) — overlay too light, content behind sheet was distracting
- **Fix:** Updated SheetOverlay className in sheet.tsx from bg-black/50 to bg-black/70
- **Files modified:** frontend/src/components/ui/sheet.tsx
- **Committed in:** bf0df93

**4. [Decision] Removed ListaAccionWidget from dashboard/page.tsx**
- **Found during:** Task 3 (human-verify checkpoint) — dashboard was too dense with existing CRM widgets
- **Fix:** Removed import and render of ListaAccionWidget from dashboard/page.tsx
- **Files modified:** frontend/src/app/dashboard/page.tsx
- **Committed in:** bf0df93

---

**Total deviations:** 4 post-checkpoint fixes (1 bug, 2 UX, 1 scoping decision)
**Impact on plan:** All fixes necessary for correctness and usability. Enum correction was critical for proper CRM stage tracking. No scope creep.

## Issues Encountered

None during auto-task execution. All issues surfaced during human-verify checkpoint and resolved in post-checkpoint commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 complete: ContactoLog API, ContactoSheet drawer, and Lista de Accion page all operational
- CRM daily workflow is fully functional: coordinators can track who to call, register interactions, and watch patients disappear from the action list as they're contacted
- Phase 3 can build on: useListaAccion hook, ContactoSheet reusable component, EtapaCRM enum (confirmed values), sidebar nav pattern

---
*Phase: 02-log-de-contactos-lista-de-accion*
*Completed: 2026-02-23*

## Self-Check: PASSED

Files verified:
- FOUND: frontend/src/hooks/useListaAccion.ts
- FOUND: frontend/src/app/dashboard/accion/page.tsx
- FOUND: frontend/src/app/dashboard/components/ListaAccionWidget.tsx
- FOUND: frontend/src/lib/permissions.ts (modified)
- FOUND: frontend/src/components/crm/ContactoSheet.tsx (modified)

Commits verified:
- FOUND: 51d9375 — feat(02-03): add useListaAccion hook + /dashboard/accion permission + sidebar nav item
- FOUND: 938abe9 — feat(02-03): add /dashboard/accion page + ListaAccionWidget + dashboard integration
- FOUND: bf0df93 — fix(02-03): fix EtapaCRM enum values, sheet padding, overlay depth, remove widget from dashboard
