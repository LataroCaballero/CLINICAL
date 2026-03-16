---
phase: 04-whatsapp-etapas-crm-automaticas
plan: "06"
subsystem: frontend-whatsapp-entrypoints
tags: [whatsapp, pacientes, turnos, presupuestos, crm, frontend]
dependency_graph:
  requires: ["04-04", "04-05"]
  provides: ["WA-01"]
  affects: ["PacienteDetails", "PresupuestosView", "AppointmentDetailModal", "CalendarGrid"]
tech_stack:
  added: []
  patterns: ["opt-in gate", "disabled+tooltip pattern", "SendWAMessageModal reuse"]
key_files:
  created: []
  modified:
    - frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx
    - frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx
    - frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx
    - frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx
    - frontend/src/app/dashboard/turnos/CalendarGrid.tsx
    - frontend/src/app/dashboard/turnos/page.tsx
decisions:
  - "ActionButton kept for existing actions; WhatsApp button uses shadcn Button for proper disabled prop support matching plan spec"
  - "sendingWAId tracks per-presupuesto loading state (not global boolean) — multiple presupuestos can exist on the page"
  - "CalendarEvent interface updated in both CalendarGrid.tsx and page.tsx (two local interface declarations) since CalendarGrid is a presentational component that receives events"
metrics:
  duration: 3min
  completed: 2026-02-28
  tasks_completed: 2
  files_changed: 6
---

# Phase 04 Plan 06: WhatsApp Entry Points (Patient Profile + Turno + Presupuesto) Summary

WhatsApp send shortcuts added to all remaining coordinator entry points: patient profile action bar, presupuesto detail, and appointment detail modal; plus CalendarGrid/page mapping updated to carry pacienteId and whatsappOptIn from the API.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | WA shortcut in PacienteDetails + presupuesto WA button | b5fdc0f | PacienteDetails.tsx, PresupuestosView.tsx, PatientDrawer.tsx |
| 2 | WA shortcut in AppointmentDetailModal + CalendarGrid mapping | 7ae6190 | AppointmentDetailModal.tsx, CalendarGrid.tsx, page.tsx |

## Key Changes by File

### PacienteDetails.tsx
- Added `useState` + `SendWAMessageModal` import
- Added `Button` + `Tooltip/TooltipTrigger/TooltipContent` imports
- Added WhatsApp action button in "Acciones rapidas" grid (7th button)
- Button `disabled={!(paciente as any).whatsappOptIn}` with TooltipContent when disabled
- `SendWAMessageModal` rendered conditionally with `waModalOpen` state

### PresupuestosView.tsx
- Added `pacienteOptIn?: boolean` to `Props` type
- Added `Tooltip`, `MessageSquare`, `Loader2` imports + `toast` from sonner
- Added `sendingWAId: string | null` state for per-presupuesto loading
- Added "Enviar por WhatsApp" button per presupuesto in actions area
- Calls `POST /whatsapp/presupuesto/:id/send` with `{ pacienteId }`, disabled+tooltip when no opt-in

### PatientDrawer.tsx
- Passes `pacienteOptIn={(paciente as any).whatsappOptIn ?? false}` to `PresupuestosView`

### AppointmentDetailModal.tsx
- Extended `CalendarEvent` interface: added `pacienteId?: string`, `whatsappOptIn?: boolean`
- Added `MessageSquare` import + `Tooltip*` + `SendWAMessageModal` imports
- Added `waModalOpen` state
- Added WhatsApp button in action area (below "Reagendar turno"), guarded by `event.pacienteId`
- Added `SendWAMessageModal` rendered via React fragment alongside the Dialog

### CalendarGrid.tsx
- Extended local `CalendarEvent` interface: added `pacienteId?: string`, `whatsappOptIn?: boolean`

### turnos/page.tsx
- Extended local `CalendarEvent` interface: added `pacienteId?: string`, `whatsappOptIn?: boolean`
- Mapping now includes `pacienteId: t.pacienteId ?? undefined` and `whatsappOptIn: t.paciente?.whatsappOptIn ?? false`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] React fragment wrapper in AppointmentDetailModal**
- **Found during:** Task 2
- **Issue:** Adding `SendWAMessageModal` after `</Dialog>` inside `return (...)` requires a React fragment — original return had no fragment
- **Fix:** Wrapped return in `<>...</>` fragment to accommodate the sibling modal element
- **Files modified:** AppointmentDetailModal.tsx
- **Commit:** 7ae6190

**2. [Rule 2 - Missing critical functionality] page.tsx CalendarEvent interface also needed update**
- **Found during:** Task 2
- **Issue:** The `page.tsx` file defines its own local `CalendarEvent` interface (separate from `CalendarGrid.tsx`) and creates the mapped objects. Without updating both, the mapping would be adding undeclared fields and TypeScript would complain
- **Fix:** Updated `CalendarEvent` interface in `page.tsx` to add `pacienteId` and `whatsappOptIn`, and updated the `.map()` call accordingly
- **Files modified:** page.tsx
- **Commit:** 7ae6190

**3. [Rule 3 - Design deviation] sendingWAId is per-presupuesto, not global boolean**
- **Found during:** Task 1
- **Issue:** Plan spec used `const [sendingWA, setSendingWA] = useState(false)` — a single boolean. But PresupuestosView renders a list of presupuestos, each with their own WA button
- **Fix:** Used `const [sendingWAId, setSendingWAId] = useState<string | null>(null)` — tracks which specific presupuesto is sending. `disabled={!pacienteOptIn || sendingWAId === p.id}`
- **Files modified:** PresupuestosView.tsx
- **Commit:** b5fdc0f

## TypeScript Compilation

Result: PASSED — zero errors (after filtering pre-existing validator.ts/.next issues)

## Self-Check: PASSED

All files verified:
- `PacienteDetails.tsx` — contains `whatsappOptIn`, `WhatsApp`, `SendWAMessageModal`
- `PresupuestosView.tsx` — contains `Enviar por WhatsApp`, `pacienteOptIn`
- `PatientDrawer.tsx` — contains `pacienteOptIn`
- `AppointmentDetailModal.tsx` — contains `whatsappOptIn`, `SendWAMessageModal`, `pacienteId`
- `CalendarGrid.tsx` — contains `whatsappOptIn`, `pacienteId`
- Commits `b5fdc0f` and `7ae6190` exist in git log
