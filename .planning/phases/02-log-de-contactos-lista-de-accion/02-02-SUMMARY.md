---
phase: 02-log-de-contactos-lista-de-accion
plan: 02
subsystem: ui
tags: [react, tanstack-query, react-hook-form, zod, shadcn, sheet, date-fns, crm]

# Dependency graph
requires:
  - phase: 02-log-de-contactos-lista-de-accion
    provides: ContactoLog Prisma model + 3 backend endpoints (POST/GET contactos, lista-accion)

provides:
  - shadcn Sheet component (Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter)
  - useContactos query hook for GET /pacientes/:id/contactos
  - useCreateContacto mutation hook with 4-query invalidation on success
  - ContactoSheet reusable RHF+Zod form (tipo/nota/etapaCRM/temperatura/proxima accion)
  - ContactosSection inline section in patient drawer with last-5 contacts + dias-sin-contacto badge
  - Integration of ContactosSection in PatientDrawer default view

affects: [02-03-lista-de-accion, Phase 3 onwards]

# Tech tracking
tech-stack:
  added: [@radix-ui/react-dialog (via shadcn sheet), date-fns es locale]
  patterns:
    - ContactoSheet as reusable trigger-based component (modalMode prop for portal conflict avoidance)
    - Preset interval + exact calendar date picker pattern for future action scheduling

key-files:
  created:
    - frontend/src/components/ui/sheet.tsx
    - frontend/src/hooks/useContactos.ts
    - frontend/src/hooks/useCreateContacto.ts
    - frontend/src/components/crm/ContactoSheet.tsx
    - frontend/src/app/dashboard/pacientes/components/ContactosSection.tsx
  modified:
    - frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx

key-decisions:
  - "ContactoSheet uses modalMode=false when rendered inside PatientDrawer to prevent Radix portal z-index conflict between Sheet and Drawer"
  - "ContactosSection integrated inline in PatientDrawer default view (not as a tab) to make contact history always visible on scroll"
  - "useCreateContacto invalidates 4 query keys: contactos, lista-accion, crm-kanban, paciente — ensuring all views stay fresh after a contact is logged"
  - "diasSinContacto badge uses 3-tier color (red>14d, amber>7d, green<=7d) for instant urgency signal"
  - "Preset intervals (2d/1w/2w/1m) as primary proxima-accion UX, with optional exact calendar as secondary mode"

patterns-established:
  - "Trigger-wrapper pattern: ContactoSheet wraps any trigger node with onClick, no separate trigger import needed"
  - "Section separator pattern: mt-6 pt-5 border-t between PacienteDetails and ContactosSection in the drawer"

requirements-completed: [LOG-01, LOG-02, LOG-03, LOG-04]

# Metrics
duration: 18min
completed: 2026-02-23
---

# Phase 2 Plan 02: Log de Contactos — Frontend Panel Summary

**ContactoSheet (RHF+Zod lateral sheet) + useContactos/useCreateContacto hooks + ContactosSection con badge de dias-sin-contacto integrada en el drawer del paciente**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-23T00:00:00Z
- **Completed:** 2026-02-23T00:18:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- shadcn Sheet component installed + useContactos and useCreateContacto TanStack Query hooks created
- ContactoSheet lateral form with tipo selector, nota textarea, optional CRM stage/temperature dropdowns, and proxima-accion with preset intervals + calendar
- ContactosSection with last-5 contact history, relative timestamps, and color-coded dias-sin-contacto badge integrated inline in PatientDrawer default view

## Task Commits

Each task was committed atomically:

1. **Task 1: Sheet component + hooks** - `6463cdf` (feat)
2. **Task 2: ContactoSheet + ContactosSection + drawer integration** - `d699a72` (feat)

## Files Created/Modified

- `frontend/src/components/ui/sheet.tsx` - shadcn Sheet component (installed via npx shadcn)
- `frontend/src/hooks/useContactos.ts` - Query hook for GET /pacientes/:id/contactos with optional limit
- `frontend/src/hooks/useCreateContacto.ts` - Mutation hook with 4-query invalidation on success
- `frontend/src/components/crm/ContactoSheet.tsx` - Reusable lateral sheet form with RHF+Zod, tipo/nota/etapaCRM/temperatura/proxima-accion fields
- `frontend/src/app/dashboard/pacientes/components/ContactosSection.tsx` - Inline section for last-5 contacts + registrar button + dias-sin-contacto badge
- `frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx` - Added ContactosSection import and inline render below PacienteDetails in default view

## Decisions Made

- `modalMode={false}` prop on ContactoSheet when used inside PatientDrawer to avoid Radix portal z-index conflict between the bottom Drawer and the lateral Sheet
- ContactosSection integrated as inline section (not a tab) so contact history is always visible without navigation
- useCreateContacto invalidates `contactos`, `lista-accion`, `crm-kanban`, `paciente` — all 4 views that need to reflect new contact data
- Preset intervals as primary UX for proxima-accion scheduling (2d/1w/2w/1m), exact calendar as opt-in secondary mode

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ContactoSheet is reusable and ready to be used from the Lista de Accion (Plan 02-03) with no changes needed
- useCreateContacto and useContactos hooks are production-ready
- All 4 LOG requirements satisfied

---
*Phase: 02-log-de-contactos-lista-de-accion*
*Completed: 2026-02-23*
