---
phase: 69-consistencia-de-tel-fono-opcional-frontend
plan: 08
subsystem: ui
tags: [react-query, tanstack-query, react, vitest, testing-library]

# Dependency graph
requires:
  - phase: 69-09
    provides: "runner de tests vitest + Testing Library en frontend/, con QueryClientProvider ya usado en AppointmentDetailModal.test.tsx como convención"
provides:
  - "invalidación de la query [\"paciente\", id] tras cada PATCH exitoso de las 6 secciones de DatosCompletos.tsx, cerrando CR-02 de 69-VERIFICATION.md"
  - "test de render que prueba el efecto observable (invalidateQueries llamado/no llamado), no la presencia de la línea en el fuente"
affects: [pacientes, patient-drawer, whatsapp]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "invalidación parcial por prefijo de 2 elementos ([\"paciente\", id]) para cubrir las variantes de effectiveProfessionalId del queryKey de usePaciente — mismo criterio que useUpdateWhatsappOptIn.ts"
    - "test de render que espía queryClient.invalidateQueries sobre la instancia real pasada al QueryClientProvider, en vez de gatear en el texto fuente"

key-files:
  created: [frontend/src/components/patient/PatientDrawer/views/__tests__/DatosCompletos.test.tsx]
  modified: [frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx]

key-decisions:
  - "invalidatePaciente() se definió una sola vez en el componente y se llama en los 6 handlers save*, no sólo en saveContacto — el defecto es del archivo (ninguno invalidaba nada), no sólo del teléfono"
  - "la invalidación se agregó dentro del try, después del await api.patch(...) y antes del toast.success — nunca en catch/finally, para que un guardado fallido no refetchee y pise el form con datos viejos (T-69-22)"

patterns-established:
  - "Localizar controles ícono-only sin aria-label acotando con within(section) al <section> de la sección bajo test, en vez de data-testid"

requirements-completed: [ENVIO-03, TEL-03]

# Metrics
duration: 6min
completed: 2026-08-22
---

# Phase 69 Plan 08: Invalidación de query del paciente tras guardado Summary

**Los 6 handlers de `DatosCompletos.tsx` invalidan `["paciente", id]` tras un PATCH exitoso, cerrando el gap CR-02 (los 4 controles de WhatsApp del drawer quedaban con el guard de `MOTIVO_SIN_TELEFONO` pegado tras cargarle el teléfono, hasta recargar la página).**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-08-22T03:36:24Z
- **Completed:** 2026-08-22T03:42:02Z
- **Tasks:** 2/2
- **Files modified:** 2 (1 modificado, 1 nuevo)

## Accomplishments
- `DatosCompletos.tsx` ya no deja el drawer con datos obsoletos tras ningún guardado: `saveContacto`, `saveEmergencia`, `saveCobertura`, `saveClinica`, `saveEstado` y `savePersonales` invalidan la query del paciente
- Test de render que monta el componente real dentro de un `QueryClientProvider` y espía `invalidateQueries` para verificar el efecto observable, no el texto fuente
- Dos pruebas negativas ejecutadas manualmente contra el propio test para confirmar que detecta el gap real (ver abajo)

## Task Commits

Each task was committed atomically:

1. **Task 1: Invalidar la query del paciente tras cada guardado exitoso de la ficha** - `0227d17` (fix)
2. **Task 2: Test de render que prueba que el guardado invalida la query del paciente** - `5e4f14b` (test)

## Files Created/Modified
- `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx` - agrega `useQueryClient` + `invalidatePaciente()` (prefijo `["paciente", paciente.id]`), llamado en los 6 handlers `save*` dentro del `try`, después del `await api.patch(...)`
- `frontend/src/components/patient/PatientDrawer/views/__tests__/DatosCompletos.test.tsx` (nuevo) - 3 tests: PATCH exitoso invalida con clave de 2 elementos, PATCH fallido NO invalida, validación de Zod fallida NO llama a `api.patch` ni invalida

## Decisions Made
- Se tocaron las 6 secciones y no sólo `saveContacto`, siguiendo la justificación del plan: el bug es del archivo (ningún handler invalidaba nada), no sólo del teléfono
- El comentario explicativo de la invalidación parcial se redactó sin el literal `effectiveProfessionalId` (criterio de aceptación del plan: `rg -c "effectiveProfessionalId"` debe dar 0), describiéndolo en cambio como "el id del profesional efectivo" para no perder la explicación del porqué del prefijo
- En el test, los controles ícono-only (lápiz/check/X de `Section.tsx`, sin `aria-label`) se localizaron acotando con `within(section)` al `<section>` de "Datos de contacto" — es la única forma de distinguir el botón de esa sección del de las otras 6 sin recurrir a `data-testid`

## Deviations from Plan

None - plan ejecutado tal como estaba escrito. El único ajuste fue de redacción (ver "Decisions Made" sobre el comentario de `effectiveProfessionalId"), no de comportamiento.

## Issues Encountered

**Pruebas negativas de la Task 2 (obligatorias por `acceptance_criteria` y T-69-23), ejecutadas y revertidas:**

1. **Invalidación comentada en `saveContacto` → el caso 1 (PATCH exitoso invalida) FALLA correctamente.**
   Se comentó temporalmente `await invalidatePaciente();` en `saveContacto`. Resultado: `1 failed | 2 passed (3)` — el test `"PATCH exitoso invalida ['paciente', id] (prefijo de 2 elementos)"` falló con `expected "invalidateQueries" to not be called at all` (nunca fue llamado). Confirma que el test detecta la ausencia de invalidación. Cambio revertido inmediatamente después.

2. **Invalidación movida al `finally` en `saveContacto` → el caso 2 (PATCH fallido NO invalida) FALLA correctamente.**
   Se movió temporalmente `await invalidatePaciente();` del `try` (después del PATCH) al bloque `finally`. Resultado: `1 failed | 2 passed (3)` — el test `"PATCH fallido NO invalida..."` falló con `expected "invalidateQueries" to not be called at all, but actually been called 1 times`. Confirma que el test detecta el riesgo T-69-22 (refetch tras guardado fallido). Cambio revertido inmediatamente después.

Tras revertir ambos cambios, `git diff` contra el estado commiteado de la Task 1 no mostró diferencias (`(Bash completed with no output)`), confirmando que el archivo de producción quedó exactamente como lo dejó el commit `0227d17`.

**Flujo de edición disparado desde el DOM sin atajos:** no hizo falta ninguna interacción alternativa — el flujo real (click en el lápiz → escribir en el input → click en Guardar) se disparó completo vía `@testing-library/user-event`, acotado con `within(section)` al `<section>` de "Datos de contacto".

**Hallazgo de la lista de pacientes obsoleta tras `savePersonales`:** no se investigó ni se agregó cobertura para esto — está deliberadamente fuera de alcance del plan (no invalidar `["pacientes"]` ni `["pacientes-suggest"]`), y no apareció evidencia adicional durante la ejecución más allá de lo ya señalado en el plan. Queda como hallazgo latente para un plan futuro si se decide cerrarlo.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CR-02 de `69-VERIFICATION.md` queda cerrado con verificación de comportamiento (no sólo de texto fuente)
- Con esto, los 2 gaps bloqueantes de `69-VERIFICATION.md` (CR-01 en 69-07, CR-02 en este plan) están cerrados; corresponde re-correr `/gsd:verify-phase` contra el código actual antes de marcar la fase 69 como Complete
- Suite de tests del frontend: 3 archivos, 18/18 tests pasando (15 previos + 3 nuevos de este plan)

---
*Phase: 69-consistencia-de-tel-fono-opcional-frontend*
*Completed: 2026-08-22*

## Self-Check: PASSED

- FOUND: frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx
- FOUND: frontend/src/components/patient/PatientDrawer/views/__tests__/DatosCompletos.test.tsx
- FOUND: .planning/phases/69-consistencia-de-tel-fono-opcional-frontend/69-08-SUMMARY.md
- FOUND commit: 0227d17
- FOUND commit: 5e4f14b
