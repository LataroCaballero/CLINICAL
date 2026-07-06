---
phase: 45-formulario-primera-consulta
plan: "02"
subsystem: ui
tags: [react, typescript, tanstack-query, useCatalogoHC, PrimeraConsultaForm, ZonaSeleccionDto]

# Dependency graph
requires:
  - phase: 44-schema-catalogo-en-bd
    provides: useCatalogoHC hook, ZonaHC/DiagnosticoHC/TratamientoHC types, GET /catalogo-hc endpoint
provides:
  - PrimeraConsultaForm rediseñado con zona como eje, consumiendo useCatalogoHC(profesionalId)
  - ZonaSeleccionDto + zonas[] en CreateEntradaDto (legacy preserved)
  - HCCreatorForm y TurnoHCModal envían zonas[] al backend
  - Precio resuelto desde catálogo con fallback a tratamientosProfesional (FORM-04)
affects: [45-03, historia-clinica-renderer, live-turno, patient-drawer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PrimeraConsultaFormState uses ZonaSeleccionDto[] as primary structure (zone-centric)
    - useEffectiveProfessionalId called before early return in component (hooks rules compliance)
    - Tratamiento price lookup: catalog precio → fallback tratamientosProfesional → 0

key-files:
  created: []
  modified:
    - frontend/src/components/live-turno/tabs/hc/PrimeraConsultaForm.tsx
    - frontend/src/hooks/useCreateHistoriaClinicaEntry.ts
    - frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx
    - frontend/src/app/dashboard/components/TurnoHCModal.tsx

key-decisions:
  - "PrimeraConsultaFormState reemplaza diagnostico/tratamientos planos por zonas: ZonaSeleccionDto[] — eje de toda la UX v1.9"
  - "Legacy DiagnosticoDto/tratamientos preservados en CreateEntradaDto para LiveTurnoFooter auto-guardado de borrador"
  - "onGenerarPresupuesto mantenida en props públicas aunque TurnoHCModal pase noop — contrato FORM-04 compartido"
  - "useEffectiveProfessionalId movido antes del early return en TurnoHCModal para cumplir reglas de hooks"

patterns-established:
  - "Zone-centric form: chips de zonas → bloque por zona seleccionada (etiqueta + diagnósticos + tratamientos)"
  - "Price fallback chain: t.precio ?? tratamientosProfesional.find(byName)?.precio ?? 0"
  - "Generar Presupuesto: pvState.zonas.flatMap(z => z.tratamientos) para aplanar todas las zonas"

requirements-completed: [FORM-01, FORM-02, FORM-04]

# Metrics
duration: 4min
completed: 2026-06-12
---

# Phase 45 Plan 02: Formulario Primera Consulta Summary

**PrimeraConsultaForm rediseñado zona-céntrico consumiendo useCatalogoHC, con ZonaSeleccionDto[] como estado principal y ambos consumidores (HCCreatorForm + TurnoHCModal) enviando zonas[] al backend**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-06-12T22:45:28Z
- **Completed:** 2026-06-12T22:49:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- PrimeraConsultaForm reescrito: chips de zonas desde catálogo BD, grupos por zona seleccionada con etiqueta visible, FORM-01/FORM-02 implementados
- ZonaSeleccionDto exportado desde useCreateHistoriaClinicaEntry; CreateEntradaDto gana zonas[] preservando legacy
- HCCreatorForm pasa profesionalId a PrimeraConsultaForm; canSave y handleSave actualizados; Generar Presupuesto aplana tratamientos de todas las zonas (FORM-04)
- TurnoHCModal: useEffectiveProfessionalId antes del early return; profesionalId propagado a PrimeraConsultaForm; dto con zonas[]

## Task Commits

Each task was committed atomically:

1. **Task 1: Rediseñar PrimeraConsultaForm con zona como eje** - `e0f9163` (feat)
2. **Task 2: Cablear HCCreatorForm y TurnoHCModal al nuevo estado** - `de8dd67` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `frontend/src/components/live-turno/tabs/hc/PrimeraConsultaForm.tsx` - Reescritura completa: chips de zonas desde useCatalogoHC, grupos por zona con etiqueta, precio lookup con fallback
- `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` - Agregar ZonaSeleccionDto interface + zonas?: ZonaSeleccionDto[] en CreateEntradaDto
- `frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` - profesionalId prop a PrimeraConsultaForm, canSave/handleSave/Generar Presupuesto actualizados
- `frontend/src/app/dashboard/components/TurnoHCModal.tsx` - useEffectiveProfessionalId + profesionalId a PrimeraConsultaForm, canSave/handleSave actualizados

## Decisions Made
- `PrimeraConsultaFormState` reemplaza `diagnostico`/`tratamientos` planos por `zonas: ZonaSeleccionDto[]` — nuevo eje de toda la UX v1.9
- Legacy `DiagnosticoDto`/`tratamientos` preservados en `CreateEntradaDto` para el path de auto-guardado de borrador en `LiveTurnoFooter` (fuera de scope)
- `onGenerarPresupuesto` mantenida en props aunque `TurnoHCModal` use noop — contrato público FORM-04
- `useEffectiveProfessionalId` llamado antes del `if (!turno) return null` para cumplir reglas de hooks de React

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npm run build` falla por Node.js 18 vs requerimiento Next.js >=20.9.0 — pre-existente en el entorno, no relacionado con los cambios. TypeScript `npx tsc --noEmit` pasa con 0 errores (exit code 0).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PrimeraConsultaForm listo para Phase 45-03 (renderer de historial para zonas[] en EntryCard)
- El lib `zonas-diagnostico.ts/.json` puede eliminarse en 45-03 una vez confirmado que no quedan imports restantes
- Backend (45-01) ya acepta `zonas[]` en el DTO — frontend y backend alineados

---
*Phase: 45-formulario-primera-consulta*
*Completed: 2026-06-12*
