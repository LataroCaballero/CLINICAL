# Phase 2: Log de Contactos + Lista de Accion - Research

**Researched:** 2026-02-23
**Domain:** CRM contact log, priority queue, NestJS CRUD, Next.js page + sheet UI
**Confidence:** HIGH — all findings from direct codebase inspection, no external sources needed

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Formulario de registro de contacto**
- Disponible desde **ambos lados**: botón en el drawer del paciente y botón en la tarjeta de la Lista de Acción
- Se presenta como **sheet/drawer lateral** (no modal centrado)
- Campos del formulario: tipo de interacción (llamada / mensaje / presencial) + nota libre + fecha (default hoy) + etapa CRM + temperatura + próxima acción (opcional)
- Próxima acción: el coordinador puede elegir **fecha exacta con date picker O intervalo predefinido** (2 días / 1 semana / 2 semanas / 1 mes), ambas opciones disponibles
- CRM y temperatura se pueden cambiar en el mismo form (success criteria #3)

**Historial en el perfil del paciente**
- Aparece como **sección siempre visible** en el body del drawer (sin tab separado, accesible con scroll)
- Cada entrada muestra formato compacto: **ícono de tipo + fecha + nota truncada**
- Muestra las **últimas 5 entradas** con link "Ver todo" si hay más
- Indicador de "días desde el último contacto" visible **en ambos lugares**: header del drawer del paciente Y tarjeta de la Lista de Acción

**Vista Lista de Acción**
- Vive como **widget en el Dashboard** con link a página completa (`/dashboard/accion` o similar)
- Página completa usa **tarjetas (cards)** por paciente
- Cada card muestra: nombre + días sin contacto + temperatura + botón "Registrar"
- El score de prioridad **no se muestra** en la card (solo determina el orden)
- Al registrar un contacto, el paciente **desaparece de la lista** inmediatamente, pero hay un **contador "Contactados hoy"** visible arriba de la lista

**Registro inline desde la Lista de Acción**
- El botón "Registrar" en la card abre el **mismo sheet completo** (todos los campos: tipo + nota + fecha + CRM + temperatura + próxima acción)
- El sheet se abre como **acción independiente** — no abre el drawer del paciente debajo
- Al guardar: el sheet se cierra, el paciente aparece **marcado brevemente** (feedback visual de éxito) y luego desaparece de la lista
- Pre-relleno: **solo la fecha** (hoy); el resto de campos vacíos

### Claude's Discretion
- Diseño exacto del ícono por tipo de contacto (llamada, mensaje, presencial)
- Animación de desaparición de la card al marcar como contactado
- Colores/badges para temperatura (caliente/tibio/frío) en las cards
- Ordenamiento secundario cuando dos pacientes tienen el mismo score de prioridad

### Deferred Ideas (OUT OF SCOPE)
- Ninguna — la discusión se mantuvo dentro del scope de la fase
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LOG-01 | El coordinador puede registrar una interacción con un paciente (llamada, mensaje, consulta presencial) con fecha, tipo y nota | New Prisma model `ContactoLog` + NestJS CRUD endpoints + RHF form in Sheet |
| LOG-02 | El perfil del paciente muestra el historial completo de interacciones ordenado cronológicamente | New GET endpoint `/pacientes/:id/contactos` + frontend section in PacienteDetails drawer (always-visible, last 5 + "Ver todo") |
| LOG-03 | Al registrar una interacción, el coordinador puede actualizar la etapa CRM y temperatura del paciente en el mismo paso | `createContacto` service method updates `etapaCRM` + `temperatura` atomically in same Prisma transaction |
| LOG-04 | El sistema muestra cuántos días hace que no hay interacción con cada paciente | Computed field: `daysSince(max(ContactoLog.fecha, paciente.createdAt))` — returned from API, displayed in drawer header + lista card |
| ACCION-01 | El coordinador ve una lista diaria de pacientes que requieren seguimiento, ordenada por prioridad | New GET `/pacientes/lista-accion` endpoint returning patients with priority score + `diasSinContacto` |
| ACCION-02 | La prioridad se calcula automáticamente según: días sin contacto, temperatura del paciente y etapa CRM | Priority algorithm: `score = diasSinContacto * pesoTemperatura * pesoEtapa` computed server-side |
| ACCION-03 | Desde la lista de acción, el coordinador puede registrar la interacción realizada sin salir de la vista | Same reusable `ContactoSheet` component used in both drawer and lista-accion card |
| ACCION-04 | Los pacientes contactados hoy desaparecen de la lista hasta el próximo período de seguimiento | Filter: patients with `ContactoLog.fecha >= today_start` are excluded from lista-accion; optimistic removal on frontend |
</phase_requirements>

---

## Summary

Phase 2 adds a contact log (CRM interaction tracking) and a daily action list for coordinators. The work is self-contained: new Prisma model, NestJS CRUD endpoints in the existing `pacientes` module, and frontend components that integrate into existing patterns (drawer, dashboard). No new external dependencies are needed.

The biggest architectural decision is whether `ContactoLog` lives in the `pacientes` module or gets its own module. Given that it is tightly coupled to `Paciente` (foreign key, scoped queries) and the existing module already handles CRM patches (etapaCRM, temperatura), keeping it in `pacientes` is the right call — consistent with how the codebase already handles related concerns.

The Sheet UI component does not exist yet (`shadcn/ui sheet` is not installed). The project uses `@radix-ui/react-dialog` already. The Sheet pattern can be implemented either by installing `@radix-ui/react-dialog` (already present) with a side-panel variant, or by adding the `shadcn/ui sheet` component (which is just a Dialog with `side` positioning). This is a one-time addition.

**Primary recommendation:** Add `ContactoLog` model to `pacientes` module. Add `shadcn/ui sheet` component. Implement the `ContactoSheet` as a single reusable component consumed from both the patient drawer and the action list card.

---

## Standard Stack

### Core (already in project — no new installs)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Prisma | existing | New `ContactoLog` model + migration | Already configured |
| NestJS | existing | New endpoints in `PacientesController` + `PacientesService` | Already configured |
| React Hook Form | ^7.68.0 | ContactoSheet form | Already installed |
| Zod | ^4.1.1 | DTO validation (backend + frontend schema) | Already installed |
| TanStack Query | ^5.90.6 | `useContactos`, `useCreateContacto`, `useListaAccion` hooks | Already installed |
| date-fns | ^4.1.0 | Date arithmetic (diasSinContacto, date picker formatting) | Already installed |
| react-day-picker | ^9.12.0 | Date picker in the form (already used in the calendar component) | Already installed |
| sonner | ^2.0.7 | Toast feedback on save | Already installed |
| framer-motion | ^12.23.25 | Card disappear animation | Already installed |
| lucide-react | ^0.553.0 | Icons for contact type (Phone, MessageSquare, MapPin) | Already installed |

### New additions required
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@radix-ui/react-dialog` | already installed | Sheet implementation | shadcn Sheet is Dialog + CSS positioning |

**No new npm packages required.** The Sheet component is a shadcn/ui component that wraps the existing `@radix-ui/react-dialog` package. It needs to be generated with `npx shadcn@latest add sheet` or copied manually as a new `sheet.tsx` file in `frontend/src/components/ui/`.

**Installation:**
```bash
# From frontend/ directory
npx shadcn@latest add sheet
```
This generates `frontend/src/components/ui/sheet.tsx` using the already-installed `@radix-ui/react-dialog`.

---

## Architecture Patterns

### Recommended File Structure

```
backend/src/modules/pacientes/
├── dto/
│   └── create-contacto.dto.ts          # NEW: tipo, nota, fecha, etapaCRM?, temperatura?, proximaAccionFecha?
├── pacientes.controller.ts             # MODIFIED: add POST /pacientes/:id/contactos, GET /pacientes/:id/contactos, GET /pacientes/lista-accion
├── pacientes.service.ts                # MODIFIED: createContacto(), getContactosByPaciente(), getListaAccion()
└── pacientes.module.ts                 # unchanged

backend/src/prisma/
└── schema.prisma                       # MODIFIED: new ContactoLog model + TipoContacto enum
    migrations/
    └── 20260223XXXXXX_contact_log/     # NEW: migration file

frontend/src/components/ui/
└── sheet.tsx                           # NEW: shadcn Sheet component

frontend/src/components/crm/
└── ContactoSheet.tsx                   # NEW: reusable sheet with RHF form (tipo + nota + fecha + CRM + temp + proxAccion)

frontend/src/app/dashboard/
├── accion/
│   └── page.tsx                        # NEW: full-page Lista de Acción
└── components/
    └── ListaAccionWidget.tsx           # NEW: dashboard widget (mini card list + "Ver todo" link)

frontend/src/app/dashboard/pacientes/components/
└── ContactosSection.tsx                # NEW: inline section in PacienteDetails (last 5 + "Ver todo")

frontend/src/hooks/
├── useContactos.ts                     # NEW: GET /pacientes/:id/contactos
├── useCreateContacto.ts                # NEW: POST /pacientes/:id/contactos (mutation)
└── useListaAccion.ts                   # NEW: GET /pacientes/lista-accion?profesionalId=X
```

### Pattern 1: Prisma Model — ContactoLog

```prisma
enum TipoContacto {
  LLAMADA
  MENSAJE
  PRESENCIAL
}

model ContactoLog {
  id            String              @id @default(uuid())
  pacienteId    String
  profesionalId String
  tipo          TipoContacto
  nota          String?
  fecha         DateTime            @default(now())
  // CRM state at time of contact (snapshot, not FK)
  etapaCRMPost  EtapaCRM?           // etapa after this contact (if changed)
  temperaturaPost TemperaturaPaciente? // temp after this contact (if changed)
  // Next action scheduling
  proximaAccionFecha DateTime?
  createdAt     DateTime            @default(now())

  paciente      Paciente            @relation(fields: [pacienteId], references: [id])
  profesional   Profesional         @relation(fields: [profesionalId], references: [id])

  @@index([pacienteId, fecha])
  @@index([profesionalId, fecha])
}
```

Also add to `Paciente` model:
```prisma
contactos   ContactoLog[]
```

And to `Profesional` model:
```prisma
contactos   ContactoLog[]
```

### Pattern 2: Priority Score Algorithm (backend, server-side)

The `getListaAccion` method computes priority server-side to avoid sending all patient data to the client. Logic:

```typescript
// In pacientes.service.ts
function calcularScore(diasSinContacto: number, temperatura: TemperaturaPaciente | null, etapa: EtapaCRM | null): number {
  // Base: days without contact (capped at 30 for scoring)
  const diasScore = Math.min(diasSinContacto, 30);

  // Temperature weight
  const tempWeight: Record<string, number> = {
    CALIENTE: 3,
    TIBIO: 2,
    FRIO: 1,
  };
  const tw = tempWeight[temperatura ?? 'TIBIO'] ?? 1;

  // Etapa weight (higher = more urgent to contact)
  const etapaWeight: Record<string, number> = {
    SEGUIMIENTO_ACTIVO: 3,
    CALIENTE: 3,
    PRESUPUESTO_ENVIADO: 2,
    CONSULTADO: 2,
    TURNO_AGENDADO: 1,
    NUEVO_LEAD: 1,
  };
  const ew = etapaWeight[etapa ?? 'NUEVO_LEAD'] ?? 1;

  return diasScore * tw * ew;
}
```

Secondary sort (Claude's Discretion): when two patients have the same score, sort by `nombreCompleto` alphabetically for stable ordering.

### Pattern 3: lista-accion Exclusion Rule (ACCION-04)

A patient is excluded from the lista-accion if they have a `ContactoLog` entry with `fecha >= start of today (local time)`.

```typescript
// In getListaAccion()
const hoyInicio = new Date();
hoyInicio.setHours(0, 0, 0, 0);

// Count contactados hoy (for the counter widget)
const contactadosHoy = await this.prisma.contactoLog.count({
  where: { profesionalId, fecha: { gte: hoyInicio } },
});

// Exclude them from the list
const pacientes = await this.prisma.paciente.findMany({
  where: {
    profesionalId,
    etapaCRM: { not: null, notIn: ['CONFIRMADO', 'PERDIDO'] },
    NOT: {
      contactos: {
        some: { fecha: { gte: hoyInicio } }
      }
    }
  },
  include: {
    contactos: {
      orderBy: { fecha: 'desc' },
      take: 1,
    }
  }
});
```

### Pattern 4: Reusable ContactoSheet (frontend)

The sheet is a single component receiving `pacienteId` + `pacienteNombre` as props, used in two contexts:

```tsx
// From PacienteDetails (inside the patient drawer)
<ContactoSheet
  pacienteId={paciente.id}
  pacienteNombre={paciente.nombreCompleto}
  trigger={<Button size="sm">Registrar contacto</Button>}
  onSuccess={() => { /* invalidate queries */ }}
/>

// From action list card
<ContactoSheet
  pacienteId={card.id}
  pacienteNombre={card.nombreCompleto}
  trigger={<Button variant="outline" size="sm">Registrar</Button>}
  onSuccess={() => { /* optimistic remove from list */ }}
/>
```

The sheet uses Radix Dialog (side panel), React Hook Form, and on submit calls `useCreateContacto` mutation.

### Pattern 5: Optimistic Removal from Lista de Acción (ACCION-04)

On successful `createContacto`:
1. Show brief success state on card ("Marcado brevemente" per CONTEXT.md decision)
2. After ~1s delay, invalidate `["lista-accion"]` query — the patient disappears from the refetched list
3. Optionally use `queryClient.setQueryData` for instant removal before refetch

Framer-motion `AnimatePresence` + `exit={{ opacity: 0, height: 0 }}` handles the disappear animation (Claude's Discretion area).

### Pattern 6: Atomic CRM + Temperatura Update on Contact (LOG-03)

The `createContacto` service method must update `etapaCRM` and `temperatura` in the same Prisma transaction:

```typescript
// In pacientes.service.ts
async createContacto(pacienteId: string, profesionalId: string, dto: CreateContactoDto) {
  return this.prisma.$transaction(async (tx) => {
    const contacto = await tx.contactoLog.create({
      data: {
        pacienteId,
        profesionalId,
        tipo: dto.tipo,
        nota: dto.nota,
        fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
        etapaCRMPost: dto.etapaCRM,
        temperaturaPost: dto.temperatura,
        proximaAccionFecha: dto.proximaAccionFecha ? new Date(dto.proximaAccionFecha) : null,
      },
    });

    // Only update if provided
    if (dto.etapaCRM || dto.temperatura) {
      await tx.paciente.update({
        where: { id: pacienteId },
        data: {
          ...(dto.etapaCRM && { etapaCRM: dto.etapaCRM }),
          ...(dto.temperatura && { temperatura: dto.temperatura }),
        },
      });
    }

    return contacto;
  });
}
```

### Pattern 7: diasSinContacto Calculation

Computed from the most recent `ContactoLog.fecha` for the patient (or `paciente.createdAt` as fallback):

```typescript
function calcularDiasSinContacto(ultimoContacto: Date | null, createdAt: Date): number {
  const base = ultimoContacto ?? createdAt;
  const diff = Date.now() - base.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
```

### Pattern 8: "Próxima Acción" — date picker + preset intervals

The form has two mutually exclusive input modes (toggled by a radio or tab):

- **Fecha exacta**: `<Calendar />` / `react-day-picker` (already used in the project via `calendar.tsx`)
- **Intervalo predefinido**: Button group (2 días / 1 semana / 2 semanas / 1 mes)

Selecting a preset automatically computes `fecha = hoy + N días` and stores as an exact date. The `proximaAccionFecha` field in `ContactoLog` stores the final DateTime.

What happens with `proximaAccionFecha`? In Phase 2 it is stored but not yet actioned (no automated follow-up yet — that's v2 AUTO). It can be surfaced in the lista-accion widget (future) or the `SeguimientoSchedulerService`. No need to create `TareaSeguimiento` from this phase — storing it in `ContactoLog.proximaAccionFecha` is sufficient.

### Pattern 9: Dashboard Widget — ListaAccionWidget

Follows the same pattern as `CRMFunnelWidget` (already in dashboard):

```tsx
// In dashboard/components/ListaAccionWidget.tsx
// Shows top 3-5 patients needing action
// "Ver todos" link → /dashboard/accion
// Uses useListaAccion(profesionalId) hook (staleTime: 60_000)
```

Placed in the right column of the dashboard (md:col-span-4), below `AlertsWidget`, above `MensajesDashboard`.

### Pattern 10: New route `/dashboard/accion`

Follows the existing page pattern. Add to:
- `frontend/src/lib/permissions.ts`: `{ prefix: '/dashboard/accion', roles: ['ADMIN', 'PROFESIONAL', 'SECRETARIA'] }`
- `frontend/src/app/dashboard/components/Sidebar.tsx`: new nav item with `Zap` or `ListChecks` icon

### Anti-Patterns to Avoid

- **Do not compute `diasSinContacto` in the frontend**: compute server-side and return as a field. Avoids timezone drift and repeated logic.
- **Do not create a separate NestJS module** for ContactoLog: it belongs in `pacientes.module.ts` since it's a sub-resource of `Paciente`. Follow the existing inline CRM endpoint pattern (etapa-crm, temperatura are already in `PacientesController`).
- **Do not use a modal (Dialog centered)**: the CONTEXT.md explicitly locks this as a Sheet/side panel.
- **Do not add a "Log de Contactos" tab** to the drawer: CONTEXT.md locks it as an always-visible section in the body with scroll.
- **Do not store `etapaCRMPost` / `temperaturaPost` as the canonical source**: they are snapshots/audit log. The authoritative state remains on `Paciente.etapaCRM` and `Paciente.temperatura`, updated atomically in the same transaction.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Side panel overlay UI | Custom positioned div | `shadcn/ui sheet` (wraps @radix-ui/react-dialog) | Focus trap, a11y, animation, dismiss on Escape — already have the dep |
| Date arithmetic for intervals | Custom date math | `date-fns` `addDays`, `addWeeks`, `addMonths` | Already installed, handles edge cases |
| Form state + validation | Custom state | React Hook Form + Zod (already in project) | Match existing form patterns |
| Optimistic UI | Manual state | TanStack Query `setQueryData` + `invalidateQueries` | Already the project pattern |
| Priority animation | CSS transitions | `framer-motion` `AnimatePresence` | Already installed, used in project |

---

## Common Pitfalls

### Pitfall 1: Route ordering — `GET /pacientes/lista-accion` vs `GET /pacientes/:id`
**What goes wrong:** NestJS treats `lista-accion` as the `:id` param. The existing `getKanban` endpoint has the same issue and is solved by placing `@Get('kanban')` BEFORE `@Get(':id')`.
**Why it happens:** Express/Fastify router matches in declaration order. Static segments must come before parameterized segments.
**How to avoid:** Place `GET /pacientes/lista-accion` ABOVE `@Get(':id')` in the controller. The existing `kanban` endpoint demonstrates this exact pattern.
**Warning signs:** `findOne` throws "invalid uuid" errors when hitting `/lista-accion`.

### Pitfall 2: Timezone mismatch in "contactados hoy" filter
**What goes wrong:** `hoyInicio` is computed server-side in UTC but the coordinator works in UTC-3 (Argentina). A contact at 10pm Argentina time = 1am UTC next day — the patient wrongly reappears.
**Why it happens:** `new Date().setHours(0,0,0,0)` uses the server's timezone.
**How to avoid:** Accept an optional `timezone` param from the frontend (e.g. `America/Argentina/Buenos_Aires`) OR compute hoyInicio as UTC-3 offset. Simplest: `const offset = -3 * 60; const hoyInicio = new Date(Date.now() + offset * 60000); hoyInicio.setUTCHours(0,0,0,0);`. Flag for planning to address explicitly.

### Pitfall 3: Sheet inside Drawer (nested portal conflict)
**What goes wrong:** Opening a Sheet from within the patient Drawer causes nested Dialog portals — Radix may render both in `document.body`, causing focus trap and z-index conflicts.
**Why it happens:** Radix Dialog portals default to `document.body`. Two overlapping portals fight for focus.
**How to avoid:** The `ContactoSheet` opened from within the patient drawer should use `modal={false}` on the Sheet OR close the drawer first before opening the Sheet. Simpler solution: when the Sheet is opened from the drawer, keep the drawer open but set the Sheet's z-index higher. Test this interaction explicitly.
**Alternative:** The action-list card opens the Sheet in a standalone context (no drawer), so this is only a concern for the patient drawer integration.

### Pitfall 4: Invalidating stale kanban + paciente queries after createContacto
**What goes wrong:** After registering a contact that also changes `etapaCRM` or `temperatura`, the Kanban board and the patient detail remain stale.
**Why it happens:** `useCreateContacto` only invalidates `["contactos", pacienteId]` and `["lista-accion"]` but forgets to invalidate `["crm-kanban"]` and `["paciente", pacienteId]`.
**How to avoid:** In `useCreateContacto.onSuccess`, invalidate: `["contactos", pacienteId]`, `["lista-accion"]`, `["crm-kanban"]`, `["paciente", pacienteId]`. Pattern: follow what `useUpdateEtapaCRM` already does.

### Pitfall 5: Large patient list in `getListaAccion` — N+1 query
**What goes wrong:** Fetching last `ContactoLog` per patient with a separate query per patient = N+1.
**Why it happens:** Naive implementation loops over patients.
**How to avoid:** Use Prisma's `include: { contactos: { orderBy: { fecha: 'desc' }, take: 1 } }` — single query with lateral join. Already demonstrated by `obtenerListaPacientes` in the service which uses similar nested includes.

---

## Code Examples

### Backend — CreateContactoDto

```typescript
// backend/src/modules/pacientes/dto/create-contacto.dto.ts
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { TipoContacto, EtapaCRM, TemperaturaPaciente } from '@prisma/client';

export class CreateContactoDto {
  @IsEnum(TipoContacto)
  tipo: TipoContacto;

  @IsOptional()
  @IsString()
  nota?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string; // ISO string; defaults to now() in service

  @IsOptional()
  @IsEnum(EtapaCRM)
  etapaCRM?: EtapaCRM;

  @IsOptional()
  @IsEnum(TemperaturaPaciente)
  temperatura?: TemperaturaPaciente;

  @IsOptional()
  @IsDateString()
  proximaAccionFecha?: string;
}
```

### Backend — Controller additions (route ordering critical)

```typescript
// IMPORTANT: Place ABOVE @Get(':id')
@Get('lista-accion')
getListaAccion(
  @Query('profesionalId') profesionalId: string,
) {
  return this.pacientesService.getListaAccion(profesionalId);
}

@Get(':id/contactos')
getContactos(
  @Param('id') pacienteId: string,
  @Query('limit') limit?: string,
) {
  return this.pacientesService.getContactosByPaciente(pacienteId, limit ? parseInt(limit) : undefined);
}

@Post(':id/contactos')
createContacto(
  @Param('id') pacienteId: string,
  @Body() dto: CreateContactoDto,
  @Req() req: any,
) {
  // profesionalId from JWT context
  const profesionalId = req.user?.profesionalId;
  return this.pacientesService.createContacto(pacienteId, profesionalId, dto);
}
```

**Note:** The existing `req.user` JWT payload — verify how `profesionalId` is set. Check existing `@Auth` decorator and JWT payload structure. If not available, accept as a query param or body field like other endpoints.

### Frontend — useCreateContacto hook

```typescript
// frontend/src/hooks/useCreateContacto.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useCreateContacto(pacienteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateContactoPayload) => {
      const { data: res } = await api.post(`/pacientes/${pacienteId}/contactos`, data);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contactos", pacienteId] });
      queryClient.invalidateQueries({ queryKey: ["lista-accion"] });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban"] });
      queryClient.invalidateQueries({ queryKey: ["paciente", pacienteId] });
    },
  });
}
```

### Frontend — Sheet installation

```tsx
// frontend/src/components/ui/sheet.tsx
// Install via: npx shadcn@latest add sheet
// Or copy the shadcn sheet component which uses @radix-ui/react-dialog
// The component provides: Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose, SheetFooter
// SheetContent side="right" gives the lateral drawer effect required by CONTEXT.md
```

### Frontend — ContactoSheet skeleton

```tsx
// frontend/src/components/crm/ContactoSheet.tsx
"use client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// form fields: tipo (segmented control), nota (textarea), fecha (calendar),
//              etapaCRM (select), temperatura (TemperatureSelector reuse),
//              proximaAccion (radio: exact date | preset interval)
```

### Frontend — date preset calculation (date-fns)

```typescript
import { addDays, addWeeks, addMonths } from "date-fns";

const PRESETS = [
  { label: "2 días", getValue: () => addDays(new Date(), 2) },
  { label: "1 semana", getValue: () => addWeeks(new Date(), 1) },
  { label: "2 semanas", getValue: () => addWeeks(new Date(), 2) },
  { label: "1 mes", getValue: () => addMonths(new Date(), 1) },
];
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| TareaSeguimiento (existing) creates internal alerts | ContactoLog records real human interactions | These are complementary: TareaSeguimiento = system reminders, ContactoLog = actual contact record |
| etapaCRM/temperatura updated via separate PATCH endpoints | Updated atomically in the same createContacto transaction (LOG-03) | Fewer round-trips, consistent state |

**Note on TareaSeguimiento vs ContactoLog relationship:**
- `TareaSeguimiento` = scheduler-generated reminder tasks (existing, used by `SeguimientoSchedulerService`)
- `ContactoLog` = coordinator-logged real interactions (new)
- These are separate concerns. When a contact is registered, the scheduler tasks are NOT automatically completed in Phase 2 (that wiring can be added in Phase 4 or as a future enhancement). The lista-accion uses ContactoLog as its source of truth for "contacted today" logic (ACCION-04).

---

## Open Questions

1. **JWT payload — profesionalId availability**
   - What we know: `@Auth()` decorator validates JWT and attaches `req.user`. The existing controller uses `req.user` for `resolveScope`. The JWT likely contains `usuarioId` and `rol`, but `profesionalId` may require a DB lookup.
   - What's unclear: Whether `profesionalId` is directly in `req.user` or needs to be resolved from `usuarioId`.
   - Recommendation: Check the auth guard/JWT strategy in `backend/src/modules/auth/`. If not available, add `profesionalId` to the JWT payload (safe, already a pattern for scoped queries) or resolve it in the service via `prisma.profesional.findUnique({ where: { usuarioId } })`. Keep the existing pattern — the `getKanban` endpoint takes `profesionalId` as a query param, so the same approach works here as a short-term solution.

2. **ContactoLog vs TareaSeguimiento completion**
   - What we know: `SeguimientoSchedulerService` creates `MensajeInterno` alerts when `TareaSeguimiento` tasks are due. It does NOT mark them as `completada`.
   - What's unclear: Should registering a `ContactoLog` automatically mark related `TareaSeguimiento` as `completada`?
   - Recommendation: Defer to Phase 4. Phase 2 keeps them independent. The scheduler's `MensajeInterno` alerts will still appear; the coordinator dismisses them separately.

3. **lista-accion scope — all etapas or filtered?**
   - What we know: Success criteria say "patients requiring follow-up". PERDIDO and CONFIRMADO patients don't need follow-up.
   - What's unclear: Should `NUEVO_LEAD` (no CRM stage yet) be included?
   - Recommendation: Include all patients with `etapaCRM NOT IN (CONFIRMADO, PERDIDO)`. Include patients with `etapaCRM = null` (unclassified) with the lowest priority weight. Plan should define this explicitly.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `backend/src/prisma/schema.prisma` — complete model inventory
- Direct codebase inspection: `backend/src/modules/pacientes/pacientes.controller.ts` — route patterns, auth, scope
- Direct codebase inspection: `backend/src/modules/pacientes/pacientes.service.ts` — service patterns, Prisma usage
- Direct codebase inspection: `frontend/src/hooks/useUpdateEtapaCRM.ts` — TanStack Query mutation pattern
- Direct codebase inspection: `frontend/src/components/crm/PatientCard.tsx` — component patterns
- Direct codebase inspection: `frontend/package.json` — all installed dependencies (confirmed: date-fns, react-day-picker, framer-motion, react-hook-form, zod, TanStack Query)
- Direct codebase inspection: `frontend/src/lib/permissions.ts` — route permission pattern
- Direct codebase inspection: `frontend/src/app/dashboard/components/Sidebar.tsx` — nav item pattern

### Secondary (MEDIUM confidence)
- shadcn/ui sheet component: wraps `@radix-ui/react-dialog` (confirmed installed in package.json). Component can be generated via `npx shadcn@latest add sheet` or hand-copied.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed from package.json, no new deps required except sheet component
- Architecture: HIGH — confirmed from direct codebase patterns (existing CRM endpoints, service methods, hook patterns)
- Pitfalls: HIGH — route ordering pitfall confirmed from existing `kanban` endpoint pattern; others from direct code analysis
- Priority algorithm: MEDIUM — weights are a design choice for planning, not a technical constraint; planner should define exact values

**Research date:** 2026-02-23
**Valid until:** 2026-04-23 (stable stack, patterns won't change)
