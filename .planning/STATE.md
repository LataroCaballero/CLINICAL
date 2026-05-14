---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Agenda Operativa
status: LT-02 complete — switch-session AlertDialog en UpcomingAppointments, botón Iniciar clickeable siempre
stopped_at: Completed 34-02-PLAN.md
last_updated: "2026-05-14T01:50:00.000Z"
last_activity: "2026-05-14 — Plan 34-02 complete: switch-session AlertDialog en UpcomingAppointments (LT-02)"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 6
  completed_plans: 5
  percent: 97
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-13)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Milestone v1.6 — Agenda Operativa (Phase 32 next)

## Current Position

```
Milestone: v1.6 Agenda Operativa
Phase:     34 — LiveTurno Simplificado (IN PROGRESS)
Plan:      02 complete (2/? plans done — LT-02 done)
Status:    LT-02 done — switch-session AlertDialog en UpcomingAppointments
Progress:  [██████████] 97% (34/35 plans across all milestones)
```

Last activity: 2026-05-14 — Plan 34-02 complete: switch-session AlertDialog en UpcomingAppointments (LT-02)

## Phase Map

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 32 | Schema + Backend Estados Extendidos | EST-01..05 | Complete (2/2 plans) |
| 33 | Widget Agenda Operativo | WID-01..06 | Complete (2/2 plans) |
| 34 | LiveTurno Simplificado | LT-01..03 | In progress (LT-02 done) |

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
- El menú contextual del widget muestra acciones segun estado (DONE - Plan 33-02)
- useTurnoEstadoActions: mutations-only hook (no optimistic update) — Plan 02 maneja feedback visual via isPending en el componente (Plan 33-01)
- TurnoEstado type exportado desde useTurnoEstadoActions para que Plan 02 lo importe sin redefinirlo (Plan 33-01)
- DropdownMenu trigger opacity-0 group-hover:opacity-100 — Acciones column stays clean by default (Plan 33-02)
- SIENDO_ATENDIDO excluded from DropdownMenu — active session must be closed before state changes (Plan 33-02)
- EN_ESPERA gets menu but "En espera" item is disabled (already in that state) — user can still Ausentarlo (Plan 33-02)
- Exit sin HC en LiveTurno llama cerrar-sesion → FINALIZADO (nunca queda turno en estado abierto, pendiente Phase 34)
- El timer de consulta se elimina de la UI pero duracionRealMinutos se preserva en backend (pendiente Phase 34)
- AlertDialogAction usa e.preventDefault() para prevenir cierre automatico del dialog durante handleConfirmSwitch async (Plan 34-02)
- cerrarSesion.mutateAsync({}) sin entradaHCId — no auto-guardar HC draft al cambiar sesion (Plan 34-02)
- Switch-session pattern: cerrar primero, si falla abortar y no abrir el nuevo turno (Plan 34-02)

### Known Tech Debt (carry-forward)
- LIVHC-05/PAC-01: tratamientos snapshot no se escribe cuando consumirInsumos=false
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs

## Session Continuity

Last session: 2026-05-14T01:50:00.000Z
Stopped at: Completed 34-02-PLAN.md
Resume file: .planning/phases/34-liveturno-simplificado/34-02-SUMMARY.md
Next action: Phase 34 — LiveTurno Simplificado (LT-01, LT-03 pending)
