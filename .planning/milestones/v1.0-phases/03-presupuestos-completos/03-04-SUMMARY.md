---
phase: 03-presupuestos-completos
plan: 04
subsystem: api
tags: [nestjs, prisma, typescript, presupuestos, pacientes, crm]

# Dependency graph
requires:
  - phase: 03-presupuestos-completos
    provides: "Plan 03-03 built presupuesto UI, hooks, columns.tsx reading presupuestoEstado"
provides:
  - "GET /pacientes returns presupuestoEstado (latest presupuesto state, VENCIDO logic)"
  - "PATCH /presupuestos/:id/marcar-enviado sets tokenAceptacion UUID if not already set"
affects: [03-UAT, future-phases-using-presupuesto-column]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "obtenerListaPacientes() is the single authoritative patient-list method — findAll() kept for internal use only"
    - "tokenAceptacion generation is idempotent: reuse existing token or generate crypto.randomUUID()"

key-files:
  created: []
  modified:
    - backend/src/modules/pacientes/pacientes.controller.ts
    - backend/src/modules/pacientes/pacientes.service.ts
    - backend/src/modules/pacientes/dto/paciente-lista.dto.ts
    - backend/src/modules/presupuestos/presupuestos.service.ts
    - frontend/src/types/pacients.ts

key-decisions:
  - "Controller GET /pacientes calls obtenerListaPacientes() not findAll() — presupuesto column now shows real state"
  - "presupuestosActivos field removed from DTO/type — presupuestoEstado (string|null) replaces it"
  - "VENCIDO computed server-side: latest presupuesto with fechaValidez in past and state BORRADOR|ENVIADO"
  - "tokenAceptacion generation in marcarEnviado() is idempotent — reuse existing or randomUUID()"

requirements-completed: [PRES-05, PRES-06, PRES-07, PRES-08, CRM-03, CRM-04]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 03 Plan 04: UAT Gap Closure Summary

**Controller wired to obtenerListaPacientes() + tokenAceptacion generation in marcarEnviado() — UAT tests 2, 8, 9, 10 unblocked**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T20:20:19Z
- **Completed:** 2026-02-27T20:22:11Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Fixed GET /pacientes to return `presupuestoEstado` (latest presupuesto state with VENCIDO logic) by wiring controller to `obtenerListaPacientes()` instead of `findAll()`
- Replaced `presupuestosActivos: number` with `presupuestoEstado?: string | null` in both backend DTO and frontend type — the columns.tsx already read `presupuestoEstado` so badges now work
- Added `tokenAceptacion` generation in `marcarEnviado()` via `crypto.randomUUID()` (idempotent), enabling the public acceptance URL `/presupuesto/[token]` regardless of whether presupuesto was sent via email or manual toggle

## Task Commits

1. **Task 1: Fix patient list controller + DTO + service + frontend types** - `c4c14f9` (fix)
2. **Task 2: Generate tokenAceptacion in marcarEnviado()** - `0a1b75a` (fix)

## Files Created/Modified
- `backend/src/modules/pacientes/pacientes.controller.ts` - GET /pacientes calls obtenerListaPacientes(), removed resolveScope import
- `backend/src/modules/pacientes/pacientes.service.ts` - presupuestos include fetches 1 entry ordered by createdAt desc with VENCIDO logic
- `backend/src/modules/pacientes/dto/paciente-lista.dto.ts` - presupuestosActivos removed, presupuestoEstado added
- `backend/src/modules/presupuestos/presupuestos.service.ts` - crypto import + tokenAceptacion in marcarEnviado()
- `frontend/src/types/pacients.ts` - PacienteListItem: presupuestosActivos -> presupuestoEstado

## Decisions Made
- Controller calls `obtenerListaPacientes()` which returns rich DTO with computed presupuesto state — `findAll()` kept but no longer used by the main list endpoint
- VENCIDO computed at the service layer, not the frontend — single source of truth
- Token generation is idempotent: `presupuesto.tokenAceptacion ?? crypto.randomUUID()` — calling marcarEnviado() multiple times won't change an existing token

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UAT can be re-run: tests 2 (presupuesto column shows correct state) and 8 (public URL works after marcar-enviado) should now pass
- Tests 9 and 10 (acceptance/rejection via public page) are unblocked since tokenAceptacion is always set
- Phase 03 UAT closure is the next step

## Self-Check: PASSED

- FOUND: `backend/src/modules/pacientes/pacientes.controller.ts`
- FOUND: `backend/src/modules/pacientes/pacientes.service.ts`
- FOUND: `.planning/phases/03-presupuestos-completos/03-04-SUMMARY.md`
- FOUND commit: `c4c14f9` (Task 1)
- FOUND commit: `0a1b75a` (Task 2)

---
*Phase: 03-presupuestos-completos*
*Completed: 2026-02-27*
