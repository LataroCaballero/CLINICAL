---
phase: 69-consistencia-de-tel-fono-opcional-frontend
plan: 01
subsystem: frontend
tags: [typescript, phone-normalization, whatsapp-guard, pure-helpers]

# Dependency graph
requires:
  - phase: 67-tel-fono-opcional-y-guards-de-env-o-backend
    provides: "Paciente.telefono nullable en backend (String?), normalizeTelefono() y requireTelefonoParaEnvio() como precedente del criterio falsy-tras-trim"
provides:
  - "frontend/src/lib/telefono.ts: unica definicion frontend de placeholder ausente, predicado de presencia y motivo de bloqueo de WhatsApp"
  - "6 declaraciones de tipo de telefono de paciente ensanchadas a string | null sin as any"
affects: [69-02, 69-03, 69-04, 69-05, 69-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Modulo TypeScript puro sin imports (frontend/src/lib/telefono.ts), mismo estilo JSDoc corto que estadoTurno.ts"
    - "getMotivoBloqueoWhatsApp reutiliza tieneTelefono en vez de reimplementar el chequeo (evita divergencia placeholder/guard)"

key-files:
  created:
    - frontend/src/lib/telefono.ts
  modified:
    - frontend/src/types/pacients.ts
    - frontend/src/types/reportes.ts
    - frontend/src/hooks/useReportesFinancieros.ts
    - frontend/src/hooks/useListaEspera.ts

key-decisions:
  - "Placeholder es '-' (guion simple U+002D), no em dash, siguiendo D-01"
  - "getMotivoBloqueoWhatsApp da precedencia al teléfono sobre el opt-in (D-14): si falta el teléfono, ese es el motivo aunque también falte el opt-in"
  - "Los 6 tipos de teléfono pasan de string a string | null sin volverse opcionales (el backend siempre manda la clave)"

patterns-established:
  - "Un solo helper por responsabilidad (formatTelefono/tieneTelefono/getMotivoBloqueoWhatsApp) consumido por todos los sitios de display y guard en planes posteriores"

requirements-completed: [TEL-03, ENVIO-03]

# Metrics
duration: 12min
completed: 2026-08-21
---

# Phase 69 Plan 01: Helpers de Teléfono y Ensanchamiento de Tipos Summary

**Módulo `frontend/src/lib/telefono.ts` con `formatTelefono`/`tieneTelefono`/`getMotivoBloqueoWhatsApp` como única fuente de verdad frontend, más 6 tipos de teléfono de paciente ensanchados a `string | null`**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-21T19:05:00Z
- **Completed:** 2026-08-21T19:17:00Z
- **Tasks:** 2 completed
- **Files modified:** 5 (1 creado, 4 modificados)

## Accomplishments
- `frontend/src/lib/telefono.ts` creado con los 5 exports requeridos (`MOTIVO_SIN_TELEFONO`, `MOTIVO_SIN_OPTIN`, `formatTelefono`, `tieneTelefono`, `getMotivoBloqueoWhatsApp`), sin imports, sin em dash, sin mención a `telefonoAlternativo`
- `getMotivoBloqueoWhatsApp` invoca `tieneTelefono` internamente (no reimplementa el chequeo) y da precedencia al teléfono sobre el opt-in
- Los 6 campos `telefono` de paciente (PacienteListItem, PacienteDetalle, PacienteAusentista, CuentaPorCobrar, CuentaMorosa, PacienteListaEspera) ensanchados de `string` a `string | null`, sin `as any`
- `telefonoAlternativo` no tocado en ningún archivo (67 D-04)
- `npx tsc --noEmit` sale 0 después de ambas tareas — ningún archivo fuera de `files_modified` requirió cambios
- `npx eslint src/lib/telefono.ts` sin errores

## Task Commits

Each task was committed atomically:

1. **Task 1: Crear el módulo de helpers de teléfono** - `e25076b` (feat)
2. **Task 2: Ensanchar a `string | null` los 6 tipos de teléfono de paciente** - `8dfa178` (feat)

**Plan metadata:** (pendiente — commit de SUMMARY.md a continuación)

## Files Created/Modified
- `frontend/src/lib/telefono.ts` - Módulo puro con placeholder, predicado y motivo de bloqueo de WhatsApp
- `frontend/src/types/pacients.ts` - `PacienteListItem.telefono` y `PacienteDetalle.telefono` → `string | null`
- `frontend/src/types/reportes.ts` - `PacienteAusentista.telefono` → `string | null`
- `frontend/src/hooks/useReportesFinancieros.ts` - `CuentaPorCobrar.telefono` y `CuentaMorosa.telefono` → `string | null`
- `frontend/src/hooks/useListaEspera.ts` - `PacienteListaEspera.telefono` → `string | null`

## Decisions Made
- Ninguna decisión de diseño nueva; el plan ya fijaba nombres exactos de exports y criterio de ensanchamiento — se siguió tal cual.

## Deviations from Plan

None - plan executed exactly as written.

Nota de verificación local: el checkout de la worktree de este agente no traía `frontend/node_modules` instalado. Para poder correr `npx tsc --noEmit` y `npx eslint` (pasos de `<verify>` obligatorios en ambas tareas), se creó un symlink local `frontend/node_modules → ../../../../frontend/node_modules` apuntando al checkout compartido del repo. El symlink está cubierto por `.gitignore` (no aparece en `git status --short`, sólo en `--ignored`), no se commiteó, y no forma parte del código de producción — es únicamente infraestructura de verificación de este agente en el worktree.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Los 3 helpers (`formatTelefono`, `tieneTelefono`, `getMotivoBloqueoWhatsApp`) y los tipos ensanchados quedan listos para los planes 02-06 de la fase 69, que consumen estos exports para los sitios de display (TEL-03) y los 5 controles de WhatsApp (ENVIO-03).
- Sin bloqueos.

---
*Phase: 69-consistencia-de-tel-fono-opcional-frontend*
*Completed: 2026-08-21*
