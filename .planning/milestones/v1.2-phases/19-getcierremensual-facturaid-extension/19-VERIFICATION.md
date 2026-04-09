---
phase: 19-getcierremensual-facturaid-extension
verified: 2026-03-31T22:00:00Z
status: human_needed
score: 4/5 must-haves verified
human_verification:
  - test: "FacturaDetailModal opens with real factura data when clicking Emitir Comprobante from LiquidacionesTab or liquidaciones/page for an OS with an existing LiquidacionObraSocial.facturaId"
    expected: "Modal shows factura details (number, total, estado). For EMITIDA facturas: Descargar PDF visible. For facturas without CAE: Emitir Comprobante button present. For OS with no facturaId: modal shows fallback 'No se pudo cargar el comprobante'."
    why_human: "Runtime modal rendering and API response to real DB data cannot be verified statically. Requires a live app session with real LiquidacionObraSocial rows that have facturaId set."
---

# Phase 19: getCierreMensual facturaId Extension — Verification Report

**Phase Goal:** Extend getCierreMensual to include facturaId per OS entry so the liquidaciones surface can open FacturaDetailModal without unsafe type casts.
**Verified:** 2026-03-31T22:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| #  | Truth                                                                                                          | Status          | Evidence                                                                                                   |
|----|----------------------------------------------------------------------------------------------------------------|-----------------|------------------------------------------------------------------------------------------------------------|
| 1  | `getCierreMensual` returns `facturaId: string \| null` in `detalleObrasSociales`                               | VERIFIED | `finanzas.service.ts` lines 680+701+719-742: `facturaId` field added to `porObraSocial` record type, initialized `null`, and merged from secondary `liquidacionObraSocial.findMany` query |
| 2  | `LiquidacionesTab.tsx` and `liquidaciones/page.tsx` pass real `facturaId` to `FacturaDetailModal` (no cast)    | VERIFIED | Both files use `os.facturaId` directly at lines 577 and 436 respectively; `grep -r "as { facturaId"` returns empty |
| 3  | When factura exists, modal loads full data and allows emitir                                                   | NEEDS HUMAN     | Requires live session against real DB — cannot verify statically                                           |
| 4  | 3 unit tests GREEN for getCierreMensual facturaId scenarios                                                    | VERIFIED | `npx jest --testPathPattern=finanzas.service.spec -t "getCierreMensual"` → 3 passed, 0 failed              |
| 5  | `CierreMensualResumen` TypeScript interface includes `facturaId: string \| null` in `detalleObrasSociales` shape | VERIFIED | `frontend/src/types/finanzas.ts` line 299: `facturaId: string \| null;` present inside `detalleObrasSociales` array item type |

**Score:** 4/5 truths verified (1 needs human)

### Required Artifacts

| Artifact                                                                                    | Expected                                                                  | Status     | Details                                                                                     |
|---------------------------------------------------------------------------------------------|---------------------------------------------------------------------------|------------|---------------------------------------------------------------------------------------------|
| `backend/src/modules/finanzas/finanzas.service.ts`                                         | `getCierreMensual` with `liquidacionObraSocial.findMany` lookup            | VERIFIED   | Lines 719-742: secondary query, `facturaIdByOs` Map, null-preference merge                 |
| `backend/src/modules/finanzas/finanzas.service.spec.ts`                                    | `describe('getCierreMensual')` block with 3 tests                         | VERIFIED   | Lines 496-545: 3 tests present, all passing GREEN; `liquidacionObraSocial.findMany` mocked at line 42 |
| `frontend/src/types/finanzas.ts`                                                           | `CierreMensualResumen` with `facturaId: string \| null`                   | VERIFIED   | Line 299: field present in `detalleObrasSociales` shape                                     |
| `frontend/src/app/dashboard/finanzas/facturacion/components/LiquidacionesTab.tsx`          | Type-safe `os.facturaId` usage                                            | VERIFIED   | Line 577: `setSelectedFacturaId(os.facturaId)` — no cast; `facturaId={selectedFacturaId}` at line 602 |
| `frontend/src/app/dashboard/finanzas/liquidaciones/page.tsx`                               | Type-safe `os.facturaId` usage                                            | VERIFIED   | Line 436: `setSelectedFacturaId(os.facturaId)` — no cast; `facturaId={selectedFacturaId}` at line 461 |

### Key Link Verification

| From                                            | To                                                    | Via                                          | Status   | Details                                                                                             |
|-------------------------------------------------|-------------------------------------------------------|----------------------------------------------|----------|-----------------------------------------------------------------------------------------------------|
| `finanzas.service.ts getCierreMensual`          | `liquidacionObraSocial.findMany`                      | Additive secondary query after practicas loop | WIRED    | Lines 719-742: query with `where: { periodo: mes, obraSocialId: { in: obraSocialIds } }`, `select: { obraSocialId, facturaId }` |
| `LiquidacionesTab.tsx / liquidaciones/page.tsx` | `FacturaDetailModal facturaId` prop                   | `os.facturaId` direct access (no cast)        | WIRED    | Both files: `setSelectedFacturaId(os.facturaId)` → `facturaId={selectedFacturaId}` prop pass-through |
| `mockPrismaService.liquidacionObraSocial`       | `findMany`                                            | `jest.fn()` mock                              | WIRED    | Spec file line 42: `findMany: jest.fn()` alongside `create: jest.fn()`                             |

### Requirements Coverage

| Requirement | Source Plan  | Description                                                                                      | Status             | Evidence                                                                                                          |
|-------------|-------------|--------------------------------------------------------------------------------------------------|--------------------|-------------------------------------------------------------------------------------------------------------------|
| CAE-02      | 19-01, 19-02 | Sistema emite comprobante electrónico real via `FECAESolicitar`; secondary surface: LiquidacionesTab and liquidaciones/page can open FacturaDetailModal with real facturaId | PARTIAL (human pending) | Automated: backend query, type, and frontend wiring verified. Human: modal actually rendering factura data from real DB records |

**Notes on CAE-02:** REQUIREMENTS.md line 68 maps CAE-02 to "Phase 17 + Phase 19". The primary surface (Phase 17) was previously completed. Phase 19 closes the secondary surface gap. The requirement tracker still shows "Pending (secondary surface)" — Phase 19's automated deliverables are confirmed; human verification (SC #3) is the remaining gate before updating the tracker to "Complete".

### Anti-Patterns Found

| File                                            | Line | Pattern                | Severity | Impact                                                                                       |
|-------------------------------------------------|------|------------------------|----------|----------------------------------------------------------------------------------------------|
| `finanzas.service.spec.ts`                      | 525, 532, 542 | `(result.detalleObrasSociales as any[])` | Info     | Intentional TDD workaround documented in SUMMARY-01. Will become unnecessary if TS inference is re-checked; does not block tests or safety. |

No blockers. The `as any[]` casts in the spec are intentional and documented — they bypass TypeScript inference on the return type during the RED phase, and remain harmless now that GREEN is confirmed. The underlying type (`detalleObrasSociales` on the service return) does include `facturaId`, so the casts could be removed in a follow-up cleanup.

### Human Verification Required

#### 1. FacturaDetailModal opens with real factura data from liquidaciones surfaces

**Test:**
1. Start the backend: `cd backend && npm run start:dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Log in as FACTURADOR.
4. Navigate to `/dashboard/finanzas/facturacion` (LiquidacionesTab) or `/dashboard/finanzas/liquidaciones`.
5. Select a month where at least one OS has a `LiquidacionObraSocial` row with `facturaId IS NOT NULL` (check DB: `SELECT periodo, "obraSocialId", "facturaId" FROM "LiquidacionObraSocial" WHERE "facturaId" IS NOT NULL LIMIT 5;`).
6. Click "Emitir Comprobante" for that OS entry.

**Expected:**
- If `facturaId` is non-null: `FacturaDetailModal` opens showing real factura details (number, total, estado). EMITIDA facturas show "Descargar PDF". Facturas without CAE show "Emitir Comprobante" button.
- If `facturaId` is null (OS with no linked factura): modal shows "No se pudo cargar el comprobante" fallback.

**Why human:** Runtime modal rendering requires a live database with actual `LiquidacionObraSocial` rows that have `facturaId` populated. Static analysis confirms the facturaId value is passed to the modal prop — whether the modal renders the correct data depends on the API response to a real `GET /finanzas/facturas/:id` call.

### Gaps Summary

No gaps found in automated checks. All four automated success criteria are verified against the actual codebase:

1. The backend service calls `liquidacionObraSocial.findMany` and merges `facturaId` into each `porObraSocial` entry — confirmed in source and by passing unit tests.
2. The TypeScript type `CierreMensualResumen` carries the field through the frontend type chain.
3. Both frontend components access `os.facturaId` without unsafe casts, confirmed by source inspection and empty grep for the cast pattern.
4. Three unit tests covering the three behavioral scenarios are GREEN.

The single remaining item is the human-gated success criterion #3 from the ROADMAP: modal loads complete data in a live session. This is a runtime behavior that automated verification cannot satisfy.

---

_Verified: 2026-03-31T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
