---
phase: 58-kanban-board-columnas-tarjetas-y-etiquetas
reviewed: 2026-07-04T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - frontend/src/hooks/useCRMKanban.ts
  - frontend/src/components/crm/KanbanBoard.tsx
  - frontend/src/components/crm/PatientCard.tsx
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 58: Code Review Report

**Reviewed:** 2026-07-04T00:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed the Phase 58 Kanban changes: new `PasosCrm`/`todosCompletos` types and reordered `ETAPA_ORDER` (useCRMKanban.ts), the EMBUDO-04 "hide completed patients" filter (KanbanBoard.tsx), and two new step/contact badges (PatientCard.tsx).

No security vulnerabilities or crash-level defects were found. The optimistic-move / de-duplication logic in `applyPendingMoves` was traced and is correct across the cross-user-refetch and settle cases. However, several correctness and robustness issues remain: the open-sheet sync effect silently ignores non-etapa data changes, the date-formatting helpers produce garbage on future/invalid dates, and a dnd-kit post-drop synthetic click can open the actions sheet unintentionally.

## Warnings

### WR-01: Open actions-sheet only re-syncs on `etapaCRM` change — stale data for all other fields

**File:** `frontend/src/components/crm/KanbanBoard.tsx:74-83`
**Issue:** The effect comment states it should "keep the open sheet's patient in sync when the query re-renders with new data," but the guard `updated.etapaCRM !== actionPatientRef.current.etapaCRM` only fires `setActionPatient` when the *etapa* changed. If a mutation elsewhere updates `temperatura`, `presupuesto`, `pasos`, `ultimoContacto*`, `pendingAutorizaciones`, etc. (e.g. the user changes temperature from the card while the sheet is open), the refetched data is ignored and `CardActionsSheet` keeps rendering the stale snapshot captured when it opened.
**Fix:** Compare identity/reference and update whenever the located patient object differs, not just on etapa:
```ts
useEffect(() => {
  const current = actionPatientRef.current;
  if (!current) return;
  for (const col of columns) {
    const updated = col.pacientes.find((p) => p.id === current.id);
    if (updated && updated !== current) {
      setActionPatient(updated);
      return;
    }
  }
}, [columns]);
```

### WR-02: Date helpers produce negative/`NaN` output on future or invalid dates

**File:** `frontend/src/components/crm/PatientCard.tsx:19-31`
**Issue:** `formatTimeSince` computes `Date.now() - new Date(fecha)` with no guard. A `ultimoContactoFecha` that is in the future (clock skew, timezone edge, or a scheduled/next-contact date accidentally fed in) yields negative `hours`, rendering `"-3h"`. An unparseable string yields `NaN`, rendering `"NaNh"`. `contactBadgeColor` has the same exposure (`NaN` comparisons fall through to the green "recent" branch, mislabeling stale/invalid contacts as fresh).
**Fix:** Clamp and validate:
```ts
function formatTimeSince(fecha: string): string {
  const t = new Date(fecha).getTime();
  if (Number.isNaN(t)) return "";
  const diffMs = Math.max(0, Date.now() - t);
  const hours = Math.floor(diffMs / 3_600_000);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}
```
Apply an equivalent `Number.isNaN` guard in `contactBadgeColor`.

### WR-03: Card `onClick` can fire a synthetic click after a drag, opening the actions sheet on drop

**File:** `frontend/src/components/crm/PatientCard.tsx:66`
**Issue:** `onClick={() => !isDragging && onOpenActions?.(patient)}` guards with `isDragging`, but by the time the browser dispatches the synthetic `click` following a pointer drag, dnd-kit has already ended the drag and `isDragging` is back to `false`. The guard therefore does not suppress the post-drop click, so completing a drag-and-drop can also pop the `CardActionsSheet`. The 8px activation constraint reduces but does not eliminate this (a card dropped after moving >8px still emits the trailing click).
**Fix:** Track drag intent across the interaction (e.g. set a `justDragged` ref in `onDragStart`/`onDragEnd`, or record pointer-down coordinates and skip `onOpenActions` if the pointer moved beyond the activation distance) instead of relying on the transient `isDragging` flag.

## Info

### IN-01: `TEMP_ORDER` recreated every render and read inside `useMemo` without being a dependency

**File:** `frontend/src/components/crm/KanbanBoard.tsx:133`
**Issue:** `TEMP_ORDER` is a constant literal declared in the component body, so it is re-allocated on every render and is referenced inside the `displayedColumns` `useMemo` (deps `[sortedColumns, pendingMoves]`) without being listed. Functionally harmless because its value never changes, but it will trip `react-hooks/exhaustive-deps` and is needless per-render allocation.
**Fix:** Hoist to module scope alongside `ETAPA_ORDER`:
```ts
const TEMP_ORDER: Record<string, number> = { CALIENTE: 0, TIBIO: 1, FRIO: 2 };
```

### IN-02: Redundant `!patient.todosCompletos` guard on the PROCEDIMIENTO_REALIZADO badge

**File:** `frontend/src/components/crm/PatientCard.tsx:135`
**Issue:** EMBUDO-04 already filters every `todosCompletos` patient out of `displayedColumns` (KanbanBoard.tsx:139-140), so any card rendered in the board can never be `todosCompletos`. The extra `&& !patient.todosCompletos` condition is always true for board cards. Not a bug (it is correctly defensive for the `DragOverlay` render), but worth a comment noting the double-gating so a future reader does not assume completed cards can reach this branch.
**Fix:** Leave as-is or add an inline note; no behavior change required.

### IN-03: `pasos` / `todosCompletos` typed as required but consumed defensively — type/runtime mismatch

**File:** `frontend/src/hooks/useCRMKanban.ts:59-60`
**Issue:** `pasos: PasosCrm` and `todosCompletos: boolean` are declared non-optional, yet consumers correctly hedge against absence: `patient.pasos?.cirugia` (PatientCard.tsx:145) and `!p.todosCompletos` (KanbanBoard.tsx:140, which treats missing as "show"). The backend does populate both via `...computePasosCrm(...)` (pacientes.service.ts:741), so the shape is currently satisfied, but the optional-chaining implies the author was not certain. Align the contract: either drop the `?.` (trusting the type) or mark the fields optional to match the defensive reads.
**Fix:** If the backend guarantees the fields, remove the `?.` for consistency; otherwise mark `pasos?: PasosCrm; todosCompletos?: boolean;` so the type reflects actual usage.

---

_Reviewed: 2026-07-04T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
