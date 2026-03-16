---
phase: 12-schema-afip-extendido-gestion-certificados
plan: 03
subsystem: infra
tags: [nestjs, scheduler, nodemailer, cron, afip, cert-expiry, testing]

requires:
  - phase: 12-01
    provides: ConfiguracionAFIP Prisma model with certExpiresAt field and profesional relation

provides:
  - CertExpiryScheduler with @Cron('0 8 * * *') checking all ConfiguracionAFIP rows
  - Email alert at daysLeft === 60 and 30 (and daily at <= 5)
  - SMTP guard: silently skips when host/user/pass unconfigured (logger.warn)
  - 5 unit tests covering all CERT-03 thresholds

affects:
  - Phase 13 (WSAAService — shares AfipConfigModule, same ScheduleModule pattern)
  - Phase 16 (CAEA — may add more @Cron jobs to same module)

tech-stack:
  added: []
  patterns:
    - "CertExpiryScheduler follows PresupuestoEmailService nodemailer pattern (ConfigClinica SMTP + env fallback)"
    - "TDD: RED commit with failing spec, then GREEN commit with implementation"
    - "@Cron registered as plain @Injectable() provider — ScheduleModule.forRoot() already global"

key-files:
  created:
    - backend/src/modules/afip-config/cert-expiry.scheduler.ts
    - backend/src/modules/afip-config/cert-expiry.scheduler.spec.ts
  modified: []

key-decisions:
  - "SMTP_PASS always from env var — ConfigClinica smtpPassEncrypted decryption is pre-existing gap (same as PresupuestoEmailService)"
  - "daysLeft guard: === 60 || === 30 || <= 5 — prevents daily spam while covering urgent window"
  - "No ScheduleModule.forRoot() in AfipConfigModule — already registered by ReportesModule and PacientesModule"

patterns-established:
  - "Pattern: @Cron job as plain @Injectable() provider in a module that imports ScheduleModule indirectly (via AppModule)"
  - "Pattern: sendAlert guarded by exact-day threshold before calling nodemailer — prevents alert spam"

requirements-completed:
  - CERT-03

duration: 8min
completed: 2026-03-16
---

# Phase 12 Plan 03: CertExpiryScheduler Summary

**Daily @Cron cert-expiry scheduler using nodemailer with ConfigClinica SMTP fallback — alerts Admin at 60d, 30d, and daily during last 5 days before AFIP cert expiry**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-16T17:05:48Z
- **Completed:** 2026-03-16T17:13:00Z
- **Tasks:** 1 (TDD — RED + GREEN commits)
- **Files modified:** 2

## Accomplishments

- Replaced placeholder stub with full `CertExpiryScheduler` implementation
- `@Cron('0 8 * * *')` queries all `ConfiguracionAFIP` rows expiring within 60 days, computes `daysLeft`, guards with `=== 60 || === 30 || <= 5` before sending
- Email subject prefixed with `URGENTE: ` when `daysLeft <= 5`; includes CUIT and expiry date
- SMTP configured from `ConfigClinica` fields with `ConfigService` env-var fallback; logs warning and returns without sending if `!host || !user || !pass`
- All 5 unit tests pass (60d, 30d, 45d-no-send, 5d-urgent, no-SMTP-skip)
- Build compiles cleanly with zero TypeScript errors

## Task Commits

TDD task with RED and GREEN commits:

1. **RED — failing tests** - `76ac8d5` (test)
2. **GREEN — implementation** - `b535c98` (feat)

## Files Created/Modified

- `backend/src/modules/afip-config/cert-expiry.scheduler.ts` - Full scheduler implementation replacing the placeholder stub
- `backend/src/modules/afip-config/cert-expiry.scheduler.spec.ts` - 5 unit tests covering all CERT-03 thresholds with mocked nodemailer and PrismaService

## Decisions Made

- SMTP password always from `SMTP_PASS` env var. `ConfigClinica.smtpPassEncrypted` decryption is a pre-existing gap (same as `PresupuestoEmailService`) — out of Phase 12 scope.
- daysLeft guard: `=== 60 || === 30 || <= 5` — produces exactly 2 scheduled alerts plus a daily urgent window in the last 5 days.
- No `ScheduleModule.forRoot()` added to `AfipConfigModule` — already registered globally via `ReportesModule` and `PacientesModule`.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required beyond existing `SMTP_PASS` env var.

## Next Phase Readiness

- Phase 12 (Plans 01–03) complete. AfipConfigModule is fully wired: schema, service+endpoints, and cert-expiry scheduler all in place.
- Phase 13 (WSAAService) can proceed: it reads `ConfiguracionAFIP.certPemEncrypted` and `keyPemEncrypted` using the same `AfipConfigModule` imports.

---
*Phase: 12-schema-afip-extendido-gestion-certificados*
*Completed: 2026-03-16*
