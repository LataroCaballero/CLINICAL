---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Historial de Consultas
status: completed
stopped_at: Completed 20-backend-data-fixes-20-01-PLAN.md
last_updated: "2026-04-02T15:08:28.998Z"
last_activity: 2026-04-02 — Phase 20 plan 01 complete (BACK-01, BACK-02, BACK-03)
progress:
  total_phases: 2
  completed_phases: 1
  total_plans: 1
  completed_plans: 1
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-02)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** v1.3 Historial de Consultas — Phase 20 ready to plan

## Current Position

```
Milestone: v1.3 Historial de Consultas
Phase:     20 of 21 (Backend Data Fixes) — COMPLETE
Plan:      01 of 01 — COMPLETE
Status:    Phase 20 done, Phase 21 ready
Progress:  [██████████] 100%
```

Last activity: 2026-04-02 — Phase 20 plan 01 complete (BACK-01, BACK-02, BACK-03)

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
- Future date boundary uses `hoy.setHours(23, 59, 59, 999)` so today is not rejected as future in HC entries
- `fechaFinal` only passed to Prisma when provided; DB `@default(now())` handles nil case without behavior regression

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

Last session: 2026-04-02T15:05:40.677Z
Stopped at: Completed 20-backend-data-fixes-20-01-PLAN.md
Resume file: None
