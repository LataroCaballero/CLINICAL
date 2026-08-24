---
phase: 66-correcciones-de-ui-de-historia-cl-nica-frontend
plan: 01
subsystem: ui
tags: [react, typescript, historia-clinica, patient-drawer, jsonb-render]

# Dependency graph
requires:
  - phase: historia-clinica (HCCreatorDialog/HCCreatorForm wizard)
    provides: "Wizard de creación de HC ya cableado como '+ Nueva HC' en PatientDrawer"
provides:
  - "Rama de render pre_quirurgico en HCEntryContent (chips + detalle) sobre el JSONB persistido"
  - "Título legible 'Pre-quirúrgico' en TIPO_LABELS"
  - "HistoriaClinica sin el dropdown/form/template-selector muertos (wizard único punto de creación)"
affects: [historia-clinica, patient-drawer, ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Render read-only de contenido JSONB persistido tipado (cast a ContenidoPreQuirurgico), ocultando campos vacíos con guards de longitud/truthiness"

key-files:
  created: []
  modified:
    - frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx
    - frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx

key-decisions:
  - "Renderizar la forma REAL persistida del pre_quirurgico (sin sección `zonas`) en vez del DTO de salida — desviación fundamentada de D-04, ver 66-PATTERNS.md"
  - "consentimientoInformadoAt se muestra como Sí/No (truthiness), no como ISO crudo"
  - "Ocultar campos vacíos (D-05): sin placeholder '—' en las ramas nuevas"

patterns-established:
  - "Nueva rama de tipo de entrada de HC: añadir interface al union ContenidoEntrada + rama condicional en HCEntryChips (preview) y HCEntryFullContent (detalle), reutilizando el estilo de la rama primera_vez sin extraer componentes de LiveTurno"

requirements-completed: [HCUI-01, HCUI-02]

# Metrics
duration: ~4min
completed: 2026-08-08
---

# Phase 66 / Plan 01: Correcciones de UI de Historia Clínica Summary

**Render del detalle Pre-quirúrgico (JSONB persistido) en la ficha del paciente + eliminación del dropdown "Nueva entrada" muerto, dejando el wizard "+ Nueva HC" como único camino de creación**

## Performance

- **Duration:** ~4 min (ejecución de tareas auto)
- **Tasks:** 2 auto + 1 checkpoint human-verify (aprobado)
- **Files modified:** 2

## Accomplishments
- **HCUI-02:** Nueva rama `pre_quirurgico` en `HCEntryContent` (chips + detalle) que renderiza antecedentes, alergias, medicación (chips outline), estudios complementarios (laboratorio/ECG/imágenes), consentimiento informado (Sí/No) y comentario desde el JSONB persistido, con estilo consistente con `primera_vez` y sin sección `zonas`. Campos vacíos ocultos.
- **HCUI-02:** Título legible "Pre-quirúrgico" en `TIPO_LABELS`.
- **HCUI-01:** Eliminado el dropdown "Nueva entrada" (texto libre / usar plantilla), la Card de texto libre y el `Dialog` selector de plantilla, junto con estados/handlers/imports huérfanos (`showForm`, `showTemplateSelector`, `handleGuardar`, `handleSelectTemplate`, `Textarea`, `DropdownMenu*`, `Plus`/`ChevronDown`, hooks de creación asociados). El wizard `HCCreatorDialog` de PatientDrawer queda como único camino de creación.

## Task Commits

Cada tarea fue commiteada atómicamente:

1. **Task 1: Render de detalle Pre-quirúrgico (HCUI-02) + título legible** — `601b2c4` (feat)
2. **Task 2: Eliminar dropdown viejo y código muerto de HistoriaClinica (HCUI-01/D-01/D-02)** — `fae957f` (refactor)
3. **Task 3: Checkpoint human-verify (blocking)** — aprobado por el usuario (verificación manual en navegador)

## Files Created/Modified
- `frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx` — Interface `ContenidoPreQuirurgico` en el union `ContenidoEntrada` + dos ramas de render `pre_quirurgico` (HCEntryChips y HCEntryFullContent).
- `frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx` — `TIPO_LABELS.pre_quirurgico` añadido; dropdown/form/template-selector muertos y sus estados/handlers/imports huérfanos removidos.

## Decisions Made
- Se renderiza la forma realmente persistida del contenido pre_quirurgico (sin `zonas`), no el DTO de salida de HCCreatorForm (desviación fundamentada de D-04, documentada en 66-PATTERNS.md).
- `consentimientoInformadoAt` se muestra como Sí/No en vez del timestamp ISO crudo.
- D-05 aplicado: campos vacíos ocultos con guards, sin placeholder `—` en las ramas nuevas.

## Deviations from Plan
None - plan executed exactly as written (la desviación de shape frente a D-04 estaba explícitamente prevista y fundamentada en el plan/PATTERNS).

## Issues Encountered
- `npm run lint` reporta 2 errores preexistentes `@typescript-eslint/no-explicit-any` en `HistoriaClinica.tsx:291/293` (`getTituloEntrada`, casts `as any`), confirmados presentes en `HEAD~1` (predatan este plan, fuera de scope). El borrado de HCUI-01 no introdujo imports/variables huérfanos. `npx tsc --noEmit` → exit 0.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Cambio 100% frontend, sin migraciones ni nuevos endpoints. Checkpoint humano aprobado.
- Las entradas viejas de texto libre siguen renderizándose igual (verificado en checkpoint).

---
*Phase: 66-correcciones-de-ui-de-historia-cl-nica-frontend*
*Completed: 2026-08-08*
