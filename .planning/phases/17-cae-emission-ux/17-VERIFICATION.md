---
phase: 17-cae-emission-ux
verified: 2026-03-30T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
re_verification: null
gaps: []
human_verification:
  - test: "Emitir Comprobante button triggers POST /finanzas/facturas/:id/emitir and UI reflects EMISION_PENDIENTE"
    expected: "Button label changes to 'Enviando...' then 'Emitiendo...', badge/estado shows EMISION_PENDIENTE"
    why_human: "Mutation side effects and real-time label transitions cannot be verified by static analysis"
  - test: "After job completes, UI updates to EMITIDA within 6 seconds without page reload"
    expected: "3-second polling loop kicks in and resolves estado automatically"
    why_human: "Polling behavior requires a running backend + BullMQ job to observe; refetchInterval logic verified statically but runtime behavior needs human confirmation"
  - test: "afipError error panel appears in FacturaDetailModal with Spanish message when afipError is non-null and estado=EMISION_PENDIENTE"
    expected: "Red panel with AlertTriangle icon and Spanish AFIP error text (e.g. 'El receptor tiene condición de IVA inválida (10242).')"
    why_human: "Conditional rendering logic is wired but display correctness under actual DB state needs human eye"
  - test: "LiquidacionesTab and liquidaciones/page 'Emitir Comprobante' buttons open FacturaDetailModal (not trigger emission directly)"
    expected: "Modal opens; facturaId may be null if backend getCierreMensual does not return facturaId — graceful empty state expected"
    why_human: "Runtime modal open behavior and graceful null facturaId state need human confirmation; facturaId cast is a known deviation"
---

# Phase 17: CAE Emission UX Verification Report

**Phase Goal:** Wire the "Emitir Comprobante" end-to-end UX — emit button triggers CAE job, UI polls for completion, error messages surface from DB to user.
**Verified:** 2026-03-30
**Status:** human_needed (all automated checks passed; 4 items require human runtime testing)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Prisma schema Factura model has `afipError String?` field | VERIFIED | schema.prisma line 548: `afipError String?` with comment |
| 2  | Migration `add_factura_afip_error` exists and was applied | VERIFIED | `backend/src/prisma/migrations/20260331024012_add_factura_afip_error/migration.sql` — `ALTER TABLE "Factura" ADD COLUMN "afipError" TEXT` |
| 3  | `CaeEmissionProcessor` has `PrismaService` injected + `onFailed` persists `afipError` before CAEA fallback | VERIFIED | processor.ts lines 8, 25, 68–70: import, constructor param, `prisma.factura.update` before `asignarCaeaFallback` |
| 4  | Test 8 exists and asserts `prisma.factura.update` with `afipError` | VERIFIED | spec.ts line 112: `'Test 8: persists afipError in Factura when max retries reached'`; mock at line 26 |
| 5  | `GET /finanzas/facturas/:id` response includes `afipError` field | VERIFIED | dto.ts line 219: `afipError: string | null`; service.ts line 461: `afipError: f.afipError ?? null` |
| 6  | `useEmitirFactura` mutation calls `POST /finanzas/facturas/:id/emitir?profesionalId=X` | VERIFIED | useFinanzas.ts lines 355–374: hook exported, endpoint `emitir`, `{ params: { profesionalId } }` |
| 7  | `useFactura` polls every 3 seconds when `estado === EMISION_PENDIENTE` | VERIFIED | useFinanzas.ts lines 387–389: `refetchInterval` callback returns `3000` when `EMISION_PENDIENTE`, `false` otherwise |
| 8  | `useGenerarFacturaPDF` stub removed | VERIFIED | `grep -r "useGenerarFacturaPDF" frontend/src/` — zero matches |
| 9  | `FacturaDetailModal` shows Emitir button + `afipError` error panel | VERIFIED | modal lines 270–298: conditional `afipError` red panel + `emitirFactura.mutate(facturaId!)` wired |
| 10 | `LiquidacionesTab` and `liquidaciones/page` "Emitir Comprobante" buttons open `FacturaDetailModal` | VERIFIED | Both files: state declared, button `onClick` sets `selectedFacturaId` + `setDetailModalOpen(true)`, `<FacturaDetailModal>` rendered |

**Score:** 10/10 truths verified

---

## Required Artifacts

| Artifact | Plan | Expected | Status | Details |
|----------|------|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | 17-01 | `afipError String?` on Factura | VERIFIED | Line 548, correct placement after `cbteFchHsGen` |
| `backend/src/prisma/migrations/20260331024012_add_factura_afip_error/migration.sql` | 17-01 | ALTER TABLE ADD COLUMN | VERIFIED | Content: `ALTER TABLE "Factura" ADD COLUMN "afipError" TEXT` |
| `backend/src/modules/finanzas/processors/cae-emission.processor.ts` | 17-01, 17-02 | `PrismaService` injected + `onFailed` persists error | VERIFIED | Lines 8, 25, 67–71 |
| `backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts` | 17-01 | Test 8 asserts `prisma.factura.update` | VERIFIED | Lines 112–127, `mockPrismaService` wired |
| `backend/src/modules/finanzas/dto/finanzas.dto.ts` | 17-02 | `FacturaDetailDto.afipError: string | null` | VERIFIED | Line 219 |
| `backend/src/modules/finanzas/finanzas.service.ts` | 17-02 | `getFacturaById` returns `afipError` | VERIFIED | Line 461: `afipError: f.afipError ?? null` |
| `frontend/src/types/finanzas.ts` | 17-03 | `FacturaDetail.afipError: string | null` | VERIFIED | Line 230 |
| `frontend/src/hooks/useFinanzas.ts` | 17-03 | `useEmitirFactura` + `refetchInterval` polling + stub removed | VERIFIED | Lines 355–373 (hook), 387–389 (polling), zero stub matches |
| `frontend/src/app/dashboard/finanzas/facturacion/components/FacturaDetailModal.tsx` | 17-03 | Emitir button + `afipError` panel | VERIFIED | Lines 270–298 |
| `frontend/src/app/dashboard/finanzas/facturacion/components/LiquidacionesTab.tsx` | 17-03 | Button opens FacturaDetailModal | VERIFIED | Lines 122–123, 575–578, 601–604 |
| `frontend/src/app/dashboard/finanzas/liquidaciones/page.tsx` | 17-03 | Button opens FacturaDetailModal | VERIFIED | Lines 69–70, 436–437, 460–463 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `CaeEmissionProcessor.onFailed` | `prisma.factura` | `this.prisma.factura.update({ data: { afipError: job.failedReason } })` | WIRED | processor.ts lines 68–70; update is before CAEA fallback at line 75 |
| `getFacturaById` | `FacturaDetailDto.afipError` | `afipError: f.afipError ?? null` in return object | WIRED | service.ts line 461 |
| `LiquidacionesTab "Emitir" button` | `FacturaDetailModal open` | `onClick` sets `selectedFacturaId` + `setDetailModalOpen(true)` | WIRED | LiquidacionesTab.tsx lines 577–578; `<FacturaDetailModal facturaId={selectedFacturaId} open={detailModalOpen}>` at line 601 |
| `FacturaDetailModal "Emitir" button` | `useEmitirFactura.mutate(facturaId)` | `onClick={() => emitirFactura.mutate(facturaId!)}` | WIRED | FacturaDetailModal.tsx line 289 |
| `useFactura` | `GET /finanzas/facturas/:id` | `refetchInterval: (query) => estado === EMISION_PENDIENTE ? 3000 : false` | WIRED | useFinanzas.ts lines 385–391 |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CAE-02 | 17-02, 17-03 | Facturador can trigger emission from UI via `POST /finanzas/facturas/:id/emitir` | SATISFIED | `useEmitirFactura` calls endpoint with `profesionalId`; Emitir button wired in `FacturaDetailModal`; buttons in `LiquidacionesTab` and `liquidaciones/page` open modal |
| CAE-03 | 17-01, 17-02, 17-03 | AFIP errors translated to Spanish shown in modal (not toasts) | SATISFIED | `afipError` persisted by `onFailed` with `failedReason` (Spanish from backend); propagated through DTO + service; displayed in red error panel in `FacturaDetailModal` |

No orphaned requirements detected — both CAE-02 and CAE-03 mapped to this phase are covered.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/hooks/useFinanzas.ts` | 294 | `// TODO: Implement actual send logic` in `useSendPresupuesto` | Info | Pre-existing stub in presupuesto module — unrelated to Phase 17 scope |
| `frontend/src/hooks/useFinanzas.ts` | 489 | `// TODO: Implement export` in `useExportarReporte` | Info | Pre-existing stub in reportes module — unrelated to Phase 17 scope |

No blockers or warnings in Phase 17 files. The two TODOs are in functions introduced in earlier phases and outside this phase's scope.

**Notable deviation (documented in 17-03-SUMMARY.md):** `os.facturaId` is cast via `(os as { facturaId?: string | null }).facturaId ?? null` because `CierreMensualResumen.detalleObrasSociales` does not carry `facturaId` — the backend `getCierreMensual` endpoint does not return it. This means the "Emitir Comprobante" buttons in `LiquidacionesTab` and `liquidaciones/page` open the modal but the modal will load with `facturaId = null` (disabled fetch, graceful empty state). Full functionality requires a backend extension to `getCierreMensual`. This is a deferred gap, not a Phase 17 blocker per the plan's own decision.

---

## Human Verification Required

### 1. Emitir Comprobante button — mutation + label transitions

**Test:** Navigate to Finanzas > Facturación > Comprobantes tab. Open any factura without a CAE (estado not EMITIDA). Click "Emitir Comprobante".
**Expected:** Button changes to "Enviando..." (while mutation is pending), then "Emitiendo..." (while estado=EMISION_PENDIENTE). Badge/estado badge in modal shows EMISION_PENDIENTE.
**Why human:** Mutation pending states and label transitions are runtime behavior; `emitirFactura.isPending` and estado change cannot be verified statically.

### 2. 3-second polling resolves to EMITIDA without page reload

**Test:** After clicking "Emitir Comprobante" (step 1 above), wait up to 6 seconds with the modal open.
**Expected:** Modal estado updates to EMITIDA automatically; CAE number appears; no page reload needed.
**Why human:** `refetchInterval` callback is wired (`3000` when `EMISION_PENDIENTE`) but actual polling behavior requires a running BullMQ job to complete and the query refetch cycle to observe.

### 3. afipError red error panel renders in modal

**Test:** Manually set `afipError` on a test Factura row in DB: `UPDATE "Factura" SET "afipError" = 'El receptor tiene condición de IVA inválida (10242).' WHERE id = '<test-id>'` and keep `estado = 'EMISION_PENDIENTE'`. Then open that factura in FacturaDetailModal.
**Expected:** Red panel with `AlertTriangle` icon, heading "Error de emisión AFIP", and the Spanish message below it appears above the modal footer.
**Why human:** Conditional rendering (`factura.afipError && factura.estado === EMISION_PENDIENTE`) is wired; visual correctness and positioning require human confirmation.

### 4. LiquidacionesTab / liquidaciones/page button — modal opens with graceful null state

**Test:** Navigate to Finanzas > Liquidaciones. Find a row with `pendiente > 0` and click "Emitir Comprobante".
**Expected:** FacturaDetailModal opens. Because `getCierreMensual` does not return `facturaId`, the modal may show a loading/empty state (graceful). No JavaScript error or crash.
**Why human:** Type cast `(os as { facturaId?: string | null }).facturaId ?? null` means `selectedFacturaId` will be `null`; `useFactura(null)` is disabled. Runtime graceful state needs human confirmation. This also confirms whether the deviation documented in 17-03-SUMMARY is acceptable.

---

## Gaps Summary

No automated gaps detected. All 10 truths verified, all 11 artifacts present and substantive, all 5 key links wired, both requirement IDs satisfied.

The only residual concern is the `facturaId` null cast in `LiquidacionesTab` and `liquidaciones/page` — the buttons open the modal but the modal cannot load a factura until `getCierreMensual` is extended to return `facturaId`. This was a conscious decision documented in Plan 03's summary and does not block Phase 17's stated goal (CAE-02 is satisfied via the `FacturaDetailModal` Emitir button path). A follow-up backend task may be needed for the full table-row-to-modal-to-emit flow in the liquidaciones views.

---

_Verified: 2026-03-30_
_Verifier: Claude (gsd-verifier)_
