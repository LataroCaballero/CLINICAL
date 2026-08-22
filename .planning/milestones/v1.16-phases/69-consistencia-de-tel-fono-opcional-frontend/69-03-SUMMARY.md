---
phase: 69-consistencia-de-tel-fono-opcional-frontend
plan: 03
subsystem: ui
tags: [zod, react-hook-form, forms, validation, pacientes]

# Dependency graph
requires:
  - phase: 67-tel-fono-opcional-y-guards-de-env-o-backend
    provides: "normalizeTelefono() en PacientesService — trim() -> null si vacío, umbral >=6 en create/update/updateContacto"
  - phase: 68-consistencia-de-tel-fono-opcional-otros-flujos
    provides: "schema Zod de teléfono opcional en InlineCreatePaciente.tsx (molde exacto calcado)"
provides:
  - "NewPacienteModal.tsx permite crear un paciente sin cargar teléfono (TEL-02)"
  - "DatosCompletos.tsx (bloque Contacto de la ficha) permite editar email sin exigir teléfono, haciendo observable 67 D-05"
affects: [pacientes, patient-drawer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Schema Zod de teléfono: z.string().optional().refine((v) => !v || v.trim() === \"\" || v.trim().length >= N, { message: \"Teléfono inválido\" }) — molde de InlineCreatePaciente.tsx (Phase 68), reutilizado en dos sitios más"

key-files:
  created: []
  modified:
    - frontend/src/app/dashboard/pacientes/components/NewPacienteModal.tsx
    - frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx

key-decisions:
  - "Payload de NewPacienteModal cambia de data.telefono.trim() a data.telefono?.trim() ?? \"\" — evita TypeError cuando el schema opcional deja telefono en undefined"
  - "contactoSchema.telefono conserva el techo de 20 caracteres (min 6, max 20) que ya tenía, sólo se vuelve optional() con refine, espejando lo que updateContacto sigue validando server-side (67 D-05/D-06)"

patterns-established: []

requirements-completed: [TEL-02]

# Metrics
duration: 15min
completed: 2026-08-21
---

# Phase 69 Plan 03: Formularios de alta y edición sin teléfono obligatorio Summary

**Dos schemas Zod relajados (NewPacienteModal y DatosCompletos) calcando el molde de InlineCreatePaciente.tsx de la Phase 68, más un crash latente de payload cerrado.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-21T19:00:00Z (aprox)
- **Completed:** 2026-08-21T19:16:00Z
- **Tasks:** 2/2 completed
- **Files modified:** 2

## Accomplishments
- El alta completa de paciente (`NewPacienteModal`) ya no exige teléfono: schema opcional con `refine` (≥6 chars si hay valor), label sin asterisco y con "(opcional)", payload null-safe.
- El bloque Contacto de la ficha (`DatosCompletos`) permite guardar sin teléfono, haciendo observable el trabajo server-side de 67 D-05 (antes bloqueado por el Zod del cliente).

## Task Commits

Each task was committed atomically:

1. **Task 1: Alta completa sin teléfono en `NewPacienteModal`** - `c7f5ad3` (feat)
2. **Task 2: Bloque Contacto de la ficha editable sin teléfono** - `7d45794` (feat)

_Plan metadata commit pending (this SUMMARY)._

## Files Created/Modified
- `frontend/src/app/dashboard/pacientes/components/NewPacienteModal.tsx` - schema `telefono` pasa a `optional()` + `refine` (≥6 chars si hay valor, mensaje "Teléfono inválido"); payload `telefono: data.telefono?.trim() ?? ""`; label del campo pierde el asterisco obligatorio y gana "(opcional)"
- `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx` - `contactoSchema.telefono` pasa a `optional()` + `refine` (6–20 chars si hay valor, mismo mensaje); `telefonoAlternativo` y los seeds `paciente.telefono ?? ""` quedaron intactos

## Decisions Made
- Ninguna decisión fuera de las ya especificadas en el plan (D-08/D-09 del must_haves). Se copió literalmente el molde de `InlineCreatePaciente.tsx` para ambos schemas, ajustando sólo el techo de 20 caracteres en `DatosCompletos.tsx` donde el schema original ya lo tenía.

## Deviations from Plan

None - plan executed exactly as written. Task 1 y Task 2 se implementaron según lo especificado, sin necesidad de fixes adicionales (Rules 1-3) ni decisiones arquitectónicas (Rule 4).

## Issues Encountered

**Verificación `tsc --noEmit` no ejecutable en este worktree:** el directorio `frontend/node_modules` no está instalado en este worktree aislado (git worktree paralelo sin `npm install` previo). Ejecutar `npx tsc` intentaría descargar TypeScript vía red, lo cual es lento/impredecible en este contexto y fue evitado explícitamente para no repetir un stall del watchdog. En su lugar, la verificación se hizo con `rg` contra los criterios de aceptación exactos del plan:
- `rg -c 'telefono: z\.string\(\)\.min\(6' NewPacienteModal.tsx` → 0 (schema ya no obligatorio)
- `rg -n "optional\(\)"` y `rg -n "refine"` en ambos archivos → presentes dentro del bloque del schema
- `rg -F 'Teléfono inválido'` → mensaje original conservado en ambos archivos
- `rg -F 'data.telefono?.trim() ?? ""'` → 1 línea; `rg -F 'data.telefono.trim()'` → 0 líneas (crash latente resuelto)
- `git diff --numstat` en `DatosCompletos.tsx` → 6 inserciones, 1 eliminación (acotado, <15 líneas)
- `git diff | grep telefonoAlternativo` y `git diff | grep 'paciente.telefono ?? ""'` → 0 coincidencias (sin tocar)

La compilación TypeScript real (`tsc --noEmit`) queda pendiente de verificación por el orquestador o en un entorno con dependencias instaladas. El cambio es estructuralmente equivalente al molde ya validado en producción (`InlineCreatePaciente.tsx`, Phase 68), por lo que el riesgo de error de tipos es bajo.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `PatientFormModal.tsx` (D-10) verificado como no-op — no aparece en el diff de esta fase, según lo esperado por el plan.
- Ambos formularios (`NewPacienteModal`, `DatosCompletos`) quedan alineados con el backend (67 D-01/D-05/D-06): validación cliente relajada, validación autoritativa server-side sin cambios.
- Pendiente para el orquestador: correr `cd frontend && npx tsc --noEmit` y `npm run lint` en un entorno con `node_modules` instalado antes de mergear, ya que este worktree no pudo ejecutar esa verificación automatizada.

---
*Phase: 69-consistencia-de-tel-fono-opcional-frontend*
*Completed: 2026-08-21*
