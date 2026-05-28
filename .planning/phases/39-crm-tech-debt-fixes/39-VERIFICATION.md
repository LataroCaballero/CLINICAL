---
phase: 39-crm-tech-debt-fixes
verified: 2026-05-28T17:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 39: CRM Tech Debt Fixes — Verification Report

**Phase Goal:** Close the 3 CRM tech debt gaps identified in the v1.7 audit — TD-1 (rechazar guard), TD-2 (STEPPER_CHAIN order), TD-3 (getKanban budget selection).
**Verified:** 2026-05-28T17:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | rechazar() does not move a patient to PERDIDO if they are in CONFIRMADO or PROCEDIMIENTO_REALIZADO | VERIFIED | Lines 303-311 of presupuestos.service.ts: reads `etapaCRM`, builds `etapasProtegidas` list, conditional spread `...maybyCRMUpdate` in `$transaction` |
| 2  | getKanban returns the ACEPTADO presupuesto when it exists, ignoring newer lower-state presupuestos | VERIFIED | Lines 611-614 pacientes.service.ts: `where: { estado: { not: 'RECHAZADO' } }`, no `take: 1`. Lines 658-661: `presupuestoSeleccionado = find(ACEPTADO) ?? [0] ?? null` |
| 3  | getEtapaWarning false CONFIRMADO warning is eliminated for multi-presupuesto patients | VERIFIED | Downstream consequence of Truth 2 — kanban map uses `presupuestoSeleccionado` for all `presupuesto:` and `diasDesdePresupuesto:` fields |
| 4  | STEPPER_CHAIN shows CONFIRMADO before PROCEDIMIENTO_REALIZADO (index 5 and 6 respectively) | VERIFIED | EtapaStepper.tsx lines 8-16: `"CONFIRMADO"` at index 5, `"PROCEDIMIENTO_REALIZADO"` at index 6 with comments confirming alignment |
| 5  | Stepper activeIndex calculation is wired to displayEtapa via indexOf — string-keyed, not index-keyed | VERIFIED | Line 39: `STEPPER_CHAIN.indexOf(displayEtapa)`; contextual button checks at lines 57-59 and 130 use string comparisons (`etapa === "PROCEDIMIENTO_REALIZADO"`) |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/modules/presupuestos/presupuestos.service.ts` | rechazar() with etapasProtegidas guard | VERIFIED | `etapasProtegidas` at line 307, `bloqueado` at 308, `maybyCRMUpdate` conditional spread at 309-311, spread into `$transaction` at line 326 |
| `backend/src/modules/pacientes/pacientes.service.ts` | getKanban with ACEPTADO-first presupuesto selection | VERIFIED | Sub-query at lines 611-614 has `where: { estado: { not: 'RECHAZADO' } }` and no `take: 1`; `presupuestoSeleccionado` at lines 658-661 |
| `frontend/src/components/crm/EtapaStepper.tsx` | STEPPER_CHAIN with CONFIRMADO at index 5, PROCEDIMIENTO_REALIZADO at index 6 | VERIFIED | Lines 8-16 confirm correct order |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| presupuestos.service.ts rechazar() | prisma.paciente.update etapaCRM=PERDIDO | maybyCRMUpdate conditional spread | WIRED | `bloqueado` guard at line 308; `...maybyCRMUpdate` at line 326 inside `$transaction` — update fires only when patient is NOT in protected stage |
| pacientes.service.ts getKanban() | presupuesto field in KanbanPatient | presupuestoSeleccionado = find(ACEPTADO) ?? [0] | WIRED | `presupuestoSeleccionado` used at lines 673, 675, 676, 677, 680, 683 — all presupuesto fields reference the selected variable, not raw `p.presupuestos[0]` |
| STEPPER_CHAIN array | activeIndex calculation | STEPPER_CHAIN.indexOf(displayEtapa) | WIRED | Line 39: `STEPPER_CHAIN.indexOf(displayEtapa)`; CONFIRMADO at index 5 produces correct forward progression for patient in CONFIRMADO |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| TD-1 | 39-01-PLAN.md | rechazar() guard: do not write PERDIDO when patient is in CONFIRMADO or PROCEDIMIENTO_REALIZADO | SATISFIED | etapasProtegidas guard in rechazar() at lines 307-311, commit 7a5dd7b. REQUIREMENTS.md line 79 shows Complete. |
| TD-2 | 39-02-PLAN.md | STEPPER_CHAIN order: CONFIRMADO(5) before PROCEDIMIENTO_REALIZADO(6) | SATISFIED | STEPPER_CHAIN lines 14-15 in EtapaStepper.tsx, commit dfb3d1c. REQUIREMENTS.md line 80 shows Complete. |
| TD-3 | 39-01-PLAN.md | getKanban prioritizes ACEPTADO presupuesto to eliminate false CRM-03 warning | SATISFIED | presupuesto sub-query without take:1, presupuestoSeleccionado at lines 658-661, commit c95f255. REQUIREMENTS.md line 81 shows Complete. |

No orphaned requirements — REQUIREMENTS.md lines 79-81 map all three IDs to Phase 39 and all are claimed in plan frontmatter.

### Anti-Patterns Found

None. Grep across all three modified files returned no TODO, FIXME, XXX, HACK, or placeholder markers.

### Human Verification Required

#### 1. Visual stepper display for CONFIRMADO patient

**Test:** Open the CRM kanban, navigate to a patient in CONFIRMADO stage, open the card actions sheet and inspect the stepper.
**Expected:** PROCEDIMIENTO_REALIZADO renders as the next step to the right (unfilled), not as a past step to the left. CONFIRMADO is highlighted as current.
**Why human:** Visual progression of step indicators cannot be asserted programmatically; requires browser rendering.

#### 2. rechazar() guard under real multi-tenant flow

**Test:** With a patient in CONFIRMADO or PROCEDIMIENTO_REALIZADO, have a staff user reject the active presupuesto via the UI.
**Expected:** The patient's CRM stage remains unchanged (does not become PERDIDO). The presupuesto transitions to RECHAZADO.
**Why human:** Cannot invoke the full auth + guard middleware path from a grep check; requires a live API call with valid credentials.

### Gaps Summary

No gaps. All three tech debt items are closed and verified in code.

- **TD-1:** rechazar() mirrors rechazarByToken() exactly — the `etapasProtegidas` list and conditional spread pattern are replicated character-for-character.
- **TD-2:** STEPPER_CHAIN array has the correct order in the live file; git commit dfb3d1c is present in log.
- **TD-3:** getKanban sub-query no longer uses `take: 1` for presupuestos; the `where: { estado: { not: 'RECHAZADO' } }` filter is in place and `presupuestoSeleccionado` is used consistently across all four presupuesto field references in the map.

---

_Verified: 2026-05-28T17:00:00Z_
_Verifier: Claude (gsd-verifier)_
