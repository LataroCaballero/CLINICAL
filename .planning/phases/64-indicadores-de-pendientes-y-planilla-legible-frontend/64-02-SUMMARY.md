---
phase: 64-indicadores-de-pendientes-y-planilla-legible-frontend
plan: 02
subsystem: ui
tags: [react, nextjs, shadcn, tailwind, kanban, crm]

# Dependency graph
requires:
  - phase: 63
    provides: "Embudo CRM que puebla automáticamente NUEVO_LEAD/TURNO_AGENDADO"
provides:
  - "Badge condicional por columnId en PatientCard.tsx: 'Dar turno' (NUEVO_LEAD) y 'Ser atendido' (TURNO_AGENDADO)"
affects: [64-03, kanban, crm]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Badge shadcn variant=outline + clases Tailwind de color para indicadores de estado"]

key-files:
  created: []
  modified: [frontend/src/components/crm/PatientCard.tsx]

key-decisions:
  - "Color ámbar para el nuevo badge de pendiente, coherente con los acentos ámbar existentes en la card (Espera)"
  - "Badge insertado junto a la zona inferior de registro de contacto/pendientes (antes de Espera/Aut. pendiente), respetando D-03"

patterns-established: []

requirements-completed: [CONTACTO-03, CONTACTO-04]

# Metrics
duration: 8min
completed: 2026-08-03
---

# Phase 64 Plan 02: Badge de Pendiente por Etapa en PatientCard Summary

**Badge shadcn condicional por columnId en PatientCard.tsx: "Dar turno" para NUEVO_LEAD, "Ser atendido" para TURNO_AGENDADO**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-03T16:29:00Z
- **Completed:** 2026-08-03T16:37:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- La secretaria ve de un vistazo qué acción falta por paciente en el kanban: "Dar turno" para leads nuevos, "Ser atendido" para consultas agendadas
- Se usó el componente shadcn `Badge` (no `<span>` a mano) exclusivamente para el nuevo indicador, sin refactorizar los spans existentes (Espera / Aut. pendiente)

## Task Commits

Each task was committed atomically:

1. **Task 1: Badge de pendiente por etapa en PatientCard** - `177969d` (feat)

**Plan metadata:** (worktree mode — orchestrator commits STATE.md/ROADMAP.md separately)

## Files Created/Modified
- `frontend/src/components/crm/PatientCard.tsx` - Agregado import de `Badge` desde `@/components/ui/badge` y dos renders condicionales por `columnId`: `NUEVO_LEAD` → "Dar turno", `TURNO_AGENDADO` → "Ser atendido", en la zona inferior de badges de pendientes

## Decisions Made
- Estilo `variant="outline"` + clases Tailwind ámbar (`bg-amber-50 text-amber-700 border-amber-200`), siguiendo el idiom del repo (`ProximosTurnos.tsx`) y coherente con el acento ámbar del span "Espera" ya presente en la misma card
- Badge insertado inmediatamente antes de los bloques de "Lista de espera" y "Autorización pendiente" existentes, dentro de la misma zona inferior de la card (D-03)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- El worktree no tenía `node_modules` instalado (gitignored, no compartido entre worktrees). Se creó un symlink temporal hacia `frontend/node_modules` del repo principal únicamente para ejecutar `tsc --noEmit` y `eslint` de verificación, y se eliminó inmediatamente después (no forma parte del commit, no afecta el repositorio).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `PatientCard.tsx` ahora expone visualmente el estado accionable de leads nuevos y consultas agendadas; listo para verificación visual (UAT) en el checkpoint de fase
- Sin bloqueos para 64-03

---
*Phase: 64-indicadores-de-pendientes-y-planilla-legible-frontend*
*Completed: 2026-08-03*
