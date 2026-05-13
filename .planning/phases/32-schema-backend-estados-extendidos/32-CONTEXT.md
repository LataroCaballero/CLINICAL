# Phase 32: Schema + Backend Estados Extendidos - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Add two new lifecycle states (`EN_ESPERA`, `SIENDO_ATENDIDO`) to the `EstadoTurno` Prisma enum and expose them via new PATCH endpoints. Update `iniciarSesion` to set `SIENDO_ATENDIDO` instead of `CONFIRMADO`. Deliver three new endpoints: `marcar-en-espera`, `marcar-ausente`, `reactivar`. Backend-only — no UI changes in this phase.

</domain>

<decisions>
## Implementation Decisions

### State machine rules
- `marcar-en-espera`: allowed from `PENDIENTE` or `CONFIRMADO` only
- `marcar-ausente`: allowed from `PENDIENTE`, `EN_ESPERA`, or `CONFIRMADO`
- `reactivar`: `AUSENTE → PENDIENTE` only — `CANCELADO` is not a valid source
- `iniciarSesion`: sets estado to `SIENDO_ATENDIDO` (not `CONFIRMADO` as today)

### Guard behavior
- Calling an endpoint with the turno already in the target state → 400 BadRequest (consistent with existing `cancelar`, `finalizar` pattern in `turnos.service.ts`)
- `iniciarSesion` existing guard on `inicioReal` is sufficient — no extra SIENDO_ATENDIDO state check needed
- Terminal states (`CANCELADO`, `FINALIZADO`) block all new transitions (same pattern as existing endpoints)

### Role authorization
- All three new endpoints (`marcar-en-espera`, `marcar-ausente`, `reactivar`) use the same role set: `SECRETARIA / PROFESIONAL / ADMIN`
- Consistent with EST-02 and the existing pattern in the module

### Data migration
- Existing `CONFIRMADO` turnos are left as-is after migration — no backfill
- `CONFIRMADO` becomes a legacy transitional state (in practice, zero active sessions expected at migration time)
- Migration adds `EN_ESPERA` and `SIENDO_ATENDIDO` to the PostgreSQL enum via `ALTER TYPE` in the generated migration SQL

### Claude's Discretion
- Exact NestJS method naming for service methods (`marcarEnEspera`, `marcarAusente`, `reactivar`)
- Endpoint URL slugs (follow existing pattern: `/:id/marcar-en-espera`, `/:id/marcar-ausente`, `/:id/reactivar`)
- Whether to add DTOs or just use parameterized methods (existing endpoints like `confirmar`, `cancelar` use no DTO)
- Return shape of the new endpoints (consistent with existing PATCH endpoints — return full turno with relations)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TurnosService` guard pattern: check `estado === CANCELADO || FINALIZADO` → throw `BadRequestException` — replicate for new endpoints
- `@Roles(Role.SECRETARIA, Role.PROFESIONAL, Role.ADMIN)` decorator already used in the controller — same decorator for new endpoints
- `this.prisma.turno.update({ where: { id }, data: { estado: ... } })` — standard update pattern used in all state transitions

### Established Patterns
- Controller: `@Patch(':id/verb')` + `async verb(@Param('id') id: string, @GetUser() user: JwtPayload)` — no body DTO needed for simple state transitions
- Service: guard → find turno → check terminal states → check source state → update → return with include
- Roles: `@Roles(Role.SECRETARIA, Role.PROFESIONAL, Role.ADMIN)` already declared, no new guard needed

### Integration Points
- `iniciarSesion` at `turnos.service.ts:679` — change `estado: EstadoTurno.CONFIRMADO` to `estado: EstadoTurno.SIENDO_ATENDIDO` at line ~725
- Frontend type unions `"PENDIENTE" | "CONFIRMADO" | "CANCELADO" | "AUSENTE" | "FINALIZADO"` defined inline in 4+ files — needs `EN_ESPERA` and `SIENDO_ATENDIDO` added (or a shared type defined in `frontend/src/types/`)
- `frontend/src/app/dashboard/turnos/CalendarGrid.tsx:136` — color switch for AUSENTE exists; add cases for EN_ESPERA and SIENDO_ATENDIDO

</code_context>

<specifics>
## Specific Ideas

- No specific references — straightforward state machine extension
- The planner should note that `AUSENTE` already exists in the enum (was added in a prior schema); only `EN_ESPERA` and `SIENDO_ATENDIDO` need to be added

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 32-schema-backend-estados-extendidos*
*Context gathered: 2026-05-13*
