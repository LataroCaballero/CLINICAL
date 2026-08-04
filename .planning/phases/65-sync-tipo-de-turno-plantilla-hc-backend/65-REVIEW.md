---
phase: 65-sync-tipo-de-turno-plantilla-hc-backend
reviewed: 2026-08-04T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts
  - backend/src/modules/historia-clinica/historia-clinica.service.ts
  - backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
status: issues_found
---

# Phase 65: Code Review Report

**Reviewed:** 2026-08-04
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed the phase 65 `Turno.tipoTurno` sync feature: the new pure helper
`resolverTipoTurnoSync` (`historia-clinica.flujo.helpers.ts`), its wiring inside
`crearEntrada`'s `$transaction` (`historia-clinica.service.ts`), and the added unit
tests (`historia-clinica.flujo.spec.ts`).

The pure helper is well-designed, order-independent, and thoroughly unit-tested (the
rank ladder, no-downgrade, cirugía sentinel, and D-07 no-sync plantillas are all
covered). The hardcoded catalog names (`Consulta`/`Tratamiento`/`Pre-Quirúrgico`)
match the seed exactly, and `nombre` is globally `@unique` so `findUnique` is valid.

However, the **wiring** introduces a new *write* to `Turno` that trusts a
client-supplied `dto.turnoId` with no ownership check and no existence guard. The
previous code only *read* the turno (for the `esCirugia`/flujo decision); phase 65
turns that into a mutation, which changes the risk profile. Both the security gap and
the missing-turno crash path are unguarded and untested.

## Critical Issues

### CR-01: `turno.update` mutates a client-supplied turnoId with no ownership/patient validation (IDOR / data-integrity)

**File:** `backend/src/modules/historia-clinica/historia-clinica.service.ts:306-329` (pre-fetch at `231-240`)

**Issue:** The sync block writes `tipoTurnoId` (and `esCirugia`) to the turno
identified solely by `dto.turnoId`, which comes straight from the request body
(`CreateEntradaDto.turnoId`). Neither the pre-fetch (`turnoCtx`, lines 231-240) nor
the update (lines 320-326) verifies that the turno belongs to the `pacienteId` from
the route param or to the acting `profesionalId`. The pre-fetch `select` does not even
retrieve `pacienteId`/`profesionalId`, so no such check is possible downstream.

The endpoint is exposed to `ADMIN`, `PROFESIONAL`, and `SECRETARIA`
(`historia-clinica.controller.ts:6`). A caller creating an HC entry for patient A can
pass the `turnoId` of an unrelated patient/professional and have that turno's
`tipoTurno`/`esCirugia` silently rewritten. Before phase 65 the turno was only read
(for the flujo `esCirugia` decision), so an unqualified id was harmless; the new write
converts this into a cross-record mutation. `esCirugia` in particular feeds calendar
and flujo logic elsewhere, so an unauthorized flip has downstream effects.

**Fix:** Retrieve the ownership fields in the pre-fetch and refuse to sync a turno that
does not belong to the current patient (and professional):

```ts
const turnoCtx = dto.turnoId
  ? await this.prisma.turno.findUnique({
      where: { id: dto.turnoId },
      select: {
        esCirugia: true,
        tipoTurnoId: true,
        pacienteId: true,
        profesionalId: true,
        tipoTurno: { select: { nombre: true } },
      },
    })
  : null;

// ...inside tx, before syncing:
const turnoPerteneceAlPaciente =
  turnoCtx != null &&
  turnoCtx.pacienteId === pacienteId &&
  turnoCtx.profesionalId === profesionalId;

if (dto.turnoId && turnoPerteneceAlPaciente) {
  const targetNombre = resolverTipoTurnoSync(
    dto.tipo,
    turnoCtx.tipoTurno?.nombre,
    turnoCtx.esCirugia,
  );
  // ...existing update...
}
```

## Warnings

### WR-01: Missing `turnoCtx` null-guard → stale/deleted `turnoId` aborts the entire HC save (P2025)

**File:** `backend/src/modules/historia-clinica/historia-clinica.service.ts:306-329`

**Issue:** The guard is `if (dto.turnoId)`, not `if (dto.turnoId && turnoCtx)`. When
`dto.turnoId` is present but the turno does not exist (deleted, or a stale id from the
client), the pre-fetch returns `turnoCtx = null`. The code then evaluates
`resolverTipoTurnoSync(dto.tipo, undefined, false)` — which returns a real destino for
`primera_vez`/`tratamiento_en_consultorio`/`pre_quirurgico` — resolves `destino`, and
because `destino.id !== turnoCtx?.tipoTurnoId` is `destino.id !== undefined` (always
true), calls `tx.turno.update({ where: { id: dto.turnoId } })` on a nonexistent row.
Prisma throws `P2025`, which rolls back the whole `$transaction` and **fails the
primary operation (HC entry creation)**. The flujo block above (line 285) already
tolerates a null turno via `turnoCtx?.esCirugia ?? false`; the sync block does not, so
the handling is asymmetric. The inline comment claims "never break HC save," but this
path does exactly that. No test covers `turnoId` present + `turnoCtx === null`.

**Fix:** Short-circuit when the turno was not found (folds naturally into the CR-01 fix
via `turnoPerteneceAlPaciente`, which is false when `turnoCtx == null`). Minimally:

```ts
if (dto.turnoId && turnoCtx) {
  // ...sync...
}
```

### WR-02: `esCirugia: destino.esCirugia` write is dead/redundant and risks a future footgun

**File:** `backend/src/modules/historia-clinica/historia-clinica.service.ts:322-325`

**Issue:** All three sync destinos (`Consulta`, `Tratamiento`, `Pre-Quirúrgico`) are
seeded with `esCirugia: false` (`seed-tipos-turno.ts:15,26,31`), and turnos that are
already `esCirugia: true` are protected by the resolver's first guard
(`resolverTipoTurnoSync` returns `null` for `currentEsCirugia`). So the written value
is always `false` on a turno that was already `false` — the write never changes
anything today. It is therefore effectively dead code that also silently couples turno
`esCirugia` to catalog seeding: if someone ever seeds/edits `Pre-Quirúrgico` (or
another destino) with `esCirugia: true`, this line would flip a non-surgical turno into
a surgical one as a side effect of saving an HC template, with no guard preventing it.
The resolver protects turnos that *are* cirugía but not turnos being *made* cirugía.

**Fix:** Drop the `esCirugia` field from the sync update (only `tipoTurnoId` needs to
change), or, if the intent is genuinely to mirror the catalog, add an explicit guard
that refuses to promote a non-surgical turno to surgical here:

```ts
data: { tipoTurnoId: destino.id },
```

## Info

### IN-01: Catalog names duplicated as magic strings across helper and DB (maintainability)

**File:** `backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts:81-91`

**Issue:** `RANGOS`/`DESTINOS` hardcode the exact catalog names
(`'Consulta'`, `'Tratamiento'`, `'Pre-Quirúrgico'`, including the accent and hyphen).
They currently match `seed-tipos-turno.ts` exactly, but the coupling is implicit: any
rename/re-accent in the catalog (e.g. `'Pre-Quirurgico'`) would make the helper
silently no-op (destino `findUnique` returns null → "defensive skip") or mis-rank the
current type as 0 — a silent feature failure with no error. **Classification:**
WARNING-adjacent; kept as Info because names match today.

**Fix:** Extract the three names into a shared exported constant reused by both the
helper and the seed, so a rename breaks the build rather than the behavior.

---

_Reviewed: 2026-08-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
