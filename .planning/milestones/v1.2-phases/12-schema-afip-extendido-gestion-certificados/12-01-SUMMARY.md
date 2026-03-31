---
phase: 12-schema-afip-extendido-gestion-certificados
plan: 01
subsystem: database
tags: [prisma, postgresql, afip, migration, jest, nestjs]

# Dependency graph
requires: []
provides:
  - "ConfiguracionAFIP model — per-tenant cert+key storage AES-256-GCM encrypted, ptoVta, certExpiresAt, ambiente"
  - "CaeaVigente model — CAEA contingency periods with unique(profesionalId, periodo, orden)"
  - "EstadoFactura.CAEA_PENDIENTE_INFORMAR — new enum value for CAEA contingency invoices"
  - "AmbienteAFIP enum — HOMOLOGACION / PRODUCCION"
  - "Factura AFIP fields — cae, caeFchVto, nroComprobante, qrData, ptoVta (all nullable)"
  - "Profesional relations — configuracionAFIP, caeaVigentes"
  - "Test spec scaffolds — afip-config.service.spec.ts, cert-expiry.scheduler.spec.ts (17 stubs, CERT-01..04)"
affects:
  - phase-13-wsaa-token-service
  - phase-14-emision-cae-real
  - phase-15-qr-afip-pdf-frontend
  - phase-16-caea-contingency

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ConfiguracionAFIP follows ConfiguracionWABA pattern: @unique profesionalId, encrypted secrets, Profesional relation"
    - "Spec stubs use NestJS Test.createTestingModule with useValue mock providers — allows compilation before implementations exist"
    - "Placeholder service/scheduler stub files enable tsc compilation of specs without empty implementations"

key-files:
  created:
    - backend/src/prisma/migrations/20260316165125_add_afip_extendido_schema/migration.sql
    - backend/src/modules/afip-config/afip-config.service.spec.ts
    - backend/src/modules/afip-config/cert-expiry.scheduler.spec.ts
    - backend/src/modules/afip-config/afip-config.service.ts
    - backend/src/modules/afip-config/cert-expiry.scheduler.ts
  modified:
    - backend/src/prisma/schema.prisma

key-decisions:
  - "Placeholder stub files (afip-config.service.ts, cert-expiry.scheduler.ts) created so specs compile before Wave 1 implementations exist — Wave 1 plans will replace these"
  - "ConfiguracionAFIP.ptoVta is non-nullable (required at save time, validated via FEParamGetPtosVenta before persist)"
  - "Factura AFIP fields all nullable — null until real emission in Phase 14"
  - "Pre-existing TS6059 error (test/app.e2e-spec.ts rootDir mismatch) confirmed not introduced by this plan"

patterns-established:
  - "AFIP spec stubs: use expect(true).toBe(true) placeholders named with requirement IDs (CERT-01, CERT-02, etc.)"

requirements-completed: [AFIP-01]

# Metrics
duration: 20min
completed: 2026-03-16
---

# Phase 12 Plan 01: Schema AFIP Extendido Summary

**Prisma schema extended with ConfiguracionAFIP + CaeaVigente models, EstadoFactura.CAEA_PENDIENTE_INFORMAR, AmbienteAFIP enum, 5 nullable Factura AFIP fields, migration applied, and CERT-01..04 test stubs scaffolded**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-16T16:50:18Z
- **Completed:** 2026-03-16T17:10:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Prisma schema extended with all AFIP models needed by v1.2: ConfiguracionAFIP (cert management), CaeaVigente (contingency periods)
- Migration 20260316165125_add_afip_extendido_schema applied and Prisma client regenerated — all new types available in generated client
- Test spec scaffolds created with 17 named stubs covering CERT-01 through CERT-04 requirements, ready for Wave 1 implementation

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema extension — all AFIP models and fields** - `d59c13d` (feat)
2. **Task 2: Create test spec scaffolds for Wave 1 implementation** - `967c571` (test)

## Files Created/Modified

- `backend/src/prisma/schema.prisma` — Added ConfiguracionAFIP, CaeaVigente models; AmbienteAFIP, CAEA_PENDIENTE_INFORMAR enums; 5 nullable Factura fields; Profesional relations
- `backend/src/prisma/migrations/20260316165125_add_afip_extendido_schema/migration.sql` — Applied migration
- `backend/src/modules/afip-config/afip-config.service.spec.ts` — 12 test stubs for CERT-01, CERT-02, CERT-04
- `backend/src/modules/afip-config/cert-expiry.scheduler.spec.ts` — 5 test stubs for CERT-03
- `backend/src/modules/afip-config/afip-config.service.ts` — Placeholder stub (Wave 1 replaces this)
- `backend/src/modules/afip-config/cert-expiry.scheduler.ts` — Placeholder stub (Wave 1 replaces this)

## Decisions Made

- Created placeholder stub files (`afip-config.service.ts`, `cert-expiry.scheduler.ts`) so spec files compile and Jest runs without errors before Wave 1 implementations exist. Wave 1 plans will replace the placeholder bodies.
- `ConfiguracionAFIP.ptoVta` is non-nullable (Int, not Int?) — it must be validated via FEParamGetPtosVenta before the row is saved, so null is never a valid state.
- All five Factura AFIP fields (`cae`, `caeFchVto`, `nroComprobante`, `qrData`, `ptoVta`) are nullable — null until Phase 14 real emission.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created placeholder service/scheduler stub files for TypeScript compilation**
- **Found during:** Task 2 (spec scaffold creation)
- **Issue:** Spec files import `AfipConfigService` and `CertExpiryScheduler` — without the source files, Jest threw `Cannot find module` errors and both test suites failed to run
- **Fix:** Created minimal placeholder classes (empty body, just the exported class name) so tsc resolves the imports
- **Files modified:** `backend/src/modules/afip-config/afip-config.service.ts`, `backend/src/modules/afip-config/cert-expiry.scheduler.ts`
- **Verification:** `npm test -- --testPathPattern=afip-config --passWithNoTests` → 17 tests passed, 0 failures
- **Committed in:** 967c571 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Necessary for Jest to compile and run specs. Placeholder stubs will be replaced in Wave 1 plans 02 and 03. No scope creep.

## Issues Encountered

- Pre-existing `TS6059` error for `test/app.e2e-spec.ts` not under `rootDir` confirmed to be pre-existing (reproduced before our schema changes via `git stash` test). Not introduced by this plan.

## User Setup Required

None — no external service configuration required. Database migration runs locally with existing `DATABASE_URL`.

## Next Phase Readiness

- Phase 13 (WSAA Token Service) can proceed — all Prisma types available: `ConfiguracionAFIP`, `AmbienteAFIP`, Prisma client generated
- Phase 14 depends on Phase 13 — not yet started
- Test stubs ready for Wave 1 implementation in plans 02 (AfipConfigService) and 03 (CertExpiryScheduler)

---
*Phase: 12-schema-afip-extendido-gestion-certificados*
*Completed: 2026-03-16*
