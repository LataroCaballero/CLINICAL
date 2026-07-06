---
gsd_state_version: 1.0
milestone: v1.14
milestone_name: Portal — Firma Gated e Indicaciones Separadas
status: planning
last_updated: "2026-07-06T20:30:00.000Z"
last_activity: 2026-07-06
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-06 after v1.14 roadmap)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 61 — Backend Schema, Decoupling e Indicaciones (ready to plan)

## Current Position

Phase: 61 of 62 (Backend — Schema, Decoupling e Indicaciones)
Plan: — (not yet planned)
Status: Roadmap created — ready to plan Phase 61
Last activity: 2026-07-06 — Roadmap v1.14 creado (2 fases, Phases 61–62)

Progress: [░░░░░░░░░░] 0%

## Accumulated Context

### Decisions

Full decision log en `.planning/PROJECT.md` (Key Decisions). Decisiones de v1.13 archivadas en `.planning/milestones/v1.13-ROADMAP.md`.

**Decisions relevantes para v1.14:**
- D-04 (v1.13): consentimiento/indicaciones sin invalidación inmediata de crm-kanban — W-1 cierra en Phase 62 de v1.14 vía refetch on focus
- Indicaciones sólo requieren acuse de lectura (no firma dibujada): campo `indicacionesLeidasAt` en `Paciente`, endpoint portal-scoped
- Gate open-PDF es client-side (no server-side): la prueba legal es firma + checkbox CONS-10
- Migración de schema: patrón pgBouncer (`prisma diff + db execute + migrate resolve`), nunca `migrate dev`

### Known Tech Debt (carry-forward)

- **Introducido en v1.13 (advisory):** `crearTurno` degrada etapas avanzadas a `TURNO_AGENDADO` en cualquier turno (intencional); paso 'cirugia' cuenta cirugías CANCELADA/SUSPENDIDA como completas; consentimiento/indicaciones sin invalidación inmediata crm-kanban (se cierra en Phase 62).
- **Pre-existente / carried:** `todo cr-01-indicaciones-url-validation.md` (stored-XSS pre-Phase-54); `quick-task 1-eliminar-dropdown-tipo-de-consulta-de-hc` incompleto.
- HistorialClinicoPanel y TurnoHCModal no migrados a HCEntryContent.tsx (diferido).
- AppointmentDetailModal y CalendarGrid no migrados a getEstadoTurnoChip (diferido).
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend.
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod.
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs.
- **Gate legal pre-go-live (v1.12):** revisión del flujo de consentimiento (Ley 25506 / Ley 26529) antes del primer paciente quirúrgico real.

## Deferred Items

Items diferidos al cierre de v1.13:

| Category | Item | Status |
|----------|------|--------|
| uat_gap | 58-HUMAN-UAT (5 escenarios: orden columnas, indicador naranja, etiquetas contacto, hide todosCompletos) | partial |
| verification_gap | 58-VERIFICATION | human_needed |
| verification_gap | 60 frontend KPI cards display (backend 8/8 + SECURED) | manual pending |
| quick_task | 1-eliminar-dropdown-tipo-de-consulta-de-hc | missing |
| todo | cr-01-indicaciones-url-validation (stored-XSS pre-Phase-54, carried) | pending |

## Session Continuity

Last session: 2026-07-06T20:30:00.000Z
Stopped at: Roadmap v1.14 creado — 2 fases (61–62), 10/10 requisitos mapeados
Resume file: None
