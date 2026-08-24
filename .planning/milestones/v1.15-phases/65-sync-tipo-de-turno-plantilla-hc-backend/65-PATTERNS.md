# Phase 65: Sync Tipo de Turno ↔ Plantilla HC (Backend) - Pattern Map

**Mapped:** 2026-08-04
**Files analyzed:** 3 (1 new helper, 1 modified service, 1 modified/extended test file)
**Analogs found:** 3 / 3

Backend-pure phase. No schema, no frontend, no new module. All work happens inside the existing `historia-clinica` module, extending files already touched in Phase 63.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts` (add `resolverTipoTurnoSync`) | utility (pure function) | transform | same file — `resolverNuevoFlujo` / `resolverTipoEntrada` (already present) | exact |
| `backend/src/modules/historia-clinica/historia-clinica.service.ts` (`crearEntrada`, add `turno.update` call) | service | CRUD (guarded conditional write) | same file — existing `tx.paciente.update(...)` flujo-write block (lines 270-293) + `turnos.service.ts` `prisma.turno.update` calls | exact (in-file) / role-match (turno.update shape) |
| `backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts` (add `describe('resolverTipoTurnoSync', ...)` block + wiring tests) | test | transform / CRUD-wiring | same file — existing `describe('resolverNuevoFlujo', ...)` table tests + `describe('HistoriaClinicaService.crearEntrada — wiring ...')` block | exact |

All three target files already exist and were touched by Phase 63 — this phase extends them in place; no new files, no new test file.

---

## Pattern Assignments

### `backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts` (utility, transform)

**Analog:** same file, `resolverTipoEntrada` (lines 47-54) and `resolverNuevoFlujo` (lines 18-35) — this is the established "pure helper, no NestJS/Prisma imports, plain string/boolean args, returns nullable discriminated value" pattern used for exactly this kind of derived-state logic.

**File header / doc-comment pattern** (lines 1-4):
```typescript
/**
 * Pure helpers for HC entry flow classification logic.
 * Extracted to a separate file to enable direct unit testing without NestJS/Prisma imports.
 */
```
`resolverTipoTurnoSync` should follow with its own JSDoc block describing the priority-ladder rules (D-01/D-02/D-03), same style as the doc-comment above `resolverNuevoFlujo` (lines 6-17).

**Core pattern — signature + guard-first structure** (lines 18-35):
```typescript
export function resolverNuevoFlujo(
  tipoEntrada: string | undefined,
  flujoActual: string | null | undefined,
  esCirugia: boolean,
): 'CIRUGIA' | 'TRATAMIENTO' | null {
  if (esCirugia) return null; // Criterio 5: turnos cirugía omiten cambio de flujo por tipoEntrada
  if (!tipoEntrada) return null;
  if (tipoEntrada === 'CONSULTA_CIRUGIA') {
    return flujoActual === 'PENDIENTE' ? 'CIRUGIA' : null; // HC-03
  }
  if (tipoEntrada === 'TRATAMIENTO') {
    return flujoActual === 'PENDIENTE' || flujoActual == null
      ? 'TRATAMIENTO'
      : null;
  }
  return null; // CONTROL / SEGUIMIENTO / PREOPERATORIO: no-op
}
```
This is the exact shape to mirror for `resolverTipoTurnoSync`: guard on the "protected" sentinel first (here `esCirugia`; there also `esCirugia` per D-02), early-return `null` for the no-op case, then discriminate on the input tag (`tipoEntrada` here → `dto.tipo`/plantilla there), each branch computing based on current-state comparison (here `flujoActual`; there `currentTipoNombre` mapped to rank).

**Second helper for reference — discriminator-to-output mapping** (lines 47-54):
```typescript
export function resolverTipoEntrada(
  tipo: string | undefined,
  tipoEntradaDto: string | undefined,
): string | undefined {
  if (tipo === 'pre_quirurgico') return 'PREOPERATORIO';
  if (tipo === 'tratamiento_en_consultorio') return 'TRATAMIENTO';
  return tipoEntradaDto ?? undefined;
}
```
Shows the established "map `dto.tipo` string literal → canonical output string" style (D-07's plantilla→TipoTurno.nombre map should follow this same flat if/return chain, not a lookup object, to match house style — though either is acceptable since this is Claude's Discretion).

**Suggested signature for the new helper** (per CONTEXT.md D-01/D-02/D-03, Claude's Discretion section):
```typescript
export function resolverTipoTurnoSync(
  plantilla: string | undefined,       // dto.tipo
  currentTipoNombre: string | null | undefined,
  currentEsCirugia: boolean,
): string | null {
  // rank ladder: Consulta=1, Tratamiento=2, Pre-Quirúrgico=3; unmapped/null=0
  // Cirugía (currentEsCirugia===true) → always null (D-02 sentinel, checked first — same guard-first style as resolverNuevoFlujo's esCirugia check)
}
```

**Export re-export convention** — `historia-clinica.service.ts` lines 15-16:
```typescript
// Re-export so existing imports from this file still work
export { resolverNuevoFlujo, resolverTipoEntrada };
```
If `resolverTipoTurnoSync` is imported into the service, follow the same import block style (named import from `./historia-clinica.flujo.helpers`, see lines 5-8 of the service) — re-export is optional unless another module needs to import it via the service file.

---

### `backend/src/modules/historia-clinica/historia-clinica.service.ts` — `crearEntrada` (service, CRUD)

**Analog for the pre-fetch + guard pattern:** same file, `turnoCtx` pre-fetch (lines 227-233):
```typescript
// Pre-fetch turno.esCirugia outside tx (pgBouncer pattern — same as other pre-fetches)
const turnoCtx = dto.turnoId
  ? await this.prisma.turno.findUnique({
      where: { id: dto.turnoId },
      select: { esCirugia: true },
    })
  : null;
```
This is the exact guard shape to reuse for D-09 (`dto.turnoId` presence gate). The sync will need to additionally select `tipoTurno: { select: { nombre: true } }` (or a separate `tipoTurnoId`) on this same pre-fetch to get `currentTipoNombre` — extending this query is preferable to adding a second round-trip, per the file's own "pgBouncer pattern — same as other pre-fetches" comment (avoid nested queries inside the interactive transaction).

**Analog for conditional write inside the transaction:** same file, the `paciente.update` flujo-write block (lines 270-293):
```typescript
// Resolve flujo transition (tipoEntrada classification logic)
const pac = await tx.paciente.findUnique({
  where: { id: pacienteId },
  select: { flujo: true },
});
const nuevoFlujo = resolverNuevoFlujo(
  tipoEntradaResuelto,
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
      ...(nuevoFlujo === 'TRATAMIENTO' && { etapaCRM: null }),
    },
  });
}
```
This is the pattern to mirror for the new turno-sync write: call the pure resolver first (outside/at the top of the tx callback body), then guard the `tx.turno.update(...)` call on the resolver's non-null result — **and** additionally on `dto.turnoId` being present (D-09), since unlike `paciente.update` (always runs), the turno update has no ID to target without `turnoId`. The whole thing must live inside the `this.prisma.$transaction(async (tx) => { ... })` block (starts at line 244) per the "Claude's Discretion — Atomicidad" note, using `tx.turno.update(...)` (not `this.prisma.turno.update(...)`) so it commits atomically with the entrada creation.

**Where to resolve the destination `TipoTurno.id` by `nombre`** — analog `turnos.service.ts` lines 47-65 (`tipoTurno.findUnique({ where: { id } })`) and lines 745-747 (`tipoTurno.findFirst({ where: { esCirugia: true } })`):
```typescript
// turnos.service.ts:745-747 — lookup-by-flag pattern (adapt to lookup-by-nombre)
let tipoTurnoCirugia = await this.prisma.tipoTurno.findFirst({
  where: { esCirugia: true },
});
```
For this phase: `prisma.tipoTurno.findUnique({ where: { nombre: 'Consulta' | 'Tratamiento' | 'Pre-Quirúrgico' } })` — `nombre` is `@unique` (schema.prisma:794) so `findUnique` is correct, not `findFirst`. Per Claude's Discretion ("comportamiento defensivo si el tipo destino no existe"), wrap in a null-check that skips the sync silently (do not throw) if not found — no existing analog throws here since `TipoTurno` is seeded and assumed to exist, but the defensive check is cheap insurance.

**`prisma.turno.update` scoped-by-id shape** — analog `turnos.service.ts` lines 298-303 and 325-330 (simplest cases):
```typescript
return this.prisma.turno.update({
  where: { id: turnoId },
  data: {
    estado: EstadoTurno.CANCELADO,
  },
});
```
Adapt as `tx.turno.update({ where: { id: dto.turnoId }, data: { tipoTurnoId: destino.id, esCirugia: destino.esCirugia } })` (D-05) — scoped only by `{ id }`, no tenant filter (single-tenant, per canonical_refs "Nota de arquitectura").

**Anti-pattern to avoid** — `turnos.service.ts` lines 140-176 (`crearTurno`'s CRM/flujo side-effects triggered by `tipoTurno.nombre === 'Consulta'` and `tipoTurno.flujoPaciente`):
```typescript
const esConsulta = tipoTurno.nombre === 'Consulta'; // D-06
...
if (esConsulta || !etapaAvanzada) {
  await this.prisma.paciente.update({
    where: { id: dto.pacienteId },
    data: { etapaCRM: EtapaCRM.TURNO_AGENDADO },
  });
}
if (tipoTurno.flujoPaciente && pacienteCRM?.flujo === FlujoPaciente.PENDIENTE) {
  this.prisma.paciente.update({ where: { id: dto.pacienteId }, data: { flujo: tipoTurno.flujoPaciente } })...
}
```
Per D-06, the new sync must **not** replicate this — no `paciente.flujo`/`etapaCRM` writes triggered from `crearEntrada`'s turno-sync branch. `crearEntrada` already has its own, separate `resolverNuevoFlujo`-driven paciente-flujo write (lines 270-293) which must stay untouched/independent from the new turno write.

**Imports block to extend** (lines 1-16):
```typescript
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, TipoEntradaHC } from '@prisma/client';
import { CreateEntradaDto } from './dto/crear-entrada.dto';
import {
  resolverNuevoFlujo,
  resolverTipoEntrada,
} from './historia-clinica.flujo.helpers';
```
Add `resolverTipoTurnoSync` to this same named-import block from `./historia-clinica.flujo.helpers`.

---

### `backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts` (test, transform + CRUD-wiring)

**Analog for pure-function table tests:** same file, `describe('resolverNuevoFlujo', ...)` (lines 10-71) — one `it(...)` per rule combination, descriptive Spanish test names stating input→output, using plain `expect(fn(...)).toBe(...)` / `.toBeNull()`:
```typescript
it('CONSULTA_CIRUGIA + PENDIENTE → CIRUGIA', () => {
  expect(resolverNuevoFlujo('CONSULTA_CIRUGIA', 'PENDIENTE', false)).toBe(
    'CIRUGIA',
  );
});
```
Mirror this exactly for `resolverTipoTurnoSync`: one `describe('resolverTipoTurnoSync', ...)` block, one `it` per CONTEXT.md rule (Primera vez no-op-if-already-Consulta, Tratamiento-over-Consulta, Tratamiento-over-Control, Tratamiento-no-degrade-over-PreQuirúrgico, PreQuirúrgico-always-except-Cirugia, Cirugía-protected-sentinel-always-null, unmapped-current-type-rank-0, etc.) — CONTEXT.md's "Resultado por plantilla frente al tipo actual" table (lines 26-29) is effectively the test-case spec.

**Analog for service-wiring integration tests:** same file, `describe('HistoriaClinicaService.crearEntrada — wiring D-08/D-09/D-10', ...)` (lines 99-230) — mock `PrismaService` with `$transaction` running the callback synchronously against the mock, then assert on the mock call args:
```typescript
mockPrisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
  cb(mockPrisma),
);
...
it('tratamiento_en_consultorio fuerza tipoEntrada=TRATAMIENTO independiente de dto.tipoEntrada (D-08)', async () => {
  mockPrisma.paciente.findUnique.mockResolvedValue({ flujo: 'PENDIENTE' });
  await service.crearEntrada(PACIENTE_ID, { tipo: 'tratamiento_en_consultorio', tipoEntrada: 'CONTROL' } as never, PROFESIONAL_ID);
  expect(mockPrisma.historiaClinicaEntrada.create).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ tipoEntrada: 'TRATAMIENTO' }) }),
  );
});
```
Mirror this shape for the new turno-sync wiring tests: extend the `mockPrisma` object (lines 104-131) with a `turno: { findUnique: jest.fn(), update: jest.fn() }` entry, then assert `mockPrisma.turno.update` was/wasn't called with the expected `tipoTurnoId`/`esCirugia` — one test per: (a) `turnoId` present + upgrade fires, (b) `turnoId` present + no-op (already at/above rank — no `update` call), (c) `turnoId` absent (guard D-09 — no `turno.update`/`turno.findUnique` call at all), (d) `esCirugia: true` current turno → never touched regardless of plantilla.

**Imports to extend** (lines 1-8):
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import {
  resolverNuevoFlujo,
  resolverTipoEntrada,
} from './historia-clinica.flujo.helpers';
import { HistoriaClinicaService } from './historia-clinica.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CatalogoHCService } from '../catalogo-hc/catalogo-hc.service';
```
Add `resolverTipoTurnoSync` to the named import from `./historia-clinica.flujo.helpers`.

---

## Shared Patterns

### Guard on `dto.turnoId` presence (D-09)
**Source:** `historia-clinica.service.ts` lines 227-233 (existing `turnoCtx` pre-fetch)
**Apply to:** the new pre-fetch extension (to also select current `tipoTurno.nombre`) and the new `tx.turno.update` call — both must be `dto.turnoId ? ... : null`/no-op, exact same ternary-guard idiom already established in this function.

### Pure resolver function style (guard-first, discriminate, no Prisma/Nest imports)
**Source:** `historia-clinica.flujo.helpers.ts` lines 18-54 (`resolverNuevoFlujo`, `resolverTipoEntrada`)
**Apply to:** `resolverTipoTurnoSync` — same file, same export style, testable without mocks.

### `tx.*` vs `this.prisma.*` inside `crearEntrada`'s transaction
**Source:** `historia-clinica.service.ts` lines 244-371 (`this.prisma.$transaction(async (tx) => { ... tx.historiaClinicaEntrada.create / tx.paciente.update / tx.paciente.findUnique ... })`)
**Apply to:** the new `tx.turno.update(...)` call — must use `tx`, not `this.prisma`, to stay inside the same atomic transaction (Claude's Discretion — Atomicidad).

### `TipoTurno` lookup by unique `nombre`
**Source:** `turnos.service.ts` lines 57-65 (lookup by `id`) and 745-747 (lookup by `esCirugia` flag) — adapt to lookup by `nombre` (schema.prisma:794, `@unique`)
**Apply to:** resolving the destination `TipoTurno.id` for `'Consulta'` / `'Tratamiento'` / `'Pre-Quirúrgico'` inside `crearEntrada`.

### Anti-pattern: do not couple turno-type changes to `paciente.flujo`/`etapaCRM`
**Source:** `turnos.service.ts` lines 140-176 (`crearTurno`) — explicitly called out in CONTEXT.md as "NO a duplicar" (D-06)
**Apply to:** keep the new turno-sync write fully separate from the existing `resolverNuevoFlujo`-driven `paciente.update` block in `crearEntrada` (lines 270-293) — no new coupling between the two.

## No Analog Found

None — all three target files have direct, in-file or same-module analogs. No new files, no new patterns needed from outside `historia-clinica`/`turnos` modules.

## Metadata

**Analog search scope:** `backend/src/modules/historia-clinica/`, `backend/src/modules/turnos/`, `backend/src/prisma/schema.prisma`
**Files scanned:** `historia-clinica.flujo.helpers.ts`, `historia-clinica.flujo.spec.ts`, `historia-clinica.service.ts`, `historia-clinica.contenido.spec.ts` (name-only), `turnos.service.ts`, `dto/crear-entrada.dto.ts`, `schema.prisma` (TipoTurno/Turno models)
**Pattern extraction date:** 2026-08-04
