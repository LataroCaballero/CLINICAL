# Phase 39: CRM Tech Debt — Guard & Ordering Fixes - Research

**Researched:** 2026-05-28
**Domain:** NestJS service guard logic (backend) + React stepper ordering (frontend) + Prisma query selection (backend)
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TD-1 | `rechazar()` en presupuestos.service.ts aplica guard `etapasProtegidas` igual que `rechazarByToken()` — sin esto, staff puede sobreescribir etapas avanzadas | The exact guard pattern already exists in `rechazarByToken()` lines 671-675; copy verbatim into `rechazar()` replacing the unconditional update |
| TD-2 | `STEPPER_CHAIN` en EtapaStepper.tsx alineado con `ETAPA_ORDEN` backend: `CONFIRMADO(5) → PROCEDIMIENTO_REALIZADO(6)` (actualmente invertido) | STEPPER_CHAIN lines 8-16 show PROCEDIMIENTO_REALIZADO at index 5, CONFIRMADO at index 6 — swap these two entries |
| TD-3 | `getKanban` prioriza presupuesto ACEPTADO sobre el más reciente para evitar falso positivo en warning CRM-03 | `getKanban` uses `take: 1, orderBy: createdAt desc` — change to fetch all non-RECHAZADO presupuestos, pick ACEPTADO if present, else most recent |
</phase_requirements>

---

## Summary

Phase 39 closes three behavioral asymmetries found by the v1.7 audit. All three are surgical, isolated changes — no new models, no new components, no new routes.

**TD-1** is a security gap: `rechazar()` (staff path, requires auth) unconditionally writes `etapaCRM = PERDIDO` even when the patient is already in CONFIRMADO or PROCEDIMIENTO_REALIZADO. The sibling method `rechazarByToken()` (public path) already has the correct guard (`etapasProtegidas` list + conditional transaction leg). The fix is to replicate that same pattern into `rechazar()`.

**TD-2** is a visual consistency bug: `STEPPER_CHAIN` in `EtapaStepper.tsx` has `PROCEDIMIENTO_REALIZADO` at index 5 and `CONFIRMADO` at index 6 — the opposite of `ETAPA_ORDEN` in the backend (CONFIRMADO=5, PROCEDIMIENTO_REALIZADO=6). A user in CONFIRMADO currently sees "Procedimiento Realizado" as a past step and "Confirmado" as current, which is wrong. Fix is a two-entry swap in the constant.

**TD-3** is a false-positive CRM warning: `getKanban` fetches `take: 1` most-recent presupuesto. A patient with an old ACEPTADO presupuesto and a newer BORRADOR/RECHAZADO one will have the BORRADOR/RECHAZADO returned, causing `getEtapaWarning` to fire the CONFIRMADO warning even though the patient's acceptance is valid. Fix: fetch all non-RECHAZADO presupuestos, pick ACEPTADO if one exists, else fall back to most-recent.

**Primary recommendation:** Implement in order TD-1 (backend guard), TD-2 (frontend swap), TD-3 (backend query) — each is one commit.

---

## Standard Stack

No new libraries introduced. All changes use existing project primitives.

| Area | Existing Tool | Usage |
|------|--------------|-------|
| Backend guard | Plain TypeScript array + conditional spread | Already used in `rechazarByToken()` and `aceptar()` |
| Prisma conditional transaction | `[...maybeCRMUpdate]` spread pattern | Established pattern in this codebase |
| Frontend constant | TypeScript array literal | `STEPPER_CHAIN` in EtapaStepper.tsx |
| Backend query | Prisma `findMany` with `where` filter | `getKanban` in pacientes.service.ts |

---

## Architecture Patterns

### Pattern already used: Conditional transaction leg

The codebase already has a clean pattern for "maybe update CRM, maybe not" inside a `$transaction`:

```typescript
// Source: presupuestos.service.ts — rechazarByToken() lines 671-675
const etapasProtegidas: EtapaCRM[] = [EtapaCRM.CONFIRMADO, EtapaCRM.PROCEDIMIENTO_REALIZADO];
const bloqueado = paciente?.etapaCRM != null && etapasProtegidas.includes(paciente.etapaCRM);
const maybeCRMUpdate = bloqueado
  ? []
  : [this.prisma.paciente.update({ where: { id: presupuesto.pacienteId }, data: { etapaCRM: EtapaCRM.PERDIDO } })];

await this.prisma.$transaction([
  // ...other ops...
  ...maybeCRMUpdate,
]);
```

This is the exact same pattern used in `aceptar()` and `marcarEnviado()` for the forward-only guard (`isAutoTransitionBlocked`). TD-1 replicates it for `rechazar()`.

### Pattern already used: Query + in-memory selection

For TD-3 the preferred approach is to widen the `presupuestos` sub-query to fetch all active presupuestos and pick the best one in-memory inside the `.map()`:

```typescript
// In getKanban presupuesto sub-query — change from:
presupuestos: {
  select: { total: true, estado: true, fechaEnviado: true },
  orderBy: { createdAt: 'desc' },
  take: 1,
},

// To: fetch all non-RECHAZADO, let map pick ACEPTADO-first
presupuestos: {
  select: { total: true, estado: true, fechaEnviado: true },
  where: { estado: { not: 'RECHAZADO' } },
  orderBy: { createdAt: 'desc' },
},
```

Then in the `.map()`:

```typescript
const presupuestoSeleccionado =
  p.presupuestos.find((pr) => pr.estado === 'ACEPTADO') ??
  p.presupuestos[0] ??
  null;
```

This maintains the existing `KanbanPatient.presupuesto` shape — no frontend type changes needed.

### Anti-Patterns to Avoid

- **Using `isAutoTransitionBlocked` for PERDIDO:** That helper uses numeric ETAPA_ORDEN, but PERDIDO is intentionally excluded from ETAPA_ORDEN (it's a lateral exit, not a forward step). The `etapasProtegidas` list pattern is the correct approach for PERDIDO — do not try to add PERDIDO to ETAPA_ORDEN.
- **Removing PROCEDIMIENTO_REALIZADO from STEPPER_CHAIN:** STEPPER_CHAIN deliberately includes PROCEDIMIENTO_REALIZADO even though ETAPA_ORDER (kanban columns) does not. The fix is only to swap the two entries, not to align with ETAPA_ORDER exactly.
- **Adding a `presupuestoId` field to KanbanPatient:** TD-3 only needs estado selection to be correct. No interface change is needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Guard for PERDIDO transition | Custom CRM state machine | Existing `etapasProtegidas` array + conditional spread (already in codebase) |
| "Best presupuesto" selection | New DB index or view | In-memory `.find()` after widening the existing sub-query |

---

## Common Pitfalls

### Pitfall 1: TD-1 — Forgetting to read `etapaCRM` before the transaction

**What goes wrong:** The guard needs `paciente.etapaCRM` to decide whether to include the update leg. If you read inside the transaction, Prisma batches it as a concurrent operation — you cannot use the result to conditionally build the transaction array.

**How to avoid:** Read `etapaCRM` in a separate query before building the `$transaction` array. The existing `rechazarByToken()` already does this correctly (lines 658-665).

**Warning sign:** Guard check inside the transaction call itself — TypeScript won't flag it but the logic is wrong.

### Pitfall 2: TD-2 — Contextual button for PROCEDIMIENTO_REALIZADO uses `etapa === "PROCEDIMIENTO_REALIZADO"` check

**What goes wrong:** After swapping the order in `STEPPER_CHAIN`, the "Marcar como realizado" contextual button condition (`etapa === "PROCEDIMIENTO_REALIZADO" && displayEtapa !== "PROCEDIMIENTO_REALIZADO"`) remains valid — it's keyed on the etapa string, not the index. No secondary change needed.

**How to avoid:** Verify the contextual button conditions after the swap — they are keyed on string identity, not index.

### Pitfall 3: TD-3 — RECHAZADO presupuestos polluting the selection

**What goes wrong:** If a patient has ACEPTADO then RECHAZADO (e.g., re-opened negotiation), fetching all presupuestos and picking `find(ACEPTADO)` would return the ACEPTADO correctly. But if RECHAZADO is not filtered in the `where` clause, and a patient has only RECHAZADO presupuestos, `presupuestos[0]` fallback would return a RECHAZADO one — causing `getEtapaWarning` to treat it as "no accepted presupuesto" which is correct behavior (RECHAZADO = not accepted). So the filter is a UX nicety, not strictly necessary. However, filtering them out prevents misleading `total`/`fechaEnviado` values from appearing on the card UI for unrelated cancelled budgets.

**Recommendation:** Filter `estado: { not: 'RECHAZADO' }` in the query to keep the selection semantically clean.

---

## Code Examples

### TD-1: rechazar() with etapasProtegidas guard

```typescript
// Source: presupuestos.service.ts — rechazar() — currently at line 284
async rechazar(id: string, dto: { motivoRechazo?: string }) {
  const presupuesto = await this.prisma.presupuesto.findUnique({
    where: { id },
    select: { id: true, pacienteId: true, profesionalId: true, estado: true },
  });

  if (!presupuesto) throw new NotFoundException('Presupuesto no encontrado');

  if (
    presupuesto.estado !== EstadoPresupuesto.BORRADOR &&
    presupuesto.estado !== EstadoPresupuesto.ENVIADO
  ) {
    throw new BadRequestException(
      `No se puede rechazar un presupuesto en estado ${presupuesto.estado}`,
    );
  }

  // TD-1 FIX: read etapaCRM before $transaction to apply etapasProtegidas guard
  const paciente = await this.prisma.paciente.findUnique({
    where: { id: presupuesto.pacienteId },
    select: { etapaCRM: true },
  });
  const etapasProtegidas: EtapaCRM[] = [EtapaCRM.CONFIRMADO, EtapaCRM.PROCEDIMIENTO_REALIZADO];
  const bloqueado = paciente?.etapaCRM != null && etapasProtegidas.includes(paciente.etapaCRM);
  const maybeCRMUpdate = bloqueado
    ? []
    : [this.prisma.paciente.update({
        where: { id: presupuesto.pacienteId },
        data: { etapaCRM: EtapaCRM.PERDIDO },
      })];

  const [updated] = await this.prisma.$transaction([
    this.prisma.presupuesto.update({
      where: { id },
      data: {
        estado: EstadoPresupuesto.RECHAZADO,
        fechaRechazado: new Date(),
        motivoRechazo: dto.motivoRechazo ?? null,
      },
      include: {
        items: { orderBy: { orden: 'asc' } },
        paciente: { select: { id: true, nombreCompleto: true } },
      },
    }),
    ...maybeCRMUpdate,
    this.prisma.contactoLog.create({
      data: {
        pacienteId: presupuesto.pacienteId,
        profesionalId: presupuesto.profesionalId,
        tipo: TipoContacto.SISTEMA,
        nota: dto.motivoRechazo ?? 'Sin motivo',
      },
    }),
  ]);

  return this.formatPresupuesto(updated);
}
```

### TD-2: STEPPER_CHAIN corrected order

```typescript
// Source: EtapaStepper.tsx — STEPPER_CHAIN constant (currently lines 8-16)
// BEFORE (wrong order):
const STEPPER_CHAIN: EtapaCRM[] = [
  "SIN_CLASIFICAR",
  "NUEVO_LEAD",
  "TURNO_AGENDADO",
  "CONSULTADO",
  "PRESUPUESTO_ENVIADO",
  "PROCEDIMIENTO_REALIZADO",  // index 5 — wrong
  "CONFIRMADO",               // index 6 — wrong
];

// AFTER (matches ETAPA_ORDEN: CONFIRMADO=5, PROCEDIMIENTO_REALIZADO=6):
const STEPPER_CHAIN: EtapaCRM[] = [
  "SIN_CLASIFICAR",
  "NUEVO_LEAD",
  "TURNO_AGENDADO",
  "CONSULTADO",
  "PRESUPUESTO_ENVIADO",
  "CONFIRMADO",               // index 5 — correct
  "PROCEDIMIENTO_REALIZADO",  // index 6 — correct
];
```

### TD-3: getKanban presupuesto selection (ACEPTADO-first)

```typescript
// Source: pacientes.service.ts — getKanban() presupuestos sub-query and map

// Sub-query change (was: take: 1, orderBy desc):
presupuestos: {
  select: { total: true, estado: true, fechaEnviado: true },
  where: { estado: { not: 'RECHAZADO' } },
  orderBy: { createdAt: 'desc' },
},

// Map change — pick ACEPTADO first, fallback to most-recent:
const presupuestoSeleccionado =
  p.presupuestos.find((pr) => pr.estado === 'ACEPTADO') ??
  p.presupuestos[0] ??
  null;

// Then use presupuestoSeleccionado in place of p.presupuestos[0]:
presupuesto: presupuestoSeleccionado
  ? {
      total: Number(presupuestoSeleccionado.total),
      estado: presupuestoSeleccionado.estado,
      fechaEnviado: presupuestoSeleccionado.fechaEnviado,
    }
  : null,
diasDesdePresupuesto: presupuestoSeleccionado?.fechaEnviado
  ? Math.floor(
      (Date.now() - new Date(presupuestoSeleccionado.fechaEnviado).getTime()) /
        (1000 * 60 * 60 * 24),
    )
  : null,
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `rechazar()` unconditional PERDIDO write | Guard with `etapasProtegidas` (TD-1 fix) | Prevents staff from demoting patients in CONFIRMADO/PROCEDIMIENTO_REALIZADO |
| `STEPPER_CHAIN` inverted order | Matches `ETAPA_ORDEN` sequence (TD-2 fix) | Visual stepper reflects real clinical flow |
| `getKanban` takes most-recent presupuesto | Prioritizes ACEPTADO presupuesto (TD-3 fix) | Eliminates false CONFIRMADO warning on multi-presupuesto patients |

---

## Open Questions

None — all three changes are fully understood from reading the actual code. No ambiguity remains.

---

## Sources

### Primary (HIGH confidence)
- `/backend/src/modules/presupuestos/presupuestos.service.ts` — full service read; `rechazar()` at line 284, `rechazarByToken()` at line 648 (guard at lines 671-675), `aceptar()` guard pattern at lines 192-198
- `/frontend/src/components/crm/EtapaStepper.tsx` — `STEPPER_CHAIN` constant at lines 8-16; confirmed inversion vs backend `ETAPA_ORDEN`
- `/backend/src/modules/pacientes/pacientes.service.ts` — `getKanban()` at line 592; `presupuestos` sub-query with `take: 1` at lines 611-615; map at lines 668-679
- `/frontend/src/lib/crm-warnings.ts` — `getEtapaWarning()` full source; CONFIRMADO check uses `patient.presupuesto?.estado !== 'ACEPTADO'`
- `/frontend/src/hooks/useCRMKanban.ts` — `KanbanPatient` interface; `presupuesto` field shape confirmed compatible with TD-3 fix (no type change required)
- `.planning/REQUIREMENTS.md` — TD-1/TD-2/TD-3 definitions
- `.planning/STATE.md` — `[38-01]` decision confirming STEPPER_CHAIN is hardcoded (not derived from ETAPA_ORDER) intentionally for PROCEDIMIENTO_REALIZADO inclusion; also confirms guard design decisions from phases 35-38

---

## Metadata

**Confidence breakdown:**
- TD-1 guard fix: HIGH — exact target code and correct pattern both read directly from source
- TD-2 order swap: HIGH — inversion confirmed by reading STEPPER_CHAIN vs ETAPA_ORDEN
- TD-3 query fix: HIGH — getKanban source fully read; KanbanPatient type confirmed compatible

**Research date:** 2026-05-28
**Valid until:** N/A — these are point fixes to stable internal code with no external dependencies
