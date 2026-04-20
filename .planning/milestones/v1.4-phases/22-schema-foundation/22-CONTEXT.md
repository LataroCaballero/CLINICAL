# Phase 22: Schema Foundation - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Añadir el enum `FlujoPaciente` (CIRUGIA | TRATAMIENTO | PENDIENTE), el campo `Paciente.flujo`, el campo `TipoTurno.flujoPaciente`, migración con backfill SQL, seed de 5 TipoTurno nuevos con migración de tipos existentes, y endpoint PATCH `/pacientes/:id/flujo`. Esta fase no implementa lógica de negocio (auto-update al crear turno, filtros CRM) — solo la fundación de schema que las fases siguientes consumen.

</domain>

<decisions>
## Implementation Decisions

### Manejo de TipoTurno existentes
- **Migración manual cuidadosa**: reasignar los turnos históricos al nuevo tipo equivalente antes de eliminar los viejos
- Mapeo viejo → nuevo:
  - `Consulta Inicial` → `Consulta pendiente`
  - `Control` → `Control`
  - `Post-Operatorio` → `Pre-operatorio`
  - `Procedimiento` → `Consulta para tratamiento en consultorio`
- **TipoTurnoProfesional (configs por profesional)**: borrar todas al migrar — los profesionales reconfiguran duración y color post-migración
- El SQL de migración: (1) insertar los 5 nuevos tipos, (2) UPDATE Turno SET tipoTurnoId = nuevo WHERE tipoTurnoId = viejo para cada mapeo, (3) DELETE TipoTurnoProfesional WHERE tipoTurnoId IN (viejos), (4) DELETE TipoTurno WHERE id IN (viejos)

### Autorización PATCH /pacientes/:id/flujo
- Roles autorizados: **ADMIN + PROFESIONAL + SECRETARIA** — mismo patrón que `updatePacienteSection`
- El endpoint acepta **cualquier dirección** de cambio (libre): permite correcciones (ej. TRATAMIENTO → CIRUGIA si fue mal clasificado)
- Sin restricción de dirección ni validación de transición de estado

### Mapping flujoPaciente en TipoTurno
- `Consulta para cirugía` → `flujoPaciente: CIRUGIA`
- `Consulta para tratamiento en consultorio` → `flujoPaciente: TRATAMIENTO`
- `Pre-operatorio` → `flujoPaciente: CIRUGIA`
- `Control` → `flujoPaciente: null`
- `Consulta pendiente` → `flujoPaciente: null`

### esCirugia en los nuevos tipos
- **Ninguno** de los 5 nuevos tipos lleva `esCirugia = true`
- Los 5 tipos son consultas/controles, no cirugías reales; el flag `esCirugia` sigue siendo para el tipo "cirugía real" existente en el sistema
- `esCirugia: false` en todos los nuevos tipos (seed y migración)

### Decisiones de schema (desde STATE.md — ya fijadas)
- `Paciente.flujo` usa `@default(PENDIENTE)` NOT NULL — pacientes nuevos arrancan como PENDIENTE
- Backfill: `esCirugia = true` OR `etapaCRM IS NOT NULL` → CIRUGIA; resto → null (legacy)
- `flujo = null` (legacy) ≠ `flujo = PENDIENTE` — solo PENDIENTE activa el banner LiveTurno (Phase 24)
- `TipoTurno.flujoPaciente` nullable; `esCirugia` se mantiene (usado por `cerrarSesion()`)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TiposTurnoService.findAll()` — devuelve todos los tipos; necesita incluir `flujoPaciente` en el select tras la migración
- `TiposTurnoService.saveConfigByProfesional()` — patron de upsert por profesional existente
- `PacientesService.updatePacienteSection()` — patrón de PATCH parcial existente; el nuevo endpoint `/flujo` sigue la misma estructura
- `UpdatePacienteSectionDto` + `PartialType(CreatePacienteDto)` — patrón DTO existente para updates parciales
- `@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')` — decorator existente para el mismo nivel de acceso

### Established Patterns
- Enums Prisma importados directamente desde `@prisma/client` (ej. `EtapaCRM`, `EstadoPaciente`)
- Migraciones: SQL hand-written con `prisma migrate dev --name <name>` — patrón establecido en v1.1
- Seeds: `batchInsert()` helper existente en `seed` con delete previo en `$transaction`
- DTOs con `@IsEnum()` de class-validator para validar enum values

### Integration Points
- `backend/src/prisma/schema.prisma` — añadir enum `FlujoPaciente`, campo en `Paciente`, campo en `TipoTurno`
- `backend/src/modules/pacientes/pacientes.controller.ts` + `pacientes.service.ts` — nuevo endpoint PATCH `:id/flujo`
- `backend/src/modules/tipos-turno/tipos-turno.service.ts` — actualizar `findAll()` para incluir `flujoPaciente`
- `backend/src/prisma/seed` — actualizar TipoTurno seed con los 5 nuevos tipos y sus campos
- Nueva migración SQL en `backend/src/prisma/migrations/` con la lógica de reasignación

</code_context>

<specifics>
## Specific Ideas

- El SQL de migración debe ejecutar los 4 pasos en orden dentro de una transacción: insertar nuevos → reasignar Turno FK → borrar TipoTurnoProfesional → borrar tipos viejos
- El seed debe actualizar el bloque de TipoTurno con los 5 nuevos tipos incluyendo `flujoPaciente` y `esCirugia: false`
- El endpoint PATCH `/pacientes/:id/flujo` puede ser un método dedicado en el controller/service (no reusar `updatePacienteSection`) para mantener separación de concerns

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 22-schema-foundation*
*Context gathered: 2026-04-15*
