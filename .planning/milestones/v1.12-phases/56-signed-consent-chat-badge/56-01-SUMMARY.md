---
phase: 56-signed-consent-chat-badge
plan: 01
subsystem: database
tags: [prisma, postgresql, migration, schema, forensic-audit, consent]

# Dependency graph
requires:
  - phase: 53-signed-consent-config
    provides: ConsentimientoZonaArchivo model (upload/storage foundation)
  - phase: 55-portal-frontend
    provides: portal patient flow (will consume ConsentimientoFirmado via resolver)
provides:
  - ConsentimientoFirmado model with 10 forensic columns (D-04)
  - version Int field on ConsentimientoZonaArchivo with ROW_NUMBER backfill (D-03)
  - cirugiaCatalogoId FK on Cirugia enabling D-09 consent-resolution chain
  - Applied migration 20260701000000_signed_consent_forensic on live DB
  - Regenerated Prisma client exposing consentimientoFirmado, version, cirugiaCatalogoId
affects: [56-02, 56-03, 56-04, 56-05, 56-06, 56-07, 56-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive migration via prisma db execute + migrate resolve --applied (pgBouncer pattern — no migrate dev)"
    - "ROW_NUMBER() OVER PARTITION BY per-column backfill for version assignment"
    - "onDelete: Restrict on forensic FK to enforce write-once immutability (T-56-01)"

key-files:
  created:
    - backend/src/prisma/migrations/20260701000000_signed_consent_forensic/migration.sql
  modified:
    - backend/src/prisma/schema.prisma

key-decisions:
  - "Migration applied via prisma db execute + migrate resolve --applied (no migrate dev — pgBouncer drift blocks interactive migrate)"
  - "onDelete: Restrict on ConsentimientoFirmado.consentimientoZonaArchivoId prevents DB-level deletion of signed template (T-56-01)"
  - "cirugiaCatalogoId nullable: existing Cirugia rows get NULL, handled as D-10 empty-state downstream"
  - "version backfill uses ROW_NUMBER() OVER PARTITION BY zonaId ORDER BY uploadedAt ASC — deterministic ordering"

patterns-established:
  - "Forensic write-once: onDelete: Restrict on archived template version prevents deletion of any signed document's source"
  - "ROW_NUMBER() backfill pattern: assign incremental counter per partition using CTE + UPDATE FROM"

requirements-completed: [CONS-03, CONS-05, CONS-06]

# Metrics
duration: 12min
completed: 2026-07-01
---

# Phase 56 Plan 01: Schema Foundation Summary

**ConsentimientoFirmado forensic model (10 columns), version field with per-zona backfill on ConsentimientoZonaArchivo, and cirugiaCatalogoId FK on Cirugia — all applied via additive migration to live Supabase DB with Prisma client regenerated**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-01T22:20:00Z
- **Completed:** 2026-07-01T22:32:00Z
- **Tasks:** 2
- **Files modified:** 2 created/modified

## Accomplishments

- Added ConsentimientoFirmado model with 10 forensic fields (pacienteId, zonaId, consentimientoZonaArchivoId, pdfFirmadoPath, ip, userAgent, versionNumero, hashSha256, firmadoAt @default(now()), indicacionesLeidasAt) plus 3 relations and 3 indexes
- Added version Int @default(1) to ConsentimientoZonaArchivo with back-relation; migration backfills sequential versions per zona via ROW_NUMBER() OVER PARTITION BY zonaId ORDER BY uploadedAt ASC
- Added cirugiaCatalogoId String? FK to Cirugia with onDelete: SetNull + inverse cirugias Cirugia[] on CirugiaCatalogo, enabling the D-09 consent-resolution chain (Cirugia → CirugiaCatalogo.zonaId → ConsentimientoZonaArchivo)
- Applied migration 20260701000000_signed_consent_forensic to live DB via prisma db execute + migrate resolve --applied (pgBouncer pattern); prisma migrate status: "Database schema is up to date!"
- Regenerated Prisma client; verified `prisma.consentimientoFirmado.create` is a function

## Task Commits

Each task was committed atomically:

1. **Task 1: Add three schema deltas + back-relations to schema.prisma** - `81cdb4c` (feat)
2. **Task 2: Apply migration with version backfill + regenerate client** - `c55fd32` (feat)

## Files Created/Modified

- `backend/src/prisma/schema.prisma` - Added ConsentimientoFirmado model, version field, cirugiaCatalogoId FK, and back-relations on Paciente/ZonaHC
- `backend/src/prisma/migrations/20260701000000_signed_consent_forensic/migration.sql` - Additive DDL: ALTER TABLE ConsentimientoZonaArchivo ADD COLUMN version, CREATE TABLE ConsentimientoFirmado with RESTRICT FK, ALTER TABLE Cirugia ADD COLUMN cirugiaCatalogoId with SET NULL FK, ROW_NUMBER() backfill

## Decisions Made

- Migration applied via `prisma db execute` + `migrate resolve --applied` (not `migrate dev`) — consistent with prior phases [51-02], [53-02], [54-01] where pgBouncer timestamp drift blocks the interactive schema engine
- `onDelete: Restrict` on `ConsentimientoFirmado.consentimientoZonaArchivoId` is a correctness requirement (T-56-01/D-06): once a patient signs a consent document version, that version must be immutable — the DB constraint enforces this even if application code has a bug
- `cirugiaCatalogoId` is nullable intentionally: existing Cirugia rows have `NULL`, handled as D-10 empty-state downstream ("Tu médico necesita completar la configuración de la cirugía")

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `prisma validate` requires DATABASE_URL and DIRECT_URL env vars; used fake values to test schema structure (validation of structure, not connectivity) — expected in worktree environment without .env
- `prisma db execute --file` requires an absolute path when run from the main repo directory pointing to the worktree migration file — used absolute path, succeeded
- Migration file written to worktree, then synced to main repo's migrations folder so `prisma migrate resolve --applied` could find and register it in `_prisma_migrations` table

## Self-Check

**Files created/exist:**
- [x] `backend/src/prisma/schema.prisma` — modified (grep confirms ConsentimientoFirmado model, version field, cirugiaCatalogoId)
- [x] `backend/src/prisma/migrations/20260701000000_signed_consent_forensic/migration.sql` — created

**Commits exist:**
- [x] `81cdb4c` — feat(56-01): add ConsentimientoFirmado model, version field, and Cirugia FK to schema
- [x] `c55fd32` — feat(56-01): apply signed_consent_forensic migration with version backfill

**Build/generate verification:**
- [x] `prisma validate` (with fake env vars) exits 0: "The schema at src/prisma/schema.prisma is valid"
- [x] `prisma migrate status` reports "Database schema is up to date!" (migration applied to live DB)
- [x] `prisma generate` completed; `prisma.consentimientoFirmado.create` is a function (node assertion passed)
- [x] Backfill SQL contains `ROW_NUMBER() OVER` (grep confirmed)

## Self-Check: PASSED

## Known Stubs

None — this plan is schema-only (no UI or data-wiring).

## Threat Flags

No new trust-boundary surfaces beyond what the plan's threat model covers. All new DB tables operate within the existing App → Database boundary (T-56-01, T-56-02, T-56-03 accounted for in plan).

## Next Phase Readiness

- Phase 56-02 (stamping service) can now import ConsentimientoFirmado via the Prisma client and call `prisma.consentimientoFirmado.create()`
- Phase 56-03 (resolver chain) can now query `Cirugia.cirugiaCatalogoId → CirugiaCatalogo.zonaId → ConsentimientoZonaArchivo.vigente + version`
- Phase 56-04 (portal UI) can check `ConsentimientoFirmado` existence by `[pacienteId, zonaId]` index
- All downstream plans unblocked by this schema foundation

---
*Phase: 56-signed-consent-chat-badge*
*Completed: 2026-07-01*
