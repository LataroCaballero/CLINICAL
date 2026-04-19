---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: Flujo de Pacientes
status: completed
stopped_at: Completed 24-02-PLAN.md — Phase 24 LiveTurno Banner complete
last_updated: "2026-04-19T22:13:19.448Z"
last_activity: 2026-04-16 — Plan 24-02 complete — LiveTurnoFlujoBanner amber classification banner component created and mounted in LiveTurnoPanel
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 7
  completed_plans: 7
  percent: 57
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-15)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** v1.4 Flujo de Pacientes — Phase 24: LiveTurno Banner

## Current Position

```
Milestone: v1.4 Flujo de Pacientes
Phase:     24 of 25 (LiveTurno Banner) — Complete
Plan:      2 of 2 complete
Status:    Phase 24 complete
Progress:  [██████░░░░] 57% (phase 24 complete)
```

Last activity: 2026-04-16 — Plan 24-02 complete — LiveTurnoFlujoBanner amber classification banner component created and mounted in LiveTurnoPanel

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
- [22-03] RolesGuard.getAllAndOverride([handler, class]) — method-level @Auth takes priority over class-level; PATCH /pacientes/:id/flujo restricts to ADMIN+PROFESIONAL+SECRETARIA excluding FACTURADOR
- [22-03] UpdateFlujoDto does not accept null; future "clear flujo" will require a separate endpoint
- [23-01] Step 5.5 in crearTurno() uses .catch() without await — flujo update is best-effort, never blocks HTTP response
- [23-01] Double-gated guard: tipoTurno.flujoPaciente non-null AND paciente.flujo === PENDIENTE — TipoTurno without flujoPaciente (Control, Consulta pendiente) are no-ops
- [23-02] CRM flujo filter implemented as OR: [{flujo: CIRUGIA}, {flujo: null}] — NOT the earlier research suggestion of AND etapaCRM IS NOT NULL; simpler and correct since legacy row retention is the goal
- [23-02] Relation-filtered queries (ContactoLog, Presupuesto) use nested paciente: { OR: [...] } pattern; direct Paciente queries use top-level OR
- [24-01] pacienteFlujo is part of LiveTurnoSession (persisted via partialize session object) — survives recovery dialog; bannerDismissed is NOT in partialize (session-only lifetime, resets on startSession)
- [24-01] startSession() explicitly resets bannerDismissed: false — banner always shows at start of a new PENDIENTE session
- [24-01] LiveTurnoSyncChecker passes pacienteFlujo: null for recovered sessions — flujo unknown on recovery, no banner shown
- [24-02] Banner visibility gate uses strict === 'PENDIENTE' — null (legacy) and CIRUGIA/TRATAMIENTO never trigger the banner
- [24-02] handleClassify transitions phase immediately (optimistic) before async PATCH — best-effort with silent catch, never blocks UI
- [24-02] handleDismiss calls dismissBanner() only — no setPhase needed; store flag causes early return on next render
- [24-02] Banner is a flex-column sibling (NOT inside scrollable div) — stays fixed while tab content scrolls

### Decisions (carry-forward from v1.3)
- Future date boundary uses `hoy.setHours(23, 59, 59, 999)` so today is not rejected in HC entries
- Retroactive fecha pattern established in Phase 20 historia-clinica

### Known Tech Debt (carry-forward)
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod antes de deploy
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs

## Session Continuity

Last session: 2026-04-16T16:00:00Z
Stopped at: Completed 24-02-PLAN.md — Phase 24 LiveTurno Banner complete
Resume file: .planning/phases/24-liveturno-banner/24-02-SUMMARY.md
