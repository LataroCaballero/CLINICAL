---
phase: 51-schema-foundation-chat-fix
plan: "01"
subsystem: database
tags: [prisma, postgresql, schema, chat-fix, portal, preop]

# Dependency graph
requires: []
provides:
  - "All v1.12 milestone schema columns/models defined in schema.prisma (validates clean)"
  - "AlergiaCatalogoPro and MedicamentoCatalogoPro models (D-08)"
  - "TareaSeguimiento.notificada + notificadaEn guard fields (CHAT-01)"
  - "MensajeInterno.autorId nullable + origenPaciente (CHAT-02 safety)"
  - "HistoriaClinicaEntrada.estudiosComplementarios Json field (D-09)"
  - "Paciente: medicacion[], adicciones[], portalToken, staging fields"
  - "SEED_ALERGIAS and SEED_MEDICAMENTOS constants (D-07)"
affects: [52-preop-catalog, 53-storage-consent, 54-portal-backend, 55-portal-frontend, 56-pdf-signature, plan-02-migration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-professional flat catalog model: AlergiaCatalogoPro/MedicamentoCatalogoPro follow ZonaHC pattern"
    - "Guard flag pattern: notificada Boolean @default(false) mirrors Turno.notificacionEnviada"
    - "Staging fields on patient: portal-written fields segregated with comment (PITFALL 13)"
    - "portalToken stores SHA-256 hash (64-char hex), never plaintext (PITFALL 1)"

key-files:
  created:
    - backend/src/modules/catalogo-preop/alergia-catalogo.seed-data.ts
    - backend/src/modules/catalogo-preop/medicamento-catalogo.seed-data.ts
  modified:
    - backend/src/prisma/schema.prisma

key-decisions:
  - "estudiosComplementarios added as own Json field on HistoriaClinicaEntrada (not embedded in contenido blob) — D-09"
  - "portalToken field name chosen (not portalTokenHash) per plan action description; stores SHA-256 hex with schema comment"
  - "autorId made nullable with onDelete: SetNull to enable future portal/system messages (CHAT-02)"

patterns-established:
  - "Flat per-professional catalog: no orden field, no child relations, @@unique([nombre, profesionalId]), @@index([profesionalId, activo])"
  - "Seed-data file: header comment with INVARIANT note + esSistema info, typed string[] export"

requirements-completed: [CHAT-01, CHAT-02]

# Metrics
duration: 15min
completed: "2026-06-26"
---

# Phase 51 Plan 01: Schema Foundation + Chat Fix Summary

**Big-bang schema.prisma edit adding 7 change groups for v1.12 milestone: two per-professional pre-surgical catalog models, CHAT-01 guard columns on TareaSeguimiento, CHAT-02 nullable autorId on MensajeInterno, D-09 estudiosComplementarios Json field, and Paciente portal/staging fields — plus two D-07 seed constant files**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-26T03:08:00Z
- **Completed:** 2026-06-26T03:11:40Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- All 7 schema change groups applied to schema.prisma — `npx prisma validate` exits 0, no migration created
- CHAT-01 guard substrate in place: `notificada Boolean @default(false)` + `notificadaEn DateTime?` on TareaSeguimiento with updated index
- CHAT-02 cleanup safety: `autorId String?` (nullable) + `onDelete: SetNull` + `origenPaciente Boolean @default(false)` on MensajeInterno
- Paciente portal fields staged: `portalToken @unique` (SHA-256 hash comment), `portalTokenGeneradoAt`, four staging fields (alergiasAutoReportadas, antecedentesAutoReportados, medicacionAutoReportada, tratamientosPreviosAutoReportados)
- AlergiaCatalogoPro and MedicamentoCatalogoPro models added with back-relations on Profesional
- `SEED_ALERGIAS` (5 values) and `SEED_MEDICAMENTOS` (6 values) constant files created in catalogo-preop module

## Task Commits

Each task was committed atomically:

1. **Task 1: Add all v1.12 milestone schema to schema.prisma** - `8eddf7d` (feat)
2. **Task 2: Create idempotent seed-data constant files (D-07)** - `352ae8b` (feat)

## Files Created/Modified
- `backend/src/prisma/schema.prisma` - 7 schema change groups for v1.12 milestone; 60 lines added, 14 changed
- `backend/src/modules/catalogo-preop/alergia-catalogo.seed-data.ts` - SEED_ALERGIAS constant with 5 D-07 allergy values
- `backend/src/modules/catalogo-preop/medicamento-catalogo.seed-data.ts` - SEED_MEDICAMENTOS constant with 6 D-07 medication values

## Decisions Made
- Used `portalToken` (not `portalTokenHash`) as the field name, matching the plan action description; added `// SHA-256 hash, never plaintext (PITFALL 1)` comment per requirement
- Placed `estudiosComplementarios Json?` as a sibling to `answers Json?` and `computed Json?` in HistoriaClinicaEntrada — own named field, not embedded in `contenido` (D-09)
- Staging fields grouped with comment `// Staging fields — written only by the future patient portal (PITFALL 13)` for future orientation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript error `TS6059` for `test/app.e2e-spec.ts` outside `rootDir` — pre-existing before this plan, not introduced by seed files (verified: seed files are constant-only with no imports)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (migration) can now run `npx prisma migrate dev` to apply all v1.12 schema changes atomically
- CHAT-01 scheduler fix (plan 02) can add `notificada: false` to WHERE and mark tasks after notification
- CHAT-02 cleanup DELETE can run in the same migration
- All Phase 52–56 feature columns are defined and ready for service/controller/frontend work

## Known Stubs

None — this plan is schema-only. All new columns are inert (no writer) until consumed by later phases (52–56).

## Threat Flags

None beyond what was declared in the plan's threat model. The `portalToken` column is nullable with no writer this phase — no plaintext-secret window exists.

---

## Self-Check: PASSED

- `backend/src/prisma/schema.prisma` - FOUND, validates clean
- `backend/src/modules/catalogo-preop/alergia-catalogo.seed-data.ts` - FOUND
- `backend/src/modules/catalogo-preop/medicamento-catalogo.seed-data.ts` - FOUND
- Commit `8eddf7d` - FOUND (Task 1)
- Commit `352ae8b` - FOUND (Task 2)
- No migration directory created - CONFIRMED

---
*Phase: 51-schema-foundation-chat-fix*
*Completed: 2026-06-26*
