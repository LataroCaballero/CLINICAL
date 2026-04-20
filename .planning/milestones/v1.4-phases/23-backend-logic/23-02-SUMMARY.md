---
phase: 23-backend-logic
plan: 02
subsystem: api
tags: [prisma, nestjs, crm, flujo-paciente, filtering]

# Dependency graph
requires:
  - phase: 22-schema-foundation
    provides: FlujoPaciente enum in Prisma schema, Paciente.flujo column

provides:
  - CRM views (kanban, lista accion, dashboard, metrics) scoped to flujo=CIRUGIA|null
  - getKanban() and getListaAccion() with flujo WHERE filter
  - 5 crm-dashboard.service.ts methods with flujo filter (6 call sites)
  - getCRMMetrics() with flujo filter

affects: [24-liveturno-banner, 25-tratamientos-tab]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CRM queries use OR: [{flujo: FlujoPaciente.CIRUGIA}, {flujo: null}] to include legacy patients and exclude TRATAMIENTO"

key-files:
  created: []
  modified:
    - backend/src/modules/pacientes/pacientes.service.ts
    - backend/src/modules/reportes/services/crm-dashboard.service.ts
    - backend/src/modules/reportes/services/crm-metrics.service.ts

key-decisions:
  - "CRM flujo filter uses OR pattern [{flujo: CIRUGIA}, {flujo: null}] — legacy patients (flujo IS NULL) remain fully visible"
  - "Patients with flujo=TRATAMIENTO are excluded from all 8 CRM call sites"
  - "getCoordinatorPerformance and getPipelineIncome use nested paciente: { OR: [...] } because they query via ContactoLog/Presupuesto relations"
  - "reportes-dashboard.service.ts was intentionally NOT modified — only CRM-specific services affected"

patterns-established:
  - "Flujo CRM filter pattern: OR: [{ flujo: FlujoPaciente.CIRUGIA }, { flujo: null }] at every CRM query site"
  - "Nested relation filter for linked queries: paciente: { OR: [{ flujo: FlujoPaciente.CIRUGIA }, { flujo: null }] }"

requirements-completed: [CRM-01, CRM-02, CRM-03]

# Metrics
duration: 10min
completed: 2026-04-16
---

# Phase 23 Plan 02: CRM Flujo Filter Summary

**Uniform `WHERE (flujo = 'CIRUGIA' OR flujo IS NULL)` filter across all 8 CRM call sites — kanban, lista accion, funnel snapshot, KPIs, motivos perdida, pipeline income, coordinator performance, and CRM metrics**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-16T12:38:25Z
- **Completed:** 2026-04-16T12:48:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `getKanban()` and `getListaAccion()` in pacientes.service.ts now exclude TRATAMIENTO patients
- All 5 methods in crm-dashboard.service.ts (6 call sites) have flujo filter applied
- `getCRMMetrics()` in crm-metrics.service.ts now scoped to CIRUGIA|null
- FlujoPaciente imported in both reportes services (was missing)
- Build remains green throughout all changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Agregar flujo filter a pacientes.service.ts (getKanban + getListaAccion)** - `5bf3447` (feat)
2. **Task 2: Agregar flujo filter a crm-dashboard.service.ts y crm-metrics.service.ts** - `62e6419` (feat)

**Plan metadata:** _(pending docs commit)_

## Files Created/Modified
- `backend/src/modules/pacientes/pacientes.service.ts` - getKanban and getListaAccion WHERE clauses extended with OR flujo filter
- `backend/src/modules/reportes/services/crm-dashboard.service.ts` - FlujoPaciente import added; 6 call sites across getFunnelSnapshot, getKpis (x3), getMotivosPerdida, getPipelineIncome (nested), getCoordinatorPerformance (nested) updated
- `backend/src/modules/reportes/services/crm-metrics.service.ts` - FlujoPaciente import added; getCRMMetrics WHERE extended

## Decisions Made
- CRM filter pattern `OR: [{flujo: FlujoPaciente.CIRUGIA}, {flujo: null}]` applied uniformly across all 8 query sites
- Legacy patients (flujo IS NULL) remain visible — prevents empty kanban on v1.4 deploy
- For relation-based queries (ContactoLog, Presupuesto), filter nested inside `paciente: { OR: [...] }` since those models don't have flujo directly
- `reportes-dashboard.service.ts` intentionally untouched — it serves non-CRM financial dashboards

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 23 Plan 01 (auto-update flujo on turno create) + this plan (CRM filter) complete the backend logic phase
- Phases 24 (LiveTurno Banner) and 25 (Tratamientos Tab) can proceed independently
- All CRM views now correctly scoped to cirugía funnel only

---
*Phase: 23-backend-logic*
*Completed: 2026-04-16*
