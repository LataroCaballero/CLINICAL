# Phase 11: Settlement Workflow - Research

**Researched:** 2026-03-14
**Domain:** NestJS PATCH endpoint + Next.js App Router dynamic route + TanStack Query inline cell editing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Navigation from dashboard to lote table**
- Clicking an OS card navigates to a new page: `/dashboard/facturador/liquidar/[obraSocialId]`
- Cards on the dashboard only get `cursor-pointer` — no extra "Liquidar →" text
- The liquidation page has a header with: OS name + live total (montoPagado ?? monto) + "Cerrar Lote" button
- Total in the header updates in real-time as the facturador edits montoPagado values

**Table columns**
- Columns: Paciente | Código | Descripción | Fecha | Autorizado | Pagado (editable)
- No "Diferencia" column
- "Pagado" field is empty by default with placeholder = monto autorizado (communicates fallback behavior)
- Clicking/focusing the Pagado cell shows a number input; saves on blur via PATCH

**Monto correction feedback**
- No visual indicator on the row when montoPagado differs from monto (value change is sufficient)
- Save is **silent** — no toast on successful PATCH (facturador edits many rows sequentially)
- On PATCH error: toast + revert the cell to its previous value

**Closing the lote**
- "Cerrar Lote" button is disabled when table has 0 prácticas
- Modal shows: count of prácticas + total of the lote (no limit warning in this modal)
- After confirming: toast de éxito + automatic redirect to `/dashboard/facturador`

### Claude's Discretion
- Pagination vs full list for the table (likely full list for a single OS lote, but Claude decides)
- Exact error message copy
- Loading skeleton design for the table

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIQ-01 | El FACTURADOR puede filtrar prácticas pendientes por obra social para trabajar un lote por OS a la vez | Backend endpoint `GET /finanzas/practicas-pendientes/:profesionalId/por-os/:obraSocialId` already built in Phase 9. Frontend: new dynamic route + `usePracticasPendientesPorOS` hook consuming that endpoint. |
| LIQ-02 | Al marcar una práctica como pagada, el FACTURADOR puede ingresar el monto real cobrado por la OS (puede diferir del autorizado) | Requires new `PATCH /finanzas/practicas/:id/monto-pagado` endpoint (backend) + `useActualizarMontoPagado` mutation (frontend). Schema fields `montoPagado`, `corregidoPor`, `corregidoAt` already exist on `PracticaRealizada`. |
| LIQ-03 | El cierre de un lote de liquidación crea `LiquidacionObraSocial` y marca todas las prácticas seleccionadas como PAGADO en una única transacción atómica | Backend `POST /finanzas/liquidaciones/crear-lote` already built and tested in Phase 9. Frontend: `CerrarLoteModal` + `useCerrarLote` mutation. |
</phase_requirements>

---

## Summary

Phase 11 is predominantly frontend work with one small backend addition. The backend settlement infrastructure (atomic lote creation, pending practices per OS endpoint) was completed in Phase 9. The only missing backend piece is `PATCH /finanzas/practicas/:id/monto-pagado` to persist per-row monto corrections with audit fields (`corregidoPor`, `corregidoAt`).

On the frontend, the work involves: (1) converting OS cards on the dashboard to `<Link>` components, (2) creating a new Next.js dynamic route `/dashboard/facturador/liquidar/[obraSocialId]` with an editable table and live total header, and (3) a confirmation modal for closing the lote. All UI primitives (Card, Badge, Dialog, Input, Toast via sonner) are already installed. All TanStack Query patterns are established — three new hooks follow the existing `useFacturadorDashboard.ts` pattern.

The key architectural decision for Claude's discretion is **full list (no pagination)**: a single OS lote is bounded by the professional's monthly billing cycle and is expected to contain tens, not hundreds, of practices. A flat `findMany` is correct — the Phase 9 implementation already does this.

**Primary recommendation:** Implement the PATCH endpoint first (backend, ~10 min), then the dynamic route page with inline editing (frontend Plan 11-01), then the modal (Plan 11-02). No schema migrations needed.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16 (project) | Dynamic route `[obraSocialId]` | Established project pattern for all dashboard routes |
| TanStack Query | v5 (project) | `useQuery` / `useMutation` for data + optimistic state | Established project hook pattern in `frontend/src/hooks/` |
| sonner | project | `toast.error()` on PATCH failure | Already used in `useFacturadorDashboard.ts` |
| shadcn/ui | project | Card, Badge, Dialog, Input, Button | All available; used by existing facturador page |
| NestJS + Prisma | project | New PATCH endpoint + service method | FinanzasModule pattern already established |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/navigation` `useRouter` | Next.js 16 | Redirect after lote close | Used by other dashboard pages |
| `next/link` | Next.js 16 | Convert OS cards to navigable links | Preferred over programmatic navigation for cards |
| class-validator | project | DTO for PATCH body | Same pattern as `SetLimiteMensualDto` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Full list render | Pagination | Single OS lote is bounded by billing period — full list simpler, correct |
| Input on focus only | Always-visible Input | On-focus reduces visual noise when scanning many rows; matches decision |

**Installation:** No new packages required. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure
```
backend/src/modules/finanzas/
├── dto/finanzas.dto.ts         # Add ActualizarMontoPagadoDto
├── finanzas.controller.ts      # Add PATCH /practicas/:id/monto-pagado
└── finanzas.service.ts         # Add actualizarMontoPagado()

frontend/src/
├── app/dashboard/facturador/
│   ├── page.tsx                # MODIFIED: OS cards become <Link>
│   └── liquidar/
│       └── [obraSocialId]/
│           └── page.tsx        # NEW: lote table + header total + Cerrar Lote button
├── hooks/
│   ├── useFacturadorDashboard.ts   # EXISTING (unchanged)
│   ├── usePracticasPendientesPorOS.ts  # NEW
│   ├── useActualizarMontoPagado.ts     # NEW
│   └── useCerrarLote.ts               # NEW
└── components/facturador/
    └── CerrarLoteModal.tsx     # NEW (or inline in page)
```

### Pattern 1: TanStack Query hook for per-OS practices list
**What:** `useQuery` calling the already-built `GET /finanzas/practicas-pendientes/:profesionalId/por-os/:obraSocialId`
**When to use:** On mount of the `[obraSocialId]` page; enabled when both IDs are available

```typescript
// Follows pattern from frontend/src/hooks/useFacturadorDashboard.ts
export function usePracticasPendientesPorOS(
  profesionalId: string | null,
  obraSocialId: string | null
) {
  return useQuery({
    queryKey: ['finanzas', 'practicas-pendientes-por-os', profesionalId, obraSocialId],
    queryFn: async () => {
      const { data } = await api.get(
        `/finanzas/practicas-pendientes/${profesionalId}/por-os/${obraSocialId}`
      );
      return data as PracticaPendientePorOS[];
    },
    enabled: !!profesionalId && !!obraSocialId,
    staleTime: 30_000,
  });
}
```

### Pattern 2: Inline editable cell — save on blur with revert on error
**What:** Controlled input rendered on focus; `onBlur` fires PATCH; on error revert local state + show toast
**When to use:** "Pagado" column cells — silent success, noisy error

```typescript
// Local state mirrors server data; optimistic local update on blur, revert on error
const [localMonto, setLocalMonto] = useState<string>('');

const handleBlur = () => {
  const parsed = parseFloat(localMonto);
  if (isNaN(parsed) || parsed === prevValue) return; // no-op if unchanged or invalid
  mutate(
    { practicaId: practica.id, montoPagado: parsed },
    {
      onError: () => {
        setLocalMonto(String(prevValue ?? '')); // revert
        toast.error('Error al guardar el monto');
      },
    }
  );
};
```

### Pattern 3: Live total derivation from local state
**What:** Header total recomputes from the practices array, substituting local `montoPagado` overrides
**When to use:** The header must reflect edits before they are committed (real-time UX decision)

The approach: maintain a `Map<practicaId, overriddenMonto>` in page-level state. On each blur that succeeds, update the map. Derive total on every render:

```typescript
// derivedTotal used in header + modal
const derivedTotal = (practicas ?? []).reduce((sum, p) => {
  return sum + (overrides.get(p.id) ?? p.montoPagado ?? p.monto);
}, 0);
```

### Pattern 4: Backend PATCH with audit fields
**What:** NestJS PATCH handler updates `montoPagado`, `corregidoPor`, `corregidoAt` atomically
**When to use:** New `PATCH /finanzas/practicas/:id/monto-pagado` endpoint

```typescript
// finanzas.controller.ts — inside FinanzasController
@Patch('practicas/:id/monto-pagado')
@Auth('ADMIN', 'FACTURADOR')
actualizarMontoPagado(
  @Param('id') id: string,
  @Body() dto: ActualizarMontoPagadoDto,
  @Request() req: any,
) {
  return this.service.actualizarMontoPagado(id, dto.montoPagado, req.user?.id);
}

// finanzas.service.ts
async actualizarMontoPagado(
  practicaId: string,
  montoPagado: number,
  usuarioId?: string,
) {
  const practica = await this.prisma.practicaRealizada.findUnique({
    where: { id: practicaId },
  });
  if (!practica) throw new NotFoundException('Práctica no encontrada');

  return this.prisma.practicaRealizada.update({
    where: { id: practicaId },
    data: {
      montoPagado,
      corregidoPor: usuarioId ?? null,
      corregidoAt: new Date(),
    },
  });
}
```

### Pattern 5: CerrarLote mutation + modal
**What:** `useMutation` calling `POST /finanzas/liquidaciones/crear-lote`; on success toast + redirect
**When to use:** User confirms in the modal

```typescript
// useCerrarLote.ts
export function useCerrarLote() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async (dto: CreateLoteDto) => {
      const { data } = await api.post('/finanzas/liquidaciones/crear-lote', dto);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['finanzas', 'practicas-pendientes-agrupadas'],
      });
      toast.success('Lote cerrado correctamente');
      router.push('/dashboard/facturador');
    },
    onError: () => {
      toast.error('Error al cerrar el lote');
    },
  });
}
```

### Anti-Patterns to Avoid
- **Trusting client-provided totals:** The existing `crearLoteLiquidacion` service already recomputes `montoTotal` server-side from DB — never pass the UI total in the POST body as authoritative.
- **N+1 queries in the PATCH handler:** The `update` call is a single query by PK — no batch risk.
- **useRouter in a Server Component:** The `[obraSocialId]` page must be `"use client"` because it uses TanStack Query hooks and local state.
- **Importing `useRouter` from `next/router`:** Next.js App Router requires `next/navigation`, not `next/router`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast component | `toast.error()` / `toast.success()` from sonner | Already in project; consistent with useFacturadorDashboard |
| Modal/Dialog | Custom overlay | shadcn/ui `Dialog` | Already installed; handles focus trap, a11y, backdrop |
| Navigation after mutation | Manual `window.location.href` | `useRouter().push()` from `next/navigation` | Preserves Next.js client-side navigation, doesn't do full reload |
| Currency formatting | Custom function | Duplicate/extract existing `formatMoney()` | Already defined in `facturador/page.tsx` — extract to `@/lib/format.ts` or duplicate locally |

**Key insight:** The OS name can come from the grouped list already cached in TanStack Query (`['finanzas', 'practicas-pendientes-agrupadas', profesionalId]`) — no extra endpoint needed. On the lote page, find the matching entry from the agrupadas cache via `queryClient.getQueryData` or fetch it independently.

---

## Common Pitfalls

### Pitfall 1: OS name not available on the lote page
**What goes wrong:** The `[obraSocialId]` route only has the ID in the URL. The page needs the OS name for the header.
**Why it happens:** The per-OS practices endpoint does not return the OS name.
**How to avoid:** Two options — (a) read from TanStack Query cache (`queryClient.getQueryData(['finanzas', 'practicas-pendientes-agrupadas', profesionalId])`), or (b) pass name as a URL search param (`?nombre=OSDE`). Option (a) is cleaner when the dashboard was visited first; option (b) is resilient to direct URL access. Use option (b) as fallback: pass via `searchParams`, fall back to "Obra Social" if missing.
**Warning signs:** Header shows empty string or crashes when navigating directly to the lote URL.

### Pitfall 2: Live total desync between header and modal
**What goes wrong:** The modal shows a stale total if the header derives total from TanStack Query data that hasn't been refetched yet after PATCH calls.
**Why it happens:** PATCH updates the server, but `useQuery` data stays stale until invalidated or refetched.
**How to avoid:** Maintain a local override map in page state (Pattern 3 above). Do NOT invalidate the query on each PATCH (would trigger a full refetch per keystroke). The local map is the source of truth for the live total during editing.
**Warning signs:** Modal total differs from header total after edits.

### Pitfall 3: Stale agrupadas cache after closing lote
**What goes wrong:** After redirect, the dashboard still shows the just-closed OS card.
**Why it happens:** TanStack Query cache not invalidated.
**How to avoid:** In `useCerrarLote` `onSuccess`, invalidate `['finanzas', 'practicas-pendientes-agrupadas']`. This is already shown in Pattern 5.
**Warning signs:** Closed OS still appears on dashboard after redirect.

### Pitfall 4: Blur fires on initial render (unintended PATCH)
**What goes wrong:** When the input is conditionally mounted, it may fire `onBlur` immediately on certain React render sequences.
**Why it happens:** Controlled input auto-focuses, then loses focus during render transitions.
**How to avoid:** Only fire the PATCH mutation in `onBlur` if the value actually changed: `if (parsed === prevValue) return;`. Initialize `localMonto` to empty string (not the monto), so placeholder is shown and blur without change is a no-op.
**Warning signs:** Unexpected PATCH requests in the network tab on page load.

### Pitfall 5: `periodo` field for `CreateLoteDto`
**What goes wrong:** The DTO requires `periodo` in `YYYY-MM` format. The UI must compute and send it.
**Why it happens:** `LiquidacionObraSocial.periodo` is a required field.
**How to avoid:** Derive from `new Date().toISOString().slice(0, 7)` on the frontend (same pattern as `mesActual` in the dashboard page). Pass it in the `useCerrarLote` mutation call.
**Warning signs:** 400 Bad Request from `POST /finanzas/liquidaciones/crear-lote` due to missing or malformed `periodo`.

---

## Code Examples

### Existing: crearLoteLiquidacion DTO shape (verified from source)
```typescript
// backend/src/modules/finanzas/dto/finanzas.dto.ts
export class CreateLoteDto {
  @IsUUID() profesionalId: string;
  @IsUUID() obraSocialId: string;
  @IsString() @Matches(/^\d{4}-\d{2}$/) periodo: string;
  @IsArray() @IsUUID('4', { each: true }) practicaIds: string[];
}
```

### Existing: getPracticasPendientesPorOS response shape (verified from service)
```typescript
// backend/src/modules/finanzas/finanzas.service.ts
// Returns array of:
{
  id: string;
  codigo: string;
  descripcion: string;
  monto: number;           // autorizado
  coseguro: number;
  montoPagado: number | null;  // null if not yet corrected
  fecha: Date;
  estadoLiquidacion: EstadoLiquidacion;
  paciente: { id: string; nombreCompleto: string; dni: string } | null;
}
```

### New: ActualizarMontoPagadoDto (to add)
```typescript
// backend/src/modules/finanzas/dto/finanzas.dto.ts
export class ActualizarMontoPagadoDto {
  @IsNumber()
  @IsPositive()
  montoPagado: number;
}
```

### Existing: formatMoney (extract or duplicate)
```typescript
// Currently in frontend/src/app/dashboard/facturador/page.tsx — extract to shared util
function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next/router` useRouter | `next/navigation` useRouter | Next.js 13 App Router | Must use `next/navigation` — `next/router` errors in App Router |
| TanStack Query v4 API | v5 API (no `cacheTime`, use `gcTime`) | TQ v5 | Project already uses v5 conventions |

**Deprecated/outdated:**
- `marcarPracticasPagadas` endpoint: Marked `@deprecated` in the service. Do not use from the UI — use `crearLoteLiquidacion` instead.

---

## Open Questions

1. **OS name fallback when navigating directly to lote URL**
   - What we know: The agrupadas cache may not exist if the user lands directly on `/liquidar/[obraSocialId]`
   - What's unclear: Whether to enforce dashboard-first navigation or handle direct URL access
   - Recommendation: Pass `?nombre=...` as a URL search param from the Link on the dashboard card. Read via `useSearchParams()` on the lote page. Renders correctly regardless of cache state.

2. **`practicaIds` for the lote close — all pending or selected?**
   - What we know: CONTEXT.md says "cerrar el lote" closes all practices in the OS, not a subset
   - What's unclear: Whether the facturador should be able to exclude individual practices
   - Recommendation: Send all practice IDs from the current query result (`practicas.map(p => p.id)`) — no row selection needed per the decisions. This is simpler and matches the "close the whole OS lote" model.

---

## Validation Architecture

`workflow.nyquist_validation` key is absent from `.planning/config.json` — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (NestJS default) |
| Config file | `backend/package.json` (jest config inline) |
| Quick run command | `cd backend && npm test -- --testPathPattern=finanzas` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIQ-01 | `GET /finanzas/practicas-pendientes/:profesionalId/por-os/:obraSocialId` returns flat list | unit (service) | `cd backend && npm test -- --testPathPattern=finanzas.service` | ✅ `finanzas.service.spec.ts` |
| LIQ-02 | `PATCH /finanzas/practicas/:id/monto-pagado` updates `montoPagado + corregidoPor + corregidoAt` | unit (service) | `cd backend && npm test -- --testPathPattern=finanzas.service` | ❌ Wave 0 — new test cases needed |
| LIQ-03 | `POST /finanzas/liquidaciones/crear-lote` atomically creates liquidacion + marks PAGADO | unit (service) | `cd backend && npm test -- --testPathPattern=finanzas.service` | ✅ `finanzas.service.spec.ts` (Phase 9) |

### Sampling Rate
- **Per task commit:** `cd backend && npm test -- --testPathPattern=finanzas.service --passWithNoTests`
- **Per wave merge:** `cd backend && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Add `actualizarMontoPagado` test cases to `backend/src/modules/finanzas/finanzas.service.spec.ts` — covers LIQ-02 (normal update, not-found error, audit fields set)

*(LIQ-01 and LIQ-03 are already covered by existing spec from Phase 9.)*

---

## Sources

### Primary (HIGH confidence)
- Direct source read: `backend/src/modules/finanzas/finanzas.controller.ts` — all existing endpoints verified
- Direct source read: `backend/src/modules/finanzas/finanzas.service.ts` — `crearLoteLiquidacion`, `getPracticasPendientesPorOS`, `getPracticasPendientesAgrupadas` implementations verified
- Direct source read: `backend/src/modules/finanzas/dto/finanzas.dto.ts` — `CreateLoteDto` shape verified
- Direct source read: `backend/src/prisma/schema.prisma` — `PracticaRealizada` audit fields (`montoPagado`, `corregidoPor`, `corregidoAt`) confirmed present; `LiquidacionObraSocial` confirmed
- Direct source read: `frontend/src/hooks/useFacturadorDashboard.ts` — hook pattern verified
- Direct source read: `frontend/src/app/dashboard/facturador/page.tsx` — `formatMoney`, existing card layout, component imports verified

### Secondary (MEDIUM confidence)
- Next.js App Router conventions for `useRouter` from `next/navigation` — consistent with Next.js 13+ documentation and project structure

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified present in project
- Architecture: HIGH — patterns directly derived from existing source code
- Pitfalls: HIGH — derived from code inspection + known Next.js App Router constraints
- Backend endpoint design: HIGH — follows established FinanzasController/Service pattern

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable stack, no fast-moving dependencies)
