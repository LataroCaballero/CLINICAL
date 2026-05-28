---
phase: 32-schema-backend-estados-extendidos
plan: "01"
subsystem: database
tags: [prisma, postgresql, enum, turno, estados]

# Dependency graph
requires: []
provides:
  - "EstadoTurno enum extendido con EN_ESPERA y SIENDO_ATENDIDO en schema.prisma"
  - "Migration SQL 20260513201109_add_estados_extendidos_turno con ALTER TYPE ADD VALUE"
  - "Cliente Prisma regenerado con EstadoTurno.EN_ESPERA y EstadoTurno.SIENDO_ATENDIDO"
affects:
  - "32-02: Endpoints backend que usan EstadoTurno.EN_ESPERA / SIENDO_ATENDIDO"
  - "33-widget-agenda-operativo"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PostgreSQL enum extension via ALTER TYPE ADD VALUE (valores al final para compatibilidad sin recrear el tipo)"

key-files:
  created:
    - backend/src/prisma/migrations/20260513201109_add_estados_extendidos_turno/migration.sql
  modified:
    - backend/src/prisma/schema.prisma

key-decisions:
  - "Migration SQL creada manualmente porque Supabase pgbouncer (puerto 6543) bloquea prisma migrate dev en schema engine; se ejecutara via prisma migrate deploy en el servidor"
  - "EN_ESPERA y SIENDO_ATENDIDO agregados al final del enum para que PostgreSQL use ADD VALUE sin recrear el tipo"

patterns-established:
  - "Migraciones de enum PostgreSQL: siempre agregar valores al final para compatibilidad con ALTER TYPE ADD VALUE"

requirements-completed:
  - EST-01

# Metrics
duration: 13min
completed: 2026-05-13
---

# Phase 32 Plan 01: Schema Backend Estados Extendidos Summary

**EstadoTurno enum de PostgreSQL/Prisma extendido con EN_ESPERA y SIENDO_ATENDIDO, cliente Prisma regenerado y build del backend compila sin errores**

## Performance

- **Duration:** 13 min
- **Started:** 2026-05-13T19:58:13Z
- **Completed:** 2026-05-13T20:11:09Z
- **Tasks:** 2
- **Files modified:** 3 (schema.prisma, migration.sql, tsconfig.build.tsbuildinfo)

## Accomplishments

- Enum `EstadoTurno` extendido de 5 a 7 valores en schema.prisma (EN_ESPERA y SIENDO_ATENDIDO al final)
- Migration SQL generada manualmente con `ALTER TYPE "EstadoTurno" ADD VALUE 'EN_ESPERA'` y `ADD VALUE 'SIENDO_ATENDIDO'`
- Cliente Prisma regenerado — `EstadoTurno.EN_ESPERA === 'EN_ESPERA'` y `EstadoTurno.SIENDO_ATENDIDO === 'SIENDO_ATENDIDO'` verificados via node
- `npm run build` (nest build) compila sin errores con los nuevos valores

## Task Commits

Each task was committed atomically:

1. **Task 1: Agregar EN_ESPERA y SIENDO_ATENDIDO al enum EstadoTurno** - `1eb0b2a` (feat)
2. **Task 2: Aplicar migración y regenerar cliente Prisma** - `b746943` (feat)

**Plan metadata:** (pendiente - commit final de docs)

## Files Created/Modified

- `backend/src/prisma/schema.prisma` - EstadoTurno enum extendido con 2 nuevos valores al final
- `backend/src/prisma/migrations/20260513201109_add_estados_extendidos_turno/migration.sql` - SQL con dos ALTER TYPE ADD VALUE statements

## Decisions Made

- **Migration manual**: `prisma migrate dev` cuelga en `can-connect-to-database` porque la `DATABASE_URL` apunta al pgbouncer de Supabase (puerto 6543). El schema engine de Prisma requiere conexion directa para operaciones de schema. Se creo la migration SQL manualmente; debe aplicarse en el servidor con `npx prisma migrate deploy` (que no usa schema engine, solo ejecuta el SQL) o directamente via Supabase SQL editor.
- **Valores al final**: EN_ESPERA y SIENDO_ATENDIDO se colocan al final del enum para que PostgreSQL pueda usar `ALTER TYPE ADD VALUE` sin necesidad de recrear el tipo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration SQL creada manualmente por imposibilidad de conexion con prisma migrate dev**
- **Found during:** Task 2 (Aplicar migración)
- **Issue:** `npx prisma migrate dev` se cuelga indefinidamente en `can-connect-to-database` porque la DATABASE_URL usa el pooler de Supabase (pgbouncer, puerto 6543) que no soporta operaciones del schema engine de Prisma
- **Fix:** Se creo el directorio de migration y el archivo `migration.sql` manualmente con las instrucciones `ALTER TYPE "EstadoTurno" ADD VALUE` correctas. Se ejecuto `npx prisma generate` directamente (que no necesita DB connection) para regenerar el cliente.
- **Files modified:** `backend/src/prisma/migrations/20260513201109_add_estados_extendidos_turno/migration.sql`
- **Verification:** `npx prisma generate` exitoso; `node -e` confirma `EstadoTurno.EN_ESPERA === 'EN_ESPERA'`; `npm run build` sale con code 0
- **Committed in:** b746943 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bloqueante)
**Impact on plan:** La migration SQL es correcta y equivalente a lo que `prisma migrate dev` hubiera generado. El unico cambio es que la DB en produccion no fue actualizada automaticamente — requiere aplicar la migration manualmente.

## Issues Encountered

- Supabase pgbouncer (puerto 6543) bloquea el schema engine de Prisma en `can-connect-to-database`. Para resolver definitivamente: agregar `directUrl = env("DIRECT_URL")` al datasource en schema.prisma y configurar `DIRECT_URL` con el connection string directo de Supabase (puerto 5432). El schema engine usara la directUrl para migrations mientras el cliente usa la URL de pooler para queries.

## User Setup Required

Para aplicar la migration a la base de datos de produccion, ejecutar uno de los siguientes:

**Opcion A:** En el servidor (si DIRECT_URL esta configurado):
```bash
cd backend && npx prisma migrate deploy
```

**Opcion B:** En Supabase SQL Editor (tabla SQL):
```sql
ALTER TYPE "EstadoTurno" ADD VALUE 'EN_ESPERA';
ALTER TYPE "EstadoTurno" ADD VALUE 'SIENDO_ATENDIDO';
```

**Opcion C (recomendada para el futuro):** Agregar `directUrl = env("DIRECT_URL")` al datasource en schema.prisma y configurar la variable de entorno con el connection string directo de Supabase (puerto 5432, sin pgbouncer).

## Next Phase Readiness

- Plan 02 (endpoints backend) puede importar `EstadoTurno.EN_ESPERA` y `EstadoTurno.SIENDO_ATENDIDO` directamente desde `@prisma/client` — el cliente esta regenerado y el build compila.
- La DB de produccion necesita la migration aplicada antes de que los endpoints nuevos puedan escribir estos valores sin error de constraint.

---
*Phase: 32-schema-backend-estados-extendidos*
*Completed: 2026-05-13*
