---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: Flujo de Pacientes
status: in-progress
stopped_at: "Completed 22-02-PLAN.md"
last_updated: "2026-04-15T22:30:00Z"
last_activity: 2026-04-15 — Plan 22-02 complete — Migration applied, seed updated, findAll() exposes flujoPaciente+esCirugia
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 3
  completed_plans: 2
  percent: 17
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-15)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** v1.4 Flujo de Pacientes — Phase 22: Schema Foundation

## Current Position

```
Milestone: v1.4 Flujo de Pacientes
Phase:     22 of 25 (Schema Foundation)
Plan:      2 of 3 complete
Status:    In progress
Progress:  [██░░░░░░░░] 17%
```

Last activity: 2026-04-15 — Plan 22-02 complete — Migration applied, seed updated, findAll() exposes flujoPaciente+esCirugia

## Milestone Summary

**v1.4 Flujo de Pacientes — 4 phases, 20 requirements**

| Phase | Goal | Requirements |
|-------|------|--------------|
| 22. Schema Foundation | Schema + seed + backfill + PATCH endpoint | TIPOS-01, TIPOS-02, FLUJO-06 |
| 23. Backend Logic | Auto-update flujo al crear turno + CRM filtros | FLUJO-01–04, CRM-01–03 |
| 24. LiveTurno Banner | Banner amber clasificación PENDIENTE | LIVT-01–03 |
| 25. Tratamientos Tab | Tab mensual + badge flujo en tabla pacientes | FLUJO-05, TRAT-01–06 |

## Accumulated Context

### Critical Decisions (v1.4)
- [22-01] Paciente.flujo column added without SQL DEFAULT — existing rows = NULL (legacy), new inserts get PENDIENTE from Prisma @default; this cleanly distinguishes legacy from unclassified
- [22-01] Control TipoTurno reused via UPDATE (not INSERT) due to UNIQUE constraint on nombre; only 4 net-new TipoTurno rows inserted
- Backfill SQL infers CIRUGIA from `Turno.esCirugia = true` OR `etapaCRM IS NOT NULL` — NOT blanket PENDIENTE
- CRM filter: `WHERE (flujo = 'CIRUGIA' OR (flujo IS NULL AND etapaCRM IS NOT NULL))` — preserves legacy data
- `flujo = null` (legacy) vs `flujo = PENDIENTE` are different: only PENDIENTE triggers LiveTurno banner
- Auto-update is monotonic: only fires when `paciente.flujo === 'PENDIENTE'`; never downgrades CIRUGIA/TRATAMIENTO
- `Paciente.flujo` uses `@default(PENDIENTE)` NOT NULL to eliminate null-guards in new code
- `TipoTurno.flujoPaciente` stays nullable; `esCirugia` kept (used by `cerrarSesion()`)
- Phases 24 and 25 are independent of each other (both depend on Phase 23)
- [22-02] Prisma auto-generated supplemental migration 20260415221758 (SET DEFAULT PENDIENTE + 2 indexes) when migrate dev ran — expected behavior, committed alongside manual migration
- [22-02] DB has 6 TipoTurno records (5 new + pre-existing Cirugia); seed creates only the 5 new types for dev environments

### Decisions (carry-forward from v1.3)
- Future date boundary uses `hoy.setHours(23, 59, 59, 999)` so today is not rejected in HC entries
- Retroactive fecha pattern established in Phase 20 historia-clinica

### Known Tech Debt (carry-forward)
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod antes de deploy
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs

## Session Continuity

Last session: 2026-04-15T22:30:00Z
Stopped at: Completed 22-02-PLAN.md
Resume file: .planning/phases/22-schema-foundation/22-02-SUMMARY.md
