---
phase: 65-sync-tipo-de-turno-plantilla-hc-backend
verified: 2026-08-04T20:19:58Z
status: gaps_found
score: 11/12 must-haves verified
overrides_applied: 0
gaps:
  - truth: "El sync de tipoTurno nunca debe romper el guardado de la HC — incluso cuando dto.turnoId es stale/apunta a un turno ya eliminado"
    status: failed
    reason: "El guard del bloque de sync en crearEntrada es `if (dto.turnoId)`, no `if (dto.turnoId && turnoCtx)`. Cuando el turno no existe (borrado o id obsoleto), el pre-fetch devuelve turnoCtx=null pero el bloque igual corre: resolverTipoTurnoSync(dto.tipo, undefined, false) devuelve un destino real para primera_vez/tratamiento_en_consultorio/pre_quirurgico, el lookup de catálogo tipoTurno.findUnique SÍ encuentra ese destino (es una tabla global, no depende del turno), y como destino.id !== turnoCtx?.tipoTurnoId (undefined) es siempre true, se ejecuta tx.turno.update({ where: { id: dto.turnoId } }) contra una fila inexistente. Prisma lanza P2025, lo que aborta TODA la transacción y falla la creación de la entrada de HC. Esto contradice tanto el comentario inline del propio código ('Defensive skip if destino doesn't exist (never break HC save)') como la mitigación declarada en el threat model del plan (T-65-03: 'se saltea el sync silenciosamente (no throw), preservando el guardado de la HC'). Reproducido independientemente con un test aislado (mock turno.findUnique→null, turno.update→throw P2025): crearEntrada rechaza la promesa en vez de resolver."
    artifacts:
      - path: "backend/src/modules/historia-clinica/historia-clinica.service.ts"
        issue: "Línea ~306: `if (dto.turnoId) { ... }` no verifica `turnoCtx` antes de derivar el sync; línea ~319: `destino.id !== turnoCtx?.tipoTurnoId` usa optional chaining que enmascara turnoCtx=null en vez de cortocircuitar el bloque completo"
    missing:
      - "Cambiar el guard a `if (dto.turnoId && turnoCtx) { ... }` (o equivalente) para que un turnoId que no resuelve en el pre-fetch salte el sync completo, igual que ya hace el bloque de flujo del paciente con `turnoCtx?.esCirugia ?? false`"
      - "Agregar un caso de test de wiring: turnoId presente + turno.findUnique devuelve null → turno.update NO se llama y crearEntrada resuelve sin lanzar"
deferred: []
human_verification: []
---

# Phase 65: Sync Tipo de Turno ↔ Plantilla HC (Backend) Verification Report

**Phase Goal:** El tipo de turno se mantiene coherente con la plantilla de HC cargada sobre él, sin que el profesional tenga que corregirlo a mano en la agenda.
**Verified:** 2026-08-04T20:19:58Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | HCSYNC-01: `primera_vez` sobre turno de rango menor → `tipoTurnoId`='Consulta'; sin degradar tipos superiores | ✓ VERIFIED | `resolverTipoTurnoSync` (helpers.ts:74-100) implements rank ladder correctly; unit tests pass (`primera_vez + 'Control' → 'Consulta'`, `primera_vez + 'Tratamiento' → null`, etc., all 43/43 green) |
| 2 | HCSYNC-02: `tratamiento_en_consultorio` sobre 'Consulta'/'Control'/null → `tipoTurnoId`='Tratamiento'; no degrada 'Pre-Quirúrgico' | ✓ VERIFIED | Same helper, tests confirm `tratamiento_en_consultorio + 'Consulta' → 'Tratamiento'` and `+ 'Pre-Quirúrgico' → null` |
| 3 | HCSYNC-03: `pre_quirurgico` sobre turno no-cirugía → `tipoTurnoId`='Pre-Quirúrgico' (tope); no-op si ya lo es | ✓ VERIFIED | Tests confirm `pre_quirurgico + 'Control' → 'Pre-Quirúrgico'` and `+ 'Pre-Quirúrgico' → null` |
| 4 | D-02: turno de cirugía (`esCirugia===true`) nunca se toca, sea cual sea la plantilla | ✓ VERIFIED (helper level) / ⚠️ weak wiring coverage | `resolverTipoTurnoSync` checks `currentEsCirugia` first and returns null in all 3 unit-test cases. **However**, the wiring-level test claiming to cover this (`it('(d) turno de cirugía protegido...')`, spec.ts:473-487) omits `turnoId` from the dto, so `dto.turnoId` is falsy and the D-09 guard short-circuits the sync block before `esCirugia` is ever evaluated — the test passes for the wrong reason (it re-tests D-09, not D-02). Manual trace of the actual service code (service.ts:306-311, passing `turnoCtx?.esCirugia` through when `turnoId` IS present) confirms the real behavior is still correct, so this does not fail the truth — but the test suite does not prove it at the wiring layer. See Anti-Patterns. |
| 5 | D-01 no-downgrade: ladder only applies destino if rank mayor que actual; order-independent | ✓ VERIFIED | Explicit `rankDestino > rankActual` comparison (helpers.ts:99); tests cover all no-downgrade pairs |
| 6 | D-03: tipo actual no mapeado (Control/null/otro) cuenta rango 0, sobrescribible | ✓ VERIFIED | `RANGOS[currentTipoNombre] ?? 0` (helpers.ts:97); tests confirm `'Control'` and `null` both yield destino overwrite |
| 7 | D-09 guard (SC#4): sin `dto.turnoId` no se ejecuta ningún query ni update de turno | ✓ VERIFIED | Pre-fetch ternary `dto.turnoId ? ... : null` (service.ts:231-240) and sync block `if (dto.turnoId) {...}` (service.ts:306); wiring test (c) confirms neither `turno.findUnique` nor `turno.update` called without `turnoId` |
| 8 | D-05: update escribe `Turno.tipoTurnoId` (FK por nombre) y sincroniza `Turno.esCirugia` con el destino | ✓ VERIFIED (as literally worded) | `tx.turno.update({ data: { tipoTurnoId: destino.id, esCirugia: destino.esCirugia } })` (service.ts:320-326). Note: REVIEW.md WR-02 flags this write as currently a no-op in practice (all 3 destinos seed `esCirugia:false`, and cirugía turnos are already excluded by D-02) — a latent footgun if catalog seeding ever changes, not a functional failure today. |
| 9 | D-08: destino resuelto por `nombre` (`@unique`) vía `tx.tipoTurno.findUnique({ where: { nombre } })`; comparación del actual también por `nombre` | ✓ VERIFIED | service.ts:313-316 (`tipoTurno.findUnique({ where: { nombre: targetNombre } })`); turnoCtx pre-fetch selects `tipoTurno: { select: { nombre: true } }` (service.ts:237) |
| 10 | D-06: sync NO re-dispara efectos sobre `Paciente.flujo`/`etapaCRM`; bloque `resolverNuevoFlujo`/`tx.paciente.update` (:270-293 en plan, ~277-300 real) queda intacto e independiente | ✓ VERIFIED | Sync block (service.ts:302-329) placed after the paciente.flujo block, contains no `paciente.update`/`etapaCRM`/`flujo` references; `grep -c "paciente.update"` inside the sync block range = 0 |
| 11 | Idempotencia + defensa: se saltea `tx.turno.update` si `tipoTurnoId` destino ya coincide con el actual; si el `TipoTurno` destino no existe **por nombre**, se saltea el sync silenciosamente sin romper el guardado de la HC | ✓ VERIFIED (literal wording) | Idempotence: `if (destino && destino.id !== turnoCtx?.tipoTurnoId)` (service.ts:319); wiring test (b) confirms `turno.update` not called when already matching. Catalog-miss defense: `if (destino && ...)` skips silently when `tipoTurno.findUnique` returns null — this specific literal scenario does not throw. |
| 12 | (Derived from plan's own inline comment + threat model T-65-03) El sync nunca debe romper el guardado de la HC, incluyendo cuando `dto.turnoId` es stale/apunta a un turno eliminado | ✗ FAILED | See Gaps Summary below — reproduced independently: stale `turnoId` → `turnoCtx=null` → guard `if (dto.turnoId)` alone does not stop the block → `tx.turno.update` runs against a non-existent row → Prisma `P2025` → whole `$transaction` rolls back → **HC entry creation fails**. Untested by the phase's own spec suite. |

**Score:** 11/12 truths verified (12th derived from the phase's own documented defensive intent, not literally one of the 11 listed must-have sentences, but directly falsifies the plan's threat-model claim and inline code comment)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts` | exports `resolverTipoTurnoSync` | ✓ VERIFIED | Pure function, no Prisma/Nest imports, guard-first structure mirroring `resolverNuevoFlujo` |
| `backend/src/modules/historia-clinica/historia-clinica.service.ts` | `tx.turno.update` inside `crearEntrada`'s `$transaction` | ✓ VERIFIED (exists, substantive) / ⚠️ wiring guard incomplete | Single `tx.turno.update` call, scoped by `dto.turnoId`, but guard is missing the `turnoCtx` null-check (see gap above) |
| `backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts` | table of `resolverTipoTurnoSync` cases + wiring tests | ✓ VERIFIED | 20 pure-function cases + 4 wiring cases; all 43/43 tests pass. Wiring case (d) has a coverage-quality issue (does not actually exercise cirugía protection through `turnoId`-present path) — see Anti-Patterns |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `historia-clinica.service.ts::crearEntrada` | `resolverTipoTurnoSync` | named import from `./historia-clinica.flujo.helpers` | ✓ WIRED | Import at service.ts:8, call at service.ts:307 |
| `historia-clinica.service.ts::crearEntrada` | `prisma.tipoTurno` (lookup by `nombre` @unique) | `tx.tipoTurno.findUnique({ where: { nombre } })` | ✓ WIRED | service.ts:313-316 |
| `historia-clinica.service.ts::crearEntrada` | `Turno.tipoTurnoId` / `Turno.esCirugia` | `tx.turno.update` guarded by `dto.turnoId` | ⚠️ WIRED but guard incomplete | Guarded only by `dto.turnoId` truthiness, not by `turnoCtx` existence — see gap above. `gsd-sdk query verify.key-links` returned "Source file not found" (tool path-resolution issue, not a code issue); manually confirmed via `grep`/`Read` instead. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full spec suite green (43 tests: 20 table cases + 4 wiring + 19 pre-existing Phase 63) | `cd backend && npx jest historia-clinica.flujo.spec.ts` | `Tests: 43 passed, 43 total` | ✓ PASS |
| Type-check (build config, excludes test/) | `cd backend && npx tsc --noEmit -p tsconfig.build.json` | No errors | ✓ PASS |
| Lint on the 3 touched files | `cd backend && npx eslint historia-clinica.flujo.helpers.ts historia-clinica.service.ts historia-clinica.flujo.spec.ts` | No errors | ✓ PASS |
| Stale/deleted `turnoId` reproduction (independent temp spec, not committed) | `service.crearEntrada(pacienteId, { tipo: 'tratamiento_en_consultorio', turnoId: 'stale-id' }, profesionalId)` with `turno.findUnique` mocked to `null` and `turno.update` mocked to throw P2025 | Promise **rejected**: `Error: P2025: Record to update not found` | ✗ FAIL — confirms WR-01 from REVIEW.md independently |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| HCSYNC-01 | 65-01-PLAN.md | Plantilla "Primera vez" fija tipo en "Consulta" si estaba en otro valor | ✓ SATISFIED | Truth #1 verified |
| HCSYNC-02 | 65-01-PLAN.md | Plantilla "Tratamiento en consultorio" sobre "Consulta" cambia a "Tratamiento" | ✓ SATISFIED | Truth #2 verified |
| HCSYNC-03 | 65-01-PLAN.md | Plantilla "Pre-quirúrgico" fija "Pre-Quirúrgico"; guard común sin turno asociado | ✓ SATISFIED (core), gap on edge case | Truth #3 verified; SC#4 (no turno asociado → sin cambios) verified via D-09; but adjacent "turno asociado pero inexistente" edge case fails (Truth #12) |

No orphaned requirements: REQUIREMENTS.md maps only HCSYNC-01/02/03 to Phase 65, and all three appear in `65-01-PLAN.md` frontmatter `requirements:` field. `.planning/PROJECT.md` traceability table also lists all three as "Phase 65 / Complete" — consistent with the plan's own claim (this verification narrows that to "core scenarios complete, one defensive edge case incomplete").

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `historia-clinica.service.ts` | ~306-329 | Guard `if (dto.turnoId)` instead of `if (dto.turnoId && turnoCtx)` | 🛑 Blocker | Stale/deleted `turnoId` crashes the whole HC-save transaction (P2025) — see Gaps |
| `historia-clinica.flujo.spec.ts` | 473-487 | Wiring test `(d)` for cirugía protection omits `turnoId` from the dto, so it exercises the D-09 guard instead of the D-02 cirugía path it claims to test | ⚠️ Warning | Test passes but for the wrong reason; does not provide wiring-level regression protection for D-02 (helper-level unit tests still cover the actual rule, so the underlying behavior is correct — this is a coverage/test-integrity gap, not a functional failure) |
| `historia-clinica.service.ts` | 320-325 | `esCirugia: destino.esCirugia` write is currently always `false`→`false` (dead in practice today, per REVIEW.md WR-02) | ℹ️ Info | Latent footgun if catalog seeding changes; not a current functional bug |
| N/A | — | No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in the 3 touched files | — | Clean |

No CR-01 (IDOR on `dto.turnoId` ownership) finding is counted as a phase gap: the plan's own threat model (T-65-01) explicitly disposed this as "accept" with documented rationale (single-tenant model, consistent with the pre-existing pattern elsewhere in `crearEntrada`/`turnos.service`) *before* implementation — this is a pre-accepted risk, not an unresolved gap against this phase's must-haves. Flagged here only for visibility; a developer may still choose to address CR-01 via a follow-up.

### Human Verification Required

None. All observable truths are verifiable via code trace, unit tests, and a targeted reproduction — no UI/visual/real-time behavior in scope for this backend-only phase.

### Gaps Summary

**Confirmed gap (independently reproduced, not just trusting REVIEW.md):** the turno-sync block added in this phase guards only on `dto.turnoId` truthiness (`if (dto.turnoId) {...}`), not on whether the pre-fetch actually found the turno (`turnoCtx`). When a client submits an HC entry with a `turnoId` that no longer resolves (turno deleted or stale client cache) — a realistic scenario in a live multi-user scheduling system — `resolverTipoTurnoSync` still receives `(dto.tipo, undefined, false)`, still returns a valid destino for the three tracked templates, the destino catalog lookup still succeeds (it's a global lookup unrelated to the missing turno), and `tx.turno.update({ where: { id: dto.turnoId } })` is called against a row that does not exist. Prisma throws `P2025`, which propagates out of the `$transaction` callback and rolls back the **entire** HC entry creation — diagnóstico, tratamiento, historia clínica, and the flujo/etapaCRM update all get rolled back with it.

This directly contradicts:
- The code's own inline comment: "Defensive skip if destino doesn't exist (never break HC save)"
- The plan's threat model (T-65-03): "Null-check defensivo: si findUnique no encuentra el destino, se saltea el sync silenciosamente (no throw), preservando el guardado de la HC" — this claim is true for the *catalog* lookup but false for the *turno row* lookup, which the review and this independent reproduction confirm is unguarded
- The asymmetry with the pre-existing flujo block immediately above it, which already tolerates `turnoCtx == null` via `turnoCtx?.esCirugia ?? false` — the new sync block does not apply the same tolerance

This is not literally one of the 11 must-have sentences in the PLAN frontmatter (those are worded around the *catalog* TipoTurno-not-found case, which is correctly handled), but it is a direct violation of the phase's own stated defensive intent and a regression risk to the primary "guardar HC" operation that predates this phase. Per the code review's own suggested fix (WR-01), the minimal correction is:

```ts
if (dto.turnoId && turnoCtx) {
  // ...existing sync block...
}
```

**Mitigating factor (for calibration, not exculpation):** no `turno.delete`/`deleteMany` call exists anywhere in production code (only in the dev seed-reset script), and the `Turno → Paciente`/`Profesional` relations have no cascade-delete configured, so a *hard* delete of a turno is not currently reachable through any exposed code path in this codebase today. This lowers the practical likelihood of triggering `P2025` via deletion specifically. It does **not** eliminate the gap: the guard is still incorrect defensive code (contradicts its own inline comment and the plan's threat model), any other cause of a stale/mismatched `turnoId` reaching `crearEntrada` (client bug, race condition, future schema change, admin tooling) would hit the same unguarded path, and the fix is a one-line, low-risk change already specified by the reviewer.

**Not blocking, but worth tracking:** WR-02 (dead `esCirugia` write pending catalog changes) and the wiring test-integrity gap on case (d) (cirugía protection not actually exercised at the wiring layer, though correct at the helper layer and by manual trace). Neither currently produces incorrect behavior.

**This looks intentional only in the narrow "TipoTurno catalog missing" case — the "turno row missing" case looks like an oversight, not a deliberate design choice** (the plan's own acceptance criteria for Task 2 phrase the idempotence check as `destino.id !== turnoCtx.tipoTurnoId` without optional chaining, suggesting the author assumed `turnoCtx` would always be non-null once `dto.turnoId` is present — an assumption that does not hold for stale/deleted turnos). If the team decides the stale-turnoId scenario is acceptable risk (e.g., turnos are never deleted, only soft-cancelled, so `findUnique` would always succeed), the appropriate path is an explicit override with that rationale documented, not silent acceptance:

```yaml
overrides:
  - must_have: "El sync de tipoTurno nunca debe romper el guardado de la HC — incluso cuando dto.turnoId es stale/apunta a un turno ya eliminado"
    reason: "Turnos are never hard-deleted in this system (only cancelled via estado field), so dto.turnoId is guaranteed to resolve if it was valid when the client fetched it — the P2025 path is unreachable in practice"
    accepted_by: "{name}"
    accepted_at: "{ISO timestamp}"
```

---

_Verified: 2026-08-04T20:19:58Z_
_Verifier: Claude (gsd-verifier)_
