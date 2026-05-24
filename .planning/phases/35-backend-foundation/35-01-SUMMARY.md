---
phase: 35-backend-foundation
plan: 01
subsystem: api
tags: [nestjs, prisma, crm, kanban, pacientes]

# Dependency graph
requires: []
provides:
  - updateEtapaCRM sin validación de presupuesto ACEPTADO para CONFIRMADO
  - getKanban expone campo flujo por paciente en el response
affects:
  - 36-drag-drop
  - 37-sheet-redesign

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Movimiento libre de etapas CRM: solo PERDIDO requiere motivoPerdida; resto sin restricciones"

key-files:
  created: []
  modified:
    - backend/src/modules/pacientes/pacientes.service.ts

key-decisions:
  - "Remover validación presupuesto ACEPTADO para CONFIRMADO: el profesional puede mover libremente cualquier etapa"
  - "EstadoPresupuesto no eliminado del import porque sigue usándose en otras partes del archivo (líneas 119-120)"

patterns-established:
  - "CRM stage transitions: solo PERDIDO tiene validación de datos (motivoPerdida); las demás etapas son libres"

requirements-completed:
  - CRM-01

# Metrics
duration: 8min
completed: 2026-05-24
---

# Phase 35 Plan 01: Backend Foundation Summary

**updateEtapaCRM abre movimiento libre a CONFIRMADO eliminando la validación de presupuesto; getKanban expone campo flujo por paciente para FlujoBadge en Phase 37**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-24T00:00:00Z
- **Completed:** 2026-05-24T00:08:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Eliminado el bloque `if (etapaCRM === CONFIRMADO)` que requería presupuesto ACEPTADO antes de confirmar un paciente
- Limpiado el `select` de `findUnique` en `updateEtapaCRM` (removida la relación `presupuestos` anidada)
- Agregado `flujo: true` en el select del `findMany` de `getKanban`
- Agregado `flujo: p.flujo ?? null` en el response mapping de `getKanban`

## Task Commits

Each task was committed atomically:

1. **Task 1: Remover validación CONFIRMADO de updateEtapaCRM** - `eedd5f4` (fix)
2. **Task 2: Agregar campo flujo al endpoint GET /kanban** - `2b6f377` (feat)

## Files Created/Modified
- `backend/src/modules/pacientes/pacientes.service.ts` - Dos cambios quirúrgicos: (1) remoción del bloque CONFIRMADO y limpieza del select en updateEtapaCRM; (2) flujo: true en select y flujo: p.flujo ?? null en mapping de getKanban

## Decisions Made
- `EstadoPresupuesto` import NO fue eliminado porque sigue siendo utilizado en otras secciones del archivo (líneas 119-120 relacionadas con presupuestos)
- Validación de `motivoPerdida` para PERDIDO permanece intacta — es integridad de datos, no una restricción de negocio a remover

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend listo para Phase 36 (Drag-and-Drop + Warning Infrastructure)
- getKanban ahora devuelve `flujo` habilitando el FlujoBadge en Phase 37 (Sheet Redesign)
- No hay blockers

---
*Phase: 35-backend-foundation*
*Completed: 2026-05-24*
