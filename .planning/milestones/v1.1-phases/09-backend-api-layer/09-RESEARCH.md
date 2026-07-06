# Phase 9: Backend API Layer - Research

**Researched:** 2026-03-13
**Domain:** NestJS FinanzasModule extension — service methods, controller endpoints, DTOs, Prisma $transaction, timezone utility, AfipStubService
**Confidence:** HIGH (all findings based on direct code inspection + project-internal patterns)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LMIT-02 | El sistema calcula automáticamente el disponible: límite − suma de comprobantes emitidos en el período | `getMonthBoundariesART()` utility + `getLimiteDisponible()` service method using `LimiteFacturacionMensual` + `Factura` aggregation |
| LIQ-03 | El cierre de un lote de liquidación crea `LiquidacionObraSocial` y marca todas las prácticas seleccionadas como PAGADO en una única transacción atómica | `prisma.$transaction([])` pattern; `LiquidacionObraSocial` and `PracticaRealizada` models fully available in Prisma client |
| AFIP-02 | El backend expone un `AfipStubService` con la interfaz `emitirComprobante()` y respuesta mock (fija el contrato para v1.2) | Interfaces defined in `AFIP-INTEGRATION.md` Section 3; stub registered in `FinanzasModule.providers` |
</phase_requirements>

---

## Summary

Phase 9 extends `FinanzasModule` exclusively — no new NestJS module is created. The three plans add five new service methods, seven new controller endpoints, and one new `AfipStubService` injected into the existing module. All schema prerequisites landed in Phase 8: `LimiteFacturacionMensual`, `PracticaRealizada.montoPagado`, and the full Prisma client regeneration are confirmed complete.

The two hardest correctness requirements are (a) the timezone-correct month boundaries for the LMIT-02 calculation and (b) the atomic `$transaction` for LIQ-03. Argentina (UTC−3, no DST) means March 2026-03-01 in local time starts at `2026-03-01T03:00:00Z` — a naive `new Date(year, month-1, 1)` in a UTC server creates midnight UTC, which incorrectly includes the last hour of February local time. A pure-TS implementation using fixed offset (-180 minutes) is correct and requires no external timezone library.

The `AfipStubService` is the simplest of the three plans: it implements the `AfipService` interface from `AFIP-INTEGRATION.md`, returns a plausible hard-coded `EmitirComprobanteResult`, and is listed as a `provider` in `FinanzasModule` so it can be swapped for the real service in v1.2 without touching the controller.

**Primary recommendation:** Implement in plan order 09-01 → 09-02 → 09-03. `getMonthBoundariesART()` must live in a shared utility file imported by the service, not inlined, so the planner's verification step can unit-test it in isolation.

---

## Standard Stack

### Core (all already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/common` | current | Decorators, DI | Established in all modules |
| `@prisma/client` | current | DB access + `$transaction` | Schema regenerated in Phase 8 |
| `class-validator` | current | DTO decorators | Pattern in `finanzas.dto.ts` |
| `class-transformer` | current | Paired with class-validator | Project standard |

### No new packages required

The timezone calculation uses a pure-TypeScript offset approach (UTC−3, fixed). No `luxon`, `date-fns-tz`, or `@js-joda/timezone` is needed. The project currently has no timezone library installed; introducing one for a single utility is over-engineered.

**Installation:**
```bash
# Nothing to install — all dependencies already present
```

---

## Architecture Patterns

### Recommended File Structure for Phase 9

```
backend/src/modules/finanzas/
├── afip/
│   ├── afip.interfaces.ts        # EmitirComprobanteParams + EmitirComprobanteResult + AfipService
│   └── afip-stub.service.ts      # AfipStubService implements AfipService
├── dto/
│   └── finanzas.dto.ts           # ADD: CreateLoteDto, LimiteDisponibleDto (existing file)
├── utils/
│   └── month-boundaries.ts       # getMonthBoundariesART() — pure function, testable
├── finanzas.controller.ts        # ADD: 7 new endpoints
├── finanzas.module.ts            # ADD: AfipStubService to providers
└── finanzas.service.ts           # ADD: 5 new methods
```

### Pattern 1: getMonthBoundariesART() — Fixed-Offset Timezone

**What:** Returns `{ start: Date, end: Date }` for a given `YYYY-MM` string using UTC−3 (Argentina, no DST).
**When to use:** Every query involving `Factura.fecha` or `PracticaRealizada.fecha` scoped to a billing month.

```typescript
// File: backend/src/modules/finanzas/utils/month-boundaries.ts
// Confidence: HIGH — derived from requirement spec + timezone arithmetic

export interface MonthBoundaries {
  start: Date; // First millisecond of month in ART
  end: Date;   // Last millisecond of month in ART
}

/**
 * Returns UTC Date objects representing the boundaries of a calendar month
 * in America/Argentina/Buenos_Aires (UTC-3, no DST).
 *
 * Verification: mes='2026-03', returns
 *   start = 2026-03-01T03:00:00.000Z  (= 2026-03-01T00:00:00 ART)
 *   end   = 2026-04-01T02:59:59.999Z  (= 2026-03-31T23:59:59.999 ART)
 *
 * Edge case from success criteria: a practice at 2026-03-01T02:30:00Z
 * equals 2026-02-28T23:30:00 ART — it falls in FEBRUARY, NOT March.
 * getMonthBoundariesART('2026-03').start = 2026-03-01T03:00:00Z, so
 * the practice IS correctly excluded from March's calculation.
 */
export function getMonthBoundariesART(mes: string): MonthBoundaries {
  const [year, month] = mes.split('-').map(Number);
  const ART_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC-3, 180 minutes, no DST

  // Start: midnight ART on the 1st = UTC 03:00 on the 1st
  const startUTC = Date.UTC(year, month - 1, 1) + ART_OFFSET_MS;

  // End: midnight ART on the 1st of next month - 1ms
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endUTC = Date.UTC(nextYear, nextMonth - 1, 1) + ART_OFFSET_MS - 1;

  return { start: new Date(startUTC), end: new Date(endUTC) };
}
```

### Pattern 2: Prisma $transaction — Atomic Lote Creation (LIQ-03)

**What:** Creates `LiquidacionObraSocial` and updates all selected `PracticaRealizada` rows to `PAGADO` in a single DB transaction.
**When to use:** `POST /finanzas/liquidaciones/crear-lote`.

```typescript
// Confidence: HIGH — Prisma $transaction is stable API, confirmed in project
async crearLoteLiquidacion(dto: CreateLoteDto, usuarioId?: string) {
  return this.prisma.$transaction([
    this.prisma.liquidacionObraSocial.create({
      data: {
        obraSocialId: dto.obraSocialId,
        periodo: dto.periodo,         // 'YYYY-MM'
        montoTotal: dto.montoTotal,
        usuarioId: usuarioId ?? null,
        practicas: {
          connect: dto.practicaIds.map((id) => ({ id })),
        },
      },
    }),
    this.prisma.practicaRealizada.updateMany({
      where: { id: { in: dto.practicaIds } },
      data: { estadoLiquidacion: 'PAGADO' },
    }),
  ]);
}
```

**Key constraint:** `$transaction([])` (array form) is used because both operations are independent writes. The interactive callback form (`$transaction(async (tx) => {...})`) is only needed when the second write depends on the first write's return value. Here it does not — `connect` uses the IDs from the DTO, not the newly created liquidacion's ID.

Wait — there IS a dependency: `PracticaRealizada.liquidacionId` must be set to the new liquidacion's `id`. The array form cannot reference the first result. Therefore the **interactive callback form is required**:

```typescript
async crearLoteLiquidacion(dto: CreateLoteDto, usuarioId?: string) {
  return this.prisma.$transaction(async (tx) => {
    const liquidacion = await tx.liquidacionObraSocial.create({
      data: {
        obraSocialId: dto.obraSocialId,
        periodo: dto.periodo,
        montoTotal: dto.montoTotal,
        usuarioId: usuarioId ?? null,
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

### Pattern 3: AfipStubService — Injectable Stub

**What:** Implements the `AfipService` interface with hard-coded mock data. Registered in `FinanzasModule` so it can be replaced by a real implementation in v1.2 without touching the controller.
**File location:** `backend/src/modules/finanzas/afip/afip-stub.service.ts`

```typescript
// Confidence: HIGH — interfaces specified in AFIP-INTEGRATION.md Section 3
import { Injectable } from '@nestjs/common';
import {
  AfipService,
  EmitirComprobanteParams,
  EmitirComprobanteResult,
} from './afip.interfaces';

@Injectable()
export class AfipStubService implements AfipService {
  async emitirComprobante(
    params: EmitirComprobanteParams,
  ): Promise<EmitirComprobanteResult> {
    return {
      cae: '74397704790943',          // 14-digit plausible CAE
      caeFchVto: '20260323',          // 10 days from a fixed date
      cbtDesde: params.cbteDesde,
      cbtHasta: params.cbteHasta,
      resultado: 'A',
    };
  }

  async verificarServicio(): Promise<boolean> {
    return true;
  }
}
```

### Pattern 4: FinanzasModule Registration

```typescript
// Confidence: HIGH — module pattern established in codebase
import { AfipStubService } from './afip/afip-stub.service';

@Module({
  imports: [CuentasCorrientesModule],
  controllers: [FinanzasController],
  providers: [FinanzasService, PrismaService, AfipStubService],
  exports: [FinanzasService, AfipStubService],
})
export class FinanzasModule {}
```

### Pattern 5: Controller Endpoint Signature (profesionalId as explicit param)

All new endpoints accept `profesionalId` as an explicit query/body parameter. This is a locked decision: FACTURADOR role has no associated `Profesional` record, so `req.user.profesionalId` does not exist for them.

```typescript
// Confidence: HIGH — locked decision from STATE.md [Roadmap v1.1]
@Get('limite-disponible')
@Auth('ADMIN', 'FACTURADOR')
getLimiteDisponible(
  @Query('profesionalId') profesionalId: string,
  @Query('mes') mes: string,
) {
  return this.service.getLimiteDisponible(profesionalId, mes);
}
```

The controller-level `@Auth('ADMIN', 'PROFESIONAL', 'FACTURADOR')` on the existing class is not changed. New endpoints use method-level `@Auth` to narrow to `'ADMIN', 'FACTURADOR'` only. NestJS applies the most specific guard — method-level `@Auth` overrides class-level for that route.

**Caution:** Verify that the existing `JwtRolesGuard` implementation supports method-level override. Check `backend/src/modules/auth/guards/jwt-roles.guard.ts` before assuming this. If it does not support override, new endpoints must be moved to a separate controller class.

### Anti-Patterns to Avoid

- **Don't derive profesionalId from JWT** — The `req.user` object for a FACTURADOR has no `profesionalId` field. Always read it from query params or body.
- **Don't use `new Date(year, month-1, 1)` for ART boundaries** — This creates midnight UTC, which is 9 PM ART the previous day. Use `getMonthBoundariesART()`.
- **Don't use `updateMany` alone for lote creation** — The `liquidacionId` FK on `PracticaRealizada` must be set; `updateMany` in the array-form transaction cannot reference the newly created liquidacion ID. Use the interactive callback form.
- **Don't inline the stub's CAE value as a magic string** — Use a clearly named constant so the mock nature is obvious.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic multi-table write | Manual try/catch + rollback | `prisma.$transaction(async tx => {...})` | Prisma handles rollback automatically on thrown exception |
| Timezone offset calculation | Complex DST lookup | Fixed UTC-3 offset (ART has no DST) | Argentina abolished DST in 2008; fixed offset is correct and simpler |
| DTO validation | Manual `if` checks | `class-validator` + `ValidationPipe` (already global) | ValidationPipe is globally registered in `main.ts` (project standard) |

**Key insight:** The project already has a global `ValidationPipe`. Any class decorated with `class-validator` decorators is automatically validated on every controller endpoint. No extra setup needed for new DTOs.

---

## Common Pitfalls

### Pitfall 1: Timezone — "March 1 at 02:30 UTC is still February"
**What goes wrong:** A practice at `2026-03-01T02:30:00Z` (= 2026-02-28T23:30 ART) is incorrectly counted in March's emitted total.
**Why it happens:** Using `new Date(2026, 2, 1)` (JS Date constructor) creates midnight UTC = 21:00 ART Feb 28. The month boundaries in UTC include that hour as March.
**How to avoid:** Always use `getMonthBoundariesART('2026-03')`. Its `start` is `2026-03-01T03:00:00Z`, which correctly excludes `02:30Z`.
**Warning signs:** Unit test for boundary practice fails or emitido total is 1 peso too high.

### Pitfall 2: $transaction Array Form — Cannot Reference First Result
**What goes wrong:** Using `prisma.$transaction([create(...), updateMany(...)])` — the `updateMany` cannot use the new liquidacion's `id` to set `liquidacionId` on practices.
**Why it happens:** Array form runs operations in parallel; results are not available to subsequent operations.
**How to avoid:** Use the interactive callback form `prisma.$transaction(async (tx) => { ... })`.
**Warning signs:** `PracticaRealizada.liquidacionId` is null after lote creation.

### Pitfall 3: Method-Level @Auth Override Not Working
**What goes wrong:** FACTURADOR can access all existing `FinanzasController` endpoints (guarded with class-level `@Auth('ADMIN', 'PROFESIONAL', 'FACTURADOR')`), but new endpoints intended for `ADMIN, FACTURADOR` only accidentally allow PROFESIONAL as well.
**Why it happens:** If `JwtRolesGuard` reads roles from the class-level metadata instead of the method-level, the method-level `@Auth` override has no effect.
**How to avoid:** Before adding method-level `@Auth`, read `jwt-roles.guard.ts` to confirm it uses `Reflector.getAllAndOverride` (which prioritizes method-level). If not, isolate new endpoints in a separate controller.
**Warning signs:** A PROFESIONAL user can call `GET /finanzas/limite-disponible` without error.

### Pitfall 4: N+1 Query in getPracticasPendientes
**What goes wrong:** Existing `getPracticasPendientes` executes one extra `prisma.paciente.findUnique` per practice row (documented in STATE.md as a known concern).
**Why it happens:** `PracticaRealizada` has no direct Prisma relation to `Paciente` (the relation goes through `profesionalId`, not `pacienteId`). Current code fetches patients in a `Promise.all` loop.
**How to avoid:** New service methods that need patient data should add `pacienteId` to the `PracticaRealizada` select and use a single `prisma.paciente.findMany({ where: { id: { in: pacienteIds } } })` pattern (already used in `getCierreMensual`). Do NOT extend the N+1 pattern to new methods.
**Warning signs:** Response time degrades linearly with the number of practices in a lote.

### Pitfall 5: Missing `@IsUUID` on profesionalId in new DTOs
**What goes wrong:** Accepting any string as `profesionalId` without UUID validation allows malformed IDs to reach Prisma, which throws a DB error rather than a clean 400.
**Why it happens:** Forgetting to mirror the existing DTO pattern.
**How to avoid:** All new DTOs that accept `profesionalId` must include `@IsUUID()` decorator (see existing `CreateFacturaDto` as reference).

---

## Code Examples

### getLimiteDisponible — Full Service Method

```typescript
// Confidence: HIGH — based on schema inspection + pattern from getFacturas
async getLimiteDisponible(
  profesionalId: string,
  mes: string, // 'YYYY-MM'
): Promise<{ limite: number | null; emitido: number; disponible: number | null }> {
  const { start, end } = getMonthBoundariesART(mes);

  const [limiteRecord, emitidoAgg] = await Promise.all([
    this.prisma.limiteFacturacionMensual.findUnique({
      where: { profesionalId_mes: { profesionalId, mes } },
    }),
    this.prisma.factura.aggregate({
      where: {
        profesionalId,
        fecha: { gte: start, lte: end },
        estado: { not: 'ANULADA' },
      },
      _sum: { total: true },
    }),
  ]);

  const limite = limiteRecord?.limite ? Number(limiteRecord.limite) : null;
  const emitido = Number(emitidoAgg._sum.total ?? 0);
  const disponible = limite !== null ? limite - emitido : null;

  return { limite, emitido, disponible };
}
```

### CreateLoteDto

```typescript
// Confidence: HIGH — mirrors existing DTO patterns in finanzas.dto.ts
export class CreateLoteDto {
  @IsUUID()
  profesionalId: string;

  @IsUUID()
  obraSocialId: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'periodo must be YYYY-MM' })
  periodo: string;

  @IsNumber()
  @IsPositive()
  montoTotal: number;

  @IsArray()
  @IsUUID('4', { each: true })
  practicaIds: string[];
}
```

### getPracticasPendientesAgrupadas — Group by OS (avoids N+1)

```typescript
// Confidence: HIGH — pattern from getCierreMensual
async getPracticasPendientesAgrupadas(profesionalId: string) {
  const practicas = await this.prisma.practicaRealizada.findMany({
    where: { profesionalId, estadoLiquidacion: 'PENDIENTE' },
    select: { id: true, monto: true, pacienteId: true },
  });

  const pacienteIds = [...new Set(practicas.map((p) => p.pacienteId))];
  const pacientes = await this.prisma.paciente.findMany({
    where: { id: { in: pacienteIds } },
    include: { obraSocial: { select: { id: true, nombre: true } } },
  });
  const pacienteMap = new Map(pacientes.map((p) => [p.id, p]));

  // Group by obraSocialId
  const grupos: Record<string, { obraSocialId: string | null; nombre: string; count: number; total: number }> = {};
  for (const p of practicas) {
    const os = pacienteMap.get(p.pacienteId)?.obraSocial;
    const key = os?.id ?? 'particular';
    if (!grupos[key]) {
      grupos[key] = { obraSocialId: os?.id ?? null, nombre: os?.nombre ?? 'Particular', count: 0, total: 0 };
    }
    grupos[key].count += 1;
    grupos[key].total += Number(p.monto);
  }
  return Object.values(grupos);
}
```

---

## Existing Code Inventory (What Phase 9 Extends)

### FinanzasService — Existing Methods (do not break)

| Method | Status | Notes |
|--------|--------|-------|
| `getDashboard` | Keep | Uses naive `new Date()` month start — acceptable for dashboard, not for billing |
| `getPracticasPendientes` | Keep | Has N+1 problem (documented); new methods must NOT copy this pattern |
| `marcarPracticasPagadas` | Keep but DEPRECATE path | Non-atomic; new `crearLoteLiquidacion` supersedes it for lote workflow |
| `getFacturas` | Keep | Reference for query pattern |

### FinanzasController — Auth Pattern

Current class decorator: `@Auth('ADMIN', 'PROFESIONAL', 'FACTURADOR')` — all existing endpoints allow all three roles.

New endpoints must be narrowed to `@Auth('ADMIN', 'FACTURADOR')` at method level. Verify guard supports override before implementation (see Pitfall 3).

### LiquidacionObraSocial Model Fields (confirmed in schema.prisma)

```
id           String
obraSocialId String       (FK → ObraSocial)
periodo      String       ('YYYY-MM')
fechaPago    DateTime?
montoTotal   Decimal
usuarioId    String?      (FK → Usuario — the FACTURADOR who closed the lote)
facturaId    String?
practicas    PracticaRealizada[]  (one-to-many via liquidacionId)
```

### LimiteFacturacionMensual Model Fields (confirmed in schema.prisma)

```
id            String
profesionalId String       (FK → Profesional)
mes           String       ('YYYY-MM')
limite        Decimal?     (nullable — not yet configured)
@@unique([profesionalId, mes])
```

---

## Seven New Endpoints (Plan 09-02)

Derived from requirements and success criteria:

| # | Method | Path | Auth | Req |
|---|--------|------|------|-----|
| 1 | GET | `/finanzas/limite-disponible` | ADMIN, FACTURADOR | LMIT-02 |
| 2 | GET | `/finanzas/practicas-pendientes-agrupadas` | ADMIN, FACTURADOR | DASH-02 (prep) |
| 3 | GET | `/finanzas/practicas-pendientes/:profesionalId/por-os/:obraSocialId` | ADMIN, FACTURADOR | LIQ-01 (prep) |
| 4 | POST | `/finanzas/liquidaciones/crear-lote` | ADMIN, FACTURADOR | LIQ-03 |
| 5 | GET | `/finanzas/liquidaciones` | ADMIN, FACTURADOR | LIQ-03 (list) |
| 6 | GET | `/finanzas/liquidaciones/:id` | ADMIN, FACTURADOR | LIQ-03 (detail) |
| 7 | POST | `/finanzas/afip/emitir-comprobante` | ADMIN, FACTURADOR | AFIP-02 |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `marcarPracticasPagadas` (non-atomic) | `crearLoteLiquidacion` (`$transaction`) | Guarantees data consistency; old method stays for backward compatibility |
| `getCierreMensual` (naive UTC month) | `getMonthBoundariesART` (UTC-3 fixed) | Correct billing period scoping for ART timezone |
| No AFIP integration | `AfipStubService` (typed mock) | Fixes the contract shape for v1.2 without coupling to external service |

---

## Open Questions

1. **JwtRolesGuard method-level override**
   - What we know: The guard uses `@Roles` decorator and is applied via `@Auth`. Class-level `@Auth` is currently on `FinanzasController`.
   - What's unclear: Whether `Reflector.getAllAndOverride` or `Reflector.get` is used — the former supports method-level override, the latter does not.
   - Recommendation: Read `jwt-roles.guard.ts` at start of Plan 09-02. If override is not supported, create `FinanzasFacturadorController` for the new endpoints.

2. **`montoTotal` in CreateLoteDto — computed or provided?**
   - What we know: `LiquidacionObraSocial.montoTotal` must be populated. The client could send it or the service could compute it from the practice IDs.
   - What's unclear: Whether the frontend will compute it or the backend should sum `monto` fields from the practice IDs.
   - Recommendation: Compute server-side within the `$transaction` callback by summing `PracticaRealizada.montoPagado ?? monto` for the provided IDs. Do not trust client-provided total.

3. **`periodo` field in CreateLoteDto — YYYY-MM or inferred from practices?**
   - What we know: `LiquidacionObraSocial.periodo` is a `String` field.
   - What's unclear: Whether the FACTURADOR provides it or the service infers it from practice dates.
   - Recommendation: Accept it explicitly in the DTO (simpler, explicit, auditable). Validate format with `@Matches(/^\d{4}-\d{2}$/)`.

---

## Validation Architecture

> `workflow.nyquist_validation` key is absent from `.planning/config.json` — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (NestJS default) |
| Config file | `backend/package.json` → `jest` key |
| Quick run command | `cd backend && npm run test -- --testPathPattern=finanzas` |
| Full suite command | `cd backend && npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LMIT-02 | `getMonthBoundariesART('2026-03').start` equals `2026-03-01T03:00:00Z` | unit | `cd backend && npm run test -- --testPathPattern=month-boundaries` | Wave 0 |
| LMIT-02 | Practice at `2026-03-01T02:30:00Z` is excluded from March emitido total | unit | included in month-boundaries spec | Wave 0 |
| LIQ-03 | `crearLoteLiquidacion` creates `LiquidacionObraSocial` and updates practices atomically | unit (mocked prisma) | `cd backend && npm run test -- --testPathPattern=finanzas.service` | Wave 0 |
| AFIP-02 | `AfipStubService.emitirComprobante()` returns `resultado: 'A'` and non-null `cae` | unit | `cd backend && npm run test -- --testPathPattern=afip-stub` | Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && npm run test -- --testPathPattern=finanzas --passWithNoTests`
- **Per wave merge:** `cd backend && npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/src/modules/finanzas/utils/month-boundaries.spec.ts` — covers LMIT-02 boundary arithmetic
- [ ] `backend/src/modules/finanzas/finanzas.service.spec.ts` — covers LIQ-03 transaction behavior (mock prisma)
- [ ] `backend/src/modules/finanzas/afip/afip-stub.service.spec.ts` — covers AFIP-02 stub contract

---

## Sources

### Primary (HIGH confidence)

- Direct file inspection: `backend/src/modules/finanzas/finanzas.service.ts` — existing service methods, query patterns
- Direct file inspection: `backend/src/modules/finanzas/finanzas.controller.ts` — existing endpoint structure, auth pattern
- Direct file inspection: `backend/src/modules/finanzas/finanzas.module.ts` — current providers, imports
- Direct file inspection: `backend/src/modules/finanzas/dto/finanzas.dto.ts` — DTO patterns (class-validator decorators)
- Direct file inspection: `backend/src/prisma/schema.prisma` — `LimiteFacturacionMensual`, `LiquidacionObraSocial`, `PracticaRealizada`, `Factura` models confirmed present
- `.planning/phases/08-schema-foundation-afip-research/08-01-SUMMARY.md` — Phase 8 completion status, Prisma client regenerated
- `.planning/phases/08-schema-foundation-afip-research/08-02-SUMMARY.md` — `EmitirComprobanteParams` / `EmitirComprobanteResult` interfaces defined
- `.planning/research/AFIP-INTEGRATION.md` Section 3 — TypeScript interface contract for Phase 9

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — Locked decisions: `profesionalId` always explicit, `getMonthBoundariesART()` mandatory from first commit, all backend in `FinanzasModule`
- Argentina timezone: UTC-3, no DST since 2008 — well-established fact, no external source required

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, confirmed by direct inspection
- Architecture patterns: HIGH — derived from existing code patterns + locked decisions in STATE.md
- Timezone arithmetic: HIGH — fixed offset UTC-3, no DST (Argentina 2008+), verifiable with the test case from success criteria
- $transaction pattern: HIGH — Prisma $transaction is stable API; interactive callback form is the correct choice given the FK dependency
- AfipStub interfaces: HIGH — defined verbatim in AFIP-INTEGRATION.md Section 3
- Auth guard override: MEDIUM — behavior of `JwtRolesGuard` re: method-level override not confirmed (open question #1)

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable codebase, no external APIs in scope for this phase)
