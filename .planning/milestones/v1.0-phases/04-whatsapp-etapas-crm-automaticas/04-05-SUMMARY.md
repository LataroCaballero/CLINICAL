---
phase: 04-whatsapp-etapas-crm-automaticas
plan: "05"
subsystem: ui
tags: [whatsapp, crm, kanban, polling, tanstack-query, nestjs, prisma]

# Dependency graph
requires:
  - phase: 04-whatsapp-etapas-crm-automaticas
    provides: MensajeWhatsApp model with direccion INBOUND/OUTBOUND, WhatsApp message thread UI, useWAThread hook
  - phase: 04-whatsapp-etapas-crm-automaticas
    provides: CRM Kanban board with PatientCard and KanbanColumn components
provides:
  - GET /whatsapp/unread endpoint returning {pacienteId: unreadCount} map
  - useWAUnread() hook with 30s polling exported from useWAThread.ts
  - Patient list table shows green WA unread count badge next to patient name
  - Kanban PatientCard shows green WA unread badge (top-right corner) when count > 0
  - Dashboard layout shows fixed global badge (bottom-20 right-4) with total WA unread count
affects: [04-06, 05-whatsapp-automaticas]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Column factory pattern: createPacienteColumns(unreadMap) generates column defs with injected data; pacienteColumns re-export provides backward compat"
    - "Props threading for unread indicators: KanbanBoard -> KanbanColumn -> PatientCard via unreadMap/unreadWA props"
    - "Single polling hook (useWAUnread) instantiated at page level and layout level; avoids per-cell query proliferation"

key-files:
  created: []
  modified:
    - backend/src/modules/whatsapp/whatsapp.service.ts
    - backend/src/modules/whatsapp/whatsapp.controller.ts
    - frontend/src/hooks/useWAThread.ts
    - frontend/src/app/dashboard/pacientes/page.tsx
    - frontend/src/app/dashboard/pacientes/components/PacientesDataTable.tsx
    - frontend/src/app/dashboard/pacientes/components/columns.tsx
    - frontend/src/components/crm/KanbanBoard.tsx
    - frontend/src/components/crm/KanbanColumn.tsx
    - frontend/src/components/crm/PatientCard.tsx
    - frontend/src/app/dashboard/layout.tsx

key-decisions:
  - "createPacienteColumns(unreadMap) factory chosen over per-cell useWAUnread() calls — avoids N hooks for N table rows, single query at page level"
  - "unreadMap threaded as props (Board->Column->Card) rather than a React context — simpler, no extra provider, props are typed"
  - "Global badge placed at bottom-20 right-4 with pointer-events-none — clears DockNav, does not block interactions"
  - "pacienteColumns re-export retained for backward compatibility with any caller that uses the static array"

patterns-established:
  - "Column factory pattern: pass external data into createColumns(data) rather than calling hooks inside cell renders"
  - "Prop-thread unread indicators down through Kanban hierarchy for clarity over context"

requirements-completed: [WA-05]

# Metrics
duration: 8min
completed: 2026-02-28
---

# Phase 4 Plan 05: WA Unread Indicators Summary

**GET /whatsapp/unread endpoint + useWAUnread 30s-polling hook feeding green badges in patient list rows, Kanban cards, and a fixed global layout indicator**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-28T23:15:00Z
- **Completed:** 2026-02-28T23:23:56Z
- **Tasks:** 1 (all changes in single atomic task)
- **Files modified:** 10

## Accomplishments

- Backend `getUnreadCounts()` computes inbound messages received after last outbound per patient using groupBy
- `GET /whatsapp/unread` accessible to ADMIN/PROFESIONAL/SECRETARIA roles
- `useWAUnread()` hook polls every 30s, staleTime 10s; exported from existing `useWAThread.ts`
- Patient list name column shows green count badge via `createPacienteColumns(unreadMap)` factory
- KanbanColumn passes `unreadWA` prop to each PatientCard; card shows absolute-positioned green badge
- Dashboard layout shows fixed `bottom-20 right-4` badge with MessageSquare icon + total count when > 0

## Task Commits

1. **Task 1: Backend unread WA count endpoint + frontend unread indicators on list, kanban, and global layout** - `1a11eeb` (feat)

**Plan metadata:** (created after this task)

## Files Created/Modified

- `backend/src/modules/whatsapp/whatsapp.service.ts` - Added `getUnreadCounts(profesionalId)` method using findMany + groupBy to compute per-patient unread counts
- `backend/src/modules/whatsapp/whatsapp.controller.ts` - Added `GET /whatsapp/unread` endpoint with Auth guard
- `frontend/src/hooks/useWAThread.ts` - Added `useWAUnread()` export — polls `/whatsapp/unread` every 30s
- `frontend/src/app/dashboard/pacientes/components/columns.tsx` - Refactored `pacienteColumns` to `createPacienteColumns(unreadMap?)` factory; green badge on name cell when unread > 0; retained `pacienteColumns` re-export
- `frontend/src/app/dashboard/pacientes/components/PacientesDataTable.tsx` - Added `unreadMap?` prop; passes to `createPacienteColumns()`
- `frontend/src/app/dashboard/pacientes/page.tsx` - Calls `useWAUnread()`; passes `waUnreadMap` to `PacientesDataTable` and `KanbanBoard`
- `frontend/src/components/crm/KanbanBoard.tsx` - Added `unreadMap?` prop; passes to `KanbanColumn` instances
- `frontend/src/components/crm/KanbanColumn.tsx` - Added `unreadMap?` prop; passes `unreadWA={unreadMap?.[patient.id]}` to each `PatientCard`
- `frontend/src/components/crm/PatientCard.tsx` - Added `unreadWA?` prop; added `relative` to root, absolute green badge top-right when > 0
- `frontend/src/app/dashboard/layout.tsx` - Imports `useWAUnread` + `MessageSquare`; computes `totalWAUnread`; renders fixed global badge when > 0

## Decisions Made

- **Column factory over per-cell hook:** `createPacienteColumns(unreadMap)` rather than calling `useWAUnread()` inside each cell render — avoids React Rules of Hooks violation with N hooks for N rows
- **Props threading over context:** `unreadMap` threaded as explicit props through `KanbanBoard -> KanbanColumn -> PatientCard` for type safety and discoverability
- **Global badge cleared DockNav:** `bottom-20` chosen to sit above DockNav; `pointer-events-none` prevents blocking click targets
- **Backward compat re-export:** `export const pacienteColumns = createPacienteColumns()` kept so any existing caller that uses the static array continues to work without changes

## Deviations from Plan

**1. [Rule 1 - Auto-fix] Updated KanbanColumn to accept unreadMap prop**
- **Found during:** Task 1 (wiring unreadMap through KanbanBoard)
- **Issue:** Plan mentioned passing unread data to PatientCard via KanbanBoard, but PatientCards are rendered inside KanbanColumn — the intermediate component needed to thread the prop
- **Fix:** Added `unreadMap?` prop to KanbanColumn and threaded it to PatientCard — required for the prop chain to work
- **Files modified:** `frontend/src/components/crm/KanbanColumn.tsx`
- **Committed in:** `1a11eeb` (task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — intermediate prop threading in KanbanColumn)
**Impact on plan:** Required for correctness; no scope creep; plan omitted this intermediate step.

## Issues Encountered

None — TypeScript compiled cleanly on both backend and frontend with no errors.

## Unread Endpoint Response Shape

```typescript
// GET /whatsapp/unread
// Response: Record<string, number>
// Only patients with unread > 0 are included
{
  "cm7abc123": 2,  // 2 unread inbound messages from patient cm7abc123
  "cm7def456": 1   // 1 unread inbound message from patient cm7def456
}
```

Logic: for each patient, count INBOUND messages with `createdAt > lastOutboundMessage.createdAt`. If no outbound message exists, all inbound messages count as unread.

## Next Phase Readiness

- WA unread surface is complete across all 3 notification surfaces (list, kanban, global layout)
- Plan 04-06 can add WA send shortcuts to PacienteDetails, PresupuestosView, and AppointmentDetailModal
- `useWAUnread` hook is available for use in any future component that needs per-patient unread counts

---
*Phase: 04-whatsapp-etapas-crm-automaticas*
*Completed: 2026-02-28*
