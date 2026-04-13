---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Historial de Consultas
status: shipped
stopped_at: "v1.3 milestone archived 2026-04-13"
last_updated: "2026-04-13T17:35:58.377Z"
last_activity: 2026-04-13 — v1.3 milestone archived
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 4
  completed_plans: 4
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-13)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Planning next milestone (v2.0 TBD)

## Current Position

```
Milestone: v1.3 Historial de Consultas — SHIPPED 2026-04-13
Phase:     21 of 21 — COMPLETE
Status:    Milestone archived, tag pending
Progress:  [██████████] 100%
```

Last activity: 2026-04-13 — v1.3 milestone archived

## Milestone Summary

**v1.3 Historial de Consultas — SHIPPED**
- 2 phases (20–21), 4 plans, 11/11 requirements
- 7 días (2026-04-02 → 2026-04-09)
- Archive: `.planning/milestones/v1.3-ROADMAP.md`

## Accumulated Context

### Decisions (carry-forward)
- Raw SOAP/XML para AFIP (no SDK) — afipjs/afip-apis unmaintained
- AES-256-GCM via EncryptionService existente para cert+key por tenant
- AfipStubService permanece disponible via env toggle para desarrollo local
- FACTURADOR no tiene Profesional record — profesionalId siempre parámetro explícito
- Montos server-side en transacción atómica — nunca totales del cliente
- Single `selectedDate: Date` state en UpcomingAppointments — reemplaza dual dateIndex+pickedDate
- Future date boundary: `setHours(23,59,59,999)` en validación HC (patrón en ambos endpoints)

### Known Tech Debt (carry-forward)
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod antes de deploy
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
- TypeScript strict mode desactivado, cobertura tests <6%
- Human-verify checkpoint (21-03 task-2) pendiente — verificación browser E2E del flujo completo

## Session Continuity

Last session: 2026-04-13
Stopped at: Milestone v1.3 archived
Resume with: `/gsd:new-milestone` to plan v2.0
