---
phase: 59-stepper-accionable
plan: "02"
subsystem: frontend-crm
tags: [crm, stepper, quick-actions, presupuesto-prefill, cirugia-modal, hc-invalidation]
dependency_graph:
  requires: [EtapaStepper.onCirugiaClick, EtapaStepper.pasos, EtapaStepper.flujo, SurgeryAppointmentModal, GenerarPresupuestoModal, HCCreatorDialog.onSaved, useCirugiasCatalogo, useTratamientosProfesional]
  provides: [CardActionsSheet.orquestacion-3-modales, CardActionsSheet.crm-kanban-invalidation, SurgeryAppointmentModal.paciente-preseleccionado, HCCreatorDialog.onSaved-callback]
  affects: [crm-kanban query, pasos.cirugia, pasos.presupuesto, pasos.hc]
tech_stack:
  added: []
  patterns: [inline-modal-orchestration, query-invalidation-on-action, catalog-prefill-matching, backward-compat-prop-retention]
key_files:
  created: []
  modified:
    - frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx
    - frontend/src/components/patient/PatientDrawer/views/HCCreatorDialog.tsx
    - frontend/src/components/crm/CardActionsSheet.tsx
decisions:
  - "SurgeryAppointmentModal recibe pacienteId?/pacienteNombre? (D-09): cuando están presentes, el formulario se siembra vía useEffect y el AutocompletePaciente se reemplaza por un campo lectura"
  - "createMutation.onSuccess de SurgeryAppointmentModal invalida ['crm-kanban'] además de ['turnos'] (Gap #2: sin esto el stepper no se re-colorea)"
  - "HCCreatorDialog agrega onSaved?: () => void — llamado junto a onOpenChange(false) para permitir que el sheet invalide crm-kanban"
  - "handlePresupuestoClick ya no navega al drawer (D-08/D-09): abre GenerarPresupuestoModal inline con initialItems del catálogo"
  - "initialItems: match case-insensitive substring de patient.procedimiento contra nombre de cada CirugiaCatalogo (precioARS) y TratamientoConInsumos (precio); sin match → ítem libre con string procedimiento; procedimiento null → ítem vacío"
  - "onOpenDrawerWithView no destructurado (Props interface sin cambios para backward compat con call sites en KanbanBoard)"
  - "onCreated y onClose de GenerarPresupuestoModal invalidan ['crm-kanban'] cubriendo el caso presupuesto enviado"
metrics:
  duration_minutes: 22
  completed_date: "2026-07-04"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 3
---

# Phase 59 Plan 02: Stepper Accionable — Wiring de Quick-Actions

**One-liner:** Cablea las 3 quick-actions del stepper (HC, presupuesto prellenado, cirugía) reutilizando `HCCreatorDialog`, `GenerarPresupuestoModal` y `SurgeryAppointmentModal`, con invalidación de `['crm-kanban']` en cada acción para re-colorear el stepper.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Pre-selección de paciente en SurgeryAppointmentModal + callback onSaved en HCCreatorDialog | `b122cdd` | SurgeryAppointmentModal.tsx, HCCreatorDialog.tsx |
| 2 | Cablear onCirugiaClick + pasar pasos/flujo al stepper + invalidar crm-kanban tras HC | `adb2655` | CardActionsSheet.tsx |
| 3 | Presupuesto prellenado desde el catálogo montado en el sheet + invalidación | `550e96b` | CardActionsSheet.tsx |

## What Was Built

### Task 1 — SurgeryAppointmentModal + HCCreatorDialog

`SurgeryAppointmentModal.tsx` ahora acepta dos props opcionales `pacienteId?` y `pacienteNombre?`:
- Cuando `pacienteId` está presente (flujo CRM), un `useEffect` siembra `pacienteId` y `pacienteNombre` en el formulario al abrirse.
- El `AutocompletePaciente` se reemplaza por un campo lectura (`div.bg-muted`) mostrando el nombre del paciente — impide cambiar el paciente en este flujo (D-09).
- `createMutation.onSuccess` ahora invalida `['crm-kanban']` además de `['turnos']`, lo que dispara el re-fetch del kanban y re-colorea el stepper cuando `pasos.cirugia` pasa a `'completo'` (Gap #2).

`HCCreatorDialog.tsx` agrega `onSaved?: () => void` a `HCCreatorDialogProps`. El callback es invocado tras guardar la HC (junto a `onOpenChange(false)`), permitiendo que el sheet invalide `['crm-kanban']` para re-colorear el paso HC. Sin la prop, el comportamiento es idéntico al actual (backward-compatible).

### Task 2 — CardActionsSheet: wiring del stepper de cirugía

`CardActionsSheet.tsx` extendido con:
- `import { useQueryClient }` de `@tanstack/react-query` y `const qc = useQueryClient()`.
- Import de `SurgeryAppointmentModal` desde `@/app/dashboard/turnos/SurgeryAppointmentModal`.
- Estado `const [turnoOpen, setTurnoOpen] = useState(false)`.
- `<EtapaStepper>` ahora recibe `pasos={patient.pasos}`, `flujo={patient.flujo}` y `onCirugiaClick={profesionalId ? () => setTurnoOpen(true) : undefined}` (gating idiom de `onHCClick`).
- `<HCCreatorDialog>` recibe `onSaved={() => qc.invalidateQueries({ queryKey: ['crm-kanban'] })}`.
- `<SurgeryAppointmentModal>` montado como sibling dentro de `<SheetContent>` con `pacienteId={patient.id}` y `pacienteNombre={patient.nombreCompleto}` (Radix DialogPortal escapa a document.body, sin conflicto z-index).

### Task 3 — Presupuesto prellenado inline

`CardActionsSheet.tsx` extendido con:
- Imports de `GenerarPresupuestoModal`, `PresupuestoItemInput`, `useCirugiasCatalogo`, `useTratamientosProfesional`.
- Catalog hooks llamados antes del `if (!patient) return null` (regla de hooks).
- `initialItems` derivado tras el guard: match case-insensitive de `patient.procedimiento` (substring bidirecional) contra cada `CirugiaCatalogo.nombre` (usando `precioARS`) y `TratamientoConInsumos.nombre` (usando `precio`). Fallback a ítem libre si sin match.
- `handlePresupuestoClick` simplificado a `setPresupuestoOpen(true)` — ya no navega al drawer (D-08/D-09).
- `<GenerarPresupuestoModal>` montado con `initialItems`, `onCreated` y `onClose` que invalidan `['crm-kanban']` para cubrir el caso presupuesto ENVIADO/ACEPTADO.
- `onOpenDrawerWithView` no destructurado (Props interface sin cambios para no romper call sites en `KanbanBoard`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] onOpenDrawerWithView causaba lint warning al no ser usada tras cambiar handlePresupuestoClick**
- **Found during:** Task 3 lint check
- **Issue:** Al cambiar `handlePresupuestoClick` para no navegar al drawer, `onOpenDrawerWithView` quedó destructurada sin usar (`@typescript-eslint/no-unused-vars` warning).
- **Fix:** Eliminada del destructuring pattern (el prop sigue en la Props interface para backward compat con call sites). TypeScript acepta destructuring parcial sin error.
- **Files modified:** `CardActionsSheet.tsx` (destructuring del componente)
- **Commit:** `550e96b`

## Known Stubs

None — todas las quick-actions están completamente cableadas:
- HC: `HCCreatorDialog` abre y guarda; `onSaved` invalida `crm-kanban`.
- Presupuesto: `GenerarPresupuestoModal` abre con `initialItems` del catálogo; `onCreated`/`onClose` invalidan `crm-kanban`.
- Cirugía: `SurgeryAppointmentModal` abre con paciente fijo; `onSuccess` invalida `crm-kanban`.

El `pasos.presupuesto` solo pasa a `'completo'` cuando el presupuesto queda ENVIADO/ACEPTADO — `GenerarPresupuestoModal` continúa al flujo de envío (`EnviarPresupuestoModal`) tras crear, lo que es el comportamiento correcto del modal existente.

## Threat Flags

None — wiring frontend que reutiliza modales/endpoints ya autenticados (T-59-02 accept: POST /turnos/cirugia ya guardado con @Auth; T-59-03 mitigate: pacienteId/profesionalId del contexto autenticado; T-59-04 accept: catálogos ya filtran por profesional).

## Self-Check: PASSED

- [x] `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx` existe y contiene pacienteIdProp, pacienteNombreProp, ['crm-kanban'] invalidation
- [x] `frontend/src/components/patient/PatientDrawer/views/HCCreatorDialog.tsx` existe y contiene `onSaved?: () => void` y `onSaved?.()` call
- [x] `frontend/src/components/crm/CardActionsSheet.tsx` existe y contiene GenerarPresupuestoModal, SurgeryAppointmentModal, pasos/flujo/onCirugiaClick en EtapaStepper, initialItems matching
- [x] Commits `b122cdd`, `adb2655`, `550e96b` presentes en git log
- [x] `npx tsc --noEmit` sin errores en los 3 archivos modificados
- [x] `npm run lint` sin errores nuevos en los 3 archivos modificados (warning pre-existente en SurgeryAppointmentModal sobre react-hook-form `watch()` — fuera de scope)
