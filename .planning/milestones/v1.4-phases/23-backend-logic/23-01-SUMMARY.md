---
phase: 23-backend-logic
plan: 01
subsystem: api
tags: [nestjs, prisma, turnos, flujo-paciente, crm]

# Dependency graph
requires:
  - phase: 22-schema-foundation
    provides: FlujoPaciente enum, TipoTurno.flujoPaciente nullable column, Paciente.flujo column with PENDIENTE default
provides:
  - crearTurno() with step 5.5 flujo auto-update best-effort fire-and-forget
  - Monotonic guard — only advances PENDIENTE, never downgrades CIRUGIA/TRATAMIENTO
  - TipoTurno types without flujoPaciente (Control, Consulta pendiente) are no-ops
affects:
  - 24-liveturno-banner (reads Paciente.flujo to show amber banner for PENDIENTE)
  - 25-tratamientos-tab (badge flujo in patient table)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "fire-and-forget best-effort side-effect via .catch() without await"
    - "monotonic field guard pattern: only update if current value is initial state"

key-files:
  created: []
  modified:
    - backend/src/modules/turnos/turnos.service.ts

key-decisions:
  - "Step 5.5 uses .catch() (no await) — flujo update never blocks turno creation response"
  - "Guard is double-gated: tipoTurno.flujoPaciente must be non-null AND paciente.flujo must be PENDIENTE — TipoTurno without flujoPaciente are no-ops"
  - "Logger.warn on failure includes turnoId + pacienteId for traceability without throwing"

patterns-established:
  - "Best-effort side effect: prisma.model.update({ ... }).catch(err => logger.warn(...)) — no await"
  - "Monotonic field update: guard with current === initial prevents downgrades"

requirements-completed: [FLUJO-01, FLUJO-02, FLUJO-03, FLUJO-04]

# Metrics
duration: 12min
completed: 2026-04-16
---

# Phase 23 Plan 01: Backend Logic Summary

**crearTurno() auto-classifies PENDIENTE patients via fire-and-forget flujo update when TipoTurno.flujoPaciente is set — monotonic guard prevents downgrades**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-16T12:38:26Z
- **Completed:** 2026-04-16T12:50:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added `Logger` and `FlujoPaciente` imports to turnos.service.ts
- Expanded `tipoTurno` and `pacienteCRM` selects to include `flujoPaciente` and `flujo`
- Inserted step 5.5 after CRM auto-transition: fire-and-forget `prisma.paciente.update` that advances `flujo` from `PENDIENTE` to the value from `TipoTurno.flujoPaciente`
- Guard ensures TipoTurno types with `flujoPaciente = null` (Control, Consulta pendiente) are no-ops and existing CIRUGIA/TRATAMIENTO patients are never downgraded

## Task Commits

Each task was committed atomically:

1. **Task 1: Expandir selects y agregar Logger + FlujoPaciente import** - `8e75101` (feat)
2. **Task 2: Insertar step 5.5 flujo auto-update best-effort** - `6c0c204` (feat)

**Plan metadata:** `(pending docs commit)` (docs: complete plan)

## Files Created/Modified
- `backend/src/modules/turnos/turnos.service.ts` - Added Logger class property, FlujoPaciente import, expanded selects, inserted step 5.5 fire-and-forget block

## Decisions Made
- Step 5.5 uses `.catch()` without `await` — flujo update is best-effort and never blocks the HTTP response to the caller
- Double-gated guard (`tipoTurno.flujoPaciente && pacienteCRM?.flujo === FlujoPaciente.PENDIENTE`) ensures TipoTurno types without classification (Control, Consulta pendiente) produce no effect
- Logger.warn logs `turnoId` + `pacienteId` on failure — sufficient traceability without exposing a 500

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- crearTurno() now auto-classifies patients when a clasificatory TipoTurno is selected
- Phase 24 (LiveTurno Banner) can now read `Paciente.flujo === PENDIENTE` to show the amber banner
- Phase 25 (Tratamientos Tab) can use `flujo` badge in patient table
- No blockers

---
*Phase: 23-backend-logic*
*Completed: 2026-04-16*
