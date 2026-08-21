---
phase: 69-consistencia-de-tel-fono-opcional-frontend
plan: 06
subsystem: ui
tags: [react, nextjs, typescript, whatsapp, telefono]

requires:
  - phase: 69-01
    provides: "helper compartido frontend/src/lib/telefono.ts (getMotivoBloqueoWhatsApp, tieneTelefono, formatTelefono)"
  - phase: 69-02
    provides: "campo event.telefono poblado en las 3 copias de CalendarEvent del calendario de turnos"
  - phase: 69-04
    provides: "PacienteDetails.tsx ya importa formatTelefono y tiene paciente.telefono en scope"
provides:
  - "botón WhatsApp de la ficha del paciente gateado por getMotivoBloqueoWhatsApp (teléfono con precedencia sobre opt-in)"
  - "atajo WhatsApp del detalle de turno del calendario gateado por el mismo helper, consumiendo event.telefono"
  - "cierre de la lista cerrada de D-11: los 5 controles de envío WhatsApp usan el mismo helper sin lógica duplicada"
affects: []

tech-stack:
  added: []
  patterns:
    - "Guard de control de envío WhatsApp: const motivoBloqueoWA = getMotivoBloqueoWhatsApp(telefono, whatsappOptIn); disabled={!!motivoBloqueoWA}; {motivoBloqueoWA && <TooltipContent>{motivoBloqueoWA}</TooltipContent>}"
    - "En componentes con early-return por null (`if (!event) return null`), el cálculo derivado que depende del valor no-nulo debe declararse DESPUÉS del guard para no romper el narrowing de TypeScript"

key-files:
  created: []
  modified:
    - frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx
    - frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx

key-decisions:
  - "El span intermedio de TooltipTrigger asChild se mantuvo intacto en ambos archivos (D-17), requerido porque un Button disabled no dispara eventos de puntero"
  - "En PacienteDetails.tsx se mantuvo el cast (paciente as any).whatsappOptIn tal como estaba, sin tocarlo en esta fase (indicado explícitamente por el plan)"

patterns-established:
  - "Los 5 controles de envío WhatsApp de D-11 (PresupuestosView, WAThreadView, PacienteDetails, AppointmentDetailModal x2) consumen exclusivamente getMotivoBloqueoWhatsApp; el texto de opt-in sólo vive hardcodeado en frontend/src/lib/telefono.ts"

requirements-completed: [ENVIO-03]

duration: 12min
completed: 2026-08-21
---

# Phase 69 Plan 06: Guard de teléfono en los últimos 2 controles de envío WhatsApp Summary

**Botón WhatsApp de la ficha del paciente y atajo WhatsApp del detalle de turno del calendario ahora se deshabilitan por falta de teléfono (con precedencia sobre el opt-in) usando el helper compartido `getMotivoBloqueoWhatsApp`.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-21T20:46:00Z
- **Completed:** 2026-08-21T20:57:58Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- Botón "WhatsApp" de la grilla de acciones de `PacienteDetails.tsx` ahora se deshabilita si falta el teléfono (motivo específico) o el opt-in (motivo existente), en ese orden de precedencia.
- Atajo "WhatsApp" del `AppointmentDetailModal.tsx` del calendario ahora consume `event.telefono` (poblado desde el plan 02) en vez de depender sólo del opt-in — cierra el único control que dependía del flujo de datos del backend.
- Verificadas ambas precondiciones del plan 02 antes de editar (`select` del backend con `telefono: true` y mapeo `telefono: t.paciente?.telefono ?? null` en `page.tsx`) para evitar el falso negativo total (T-69-14).
- Los 5 controles de la lista cerrada de D-11 (`PresupuestosView.tsx`, `WAThreadView.tsx`, `PacienteDetails.tsx`, y las 2 instancias de `AppointmentDetailModal.tsx`) quedan usando el mismo helper; el texto de opt-in hardcodeado sólo sobrevive en `frontend/src/lib/telefono.ts` como fuente de verdad.

## Task Commits

Each task was committed atomically:

1. **Task 1: Guard del botón WhatsApp en la ficha del paciente** - `2bcbd18` (feat)
2. **Task 2: Guard del atajo WhatsApp en el detalle de turno** - `fc23bf0` (feat)
3. **Fix: reubicar motivoBloqueoWA después del guard de event nulo** - `11cbf53` (fix, Rule 1 — ver Deviations)

## Files Created/Modified
- `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx` - botón WhatsApp gateado por `getMotivoBloqueoWhatsApp(paciente.telefono, whatsappOptIn)`
- `frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx` - atajo WhatsApp gateado por `getMotivoBloqueoWhatsApp(event.telefono, event.whatsappOptIn)`

## Decisions Made
- Ninguna decisión de diseño nueva: el plan especificaba el patrón exacto a reusar (mismo de los planes 04/05) y se siguió tal cual.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `event.telefono` evaluado antes del guard de null rompía el narrowing de TypeScript**
- **Found during:** Task 2 (verificación con `npx tsc --noEmit`)
- **Issue:** El plan indicaba calcular `motivoBloqueoWA` "en el cuerpo del componente", y se colocó junto a los demás `useState` iniciales, ANTES de la línea `if (!event) return null;` (línea 158 original). `event` tiene tipo `CalendarEvent | null`, así que `event.telefono` y `event.whatsappOptIn` producían `TS18047: 'event' is possibly 'null'`.
- **Fix:** Se movió la declaración de `motivoBloqueoWA` a inmediatamente después del guard `if (!event) return null;`. No es un hook (no usa `useState`/`useEffect`), así que reubicarlo ahí no viola las reglas de hooks de React ni cambia el orden de llamadas entre renders.
- **Files modified:** `frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx`
- **Verification:** `cd frontend && npx tsc --noEmit` salió sin errores después del fix (antes reportaba 2 errores TS18047 en la línea del cálculo).
- **Committed in:** `11cbf53`

---

**Total deviations:** 1 auto-fixed (1 bug de tipos)
**Impact on plan:** Ajuste mínimo de ubicación de una línea, sin cambio de comportamiento ni de estructura visual. No scope creep.

## Issues Encountered
- El criterio de aceptación literal `rg -c "getMotivoBloqueoWhatsApp" <archivo>` devuelve `2` en vez de `1` en ambos archivos, porque cuenta tanto la línea de `import` como la línea de uso. Se verificó que el mismo patrón ocurre en `WAThreadView.tsx` (plan 05, ya mergeado), así que es consistente con el resto de la lista cerrada de D-11 y no se considera una desviación — sólo una imprecisión del comando de verificación en el texto del plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Los 5 controles de envío WhatsApp de la lista cerrada D-11 quedan completos y consistentes (criterio de éxito #4 del ROADMAP para la fase 69).
- `SendWAMessageModal.tsx` sigue sin guard propio ni recibiendo teléfono, tal como especifica D-11 — los 2 controles de este plan bloquean aguas arriba antes de abrirlo.
- `npx tsc --noEmit` corrido una sola vez al final (tras el fix), sin errores. No se corrió `npm run lint`, `npm run build` ni tests — quedan para el gate post-merge del orquestador, según indica `verification_budget`.

---
*Phase: 69-consistencia-de-tel-fono-opcional-frontend*
*Completed: 2026-08-21*
