---
phase: quick-1-eliminar-dropdown-tipo-de-consulta-de-hc
plan: 01
subsystem: ui
tags: [react, historia-clinica, hc-creator, tipo-entrada]

requires:
  - phase: 41 (v1.8 Tipo de Entrada en Historia Clínica)
    provides: TipoEntradaHC enum, PLANTILLA_TO_TIPO_ENTRADA mapping, selector "Tipo de consulta" en HCCreatorForm
provides:
  - HCCreatorForm sin dropdown "Tipo de consulta" — tipoEntrada derivado automáticamente de la plantilla seleccionada
affects: [historia-clinica, live-turno, patient-drawer]

tech-stack:
  added: []
  patterns: [tipoEntrada derivado de plantilla al guardar (sin estado UI dedicado)]

key-files:
  created: []
  modified:
    - frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx

key-decisions:
  - "Mapeo 1:1 plantilla→tipoEntrada sin casos ambiguos (4 plantillas, confirmado por el usuario); personalización por médico queda para el futuro"
  - "Fallback defensivo ?? 'CONTROL' preservado en el lookup"
  - "Sin cambios de contrato: useCreateHistoriaClinicaEntry y backend intactos — resolverNuevoFlujo no afectado"

patterns-established:
  - "Clasificación implícita: el tipo de entrada de HC se infiere de la plantilla, el médico no la elige"

requirements-completed: [QUICK-1]

duration: ~10min (auto) + verificación humana
completed: 2026-06-12
---

# Quick Task 1: Eliminar dropdown "Tipo de consulta" de HCCreatorForm

**El selector de tipo de consulta agregado en v1.8 fue eliminado: el tipoEntrada se infiere 1:1 de la plantilla elegida vía PLANTILLA_TO_TIPO_ENTRADA, sacando un paso innecesario al médico sin tocar el contrato del backend.**

## Performance

- **Completed:** 2026-06-12
- **Tasks:** 2/2 (1 auto + 1 checkpoint human-verify aprobado)
- **Files modified:** 1 (`HCCreatorForm.tsx`, +3/-40)

## Accomplishments

- Eliminado el bloque Select "Tipo de consulta", el estado `tipoEntradaHC` y la constante `TIPO_ENTRADA_OPTIONS`
- Las 3 llamadas a `createEntry.mutateAsync` envían `tipoEntrada: PLANTILLA_TO_TIPO_ENTRADA[tipoSeleccionado] ?? 'CONTROL'`
- LiveTurno y PatientDrawer (ambos usan HCCreatorForm) quedan sin el paso extra; clasificación CRM al cerrar sesión sin cambios

## Task Commits

1. **Task 1: Eliminar dropdown y derivar tipoEntrada del mapeo de plantilla** — `6886df7` (feat)
2. **Task 2: Verificación humana en LiveTurno y PatientDrawer** — aprobada por el usuario (sin commit)

## Files Created/Modified

- `frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` — formulario HC sin selector de tipo de consulta; tipoEntrada derivado al guardar

## Verification

- `tsc --noEmit` pasa; ESLint limpio en el archivo
- 0 ocurrencias de "Tipo de consulta"; 3 ocurrencias de `tipoEntrada: PLANTILLA_TO_TIPO_ENTRADA`
- `git diff --stat` solo muestra HCCreatorForm.tsx (hook y backend intactos)
- Usuario verificó manualmente: sin dropdown en ambos flujos, tipoEntrada correcto en los requests POST, entradas visibles en la HC
