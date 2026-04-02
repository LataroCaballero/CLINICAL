---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Historial de Consultas
status: ready_to_plan
stopped_at: Roadmap v1.3 created — Phase 20 ready to plan
last_updated: "2026-04-02T00:00:00.000Z"
last_activity: "2026-04-02 — Roadmap v1.3 created. 2 phases, 11 requirements mapped. Phase 20 ready to plan."
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-02)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** v1.3 Historial de Consultas — Phase 20 ready to plan

## Current Position

```
Milestone: v1.3 Historial de Consultas
Phase:     20 of 21 (Backend Data Fixes)
Plan:      —
Status:    Ready to plan
Progress:  [░░░░░░░░░░] 0%
```

Last activity: 2026-04-02 — Roadmap created, Phase 20 ready to plan

## Milestone Summary

**v1.3 Historial de Consultas — 2 phases, 11 requirements**

| Phase | Name | Requirements | Gate |
|-------|------|--------------|------|
| 20 | Backend Data Fixes | BACK-01, BACK-02, BACK-03 | None |
| 21 | Agenda Widget + Modal HC | DASH-01..05, HC-01..03 | Phase 20 |

## Accumulated Context

### Decisions (carry-forward from v1.2)
- Raw SOAP/XML para AFIP (no SDK) — afipjs/afip-apis unmaintained
- AES-256-GCM via EncryptionService existente para cert+key por tenant
- AfipStubService permanece disponible via env toggle para desarrollo local
- FACTURADOR no tiene Profesional record — profesionalId siempre parámetro explícito
- Montos server-side en transacción atómica — nunca totales del cliente

### Decisions (v1.3 new)
*(none yet — populated during plan-phase)*

### Key Files for v1.3
- `backend/src/modules/turnos/turnos.service.ts` — fix Prisma selects (BACK-01, BACK-02)
- `backend/src/modules/historia-clinica/` — agregar campo `fecha` opcional al DTO/service (BACK-03)
- `frontend/src/app/dashboard/components/UpcomingAppointments.tsx` — reescribir agenda-first (DASH-01..05)
- `frontend/src/app/dashboard/components/TurnoHCModal.tsx` — nuevo modal con formato LiveTurno (HC-01..03)

### Known Tech Debt (carry-forward)
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod antes de deploy
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
- TypeScript strict mode desactivado, cobertura tests <6%

## Session Continuity

Last session: 2026-04-02
Stopped at: Roadmap v1.3 created — ready to run /gsd:plan-phase 20
Resume file: None
