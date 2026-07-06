# Phase 30: Tab Tratamientos Último Tratamiento - Research

**Researched:** 2026-05-07
**Domain:** Full-stack feature addition — Prisma sub-query, NestJS service, TanStack Query key, React table column
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- La vista mensual por-turno (una fila por appointment de tipo TRATAMIENTO) se mantiene sin cambios
- La columna "Último tratamiento" se agrega como 5ta columna al final: Fecha y hora / Paciente / Tipo de turno / Estado / Último tratamiento
- La celda es clickeable cuando hay tratamiento: abre el PatientDrawer del paciente directo en la tab Historia Clínica
- El nombre del paciente (columna 2) sigue abriendo el PatientDrawer en la tab por defecto como antes
- Muestra solo el nombre del tratamiento de catálogo (sin fecha)
- Si la última entrada HC tiene múltiples tratamientos, se listan todos separados por coma: e.g. "Botox Frente, Relleno Labial"
- El texto clickeable usa el mismo estilo que el nombre del paciente: `hover:underline font-medium` — sin color azul explícito
- Cuando el paciente no tiene ningún tratamiento de catálogo en HC: la celda muestra "—" (dash largo) en texto muted/secundario (`text-gray-400` / focus-mode `text-[var(--fc-text-secondary)]`)
- El dash no es clickeable — solo texto informativo
- El "último tratamiento" se enriquece en el endpoint existente de turnos (GET /turnos rango) — no un endpoint separado por paciente, evita N+1
- Al guardar una HC con tratamiento (desde LiveTurno o PatientDrawer), se invalida `['turnosRango']` para que la columna se refresque automáticamente
- El refetch ocurre cuando el tab Tratamientos está activo (TanStack Query default: refetch on window focus / query active)

### Claude's Discretion
- Header exacto de la columna ("Último tratamiento" o "Últ. tratamiento" si el espacio es acotado)
- Truncado con ellipsis si la lista de tratamientos es muy larga
- Posición exacta del tab target al abrir PatientDrawer desde la columna (pasar prop `defaultTab="hc"` o similar)
- Query key exacta a invalidar (`['turnosRango', profesionalId, desde, hasta]` o partial match)

### Deferred Ideas (OUT OF SCOPE)
None — la discusión se mantuvo dentro del scope de Phase 30.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAC-01 | El tab Tratamientos muestra una columna con el último tratamiento registrado por paciente (nombre del tratamiento del catálogo) | Backend sub-query on `obtenerTurnosPorRango`, new `ultimoTratamiento` field in response shape, frontend column in TratamientosTab, query invalidation in `useCreateHistoriaClinicaEntry` |
</phase_requirements>

---

## Summary

Phase 30 adds a single read-only column to the existing `TratamientosTab` table. The data originates from `HistoriaClinicaEntrada.contenido` (a `Json?` field) which stores `tratamientos: [{id, nombre}]` for entries of type `tratamiento_en_consultorio` and `primera_vez`. The "último tratamiento" is the comma-joined names from the most recent such entry per patient.

The canonical design avoids N+1 by enriching the existing `obtenerTurnosPorRango` service method: after fetching turnos, a single additional query aggregates the latest HC entry per patient (grouped by `pacienteId`) using Prisma's raw or grouped queries. The result shape adds `ultimoTratamiento: string | null` to each turno's response object.

On the frontend, `TurnoRango` type gains `ultimoTratamiento?: string | null`, `TratamientosTab` gets a 5th column, and `useCreateHistoriaClinicaEntry` gains a `['turnos', 'rango']` partial-key invalidation so the column refreshes after any HC save.

**Primary recommendation:** Add `ultimoTratamiento` enrichment directly in `TurnosService.obtenerTurnosPorRango` via a post-fetch batch query; extend `TurnoRango` type; add column to `TratamientosTab`; add `PatientDrawer` open with `initialView="historia"`; invalidate `['turnos', 'rango']` in `useCreateHistoriaClinicaEntry`.

---

## Standard Stack

### Core (already in use — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | (project version) | DB query for last HC entry with tratamientos | Already in backend; `findFirst` + JSON path filter |
| TanStack Query | (project version) | Cache invalidation for `['turnos', 'rango']` | Already in frontend; `invalidateQueries` partial key |
| React + TypeScript | (project version) | New table column in TratamientosTab | No additions |

### No New Dependencies
This phase requires zero new packages on frontend or backend.

---

## Architecture Patterns

### Recommended Project Structure

No new files required. All changes are in-place:

```
backend/src/modules/turnos/turnos.service.ts    — enrich obtenerTurnosPorRango
frontend/src/hooks/useTurnosRangos.ts           — extend TurnoRango type
frontend/src/hooks/useCreateHistoriaClinicaEntry.ts — add invalidation
frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx — 5th column
```

### Pattern 1: Backend Batch Sub-Query (Anti-N+1)

**What:** After fetching all turnos, collect the unique `pacienteId`s, run ONE `findMany` on `HistoriaClinica` including nested `entradas` (filtered and ordered), map results to a `Map<pacienteId, string | null>`, then attach `ultimoTratamiento` to each turno.

**When to use:** When the enrichment relates to a different model (HC) that cannot be joined inline in the original Turno query without expanding select complexity across a JSON field.

**Example (backend, `obtenerTurnosPorRango` in `turnos.service.ts`):**

```typescript
// After: const turnos = await this.prisma.turno.findMany(...)

// Collect unique patient IDs from the fetched turnos
const pacienteIds = [...new Set(turnos.map((t) => t.paciente.id))];

// Fetch the latest HC entry with tratamientos for each patient in one query
const historias = await this.prisma.historiaClinica.findMany({
  where: { pacienteId: { in: pacienteIds } },
  select: {
    pacienteId: true,
    entradas: {
      where: {
        contenido: {
          path: ['tipo'],
          // Prisma JSON path filter: only 'tratamiento_en_consultorio' and 'primera_vez'
          // Use string_starts_with is not available; use `not: null` + JS filter below
        },
      },
      orderBy: { fecha: 'desc' },
      select: { contenido: true },
    },
  },
});

// Build lookup map: pacienteId -> string | null
const ultimoTratamientoMap = new Map<string, string | null>();
for (const historia of historias) {
  // Find first entry (already desc-sorted) that has tratamientos array
  const lastEntry = historia.entradas.find((e) => {
    const c = e.contenido as any;
    return Array.isArray(c?.tratamientos) && c.tratamientos.length > 0;
  });
  const nombres: string[] = lastEntry
    ? (lastEntry.contenido as any).tratamientos.map((t: { nombre: string }) => t.nombre)
    : [];
  ultimoTratamientoMap.set(historia.pacienteId, nombres.length ? nombres.join(', ') : null);
}

// Attach to each turno
return turnos.map((t) => ({
  ...t,
  ultimoTratamiento: ultimoTratamientoMap.get(t.paciente.id) ?? null,
}));
```

**Important note on Prisma JSON filtering:** Prisma's `path` filter for JSON works on PostgreSQL using the `@>` operator. Filtering by `contenido.tipo` in a Prisma `where` clause requires:
```typescript
where: {
  contenido: {
    path: ['tipo'],
    array_contains: undefined, // not available for string equality
  }
}
```
Prisma does NOT have `equals` on `Json path` in all versions. The safest approach is to **not filter in the Prisma query** (fetch all entries ordered by `fecha desc`, `take: 1` per historia is not directly available in nested `findMany`). Instead, fetch all entries ordered desc and filter in JS — this is acceptable because HC entry counts per patient are typically small (< 100).

**Alternative — raw sub-query with Prisma `$queryRaw`:** More precise but harder to maintain. Use the JS-filter approach for this phase.

### Pattern 2: Frontend Column Addition

**What:** Add `<th>` and `<td>` to the existing `<table>` in `TratamientosTab.tsx`. Cell renders clickable text when `turno.ultimoTratamiento` is non-null, or "—" with muted style otherwise.

**Example (frontend, `TratamientosTab.tsx`):**

```tsx
// In <thead>
<th className="py-2 px-3 text-left font-medium">
  Último tratamiento
</th>

// In <tbody> row
<td className="py-2 px-3">
  {turno.ultimoTratamiento ? (
    <button
      onClick={() => {
        setSelectedPacienteId(turno.paciente.id);
        setDrawerInitialView("historia");
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

### Pattern 3: PatientDrawer with `initialView="historia"`

**What:** `PatientDrawer` already accepts `initialView?: DrawerView` prop (line 33 of `PatientDrawer.tsx`). `DrawerView` type already includes `"historia"` (line 26). No changes needed to PatientDrawer itself.

**How to use from TratamientosTab:**

```tsx
// Add second state for drawer initial view
const [drawerInitialView, setDrawerInitialView] = useState<"default" | "historia">("default");

// Open with default view (patient name click — existing behavior)
onClick={() => {
  setDrawerInitialView("default");
  setSelectedPacienteId(turno.paciente.id);
}}

// Open with historia view (last treatment click — new behavior)
onClick={() => {
  setDrawerInitialView("historia");
  setSelectedPacienteId(turno.paciente.id);
}}

// PatientDrawer
<PatientDrawer
  open={!!selectedPacienteId}
  onOpenChange={(open) => {
    if (!open) setSelectedPacienteId(null);
  }}
  pacienteId={selectedPacienteId}
  initialView={drawerInitialView}
/>
```

### Pattern 4: TanStack Query Cache Invalidation

**What:** `useCreateHistoriaClinicaEntry` currently invalidates `['historia-clinica', pacienteId]`, `['paciente', pacienteId]`, etc. Add invalidation of the `['turnos', 'rango']` partial key to cascade refresh of TratamientosTab.

**Query key in `useTurnosRangos.ts`:** `["turnos", "rango", profesionalId, desde, hasta]`

**Partial invalidation (invalidates all rango queries regardless of params):**

```typescript
// In useCreateHistoriaClinicaEntry.ts onSuccess:
qc.invalidateQueries({ queryKey: ['turnos', 'rango'] });
```

TanStack Query v5 partial key matching: passing `['turnos', 'rango']` as `queryKey` in `invalidateQueries` will invalidate all queries whose key starts with `['turnos', 'rango']`, regardless of trailing params. This is HIGH confidence behavior.

### Pattern 5: TurnoRango Type Extension

**What:** Add `ultimoTratamiento?: string | null` to the `TurnoRango` type in `useTurnosRangos.ts`.

```typescript
export type TurnoRango = {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  observaciones?: string | null;
  paciente: { id: string; nombreCompleto: string };
  tipoTurno: { id: string; nombre: string; flujoPaciente?: string | null };
  ultimoTratamiento?: string | null;  // NEW
};
```

### Anti-Patterns to Avoid

- **Separate endpoint per patient for último tratamiento:** Causes N+1 when TratamientosTab renders 20+ rows. The decision locks us to enriching the rango endpoint.
- **Denormalizing `ultimoTratamientoId` to `Paciente` table:** STATE.md explicitly records this as rejected design (race conditions with retroactive entries). Do not add DB migrations.
- **Filtering `HistoriaClinicaEntrada.contenido` via raw SQL:** Adds pgBouncer compatibility risk. JS-filter after Prisma query is simpler and sufficient given small per-patient entry counts.
- **Modifying `PatientDrawer` component signature:** `initialView` prop already exists and already accepts `"historia"`. No changes needed there.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Partial query key invalidation | Custom cache mutation | `qc.invalidateQueries({ queryKey: ['turnos', 'rango'] })` | TanStack Query partial matching handles all param variants |
| PatientDrawer tab navigation | New prop/mechanism | Existing `initialView="historia"` prop on PatientDrawer | Already implemented, `DrawerView` type includes `"historia"` |
| Text truncation with tooltip | Custom component | `truncate max-w-[200px]` Tailwind + `title` attribute | Native browser tooltip sufficient for this column |

---

## Common Pitfalls

### Pitfall 1: Prisma JSON `path` filter limitations
**What goes wrong:** Trying to use `contenido: { path: ['tipo'], equals: 'tratamiento_en_consultorio' }` in Prisma query — this throws a runtime error because Prisma JSON `path` filter only supports `array_contains`, `string_contains`, `string_starts_with`, `string_ends_with`, and comparison operators (`gt`, `lt`, etc.) — not `equals` for arbitrary path values in all Prisma versions.
**Why it happens:** Prisma's JSON filtering API is narrower than raw SQL `@>` operators.
**How to avoid:** Fetch all entries (ordered by `fecha desc`) and filter in application code: `entry.contenido?.tipo === 'tratamiento_en_consultorio' || entry.contenido?.tipo === 'primera_vez'`.
**Warning signs:** TypeScript or Prisma runtime error on `{ path: [...], equals: '...' }`.

### Pitfall 2: N+1 if enrichment runs inside turno loop
**What goes wrong:** Calling `prisma.historiaClinica.findFirst({ where: { pacienteId: turno.paciente.id } })` inside a `for` loop over turnos — one DB round-trip per row.
**Why it happens:** Naive implementation pattern.
**How to avoid:** Collect all `pacienteIds` first, run ONE `findMany` with `pacienteId: { in: pacienteIds }`, build a `Map`, then attach results.
**Warning signs:** Backend response time scales linearly with number of turnos in the month.

### Pitfall 3: `drawerInitialView` state not reset on close
**What goes wrong:** User clicks "último tratamiento" (opens HC tab), closes drawer, clicks patient name — drawer opens on HC tab instead of default.
**Why it happens:** `drawerInitialView` state retains its last value.
**How to avoid:** PatientDrawer already handles this: the `useEffect([open, initialView])` inside PatientDrawer resets `view` to `initialView` every time `open` becomes true. So as long as TratamientosTab passes the correct `drawerInitialView` value at the moment of setting `selectedPacienteId`, the behavior is correct. Set both state updates together before the drawer opens.

### Pitfall 4: `ultimoTratamiento` missing from response when turnos have no HC entries
**What goes wrong:** `ultimoTratamientoMap.get(pacienteId)` returns `undefined` (not `null`) for patients not in the map (no HC at all). TypeScript may not catch this if `undefined` is coerced.
**Why it happens:** `Map.get` returns `undefined` for missing keys.
**How to avoid:** Use `?? null` explicitly: `ultimoTratamientoMap.get(t.paciente.id) ?? null`. Frontend should handle both `null` and `undefined` by treating either as empty.

---

## Code Examples

### Last HC Entry Sub-Query — Verified Pattern

```typescript
// Source: direct inspection of historia-clinica.service.ts + prisma schema
// Pattern: fetch all historias for a batch of patients, filter in JS

const pacienteIds = [...new Set(turnos.map((t) => t.paciente.id))];

const historias = await this.prisma.historiaClinica.findMany({
  where: { pacienteId: { in: pacienteIds } },
  select: {
    pacienteId: true,
    entradas: {
      orderBy: { fecha: 'desc' },
      select: { contenido: true },
    },
  },
});

const ultimoTratamientoMap = new Map<string, string | null>();
for (const historia of historias) {
  const lastEntry = historia.entradas.find((e) => {
    const c = e.contenido as Record<string, unknown> | null;
    return Array.isArray(c?.tratamientos) && (c!.tratamientos as unknown[]).length > 0;
  });
  if (lastEntry) {
    const tratamientos = (lastEntry.contenido as { tratamientos: Array<{ nombre: string }> }).tratamientos;
    ultimoTratamientoMap.set(historia.pacienteId, tratamientos.map((t) => t.nombre).join(', '));
  } else {
    ultimoTratamientoMap.set(historia.pacienteId, null);
  }
}
```

### TanStack Query Partial Key Invalidation

```typescript
// Source: direct inspection of useTurnosRangos.ts — queryKey: ["turnos", "rango", profesionalId, desde, hasta]
// Partial invalidation invalidates ALL matching keys regardless of trailing params
qc.invalidateQueries({ queryKey: ['turnos', 'rango'] });
```

### PatientDrawer `initialView` — Existing API

```typescript
// Source: direct inspection of PatientDrawer.tsx lines 26-38
// DrawerView = "default" | "datos" | "historia" | "turnos" | "mensajes" | "cuenta" | "presupuestos"
// initialView prop already exists and resets on open via useEffect([open, initialView])

<PatientDrawer
  open={!!selectedPacienteId}
  onOpenChange={(open) => { if (!open) setSelectedPacienteId(null); }}
  pacienteId={selectedPacienteId}
  initialView={drawerInitialView}  // "default" or "historia"
/>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `Paciente.ultimoTratamientoId` denormalized FK | Query-on-read from HC entries (ORDER BY fecha DESC) | Correct for retroactive entries; no DB migration needed |
| Separate `/ultimo-tratamiento` endpoint per patient | Batch enrichment in existing rango endpoint | Eliminates N+1; single endpoint serves both rango list and last treatment |

**Established and locked (from STATE.md):**
- `ultimoTratamientoId` as denormalized column on `Paciente` is explicitly rejected — do not create a migration.
- Query-on-read pattern confirmed as the correct design.

---

## Open Questions

1. **Prisma `historias.entradas` volume per patient**
   - What we know: HC entries for aesthetic patients are typically low (< 50). The JS filter over `entradas` (ordered desc) is O(n) but n is small.
   - What's unclear: In practices with very active patients (50+ sessions), the `entradas` select without `take` limit could return many rows unnecessarily.
   - Recommendation: Add `take: 10` on the nested `entradas` select to limit to the 10 most recent — sufficient to find the last one with `tratamientos`. This is a safe optimization with no functional impact.

2. **`HCCreatorDialog` (template-based HC flow) invalidation**
   - What we know: `useHCEntries.ts` has its own `useCreateHCEntry` mutation that only invalidates `['historia-clinica', pacienteId]` and `['hc-entries-drafts']` — it does NOT invalidate `['turnos', 'rango']`.
   - What's unclear: Whether users create `tratamiento_en_consultorio` entries via the template-based dialog or only via `HCCreatorForm`.
   - Recommendation: Also add `qc.invalidateQueries({ queryKey: ['turnos', 'rango'] })` to `useCreateHCEntry` (in `useHCEntries.ts`) and `useFinalizeHCEntry` `onSuccess` callbacks to cover the template flow. Low-risk, ensures completeness.

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `TratamientosTab.tsx` — current table structure, 4 columns, PatientDrawer usage
- Direct file inspection: `useTurnosRangos.ts` — queryKey `["turnos", "rango", profesionalId, desde, hasta]`, `TurnoRango` type
- Direct file inspection: `PatientDrawer.tsx` — `initialView` prop, `DrawerView` type includes `"historia"`
- Direct file inspection: `turnos.service.ts` — `obtenerTurnosPorRango` method, Prisma `findMany` pattern
- Direct file inspection: `historia-clinica.service.ts` — `contenido.tratamientos` JSON shape confirmed
- Direct file inspection: `schema.prisma` — `HistoriaClinicaEntrada.contenido: Json?`, `HistoriaClinica` → `entradas` relation
- Direct file inspection: `useCreateHistoriaClinicaEntry.ts` — current `onSuccess` invalidations (missing `['turnos', 'rango']`)
- Direct file inspection: `STATE.md` — confirms `ultimoTratamientoId` denormalized approach is rejected

### Secondary (MEDIUM confidence)
- TanStack Query docs (training knowledge, HIGH confidence for stable v5 behavior): partial key `invalidateQueries` matching by prefix

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all code inspected directly, no new dependencies
- Architecture: HIGH — PatientDrawer `initialView` prop confirmed to exist, queryKey confirmed, JSON shape confirmed
- Pitfalls: HIGH — Prisma JSON filter limitation verified by code inspection, N+1 pattern identified from service code

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (stable codebase, no external dependencies changing)
