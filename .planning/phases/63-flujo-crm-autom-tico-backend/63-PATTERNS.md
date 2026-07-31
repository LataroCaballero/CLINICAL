# Phase 63: Flujo CRM Automático (Backend) - Pattern Map

**Mapped:** 2026-07-31
**Files analyzed:** 3 existing files (no new files, no schema changes)
**Analogs found:** 3/3 (all in-file — every modification point has an existing sibling that already does the same kind of CRM/flujo mutation)

> This phase edits EXISTING files only. There is nothing to "create from a template". For each
> modification point the executor replicates the **in-file house style** of the nearest sibling
> method that already performs a CRM `etapaCRM` / `flujo` / `temperatura` transition. All three
> services already import the enums needed (`EtapaCRM`, `FlujoPaciente`, `TemperaturaPaciente`,
> `TipoContacto`) — **no new imports required**.

## File Classification

| Modified File | Role | Data Flow | Modification Point(s) | Closest In-File Analog | Match Quality |
|---------------|------|-----------|-----------------------|------------------------|---------------|
| `backend/src/modules/pacientes/pacientes.service.ts` | service method | CRUD (create) | `create()` L53-78 (EMBUDO-07 default); read-only concern: `getKanban()` L620-705 filter, `getListaAccion()` L884-901 filter, `updateFlujo()` L1029-1054 | `create()` itself builds a `data` object; `updateFlujo()` is the analog for `etapaCRM=null` writes | exact (in-file) |
| `backend/src/modules/turnos/turnos.service.ts` | service method | event-driven (turno lifecycle) | `crearTurnoCirugia()` L661-772 (EMBUDO-08 CONFIRMADO); `crearTurno()` L131-158 (D-05 selective degradation guard); `cancelarTurno()` L215-240 (D-07 keep CONFIRMADO + CALIENTE + recontacto) | `cerrarSesion()` L881-911 — the canonical inline CRM-transition block (guarded `nuevaEtapa` + `contactoLog`) | exact (in-file) |
| `backend/src/modules/historia-clinica/historia-clinica.service.ts` + `historia-clinica.flujo.helpers.ts` | service method + pure helper | transform / classify | `resolverNuevoFlujo()` L27-28 (EMBUDO-09 already correct); call site `crearEntrada()` L263-283 | The helper + its call site ARE the pattern — EMBUDO-09 mostly reuses it verbatim | exact (in-file) |

---

## Pattern Assignments

### EMBUDO-07 — `pacientes.service.ts::create()` (service, CRUD)

**Modification point (L53-78) — current code has NO CRM defaulting:**
```typescript
async create(dto: CreatePacienteDto) {
  console.log('DTO RECIBIDO:', dto);
  try {
    const data = {
      ...dto,
      fechaNacimiento: dto.fechaNacimiento
        ? new Date(dto.fechaNacimiento)
        : null,
      fechaIndicaciones: dto.fechaIndicaciones
        ? new Date(dto.fechaIndicaciones)
        : null,
    };
    return this.prisma.paciente.create({ data });
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('dni')) {
      throw new ConflictException('El DNI ingresado ya está registrado.');
    }
    throw new InternalServerErrorException('Error interno al crear paciente');
  }
}
```

**House-style pattern to replicate:** the existing `data` object already conditionally derives fields
(the `? … : null` ternaries). Add the CRM default the **same inline way** — a
"respect-override-else-default" expression inside the same `data` literal. D-01 says default only when
the DTO does not carry an explicit `etapaCRM`:
```typescript
etapaCRM: dto.etapaCRM ?? EtapaCRM.NUEVO_LEAD,   // EMBUDO-07 / D-01
```
`EtapaCRM` is **already imported** (L20). `EtapaCRM.NUEVO_LEAD` exists (schema L1167-1175).

**D-03 visibility concern (the load-bearing part — read-only analogs):**
- `getKanban()` L622-626 filters `OR: [{ flujo: FlujoPaciente.CIRUGIA }, { flujo: null }]`:
  ```typescript
  where: {
    profesionalId,
    crmArchivado: false,
    OR: [{ flujo: FlujoPaciente.CIRUGIA }, { flujo: null }],
  },
  ```
  A brand-new paciente takes `flujo @default(PENDIENTE)` (schema Paciente L152-232) → **excluded** from
  the board. The column bucket exists (`NUEVO_LEAD: []` at L689), so the *only* gap is the `where` filter.
- `getListaAccion()` L884-893 uses the **same** `OR: [{ flujo: CIRUGIA }, { flujo: null }]` filter — any
  fix to board visibility must stay consistent across both queries.

**Planner note:** two viable mechanisms (Claude's Discretion, D-03):
1. Default the lead's `flujo` to `null` on create (leaves `getKanban`/`getListaAccion` untouched), OR
2. Add `{ flujo: FlujoPaciente.PENDIENTE }` to the `OR` filter in both `getKanban` and `getListaAccion`.
Option 1 is the smaller, lower-blast-radius change and matches the existing "board shows `flujo ∈ {CIRUGIA,null}`" invariant; option 2 changes board semantics for ALL pending patients. Prefer option 1 unless research says otherwise.

---

### EMBUDO-08 — `turnos.service.ts` (service, event-driven)

**Canonical in-file analog for ALL CRM writes in this file — `cerrarSesion()` L881-911:**
```typescript
// CRM auto-transition on cerrar sesion
if (turnoInfo) {
  let nuevaEtapa: EtapaCRM | null = null;
  let notaContacto: string | null = null;

  if (turnoInfo.esCirugia) {
    nuevaEtapa = EtapaCRM.PROCEDIMIENTO_REALIZADO;
    notaContacto = 'Procedimiento realizado';
  } else if (turnoInfo.paciente.etapaCRM === EtapaCRM.TURNO_AGENDADO) {
    nuevaEtapa = EtapaCRM.CONSULTADO;
    notaContacto = 'Esperando presupuesto';
  }

  if (nuevaEtapa) {
    await this.prisma.paciente.update({
      where: { id: turnoInfo.pacienteId },
      data: { etapaCRM: nuevaEtapa },
    });
    if (turnoInfo.profesionalId && notaContacto) {
      await this.prisma.contactoLog.create({
        data: {
          pacienteId: turnoInfo.pacienteId,
          profesionalId: turnoInfo.profesionalId,
          tipo: TipoContacto.SISTEMA,
          nota: notaContacto,
        },
      });
    }
  }
}
```
This is the exact shape to copy: guarded `nuevaEtapa`/`notaContacto`, single `paciente.update`, and a
`contactoLog.create` with `tipo: TipoContacto.SISTEMA`. All enums already imported (L11-19).

**D-04 — set `CONFIRMADO` in `crearTurnoCirugia()` L725-772:** the method already runs a
`this.prisma.$transaction(async (tx) => { … })` that creates `cirugia` then `turno`. Add the CRM write
**inside the same tx**, after the turno create, using `tx.paciente.update`:
```typescript
await tx.paciente.update({
  where: { id: dto.pacienteId },
  data: { etapaCRM: EtapaCRM.CONFIRMADO },   // EMBUDO-08 / D-04 — no depende de presupuesto
});
```
`EstadoCirugia.PROGRAMADA` / `EtapaCRM.CONFIRMADO` (schema L1167-1175) both exist. Optionally append a
`tx.contactoLog.create({ … tipo: TipoContacto.SISTEMA … })` to match the `cerrarSesion` sibling.

**D-05/D-06 — selective degradation guard in `crearTurno()` L131-158 (current code degrades ALWAYS):**
```typescript
// 5) CRM auto-transition: un nuevo turno SIEMPRE reactiva a TURNO_AGENDADO
const pacienteCRM = await this.prisma.paciente.findUnique({
  where: { id: dto.pacienteId },
  select: { etapaCRM: true, profesionalId: true, flujo: true },
});
await this.prisma.paciente.update({
  where: { id: dto.pacienteId },
  data: { etapaCRM: EtapaCRM.TURNO_AGENDADO },
});
```
The `findUnique` already selects `etapaCRM` — the guard has the data it needs. Replicate `cerrarSesion`'s
guarded style: only degrade to `TURNO_AGENDADO` when it's NOT an advanced etapa, **except** when the
turno's `tipoTurno.nombre === 'Consulta'` (D-06 — `nombre` is `@unique`, no `esConsulta` flag). Requires
adding `nombre: true` to the `tipoTurno.findUnique` select at L52-55 (currently selects
`id, duracionDefault, flujoPaciente`). Sketch:
```typescript
const esConsulta = tipoTurno.nombre === 'Consulta';           // D-06
const etapaAvanzada =
  pacienteCRM?.etapaCRM === EtapaCRM.CONFIRMADO ||
  pacienteCRM?.etapaCRM === EtapaCRM.PROCEDIMIENTO_REALIZADO;
if (esConsulta || !etapaAvanzada) {
  await this.prisma.paciente.update({
    where: { id: dto.pacienteId },
    data: { etapaCRM: EtapaCRM.TURNO_AGENDADO },              // D-05
  });
}
```

**D-07 — cancel/suspend surgery in `cancelarTurno()` L215-240 (current code touches only the turno):**
```typescript
async cancelarTurno(turnoId: string) {
  const turno = await this.prisma.turno.findUnique({
    where: { id: turnoId },
    select: { id: true, estado: true },          // ← must add esCirugia, pacienteId, profesionalId
  });
  if (!turno) throw new NotFoundException('Turno no encontrado.');
  if (turno.estado === EstadoTurno.CANCELADO || turno.estado === EstadoTurno.FINALIZADO) {
    throw new BadRequestException(`No se puede cancelar un turno en estado ${turno.estado}.`);
  }
  return this.prisma.turno.update({
    where: { id: turnoId },
    data: { estado: EstadoTurno.CANCELADO },
  });
}
```
Pattern: `cerrarSesion` L861-869 already shows how to widen the `select` to fetch
`esCirugia, pacienteId, profesionalId` before a CRM side-effect. Apply D-07 **only when `turno.esCirugia`**:
- **keep** `etapaCRM = CONFIRMADO` (do NOT downgrade — no write to etapaCRM),
- set `temperatura = TemperaturaPaciente.CALIENTE` (enum exists, schema L1177-1181; the existing
  `actualizarTemperatura`-style write at pacientes.service L614-617 `data: { temperatura }` is the shape),
- mark the recontacto signal (mechanism = Claude's Discretion, D-07).

**D-07 recontacto surfacing (read-only analog) — `pacientes.service.ts::getListaAccion()` L884-893:**
```typescript
etapaCRM: { notIn: ['CONFIRMADO', 'PERDIDO'] as EtapaCRM[] },
```
This is what currently HIDES a `CONFIRMADO` patient from the action list. D-07 needs an **exception** so a
cancelled-surgery `CONFIRMADO` patient reappears. Two mechanisms (Claude's Discretion):
1. Persisted flag `requiereRecontacto` on `Paciente` — BUT schema changes are Out of Scope, so a flag
   would need an existing column; verify before choosing.
2. Derive by query: OR-in patients who have a `CANCELADA`/`SUSPENDIDA` cirugía and no future cirugía,
   e.g. relax the `notIn` with an `OR` branch. This is schema-free and matches the existing filter-composition
   style in this method.
Prefer the derived-query approach (no schema change; Out of Scope forbids migrations). The badge TEXT
("Cirugía cancelada, recontactar") is **Phase 64** — backend only exposes state.

---

### EMBUDO-09 — `historia-clinica` (helper + service, transform)

**The pattern already exists and is already correct for D-09 — `historia-clinica.flujo.helpers.ts` L27-28:**
```typescript
if (tipoEntrada === 'TRATAMIENTO') {
  return flujoActual === 'PENDIENTE' ? 'TRATAMIENTO' : null; // HC-04 (CIRUGIA → null, dual-state preservado)
}
```
`resolverNuevoFlujo` ALREADY maps `TRATAMIENTO + PENDIENTE → TRATAMIENTO` and leaves `CIRUGIA` untouched
(D-09 exactly: a surgical candidate receiving an in-office treatment stays on the board). **No change to
the helper is expected** unless research finds the trigger doesn't reach it.

**Call site — `crearEntrada()` L263-283 (already wired):**
```typescript
const pac = await tx.paciente.findUnique({
  where: { id: pacienteId },
  select: { flujo: true },
});
const nuevoFlujo = resolverNuevoFlujo(
  dto.tipoEntrada,
  pac?.flujo,
  turnoCtx?.esCirugia ?? false,
);

if (diagnosticoStr !== null || tratamientoStr !== null || nuevoFlujo) {
  await tx.paciente.update({
    where: { id: pacienteId },
    data: {
      ...(diagnosticoStr !== null && { diagnostico: diagnosticoStr }),
      ...(tratamientoStr !== null && { tratamiento: tratamientoStr }),
      ...(nuevoFlujo && { flujo: nuevoFlujo }),
    },
  });
}
```

**D-08 trigger wiring — the real gap:** the discriminator inside `crearEntrada` is `dto.tipo` (L96-124:
`'primera_vez' | 'pre_quirurgico' | 'tratamiento_en_consultorio' | …`), but `resolverNuevoFlujo` reads
`dto.tipoEntrada` (the `TipoEntradaHC` enum). The bridge is L248-251:
```typescript
tipoEntrada:
  dto.tipo === 'pre_quirurgico'
    ? 'PREOPERATORIO'
    : (dto.tipoEntrada ?? undefined),
```
For EMBUDO-09 to fire, a `dto.tipo === 'tratamiento_en_consultorio'` entry must resolve to
`tipoEntrada = 'TRATAMIENTO'` (D-08). Today that depends on the client passing `dto.tipoEntrada`. Planner
should ensure `tratamiento_en_consultorio` maps to `'TRATAMIENTO'` the **same forced way** `pre_quirurgico`
forces `'PREOPERATORIO'` at L248-251 — i.e. extend that ternary rather than trusting the client. This is
the minimal, house-style hook. `TipoEntradaHC.TRATAMIENTO` exists (schema L1199-1205).

**D-10 (salida del board + planilla) — no new code:**
- Board hide is automatic: once `flujo = TRATAMIENTO`, `getKanban()` L625 filter
  `OR: [{ flujo: CIRUGIA }, { flujo: null }]` already excludes it (patrón v1.13).
- Planilla date is already persisted: `HistoriaClinicaEntrada.fecha` (retroactive-capable, validated
  L138-154) + `contenido.tratamientos` snapshot (L198-202). No schema change.
- `etapaCRM = null` cleanup — analog is `pacientes.service.ts::updateFlujo()` L1036-1053:
  ```typescript
  return this.prisma.$transaction([
    this.prisma.paciente.update({
      where: { id },
      data: { flujo, etapaCRM: null },
    }),
    ...(paciente.profesionalId
      ? [ this.prisma.contactoLog.create({ data: {
            pacienteId: id, profesionalId: paciente.profesionalId,
            tipo: TipoContacto.SISTEMA, nota: 'Paciente pendiente de clasificación' } }) ]
      : []),
  ]);
  ```
  This is the reference for pairing `flujo` write with `etapaCRM: null`. In `crearEntrada`, the executor
  should extend the existing `tx.paciente.update` at L275-282 to also clear `etapaCRM` when
  `nuevoFlujo === 'TRATAMIENTO'` (matching `updateFlujo`'s "leaving the board clears the etapa" invariant),
  rather than adding a separate write.

---

## Shared Patterns

### CRM etapaCRM transition (inline, guarded)
**Canonical source:** `turnos.service.ts::cerrarSesion()` L881-911.
**Apply to:** EMBUDO-08 (`crearTurnoCirugia`, `crearTurno` guard, `cancelarTurno`), and any etapaCRM write.
**Rules to copy:** compute a nullable `nuevaEtapa`, guard the write behind it, use `paciente.update` for the
etapa, and log via `contactoLog.create({ tipo: TipoContacto.SISTEMA, nota })`. When already inside a
`$transaction`, use the `tx.*` client (as `crearTurnoCirugia` and `crearEntrada` do) — never open a nested tx.

### flujo transition via pure helper
**Source:** `historia-clinica.flujo.helpers.ts::resolverNuevoFlujo()` + call site L263-283.
**Apply to:** EMBUDO-09.
**Rule:** flujo classification stays in the pure, unit-tested helper; the service only computes `nuevoFlujo`
and spreads it conditionally into a single `paciente.update`. Do not inline new `if (tipoEntrada === …)`
branches in the service — extend the helper.

### `flujo` + `etapaCRM: null` coupling on board exit
**Source:** `pacientes.service.ts::updateFlujo()` L1036-1053.
**Apply to:** EMBUDO-09 D-10 (and conceptually any "leaves the board" transition).
**Rule:** whenever `flujo` moves to a board-hiding value (`TRATAMIENTO`), clear `etapaCRM` to `null` in the
same update, mirroring `updateFlujo`.

### contactoLog audit trail
**Source:** every CRM mutation above writes a `contactoLog` with `tipo: TipoContacto.SISTEMA` and a Spanish
`nota`. **Apply to:** all three EMBUDOs where a state change occurs, for consistency with the existing audit
trail (e.g. 'Procedimiento realizado', 'Esperando presupuesto', 'Paciente pendiente de clasificación').

### Board / action-list filter invariant
**Source:** `getKanban()` L625 and `getListaAccion()` L893 both use
`OR: [{ flujo: FlujoPaciente.CIRUGIA }, { flujo: null }]` and `etapaCRM notIn ['CONFIRMADO','PERDIDO']`.
**Apply to:** D-03 (lead visibility) and D-07 (recontacto surfacing) — any change here MUST keep the two
queries consistent, or intentionally diverge with a documented reason.

---

## No Analog Found

None. Every modification point has an in-file sibling that already performs the same class of mutation. The
only genuinely *new* logic is the **D-07 "requiere recontacto" surfacing mechanism** — there is no existing
"revive a CONFIRMADO patient into the action list" pattern, so the planner must design it (schema-free,
per Out of Scope), using the `getListaAccion` filter as the extension point.

## Metadata

**Analog search scope:** `backend/src/modules/{pacientes,turnos,historia-clinica}`
**Files scanned:** 4 (`pacientes.service.ts`, `turnos.service.ts`, `historia-clinica.service.ts`, `historia-clinica.flujo.helpers.ts`)
**Pattern extraction date:** 2026-07-31
