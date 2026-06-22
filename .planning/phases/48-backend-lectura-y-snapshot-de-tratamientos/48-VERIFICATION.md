---
phase: 48-backend-lectura-y-snapshot-de-tratamientos
verified: 2026-06-22T02:15:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 48: Backend — Lectura y Snapshot de Tratamientos — Verification Report

**Phase Goal:** Backend — Lectura y Snapshot de Tratamientos. The "Ultimo tratamiento" column must resolve per-turno from each turno's own HC entry, normalizing all 3 HC content shapes to a compact string (TRAT-01, TRAT-02); and the tratamientos snapshot (tratamientosSnapshot -> contenido.tratamientos) must persist whenever tratamientoIds are passed, even when consumirInsumos=false, while OrdenConsumo creation remains gated on consumirInsumos=true (TRAT-03).
**Verified:** 2026-06-22T02:15:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                         | Status     | Evidence                                                                                                                      |
|----|---------------------------------------------------------------------------------------------------------------|------------|-------------------------------------------------------------------------------------------------------------------------------|
| 1  | "Ultimo tratamiento" resuelve por turno desde la entrada de HC propia del turno (no el global del paciente)  | VERIFIED   | `turnos.service.ts:544-563`: `entradaHC` select includes `contenido: true`; `.map()` calls `resumirTratamientosDeContenido(entradaHC?.contenido ?? null)` per turno |
| 2  | Shape v1.9 agrupado por zona (`contenido.zonas[].tratamientos`) normaliza correctamente                       | VERIFIED   | `historia-clinica.contenido.helpers.ts:109-117`: zonas branch with flatMap + formatearResumen; spec test passes (zonas[] → "Lipoaspiración +2") |
| 3  | Shape legacy plano (`contenido.tratamientos`) normaliza correctamente                                         | VERIFIED   | `historia-clinica.contenido.helpers.ts:121-129`: tratamientos branch; spec tests pass (single → name, multi → "A +1") |
| 4  | Shape texto libre / tratamiento en consultorio normaliza correctamente (catálogo > texto, truncado a 80)      | VERIFIED   | `historia-clinica.contenido.helpers.ts:131-139`: texto branch; spec tests pass (consultorio con catálogo, fallback a texto, elipsis) |
| 5  | Turno sin HC o sin tratamientos devuelve null (contrato preservado)                                           | VERIFIED   | `entradaHC?.contenido ?? null` — null input returns null; spec tests: null/undefined/empty → null |
| 6  | HC con tratamientos y consumirInsumos=false persiste contenido.tratamientos (snapshot)                        | VERIFIED   | `historia-clinica.service.ts:171-190`: guard changed to `if (dto.tratamientoIds?.length)` (no consumirInsumos dep); `contenido.tratamientos = tratamientosSnapshot` executes unconditionally for tratamiento_en_consultorio |
| 7  | La OrdenConsumo se crea SOLO cuando consumirInsumos=true                                                      | VERIFIED   | `historia-clinica.service.ts:193-208`: insumos aggregation wrapped in `if (dto.consumirInsumos)`; `historia-clinica.service.ts:293`: `if (dto.consumirInsumos && insumosAgregados.length > 0)` guard intact |
| 8  | Query separada global por paciente eliminada (sin N+1)                                                        | VERIFIED   | No `ultimoTratamientoMap`, no `historiaClinica.findMany`, no orphaned `pacienteIds` anywhere in `turnos.service.ts` |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact                                                                        | Expected                                                              | Status     | Details                                                                                     |
|---------------------------------------------------------------------------------|-----------------------------------------------------------------------|------------|---------------------------------------------------------------------------------------------|
| `backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts`   | Extractor puro `resumirTratamientosDeContenido` normalizando 3 shapes | VERIFIED   | Function exported at line 93; covers zonas, tratamientos, texto; 155 lines substantive      |
| `backend/src/modules/historia-clinica/historia-clinica.contenido.spec.ts`      | Suite RED/GREEN 14 tests for extractor + edge cases                   | VERIFIED   | 14 `resumirTratamientosDeContenido` tests in `describe` block; 25/25 pass (14 new + 11 pre) |
| `backend/src/modules/turnos/turnos.service.ts`                                 | Per-turno resolution via `resumirTratamientosDeContenido`             | VERIFIED   | Import at line 25; called at lines 559-560; `contenido: true` in select at line 547         |
| `backend/src/modules/historia-clinica/historia-clinica.service.ts`             | `crearEntrada` with unconditional snapshot, separate from OrdenConsumo | VERIFIED  | Snapshot at lines 171-190; insumos aggregation wrapped at line 194; OrdenConsumo guard intact at 293 |

---

### Key Link Verification

| From                                                        | To                                              | Via                                                        | Status     | Details                                                             |
|-------------------------------------------------------------|-------------------------------------------------|------------------------------------------------------------|------------|---------------------------------------------------------------------|
| `turnos.service.ts` `obtenerTurnosPorRango`                 | `turno.entradaHC.contenido`                     | `select` ampliado en relacion entradaHC + map por-turno    | WIRED      | `entradaHC: { select: { tipoEntrada: true, contenido: true } }` at line 544-548 |
| `turnos.service.ts`                                         | `resumirTratamientosDeContenido` (helper puro)  | Import desde `historia-clinica.contenido.helpers`          | WIRED      | Import at line 25; called at line 559                               |
| `crearEntrada` — pre-fetch de tratamientos por tratamientoIds | `contenido.tratamientos` (snapshot)           | Asignacion incondicional fuera del guard consumirInsumos   | WIRED      | `if (dto.tratamientoIds?.length)` at line 171; assignment at line 189 |
| `crearEntrada` — insumosAgregados                           | `tx.ordenConsumo.create`                        | Guard condicionado a `consumirInsumos=true`                | WIRED      | `if (dto.consumirInsumos && insumosAgregados.length > 0)` at line 293 |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                                                                      | Status    | Evidence                                                                 |
|-------------|-------------|------------------------------------------------------------------------------------------------------------------|-----------|--------------------------------------------------------------------------|
| TRAT-01     | 48-01       | Columna "Ultimo tratamiento" muestra tratamiento del turno propio, no global del paciente                        | SATISFIED | Per-turno map with `entradaHC?.contenido` in `turnos.service.ts:555-563` |
| TRAT-02     | 48-01       | Lector resuelve 3 shapes: v1.9 zonas, legacy plano, texto libre / tratamiento en consultorio                    | SATISFIED | All 3 branches in `resumirTratamientosDeContenido`; 14 passing spec tests |
| TRAT-03     | 48-02       | Snapshot persiste con `consumirInsumos=false`; entradas nuevas pueblan la columna; OrdenConsumo sigue condicional | SATISFIED | Guard changed to `if (dto.tratamientoIds?.length)` at line 171; OrdenConsumo guard intact at line 293 |

No orphaned requirements. TRAT-04, TRAT-05, TRAT-06 are mapped to Phase 49 (pending — out of scope for this phase).

---

### Anti-Patterns Found

None. No TODO/FIXME/HACK/PLACEHOLDER markers in any modified file. The `return null` occurrences in `historia-clinica.contenido.helpers.ts` are intentional contract returns (extractor null-safety), not stubs.

---

### Test Results

```
historia-clinica.contenido.spec.ts — 25/25 PASS (1.444s)
  construirContenidoPrimeraVez   — 5 tests PASS
  derivarPerfilPrimeraVez        — 6 tests PASS
  resumirTratamientosDeContenido — 14 tests PASS (all new, covering 3 shapes + edge cases)
```

TypeScript compilation (`tsconfig.build.json`): clean exit, zero errors.

Note from SUMMARY: `tsconfig.json` (without `--build` flag) fails with pre-existing TS6059 for `test/app.e2e-spec.ts` outside rootDir — unrelated to phase changes. Build config (`tsconfig.build.json`) passes clean.

---

### Commit Verification

| Commit   | Description                                                     | Exists |
|----------|-----------------------------------------------------------------|--------|
| 017ab23  | feat(48-01): add resumirTratamientosDeContenido pure extractor  | YES    |
| 80ffda8  | feat(48-01): integrate per-turno ultimoTratamiento resolution   | YES    |
| c4662c4  | fix(48-02): persist tratamientos snapshot regardless of consumirInsumos | YES |

---

### Human Verification Required

#### 1. End-to-end column display with real HC data

**Test:** In the running app, open the Tratamientos planilla for a patient who has multiple turnos with different HC entries (e.g., one entry with zonas[], one legacy, one tratamiento_en_consultorio with consumirInsumos=false). Verify that each row in the planilla shows the treatment from its own turno's HC entry, not the same global treatment repeated.
**Expected:** Each row shows a distinct compact string matching the treatment recorded in that specific turno's HC entry.
**Why human:** Requires a database with real HC entries and a running app — cannot verify the full end-to-end column rendering programmatically.

#### 2. consumirInsumos=false snapshot persistence

**Test:** Create a HC entry of type `tratamiento_en_consultorio` with `tratamientoIds` and `consumirInsumos=false`. Inspect the stored `contenido.tratamientos` in the database.
**Expected:** `contenido.tratamientos` is populated with the snapshot (e.g., `[{id: "...", nombre: "Toxina"}]`), not `[]`. No `OrdenConsumo` row is created.
**Why human:** Requires a real database write and inspection — cannot verify persistence behavior from code analysis alone.

---

### Summary

Phase 48 achieves its goal. Both plans executed completely:

**48-01 (TRAT-01, TRAT-02):** The pure extractor `resumirTratamientosDeContenido` is implemented, substantive (all 3 shapes + edge cases), and wired into `obtenerTurnosPorRango`. The old per-patient `historiaClinica.findMany` + `ultimoTratamientoMap` N+1 pattern is fully removed. Each turno now resolves its own `ultimoTratamiento` from its own `entradaHC.contenido` without any extra query.

**48-02 (TRAT-03):** The `crearEntrada` pre-fetch guard was changed from `if (dto.consumirInsumos && dto.tratamientoIds?.length)` to `if (dto.tratamientoIds?.length)`, making the snapshot unconditional. The `contenido.tratamientos = tratamientosSnapshot` assignment executes for all `tratamiento_en_consultorio` entries regardless of `consumirInsumos`. The OrdenConsumo guard at line 293 is unchanged and correctly gated on `consumirInsumos=true`.

No regressions detected. TypeScript compiles clean. 25/25 tests pass.

---

_Verified: 2026-06-22T02:15:00Z_
_Verifier: Claude (gsd-verifier)_
