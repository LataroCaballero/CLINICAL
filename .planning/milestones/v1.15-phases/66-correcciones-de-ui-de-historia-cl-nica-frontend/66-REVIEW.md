---
phase: 66-correcciones-de-ui-de-historia-cl-nica-frontend
reviewed: 2026-08-08T17:15:01Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx
  - frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 66: Code Review Report

**Reviewed:** 2026-08-08T17:15:01Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Phase 66 is a frontend-only change with two edits scoped by the diff against base `9207a64`:

1. `HCEntryContent.tsx` — added a `ContenidoPreQuirurgico` interface, extended the `ContenidoEntrada` union, and added read-only `pre_quirurgico` render branches to both `HCEntryChips` (card preview) and `HCEntryFullContent` (detail modal). These are pure read renders of persisted JSONB with defensive optional chaining.
2. `HistoriaClinica.tsx` — removed dead "Nueva entrada" dropdown, the free-text form, the template-selector modal, and their supporting state/handlers/imports; added `pre_quirurgico` to `TIPO_LABELS`.

The dead-code removal is clean: I grep-verified there are no lingering references to any removed symbol (`showForm`, `showTemplateSelector`, `handleGuardar`, `handleSelectTemplate`, `useCreateHistoriaClinicaEntry`, `useAvailableHCTemplates`, `useCreateHCEntry`, `HCTemplateWithCurrentVersion`, `Textarea`, `DropdownMenu*`, `ChevronDown`, `Plus`). All remaining imports are still used. No security concerns: rendering is read-only, all text goes through JSX auto-escaping, no `dangerouslySetInnerHTML`/`eval`/injection surface. No null-dereference crash paths were found — array accesses are guarded by `?.length` checks before `.map`.

No blockers. One behavioral inconsistency and two minor quality notes below.

## Warnings

### WR-01: Preview shows "(sin contenido)" for pre-quirúrgico entries that only have `estudiosComplementarios`

**File:** `frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx:149-160`
**Issue:** In `HCEntryChips`, the `hasAny` guard for the `pre_quirurgico` branch omits `estudiosComplementarios`:

```ts
const hasAny =
  (pq.antecedentes?.length ?? 0) > 0 ||
  (pq.alergias?.length ?? 0) > 0 ||
  (pq.medicacion?.length ?? 0) > 0 ||
  !!pq.consentimientoInformadoAt ||
  !!pq.comentario;   // estudiosComplementarios missing
```

The full-content variant (`HCEntryFullContent`, line 451-457) *does* include `!!pq.estudiosComplementarios` in its `hasAny`. As a result, a plausible entry where a surgeon recorded only that labs/ECG/imaging were ordered (e.g. `estudiosComplementarios.laboratorio = true`, everything else empty) renders as **"(sin contenido)"** in the card preview, yet opening the detail modal reveals populated "Estudios complementarios". This is a misleading empty-state that can make users think the entry has no data. The card variant additionally never renders any estudios indicator even when it is the only content present.

**Fix:** Include estudios in the preview guard and surface a lightweight indicator so the preview is not falsely empty:

```ts
const hasEstudios =
  !!pq.estudiosComplementarios &&
  (pq.estudiosComplementarios.laboratorio ||
    pq.estudiosComplementarios.ecg ||
    (pq.estudiosComplementarios.imagenes?.length ?? 0) > 0);

const hasAny =
  (pq.antecedentes?.length ?? 0) > 0 ||
  (pq.alergias?.length ?? 0) > 0 ||
  (pq.medicacion?.length ?? 0) > 0 ||
  hasEstudios ||
  !!pq.consentimientoInformadoAt ||
  !!pq.comentario;
```

and render a chip when `hasEstudios` (e.g. `<Badge variant="secondary" className="text-xs">Estudios: Sí</Badge>`), mirroring the existing consentimiento chip.

## Info

### IN-01: `as unknown as ContenidoPreQuirurgico` double-cast bypasses type checking

**File:** `frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx:148` and `:436`
**Issue:** Both new branches narrow via `const pq = c as unknown as ContenidoPreQuirurgico;`. The `as unknown as` double cast fully disables compiler validation of the shape, so a future change to the `ContenidoPreQuirurgico` interface would not be caught at these access sites. It is consistent with the file's existing pattern for `primera_vez`, so this is a note rather than a defect.
**Fix:** Prefer a typed discriminated-union narrow. Since `ContenidoPreQuirurgico` is now a member of `ContenidoEntrada`, narrowing on the raw `contenido` (rather than the pre-cast intersection `c`) via `contenido.tipo === "pre_quirurgico"` would let TypeScript narrow to `ContenidoPreQuirurgico` without the escape-hatch cast.

### IN-02: Array index used as React key in new list renders

**File:** `frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx:166,175,184,442,485`
**Issue:** The new `pre_quirurgico` lists use `key={i}` (array index) for antecedentes/alergias/medicación/imágenes badges. Index keys can cause incorrect reconciliation if items are reordered/inserted. These lists are read-only and static per render, and this matches the file's pre-existing convention (legacy `primera_vez` uses the same), so impact is negligible.
**Fix:** Where item strings are unique, use the value as the key (e.g. `key={a}`); otherwise leave as-is given the read-only nature.

---

_Reviewed: 2026-08-08T17:15:01Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
