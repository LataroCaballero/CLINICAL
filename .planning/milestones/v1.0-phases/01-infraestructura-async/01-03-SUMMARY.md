---
phase: 01-infraestructura-async
plan: 03
subsystem: ui
tags: [react, tanstack-query, shadcn-ui, whatsapp, waba, next-js]

# Dependency graph
requires:
  - phase: 01-infraestructura-async
    plan: 02
    provides: "WABA config endpoints (GET/POST /whatsapp/config) and PATCH /pacientes/:id/whatsapp-opt-in"
provides:
  - "useWabaConfig hook (GET /whatsapp/config)"
  - "useSaveWabaConfig hook (POST /whatsapp/config)"
  - "useUpdateWhatsappOptIn hook (PATCH /pacientes/:id/whatsapp-opt-in)"
  - "WhatsappConfigTab component in Settings page (ADMIN + PROFESIONAL only)"
  - "WhatsappOptInToggle component in patient profile"
affects:
  - 02-mensajes-directos
  - 04-whatsapp-integration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WABA config tab follows same role-conditional pattern as other config tabs"
    - "OptIn toggle uses Switch from shadcn/ui with partial queryKey invalidation"
    - "Error display is inline (not toast) for form validation errors from Meta API"

key-files:
  created:
    - frontend/src/hooks/useWabaConfig.ts
    - frontend/src/hooks/useSaveWabaConfig.ts
    - frontend/src/hooks/useUpdateWhatsappOptIn.ts
    - frontend/src/app/dashboard/configuracion/components/WhatsappConfigTab.tsx
    - frontend/src/app/dashboard/pacientes/components/WhatsappOptInToggle.tsx
  modified:
    - frontend/src/app/dashboard/configuracion/page.tsx
    - frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx

key-decisions:
  - "WhatsApp tab added to ADMIN (flex TabsList, max-w-xl) and PROFESIONAL (grid-cols-8, max-w-5xl) — NOT added to SECRETARIA/FACTURADOR view"
  - "PROFESIONAL tabs grid changed from grid-cols-7 to grid-cols-8 to accommodate WhatsApp tab"
  - "useUpdateWhatsappOptIn invalidates with partial key ['paciente', pacienteId] to cover all effectiveProfessionalId variants"
  - "whatsappOptIn and whatsappOptInAt read as (paciente as any) pending Prisma client regeneration and type update"
  - "Meta API errors shown inline below the submit button (not toast) for persistent visibility during form correction"

patterns-established:
  - "Role-based tab visibility via separate if-blocks per role (no single conditional tab trigger)"
  - "Connected state shows badge + number + name; disconnected shows form — toggle via showForm local state"

requirements-completed: [INFRA-02, INFRA-03]

# Metrics
duration: 15min
completed: 2026-02-23
---

# Phase 01 Plan 03: WhatsApp Frontend UI Summary

**TanStack Query hooks + WhatsApp Settings tab (ADMIN/PROFESIONAL only) + patient opt-in toggle using Switch/shadcn-ui, connected to WABA endpoints from plan 01-02**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-23T21:30:12Z
- **Completed:** 2026-02-23T21:45:00Z
- **Tasks:** 3 of 3 (Task 3: human-verify checkpoint — APPROVED by user)
- **Files modified:** 7

## Accomplishments
- 3 TanStack Query hooks: useWabaConfig, useSaveWabaConfig, useUpdateWhatsappOptIn
- WhatsappConfigTab: connected state (badge + phone + name) vs. connection form with inline error display
- WhatsappOptInToggle: Switch with opt-in date formatted in es-AR locale
- Settings page: WhatsApp tab added for ADMIN and PROFESIONAL, invisible to SECRETARIA/FACTURADOR
- PacienteDetails: toggle rendered in contact section after phone field

## Task Commits

Each task was committed atomically:

1. **Task 1: Hooks TanStack Query para WABA config y opt-in** - `a2bde1a` (feat)
2. **Task 2: Componentes UI — WhatsappConfigTab, WhatsappOptInToggle y render en PacienteDetails** - `fc92c50` (feat)
3. **Task 3: Verificar UI de WhatsApp** - APPROVED (human-verify checkpoint passed)

## Files Created/Modified
- `frontend/src/hooks/useWabaConfig.ts` - GET /whatsapp/config query hook
- `frontend/src/hooks/useSaveWabaConfig.ts` - POST /whatsapp/config mutation, invalidates waba-config
- `frontend/src/hooks/useUpdateWhatsappOptIn.ts` - PATCH opt-in mutation, partial key invalidation for paciente
- `frontend/src/app/dashboard/configuracion/components/WhatsappConfigTab.tsx` - WABA connection form + connected state UI
- `frontend/src/app/dashboard/pacientes/components/WhatsappOptInToggle.tsx` - Switch with date display
- `frontend/src/app/dashboard/configuracion/page.tsx` - WhatsApp tab added for ADMIN and PROFESIONAL (grid-cols-8)
- `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx` - WhatsappOptInToggle rendered in contact section

## Decisions Made
- PROFESIONAL tabs grid changed from `grid-cols-7` to `grid-cols-8` to accommodate the new WhatsApp tab
- `useUpdateWhatsappOptIn` invalidates with partial key `["paciente", pacienteId]` to cover all effectiveProfessionalId variants (TanStack Query partial matching)
- `whatsappOptIn` and `whatsappOptInAt` cast with `(paciente as any)` temporarily — TODO: update PacienteDetalle type after regenerating Prisma client
- Meta API errors displayed inline below submit button (not toast) for persistent visibility during form correction

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no new environment variables or external services. Uses WABA credentials entered through the UI itself.

## Next Phase Readiness

- WhatsApp UI layer complete — Settings + patient profile both functional
- Phase 2 (mensajes directos) can now rely on opt-in state visible in patient profile
- TODO before Phase 4: regenerate Prisma client and update `PacienteDetalle` TypeScript type to include `whatsappOptIn` and `whatsappOptInAt` fields (currently cast as `any`)

---
*Phase: 01-infraestructura-async*
*Completed: 2026-02-23*
