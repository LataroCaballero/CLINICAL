# Phase 19: getCierreMensual facturaId Extension — Research

**Researched:** 2026-03-31
**Domain:** NestJS backend service extension + TypeScript type propagation + React type-cast cleanup
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAE-02 (secondary surface) | Sistema emite comprobante electrónico real via `FECAESolicitar` — secondary surface: LiquidacionesTab and liquidaciones/page can open FacturaDetailModal with a real `facturaId` instead of null | Backend query extension surfaces the facturaId already stored on `LiquidacionObraSocial.facturaId`; frontend type update + cast removal wire it end-to-end |
</phase_requirements>

---

## Summary

Phase 19 is a narrow, high-confidence extension of the existing `getCierreMensual` backend method. The gap is simple: the service already groups practices by `obraSocial`, but it does not look up whether a `LiquidacionObraSocial` record already exists for that OS in the requested month — and therefore never surfaces its `facturaId`.

The Prisma schema confirms that `LiquidacionObraSocial` carries a `facturaId String?` column and has a direct `obraSocial` relation via `obraSocialId`. A single additional Prisma query in `getCierreMensual` can fetch all `LiquidacionObraSocial` rows for the requested period and profesional, indexed by `obraSocialId`, and then merge `facturaId` into each `porObraSocial` entry before returning.

On the frontend, `CierreMensualResumen.detalleObrasSociales` needs a `facturaId: string | null` field added to the TypeScript interface, and the unsafe `(os as { facturaId?: string | null })` type cast in both `LiquidacionesTab.tsx` and `liquidaciones/page.tsx` can be removed. `FacturaDetailModal` already accepts `facturaId: string | null` — no changes needed there.

**Primary recommendation:** Extend `getCierreMensual` with a `liquidacionObraSocial.findMany` query keyed by `{ periodo: mes, obraSocialId: { in: [...] }, profesionalId? }`, merge `facturaId` into each `porObraSocial` entry, then add `facturaId` to the TypeScript type and remove the casts.

---

## Standard Stack

### Core (already in place — no new dependencies)
| Component | Version | Purpose | Notes |
|-----------|---------|---------|-------|
| Prisma Client | existing | `liquidacionObraSocial.findMany` query | No migration needed — `facturaId` column already exists on `LiquidacionObraSocial` |
| NestJS FinanzasService | existing | Backend service method | Method signature unchanged — backward-compatible additive return field |
| TypeScript interfaces | existing | `CierreMensualResumen` in `finanzas.ts` | Add `facturaId: string \| null` to `detalleObrasSociales` item shape |
| TanStack Query | existing | `useCierreMensual` hook | No changes — hook returns whatever the API sends; adding a field is additive |

**Installation:** No new packages required.

---

## Architecture Patterns

### Current `getCierreMensual` Structure

```
getCierreMensual(mes, profesionalId?)
  1. Build whereClause (date range + optional profesionalId)
  2. prisma.practicaRealizada.findMany(whereClause, include Profesional)
  3. prisma.paciente.findMany({id: in pacienteIds}, include obraSocial)
  4. Loop practices → populate porObraSocial map (keyed by obraSocialId || 'particular')
  5. prisma.movimientoCC.aggregate → totalClinica
  6. Return { mes, totalObrasSociales, totalParticulares, totalClinica, totalGlobal, detalleObrasSociales }
```

### Pattern: Additive Lookup — Merge facturaId via Secondary Query

**What:** After building `porObraSocial`, run one additional `liquidacionObraSocial.findMany` for the same period and profesional, build a Map from `obraSocialId` to `facturaId`, then merge into each entry before returning.

**When to use:** When the primary aggregation loop does not traverse the table that holds the desired field. Avoids a more complex join restructure.

**Example:**
```typescript
// Source: direct analysis of getCierreMensual in finanzas.service.ts

// After the porObraSocial loop, before the totalClinica aggregate:
const obraSocialIds = Object.keys(porObraSocial).filter((k) => k !== 'particular');

const liquidacionesWhere: any = {
  periodo: mes,   // LiquidacionObraSocial.periodo is 'YYYY-MM'
  obraSocialId: { in: obraSocialIds },
};
if (profesionalId) {
  // LiquidacionObraSocial has no direct profesionalId column —
  // filter via the practicas relation or accept all-tenant records.
  // See "Open Questions" section for discussion.
}

const liquidaciones = await this.prisma.liquidacionObraSocial.findMany({
  where: liquidacionesWhere,
  select: { obraSocialId: true, facturaId: true },
});

const facturaIdByObraSocial = new Map(
  liquidaciones.map((l) => [l.obraSocialId, l.facturaId ?? null]),
);

// Then in the return statement:
detalleObrasSociales: Object.values(porObraSocial)
  .filter((os) => os.obraSocialId !== null)
  .map((os) => ({
    ...os,
    facturaId: facturaIdByObraSocial.get(os.obraSocialId!) ?? null,
  })),
```

### Anti-Patterns to Avoid

- **Re-fetching all practicas with a join just to get facturaId:** The current structure traverses `practicaRealizada` → `paciente` → `obraSocial`. Adding a deep include chain just for `facturaId` would bloat the main query. Separate lookup is cleaner.
- **Mutating the `porObraSocial` map items after the `Object.values()` call:** The map shape is `Record<string, {...}>` — mutate before calling `Object.values()`, or use `.map()` in the return as shown above.
- **Adding `facturaId` to the `porObraSocial` accumulator type inline:** The TypeScript record type is declared inline with a specific shape. Extend the shape in the record declaration so the type is correct throughout.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mapping OS → facturaId | Custom recursive join logic | Single `findMany` + `Map` lookup | One round-trip, O(n) merge |
| TypeScript type update | Generating new DTOs | Extend existing `CierreMensualResumen` interface inline | Consistent with Phase 15/17 pattern of evolving existing interfaces |

---

## Exact File Map

### Backend

| File | Path | Change |
|------|------|--------|
| `finanzas.service.ts` | `backend/src/modules/finanzas/finanzas.service.ts` | Add `liquidacionObraSocial.findMany` query + merge `facturaId` into return |
| `finanzas.service.spec.ts` | `backend/src/modules/finanzas/finanzas.service.spec.ts` | Add `getCierreMensual` describe block (currently zero coverage) |

The controller (`finanzas.controller.ts`) does not need changes — it passes through to the service unchanged.

### Frontend

| File | Path | Change |
|------|------|--------|
| `finanzas.ts` (types) | `frontend/src/types/finanzas.ts` | Add `facturaId: string \| null` to `CierreMensualResumen.detalleObrasSociales` |
| `LiquidacionesTab.tsx` | `frontend/src/app/dashboard/finanzas/facturacion/components/LiquidacionesTab.tsx` | Remove `(os as { facturaId?: string \| null })` cast → use `os.facturaId` directly |
| `liquidaciones/page.tsx` | `frontend/src/app/dashboard/finanzas/liquidaciones/page.tsx` | Same cast removal as LiquidacionesTab |

`useFinanzas.ts` (hook) and `FacturaDetailModal.tsx` require NO changes.

---

## Current State of Each Affected File

### `getCierreMensual` return shape (as of Phase 18)

```typescript
// finanzas.service.ts lines 735–744
return {
  mes,
  totalObrasSociales,
  totalParticulares,
  totalClinica: Number(totalClinica._sum.monto || 0),
  totalGlobal: totalObrasSociales + totalParticulares,
  detalleObrasSociales: Object.values(porObraSocial).filter(
    (os) => os.obraSocialId !== null,
  ),
  // MISSING: facturaId per OS entry
};
```

### `CierreMensualResumen` TypeScript interface (as of Phase 18)

```typescript
// frontend/src/types/finanzas.ts lines 287–300
export interface CierreMensualResumen {
  mes: string;
  totalObrasSociales: number;
  totalParticulares: number;
  totalClinica: number;
  totalGlobal: number;
  detalleObrasSociales: {
    obraSocialId: string;
    nombre: string;
    total: number;
    facturado: number;
    pendiente: number;
    // MISSING: facturaId: string | null
  }[];
}
```

### Cast workaround in LiquidacionesTab and liquidaciones/page (as of Phase 17, same pattern in both)

```typescript
onClick={() => {
  setSelectedFacturaId((os as { facturaId?: string | null }).facturaId ?? null);
  setDetailModalOpen(true);
}}
```

After Phase 19, this becomes:
```typescript
onClick={() => {
  setSelectedFacturaId(os.facturaId);
  setDetailModalOpen(true);
}}
```

### `FacturaDetailModal` props (no change needed)

```typescript
export default function FacturaDetailModal({
  facturaId,
  open,
  onOpenChange,
}: {
  facturaId: string | null;   // already handles null gracefully
  open: boolean;
  onOpenChange: (open: boolean) => void;
})
```

When `facturaId` is null, `useFactura(null)` has `enabled: false` — query does not fire, modal shows "No se pudo cargar el comprobante". When `facturaId` is a real UUID (after this phase), the modal loads and shows the full factura data including the "Emitir Comprobante" button.

---

## Schema Findings

### `LiquidacionObraSocial` model (schema.prisma lines 496–509)

```
model LiquidacionObraSocial {
  id           String              @id @default(uuid())
  obraSocialId String
  periodo      String              // 'YYYY-MM' — matches the `mes` parameter
  fechaPago    DateTime?
  montoTotal   Decimal             @db.Decimal(10, 2)
  usuarioId    String?
  facturaId    String?             // ← this is what Phase 19 surfaces
  createdAt    DateTime            @default(now())
  factura      Factura?            @relation(fields: [facturaId], references: [id])
  obraSocial   ObraSocial          @relation(fields: [obraSocialId], references: [id])
  usuario      Usuario?            @relation(fields: [usuarioId], references: [id])
  practicas    PracticaRealizada[]
}
```

Key observation: `LiquidacionObraSocial` does NOT have a `profesionalId` column directly. The profesional scope is indirect — via `practicas` (each `PracticaRealizada` has `profesionalId`) or via the `Factura` relation (`Factura.profesionalId`). This matters for the where clause — see Open Questions below.

### `Factura` model (schema.prisma lines 522–558)

`Factura` has `liquidaciones LiquidacionObraSocial[]` (one-to-many). A factura can be associated with multiple liquidaciones (though typically one per OS per period). The `facturaId` on `LiquidacionObraSocial` is the correct field to surface.

---

## Common Pitfalls

### Pitfall 1: periodo field format mismatch
**What goes wrong:** `LiquidacionObraSocial.periodo` is a plain `String` (e.g., `'2026-03'`). The `mes` parameter passed to `getCierreMensual` is also `'YYYY-MM'`. These match exactly — no transformation needed.
**How to avoid:** Use `periodo: mes` directly in the where clause.

### Pitfall 2: Multiple LiquidacionObraSocial rows per OS per period
**What goes wrong:** If `crearLoteLiquidacion` has been called more than once for the same OS+period (e.g., correction), there could be multiple rows. `Map` construction with `new Map(array.map(...))` keeps only the last entry.
**How to avoid:** Use `findFirst` with `orderBy: { createdAt: 'desc' }` per OS, or deduplicate to keep the row with a non-null `facturaId`. Alternatively, accept last-write-wins since the UI only needs to show one factura per OS per period.
**Recommendation:** Use `findMany` then build a Map that prefers entries where `facturaId IS NOT NULL` — scan the array and `set` only if `facturaId` is non-null, or overwrite with any non-null value found.

### Pitfall 3: The porObraSocial record type does not include facturaId
**What goes wrong:** The inline `Record<string, { obraSocialId, nombre, total, facturado, pendiente }>` type annotation on line 672 of the service will cause a TypeScript error if you try to add `facturaId` during the loop without updating the type.
**How to avoid:** Add `facturaId: string | null` to the inline record type declaration at line 672, or build it as a separate step in the return value (Map merge pattern).

### Pitfall 4: TypeScript strict-mode off — no compile-time guard on the cast
**What goes wrong:** Because `strict: false` in the project, the existing `(os as { facturaId?: string | null })` cast compiles without error even after the type update. The cleanup must be done explicitly.
**How to avoid:** After updating `CierreMensualResumen`, grep for the cast string and remove both occurrences.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `os.facturaId` unavailable, button opens modal with `null` | `os.facturaId` surfaces real DB value, modal loads full factura | "Emitir Comprobante" button in LiquidacionesTab/liquidaciones/page loads the existing factura and allows emission |

---

## Open Questions

1. **Should the `liquidacionObraSocial.findMany` query filter by profesional?**
   - What we know: `LiquidacionObraSocial` has no `profesionalId` column. The `Factura` linked via `facturaId` has `profesionalId`. The `practicas` relation has `profesionalId` on each row.
   - What's unclear: In practice, each `LiquidacionObraSocial` is created per profesional via `crearLoteLiquidacion`. But the schema does not enforce this — multi-tenant correctness would require filtering via `factura: { profesionalId }` or via practicas.
   - Recommendation: If `profesionalId` is provided, add `factura: { profesionalId }` to the where clause. This is a safe join on the existing FK. If no factura exists yet for a liquidacion row, the `factura` relation is null and `facturaId` would already be null — so filtering `factura: { profesionalId }` does not silently drop rows where `facturaId IS NULL`. Verify: use `factura: { is: { profesionalId } }` with Prisma OR accept that un-invoiced liquidaciones will have `facturaId: null` regardless of filtering (safe default).
   - **Simpler safe path:** Do not filter by profesional in the liquidaciones query — the `porObraSocial` map already only contains OS IDs that had practices for the given `profesionalId`, so the `obraSocialId: { in: obraSocialIds }` filter implicitly scopes correctly. This avoids the null-factura filtering complexity entirely.

2. **Does `LiquidacionObraSocial` mock need to be added to `mockPrismaService` in the spec?**
   - What we know: `mockPrismaService` in `finanzas.service.spec.ts` does not have a `liquidacionObraSocial` mock object. The new query calls `this.prisma.liquidacionObraSocial.findMany`.
   - Recommendation: Add `liquidacionObraSocial: { findMany: jest.fn() }` to `mockPrismaService` in the spec file as part of the test setup.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (NestJS default) |
| Config file | `backend/package.json` jest config |
| Quick run command | `cd backend && npx jest finanzas.service.spec.ts --no-coverage` |
| Full suite command | `cd backend && npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAE-02 secondary | `getCierreMensual` returns `facturaId` in `detalleObrasSociales` when a `LiquidacionObraSocial` with `facturaId` exists | unit | `cd backend && npx jest finanzas.service.spec.ts --no-coverage -t "getCierreMensual"` | ❌ Wave 0 — new describe block needed |
| CAE-02 secondary | `getCierreMensual` returns `facturaId: null` when no `LiquidacionObraSocial` exists for that OS | unit | same command | ❌ Wave 0 |
| CAE-02 secondary | `FacturaDetailModal` opens with real factura data when `facturaId` is non-null from liquidaciones surface | e2e / manual | human verify | N/A |

### What to Unit Test (service method return shape)

1. When a `LiquidacionObraSocial` row exists for OS `A` in period `2026-03` with `facturaId = 'factura-uuid-1'`:
   - `getCierreMensual('2026-03')` returns `detalleObrasSociales` with `{ ..., facturaId: 'factura-uuid-1' }` for OS `A`.

2. When no `LiquidacionObraSocial` exists for OS `B` in period `2026-03`:
   - `getCierreMensual('2026-03')` returns `detalleObrasSociales` with `{ ..., facturaId: null }` for OS `B`.

3. When multiple `LiquidacionObraSocial` rows exist for OS `C` (one with `facturaId = null`, one with `facturaId = 'uuid-2'`):
   - Returns `facturaId: 'uuid-2'` (non-null preferred).

### What to Integration Test (endpoint response)

No new integration tests needed — the endpoint shape change is additive. The unit tests above are sufficient to verify the backend contract.

### What Requires Human/E2E Verification

1. Navigate to `/dashboard/finanzas/liquidaciones` (or the Cierre Mensual tab in facturacion).
2. Select a month where at least one OS has a `LiquidacionObraSocial` with a linked factura.
3. Click "Emitir Comprobante" — verify that `FacturaDetailModal` opens and shows the factura details (number, total, estado), not the "No se pudo cargar el comprobante" fallback.
4. If factura is `EMITIDA`: verify the "Emitir Comprobante" button is absent and "Descargar PDF" is shown.
5. If factura has no CAE: verify the "Emitir Comprobante" button is present and clickable.

### Sampling Rate
- **Per task commit:** `cd backend && npx jest finanzas.service.spec.ts --no-coverage`
- **Per wave merge:** `cd backend && npm run test`
- **Phase gate:** Full suite green + human verify before declaring phase complete

### Wave 0 Gaps
- [ ] `backend/src/modules/finanzas/finanzas.service.spec.ts` — add `describe('getCierreMensual', ...)` block; add `liquidacionObraSocial: { findMany: jest.fn() }` to `mockPrismaService`

---

## Sources

### Primary (HIGH confidence)
- Direct file read: `backend/src/modules/finanzas/finanzas.service.ts` lines 640–745 — complete `getCierreMensual` implementation
- Direct file read: `backend/src/prisma/schema.prisma` — `LiquidacionObraSocial`, `Factura`, `ObraSocial`, `PracticaRealizada` models
- Direct file read: `frontend/src/types/finanzas.ts` lines 287–300 — `CierreMensualResumen` interface
- Direct file read: `frontend/src/app/dashboard/finanzas/facturacion/components/LiquidacionesTab.tsx` lines 555–605 — cierre mensual tab + cast workaround
- Direct file read: `frontend/src/app/dashboard/finanzas/liquidaciones/page.tsx` lines 414–464 — same cast workaround
- Direct file read: `frontend/src/app/dashboard/finanzas/facturacion/components/FacturaDetailModal.tsx` — full props interface and `useFactura(null)` behavior
- Direct file read: `backend/src/modules/finanzas/finanzas.service.spec.ts` lines 1–96 — mock structure, confirmed `getCierreMensual` has zero test coverage
- Direct file read: `.planning/phases/17-cae-emission-ux/17-03-SUMMARY.md` — documents the exact cast workaround and deferred backend work

### Secondary (MEDIUM confidence)
- `finanzas.controller.ts` lines 211–217 — confirms endpoint signature unchanged, passthrough to service
- `.planning/STATE.md` decisions log — confirms `[Plan 17-03]` decision to defer `getCierreMensual` extension

---

## Metadata

**Confidence breakdown:**
- Backend service change: HIGH — exact query shape and merge strategy confirmed from schema + service code
- TypeScript type update: HIGH — interface found, field path confirmed
- Cast removal: HIGH — both files located, cast pattern identical
- Test gap: HIGH — `getCierreMensual` has zero coverage confirmed by grep
- Multi-liquidacion deduplication: MEDIUM — edge case, needs decision in implementation

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable domain — no external dependencies changing)
