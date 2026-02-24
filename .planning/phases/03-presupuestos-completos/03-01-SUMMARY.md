---
phase: 03-presupuestos-completos
plan: 01
subsystem: backend/prisma
tags: [schema, migration, presupuestos, crm, dto]
dependency-graph:
  requires: []
  provides:
    - ConfigClinica model (branding/SMTP per professional)
    - PresupuestoItem.precioTotal (replaces cantidad+precioUnitario+total)
    - Presupuesto.tokenAceptacion, moneda, fechaValidez
    - EstadoPresupuesto.VENCIDO enum value
    - rechazar() propagates etapaCRM=PERDIDO to patient
  affects:
    - backend/src/modules/presupuestos/presupuestos.service.ts
    - backend/src/modules/presupuestos/dto/create-presupuesto.dto.ts
    - backend/src/prisma/schema.prisma
tech-stack:
  added: []
  patterns:
    - $transaction for atomic multi-table CRM state updates
    - Custom migration SQL for non-destructive column rename with data copy
key-files:
  created:
    - backend/src/prisma/migrations/20260224000000_presupuestos_completos/migration.sql
  modified:
    - backend/src/prisma/schema.prisma
    - backend/src/modules/presupuestos/dto/create-presupuesto.dto.ts
    - backend/src/modules/presupuestos/presupuestos.service.ts
decisions:
  - Custom migration SQL required: 1719 existing rows in PresupuestoItem prevented direct NOT NULL column add; used ADD COLUMN nullable → UPDATE (copy total→precioTotal) → DROP old columns → SET NOT NULL pattern
  - motivoPerdida left as null in rechazar() service: field is enum MotivoPerdidaCRM but motivoRechazo is free text; enum values are PRECIO/TIEMPO/MIEDO_CIRUGIA/PREFIERE_OTRO_PROFESIONAL/NO_CANDIDATO_MEDICO/NO_RESPONDIO/OTRO
  - aceptar() already had etapaCRM=CONFIRMADO in $transaction — no change needed for CRM-04 dashboard flow
metrics:
  duration: 15min
  completed: 2026-02-24
  tasks-completed: 2
  files-changed: 4
---

# Phase 3 Plan 01: Presupuestos Completos — Schema Migration Summary

**One-liner:** Prisma schema migration adding ConfigClinica model, tokenAceptacion/moneda/fechaValidez to Presupuesto, simplifying PresupuestoItem to precioTotal-only, adding VENCIDO enum value, and fixing rechazar() to atomically propagate etapaCRM=PERDIDO via $transaction.

## What Was Done

### Task 1: Prisma Schema Migration

**Schema changes applied:**

1. **New model `ConfigClinica`** — branding and SMTP configuration per professional:
   - Fields: nombreClinica, logoUrl, direccion, telefono, emailContacto, web, piePaginaTexto
   - SMTP fields: smtpHost, smtpPort, smtpUser, smtpPassEncrypted, smtpFrom
   - Unique relation to Profesional (1:1)

2. **`Presupuesto` model — new fields:**
   - `tokenAceptacion String? @unique` — for public acceptance URL
   - `moneda String @default("ARS")` — currency (ARS or USD)
   - `fechaValidez DateTime?` — budget expiration date
   - Pre-existing fields confirmed: `fechaEnviado`, `fechaRechazado`, `cargoMovimientoId` (not modified)

3. **`PresupuestoItem` model — simplified:**
   - Removed: `cantidad Int`, `precioUnitario Decimal`
   - Renamed: `total` → `precioTotal Decimal @db.Decimal(10,2)`

4. **`EstadoPresupuesto` enum — added `VENCIDO`**

5. **`Profesional` model — added `configClinica ConfigClinica?` relation**

**Migration approach:** Used custom SQL (not auto-generated) because 1719 existing rows in `PresupuestoItem` prevented direct NOT NULL column add. Migration SQL:
```sql
ALTER TABLE "PresupuestoItem" ADD COLUMN "precioTotal" DECIMAL(10,2);  -- nullable
UPDATE "PresupuestoItem" SET "precioTotal" = "total";                   -- copy data
ALTER TABLE "PresupuestoItem" DROP COLUMN "cantidad";
ALTER TABLE "PresupuestoItem" DROP COLUMN "precioUnitario";
ALTER TABLE "PresupuestoItem" DROP COLUMN "total";
ALTER TABLE "PresupuestoItem" ALTER COLUMN "precioTotal" SET NOT NULL;  -- enforce
```

Migration applied cleanly via `npx prisma migrate deploy`. Prisma client regenerated.

### Task 2: DTO + Service Updates

**`create-presupuesto.dto.ts` — full rewrite:**
- `PresupuestoItemDto`: `descripcion` + `precioTotal` (no cantidad/precioUnitario)
- `CreatePresupuestoDto`: added `moneda?: string` (IsIn ['ARS','USD']) and `fechaValidez?: string` (IsDateString)

**`presupuestos.service.ts` — targeted changes:**

1. **`create()`**: items mapped to `{ descripcion, precioTotal, orden }`, subtotal calculated from `item.precioTotal`, presupuesto created with `moneda` and `fechaValidez`

2. **`rechazar()`**: converted from single `prisma.presupuesto.update()` to `$transaction([...])` — atomically updates presupuesto state AND `paciente.etapaCRM = PERDIDO` (CRM gap fixed)

3. **`aceptar()`**: already used `$transaction` with `etapaCRM = CONFIRMADO` update — no changes required

4. **`formatPresupuesto()`**: items now return `{ id, descripcion, precioTotal }`, response includes `moneda` and `fechaValidez`

## MotivoPerdidaCRM Enum Values (for Plan 03-02)

The `MotivoPerdidaCRM` enum in schema.prisma has these values:
```
PRECIO
TIEMPO
MIEDO_CIRUGIA
PREFIERE_OTRO_PROFESIONAL
NO_CANDIDATO_MEDICO
NO_RESPONDIO
OTRO
```

The public controller (Plan 03-02) can use these values when building the rejection form for the token-based public page. The `rechazar()` service method leaves `motivoPerdida` as null (free-text reason goes to `presupuesto.motivoRechazo`), while the public endpoint should accept the enum value and set `paciente.motivoPerdida` directly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Custom migration SQL for existing data**
- **Found during:** Task 1
- **Issue:** `npx prisma migrate dev` failed with "Added the required column 'precioTotal' without a default value. There are 1719 rows." Auto-generated SQL would drop columns and re-add NOT NULL in one step, which PostgreSQL rejects when rows exist.
- **Fix:** Used `--create-only` equivalent approach (manually created migration file with stepped SQL: add nullable → copy → drop old → set NOT NULL). Applied via `npx prisma migrate deploy`.
- **Files modified:** `backend/src/prisma/migrations/20260224000000_presupuestos_completos/migration.sql`
- **Commit:** 823c463

**2. [Rule 1 - Verification] aceptar() already had CRM update**
- **Found during:** Task 2
- **Issue:** Plan described aceptar() as missing etapaCRM update, but reading the current service showed it already had `$transaction` with `etapaCRM: EtapaCRM.CONFIRMADO`.
- **Fix:** No change needed. Verified the existing implementation was correct.

## Self-Check

### Files Exist
- [x] `backend/src/prisma/migrations/20260224000000_presupuestos_completos/migration.sql` — FOUND
- [x] `backend/src/prisma/schema.prisma` — FOUND (contains ConfigClinica, precioTotal, tokenAceptacion, VENCIDO)
- [x] `backend/src/modules/presupuestos/dto/create-presupuesto.dto.ts` — FOUND
- [x] `backend/src/modules/presupuestos/presupuestos.service.ts` — FOUND

### Commits Exist
- [x] 823c463 — feat(03-01): Prisma migration — presupuestos completos schema
- [x] f38d832 — feat(03-01): update DTO + service rechazar() with CRM propagation

## Self-Check: PASSED
