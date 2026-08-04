---
phase: 65-sync-tipo-de-turno-plantilla-hc-backend
reviewed: 2026-08-04T20:59:50Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - backend/src/modules/historia-clinica/historia-clinica.service.ts
  - backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 65: Code Review Report

**Reviewed:** 2026-08-04T20:59:50Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

This gap-closure (65-02, commits `b568706` + `aa3db48`) changes the `crearEntrada`
turno-sync guard from `if (dto.turnoId)` to `if (dto.turnoId && turnoCtx)` and adds
regression test `(e)` reproducing the stale-`turnoId` → P2025 → whole-transaction-abort
failure mode identified by 65-VERIFICATION.md (gap on truth #12) and the prior
65-REVIEW.md (WR-01).

**The fix itself is correct and minimal.** It is scoped to exactly the guard
condition, doesn't touch the inner idempotence/catalog-lookup logic, mirrors the
tolerant pattern already used by the `resolverNuevoFlujo` block immediately above it
(`turnoCtx?.esCirugia ?? false`), and the new test (e) is a genuine regression guard —
it mocks a truthy `destino` from the catalog lookup specifically so the inner
`if (destino && ...)` check can't accidentally mask the outer guard, and asserts both
"no `turno.update` call" and "promise resolves." Traced by hand: with `turnoCtx=null`,
the block now short-circuits before `resolverTipoTurnoSync` is even called. No
regression found in the surrounding flujo/etapaCRM block (D-06), the pre_quirurgico
profile merge, or the OrdenConsumo creation.

No BLOCKER-level issue was found in the code touched by this specific commit pair.
The findings below are: (1) one residual gap in the same defensive intent that the
fix didn't fully close, and (2) several pre-existing issues in the surrounding file
that were already documented in 65-REVIEW.md/65-VERIFICATION.md and remain
unaddressed (WR-02, CR-01, and a wiring-test-integrity gap on case (d)) — re-verified
here directly against current code rather than assumed from the prior reports, and
included for completeness since they are present in the files under review.

## Warnings

### WR-01: Hardened guard narrows but does not eliminate the TOCTOU window it targets

**File:** `backend/src/modules/historia-clinica/historia-clinica.service.ts:231-240, 309-332`
**Issue:** `turnoCtx` is pre-fetched **outside** the `$transaction` (pgBouncer pattern,
line 231-240). The new guard `if (dto.turnoId && turnoCtx)` correctly closes the case
where the turno was already missing *before* the pre-fetch ran. It does not close the
case where the turno is deleted/mutated *between* the pre-fetch and the
`tx.turno.update` call at line 323 — in that window `turnoCtx` is still truthy (it was
resolved a moment earlier), the guard passes, and `tx.turno.update({ where: { id:
dto.turnoId } })` would still throw Prisma `P2025` on a since-vanished row, aborting the
entire HC-save transaction — the exact failure mode this phase set out to eliminate,
just with a narrower window. The inline comment added by this fix ("Guard also
requires turnoCtx ... so a stale/deleted turnoId short-circuits the whole block instead
of reaching tx.turno.update against a missing row") reads as a stronger, unconditional
guarantee than what a pre-tx snapshot can actually provide.

Practical risk today is low: `rg -n "turno\.delete|tx\.turno\.delete"` across
`backend/src` finds no hard-delete call on `Turno` outside the dev seed-reset script,
and `Turno`'s relations to `Paciente`/`Profesional` have no cascade-delete configured
in `schema.prisma`, so the window is currently very hard to trigger in production. It
is not zero-risk going forward (any future turno-cancellation-as-delete feature, admin
tooling, or race with a concurrent request that legitimately changes `turnoId`'s
target row would reopen it), and the fix is cheap.

**Fix:** Use `updateMany` instead of `update` for the sync write — `updateMany` is a
no-op (matches 0 rows) instead of throwing when the target row is gone, which closes
the window unconditionally regardless of *when* the row disappeared:

```ts
if (dto.turnoId && turnoCtx) {
  const targetNombre = resolverTipoTurnoSync(/* ... */);
  if (targetNombre) {
    const destino = await tx.tipoTurno.findUnique({ /* ... */ });
    if (destino && destino.id !== turnoCtx?.tipoTurnoId) {
      await tx.turno.updateMany({
        where: { id: dto.turnoId },
        data: { tipoTurnoId: destino.id, esCirugia: destino.esCirugia },
      });
    }
  }
}
```

### WR-02: `dto.turnoId` ownership/scope is still unverified (pre-existing, carried forward — not introduced by this fix)

**File:** `backend/src/modules/historia-clinica/historia-clinica.service.ts:231-240, 322-330`
**Issue:** Neither the pre-fetch (`select` at line 234-238) nor the update (line
322-330) checks that the resolved turno belongs to `pacienteId` (route param) or to
the acting `profesionalId`. An authenticated `ADMIN`/`PROFESIONAL`/`SECRETARIA` caller
(`historia-clinica.controller.ts:6`) creating an HC entry for patient A can pass the
`turnoId` of a turno belonging to a different patient/professional and have that
unrelated turno's `tipoTurnoId`/`esCirugia` silently rewritten. This was already
flagged as CR-01 in the prior 65-REVIEW.md and explicitly accepted in the 65-01 plan's
threat model (T-65-01, disposition "accept", rationale: single-tenant model). Not a
new gap from this commit pair — re-confirmed still present in current code, listed
here for visibility since it lives in the same block being reviewed and `esCirugia`
in particular feeds calendar/flujo logic elsewhere.
**Fix:** If/when the accepted-risk decision is revisited, scope the pre-fetch and
check ownership before writing, e.g. `select: { ..., pacienteId: true,
profesionalId: true }` and gate the sync on `turnoCtx.pacienteId === pacienteId`.

### WR-03: `esCirugia: destino.esCirugia` write remains dead code / latent footgun (pre-existing, explicitly deferred by 65-02, not fixed)

**File:** `backend/src/modules/historia-clinica/historia-clinica.service.ts:326-329`
**Issue:** All three sync destinos (`Consulta`, `Tratamiento`, `Pre-Quirúrgico`) seed
`esCirugia: false`, and turnos already `esCirugia: true` are excluded upstream by
`resolverTipoTurnoSync`'s own guard. So this write is always `false → false` today —
functionally inert, but couples turno `esCirugia` to catalog seeding: if a future
catalog edit ever seeds one of these three names with `esCirugia: true`, this line
would silently flip a non-surgical turno into a surgical one as a side effect of
saving an unrelated HC template, with no guard against *promoting* a turno to cirugía
here (the existing guard only protects turnos that already *are* cirugía). Documented
as WR-02 in the prior 65-REVIEW.md and explicitly marked out-of-scope for 65-02
("Fuera de alcance (no planear): WR-02") — still present, unaddressed.
**Fix:** Drop the field from the update (`data: { tipoTurnoId: destino.id }`), or add
an explicit guard against promoting `esCirugia` here if that coupling is intentional.

### WR-04: Wiring test `(d)` still doesn't exercise the D-02 cirugía-protection path it claims to cover (pre-existing, unaddressed)

**File:** `backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts:473-487`
**Issue:** Test `(d)` ("turno de cirugía protegido: esCirugia=true con cualquier
plantilla → turno.update NO llamado") invokes `crearEntrada` with
`{ tipo: 'pre_quirurgico' }` — **no `turnoId`**. Since `dto.turnoId` is falsy, the
`if (dto.turnoId && turnoCtx)` guard short-circuits the block before `esCirugia` is
ever evaluated. The test passes, but for the wrong reason: it re-exercises the D-09
"no turnoId" guard, not the D-02 "turno is already cirugía, don't touch it" rule the
name and comment claim. The underlying rule is still correctly covered at the pure
`resolverTipoTurnoSync` unit-test level (lines 182-193), so behavior is not broken —
but there is no wiring-level regression protection for D-02, meaning a future change
that broke the `esCirugia` short-circuit specifically inside `crearEntrada`'s wiring
(as opposed to inside the helper) would not be caught by this suite. Already flagged
in 65-VERIFICATION.md's Anti-Patterns table; not touched by this commit pair.
**Fix:** Add `turnoId: TURNO_ID` to the dto in test (d) so the sync block is actually
entered and short-circuits on `turnoCtx.esCirugia === true` rather than on the absent
`turnoId`:
```ts
await service.crearEntrada(
  PACIENTE_ID,
  { tipo: 'pre_quirurgico', turnoId: TURNO_ID } as never,
  PROFESIONAL_ID,
);
```

## Info

### IN-01: Redundant optional chaining once the guard narrows `turnoCtx` to non-null

**File:** `backend/src/modules/historia-clinica/historia-clinica.service.ts:310-313, 322`
**Issue:** Inside `if (dto.turnoId && turnoCtx) { ... }`, `turnoCtx` is guaranteed
non-null by TypeScript's control-flow narrowing (it's a `const`, not reassigned). The
block still uses `turnoCtx?.tipoTurno?.nombre` (line 312), `turnoCtx?.esCirugia ??
false` (line 313), and `turnoCtx?.tipoTurnoId` (line 322) — the `?.` on `turnoCtx`
itself is dead defensive code post-guard. Harmless (optional chaining on a non-null
value is legal), but slightly obscures that the guard already did this work.
**Fix:** Drop the outer `turnoCtx?.` in favor of `turnoCtx.` inside this block (keep
`.tipoTurno?.nombre` since `tipoTurno` itself can still be null/absent on the row).

### IN-02: Arbitrary professional selection when `profesionalIdFromJwt` is absent (pre-existing, unrelated to this diff)

**File:** `backend/src/modules/historia-clinica/historia-clinica.service.ts:89-95`
**Issue:** `this.prisma.profesional.findFirst()` with no `orderBy` picks a
non-deterministic (or DB-default-ordered) professional when the JWT didn't supply one,
and attributes the new HC entry / autorizaciones / catalog learning to it. Not part of
this commit pair, low priority, flagged for completeness since it's in the reviewed
file.
**Fix:** If this fallback is meant to be a deliberate dev/seed-only convenience, guard
it behind an environment check or throw in production instead of silently picking an
arbitrary professional.

---

_Reviewed: 2026-08-04T20:59:50Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
