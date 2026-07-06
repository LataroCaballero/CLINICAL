---
gsd_state_version: 1.0
milestone: v1.13
milestone_name: Embudo CRM Accionable
status: shipped
stopped_at: v1.13 milestone archived
last_updated: "2026-07-06T00:00:00.000Z"
last_activity: 2026-07-05 -- v1.13 shipped and archived
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 8
  completed_plans: 8
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-05 after v1.13 milestone)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Planificar el próximo milestone (`/gsd:new-milestone`)

## Current Position

Milestone: v1.13 Embudo CRM Accionable — ✅ SHIPPED 2026-07-05
Phases: 4/4 complete (57–60), 8/8 plans
Status: Milestone archived; requirements fresh para el próximo milestone
Last activity: 2026-07-05 -- v1.13 shipped and archived

Progress: [██████████] 100%

## Accumulated Context

### Decisions

Full decision log en `.planning/PROJECT.md` (Key Decisions). Decisiones de v1.13 archivadas en `.planning/milestones/v1.13-ROADMAP.md` (Milestone Summary → Key Decisions).

### Known Tech Debt (carry-forward)

- **Introducido en v1.13 (advisory):** `crearTurno` degrada etapas avanzadas a `TURNO_AGENDADO` en cualquier turno (intencional D-09/EMBUDO-05); paso 'cirugia' cuenta cirugías CANCELADA/SUSPENDIDA como completas (divergencia con scheduler); consentimiento/indicaciones sin hook de invalidación `crm-kanban` (board-hide EMBUDO-04 depende del portal v1.12 + refetch pasivo, by design D-04).
- **Pre-existente / carried:** `todo cr-01-indicaciones-url-validation.md` (`indicacionesUrl` sin validación server-side, stored-XSS pre-Phase-54); `quick-task 1-eliminar-dropdown-tipo-de-consulta-de-hc` incompleto.
- HistorialClinicoPanel y TurnoHCModal no migrados a HCEntryContent.tsx (diferido).
- AppointmentDetailModal y CalendarGrid no migrados a getEstadoTurnoChip (diferido).
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend.
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod.
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs.
- **Gate legal pre-go-live (v1.12):** revisión del flujo de consentimiento (Ley 25506 / Ley 26529) antes del primer paciente quirúrgico real.

## Deferred Items

Items diferidos al cierre de v1.13 (audit `tech_debt`; son stubs de verificación humana/browser + deuda carried, no bloqueantes):

| Category | Item | Status |
|----------|------|--------|
| uat_gap | 58-HUMAN-UAT (5 escenarios: orden columnas, indicador naranja, etiquetas contacto, hide todosCompletos) | partial |
| verification_gap | 58-VERIFICATION | human_needed |
| verification_gap | 60 frontend KPI cards display (backend 8/8 + SECURED) | manual pending |
| quick_task | 1-eliminar-dropdown-tipo-de-consulta-de-hc | missing |
| todo | cr-01-indicaciones-url-validation (stored-XSS pre-Phase-54, carried) | pending |

## Session Continuity

Last session: 2026-07-05T22:07:33.776Z
Stopped at: v1.13 milestone archived
Resume file: None
