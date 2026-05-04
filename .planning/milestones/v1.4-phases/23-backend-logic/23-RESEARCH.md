# Phase 23: Backend Logic - Research

**Researched:** 2026-04-16
**Domain:** NestJS service mutations — Prisma WHERE filters, best-effort side-effects
**Confidence:** HIGH

## Summary

Phase 23 is backend-only. The schema foundation (FlujoPaciente enum, Paciente.flujo column, TipoTurno.flujoPaciente field, indexes) is already live from Phase 22. This phase has two distinct concerns: (1) auto-update Paciente.flujo when a turno is created via `crearTurno()`, and (2) add `WHERE (flujo = 'CIRUGIA' OR flujo IS NULL)` to every CRM query surface.

The existing code in `TurnosService.crearTurno()` already has a step-5 CRM auto-transition that is the exact template for the flujo update. The pattern is: fetch paciente after turno creation, evaluate condition, fire `prisma.paciente.update()` separately (not in the same transaction as turno creation), swallow errors with `logger.warn()`. Replicating this as a "step 5.5" requires only two small edits to `crearTurno()` — expand the existing paciente select to include `flujo`, and add the conditional update block.

The CRM filter changes touch 8 `findMany`/`groupBy`/`count` calls across 4 service files. The Prisma WHERE clause for the filter is `OR: [{ flujo: 'CIRUGIA' }, { flujo: null }]` expressed as an additional `AND` condition on every query.

**Primary recommendation:** Follow the exact best-effort pattern from the existing CRM auto-transition in `crearTurno()`, and add the flujo filter as an `AND: [{ OR: [{ flujo: 'CIRUGIA' }, { flujo: null }] }]` clause to all affected CRM queries.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Atomicidad del flujo update**
- Best-effort: el turno se crea independientemente de si el flujo update falla — mismo patrón que la auto-transición CRM existente en `crearTurno()`
- Si el update falla: `logger.warn()` con `turnoId` y `pacienteId` — el error NO llega al cliente
- Timing dentro de `crearTurno()`: después de crear el turno Y después de la CRM auto-transition (paso 5.5 del flujo actual), antes del contacto log

**Ubicación de la lógica**
- La lógica de flujo auto-update vive inline en `TurnosService.crearTurno()` — mismo patrón que la auto-transición CRM ya existente, sin inyección de dependencias nueva
- El `tipoTurno` select en `crearTurno()` se expande para incluir `flujoPaciente` (agregar una línea al select existente en `tipoTurno.findUnique()`)
- El `paciente` findUnique (actualmente `{etapaCRM, profesionalId}`) se expande para incluir `flujo` — un solo findUnique compartido para la lógica CRM y la lógica de flujo

**Filtro CRM — definición exacta**
- Filtro: `flujo = 'CIRUGIA' OR flujo IS NULL` — más amplio que STATE.md (sin condición extra sobre etapaCRM)
- Todos los pacientes con `flujo IS NULL` (legacy) permanecen visibles en todas las vistas CRM, sin importar su etapaCRM (incluye PERDIDO, CONFIRMADO, SIN_CLASIFICAR)
- Razón: pacientes existentes que se están atendiendo ahora no deben desaparecer al actualizar a v1.4
- `flujo = TRATAMIENTO` excluido de todas las vistas CRM en esta fase (aparecerán en tab Tratamientos en Phase 25)

**Scope del filtro CRM-03 — métodos afectados**

`pacientes.service.ts`:
- `getKanban()` — agregar `WHERE (flujo = 'CIRUGIA' OR flujo IS NULL)` al `findMany`
- `getListaAccion()` — agregar mismo filtro al `findMany` (actualmente filtra solo por `etapaCRM NOT IN [CONFIRMADO, PERDIDO]`)

`crm-dashboard.service.ts` — todos los métodos:
- `getFunnelSnapshot()` — filtrar pacientes del groupBy
- `getKpis()` — filtrar los conteos
- `getMotivosPerdida()` — filtrar el groupBy
- `getPipelineIncome()` — filtrar pacientes del ingreso potencial
- `getCoordinatorPerformance()` — filtrar logs por paciente con flujo correcto

`crm-metrics.service.ts`:
- `getCRMMetrics()` — filtrar el `findMany` de pacientes

NO filtrar:
- `reportes-dashboard.service.ts:getDashboardKPIs()` — métricas operativas generales (turnos hoy, ingresos del día, próximos turnos), no es CRM

### Claude's Discretion
- Implementación exacta del try/catch para best-effort (puede ser `.catch(err => logger.warn(...))` en cadena de promise)
- Índice en `Paciente.flujo` si el query planner lo requiere (decisión de performance en runtime)
- Formato exacto del mensaje `logger.warn()`

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FLUJO-01 | Al crear un turno de tipo "Consulta para cirugía", el flujo del paciente se actualiza automáticamente a CIRUGIA (solo si el paciente está en PENDIENTE) | Step 5.5 in crearTurno(); check tipoTurno.flujoPaciente === 'CIRUGIA' AND paciente.flujo === 'PENDIENTE' |
| FLUJO-02 | Al crear un turno de tipo "Consulta para tratamiento en consultorio", el flujo del paciente se actualiza automáticamente a TRATAMIENTO (solo si el paciente está en PENDIENTE) | Same step 5.5; check tipoTurno.flujoPaciente === 'TRATAMIENTO' AND paciente.flujo === 'PENDIENTE' |
| FLUJO-03 | Al crear un turno de tipo "Pre-operatorio", el flujo del paciente se actualiza a CIRUGIA (solo si está en PENDIENTE) | Same step 5.5; TipoTurno.flujoPaciente seeded as CIRUGIA for Pre-operatorio |
| FLUJO-04 | Los tipos "Control" y "Consulta pendiente" no modifican el flujo del paciente | Naturally handled: their TipoTurno.flujoPaciente is null, so the guard `if (tipoTurno.flujoPaciente && paciente.flujo === 'PENDIENTE')` short-circuits |
| CRM-01 | El embudo CRM (kanban) muestra únicamente pacientes con flujo = CIRUGIA y pacientes legacy (flujo IS NULL) | Modify getKanban() WHERE |
| CRM-02 | La lista de acción diaria muestra únicamente pacientes con flujo = CIRUGIA y pacientes legacy | Modify getListaAccion() WHERE |
| CRM-03 | Los KPIs del dashboard CRM reflejan solo pacientes de cirugía | Modify all 5 methods in crm-dashboard.service.ts + getCRMMetrics() |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @prisma/client | Already installed | ORM queries + FlujoPaciente enum | Project ORM |
| NestJS Logger | Already installed | `logger.warn()` for best-effort failures | Project logger |

No new dependencies required for this phase.

## Architecture Patterns

### Pattern 1: Best-effort side-effect in crearTurno() (existing model)

This pattern is already live in `TurnosService.crearTurno()` at line 126-136 (CRM auto-transition). The flujo update follows the exact same structure.

**What:** After the main turno creation succeeds, perform a secondary update that is NOT critical. If the secondary update fails, log a warning but do not propagate the error.

**When to use:** Side effects that enrich data but must not block the primary operation.

**Existing implementation to replicate:**
```typescript
// Step 5 (existing) — CRM auto-transition, lines 126-136
const pacienteCRM = await this.prisma.paciente.findUnique({
  where: { id: dto.pacienteId },
  select: { etapaCRM: true, profesionalId: true },  // <-- expand to add flujo here
});
const etapasIniciales: (EtapaCRM | null)[] = [null, EtapaCRM.NUEVO_LEAD];
if (etapasIniciales.includes(pacienteCRM?.etapaCRM ?? null)) {
  await this.prisma.paciente.update({
    where: { id: dto.pacienteId },
    data: { etapaCRM: EtapaCRM.TURNO_AGENDADO },
  });
}
```

**New step 5.5 to add after the CRM block:**
```typescript
// Step 5.5 — flujo auto-update (best-effort)
if (tipoTurno.flujoPaciente && pacienteCRM?.flujo === FlujoPaciente.PENDIENTE) {
  this.prisma.paciente
    .update({
      where: { id: dto.pacienteId },
      data: { flujo: tipoTurno.flujoPaciente },
    })
    .catch((err: unknown) =>
      this.logger.warn(
        `flujo auto-update failed — turnoId=${turno.id} pacienteId=${dto.pacienteId}: ${String(err)}`,
      ),
    );
}
```

Note: Using `.catch()` chain (fire-and-forget variant) rather than try/catch, which avoids `await` and doesn't block the response. Both are valid; `.catch()` is more idiomatic for truly non-blocking side-effects.

**Required expansions to existing selects:**

1. `tipoTurno.findUnique()` select (line 48-50) — add `flujoPaciente`:
```typescript
select: { id: true, duracionDefault: true, flujoPaciente: true },
```

2. `paciente.findUnique()` select (line 127-128) — add `flujo`:
```typescript
select: { etapaCRM: true, profesionalId: true, flujo: true },
```

3. Import `FlujoPaciente` from `@prisma/client` at top of file (alongside existing `EtapaCRM`).

4. Add `private readonly logger = new Logger(TurnosService.name);` constructor field (check if already present — search the file; if not, NestJS Logger needs to be imported from `@nestjs/common`).

### Pattern 2: CRM filter clause (Prisma OR condition)

**What:** Add `WHERE (flujo = 'CIRUGIA' OR flujo IS NULL)` as an AND condition to every CRM `findMany`, `groupBy`, and `count`.

**Prisma syntax — plain `findMany` with existing WHERE:**
```typescript
// Before (example from getKanban)
where: { profesionalId },

// After
where: {
  profesionalId,
  OR: [{ flujo: FlujoPaciente.CIRUGIA }, { flujo: null }],
},
```

**Prisma syntax — when existing WHERE already has an AND:**
```typescript
// Before (example from getListaAccion)
where: {
  profesionalId,
  etapaCRM: { notIn: ['CONFIRMADO', 'PERDIDO'] as EtapaCRM[] },
  NOT: { contactos: { some: { fecha: { gte: hoyInicio } } } },
},

// After — add OR at the same level
where: {
  profesionalId,
  etapaCRM: { notIn: ['CONFIRMADO', 'PERDIDO'] as EtapaCRM[] },
  NOT: { contactos: { some: { fecha: { gte: hoyInicio } } } },
  OR: [{ flujo: FlujoPaciente.CIRUGIA }, { flujo: null }],
},
```

**groupBy — same filter added to `where`:**
```typescript
// Before (getFunnelSnapshot)
where: { profesionalId },

// After
where: {
  profesionalId,
  OR: [{ flujo: FlujoPaciente.CIRUGIA }, { flujo: null }],
},
```

**count — same filter:**
```typescript
// Before (getKpis — totalActivos)
where: {
  profesionalId,
  etapaCRM: { not: EtapaCRM.PERDIDO },
},

// After
where: {
  profesionalId,
  etapaCRM: { not: EtapaCRM.PERDIDO },
  OR: [{ flujo: FlujoPaciente.CIRUGIA }, { flujo: null }],
},
```

**Special case — getCoordinatorPerformance():** This method queries `contactoLog`, not `paciente`. Filtering here means filtering logs whose patient has the correct flujo. The cleanest approach is a nested filter on the `paciente` relation:
```typescript
// Before
where: { profesionalId, fecha: { gte: inicio, lte: fin } },

// After
where: {
  profesionalId,
  fecha: { gte: inicio, lte: fin },
  paciente: { OR: [{ flujo: FlujoPaciente.CIRUGIA }, { flujo: null }] },
},
```
This requires that `ContactoLog` has a `paciente` relation in the Prisma schema (it does — `pacienteId` FK with relation defined).

**getPipelineIncome():** Queries `presupuesto`, not `paciente` directly. Filter via nested paciente relation:
```typescript
// Before
where: {
  profesionalId,
  estado: EstadoPresupuesto.ENVIADO,
  fechaEnviado: { gte: inicio, lte: fin },
  paciente: { temperatura: TemperaturaPaciente.CALIENTE },
},

// After
where: {
  profesionalId,
  estado: EstadoPresupuesto.ENVIADO,
  fechaEnviado: { gte: inicio, lte: fin },
  paciente: {
    temperatura: TemperaturaPaciente.CALIENTE,
    OR: [{ flujo: FlujoPaciente.CIRUGIA }, { flujo: null }],
  },
},
```

### Anti-Patterns to Avoid

- **Wrapping the flujo update in the same `$transaction` as turno creation:** The decision mandates best-effort. A transaction would make flujo failure block turno creation.
- **Using try/catch with async/await for the fire-and-forget:** Using `.catch()` chain is cleaner for non-blocking behavior. Using `try/catch` with `await` adds an unnecessary await that blocks the response path.
- **Fetching tipoTurno and paciente twice:** The existing code already fetches them in `crearTurno()`. Expand the existing selects instead of adding new queries.
- **Adding `etapaCRM IS NOT NULL` condition to the CRM filter:** CONTEXT.md explicitly says the filter is `flujo = 'CIRUGIA' OR flujo IS NULL` without an etapaCRM guard. Legacy patients with any etapaCRM remain visible.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Best-effort update | Custom retry/circuit-breaker | `.catch(err => logger.warn(...))` chain | Complexity not needed; consistent with existing CRM auto-transition |
| FlujoPaciente null check | Manual string comparison | Prisma `{ flujo: null }` | Prisma generates correct `IS NULL` SQL |

## Common Pitfalls

### Pitfall 1: Logger not injected in TurnosService
**What goes wrong:** `this.logger` is undefined at runtime, causing a different error than expected.
**Why it happens:** NestJS Logger needs to be instantiated — either `private readonly logger = new Logger(TurnosService.name)` as a class property, or injected via constructor.
**How to avoid:** Check if `Logger` is already imported/used in `turnos.service.ts`. It is NOT currently used (the file imports only from `@nestjs/common` for BadRequestException/Injectable/NotFoundException). Add `private readonly logger = new Logger(TurnosService.name)` as a class property. Import `Logger` from `@nestjs/common`.
**Warning signs:** TypeScript error `Property 'logger' does not exist on type 'TurnosService'`.

### Pitfall 2: OR clause conflicts with existing Prisma WHERE structure
**What goes wrong:** Adding `OR` to a WHERE that already has other top-level conditions may not behave as expected if Prisma merges them incorrectly.
**Why it happens:** Prisma's `where` is an AND of all top-level keys. Adding `OR: [...]` as a top-level key means the full filter is `(existing conditions) AND (flujo = CIRUGIA OR flujo IS NULL)` — which is correct. No conflict exists.
**How to avoid:** Place the `OR` array at the same level as `profesionalId` and other conditions, not nested inside another `AND`.
**Warning signs:** Queries returning unexpected results — test with a known TRATAMIENTO patient to confirm they are excluded.

### Pitfall 3: getListaAccion filter interaction with etapaCRM exclusion
**What goes wrong:** `getListaAccion()` currently excludes CONFIRMADO and PERDIDO via `etapaCRM: { notIn: [...] }`. After adding the flujo filter, a legacy patient with `flujo IS NULL` and `etapaCRM = PERDIDO` should be excluded by the etapaCRM filter. This is correct behavior.
**Why it happens:** The two filters are ANDed. A PERDIDO legacy patient satisfies `flujo IS NULL` but fails `etapaCRM NOT IN [CONFIRMADO, PERDIDO]`. They are correctly excluded.
**How to avoid:** No change needed. The AND semantics produce the desired result. Verify by tracing a PERDIDO legacy patient through both conditions.

### Pitfall 4: getCRMMetrics flujo filter changes metric semantics
**What goes wrong:** `getCRMMetrics()` computes presupuesto-based metrics (conversion rate, ingreso proyectado). After adding the flujo filter, only CIRUGIA and legacy patients contribute. TRATAMIENTO patients' presupuestos disappear.
**Why it happens:** The `pacientes` findMany that seeds all downstream metric calculations now filters out TRATAMIENTO.
**How to avoid:** This is intentional per the requirements. Document it. Phase 25 will add a separate treatment view.

### Pitfall 5: FlujoPaciente import missing in affected service files
**What goes wrong:** TypeScript compilation errors when referencing `FlujoPaciente.CIRUGIA`.
**Why it happens:** `crm-dashboard.service.ts` currently imports `{ EtapaCRM, TemperaturaPaciente, EstadoPresupuesto }` — no `FlujoPaciente`. Same for `crm-metrics.service.ts` and `pacientes.service.ts` (needs check).
**How to avoid:** Add `FlujoPaciente` to the `@prisma/client` import in each modified file.

## Code Examples

### Full step 5.5 block for crearTurno()
```typescript
// Source: CONTEXT.md decision + existing pattern at turnos.service.ts:126-136
// Required imports: Logger from @nestjs/common, FlujoPaciente from @prisma/client
// Required class property: private readonly logger = new Logger(TurnosService.name);

// Expand tipoTurno select to include flujoPaciente (line ~48):
// select: { id: true, duracionDefault: true, flujoPaciente: true }

// Expand pacienteCRM select to include flujo (line ~128):
// select: { etapaCRM: true, profesionalId: true, flujo: true }

// Step 5.5 — after CRM auto-transition block, before contacto log:
if (tipoTurno.flujoPaciente && pacienteCRM?.flujo === FlujoPaciente.PENDIENTE) {
  this.prisma.paciente
    .update({
      where: { id: dto.pacienteId },
      data: { flujo: tipoTurno.flujoPaciente },
    })
    .catch((err: unknown) =>
      this.logger.warn(
        `flujo auto-update failed — turnoId=${turno.id} pacienteId=${dto.pacienteId}: ${String(err)}`,
      ),
    );
}
```

### CRM filter constant (optional DRY helper)
```typescript
// Can be defined as a module-level constant to avoid repetition across 8 call sites:
const FILTRO_FLUJO_CRM = {
  OR: [
    { flujo: FlujoPaciente.CIRUGIA as FlujoPaciente | null },
    { flujo: null },
  ],
} as const;

// Usage:
where: { profesionalId, ...FILTRO_FLUJO_CRM },
```
Note: Spreading a const object into Prisma where is valid TypeScript. Whether to use a constant or inline is Claude's discretion.

## Summary of All Modified Call Sites

| File | Method | Change |
|------|--------|--------|
| `turnos.service.ts` | `crearTurno()` | (1) expand tipoTurno select + paciente select; (2) add step 5.5 flujo update block; (3) add Logger class property; (4) import Logger, FlujoPaciente |
| `pacientes.service.ts` | `getKanban()` | Add OR flujo filter to findMany WHERE |
| `pacientes.service.ts` | `getListaAccion()` | Add OR flujo filter to findMany WHERE |
| `crm-dashboard.service.ts` | `getFunnelSnapshot()` | Add OR flujo filter to groupBy WHERE (×2: grupos + motivosGrupos) |
| `crm-dashboard.service.ts` | `getKpis()` | Add OR flujo filter to all 3 count WHEREs |
| `crm-dashboard.service.ts` | `getMotivosPerdida()` | Add OR flujo filter to groupBy WHERE |
| `crm-dashboard.service.ts` | `getPipelineIncome()` | Add OR flujo filter via nested paciente relation in presupuesto findMany |
| `crm-dashboard.service.ts` | `getCoordinatorPerformance()` | Add OR flujo filter via nested paciente relation in contactoLog findMany |
| `crm-metrics.service.ts` | `getCRMMetrics()` | Add OR flujo filter to paciente findMany WHERE |

Import additions needed:
- `turnos.service.ts`: `Logger` (from `@nestjs/common`), `FlujoPaciente` (from `@prisma/client`)
- `pacientes.service.ts`: `FlujoPaciente` (from `@prisma/client`) — verify if already imported
- `crm-dashboard.service.ts`: `FlujoPaciente` (from `@prisma/client`)
- `crm-metrics.service.ts`: `FlujoPaciente` (from `@prisma/client`)

## Open Questions

1. **Logger already present in TurnosService?**
   - What we know: The file imports `BadRequestException`, `Injectable`, `NotFoundException` from `@nestjs/common` — `Logger` is NOT currently imported
   - What's unclear: Whether a class property for logger exists but just isn't used yet
   - Recommendation: Add `private readonly logger = new Logger(TurnosService.name)` as class property; add `Logger` to the `@nestjs/common` import

2. **FlujoPaciente already imported in pacientes.service.ts?**
   - What we know: The PATCH /pacientes/:id/flujo endpoint was added in Phase 22 — that endpoint uses FlujoPaciente
   - What's unclear: Whether the import was added at that time
   - Recommendation: Verify the import at the top of pacientes.service.ts before adding a duplicate

## Sources

### Primary (HIGH confidence)
- Direct read of `backend/src/modules/turnos/turnos.service.ts` — full crearTurno() flow at lines 31-152
- Direct read of `backend/src/modules/pacientes/pacientes.service.ts` — getKanban() at lines 617-708, getListaAccion() at lines 799-853
- Direct read of `backend/src/modules/reportes/services/crm-dashboard.service.ts` — all 5 methods
- Direct read of `backend/src/modules/reportes/services/crm-metrics.service.ts` — getCRMMetrics()
- Direct read of `backend/src/prisma/schema.prisma` — FlujoPaciente enum, Paciente.flujo field, TipoTurno.flujoPaciente field, indexes

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions — exact filter semantics, order of operations, best-effort rationale

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all changes are in existing files with known patterns
- Architecture: HIGH — pattern is already live in the codebase (CRM auto-transition is the exact template)
- Pitfalls: HIGH — identified from direct code reading, not speculation

**Research date:** 2026-04-16
**Valid until:** Stable — changes until Phase 22 schema is modified
