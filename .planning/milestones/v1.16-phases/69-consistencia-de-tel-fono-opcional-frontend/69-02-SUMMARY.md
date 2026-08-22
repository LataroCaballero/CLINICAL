---
phase: 69-consistencia-de-tel-fono-opcional-frontend
plan: 02
subsystem: api
tags: [prisma, nestjs, typescript, calendar, whatsapp]

# Dependency graph
requires:
  - phase: 67-tel-fono-opcional-y-guards-de-env-o-backend
    provides: "Paciente.telefono nullable (String?) de punta a punta en backend"
provides:
  - "paciente.telefono en la respuesta de GET /turnos/rango"
  - "event.telefono disponible en las 3 copias de CalendarEvent del calendario de turnos"
affects: [69-06-guard-visual-whatsapp-turnos]

# Tech tracking
tech-stack:
  added: []
  patterns: ["extender un select de Prisma anidado sin cambiar la firma del metodo", "poblar 3 interfaces estructuralmente compatibles no importadas entre si"]

key-files:
  created: []
  modified:
    - backend/src/modules/turnos/turnos.service.ts
    - frontend/src/app/dashboard/turnos/page.tsx
    - frontend/src/app/dashboard/turnos/CalendarGrid.tsx
    - frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx

key-decisions:
  - "Se usó el mismo patrón que whatsappOptIn: select Prisma → mapeo page.tsx → 3 interfaces CalendarEvent, sin fetch nuevo"

patterns-established:
  - "Las 3 copias locales de CalendarEvent (page.tsx, CalendarGrid.tsx, AppointmentDetailModal.tsx) deben ensancharse juntas cuando se agrega un campo derivado de paciente — TypeScript no falla si se olvida una (interfaces estructurales, campo opcional), pero el dato no llega a esa vista"

requirements-completed: [ENVIO-03]

# Metrics
duration: 12min
completed: 2026-08-21
---

# Phase 69 Plan 02: Plumbing de teléfono en el calendario de turnos Summary

**El teléfono del paciente viaja desde el `select` de Prisma de `obtenerTurnosPorRango` hasta `event.telefono` en las 3 copias de `CalendarEvent` del calendario de turnos, sin ningún fetch nuevo en el frontend.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-21T19:03:00Z
- **Completed:** 2026-08-21T19:15:33Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `obtenerTurnosPorRango` (`turnos.service.ts`) devuelve `paciente.telefono` sin cambiar su firma ni tocar el controller
- Las 3 declaraciones independientes de `interface CalendarEvent` (`page.tsx`, `CalendarGrid.tsx`, `AppointmentDetailModal.tsx`) declaran `telefono?: string | null`
- El mapeo `turnos → CalendarEvent` de `page.tsx` puebla `telefono` junto a `whatsappOptIn`, con default `null` (no `""`)
- El plan 06 (guard visual de WhatsApp en el detalle de turno) puede consumir `event.telefono` sin plumbing adicional

## Task Commits

Each task was committed atomically:

1. **Task 1: Ensanchar el `select` de `obtenerTurnosPorRango` con el teléfono del paciente** - `eefbfc2` (feat)
2. **Task 2: Declarar `telefono` en las 3 copias de `CalendarEvent` y poblarlo en el mapeo** - `6b14ac9` (feat)

_Note: no hubo tareas TDD en este plan (backend Prisma select + tipos de frontend, sin comportamiento a testear)._

## Files Created/Modified
- `backend/src/modules/turnos/turnos.service.ts` - agrega `telefono: true` al `select.paciente` de `obtenerTurnosPorRango` (1 línea)
- `frontend/src/app/dashboard/turnos/page.tsx` - agrega `telefono?: string | null` a `interface CalendarEvent` y `telefono: t.paciente?.telefono ?? null` al mapeo
- `frontend/src/app/dashboard/turnos/CalendarGrid.tsx` - agrega `telefono?: string | null` a su copia local de `interface CalendarEvent`
- `frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx` - agrega `telefono?: string | null` a su copia local de `interface CalendarEvent`

## Decisions Made
- Ninguna decisión nueva — el plan replicó exactamente el recorrido existente de `whatsappOptIn` (mismo `select`, mismo mapeo, mismas 3 interfaces), sin discrecionalidad del executor.

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito. Las únicas acciones fuera de las dos tareas fueron de infraestructura de verificación (ver "Issues Encountered"), no cambios de código de producción.

## Issues Encountered

- **`node_modules` ausente en el worktree (backend y frontend).** El worktree de git no incluye `node_modules` (gitignored, no compartido entre worktrees). `package-lock.json` y `schema.prisma` son idénticos byte-a-byte entre el repo principal y el worktree, así que se creó un symlink de `node_modules` desde el repo principal (`backend/node_modules` y `frontend/node_modules`) en vez de correr `npm install` de nuevo — evita reinstalar dependencias ya presentes y no modifica el lockfile. No se instaló ningún paquete nuevo (el symlink no cae bajo la exclusión de Rule 3 de package installs). Ambos symlinks quedan fuera de git (node_modules está en `.gitignore`), no aparecen en `git status` y no se commitearon.
- `backend/tsconfig.build.tsbuildinfo` apareció modificado como efecto secundario de correr `npm run build` (regenera el build cache). Ya estaba modificado al inicio de la sesión (drift pre-existente, fuera del alcance de este plan) — se dejó sin stagear en ambos commits de tarea, consistente con el scope boundary de deviation rules.

## Threat Model — Hallazgo Registrado (T-69-04)

Conforme a la instrucción explícita del plan de registrar este hallazgo sin corregirlo:

**T-69-04 (Information Disclosure, `accept`):** `obtenerPorRango` toma `profesionalId` desde query sin pasar por `resolveScope` (a diferencia de `findAll`, que sí recibe `@Req`). Es preexistente y fuera del alcance de esta fase — un usuario autenticado con rol clínico puede pedir el rango de otro `profesionalId` y ya obtenía nombre y opt-in de esos pacientes; sumar el teléfono amplía marginalmente el PII de un path que ya estaba expuesto. No se corrigió acá porque agregar scoping al endpoint cambia el contrato del calendario y merece su propia fase.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- El plan 06 (guard visual del botón WhatsApp en `AppointmentDetailModal`) puede implementarse: `event.telefono` ya existe y está poblado correctamente (string o `null`, nunca `undefined`).
- T-69-04 queda como deuda conocida, trazada en este SUMMARY y candidata a fase propia de scoping de `GET /turnos/rango`.

---
*Phase: 69-consistencia-de-tel-fono-opcional-frontend*
*Completed: 2026-08-21*
