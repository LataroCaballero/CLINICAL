# Stack Research

**Domain:** Medical clinic SaaS — v1.4 Patient Flow Classification (CIRUGIA | TRATAMIENTO | PENDIENTE)
**Researched:** 2026-04-15
**Confidence:** HIGH (all decisions are purely internal schema evolution — no new third-party libraries required)

---

## Milestone Scope

v1.4 adds patient flow classification on top of the existing TipoTurno + Turno + Paciente models. The entire
milestone is a **schema extension + service logic change** — no new npm packages needed. The only external
question is the safest Prisma migration pattern for adding a PostgreSQL enum to an already-populated table,
which is documented below.

---

## No New npm Packages Required

This milestone does not require any new dependencies. Everything needed is already installed:

| Already In Place | Why Sufficient |
|-----------------|----------------|
| Prisma 6.x + `@prisma/client` | Enum support, `$transaction`, atomic `UPDATE` |
| NestJS service pattern | Auto-classification logic drops directly into `TurnosService.crearTurno()` |
| TanStack Query | New tab in `/dashboard/pacientes` uses same query pattern as existing tabs |
| Zustand | `useProfessionalContext` store needs no changes |
| shadcn/ui `Tabs` component | Already used in patient drawer; reuse for new "Tratamientos" tab |

**Installation:** nothing.

---

## Schema Changes Required

### 1. New Enum `FlujoPaciente`

```prisma
enum FlujoPaciente {
  CIRUGIA
  TRATAMIENTO
  PENDIENTE
}
```

Add to `schema.prisma` alongside the other CRM enums (after `EtapaCRM` block).

### 2. Add `flujo` Field to `Paciente`

```prisma
model Paciente {
  // ... existing fields ...
  flujo   FlujoPaciente  @default(PENDIENTE)
  // ... existing indices ...
  @@index([profesionalId, flujo])   // new — needed for CRM filter + Tratamientos list
}
```

**Why `@default(PENDIENTE)` not nullable:** A nullable `flujo` would require null-checks throughout the CRM
filter, LiveTurno banner, and Tratamientos list. Using `PENDIENTE` as the semantic "not yet classified"
state means the field is always present and always meaningful. Backfill of existing patients to `PENDIENTE`
is a single UPDATE (see migration strategy below).

**New index:** `@@index([profesionalId, flujo])` is required because:
- The CRM embudo query filters `WHERE profesionalId = $1 AND flujo = 'CIRUGIA'`
- The Tratamientos tab queries `WHERE profesionalId = $1 AND flujo = 'TRATAMIENTO'` with date range
- Without the index both queries do a full `Paciente` table scan

### 3. New Enum `FlujoPacienteTurno` on `TipoTurno`

Replace the existing `esCirugia: Boolean` field on `TipoTurno` with a typed `flujoPaciente` field that
carries the classification intent of each appointment type.

```prisma
model TipoTurno {
  id                  String                   @id @default(uuid())
  nombre              String                   @unique
  descripcion         String?
  mensajeBase         String?
  instrucciones       String?
  duracionDefault     Int?
  esCirugia           Boolean                  @default(false)   // KEEP — see rationale below
  flujoPaciente       FlujoPaciente?           // NEW — nullable until seeded
  turnos              Turno[]
  configProfesionales TipoTurnoProfesional[]
}
```

**Why keep `esCirugia` and add `flujoPaciente` in parallel instead of replacing:**
- `esCirugia` is read in `TurnosService.cerrarSesion()` to trigger the `PROCEDIMIENTO_REALIZADO` CRM
  transition. Removing it requires changing that logic simultaneously — that is Phase-2 work, not schema
  migration work.
- The safest migration is: add `flujoPaciente` nullable → seed values → use `flujoPaciente` in new code →
  deprecate `esCirugia` in a later cleanup phase.
- **Confidence: HIGH** — this is the established Prisma pattern for non-breaking column additions.

### 4. The 5 New TipoTurno Seed Entries

These are data migrations, not schema migrations. They go in the migration SQL as `INSERT ... ON CONFLICT DO NOTHING`:

| `nombre` | `flujoPaciente` | `esCirugia` | `duracionDefault` |
|----------|-----------------|-------------|-------------------|
| Consulta para cirugía | CIRUGIA | false | 30 |
| Consulta para tratamiento en consultorio | TRATAMIENTO | false | 30 |
| Pre-operatorio | CIRUGIA | false | 60 |
| Control | null (neutral) | false | 20 |
| Consulta pendiente | PENDIENTE | false | 30 |

**"Control" gets `null` for `flujoPaciente`:** A control visit does not reclassify the patient — it just
updates the existing patient's journey. Setting `flujoPaciente = null` in TipoTurno signals the auto-update
logic: "do not touch `Paciente.flujo` when this type of appointment is created."

---

## Migration Strategy

### Pattern: Additive Nullable → Backfill → NOT NULL

This is the same pattern used in `20260313100019_facturador_v1` for `condicionIVAReceptor`. It is safe for
production tables with existing rows.

```sql
-- Step 1: Create enum (PostgreSQL requires explicit enum creation)
CREATE TYPE "FlujoPaciente" AS ENUM ('CIRUGIA', 'TRATAMIENTO', 'PENDIENTE');

-- Step 2: Add column as nullable first (no lock escalation — DDL-only)
ALTER TABLE "Paciente"
  ADD COLUMN "flujo" "FlujoPaciente";

-- Step 3: Add column to TipoTurno as nullable
ALTER TABLE "TipoTurno"
  ADD COLUMN "flujoPaciente" "FlujoPaciente";

-- Step 4: Backfill ALL existing patients to PENDIENTE
-- This is a full-table UPDATE. On a large table consider batching,
-- but for current scale (< 10K patients) a single UPDATE is safe.
UPDATE "Paciente"
SET "flujo" = 'PENDIENTE'
WHERE "flujo" IS NULL;

-- Step 5: Apply NOT NULL + DEFAULT now that all rows are populated
ALTER TABLE "Paciente"
  ALTER COLUMN "flujo" SET NOT NULL,
  ALTER COLUMN "flujo" SET DEFAULT 'PENDIENTE';

-- Step 6: Add index for CRM filter and Tratamientos list queries
CREATE INDEX "Paciente_profesionalId_flujo_idx"
  ON "Paciente"("profesionalId", "flujo");

-- Step 7: Seed the 5 new TipoTurno entries (idempotent)
INSERT INTO "TipoTurno" ("id", "nombre", "descripcion", "duracionDefault", "esCirugia", "flujoPaciente")
VALUES
  (gen_random_uuid(), 'Consulta para cirugía',                      'Consulta inicial para cirugía',            30,  false, 'CIRUGIA'),
  (gen_random_uuid(), 'Consulta para tratamiento en consultorio',   'Consulta inicial para tratamiento',        30,  false, 'TRATAMIENTO'),
  (gen_random_uuid(), 'Pre-operatorio',                             'Consulta pre-operatoria',                  60,  false, 'CIRUGIA'),
  (gen_random_uuid(), 'Control',                                    'Control post-intervención',                20,  false, NULL),
  (gen_random_uuid(), 'Consulta pendiente',                         'Consulta de clasificación pendiente',      30,  false, 'PENDIENTE')
ON CONFLICT ("nombre") DO UPDATE SET
  "flujoPaciente" = EXCLUDED."flujoPaciente",
  "duracionDefault" = EXCLUDED."duracionDefault";
```

**Why `ON CONFLICT ("nombre") DO UPDATE`:** `TipoTurno.nombre` has a `@unique` constraint. If any of these
names already exist (e.g., "Control" created manually by a user), the conflict updates `flujoPaciente`
without failing. This makes the migration re-runnable safely.

**Lock risk:** Step 4 (full-table UPDATE) acquires a row-level exclusive lock on every row. For a table with
< 10K rows this completes in milliseconds. If table is larger, replace with:
```sql
UPDATE "Paciente" SET "flujo" = 'PENDIENTE'
WHERE "flujo" IS NULL AND ctid = ANY(
  ARRAY(SELECT ctid FROM "Paciente" WHERE "flujo" IS NULL LIMIT 1000)
);
-- repeat until 0 rows updated
```
At current scale a single-pass UPDATE is the correct call.

---

## Auto-Classification Hook: Integration Point in `TurnosService`

The `crearTurno()` method already has a CRM auto-transition block at step 5 (lines 125–136). The
`FlujoPaciente` auto-update slots in at the same point, **after** the turno is created and **alongside** the
existing CRM transition:

```typescript
// In TurnosService.crearTurno(), after turno is created (step 5 area):

// 5a) Existing: CRM auto-transition (unchanged)
const pacienteCRM = await this.prisma.paciente.findUnique({
  where: { id: dto.pacienteId },
  select: { etapaCRM: true, flujo: true, profesionalId: true },  // add flujo to select
});
const etapasIniciales: (EtapaCRM | null)[] = [null, EtapaCRM.NUEVO_LEAD];
if (etapasIniciales.includes(pacienteCRM?.etapaCRM ?? null)) {
  await this.prisma.paciente.update({
    where: { id: dto.pacienteId },
    data: { etapaCRM: EtapaCRM.TURNO_AGENDADO },
  });
}

// 5b) NEW: FlujoPaciente auto-update
// Only update if TipoTurno.flujoPaciente is set AND patient is still PENDIENTE
// A CIRUGIA or TRATAMIENTO patient is never reclassified by a subsequent turno.
const tipoTurnoFlujo = await this.prisma.tipoTurno.findUnique({
  where: { id: dto.tipoTurnoId },
  select: { flujoPaciente: true },
});
const flujoDeTurno = tipoTurnoFlujo?.flujoPaciente;
if (
  flujoDeTurno &&
  flujoDeTurno !== 'PENDIENTE' &&
  pacienteCRM?.flujo === 'PENDIENTE'
) {
  await this.prisma.paciente.update({
    where: { id: dto.pacienteId },
    data: { flujo: flujoDeTurno },
  });
}
```

**Rules encoded:**
1. Only `TipoTurno` entries with `flujoPaciente = CIRUGIA` or `flujoPaciente = TRATAMIENTO` trigger an
   update. `null` (Control) and `PENDIENTE` (Consulta pendiente) do not reclassify.
2. A patient already classified as `CIRUGIA` or `TRATAMIENTO` is **never downgraded** by a new turno.
   The guard `pacienteCRM?.flujo === 'PENDIENTE'` ensures this.
3. Manual reclassification from the LiveTurno banner (banner for `PENDIENTE` patients) takes a separate
   dedicated endpoint — it bypasses this guard intentionally since it's an explicit human action.

**Optimization note:** The `pacienteCRM` query (step 5a) already reads from the DB. In the final
implementation, add `flujo: true` to that single `select` to avoid a second DB round-trip for step 5b.

---

## CRM Embudo Filter Change

The CRM embudo query (in `PacientesService` or wherever `getEmbudo()` / `getDashboardCRM()` lives) needs a
single added filter:

```typescript
// Before (all patients):
where: { profesionalId, etapaCRM: { not: null } }

// After (CIRUGIA patients only):
where: { profesionalId, etapaCRM: { not: null }, flujo: 'CIRUGIA' }
```

No new index needed — the composite `(profesionalId, flujo)` index added in the migration covers this.

---

## Tratamientos Tab: Query Shape

The new tab queries patients with `flujo = TRATAMIENTO` for a given month. The expected query shape:

```typescript
// backend: GET /pacientes/tratamientos?profesionalId=X&mes=2026-04
// (or filtered via existing pacientes endpoint with new query params)

this.prisma.paciente.findMany({
  where: {
    profesionalId,
    flujo: 'TRATAMIENTO',
    turnos: {
      some: {
        inicio: { gte: startOfMonth, lt: startOfNextMonth },
        estado: { not: EstadoTurno.CANCELADO },
      },
    },
  },
  include: {
    turnos: {
      where: {
        inicio: { gte: startOfMonth, lt: startOfNextMonth },
        estado: { not: EstadoTurno.CANCELADO },
      },
      include: { tipoTurno: { select: { id: true, nombre: true } } },
      orderBy: { inicio: 'asc' },
    },
  },
  orderBy: { nombreCompleto: 'asc' },
})
```

Frontend hook: new `useTratamientosMes(profesionalId, year, month)` in `frontend/src/hooks/` — same TanStack
Query pattern as `usePacientes`.

---

## Frontend Component Reuse

| New Surface | Reuse | Notes |
|-------------|-------|-------|
| Tratamientos tab in `/dashboard/pacientes` | shadcn/ui `Tabs` (already used in patient drawer) | Add as sibling tab next to existing "Pacientes" list |
| LiveTurno classification banner | `ActiveSessionBanner` pattern already exists in `frontend/src/app/dashboard/components/` | Banner visibility: `turno.paciente.flujo === 'PENDIENTE'` |
| FlujoPaciente badge on patient card | `Badge` from shadcn/ui (already installed) | Color: CIRUGIA=blue, TRATAMIENTO=green, PENDIENTE=yellow |

---

## What NOT to Change

| Thing | Why Not |
|-------|---------|
| `esCirugia` on `TipoTurno` | Still used by `cerrarSesion()` to trigger `PROCEDIMIENTO_REALIZADO`. Remove in a future cleanup phase only after verifying all callers use `flujoPaciente` instead. |
| `esCirugia` on `Turno` | Currently set only in `crearCirugiaTurno()` (the surgical operation flow). Leave as-is — it tracks whether this specific appointment record is a surgery, which is different from the patient's classification. |
| `EtapaCRM` and CRM transitions | The existing auto-transitions (`TURNO_AGENDADO`, `CONSULTADO`, `PROCEDIMIENTO_REALIZADO`) remain unchanged. `FlujoPaciente` is a parallel classification, not a replacement for CRM stages. |
| `Paciente.etapaCRM` filtering logic | The CRM embudo gets a new `flujo = 'CIRUGIA'` filter but the stage machine itself does not change. |

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `FlujoPaciente` enum with `PENDIENTE` default | Nullable `flujo` field | Nullable adds null-guards everywhere (CRM filter, LiveTurno banner, badge display). The `PENDIENTE` default is semantically equivalent and simpler. |
| Add `flujoPaciente` to `TipoTurno`, keep `esCirugia` | Remove `esCirugia` in same migration | `esCirugia` has active callers in `cerrarSesion()`. Removing it in the same PR risks a logic regression in the CRM `PROCEDIMIENTO_REALIZADO` transition. Two-phase approach is safer. |
| Auto-update `flujo` only for `PENDIENTE` patients | Always overwrite `flujo` on new turno | A patient confirmed as `CIRUGIA` who books a `TRATAMIENTO` consult should not be reclassified. The "only update if PENDIENTE" guard prevents silent data corruption. |
| Separate `TratamientoPaciente` model | Re-use `Turno` + `flujo` filter | Introducing a new model adds schema complexity without benefit — the `flujo` flag on `Paciente` combined with the existing `Turno` model is sufficient. No join-table needed. |

---

## Migration File Naming

Follow existing convention: `YYYYMMDDHHMMSS_descripcion_snake_case`

Suggested: `20260415000000_add_flujo_paciente_v14`

Run with:
```bash
# From backend/ directory — use migrate deploy (non-interactive, prod-safe)
npx prisma migrate deploy

# After migration, regenerate client:
npx prisma generate
```

---

## Version Compatibility

No new packages = no version compatibility concerns. Existing stack versions:

| Package | Version | Notes |
|---------|---------|-------|
| Prisma | 6.x | PostgreSQL enum support confirmed. `CREATE TYPE ... AS ENUM` is the generated SQL pattern. |
| `@prisma/client` | 6.x | Regenerate after schema change with `npx prisma generate` to pick up `FlujoPaciente` enum type. |
| PostgreSQL | 14+ (assumed) | `gen_random_uuid()` available without extension since PG 13. |

---

## Sources

- `backend/src/prisma/schema.prisma` — confirmed `TipoTurno.esCirugia`, `Turno.esCirugia`, `Paciente.etapaCRM`, absence of any existing `flujo` field (HIGH — direct inspection)
- `backend/src/modules/turnos/turnos.service.ts` — confirmed CRM auto-transition hook location at step 5 of `crearTurno()`, `esCirugia` usage in `cerrarSesion()` (HIGH — direct inspection)
- `.planning/research/STACK.md` (v1.2) — confirmed `prisma migrate deploy` as production migration command; confirmed additive-nullable-then-NOT-NULL pattern from `20260313100019_facturador_v1` (HIGH — project history)
- `.planning/PROJECT.md` — confirmed v1.4 feature list: 5 TipoTurno entries, `flujo` field, CRM filter, LiveTurno banner, Tratamientos tab (HIGH — project source of truth)

---

*Stack research for: CLINICAL v1.4 — Flujo de Pacientes*
*Researched: 2026-04-15*
*Supersedes: v1.2 STACK.md (2026-03-16) for this milestone only*
