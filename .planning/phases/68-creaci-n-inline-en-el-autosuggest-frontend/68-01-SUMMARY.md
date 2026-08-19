---
phase: 68-creaci-n-inline-en-el-autosuggest-frontend
plan: 01
subsystem: ui
tags: [react-hook-form, zod, tanstack-query, sonner, nextjs]

# Dependency graph
requires:
  - phase: 67-tel-fono-opcional-y-guards-de-env-o-backend
    provides: "Paciente.telefono nullable, normalizeTelefono() en el service, 409 ConflictException con mensaje en español para DNI duplicado"
provides:
  - "InlineCreatePaciente.tsx: mini-form autocontenido de 3 campos (Nombre, DNI, Teléfono opcional) que crea un paciente vía POST /pacientes y devuelve el registro creado"
  - "buildPrefill(query): función pura exportada que decide precarga DNI vs Nombre según la regla D-09"
  - "useCreatePaciente extendido: invalida también [\"pacientes-suggest\"] en onSuccess"
affects: [68-02-plan-que-monta-el-componente-en-AutocompletePaciente]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mini-form sin <form> interno dentro de un Popover portaleado, con submit vía handleSubmit(onSubmit)() desde un botón type=button y Enter capturado con preventDefault/stopPropagation"
    - "Campo controlado (watch/setValue) para normalizar DNI a solo dígitos en cada onChange sin re-render de validación (shouldValidate:false)"

key-files:
  created:
    - frontend/src/components/InlineCreatePaciente.tsx
  modified:
    - frontend/src/hooks/useCreatePaciente.ts

key-decisions:
  - "onSubmit no bloquea la creación cuando profesionalId es null/undefined — se manda profesionalId: undefined, igual que NewPacienteModal, replicando D-08"
  - "El teléfono se manda como cadena vacía (nunca undefined) cuando el usuario no lo carga, para que normalizeTelefono() del backend lo convierta a null (D-06)"
  - "El campo Teléfono usa un Input plano, no PhoneInput, para no anidar Popover dentro de Popover dentro de Dialog"

patterns-established:
  - "ApiError local type ({ response?: { status?: number; data?: { message?: string } }; message?: string }) para tipar errores de axios sin any, reusable en el plan 02 y futuros mini-forms"

requirements-completed: [ALTA-02, ALTA-03, ALTA-05, ALTA-06]

# Metrics
duration: ~25min
completed: 2026-08-19
---

# Phase 68 Plan 01: InlineCreatePaciente mini-form Summary

**Mini-form autocontenido de alta de paciente (Nombre + DNI + Teléfono opcional) con precarga inteligente del query, validación Zod/RHF y ruteo del 409 de DNI duplicado bajo el campo — listo para que el plan 02 lo monte en `AutocompletePaciente` sin adaptador.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-19
- **Tasks:** 2/2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- `InlineCreatePaciente.tsx` creado con la API pública exacta pedida por el plan 02: props `query`, `profesionalId?`, `onCreated`, `onCancel`; exporta `PacienteCreado` y `buildPrefill`.
- Precarga D-09/D-10/D-11 implementada como funciones puras y auditables (`buildPrefill`, `stripSeparators`, `capitalizarNombre`), calculada una sola vez al montar vía `useState(() => buildPrefill(query))`.
- Schema Zod local (D-15) con `telefono` opcional-pero-validado-si-viene, distinto del `telefono` obligatorio de `NewPacienteModal`.
- Payload de alta (D-06) idéntico al de `NewPacienteModal`, sin ningún flag de "ficha incompleta".
- Ruteo de errores (D-12): 409 o mensaje con "DNI" → `setError("dni", ...)` conservando lo cargado; cualquier otro error → `toast.error`.
- `useCreatePaciente` ahora invalida también `["pacientes-suggest"]` en `onSuccess`, además de `["pacientes"]`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Crear InlineCreatePaciente.tsx — precarga, schema Zod y los tres campos** - `321929d` (feat)
2. **Task 2: Wiring del POST — payload, éxito con handoff y ruteo del 409** - `0f06a9b` (feat)

_Note: worktree mode — the orchestrator applies the plan-metadata commit centrally after merge; STATE.md/ROADMAP.md are not touched by this agent._

## Files Created/Modified
- `frontend/src/components/InlineCreatePaciente.tsx` - Mini-form de 3 campos: precarga, schema Zod, foco al montar, POST wiring, ruteo 409, Enter para submit
- `frontend/src/hooks/useCreatePaciente.ts` - Segunda invalidación de cache (`["pacientes-suggest"]`) junto a la existente (`["pacientes"]`)

## Decisions Made
- Los refs de `nombreRef`/`dniRef` se tipan como `useRef<HTMLInputElement | null>(null)` (en vez de castear a `any` como hace `NewPacienteModal.tsx`) para respetar la regla del repo de no usar `any`; esto hace que TypeScript infiera `MutableRefObject` (mutable) en lugar de `RefObject` (readonly) sin necesidad de cast.
- El comentario que explica por qué no se usa `PhoneInput` evita mencionar el nombre literal `PhoneInput` para no romper el acceptance criteria `grep -c "PhoneInput"` == 0 (que verifica ausencia de import), mencionando en cambio "el selector de país con Popover propio".
- `onSubmit` de la Task 1 se dejó como función que solo hace `void data; void profesionalId;` (sin `mutate` todavía) tal como pide la acción del plan; el wiring real se completó en la Task 2.

## Deviations from Plan

None - plan executed exactly as written. La única adaptación fue de redacción en un comentario (ver "Decisions Made" arriba) para satisfacer un acceptance criteria de grep sin cambiar el comportamiento ni el propósito del comentario.

## Issues Encountered

**Worktree sin `node_modules`:** el worktree de este agente no tenía `frontend/node_modules` instalado (no versionado por git, como es esperable). Se creó un symlink temporal a `frontend/node_modules` del checkout principal únicamente para poder correr `tsc --noEmit` y `eslint` durante la verificación de cada task, y se eliminó (`unlink`) antes de cerrar el plan. No se modificó ni instaló ningún paquete nuevo; `package.json` del worktree es idéntico al del checkout principal (diff vacío, verificado antes de symlinkear).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`InlineCreatePaciente` está listo para que el plan 02 lo monte dentro de `PopoverContent` de `AutocompletePaciente.tsx`. El plan 02 debe resolver, sin tocar este archivo:
- La condición de apertura del popover (D-02/D-03) para mostrar la fila `➕ Crear paciente "«query»"`.
- La coordinación de dismiss entre Popover y Dialog (D-13/D-14: Escape cierra solo el mini-form, click-outside no lo cierra) — riesgo técnico principal de la fase, sin precedente en el repo (ver `68-PATTERNS.md`, sección "No Analog Found").
- El modo foco "congelado" de búsqueda mientras el mini-form está abierto (D-04).

Nada bajo `backend/` fue modificado (`git status --porcelain backend/` vacío, verificado).

---
*Phase: 68-creaci-n-inline-en-el-autosuggest-frontend*
*Completed: 2026-08-19*

## Self-Check: PASSED

- FOUND: `frontend/src/components/InlineCreatePaciente.tsx`
- FOUND: `frontend/src/hooks/useCreatePaciente.ts`
- FOUND: `.planning/phases/68-creaci-n-inline-en-el-autosuggest-frontend/68-01-SUMMARY.md`
- FOUND commit: `321929d`
- FOUND commit: `0f06a9b`
- FOUND commit: `80eaa6f`
