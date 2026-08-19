---
phase: 68-creaci-n-inline-en-el-autosuggest-frontend
plan: 02
subsystem: ui
tags: [radix-popover, react-hook-form, tanstack-query, dismiss-coordination]

# Dependency graph
requires:
  - phase: 68-01
    provides: "InlineCreatePaciente.tsx (query/profesionalId/onCreated/onCancel), useCreatePaciente invalidando pacientes-suggest"
provides:
  - "AutocompletePaciente.tsx: rama de creación inline completa detrás de allowCreate/profesionalIdParaAlta opt-in"
  - "Coordinación de dismiss Popover-dentro-de-Dialog (onEscapeKeyDown/onPointerDownOutside) — sin precedente previo en el repo"
affects: [68-03-plan-que-habilita-la-creacion-en-los-tres-modales-de-turno]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Popover.open state-driven (sin onOpenChange) extendido con `creating ||` en la condición, en vez de agregar onOpenChange — evita reestructurar el control de apertura existente"
    - "onEscapeKeyDown con preventDefault()+stopPropagation() condicionado a un estado local, para frenar el burbujeo de Escape hacia un Dialog contenedor sin tocar el Dialog"
    - "onPointerDownOutside con preventDefault() (no onInteractOutside+stopPropagation, que no cancela el dismiss de Radix)"

key-files:
  created: []
  modified:
    - frontend/src/components/AutocompletePaciente.tsx

key-decisions:
  - "useDebounce(query, 300) llamado una segunda vez dentro de AutocompletePaciente en vez de ensanchar el retorno de usePacienteSuggest, para mantener el cambio confinado a un archivo (decisión ya tomada en el plan, ejecutada tal cual)"
  - "El texto de la fila 'Crear paciente' se escribe como template literal ({`Crear paciente: \"${query}\"`}) en vez de comillas literales en JSX text, para evitar el error de lint react/no-unescaped-entities sin cambiar el copy pedido por D-01"
  - "border-t condicional (data.length > 0 && \"border-t\") en la fila de crear, aplicado vía cn() junto con las clases base, en vez de un className separado"

patterns-established: []

requirements-completed: [ALTA-01, ALTA-03, ALTA-04]

# Metrics
duration: ~20min
completed: 2026-08-19
---

# Phase 68 Plan 02: Rama de creación inline en AutocompletePaciente Summary

**`AutocompletePaciente.tsx` gana dos props opt-in (`allowCreate`, `profesionalIdParaAlta`), la fila "Crear paciente" gateada por los cuatro términos de D-03, el montaje de `InlineCreatePaciente` dentro del mismo popover con congelamiento de búsqueda, y la coordinación de dismiss Popover/Dialog vía `onEscapeKeyDown`/`onPointerDownOutside` — sin ningún cambio de comportamiento cuando la creación está apagada.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-19
- **Tasks:** 2/2
- **Files modified:** 1

## Accomplishments

- `type Props` extendido con `allowCreate?: boolean` (default `false`) y `profesionalIdParaAlta?: string | null`, ambas opcionales — los dos call sites de filtro (`PatientFilters`, `data-table-toolbar`) quedan sin cambio de comportamiento (ALTA-07).
- Segunda llamada a `useDebounce(query, 300)` dentro del componente (`debouncedQuery`), porque `usePacienteSuggest` no expone su valor debounceado.
- `canOfferCreate` con los cuatro términos de D-03 (`allowCreate && !creating && debouncedQuery.trim().length >= 3 && !isFetching && isSuccess`), excluyendo la ventana pre-fetch donde `data=[]`/`isFetching=false` sin que se haya buscado nada.
- `showDropdown` reescrito a `!value && (creating || (query.length > 0 && (data.length > 0 || isFetching || canOfferCreate)))` — verificado por inspección y por grep que con `allowCreate=false` colapsa exactamente a la expresión original.
- Fila `Crear paciente: "{query}"` con ícono `Plus` de `lucide-react`, mismo estilo de botón que la fila de resultado, `border-t` condicional cuando hay resultados arriba, sin `sticky`.
- `InlineCreatePaciente` montado dentro de `PopoverContent`: con `creating=true` reemplaza por completo el bloque `isFetching`/`.map`/fila-crear (congelamiento D-04, el contenido deja de depender de `data`/`isFetching`).
- `onCreated={(pac) => { onSelect(pac); setQuery(""); setCreating(false); }}` — mismo callback que la fila de resultado, sin adaptador (D-07/ALTA-04).
- `onEscapeKeyDown` con `preventDefault()+stopPropagation()` condicionado a `creating`, evita que Escape cierre el `Dialog` del turno (D-13).
- `onPointerDownOutside` con `preventDefault()` condicionado a `creating` (D-14); la permanencia real del popover abierto la sostiene `creating ||` dentro de `showDropdown` (Task 1), no el handler solo.
- `className` de `PopoverContent` con `cn("p-0 overflow-y-auto", creating ? "max-h-96" : "max-h-60")`.
- Comentario de 3 líneas citando D-08/ALTA-06 documentando la divergencia entre el profesional que filtra la búsqueda (`useEffectiveProfessionalId` interno de `usePacienteSuggest`) y el que recibe el alta (`profesionalIdParaAlta` por prop).
- La línea `DNI: {pac.dni} — Tel: {pac.telefono}` (región de la Phase 69) quedó intacta.

## Task Commits

Each task was committed atomically:

1. **Task 1: Props opt-in, query debounceado y fila "Crear paciente"** - `5446be9` (feat)
2. **Task 2: Montar el mini-form, congelar la búsqueda y coordinar el cierre Popover/Dialog** - `b7bbc98` (feat)

_Note: worktree mode — the orchestrator applies the plan-metadata commit centrally after merge; STATE.md/ROADMAP.md are not touched by this agent._

## Files Created/Modified

- `frontend/src/components/AutocompletePaciente.tsx` - Props opt-in, `canOfferCreate`, fila de crear, montaje de `InlineCreatePaciente`, coordinación de dismiss Popover/Dialog

## Decisions Made

- El copy `Crear paciente: "{query}"` se escribió como template literal (`{`Crear paciente: "${query}"`}`) en vez de comillas literales dentro de JSX text — evita el error `react/no-unescaped-entities` sin cambiar el texto visible ni el acceptance criteria de grep (`Crear paciente: "` sigue siendo un substring literal del archivo).
- `border-t` de la fila de crear se aplicó como clase condicional dentro del mismo `cn()` que las clases base del botón, en vez de un `className` separado, siguiendo la convención `cn()` del archivo.

## Deviations from Plan

None - plan executed exactly as written. La única adaptación fue de sintaxis (ver "Decisions Made") para satisfacer el baseline de lint sin cambiar comportamiento ni copy.

## Issues Encountered

**Worktree sin `node_modules`:** igual que en el plan 01, el worktree de este agente no tenía `frontend/node_modules`. Se verificó que `frontend/package.json` es idéntico al del checkout principal (diff vacío) y se creó un symlink temporal a `frontend/node_modules` del checkout principal únicamente para correr `tsc --noEmit` y `eslint` durante la verificación de cada task; se eliminó (`unlink`) antes de cerrar el plan. No se instaló ni modificó ningún paquete.

**Baseline de lint tras Task 1:** agregar el nuevo prop `profesionalIdParaAlta` sin consumirlo todavía (antes de Task 2) subió el warning count de 3 a 4 (`no-unused-vars` transitorio) — no es un error, no afecta el techo de 2 errores del baseline, y se resolvió solo al llegar a Task 2 cuando el prop se usa en `InlineCreatePaciente`. Verificado: tras Task 2 el archivo vuelve a 2 errores / 3 warnings, idéntico al baseline original.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`AutocompletePaciente.tsx` está listo para que el plan 03 encienda `allowCreate` en los tres modales de turno (`QuickAppointment`, `NewAppointmentModal`, `SurgeryAppointmentModal`), pasando `profesionalIdParaAlta` con exactamente el mismo valor que cada modal usa para el turno (D-08). El plan 03 debe verificar manualmente en los tres modales:
- La coordinación de dismiss Escape/click-outside (D-13/D-14) — no demostrable por comando, riesgo técnico principal de la fase.
- Que `QuickAppointment`, sin `<form>`, no oculta ningún submit accidental (T-68-09) que sólo se prueba en los otros dos modales.

Nada bajo `backend/` fue modificado (`git status --porcelain backend/` vacío, verificado). `git status --porcelain frontend/src` lista únicamente `AutocompletePaciente.tsx`.

---
*Phase: 68-creaci-n-inline-en-el-autosuggest-frontend*
*Completed: 2026-08-19*
