---
phase: 02-log-de-contactos-lista-de-accion
plan: 01
subsystem: api
tags: [prisma, postgresql, nestjs, crm, contactos]

# Dependency graph
requires:
  - phase: 01-infraestructura-async
    provides: CRM module (EtapaCRM, TemperaturaPaciente enums and Paciente CRM fields)
provides:
  - ContactoLog Prisma model with enum TipoContacto (LLAMADA, MENSAJE, PRESENCIAL)
  - Migration 20260223224551_contact_log applied to production database
  - GET /pacientes/lista-accion endpoint with server-side priority scoring
  - GET /pacientes/:id/contactos endpoint returning contact history
  - POST /pacientes/:id/contactos endpoint with $transaction (persists log + updates patient CRM state)
affects:
  - 02-02 (frontend log de contactos UI uses these endpoints)
  - 02-03 (lista de accion frontend uses GET /pacientes/lista-accion)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - $transaction for atomic ContactoLog creation + Paciente CRM field update
    - Server-side priority scoring with weights per temperatura and etapaCRM
    - UTC-3 Argentina offset calculation for "contacted today" exclusion window

key-files:
  created:
    - backend/src/prisma/migrations/20260223224551_contact_log/migration.sql
    - backend/src/modules/pacientes/dto/create-contacto.dto.ts
  modified:
    - backend/src/prisma/schema.prisma
    - backend/src/modules/pacientes/pacientes.controller.ts
    - backend/src/modules/pacientes/pacientes.service.ts

key-decisions:
  - "EtapaCRM scoring map uses actual schema enum values (TURNO_AGENDADO, CONSULTADO) — plan had incorrect values CONSULTA_AGENDADA/CONSULTA_REALIZADA that don't exist in the enum"
  - "calcularScore() caps diasSinContacto at 30 to prevent score explosion for very old leads"
  - "getListaAccion() returns {items, contactadosHoy, total} — contactadosHoy enables the counter widget in the frontend"
  - "etapaCRMPost and temperaturaPost stored in ContactoLog for audit trail — separate from actual patient state"

patterns-established:
  - "ContactoLog endpoint pattern: POST creates log + optionally updates patient state in same transaction"
  - "lista-accion route placed BEFORE :id wildcard in controller to avoid route shadowing"

requirements-completed: [LOG-01, LOG-02, LOG-03, LOG-04, ACCION-01, ACCION-02, ACCION-04]

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 02 Plan 01: Log de Contactos — API Summary

**ContactoLog Prisma model + 3 NestJS endpoints enabling contact history tracking and server-side patient prioritization for the action list**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T22:44:41Z
- **Completed:** 2026-02-23T22:47:40Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- ContactoLog model added to Prisma schema with TipoContacto enum, migration applied and Prisma client regenerated
- POST /pacientes/:id/contactos persists interaction and atomically updates etapaCRM/temperatura in a single $transaction
- GET /pacientes/lista-accion returns patients prioritized by score = diasSinContacto × tempWeight × etapaWeight, excluding CONFIRMADO/PERDIDO and patients contacted today (UTC-3)

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema — modelo ContactoLog + migración** - `9f6b21c` (feat)
2. **Task 2: DTO + Controller endpoints + Service methods** - `cfae2ac` (feat)

**Plan metadata:** _(committed with docs commit below)_

## Files Created/Modified

- `backend/src/prisma/schema.prisma` — Added TipoContacto enum, ContactoLog model, contactos relations to Paciente and Profesional
- `backend/src/prisma/migrations/20260223224551_contact_log/migration.sql` — Migration creating ContactoLog table with indexes
- `backend/src/modules/pacientes/dto/create-contacto.dto.ts` — CreateContactoDto with class-validator decorators for all fields
- `backend/src/modules/pacientes/pacientes.controller.ts` — Added GET lista-accion, GET :id/contactos, POST :id/contactos (in correct order before :id wildcard)
- `backend/src/modules/pacientes/pacientes.service.ts` — Added getListaAccion(), getContactosByPaciente(), createContacto(), calcularScore(), calcularDiasSinContacto()

## Decisions Made

- EtapaCRM scoring map corrected to use actual enum values: `TURNO_AGENDADO` and `CONSULTADO` (plan had non-existent values `CONSULTA_AGENDADA` / `CONSULTA_REALIZADA`)
- Score formula: `min(diasSinContacto, 30) × tempWeight × etapaWeight` — capped at 30 days to prevent score explosion
- `contactadosHoy` counter included in lista-accion response to enable frontend "X patients contacted today" widget

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect EtapaCRM enum values in scoring map**
- **Found during:** Task 2 (service implementation)
- **Issue:** Plan's calcularScore() used `CONSULTA_REALIZADA` and `CONSULTA_AGENDADA` which don't exist in the actual EtapaCRM enum. The real values are `CONSULTADO` and `TURNO_AGENDADO`.
- **Fix:** Used correct enum values `CONSULTADO` (weight 2) and `TURNO_AGENDADO` (weight 1) in etapaWeight map
- **Files modified:** backend/src/modules/pacientes/pacientes.service.ts
- **Verification:** Build passes, TypeScript accepts enum values
- **Committed in:** cfae2ac (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential correctness fix. No scope creep. Score weights preserved as designed.

## Issues Encountered

None — build was clean on first attempt after the enum fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 3 endpoints are live and available for frontend consumption
- GET /pacientes/lista-accion ready for Plan 02-03 (Lista de Accion UI)
- GET/POST /pacientes/:id/contactos ready for Plan 02-02 (Log de Contactos panel)
- No blockers

---
*Phase: 02-log-de-contactos-lista-de-accion*
*Completed: 2026-02-23*
