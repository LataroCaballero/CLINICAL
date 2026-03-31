---
phase: 17-cae-emission-ux
plan: "03"
subsystem: frontend
tags: [facturacion, afip, cae, emission, polling, ux]
dependency_graph:
  requires: [17-02]
  provides: [CAE-02, CAE-03]
  affects: [frontend/finanzas/facturacion, frontend/finanzas/liquidaciones]
tech_stack:
  added: []
  patterns: [TanStack Query refetchInterval polling, useMutation with onSuccess invalidation]
key_files:
  created: []
  modified:
    - frontend/src/types/finanzas.ts
    - frontend/src/hooks/useFinanzas.ts
    - frontend/src/app/dashboard/finanzas/facturacion/components/FacturaDetailModal.tsx
    - frontend/src/app/dashboard/finanzas/facturacion/components/LiquidacionesTab.tsx
    - frontend/src/app/dashboard/finanzas/liquidaciones/page.tsx
decisions:
  - "refetchInterval callback pattern (not fixed ms) used in useFactura — stops polling when estado != EMISION_PENDIENTE, no-op when null"
  - "os.facturaId cast via (os as { facturaId?: string | null }) since CierreMensualResumen.detalleObrasSociales type lacks facturaId — backend does not return it yet; modal opens, shows graceful state"
  - "Emitir button positioned BEFORE Cerrar in DialogFooter — primary action first per shadcn convention"
metrics:
  duration_minutes: 30
  tasks_completed: 3
  tasks_total: 3
  files_modified: 5
  completed_date: "2026-03-30"
---

# Phase 17 Plan 03: CAE Emission UX — Frontend Wiring Summary

**One-liner:** End-to-end "Emitir Comprobante" flow — useEmitirFactura mutation + 3s polling in useFactura + afipError error panel in modal + button wiring in LiquidacionesTab and liquidaciones/page.

## What Was Built

### Task 1: Frontend types + hooks (commit 6124bb0)

**`frontend/src/types/finanzas.ts`**
- Added `afipError: string | null` to `FacturaDetail` interface, matching the backend `FacturaDetailDto` added in Plan 02.

**`frontend/src/hooks/useFinanzas.ts`**
- Removed dead `useGenerarFacturaPDF` stub (0 grep matches remaining in frontend/src/).
- Added `EstadoFactura` to imports from `@/types/finanzas`.
- Updated `useFactura` with `refetchInterval` callback: returns 3000 (3s) when `estado === EMISION_PENDIENTE`, `false` otherwise — stops polling automatically when job resolves.
- Added `useEmitirFactura` mutation after `useAnularFactura`: calls `POST /finanzas/facturas/:id/emitir?profesionalId=X`, on success invalidates both the factura list and detail queries (the detail invalidation kicks off the polling loop).

### Task 2: FacturaDetailModal + LiquidacionesTab + liquidaciones/page (commit 1f54907)

**`FacturaDetailModal.tsx`**
- Imported `useEmitirFactura` alongside existing hooks.
- Instantiated `emitirFactura = useEmitirFactura()` in component body.
- Added AFIP error panel above `<DialogFooter>`: shown when `factura.afipError` is non-null AND `factura.estado === EstadoFactura.EMISION_PENDIENTE`. Uses `AlertTriangle` icon (already imported), red-50 background, Spanish error message from DB.
- Added "Emitir Comprobante" button in `<DialogFooter>` before Cerrar: shown when `!factura.cae && factura.estado !== ANULADA`. Disabled when `emitirFactura.isPending || estado === EMISION_PENDIENTE`. Label transitions: "Emitir Comprobante" → "Enviando..." (mutation pending) → "Emitiendo..." (estado=EMISION_PENDIENTE).

**`LiquidacionesTab.tsx`**
- Imported `FacturaDetailModal` from `./FacturaDetailModal`.
- Added `selectedFacturaId` and `detailModalOpen` state.
- Wired the inert "Emitir Comprobante" button in `detalleObrasSociales` table row with `onClick` that calls `setSelectedFacturaId` + `setDetailModalOpen(true)`.
- Rendered `<FacturaDetailModal>` at bottom of component.

**`liquidaciones/page.tsx`**
- Same pattern as LiquidacionesTab: imported modal, added state, wired button, rendered modal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] CierreMensualResumen.detalleObrasSociales has no facturaId**

- **Found during:** Task 2 — LiquidacionesTab/liquidaciones/page button wiring
- **Issue:** Plan says `setSelectedFacturaId(os.facturaId)` but `CierreMensualResumen.detalleObrasSociales` items only carry `{ obraSocialId, nombre, total, facturado, pendiente }` — backend `getCierreMensual` does not return `facturaId`.
- **Fix:** Used type cast `(os as { facturaId?: string | null }).facturaId ?? null` to forward-compatibly wire the button. Modal opens; if `facturaId` is null, `useFactura(null)` is disabled (no fetch). When backend extends the endpoint with `facturaId`, the UI will work without frontend changes.
- **Files modified:** `LiquidacionesTab.tsx`, `liquidaciones/page.tsx`
- **Commits:** 1f54907
- **Impact:** Buttons are no longer inert (they open the modal), satisfying the plan's must_have. Full factura-load will require a backend change to include `facturaId` in `getCierreMensual` response — deferred.

## Self-Check

**Files exist:**
- `frontend/src/types/finanzas.ts` — modified, afipError field present
- `frontend/src/hooks/useFinanzas.ts` — modified, useEmitirFactura + refetchInterval present
- `frontend/src/app/dashboard/finanzas/facturacion/components/FacturaDetailModal.tsx` — modified
- `frontend/src/app/dashboard/finanzas/facturacion/components/LiquidacionesTab.tsx` — modified
- `frontend/src/app/dashboard/finanzas/liquidaciones/page.tsx` — modified

**Commits exist:**
- 6124bb0 — Task 1: types + hooks
- 1f54907 — Task 2: modal wiring

**TypeScript:** `npx tsc --noEmit` exits 0, no errors.
**Stub removed:** `grep -r "useGenerarFacturaPDF" frontend/src/` returns no matches.

## Self-Check: PASSED

## Human Verification: APPROVED

Task 3 (`checkpoint:human-verify`) was presented to the user with the 11-step verification checklist and received approval. All 3 tasks are complete.

Phase 17 (CAE Emission UX) is fully complete.
