---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Historial de Consultas
status: completed
stopped_at: "Checkpoint 21-03 task-2: awaiting human-verify of end-to-end flow"
last_updated: "2026-04-09T11:32:41.221Z"
last_activity: 2026-04-03 — Phase 21 plan 02 complete (DASH-01..05)
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 4
  completed_plans: 4
  percent: 92
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-02)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** v1.3 Historial de Consultas — Phase 20 ready to plan

## Current Position

```
Milestone: v1.3 Historial de Consultas
Phase:     21 of 21 (Agenda Widget + Modal HC) — IN PROGRESS
Plan:      02 of 03 — COMPLETE
Status:    Phase 21 plan 02 done (DASH-01..05), plan 03 pending
Progress:  [█████████░] 92%
```

Last activity: 2026-04-03 — Phase 21 plan 02 complete (DASH-01..05)

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
- Retroactive fecha pattern reused verbatim from Phase 20 historia-clinica for hc-templates createEntry (HC-03)
- Single `selectedDate: Date` state initialized to `new Date()` replaces dual `dateIndex`+`pickedDate` in UpcomingAppointments — eliminates mode-switching complexity (21-02)
- `isHoyOPasado = isToday || isPast` is the single gate for both metrics strip and Ver HC button — no pickedDate condition needed (21-02)

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

Last session: 2026-04-09T11:32:41.220Z
Stopped at: Checkpoint 21-03 task-2: awaiting human-verify of end-to-end flow
Resume file: None
