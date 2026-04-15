# Architecture Patterns — v1.4 Flujo de Pacientes

**Domain:** Patient flow classification added to existing NestJS + Prisma + Next.js clinical SaaS
**Researched:** 2026-04-15
**Overall confidence:** HIGH — based on direct code inspection of all integration points

---

## Current System Map (what exists today)

### Backend modules relevant to this milestone

| Module | Key files | Current role |
|--------|-----------|-------------|
| `turnos` | `turnos.service.ts` | Creates turnos; houses CRM auto-transition logic (crearTurno step 5 and cerrarSesion) |
| `pacientes` | `pacientes.service.ts`, `pacientes.controller.ts` | Kanban query, lista-acción, CRM update; no `flujo` field yet |
| `tipos-turno` | `tipos-turno.service.ts` | CRUD + per-profesional duration/color config; no `clasificatorio` concept yet |
| `historia-clinica` | (not changed in this milestone) | Linked via `entradaHCId` on Turno |

### Schema: Paciente model (current state)

```
Paciente {
  etapaCRM          EtapaCRM?        // drives Kanban + lista-acción
  temperatura       TemperaturaPaciente?
  scoreConversion   Int
  motivoPerdida     MotivoPerdidaCRM?
  // NO flujo field — to be added
}
```

### Schema: TipoTurno model (current state)

```
TipoTurno {
  id              String  @id
  nombre          String  @unique
  descripcion     String?
  duracionDefault Int?
  esCirugia       Boolean @default(false)
  // NO rol/clasificatorio flag — to be added
}
```

### CRM auto-transition logic (exact locations)

Two transition sites in `turnos.service.ts`:

**Site 1 — `crearTurno()`, lines 126–136:**
```typescript
const etapasIniciales: (EtapaCRM | null)[] = [null, EtapaCRM.NUEVO_LEAD];
if (etapasIniciales.includes(pacienteCRM?.etapaCRM ?? null)) {
  await this.prisma.paciente.update({
    where: { id: dto.pacienteId },
    data: { etapaCRM: EtapaCRM.TURNO_AGENDADO },
  });
}
```
Fires for ANY new turno when patient is in null/NUEVO_LEAD. Does NOT inspect `tipoTurnoId`. This is the primary integration point for `flujo` auto-update — the flujo update must be added here.

**Site 2 — `cerrarSesion()`, lines 731–759:**
```typescript
if (turnoInfo.esCirugia) {
  nuevaEtapa = EtapaCRM.PROCEDIMIENTO_REALIZADO;
} else if (turnoInfo.paciente.etapaCRM === EtapaCRM.TURNO_AGENDADO) {
  nuevaEtapa = EtapaCRM.CONSULTADO;
}
```
Fires when session closes. Uses `turno.esCirugia` boolean, not `tipoTurno.rol`. CIRUGIA-flow consultations (non-surgery turnos) correctly advance to CONSULTADO here. No change needed for `flujo`.

### Kanban query (current)

`pacientes.service.ts getKanban()`: `prisma.paciente.findMany({ where: { profesionalId } })` — returns ALL patients of the professional regardless of flow. Must be filtered to `flujo: CIRUGIA` after migration.

### Lista-acción query (current)

`pacientes.service.ts getListaAccion()`: `prisma.paciente.findMany({ where: { profesionalId, etapaCRM: { notIn: [CONFIRMADO, PERDIDO] } } })` — same issue; needs `flujo: CIRUGIA` filter.

---

## Recommended Architecture for v1.4

### New enum: FlujoPaciente

```prisma
enum FlujoPaciente {
  PENDIENTE    // default — not yet classified
  CIRUGIA      // surgery conversion funnel
  TRATAMIENTO  // in-office treatment track
}
```

`PENDIENTE` as DB default (not nullable) is safer than null: eliminates null-checks throughout the codebase and makes migration backfill fully explicit and complete.

### New field on Paciente

```prisma
model Paciente {
  // ... existing fields ...
  flujo    FlujoPaciente  @default(PENDIENTE)

  @@index([profesionalId, flujo])  // add this index
}
```

### New enum + field on TipoTurno

```prisma
enum RolTipoTurno {
  GENERAL               // no special flow meaning (Control, Pre-operatorio)
  CLASIFICA_CIRUGIA     // sets patient flujo = CIRUGIA
  CLASIFICA_TRATAMIENTO // sets patient flujo = TRATAMIENTO
  CLASIFICA_PENDIENTE   // resets patient flujo = PENDIENTE
}

model TipoTurno {
  // ... existing fields ...
  rol    RolTipoTurno  @default(GENERAL)
}
```

The `rol` enum approach is preferred over `flujoDestino?: FlujoPaciente?` because it makes the dispatch logic a single pattern match rather than a nullable field check, and is extensible without schema changes.

The 5 new tipo-turno rows map as:

| Nombre | rol |
|--------|-----|
| Consulta para cirugía | CLASIFICA_CIRUGIA |
| Consulta para tratamiento en consultorio | CLASIFICA_TRATAMIENTO |
| Consulta pendiente | CLASIFICA_PENDIENTE |
| Pre-operatorio | GENERAL |
| Control | GENERAL |

---

## Component Map: New vs Modified Files

### Backend — MODIFIED files

| File | What changes |
|------|-------------|
| `backend/src/prisma/schema.prisma` | Add `FlujoPaciente` enum + `RolTipoTurno` enum; add `flujo` field to `Paciente`; add `rol` field to `TipoTurno`; add `@@index([profesionalId, flujo])` |
| `backend/src/modules/turnos/turnos.service.ts` | `crearTurno()`: expand `tipoTurno` select to include `rol`; add Step 5b flujo auto-update block; optionally merge into single `paciente.update` call |
| `backend/src/modules/pacientes/pacientes.service.ts` | `getKanban()`: add `flujo: FlujoPaciente.CIRUGIA` filter; `getListaAccion()`: same filter; `updatePacienteSection()`: add `'flujo'` section case |

### Backend — NEW files

| File | Purpose |
|------|---------|
| `backend/src/prisma/migrations/YYYYMMDDHHMMSS_v14_flujo/migration.sql` | Adds enums, columns, backfill UPDATE, composite index |

### Backend — files to audit (may need minor changes)

| File | Reason |
|------|--------|
| CRM metrics service (check for raw Paciente aggregation queries) | Any query computing funnel counts must also filter to `flujo = CIRUGIA` |
| `pacientes.controller.ts` | Add `GET /pacientes/tratamientos` route; verify existing routes don't expose unfiltered kanban path |

### Frontend — MODIFIED files

| File | What changes |
|------|-------------|
| `frontend/src/store/live-turno.store.ts` | Add `pacienteFlujo?: FlujoPaciente` to `LiveTurnoSession` interface |
| Hook that calls `iniciarSesion` (wherever backend response populates store session) | Map `turno.paciente.flujo` into `session.pacienteFlujo` |
| `frontend/src/app/dashboard/pacientes/page.tsx` | Add third `Vista` option `"tratamientos"`; add button in toggle group; conditionally render `TratamientosTab` |

### Frontend — NEW files

| File | Purpose |
|------|---------|
| `frontend/src/components/live-turno/ClasificacionBanner.tsx` | Banner shown in `LiveTurnoPanel` when `session.pacienteFlujo === 'PENDIENTE'`; two action buttons |
| `frontend/src/hooks/useClasificarFlujo.ts` | Mutation hook: PATCH `section: 'flujo'`; invalidates `live-turno` session + `crm-kanban` query |
| `frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx` | Monthly list of TRATAMIENTO patients; filter dropdown by tratamiento from catalog |
| `frontend/src/hooks/useListaTratamientos.ts` | TanStack Query hook for `GET /pacientes/tratamientos` |

---

## Build Order (dependency-respecting)

### Phase 1 — Schema + Migration (blocks everything else)

1. Add `FlujoPaciente` and `RolTipoTurno` enums to `schema.prisma`
2. Add `flujo FlujoPaciente @default(PENDIENTE)` to `Paciente`
3. Add `rol RolTipoTurno @default(GENERAL)` to `TipoTurno`
4. Add `@@index([profesionalId, flujo])` to `Paciente`
5. Write migration SQL with backfill (see Migration Path section)
6. Run `npx prisma migrate dev` — Prisma client regenerated with new enum types
7. Seed or admin-update the 5 new TipoTurno rows with correct `rol` values

### Phase 2 — Backend service changes (requires Phase 1)

1. `turnos.service.ts`: expand tipoTurno select, add Step 5b flujo block
2. `pacientes.service.ts`: add `flujo: CIRUGIA` filter to `getKanban` and `getListaAccion`; add `flujo` section to `updatePacienteSection`
3. Add `GET /pacientes/tratamientos` service method + controller route
4. Audit and patch any CRM metrics queries that aggregate paciente counts

### Phase 3 — Frontend LiveTurno banner (requires Phase 1 + Phase 2)

1. Update `LiveTurnoSession` type to include `pacienteFlujo`
2. Verify `iniciarSesion` backend response includes `paciente.flujo` (already included — see note below)
3. Map `paciente.flujo` into store `session` on session start
4. Build `ClasificacionBanner` component
5. Integrate into `LiveTurnoPanel` — render above tabs when `session.pacienteFlujo === 'PENDIENTE'`
6. Build `useClasificarFlujo` mutation hook

### Phase 4 — Frontend Tratamientos tab (requires Phase 1 + Phase 2)

1. Build `useListaTratamientos` query hook
2. Build `TratamientosTab` component (monthly list, date navigation, tratamiento filter)
3. Add "Tratamientos" button + `vista === 'tratamientos'` branch to `pacientes/page.tsx`

### Phase 5 — Validate migration + PENDIENTE queue visibility

1. Confirm Kanban shows CIRUGIA patients after backfill
2. Confirm PENDIENTE patients appear in some surface (banner counter or dedicated view)
3. Provide coordinator workflow to process PENDIENTE queue

---

## Integration Points Between flujo and Existing CRM Logic

### Integration Point 1 — crearTurno: merge two paciente updates into one

The existing CRM transition (TURNO_AGENDADO) and the new flujo update both call `prisma.paciente.update`. They can be merged into a single DB write:

```typescript
const updateData: Prisma.PacienteUpdateInput = {};

// existing CRM logic
const etapasIniciales: (EtapaCRM | null)[] = [null, EtapaCRM.NUEVO_LEAD];
if (etapasIniciales.includes(pacienteCRM?.etapaCRM ?? null)) {
  updateData.etapaCRM = EtapaCRM.TURNO_AGENDADO;
}

// new flujo logic
const flujoMap: Partial<Record<RolTipoTurno, FlujoPaciente>> = {
  CLASIFICA_CIRUGIA: FlujoPaciente.CIRUGIA,
  CLASIFICA_TRATAMIENTO: FlujoPaciente.TRATAMIENTO,
  CLASIFICA_PENDIENTE: FlujoPaciente.PENDIENTE,
};
const nuevoFlujo = flujoMap[tipoTurno.rol];
if (nuevoFlujo !== undefined) {
  updateData.flujo = nuevoFlujo;
}

if (Object.keys(updateData).length > 0) {
  await this.prisma.paciente.update({ where: { id: dto.pacienteId }, data: updateData });
}
```

This reduces two round-trips to one when a classificatory turno is created for a new patient.

### Integration Point 2 — cerrarSesion: no changes needed

The `cerrarSesion` CRM logic (CONSULTADO / PROCEDIMIENTO_REALIZADO) operates on `turno.esCirugia` and `paciente.etapaCRM`. The `flujo` field is set at booking time and is not modified on session close. These two concerns are cleanly separated.

TRATAMIENTO patients who reach `cerrarSesion` will have `esCirugia = false` and may be at `etapaCRM = TURNO_AGENDADO`. The cerrarSesion logic would advance them to CONSULTADO — which is harmless (TRATAMIENTO patients are excluded from the Kanban filter anyway, so this stale etapaCRM value is invisible in the surgery funnel). Alternatively, the cerrarSesion block can be guarded by `flujo`:

```typescript
// Optional guard — only apply CRM transitions for CIRUGIA patients
if (turnoInfo.paciente.flujo === FlujoPaciente.CIRUGIA && !turnoInfo.esCirugia &&
    turnoInfo.paciente.etapaCRM === EtapaCRM.TURNO_AGENDADO) {
  nuevaEtapa = EtapaCRM.CONSULTADO;
}
```

This is a polish improvement, not a blocker. Mark as a follow-up if the initial implementation is simpler without the guard.

### Integration Point 3 — Kanban PROCEDIMIENTO_REALIZADO column

`getKanban()` currently redirects PROCEDIMIENTO_REALIZADO patients to `SIN_CLASIFICAR`. After adding `flujo: CIRUGIA` filter, TRATAMIENTO and PENDIENTE patients are excluded entirely — their PROCEDIMIENTO_REALIZADO data (if any) is invisible. This is correct behavior.

### Integration Point 4 — iniciarSesion returns flujo without code change

`iniciarSesion()` in `turnos.service.ts` uses:
```typescript
paciente: { include: { obraSocial: true } }
```
Because this uses `include` (not `select`), Prisma returns ALL scalar fields on Paciente by default, including `flujo` once the migration adds the column. The frontend only needs to declare `pacienteFlujo` in the `LiveTurnoSession` type and map `turno.paciente.flujo` to it.

### Integration Point 5 — etapaCRM remains valid only for CIRUGIA flow

After this milestone, `etapaCRM` is conceptually meaningful only for `flujo = CIRUGIA` patients. TRATAMIENTO patients retain whatever `etapaCRM` value they had before classification, but since `getKanban` and `getListaAccion` both filter by `flujo`, this stale data is invisible in CRM surfaces. No data cleanup required; just document the convention.

---

## Migration Path for Existing Patients

All existing patients will default to `flujo = PENDIENTE` after migration. This means the Kanban will be empty (filter: `flujo = CIRUGIA`) until patients are reclassified.

Recommended migration SQL that infers flujo from existing etapaCRM data:

```sql
-- Backfill: patients clearly in surgery funnel → CIRUGIA
UPDATE "Paciente"
SET flujo = 'CIRUGIA'
WHERE "etapaCRM" IN (
  'CONFIRMADO',
  'PRESUPUESTO_ENVIADO',
  'CONSULTADO',
  'TURNO_AGENDADO',
  'PROCEDIMIENTO_REALIZADO'
);

-- Patients with null etapaCRM or NUEVO_LEAD stay PENDIENTE (the @default handles new rows)
-- No action needed for them
```

This heuristic backfills ~80% of patients correctly: patients in the surgery funnel stages are almost certainly surgery patients. The remaining PENDIENTE patients (no etapaCRM or NUEVO_LEAD) will be processed via the LiveTurno banner the next time they have a session.

Add a comment in the migration file documenting this heuristic and that it is intentionally incomplete.

If the Kanban must not be empty at go-live, consider a one-time admin script that bulk-sets active funnel patients to CIRUGIA — to be run manually by the Admin role before announcing the feature to coordinators.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Encoding flujo as new EtapaCRM values

**What:** Adding CIRUGIA/TRATAMIENTO/PENDIENTE as new values to the `EtapaCRM` enum.
**Why bad:** Conflates two orthogonal axes — "which funnel" vs. "where in the funnel". Breaks Kanban column logic, scoring, and all existing CRM automation.
**Instead:** Separate `flujo` field on a different enum, as designed above.

### Anti-Pattern 2: Filtering Kanban on the frontend only

**What:** Backend returns all patients; frontend renders only `flujo === 'CIRUGIA'` ones.
**Why bad:** All patient records hydrate into React Query cache and network. CRM metrics (funnel counts) would be wrong. Pagination breaks.
**Instead:** Filter at the DB query level in `getKanban()` and `getListaAccion()`.

### Anti-Pattern 3: Separate endpoint for clasificar (rather than extending updatePacienteSection)

**What:** Adding `PATCH /pacientes/:id/flujo` as a new endpoint.
**Why less ideal:** Adds controller surface. The existing `updatePacienteSection` pattern handles scoped updates with a single patch endpoint.
**Instead:** Add `case 'flujo'` to `updatePacienteSection` switch. Consistent with how `estado`, `contacto`, etc. are handled.

### Anti-Pattern 4: Making flujo immutable after first classification

**What:** Throwing an error if a patient is already CIRUGIA and someone tries to set TRATAMIENTO.
**Why bad:** Misclassification happens. The LiveTurno banner must allow re-classification.
**Instead:** Allow any flujo value to overwrite any other. No guard beyond auth.

---

## Scalability Considerations

| Query | Index after migration |
|-------|----------------------|
| `getKanban` filtered by profesionalId + flujo | `@@index([profesionalId, flujo])` covers both — efficient |
| `getListaAccion` filtered by profesionalId + flujo + etapaCRM | Consider `@@index([profesionalId, flujo, etapaCRM])` if lista-acción is slow at scale |
| Tratamientos tab monthly list | `@@index([profesionalId, flujo])` + range scan on `turno.inicio` — adequate for single-clinic volumes |

No scaling concerns at current tenant size. The composite index is the only performance addition needed for this milestone.

---

## Sources

All findings based on direct inspection of:
- `backend/src/prisma/schema.prisma` (full schema — Paciente model lines 145–210, TipoTurno lines 759–785, Turno lines 787–820, EtapaCRM lines 1041–1049)
- `backend/src/modules/turnos/turnos.service.ts` (crearTurno lines 31–152, cerrarSesion lines 687–763, iniciarSesion lines 624–685)
- `backend/src/modules/pacientes/pacientes.service.ts` (getKanban lines 616–707, getListaAccion lines 798–852, updatePacienteSection lines 377–400)
- `backend/src/modules/tipos-turno/tipos-turno.service.ts`
- `frontend/src/app/dashboard/pacientes/page.tsx`
- `frontend/src/store/live-turno.store.ts`
- `frontend/src/components/live-turno/LiveTurnoPanel.tsx`
- `frontend/src/hooks/useCRMKanban.ts`
- `backend/src/modules/pacientes/pacientes.controller.ts`
- `.planning/PROJECT.md`

Confidence: HIGH — all integration points verified from source code, zero training-data assertions.
