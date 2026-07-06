---
phase: 59-stepper-accionable
plan: "01"
subsystem: frontend-crm
tags: [crm, stepper, paso-estado, visual, enrichment]
dependency_graph:
  requires: [useCRMKanban.PasosCrm, useCRMKanban.KanbanPatient.flujo]
  provides: [EtapaStepper.coloreo-verde-naranja, EtapaStepper.botones-gateados, EtapaStepper.sub-indicadores]
  affects: [CardActionsSheet (consumidor de las nuevas props)]
tech_stack:
  added: []
  patterns: [step-state-driven-color, handler-gating-by-paso-estado, visual-only-sub-indicators]
key_files:
  created: []
  modified:
    - frontend/src/components/crm/EtapaStepper.tsx
decisions:
  - "PASO_POR_ETAPA como constante local (no importada) para mantener el mapeo D-02 coubicado con STEPPER_CHAIN"
  - "void flujo usado como supresión temporal durante Task 2 (flujo se usa en Task 3) — reemplazado en Task 3 con esTratamiento"
  - "showSubIndicadores activa el padding compacto del label (hasContextualButton=true) aunque los sub-indicadores no son botones"
  - "CalendarPlus de lucide-react elegido como ícono para el botón Agendar cirugía (semantica de agenda)"
metrics:
  duration_minutes: 18
  completed_date: "2026-07-05"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 1
---

# Phase 59 Plan 01: Stepper Accionable — EtapaStepper Enriquecido

**One-liner:** Coloreo verde/naranja por estado de paso en los 3 nodos mapeados, gating de botones de acción y sub-indicadores visuales de consentimiento/indicaciones, con filtrado por flujo TRATAMIENTO — todo sin reescribir el embudo de 7 etapas.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Ampliar props y codificar mapeo paso→etapa | `42261e6` | EtapaStepper.tsx |
| 2 | Coloreo verde/naranja + gating botones + "Agendar cirugía" | `4779c1d` | EtapaStepper.tsx |
| 3 | Sub-indicadores consentimiento/indicaciones + filtrado TRATAMIENTO | `7bcbe43` | EtapaStepper.tsx |

## What Was Built

`EtapaStepper.tsx` fue enriquecido (no reescrito) con una segunda dimensión de coloreo por estado de paso:

### Task 1 — Props y mapeo
- Importó `PasosCrm` y `KanbanPatient` desde `@/hooks/useCRMKanban`
- Agregó constante `PASO_POR_ETAPA`: `CONSULTADO→hc`, `PRESUPUESTO_ENVIADO→presupuesto`, `CONFIRMADO→cirugia`
- Extendió `EtapaStepperProps` con `pasos?: PasosCrm`, `flujo?: KanbanPatient["flujo"]`, `onCirugiaClick?: () => void`
- Derivó `pasoKey`, `pasoEstado`, `esNodoMapeado` en el render loop

### Task 2 — Coloreo y gating
- Círculos de nodos mapeados: `border-green-500 bg-green-500` (completo) / `border-orange-500 bg-orange-500` (pendiente), sobreescribiendo el coloreo de embudo solo para esos 3 nodos (D-03)
- Nodos no mapeados (`SIN_CLASIFICAR`, `NUEVO_LEAD`, `TURNO_AGENDADO`, `PROCEDIMIENTO_REALIZADO`) conservan coloreo de embudo original
- Botones HC y presupuesto gateados por `pasos?.hc === 'pendiente'` / `pasos?.presupuesto === 'pendiente'` (STEPPER-01/02)
- Nuevo botón "Agendar cirugía" (`CalendarPlus`, `e.stopPropagation()`) bajo `CONFIRMADO`, gateado por `pasos?.cirugia === 'pendiente'` && `!esTratamiento` (STEPPER-05/06)

### Task 3 — Sub-indicadores y filtrado por flujo
- `esTratamiento = flujo === "TRATAMIENTO"` como booleano de filtrado (D-05)
- Sub-indicadores visuales bajo `CONFIRMADO`: dots `h-2 w-2 rounded-full` verde/naranja para `consentimiento` e `indicacionesPreop` (D-04), sin `<button>`
- Cuando `flujo === 'TRATAMIENTO'`: oculta botón cirugía y sub-indicadores; muestra solo hc y presupuesto
- Edge case `PENDIENTE`/`null`: muestra todo (comporta como CIRUGIA)

## Verification

- `npx tsc --noEmit`: sin errores nuevos en EtapaStepper.tsx
- `npm run lint`: sin errores ni warnings en EtapaStepper.tsx
- Inspeccion de source: 3 nodos mapeados usan clases green/orange; botones gateados por pasos; sub-indicadores sin button; filtrado por flujo presente

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — `EtapaStepper.tsx` es puramente presentacional y pinta todas las props que le lleguen. Las props `pasos`, `flujo` y `onCirugiaClick` aún no están cableadas desde `CardActionsSheet.tsx` (eso corresponde al plan 59-02).

## Threat Flags

None — cambio puramente presentacional sin nuevos endpoints ni superficie de confianza.

## Self-Check: PASSED

- [x] `frontend/src/components/crm/EtapaStepper.tsx` existe y contiene los cambios
- [x] Commits `42261e6`, `4779c1d`, `7bcbe43` presentes en git log
- [x] `npx tsc --noEmit` limpio en EtapaStepper.tsx
- [x] `npm run lint` limpio en EtapaStepper.tsx
