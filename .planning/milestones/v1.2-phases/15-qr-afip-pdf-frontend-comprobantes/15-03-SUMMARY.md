---
phase: 15-qr-afip-pdf-frontend-comprobantes
plan: "03"
subsystem: ui
tags: [react, nextjs, tanstack-query, typescript, afip, finanzas]

# Dependency graph
requires:
  - phase: 15-qr-afip-pdf-frontend-comprobantes
    provides: "GET /finanzas/facturas/:id, GET /finanzas/facturas/:id/pdf, PATCH /finanzas/facturas/:id/tipo-cambio backend endpoints"
provides:
  - "FacturaDetailModal: CAE display, QR image, PDF download, USD tipoCambio input with BNA link"
  - "useFactura(id) TanStack Query hook for GET /finanzas/facturas/:id"
  - "useUpdateTipoCambio() mutation hook for PATCH /finanzas/facturas/:id/tipo-cambio"
  - "Extended EstadoFactura enum with EMISION_PENDIENTE and CAEA_PENDIENTE_INFORMAR"
  - "Extended Factura interface with AFIP fields (cae, caeFchVto, nroComprobante, qrData, moneda, tipoCambio)"
  - "FacturaDetail interface with qrImageDataUrl and ptoVta"
  - "ComprobantesTab rows clickable: opens FacturaDetailModal"
  - "ComprobantesTab Download button: downloads PDF for EMITIDA invoices, toast for others"
affects: [phase-16-caea, finanzas-module]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useFactura(id: string | null) — enabled: !!id pattern for optional single-item queries"
    - "downloadFacturaPdf via Blob API — no library, e.stopPropagation() on row action buttons"
    - "FacturaDetail extends Factura — base interface extension for detail endpoints"

key-files:
  created:
    - frontend/src/app/dashboard/finanzas/facturacion/components/FacturaDetailModal.tsx
  modified:
    - frontend/src/types/finanzas.ts
    - frontend/src/hooks/useFinanzas.ts
    - frontend/src/app/dashboard/finanzas/facturacion/components/ComprobantesTab.tsx

key-decisions:
  - "downloadFacturaPdf defined in both FacturaDetailModal and ComprobantesTab — small duplication preferred over coupling two sibling components"
  - "USD section warning uses AlertTriangle icon from lucide-react inside amber callout — matches existing UI patterns"
  - "Node.js 18 build failure is pre-existing environment issue, not introduced by this plan; TypeScript passes clean"

patterns-established:
  - "Blob download pattern: api.get(url, { responseType: 'blob' }) + URL.createObjectURL + anchor click + revoke"
  - "AFIP date format: 'YYYYMMDD' string → formatAfipDate helper slices into DD/MM/YYYY"

requirements-completed: [QR-02, QR-03]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 15 Plan 03: Frontend Comprobantes Detail Summary

**FacturaDetailModal with CAE badge, QR image, PDF download, and USD BNA cotización input wired to ComprobantesTab row-click and Download button**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T21:42:59Z
- **Completed:** 2026-03-30T21:47:30Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Extended `EstadoFactura` enum and `Factura` interface with all AFIP fields from Phase 14/15 backend; added `FacturaDetail` type with `qrImageDataUrl`
- Created `FacturaDetailModal` showing CAE number (monospace, copyable), CAE vencimiento, QR image, PDF download, and USD tipoCambio input with bna.com.ar link
- Wired `ComprobantesTab`: row click opens modal, Download button triggers blob PDF download or info toast, `ESTADO_BADGE` handles all 4 states without runtime errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend frontend types and add useFactura + useUpdateTipoCambio hooks** - `dd4cea5` (feat)
2. **Task 2: Create FacturaDetailModal with CAE display, QR image, and USD tipoCambio input** - `7994faf` (feat)
3. **Task 3: Wire ComprobantesTab — row click opens modal, Download button triggers PDF, new estado badges** - `13c6eec` (feat)

**Plan metadata:** (pending — this summary commit)

## Files Created/Modified

- `frontend/src/types/finanzas.ts` — EstadoFactura extended to 4 values; Factura with AFIP fields; new FacturaDetail interface
- `frontend/src/hooks/useFinanzas.ts` — Added useFactura(id) and useUpdateTipoCambio() hooks
- `frontend/src/app/dashboard/finanzas/facturacion/components/FacturaDetailModal.tsx` — New component: Dialog with CAE, QR, PDF download, USD BNA section
- `frontend/src/app/dashboard/finanzas/facturacion/components/ComprobantesTab.tsx` — Row-click modal, Download button, 4-value ESTADO_BADGE, FacturaDetailModal render

## Decisions Made

- `downloadFacturaPdf` helper defined independently in both `FacturaDetailModal` and `ComprobantesTab` — small duplication preferred over cross-coupling sibling components
- `formatAfipDate` helper in `FacturaDetailModal` converts `'YYYYMMDD'` strings to `'DD/MM/YYYY'` without external dependency

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `npm run build` fails with Node.js version error (requires >=20.9.0, environment has 18.20.8) — pre-existing environment constraint unrelated to this plan. TypeScript compilation via `npx tsc --noEmit` passes with zero errors, which is the canonical verification check specified in the plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- QR-02 and QR-03 frontend contracts delivered; Facturador can view CAE, scan QR, download PDF, and set BNA cotización for USD invoices
- Phase 16 (CAEA Contingency Mode) can proceed — `CAEA_PENDIENTE_INFORMAR` estado badge already in place
- Phase 04 of this phase (if any) can use `useFactura` and `FacturaDetail` type

---
*Phase: 15-qr-afip-pdf-frontend-comprobantes*
*Completed: 2026-03-30*
