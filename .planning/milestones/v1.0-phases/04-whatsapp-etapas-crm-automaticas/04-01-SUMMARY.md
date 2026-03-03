---
phase: 04-whatsapp-etapas-crm-automaticas
plan: "01"
subsystem: database
tags: [prisma, postgresql, crm, enum, migration]

# Dependency graph
requires:
  - phase: 03-presupuestos-completos
    provides: CRM module base (EtapaCRM, TemperaturaPaciente, ContactoLog, MensajeWhatsApp models)
provides:
  - Simplified EtapaCRM enum (7 values, no SEGUIMIENTO_ACTIVO/CALIENTE)
  - PROCEDIMIENTO_REALIZADO stage in EtapaCRM
  - DireccionMensajeWA enum (OUTBOUND/INBOUND)
  - MensajeWhatsApp.direccion field for chat-bubble direction in UI
  - Raw SQL migration that handles PostgreSQL enum recreation safely
affects:
  - 04-02 (WhatsApp threading/chat UI uses direccion field)
  - 04-03 (CRM stage transitions use new PROCEDIMIENTO_REALIZADO value)
  - 04-04 (turno-triggered CRM transitions)
  - 04-05 (UI for WhatsApp chat thread)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PostgreSQL enum recreation pattern (ADD VALUE → migrate data → RENAME old → CREATE new → ALTER columns → DROP old)
    - Manual migration SQL injection for enum removal (Prisma cannot generate DROP VALUE)

key-files:
  created:
    - backend/src/prisma/migrations/20260227000000_crm_v2_whatsapp_thread/migration.sql
  modified:
    - backend/src/prisma/schema.prisma
    - backend/src/modules/pacientes/pacientes.service.ts
    - frontend/src/hooks/useCRMKanban.ts
    - frontend/src/components/crm/KanbanColumn.tsx
    - frontend/src/app/dashboard/accion/page.tsx
    - frontend/src/app/dashboard/components/CRMKpiCards.tsx
    - frontend/src/components/crm/ContactoSheet.tsx

key-decisions:
  - "SEGUIMIENTO_ACTIVO removed from EtapaCRM — it was a duplicate concept; TemperaturaPaciente handles heat; stages should describe what happened not how engaged"
  - "CALIENTE removed from EtapaCRM — TemperaturaPaciente already has CALIENTE; having it in both enums was an error from Phase 2"
  - "PROCEDIMIENTO_REALIZADO added between PRESUPUESTO_ENVIADO and CONFIRMADO — represents the clinical milestone before final conversion"
  - "Data migration: SEGUIMIENTO_ACTIVO and CALIENTE (EtapaCRM) rows migrated to CONSULTADO — safest semantic mapping"
  - "prisma migrate deploy used instead of migrate dev — non-interactive environment requires deploy for migration application"
  - "DireccionMensajeWA default OUTBOUND — existing rows were all system-sent messages"

patterns-established:
  - "PostgreSQL enum recreation: ADD VALUE IF NOT EXISTS → migrate data → RENAME old type → CREATE new type → ALTER TABLE USING text cast → DROP old type"
  - "Manual migration SQL file creation for operations Prisma cannot generate (enum value removal)"

requirements-completed: [WA-02, WA-03, CRM-01, CRM-02, CRM-05]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 04 Plan 01: CRM Schema Migration Summary

**EtapaCRM simplified to 7 stages (removed SEGUIMIENTO_ACTIVO/CALIENTE, added PROCEDIMIENTO_REALIZADO) + DireccionMensajeWA enum for WhatsApp chat direction, applied via raw SQL migration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T00:23:03Z
- **Completed:** 2026-02-28T00:26:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- EtapaCRM enum simplified: removed duplicate/erroneous SEGUIMIENTO_ACTIVO and CALIENTE stages, added PROCEDIMIENTO_REALIZADO milestone stage
- DireccionMensajeWA enum created and MensajeWhatsApp.direccion column added — enables chat-bubble direction rendering in Phase 4 UI
- PostgreSQL enum recreation executed safely via raw SQL migration (ADD VALUE → migrate data → RENAME → CREATE → ALTER → DROP pattern)
- All codebase references updated: backend service kanban grouping + score weights, frontend type definitions, labels, color maps, and CRM forms

## Task Commits

Each task was committed atomically:

1. **Task 1: Update schema.prisma** - `fb7ad48` (feat)
2. **Task 2: Create and apply migration + fix enum references** - `d7cc473` (feat)

## Files Created/Modified
- `backend/src/prisma/schema.prisma` - Updated EtapaCRM enum, added DireccionMensajeWA enum and MensajeWhatsApp.direccion field
- `backend/src/prisma/migrations/20260227000000_crm_v2_whatsapp_thread/migration.sql` - 7-step raw SQL migration for enum recreation
- `backend/src/modules/pacientes/pacientes.service.ts` - Updated kanban column map and etapa score weights
- `frontend/src/hooks/useCRMKanban.ts` - Updated EtapaCRM type, ETAPA_LABELS, ETAPA_ORDER
- `frontend/src/components/crm/KanbanColumn.tsx` - Updated ETAPA_COLORS map
- `frontend/src/app/dashboard/accion/page.tsx` - Updated ETAPA_LABELS
- `frontend/src/app/dashboard/components/CRMKpiCards.tsx` - Updated distribucionEtapas reference
- `frontend/src/components/crm/ContactoSheet.tsx` - Updated ETAPAS_CRM list

## Decisions Made
- SEGUIMIENTO_ACTIVO and CALIENTE (EtapaCRM) rows migrated to CONSULTADO — safest semantic mapping for existing data
- Used `prisma migrate deploy` instead of `prisma migrate dev` — non-interactive environment required it
- DireccionMensajeWA default OUTBOUND — all pre-existing MensajeWhatsApp rows were system-sent

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale enum references in backend service and all frontend files**
- **Found during:** Task 2 (migration application)
- **Issue:** `pacientes.service.ts` still referenced SEGUIMIENTO_ACTIVO and CALIENTE in kanban grouping and score weights. Frontend files (useCRMKanban, KanbanColumn, ContactoSheet, CRMKpiCards, accion/page) referenced removed enum values.
- **Fix:** Replaced SEGUIMIENTO_ACTIVO with PROCEDIMIENTO_REALIZADO in all column maps, type definitions, label maps, color maps, and form options. Removed CALIENTE from EtapaCRM contexts (kept in TemperaturaPaciente contexts).
- **Files modified:** backend/src/modules/pacientes/pacientes.service.ts, frontend/src/hooks/useCRMKanban.ts, frontend/src/components/crm/KanbanColumn.tsx, frontend/src/components/crm/ContactoSheet.tsx, frontend/src/app/dashboard/components/CRMKpiCards.tsx, frontend/src/app/dashboard/accion/page.tsx
- **Verification:** Backend build passes (`npm run build` clean). No remaining references to removed enum values in active code.
- **Committed in:** d7cc473 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary correctness fix. Enum cleanup is incomplete without updating all consumers.

## Issues Encountered
- `prisma migrate dev --create-only` failed in non-interactive environment (Claude Code shell). Resolved by creating migration directory and SQL file manually, then applying with `prisma migrate deploy`.

## Next Phase Readiness
- Schema is ready for Phase 4 plans 02-05
- EtapaCRM has correct values for turno-triggered transitions (04-04)
- MensajeWhatsApp.direccion is ready for chat UI rendering (04-05)
- No blockers for next plan

---
*Phase: 04-whatsapp-etapas-crm-automaticas*
*Completed: 2026-02-28*
