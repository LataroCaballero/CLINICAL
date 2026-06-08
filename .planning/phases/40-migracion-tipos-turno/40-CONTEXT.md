# Phase 40: Migración de Tipos de Turno - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Migración de datos de TipoTurno en la DB: mergear "Consulta para cirugía" y "Consulta pendiente" en un nuevo tipo "Consulta", renombrar "Consulta para tratamiento en consultorio" → "Tratamiento" y "Pre-operatorio" → "Pre-Quirúrgico", filtrar el tipo interno "Cirugía" del selector normal, y crear un seed reproducible para fresh environments. No hay UI nueva — solo cambios en DB, backend service, y verificación de frontend existente.

</domain>

<decisions>
## Implementation Decisions

### flujoPaciente del nuevo tipo "Consulta"
- El nuevo tipo "Consulta" tiene `flujoPaciente = NULL` — agendar una Consulta NO auto-clasifica al paciente
- El fundamento: Consulta es genérica; la clasificación (CIRUGIA/TRATAMIENTO) ocurre al agendar Pre-Quirúrgico o Tratamiento en turnos posteriores
- La migración NO toca `Paciente.flujo` — solo reasigna `Turno.tipoTurnoId`. Pacientes con flujo existente (CIRUGIA, TRATAMIENTO, PENDIENTE, NULL) quedan intactos
- Este patrón de "clasificación tardía" es el fundamento del milestone v1.8 y no cambia en Phase 41/42

### Filtro de Cirugía del selector normal
- Filtrar en **backend**: agregar `where: { esCirugia: false }` al `findAll()` en `TiposTurnoService`
- La agenda quirúrgica usa su propio path (`crearTurnoQuirurgico()`) y no consume GET /tipos-turno — no necesita param especial
- No agregar `?includeInternal=true` ni ningún param de override al endpoint público
- Cache frontend (staleTime=10min en `useTiposTurno`) se actualiza solo tras deploy — no requiere cache bust

### Hardcoded string matching en frontend
- `UpcomingAppointments.tsx` contiene `tipoTurnoClass(nombre)` que usa `.includes("cirug")`, `.includes("pre-")`, `.includes("trat")` para asignar colores
- Los nuevos nombres siguen siendo compatibles: "Pre-Quirúrgico" contiene "pre-", "Tratamiento" contiene "trat", "Cirugía" contiene "cirug", "Consulta" cae al default gris
- El planner debe verificar que no hay otras comparaciones por nombre hardcodeadas que se rompan

### Migración de configs TipoTurnoProfesional al mergear
- Los registros `TipoTurnoProfesional` de "Consulta para cirugía" se transfieren al nuevo "Consulta": `UPDATE TipoTurnoProfesional SET tipoTurnoId = <nuevo_consulta_id> WHERE tipoTurnoId = <viejo_consulta_cirugia_id>`
- Usar UPSERT (ON CONFLICT DO NOTHING o equivalente Prisma) para evitar violación del unique constraint `[profesionalId, tipoTurnoId]` si ya existe config para el nuevo "Consulta"
- Los registros `TipoTurnoProfesional` de "Consulta pendiente" se eliminan (DELETE)
- Los renames ("Pre-operatorio" → "Pre-Quirúrgico", "Consulta para tratamiento en consultorio" → "Tratamiento") son `UPDATE TipoTurno SET nombre` — el `id` no cambia, los `TipoTurnoProfesional` existentes se preservan automáticamente
- Verificar que el panel de configuración de tipos de turno por profesional en frontend muestra los nuevos nombres dinámicamente (debe renderizar `tipoTurno.nombre` desde la API, no strings hardcodeados)

### Estructura del seed para fresh environments
- Nuevo archivo `backend/src/prisma/seed-tipos-turno.ts` separado (patrón consistente con `seed-users.ts` y `seed-hc-templates.ts`)
- Registros a seedar: Consulta (flujoPaciente=null, esCirugia=false), Control (null, false), Pre-Quirúrgico (CIRUGIA, false), Tratamiento (TRATAMIENTO, false), Cirugía (null, esCirugia=true)
- Campos por registro: solo `nombre + flujoPaciente + esCirugia` — los campos opcionales (descripcion, mensajeBase, instrucciones, duracionDefault) quedan null
- Estrategia idempotente: `prisma.tipoTurno.upsert({ where: { nombre }, update: { flujoPaciente, esCirugia }, create: {...} })` — re-ejecutable sin errores
- Invocación: script separado en `package.json`: `"seed:tipos": "ts-node src/prisma/seed-tipos-turno.ts"`

### Claude's Discretion
- Secuencia exacta de operaciones SQL dentro de la migración (ya definida en STATE.md como referencia)
- Manejo de transacciones en la migración SQL
- Nombres exactos de variables en el seed
- Orden de upserts en el seed

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TiposTurnoService.findAll()` (`backend/src/modules/tipos-turno/tipos-turno.service.ts`) — modificar agregando `where: { esCirugia: false }`
- `useTiposTurno` hook (`frontend/src/hooks/useTipoTurnos.ts`) — sin cambios necesarios; el filtro ocurre en backend
- `seed-hc-templates.ts` y `seed-users.ts` (`backend/src/prisma/`) — patrón a replicar para el nuevo seed

### Established Patterns
- Migraciones en `backend/src/prisma/migrations/` con SQL transaccional — la migración Phase 40 sigue este patrón
- `prisma.tipoTurno.upsert()` es el patrón de seed idempotente preferido en este repo
- `tipoTurno.flujoPaciente` es leído en `turnos.service.ts:167` con guard `flujo === PENDIENTE` — el nuevo NULL lo hace inofensivo

### Integration Points
- `backend/src/modules/tipos-turno/tipos-turno.service.ts` — único punto de cambio en backend
- `backend/src/prisma/migrations/` — nueva migración SQL con la secuencia de datos
- `backend/src/prisma/seed-tipos-turno.ts` — nuevo archivo a crear
- `frontend/src/app/dashboard/components/UpcomingAppointments.tsx:94` — `tipoTurnoClass()` con string matching, verificar compatibilidad post-rename
- `backend/package.json` — agregar script `seed:tipos`

</code_context>

<specifics>
## Specific Ideas

- La secuencia de migración está pre-definida en STATE.md como referencia: (1) crear "Consulta", (2) migrar FK de "Consulta para cirugía" → "Consulta", (3) migrar FK de "Consulta pendiente" → "Consulta", (4) transferir TipoTurnoProfesional de "Consulta para cirugía" → "Consulta" con UPSERT, (5) eliminar "Consulta pendiente" y sus configs, (6) eliminar "Consulta para cirugía" (ya sin turnos ni configs), (7) rename "Consulta para tratamiento en consultorio" → "Tratamiento", (8) rename "Pre-operatorio" → "Pre-Quirúrgico"
- El tipo "Cirugía" (esCirugia=true) nunca debe aparecer en GET /tipos-turno público — el filtro en backend es la única fuente de verdad

</specifics>

<deferred>
## Deferred Ideas

None — la discusión se mantuvo dentro del scope de Phase 40.

</deferred>

---

*Phase: 40-migracion-tipos-turno*
*Context gathered: 2026-06-08*
