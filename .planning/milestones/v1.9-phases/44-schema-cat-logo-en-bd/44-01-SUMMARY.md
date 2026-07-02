---
phase: 44-schema-cat-logo-en-bd
plan: 01
subsystem: database
tags: [prisma, postgres, schema, migration, catalogo-hc, zona, diagnostico, tratamiento]

# Dependency graph
requires: []
provides:
  - "Tablas ZonaHC, DiagnosticoHC, TratamientoHC en PostgreSQL con FK a Profesional"
  - "Prisma client tipado con prisma.zonaHC, prisma.diagnosticoHC, prisma.tratamientoHC"
  - "Migración DDL pura 20260612000000_add_catalogo_hc aplicada"
affects:
  - "44-02 (seed + API endpoints por profesional)"
  - "47 (lógica de negocio HC sobre catálogo)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Catálogo per-profesional con soft-delete (activo) + esSistema flag (patrón Tratamiento/CirugiaCatalogo extendido)"
    - "profesionalId denormalizado en modelos hijo sin @relation (evita relaciones inversas extra en Profesional)"
    - "ids TEXT NOT NULL — uuid generado por Prisma cliente (NO gen_random_uuid() DB-side)"
    - "migrate deploy (no migrate dev) — patrón pgBouncer establecido v1.2"

key-files:
  created:
    - "backend/src/prisma/migrations/20260612000000_add_catalogo_hc/migration.sql"
  modified:
    - "backend/src/prisma/schema.prisma"

key-decisions:
  - "Nombres definitivos: ZonaHC / DiagnosticoHC / TratamientoHC (en schema y BD)"
  - "profesionalId denormalizado (sin @relation) en DiagnosticoHC y TratamientoHC — solo ZonaHC tiene relación real a Profesional"
  - "esSistema Boolean en los 3 modelos para proteger ítems 'Otros' (se usará en Phase 47)"
  - "TratamientoHC.tratamientoId nullable con ON DELETE SET NULL (FK opcional al catálogo de precios)"

patterns-established:
  - "Catálogo HC: ZonaHC→DiagnosticoHC + ZonaHC→TratamientoHC (árbol 2 niveles con raíz en zona)"
  - "Cascade en relaciones hijo→padre dentro del catálogo (borrando zona se borran sus hijos)"

requirements-completed: [ZONA-01]

# Metrics
duration: 10min
completed: 2026-06-12
---

# Phase 44 Plan 01: Schema Catálogo HC Summary

**Tres modelos Prisma nuevos (ZonaHC, DiagnosticoHC, TratamientoHC) con FK a Profesional y Tratamiento (nullable), migración DDL pura aplicada, Prisma client regenerado — base de datos lista para seed y API en plan 44-02**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-12T00:00:00Z
- **Completed:** 2026-06-12T00:10:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Modelos ZonaHC, DiagnosticoHC y TratamientoHC agregados a schema.prisma con todas las relaciones, índices y constraints correctos
- Relaciones inversas `zonasHC ZonaHC[]` en Profesional y `tratamientosHC TratamientoHC[]` en Tratamiento (requeridas por Prisma)
- Migración DDL pura `20260612000000_add_catalogo_hc` creada y aplicada via `migrate deploy`; `migrate status` reporta "Database schema is up to date"
- `npm run build` pasa sin errores — ningún código existente roto

## Task Commits

1. **Task 1: Agregar modelos ZonaHC, DiagnosticoHC y TratamientoHC a schema.prisma** - `64a9f2c` (feat)
2. **Task 2: Crear migración SQL manual y aplicarla** - `8cba7f9` (feat)

**Plan metadata:** (pendiente commit final docs)

## Files Created/Modified

- `backend/src/prisma/schema.prisma` - Tres nuevos modelos + relaciones inversas en Profesional y Tratamiento
- `backend/src/prisma/migrations/20260612000000_add_catalogo_hc/migration.sql` - DDL puro: 3 CREATE TABLE + 4 FKs + 6 índices

## Decisions Made

- **Nombres definitivos:** ZonaHC / DiagnosticoHC / TratamientoHC — decision confirmada (era sugerida en STATE.md)
- **profesionalId denormalizado:** DiagnosticoHC y TratamientoHC tienen `profesionalId String` sin @relation, evitando 2 relaciones inversas extra en Profesional y simplificando queries por profesional
- **esSistema en los 3 niveles:** Permite proteger ítems "Otros" a nivel zona, diagnóstico y tratamiento (Phase 47 define semántica exacta)
- **FK opcional TratamientoHC→Tratamiento:** ON DELETE SET NULL — si se borra del catálogo de precios, el ítem HC queda sin precio (pitfall 5 del research)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `prisma validate`, `prisma generate`, `migrate deploy` y `npm run build` pasaron en el primer intento.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Tablas ZonaHC, DiagnosticoHC, TratamientoHC existen en PostgreSQL con todas las FKs e índices
- Prisma client tipado expone `prisma.zonaHC`, `prisma.diagnosticoHC`, `prisma.tratamientoHC`
- Plan 44-02 puede implementar seed + endpoints de API inmediatamente
- No hay blockers para continuar

---
*Phase: 44-schema-cat-logo-en-bd*
*Completed: 2026-06-12*
