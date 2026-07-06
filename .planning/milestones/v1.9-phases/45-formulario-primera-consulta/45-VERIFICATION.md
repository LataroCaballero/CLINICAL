---
phase: 45-formulario-primera-consulta
verified: 2026-06-12T23:30:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
human_verification:
  - test: "Flujo visual de punta a punta (8 pasos)"
    expected: "Zonas primero, despliegue por zona, agrupación multi-zona, guardado agrupado visible en historial, presupuesto con precio correcto"
    why_human: "Visual UI flow — automated grep cannot verify chip rendering, collapse behavior, or badge layout"
    resolution: "APPROVED by user during Task 3 checkpoint in plan 45-03 (blocking gate passed)"
---

# Phase 45: Formulario Primera Consulta — Verification Report

**Phase Goal:** El profesional ve y usa la plantilla de Primera Consulta con las zonas como eje: seleccionar una zona despliega sus diagnósticos y tratamientos, agrupados visualmente cuando hay múltiples zonas
**Verified:** 2026-06-12T23:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Al abrir la plantilla Primera Consulta, el profesional ve las zonas disponibles antes de ver diagnósticos o tratamientos | VERIFIED | `PrimeraConsultaForm.tsx` renders zona chips first; diagnóstico/tratamiento blocks only appear inside `zonasSeleccionadasOrdenadas.map(...)` (lines 180-246), gated behind zone selection |
| 2 | Al seleccionar una zona, se despliega su grupo de diagnósticos y su grupo de tratamientos; las zonas no seleccionadas permanecen colapsadas | VERIFIED | `toggleZona()` adds/removes from `zonasSeleccionadas`; only selected zones in `zonasSeleccionadasOrdenadas` render their blocks; unselected zones show only a chip |
| 3 | Con dos o más zonas seleccionadas, los diagnósticos y tratamientos aparecen visualmente agrupados por zona con etiqueta de zona visible | VERIFIED | Each selected zone renders `<p className="text-xs font-semibold uppercase text-blue-700">{zona.nombre}</p>` as a visible label above its diagnostics/treatments block; human checkpoint approved |
| 4 | La HC guardada contiene la selección de diagnósticos/tratamientos agrupada por zona en su campo contenido | VERIFIED | `construirContenidoPrimeraVez` (helpers) builds `{ tipo:'primera_vez', zonas:[...] }` JSONB when `zonas[]` is present and non-empty; service calls helper at lines 91-99; 11 unit tests pass (including new-shape and legacy paths) |
| 5 | Al seleccionar un tratamiento, el sistema hace lookup del precio en el catálogo y el botón "Generar presupuesto" funciona igual que antes | VERIFIED | `toggleTratamiento()` resolves price via `t.precio ?? fallback?.precio ?? 0`; `HCCreatorForm` computes `pvState.zonas.flatMap(z => z.tratamientos)` to show Generar Presupuesto button and build items; human checkpoint approved |

**Score:** 5/5 ROADMAP success criteria verified

---

### Must-Have Truths (from PLAN frontmatter)

#### Plan 45-01 (FORM-03)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /pacientes/:id/historia-clinica/entradas acepta `zonas[]` agrupado por zona para tipo primera_vez | VERIFIED | `ZonaSeleccionDto` + `zonas?: ZonaSeleccionDto[]` in `crear-entrada.dto.ts` lines 22-28 and 54 |
| 2 | La entrada guardada tiene contenido.zonas[] con diagnosticos y tratamientos anidados por zona | VERIFIED | `construirContenidoPrimeraVez` returns `{ tipo, zonas, comentario, presupuestoId, presupuestoTotal }` when zonas non-empty; 11 passing tests |
| 3 | Un POST con la forma legacy (diagnostico + tratamientos planos) sigue funcionando igual que hoy | VERIFIED | Legacy fields preserved in DTO and DTO passes them to helper which returns legacy shape; tests cover this path |
| 4 | El perfil del paciente (diagnostico/tratamiento strings) se actualiza derivado de la estructura por zona | VERIFIED | `derivarPerfilPrimeraVez` called at service lines 113-118; returns strings from zona structure; service updates patient profile with them |

#### Plan 45-02 (FORM-01, FORM-02, FORM-04)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Al abrir Primera Consulta el profesional ve chips de zonas desde el catálogo BD, sin diagnósticos ni tratamientos visibles | VERIFIED | `useCatalogoHC(profesionalId, { enabled: !!profesionalId })` at line 61; zones rendered as chips before any selection block |
| 2 | Seleccionar una zona despliega su grupo de diagnósticos y tratamientos; las no seleccionadas no muestran nada | VERIFIED | `zonasSeleccionadasOrdenadas` filters then maps; unselected zones absent from render loop |
| 3 | Con 2+ zonas seleccionadas, cada grupo lleva la etiqueta de su zona visible encima | VERIFIED | `<p className="text-xs font-semibold uppercase text-blue-700">{zona.nombre}</p>` rendered for every selected zone block |
| 4 | Seleccionar un tratamiento resuelve su precio desde el catálogo y Generar Presupuesto arma los items con esos precios | VERIFIED | `toggleTratamiento` uses `t.precio ?? fallback?.precio ?? 0`; footer button visible when `pvState.zonas.flatMap(z => z.tratamientos).length > 0`; items built with `{ descripcion: t.nombre, precioTotal: t.precio }` |

#### Plan 45-03 (FORM-02, FORM-03)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Una entrada de HC guardada con el formulario nuevo se muestra agrupada por zona en HistorialClinicoPanel, PatientDrawer y TurnoHCModal | VERIFIED | All three render `Array.isArray(contenido.zonas)` branch: zona badge + diagnostico outline badges + tratamiento blue badges |
| 2 | Las entradas de HC históricas (forma legacy) se siguen mostrando exactamente como hoy | VERIFIED | Each `else` branch in the three renderers preserves original legacy rendering using `contenido.diagnostico.zonas` |
| 3 | El JSON hardcodeado zonas-diagnostico ya no existe en el frontend | VERIFIED | `zonas-diagnostico.ts` and `zonas-diagnostico.json` deleted; `rg "zonas-diagnostico" frontend/src` returns empty (exit 1) |
| 4 | El flujo completo funciona de punta a punta | VERIFIED (human) | Task 3 checkpoint in plan 45-03 approved by user after completing all 8 test steps |

**Score:** 9/9 plan must-haves verified

---

## Required Artifacts

| Artifact | Exists | Lines | Key Content | Status |
|----------|--------|-------|-------------|--------|
| `backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts` | Yes | 121 | Exports `ZonaSeleccionInput`, `construirContenidoPrimeraVez`, `derivarPerfilPrimeraVez`; no NestJS/Prisma deps | VERIFIED |
| `backend/src/modules/historia-clinica/historia-clinica.contenido.spec.ts` | Yes | 176 (min 60) | 11 tests covering new shape, legacy, edge cases | VERIFIED |
| `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts` | Yes | 99 | `ZonaSeleccionDto` class + `zonas?: ZonaSeleccionDto[]` on `CreateEntradaDto` (line 54); legacy fields preserved | VERIFIED |
| `frontend/src/components/live-turno/tabs/hc/PrimeraConsultaForm.tsx` | Yes | 274 (min 200) | `useCatalogoHC` consumed; `PrimeraConsultaFormState` exported; zone-centric chip render | VERIFIED |
| `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` | Yes | 95 | `ZonaSeleccionDto` exported; `zonas?: ZonaSeleccionDto[]` in `CreateEntradaDto` | VERIFIED |
| `frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` | Yes | 400 | `profesionalId` prop passed; `canSave` uses `pvState.zonas.length > 0`; `handleSave` sends `zonas: pvState.zonas`; Generar Presupuesto flatMaps tratamientos | VERIFIED |
| `frontend/src/app/dashboard/components/TurnoHCModal.tsx` | Yes | 430+ | `useEffectiveProfessionalId` before early return; `profesionalId` to `PrimeraConsultaForm`; `canSave`/`handleSave` updated; `ZonaContenidoHC` type + `EntryCard` dual-shape render | VERIFIED |
| `frontend/src/components/live-turno/tabs/hc/HistorialClinicoPanel.tsx` | Yes | 149 | `ZonaContenido` type; `Array.isArray(pvContenido.zonas)` branch with zone badge + diagnostico + tratamiento badges | VERIFIED |
| `frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx` | Yes | 900+ | `ZonaContenido` + `ContenidoPrimeraVez.zonas?`; `FreeEntryPreview` and `FreeEntryFullContent` both have `Array.isArray(c.zonas)` branch with per-zona h4 + diagnosticos + tratamientos + ARS price | VERIFIED |
| `frontend/src/lib/zonas-diagnostico.ts` | DELETED | — | No references remain in source tree | VERIFIED |
| `frontend/src/lib/zonas-diagnostico.json` | DELETED | — | No references remain in source tree | VERIFIED |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `historia-clinica.service.ts` | `historia-clinica.contenido.helpers.ts` | `construirContenidoPrimeraVez` import + call in `crearEntrada` | WIRED | Lines 7-9 import; lines 91-99 call with `dto.zonas`, `dto.diagnostico`, etc. |
| `historia-clinica.service.ts` | `historia-clinica.contenido.helpers.ts` | `derivarPerfilPrimeraVez` import + call in `crearEntrada` | WIRED | Lines 7-9 import; lines 113-118 call; result used for profile update |
| `PrimeraConsultaForm.tsx` | `useCatalogoHC` | `useCatalogoHC(profesionalId ?? undefined, { enabled: !!profesionalId })` | WIRED | Line 61; catalog zones rendered as chips |
| `HCCreatorForm.tsx` | `POST /pacientes/:id/historia-clinica/entradas` | `createEntry.mutateAsync` with `dto.zonas` | WIRED | Lines 111-125; `zonas: pvState.zonas` sent in dto |
| `TurnoHCModal.tsx` | `PrimeraConsultaForm` | `profesionalId={efectivoProfesionalId}` from `useEffectiveProfessionalId` | WIRED | Line 92 hook call (before early return); line 229 prop pass |
| `TurnoHCModal.tsx` | `POST /pacientes/:id/historia-clinica/entradas` | `createEntry.mutateAsync` with `zonas: pvState.zonas` | WIRED | Lines 129-145; `zonas: pvState.zonas` in dto |
| `HistorialClinicoPanel.tsx` | `contenido.zonas` | `Array.isArray(pvContenido.zonas)` branch in render | WIRED | Lines 89-109 new shape; lines 112-136 legacy |
| `PatientDrawer/HistoriaClinica.tsx` | `contenido.zonas` | `Array.isArray(c.zonas)` in `FreeEntryPreview` + `FreeEntryFullContent` | WIRED | Lines 512, 557; both branches present and render zona data |
| `TurnoHCModal.tsx` `EntryCard` | `contenido.zonas` | `Array.isArray(contenido.zonas)` in `EntryCard` | WIRED | Lines 371-392; `ZonaContenidoHC` type; zona badge + diagnostico + tratamiento badges |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FORM-01 | 45-02 | El profesional ve primero las zonas; al seleccionar una se despliega su grupo de diagnósticos y tratamientos | SATISFIED | `PrimeraConsultaForm.tsx` renders zone chips first; groups rendered only for selected zones |
| FORM-02 | 45-02, 45-03 | Con dos o más zonas seleccionadas, los diagnósticos y tratamientos se agrupan visualmente por zona | SATISFIED | Zone label `<p>` rendered above each selected zone's group; dual-shape render in HistorialClinicoPanel, PatientDrawer, TurnoHCModal shows per-zona badges |
| FORM-03 | 45-01, 45-03 | La entrada de HC guarda la selección de diagnósticos/tratamientos agrupada por zona | SATISFIED | `construirContenidoPrimeraVez` persists `{ tipo, zonas: [...] }` JSONB; 11 passing unit tests; all three history readers display the new shape correctly |
| FORM-04 | 45-02 | Los tratamientos seleccionados mantienen el lookup de precio del catálogo y el flujo Generar presupuesto existente | SATISFIED | Price lookup chain `t.precio ?? fallback?.precio ?? 0`; Generar Presupuesto button wired via `pvState.zonas.flatMap`; `GenerarPresupuestoModal` unchanged |

No orphaned requirements: FORM-01 through FORM-04 are all claimed by plans 45-01 through 45-03 and all are satisfied.

---

## Anti-Patterns Found

No blockers or warnings found. All `placeholder` occurrences in modified files are legitimate HTML input `placeholder` attributes, not stub implementations.

| File | Pattern | Verdict |
|------|---------|---------|
| `PrimeraConsultaForm.tsx` | `placeholder="Describir zona..."` | Not a stub — correct UX placeholder text |
| `HCCreatorForm.tsx` | `placeholder="Buscar tratamiento..."` | Not a stub — UI text |
| `TurnoHCModal.tsx` `handleSave` | `zonas: pvState.zonas` | Correct real data, not placeholder |

---

## Human Verification

### Flujo visual del formulario (8 pasos) — APPROVED

**Test:** Completed by user in Task 3 of plan 45-03 (blocking checkpoint gate)

**Steps verified:**
1. Abrir Primera Consulta → solo chips de zonas visibles
2. Seleccionar "Abdomen" → bloque con etiqueta "Abdomen" + diagnósticos + tratamientos
3. Seleccionar "Mamas" → dos bloques, cada uno con etiqueta visible
4. Seleccionar tratamiento con precio → Generar Presupuesto muestra precio correcto
5. Seleccionar zona "Otros" → input "Describir zona..." aparece
6. Guardar HC → toast + entrada en historial agrupada por zona
7. Abrir entrada anterior (legacy) → se ve igual que antes
8. Alta rápida desde TurnoHCModal → funciona igual

**Resolution:** User approved all 8 steps — all 5 phase success criteria confirmed.

**Why human:** Visual chip rendering, collapse behavior, badge layout, toast feedback, and end-to-end flow across two entry points (PatientDrawer + TurnoHCModal) cannot be verified programmatically.

---

## Test Suite Results

- `npm test -- historia-clinica.contenido` (backend): **11/11 tests pass**
  - `construirContenidoPrimeraVez`: 5 cases (new shape, legacy, empty input, empty array, null defaults)
  - `derivarPerfilPrimeraVez`: 6 cases (multi-zone, no diagnosticos, no tratamientos, legacy, empty, edge)
- `npx tsc --noEmit` (frontend): **exit code 0** — zero type errors
- All commits verified present in git history: `a7cb469`, `dc33adf`, `42190ca`, `e0f9163`, `de8dd67`, `c2e7ac2`, `0b60476`

---

## Summary

Phase 45 goal is fully achieved. The milestone v1.9 Plantilla Primera Consulta delivered:

- **Backend (plan 45-01):** Pure helper functions with 11 unit tests; DTO extended with `ZonaSeleccionDto`/`zonas[]`; service wired to helpers; legacy auto-save path (LiveTurnoFooter) unaffected.
- **Frontend form (plan 45-02):** `PrimeraConsultaForm` rewritten to be zone-centric, consuming `useCatalogoHC` from Phase 44; both consumers (`HCCreatorForm` + `TurnoHCModal`) send `zonas[]` to the backend; price lookup and Generar Presupuesto flow preserved.
- **History readers (plan 45-03):** Three components (`HistorialClinicoPanel`, `PatientDrawer/HistoriaClinica`, `TurnoHCModal EntryCard`) all implement dual-shape render; legacy entries display unchanged. `zonas-diagnostico.{ts,json}` deleted with zero remaining references.
- **Human checkpoint:** User approved the 8-step visual flow, confirming all 5 ROADMAP success criteria.

All 4 requirements (FORM-01 through FORM-04) are satisfied. No blockers.

---

_Verified: 2026-06-12T23:30:00Z_
_Verifier: Claude (gsd-verifier)_
