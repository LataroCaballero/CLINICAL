---
phase: 34-liveturno-simplificado
plan: "01"
subsystem: frontend/live-turno
tags:
  - live-turno
  - ui-cleanup
  - timer-removal
  - ux
dependency_graph:
  requires: []
  provides:
    - LiveTurnoFooter with explicit no-HC exit path
    - Timer-free LiveTurno UI (Header, Footer, Indicator)
  affects:
    - frontend/src/components/live-turno/
    - frontend/src/app/dashboard/components/ActiveSessionBanner.tsx
tech_stack:
  added: []
  patterns:
    - AlertDialog with controlled open state for destructive actions
    - cerrarSesion.mutateAsync({}) called without entradaHCId for no-HC exit
key_files:
  created: []
  modified:
    - frontend/src/components/live-turno/LiveTurnoHeader.tsx
    - frontend/src/components/live-turno/LiveTurnoFooter.tsx
    - frontend/src/components/live-turno/LiveTurnoIndicator.tsx
    - frontend/src/components/live-turno/LiveTurnoRecoveryDialog.tsx
    - frontend/src/app/dashboard/components/ActiveSessionBanner.tsx
  deleted:
    - frontend/src/hooks/useLiveTurnoTimer.ts
decisions:
  - Timer UI completely removed from LiveTurno panel — hook deleted, no timer in Header/Footer/Indicator/Banner/RecoveryDialog
  - LiveTurnoIndicator shows tipoTurno badge instead of elapsed time
  - "Cerrar sin guardar entrada de HC" calls cerrarSesion.mutateAsync({}) with no entradaHCId — clean exit without HC auto-save
  - "Finalizar sesion" dialog keeps auto-save HC logic intact
metrics:
  duration_minutes: 3
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
  files_deleted: 1
  completed_date: "2026-05-14"
---

# Phase 34 Plan 01: Timer Removal and Explicit HC Exit Summary

**One-liner:** Eliminated timer from all LiveTurno UI surfaces and added an explicit "Cerrar sin guardar entrada de HC" escape hatch via a dedicated AlertDialog calling cerrarSesion without auto-save.

## What Was Built

### LT-01: Timer eliminated from all UI surfaces
- **LiveTurnoHeader:** Removed `Clock` widget, `useLiveTurnoTimer` import, `elapsed` variable. "En curso" dot indicator preserved.
- **LiveTurnoIndicator:** Removed compact timer span. Added `session.tipoTurno` badge in its place.
- **LiveTurnoFooter:** Removed "Duracion: XX:XX" label from left side of footer. Layout changed from `justify-between` to `justify-end`.
- **ActiveSessionBanner:** Removed `Timer` icon and `{formatTimer(elapsed)}` display.
- **LiveTurnoRecoveryDialog:** Removed Clock icon and "Duracion" row from the recovery info block.

### LT-03: Explicit no-HC exit path
- New button "Cerrar sin guardar entrada de HC" added between Minimizar and Finalizar sesion.
- Button triggers a dedicated AlertDialog: "Cerrar sin registrar HC".
- On confirm: calls `cerrarSesion.mutateAsync({})` — no `entradaHCId` passed, no HC auto-save triggered.
- "Finalizar sesion" dialog updated: description no longer mentions duration — new copy: "La sesión será finalizada y el turno quedará marcado como completado."

### Hook deleted
- `frontend/src/hooks/useLiveTurnoTimer.ts` — deleted. Zero references remain in the codebase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cleaned timer references in 2 additional files before hook deletion**
- **Found during:** Task 2 pre-delete grep scan
- **Issue:** `ActiveSessionBanner.tsx` and `LiveTurnoRecoveryDialog.tsx` imported `useLiveTurnoTimer` — deleting the hook without fixing these would break TypeScript compilation
- **Fix:** Removed timer imports, `elapsed` variable, and timer UI elements from both files. For `LiveTurnoRecoveryDialog`, also removed the Clock icon and "Duracion" row from the recovery info block.
- **Files modified:** `ActiveSessionBanner.tsx`, `LiveTurnoRecoveryDialog.tsx`
- **Commit:** 5c8812b

## Task Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Remove timer from LiveTurnoHeader and LiveTurnoIndicator | c5485b8 |
| 2 | Rewrite footer, add no-HC exit, delete timer hook, fix banner + recovery | 5c8812b |

## Verification Results

- `grep -r "useLiveTurnoTimer\|formatTimer\|formatTimerCompact" frontend/src/` → no output (zero references)
- `ls frontend/src/hooks/useLiveTurnoTimer.ts` → "No such file or directory"
- `npx tsc --noEmit` → no errors
- `grep "Cerrar sin guardar entrada de HC" LiveTurnoFooter.tsx` → found
- `grep "Cerrar sin registrar HC" LiveTurnoFooter.tsx` → found
- `grep "En curso" LiveTurnoHeader.tsx` → found

## Self-Check: PASSED

- LiveTurnoHeader.tsx: FOUND
- LiveTurnoFooter.tsx: FOUND
- LiveTurnoIndicator.tsx: FOUND
- useLiveTurnoTimer.ts: deleted as expected
- commit c5485b8: FOUND
- commit 5c8812b: FOUND
