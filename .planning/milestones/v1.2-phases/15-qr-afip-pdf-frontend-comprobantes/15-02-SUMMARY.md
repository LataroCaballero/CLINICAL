---
phase: 15-qr-afip-pdf-frontend-comprobantes
plan: "02"
subsystem: backend/finanzas
tags: [afip, qr, pdf, facturas, rest-api]
dependency_graph:
  requires: ["15-01"]
  provides: ["15-03"]
  affects: ["backend/finanzas module"]
tech_stack:
  added: []
  patterns: ["NestJS @Res() binary stream", "FacturaPdfService injection", "QRCode.toDataURL server-side"]
key_files:
  created: []
  modified:
    - backend/src/modules/finanzas/finanzas.controller.ts
    - backend/src/modules/finanzas/finanzas.service.ts
    - backend/src/modules/finanzas/dto/finanzas.dto.ts
    - backend/src/modules/finanzas/finanzas.service.spec.ts
decisions:
  - "Service methods (getFacturaById, generateFacturaPdf, updateTipoCambio) and tests were pre-implemented as part of previous work on this branch — only controller wiring was missing"
  - "GET facturas/:id/pdf placed before POST facturas/:id/anular to prevent NestJS routing conflicts with literal path segments"
  - "FacturaPdfData built from getFacturaById() detail + secondary prisma query for profesional/configClinica data"
  - "Pre-existing TS6059 error (test/app.e2e-spec.ts rootDir) is out-of-scope — unrelated to this plan"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-03-30"
  tasks_completed: 3
  tests_added: 9
  files_modified: 1
---

# Phase 15 Plan 02: Finanzas Backend Endpoints (Factura Detail + PDF + TipoCambio) Summary

**One-liner:** Three REST endpoints wired into FinanzasController — GET factura detail with server-side QR base64, GET binary PDF stream, PATCH BNA exchange rate — with 50 finanzas tests green.

## What Was Built

### Task 1: getFacturaById() + updateTipoCambio() in FinanzasService (pre-existing)

Both service methods were already implemented on the branch:

- `getFacturaById(id)` — fetches Factura with profesional/configClinica include, then separately fetches Paciente and ObraSocial (Factura model has no ORM relations to those), calls `QRCode.toDataURL()` server-side to produce `qrImageDataUrl` as `data:image/png;base64,...`, returns full `FacturaDetailDto`
- `updateTipoCambio(id, tipoCambio)` — validates > 0, updates `prisma.factura.update`, returns `{ tipoCambio }`
- Tests: 3 cases for `getFacturaById` (AFIP fields, qrImageDataUrl non-null, qrImageDataUrl null), 2 cases for `updateTipoCambio` (happy path, BadRequest on <= 0)

### Task 2: generateFacturaPdf() in FinanzasService (pre-existing)

- `generateFacturaPdf(id)` — calls `getFacturaById()`, guards `!cae` with BadRequestException, does second prisma query for `profesional.usuario.nombre/apellido` + `configClinica`, builds `FacturaPdfData`, calls `factPdfService.generatePdfBuffer()`, returns `{ buffer, filename }` where filename is `factura-{numero}-{fecha}.pdf`
- Tests: 4 cases (happy path, NotFoundException on missing, filename format, BadRequest on null cae)

### Task 3: Three endpoints in FinanzasController

Added to `finanzas.controller.ts`:

```
GET  /finanzas/facturas/:id              → service.getFacturaById(id)
GET  /finanzas/facturas/:id/pdf          → service.generateFacturaPdf(id) → binary stream
PATCH /finanzas/facturas/:id/tipo-cambio → service.updateTipoCambio(id, dto.tipoCambio)
```

Route ordering: All three placed BEFORE `POST facturas/:id/anular` to prevent NestJS from shadowing literal-segment routes with the param `:id` route.

New imports added:
- `Res` from `@nestjs/common`
- `Response` from `express`
- `UpdateTipoCambioDto` from `./dto/finanzas.dto`

## Verification Results

- `npx jest --testPathPattern=finanzas --passWithNoTests` — **50 tests pass** (6 test suites)
- `npx tsc --noEmit` — one pre-existing error (`TS6059: test/app.e2e-spec.ts not under rootDir`) — out of scope, not introduced by this plan

## Deviations from Plan

### Pre-implementation Discovery

Tasks 1 and 2 (service methods + tests) were found already implemented on the branch at plan execution time. This is consistent with STATE.md noting "last_activity: Phase 15 Plan 01 complete" but the service file showed the methods at offsets 400-537 with corresponding spec tests at lines 332-493. No re-implementation was needed — only Task 3 (controller wiring) required new code.

All new test cases (getFacturaById × 3, updateTipoCambio × 2, generateFacturaPdf × 4) match the behavior specifications exactly.

### Out-of-scope pre-existing issue

`TS6059` TypeScript error for `backend/test/app.e2e-spec.ts` is a pre-existing misconfiguration (confirmed by testing without changes). Logged to deferred items — not introduced by this plan.

## Self-Check: PASSED

- `backend/src/modules/finanzas/finanzas.controller.ts` — FOUND
- `backend/src/modules/finanzas/finanzas.service.ts` — FOUND
- `backend/src/modules/finanzas/finanzas.service.spec.ts` — FOUND
- `backend/src/modules/finanzas/factura-pdf.service.ts` — FOUND
- Commit `e5c78d6` — FOUND (feat(15-02): add GET facturas/:id, GET facturas/:id/pdf, PATCH facturas/:id/tipo-cambio to FinanzasController)
- 50 finanzas tests passing — CONFIRMED
