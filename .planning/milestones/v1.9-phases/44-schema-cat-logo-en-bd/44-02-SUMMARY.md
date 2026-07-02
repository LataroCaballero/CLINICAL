---
phase: 44-schema-cat-logo-en-bd
plan: "02"
subsystem: api
tags: [nestjs, prisma, postgres, catalogo-hc, seed, tdd]

# Dependency graph
requires:
  - phase: 44-01
    provides: ZonaHC / DiagnosticoHC / TratamientoHC Prisma models + migration

provides:
  - CatalogoHCModule NestJS module with GET /catalogo-hc endpoint
  - CatalogoHCService with crearZona(), seedCatalogoInicial(), getCatalogoConSeed()
  - normalizarNombre() utility for accent/case-insensitive price matching
  - SEED_ZONAS constant with 6 zones (Abdomen, Mamas, Nariz, Facial, Locales, Otros)
  - Lazy seed on first GET + hook seed on usuario PROFESIONAL creation
  - ZonaHCResponse contract (id, nombre, orden, esSistema, diagnosticos[], tratamientos[] with precio)

affects:
  - 44-03 (frontend hook consuming GET /catalogo-hc)
  - 45 (PrimeraConsultaForm migration to DB catalog)
  - 46 (Phase 46 reuses crearZona() for APR-01 auto-learning)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getProfesionalId helper copied (not extracted) per-controller — repo convention"
    - "TDD RED/GREEN on pure data module (no NestJS/DB in tests)"
    - "Seed runs OUTSIDE transaction — non-blocking, lazy-seed fallback on GET"
    - "normalizarNombre: lowercase + NFD decompose + strip combining marks + trim"
    - "skipDuplicates: true on createMany for seed idempotency"

key-files:
  created:
    - backend/src/modules/catalogo-hc/catalogo-hc.seed-data.ts
    - backend/src/modules/catalogo-hc/catalogo-hc.seed-data.spec.ts
    - backend/src/modules/catalogo-hc/catalogo-hc.service.ts
    - backend/src/modules/catalogo-hc/catalogo-hc.controller.ts
    - backend/src/modules/catalogo-hc/catalogo-hc.module.ts
  modified:
    - backend/src/app.module.ts
    - backend/src/modules/usuarios/usuarios.service.ts
    - backend/src/modules/usuarios/usuarios.module.ts

key-decisions:
  - "Seed runs outside transaction in usuarios.service.crear() — failure is warn-logged, lazy seed via GET covers any failure"
  - "crearZona() creates ZonaHC + DiagnosticoHC 'Otros' + TratamientoHC 'Otros' atomically in $transaction — invariant guaranteed for Phase 46"
  - "normalizarNombre uses NFD + regex strip (native Node, no dependencies) for accent-insensitive price catalog matching"
  - "SEED_ZONAS has no 'Otros' in diagnosticos/tratamientos lists — crearZona() always injects the system item, no duplication possible"

patterns-established:
  - "getProfesionalId: copy pattern from tratamientos.controller.ts — not shared utility"
  - "Idempotency guard: count({ where: { profesionalId } }) > 0 before seed"
  - "ZonaHCResponse: Decimal precio converted to Number, no internal fields leaked"

requirements-completed: [ZONA-01, ZONA-02, ZONA-03]

# Metrics
duration: 3min
completed: 2026-06-12
---

# Phase 44 Plan 02: Módulo catalogo-hc con seed idempotente y endpoint GET anidado Summary

**NestJS catalogo-hc module delivering GET /catalogo-hc with lazy seed, idempotent full seed from 6-zone SEED_ZONAS, crearZona() helper guaranteeing "Otros" invariant, and accent-insensitive price join — ready for Phase 45 form migration and Phase 46 auto-learning**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-12T21:38:25Z
- **Completed:** 2026-06-12T21:41:47Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- TDD-driven seed data module: 28 tests covering 6-zone structure, ZONA-03 invariant (Facial/Locales start with empty diagnostics), corrected names with accents, no "Otros" duplication in lists
- CatalogoHCService: crearZona() atomically creates zone + system "Otros" diagnostic + treatment; seedCatalogoInicial() idempotent with price match via normalizarNombre(); getCatalogoConSeed() lazy seed + full nested ZonaHCResponse
- Complete module wiring: GET /catalogo-hc protected by Auth(ADMIN, PROFESIONAL, SECRETARIA), app.module registered, usuarios.service hook seeds catalog after profesional creation without blocking the creation transaction

## Task Commits

1. **Task 1: Seed data normalizado + normalizarNombre con tests** - `64679b7` (test + feat — TDD)
2. **Task 2: CatalogoHCService** - `98b4286` (feat)
3. **Task 3: Controller + Module + app.module + hook en usuarios.service** - `db6db5e` (feat)

## Files Created/Modified

- `backend/src/modules/catalogo-hc/catalogo-hc.seed-data.ts` — SEED_ZONAS constant + normalizarNombre()
- `backend/src/modules/catalogo-hc/catalogo-hc.seed-data.spec.ts` — 28 tests for seed data purity
- `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` — crearZona, seedCatalogoInicial, getCatalogoConSeed
- `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts` — GET /catalogo-hc with getProfesionalId helper
- `backend/src/modules/catalogo-hc/catalogo-hc.module.ts` — exports CatalogoHCService for UsuariosModule and Phase 46
- `backend/src/app.module.ts` — CatalogoHCModule added to imports
- `backend/src/modules/usuarios/usuarios.service.ts` — captures profesionalId from tx, non-blocking seed hook post-commit
- `backend/src/modules/usuarios/usuarios.module.ts` — imports CatalogoHCModule

## Decisions Made

- **Seed outside transaction:** `seedCatalogoInicial` runs after `$transaction` commits in `usuarios.service.crear()`. Failure is `logger.warn`-logged; the lazy seed on first GET covers any failure silently. This avoids long transaction duration and prevents a seed failure from rolling back user creation.
- **crearZona invariant:** Creates ZonaHC + DiagnosticoHC "Otros" + TratamientoHC "Otros" in a single `$transaction`. Idempotent via `findUnique` check. Phase 46 reuses this exact helper for auto-learning zone creation (APR-01).
- **normalizarNombre:** Native Node `toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()` — no external dependencies, covers all Spanish diacritics.
- **No "Otros" in SEED_ZONAS lists:** All zone data lists exclude the system "Otros" item. crearZona() always injects it, preventing any possibility of duplication regardless of how many times the seed runs.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- GET /catalogo-hc is live; Phase 44-03 can create the frontend TanStack Query hook `useCatalogoHC`
- CatalogoHCService.crearZona() is exported and ready for Phase 46 APR-01
- Existing professionals: catalog is populated via lazy seed on first GET — no backfill needed

---
*Phase: 44-schema-cat-logo-en-bd*
*Completed: 2026-06-12*
