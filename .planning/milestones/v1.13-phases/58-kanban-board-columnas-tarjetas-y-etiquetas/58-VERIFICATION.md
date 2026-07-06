---
phase: 58-kanban-board-columnas-tarjetas-y-etiquetas
verified: 2026-07-04T00:00:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Abrir el board CRM en el navegador con datos reales de un profesional y verificar que las columnas aparecen en el orden correcto: ..., Confirmado, Cirugia Realizada, Perdido, Sin clasificar (ultima)"
    expected: "La columna 'Sin clasificar' es la ultima del board visible; 'Cirugia Realizada' aparece inmediatamente despues de 'Confirmado'"
    why_human: "El orden de columnas depende de que el backend retorne esas etapas en el payload de getKanban y que el frontend las ordene segun ETAPA_ORDER. La logica de ETAPA_ORDER esta verificada en el source, pero la renderizacion real en el browser con datos reales no puede confirmarse con grep."
  - test: "En el board CRM, encontrar una tarjeta en la columna 'Cirugia Realizada' y verificar que muestra un badge naranja con texto 'Pasos pendientes'"
    expected: "Badge naranja visible con punto naranja y texto 'Pasos pendientes'"
    why_human: "El renderizado condicional esta verificado en el source (columnId === PROCEDIMIENTO_REALIZADO && !todosCompletos), pero el aspecto visual y la correcta recepcion del campo todosCompletos desde el backend require prueba en browser."
  - test: "En el board CRM, encontrar una tarjeta en 'Confirmado' cuyo paciente no tenga turno de cirugia asignado y verificar que muestra la etiqueta 'Espera fecha'"
    expected: "Badge azul con texto exacto 'Espera fecha' visible en la tarjeta"
    why_human: "Requiere un paciente real en estado CONFIRMADO con pasos.cirugia === 'pendiente'. No puede verificarse con datos en tiempo de analisis estatico."
  - test: "En el board CRM, encontrar una tarjeta en 'Confirmado' cuyo paciente tenga turno de cirugia asignado (D-07) y verificar que muestra la etiqueta 'Cirugia programada'"
    expected: "Badge azul con texto exacto 'Cirugia programada' (con acento: 'Cirugía programada') visible en la tarjeta"
    why_human: "Requiere un paciente real en CONFIRMADO con pasos.cirugia === 'completo'. No puede verificarse con datos en tiempo de analisis estatico."
  - test: "Identificar un paciente con todos los 5 pasos completos (todosCompletos = true) y confirmar que NO aparece en ninguna columna del board"
    expected: "El paciente es invisible en el board; si el contador de la columna PROCEDIMIENTO_REALIZADO sube/baja al completar el ultimo paso, el contador refleja el estado filtrado"
    why_human: "EMBUDO-04 es un filtro presentacional sobre datos del backend. Verificar que el campo todosCompletos llega en true desde el backend y que el filtro lo aplica correctamente requiere inspeccion de red o de datos reales."
---

# Phase 58: Kanban Board Columnas, Tarjetas y Etiquetas — Verification Report

**Phase Goal:** El board del kanban refleja el nuevo orden de columnas, muestra la columna "Cirugia Realizada" con los indicadores correctos, y las tarjetas en "Confirmado" llevan la etiqueta de contacto apropiada.
**Verified:** 2026-07-04
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | La columna 'Sin clasificar' aparece como ultima columna del board | VERIFIED | `ETAPA_ORDER` (useCRMKanban.ts:82-91) terminates with `"SIN_CLASIFICAR"` at index 7 (last). KanbanBoard sorts columns by `ETAPA_ORDER.indexOf`, so SIN_CLASIFICAR renders last. |
| 2 | La columna 'Cirugia Realizada' aparece inmediatamente despues de 'Confirmado' | VERIFIED | `ETAPA_ORDER[4] = "CONFIRMADO"`, `ETAPA_ORDER[5] = "PROCEDIMIENTO_REALIZADO"`. `ETAPA_LABELS.PROCEDIMIENTO_REALIZADO = "Cirugía Realizada"` (useCRMKanban.ts:75). |
| 3 | Un paciente en 'Cirugia Realizada' con al menos un paso pendiente muestra un indicador naranja en su tarjeta | VERIFIED | PatientCard.tsx:135-140: `columnId === "PROCEDIMIENTO_REALIZADO" && !patient.todosCompletos` renders `<span class="...border-orange-400 text-orange-600...bg-orange-50"><span class="...bg-orange-500..." />Pasos pendientes</span>`. `!todosCompletos` is logically equivalent to "at least one step pending". |
| 4 | Un paciente con los 5 pasos completos (todosCompletos) no aparece en ninguna columna del board | VERIFIED | KanbanBoard.tsx:139-146: `displayedColumns` filters every column's patient list with `.filter((p) => !p.todosCompletos)` after `applyPendingMoves`, then recalculates `total: pacientes.length`. All columns are filtered. |
| 5 | Una tarjeta en 'Confirmado' sin turno de cirugia muestra la etiqueta 'Espera fecha' | VERIFIED | PatientCard.tsx:143-147: `columnId === "CONFIRMADO"` gate + ternary `patient.pasos?.cirugia === "completo" ? "Cirugía programada" : "Espera fecha"`. When `cirugia === "pendiente"` (no surgery scheduled) the else branch produces "Espera fecha". |
| 6 | Una tarjeta en 'Confirmado' con turno de cirugia muestra la etiqueta 'Cirugia programada' | VERIFIED | Same ternary on PatientCard.tsx:145. When `pasos.cirugia === "completo"` the truthy branch produces "Cirugía programada" (with accent). |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/hooks/useCRMKanban.ts` | KanbanPatient extended with pasos+todosCompletos; ETAPA_ORDER reordered; ETAPA_LABELS relabeled | VERIFIED | File exists, substantive, wired. PasoEstado type (line 26), PasosCrm interface with all 5 keys (lines 28-34), KanbanPatient.pasos (line 59), KanbanPatient.todosCompletos (line 60), ETAPA_LABELS.PROCEDIMIENTO_REALIZADO = "Cirugía Realizada" (line 75), correct ETAPA_ORDER (lines 82-91). |
| `frontend/src/components/crm/KanbanBoard.tsx` | Filter patients with todosCompletos from board (EMBUDO-04) | VERIFIED | File exists, substantive, wired. `displayedColumns` useMemo applies `.filter((p) => !p.todosCompletos)` (line 140) after applyPendingMoves (line 136), recalculates total (line 146). |
| `frontend/src/components/crm/PatientCard.tsx` | Orange indicator in PROCEDIMIENTO_REALIZADO + contact label in CONFIRMADO | VERIFIED | File exists, substantive, wired. Orange indicator block (lines 134-140), contact label block (lines 142-147). Both conditioned by `columnId` prop which KanbanColumn passes as `column.etapa` (KanbanColumn.tsx:69). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `KanbanBoard.tsx` | `patient.todosCompletos` | `.filter((p) => !p.todosCompletos)` in displayedColumns useMemo | WIRED | Line 140: filter applied to every column's pacientes array. |
| `PatientCard.tsx` | `patient.pasos.cirugia` | Ternary contact label when `columnId === "CONFIRMADO"` | WIRED | Line 145: `patient.pasos?.cirugia === "completo"` with optional chaining for safety. |
| `useCRMKanban.ts` | `ETAPA_ORDER` | Board column order (PROCEDIMIENTO_REALIZADO after CONFIRMADO) | WIRED | Lines 87-88: "CONFIRMADO" at index 4, "PROCEDIMIENTO_REALIZADO" at index 5, "SIN_CLASIFICAR" at index 7 (last). KanbanBoard.tsx imports and applies ETAPA_ORDER. |
| `KanbanColumn.tsx` | `PatientCard[columnId]` | `columnId={column.etapa}` prop | WIRED | KanbanColumn.tsx:69: passes the raw etapa string ("PROCEDIMIENTO_REALIZADO", "CONFIRMADO", etc.) as columnId, enabling PatientCard's conditional rendering. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `PatientCard.tsx` | `patient.pasos.cirugia`, `patient.todosCompletos` | `useCRMKanban` hook → `GET /pacientes/kanban` → `computePasosCrm` spread (Phase 57, backend) | Yes — server-side computation of real DB records, not hardcoded | FLOWING |
| `KanbanBoard.tsx` | `p.todosCompletos` | Same API response — spread by `getKanban` service from `computePasosCrm` | Yes | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for interactive browser checks (no runnable entry point without starting Next.js dev server). Static code analysis substituted — all patterns confirmed by direct source read.

### Probe Execution

Step 7c: No `probe-*.sh` scripts declared or found for this phase. The PLAN.md `<verify>` blocks use inline `grep` + `tsc` commands (not probe scripts). Probes: N/A.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EMBUDO-01 | 58-01-PLAN.md | La columna "Sin clasificar" aparece al final del embudo | SATISFIED | `ETAPA_ORDER` ends with "SIN_CLASIFICAR" (index 7); KanbanBoard sorts by this order. |
| EMBUDO-03 | 58-01-PLAN.md | Paciente operado con paso pendiente muestra indicador naranja en "Cirugia Realizada" | SATISFIED | PatientCard.tsx:135-140: orange badge rendered when `columnId === "PROCEDIMIENTO_REALIZADO" && !patient.todosCompletos`. |
| EMBUDO-04 | 58-01-PLAN.md | Paciente operado con todos los pasos completos se oculta del board | SATISFIED | KanbanBoard.tsx:139-146: `filter((p) => !p.todosCompletos)` on all columns + recalculated totals. |
| CONTACTO-01 | 58-01-PLAN.md | Tarjeta en "Confirmado" sin turno de cirugia muestra "Espera fecha" | SATISFIED | PatientCard.tsx:145: else branch of ternary on `pasos?.cirugia === "completo"` produces "Espera fecha". |
| CONTACTO-02 | 58-01-PLAN.md | Tarjeta en "Confirmado" con turno de cirugia muestra "Cirugia programada" | SATISFIED | PatientCard.tsx:145: truthy branch of same ternary produces "Cirugía programada". |

**Orphaned requirements check:** REQUIREMENTS.md maps EMBUDO-01, EMBUDO-03, EMBUDO-04, CONTACTO-01, CONTACTO-02 to Phase 58 — all 5 appear in the plan's `requirements:` field. No orphaned requirements.

**Note — EMBUDO-02 partial scope:** EMBUDO-02 is marked Complete in Phase 57 (backend added the column). Phase 58's success criterion "(EMBUDO-02 display)" adds the frontend ordering aspect (ETAPA_ORDER placement). EMBUDO-02 is NOT listed in this plan's `requirements:` field and does not create an orphan — it is the Phase 57 requirement extended by this phase's own success criteria.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None | — | — |

Scanned all three modified files for: TBD, FIXME, XXX, TODO, HACK, PLACEHOLDER, return null, return [], hardcoded empty data, console.log stubs. Result: clean.

### Human Verification Required

#### 1. Column Order in Browser

**Test:** Open the CRM Kanban board in the browser with a real professional context. Observe the rendered column order.
**Expected:** Columns appear in this sequence from left to right: Nuevo Lead, Consulta Agendada, Consulta Realizada, Presupuesto Enviado, Confirmado, Cirugia Realizada, Perdido, Sin clasificar. "Sin clasificar" is the rightmost column.
**Why human:** Depends on the backend actually returning these etapa values in the getKanban payload and the browser rendering them. Static analysis confirms ETAPA_ORDER is correct, but runtime rendering cannot be verified with grep.

#### 2. Orange Indicator in "Cirugia Realizada"

**Test:** Find a patient card in the "Cirugia Realizada" column (PROCEDIMIENTO_REALIZADO). The patient must have at least one paso in 'pendiente' state (i.e., todosCompletos is false).
**Expected:** The card shows a visible orange badge with a filled orange dot and the text "Pasos pendientes".
**Why human:** The conditional rendering logic is verified in source, but the correct delivery of `todosCompletos: false` from the backend API and the visual appearance require browser inspection or network tab review.

#### 3. "Espera fecha" Label in "Confirmado" (CONTACTO-01)

**Test:** Find a patient in "Confirmado" who does not have a surgery appointment scheduled (pasos.cirugia === 'pendiente').
**Expected:** The card shows a blue badge with the exact text "Espera fecha".
**Why human:** Requires a real patient record where the backend computes pasos.cirugia as 'pendiente'. Cannot be verified statically.

#### 4. "Cirugia programada" Label in "Confirmado" (CONTACTO-02)

**Test:** Find a patient in "Confirmado" who has a surgery appointment scheduled (D-07 turno de cirugia, pasos.cirugia === 'completo').
**Expected:** The card shows a blue badge with the exact text "Cirugía programada" (with accent on the i).
**Why human:** Requires a real patient record where the backend computes pasos.cirugia as 'completo'. Cannot be verified statically.

#### 5. todosCompletos Filter Hides Patient from Board (EMBUDO-04)

**Test:** Identify a patient who has all 5 steps complete (HC entry, presupuesto, cirugia, consentimiento, indicacionesPreop all 'completo'). Verify they do not appear on the board.
**Expected:** Patient is invisible across all columns. Column counters do not include this patient.
**Why human:** Requires real backend data where `todosCompletos = true` is returned. The filter logic is verified in source, but the backend computation (from Phase 57) delivering this value correctly requires end-to-end verification.

### Gaps Summary

No gaps. All 6 must-have truths are VERIFIED against actual code. All artifacts exist, are substantive, and are wired with real data flow. No blockers.

Human verification is required to confirm browser rendering and end-to-end data delivery from the Phase 57 backend payload. These are standard visual/runtime checks that cannot be automated without running the application.

---

_Verified: 2026-07-04_
_Verifier: Claude (gsd-verifier)_
