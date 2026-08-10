# Phase 64: Indicadores de Pendientes y Planilla Legible (Frontend) - Pattern Map

**Mapped:** 2026-07-31
**Files analyzed:** 5 (2 frontend components, 1 frontend hook, 2 backend files)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `frontend/src/components/crm/PatientCard.tsx` | component | request-response (renders fetched data) | `frontend/src/app/dashboard/reportes/components/ProximosTurnos.tsx` (Badge-in-card) + itself (columnId branching already present in-file) | role-match (Badge usage) / exact (branch condition) |
| `frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx` | component (table cell) | request-response | `frontend/src/app/dashboard/turnos/CalendarGrid.tsx` (Tooltip wrapping truncated text) | role-match |
| `frontend/src/hooks/useTurnosRangos.ts` | hook (TanStack Query type) | CRUD (GET) | `frontend/src/hooks/useCRMKanban.ts` (`KanbanPatient` type, same file-family pattern) | exact |
| `backend/src/modules/turnos/turnos.service.ts` (`/turnos/rango` builder ~589-598) | service (response mapper) | request-response | `backend/src/modules/pacientes/pacientes.service.ts` `getKanban` mapper (~717-733) | exact |
| `backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts` (`resumirTratamientosDeContenido`) | utility (pure transform) | transform | itself — extend in place, no external analog needed (self-contained pure function) | exact (self) |

## Pattern Assignments

### `frontend/src/components/crm/PatientCard.tsx` (component, badge insertion)

**Analog A — Badge component usage:** `frontend/src/app/dashboard/reportes/components/ProximosTurnos.tsx:4,19-38`

```typescript
import { Badge } from "@/components/ui/badge";

const getEstadoBadge = (estado: string) => {
  switch (estado) {
    case "CONFIRMADO":
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          Confirmado
        </Badge>
      );
    case "PENDIENTE":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          Pendiente
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          {estado}
        </Badge>
      );
  }
};
```
Take from this: `variant="outline"` + custom color classes is the established idiom for status-driven badges in this codebase (not `variant="default"/"secondary"`). Follow this for the new pendiente badge — pick a color that reads as "action needed" (e.g. amber/orange, consistent with the existing `Espera` / `Aut. pendiente` spans' amber/purple accents already in the same card).

**Analog B — existing badge zone + columnId branching (same file):** `frontend/src/components/crm/PatientCard.tsx:120-147`

```typescript
{/* Lista de espera badge */}
{patient.enListaEspera && (
  <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-1.5 py-0.5 rounded border border-amber-400 text-amber-600 font-medium">
    ⏰ Espera
  </span>
)}

{/* Autorización pendiente badge */}
{(patient.pendingAutorizaciones ?? 0) > 0 && (
  <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-1.5 py-0.5 rounded border border-purple-400 text-purple-600 font-medium">
    🛡 Aut. pendiente ({patient.pendingAutorizaciones})
  </span>
)}

{/* EMBUDO-03 / SC3: orange indicator for Cirugía Realizada patients with pending steps */}
{columnId === "PROCEDIMIENTO_REALIZADO" && !patient.todosCompletos && (
  <span className="inline-flex items-center gap-1.5 mt-1.5 text-xs px-1.5 py-0.5 rounded border border-orange-400 text-orange-600 font-medium bg-orange-50">
    <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
    Pasos pendientes
  </span>
)}

{/* CONTACTO-01 / CONTACTO-02 / SC4: contact label for Confirmado patients */}
{columnId === "CONFIRMADO" && (
  <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-1.5 py-0.5 rounded border border-blue-400 text-blue-600 font-medium bg-blue-50">
    {patient.pasos?.cirugia === "completo" ? "Cirugía programada" : "Espera fecha"}
  </span>
)}
```
This confirms D-04: existing conditional badges branch on `columnId` (a prop passed in from `KanbanColumn.tsx`, not `patient.etapaCRM`), e.g. `columnId === "PROCEDIMIENTO_REALIZADO"`, `columnId === "CONFIRMADO"`. The new pendiente badge should follow this exact idiom: `columnId === "NUEVO_LEAD"` → `<Badge>Dar turno</Badge>`, `columnId === "TURNO_AGENDADO"` → `<Badge>Ser atendido</Badge>`. Insert alongside these blocks (same "zona de registro de contacto inferior", before or after the `enListaEspera`/`pendingAutorizaciones` spans, per D-03).

**Note on mixing patterns:** D-01 explicitly says use the `Badge` *component* (not a hand-rolled `<span>`) for this new indicator, even though the surrounding badges in this file are spans. Do not refactor the existing spans — only the new pendiente indicator uses `<Badge>`.

**Props/imports needed:**
```typescript
import { Badge } from "@/components/ui/badge";
```
`columnId: string` is already a prop of `PatientCard` (line 35 of the interface) — no new prop needed.

---

### `frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx` (table cell, request-response)

**Current cell to replace** (lines 272-292):
```typescript
<td className="py-2 px-3">
  {turno.ultimoTratamiento ? (
    <button
      onClick={() => {
        setDrawerInitialView("historia");
        setSelectedPacienteId(turno.paciente.id);
      }}
      className={cn(
        "text-left hover:underline font-medium truncate max-w-[200px] block",
        fm ? "text-[var(--fc-text-primary)]" : "text-gray-800"
      )}
      title={turno.ultimoTratamiento}
    >
      {turno.ultimoTratamiento}
    </button>
  ) : (
    <span className={cn(fm ? "text-[var(--fc-text-secondary)]" : "text-gray-400")}>
      —
    </span>
  )}
</td>
```
`className="... truncate max-w-[200px] block"` is the CSS-truncate pattern already in place (D-05 requirement) — keep this, just swap the data source to the joined full list and replace `title={...}` with Radix `Tooltip`.

**Analog — Radix Tooltip wrapping truncated content:** `frontend/src/app/dashboard/turnos/CalendarGrid.tsx:6-9` (imports), `:579-581` (wrap), `:636-645` (truncated trigger content), `:677-696` (content + close)

```typescript
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

// ...
<TooltipProvider key={item.event.id}>
  <Tooltip>
    <TooltipTrigger asChild>
      <div /* ...trigger element with truncate classes... */>
        <div className="font-semibold truncate text-[11px] leading-tight pr-3">
          {item.event.tipo}
        </div>
      </div>
    </TooltipTrigger>
    <TooltipContent className="shadow-lg text-xs p-2.5 rounded-lg space-y-1 ...">
      <p className="font-semibold">{item.event.tipo}</p>
      {/* ... */}
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Simpler analog (button trigger, single-line content):** `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx:24-26,311-328`

```typescript
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// ...
<Tooltip>
  <TooltipTrigger asChild>
    {/* the button/element that would otherwise carry a native title */}
  </TooltipTrigger>
  <TooltipContent>El paciente no tiene opt-in para WhatsApp</TooltipContent>
</Tooltip>
```

**IMPORTANT — no explicit `TooltipProvider` needed:** `frontend/src/components/ui/tooltip.tsx:21-29` shows the local `Tooltip` component already wraps itself in a `TooltipProvider` internally:
```typescript
function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}
```
So `<Tooltip><TooltipTrigger asChild>...</TooltipTrigger><TooltipContent>...</TooltipContent></Tooltip>` is sufficient without an extra outer `<TooltipProvider>` (the `CalendarGrid.tsx` usage adds one anyway, but it's redundant, not required — `PacienteDetails.tsx`'s simpler usage omits it and still works). Recommend following the `PacienteDetails.tsx` minimal form for the new cell (no need for `TooltipProvider` wrapper, `asChild` on `TooltipTrigger` around the existing `<button>`).

**Recommended new cell shape** (combining D-05/D-06, using the new array field — exact field name is Claude's discretion per CONTEXT.md):
```typescript
<td className="py-2 px-3">
  {turno.tratamientos && turno.tratamientos.length > 0 ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => {
            setDrawerInitialView("historia");
            setSelectedPacienteId(turno.paciente.id);
          }}
          className={cn(
            "text-left hover:underline font-medium truncate max-w-[200px] block",
            fm ? "text-[var(--fc-text-primary)]" : "text-gray-800"
          )}
        >
          {turno.tratamientos.join(", ")}
        </button>
      </TooltipTrigger>
      <TooltipContent>{turno.tratamientos.join(", ")}</TooltipContent>
    </Tooltip>
  ) : (
    <span className={cn(fm ? "text-[var(--fc-text-secondary)]" : "text-gray-400")}>—</span>
  )}
</td>
```
Note: `turno.ultimoTratamiento` stays untouched elsewhere in this file (used for the source-B filter at line 65: `isFuenteB(t) && t.ultimoTratamiento != null` — do not remove/rename that field).

---

### `frontend/src/hooks/useTurnosRangos.ts` (hook, CRUD/GET)

**Current type** (lines 4-14):
```typescript
export type TurnoRango = {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  observaciones?: string | null;
  paciente: { id: string; nombreCompleto: string };
  tipoTurno: { id: string; nombre: string; flujoPaciente?: string | null };
  ultimoTratamiento?: string | null;
  tipoEntradaHC?: string | null;
};
```

**Analog for adding a new field to a similar TanStack Query response type:** `frontend/src/hooks/useCRMKanban.ts:36-64` (`KanbanPatient`) shows the established idiom of appending new backend-exposed fields with a phase-comment:
```typescript
// Phase 36 — expuesto por backend desde Phase 35
flujo: 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' | null;
// Phase 58 — expuesto por backend desde Phase 57 (computePasosCrm spread)
pasos: PasosCrm;
todosCompletos: boolean;
// Phase 62 (INDIC-05) — display-only fecha de lectura de indicaciones;
// NO gobierna pasos.indicacionesPreop (eso sigue siendo computePasosCrm).
indicacionesLeidasAt: string | null;
```
Follow this comment convention for the new field on `TurnoRango`, e.g.:
```typescript
ultimoTratamiento?: string | null;
// Phase 64 (TRAT-07) — lista completa de nombres de tratamiento sin colapsar;
// ultimoTratamiento se mantiene sin cambios para compatibilidad.
tratamientos?: string[];
tipoEntradaHC?: string | null;
```

---

### `backend/src/modules/turnos/turnos.service.ts` (service, response mapper for `/turnos/rango`)

**Current builder** (lines 578-598):
```typescript
entradaHC: {
  select: {
    tipoEntrada: true,
    contenido: true,
  },
},
// ...
if (turnos.length === 0) return [];

return turnos.map((t) => {
  const { entradaHC, ...rest } = t;
  return {
    ...rest,
    ultimoTratamiento: resumirTratamientosDeContenido(
      entradaHC?.contenido ?? null,
    ),
    tipoEntradaHC: entradaHC?.tipoEntrada ?? null,
  };
});
```
Import already present at line 27: `import { resumirTratamientosDeContenido } from '../historia-clinica/historia-clinica.contenido.helpers';` — add a sibling import for the new helper (e.g. `listarTratamientosDeContenido`) from the same module.

**Analog for adding a new field to a `.map()` response transform in a service:** `backend/src/modules/pacientes/pacientes.service.ts` `getKanban` (~717-733):
```typescript
return Object.entries(columnas).map(([etapa, items]) => ({
  etapa,
  total: items.length,
  pacientes: items.map((p) => {
    const presupuestoSeleccionado =
      p.presupuestos.find((pr) => pr.estado === 'ACEPTADO') ??
      p.presupuestos[0] ??
      null;
    return {
      id: p.id,
      nombreCompleto: p.nombreCompleto,
      // ...
      ultimoContactoNota: p.contactos[0]?.nota ?? null,
      ultimoContactoFecha: p.contactos[0]?.fecha ?? null,
      ultimoTurno: p.turnos[0]?.inicio ?? null,
      // ...
```
Pattern confirmed: new fields are appended inline in the object literal returned from `.map()`, derived from already-selected Prisma relations, with `?? null` fallback for empty/absent data — no separate DTO class is used for this response (plain object literal, typed only on the frontend `TurnoRango`/`KanbanPatient` types). Follow the same style:
```typescript
return turnos.map((t) => {
  const { entradaHC, ...rest } = t;
  return {
    ...rest,
    ultimoTratamiento: resumirTratamientosDeContenido(
      entradaHC?.contenido ?? null,
    ),
    tratamientos: listarTratamientosDeContenido(entradaHC?.contenido ?? null), // NEW — D-07
    tipoEntradaHC: entradaHC?.tipoEntrada ?? null,
  };
});
```
No changes needed to the Prisma `select` block (578-583) — `entradaHC.contenido` is already selected and is the sole source for both the collapsed string and the new full list.

---

### `backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts` (utility, pure transform)

**Existing function to extend/mirror** (lines 93-142):
```typescript
export function resumirTratamientosDeContenido(
  contenido: unknown,
): string | null {
  if (contenido === null || contenido === undefined || typeof contenido !== 'object') {
    return null;
  }
  const c = contenido as Record<string, unknown>;

  // Priority 1: v1.9 zona-grouped shape
  if (Array.isArray(c.zonas) && (c.zonas as unknown[]).length > 0) {
    const nombres = (
      c.zonas as Array<{ tratamientos?: Array<{ nombre?: unknown }> }>
    )
      .flatMap((z) => z.tratamientos ?? [])
      .map((t) => (typeof t.nombre === 'string' ? t.nombre.trim() : ''))
      .filter((n) => n.length > 0);

    return formatearResumen(nombres);
  }

  // Priority 2: flat tratamientos array (legacy + tratamiento_en_consultorio with catalog)
  if (Array.isArray(c.tratamientos)) {
    const nombres = (c.tratamientos as Array<{ nombre?: unknown }>)
      .map((t) => (typeof t.nombre === 'string' ? t.nombre.trim() : ''))
      .filter((n) => n.length > 0);

    if (nombres.length > 0) {
      return formatearResumen(nombres);
    }
  }

  // Priority 3: free text fallback
  if (typeof c.texto === 'string') {
    const texto = c.texto.trim();
    if (texto.length === 0) return null;
    if (texto.length > TEXTO_LIMITE) {
      return texto.slice(0, TEXTO_LIMITE).trimEnd() + '…';
    }
    return texto;
  }

  return null;
}

function formatearResumen(nombres: string[]): string | null {
  if (nombres.length === 0) return null;
  if (nombres.length === 1) return nombres[0];
  return `${nombres[0]} +${nombres.length - 1}`;
}
```
Do **not** modify `formatearResumen` or `resumirTratamientosDeContenido` (D-07: keep `ultimoTratamiento` unchanged for compatibility). Two options per CONTEXT.md Claude's Discretion:
1. Extract the shared "collect nombres[]" logic (priorities 1 & 2) into a private helper reused by both `resumirTratamientosDeContenido` (which still collapses via `formatearResumen`) and a new exported `listarTratamientosDeContenido(contenido: unknown): string[]` that returns the raw array.
2. Or write `listarTratamientosDeContenido` as a parallel, mostly-duplicated function mirroring the same 3-priority branching but returning `string[]` (free-text case returns `[texto]` untruncated, or `[]` — decision flagged as open in CONTEXT.md discretion section).

Given the existing file already factors `formatearResumen` out as a small private helper (line 150-154), option 1 (extract the "collect nombres[]" branch logic into a shared private helper, e.g. `extraerNombresTratamiento(contenido): string[]`) is the more idiomatic fit with the file's existing structure — both public functions would call it, then diverge only in the final format step (join vs. collapse).

**Existing test file to extend:** `backend/src/modules/historia-clinica/historia-clinica.contenido.spec.ts` — has fixed assertions like `"Lipoaspiración +2"` for `resumirTratamientosDeContenido`; add parallel `describe`/`it` blocks for the new function without touching existing assertions (D-07 explicitly requires `ultimoTratamiento`/`formatearResumen` output unchanged).

---

## Shared Patterns

### Badge component (shadcn/CVA)
**Source:** `frontend/src/components/ui/badge.tsx:7-26`
**Apply to:** `PatientCard.tsx` new pendiente indicator
```typescript
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 ...",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground ...",
        secondary: "border-transparent bg-secondary text-secondary-foreground ...",
        destructive: "border-transparent bg-destructive text-white ...",
        outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)
```
Codebase convention (per `ProximosTurnos.tsx`) is `variant="outline"` + custom Tailwind color classes (`className="bg-X-50 text-X-700 border-X-200"`) rather than `default`/`secondary`/`destructive` alone.

### Radix Tooltip (self-contained provider)
**Source:** `frontend/src/components/ui/tooltip.tsx:21-29`
**Apply to:** `TratamientosTab.tsx` cell
```typescript
function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}
```
No need to add a `TooltipProvider` at a higher level in `TratamientosTab.tsx` or its parent — each `<Tooltip>` instance is self-providing.

### Response-mapper field addition (backend service `.map()`)
**Source:** `backend/src/modules/pacientes/pacientes.service.ts` `getKanban` (~717-733), mirrored in `turnos.service.ts` `/turnos/rango` builder (~589-598)
**Apply to:** `turnos.service.ts` rango builder
Plain object literal appended field with `?? null`/derivation from already-`select`ed Prisma relation — no new DTO class, no schema/migration needed since `entradaHC.contenido` is already fetched.

### Frontend type field addition with phase-comment convention
**Source:** `frontend/src/hooks/useCRMKanban.ts:56-63`
**Apply to:** `useTurnosRangos.ts` `TurnoRango` type
New fields get a `// Phase NN (REQ-ID) — description` comment above them explaining what backend exposes and why, especially when there's a related-but-unchanged field nearby (like `pasos` vs `todosCompletos`, or here `tratamientos` vs `ultimoTratamiento`).

## No Analog Found

None — all 5 files in scope have at least a role-match or exact analog in the codebase.

## Metadata

**Analog search scope:** `frontend/src/components/`, `frontend/src/app/dashboard/`, `frontend/src/hooks/`, `backend/src/modules/turnos/`, `backend/src/modules/pacientes/`, `backend/src/modules/historia-clinica/`
**Files scanned:** ~30 (via `grep -rl` for `ui/badge` and `ui/tooltip` imports, plus the 7 canonical files read in full/targeted ranges)
**Pattern extraction date:** 2026-07-31
