---
phase: 43-archivar-embudo-crm
plan: "02"
subsystem: ui
tags: [react, tanstack-query, crm, kanban, mutation, sheet]

# Dependency graph
requires:
  - phase: 43-01-backend-crm-archivo
    provides: "PATCH /pacientes/:id/crm-archivo endpoint + crmArchivado field + kanban/lista-accion filters"
provides:
  - "useUpdateCrmArchivo TanStack mutation hook (PATCH crm-archivo + query invalidation)"
  - "Botón 'Archivar del embudo' con Dialog de confirmación en CardActionsSheet"
  - "Flujo completo ARCH-04: archivar retira del kanban y lista de acción sin reload"
affects: [crm-kanban, lista-accion, pacientes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dialog-from-Sheet: Radix Dialog dentro de Sheet para evitar z-index/focus-trap conflicts"
    - "onSettled invalidation: invalidar por key prefix cubre todas las variantes de profesionalId"

key-files:
  created:
    - frontend/src/hooks/useUpdateCrmArchivo.ts
  modified:
    - frontend/src/components/crm/CardActionsSheet.tsx

key-decisions:
  - "ARCH-04: Dialog de confirmación dentro del Sheet usando patrón Dialog-from-Sheet (Radix monta en document.body)"
  - "onSettled en lugar de onSuccess para invalidar queries — garantiza invalidación incluso si hay error de red transitorio"
  - "Invalidación por prefix key (no exactMatch) — cubre crm-kanban con cualquier profesionalId"

patterns-established:
  - "Dialog-from-Sheet: Radix Dialog (open/setOpen state) montado junto a otros dialogs en CardActionsSheet para evitar z-index con Sheet"

requirements-completed: [ARCH-04]

# Metrics
duration: ~10min (human verify approved immediately)
completed: "2026-06-09"
---

# Phase 43 Plan 02: Frontend Archivar Sheet Summary

**TanStack mutation hook + botón "Archivar del embudo" con confirmación Radix Dialog en CardActionsSheet, completando el ciclo ARCH-04 end-to-end**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-09T02:46:17Z
- **Completed:** 2026-06-09T02:56:00Z
- **Tasks:** 3 (2 auto + 1 human-verify)
- **Files modified:** 2

## Accomplishments

- `useUpdateCrmArchivo` hook creado: PATCH `/pacientes/:id/crm-archivo`, invalida `crm-kanban` + `lista-accion` + `pacientes` en `onSettled`
- Botón "Archivar del embudo" agregado al footer de `CardActionsSheet` con Dialog de confirmación (patrón Dialog-from-Sheet)
- Verificación humana confirmada (ARCH-01/03/04): al archivar, el paciente desaparece del kanban y de la lista de acción inmediatamente, y sigue visible en la sección de Pacientes

## Task Commits

Each task was committed atomically:

1. **Task 1: Crear hook useUpdateCrmArchivo** - `f9a7c5b` (feat)
2. **Task 2: Agregar botón 'Archivar del embudo' con confirmación al CardActionsSheet** - `d3a816d` (feat)
3. **Task 3: Verificación humana — aprobada por usuario** - (human-verify, no commit de código)

## Files Created/Modified

- `frontend/src/hooks/useUpdateCrmArchivo.ts` - Mutation hook que llama PATCH /pacientes/:id/crm-archivo e invalida queries CRM/lista-accion/pacientes
- `frontend/src/components/crm/CardActionsSheet.tsx` - Agrega botón "Archivar del embudo" + Dialog de confirmación con toast y cierre del sheet al completar

## Decisions Made

- Dialog de confirmación usa patrón Dialog-from-Sheet (Radix Dialog con `open` state propio, montado al nivel del Sheet) — evita z-index y focus-trap conflicts
- `onSettled` elegido sobre `onSuccess` para la invalidación de queries, garantizando que el cache se refresque incluso ante errores transitorios
- Invalidación por key prefix (sin `exact: true`) — `["crm-kanban"]` cubre todas las variantes `["crm-kanban", profesionalId]`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. El endpoint backend ya estaba disponible del plan 43-01.

## Next Phase Readiness

- ARCH-01/02/03/04 completos — el feature "Archivar del Embudo CRM" está completamente cerrado
- Phase 43 completa al 100% (2/2 planes done)
- Milestone v1.8 "Tipos de Turno y Flujo Clínico" completo (todas las fases 40-43 done)
- Toggle de "desarchivar" disponible via PATCH con `{ archivado: false }` si se necesita en el futuro (no requiere cambios de schema)

---
*Phase: 43-archivar-embudo-crm*
*Completed: 2026-06-09*
