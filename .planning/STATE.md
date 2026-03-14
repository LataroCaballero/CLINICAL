---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Vista del Facturador
status: completed
stopped_at: "Completed 10-02-PLAN.md — Phase 10 fully verified and complete"
last_updated: "2026-03-14T15:30:00.000Z"
last_activity: 2026-03-13 — Phase 9 Plan 01 complete — getMonthBoundariesART + five FinanzasService methods (9 TDD tests green)
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 7
  completed_plans: 7
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** v1.1 — Phase 9: Backend API Layer

## Current Position

Phase: 9 of 11 (Backend API Layer)
Plan: 1 of 3 in current phase
Status: Plan 1 complete, continuing with Plan 2
Last activity: 2026-03-13 — Phase 9 Plan 01 complete — getMonthBoundariesART + five FinanzasService methods (9 TDD tests green)

Progress: [███░░░░░░░] 33% (v1.1)

## Performance Metrics

**Velocity (v1.0 reference):**
- Total plans completed: 23 (v1.0)
- Average duration: 21min
- Total execution time: ~480min

**v1.1 Plans:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 08-schema-afip-research | 2/2 | 3min (plan 02) | ~2min |
| 09-backend-api-layer | 1/3 | 8min (plan 01) | ~8min |
| 10-facturador-dashboard | 0/2 | - | - |
| 11-settlement-workflow | 0/2 | - | - |

*Updated after each plan completion*
| Phase 09-backend-api-layer P02 | 8min | 2 tasks | 3 files |
| Phase 09-backend-api-layer P03 | 1m 27s | 2 tasks | 4 files |
| Phase 10-facturador-home-dashboard P01 | 8min | 2 tasks | 3 files |
| Phase 10-facturador-home-dashboard P02 | 1min | 2 tasks | 2 files |

## Accumulated Context

### Decisions

- [08-02]: Raw SOAP/XML for AFIP — no third-party library (afipjs/afip-apis/afip.js unmaintained, no TS types)
- [08-02]: CMS signing decision deferred to v1.2 — openssl smime (no dep) vs node-forge (in-process) both documented
- [08-02]: Certificate storage via EncryptionService AES-256-GCM pattern; ConfiguracionAFIP model preferred over Profesional fields
- [08-02]: BNA rate for MonCotiz — manual entry recommended for v1.2 (robust, audit-friendly)
- [08-02]: CAEA contingency-only from June 2026 (RG 5782/2025) — CAE always primary; verify against BOLETIN OFICIAL before v1.2
- [Roadmap v1.1]: AFIP-01 (doc) va en Phase 8 junto al schema — tarea de escritura, sin dependencia de código
- [Roadmap v1.1]: LMIT-02 (cálculo disponible) va en Phase 9 (backend), no en Phase 10 (frontend) — es lógica de servicio
- [Roadmap v1.1]: LIQ-03 (transacción atómica) va en Phase 9 — el endpoint backend precede al modal frontend de Phase 11
- [Roadmap v1.1]: Todo backend nuevo va en FinanzasModule existente — no crear módulo NestJS nuevo
- [Roadmap v1.1]: FACTURADOR no tiene registro Profesional — profesionalId siempre parámetro explícito, nunca del JWT
- [Roadmap v1.1]: getMonthBoundariesART() obligatorio desde el primer commit de Phase 9 — timezone UTC-3 sin DST
- [09-01]: ART offset hardcoded as 3*60*60*1000ms — Argentina has no DST, fixed offset correct and simpler than timezone libraries
- [09-01]: Date.UTC(year,month-1,1,3,0,0,0) used for month boundaries — avoids new Date(year,month-1,1) midnight UTC pitfall
- [09-01]: crearLoteLiquidacion uses interactive callback form of $transaction — array form cannot reference newly-created liquidacionId FK
- [09-01]: Server-side montoTotal computation inside transaction — never accept client-provided totals for financial records
- [Phase 09-02]: Method-level @Auth('ADMIN', 'FACTURADOR') overrides class-level for all 7 new endpoints — PROFESIONAL role excluded from billing/settlement
- [Phase 09-02]: getLiquidaciones + getLiquidacionById added to service in this plan (simple findMany/findUnique pass-throughs required by the 2 new GET /liquidaciones routes)
- [Phase 09-03]: MOCK_CAE and MOCK_CAE_VENCIMIENTO defined as named constants — makes mock nature explicit, avoids inline magic strings
- [Phase 09-03]: AfipStubService registered in both providers+exports of FinanzasModule — allows other modules to inject it for v1.2 swap-out
- [Phase 10-01]: FACTURADOR redirect placed in third useEffect after route-guard to avoid ordering conflict; pathname === '/dashboard' exact match prevents firing on sub-routes; ADMIN excluded from redirect
- [Phase 10-02]: queryKey arrays in useLimiteDisponible and useSetLimiteMensual.onSuccess.invalidateQueries are identical — ensures cache refresh fires on limit save

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 8 gate]: IVA treatment matrix para cirugía estética en obras sociales debe validarse con contador antes de v1.2 (no bloquea v1.1)
- [Phase 9 resolved]: N+1 query en getPracticasPendientes resuelto — getPracticasPendientesAgrupadas usa batch OS lookup sin N+1

## Session Continuity

Last session: 2026-03-14T15:30:00.000Z
Stopped at: Completed 10-02-PLAN.md — Phase 10 fully verified (all 7 checks approved), Phase 11 is next
Resume file: None
