# Phase 31: Stock Órdenes de Consumo UI — Research

**Researched:** 2026-05-12
**Domain:** NestJS backend confirmation endpoint + Next.js/TanStack Query frontend list-and-confirm UI
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STOCK-03 | El responsable de stock puede ver la lista de órdenes de consumo pendientes y confirmarlas una a una | GET /ordenes-consumo endpoint exists; needs `include: { paciente, insumos.producto }` enrichment; new frontend page at `/dashboard/stock/consumo` |
| STOCK-04 | Al confirmar una orden, se registra el movimiento SALIDA en el stock correspondiente dentro de una transacción atómica | POST /ordenes-consumo/:id/confirmar — single `$transaction` updates estado=CONFIRMADA, runs `registrarMovimiento(SALIDA)` per insumo; existing InventarioService.registrarMovimiento is transaction-aware |
</phase_requirements>

---

## Summary

Phase 27 fully built the **creation side** of the OrdenConsumo lifecycle: the HC service atomically creates `OrdenConsumo { estado: PENDIENTE }` with its `OrdenConsumoInsumo` rows inside the same `$transaction` as the HC entry. Phase 31 implements the **consumption side**: listing PENDIENTE orders for the stock admin and executing an atomic confirmation that writes `MovimientoStock SALIDA` for each insumo.

The backend module `ordenes-consumo` already exists and is registered in `AppModule`. It currently exposes only `GET /ordenes-consumo` (PENDIENTE filter, includes `insumos`). What is missing is: (1) a richer `include` on the GET query to surface `paciente.nombreCompleto` and `insumos.producto.nombre`; (2) a new `POST /ordenes-consumo/:id/confirmar` endpoint backed by a service method that runs the atomic SALIDA transaction. The frontend has zero pages for consuming these orders — a new route `/dashboard/stock/consumo` with its page, hook, and type additions is the full frontend scope.

**Primary recommendation:** Add `confirmarOrden(id, profesionalId, usuarioId)` to `OrdenesConsumoService` (single `$transaction`: fetch order with insumos, guard PENDIENTE, call existing `InventarioService.registrarMovimiento` logic inline, update estado=CONFIRMADA). Wire a `POST :id/confirmar` controller action. On the frontend, add `useOrdenesConsumo` query hook, `useConfirmarOrdenConsumo` mutation hook, a page, and a sidebar link — following the exact pattern of `/dashboard/stock/ordenes`.

---

## Standard Stack

### Core (already in project — no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS + Prisma | existing | Backend module, service, controller | Project standard; OrdenesConsumoModule already wired |
| TanStack Query | existing | useQuery / useMutation for list + confirm | Project-wide pattern for all data hooks |
| shadcn/ui (Table, Badge, Button, Card, Skeleton) | existing | Page layout | Used identically in `/dashboard/stock/ordenes/page.tsx` |
| sonner (toast) | existing | Success/error feedback | Used in ordenes/page.tsx `toast.success` / `toast.error` |
| lucide-react | existing | Icons (Check, Clock, Package, AlertTriangle) | Standard icon set |

### No new dependencies required.

---

## Architecture Patterns

### Recommended File Layout

```
backend/src/modules/ordenes-consumo/
├── dto/
│   └── confirmar-orden-consumo.dto.ts   # empty or minimal (no body needed)
├── ordenes-consumo.controller.ts        # ADD: POST :id/confirmar
├── ordenes-consumo.service.ts           # ADD: confirmarOrden(); ENRICH: findPendientesByProfesional include
└── ordenes-consumo.module.ts            # ADD: StockModule import (for InventarioService)

frontend/src/
├── types/stock.ts                       # ADD: OrdenConsumo, OrdenConsumoInsumo types
├── hooks/useOrdenesConsumo.ts           # NEW: useOrdenesConsumo + useConfirmarOrdenConsumo
└── app/dashboard/stock/
    ├── consumo/
    │   └── page.tsx                     # NEW: pending orders list page
    └── components/Sidebar.tsx           # ADD: "Órdenes de Consumo" sub-link
```

### Pattern 1: Atomic Confirmation Transaction (STOCK-04)

The existing `InventarioService.registrarMovimiento` already runs its own `$transaction`. For the confirmation, we need ONE outer transaction that:
1. Fetches and locks the `OrdenConsumo` (guards PENDIENTE)
2. Iterates `insumos` — for each, resolves the inventario and creates a `MovimientoStock SALIDA`
3. Decrements `inventario.stockActual`
4. Updates `OrdenConsumo.estado = CONFIRMADA`

**Critical constraint:** `InventarioService.registrarMovimiento` cannot be called from inside another `$transaction` — Prisma does not support nested transactions with pgBouncer (interactive transactions are single-connection). The confirmation service method must inline the SALIDA logic itself (same approach HC service uses with pre-fetches outside tx).

```typescript
// Source: pattern from ordenes-compra.service.ts recibir() + HC service crearEntrada()
async confirmarOrden(id: string, profesionalId: string, usuarioId: string) {
  // 1. Pre-fetch outside tx (pgBouncer pattern)
  const orden = await this.prisma.ordenConsumo.findFirst({
    where: { id, profesionalId, estado: 'PENDIENTE' },
    include: { insumos: true },
  });
  if (!orden) throw new NotFoundException('Orden no encontrada o no está pendiente');

  // 2. Single $transaction
  return this.prisma.$transaction(async (tx) => {
    // Re-fetch inside tx to lock
    const ordenTx = await tx.ordenConsumo.findFirst({
      where: { id, profesionalId, estado: 'PENDIENTE' },
      include: { insumos: true },
    });
    if (!ordenTx) throw new ConflictException('Orden ya fue confirmada o cancelada');

    for (const insumo of ordenTx.insumos) {
      // Get or create inventario
      let inv = await tx.inventario.findUnique({
        where: { productoId_profesionalId: { productoId: insumo.productoId, profesionalId } },
      });
      if (!inv) {
        inv = await tx.inventario.create({
          data: { productoId: insumo.productoId, profesionalId, stockActual: 0, stockMinimo: 0 },
        });
      }
      const cantidad = Number(insumo.cantidad);
      if (inv.stockActual < cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para producto ${insumo.productoId}. Disponible: ${inv.stockActual}`,
        );
      }
      // Decrement stock
      await tx.inventario.update({
        where: { id: inv.id },
        data: { stockActual: inv.stockActual - cantidad },
      });
      // Audit trail
      await tx.movimientoStock.create({
        data: {
          inventarioId: inv.id,
          tipo: 'SALIDA',
          cantidad,
          motivo: `Orden de consumo #${id.slice(0, 8)}`,
          usuarioId,
        },
      });
    }

    return tx.ordenConsumo.update({
      where: { id },
      data: { estado: 'CONFIRMADA' },
    });
  });
}
```

### Pattern 2: Enriched GET Query (STOCK-03)

The current `findPendientesByProfesional` includes only `insumos` (no product names, no patient name). The page requires: patient name, session date, treatments snapshot, and insumo names.

```typescript
// Source: ordenes-consumo.service.ts — extend existing method
findPendientesByProfesional(profesionalId: string) {
  return this.prisma.ordenConsumo.findMany({
    where: { profesionalId, estado: 'PENDIENTE' },
    include: {
      paciente: { select: { id: true, nombreCompleto: true } },
      insumos: {
        include: {
          producto: { select: { id: true, nombre: true, unidadMedida: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
```

### Pattern 3: Frontend Hook Pattern

Mirrors `useOrdenesCompra.ts` exactly:

```typescript
// Source: frontend/src/hooks/useOrdenesCompra.ts pattern
export function useOrdenesConsumo() {
  const professionalId = useEffectiveProfessionalId();
  return useQuery<OrdenConsumo[], Error>({
    queryKey: ['ordenes-consumo', professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data } = await api.get('/ordenes-consumo', {
        params: { profesionalId },
      });
      return data;
    },
  });
}

export function useConfirmarOrdenConsumo() {
  const queryClient = useQueryClient();
  const professionalId = useEffectiveProfessionalId();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.post(`/ordenes-consumo/${id}/confirmar`, {}, {
        params: { profesionalId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-consumo'] });
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['alertas-stock'] });
      queryClient.invalidateQueries({ queryKey: ['alertas-resumen'] });
    },
  });
}
```

### Pattern 4: Page Structure

The page at `/dashboard/stock/consumo/page.tsx` follows `/dashboard/stock/ordenes/page.tsx` exactly:
- `isLoading` → Skeleton rows
- `error` → AlertTriangle + retry button
- `ordenes?.length === 0` → Empty state with Package icon
- Otherwise → Table with columns: Paciente, Fecha Sesión, Tratamientos, Insumos a Consumir, Acciones
- Confirmar button triggers `confirmarOrdenConsumo.mutateAsync(orden.id)`, shows `toast.success` or `toast.error`
- On success the orden disappears from list (TanStack Query cache invalidation)

### Pattern 5: Sidebar Addition

```typescript
// frontend/src/app/dashboard/components/Sidebar.tsx
// ADD sub-item to the existing stock entry (line ~147):
{ href: "/dashboard/stock/consumo", label: "Órdenes de Consumo" },
```

Permissions: `/dashboard/stock` already grants access to `['ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR']` — no change to `permissions.ts` needed (sub-routes inherit parent prefix).

### Anti-Patterns to Avoid

- **Nested transactions:** Do NOT call `InventarioService.registrarMovimiento()` from inside `$transaction` — Prisma/pgBouncer forbids nested interactive transactions. Inline the SALIDA logic within the outer tx.
- **Missing idempotency guard:** Always re-fetch and re-check `estado === PENDIENTE` inside the `$transaction`, not only outside. A race condition where two users click Confirmar simultaneously must result in only one success (the second sees ConflictException).
- **Partial confirmation:** If any insumo has insufficient stock, the entire confirmation must roll back. Prisma `$transaction` guarantees this — do not catch errors inside the tx loop.
- **Skipping inventario invalidation on confirm:** After confirming, `stockActual` changes in the DB. `useInventario` cache must be invalidated so the main stock page reflects the change immediately (STOCK-03 success criterion #3).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stock decrement logic | Custom SQL or new Prisma model | Inline tx writes matching existing `InventarioService.registrarMovimiento` logic | Edge cases: stock < 0, lote tracking, audit trail — existing code handles these |
| Toast notifications | Custom notification system | `sonner` toast (already used in ordenes/page.tsx) | Already wired project-wide |
| Loading states | Custom spinner components | `Skeleton` from shadcn/ui (see ordenes/page.tsx) | Consistent UX |
| Professional context | Re-implement user/role lookup | `useEffectiveProfessionalId()` + `resolveScope()` on backend | Multi-tenant pattern established project-wide |

---

## Common Pitfalls

### Pitfall 1: Nested Transaction Error (pgBouncer)
**What goes wrong:** Calling `InventarioService.registrarMovimiento()` (which opens its own `$transaction`) from within `confirmarOrden`'s `$transaction` throws "already in a transaction" at runtime.
**Why it happens:** pgBouncer transaction-mode pooling; Prisma does not support nested interactive transactions.
**How to avoid:** Inline the SALIDA write logic (inventario update + movimientoStock create) directly inside the confirmation `$transaction`. Mirror the pattern used in `recibir()` in `ordenes-compra.service.ts`.
**Warning signs:** `PrismaClientKnownRequestError` mentioning "already in a transaction".

### Pitfall 2: Race Condition on Confirm
**What goes wrong:** Two stock admins click Confirmar on the same order simultaneously. Both succeed, stock is decremented twice, order appears CONFIRMADA once.
**Why it happens:** First read of `estado` outside transaction is stale by the time write happens.
**How to avoid:** Re-read `estado` inside `$transaction` and throw `ConflictException` if not PENDIENTE.

### Pitfall 3: Missing `include` on GET Enrichment
**What goes wrong:** Frontend receives `insumos` array with `productoId` but no `nombre`, rendering blank cells.
**Why it happens:** Current `findPendientesByProfesional` only does `include: { insumos: true }`.
**How to avoid:** Extend to `include: { paciente: { select: {...} }, insumos: { include: { producto: { select: {...} } } } }`.

### Pitfall 4: `tratamientosSnapshot` is JSON — not a Prisma relation
**What goes wrong:** Trying to `include: { tratamientos: true }` on OrdenConsumo.
**Why it happens:** `tratamientosSnapshot` is stored as `Json` column (array of `{ id, nombre }` objects), not a FK relation.
**How to avoid:** Read it as `orden.tratamientosSnapshot as Array<{ id: string; nombre: string }>` and render directly.

### Pitfall 5: Decimal amounts from Prisma
**What goes wrong:** `insumo.cantidad` arrives as a `Prisma.Decimal` object, `stockActual - cantidad` gives `NaN` or wrong result.
**Why it happens:** `OrdenConsumoInsumo.cantidad` is `Decimal @db.Decimal(10,3)` in schema.
**How to avoid:** Always `Number(insumo.cantidad)` before arithmetic. On frontend, similarly cast.

### Pitfall 6: No `ordenConsumoId` on `MovimientoStock`
**What goes wrong:** No traceability from `MovimientoStock` back to `OrdenConsumo`.
**Why it happens:** `MovimientoStock` schema only has `practicaId`, `ordenCompraId`, `ventaProductoId` — no `ordenConsumoId` FK.
**How to avoid (Phase 31 scope):** Use `motivo` field to embed a reference string (e.g., `Orden de consumo #${id.slice(0,8)}`). Adding a full `ordenConsumoId` FK to `MovimientoStock` requires a schema migration and is out of scope for Phase 31 (no requirement mandates it).

---

## Code Examples

### Controller Action
```typescript
// Source: pattern from ordenes-compra.controller.ts POST :id/recibir
@Post(':id/confirmar')
async confirmar(
  @Param('id') id: string,
  @Req() req: any,
  @Query('profesionalId') profesionalId?: string,
) {
  const pid = await this.getProfesionalId(req.user, profesionalId);
  return this.ordenesConsumoService.confirmarOrden(id, pid, req.user.userId);
}
```

### Frontend Type additions to `stock.ts`
```typescript
export type EstadoOrdenConsumo = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';

export interface OrdenConsumoInsumo {
  id: string;
  productoId: string;
  cantidad: number;
  producto?: { id: string; nombre: string; unidadMedida?: string | null };
}

export interface OrdenConsumo {
  id: string;
  pacienteId: string;
  profesionalId: string;
  turnoId?: string | null;
  historiaClinicaEntradaId: string;
  fechaSesion: string;
  estado: EstadoOrdenConsumo;
  tratamientosSnapshot: Array<{ id: string; nombre: string }>;
  createdAt: string;
  paciente?: { id: string; nombreCompleto: string };
  insumos: OrdenConsumoInsumo[];
}
```

### Module update (import StockModule for InventarioService if needed)
If the confirmation logic needs `InventarioService` directly (rather than inlining), add `StockModule` to `OrdenesConsumoModule` imports. However, since inlining the tx is recommended, only `PrismaModule` is needed (already present).

---

## State of the Art

| Area | Current State | Phase 31 Addition |
|------|--------------|-------------------|
| OrdenConsumo creation | Complete (Phase 27) | No change |
| GET /ordenes-consumo | Returns PENDIENTE with `insumos` only | Enriched include: paciente + producto |
| POST /ordenes-consumo/:id/confirmar | Missing | New endpoint + service method |
| Frontend consumo page | Missing | New `/dashboard/stock/consumo/page.tsx` |
| Frontend hooks | Missing | `useOrdenesConsumo` + `useConfirmarOrdenConsumo` |
| Sidebar link | Missing | Sub-link under Stock |
| `ordenConsumoId` on MovimientoStock | Not in schema | Out of scope; use `motivo` for traceability |

---

## Open Questions

1. **Stock insuficiente UX — block confirmation or warn?**
   - What we know: The requirement says "descuento atómico" — if stock < required, a hard block is correct.
   - What's unclear: Should the UI pre-validate before calling the endpoint, or rely solely on backend 400?
   - Recommendation: Backend throws `BadRequestException` with a clear message; frontend shows it via `toast.error(error.response.data.message)`. No pre-validation needed in Phase 31.

2. **LOTE handling on confirmation**
   - What we know: `MovimientoStock` supports `loteId` for traceability; existing `registrarMovimiento` does FIFO lote selection.
   - What's unclear: Requirements do not mandate lote tracking for consumption orders (deferred to v2+ per REQUIREMENTS.md).
   - Recommendation: Omit `loteId` from confirmation — create `MovimientoStock` without lote reference. This matches the existing `descuentaStock` simple path.

3. **Who can confirm — role restriction?**
   - What we know: `/dashboard/stock` permits `ADMIN, PROFESIONAL, SECRETARIA, FACTURADOR`. The controller `@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')` is the existing pattern.
   - What's unclear: Should FACTURADOR be able to confirm stock orders?
   - Recommendation: Keep same roles as existing GET endpoint (`ADMIN`, `PROFESIONAL`, `SECRETARIA`). No code change to permissions needed.

---

## Sources

### Primary (HIGH confidence)
- `backend/src/modules/ordenes-consumo/ordenes-consumo.service.ts` — current service scaffold
- `backend/src/modules/ordenes-consumo/ordenes-consumo.controller.ts` — existing GET endpoint and `getProfesionalId` helper
- `backend/src/prisma/schema.prisma` lines 950–987 — `EstadoOrdenConsumo`, `OrdenConsumo`, `OrdenConsumoInsumo` models
- `backend/src/modules/stock/services/inventario.service.ts` — `registrarMovimiento` transaction logic (FIFO, lote, stock validation)
- `backend/src/modules/stock/services/ordenes-compra.service.ts` `recibir()` method — direct reference pattern for atomic SALIDA
- `backend/src/modules/historia-clinica/historia-clinica.service.ts` — pgBouncer pre-fetch outside tx pattern (lines 146-179)
- `frontend/src/app/dashboard/stock/ordenes/page.tsx` — reference UI pattern (filter, table, confirm action, toasts)
- `frontend/src/hooks/useOrdenesCompra.ts` — reference hook pattern
- `frontend/src/hooks/useInventario.ts` — invalidation key pattern
- `frontend/src/app/dashboard/components/Sidebar.tsx` — stock sub-links structure
- `frontend/src/lib/permissions.ts` — stock route permissions

### Secondary (MEDIUM confidence)
- `STATE.md` accumulated decisions: "OrdenConsumo pattern", "27-01 OrdenConsumo atomic creation", pgBouncer patterns
- REQUIREMENTS.md STOCK-03/STOCK-04 definitions and v2+ deferrals

---

## Metadata

**Confidence breakdown:**
- Backend service method: HIGH — direct reference in ordenes-compra.service.ts `recibir()` + HC service pattern
- Frontend page + hook: HIGH — directly mirrors ordenes/page.tsx and useOrdenesCompra.ts
- Schema: HIGH — OrdenConsumo fully defined in schema.prisma, all fields confirmed
- Pitfalls (pgBouncer nesting, Decimal cast): HIGH — explicit warnings in STATE.md + service patterns

**Research date:** 2026-05-12
**Valid until:** 2026-06-12 (stable stack, no fast-moving dependencies)
