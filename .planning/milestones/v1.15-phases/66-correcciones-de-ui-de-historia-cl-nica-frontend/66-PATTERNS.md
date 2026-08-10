# Phase 66: Correcciones de UI de Historia Clínica (Frontend) - Pattern Map

**Mapped:** 2026-08-06
**Files analyzed:** 2 (modified only — no new files)
**Analogs found:** 2 / 2 (both are self-analogs: the same file being edited already contains the pattern to extend/prune)

## CRITICAL: Data-shape correction vs CONTEXT.md D-04

CONTEXT.md D-04 describes the `pre_quirurgico` fields using the **outbound DTO** shape from `HCCreatorForm.tsx:151-166` (what gets *sent* to the backend). That is **not** what the render components receive. `HCEntryChips`/`HCEntryFullContent` receive `entrada.contenido`, which is the **persisted JSONB** returned as-is by `obtenerHistoriaClinica()` (`backend/src/modules/historia-clinica/historia-clinica.service.ts:69-80`, `contenido: entrada.contenido`, no transform). The persisted shape is built at `historia-clinica.service.ts:109-120` and is **narrower** than the outbound DTO:

```typescript
// backend/src/modules/historia-clinica/historia-clinica.service.ts:110-120
contenido = {
  tipo: 'pre_quirurgico',
  antecedentes: dto.antecedentes ?? [],
  alergias: dto.alergias ?? [],
  medicacion: dto.medicacion ?? [],
  estudiosComplementarios: dto.estudiosComplementarios ?? null,
  consentimientoInformadoAt: dto.consentimientoInformado
    ? new Date().toISOString()
    : null,
  comentario: dto.comentario ?? null,
};
```

Concretely, vs. D-04:
- **No `zonas` field is persisted for `pre_quirurgico`.** `dto.zonas` is sent by the form but the service never writes it into `contenido` for this branch (only `primera_vez` gets a `zonas`-bearing `contenido` via `construirContenidoPrimeraVez`). **The new render branch must NOT expect `zonas`.** Rendering a zonas section for `pre_quirurgico` would always show nothing (dead code) since the field never exists in real data.
- **`estudiosComplementarios` is an object, not a string:** `{ laboratorio: boolean; ecg: boolean; imagenes: string[] } | null` (matches `PreoperatorioFormState['estudiosComplementarios']` in `frontend/src/components/live-turno/tabs/hc/PreoperatorioForm.tsx:24-28`, and `CreateEntradaDto['estudiosComplementarios']` in `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts:69-73`). Render `laboratorio`/`ecg` as Sí/No (or hide if false) and `imagenes` as a list/chips, hiding if empty.
- **`consentimientoInformado` boolean is NOT persisted as a boolean.** It is stored as `consentimientoInformadoAt: string (ISO) | null` — `null` means "no", a timestamp string means "yes, on that date". Render as a Sí/No badge (truthy iff non-null), optionally showing the date.
- `antecedentes: string[]`, `alergias: string[]`, `medicacion: string[]`, `comentario: string | null` — these match D-04 as-is.

**Recommendation for the plan:** treat `contenido.zonas` as absent (do not render a zonas section for `pre_quirurgico`, or make it conditionally render only if present — but it will always be empty in real data, so per D-05's "hide empty" rule it will never show; simplest correct approach is to omit the zonas branch for `pre_quirurgico` entirely). Flag this to the user/planner as a deviation from D-04 grounded in the actual backend contenido-construction code, not the outbound DTO.

The correct TypeScript shape to add to `HCEntryContent.tsx`:

```typescript
export interface ContenidoPreQuirurgico {
  tipo: "pre_quirurgico";
  antecedentes?: string[];
  alergias?: string[];
  medicacion?: string[];
  estudiosComplementarios?: {
    laboratorio: boolean;
    ecg: boolean;
    imagenes: string[];
  } | null;
  consentimientoInformadoAt?: string | null;
  comentario?: string | null;
}
```

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|----------------|------|-----------|-----------------|---------------|
| `frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx` | component (render/detail) | transform (JSONB → UI) | `primera_vez` branch in the **same file** | exact (self-analog, same component, same file, add a sibling branch) |
| `frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx` | component (view/container) | request-response + CRUD (dead-code removal) | Same file — dropdown/form/modal to delete; `PatientDrawer.tsx` header button as the surviving entry point | exact (self-analog; deletion, not creation) |

No new files are created in this phase. Both changes are edits to existing components. There are no "no analog" files — every change modifies code that already has an immediately adjacent pattern (the `primera_vez` branch) or is itself the code to delete.

---

## Pattern Assignments

### `frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx` (component, transform) — HCUI-02

**Analog:** the existing `tipo === "primera_vez"` branch, in the same file, in both exported functions.

#### 1. `HCEntryChips` (preview/chips variant) — insert new branch after the `primera_vez` block

**Location to add the new branch:** after line 129 (`}` closing the `primera_vez` `if` block) and before line 131 (`// ── Texto libre ──`).

**Existing `primera_vez` branch pattern to copy the style from** (`HCEntryContent.tsx:55-129`):
```typescript
if (c.tipo === "primera_vez") {
  // Shape v1.9+ (grouped zones)
  if (Array.isArray(c.zonas) && c.zonas.length > 0) {
    return (
      <div className="space-y-1.5">
        {c.zonas.map((z: ZonaContenido, zi: number) => (
          <div key={zi} className="flex flex-wrap gap-1 items-center">
            <Badge variant="secondary" className="text-xs capitalize font-semibold">
              {z.zona}
            </Badge>
            {z.diagnosticos.map((d: string, di: number) => (
              <Badge key={di} variant="outline" className="text-xs">{d}</Badge>
            ))}
            {z.tratamientos.map((t, ti: number) => (
              <Badge key={ti} className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
                {t.nombre}
              </Badge>
            ))}
          </div>
        ))}
        {c.comentario && (
          <p className="text-xs text-muted-foreground whitespace-pre-line pt-1">
            {c.comentario}
          </p>
        )}
      </div>
    );
  }
  // ... legacy shape fallback (not applicable to pre_quirurgico, no legacy shape exists)
}
```

**Reusable pattern elements for the new `pre_quirurgico` chips branch:**
- `Badge variant="secondary" className="text-xs ... font-semibold"` for a "header" chip (e.g., could be used for a group label like "Antecedentes" — but note chips variant in this codebase always shows *data* chips, not section labels; for lists like `antecedentes`/`alergias`/`medicacion`, use `Badge variant="outline" className="text-xs"` per item, mirroring how `z.diagnosticos.map` renders `<Badge variant="outline">`).
- Conditional render only if array/field non-empty (`Array.isArray(...) && ... .length > 0`), matching D-05 (hide empty sections) and the existing `c.comentario &&` truthy-guard pattern for the trailing comment line.
- `space-y-1.5` wrapper + `flex flex-wrap gap-1 items-center` per group, consistent with the file's spacing conventions.

**Suggested minimal chips branch shape (illustrative, not prescriptive on exact layout — Claude's Discretion per CONTEXT.md):**
```typescript
if (c.tipo === "pre_quirurgico") {
  const pq = c as unknown as ContenidoPreQuirurgico;
  const hasAny =
    (pq.antecedentes?.length ?? 0) > 0 ||
    (pq.alergias?.length ?? 0) > 0 ||
    (pq.medicacion?.length ?? 0) > 0 ||
    !!pq.consentimientoInformadoAt ||
    !!pq.comentario;

  if (!hasAny) {
    return <p className="text-sm text-muted-foreground italic">(sin contenido)</p>;
  }

  return (
    <div className="space-y-1.5">
      {(pq.antecedentes?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          {pq.antecedentes!.map((a, i) => (
            <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
          ))}
        </div>
      )}
      {/* mirror for alergias, medicacion — same Badge pattern */}
      {pq.comentario && (
        <p className="text-xs text-muted-foreground whitespace-pre-line pt-1">
          {pq.comentario}
        </p>
      )}
    </div>
  );
}
```

#### 2. `HCEntryFullContent` (detail/modal variant) — insert new branch after the `primera_vez` block

**Location to add the new branch:** after line 356 (`}` closing the `primera_vez` `if` block) and before line 358 (`// ── Texto libre ──`).

**Existing `primera_vez` full-detail pattern to copy the style from** (`HCEntryContent.tsx:174-252`, v1.9+ shape — this is the one to model, since `pre_quirurgico` has no legacy shape):
```typescript
if (c.tipo === "primera_vez") {
  const comentario: string = c.comentario ?? "";
  if (Array.isArray(c.zonas) && c.zonas.length > 0) {
    return (
      <div className="space-y-5">
        {c.zonas.map((z: ZonaContenido, zi: number) => (
          <div key={zi} className="space-y-2">
            {/* Chips row */}
            <div className="flex flex-wrap gap-1 items-center"> ... </div>
            {/* Observación block */}
            {z.otroTexto && (
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Observación</p>
                <p className="text-sm">{z.otroTexto}</p>
              </div>
            )}
          </div>
        ))}
        {/* Comentario section */}
        {comentario && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Comentario</h4>
            <p className="text-sm whitespace-pre-line p-3 bg-muted/40 rounded-lg">
              {comentario}
            </p>
          </div>
        )}
      </div>
    );
  }
}
```

**Reusable "labeled block" pattern for list/scalar fields** (this is the key element to copy for `antecedentes`/`alergias`/`medicacion`/`estudios`/`consentimiento`, since `primera_vez`'s own labeled-block pattern lives in its *legacy* branch, `HCEntryContent.tsx:280-301`):
```typescript
// HCEntryContent.tsx:280-301 (legacy primera_vez zonas/subzonas empty-state + observación block)
<div className="p-3 bg-muted/40 rounded-lg">
  <p className="text-xs text-muted-foreground mb-1">Zonas</p>
  <p className="text-sm font-medium">
    <span className="text-muted-foreground italic">—</span>
  </p>
</div>
```
Note per D-05: for the new branch, empty fields must be **omitted entirely** (no `—` placeholder), so this exact "—" fallback should NOT be copied — only the `p-3 bg-muted/40 rounded-lg` / `text-xs text-muted-foreground mb-1` label styling should be reused, always guarded by a truthy/length check like the `primera_vez` v1.9 branch does (`{z.otroTexto && (...)}`, `{comentario && (...)}`).

**Section header pattern** (`h4.text-sm.font-semibold`) — copy exactly from the "Comentario" section header at `HCEntryContent.tsx:236` (`<h4 className="text-sm font-semibold">Comentario</h4>`) for any section titles in the new branch (e.g., "Antecedentes", "Alergias", "Medicación", "Estudios complementarios").

**Boolean → legible badge pattern:** no existing "Sí/No" render exists in this file for a boolean field, but the sibling `HistoriaClinica.tsx` file (template-based render) has one — copy from there:
```typescript
// HistoriaClinica.tsx:706-708 (formatValue helper, template branch)
if (typeof value === "boolean") {
  return value ? "Sí" : "No";
}
```
Apply the same Sí/No semantic to `consentimientoInformadoAt` (truthy = Sí, `null` = No), rendered inside a `Badge` for visual consistency with the rest of the chips-based UI (e.g., `<Badge variant={pq.consentimientoInformadoAt ? "secondary" : "outline"}>{pq.consentimientoInformadoAt ? "Sí" : "No"}</Badge>`), matching D-04's "Sí/No o badge legible" instruction.

**Suggested minimal full-detail branch shape (illustrative):**
```typescript
if (c.tipo === "pre_quirurgico") {
  const pq = c as unknown as ContenidoPreQuirurgico;
  const listSection = (title: string, items?: string[]) =>
    items && items.length > 0 ? (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <div className="flex flex-wrap gap-1">
          {items.map((it, i) => (
            <Badge key={i} variant="outline" className="text-xs">{it}</Badge>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-5">
      {listSection("Antecedentes", pq.antecedentes)}
      {listSection("Alergias", pq.alergias)}
      {listSection("Medicación", pq.medicacion)}
      {pq.estudiosComplementarios && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Estudios complementarios</h4>
          <div className="p-3 bg-muted/40 rounded-lg space-y-1">
            <p className="text-sm">Laboratorio: {pq.estudiosComplementarios.laboratorio ? "Sí" : "No"}</p>
            <p className="text-sm">ECG: {pq.estudiosComplementarios.ecg ? "Sí" : "No"}</p>
            {pq.estudiosComplementarios.imagenes?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {pq.estudiosComplementarios.imagenes.map((im, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{im}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Consentimiento informado:</span>
        <Badge variant={pq.consentimientoInformadoAt ? "secondary" : "outline"} className="text-xs">
          {pq.consentimientoInformadoAt ? "Sí" : "No"}
        </Badge>
      </div>
      {pq.comentario && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Comentario</h4>
          <p className="text-sm whitespace-pre-line p-3 bg-muted/40 rounded-lg">
            {pq.comentario}
          </p>
        </div>
      )}
    </div>
  );
}
```

#### Type additions needed

Add `ContenidoPreQuirurgico` interface (see corrected shape above) next to `ContenidoPrimeraVez` (`HCEntryContent.tsx:15-25`), and include it in the `ContenidoEntrada` union (`HCEntryContent.tsx:32-36`):
```typescript
export type ContenidoEntrada =
  | ContenidoPrimeraVez
  | ContenidoPreQuirurgico
  | ContenidoLibre
  | Record<string, unknown>
  | null;
```

---

### `frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx` (component, dead-code removal) — HCUI-01

**Analog:** N/A for construction — this is a deletion task. The "pattern to copy" is the **surviving entry point already wired and working**, confirmed at:

**`frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx`** — button + dialog wiring (confirmed accurate, matches D-01):
```typescript
// PatientDrawer.tsx:41 — state
const [hcDialogOpen, setHcDialogOpen] = useState(false);
// PatientDrawer.tsx:66 — button label "+ Nueva HC" (exact text confirmed)
// PatientDrawer.tsx:151-152 — dialog usage
<HCCreatorDialog
  open={hcDialogOpen}
  ...
```

**`frontend/src/components/patient/PatientDrawer/views/HCCreatorDialog.tsx`** (full file, 44 lines) — thin wrapper already wired, confirmed no changes needed:
```typescript
export function HCCreatorDialog({ open, onOpenChange, pacienteId, profesionalId, obraSocialId, onSaved }: HCCreatorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nueva entrada de Historia Clínica</DialogTitle></DialogHeader>
        <HCCreatorForm pacienteId={pacienteId} profesionalId={profesionalId} obraSocialId={obraSocialId} showDatePicker={true}
          onSaved={() => { onOpenChange(false); onSaved?.(); }} />
      </DialogContent>
    </Dialog>
  );
}
```

**Exact code regions to delete in `HistoriaClinica.tsx`** (line numbers confirmed against current file content, matches CONTEXT.md D-01/D-02 closely — minor offsets noted):

1. **Dropdown "Nueva entrada"** — lines **195-215**:
```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="sm">
      <Plus className="w-4 h-4 mr-1" />
      Nueva entrada
      <ChevronDown className="w-4 h-4 ml-1" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => setShowForm(true)}>
      <FileText className="w-4 h-4 mr-2" />
      Texto libre
    </DropdownMenuItem>
    {templates.length > 0 && (
      <DropdownMenuItem onClick={() => setShowTemplateSelector(true)}>
        <FileCode className="w-4 h-4 mr-2" />
        Usar plantilla
      </DropdownMenuItem>
    )}
  </DropdownMenuContent>
</DropdownMenu>
```
This whole block must be removed from the header `<div className="flex items-center justify-between">` (lines 179-216) — nothing needs to replace it in this view; the create action lives entirely in `PatientDrawer.tsx`'s own header per D-01.

2. **Free-text form card** — lines **262-281** (`{/* FORM NUEVA ENTRADA (texto libre) */}` block, guarded by `showForm`):
```typescript
{showForm && (
  <Card className="p-4 space-y-4">
    <h4 className="font-medium">Nueva entrada (texto libre)</h4>
    <Textarea ... value={contenido} onChange={(e) => setContenido(e.target.value)} rows={4} />
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
      <Button onClick={handleGuardar} disabled={createEntry.isPending}>Guardar</Button>
    </div>
  </Card>
)}
```

3. **Template selector modal** — lines **312-343** (`{/* TEMPLATE SELECTOR MODAL */}` `<Dialog>` block using `showTemplateSelector`).

**State/handlers to remove as a consequence (orphaned after 1-3 above):**
- `const [showForm, setShowForm] = useState(false);` (line 73)
- `const [contenido, setContenido] = useState("");` (line 74)
- `const [showTemplateSelector, setShowTemplateSelector] = useState(false);` (line 75)
- `handleGuardar` (lines 94-100) — only caller is the deleted `<Button onClick={handleGuardar}>`
- `handleSelectTemplate` (lines 102-121) — only caller is the deleted template `<Card onClick={() => handleSelectTemplate(template)}>`

**State/handlers/hooks that must be KEPT** (still used by drafts UI / wizard flow / listing, do NOT delete despite superficial similarity):
- `templates` (from `useAvailableHCTemplates()`) — still referenced by... **verify during planning**: after removing the template-selector `<DropdownMenuItem>` and `<Dialog>`, `templates.length > 0` conditional in the dropdown is also gone, so `useAvailableHCTemplates` import + `templates` variable become orphaned too UNLESS still used elsewhere in the file (grep confirms `templates` only appears in the dropdown item guard and the modal body — both being deleted). **Also delete** `useAvailableHCTemplates` import and the `templates` destructure once confirmed unused.
- `createEntry` (from `useCreateHistoriaClinicaEntry()`) — **only used by `handleGuardar`** (line 97: `await createEntry.mutateAsync(...)`), which is itself deleted. Once `handleGuardar` is gone, `createEntry` and its import become orphaned too — confirm no other usage before deleting.
- `createTemplateEntry` (from `useCreateHCEntry()`) — only used inside `handleSelectTemplate` (deleted). Orphaned, delete along with its import.
- `wizardEntryId`/`wizardSchema`/`handleContinueDraft`/`handleCloseWizard`/`handleFinalizeWizard`/drafts (`useHCDraftEntries`)/`deleteEntry` (`useDeleteHCEntry`) — **KEEP**, these power the still-used "Borradores pendientes" (drafts) section and the wizard-continuation flow (`DynamicTemplateWizard`), unrelated to D-01/D-02.
- Imports to re-check for orphaning after deletion: `Textarea`, `DropdownMenu`/`DropdownMenuContent`/`DropdownMenuItem`/`DropdownMenuTrigger`, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` (still used by the "ENTRY DETAIL MODAL" at lines 367-383 — **do not remove** the `Dialog` import, only remove the now-unused *template selector* `<Dialog>` instance), icons `Plus`, `ChevronDown`, `FileCode` (still used elsewhere: `FileCode` is used for `isTemplateBased` badges at lines 371, 448-449, 372 — **keep**; `Plus`/`ChevronDown` become orphaned if not used elsewhere — grep confirms `Plus` only used in the deleted dropdown trigger, `ChevronDown` only used in the deleted dropdown trigger → **remove both from the import list**).

**`getTituloEntrada` / `TIPO_LABELS` finding** (per CONTEXT.md's request to "confirm whether Pre-quirúrgico already has a legible title", `HistoriaClinica.tsx:405-418`):
```typescript
const TIPO_LABELS: Record<string, string> = {
  primera_vez: "Primera consulta",
  libre: "Texto libre",
  control: "Control",
  evolucion: "Evolución",
};

function getTituloEntrada(entrada: EntradaType): string {
  if (entrada.template) return entrada.template.nombre;
  const tipo = (entrada.contenido as any)?.tipo as string | undefined;
  if (tipo) return TIPO_LABELS[tipo] ?? tipo;
  if ((entrada.contenido as any)?.texto) return "Texto libre";
  return "Entrada sin tipo";
}
```
**Confirmed: `pre_quirurgico` is NOT in `TIPO_LABELS`.** Without an entry, `getTituloEntrada` falls back to the raw string `"pre_quirurgico"` as the modal/card title (via `TIPO_LABELS[tipo] ?? tipo`). This is a small consistency gap not explicitly required by D-01/D-02/D-03/D-04/D-05, but directly related to HCUI-02's goal of a complete, legible detail view. Recommend adding `pre_quirurgico: "Pre-quirúrgico"` to `TIPO_LABELS` (mirrors backend's own label at `backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts:90`: `pre_quirurgico: 'Pre-Quirúrgico'`) as a low-risk, in-scope addition alongside the HCUI-02 branch work — flag this explicitly to the planner as an optional addition within the same file being touched, not a new decision beyond CONTEXT.md's discretion clause ("Claude's Discretion").

---

## Shared Patterns

### Hide-empty-fields convention (D-05)
**Source:** `HCEntryChips`/`HCEntryFullContent` `primera_vez` branches, `HCEntryContent.tsx:80-84` and `:234-241` (`{c.comentario && (...)}` truthy guards), and `:213` / `:305` (`{tratamientos.length > 0 && (...)}` length guards).
**Apply to:** every field in the new `pre_quirurgico` branch — always gate rendering on `.length > 0` for arrays and truthy checks for optional scalars/objects; never render a `—` placeholder (that placeholder pattern exists only in the *legacy* `primera_vez` fallback at lines 280-301 and should NOT be copied for the new branch).

### Badge styling conventions
**Source:** `HCEntryContent.tsx` throughout.
- List/tag items: `<Badge variant="outline" className="text-xs">`
- Emphasis/grouping label: `<Badge variant="secondary" className="text-xs ... font-semibold">`
- Treatment-style highlight (not needed for pre_quirurgico, but documented for consistency): `<Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">`

### Section header + labeled-block convention (full-detail variant)
**Source:** `HCEntryContent.tsx:236` (`<h4 className="text-sm font-semibold">Comentario</h4>`) and `:282-287` (`<div className="p-3 bg-muted/40 rounded-lg">` + `<p className="text-xs text-muted-foreground mb-1">`).
**Apply to:** all new labeled sections (Antecedentes, Alergias, Medicación, Estudios complementarios, Consentimiento informado, Comentario) in `HCEntryFullContent`'s new branch.

### Dead-code removal safety check
**Source:** none — general engineering discipline flagged explicitly in CONTEXT.md ("Nota: verificar durante el plan que nada más dependa de esos handlers/estado antes de borrar; quitar imports huérfanos para no romper lint").
**Apply to:** `HistoriaClinica.tsx` HCUI-01 changes — run `npm run lint` (per `CLAUDE.md` dev commands, `backend`/`frontend` both have `npm run lint`) after deletion to catch orphaned imports/vars the static analysis above may have missed.

## No Analog Found

None. Both files being modified already contain their own closest analog (the `primera_vez` branch for HCUI-02's addition; the surviving `PatientDrawer.tsx` + `HCCreatorDialog.tsx` wiring for HCUI-01's deletion).

## Metadata

**Analog search scope:** `frontend/src/components/patient/PatientDrawer/views/`, `frontend/src/app/dashboard/pacientes/components/`, `frontend/src/components/live-turno/tabs/hc/`, `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts`, `backend/src/modules/historia-clinica/` (for ground-truth persisted data shape).
**Files scanned:** `HCEntryContent.tsx` (397 lines, full read), `HistoriaClinica.tsx` (744 lines, full read), `HCCreatorForm.tsx` (partial, lines 100-199), `PreoperatorioForm.tsx` (partial, lines 1-35 + grep), `PatientDrawer.tsx` (grep only, button/dialog wiring), `HCCreatorDialog.tsx` (full, 44 lines), `useCreateHistoriaClinicaEntry.ts` (partial, lines 1-90), `historia-clinica.service.ts` (partial, lines 28-280), `historia-clinica.flujo.helpers.ts` (grep only).
**Pattern extraction date:** 2026-08-06
