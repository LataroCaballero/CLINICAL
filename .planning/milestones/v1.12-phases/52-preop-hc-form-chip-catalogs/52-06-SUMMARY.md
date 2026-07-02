---
phase: 52-preop-hc-form-chip-catalogs
plan: 06
subsystem: frontend/components/live-turno
tags: [react, preoperatorio, chip-catalogs, antecedentes, alergias, medicacion, hc-form]

# Dependency graph
requires:
  - phase: 52
    plan: 05
    provides: "useAntecedentesCatalogo/useAlergiasCatalogo/useMedicamentosCatalogo hooks + extended useCreateHistoriaClinicaEntry DTO"
  - phase: 52
    plan: 03
    provides: "Backend pre_quirurgico branch in crearEntrada + contenido JSONB shape"
provides:
  - "PreoperatorioForm component: structured seccioned PREOP form (PREOP-01/02 UI)"
  - "PreoperatorioFormState type: locked shape { antecedentes, alergias, medicacion, estudiosComplementarios, consentimientoInformado, zonas, comentario }"
  - "HCCreatorForm pre_quirurgico render + save branch: consumes PreoperatorioForm and sends full PREOP payload through useCreateHistoriaClinicaEntry"
affects:
  - 52-07  # Compartir link section will be added to PreoperatorioForm

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Chip with dashed prop: replicated from PrimeraConsultaForm for unsaved/profile-origin items"
    - "Pre-load pattern: useEffect with preloadRef guard runs once after usePaciente returns; emits state directly (not via async setState) to parent immediately"
    - "renderChipSection helper: inline render function accepting catalog/selected/nuevos/input state; catalog + extras merged per render"
    - "PrimeraConsultaForm reused (not duplicated) as optional dx/tratamiento selector when incluirDx checkbox is checked (D-08)"
    - "PREOP canSave always-true: pre_quirurgico is always saveable; even empty PREOP is a valid clinical record"

key-files:
  created:
    - frontend/src/components/live-turno/tabs/hc/PreoperatorioForm.tsx
  modified:
    - frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx
    - frontend/src/types/pacients.ts

key-decisions:
  - "PacienteDetalle extended with condiciones/alergias/medicacion optional fields (Rule 2 fix: missing fields for D-09 pre-load to compile correctly without type assertions)"
  - "Initial emit on mount (empty state) so HCCreatorForm.preopState is never null on first save click"
  - "Pre-load emits directly via onChange (not waiting for setState to flush) since effects run synchronously before next paint"
  - "PREOP canSave always-true — no minimum chip selection required; an empty PREOP record is clinically valid"
  - "consentimientoInformado labeled 'informado' only (D-11): UI note explicitly distinguishes from signature (consentimientoFirmadoAt)"

# Metrics
duration: 23min
completed: 2026-06-26
---

# Phase 52 Plan 06: PREOPERATORIO Form (Chip UI + HCCreatorForm Wiring) Summary

**Structured seccioned PREOPERATORIO form built as a single-page component with three catalog chip sections (antecedentes/alergias/medicación), Otro Enter→chip learning, patient profile pre-load, optional dx/tratamiento selector reusing PrimeraConsultaForm, estudios complementarios checklist, and consentimiento informado check; wired into HCCreatorForm replacing the generic textarea for pre_quirurgico**

## Performance

- **Duration:** ~23 min
- **Started:** 2026-06-26T12:55:35Z
- **Completed:** 2026-06-26T13:18:00Z
- **Tasks:** 3/3
- **Files modified:** 1 existing + 1 new + 1 type extension

## Accomplishments

### Task 1: Build PreoperatorioForm.tsx — chip sections + Otro + profile pre-load

Created `PreoperatorioForm.tsx` exporting:
- `PreoperatorioFormState` — locked shape matching the backend DTO from Plan 03/05: `{ antecedentes: string[]; alergias: string[]; medicacion: string[]; estudiosComplementarios: { laboratorio: boolean; ecg: boolean; imagenes: string[] }; consentimientoInformado: boolean; zonas: ZonaSeleccionDto[]; comentario?: string }`
- `PreoperatorioForm` — form component rendering a single seccioned page (NOT a wizard)

Key patterns:
- Local `Chip` component replicating PrimeraConsultaForm's chip (with `dashed` prop for border-dashed unsaved items)
- Three chip sections (Antecedentes / Alergias / Medicación) each loading from their per-professional catalog hook
- Each section renders an "Otro" chip that toggles a text input; Enter adds item to selected and to `nuevos[]` (displayed as dashed) if not in catalog
- Profile pre-load: `usePaciente(pacienteId)` `.condiciones`→antecedentes, `.alergias`→alergias, `.medicacion`→medicacion; items matching catalog shown as solid chips, items not in catalog shown as dashed chips
- Initial mount emit so parent `preopState` is never null on first save

Also extended `PacienteDetalle` type with `condiciones?: string[]`, `alergias?: string[]`, `medicacion?: string[]` — needed for profile pre-load (Rule 2 fix).

### Task 2: Add estudios checklist, consentimiento check, optional dx/tratamiento

Added three more sections to `PreoperatorioForm.tsx`:

1. **Optional dx/tratamiento (PREOP-02/D-08):** Checkbox "Agregar diagnóstico / tratamiento" unchecked by default. When checked, renders the imported `PrimeraConsultaForm` (not duplicated). Its `zonas` flow into `PreoperatorioFormState.zonas`. Unchecking clears `zonas: []`.

2. **Estudios complementarios (D-10):** `laboratorio` checkbox + `ecg` checkbox + `imagenes` multi-select `{ Ecografía, Tomografía, Mamografía, Otro }`. Locked shape `{ laboratorio: boolean, ecg: boolean, imagenes: string[] }`.

3. **Consentimiento informado (D-11):** Single checkbox labeled "El paciente fue informado sobre el consentimiento quirúrgico" with explanatory note distinguishing "informado" from "firmado" (signature). Sets `consentimientoInformado: boolean`. Does NOT touch `consentimientoFirmadoAt`.

### Task 3: Swap HCCreatorForm to PreoperatorioForm + pre_quirurgico save branch

Modified `HCCreatorForm.tsx`:
- Import `PreoperatorioForm` and `PreoperatorioFormState`
- Added `preopState: PreoperatorioFormState | null` state (reset to null after save)
- Added render branch: `tipoSeleccionado === 'pre_quirurgico'` renders `<PreoperatorioForm pacienteId={...} profesionalId={...} obraSocialId={...} onChange={setPreopState} />`
- Excluded `pre_quirurgico` from the generic textarea fallback (condition now checks `!== 'primera_vez' && !== 'pre_quirurgico' && !== 'tratamiento_en_consultorio'`)
- Updated `canSave`: `pre_quirurgico` branch returns `true` (empty PREOP is a valid clinical record)
- Added `pre_quirurgico` save branch in `handleSave`: sends `{ tipo: 'pre_quirurgico', tipoEntrada: 'PREOPERATORIO', antecedentes, alergias, medicacion, estudiosComplementarios, consentimientoInformado, zonas, comentario }` through `useCreateHistoriaClinicaEntry`
- Existing `primera_vez` and `tratamiento_en_consultorio` branches unchanged

## Task Commits

1. **feat(52-06): build PreoperatorioForm with three chip sections and patient profile pre-load** — `b06a3fd`
2. **feat(52-06): add estudios checklist, consentimiento check, and optional dx/tratamiento to PreoperatorioForm** — `b3c6ae4`
3. **feat(52-06): wire HCCreatorForm to render PreoperatorioForm and save pre_quirurgico payload** — `15f219d`

## Files Created/Modified

- `frontend/src/components/live-turno/tabs/hc/PreoperatorioForm.tsx` — new: full PREOP form component
- `frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` — modified: pre_quirurgico render + save branch
- `frontend/src/types/pacients.ts` — modified: PacienteDetalle extended with condiciones/alergias/medicacion

## Decisions Made

- Extended `PacienteDetalle` with profile array fields (Rule 2 auto-fix — missing critical fields for D-09 pre-load)
- Emits initial empty state on mount so HCCreatorForm.preopState is never null on save
- `canSave` for `pre_quirurgico` is always `true` — no minimum selection required
- `PrimeraConsultaForm` is imported and reused (not forked) for the optional dx/tratamiento section (D-08)
- Consentimiento label explicitly says "informado" and includes a clarifying note (T-52-17 mitigated)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] PacienteDetalle type missing condiciones/alergias/medicacion fields**
- **Found during:** Task 1
- **Issue:** `usePaciente` returns a `PacienteDetalle` which lacked `condiciones`, `alergias`, `medicacion` fields. The profile pre-load (D-09) requires these to compile and work correctly.
- **Fix:** Added `condiciones?: string[]`, `alergias?: string[]`, `medicacion?: string[]` as optional fields to `PacienteDetalle` in `frontend/src/types/pacients.ts`
- **Files modified:** `frontend/src/types/pacients.ts`
- **Commit:** `b06a3fd`

## Issues Encountered

- **npm run build fails in this environment (Node.js 18.20.8; Next.js requires >=20.9.0)** — pre-existing environment constraint, not introduced by this plan. `npx tsc --noEmit` exits 0 confirming the code is type-correct. This constraint was previously documented in 52-05-SUMMARY.md.

## Known Stubs

None — all chip sections consume real backend catalog endpoints (shipped in Plans 01/02). The pre-load reads real patient profile data. The save branch sends real PREOP fields to the backend route (shipped in Plan 03). Plan 07 will add the "Compartir link" section (intentionally out of scope here per plan directive).

## Threat Flags

None — no new network endpoints or auth surfaces beyond what was planned.

| Threat | Status |
|--------|--------|
| T-52-16 (catalog scope tampering) | Mitigated: profesionalId comes from HCCreatorForm props (sourced from professional-context store/JWT), not user-entered |
| T-52-17 (consent semantics) | Mitigated: label says "informado" + explanatory note; consentimientoFirmadoAt never touched |
| T-52-18 (profile pre-load) | Accepted: pre-load is read-only display; server-side merge is authoritative |

## Self-Check

- [x] `frontend/src/components/live-turno/tabs/hc/PreoperatorioForm.tsx` exists
- [x] `PreoperatorioForm` exported from PreoperatorioForm.tsx
- [x] `useAntecedentesCatalogo` imported in PreoperatorioForm.tsx
- [x] `usePaciente` imported in PreoperatorioForm.tsx
- [x] `PrimeraConsultaForm` imported in PreoperatorioForm.tsx
- [x] `estudiosComplementarios` present in PreoperatorioForm.tsx
- [x] `consentimientoInformado` present in PreoperatorioForm.tsx
- [x] `PreoperatorioForm` imported in HCCreatorForm.tsx
- [x] `tipoSeleccionado === 'pre_quirurgico'` present in HCCreatorForm.tsx (render + save + canSave)
- [x] `npx tsc --noEmit` exits 0
- [x] Commits b06a3fd, b3c6ae4, 15f219d exist in git log

## Self-Check: PASSED

---
*Phase: 52-preop-hc-form-chip-catalogs*
*Completed: 2026-06-26*
