---
phase: 17-cae-emission-ux
plan: 01
subsystem: database
tags: [prisma, postgresql, bullmq, nestjs, afip, tdd]

# Dependency graph
requires:
  - phase: 16-caea-contingency-mode
    provides: CaeEmissionProcessor with onFailed CAEA fallback, Factura model with CAEA fields
provides:
  - Factura.afipError String? field in schema and DB (migration applied)
  - PrismaService injected into CaeEmissionProcessor constructor
  - Test 8 RED: prisma.factura.update call in onFailed asserted but not yet implemented
affects:
  - 17-02 — implements onFailed logic that makes Test 8 GREEN
  - 17-03 — FacturaDetailDto exposes afipError, frontend polls for it

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED checkpoint: failing test committed before implementation to lock the contract"
    - "PrismaService added to processor constructor — standard NestJS DI for DB access"

key-files:
  created:
    - backend/src/prisma/migrations/20260331024012_add_factura_afip_error/migration.sql
  modified:
    - backend/src/prisma/schema.prisma
    - backend/src/modules/finanzas/processors/cae-emission.processor.ts
    - backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts

key-decisions:
  - "[Plan 17-01] afipError String? approach only — no EstadoFactura.EMISION_ERROR enum (simpler, no migration cascade per research decision)"
  - "[Plan 17-01] PrismaService injected in Plan 01 constructor even though onFailed logic comes in Plan 02 — needed for spec to compile and DI to resolve cleanly"

patterns-established:
  - "TDD RED: spec committed with failing test before implementation — contract locked before GREEN phase in Plan 02"

requirements-completed:
  - CAE-03

# Metrics
duration: 2min
completed: 2026-03-31
---

# Phase 17 Plan 01: CAE Emission UX Foundation Summary

**Prisma migration adding Factura.afipError String? + PrismaService wired into CaeEmissionProcessor constructor, with Test 8 committed in RED (prisma.factura.update call asserted but not yet implemented)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-31T02:39:36Z
- **Completed:** 2026-03-31T02:41:56Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `afipError String?` to Prisma Factura model and applied migration `20260331024012_add_factura_afip_error` (ALTER TABLE "Factura" ADD COLUMN "afipError" TEXT)
- Injected `PrismaService` into `CaeEmissionProcessor` constructor — enables Plan 02 to call `prisma.factura.update` in `onFailed`
- Added Test 8 in RED phase: asserts `prisma.factura.update` is called with `{ where: { id: facturaId }, data: { afipError: job.failedReason } }` — fails intentionally as implementation is Plan 02's responsibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema — add afipError String? to Factura + run migration** - `48b0953` (feat)
2. **Task 2: Add failing test (RED) — onFailed persists afipError via prisma.factura.update** - `383a11c` (test)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `backend/src/prisma/schema.prisma` - Added `afipError String?` field to model Factura after `cbteFchHsGen`
- `backend/src/prisma/migrations/20260331024012_add_factura_afip_error/migration.sql` - Migration: ALTER TABLE "Factura" ADD COLUMN "afipError" TEXT
- `backend/src/modules/finanzas/processors/cae-emission.processor.ts` - Added PrismaService import and constructor parameter
- `backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts` - Added PrismaService import, mockPrismaService, provider, and Test 8 (RED)

## Decisions Made
- Used `afipError String?` field approach only — no `EstadoFactura.EMISION_ERROR` enum migration. Per research decision: simpler, no cascade risk.
- PrismaService added to constructor in Plan 01 (alongside Test 8 RED) so the spec compiles without a Plan 02 partial state.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (17-02) can proceed: schema field exists in DB, PrismaService is in constructor, Test 8 defines the exact contract (`prisma.factura.update` call signature)
- Plan 03 (17-03) can start DTO + frontend polling work once Plan 02 is GREEN
- No blockers

---
*Phase: 17-cae-emission-ux*
*Completed: 2026-03-31*

## Self-Check: PASSED

- FOUND: backend/src/prisma/schema.prisma
- FOUND: backend/src/prisma/migrations/20260331024012_add_factura_afip_error/migration.sql
- FOUND: backend/src/modules/finanzas/processors/cae-emission.processor.ts
- FOUND: backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts
- FOUND: .planning/phases/17-cae-emission-ux/17-01-SUMMARY.md
- COMMIT 48b0953 confirmed (feat: schema migration)
- COMMIT 383a11c confirmed (test: RED Test 8 + PrismaService injection)
