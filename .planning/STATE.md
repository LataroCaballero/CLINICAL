---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Agenda Operativa
status: 3 state-transition endpoints live, iniciarSesion → SIENDO_ATENDIDO, frontend types extended
stopped_at: Completed 32-02-PLAN.md (state-transition endpoints + frontend type sync)
last_updated: "2026-05-13T20:22:55.787Z"
last_activity: "2026-05-13 — Plan 32-02 complete: marcarEnEspera, marcarAusente, reactivar endpoints + iniciarSesion → SIENDO_ATENDIDO + frontend types in 5 files"
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-13)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Milestone v1.6 — Agenda Operativa (Phase 32 next)

## Current Position

```
Milestone: v1.6 Agenda Operativa
Phase:     32 — Schema + Backend Estados Extendidos (COMPLETE)
Plan:      02 complete (2/2 plans done)
Status:    3 state-transition endpoints live, iniciarSesion → SIENDO_ATENDIDO, frontend types extended
Progress:  [██████████] 100% (31/31 plans across all milestones)
```

Last activity: 2026-05-13 — Plan 32-02 complete: marcarEnEspera, marcarAusente, reactivar endpoints + iniciarSesion → SIENDO_ATENDIDO + frontend types in 5 files

## Phase Map

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 32 | Schema + Backend Estados Extendidos | EST-01..05 | Complete (2/2 plans) |
| 33 | Widget Agenda Operativo | WID-01..06 | Not started |
| 34 | LiveTurno Simplificado | LT-01..03 | Not started |

## Accumulated Context

### Carry-forward Decisions (v1.5)
- HCCreatorForm reutilizable compartido entre LiveTurno y PatientDrawer
- OrdenConsumo pattern: PENDIENTE → confirmación por stock admin
- Snapshot de precio en presupuesto (inmutable al momento de selección)
- Paciente.flujo: null = legacy, PENDIENTE = sin clasificar, CIRUGIA/TRATAMIENTO = clasificado
- Guard PENDIENTE-only: no sobreescribe clasificaciones existentes

### v1.6 Key Decisions (Phase 32 recorded)
- EN_ESPERA y SIENDO_ATENDIDO se agregan al enum EstadoTurno existente (DONE - Plan 32-01)
- Migration SQL creada manualmente: Supabase pgbouncer (6543) bloquea schema engine; aplicar con prisma migrate deploy o SQL editor (Plan 32-01)
- iniciarSesion establece SIENDO_ATENDIDO (no CONFIRMADO) — sesion activa != cita confirmada (DONE - Plan 32-02)
- QuickAppointment.tsx usa TurnoRango.estado: string (no inline union) — no requiere actualizacion de tipo (Plan 32-02)
- SIENDO_ATENDIDO rechazado como origen de marcarEnEspera — en sesion activa primero cerrar-sesion (Plan 32-02)
- El menú contextual del widget muestra acciones segun estado (pendiente para Phase 33)
- Exit sin HC en LiveTurno llama cerrar-sesion → FINALIZADO (nunca queda turno en estado abierto, pendiente Phase 34)
- El timer de consulta se elimina de la UI pero duracionRealMinutos se preserva en backend (pendiente Phase 34)

### Known Tech Debt (carry-forward)
- LIVHC-05/PAC-01: tratamientos snapshot no se escribe cuando consumirInsumos=false
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs

## Session Continuity

Last session: 2026-05-13T20:18:01.607Z
Stopped at: Completed 32-02-PLAN.md (state-transition endpoints + frontend type sync)
Resume file: .planning/phases/32-schema-backend-estados-extendidos/32-02-SUMMARY.md
Next action: `/gsd:execute-phase 33` (Phase 33: Widget Agenda Operativo)
