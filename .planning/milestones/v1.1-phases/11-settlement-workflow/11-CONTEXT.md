# Phase 11: Settlement Workflow - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Settlement Workflow UI: the FACTURADOR clicks an OS card on the dashboard, lands on a dedicated page with the pending prácticas table for that OS, edits `montoPagado` per row (saves on blur), and closes the lote via a confirmation modal. Backend endpoints are already built (Phase 9). This phase is frontend-only except for a new PATCH endpoint for `montoPagado`.

</domain>

<decisions>
## Implementation Decisions

### Navigation from dashboard to lote table
- Clicking an OS card navigates to a new page: `/dashboard/facturador/liquidar/[obraSocialId]`
- Cards on the dashboard only get `cursor-pointer` — no extra "Liquidar →" text
- The liquidation page has a header with: OS name + live total (montoPagado ?? monto) + "Cerrar Lote" button
- Total in the header updates in real-time as the facturador edits montoPagado values

### Table columns
- Columns: Paciente | Código | Descripción | Fecha | Autorizado | Pagado (editable)
- No "Diferencia" column
- "Pagado" field is empty by default with placeholder = monto autorizado (communicates fallback behavior)
- Clicking/focusing the Pagado cell shows a number input; saves on blur via PATCH

### Monto correction feedback
- No visual indicator on the row when montoPagado differs from monto (value change is sufficient)
- Save is **silent** — no toast on successful PATCH (facturador edits many rows sequentially)
- On PATCH error: toast + revert the cell to its previous value

### Closing the lote
- "Cerrar Lote" button is disabled when table has 0 prácticas
- Modal shows: count of prácticas + total of the lote (no limit warning in this modal)
- After confirming: toast de éxito + automatic redirect to `/dashboard/facturador`

### Claude's Discretion
- Pagination vs full list for the table (likely full list for a single OS lote, but Claude decides)
- Exact error message copy
- Loading skeleton design for the table

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useFacturadorDashboard.ts` — `usePracticasPendientesAgrupadas` already built; need new hooks for per-OS table and montoPagado PATCH
- `frontend/src/app/dashboard/facturador/page.tsx` — existing dashboard page; OS cards need to become `<Link>` navigating to `/liquidar/[obraSocialId]`
- `shadcn/ui` components: Card, Badge, Button, Dialog (modal), Input, Toast (sonner) — all available
- `formatMoney()` helper already defined in the facturador page — can be extracted to a shared util or duplicated

### Established Patterns
- TanStack Query hooks in `frontend/src/hooks/` — new hooks: `usePracticasPendientesPorOS`, `useActualizarMontoPagado`, `useCerrarLote`
- `api.get` / `api.patch` / `api.post` via `@/lib/api` axios instance
- `useProfessionalContext` store for `selectedProfessionalId`
- `toast.error()` from sonner for error feedback (established in useFacturadorDashboard)

### Integration Points
- Backend `GET /finanzas/practicas-pendientes/:profesionalId/por-os/:obraSocialId` — already built (Phase 9)
- Backend `POST /finanzas/liquidaciones/lote` (crearLoteLiquidacion) — already built (Phase 9)
- **New**: `PATCH /finanzas/practicas/:id/monto-pagado` — needs to be added (backend + frontend)
- `obraSocialId` from URL param `[obraSocialId]` maps to the route param for the backend call

</code_context>

<specifics>
## Specific Ideas

- The `[obraSocialId]` route should also show the OS name in the header — either pass it via query param or fetch it from the grouped list (the grouped endpoint returns `nombre`)
- The PATCH for `montoPagado` must update `corregidoPor` (usuarioId) and `corregidoAt` on the backend — these audit fields are already in the schema (Phase 8)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-settlement-workflow*
*Context gathered: 2026-03-14*
