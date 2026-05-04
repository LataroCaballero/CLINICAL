# Phase 25: Tratamientos Tab - Research

**Researched:** 2026-04-20
**Domain:** Frontend UI — React/Next.js, TanStack Query, TanStack Table, Tailwind CSS, shadcn/ui
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Badge de flujo en tabla de pacientes**
- Columna dedicada "Flujo" — nueva columna en `createPacienteColumns()`, no inline en la celda del nombre
- Texto abreviado con colores:
  - `CIRUGIA` → badge azul, texto "CIR"
  - `TRATAMIENTO` → badge verde, texto "TRAT"
  - `PENDIENTE` → badge amber, texto "PEND"
  - `null` (legacy) → badge gris, texto "—"
- Null se muestra siempre — badge gris con "—" (no celda vacía)
- Alcance del badge: columna en la tabla Lista + badge visible en el drawer del paciente (PacienteDetails header)

**Navegación de tabs (Embudo / Lista / Tratamientos)**
- Extender pill buttons existentes a 3 — tercer botón "Tratamientos" en el mismo pill group
- Icono: `Syringe` de lucide-react
- Persistencia del tab activo: extender tipo `Vista` de `"lista" | "embudo"` a `"lista" | "embudo" | "tratamientos"`
- Mes seleccionado: no persistir — siempre arranca en el mes actual

**Estados de turnos en la lista de tratamientos**
- Todos los estados — PROGRAMADO, REALIZADO y CANCELADO se muestran
- Turnos CANCELADOS — fila atenuada (opacity reducida)
- Orden — cronológico ascendente

**Header del tab — resumen del mes**
- Total + breakdown por estado: `"12 tratamientos (8 realizados, 3 programados, 1 cancelado)"`
- Solo estados con count > 0 aparecen en el breakdown

**Empty states**
- Sin turnos: "Sin tratamientos en [Mes Año]" + "Los turnos con tipo de tratamiento aparecerán aquí"
- Sin profesional: "Seleccioná un profesional para ver los tratamientos."

### Claude's Discretion
- Implementación del layout interno del tab (componente separado vs. inline en page.tsx)
- Estructura exacta del breakdown en el header (badges, texto, separadores)
- Diseño del atenuado en filas canceladas (opacity class, text-muted, o combinación)
- Si el `Syringe` icon no existe en la versión instalada de lucide-react, usar `Stethoscope` o `Activity` como fallback
- Backend: si el endpoint `/turnos/rango` es suficiente filtrando `flujoPaciente = TRATAMIENTO` del lado cliente, o si conviene un endpoint dedicado `/turnos/tratamientos-mes`

### Deferred Ideas (OUT OF SCOPE)
- TRAT-07: Monto cobrado por paciente en el mes (requiere join Cobro/Factura)
- TRAT-08: Export CSV de la lista
- TRAT-09: Pantalla de reclasificación masiva de PENDIENTE
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FLUJO-05 | La lista de pacientes muestra badge de flujo por paciente: CIRUGIA (azul), TRATAMIENTO (verde), PENDIENTE (amber), sin clasificar/legacy (gris) | Backend `obtenerListaPacientes` no devuelve `flujo`; requiere agregar campo en `PacienteListaDto` + select en service; frontend requiere nueva columna en `createPacienteColumns()` y badge en `PacienteDetails` |
| TRAT-01 | La página de pacientes tiene un nuevo tab "Tratamientos" junto a "Embudo" y "Lista" | `page.tsx` tiene `Vista` type y pill buttons — extensión directa a 3 valores |
| TRAT-02 | El tab muestra todos los turnos del mes con tipo de flujo TRATAMIENTO del profesional, ordenados por día | `useTurnosRango` trae todos los turnos sin filtrar por `flujoPaciente`; el filtro TRATAMIENTO debe hacerse client-side sobre los datos (o con endpoint dedicado); `obtenerTurnosPorRango` en backend no incluye `flujoPaciente` en el select |
| TRAT-03 | La lista es navegable por mes (botones anterior / actual / siguiente), con el mes actual como default | Estado local `selectedMonth` (Date) en `TratamientosTab` component; `format(startOfMonth, 'yyyy-MM-dd')` + `format(endOfMonth, 'yyyy-MM-dd')` como params de useTurnosRango |
| TRAT-04 | La lista es filtrable por tipo de turno de tratamiento (dropdown, "Todos" por defecto) | `useTiposTurno()` disponible; filtro client-side sobre `turnosData` ya cargados — no refetch por cambio de filtro |
| TRAT-05 | Cada fila muestra: fecha+hora, nombre del paciente (clickable al drawer), tipo de turno, estado del turno | `TurnoRango` type en `useTurnosRangos.ts` tiene `inicio`, `paciente.id`, `paciente.nombreCompleto`, `tipoTurno.nombre`, `estado`; clickable abre `PatientDrawer` |
| TRAT-06 | El header del tab muestra el total de tratamientos del mes seleccionado | Derivado de los datos filtrados ya en memoria; breakdown de estados solo con count > 0 |
</phase_requirements>

## Summary

Phase 25 es puramente frontend. Dos entregables independientes: (1) un nuevo tab "Tratamientos" en `/dashboard/pacientes` con lista mensual de turnos tipo TRATAMIENTO, y (2) badges de flujo en la tabla general de pacientes y en el drawer de detalle.

El backend necesita dos cambios menores antes de que el frontend pueda funcionar correctamente: (a) `obtenerListaPacientes` no incluye `flujo` en `PacienteListaDto` — hay que agregar el campo; (b) `obtenerTurnosPorRango` no incluye `tipoTurno.flujoPaciente` en el select — hay que agregar ese campo para poder filtrar client-side. Alternativamente, el filtro puede hacerse con un endpoint dedicado, pero la decisión está marcada como "Claude's Discretion" y el enfoque client-side sobre datos ya cargados es más simple.

`Syringe` existe en lucide-react v0.553.0 (verificado en node_modules). La infrastructura de TanStack Query, shadcn/ui Badge, y Tailwind cn() ya están en uso en componentes adyacentes; no se necesitan nuevas dependencias.

**Primary recommendation:** Client-side filter approach — extend `useTurnosRango` type to include `tipoTurno.flujoPaciente`, update backend select, filter in `TratamientosTab` component. Keeps data fetching simple and consistent with existing patterns.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TanStack Query | (project-installed) | Data fetching + caching | Already used in `useTurnosRango`, `useTiposTurno`, `usePacientes` |
| TanStack Table | (project-installed) | Column definitions, sorting | Already used via `DataTable` + `createPacienteColumns()` |
| lucide-react | ^0.553.0 | Icons (Syringe, ChevronLeft, ChevronRight) | Project standard; Syringe confirmed available |
| shadcn/ui Badge | (project-installed) | Flujo badges, status chips | Used throughout existing components |
| shadcn/ui Button | (project-installed) | Month nav buttons, pill toggle | Already used in page.tsx pill buttons |
| Tailwind CSS + cn() | (project-installed) | Conditional classes, focus mode | Pattern in all dashboard components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns or native Date | (use native — no new dep) | Month start/end calculation, formatting | Derive ISO strings for useTurnosRango params |

**Installation:** No new dependencies required.

## Architecture Patterns

### Recommended Project Structure

```
frontend/src/app/dashboard/pacientes/
├── page.tsx                          # Extend Vista type, add 3rd pill button, render <TratamientosTab />
├── components/
│   ├── columns.tsx                   # Add 'flujo' ColumnDef to createPacienteColumns()
│   ├── TratamientosTab.tsx           # NEW — self-contained tab component
│   ├── PatientDrawer.tsx             # No change needed (passes pacienteId to PacienteDetails)
│   ├── PacienteDetails.tsx           # Add flujo badge in header section
│   └── PacientesDataTable.tsx        # No change needed

backend/src/modules/
├── pacientes/dto/paciente-lista.dto.ts   # Add flujo?: FlujoPaciente | null
├── pacientes/pacientes.service.ts        # Add flujo to select in obtenerListaPacientes
├── turnos/turnos.service.ts              # Add flujoPaciente to tipoTurno select in obtenerTurnosPorRango
```

### Pattern 1: Extending Vista Type and Pill Buttons

**What:** Minimal change to `page.tsx` — add `"tratamientos"` to the union type, add third button, render `<TratamientosTab />`.

**When to use:** Whenever adding a new top-level view to the pacientes page.

**Example:**
```typescript
// page.tsx — extend type
type Vista = "lista" | "embudo" | "tratamientos";

// Add third pill button (same pattern as Embudo/Lista)
<Button
  variant={vista === "tratamientos" ? "default" : "ghost"}
  size="sm"
  className={cn("h-8 gap-1.5", ...)}
  onClick={() => cambiarVista("tratamientos")}
>
  <Syringe size={15} />
  Tratamientos
</Button>

// Render new tab
{vista === "tratamientos" && (
  <TratamientosTab profesionalId={efectiveProfesionalId} />
)}
```

### Pattern 2: Month Navigation State

**What:** Local state for selected month, derives ISO date strings for `useTurnosRango`.

**When to use:** Any time a component needs month-scoped pagination without persistence.

**Example:**
```typescript
// TratamientosTab.tsx
const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1); // start of current month
});

// Derive params
const desde = format(selectedMonth, 'yyyy-MM-dd'); // e.g. "2026-04-01"
const hasta = format(endOfMonth(selectedMonth), 'yyyy-MM-dd'); // e.g. "2026-04-30"

// Navigate
const prevMonth = () => setSelectedMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
const nextMonth = () => setSelectedMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
```

Note: Use native Date arithmetic (no new dependencies). `endOfMonth` can be computed as `new Date(year, month + 1, 0)`.

### Pattern 3: Flujo Badge Component

**What:** Inline badge component mapping `FlujoPaciente | null` to color + label.

**When to use:** In columns.tsx (table column) and PacienteDetails (drawer header).

**Example:**
```typescript
// Reusable — could live inline in columns.tsx or in a shared location
type FlujoPaciente = 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' | null;

const FLUJO_CONFIG: Record<string, { label: string; className: string }> = {
  CIRUGIA:     { label: 'CIR',  className: 'bg-blue-100 text-blue-700' },
  TRATAMIENTO: { label: 'TRAT', className: 'bg-green-100 text-green-700' },
  PENDIENTE:   { label: 'PEND', className: 'bg-amber-100 text-amber-700' },
};

function FlujoBadge({ flujo }: { flujo: FlujoPaciente }) {
  const config = flujo ? FLUJO_CONFIG[flujo] : null;
  return (
    <span className={cn('px-2 py-1 rounded text-xs font-medium',
      config ? config.className : 'bg-gray-100 text-gray-500'
    )}>
      {config ? config.label : '—'}
    </span>
  );
}
```

### Pattern 4: Client-Side Filter for Tipo Turno

**What:** Filter already-loaded TurnoRango[] by `tipoTurnoId` without triggering a new fetch.

**When to use:** Dropdown filters over a bounded dataset (one month of turnos — typically < 200 records).

**Example:**
```typescript
// TratamientosTab.tsx
const [filterTipoId, setFilterTipoId] = useState<string | null>(null);

// Derived — filter tratamiento turnos then apply tipo filter
const tratamientoTurnos = (turnosData ?? []).filter(
  t => t.tipoTurno.flujoPaciente === 'TRATAMIENTO'
);
const visibleTurnos = filterTipoId
  ? tratamientoTurnos.filter(t => t.tipoTurno.id === filterTipoId)
  : tratamientoTurnos;

// Dropdown options — only tipos that appear in tratamientoTurnos
const tiposEnMes = useTiposTurno().data?.filter(
  tipo => tratamientoTurnos.some(t => t.tipoTurno.id === tipo.id)
) ?? [];
```

### Pattern 5: Cancelled Row Visual Attenuation

**What:** Apply reduced opacity to the entire row for CANCELADO state.

**When to use:** Any list where cancelled/inactive records need to remain visible but de-emphasized.

**Example:**
```typescript
// In TratamientosTab row rendering
<tr className={cn(
  "border-b transition-colors",
  turno.estado === 'CANCELADO' && "opacity-40"
)}>
```

### Anti-Patterns to Avoid

- **Fetching per filter change:** Don't call a new endpoint each time the tipo dropdown changes — filter client-side over the already-loaded month data.
- **Re-implementing DataTable for tratamientos:** The existing `<DataTable>` is for the full pacientes list with sorting/filtering. Tratamientos list is simpler — a plain `<table>` or `<div>`-based list is sufficient and avoids column definition overhead.
- **Persisting selectedMonth in localStorage:** Explicitly decided NOT to persist — always reset to current month on tab entry.
- **Showing flujo badge only when non-null:** Decided to always show — null gets grey "—" badge.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Badge colors | Custom CSS variables | Tailwind utility classes (`bg-blue-100 text-blue-700`) | Already the pattern in columns.tsx `map` object |
| Month start/end dates | Date library | Native Date arithmetic `new Date(y, m, 0)` | Simple enough, no new dep needed |
| Drawer open state | Custom modal system | Existing `PatientDrawer` + `useState(pacienteId)` | Already used in KanbanBoard and other components |
| Loading skeleton | Custom spinner | `<Skeleton>` from shadcn/ui | Already imported in PacientesDataTable |

## Common Pitfalls

### Pitfall 1: `flujo` Not in Backend Response
**What goes wrong:** `PacienteListItem` type and `PacienteListaDto` both lack `flujo`. The badge will show "—" for every patient.
**Why it happens:** The `flujo` field was added to `Paciente` model in Phase 22 but `obtenerListaPacientes` was not updated to include it in the response.
**How to avoid:** Add `flujo: FlujoPaciente | null` to `PacienteListaDto`, add `flujo: true` to the Prisma select in `obtenerListaPacientes`, and add `flujo?: FlujoPaciente | null` to `PacienteListItem` in `frontend/src/types/pacients.ts`.
**Warning signs:** All badges display "—" grey in the table even for patients known to have CIRUGIA flujo.

### Pitfall 2: `tipoTurno.flujoPaciente` Not in `TurnoRango` Select
**What goes wrong:** Can't filter TRATAMIENTO turnos client-side — `flujoPaciente` is not returned by `obtenerTurnosPorRango`.
**Why it happens:** The backend select only returns `{ id, nombre }` for `tipoTurno` — no `flujoPaciente`.
**How to avoid:** Add `flujoPaciente: true` to the `tipoTurno` select in `obtenerTurnosPorRango`, and update `TurnoRango` type in `useTurnosRangos.ts` to include `tipoTurno.flujoPaciente`.
**Warning signs:** `tratamientoTurnos` array is always empty even when TRATAMIENTO turnos exist.

### Pitfall 3: Month Date Range Off-by-One (Timezone)
**What goes wrong:** The existing `obtenerTurnosPorRango` uses `getDayRange(ISO)` which converts dates without UTC issues. But constructing the "last day of month" incorrectly can miss the last day.
**Why it happens:** `new Date('2026-04-30')` in a JS client may be interpreted as UTC midnight, which becomes April 29 23:00 in UTC-3.
**How to avoid:** Build the ISO string as `"yyyy-MM-dd"` format and let the backend's `getDayRange` handle the timezone conversion. Use `new Date(year, month + 1, 0)` to get last day of month as a local date, then format it as `"yyyy-MM-dd"` (local).
**Warning signs:** Last day of month has no turnos even though they exist.

### Pitfall 4: Focus Mode Classes Missing
**What goes wrong:** New `TratamientosTab` component renders without focus mode styling — looks jarring when `fm` is enabled.
**Why it happens:** Forgetting to import `useUIStore` and wrap className conditions with `cn(..., fm && "...")`.
**How to avoid:** Follow the pattern from `page.tsx` — import `useUIStore`, extract `focusModeEnabled: fm`, apply `cn()` to container backgrounds and text colors.

### Pitfall 5: `indicacionesEnviadas` Missing from `PacienteListItem`
**What goes wrong:** Not directly related to Phase 25, but worth noting: the existing `PacienteListItem` type already lacks some fields present in `PacienteListaDto`. When adding `flujo`, also add `indicacionesEnviadas` if it's used by `getPatientAlerts`.
**Why it happens:** Type drift between backend DTO and frontend type.
**How to avoid:** When editing `pacients.ts`, ensure `flujo` is the only addition needed — `indicacionesEnviadas` is already cast as `any` in `columns.tsx` so don't change that scope.

## Code Examples

### Adding `flujo` to backend DTO and service

```typescript
// backend/src/modules/pacientes/dto/paciente-lista.dto.ts
import { FlujoPaciente } from '@prisma/client';

export class PacienteListaDto {
  // ... existing fields ...
  flujo?: FlujoPaciente | null;
}
```

```typescript
// backend/src/modules/pacientes/pacientes.service.ts
// In obtenerListaPacientes, the paciente object comes from prisma.findMany with include
// The flujo field is on the Paciente model directly — no join needed
// Just add it to the return mapping:
return {
  // ... existing fields ...
  flujo: p.flujo ?? null,
} satisfies PacienteListaDto;
```

Note: The `include:` query already fetches the full `Paciente` row, so `p.flujo` is already available — no Prisma query change needed, only add it to the mapped return object.

### Adding `flujoPaciente` to turnos rango backend select

```typescript
// backend/src/modules/turnos/turnos.service.ts — in obtenerTurnosPorRango
tipoTurno: {
  select: {
    id: true,
    nombre: true,
    flujoPaciente: true,   // ADD THIS
  },
},
```

### Updating `TurnoRango` frontend type

```typescript
// frontend/src/hooks/useTurnosRangos.ts
export type TurnoRango = {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  observaciones?: string | null;
  paciente: { id: string; nombreCompleto: string };
  tipoTurno: {
    id: string;
    nombre: string;
    flujoPaciente?: string | null;   // ADD THIS
  };
};
```

### Month range calculation (no new deps)

```typescript
function getMonthRange(month: Date): { desde: string; hasta: string } {
  const y = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0); // day 0 of next month = last day of current
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { desde: fmt(firstDay), hasta: fmt(lastDay) };
}
```

### Month label format

```typescript
// "Abril 2026" — es-AR locale
const monthLabel = selectedMonth.toLocaleDateString('es-AR', {
  month: 'long',
  year: 'numeric',
});
// Returns "abril de 2026" — capitalize first letter if needed:
const label = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
// Or use a simple lookup: MESES[month.getMonth()] + ' ' + year
```

### Flujo column in createPacienteColumns

```typescript
// frontend/src/app/dashboard/pacientes/components/columns.tsx
{
  accessorKey: "flujo",
  header: "Flujo",
  cell: ({ row }) => <FlujoBadge flujo={row.original.flujo ?? null} />,
},
```

### Flujo badge in PacienteDetails header

```typescript
// After the nombre/edad/dni block in PacienteDetails, add:
{(paciente as any).flujo && (
  <FlujoBadge flujo={(paciente as any).flujo} />
)}
// Or always show (as per decisions):
<FlujoBadge flujo={(paciente as any).flujo ?? null} />
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Vista = "lista" \| "embudo"` | `Vista = "lista" \| "embudo" \| "tratamientos"` | Phase 25 | Simple union extension |
| `PacienteListaDto` without `flujo` | Include `flujo` field | Phase 25 | Backend DTO needs additive update |
| `TurnoRango.tipoTurno` = `{id, nombre}` | Add `flujoPaciente` | Phase 25 | Enables client-side TRATAMIENTO filter |

## Open Questions

1. **Client-side filter vs. dedicated endpoint for TRATAMIENTO turnos**
   - What we know: `useTurnosRango` loads all turnos for the month (max ~200 records for a busy practice); filtering client-side is O(n) and trivial
   - What's unclear: Whether the product will later need server-side pagination for high-volume practices
   - Recommendation: Client-side filter. The CONTEXT.md marks this as Claude's Discretion, and client-side is simpler, avoids a backend change, and consistent with the TRAT-04 filter pattern.

2. **`flujo` field on `PacienteDetalle` type (for the drawer)**
   - What we know: `PacienteDetalle` in `pacients.ts` also lacks `flujo`; `PacienteDetails.tsx` accesses the field as `(paciente as any).flujo` style
   - What's unclear: Whether `usePaciente` hook response includes `flujo` from the backend
   - Recommendation: Check `pacientes.service.ts` `obtenerDetallePaciente` (around line 297) and add `flujo` to that select/return too; or cast as `any` in the badge component for now.

## Sources

### Primary (HIGH confidence)
- Direct codebase read — `frontend/src/app/dashboard/pacientes/page.tsx` — confirmed Vista type, pill buttons, localStorage pattern
- Direct codebase read — `frontend/src/app/dashboard/pacientes/components/columns.tsx` — confirmed createPacienteColumns pattern
- Direct codebase read — `frontend/src/hooks/useTurnosRangos.ts` — confirmed TurnoRango type and params
- Direct codebase read — `backend/src/modules/turnos/turnos.service.ts` — confirmed obtenerTurnosPorRango select (no flujoPaciente)
- Direct codebase read — `backend/src/modules/pacientes/dto/paciente-lista.dto.ts` — confirmed flujo is absent
- Direct codebase read — `backend/src/modules/pacientes/pacientes.service.ts` — confirmed obtenerListaPacientes include (flujo available but not mapped)
- Node.js verification — lucide-react v0.553.0 has `Syringe`, `Stethoscope`, `Activity` icons
- Direct codebase read — `.planning/config.json` — nyquist_validation_enabled: false

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in package.json and node_modules
- Architecture: HIGH — all integration points verified against actual source files
- Pitfalls: HIGH — identified by reading actual DTO/service/type files; not hypothetical

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable frontend codebase)
