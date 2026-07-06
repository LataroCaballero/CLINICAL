---
phase: 27-hc-integration-liveturno-patientdrawer
verified: 2026-04-23T22:30:00Z
status: human_needed
score: 10/10 must-haves verified
re_verification: false
human_verification:
  - test: "LiveTurno HC tab — Practica button gone, Tratamiento en Consultorio visible"
    expected: "No 'Practica' button, 'Tratamiento en Consultorio' button present; clicking it shows combobox"
    why_human: "UI rendering cannot be verified programmatically"
  - test: "Combobox multi-select and pills in LiveTurno"
    expected: "Selecting treatments from catalog shows them as pills with x-remove buttons; deselect works"
    why_human: "Interaction state cannot be verified programmatically"
  - test: "Insumos checkbox conditional visibility"
    expected: "'Consumir insumos del stock' checkbox appears only when at least one selected treatment has insumos; absent otherwise"
    why_human: "Depends on runtime data (which treatments have insumos linked)"
  - test: "Free text toggle collapsed by default"
    expected: "No textarea visible initially; clicking '+ Agregar notas libres' reveals textarea"
    why_human: "UI state cannot be verified programmatically"
  - test: "Toast messages on save"
    expected: "'HC guardada. Orden de consumo creada.' when consumirInsumos=true and anyHasInsumos; 'HC guardada.' otherwise"
    why_human: "Requires runtime mutation execution"
  - test: "PatientDrawer '+ Nueva HC' button visible from any tab"
    expected: "Button appears in DrawerHeader when patient is loaded, regardless of active tab"
    why_human: "UI rendering and patient-loaded state cannot be verified programmatically"
  - test: "Dialog opens on '+ Nueva HC' click with DatePicker"
    expected: "Dialog titled 'Nueva entrada de Historia Clinica' opens; DatePicker shows 'Hoy' by default"
    why_human: "UI interaction cannot be verified programmatically"
  - test: "DatePicker blocks future dates"
    expected: "Future dates greyed out in calendar, past dates selectable"
    why_human: "Calendar UI behavior requires visual/interaction testing"
  - test: "Saving from PatientDrawer dialog closes dialog"
    expected: "After successful save, dialog closes and patient HC tab reflects new entry"
    why_human: "Requires live mutation and UI state observation"
---

# Phase 27: HC Integration LiveTurno + PatientDrawer — Verification Report

**Phase Goal:** Integrate HC entry creation into LiveTurno with tratamiento-en-consultorio support (catalog multi-select + stock order creation), and expose the same HC form from PatientDrawer for retroactive entries without an active session.
**Verified:** 2026-04-23T22:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

All truths derived from plan must_haves sections, cross-referenced against REQUIREMENTS.md.

**Plan 27-01 Truths (STOCK-01, STOCK-02, LIVHC-05)**

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | HC saved with consumirInsumos=true + non-empty tratamientoIds creates OrdenConsumo with estado PENDIENTE atomically | VERIFIED | `historia-clinica.service.ts` lines 237-252: `tx.ordenConsumo.create` inside `$transaction` with `estado: 'PENDIENTE'` |
| 2 | OrdenConsumo records pacienteId, profesionalId, turnoId (nullable), historiaClinicaEntradaId, fechaSesion, tratamientosSnapshot + insumos | VERIFIED | Schema lines 957-970 + service line 240-250: all fields present in create data block |
| 3 | If two tratamientos share same productoId, their quantities sum in one OrdenConsumoInsumo row | VERIFIED | `historia-clinica.service.ts` lines 163-173: Map-based aggregation before tx; `@@unique([ordenConsumoId, productoId])` on schema |
| 4 | ordenes-consumo module starts without errors in NestJS | VERIFIED | Module registered in `app.module.ts` lines 31 + 65; service uses `PrismaService`; controller uses `@Auth` guard; all imports resolve |

**Plan 27-02 Truths (LIVHC-01 through LIVHC-05)**

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 5 | 'Practica' button no longer exists in LiveTurno — replaced by 'Tratamiento en Consultorio' | VERIFIED | `HCCreatorForm.tsx` TIPOS array (lines 35-40): only `primera_vez`, `pre_quirurgico`, `control`, `tratamiento_en_consultorio` — no `practica` entry |
| 6 | Selecting 'Tratamiento en Consultorio' shows multi-select Combobox from professional's catalog | VERIFIED | `HCCreatorForm.tsx` lines 226-265: Popover+Command combobox rendered when `tipoSeleccionado === 'tratamiento_en_consultorio'`; loads via `useTratamientosProfesional(false, profesionalId)` |
| 7 | Selected treatments shown as pills with x-remove button | VERIFIED | `HCCreatorForm.tsx` lines 268-284: Badge per treatment with `onClick={() => toggleTratamiento(t)}` button |
| 8 | Free textarea collapsed by default behind '+ Agregar notas libres' toggle | VERIFIED | `HCCreatorForm.tsx` lines 300-319: `notasLibresOpen` starts false; textarea only renders when true; toggle button present |
| 9 | 'Consumir insumos del stock' checkbox appears only when at least one selected treatment has insumos | VERIFIED | `HCCreatorForm.tsx` line 87: `anyHasInsumos`; lines 287-298: checkbox only rendered when `anyHasInsumos === true` |
| 10 | On save with checkbox active, toast 'HC guardada. Orden de consumo creada.' via sonner | VERIFIED | `HCCreatorForm.tsx` lines 130-133: conditional toast branch |
| 11 | HCCreatorForm is autonomous — does not import useLiveTurnoStore | VERIFIED | No `useLiveTurnoStore` import in `HCCreatorForm.tsx` (grep returned no output) |
| 12 | HistoriaClinicaTab.tsx works as thin wrapper for all other types | VERIFIED | `HistoriaClinicaTab.tsx` is 45 lines; reads session from store, passes to HCCreatorForm + HistorialClinicoPanel |

**Plan 27-03 Truths (HCDR-01, HCDR-02, HCDR-03)**

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 13 | PatientDrawer shows '+ Nueva HC' button in header regardless of active tab | VERIFIED | `PatientDrawer.tsx` lines 59-68: Button in DrawerHeader div, always visible when `paciente` is loaded |
| 14 | Clicking '+ Nueva HC' opens Dialog with HC creator | VERIFIED | `PatientDrawer.tsx` line 64: `onClick={() => setHcDialogOpen(true)}`; `HCCreatorDialog` mounted lines 150-158 with `open={hcDialogOpen}` |
| 15 | Creator in Dialog shows DatePicker 'Fecha de la sesion: Hoy' by default | VERIFIED | `HCCreatorDialog.tsx` passes `showDatePicker={true}`; `HCCreatorForm.tsx` lines 170-193: DatePicker with 'Hoy' default |
| 16 | DatePicker blocks future dates | VERIFIED | `HCCreatorForm.tsx` line 188: `disabled={(date) => date > new Date()}` |
| 17 | Saving from Dialog creates HC without turnoId (null) | VERIFIED | `HCCreatorDialog.tsx`: no `turnoId` prop passed to HCCreatorForm; HCCreatorForm `turnoId` prop is undefined → `dto.turnoId = undefined` → backend receives no turnoId |
| 18 | On successful save, Dialog closes and HC tab refreshes | VERIFIED | `HCCreatorDialog.tsx` line 32: `onSaved={() => onOpenChange(false)}`; `useCreateHistoriaClinicaEntry` invalidates historia-clinica query on success |

**Score:** 10/10 plan-level truth groups verified (18 individual truths — all VERIFIED)

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | VERIFIED | OrdenConsumo, OrdenConsumoInsumo models + EstadoOrdenConsumo enum present at lines 950-987; back-relations on Paciente (line 134), Profesional (line 207), Producto (line 614) |
| `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts` | VERIFIED | `tratamientoIds`, `consumirInsumos`, `turnoId` fields; `tratamiento_en_consultorio` in tipo union (lines 34-68) |
| `backend/src/modules/historia-clinica/historia-clinica.service.ts` | VERIFIED | Pre-fetch outside tx (lines 146-179); OrdenConsumo create inside $transaction (lines 237-252) |
| `backend/src/modules/ordenes-consumo/ordenes-consumo.module.ts` | VERIFIED | NestJS module exists; registered in app.module.ts |
| `backend/src/modules/ordenes-consumo/ordenes-consumo.service.ts` | VERIFIED | `findPendientesByProfesional` with real Prisma query (not stub — returns actual DB data) |
| `backend/src/modules/ordenes-consumo/ordenes-consumo.controller.ts` | VERIFIED | GET /ordenes-consumo with auth guard and getProfesionalId pattern |
| `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` | VERIFIED | `TipoEntrada` includes `tratamiento_en_consultorio`; DTO has `tratamientoIds?`, `consumirInsumos?`, `turnoId?` |
| `frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` | VERIFIED | 387 lines — substantive, autonomous, exports `HCCreatorForm` + `HCCreatorFormProps` |
| `frontend/src/components/live-turno/tabs/HistoriaClinicaTab.tsx` | VERIFIED | 45-line thin wrapper; imports and uses HCCreatorForm with session data |
| `frontend/src/components/patient/PatientDrawer/views/HCCreatorDialog.tsx` | VERIFIED | 37 lines; wraps HCCreatorForm with showDatePicker=true, no turnoId |
| `frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx` | VERIFIED | Imports HCCreatorDialog; hcDialogOpen state; button in DrawerHeader; dialog mounted at bottom of DrawerContent |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `historia-clinica.service.ts crearEntrada` | `tx.ordenConsumo.create` | Prisma $transaction — insumos pre-fetched outside tx | WIRED | Line 238: `tx.ordenConsumo.create({ data: { ... insumos: { create: insumosAgregados } } })` inside `$transaction` |
| `OrdenConsumo` | `Paciente, Profesional, OrdenConsumoInsumo` | Prisma relations | WIRED | Schema: `paciente Paciente @relation(...)`, `profesional Profesional @relation(...)`, `insumos OrdenConsumoInsumo[]` |
| `HCCreatorForm tratamientosSeleccionados` | `useCreateHistoriaClinicaEntry dto.tratamientoIds` | handleSave passes tratamientoIds and consumirInsumos in dto | WIRED | `HCCreatorForm.tsx` lines 123-124: `tratamientoIds: tratamientosSeleccionados.map((t) => t.id), consumirInsumos: consumirInsumos && anyHasInsumos` |
| `HCCreatorForm consumirInsumos checkbox` | `OrdenConsumo creation (backend)` | dto.consumirInsumos = true in POST body | WIRED | Frontend sends `consumirInsumos` in DTO; backend checks `dto.consumirInsumos` at line 237 |
| `HistoriaClinicaTab` | `HCCreatorForm` | props: pacienteId, profesionalId, turnoId, onSaved | WIRED | `HistoriaClinicaTab.tsx` lines 23-30: `<HCCreatorForm pacienteId={...} profesionalId={...} turnoId={session.turnoId} ...>` |
| `PatientDrawer header '+ Nueva HC' button` | `HCCreatorDialog open state` | useState(false) hcDialogOpen toggle | WIRED | `PatientDrawer.tsx` line 41: `useState(false)`; line 64: `onClick={() => setHcDialogOpen(true)}`; line 152: `open={hcDialogOpen}` |
| `HCCreatorDialog` | `HCCreatorForm` | props: pacienteId, profesionalId, turnoId=undefined, showDatePicker=true, onSaved closes dialog | WIRED | `HCCreatorDialog.tsx` lines 27-33: all props passed; no turnoId; showDatePicker=true; onSaved closes dialog |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| LIVHC-01 | 27-02 | Practica renamed to Tratamiento en Consultorio | SATISFIED | HCCreatorForm TIPOS array has `tratamiento_en_consultorio`, no `practica` |
| LIVHC-02 | 27-02 | Professional can select one or more treatments from catalog (multi-select) | SATISFIED | Combobox with toggleTratamiento; `useTratamientosProfesional` hook |
| LIVHC-03 | 27-02 | Free text field maintained as complement to treatment selector | SATISFIED | `notasLibresOpen` toggle reveals Textarea; free text sent in dto |
| LIVHC-04 | 27-02 | Checkbox 'Consumir insumos del stock' shown only when treatment has linked insumos | SATISFIED | `anyHasInsumos` guard controls checkbox render |
| LIVHC-05 | 27-02 | Last treatment of patient updated on save (derived in read from last entry) | SATISFIED | Requirement is read-derived; tratamientosSnapshot stored in OrdenConsumo.tratamientosSnapshot; contenido.tratamientos filled with snapshot |
| STOCK-01 | 27-01 | Saving HC with insumos checkbox activated creates OrdenConsumo with estado PENDIENTE | SATISFIED | `tx.ordenConsumo.create` with `estado: 'PENDIENTE'` inside $transaction |
| STOCK-02 | 27-01 | OrdenConsumo includes patient name, session date, treatments, insumos with quantities | SATISFIED | Schema fields: pacienteId, fechaSesion, tratamientosSnapshot (Json), insumos OrdenConsumoInsumo[] with cantidad |
| HCDR-01 | 27-03 | HC entry can be created from PatientDrawer using same creator as LiveTurno | SATISFIED | HCCreatorDialog wraps HCCreatorForm — same component used in both contexts |
| HCDR-02 | 27-03 | Entry created from PatientDrawer requires no active turno (created without turnoId) | SATISFIED | HCCreatorDialog does not pass turnoId prop; backend receives undefined turnoId |
| HCDR-03 | 27-03 | Entry date defaults to today but allows retroactive selection | SATISFIED | DatePicker: `selectedFecha ? format(...) : 'Hoy'`; `disabled={(date) => date > new Date()}` |

All 10 phase requirements (LIVHC-01 through LIVHC-05, STOCK-01, STOCK-02, HCDR-01 through HCDR-03) are SATISFIED.

**No orphaned requirements found.** STOCK-03 and STOCK-04 are explicitly assigned to Phase 31 in REQUIREMENTS.md — not in scope for Phase 27.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `backend/src/modules/ordenes-consumo/dto/create-orden-consumo.dto.ts` | Empty placeholder class | INFO | Expected — per plan design, Phase 31 will flesh out this DTO. Does not affect current phase functionality. |

No blocker or warning-level anti-patterns found. The empty DTO is intentional scaffolding per the plan.

### Human Verification Required

The automated checks for all artifacts, key links, and requirements are fully VERIFIED. The following items require a human to confirm UI behavior and runtime mutations:

#### 1. LiveTurno — Tratamiento en Consultorio UI Flow

**Test:** Open LiveTurno on an active session, go to the HC tab
**Expected:** 'Practica' button is absent; 'Tratamiento en Consultorio' button appears; clicking it shows a combobox
**Why human:** React rendering and tab navigation require a live browser

#### 2. Combobox Multi-select and Pills

**Test:** In LiveTurno HC tab, select 'Tratamiento en Consultorio', open combobox, select 2+ treatments
**Expected:** Each selected treatment appears as a pill with an x-button; x-button removes the pill
**Why human:** Interaction state cannot be verified from static code analysis

#### 3. Conditional Insumos Checkbox

**Test:** Select a treatment that has insumos linked; compare with a treatment that has none
**Expected:** Checkbox appears for former, absent for latter
**Why human:** Depends on runtime data — which treatments have insumos in the actual DB

#### 4. Free Text Toggle Behavior

**Test:** Select 'Tratamiento en Consultorio' — observe textarea area
**Expected:** No textarea visible; clicking '+ Agregar notas libres' reveals textarea
**Why human:** UI state requires visual confirmation

#### 5. Toast on Save with Insumos

**Test:** Select treatment with insumos, check 'Consumir insumos del stock', save
**Expected:** Toast reads 'HC guardada. Orden de consumo creada.'
**Why human:** Requires live mutation execution and toast observation

#### 6. PatientDrawer '+ Nueva HC' Button Visibility

**Test:** Open PatientDrawer for any patient, switch between tabs (Datos, Historia, Turnos, etc.)
**Expected:** '+ Nueva HC' button always visible in header across all tabs
**Why human:** Tab navigation and persistent header require live rendering

#### 7. Dialog Opens with DatePicker

**Test:** Click '+ Nueva HC' button in PatientDrawer
**Expected:** Dialog titled 'Nueva entrada de Historia Clinica' opens; DatePicker shows 'Hoy' by default
**Why human:** Dialog open/close state and UI rendering

#### 8. DatePicker Future Date Blocking

**Test:** Open DatePicker in the dialog, attempt to click a future date
**Expected:** Future dates are greyed out and unclickable
**Why human:** Calendar UI interaction requires visual testing

#### 9. Dialog Closes After Save

**Test:** Save any HC entry from PatientDrawer dialog
**Expected:** Dialog closes automatically; new entry appears in HC tab of the same drawer
**Why human:** Requires live mutation, query invalidation, and UI state observation

### Gaps Summary

No gaps found. All automated verifications passed.

Phase 27 goal is fully achieved at the code level:
- Backend schema, service logic, and module are all substantive and wired
- Frontend HCCreatorForm is a complete, autonomous, reusable component with all required UI behaviors encoded in the source
- HCCreatorDialog wraps it correctly for PatientDrawer without turnoId
- HistoriaClinicaTab is a proper thin wrapper
- All 10 requirement IDs are satisfied

Outstanding items are UI/runtime behaviors that require a human to verify in a live browser session.

---

_Verified: 2026-04-23T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
