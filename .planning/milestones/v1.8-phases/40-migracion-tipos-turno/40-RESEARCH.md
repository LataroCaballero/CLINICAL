# Phase 40: Migración de Tipos de Turno - Research

**Researched:** 2026-06-08
**Domain:** Prisma data migration + NestJS service filter + seed script
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**flujoPaciente del nuevo tipo "Consulta"**
- El nuevo tipo "Consulta" tiene `flujoPaciente = NULL` — agendar una Consulta NO auto-clasifica al paciente
- La migración NO toca `Paciente.flujo` — solo reasigna `Turno.tipoTurnoId`
- Pacientes con flujo existente (CIRUGIA, TRATAMIENTO, PENDIENTE, NULL) quedan intactos

**Filtro de Cirugía del selector normal**
- Filtrar en backend: agregar `where: { esCirugia: false }` al `findAll()` en `TiposTurnoService`
- No agregar `?includeInternal=true` ni ningún param de override
- Cache frontend (staleTime=10min) se actualiza solo tras deploy — no requiere cache bust

**Hardcoded string matching en frontend**
- `UpcomingAppointments.tsx`: `tipoTurnoClass()` usa `.includes("pre-")`, `.includes("trat")`, `.includes("cirug")` — compatible con nuevos nombres
- El planner debe verificar que `CalendarGrid.tsx` también es compatible (ver sección de pitfalls)

**Migración de configs TipoTurnoProfesional al mergear**
- Registros de "Consulta para cirugía" se transfieren al nuevo "Consulta" con UPSERT (ON CONFLICT DO NOTHING)
- Registros de "Consulta pendiente" se eliminan (DELETE)
- Renames son UPDATE por nombre — el id no cambia, TipoTurnoProfesional se preserva automáticamente

**Estructura del seed para fresh environments**
- Nuevo archivo `backend/src/prisma/seed-tipos-turno.ts`
- Estrategia idempotente: `prisma.tipoTurno.upsert({ where: { nombre }, ... })`
- Script en `package.json`: `"seed:tipos": "ts-node src/prisma/seed-tipos-turno.ts"`

### Claude's Discretion
- Secuencia exacta de operaciones SQL dentro de la migración
- Manejo de transacciones en la migración SQL
- Nombres exactos de variables en el seed
- Orden de upserts en el seed

### Deferred Ideas (OUT OF SCOPE)
None — la discusión se mantuvo dentro del scope de Phase 40.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TIPO-01 | El sistema expone exactamente 4 tipos de turno para el profesional al agendar: Consulta, Control, Pre-Quirúrgico, Tratamiento | Implementado via `where: { esCirugia: false }` en `TiposTurnoService.findAll()` + migración de datos |
| TIPO-02 | Los turnos existentes que referencian "Consulta para cirugía" o "Consulta pendiente" se migran al nuevo tipo "Consulta" sin pérdida de datos | Migración SQL transaccional: UPDATE Turno SET tipoTurnoId con subquery por nombre |
| TIPO-03 | "Consulta para tratamiento en consultorio" se renombra a "Tratamiento" y mantiene `flujoPaciente = TRATAMIENTO` | UPDATE TipoTurno SET nombre — id y FK preservados |
| TIPO-04 | "Pre-operatorio" se renombra a "Pre-Quirúrgico" y mantiene `flujoPaciente = CIRUGIA` | UPDATE TipoTurno SET nombre — id y FK preservados |
| TIPO-05 | "Control" permanece sin cambios funcionales | Ninguna operación requerida — ya tiene `flujoPaciente = NULL, esCirugia = false` |
| TIPO-06 | El tipo interno "Cirugía" (`esCirugia = true`) se preserva para la agenda quirúrgica — no es seleccionable en el turno normal | Filtro `where: { esCirugia: false }` en backend + `crearTurnoCirugia()` usa `findFirst({ where: { esCirugia: true } })` independientemente |

</phase_requirements>

## Summary

Phase 40 es una migración de datos pura: no hay schema DDL nuevo (TipoTurno ya tiene los campos `nombre`, `flujoPaciente`, `esCirugia`), no hay nueva UI. El trabajo es (1) una migración Prisma con SQL transaccional que reorganiza los registros TipoTurno existentes en la DB, (2) un cambio de una línea en `TiposTurnoService.findAll()` para filtrar el tipo interno Cirugía, y (3) un nuevo seed script idempotente.

El patrón de migración SQL ya está establecido en este repo: el archivo `20260416000000_flujo_paciente/migration.sql` hace exactamente el mismo tipo de operación (INSERT nuevos tipos, UPDATE Turno FKs, DELETE viejos tipos dentro de un BEGIN/COMMIT block). Phase 40 sigue este patrón al pie de la letra.

La única complejidad real es el UPSERT de `TipoTurnoProfesional` al mergear "Consulta para cirugía" → "Consulta": el unique constraint `[profesionalId, tipoTurnoId]` puede causar violaciones si un profesional ya tiene config para ambos tipos. La solución es SQL `INSERT ... ON CONFLICT DO NOTHING` o Prisma `upsert` con `update: {}` vacío.

**Primary recommendation:** Crear la migración Prisma con `npx prisma migrate dev --name migracion_tipos_turno_v18`, escribir el SQL data migration dentro del archivo generado, luego hacer el cambio de una línea en el service, y finalmente crear el seed script.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^6.1.0 (instalado) | ORM + migration runner | Stack establecido del repo |
| NestJS | ^10.0.0 (instalado) | Framework backend | Stack establecido del repo |
| ts-node | ^10.9.1 (instalado) | Ejecutar seed scripts en TypeScript | Ya usado para seed-users.ts y seed-hc-templates.ts |

### No hay dependencias nuevas

Ninguna librería nueva requerida. Todo se resuelve con las herramientas ya instaladas.

**Comando relevante:**
```bash
# Desde backend/
npx prisma migrate dev --name migracion_tipos_turno_v18
```

## Architecture Patterns

### Patrón de Migración SQL Establecido (HIGH confidence)

El repo usa migraciones Prisma con SQL manual para data migrations. El archivo generado por `prisma migrate dev` tiene una sección DDL vacía (no hay cambios de schema) y se le agrega manualmente el bloque SQL de datos.

**Estructura verificada en `20260416000000_flujo_paciente/migration.sql`:**
```sql
-- Migration: <nombre>
-- Phase <N>: <descripción>

-- ============================================================
-- PART A: DDL — (vacío para Phase 40, no hay cambios de schema)
-- ============================================================

-- ============================================================
-- PART B: Data migration (transactional)
-- ============================================================

BEGIN;

-- Operaciones de datos aquí

COMMIT;
```

**IMPORTANTE:** En Phase 40 no hay cambios DDL. El bloque DDL está vacío. Solo PART B.

### Secuencia de Operaciones dentro del BEGIN/COMMIT (HIGH confidence)

Del CONTEXT.md y STATE.md, la secuencia correcta (respeta integridad referencial en todo momento):

1. INSERT nuevo tipo "Consulta" (flujoPaciente=NULL, esCirugia=false)
2. UPDATE Turno: reasignar FK de "Consulta para cirugía" → "Consulta" (subquery por nombre)
3. UPDATE Turno: reasignar FK de "Consulta pendiente" → "Consulta" (subquery por nombre)
4. Transferir TipoTurnoProfesional de "Consulta para cirugía" → "Consulta" con INSERT ... ON CONFLICT DO NOTHING
5. DELETE TipoTurnoProfesional WHERE tipoTurnoId = <id de "Consulta pendiente">
6. DELETE TipoTurno WHERE nombre = 'Consulta pendiente' (ya sin turnos ni configs)
7. DELETE TipoTurno WHERE nombre = 'Consulta para cirugía' (ya sin turnos ni configs)
8. UPDATE TipoTurno SET nombre = 'Tratamiento' WHERE nombre = 'Consulta para tratamiento en consultorio'
9. UPDATE TipoTurno SET nombre = 'Pre-Quirúrgico' WHERE nombre = 'Pre-operatorio'

**Por qué este orden:** Los DELETE de TipoTurno deben ocurrir DESPUÉS de reasignar/eliminar sus FK dependientes (Turno y TipoTurnoProfesional). Los renames van al final para no interferir con las búsquedas por nombre.

### Patrón de Seed Idempotente (HIGH confidence)

Del CONTEXT.md, usando `upsert` con `where: { nombre }` (el campo tiene `@unique` en el schema):

```typescript
// Source: pattern from seed-users.ts + TipoTurno schema (nombre @unique)
await prisma.tipoTurno.upsert({
  where: { nombre: 'Consulta' },
  update: { flujoPaciente: null, esCirugia: false },
  create: {
    nombre: 'Consulta',
    flujoPaciente: null,
    esCirugia: false,
  },
});
```

Los 5 registros a seedar: Consulta (null, false), Control (null, false), Pre-Quirúrgico (CIRUGIA, false), Tratamiento (TRATAMIENTO, false), Cirugía (null, true).

### Cambio en TiposTurnoService (HIGH confidence)

Un solo cambio en `findAll()`:

```typescript
// Source: backend/src/modules/tipos-turno/tipos-turno.service.ts (línea 10)
// ANTES:
findAll() {
  return this.prisma.tipoTurno.findMany({
    orderBy: { nombre: 'asc' },
    select: { id, nombre, descripcion, duracionDefault, flujoPaciente, esCirugia },
  });
}

// DESPUÉS:
findAll() {
  return this.prisma.tipoTurno.findMany({
    where: { esCirugia: false },  // <- única línea agregada
    orderBy: { nombre: 'asc' },
    select: { id, nombre, descripcion, duracionDefault, flujoPaciente, esCirugia },
  });
}
```

`crearTurnoCirugia()` (línea 714) usa `findFirst({ where: { esCirugia: true } })` — independiente del endpoint público, no se ve afectado.

### Estructura del seed script (HIGH confidence)

Seguir el patrón de `seed-users.ts`:

```typescript
// Source: backend/src/prisma/seed-users.ts (estructura)
import { PrismaClient, FlujoPaciente } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // upserts aquí
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

Script en `package.json`:
```json
"seed:tipos": "ts-node src/prisma/seed-tipos-turno.ts"
```

**Nota:** `ts-node` ya está en devDependencies (^10.9.1). No requiere instalación adicional.

### Anti-Patterns to Avoid

- **Cambiar el schema.prisma para esta migración:** No hay cambios DDL en Phase 40. No tocar `schema.prisma`. Si `prisma migrate dev` genera un archivo de migración vacío, es correcto — simplemente agregar el SQL de datos manualmente.
- **Usar `deleteMany` en Prisma para los DELETE:** Usar SQL raw dentro del BEGIN/COMMIT block del archivo de migración, no en código TypeScript. Mantiene todo en una transacción.
- **Olvidar el UPSERT al transferir TipoTurnoProfesional:** Si se hace un simple UPDATE, viola el unique constraint `[profesionalId, tipoTurnoId]` cuando un profesional tiene configs para ambos "Consulta para cirugía" y el nuevo "Consulta".
- **Hacer el rename antes de migrar los turnos:** Si se renombra primero, las subqueries `WHERE nombre = 'Consulta para cirugía'` ya no encontrarán registros.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UPSERT con conflict | Lógica manual check-then-insert | SQL `INSERT ... ON CONFLICT DO NOTHING` | Atómico, no hay race condition |
| Seed idempotente | Delete-all + re-insert | `prisma.tipoTurno.upsert()` | Re-ejecutable sin destruir datos de prod |
| Ejecución transaccional | Múltiples llamadas Prisma separadas | SQL `BEGIN/COMMIT` en el migration file | Rollback automático ante cualquier error |

## Common Pitfalls

### Pitfall 1: CalendarGrid.tsx tiene string matching más restrictivo que UpcomingAppointments.tsx

**What goes wrong:** `CalendarGrid.tsx` líneas 102-122 tiene:
- `tipo.includes("consulta inicial")` — mapea a color indigo (este branch desaparece post-migración, inofensivo)
- `tipo.includes("consulta") || tipo.includes("control")` — "Consulta" matchea `includes("consulta")` → color sky (correcto)
- `tipo.includes("procedimiento") || tipo.includes("tratamiento")` — "Tratamiento" matchea `includes("tratamiento")` → color violet (correcto)
- `tipo.includes("cirug")` — "Cirugía" matchea (pero no aparecerá en calendario normal post-filtro)
- NO hay branch para "Pre-Quirúrgico" con `includes("pre-")` ni `includes("pre")` — cae al default green

**Why it happens:** CalendarGrid fue escrito con los nombres viejos. "Pre-operatorio" matcheaba parcialmente con "procedimiento" (no) — en realidad también caía al default antes. Pero el color default era "green" que no es el naranja/orange esperado para Pre-Quirúrgico.

**How to avoid:** El planner debe incluir una tarea de verificación en CalendarGrid para agregar `tipo.includes("pre-quir") || tipo.includes("pre-")` ANTES del branch de "consulta", mapeando al color orange equivalente al de UpcomingAppointments.

**Warning signs:** Pre-Quirúrgico aparece en verde en el calendario en vez de naranja.

### Pitfall 2: prisma migrate dev con schema sin cambios genera archivo vacío o no genera

**What goes wrong:** Como Phase 40 no modifica `schema.prisma`, `prisma migrate dev` puede no generar un nuevo archivo de migración (dice "already up to date").

**How to avoid:** Usar `prisma migrate dev --name migracion_tipos_turno_v18 --create-only` para forzar la creación del archivo de migración vacío, luego editar manualmente el `.sql` para agregar el PART B. Alternativamente, crear el archivo de migración manualmente con la estructura de nombre timestamp correcta (`YYYYMMDDHHMMSS_migracion_tipos_turno_v18/migration.sql`).

**Warning signs:** `prisma migrate dev` retorna "Database schema is up to date!" sin crear archivo nuevo.

### Pitfall 3: TipoTurnoProfesional UPSERT constraint violation

**What goes wrong:** Si un profesional tiene registros en `TipoTurnoProfesional` tanto para "Consulta para cirugía" (id=X) como hipotéticamente para el nuevo "Consulta" (id=Y), un simple `UPDATE SET tipoTurnoId = Y WHERE tipoTurnoId = X` viola el unique constraint `@@unique([profesionalId, tipoTurnoId])`.

**How to avoid:** Usar SQL `INSERT INTO "TipoTurnoProfesional" (...) SELECT ... WHERE NOT EXISTS (...)` o `INSERT ... ON CONFLICT DO NOTHING`. El CONTEXT.md ya lo especifica como UPSERT/ON CONFLICT.

**Warning signs:** Migration falla con `ERROR: duplicate key value violates unique constraint "TipoTurnoProfesional_profesionalId_tipoTurnoId_key"`.

### Pitfall 4: Cirugía puede no existir en fresh environment hasta que se agenda la primera cirugía

**What goes wrong:** `crearTurnoCirugia()` (línea 714-725) tiene lógica de auto-creación del tipo "Cirugía" si no existe. El seed garantiza que siempre exista. Sin el seed, un fresh environment sin cirugías previas no tiene el tipo "Cirugía" en DB.

**How to avoid:** El seed `seed-tipos-turno.ts` debe incluir el upsert del tipo "Cirugía" (esCirugia=true). Esto también es lo especificado en CONTEXT.md.

**Warning signs:** `crearTurnoCirugia()` crea un nuevo registro "Cirugía" cada vez que se llama si el seed no fue ejecutado (duplicación potencial si se llama antes de que se cree el tipo).

### Pitfall 5: TratamientosTab filtra por flujoPaciente === "TRATAMIENTO" — funciona sin cambios

**What goes wrong:** No es realmente un pitfall — `TratamientosTab.tsx` línea 67 filtra `t.tipoTurno.flujoPaciente === "TRATAMIENTO"`. Post-migración, el tipo "Tratamiento" (renombrado de "Consulta para tratamiento en consultorio") mantiene `flujoPaciente = TRATAMIENTO`. El filtro sigue funcionando.

**Confirmación:** Ningún cambio necesario en TratamientosTab para Phase 40 (Phase 42 lo amplía).

## Code Examples

### SQL Data Migration Completo (patrón del repo)

```sql
-- Migration: migracion_tipos_turno_v18
-- Phase 40: Reorganización de TipoTurno para v1.8

-- PART A: DDL — ningún cambio de schema en esta fase

-- PART B: Data migration (transactional)

BEGIN;

-- Step 1: Crear el nuevo tipo "Consulta"
INSERT INTO "TipoTurno" ("id", "nombre", "esCirugia", "flujoPaciente")
VALUES (gen_random_uuid(), 'Consulta', false, NULL);

-- Step 2: Migrar turnos de "Consulta para cirugía" → "Consulta"
UPDATE "Turno"
SET "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Consulta' LIMIT 1)
WHERE "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Consulta para cirugía' LIMIT 1);

-- Step 3: Migrar turnos de "Consulta pendiente" → "Consulta"
UPDATE "Turno"
SET "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Consulta' LIMIT 1)
WHERE "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Consulta pendiente' LIMIT 1);

-- Step 4: Transferir configs de "Consulta para cirugía" al nuevo "Consulta" (UPSERT)
INSERT INTO "TipoTurnoProfesional" (
  "id", "profesionalId", "tipoTurnoId", "duracionMinutos", "colorHex", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  ttp."profesionalId",
  (SELECT id FROM "TipoTurno" WHERE nombre = 'Consulta' LIMIT 1),
  ttp."duracionMinutos",
  ttp."colorHex",
  now(),
  now()
FROM "TipoTurnoProfesional" ttp
WHERE ttp."tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE nombre = 'Consulta para cirugía' LIMIT 1)
ON CONFLICT ("profesionalId", "tipoTurnoId") DO NOTHING;

-- Step 5: Eliminar configs de "Consulta pendiente"
DELETE FROM "TipoTurnoProfesional"
WHERE "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Consulta pendiente' LIMIT 1);

-- Step 6: Eliminar configs de "Consulta para cirugía" (ya transferidas)
DELETE FROM "TipoTurnoProfesional"
WHERE "tipoTurnoId" = (SELECT id FROM "TipoTurno" WHERE "nombre" = 'Consulta para cirugía' LIMIT 1);

-- Step 7: Eliminar TipoTurno "Consulta pendiente" (ya sin Turnos ni configs)
DELETE FROM "TipoTurno" WHERE "nombre" = 'Consulta pendiente';

-- Step 8: Eliminar TipoTurno "Consulta para cirugía" (ya sin Turnos ni configs)
DELETE FROM "TipoTurno" WHERE "nombre" = 'Consulta para cirugía';

-- Step 9: Rename "Consulta para tratamiento en consultorio" → "Tratamiento"
UPDATE "TipoTurno"
SET "nombre" = 'Tratamiento'
WHERE "nombre" = 'Consulta para tratamiento en consultorio';

-- Step 10: Rename "Pre-operatorio" → "Pre-Quirúrgico"
UPDATE "TipoTurno"
SET "nombre" = 'Pre-Quirúrgico'
WHERE "nombre" = 'Pre-operatorio';

COMMIT;
```

### seed-tipos-turno.ts completo

```typescript
// Source: pattern from seed-users.ts, TipoTurno model schema.prisma (nombre @unique)
import { PrismaClient, FlujoPaciente } from '@prisma/client';

const prisma = new PrismaClient();

const TIPOS_TURNO = [
  { nombre: 'Consulta',       flujoPaciente: null,                          esCirugia: false },
  { nombre: 'Control',        flujoPaciente: null,                          esCirugia: false },
  { nombre: 'Pre-Quirúrgico', flujoPaciente: FlujoPaciente.CIRUGIA,         esCirugia: false },
  { nombre: 'Tratamiento',    flujoPaciente: FlujoPaciente.TRATAMIENTO,     esCirugia: false },
  { nombre: 'Cirugía',        flujoPaciente: null,                          esCirugia: true  },
];

async function main() {
  console.log('Seed: tipos de turno v1.8');
  for (const tipo of TIPOS_TURNO) {
    await prisma.tipoTurno.upsert({
      where: { nombre: tipo.nombre },
      update: { flujoPaciente: tipo.flujoPaciente, esCirugia: tipo.esCirugia },
      create: tipo,
    });
    console.log(`  upserted: ${tipo.nombre}`);
  }
  console.log('Seed tipos de turno completado');
}

main()
  .catch((e) => { console.error('Error en seed tipos-turno', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

### Cambio en TiposTurnoService

```typescript
// Source: backend/src/modules/tipos-turno/tipos-turno.service.ts
findAll() {
  return this.prisma.tipoTurno.findMany({
    where: { esCirugia: false },   // NUEVO: excluye Cirugía del selector público
    orderBy: { nombre: 'asc' },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      duracionDefault: true,
      flujoPaciente: true,
      esCirugia: true,
    },
  });
}
```

### CalendarGrid.tsx — corrección de color para Pre-Quirúrgico

```typescript
// Source: frontend/src/app/dashboard/turnos/CalendarGrid.tsx líneas 100-128
// Agregar branch para Pre-Quirúrgico ANTES del branch de "consulta":
if (tipo.includes("pre-quir") || tipo.includes("pre-"))
  return fm
    ? { bg: "#431407", border: "#fb923c", text: "#fed7aa" }  // orange dark
    : { bg: "#FFF7ED", border: "#F97316", text: "#7C2D12" }; // orange light
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 6 tipos de turno (incluye legacy "Consulta para cirugía", "Consulta pendiente") | 4 tipos públicos + 1 interno | Phase 40 (ahora) | Selector más claro para el profesional |
| flujoPaciente auto-asignado al agendar "Consulta para cirugía" | flujoPaciente del tipo "Consulta" es NULL — clasificación ocurre al agendar Pre-Quirúrgico o Tratamiento | Phase 40 (ahora) | "Clasificación tardía" — fundamento de v1.8 |
| Cirugía aparecía en findAll (filtrada por frontend en algunos lugares) | Cirugía filtrada en backend — nunca llega al frontend por el endpoint público | Phase 40 (ahora) | Backend como única fuente de verdad |

## Open Questions

1. **¿Existe "Cirugía" ya en la DB de producción?**
   - What we know: `crearTurnoCirugia()` la crea lazy si no existe. Es probable que exista en prod si ya se agendaron cirugías.
   - What's unclear: Si el seed intenta upsert de "Cirugía" y ya existe con datos (mensajeBase, instrucciones), el `update: { flujoPaciente, esCirugia }` no toca esos campos — correcto.
   - Recommendation: El seed con `update: { flujoPaciente: null, esCirugia: true }` es seguro independientemente de si ya existe.

2. **¿Hay turnos en producción de tipo "Consulta para cirugía" que deban ser cuidadosamente validados?**
   - What we know: La migración los reasigna a "Consulta". La función `tipoTurno.flujoPaciente` era CIRUGIA antes, ahora será NULL — pero eso ya no afecta `Paciente.flujo` (no se toca).
   - Recommendation: Verificar en staging antes de prod. Los reportes/vistas que usen `tipoTurno.nombre` mostrarán "Consulta" en vez de "Consulta para cirugía" para esos turnos históricos.

## Sources

### Primary (HIGH confidence)
- `backend/src/modules/tipos-turno/tipos-turno.service.ts` — código actual del service
- `backend/src/prisma/schema.prisma` — modelos TipoTurno, TipoTurnoProfesional, Turno verificados
- `backend/src/prisma/migrations/20260416000000_flujo_paciente/migration.sql` — patrón de migración SQL transaccional con BEGIN/COMMIT
- `backend/src/prisma/seed-users.ts` — patrón de seed script con PrismaClient
- `frontend/src/app/dashboard/turnos/CalendarGrid.tsx` — lógica de color con string matching
- `frontend/src/app/dashboard/components/UpcomingAppointments.tsx` — `tipoTurnoClass()` verificada
- `frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx` — filtro `flujoPaciente === "TRATAMIENTO"` verificado
- `.planning/phases/40-migracion-tipos-turno/40-CONTEXT.md` — decisiones locked

### Secondary (MEDIUM confidence)
- `backend/src/modules/turnos/turnos.service.ts` líneas 167-178, 697-800 — lógica flujo auto-update y crearTurnoCirugia verificadas

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todo en repo, sin dependencias nuevas
- Architecture patterns: HIGH — migración SQL verificada contra patrón existente, service verificado
- Pitfalls: HIGH — identificados por inspección directa del código fuente

**Research date:** 2026-06-08
**Valid until:** 2026-07-08 (schema estable, sin dependencias externas cambiantes)
