---
phase: 46-auto-aprendizaje-via-otros
verified: 2026-06-13T02:30:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 46: Auto-aprendizaje vía "Otros" — Verification Report

**Phase Goal:** Los campos "Otros" en zonas, diagnósticos y tratamientos persisten lo que el profesional escribe, enriqueciendo el catálogo para la próxima consulta; los tratamientos nuevos aparecen en el catálogo de tratamientos para poder asignarles precio.
**Verified:** 2026-06-13T02:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification
**Human checkpoint:** Approved by user (9 steps completed; one UI fix applied in commit 71a72d7 post-approval)

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Zona nueva escrita en "Otros" + guardar HC → aparece en la lista de zonas en la próxima consulta | VERIFIED | `aprenderDesdeZonas` crea ZonaHC via `crearZona`; frontend invalidates `catalogo-hc` query on HC save |
| 2 | Diagnóstico nuevo escrito en "Otros" de cualquier zona + guardar → aparece en esa zona la próxima vez | VERIFIED | `aprenderDesdeZonas` ejecuta `diagnosticoHC.create` para nombres no existentes en esa zona |
| 3 | Tratamiento nuevo escrito en "Otros" de cualquier zona + guardar → aparece en esa zona la próxima vez | VERIFIED | `aprenderDesdeZonas` ejecuta `tratamientoHC.create` con FK al catálogo de precios |
| 4 | Tratamiento aprendido sin match aparece en Configuracion → Tratamientos con precio 0 | VERIFIED | `prisma.tratamiento.create({ precio: 0 })` con fallback cuando no hay match insensible; verificado por usuario |

**Score:** 4/4 truths verified

---

## Required Artifacts

### Plan 46-01 artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/modules/catalogo-hc/catalogo-hc.aprendizaje.helpers.ts` | Motor puro sin deps NestJS/Prisma | VERIFIED | 222 lines; exports `formatearNombreAprendido`, `detectarAprendizaje`, `AccionesAprendizaje`, `SnapshotZona`, `SnapshotItem`, `ZonaAprendizajeInput`; 0 `@nestjs`/`@prisma` imports |
| `backend/src/modules/catalogo-hc/catalogo-hc.aprendizaje.helpers.spec.ts` | Suite de tests unitarios del motor | VERIFIED | 366 lines (min_lines: 80 — far exceeded); 27 tests covering all spec cases |

### Plan 46-02 artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` | `aprenderDesdeZonas` method | VERIFIED | Method at line 221; full implementation with snapshot load, `detectarAprendizaje`, reactivations, zone/dx/tx creation, and Tratamiento price-0 fallback |
| `backend/src/modules/catalogo-hc/catalogo-hc.aprendizaje.service.spec.ts` | Tests with mocked Prisma | VERIFIED | 323 lines (min_lines: 80 — far exceeded); 7 tests covering all plan scenarios |
| `backend/src/modules/historia-clinica/historia-clinica.service.ts` | Best-effort wiring post-tx | VERIFIED | Lines 306-321: `if (dto.tipo === 'primera_vez' && Array.isArray(dto.zonas) && dto.zonas.length > 0)` guard with try/catch around `aprenderDesdeZonas` |

### Plan 46-03 artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/components/live-turno/tabs/hc/PrimeraConsultaForm.tsx` | UX Enter→chip, `border-dashed` visual | VERIFIED | `zonasNuevas`, `dxInputAbierto`, `txInputAbierto`, `zonaOtrosInputAbierto` states present; `border-dashed` in Chip styling; Enter handlers `handleZonaOtrosEnter`, `handleDxNuevoEnter`, `handleTxNuevoEnter` |
| `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` | Invalidacion `catalogo-hc` on success | VERIFIED | Line 3: `import { CATALOGO_HC_QUERY_KEY }` from `useCatalogoHC`; line 94: `qc.invalidateQueries({ queryKey: [CATALOGO_HC_QUERY_KEY] })` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `catalogo-hc.aprendizaje.helpers.ts` | `catalogo-hc.seed-data.ts` | `import { normalizarNombre }` | WIRED | Line 10: `import { normalizarNombre } from './catalogo-hc.seed-data'` |
| `historia-clinica.service.ts` | `catalogo-hc.service.ts` | `CatalogoHCService` injection + try/catch `aprenderDesdeZonas` | WIRED | Line 10 import; line 21 constructor injection; lines 306-321 wiring block |
| `historia-clinica.module.ts` | `catalogo-hc.module.ts` | `imports: [CatalogoHCModule]` | WIRED | Line 7: `imports: [CatalogoHCModule]` |
| `catalogo-hc.service.ts` | `prisma.tratamiento` | match normalizado + `create precio 0` (APR-04) | WIRED | Line 347: `findMany` for price catalog; line 391: `prisma.tratamiento.create({ precio: 0 })` |
| `useCreateHistoriaClinicaEntry.ts` | `useCatalogoHC.ts` | `invalidateQueries` with `CATALOGO_HC_QUERY_KEY` | WIRED | Line 94: `qc.invalidateQueries({ queryKey: [CATALOGO_HC_QUERY_KEY] })` |
| `PrimeraConsultaForm.tsx` | `useTratamientosProfesional` | price lookup for new treatments | WIRED | Line 97: `const { data: tratamientosProfesional = [] }` used in lines 245, 292 for precio lookup |

---

## Requirements Coverage

| Requirement | Plans | Description | Status | Evidence |
|-------------|-------|-------------|--------|---------|
| APR-01 | 46-01, 46-02, 46-03, 46-04 | Zona nueva en "Otros" se guarda en BD para ese profesional | SATISFIED | `detectarAprendizaje` computes `zonasACrear`; `aprenderDesdeZonas` calls `crearZona`; frontend Enter→chip UX for zone input; human-verified |
| APR-02 | 46-01, 46-02, 46-03, 46-04 | Diagnóstico nuevo en "Otros" queda guardado en esa zona | SATISFIED | `detectarAprendizaje` computes `diagnosticosACrear`; `aprenderDesdeZonas` calls `diagnosticoHC.create`; frontend `dxInputAbierto` toggle + Enter→chip; human-verified |
| APR-03 | 46-01, 46-02, 46-03, 46-04 | Tratamiento nuevo en "Otros" queda guardado en esa zona | SATISFIED | `detectarAprendizaje` computes `tratamientosACrear`; `aprenderDesdeZonas` calls `tratamientoHC.create`; frontend `txInputAbierto` toggle + Enter→chip; human-verified |
| APR-04 | 46-02, 46-04 | Tratamiento aprendido se crea en catálogo de tratamientos con precio 0 | SATISFIED | `prisma.tratamiento.create({ precio: 0, profesionalId })` with match-or-create logic; dedup via inline `matchMap`; human-verified in Configuracion → Tratamientos |

All 4 requirement IDs (APR-01 through APR-04) claimed by phase plans are accounted for and marked SATISFIED in REQUIREMENTS.md.

---

## Anti-Patterns Found

None. Scanned all phase-modified files for TODOs, stubs, empty returns, and placeholder patterns — clean.

---

## Human Verification

Human checkpoint (plan 46-04 Task 2) was completed and APPROVED by the user before this verification. The user executed all 9 steps of the end-to-end cycle:
- Zone learned via "Otros" appeared in next consultation
- Diagnosis and treatment learned appeared in their zones
- Learned treatment visible with precio 0 in Configuracion → Tratamientos
- Deduplication confirmed: "FLACIDEZ SEVERA" matched existing "Flacidez severa" without creating a duplicate
- Deselected item was NOT learned

One UI fix was applied post-checkpoint (commit `71a72d7`): the "Nueva zona..." input now shows only on click of the "Otros" chip (toggle pattern), consistent with the dx/tx inputs added in 46-03.

---

## Commit Trail

All commits exist and are reachable in git log:

| Commit | Scope | Description |
|--------|-------|-------------|
| `713f7c0` | test(46-01) | Failing spec for aprendizaje detection (RED) |
| `bae3e78` | feat(46-01) | Implement aprendizaje detection helpers (GREEN) |
| `6a6aa6a` | test(46-02) | Failing spec for aprenderDesdeZonas (RED) |
| `4e6b119` | feat(46-02) | Implement CatalogoHCService.aprenderDesdeZonas (GREEN) |
| `33faf59` | feat(46-02) | Wiring best-effort en crearEntrada |
| `805cd00` | feat(46-03) | UX Enter→chip para zona/dx/tx nuevos en PrimeraConsultaForm |
| `f561c91` | feat(46-03) | Invalidar catalogo-hc en onSuccess de useCreateHistoriaClinicaEntry |
| `71a72d7` | fix(46-04) | Mostrar input de zona nueva solo al click en "Otros" |

---

## Summary

Phase 46 goal is fully achieved. The auto-learning engine is implemented in three integrated layers:

1. **Pure detection layer** (`catalogo-hc.aprendizaje.helpers.ts`): computes what to create or reactivate using case/accent-insensitive matching, deduplication, and exclusion of "Otros"/empty names. 27 unit tests green.

2. **Persistence layer** (`CatalogoHCService.aprenderDesdeZonas`): applies the computed actions against PostgreSQL — creates ZonaHC/DiagnosticoHC/TratamientoHC entries and resolves Tratamiento FK (match or precio-0 creation). 7 service tests green. Wired best-effort in `crearEntrada` so HC saves are never blocked.

3. **Frontend layer** (`PrimeraConsultaForm.tsx` + `useCreateHistoriaClinicaEntry.ts`): Enter→chip UX for new zones, diagnostics, and treatments with dashed-border visual distinction; dxInputAbierto/txInputAbierto/zonaOtrosInputAbierto toggle pattern consistent across all three item types; `catalogo-hc` query invalidated silently on HC save so the next form opens with the enriched catalog.

All 4 requirements (APR-01 through APR-04) satisfied. Human end-to-end verification approved. Zero anti-patterns. No gaps.

---

_Verified: 2026-06-13T02:30:00Z_
_Verifier: Claude (gsd-verifier)_
