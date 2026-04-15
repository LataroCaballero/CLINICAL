---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: Flujo de Pacientes
status: not_started
stopped_at: ""
last_updated: "2026-04-15T00:00:00.000Z"
last_activity: 2026-04-15 — Milestone v1.4 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-15)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** v1.4 Flujo de Pacientes — defining requirements

## Current Position

```
Milestone: v1.4 Flujo de Pacientes
Phase:     Not started (defining requirements)
Plan:      —
Status:    Defining requirements
Progress:  [░░░░░░░░░░] 0%
```

Last activity: 2026-04-15 — Milestone v1.4 started

## Milestone Summary

**v1.4 Flujo de Pacientes — TBD phases, TBD requirements**

*(Roadmap pending — to be created after requirements defined)*

## Accumulated Context

### Decisions (carry-forward from v1.3)
- Future date boundary uses `hoy.setHours(23, 59, 59, 999)` so today is not rejected as future in HC entries
- `fechaFinal` only passed to Prisma when provided; DB `@default(now())` handles nil case
- Retroactive fecha pattern established in Phase 20 historia-clinica
- Single `selectedDate: Date` state replaces dual `dateIndex`+`pickedDate` pattern

### Decisions (carry-forward from v1.2)
- Raw SOAP/XML para AFIP (no SDK) — afipjs/afip-apis unmaintained
- AES-256-GCM via EncryptionService existente para cert+key por tenant
- FACTURADOR no tiene Profesional record — profesionalId siempre parámetro explícito
- Montos server-side en transacción atómica — nunca totales del cliente

### Known Tech Debt (carry-forward)
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod antes de deploy
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
- TypeScript strict mode desactivado, cobertura tests <6%

## Session Continuity

Last session: 2026-04-15T00:00:00.000Z
Stopped at: Requirements definition
Resume file: None
