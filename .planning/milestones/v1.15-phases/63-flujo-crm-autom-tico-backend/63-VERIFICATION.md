---
phase: 63-flujo-crm-autom-tico-backend
verified: 2026-07-31T22:06:49Z
status: passed
score: 10/10 must-haves verified
overrides_applied: 0
---

# Phase 63: Flujo CRM Automático (Backend) Verification Report

**Phase Goal:** El estado del embudo CRM refleja automáticamente el estado real del paciente en tres puntos del flujo, sin que la secretaria tenga que clasificar manualmente.
**Verified:** 2026-07-31T22:06:49Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC#1 — Paciente nuevo entra al kanban en "Nuevo Lead" (`etapaCRM=NUEVO_LEAD`), nunca "Sin clasificar" | ✓ VERIFIED | `pacientes.service.ts:69-70` — `create()` setea `etapaCRM: EtapaCRM.NUEVO_LEAD, flujo: null` incondicionalmente (DTO no transporta esos campos). `getKanban()` (L627-712) filtra `OR:[{flujo:CIRUGIA},{flujo:null}]` y agrupa por `etapaCRM` — `NUEVO_LEAD` cae en su propia columna, no en `SIN_CLASIFICAR` (solo `etapaCRM==null` cae ahí). Test: `pacientes.service.spec.ts:444` `getKanban — lead nuevo (etapaCRM=NUEVO_LEAD, flujo=null) es visible`. |
| 2 | SC#2 — Al agendar cirugía el paciente pasa a "Confirmado", incluso sin presupuesto aceptado | ✓ VERIFIED | `turnos.service.ts:834-837` — dentro de la `$transaction` de `crearTurnoCirugia`, `tx.paciente.update({ data: { etapaCRM: EtapaCRM.CONFIRMADO } })`, sin ninguna verificación de presupuesto/estado de presupuesto en el path. Test: `turnos.service.spec.ts:137` `Test A/B` (D-04) confirman la escritura y la independencia del presupuesto. |
| 3 | SC#3 — Entrada HC "Tratamiento en consultorio" (sola o junto a "Primera vez") saca al paciente del kanban (`flujo=TRATAMIENTO`, oculto vía patrón v1.13) y queda en la planilla con la fecha del tratamiento | ✓ VERIFIED | `historia-clinica.flujo.helpers.ts:47-53` fuerza `tipoEntrada='TRATAMIENTO'` para `dto.tipo==='tratamiento_en_consultorio'` (D-08). `historia-clinica.service.ts:238-292` usa ese `tipoEntradaResuelto` para `resolverNuevoFlujo` y, cuando `nuevoFlujo==='TRATAMIENTO'`, escribe `flujo: 'TRATAMIENTO'` + `etapaCRM: null` (D-10). `flujo=TRATAMIENTO` no pasa el `OR:[{flujo:CIRUGIA},{flujo:null}]` de `getKanban` → oculto (patrón v1.13, sin código nuevo necesario). `entrada.fecha`/`contenido.tratamientos` ya persistidos sin cambios de schema; el mecanismo pre-existente "Fuente B" de `TratamientosTab.tsx` (frontend) lee `tipoEntradaHC` desde `turno.entradaHC.tipoEntrada` (`turnos.service.ts:596`), que ahora resuelve a `TRATAMIENTO` correctamente. Tests: `historia-clinica.flujo.spec.ts` 19 casos (D-08/D-09/D-10, incluye wiring de `crearEntrada`). |
| 4 | D-09 — Candidato quirúrgico (`flujo=CIRUGIA`) que recibe un tratamiento en consultorio NO se mueve del board | ✓ VERIFIED | `resolverNuevoFlujo` branch TRATAMIENTO: `flujoActual === 'PENDIENTE' \|\| flujoActual == null ? 'TRATAMIENTO' : null` — `CIRUGIA` cae en `null` (no-op). Test: `historia-clinica.flujo.spec.ts:192` `paciente flujo=CIRUGIA + tratamiento_en_consultorio → NO se toca flujo/etapaCRM`. |
| 5 | D-05 — Un turno nuevo no degrada una etapa avanzada (CONFIRMADO/PROCEDIMIENTO_REALIZADO) a TURNO_AGENDADO | ✓ VERIFIED | `turnos.service.ts:147-156` — guard `esConsulta \|\| !etapaAvanzada` protege `CONFIRMADO`/`PROCEDIMIENTO_REALIZADO`. Tests A/B/D/E en `turnos.service.spec.ts:227-291`. |
| 6 | D-06 — Excepción: turno tipo "Consulta" SÍ reinicia el ciclo a TURNO_AGENDADO | ✓ VERIFIED (con caveat) | `turnos.service.ts:147` `esConsulta = tipoTurno.nombre === 'Consulta'`. Test C confirma el reinicio. **Caveat (WR-01, code review):** el guard depende de un string de display editable por el usuario, no de un flag de schema estable — funciona hoy porque el seed usa exactamente `'Consulta'`, pero es frágil ante renombres/variantes. No rompe el criterio actualmente, es deuda técnica de robustez. |
| 7 | D-07 — Cancelar cirugía mantiene CONFIRMADO (no degrada), marca CALIENTE, cirugía→CANCELADA, y el paciente reaparece en getListaAccion con `requiereRecontacto=true` | ✓ VERIFIED | `turnos.service.ts:260-292` — `cancelarTurno` con `esCirugia=true` no escribe `etapaCRM`, sí `temperatura=CALIENTE` + `cirugia.estado=CANCELADA` + `contactoLog`, todo en `$transaction` array-form. `pacientes.service.ts:894-969` — rama `OR` de recontacto en `getListaAccion` + flag `requiereRecontacto` derivado. Tests: `turnos.service.spec.ts:293-388` (A/B) + `pacientes.service.spec.ts:518-585` (C/D/E). |

**Score:** 7/7 truths verified (roadmap SC#1-3 + plan-level D-05/D-06/D-07/D-09 sub-truths)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/modules/pacientes/pacientes.service.ts` | `create()` default NUEVO_LEAD/null; `getListaAccion` recontacto | ✓ VERIFIED | Contains `etapaCRM: EtapaCRM.NUEVO_LEAD`, `flujo: null`, `requiereRecontacto` — all wired and tested |
| `backend/src/modules/pacientes/pacientes.service.spec.ts` | Regression tests D-01/D-03, recontacto D-07 | ✓ VERIFIED | 10+ new tests present and passing |
| `backend/src/modules/turnos/turnos.service.ts` | `crearTurnoCirugia`→CONFIRMADO; guard D-05/D-06; `cancelarTurno` D-07 | ✓ VERIFIED | All three mechanisms present, wired inside transactions |
| `backend/src/modules/turnos/turnos.service.spec.ts` | Tests D-04/D-05/D-06/D-07 (new file) | ✓ VERIFIED | File exists, 10 tests, all green |
| `backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts` | `resolverTipoEntrada` + `resolverNuevoFlujo` extended for `null` | ✓ VERIFIED | Both functions present, `flujoActual == null` branch present |
| `backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts` | Tests for forcing + flujo transition | ✓ VERIFIED | 19 tests covering D-08/D-09/D-10 incl. wiring |
| `backend/src/modules/historia-clinica/historia-clinica.service.ts` | `crearEntrada` uses resolved tipoEntrada, clears etapaCRM | ✓ VERIFIED | `resolverTipoEntrada` imported/used; `etapaCRM: null` conditioned on `nuevoFlujo === 'TRATAMIENTO'` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `pacientes.service.ts::create()` | `prisma.paciente.create` data literal | `etapaCRM: NUEVO_LEAD; flujo: null` | ✓ WIRED | Literal fields present in data object, confirmed by test asserting `create.mock.calls[0][0].data` |
| `turnos.service.ts::crearTurnoCirugia() $transaction` | `tx.paciente.update etapaCRM=CONFIRMADO` | write inside same tx, no nested tx | ✓ WIRED | Confirmed by code read (L834-837) and test asserting `this.prisma.paciente.update` is NOT called (only `tx.`) |
| `turnos.service.ts::crearTurno() guard` | `tipoTurno.nombre === 'Consulta'` | select `nombre` + condition `esConsulta \|\| !etapaAvanzada` | ✓ WIRED | select includes `nombre: true` (L58); condition present (L147-156) |
| `turnos.service.ts::cancelarTurno()` | `pacientes.service.ts::getListaAccion()` recontacto branch | `cirugia.estado=CANCELADA` + `temperatura=CALIENTE` → derived query | ✓ WIRED | `cancelarTurno` writes `EstadoCirugia.CANCELADA`; `getListaAccion` where-clause queries exactly that state set |
| `historia-clinica.service.ts::crearEntrada()` | `resolverTipoEntrada` + `resolverNuevoFlujo` | `tipoEntradaResuelto` used in both create-data and classification call | ✓ WIRED | `resolverNuevoFlujo(tipoEntradaResuelto, ...)` — not raw `dto.tipoEntrada` (confirmed by code read L275-279) |
| `crearEntrada() tx.paciente.update` | `flujo=TRATAMIENTO + etapaCRM=null` | conditional spread on `nuevoFlujo==='TRATAMIENTO'` | ✓ WIRED | L287/290 confirmed |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All phase-touched unit test suites pass | `cd backend && npx jest src/modules/pacientes/pacientes.service.spec.ts src/modules/turnos/turnos.service.spec.ts src/modules/historia-clinica/historia-clinica.flujo.spec.ts` | 3 suites, 52 tests, all passed | ✓ PASS |
| Type-check passes on the modified backend files | `cd backend && npx tsc --noEmit -p tsconfig.build.json` | No output / exit 0 (no TS errors) | ✓ PASS |
| No debt markers in phase-modified files | `grep -n -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` across the 4 modified service/helper files | No matches | ✓ PASS |
| Commits referenced in SUMMARYs exist | `git cat-file -t <hash>` for b2d5a1a, 79445e1, 7f2e520, a491383, 4b2049f, 6e455b0 | All resolve to `commit` | ✓ PASS |

### Probe Execution

Not applicable — this phase has no dedicated `scripts/*/tests/probe-*.sh` files and no probe references in PLAN/SUMMARY. Verification relied on unit-test execution + direct code reading (see Behavioral Spot-Checks and Goal Achievement tables above).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| EMBUDO-07 | 63-01-PLAN.md | Paciente nuevo entra al kanban en NUEVO_LEAD | ✓ SATISFIED | `pacientes.service.ts:69-70`, tests in `pacientes.service.spec.ts` |
| EMBUDO-08 | 63-02-PLAN.md | Agendar cirugía confirma sin presupuesto aceptado | ✓ SATISFIED | `turnos.service.ts:834-837`, tests in `turnos.service.spec.ts` |
| EMBUDO-09 | 63-03-PLAN.md | Tratamiento en consultorio saca al paciente del kanban, queda en planilla | ✓ SATISFIED | `historia-clinica.flujo.helpers.ts` + `historia-clinica.service.ts`, tests in `historia-clinica.flujo.spec.ts` |

No orphaned requirements — REQUIREMENTS.md traceability table (lines 69-71) maps exactly these 3 IDs to Phase 63, and all 3 appear in plan frontmatter `requirements:` fields (63-01/63-02/63-03).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/src/modules/turnos/turnos.service.ts` | 147 | Magic-string comparison `tipoTurno.nombre === 'Consulta'` gates the cyclic-funnel reset (D-06) | ⚠️ Warning (pre-existing finding, 63-REVIEW.md WR-01) | Fragile but functionally correct today; does not break SC#2. A rename/variant of the "Consulta" tipoTurno display name would silently disable the D-06 reset. Not a blocker for this phase's stated success criteria. |
| `backend/src/modules/pacientes/pacientes.service.ts` | 76 | `console.log('ERROR CAPTURADO EN CATCH:', error)` logs the raw error object (potential PII/query params) on every failed `create()` | ⚠️ Warning (pre-existing finding, 63-REVIEW.md WR-03) | Debug artifact left in place after the plan's PII cleanup only removed the pre-call `console.log`. Does not affect goal achievement — a logging hygiene issue, not a functional gap. |
| `backend/src/modules/turnos/turnos.service.ts` | 159-162 | `crearTurno`'s best-effort `flujo` auto-update only fires for `pacienteCRM?.flujo === FlujoPaciente.PENDIENTE`; new leads seeded with `flujo=null` (EMBUDO-07) never match this branch | ℹ️ Info — see "WR-02 Assessment" below | Confirmed asymmetry exists in code (matches 63-REVIEW.md WR-02 exactly). Assessed below: does not break any of the phase's 3 stated success criteria. |

#### WR-02 Assessment (requested in task)

Confirmed in code: `turnos.service.ts:159-162` (`crearTurno`'s generic `tipoTurno.flujoPaciente` auto-classification) and `historia-clinica.flujo.helpers.ts:25-26` (`resolverNuevoFlujo`'s `CONSULTA_CIRUGIA` branch) both still gate on `flujoActual === 'PENDIENTE'` and do **not** treat `null` as equivalent, unlike the `TRATAMIENTO` branch which was explicitly extended in 63-03 (D-09 note explicitly says "cubre PENDIENTE...y null...; CIRUGIA → null"). Net effect: a brand-new lead's `flujo` field can remain `null` forever unless it later goes through `crearEntrada` with a `TRATAMIENTO`-classified HC entry (which does handle null) — the generic turno-type and `CONSULTA_CIRUGIA` HC paths do not promote a `null`-flujo lead to `flujo=CIRUGIA`.

**Does this break SC#2 ("agendar cirugía → Confirmado en el kanban")?** No. `crearTurnoCirugia` — the actual surgery-booking endpoint referenced by SC#2 — sets `etapaCRM=CONFIRMADO` directly and unconditionally (turnos.service.ts:834-837); it does not read or depend on `pacienteCRM?.flujo` at all, and never writes to `flujo`. Separately, `getKanban`'s visibility filter is `OR:[{flujo:CIRUGIA},{flujo:null}]` — since a new lead's `flujo` remains `null` (never mutated away from `null` by this asymmetry), the patient continues to pass the visibility filter and appears in the `CONFIRMADO` kanban column exactly as SC#2 requires. The `flujo` field staying `null` instead of transitioning to `CIRUGIA` has no observable effect on kanban visibility, board column, or SC#1/SC#2/SC#3.

**Conclusion:** WR-02 is a real, confirmed asymmetry (an oversight, as the code review states) but it does not break any of Phase 63's three stated success criteria — it affects a *different*, non-required classification path (`tipoTurno.flujoPaciente` auto-detection for non-surgery turno types, and the `CONSULTA_CIRUGIA` HC branch) that was not part of this phase's roadmap contract. Reported here as an **observation**, not a gap. Recommend tracking as a follow-up (e.g., a small fix-forward plan or a note in the next phase touching `crearTurno`/`resolverNuevoFlujo`) since it is a latent correctness issue for future turno-type-driven flujo classification, even though it is currently harmless to the funnel automation delivered by this phase.

### Human Verification Required

None. This phase is backend-only, schema-free logic fully covered by unit tests (52 tests across the 3 touched specs, all green) and directly readable in source (no UI, no external service, no real-time behavior). All three success criteria and all D-* plan-level truths were verified by direct code inspection plus passing automated tests — no behavior in this phase requires visual, UX, or live-service confirmation.

### Gaps Summary

No gaps found. All 3 roadmap success criteria (EMBUDO-07/08/09) and all plan-level must-have truths (D-01 through D-10) are implemented, wired, and covered by passing unit tests. `tsc --noEmit` is clean, no unresolved debt markers exist in the phase-modified files, and all commits referenced in the SUMMARYs resolve in git history.

The code-review-flagged WR-02 asymmetry (`flujo=null` new leads not reached by the two remaining `=== 'PENDIENTE'` gates) was independently re-derived from the code and confirmed accurate, but assessed to have no impact on any of this phase's three success criteria — see "WR-02 Assessment" above. It is carried forward as a non-blocking observation/follow-up item, not a phase gap.

---

*Verified: 2026-07-31T22:06:49Z*
*Verifier: Claude (gsd-verifier)*
