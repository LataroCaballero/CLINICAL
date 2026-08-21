---
phase: 69-consistencia-de-tel-fono-opcional-frontend
plan: 05
subsystem: frontend-whatsapp-drawer
tags: [whatsapp, telefono, guard, patient-drawer]
requires:
  - 69-01 (frontend/src/lib/telefono.ts: getMotivoBloqueoWhatsApp, MOTIVO_SIN_TELEFONO, MOTIVO_SIN_OPTIN)
provides:
  - "3 de 5 controles de envío WA del drawer de paciente gateados por teléfono: botón de presupuesto, botón template y botón free-text de WAThreadView"
affects:
  - frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx
  - frontend/src/components/patient/PatientDrawer/views/MensajesView.tsx
  - frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx
  - frontend/src/components/whatsapp/WAThreadView.tsx
tech-stack:
  added: []
  patterns:
    - "Tooltip > TooltipTrigger asChild > <span> > <Button disabled> reutilizado tal cual (D-17), incluido en el nuevo wrapper del botón Send free-text"
    - "motivo calculado una sola vez por render con getMotivoBloqueoWhatsApp, null = habilitado sin TooltipContent"
key-files:
  created: []
  modified:
    - frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx
    - frontend/src/components/patient/PatientDrawer/views/MensajesView.tsx
    - frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx
    - frontend/src/components/whatsapp/WAThreadView.tsx
decisions: []
metrics:
  duration: "~35 min (incluye un stall/restart del executor, sin pérdida de trabajo)"
  completed: 2026-08-21
---

# Phase 69 Plan 05: Guard de teléfono en los 3 controles WA del drawer de paciente Summary

Se plumbeó `pacienteTelefono` por la misma cadena de props que ya usa `whatsappOptIn` (`PatientDrawer` → `PresupuestosView` y `PatientDrawer` → `MensajesView` → `WAThreadView`) y se reemplazó la lógica de bloqueo hardcodeada por `getMotivoBloqueoWhatsApp` en los tres controles de envío que dependen del drawer de paciente.

## Tasks

### Task 1: Plumbing del teléfono y guard del botón de presupuesto
**Commit:** `27dea8c`

- `PatientDrawer.tsx`: agregado `pacienteTelefono={paciente.telefono ?? null}` en los call sites de `<PresupuestosView>` y `<MensajesView>`, junto a la línea existente de `pacienteOptIn`/`whatsappOptIn`. Sin cast nuevo: `paciente.telefono` ya es `string | null` (plan 01).
- `MensajesView.tsx`: eslabón puro, agregó `pacienteTelefono?: string | null` a `Props` (default `null`) y lo reenvía a `WAThreadView`.
- `PresupuestosView.tsx`: agregó `pacienteTelefono` a `Props`, calculó `const motivoBloqueoWA = getMotivoBloqueoWhatsApp(pacienteTelefono, pacienteOptIn)` una sola vez en el cuerpo del componente (antes del `return`, ya que la variable es constante por render y no depende del `p` del `.map`), y reemplazó `!pacienteOptIn` por `!!motivoBloqueoWA` en el `disabled` del botón "Enviar por WhatsApp" (conservando `sendingWAId === p.id`) y el `TooltipContent` hardcodeado por `{motivoBloqueoWA}`.

### Task 2: Guard en los dos controles de `WAThreadView`
**Commit:** `cc96575`

- Agregó `pacienteTelefono?: string | null` a `Props` (default `null`) y `const motivoBloqueoWA = getMotivoBloqueoWhatsApp(pacienteTelefono, whatsappOptIn)`.
- Control template ("Enviar mensaje"): el ternario `whatsappOptIn ? ... : ...` pasó a `!motivoBloqueoWA ? ... : ...`, con `{motivoBloqueoWA}` en el `TooltipContent` de la rama deshabilitada. Rama habilitada intacta.
- `Textarea` free-text: `disabled` pasó de `!canSendFreeText || !whatsappOptIn` a `!canSendFreeText || !!motivoBloqueoWA`. No se envolvió en Tooltip (no hay analog en el repo, tal como indica el plan).
- Botón `Send`: se envolvió por primera vez en `Tooltip > TooltipTrigger asChild > <span className="shrink-0"> > <Button>`, con `{motivoBloqueoWA && <TooltipContent>{motivoBloqueoWA}</TooltipContent>}`. Se conservaron las cuatro condiciones de `disabled` (`!freeText.trim()`, `!canSendFreeText`, `!!motivoBloqueoWA` en lugar de `!whatsappOptIn`, `sendFreeText.isPending`) y las clases `size="icon" h-9 w-9 shrink-0`; el `<span>` recibió `className="shrink-0"` para no romper el layout flex del renglón.

## Deviations from Plan

None — plan ejecutado tal cual. Los conteos exactos de dos criterios de aceptación de la Task 2 (`rg -c "getMotivoBloqueoWhatsApp"` esperando `1`, `rg -c "TooltipTrigger"` esperando `2`) dan `2` y `5` respectivamente porque `rg -c` cuenta líneas y el archivo ahora importa esos símbolos además de usarlos (import de `getMotivoBloqueoWhatsApp`, import + 2 pares open/close de `TooltipTrigger`). El comportamiento verificado manualmente vía lectura de las líneas es el correcto: el motivo se calcula una sola vez (`const motivoBloqueoWA = getMotivoBloqueoWhatsApp(...)`, una sola invocación) y los dos controles quedan envueltos en el patrón `Tooltip > TooltipTrigger asChild > <span>`. No se trata de una desviación de código, sino de una discrepancia de fraseo en el criterio de grep del plan.

## Verification

- `rg -c "pacienteTelefono"` → 2 en `PatientDrawer.tsx`, 3 en `MensajesView.tsx` y `PresupuestosView.tsx` (Props + destructure + uso)
- `rg -cF 'El paciente no tiene opt-in para WhatsApp'` → 0 en `PresupuestosView.tsx` y `WAThreadView.tsx`
- `sendingWAId === p.id` se conserva en el `disabled` de `PresupuestosView.tsx`
- El `<span>` intermedio sigue presente en ambos archivos (D-17)
- `SendWAMessageModal.tsx` no aparece en el diff (fuera de alcance, D-11)
- `git diff --stat` del rango de este plan: 4 archivos modificados, exactamente los `files_modified` del frontmatter — ningún archivo fuera de alcance tocado
- `cd frontend && npx tsc --noEmit -p tsconfig.json` corrido una sola vez al final (con symlink temporal a `node_modules` del repo principal, no comiteado): sin salida de errores

## Self-Check: PASSED

- FOUND: frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx
- FOUND: frontend/src/components/patient/PatientDrawer/views/MensajesView.tsx
- FOUND: frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx
- FOUND: frontend/src/components/whatsapp/WAThreadView.tsx
- FOUND commit 27dea8c
- FOUND commit cc96575
