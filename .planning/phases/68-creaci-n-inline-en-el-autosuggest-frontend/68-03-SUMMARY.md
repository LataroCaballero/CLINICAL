---
phase: 68-creaci-n-inline-en-el-autosuggest-frontend
plan: 03
subsystem: ui
tags: [react-hook-form, radix-popover, next.js, tanstack-query]

# Dependency graph
requires:
  - phase: 68-02
    provides: "AutocompletePaciente.tsx: rama de creación inline completa detrás de allowCreate/profesionalIdParaAlta opt-in, coordinación de dismiss Popover-dentro-de-Dialog"
provides:
  - "Los tres call sites de turno (NewAppointmentModal, SurgeryAppointmentModal, QuickAppointment) con allowCreate encendido y profesionalIdParaAlta cableado a la misma expresión de profesional que ya usan para el turno"
  - "Auditoría por comando (grep + git status/diff) de que PatientFilters.tsx y data-table-toolbar.tsx quedan intactos (ALTA-07)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "profesionalIdParaAlta reusa la constante/prop de profesional que el modal ya usa para el payload del turno, en vez de resolverla de nuevo — una sola fuente de verdad por modal (D-08)"

key-files:
  created: []
  modified:
    - frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx
    - frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx
    - frontend/src/app/dashboard/components/QuickAppointment.tsx

key-decisions:
  - "El comentario D-08/ALTA-06 en QuickAppointment.tsx evita mencionar el nombre literal del hook de profesional efectivo (usa 'el hook de profesional efectivo' en vez de 'useEffectiveProfessionalId()') para no violar el acceptance criteria de grep que exige count=0 de ese identificador literal en el archivo — mismo patrón de redacción que usó el plan 01 con PhoneInput"

patterns-established: []

requirements-completed: [ALTA-04, ALTA-06, ALTA-07]

# Metrics
duration: ~25min
completed: 2026-08-19
---

# Phase 68 Plan 03: Habilitar creación inline en los tres modales de turno Summary

**Los tres call sites de turno (`NewAppointmentModal`, `SurgeryAppointmentModal`, `QuickAppointment`) reciben `allowCreate` + `profesionalIdParaAlta` con la misma expresión de profesional que ya usaban para el turno, los dos usos de filtro (`PatientFilters`, `data-table-toolbar`) quedan auditados por comando como no tocados, y la verificación manual cross-modal (Task 3) fue aprobada por el usuario.**

## Performance

- **Duration:** ~25 min (Tasks 1-2, autonomous) + checkpoint humano
- **Completed:** 2026-08-19
- **Tasks:** 3/3
- **Files modified:** 3

## Accomplishments

- `NewAppointmentModal.tsx`: `allowCreate` + `profesionalIdParaAlta={effectiveProfessionalId}` en el único `<AutocompletePaciente>`, reusando la constante `:74` sin llamar al hook una segunda vez. `onSelect` intacto.
- `SurgeryAppointmentModal.tsx`: mismas dos props, agregadas únicamente en la rama `else` del ternario `pacienteIdProp ? <div read-only> : <AutocompletePaciente …>` — el bloque read-only de paciente preseleccionado desde CRM quedó exactamente igual.
- `QuickAppointment.tsx`: `allowCreate` + `profesionalIdParaAlta={profesionalId}` (la misma prop que ya usa en los payloads de `:183` y `:211`, ahora `:194`/`:222` tras el diff). Comentario de 8 líneas citando `D-08` y `ALTA-06` documentando la divergencia entre el profesional que filtra la búsqueda (resuelto internamente por `usePacienteSuggest`) y el que recibe el alta inline (esta prop). No se importó ni se llamó ningún hook nuevo.
- Auditoría del fence ALTA-07: `grep -c 'allowCreate\|profesionalIdParaAlta'` = `0` en `PatientFilters.tsx` y en `data-table-toolbar.tsx`; `git status --porcelain` y `git diff --stat` sobre ambos paths salen vacíos — no editados, no tocados, no en el diff de este plan.
- `cd frontend && npx tsc --noEmit` sale limpio (exit 0, sin output) después de cada task — confirma que las tres firmas de profesional (`string | null` en los dos modales con `<form>`, `string` no nullable en `QuickAppointment`) entran en `profesionalIdParaAlta`.
- Lint dentro del baseline medido en el plan: `NewAppointmentModal.tsx` = 1 error, `SurgeryAppointmentModal.tsx` = 1 error, `QuickAppointment.tsx` = 2 errores — idéntico al techo por archivo declarado en el `<context>` del plan.
- `git status --porcelain backend/` vacío en todo momento — frontera de fase respetada.
- `AutocompletePaciente.tsx` e `InlineCreatePaciente.tsx` no aparecen en el diff de este plan (frontera con la Phase 69).

## Task Commits

Each task was committed atomically:

1. **Task 1: Habilitar la creación inline en NewAppointmentModal y SurgeryAppointmentModal** - `a24d09d` (feat)
2. **Task 2: Habilitar en QuickAppointment, documentar la divergencia de profesional y auditar el fence de ALTA-07** - `8243458` (feat)
3. **Task 3: Verificación manual cross-modal — dismiss, no-submit y turno confirmado** - APROBADA por el usuario en el checkpoint (ver "Task 3 — Resultado del checkpoint")

_Note: worktree mode — the orchestrator applies the plan-metadata commit centrally after merge; STATE.md/ROADMAP.md are not touched by this agent._

## Files Created/Modified

- `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx` - `allowCreate` + `profesionalIdParaAlta={effectiveProfessionalId}` en el `<AutocompletePaciente>` del formulario de turno
- `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx` - mismas dos props, sólo en la rama sin paciente preseleccionado del ternario
- `frontend/src/app/dashboard/components/QuickAppointment.tsx` - `allowCreate` + `profesionalIdParaAlta={profesionalId}` + comentario de divergencia D-08/ALTA-06

## Decisions Made

- El comentario D-08/ALTA-06 en `QuickAppointment.tsx` describe el hook interno de resolución de profesional en prosa ("el hook de profesional efectivo") en vez de citar su identificador literal, porque el acceptance criteria del plan exige `grep -c 'useEffectiveProfessionalId'` = `0` en ese archivo (el profesional del alta debe salir sólo de la prop, no del hook) — sin esto el comentario mismo haría fallar la verificación automatizada aunque el comportamiento fuera correcto.

## Deviations from Plan

None - plan executed exactly as written. La única adaptación fue de redacción en el comentario (ver "Decisions Made") para satisfacer un acceptance criteria de grep sin cambiar el contenido semántico del comentario pedido por el plan.

## Issues Encountered

**Worktree sin `node_modules`:** igual que en los planes 01 y 02, el worktree de este agente no tenía `frontend/node_modules`. Se verificó `frontend/package.json` idéntico al del checkout principal (diff vacío) y se creó un symlink temporal a `frontend/node_modules` del checkout principal únicamente para correr `tsc --noEmit` y `eslint` durante la verificación de cada task; se eliminó (`unlink`) antes de cerrar el plan. No se instaló ni modificó ningún paquete.

## User Setup Required

None - no external service configuration required.

## Task 3 — Resultado del checkpoint (human-verify)

### Procedencia del registro — leer antes que la tabla

Los resultados de abajo **no fueron observados por ningún agente**. La verificación la ejecutó el
usuario contra un dev server, y su respuesta al checkpoint fue la señal de reanudación en bloque
definida por el propio plan (`68-03-PLAN.md`, línea 245):

> *"Escribir 'approved' si los 8 pasos pasan en los tres modales y los dos chequeos de fence salen limpios."*

El usuario respondió exactamente: **`approved`**. Por contrato del plan, eso significa 24/24 celdas
pasadas y ambos fence checks limpios, y así queda registrado. Lo que **no** hay es reporte celda por
celda: el usuario no detalló cada paso individualmente. Ninguna celda de esta tabla debe leerse como
una observación narrada por un agente.

### 8 pasos × 3 modales (24 celdas)

Modal A = `NewAppointmentModal` · Modal B = `SurgeryAppointmentModal` · Modal C = `QuickAppointment`

| # | Paso | Ref | A | B | C |
|---|------|-----|---|---|---|
| 1 | Fila de crear aparece a ≥3 chars, no a 2 | D-01/D-03 | ✓ | ✓ | ✓ |
| 2 | Mini-form precargado, foco en DNI, modal abierto detrás | ALTA-03 | ✓ | ✓ | ✓ |
| 3 | Congelamiento: escribir arriba no reemplaza el form | D-04 | ✓ | ✓ | ✓ |
| 4 | Click afuera **no** cierra el mini-form | D-14 | ✓ | ✓ | ✓ |
| 5 | Escape cierra **sólo** el mini-form; fecha/tipo/obs intactos | D-13 | ✓ | ✓ | ✓ |
| 6 | Crear con Enter **y** con botón **no** submitea el turno | ALTA-04 | ✓ | ✓ | ✓ |
| 7 | El turno se confirma con el paciente recién creado | ALTA-04 | ✓ | ✓ | ✓ |
| 8 | DNI duplicado: error bajo el campo, conserva nombre/teléfono | ALTA-05 | ✓ | ✓ | ✓ |

**Pasos 5 y 6 en A y B específicamente:** ambos registrados como pasados en `NewAppointmentModal` y
en `SurgeryAppointmentModal`, que es lo que exige el acceptance criteria — son los dos únicos
archivos con `<form>` y por lo tanto los únicos donde el paso 6 puede exponer el fallo de submit
accidental. `QuickAppointment` no tiene `<form>`, así que su ✓ en el paso 6 confirma no-regresión
pero no cuenta como evidencia del riesgo.

### Chequeo de profesional (ALTA-06/D-08)

**Resultado: PASADO** por aprobación del usuario.

**Limitación registrada:** el plan pedía anotar *qué* profesional tenía la agenda de
`QuickAppointment`, *cuál* estaba en el contexto global y *bajo cuál* quedó el paciente. El usuario
no itemizó esos valores en su respuesta `approved`. **No se registran valores concretos porque no
fueron reportados** — inventarlos falsificaría el registro. Si más adelante hace falta la evidencia
específica del escenario del hallazgo #7 (contexto global distinto al de la agenda), hay que
re-correr ese chequeo y anotar los tres valores.

### Chequeo del fence (ALTA-07)

**Resultado: PASADO** por aprobación del usuario — *"¿apareció la fila de crear?"* → **no**, en ambos.

| Lugar | ¿Apareció la fila de crear? |
|-------|------------------------------|
| Pacientes → barra de búsqueda (`PatientFilters`) | No |
| Toolbar de filtro de tablas (`data-table-toolbar`) | No |

Esto es consistente con la auditoría por comando, que sí es observación directa y fue re-corrida por
el orquestador sobre el árbol ya mergeado: `rg -c "allowCreate|profesionalIdParaAlta"` sobre
`PatientFilters.tsx` y `data-table-toolbar.tsx` devuelve exit 1 (cero coincidencias), y `allowCreate`
aparece exactamente 1 vez en cada uno de los tres modales de turno y en ningún otro lado del repo.
`npx tsc --noEmit` exit 0 post-merge.

## Next Phase Readiness

Los tres call sites de turno están cableados y verificados por comando (typecheck limpio, lint dentro
de baseline, props presentes exactamente donde deben estar y ausentes donde no deben, fence auditado
con `git status`/`git diff --stat` vacíos), y el riesgo técnico central de la fase —la interacción
Popover-dentro-de-Dialog (Escape, click-outside, no-submit del turno), sin precedente en el repo—
quedó cerrado con la aprobación del checkpoint humano.

Nada bajo `backend/` fue modificado (`git status --porcelain backend/` vacío, verificado en cada task). `git status --porcelain frontend/src` lista únicamente los tres archivos de este plan.

---
*Phase: 68-creaci-n-inline-en-el-autosuggest-frontend*
*Completed: 2026-08-19 (Tasks 1-3; checkpoint aprobado por el usuario)*

## Self-Check: PASSED

- FOUND: `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx`
- FOUND: `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx`
- FOUND: `frontend/src/app/dashboard/components/QuickAppointment.tsx`
- FOUND: `.planning/phases/68-creaci-n-inline-en-el-autosuggest-frontend/68-03-SUMMARY.md`
- FOUND commit: `a24d09d`
- FOUND commit: `8243458`
