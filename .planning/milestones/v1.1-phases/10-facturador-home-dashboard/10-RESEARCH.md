# Phase 10: FACTURADOR Home Dashboard - Research

**Researched:** 2026-03-13
**Domain:** Next.js App Router routing + TanStack Query + shadcn/ui — role-specific dashboard page
**Confidence:** HIGH

## Summary

Phase 10 delivers the FACTURADOR's dedicated landing page (`/dashboard/facturador`). The backend already exposes every needed endpoint (Phase 9 complete): `GET /finanzas/practicas-pendientes-agrupadas`, `GET /finanzas/limite-disponible`, and `POST /finanzas/limite-mensual`. The frontend work is purely UI plumbing: a new Next.js page, two TanStack Query hooks, and three UI components.

The routing redirect must happen in `DashboardLayout` (`useEffect` already pattern-established) so that when a FACTURADOR visits `/dashboard` they land on `/dashboard/facturador` instead of the PROFESIONAL CRM page. The new route must also be registered in `permissions.ts` so the existing guard does not bounce the user back.

The FACTURADOR has no `profesionalId` in their JWT (STATE.md decision: "FACTURADOR no tiene registro Profesional — profesionalId siempre parámetro explícito"). Therefore the page must read `selectedProfessionalId` from `useProfessionalContext` store and require the user to have selected a professional before rendering KPIs. The `ProfessionalSelector` already appears in the Sidebar for FACTURADOR.

**Primary recommendation:** Create `/dashboard/facturador/page.tsx` with two dedicated TanStack Query hooks (`usePracticasPendientesAgrupadas`, `useLimiteDisponible`/`useSetLimiteMensual`) and redirect in `DashboardLayout` guarded by `user.rol === 'FACTURADOR'`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | FACTURADOR ve su propia página al entrar (`/dashboard/facturador`) con redirect automático desde el layout | Layout redirect pattern already exists for route-guard; just add role check |
| DASH-02 | Ver cantidad y monto total de prácticas pendientes agrupadas por obra social | `GET /finanzas/practicas-pendientes-agrupadas?profesionalId=X` fully implemented in Phase 9 |
| DASH-03 | Ver progreso del límite mensual: configurado / facturado / disponible | `GET /finanzas/limite-disponible?profesionalId=X&mes=YYYY-MM` fully implemented in Phase 9 |
| DASH-04 | Advertencia cuando un lote a cerrar supera el límite disponible | Client-side: compare lote total vs `disponible`; render warning banner before confirm |
| LMIT-01 | Configurar el límite de facturación del mes actual | `POST /finanzas/limite-mensual` fully implemented; needs UI input + mutation hook |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16 (project) | File-based routing, `page.tsx` | Project standard |
| TanStack Query | Project version | Server state, caching, invalidation | Project standard for all data fetching |
| shadcn/ui + Radix | Project version | Card, Progress, Input, Button, Badge | Project UI library — all components already installed |
| Zustand | Project version | `useProfessionalContext` store for selectedProfessionalId | Project standard for cross-component state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | Project version | Icons (AlertTriangle, TrendingUp, Building2) | Every icon in the project |
| sonner | Project version | Toast notifications on mutation success/error | Already used in all mutations |
| `@/lib/api` (axios) | Project version | HTTP client with JWT interceptor | All API calls go through this |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New dedicated hooks file | Extend `useFinanzas.ts` | `useFinanzas.ts` is already 450+ lines; a new `useFacturadorDashboard.ts` keeps concerns separate and matches the per-feature hook pattern |

**Installation:** No new packages required. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── app/dashboard/facturador/
│   └── page.tsx                        # FACTURADOR landing page (DASH-01..04, LMIT-01)
├── hooks/
│   └── useFacturadorDashboard.ts       # usePracticasPendientesAgrupadas + useLimiteDisponible + useSetLimiteMensual
└── lib/
    └── permissions.ts                  # Add /dashboard/facturador rule
```

### Pattern 1: Role-Based Redirect in DashboardLayout
**What:** Add a `useEffect` that fires after user loads; if `user.rol === 'FACTURADOR'` and pathname is exactly `/dashboard`, call `router.replace('/dashboard/facturador')`.
**When to use:** Immediately after the existing auth/route-guard `useEffect` blocks.
**Example:**
```typescript
// Source: existing layout.tsx pattern
useEffect(() => {
  if (!isLoading && user && pathname === '/dashboard') {
    if (user.rol === 'FACTURADOR') {
      router.replace('/dashboard/facturador');
    }
  }
}, [isLoading, user, pathname, router]);
```

### Pattern 2: permissions.ts Rule for /dashboard/facturador
**What:** Prepend a specific rule before the generic `/dashboard` catch-all.
**When to use:** Must be more specific (longer prefix) than `/dashboard` which covers all roles.
```typescript
// Source: existing permissions.ts prefix-matching pattern
{ prefix: '/dashboard/facturador', roles: ['ADMIN', 'FACTURADOR'] },
```
This rule must appear **before** the existing `{ prefix: '/dashboard', ... }` entry so prefix-matching returns the more-specific rule first.

### Pattern 3: TanStack Query Hook for Agrupadas
**What:** `useQuery` with `profesionalId` as dependency, disabled when profesionalId is null.
**When to use:** DASH-02 data — list of OS groups with count + total.
```typescript
// Source: existing useCRMKanban.ts / useFinanzas.ts pattern
export function usePracticasPendientesAgrupadas(profesionalId: string | null) {
  return useQuery({
    queryKey: ['finanzas', 'practicas-pendientes-agrupadas', profesionalId],
    queryFn: async () => {
      const { data } = await api.get('/finanzas/practicas-pendientes-agrupadas', {
        params: { profesionalId },
      });
      return data as PracticaPendienteAgrupada[];
    },
    enabled: !!profesionalId,
    staleTime: 30_000,
  });
}
```

### Pattern 4: Limit Display + Mutation
**What:** `useQuery` for current limit state; `useMutation` for upsert; invalidates query on success.
**When to use:** DASH-03 progress bar + LMIT-01 input field.
```typescript
// Source: existing useCreatePago / useMarcarPracticasPagadas mutation pattern
export function useSetLimiteMensual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { profesionalId: string; mes: string; limite: number }) => {
      const { data } = await api.post('/finanzas/limite-mensual', dto);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['finanzas', 'limite-disponible', variables.profesionalId, variables.mes],
      });
    },
  });
}
```

### Pattern 5: Progress Bar for Limit (DASH-03)
**What:** shadcn/ui `Progress` component or a custom `div` with width percentage. The `getLimiteDisponible` endpoint returns `{ limite, emitido, disponible }`.
**When to use:** Render as a horizontal bar with three labeled segments.
**Key logic:**
```typescript
const pct = limite > 0 ? Math.min((emitido / limite) * 100, 100) : 0;
const overLimit = disponible !== null && disponible < 0;
```

### Pattern 6: Lote Overflow Warning (DASH-04)
**What:** Client-side — not a backend check. When the FACTURADOR selects practices to settle in Phase 11's modal, compare the selected total against `disponible`. Render an `AlertTriangle` banner if `selectedTotal > disponible`.
**When to use:** Phase 11 will use this pattern; Phase 10 only needs to expose `disponible` clearly on the dashboard so the user knows their headroom.

### Anti-Patterns to Avoid
- **Reading profesionalId from JWT:** FACTURADOR has no `profesionalId` in token. Always use `useProfessionalContext().selectedProfessionalId`. Render a "Seleccioná un profesional" placeholder when it is null.
- **Passing client-computed totals to the backend:** The backend (crearLoteLiquidacion) always computes montoTotal server-side. Never send a total from the client.
- **Using `router.replace('/dashboard')` as the redirect destination for blocked routes:** The existing `hasRouteAccess` guard redirects to `/dashboard`, which would create an infinite loop for FACTURADOR if `/dashboard` itself is left as the FACTURADOR's home. The redirect in DashboardLayout must fire before the access guard.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client | Custom fetch | `api` from `@/lib/api` | JWT interceptor, error handling |
| Progress bar | Custom CSS width calc | shadcn/ui `Progress` or simple `div` with `style={{ width: pct + '%' }}` | Accessible, consistent |
| Toast notifications | Custom alert state | `sonner` toast | Already used everywhere |
| Permissions | Custom role check in page | `hasRouteAccess` + Layout redirect | Centralized, tested pattern |
| Month formatting | Manual string parse | `new Date().toISOString().slice(0, 7)` | Already used in LiquidacionesTab |

**Key insight:** The backend already does everything. Phase 10 is a pure frontend composition task.

## Common Pitfalls

### Pitfall 1: Redirect Loop
**What goes wrong:** FACTURADOR visits `/dashboard` → DashboardLayout redirects to `/dashboard/facturador` → the route-guard `useEffect` sees pathname `/dashboard/facturador` and calls `hasRouteAccess` → if the rule is missing, it falls back to the `/dashboard` rule which allows FACTURADOR → no loop. BUT if the rule was added incorrectly (wrong prefix order), the more-specific `/dashboard/facturador` entry might not match before `/dashboard`.
**Why it happens:** `permissions.ts` uses `Array.find` with `startsWith`. More-specific prefixes must come first.
**How to avoid:** Always insert `/dashboard/facturador` BEFORE `/dashboard` in `ROUTE_PERMISSIONS`.

### Pitfall 2: Null profesionalId Renders Nothing
**What goes wrong:** FACTURADOR opens the page, `selectedProfessionalId` is null (nothing selected yet) → both queries are disabled → page shows blank or skeleton forever.
**Why it happens:** `enabled: !!profesionalId` prevents queries from running.
**How to avoid:** Render a prominent "Seleccioná un profesional en la barra lateral para ver los KPIs" empty state when `profesionalId` is null.

### Pitfall 3: mes Format Mismatch
**What goes wrong:** Sending `mes` as `"2026-3"` instead of `"2026-03"` fails the backend `Matches(/^\d{4}-\d{2}$/)` validator with a 400.
**Why it happens:** `new Date().getMonth() + 1` is not zero-padded.
**How to avoid:** Use `new Date().toISOString().slice(0, 7)` which always produces `"YYYY-MM"`.

### Pitfall 4: Stale Limit After Mutation
**What goes wrong:** User sets limit → `useSetLimiteMensual` succeeds → progress bar still shows old data.
**Why it happens:** TanStack Query caches aggressively.
**How to avoid:** `onSuccess` must invalidate `['finanzas', 'limite-disponible', profesionalId, mes]` exactly. Confirm the queryKey matches what `useLimiteDisponible` uses.

### Pitfall 5: Sidebar Shows /dashboard as Active for FACTURADOR
**What goes wrong:** After redirect to `/dashboard/facturador`, the "Inicio" link (`href="/dashboard"`) may highlight because `pathname.startsWith('/dashboard')`.
**Why it happens:** NavItem uses `pathname === link.href` (exact match), not `startsWith`. So it should NOT highlight. But the Sidebar's "Inicio" link points to `/dashboard`, not `/dashboard/facturador`.
**How to avoid:** Either change "Inicio" href to `/dashboard/facturador` for FACTURADOR role dynamically, or accept that "Inicio" won't highlight (cosmetic only). The simplest approach: conditionally set the Inicio `href` based on `user.rol` in Sidebar.

## Code Examples

Verified patterns from official sources:

### Current Month as YYYY-MM
```typescript
// Source: existing LiquidacionesTab.tsx line 71
const [mesActual] = useState(() => new Date().toISOString().slice(0, 7));
```

### formatMoney helper (reuse existing pattern)
```typescript
// Source: existing LiquidacionesTab.tsx lines 46-53
function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
```

### Backend endpoint signatures (Phase 9 — HIGH confidence)
```
GET  /finanzas/practicas-pendientes-agrupadas?profesionalId=UUID
     → Array<{ obraSocialId: string; nombre: string; count: number; total: number }>

GET  /finanzas/limite-disponible?profesionalId=UUID&mes=YYYY-MM
     → { limite: number | null; emitido: number; disponible: number | null }

POST /finanzas/limite-mensual
     body: { profesionalId: UUID; mes: YYYY-MM; limite: number }
     → LimiteFacturacionMensual record
```

### Page skeleton
```typescript
// frontend/src/app/dashboard/facturador/page.tsx
"use client";

import { useState } from "react";
import { useProfessionalContext } from "@/store/professional-context.store";
import { usePracticasPendientesAgrupadas, useLimiteDisponible, useSetLimiteMensual } from "@/hooks/useFacturadorDashboard";

export default function FacturadorPage() {
  const { selectedProfessionalId } = useProfessionalContext();
  const [mesActual] = useState(() => new Date().toISOString().slice(0, 7));

  const agrupadas = usePracticasPendientesAgrupadas(selectedProfessionalId);
  const limite = useLimiteDisponible(selectedProfessionalId, mesActual);
  const setLimite = useSetLimiteMensual();

  if (!selectedProfessionalId) {
    return <EmptyStateSinProfesional />;
  }

  return (/* KPI cards + progress bar + limit input */);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FACTURADOR redirected to generic `/dashboard` | FACTURADOR gets `/dashboard/facturador` | Phase 10 | Dedicated billing context without CRM noise |
| No billing limit visible | Progress bar: límite / emitido / disponible | Phase 10 | FACTURADOR can self-serve limit config |

**No deprecated patterns in scope.** The routing, query, and permissions patterns used are all current project standards.

## Open Questions

1. **Sidebar "Inicio" link for FACTURADOR**
   - What we know: `allLinks[0].href = "/dashboard"` in Sidebar; FACTURADOR will land on `/dashboard/facturador`
   - What's unclear: Whether to dynamically change the Inicio href in Sidebar based on role, or leave it pointing to `/dashboard` (which redirects)
   - Recommendation: Change Inicio href to `/dashboard/facturador` for FACTURADOR in Sidebar via conditional — simple one-liner, cleaner UX

2. **DASH-04 scope in Phase 10 vs Phase 11**
   - What we know: DASH-04 says "advertencia cuando un lote a cerrar supera el límite disponible" — the lote-closing modal is Phase 11
   - What's unclear: Whether Phase 10 needs any DASH-04 UI at all (the dashboard just shows available headroom)
   - Recommendation: Phase 10 delivers the `disponible` card clearly labeled; the actual warning modal is Phase 11. The planner should note DASH-04 is partially satisfied by the availability display, fully by Phase 11's confirm dialog.

## Validation Architecture

> `workflow.nyquist_validation` is absent from `.planning/config.json` — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (NestJS backend) |
| Config file | `backend/jest.json` or `package.json` jest config |
| Quick run command | `cd backend && npm test -- --testPathPattern finanzas` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Redirect fires when rol=FACTURADOR on /dashboard | manual-only (Next.js layout useEffect, no unit test target) | n/a | n/a |
| DASH-02 | `usePracticasPendientesAgrupadas` calls correct endpoint | manual/integration | n/a | ❌ — hook test out of scope for this phase |
| DASH-03 | `useLimiteDisponible` returns { limite, emitido, disponible } | backend unit (already tested in Phase 9) | `cd backend && npm test -- --testPathPattern finanzas.service` | ✅ |
| DASH-04 | Warning shown when selectedTotal > disponible | manual | n/a | n/a |
| LMIT-01 | `setLimiteMensual` mutation calls POST /finanzas/limite-mensual | backend unit (already tested in Phase 9) | `cd backend && npm test -- --testPathPattern finanzas.service` | ✅ |

### Sampling Rate
- **Per task commit:** `cd backend && npm test -- --testPathPattern finanzas.service --passWithNoTests`
- **Per wave merge:** `cd backend && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/hooks/useFacturadorDashboard.ts` — new hook file (no test needed per project pattern; hooks tested via integration)

*(Backend test infrastructure is complete from Phase 9. No new test files needed for the frontend hook; the project does not currently have frontend unit tests.)*

## Sources

### Primary (HIGH confidence)
- `/backend/src/modules/finanzas/finanzas.controller.ts` — All 7 new endpoints with exact signatures verified
- `/backend/src/modules/finanzas/finanzas.service.ts` — `getLimiteDisponible`, `setLimiteMensual`, `getPracticasPendientesAgrupadas` implementations verified
- `/backend/src/modules/finanzas/dto/finanzas.dto.ts` — `SetLimiteMensualDto` schema verified (`Matches(/^\d{4}-\d{2}$/)`)
- `/frontend/src/app/dashboard/layout.tsx` — Existing redirect pattern verified
- `/frontend/src/lib/permissions.ts` — Prefix-matching logic and ROUTE_PERMISSIONS array verified
- `/frontend/src/hooks/useFinanzas.ts` — Existing hook patterns verified (queryKey structure, enabled guard, mutation invalidation)
- `/frontend/src/store/professional-context.store.ts` — `selectedProfessionalId` Zustand store verified
- `/frontend/src/hooks/useEffectiveProfessionalId.ts` — FACTURADOR returns `selectedProfessionalId` (not from JWT) verified
- `.planning/STATE.md` — Decision: "FACTURADOR no tiene registro Profesional — profesionalId siempre parámetro explícito, nunca del JWT" verified

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — DASH-01..04, LMIT-01 definitions
- `/frontend/src/app/dashboard/finanzas/facturacion/components/LiquidacionesTab.tsx` — `formatMoney`, `mesActual` patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use
- Architecture: HIGH — all backend endpoints verified in source, all frontend patterns verified in existing code
- Pitfalls: HIGH — all identified from direct code inspection (redirect loop, null profesionalId, mes format, cache invalidation)

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable stack, no external dependencies)
