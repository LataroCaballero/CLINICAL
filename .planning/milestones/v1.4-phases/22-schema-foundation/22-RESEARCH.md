# Phase 22: Schema Foundation - Research

**Researched:** 2026-04-15
**Domain:** Prisma schema migration, NestJS endpoint, PostgreSQL backfill SQL
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Manejo de TipoTurno existentes**
- Migración manual cuidadosa: reasignar los turnos históricos al nuevo tipo equivalente antes de eliminar los viejos
- Mapeo viejo → nuevo:
  - `Consulta Inicial` → `Consulta pendiente`
  - `Control` → `Control`
  - `Post-Operatorio` → `Pre-operatorio`
  - `Procedimiento` → `Consulta para tratamiento en consultorio`
- TipoTurnoProfesional (configs por profesional): borrar todas al migrar — los profesionales reconfiguran duración y color post-migración
- El SQL de migración: (1) insertar los 5 nuevos tipos, (2) UPDATE Turno SET tipoTurnoId = nuevo WHERE tipoTurnoId = viejo para cada mapeo, (3) DELETE TipoTurnoProfesional WHERE tipoTurnoId IN (viejos), (4) DELETE TipoTurno WHERE id IN (viejos)

**Autorización PATCH /pacientes/:id/flujo**
- Roles autorizados: ADMIN + PROFESIONAL + SECRETARIA — mismo patrón que `updatePacienteSection`
- El endpoint acepta cualquier dirección de cambio (libre): permite correcciones
- Sin restricción de dirección ni validación de transición de estado

**Mapping flujoPaciente en TipoTurno**
- `Consulta para cirugía` → `flujoPaciente: CIRUGIA`
- `Consulta para tratamiento en consultorio` → `flujoPaciente: TRATAMIENTO`
- `Pre-operatorio` → `flujoPaciente: CIRUGIA`
- `Control` → `flujoPaciente: null`
- `Consulta pendiente` → `flujoPaciente: null`

**esCirugia en los nuevos tipos**
- Ninguno de los 5 nuevos tipos lleva `esCirugia = true`
- `esCirugia: false` en todos los nuevos tipos (seed y migración)

**Decisiones de schema (ya fijadas)**
- `Paciente.flujo` usa `@default(PENDIENTE)` NOT NULL — pacientes nuevos arrancan como PENDIENTE
- Backfill: `esCirugia = true` OR `etapaCRM IS NOT NULL` → CIRUGIA; resto → null (legacy)
- `flujo = null` (legacy) ≠ `flujo = PENDIENTE` — solo PENDIENTE activa el banner LiveTurno (Phase 24)
- `TipoTurno.flujoPaciente` nullable; `esCirugia` se mantiene (usado por `cerrarSesion()`)

### Claude's Discretion

None — all decisions were locked during discussion.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TIPOS-01 | El sistema cuenta con 5 tipos de turno: "Consulta para cirugía", "Consulta para tratamiento en consultorio", "Pre-operatorio", "Control", "Consulta pendiente" | Schema adds `flujoPaciente` column to TipoTurno; migration seeds the 5 types replacing old ones |
| TIPOS-02 | Al crear un turno, la secretaria/profesional selecciona el tipo de turno de la lista actualizada con los 5 tipos | `TiposTurnoService.findAll()` must include `flujoPaciente` in select so frontend receives the field; old types deleted in migration |
| FLUJO-06 | Los pacientes existentes en el embudo CRM migran a flujo = CIRUGIA en base a historial de turnos (Turno.esCirugia / etapaCRM activo); pacientes sin historial quedan como null | Backfill SQL uses subquery against Turno.esCirugia and Paciente.etapaCRM; new field `Paciente.flujo` is nullable with `@default(PENDIENTE)` |
</phase_requirements>

---

## Summary

Phase 22 is a pure backend schema and data migration phase with no frontend surface. Three deliverables: (1) Prisma schema additions — enum `FlujoPaciente`, field `Paciente.flujo`, field `TipoTurno.flujoPaciente`; (2) a hand-written SQL migration that replaces the 4 old TipoTurno records with 5 new ones (including FK reasignment and cleanup) plus backfills `Paciente.flujo`; (3) a new dedicated PATCH endpoint `/pacientes/:id/flujo`.

The codebase already has all the patterns needed. Existing enums (`EtapaCRM`, `EstadoPaciente`) were added via `prisma migrate dev --name` with hand-written SQL; this phase follows that exact pattern. The `updateEtapaCRM` and `updateTemperatura` endpoints in `pacientes.controller.ts` are the direct template for the new `/flujo` endpoint.

The most critical implementation detail is the SQL migration sequencing: the 4 old TipoTurno records have FK references from `Turno` (tipoTurnoId) and `TipoTurnoProfesional` (tipoTurnoId). These constraints require INSERT new types → reasign Turno FKs → delete TipoTurnoProfesional configs → delete old TipoTurno, strictly in that order within a transaction. Deviating from this order will cause FK violation errors.

**Primary recommendation:** Execute the migration as a single hand-written SQL file following the established migration pattern; use a dedicated `updateFlujo` method in the service (not `updatePacienteSection`) to keep concerns separated.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | (existing) | Schema definition + type generation | Already in use; enum + field additions are standard Prisma DDL |
| PostgreSQL | (existing) | Stores data; runs the backfill UPDATE | Already in use; CTE-based UPDATE is idiomatic |
| NestJS class-validator | (existing) | `@IsEnum()` for DTO validation | Already used in all other enum DTOs |
| `@prisma/client` | (existing) | Import `FlujoPaciente` enum in service/controller | Same pattern as `EtapaCRM`, `TemperaturaPaciente` |

### No New Packages Needed

This phase adds zero new npm dependencies. All tools are already installed.

---

## Architecture Patterns

### Existing Patterns to Replicate Exactly

**Pattern 1: Adding an enum to Prisma schema**

Established by `EtapaCRM` in `20260220161930_crm_conversion/migration.sql`:

```sql
-- In hand-written migration SQL:
CREATE TYPE "FlujoPaciente" AS ENUM ('CIRUGIA', 'TRATAMIENTO', 'PENDIENTE');

-- Then alter the table:
ALTER TABLE "Paciente" ADD COLUMN "flujo" "FlujoPaciente";
```

In `schema.prisma`:
```prisma
enum FlujoPaciente {
  CIRUGIA
  TRATAMIENTO
  PENDIENTE
}

model Paciente {
  // ... existing fields ...
  flujo  FlujoPaciente?  @default(PENDIENTE)
  // ...
}
```

**Pattern 2: Adding a nullable column to an existing model**

Established by `etapaCRM EtapaCRM?` (no default) — same approach but `flujo` adds `@default(PENDIENTE)`:

```prisma
model TipoTurno {
  // ... existing fields ...
  flujoPaciente  FlujoPaciente?   // nullable, no default
}
```

**Pattern 3: PATCH sub-resource endpoint**

Established by `PATCH :id/etapa-crm` and `PATCH :id/temperatura` in `pacientes.controller.ts`:

```typescript
// Controller
@Patch(':id/flujo')
updateFlujo(
  @Param('id') id: string,
  @Body() body: UpdateFlujoDto,
) {
  return this.pacientesService.updateFlujo(id, body.flujo);
}
```

```typescript
// Service (mirrors updateTemperatura pattern exactly)
async updateFlujo(id: string, flujo: FlujoPaciente | null) {
  const exists = await this.prisma.paciente.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) throw new NotFoundException('Paciente no encontrado');

  return this.prisma.paciente.update({
    where: { id },
    data: { flujo },
  });
}
```

**Pattern 4: DTO with @IsEnum**

```typescript
// dto/update-flujo.dto.ts
import { IsEnum } from 'class-validator';
import { FlujoPaciente } from '@prisma/client';

export class UpdateFlujoDto {
  @IsEnum(FlujoPaciente)
  flujo: FlujoPaciente;
}
```

Note: The endpoint accepts any FlujoPaciente value (no null — the endpoint is for setting/changing a classification, not clearing it). If clearing to null is needed in future, a separate mechanism handles it.

**Pattern 5: Updating findAll() select**

`TiposTurnoService.findAll()` currently selects `id, nombre, descripcion, duracionDefault`. After schema migration it must include `flujoPaciente` and `esCirugia`:

```typescript
findAll() {
  return this.prisma.tipoTurno.findMany({
    orderBy: { nombre: 'asc' },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      duracionDefault: true,
      flujoPaciente: true,   // NEW
      esCirugia: true,       // ADD (was missing, useful for Phase 23)
    },
  });
}
```

### Anti-Patterns to Avoid

- **Running migration steps outside a transaction:** The 4-step TipoTurno migration (insert → reasign → delete configs → delete old) MUST run inside a single `BEGIN/COMMIT` block. A partial failure leaves orphaned FK references.
- **Using `updatePacienteSection` for flujo:** The section-based PATCH uses an untyped `data: Record<string, any>` switch. The `/flujo` endpoint needs a typed DTO with `@IsEnum` validation — a dedicated method is safer.
- **Setting `esCirugia = true` on new types:** Decided as false for all 5. The `esCirugia` flag is consumed by `cerrarSesion()` for surgery-specific logic — incorrectly setting it would corrupt that flow.
- **Blanket PENDING backfill:** The backfill must distinguish legacy-null from PENDIENTE. Patients without any surgery history should get `flujo = null`, not PENDIENTE. Only NEW patients created after the migration get PENDIENTE via `@default`.

---

## Critical Migration SQL Details

### Step-by-step Migration Structure

The migration SQL for this phase has TWO concerns that must be in one file:

**Concern A — Schema DDL:**
```sql
-- 1. Create enum
CREATE TYPE "FlujoPaciente" AS ENUM ('CIRUGIA', 'TRATAMIENTO', 'PENDIENTE');

-- 2. Add column to Paciente (nullable, default PENDIENTE for new rows)
ALTER TABLE "Paciente" ADD COLUMN "flujo" "FlujoPaciente" DEFAULT 'PENDIENTE';

-- 3. Add column to TipoTurno (nullable, no default)
ALTER TABLE "TipoTurno" ADD COLUMN "flujoPaciente" "FlujoPaciente";
```

**Concern B — Data migration (must be transactional):**
```sql
BEGIN;

-- Step 1: Insert the 5 new TipoTurno records
-- (Use gen_random_uuid() for UUIDs in PostgreSQL)
INSERT INTO "TipoTurno" ("id", "nombre", "esCirugia", "flujoPaciente")
VALUES
  (gen_random_uuid(), 'Consulta para cirugía',                     false, 'CIRUGIA'::"FlujoPaciente"),
  (gen_random_uuid(), 'Consulta para tratamiento en consultorio',  false, 'TRATAMIENTO'::"FlujoPaciente"),
  (gen_random_uuid(), 'Pre-operatorio',                            false, 'CIRUGIA'::"FlujoPaciente"),
  (gen_random_uuid(), 'Control',                                   false, NULL),
  (gen_random_uuid(), 'Consulta pendiente',                        false, NULL);

-- Step 2: Reasign Turno.tipoTurnoId from old → new types
-- (Use subqueries to look up IDs by nombre)
UPDATE "Turno" SET "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE nombre = 'Consulta pendiente')
  WHERE "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE nombre = 'Consulta Inicial');

UPDATE "Turno" SET "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE nombre = 'Pre-operatorio')
  WHERE "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE nombre = 'Post-Operatorio');

UPDATE "Turno" SET "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE nombre = 'Consulta para tratamiento en consultorio')
  WHERE "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE nombre = 'Procedimiento');

-- 'Control' → 'Control': same nombre, so no UPDATE needed

-- Step 3: Delete TipoTurnoProfesional configs for old types
DELETE FROM "TipoTurnoProfesional"
  WHERE "tipoTurnoId" IN (
    SELECT id FROM "TipoTurno"
    WHERE nombre IN ('Consulta Inicial', 'Post-Operatorio', 'Procedimiento')
  );

-- Step 4: Delete old TipoTurno records (except 'Control' which is reused)
DELETE FROM "TipoTurno"
  WHERE nombre IN ('Consulta Inicial', 'Post-Operatorio', 'Procedimiento');

-- Step 5: Backfill Paciente.flujo
-- Patients with surgery history → CIRUGIA
UPDATE "Paciente" p
SET "flujo" = 'CIRUGIA'::"FlujoPaciente"
WHERE
  EXISTS (SELECT 1 FROM "Turno" t WHERE t."pacienteId" = p.id AND t."esCirugia" = true)
  OR p."etapaCRM" IS NOT NULL;

-- All other patients → null (legacy/unclassified, different from PENDIENTE)
-- (No UPDATE needed — the column was added with DEFAULT 'PENDIENTE', so we must
--  explicitly set the non-CIRUGIA legacy patients to null)
UPDATE "Paciente"
SET "flujo" = NULL
WHERE "flujo" != 'CIRUGIA'::"FlujoPaciente"
  OR "flujo" IS NULL;

COMMIT;
```

**IMPORTANT NOTE on backfill ordering:** The column is added with `DEFAULT 'PENDIENTE'`, meaning all existing rows get PENDIENTE after the ALTER TABLE. The backfill must then:
1. SET flujo = CIRUGIA for qualifying patients (override the default)
2. SET flujo = NULL for all non-qualifying patients (override the default back to null for legacy)

The two UPDATE statements in the backfill must run in this order. Alternatively, the column can be added without a DEFAULT (nullable, no default), then all three states set explicitly — this is cleaner for the migration file even if it means the schema.prisma `@default(PENDIENTE)` only applies to application-level inserts going forward.

**Recommended cleaner approach:**
```sql
-- Add column WITHOUT default (all existing rows = null by default in nullable columns)
ALTER TABLE "Paciente" ADD COLUMN "flujo" "FlujoPaciente";

-- Then only UPDATE the CIRUGIA ones; everything else stays null (legacy)
UPDATE "Paciente" p
SET "flujo" = 'CIRUGIA'::"FlujoPaciente"
WHERE
  EXISTS (SELECT 1 FROM "Turno" t WHERE t."pacienteId" = p.id AND t."esCirugia" = true)
  OR p."etapaCRM" IS NOT NULL;

-- The @default(PENDIENTE) in schema.prisma handles NEW inserts at application level
```

This way: existing CIRUGIA patients get CIRUGIA, all other existing patients get null (legacy), and new patients created via application code get PENDIENTE via Prisma's `@default`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation in SQL | Custom sequence or import | `gen_random_uuid()` PostgreSQL function | Already available in pg14+; no extension needed |
| Enum validation in controller | Manual if-else check | `@IsEnum(FlujoPaciente)` from class-validator | Already used in every other enum DTO in this project |
| Transactional migration | Multiple separate SQL files | Single migration file with BEGIN/COMMIT | Prisma migrate dev wraps each file in a transaction but explicit BEGIN/COMMIT in the data section makes intent clear and safe |

---

## Common Pitfalls

### Pitfall 1: 'Control' tipo turno collision
**What goes wrong:** The old `Control` and new `Control` have the same nombre. The `INSERT` of the new 5 types includes `Control`, but there's already a `Control` row. Since `TipoTurno.nombre` is `@unique`, this will fail with a unique constraint violation.
**Why it happens:** The mapping says `Control → Control` (same name), so the old one must be reused (not deleted and re-inserted), OR the old one must be deleted first and then the new one inserted.
**How to avoid:** Option A — skip inserting `Control` in the new batch and instead `UPDATE` the existing `Control` row to add `flujoPaciente = NULL` and `esCirugia = false` (it already has these values). Only insert the 4 genuinely new types. Option B — rename old Control temporarily, insert new, remap, delete old. **Option A is simpler and correct.**

### Pitfall 2: Prisma client not regenerated
**What goes wrong:** After adding `FlujoPaciente` enum and new fields, TypeScript build fails because `@prisma/client` still has old types.
**Why it happens:** `prisma migrate dev` regenerates the client automatically, but if the developer runs `prisma migrate deploy` (prod path), they must run `prisma generate` separately.
**How to avoid:** The plan task for migration should include `npx prisma generate` as a verification step. The service/controller that imports `FlujoPaciente` from `@prisma/client` will fail TypeScript compilation until client is regenerated.

### Pitfall 3: FK constraint on TipoTurnoProfesional
**What goes wrong:** `DELETE FROM TipoTurno WHERE nombre IN (...)` fails because `TipoTurnoProfesional` still has rows referencing those IDs.
**Why it happens:** `TipoTurnoProfesional.tipoTurnoId` has `ON DELETE RESTRICT` (the default FK behavior in this schema — no cascade).
**How to avoid:** Step 3 (DELETE TipoTurnoProfesional for old types) MUST run before step 4 (DELETE TipoTurno). Already specified in decisions but must be enforced in SQL order.

### Pitfall 4: Subquery returns multiple rows
**What goes wrong:** `UPDATE Turno SET tipoTurnoId = (SELECT id FROM TipoTurno WHERE nombre = 'X')` fails if the subquery returns more than one row.
**Why it happens:** If the migration is run on a database where duplicate nombre rows somehow exist (shouldn't happen due to `@unique`, but defensive coding matters).
**How to avoid:** Add `LIMIT 1` to each subquery: `(SELECT id FROM "TipoTurno" WHERE nombre = 'Consulta pendiente' LIMIT 1)`.

### Pitfall 5: seed.ts creates old tipo turno records
**What goes wrong:** Running `npx prisma db seed` after migration re-creates the old tipos turno (`Consulta Inicial`, `Post-Operatorio`, `Procedimiento`) because `seed` still has the old array.
**Why it happens:** The seed file at `backend/src/prisma/seed` (TypeScript file) has `['Consulta Inicial', 'Control', 'Post-Operatorio', 'Procedimiento'].map(...)` hardcoded.
**How to avoid:** The seed update task must replace that array with the 5 new types AND include `flujoPaciente` and `esCirugia` fields. The seed `$transaction` deletes all tables first, so seeded data always starts fresh.

---

## Code Examples

### Prisma Schema Additions (verified against existing schema.prisma patterns)

```prisma
// Add after existing enums (e.g., after MotivoPerdidaCRM section)
enum FlujoPaciente {
  CIRUGIA
  TRATAMIENTO
  PENDIENTE
}

// In model Paciente (after existing CRM fields like etapaCRM, temperatura):
flujo  FlujoPaciente?  @default(PENDIENTE)

// In model TipoTurno (after existing esCirugia field):
flujoPaciente  FlujoPaciente?
```

### New DTO

```typescript
// backend/src/modules/pacientes/dto/update-flujo.dto.ts
import { IsEnum } from 'class-validator';
import { FlujoPaciente } from '@prisma/client';

export class UpdateFlujoDto {
  @IsEnum(FlujoPaciente)
  flujo: FlujoPaciente;
}
```

### Controller addition (append to PacientesController)

```typescript
// Add import at top:
import { FlujoPaciente } from '@prisma/client';
import { UpdateFlujoDto } from './dto/update-flujo.dto';

// New method:
@Patch(':id/flujo')
updateFlujo(
  @Param('id') id: string,
  @Body() dto: UpdateFlujoDto,
) {
  return this.pacientesService.updateFlujo(id, dto.flujo);
}
```

### Service addition

```typescript
// Add to imports at top of pacientes.service.ts:
// FlujoPaciente already imported from @prisma/client along with EtapaCRM etc.

async updateFlujo(id: string, flujo: FlujoPaciente) {
  const exists = await this.prisma.paciente.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) throw new NotFoundException('Paciente no encontrado');

  return this.prisma.paciente.update({
    where: { id },
    data: { flujo },
  });
}
```

### Updated TiposTurnoService.findAll()

```typescript
findAll() {
  return this.prisma.tipoTurno.findMany({
    orderBy: { nombre: 'asc' },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      duracionDefault: true,
      flujoPaciente: true,  // NEW
      esCirugia: true,      // NEW (was missing from original select)
    },
  });
}
```

### Updated seed TipoTurno block

```typescript
// Replace old array in seed file:
const tiposTurno = await batchInsert(
  [
    { nombre: 'Consulta para cirugía',                    flujoPaciente: 'CIRUGIA',      esCirugia: false },
    { nombre: 'Consulta para tratamiento en consultorio', flujoPaciente: 'TRATAMIENTO',  esCirugia: false },
    { nombre: 'Pre-operatorio',                           flujoPaciente: 'CIRUGIA',      esCirugia: false },
    { nombre: 'Control',                                  flujoPaciente: null,           esCirugia: false },
    { nombre: 'Consulta pendiente',                       flujoPaciente: null,           esCirugia: false },
  ].map((t) => ({
    ...t,
    descripcion: faker.lorem.sentence(),
    duracionDefault: random([20, 30, 45, 60]),
  })),
  5,
  (data) => prisma.tipoTurno.create({ data }),
);
```

Note: The seed imports enums from `@prisma/client`. After schema change, `FlujoPaciente` will be importable. The seed file currently only imports `TipoProducto`, `TipoMovimientoStock`, etc. — `FlujoPaciente` must be added to that import list.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| 4 tipos turno (Consulta Inicial, Control, Post-Operatorio, Procedimiento) | 5 tipos turno aligned to flujo (Consulta para cirugía, Consulta para tratamiento en consultorio, Pre-operatorio, Control, Consulta pendiente) | Enables auto-classification in Phase 23 |
| No `Paciente.flujo` field | `Paciente.flujo: FlujoPaciente?` | Enables CRM filter, LiveTurno banner, tratamientos tab |
| No `TipoTurno.flujoPaciente` | `TipoTurno.flujoPaciente: FlujoPaciente?` | Enables Phase 23 auto-update logic without hardcoding type names |

---

## Open Questions

1. **'Control' unique constraint during migration**
   - What we know: Old `Control` exists with `@unique` nombre. New 5 types include `Control`.
   - What's unclear: Should the migration UPDATE the old `Control` row (add `flujoPaciente = null`) and skip inserting a new one, or rename-delete-reinsert?
   - Recommendation: UPDATE existing `Control` row to set `flujoPaciente = NULL`, `esCirugia = false` (already false). Only INSERT the 4 genuinely new types. This avoids the unique violation entirely.

2. **Column default vs. application-level default for Paciente.flujo**
   - What we know: `@default(PENDIENTE)` in Prisma sets this as a DB-level default. If the column is added with `DEFAULT 'PENDIENTE'`, all existing rows get PENDIENTE before backfill runs.
   - Recommendation: Add column WITHOUT a SQL-level default (just `ALTER TABLE "Paciente" ADD COLUMN "flujo" "FlujoPaciente"`), run the backfill to set CIRUGIA where applicable (leaving others as NULL), and rely on Prisma's `@default(PENDIENTE)` purely for application-level new inserts. This is cleaner and avoids the double-UPDATE problem.

---

## Sources

### Primary (HIGH confidence)

- Existing codebase — `backend/src/prisma/schema.prisma` (lines 145–210 for Paciente model, 759–785 for TipoTurno model)
- Existing codebase — `backend/src/prisma/migrations/20260220161930_crm_conversion/migration.sql` (enum + column addition pattern)
- Existing codebase — `backend/src/modules/pacientes/pacientes.controller.ts` (PATCH sub-resource pattern: etapa-crm, temperatura, lista-espera, whatsapp-opt-in)
- Existing codebase — `backend/src/modules/tipos-turno/tipos-turno.service.ts` (findAll select pattern)
- Existing codebase — `backend/src/prisma/seed` (batchInsert pattern, TipoTurno creation block at line 262)
- CONTEXT.md — all implementation decisions locked

### Secondary (MEDIUM confidence)

- Prisma docs pattern — nullable field with `@default`: verified by existing `scoreConversion Int @default(0)` and `estado EstadoPaciente @default(ACTIVO)` in the same schema
- PostgreSQL `gen_random_uuid()` — available in pg13+ without extension (pgcrypto not required)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; all patterns exist verbatim in codebase
- Architecture: HIGH — directly verified from existing controller/service/migration patterns
- Migration SQL: HIGH for structure, MEDIUM for edge case around 'Control' unique constraint (open question addressed)
- Pitfalls: HIGH — derived from actual FK constraint definitions in schema.prisma and seed file contents

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable domain, patterns won't change)
