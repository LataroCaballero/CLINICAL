# Architecture Research

**Domain:** Medical SaaS — FACTURADOR dashboard + OS settlement workflow
**Researched:** 2026-03-12
**Confidence:** HIGH (based on direct codebase inspection, no external sources required)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Next.js 16 App Router                        │
├──────────────────────────────┬──────────────────────────────────────┤
│  /dashboard/page.tsx         │  /dashboard/facturador/page.tsx       │
│  (CRM — PROFESIONAL default) │  (NEW — FACTURADOR home)              │
├──────────────────────────────┴──────────────────────────────────────┤
│              /dashboard/finanzas/liquidaciones/page.tsx              │
│              (EXISTING — enhanced for FACTURADOR workflow)           │
├─────────────────────────────────────────────────────────────────────┤
│                    TanStack Query hooks layer                         │
│  useFinanzas.ts (extend)  useFacturadorKpis (NEW in useFinanzas.ts) │
│  useLimiteFacturacion (NEW)  useCrearLiquidacion (NEW)              │
├─────────────────────────────────────────────────────────────────────┤
│                     Axios API client (lib/api.ts)                    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTP/JWT
┌───────────────────────────▼─────────────────────────────────────────┐
│                      NestJS Backend                                   │
├─────────────────────────────────────────────────────────────────────┤
│  FinanzasController (extend)    FinanzasService (extend)             │
│  @Auth('ADMIN','PROFESIONAL','FACTURADOR')                           │
├─────────────────────────────────────────────────────────────────────┤
│                       PrismaService                                   │
├─────────────────────────────────────────────────────────────────────┤
│  PracticaRealizada   LiquidacionObraSocial   LimiteFacturacionMensual│
│  (add montoPagado)   (creation now enforced)  (NEW model)           │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Location |
|-----------|---------------|----------|
| `FacturadorDashboardPage` | KPIs de limite mensual, practicas pendientes por OS, acceso rapido a liquidar | `frontend/.../dashboard/facturador/page.tsx` (NEW) |
| `LimiteFacturacionCard` | Progress bar: facturado vs limite del mes | `frontend/.../dashboard/facturador/components/LimiteFacturacionCard.tsx` (NEW) |
| `PracticasPendientesSummary` | Count + total agrupado por OS, link a liquidaciones | `frontend/.../dashboard/facturador/components/PracticasPendientesSummary.tsx` (NEW) |
| `LiquidacionesPage` | Tabla de practicas + edicion montoPagado inline + cerrar lote por OS | `frontend/.../finanzas/liquidaciones/page.tsx` (MODIFY) |
| `CerrarLoteModal` | Confirmacion + resumen + llama endpoint crear-lote | `frontend/.../finanzas/liquidaciones/components/CerrarLoteModal.tsx` (NEW) |
| `FinanzasService` | crearLiquidacion(), setLimite(), getFacturadorKpis(), actualizarMontoPagado() | `backend/.../finanzas/finanzas.service.ts` (MODIFY) |
| `FinanzasController` | 6 nuevos endpoints — ver tabla API Endpoints | `backend/.../finanzas/finanzas.controller.ts` (MODIFY) |
| `AfipStubService` | Mock emitirComprobante() — CAE fake para investigacion | `backend/.../finanzas/afip-stub.service.ts` (NEW) |

---

## Recommended Project Structure

### Backend additions (all within `backend/src/modules/finanzas/`)

```
backend/src/modules/finanzas/
├── dto/
│   └── finanzas.dto.ts          # ADD: CrearLiquidacionDto, SetLimiteFacturacionDto,
│                                 #       ActualizarMontoPagadoDto
├── afip-stub.service.ts         # NEW: mock AFIP emitir comprobante
├── finanzas.module.ts           # ADD: AfipStubService as provider
├── finanzas.controller.ts       # ADD: 6 new route handlers (see API Endpoints)
└── finanzas.service.ts          # ADD: 4 new methods (see Data Flow)
```

No new NestJS module is needed. `FinanzasModule` already owns all financial domain
logic, is registered in `AppModule`, and already grants access to `FACTURADOR` via
`@Auth('ADMIN', 'PROFESIONAL', 'FACTURADOR')`.

### Database schema additions

```
backend/src/prisma/schema.prisma
  - ADD model LimiteFacturacionMensual (see Pattern 3 below)
  - MODIFY PracticaRealizada: add montoPagado Decimal? @db.Decimal(10,2)
  - ADD relation LimiteFacturacionMensual on Profesional

backend/src/prisma/migrations/
  YYYYMMDDHHMMSS_facturador_v1/   # single migration covers both changes
```

### Frontend additions

```
frontend/src/app/dashboard/
├── facturador/
│   ├── page.tsx                                   # NEW: FACTURADOR home
│   └── components/
│       ├── LimiteFacturacionCard.tsx              # NEW: progress bar uso/limite
│       ├── PracticasPendientesSummary.tsx         # NEW: pending count + total by OS
│       └── AccionesRapidasFacturador.tsx          # NEW: quick links
├── finanzas/
│   └── liquidaciones/
│       ├── page.tsx                               # MODIFY: montoPagado col + cerrar lote
│       └── components/
│           └── CerrarLoteModal.tsx                # NEW: confirm batch close dialog

frontend/src/hooks/
└── useFinanzas.ts   # ADD: useFacturadorKpis, useLimiteFacturacion,
                     #       useSetLimiteFacturacion, useCrearLiquidacion,
                     #       useActualizarMontoPagado

frontend/src/lib/
└── permissions.ts   # ADD: /dashboard/facturador rule (before /dashboard entry)

frontend/src/app/dashboard/layout.tsx
  # ADD: useEffect redirect FACTURADOR from /dashboard to /dashboard/facturador
```

---

## Architectural Patterns

### Pattern 1: Role-specific home via layout redirect

**What:** `/dashboard/page.tsx` serves the CRM dashboard (PROFESIONAL context). Rather
than polluting it with FACTURADOR content, a dedicated `/dashboard/facturador/page.tsx`
is created. The `DashboardLayout` useEffect handles the redirect.

**When to use:** Any role that needs a meaningfully different home from PROFESIONAL.

**Trade-offs:** Two pages to maintain, but clean role separation. The existing
`hasRouteAccess` enforcement handles unauthorized access at any other URL.

**Important:** Add the `/dashboard/facturador` entry to `ROUTE_PERMISSIONS` in
`permissions.ts` BEFORE the existing `/dashboard` catch-all. Prefix-matching order
matters — the more specific prefix must come first.

```typescript
// frontend/src/app/dashboard/layout.tsx — add to existing useEffect block
useEffect(() => {
  if (!isLoading && user?.rol === 'FACTURADOR' && pathname === '/dashboard') {
    router.replace('/dashboard/facturador');
  }
}, [isLoading, user, pathname, router]);
```

### Pattern 2: montoPagado as an optional nullable field on PracticaRealizada

**What:** Add `montoPagado Decimal? @db.Decimal(10,2)` to `PracticaRealizada`. When
null, the OS paid the full authorized `monto`. When set, it records the actual amount
received — enabling discrepancy tracking without breaking existing records.

**When to use:** When the OS pays less (or more) than the authorized code amount.

**Trade-offs:** Null = "not yet corrected" is slightly ambiguous, but is backward
compatible. No data migration required. The FACTURADOR edits this inline before
closing a batch.

```typescript
// FinanzasService — new method
async actualizarMontoPagado(practicaId: string, montoPagado: number) {
  return this.prisma.practicaRealizada.update({
    where: { id: practicaId },
    data: { montoPagado: new Prisma.Decimal(montoPagado) },
  });
}
```

### Pattern 3: LimiteFacturacionMensual as a standalone model with per-month uniqueness

**What:** New model `LimiteFacturacionMensual` scoped to `(profesionalId, mes)` with a
`@@unique` constraint. The month is stored as a string `"YYYY-MM"` for simplicity.

**Why not on Profesional:** The limit changes every month (it comes from the accountant).
Per-row storage allows history, auditing, and detecting whether last month's limit was
exceeded. A mutable field on `Profesional` loses history.

```prisma
model LimiteFacturacionMensual {
  id            String      @id @default(uuid())
  profesionalId String
  mes           String      // "YYYY-MM"
  montoLimite   Decimal     @db.Decimal(10, 2)
  createdAt     DateTime    @default(now())
  profesional   Profesional @relation(fields: [profesionalId], references: [id])

  @@unique([profesionalId, mes])
  @@index([profesionalId, mes])
}
```

### Pattern 4: Atomic batch close via a dedicated endpoint with Prisma transaction

**What:** A single `POST /finanzas/liquidaciones/crear-lote` endpoint wraps in a
Prisma `$transaction`:
1. `liquidacionObraSocial.create()` — creates the settlement record
2. `practicaRealizada.updateMany()` — sets `estadoLiquidacion = PAGADO` and
   `liquidacionId = newLiquidacion.id` for all selected practices

**Why not two separate calls from the frontend:** If `marcarPracticasPagadas` succeeds
but `crearLiquidacion` fails, practices are marked PAGADO with no parent
`LiquidacionObraSocial`. The existing `marcarPracticasPagadas` endpoint has this gap —
this milestone closes it by requiring both operations happen atomically.

```typescript
async crearLiquidacion(dto: CrearLiquidacionDto) {
  return this.prisma.$transaction(async (tx) => {
    const liquidacion = await tx.liquidacionObraSocial.create({
      data: {
        obraSocialId: dto.obraSocialId,
        periodo: dto.periodo,
        montoTotal: dto.montoTotal,
        usuarioId: dto.usuarioId,
      },
    });
    await tx.practicaRealizada.updateMany({
      where: { id: { in: dto.practicaIds } },
      data: {
        estadoLiquidacion: 'PAGADO',
        liquidacionId: liquidacion.id,
      },
    });
    return liquidacion;
  });
}
```

---

## Data Flow

### Request Flow: FACTURADOR closes a settlement batch

```
FACTURADOR filters practices by OS in LiquidacionesPage
    |
FACTURADOR edits montoPagado inline for each practice
    |
PATCH /finanzas/practicas/:id/monto-pagado  (per practice, as edits happen)
    |
FACTURADOR clicks "Cerrar lote" -> CerrarLoteModal opens
    |
CerrarLoteModal.confirm()
    |
useCrearLiquidacion.mutateAsync({ obraSocialId, periodo, practicaIds, montoTotal })
    |
POST /finanzas/liquidaciones/crear-lote  (FinanzasController)
    |
FinanzasService.crearLiquidacion(dto)
    |
prisma.$transaction([
  liquidacionObraSocial.create(),
  practicaRealizada.updateMany(estadoLiquidacion=PAGADO, liquidacionId)
])
    |
Response: { id, obraSocialId, periodo, montoTotal }
    |
queryClient.invalidateQueries(['finanzas','practicas-pendientes'])
queryClient.invalidateQueries(['finanzas','facturador-kpis'])
```

### Request Flow: FACTURADOR sets monthly limit

```
FACTURADOR enters limit amount for current month in LimiteFacturacionCard
    |
useSetLimiteFacturacion.mutateAsync({ profesionalId, mes: '2026-03', montoLimite })
    |
POST /finanzas/limite-facturacion  (FinanzasController)
    |
FinanzasService.setLimiteFacturacion(profesionalId, mes, monto)
    |
prisma.limiteFacturacionMensual.upsert({
  where: { profesionalId_mes: { profesionalId, mes } },
  create: { ... },
  update: { montoLimite }
})
    |
queryClient.invalidateQueries(['finanzas','facturador-kpis'])
    |
LimiteFacturacionCard re-renders with updated progress bar
```

### State Management

All FACTURADOR state follows the existing TanStack Query pattern. No new Zustand store
is needed. Local React state in `LiquidacionesPage` manages the checkbox selection and
the per-practice montoPagado draft edits before confirmation.

```
TanStack Query cache
    | (useFacturadorKpis, useLimiteFacturacion)
FacturadorDashboardPage

    | (local useState)
LiquidacionesPage: selectedPracticaIds, draftMontoPagado map
    |
useCrearLiquidacion.mutate() -> POST -> server
    |
onSuccess -> invalidateQueries -> refetch -> UI update
```

### Key Data Flows

1. **Facturador KPIs:** `GET /finanzas/facturador/kpis?profesionalId=&mes=` returns
   `{ limiteActual, facturadoMes, porcentajeUsado, practicasPendienteCount,
   practicasPendienteTotal, liquidacionesRecientes[] }`. Computed server-side by joining
   `LimiteFacturacionMensual + PracticaRealizada + LiquidacionObraSocial`.

2. **montoPagado editing:** Each PATCH fires immediately on blur. TanStack Query
   invalidates `['finanzas','practicas-pendientes']` so the table re-renders with the
   saved value. The FACTURADOR sees their edits persist across page refresh.

3. **Multi-tenant scoping:** `FACTURADOR` has no `Profesional` record. All new endpoints
   receive `profesionalId` as an explicit query or body parameter, consistent with the
   existing `FinanzasController` pattern (e.g., `getDashboard(@Query profesionalId?)`).
   The FACTURADOR selects the professional context from the existing `RoleSelector`
   component already present in the dashboard.

---

## API Endpoints

### New endpoints (all added to FinanzasController)

| Method | Path | Roles | Purpose |
|--------|------|-------|---------|
| `GET` | `/finanzas/facturador/kpis` | ADMIN, FACTURADOR | KPIs: limite, facturado, pendientes |
| `POST` | `/finanzas/limite-facturacion` | ADMIN, FACTURADOR | Upsert limite mensual |
| `GET` | `/finanzas/limite-facturacion` | ADMIN, FACTURADOR | Get limite del mes |
| `POST` | `/finanzas/liquidaciones/crear-lote` | ADMIN, FACTURADOR | Atomic batch close |
| `PATCH` | `/finanzas/practicas/:id/monto-pagado` | ADMIN, FACTURADOR | Update montoPagado |
| `GET` | `/finanzas/liquidaciones` | ADMIN, FACTURADOR, PROFESIONAL | List LiquidacionObraSocial history |
| `POST` | `/finanzas/facturas/:id/emitir-afip` | ADMIN, FACTURADOR | AFIP stub endpoint |

### Modified endpoints

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/finanzas/practicas-pendientes` | Response shape adds `montoPagado` field |
| `GET` | `/finanzas/dashboard` | No change — FACTURADOR uses `/facturador/kpis` |

---

## New DTOs (backend/src/modules/finanzas/dto/finanzas.dto.ts — additions)

```typescript
export class CrearLiquidacionDto {
  @IsUUID()           obraSocialId: string;
  @IsString()         periodo: string;       // "YYYY-MM"
  @IsNumber()         montoTotal: number;
  @IsOptional()
  @IsUUID()           usuarioId?: string;    // set from req.user.id in controller
  @IsArray()
  @IsUUID('4', { each: true }) practicaIds: string[];
}

export class SetLimiteFacturacionDto {
  @IsUUID()           profesionalId: string;
  @IsString()         mes: string;           // "YYYY-MM"
  @IsNumber()
  @IsPositive()       montoLimite: number;
}

export class ActualizarMontoPagadoDto {
  @IsNumber()
  @IsPositive()       montoPagado: number;
}
```

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `FinanzasModule` <-> `PrismaService` | Direct Prisma client | No change to existing pattern |
| `FinanzasController` <-> `JwtRolesGuard` | `@Auth('FACTURADOR','ADMIN')` | Already established pattern |
| `LiquidacionObraSocial` <-> `PracticaRealizada` | FK `liquidacionId` on `PracticaRealizada` | FK exists in schema but was never populated by a dedicated endpoint; this milestone closes that gap |
| Frontend `permissions.ts` <-> `DashboardLayout` | `hasRouteAccess('/dashboard/facturador', rol)` | Must add rule BEFORE the `/dashboard` catch-all (prefix-matching order) |
| `LimiteFacturacionMensual` <-> `Profesional` | FK `profesionalId` on `LimiteFacturacionMensual` | `FACTURADOR` Usuario has no `Profesional` record; `profesionalId` must be passed explicitly in requests |
| `AfipStubService` <-> `FinanzasService` | Direct injection via module provider | Stub only; no real AFIP connection until future milestone |

### AFIP Stub Integration Point

The AFIP research deliverable should be scoped as a service stub + research document.
Placement:

```
backend/src/modules/finanzas/afip-stub.service.ts
```

The stub exposes `emitirComprobante(facturaId: string)` that returns a mock CAE
structure `{ cae: 'MOCK-CAE-...', vencimientoCae: '...' }` and logs the call.
The `FinanzasController` endpoint `POST /finanzas/facturas/:id/emitir-afip` calls it
and returns the mock response. This pins down the interface shape for when real AFIP
integration lands.

---

## Suggested Build Order

This ordering respects hard dependencies: DB schema must exist before service methods,
service methods before controllers, controllers before frontend hooks, hooks before
UI components.

### Step 1: Database migration (prerequisite for all subsequent steps)

- Add `LimiteFacturacionMensual` model to `schema.prisma`
- Add `montoPagado Decimal?` field to `PracticaRealizada`
- Add `limitesFacturacion LimiteFacturacionMensual[]` relation on `Profesional`
- Run `npx prisma migrate dev --name facturador_v1` from `backend/`
- Run `npx prisma generate`

### Step 2: Backend DTOs and service methods

- Add `CrearLiquidacionDto`, `SetLimiteFacturacionDto`, `ActualizarMontoPagadoDto`
  to `finanzas.dto.ts`
- Add to `FinanzasService`: `crearLiquidacion()`, `setLimiteFacturacion()`,
  `getLimiteFacturacion()`, `getFacturadorKpis()`, `actualizarMontoPagado()`
- All within `FinanzasService` — no new service class needed

### Step 3: Backend new controller endpoints

- Add 7 route handlers to `FinanzasController`
- Set `@Auth('ADMIN', 'FACTURADOR')` (or include `PROFESIONAL` where appropriate)
- Wire `@Request() req` to extract `usuarioId` for `crearLiquidacion`

### Step 4: Backend AFIP stub (can run parallel with Step 3)

- Create `afip-stub.service.ts` with mock `emitirComprobante()` returning fake CAE
- Register in `FinanzasModule` providers
- Add `POST /finanzas/facturas/:id/emitir-afip` to controller

### Step 5: Frontend permissions and routing

- Add `/dashboard/facturador` rule to `permissions.ts` BEFORE the `/dashboard` entry
- Add redirect effect in `DashboardLayout` for FACTURADOR landing on `/dashboard`
- Create `frontend/src/app/dashboard/facturador/page.tsx` with minimal placeholder

### Step 6: Frontend new TanStack Query hooks (add to useFinanzas.ts)

- `useFacturadorKpis(profesionalId, mes)` — GET kpis
- `useLimiteFacturacion(profesionalId, mes)` — GET limite
- `useSetLimiteFacturacion()` — POST/upsert limite
- `useCrearLiquidacion()` — POST crear-lote (invalidates practicas-pendientes + kpis)
- `useActualizarMontoPagado()` — PATCH monto-pagado

### Step 7: Frontend enhanced LiquidacionesPage

- Add `montoPagado` column (inline number input, saves on blur via `useActualizarMontoPagado`)
- Add OS selector filter to restrict the batch to one obra social at a time
- Add "Cerrar lote" button (enabled when >= 1 PENDIENTE practice of same OS selected)
- Build `CerrarLoteModal` using existing `Dialog` + `Button` from shadcn/ui

### Step 8: Frontend Facturador home dashboard

- Build `FacturadorDashboardPage` with three components: `LimiteFacturacionCard`,
  `PracticasPendientesSummary`, quick links to `/dashboard/finanzas/liquidaciones`
- Wire `useFacturadorKpis` and `useLimiteFacturacion`

---

## Multi-tenant Considerations

1. **FACTURADOR has no Profesional record.** The `useEffectiveProfessionalId()` hook
   returns `null` for FACTURADOR. Do not use this hook in FACTURADOR-specific pages.
   The existing `RoleSelector` component in the dashboard lets ADMIN/FACTURADOR pick
   a professional context. Read `profesionalId` from there (Zustand store or query
   param) and pass it explicitly to hooks.

2. **All new backend endpoints follow the existing pattern** of accepting `profesionalId`
   as an optional query param (not derived from JWT), consistent with the existing
   `FinanzasController.getDashboard` approach.

3. **LimiteFacturacionMensual scopes per profesionalId.** One FACTURADOR user can
   manage limits for multiple professionals in the same clinic. Correct multi-professional
   model.

4. **Authorization gap in v1.1 (acceptable):** There is no DB-level assignment of
   FACTURADOR to a specific professional. Any FACTURADOR can read/write limits for
   any professional by passing their `profesionalId`. For a single-clinic deployment
   this is fine. Future milestone: add `FacturadorProfesional` assignment table.

---

## Anti-Patterns

### Anti-Pattern 1: Creating a new NestJS module for FACTURADOR

**What people do:** Create `backend/src/modules/facturador/` as a new module with its
own service and controller.

**Why it's wrong:** All new entities (`LimiteFacturacionMensual`, liquidation batch
close, montoPagado) operate entirely on the financial domain. Splitting creates
cross-module service dependencies and adds boilerplate. The existing `FinanzasModule`
already has `@Auth('FACTURADOR')` on its controller.

**Do this instead:** Add methods to `FinanzasService`. Group new endpoints in the
controller with a `// ── FACTURADOR ──` comment block.

### Anti-Pattern 2: Closing a batch as two separate frontend API calls

**What people do:** Call `marcarPracticasPagadas` first, then `crearLiquidacion`
separately.

**Why it's wrong:** If the first succeeds and the second fails (network error, server
restart), practices are PAGADO with no parent `LiquidacionObraSocial`. Data is
inconsistent and difficult to recover.

**Do this instead:** Single `POST /finanzas/liquidaciones/crear-lote` wrapping both
operations in a Prisma `$transaction`. Either both succeed or both roll back.

### Anti-Pattern 3: Treating montoPagado != null as equivalent to estadoLiquidacion == PAGADO

**What people do:** Check `montoPagado !== null` as the authoritative "paid" flag.

**Why it's wrong:** The FACTURADOR may set a draft `montoPagado` before closing the
batch. `estadoLiquidacion` is the single authoritative state field; `liquidacionId`
presence is the secondary confirmation.

**Do this instead:** Keep `estadoLiquidacion` as state driver. `montoPagado` is a
financial correction field only. UI should reflect `estadoLiquidacion`.

### Anti-Pattern 4: Redirecting FACTURADOR with a separate Next.js middleware file

**What people do:** Create `middleware.ts` at `frontend/src/` to redirect FACTURADOR.

**Why it's wrong:** The existing `DashboardLayout` already runs `useCurrentUser` and
the `hasRouteAccess` redirect. Adding a second redirect mechanism causes race
conditions and double redirects (client-side vs server-side).

**Do this instead:** Single `useEffect` in `DashboardLayout` checking
`user.rol === 'FACTURADOR' && pathname === '/dashboard'` then `router.replace(...)`.

### Anti-Pattern 5: Fixing the N+1 query in getPracticasPendientes outside this milestone

**What people do:** Refactor `getPracticasPendientes` to eliminate `Promise.all` for
patient lookups in the same PR.

**Why it's wrong (timing risk):** The N+1 fix requires changing the Prisma query
structure, which could break other callers of the endpoint. It is a separate concern.

**Do this instead:** Create a separate task for the N+1 fix. For v1.1, the FACTURADOR
view can tolerate the existing performance as clinic volumes are low. Track it as
known technical debt.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-50 clinics | Current monolith is fine. All within FinanzasModule. |
| 50-500 clinics | Add DB index on `LimiteFacturacionMensual(profesionalId, mes)` (already included in model above). Fix the N+1 `getPracticasPendientes` query with a single join. Add `staleTime: 30_000` to `useFacturadorKpis` to avoid refetch on every tab focus. |
| 500+ clinics | Financial module extract to separate service only if FACTURADOR query traffic dominates. Not relevant at current scale. |

### Scaling Priorities

1. **First bottleneck:** `getPracticasPendientes` uses `Promise.all(N patient lookups)` —
   an N+1 pattern. For a FACTURADOR seeing hundreds of practices, this will be slow.
   Fix: convert to single `findMany` with `include: { paciente: { include: { obraSocial } } }`.
   The FK relation exists on the Prisma schema; the current service just does not use it.

2. **Second bottleneck:** `getFacturadorKpis` runs three aggregate queries on every load.
   Use TanStack Query `staleTime: 30_000` on the frontend to avoid redundant fetches.

---

## Sources

- `backend/src/modules/finanzas/finanzas.service.ts` — direct inspection (HIGH confidence)
- `backend/src/modules/finanzas/finanzas.controller.ts` — direct inspection (HIGH confidence)
- `backend/src/prisma/schema.prisma` — direct inspection (HIGH confidence)
- `frontend/src/lib/permissions.ts` — direct inspection (HIGH confidence)
- `frontend/src/app/dashboard/layout.tsx` — direct inspection (HIGH confidence)
- `frontend/src/hooks/useFinanzas.ts` — direct inspection (HIGH confidence)
- `frontend/src/app/dashboard/finanzas/liquidaciones/page.tsx` — direct inspection (HIGH confidence)
- `frontend/src/app/dashboard/page.tsx` — direct inspection (HIGH confidence)
- `.planning/PROJECT.md` — direct inspection (HIGH confidence)

---

*Architecture research for: CLINICAL SaaS v1.1 — Vista del Facturador*
*Researched: 2026-03-12*
