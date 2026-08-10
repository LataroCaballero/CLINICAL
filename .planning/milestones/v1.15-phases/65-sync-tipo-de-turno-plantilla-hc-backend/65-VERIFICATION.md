---
phase: 65-sync-tipo-de-turno-plantilla-hc-backend
verified: 2026-08-04T21:05:47Z
status: passed
score: 12/12 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 11/12
  gaps_closed:
    - "El sync de tipoTurno nunca debe romper el guardado de la HC — incluso cuando dto.turnoId es stale/apunta a un turno ya eliminado"
  gaps_remaining: []
  regressions: []
deferred: []
human_verification: []
---

# Phase 65: Sync Tipo de Turno ↔ Plantilla HC (Backend) Verification Report

**Phase Goal:** El tipo de turno se mantiene coherente con la plantilla de HC cargada sobre él, sin que el profesional tenga que corregirlo a mano en la agenda.
**Verified:** 2026-08-04T21:05:47Z
**Status:** passed
**Re-verification:** Yes — after gap closure (65-02-PLAN.md)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | HCSYNC-01: `primera_vez` sobre turno de rango menor → `tipoTurnoId`='Consulta'; sin degradar tipos superiores | ✓ VERIFIED (regression-checked) | `resolverTipoTurnoSync` (helpers.ts:74-100) unchanged since 65-01; full spec re-run confirms `primera_vez + 'Control' → 'Consulta'`, `primera_vez + 'Tratamiento' → null`, etc. still pass |
| 2 | HCSYNC-02: `tratamiento_en_consultorio` sobre 'Consulta'/'Control'/null → `tipoTurnoId`='Tratamiento'; no degrada 'Pre-Quirúrgico' | ✓ VERIFIED (regression-checked) | Same helper, unchanged; tests confirm `tratamiento_en_consultorio + 'Consulta' → 'Tratamiento'` and `+ 'Pre-Quirúrgico' → null` |
| 3 | HCSYNC-03: `pre_quirurgico` sobre turno no-cirugía → `tipoTurnoId`='Pre-Quirúrgico' (tope); no-op si ya lo es | ✓ VERIFIED (regression-checked) | Tests confirm `pre_quirurgico + 'Control' → 'Pre-Quirúrgico'` and `+ 'Pre-Quirúrgico' → null` |
| 4 | D-02: turno de cirugía (`esCirugia===true`) nunca se toca, sea cual sea la plantilla | ✓ VERIFIED (helper level, unchanged) / ⚠️ wiring test (d) still weak (WR-04, pre-existing, not in 65-02 scope) | `resolverTipoTurnoSync` checks `currentEsCirugia` first — unaffected by the guard fix. Wiring test `(d)` (spec.ts:473-487) still omits `turnoId` from the dto, so it exercises the D-09 short-circuit rather than the D-02 path — same gap noted in the prior verification, explicitly out-of-scope for 65-02, not a regression |
| 5 | D-01 no-downgrade: ladder only applies destino if rank mayor que actual; order-independent | ✓ VERIFIED (regression-checked) | `rankDestino > rankActual` (helpers.ts:99) unchanged; full case table green |
| 6 | D-03: tipo actual no mapeado (Control/null/otro) cuenta rango 0, sobrescribible | ✓ VERIFIED (regression-checked) | `RANGOS[currentTipoNombre] ?? 0` (helpers.ts:97) unchanged |
| 7 | D-09 guard (SC#4): sin `dto.turnoId` no se ejecuta ningún query ni update de turno | ✓ VERIFIED (regression-checked) | Pre-fetch ternary unchanged (service.ts:231-240); sync guard now `if (dto.turnoId && turnoCtx)` (service.ts:309) — still short-circuits on absent `turnoId` (also short-circuits on falsy `turnoCtx`, a superset of the old behavior); wiring test (c) confirms neither `turno.findUnique` nor `turno.update` called |
| 8 | D-05: update escribe `Turno.tipoTurnoId` (FK por nombre) y sincroniza `Turno.esCirugia` con el destino | ✓ VERIFIED (as literally worded, unchanged) | `tx.turno.update({ data: { tipoTurnoId: destino.id, esCirugia: destino.esCirugia } })` (service.ts:323-329), untouched by 65-02. WR-03 (dead write today since all 3 destinos seed `esCirugia:false`) remains a documented, non-blocking latent footgun, unchanged from prior review |
| 9 | D-08: destino resuelto por `nombre` (`@unique`) vía `tx.tipoTurno.findUnique({ where: { nombre } })`; comparación del actual también por `nombre` | ✓ VERIFIED (regression-checked) | service.ts:316-319, unchanged |
| 10 | D-06: sync NO re-dispara efectos sobre `Paciente.flujo`/`etapaCRM`; bloque `resolverNuevoFlujo`/`tx.paciente.update` (~277-300) queda intacto e independiente | ✓ VERIFIED (regression-checked) | Sync block (service.ts:302-332) still placed after the paciente.flujo block, no `paciente.update`/`etapaCRM`/`flujo` references inside it; `git show b568706`/`aa3db48` diffs confirm zero lines touched outside the guard condition and the new test |
| 11 | Idempotencia + defensa: se saltea `tx.turno.update` si `tipoTurnoId` destino ya coincide con el actual; si el `TipoTurno` destino no existe **por nombre**, se saltea el sync silenciosamente sin romper el guardado de la HC | ✓ VERIFIED (regression-checked) | `if (destino && destino.id !== turnoCtx?.tipoTurnoId)` (service.ts:322) unchanged; wiring test (b) confirms `turno.update` not called when already matching |
| 12 | El sync de tipoTurno NUNCA rompe el guardado de la HC — cuando `dto.turnoId` es stale/apunta a un turno ya eliminado (`turnoCtx=null`), el bloque de sync se saltea COMPLETO: no `tx.turno.update`, no P2025, `crearEntrada` resuelve normalmente | ✓ VERIFIED — **gap closed** | Guard hardened to `if (dto.turnoId && turnoCtx)` (service.ts:309); confirmed by reading the code, by the new permanent regression test `(e)` (spec.ts:489-511), AND by an independent falsification check performed during this verification: reverting the guard to `if (dto.turnoId)` locally and re-running `-t "turnoId stale"` reproduces the exact original failure (`Rejected to value: [Error: P2025]`), proving test (e) is a genuine (non-vacuous) regression guard, not a tautology. File restored via `git diff` (0 changes) after the falsification check |

**Score:** 12/12 truths verified — the one gap from the prior verification (Truth #12) is closed; all other 11 truths regression-checked against the current code and confirmed unaffected by the 65-02 diff.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts` | exports `resolverTipoTurnoSync` | ✓ VERIFIED | Unchanged since 65-01; pure function, no Prisma/Nest imports |
| `backend/src/modules/historia-clinica/historia-clinica.service.ts` | `tx.turno.update` inside `crearEntrada`'s `$transaction`, guard requiring `turnoCtx` | ✓ VERIFIED | `grep -n "if (dto.turnoId && turnoCtx)"` returns exactly one match (line 309); `grep -c "if (dto.turnoId) {"` on the sync block = 0; single `tx.turno.update` call remains, scoped `{ id: dto.turnoId }` |
| `backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts` | table of `resolverTipoTurnoSync` cases + wiring tests including stale-turnoId regression test (e) | ✓ VERIFIED | 20 pure-function cases + 5 wiring cases (a-e); all 44/44 tests pass; test (e) verified non-vacuous via falsification |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `historia-clinica.service.ts::crearEntrada` (sync block) | `tx.turno.update` | guard `dto.turnoId && turnoCtx` (short-circuit when pre-fetch doesn't resolve the turno) | ✓ WIRED | service.ts:309; verified by direct read, by test (e), and by falsification (reverting the guard reproduces the original P2025 failure) |
| `historia-clinica.service.ts::crearEntrada` | `resolverTipoTurnoSync` | named import from `./historia-clinica.flujo.helpers` | ✓ WIRED | Import unchanged, call at service.ts:310 |
| `historia-clinica.service.ts::crearEntrada` | `prisma.tipoTurno` (lookup by `nombre` @unique) | `tx.tipoTurno.findUnique({ where: { nombre } })` | ✓ WIRED | service.ts:316-319, unchanged |

### Behavioral Spot-Checks / Probe Execution

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full spec suite green (44 tests: 20 table + 5 wiring incl. (e) + 19 pre-existing Phase 63) | `cd backend && npx jest historia-clinica.flujo.spec.ts` | `Tests: 44 passed, 44 total` | ✓ PASS |
| Type-check (build config, excludes test/) | `cd backend && npx tsc --noEmit -p tsconfig.build.json` | No errors | ✓ PASS |
| Lint on the 3 touched files | `cd backend && npx eslint historia-clinica.service.ts historia-clinica.flujo.spec.ts historia-clinica.flujo.helpers.ts` | No errors | ✓ PASS |
| **Falsification check (verifier-run, not from SUMMARY):** revert guard to `if (dto.turnoId)`, run test (e) only | `sed -i` guard revert + `npx jest -t "turnoId stale"` | `1 failed`: `Rejected to value: [Error: P2025]` — reproduces original bug exactly | ✓ PASS (confirms test (e) is genuine, non-vacuous) |
| Full backend test suite (regression scope check) | `cd backend && npx jest` | `18 failed, 487 passed, 505 total` — all 18 failures confined to 4 suites (`diagnosticos.service.spec.ts`, `diagnosticos.controller.spec.ts`, `usuarios.controller.spec.ts`, `reportes.controller.spec.ts`), a pre-existing NestJS DI test-scaffolding issue (`JwtAuthGuard`/`PrismaService` not provided) unrelated to this phase; confirmed via `grep -l "historia-clinica.service"` on those 4 spec files → no matches | ✓ PASS (no phase-65 regression) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| HCSYNC-01 | 65-01-PLAN.md, 65-02-PLAN.md | Plantilla "Primera vez" fija tipo en "Consulta" si estaba en otro valor | ✓ SATISFIED | Truth #1 verified |
| HCSYNC-02 | 65-01-PLAN.md, 65-02-PLAN.md | Plantilla "Tratamiento en consultorio" sobre "Consulta" cambia a "Tratamiento" | ✓ SATISFIED | Truth #2 verified |
| HCSYNC-03 | 65-01-PLAN.md, 65-02-PLAN.md | Plantilla "Pre-quirúrgico" fija "Pre-Quirúrgico"; guard común sin turno asociado | ✓ SATISFIED | Truth #3 verified; SC#4 (no turno asociado → sin cambios) verified via D-09; the adjacent "turno asociado pero inexistente" edge case (Truth #12) is now also closed |

No orphaned requirements: `.planning/REQUIREMENTS.md` maps only HCSYNC-01/02/03 to Phase 65, and all three appear in both `65-01-PLAN.md` and `65-02-PLAN.md` frontmatter `requirements:` fields. `.planning/PROJECT.md` traceability table lists all three as "Phase 65 / Complete", consistent with this verification.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `historia-clinica.service.ts` | 231-240, 309-332 | WR-01 (from 65-REVIEW.md): `turnoCtx` is pre-fetched outside `$transaction`; the hardened guard closes the "already-stale-before-prefetch" window but not a narrower TOCTOU window if the turno is deleted/mutated between pre-fetch and the `tx.turno.update` call | ⚠️ Warning (not blocker) | Not part of any must-have in 65-01 or 65-02 (both scoped explicitly to the "pre-fetch didn't resolve" case); practical risk is low — no `turno.delete`/`deleteMany` exists in production code paths (`rg` confirms, only in dev seed-reset script), no cascade-delete on `Turno` relations. Reviewer-suggested fix (`tx.turno.updateMany` instead of `update`) would close it unconditionally but is optional hardening, not required for goal achievement |
| `historia-clinica.flujo.spec.ts` | 473-487 | WR-04 (pre-existing, from prior verification's Anti-Patterns and 65-REVIEW.md): wiring test `(d)` for cirugía protection omits `turnoId` from the dto, so it exercises the D-09 guard rather than the D-02 path it claims to test | ⚠️ Warning | Unchanged from prior verification; helper-level unit tests still correctly cover D-02 (spec.ts:183-198); explicitly out of scope for 65-02's stated objective |
| `historia-clinica.service.ts` | 326-329 | WR-03 (pre-existing): `esCirugia: destino.esCirugia` write is currently always `false→false` (dead in practice, all 3 sync destinos seed `esCirugia:false`) | ℹ️ Info | Latent footgun if catalog seeding changes; explicitly marked out-of-scope by 65-02-PLAN.md ("Fuera de alcance (no planear): WR-02") |
| — | — | No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in the 3 touched files (re-checked directly, not trusting SUMMARY) | — | Clean |

CR-01 (IDOR on `dto.turnoId` ownership, single-tenant model, pre-accepted via T-65-01 "accept" disposition) remains unaddressed but pre-accepted before implementation — not counted as a phase gap, consistent with the prior verification's treatment.

### Human Verification Required

None. All observable truths — including the gap-closure fix — are verifiable via code trace, unit tests, and an independent falsification check (reverting the guard to reproduce the original failure). No UI/visual/real-time behavior in scope for this backend-only phase.

### Gaps Summary

No gaps remain. The single confirmed gap from the initial verification (Truth #12 — stale/deleted `turnoId` could abort the entire HC-save transaction via Prisma P2025) is closed by 65-02's one-line guard hardening (`if (dto.turnoId) {` → `if (dto.turnoId && turnoCtx) {`, service.ts:309), backed by a genuine, non-vacuous regression test (e) that this verification independently confirmed by reverting the guard and reproducing the original failure mode exactly (`Rejected to value: [Error: P2025]`).

None of the 11 previously-verified must-haves regressed: the 65-02 diff (`git show b568706`) touches exactly the guard condition and its adjacent comment — zero lines inside the sync block's body, the paciente.flujo/etapaCRM block, or the pure helper were modified. Full `historia-clinica.flujo.spec.ts` suite is 44/44 green (up from 43/43, +1 for test (e)). The 18 failures in the full backend `jest` run are confined to 4 unrelated suites (`diagnosticos`, `usuarios.controller`, `reportes.controller`) caused by a pre-existing NestJS DI test-scaffolding gap (`JwtAuthGuard`/`PrismaService` not provided in those test modules) — confirmed via `grep` that none of those spec files reference `historia-clinica.service`, so this is not a phase-65 regression.

**Residual, non-blocking observations carried forward for developer awareness (not gaps against this phase's must-haves):**
- WR-01: a narrower TOCTOU window (pre-fetch-to-transaction race) remains theoretically possible but is currently unreachable in production (no delete path exists); optional `updateMany` hardening available if desired.
- WR-03: the `esCirugia` write on the sync destino is currently a no-op in practice; explicitly deferred by 65-02.
- WR-04: wiring test (d) for D-02 cirugía protection doesn't exercise the path through `turnoId`-present code; the underlying rule is correctly covered at the helper-unit-test level. Trivial one-line test fix available if the team wants wiring-level coverage.

The phase goal — "El tipo de turno se mantiene coherente con la plantilla de HC cargada sobre él, sin que el profesional tenga que corregirlo a mano en la agenda" — is achieved: the four ROADMAP success criteria (primera_vez→Consulta, tratamiento_en_consultorio→Tratamiento, pre_quirurgico→Pre-Quirúrgico, no turno→no changes) are implemented, tested, and the sync mechanism is now confirmed never to break HC saving even under the stale-turnoId edge case that previously blocked completion.

---

_Verified: 2026-08-04T21:05:47Z_
_Verifier: Claude (gsd-verifier)_
