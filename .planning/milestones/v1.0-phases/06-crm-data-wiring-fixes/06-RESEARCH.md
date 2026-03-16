# Phase 6: CRM Data Wiring Fixes - Research

**Researched:** 2026-03-02
**Domain:** NestJS backend data wiring + React frontend label mapping
**Confidence:** HIGH

## Summary

Phase 6 closes three precisely identified data gaps found in the v1.0 audit. All three are surgical fixes to existing, working code — no new models, no new endpoints, no migrations. The root causes are confirmed by direct code inspection.

**Gap 1 (LOG-01 / DASH-05):** `createContacto()` in `pacientes.service.ts` calls `tx.contactoLog.create()` but never writes `registradoPorId`. The field exists in the schema and in the applied migration (`20260302000000_contactolog_registrado_por`). The `req.user.userId` value is available at the controller level (confirmed via `JwtStrategy.validate()`) but is never passed to the service. Because every `ContactoLog` row has `registradoPorId = null`, `getCoordinatorPerformance()` groups all rows under the single `sin-asignar` bucket — making `CoordinatorPerformanceWidget` useless for attribution. Fixing the write fixes the widget automatically.

**Gap 2 (DASH-01):** `PROCEDIMIENTO_REALIZADO` exists in the `EtapaCRM` PostgreSQL enum (added in migration `20260227000000_crm_v2_whatsapp_thread`) but is absent from two places: the `ETAPAS_FUNNEL` array in `crm-dashboard.service.ts` and the `ETAPAS_LABELS` map in `CRMFunnelWidget.tsx`. Patients in this stage are silently omitted from the conversion funnel. The fix is two one-line additions.

**Primary recommendation:** Three targeted edits across three files. No migration, no new endpoints, no schema changes.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LOG-01 | El coordinador puede registrar una interacción con un paciente con fecha, tipo y nota | `registradoPorId` field already exists in schema + migration; only the write call is missing in `createContacto()` |
| DASH-05 | El coordinador ve su performance de seguimiento: interacciones registradas, pacientes contactados esta semana | Backend `getCoordinatorPerformance()` is fully implemented; returns real rows when `registradoPorId` is populated; frontend widget is fully implemented and renders rows correctly |
| DASH-01 | El profesional ve el embudo de conversión con cantidad de pacientes por etapa CRM y tasa de paso entre etapas | `PROCEDIMIENTO_REALIZADO` must be added to `ETAPAS_FUNNEL` array and `ETAPAS_LABELS` map; enum already exists in DB |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS + Prisma | existing | Backend ORM + framework | Already in project |
| React + TanStack Query | existing | Frontend data fetching | Already in project |

No new libraries required. This phase is pure wiring fixes on existing infrastructure.

## Architecture Patterns

### Confirmed Pattern: Controller extracts userId, passes to service

The established pattern in this codebase is that the controller extracts user identity from `req.user` (populated by `JwtStrategy.validate()`) and passes it explicitly to the service. The service signature is then extended to accept the new parameter.

**JwtStrategy confirmed payload shape** (`backend/src/modules/auth/strategies/jwt.strategy.ts`):
```typescript
return {
  userId: usuario.id,        // <-- this is what we need
  nombre: usuario.nombre,
  apellido: usuario.apellido,
  email: usuario.email,
  fotoUrl: usuario.fotoUrl,
  rol: usuario.rol,
  profesionalId: usuario.profesional?.id ?? null,
};
```

**Confirmed usage across multiple controllers:**
- `req.user.userId` — used in `mensajes-internos.controller.ts`, `hc-templates.controller.ts`, `ordenes-compra.controller.ts`
- `req.user.profesionalId` — used in `pacientes.controller.ts`, `whatsapp.controller.ts`

### Pattern 2: ETAPAS_FUNNEL constant controls funnel order and membership

The funnel is driven by a single constant array at the top of `crm-dashboard.service.ts`:

```typescript
// backend/src/modules/reportes/services/crm-dashboard.service.ts
const ETAPAS_FUNNEL: EtapaCRM[] = [
  EtapaCRM.NUEVO_LEAD,
  EtapaCRM.TURNO_AGENDADO,
  EtapaCRM.CONSULTADO,
  EtapaCRM.PRESUPUESTO_ENVIADO,
  EtapaCRM.CONFIRMADO,   // <-- PROCEDIMIENTO_REALIZADO belongs before this
];
```

The frontend maps etapa strings to display labels via a plain object:

```typescript
// frontend/src/app/dashboard/components/CRMFunnelWidget.tsx
const ETAPAS_LABELS: Record<string, string> = {
  NUEVO_LEAD: "Nuevo lead",
  TURNO_AGENDADO: "Turno agendado",
  CONSULTADO: "Consultado",
  PRESUPUESTO_ENVIADO: "Presupuesto enviado",
  CONFIRMADO: "Confirmado",
  // <-- PROCEDIMIENTO_REALIZADO missing here
};
```

The fallback `ETAPAS_LABELS[etapa.etapa] ?? etapa.etapa` means the raw enum string "PROCEDIMIENTO_REALIZADO" would show in the UI if the backend sends the stage but the label map lacks it.

### Anti-Patterns to Avoid

- **Passing userId through an intermediary field:** Do not put `userId` into the DTO. Extract it from `req.user.userId` in the controller and pass as a separate argument to the service method, consistent with other controllers in this codebase.
- **Modifying the service signature to accept `req`:** Services should not depend on the HTTP request object. Controller extracts, service receives plain values.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User identity in backend | Custom auth header parsing | `req.user.userId` from JwtStrategy | Already validated, typed, and cached in guard |
| Funnel label fallback | Extra translation layer | Extend `ETAPAS_LABELS` object | One-line fix, consistent with existing pattern |

## Common Pitfalls

### Pitfall 1: Service signature change breaks the SECRETARIA path

**What goes wrong:** `createContacto(pacienteId, profesionalId, dto)` is called in one place. If we add `registradoPorId` as a 4th argument, we must update the single call site in the controller.

**Why it happens:** The controller has a multi-path resolution for `profesionalId` (PROFESIONAL vs. SECRETARIA), and the `userId` is available regardless of role.

**How to avoid:** Add `registradoPorId?: string` as the 4th parameter with a default of `undefined`. In the service, write `registradoPorId: registradoPorId ?? null` in the Prisma `data` block.

**Warning signs:** TypeScript will flag the call site immediately if the signature is changed without updating the call.

### Pitfall 2: PROCEDIMIENTO_REALIZADO placement in funnel order

**What goes wrong:** Adding `PROCEDIMIENTO_REALIZADO` in the wrong position changes the funnel display order and makes conversion rates misleading.

**Why it happens:** Alphabetical or arbitrary ordering.

**How to avoid:** Insert between `PRESUPUESTO_ENVIADO` and `CONFIRMADO` — this is the correct clinical sequence and was the explicit design decision recorded in STATE.md: *"PROCEDIMIENTO_REALIZADO added to EtapaCRM between PRESUPUESTO_ENVIADO and CONFIRMADO — represents clinical milestone before final conversion"*.

**Correct order:**
```
NUEVO_LEAD → TURNO_AGENDADO → CONSULTADO → PRESUPUESTO_ENVIADO → PROCEDIMIENTO_REALIZADO → CONFIRMADO
```

### Pitfall 3: CoordinatorPerformanceWidget uses nombre as React key

**What goes wrong:** `data.coordinadores.map((coord) => (<tr key={coord.nombre}>...))` — if two coordinators share a name, React key collisions occur.

**Why it happens:** The backend response does not include an ID field for the coordinator row; only `nombre`, `interacciones`, `pacientesContactados`, `porcentajeConversion`.

**How to avoid:** The backend `getCoordinatorPerformance()` aggregates by `registradoPorId` (the key in the Map) but returns only `nombre` in the serialized output. Consider returning `id` as well, or accept the name-as-key limitation for now since coordinator name collisions are rare in a single-tenant context. This is a known limitation, not a blocker.

### Pitfall 4: "Sin asignar" row persists after LOG-01 fix

**What goes wrong:** After fixing `registradoPorId` writes, old `ContactoLog` rows (with `registradoPorId = null`) still exist in the DB and will generate a "Sin asignar" row in coordinator performance data.

**Why it happens:** The migration only added the column nullable; existing rows are null. The fix is only prospective.

**How to avoid:** The `SetNull` delete behavior and the `sin-asignar` fallback label in `getCoordinatorPerformance()` are correct as designed — the STATE.md decision says *"registradoPorId uses onDelete: SetNull — retrocompatible, old ContactoLogs appear as Sin asignar in coordinator table"*. No data migration needed. The "Sin asignar" row is expected and correct for historical data.

## Code Examples

### Fix 1: Write registradoPorId in controller + service

**Controller change** (`backend/src/modules/pacientes/pacientes.controller.ts`, line 123):
```typescript
// Before
return this.pacientesService.createContacto(pacienteId, profesionalId, dto);

// After
const registradoPorId = req.user?.userId as string | undefined;
return this.pacientesService.createContacto(pacienteId, profesionalId, dto, registradoPorId);
```

**Service change** (`backend/src/modules/pacientes/pacientes.service.ts`, signature + data block):
```typescript
// Signature change
async createContacto(
  pacienteId: string,
  profesionalId: string,
  dto: CreateContactoDto,
  registradoPorId?: string,   // <-- add this
) {
  return this.prisma.$transaction(async (tx) => {
    const contacto = await tx.contactoLog.create({
      data: {
        pacienteId,
        profesionalId,
        tipo: dto.tipo,
        nota: dto.nota,
        fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
        etapaCRMPost: dto.etapaCRM ?? null,
        temperaturaPost: dto.temperatura ?? null,
        proximaAccionFecha: dto.proximaAccionFecha
          ? new Date(dto.proximaAccionFecha)
          : null,
        registradoPorId: registradoPorId ?? null,   // <-- add this
      },
    });
    // ... rest unchanged
  });
}
```

### Fix 2: Add PROCEDIMIENTO_REALIZADO to funnel constant

**Backend** (`backend/src/modules/reportes/services/crm-dashboard.service.ts`):
```typescript
const ETAPAS_FUNNEL: EtapaCRM[] = [
  EtapaCRM.NUEVO_LEAD,
  EtapaCRM.TURNO_AGENDADO,
  EtapaCRM.CONSULTADO,
  EtapaCRM.PRESUPUESTO_ENVIADO,
  EtapaCRM.PROCEDIMIENTO_REALIZADO,   // <-- add this line
  EtapaCRM.CONFIRMADO,
];
```

**Frontend** (`frontend/src/app/dashboard/components/CRMFunnelWidget.tsx`):
```typescript
const ETAPAS_LABELS: Record<string, string> = {
  NUEVO_LEAD: "Nuevo lead",
  TURNO_AGENDADO: "Turno agendado",
  CONSULTADO: "Consultado",
  PRESUPUESTO_ENVIADO: "Presupuesto enviado",
  PROCEDIMIENTO_REALIZADO: "Procedimiento realizado",   // <-- add this line
  CONFIRMADO: "Confirmado",
};
```

## File Map

All files that need changes in Phase 6:

| File | Change | Requirement |
|------|--------|-------------|
| `backend/src/modules/pacientes/pacientes.controller.ts` | Extract `req.user.userId`, pass as 4th arg to `createContacto()` | LOG-01, DASH-05 |
| `backend/src/modules/pacientes/pacientes.service.ts` | Add `registradoPorId?: string` param, write to Prisma `data` block | LOG-01, DASH-05 |
| `backend/src/modules/reportes/services/crm-dashboard.service.ts` | Add `EtapaCRM.PROCEDIMIENTO_REALIZADO` to `ETAPAS_FUNNEL` array | DASH-01 |
| `frontend/src/app/dashboard/components/CRMFunnelWidget.tsx` | Add `PROCEDIMIENTO_REALIZADO: "Procedimiento realizado"` to `ETAPAS_LABELS` | DASH-01 |

**No new files. No migrations. No schema changes. No new hooks.**

## State of the Art

| What was planned | What actually exists | Gap |
|-----------------|---------------------|-----|
| `registradoPorId` persisted on ContactoLog creation | Field + FK exist in schema; migration applied; column is always null | Write call missing in service |
| Coordinator breakdown by real user | `getCoordinatorPerformance()` groups by `registradoPorId` correctly | All data collapses to sin-asignar because upstream write is missing |
| PROCEDIMIENTO_REALIZADO in funnel | Enum value in DB; missing from `ETAPAS_FUNNEL` array and label map | Two one-line additions needed |

## Open Questions

1. **Should the coordinator performance widget use `id` instead of `nombre` as React key?**
   - What we know: Widget uses `coord.nombre` as key; backend returns only `nombre`, not `id`
   - What's unclear: Whether to return `id` from backend or accept name-as-key
   - Recommendation: For Phase 6 scope, keep existing widget as-is (name-as-key is acceptable for small coordinator lists). Can be improved in Phase 7 if needed.

2. **Do we need to backfill historical ContactoLog rows with registradoPorId?**
   - What we know: STATE.md explicitly says "old ContactoLogs appear as Sin asignar in coordinator table" — design intent is no backfill
   - What's unclear: Nothing — this is settled
   - Recommendation: No backfill. "Sin asignar" for historical rows is by design.

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `backend/src/modules/pacientes/pacientes.service.ts` lines 766-799 — confirmed `registradoPorId` absent from `data` block
- Direct code inspection: `backend/src/modules/pacientes/pacientes.controller.ts` lines 99-124 — confirmed `req.user.userId` available but not passed
- Direct code inspection: `backend/src/modules/auth/strategies/jwt.strategy.ts` — confirmed `userId: usuario.id` in payload
- Direct code inspection: `backend/src/modules/reportes/services/crm-dashboard.service.ts` lines 5-11 — confirmed `PROCEDIMIENTO_REALIZADO` absent from `ETAPAS_FUNNEL`
- Direct code inspection: `frontend/src/app/dashboard/components/CRMFunnelWidget.tsx` lines 6-12 — confirmed `PROCEDIMIENTO_REALIZADO` absent from `ETAPAS_LABELS`
- Direct code inspection: `backend/src/prisma/schema.prisma` lines 976-984 — confirmed `PROCEDIMIENTO_REALIZADO` IS in the `EtapaCRM` enum
- Applied migration: `backend/src/prisma/migrations/20260302000000_contactolog_registrado_por/migration.sql` — confirms column + FK exist in DB
- STATE.md accumulated decisions — confirms design intent for SetNull behavior and no backfill requirement

### Secondary (MEDIUM confidence)
- Pattern cross-reference: `mensajes-internos.controller.ts`, `ordenes-compra.controller.ts` — confirms `req.user.userId` as the established extraction pattern

## Metadata

**Confidence breakdown:**
- Root cause diagnosis: HIGH — confirmed by direct code inspection, no ambiguity
- Fix implementation: HIGH — surgical edits, no new patterns needed, all follow existing codebase conventions
- Side effects: HIGH — no schema changes, no migrations, no new endpoints; impact is purely additive
- Coordinator widget improvement: MEDIUM — key collision on `nombre` is a known pre-existing limitation, not introduced by this phase

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable domain — NestJS/Prisma patterns don't change rapidly)
