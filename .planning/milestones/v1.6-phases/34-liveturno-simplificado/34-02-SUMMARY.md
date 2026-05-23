---
phase: 34-liveturno-simplificado
plan: 02
subsystem: ui
tags: [react, zustand, tanstack-query, shadcn, alertdialog, live-turno]

# Dependency graph
requires:
  - phase: 34-liveturno-simplificado
    provides: useLiveTurnoActions (cerrarSesion, iniciarSesion), live-turno.store (session, draftData)
provides:
  - UpcomingAppointments con switch-session via AlertDialog (LT-02)
  - Botón Iniciar clickeable aunque haya sesion activa
  - Secuencia cerrar→iniciar con manejo de errores y aviso de HC borrador
affects: [34-liveturno-simplificado, live-turno, 35-anything-using-UpcomingAppointments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - AlertDialogAction con e.preventDefault() para manejar cierre del dialog manualmente durante async
    - Switch-session pattern: cerrarSesion.mutateAsync primero, luego iniciarSesion.mutate — abort si primer paso falla
    - hasDraftHC calculado en cuerpo del componente (no inline en JSX) para evitar recalcular en cada render

key-files:
  created: []
  modified:
    - frontend/src/app/dashboard/components/UpcomingAppointments.tsx

key-decisions:
  - "AlertDialogAction usa e.preventDefault() para prevenir cierre automatico del dialog mientras corre handleConfirmSwitch async"
  - "cerrarSesion.mutateAsync sin dto ({}) — no auto-guardar HC draft al cambiar sesion (comportamiento intencional)"
  - "pendingTurnoNombre capturado en el momento del click para el copy del dialog (t.paciente.nombreCompleto)"

patterns-established:
  - "Switch-session: cerrar primero, si falla abortar; si ok, abrir nuevo — sin optimistic update"

requirements-completed: [LT-02]

# Metrics
duration: 5min
completed: 2026-05-14
---

# Phase 34 Plan 02: LiveTurno Simplificado — Switch-Session Summary

**AlertDialog de switch-session en UpcomingAppointments: botón Iniciar clickeable siempre, secuencia cerrar→iniciar con aviso de HC borrador**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-14T01:43:53Z
- **Completed:** 2026-05-14T01:49:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Botón "Iniciar" removido del `disabled` cuando hay sesion activa — el profesional puede cambiar de turno sin ir al panel LiveTurno primero
- AlertDialog de confirmacion muestra el nombre del paciente con sesion activa y el nombre del paciente del turno nuevo
- Aviso adicional en el dialog si hay borrador de HC sin guardar (`hasDraftHC`)
- Secuencia async: `cerrarSesion.mutateAsync({})` primero — si falla, NO abre el nuevo turno; si ok, llama `iniciarSesion.mutate(pendingTurnoId)`

## Task Commits

1. **Task 1: Agregar lógica de switch-session al botón Iniciar** - `736533c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `frontend/src/app/dashboard/components/UpcomingAppointments.tsx` - AlertDialog switch-session, estado local showSwitchDialog/pendingTurnoId/pendingTurnoNombre, hasDraftHC, handleConfirmSwitch, botón Iniciar sin !!session en disabled

## Decisions Made
- `AlertDialogAction` usa `e.preventDefault()` para prevenir el cierre automático del dialog mientras la operación async `handleConfirmSwitch` corre — el cierre se maneja explícitamente con `setShowSwitchDialog(false)` en el handler
- `cerrarSesion.mutateAsync({})` sin entradaHCId para no auto-guardar el HC draft al cambiar sesion (comportamiento intencional — el aviso en el dialog advierte al profesional)
- `pendingTurnoNombre` capturado con `t.paciente?.nombreCompleto ?? 'el paciente'` al momento del click

## Deviations from Plan
None - plan ejecutado exactamente como estaba especificado.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- LT-02 completo: switch-session funcional en UpcomingAppointments
- LT-01 y LT-03 pendientes (según CONTEXT.md y ROADMAP)
- No blockers conocidos para continuar con el siguiente plan de la fase 34

---
*Phase: 34-liveturno-simplificado*
*Completed: 2026-05-14*
