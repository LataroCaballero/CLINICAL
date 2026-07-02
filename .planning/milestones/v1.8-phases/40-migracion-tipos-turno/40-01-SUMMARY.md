---
phase: 40-migracion-tipos-turno
plan: "01"
subsystem: backend/tipos-turno
tags: [migration, prisma, sql, tipos-turno, data-migration]
dependency_graph:
  requires: []
  provides: [migracion-tipos-turno-v18-sql, tipos-turno-endpoint-filtrado]
  affects: [GET /tipos-turno, TiposTurnoService.findAll, Prisma migrations]
tech_stack:
  added: []
  patterns: [data-only migration SQL, prisma-where-filter]
key_files:
  created:
    - backend/src/prisma/migrations/20260608000000_migracion_tipos_turno_v18/migration.sql
  modified:
    - backend/src/modules/tipos-turno/tipos-turno.service.ts
key_decisions:
  - "Migration is data-only (no DDL) — manual SQL file created instead of prisma migrate dev to avoid empty migration generation"
  - "TipoTurnoProfesional configs from 'Consulta para cirugía' transferred to new 'Consulta' via INSERT ON CONFLICT DO NOTHING"
  - "esCirugia=false filter added at service layer (findAll) rather than controller, keeping Cirugía accessible via crearTurnoCirugia()"
metrics:
  duration_seconds: 96
  completed_date: "2026-06-08"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 40 Plan 01: Migración TipoTurno v1.8 Summary

**One-liner:** Data migration SQL + findAll filter to consolidate 6 legacy TipoTurno records into 5 v1.8 types (4 public + 1 internal Cirugía).

## Objective

Migrar los registros TipoTurno de 6 tipos legacy a 5 tipos v1.8 (4 públicos + 1 interno), y filtrar el tipo interno del endpoint público `/tipos-turno`.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Crear migración SQL transaccional de datos TipoTurno | 26326f7 | migrations/20260608000000_migracion_tipos_turno_v18/migration.sql |
| 2 | Agregar filtro esCirugia=false en TiposTurnoService.findAll() | 6a330f6 | tipos-turno.service.ts |

## What Was Built

### Task 1 — Migration SQL

Created `backend/src/prisma/migrations/20260608000000_migracion_tipos_turno_v18/migration.sql` with a fully transactional (BEGIN/COMMIT) data migration:

- **Step 1:** INSERT new "Consulta" tipo (flujoPaciente=NULL, esCirugia=false)
- **Steps 2-3:** UPDATE Turno FK from "Consulta para cirugía" and "Consulta pendiente" → "Consulta"
- **Step 4:** INSERT INTO TipoTurnoProfesional transferring configs from "Consulta para cirugía" → "Consulta" (ON CONFLICT DO NOTHING)
- **Steps 5-6:** DELETE TipoTurnoProfesional for obsolete tipos
- **Steps 7-8:** DELETE TipoTurno "Consulta pendiente" and "Consulta para cirugía"
- **Step 9:** UPDATE TipoTurno rename "Consulta para tratamiento en consultorio" → "Tratamiento"
- **Step 10:** UPDATE TipoTurno rename "Pre-operatorio" → "Pre-Quirúrgico"

**Post-migration DB state (5 tipos):**
| Nombre | flujoPaciente | esCirugia |
|--------|---------------|-----------|
| Cirugía | NULL | true |
| Consulta | NULL | false |
| Control | NULL | false |
| Pre-Quirúrgico | CIRUGIA | false |
| Tratamiento | TRATAMIENTO | false |

### Task 2 — Service Filter

Modified `TiposTurnoService.findAll()` to add `where: { esCirugia: false }` — GET /tipos-turno returns exactly 4 public types, excluding Cirugía.

## Deviations from Plan

### Network Gate — Migration Not Applied to Remote DB

**Found during:** Task 1 verification
**Issue:** `prisma migrate deploy` failed with `ENOTFOUND` on Supabase pooler hostname. DNS resolution of `postgres.wgszojgeaybsjbmbqpff.supabase.co` returned no result from the development machine. No local Postgres is running.
**Impact:** The migration SQL file is correct and ready to deploy, but `prisma migrate status` could not confirm the migration as applied.
**Required action:** Run `npx prisma migrate deploy` from a machine with access to the Supabase database (or from the server environment) to apply the migration.
**Tracking:** Classified as a network-connectivity gate, not a code defect.

## Verification Status

- [x] migration.sql file exists at correct path
- [x] migration.sql follows project pattern (PART A / PART B, BEGIN/COMMIT)
- [x] `npm run build` passes (exit code 0)
- [x] `tipos-turno.service.ts` contains `where: { esCirugia: false }` in `findAll()`
- [ ] `prisma migrate status` — blocked by remote DB unreachable (network gate)
- [ ] GET /tipos-turno returns 4 types — blocked by DB not migrated yet

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| migration.sql file exists | PASSED |
| tipos-turno.service.ts exists | PASSED |
| `esCirugia: false` filter in findAll() | PASSED |
| BEGIN/COMMIT transaction in SQL | PASSED |
| UPDATE Turno SET tipoTurnoId (multiline) | PASSED (lines 19, 24) |
| Commit 26326f7 exists | PASSED |
| Commit 6a330f6 exists | PASSED |
