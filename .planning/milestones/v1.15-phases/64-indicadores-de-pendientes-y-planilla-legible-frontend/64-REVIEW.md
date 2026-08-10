---
phase: 64-indicadores-de-pendientes-y-planilla-legible-frontend
reviewed: 2026-08-03T17:04:48Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts
  - backend/src/modules/historia-clinica/historia-clinica.contenido.spec.ts
  - backend/src/modules/turnos/turnos.service.ts
  - frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx
  - frontend/src/components/crm/PatientCard.tsx
  - frontend/src/hooks/useTurnosRangos.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 64: Code Review Report

**Reviewed:** 2026-08-03T17:04:48Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 64 exposes a new `tratamientos: string[]` array on `GET /turnos/rango` (backed by a
new pure helper `listarTratamientosDeContenido`), renders it as a Radix-tooltip treatment
list in `TratamientosTab`, and adds stage-based "pendiente" badges to the CRM `PatientCard`.

The backend change is a clean, well-tested pure-function extraction. The
`resumirTratamientosDeContenido` / `listarTratamientosDeContenido` pair is provably
consistent (both signal presence identically), so the source-B visibility filter that still
keys off `ultimoTratamiento` stays in sync with the new `tratamientos` display — no
divergence bug there. The Radix `Tooltip` self-wraps a `TooltipProvider`, so no missing-provider
crash.

Three issues warrant attention: a header-count that contradicts its own stated requirement
after filtering, a malformed-JSONB crash path that now has a second reachable entry point,
and untruncated free-text clinical notes being serialized into the range endpoint.

## Warnings

### WR-01: Header summary counts pre-filter rows despite comment claiming "post-filtro (TRAT-06)"

**File:** `frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx:88-97`
**Issue:** The comment on line 88 states the estado counts are computed "sobre filas visibles
post-filtro (TRAT-06)", but `countByEstado` and `totalCount` are reduced over
`tratamientoTurnos` (the unfiltered set), not `visibleTurnos`. When the user selects a value
in the tipo dropdown (`filterTipoId`), the table body narrows to `visibleTurnos` but the
header summary ("N tratamientos (X realizados, ...)") keeps showing month totals. The stated
requirement TRAT-06 and the rendered table disagree — the header is misleading after any
filter is applied.
**Fix:**
```ts
// Count by estado for header — sobre filas visibles post-filtro (TRAT-06)
const countByEstado = visibleTurnos.reduce<Record<string, number>>(
  (acc, t) => {
    acc[t.estado] = (acc[t.estado] ?? 0) + 1;
    return acc;
  },
  {}
);
const totalCount = visibleTurnos.length;
```
Note: switching the empty-state guard is not required (it intentionally keys off
`tratamientoTurnos` to distinguish "no treatments this month" from "filter hides all"), but
if `totalCount` becomes filter-aware, verify the `headerSummary` still reads sensibly with a
filter that yields zero visible rows.

### WR-02: Malformed JSONB `contenido` crashes the entire `/turnos/rango` request

**File:** `backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts:141-152`
**Issue:** `extraerNombresTratamiento` assumes every element of `c.zonas` and `c.tratamientos`
is a non-null object. `contenido` is untyped JSONB (`unknown`), so a stored entry whose
`tratamientos` array contains a `null` element (or a `zonas` array containing a `null` zona)
throws `TypeError: Cannot read properties of null (reading 'nombre')` inside
`.map((t) => ... t.nombre ...)` / `.flatMap((z) => z.tratamientos ...)`. Because
`turnos.service.ts:592-604` maps this helper over *every* turno in the requested month, a
single malformed HC entry 500s the whole planilla for that professional/month. This crash
pattern pre-existed in `resumirTratamientosDeContenido`, but Phase 64 adds a second reachable
call site (`listarTratamientosDeContenido`, line 181) on the same hot path without hardening
it. None of the spec cases (lines 284-298, 370-381) exercise a null/non-object array element.
**Fix:** Guard element access in the shared extractor:
```ts
if (Array.isArray(c.zonas) && (c.zonas as unknown[]).length > 0) {
  return (c.zonas as Array<{ tratamientos?: Array<{ nombre?: unknown }> } | null>)
    .flatMap((z) => z?.tratamientos ?? [])
    .map((t) => (t && typeof t.nombre === 'string' ? t.nombre.trim() : ''))
    .filter((n) => n.length > 0);
}

if (Array.isArray(c.tratamientos)) {
  return (c.tratamientos as Array<{ nombre?: unknown } | null>)
    .map((t) => (t && typeof t.nombre === 'string' ? t.nombre.trim() : ''))
    .filter((n) => n.length > 0);
}
```
Add a spec case with `{ tratamientos: [null, { nombre: 'X' }] }` and
`{ zonas: [null, { tratamientos: [{ nombre: 'Y' }] }] }` to lock the behavior.

### WR-03: Full untruncated free-text clinical note serialized into range list endpoint

**File:** `backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts:180-201`
**Issue:** For free-text HC entries (`{ texto }` with no catalog treatments),
`listarTratamientosDeContenido` returns `[texto.trim()]` with the `TEXTO_LIMITE` (80-char)
truncation deliberately *not* applied (documented on line 177). `turnos.service.ts:599`
serializes this array into the `/turnos/rango` response for every matching turno, so the
complete free-text clinical note now travels to the client in a list endpoint where
previously only the 80-char `ultimoTratamiento` summary did. Two consequences: (1) an
arbitrarily long clinical note is emitted verbatim into the `tratamientos` column and its
tooltip (`TratamientosTab.tsx:287,290`), semantically mislabeling a free-text seguimiento
note as a "tratamiento"; (2) list-endpoint payloads grow unbounded with note length. The
endpoint is auth-scoped to the professional's own turnos, so this is a data-shape/robustness
concern rather than an authorization gap.
**Fix:** If the intent is a readable planilla of *treatment names*, cap the free-text branch
(e.g., reuse `TEXTO_LIMITE`) or omit free-text-only entries from `tratamientos` and keep the
truncated `ultimoTratamiento` for those rows. Confirm with the phase owner whether full note
text belongs in this list.

## Info

### IN-01: `formatTimeSince` / `contactBadgeColor` produce negative values for future dates

**File:** `frontend/src/components/crm/PatientCard.tsx:20-32`
**Issue:** Both helpers compute `Date.now() - new Date(fecha).getTime()` without clamping. A
`ultimoContactoFecha` in the future (clock skew or bad data) yields a negative "hours"/"days",
rendering e.g. `-3h` in green. Pre-existing (outside the Phase 64 diff), noted for
completeness.
**Fix:** `const diffMs = Math.max(0, Date.now() - new Date(fecha).getTime());`

### IN-02: Stage badges render unconditionally, not gated by any pending signal

**File:** `frontend/src/components/crm/PatientCard.tsx:122-131`
**Issue:** The "Dar turno" / "Ser atendido" badges render for *every* card in `NUEVO_LEAD` /
`TURNO_AGENDADO` purely by `columnId`, independent of the `isPending` prop or any
per-patient pending flag. If the phase intent was to badge only patients with an actual
outstanding action, this over-labels the column. If the intent is a static per-column call to
action, this is correct as written — flagging only to confirm intent matches the "indicadores
de pendientes" phase goal.
**Fix:** If per-patient gating is intended, condition on the relevant patient field (mirroring
the `PROCEDIMIENTO_REALIZADO` / `CONFIRMADO` blocks that already gate on `todosCompletos` /
`pasos`). Otherwise no change needed.

---

_Reviewed: 2026-08-03T17:04:48Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
