---
phase: 69-consistencia-de-tel-fono-opcional-frontend
verified: 2026-08-21T21:38:30Z
status: gaps_found
score: 3/4 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Los botones de envío por WhatsApp aparecen deshabilitados con tooltip explicativo cuando el paciente no tiene teléfono (calendario / detalle de turno)"
    status: failed
    reason: "El atajo de WhatsApp en AppointmentDetailModal (control 5 de la lista cerrada de 5 de D-11) nunca renderiza en la app corriendo. obtenerTurnosPorRango (backend/src/modules/turnos/turnos.service.ts) selecciona paciente.id pero nunca el FK escalar pacienteId, así que frontend/src/app/dashboard/turnos/page.tsx:290 (`pacienteId: t.pacienteId ?? undefined`) evalúa siempre a undefined. Tanto el botón WhatsApp (AppointmentDetailModal.tsx:371) como SendWAMessageModal (línea 474) están condicionados a `{event.pacienteId && (...)}`, que nunca es verdadero. El código del guard (getMotivoBloqueoWhatsApp(event.telefono, event.whatsappOptIn)) está correctamente escrito, pero es inalcanzable: no es un bug de lógica del guard, es que el control entero (deshabilitado o no) no existe en el DOM. La 69-06-SUMMARY.md afirma 'atajo WhatsApp del detalle de turno del calendario gateado' — esa afirmación es falsa en el comportamiento observable."
    artifacts:
      - path: "backend/src/modules/turnos/turnos.service.ts"
        issue: "El select de obtenerTurnosPorRango (líneas ~561-575) no incluye 'pacienteId: true' a nivel raíz del turno, sólo paciente.id anidado"
      - path: "frontend/src/app/dashboard/turnos/page.tsx"
        issue: "Línea 290: pacienteId: t.pacienteId ?? undefined — siempre undefined dado el select actual; el cast (turnosRango as any[]) en línea 283 oculta el mismatch de tipos"
      - path: "frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx"
        issue: "Líneas 370-390 y 474-477: el botón WhatsApp y SendWAMessageModal están detrás de {event.pacienteId && ...}, condición siempre falsa"
    missing:
      - "Agregar pacienteId: true al select de obtenerTurnosPorRango (o mapear desde paciente.id) para que AppointmentDetailModal reciba un pacienteId real"
      - "Actualizar el mapeo de turnos/page.tsx:290 a pacienteId: t.pacienteId ?? t.paciente?.id ?? undefined y retirar el as any[] de la línea 283 (TurnoRango no está ensanchado, ver WR-01 de 69-REVIEW.md)"
  - truth: "Un paciente sin teléfono se comporta bien en toda la app — al cargarle un teléfono, los controles de WhatsApp reflejan el cambio sin recargar la página"
    status: failed
    reason: "DatosCompletos.saveContacto() (frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx) hace el PATCH y un toast.success, pero no invalida ni refetchea la query ['paciente', id, ...] que alimenta a PatientDrawer. PatientDrawer permanece montado permanentemente (frontend/src/components/data-table/data-table.tsx:228-232 sólo alterna la prop open, no desmonta/remonta), y los defaults globales de TanStack Query son staleTime: 30_000 + refetchOnWindowFocus: false (frontend/src/app/providers.tsx:10-13). Reproducción: abrir un paciente sin teléfono → Datos completos → cargar un teléfono → Guardar → Volver → PresupuestosView, WAThreadView (template y free-text) y el botón WhatsApp de PacienteDetails siguen deshabilitados con el tooltip 'El paciente no tiene teléfono cargado', contradiciendo lo que el usuario acaba de guardar y lo que el backend ahora aceptaría. No hay remedio en la UI (cerrar/reabrir el drawer no remonta el observer). Esto contradice directamente el goal de fase ('se comporte bien en toda la app') para 4 de los 5 controles de la lista cerrada de D-11."
    artifacts:
      - path: "frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx"
        issue: "saveContacto (y las demás save*) no llaman queryClient.invalidateQueries ni refetch tras el PATCH; grep de queryClient|invalidate|refetch en el archivo no devuelve nada"
    missing:
      - "Invalidar queryClient.invalidateQueries({ queryKey: ['paciente', paciente.id] }) al final de cada save* exitoso en DatosCompletos.tsx (o mover el guardado a un mutation hook con invalidación propia, como useCreatePaciente)"
---

# Phase 69: Consistencia de Teléfono Opcional (Frontend) Verification Report

**Phase Goal:** Que un paciente sin teléfono se vea y se comporte bien en toda la app, no sólo en el flujo de alta inline.
**Verified:** 2026-08-21T21:38:30Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (from ROADMAP success criteria) | Status | Evidence |
|---|---|---|---|
| 1 | El alta completa (`NewPacienteModal`) permite guardar un paciente sin cargar teléfono | ✓ VERIFIED | `NewPacienteModal.tsx:34-39` — schema Zod `z.string().optional().refine(...)`, umbral ≥6 sólo si hay valor; label línea 175 sin asterisco, con `(opcional)`; payload línea 92 `data.telefono?.trim() ?? ""` (null-safe, no crashea con `undefined`) |
| 2 | El autosuggest muestra un placeholder legible en vez de "Tel: null" para pacientes sin número | ✓ VERIFIED | `AutocompletePaciente.tsx:16,192` — `tieneTelefono(pac.telefono)` decide si se imprime el segmento `— Tel: ...` completo; sin teléfono el segmento entero desaparece (nunca "Tel: null"). Desviación documentada respecto al "-" del resto de la fase (IN-03 de 69-REVIEW.md), pero satisface el criterio observable |
| 3 | La lista de pacientes, la ficha (`DatosCompletos.tsx`) y los reportes que muestran teléfono renderizan el placeholder en vez de vacío o "null" | ✓ VERIFIED (con advertencia) | Reportes: `reportes/financieros/cuentas/page.tsx:17,35-68` y `reportes/operativos/ausentismo/page.tsx:11,28-30` usan `render: (value) => formatTelefono(value)` en las 3 columnas de teléfono. Ficha: `PacienteDetails.tsx:34,191` usa `formatTelefono(paciente.telefono)`. `DatosCompletos.tsx` (nombrado explícitamente en el criterio) NO usa `formatTelefono`: en modo lectura, `EditableInput` (línea 596, `contactoForm.telefono ?? ""`) cae en su propio fallback interno `value || "—"` (em dash, no el "-" simple U+002D que define D-01) — no está vacío ni dice "null", pero es una segunda definición de placeholder que la fase dijo eliminar. "Lista de pacientes" (`columns.tsx`) no muestra teléfono en absoluto — decisión documentada y justificada en `69-CONTEXT.md` D-06 (la nota del ROADMAP que la nombra está "mal atribuida"; verificado independientemente: `columns.tsx` no tiene ninguna referencia a `telefono`) |
| 4 | Los botones de envío por WhatsApp aparecen deshabilitados con tooltip explicativo cuando el paciente no tiene teléfono | ✗ FAILED | 3 de 5 controles (`PresupuestosView`, `WAThreadView` template, `WAThreadView` free-text) y el 4to (`PacienteDetails`) están correctamente escritos y usan `getMotivoBloqueoWhatsApp`, pero **los 4 quedan con el guard "pegado" en `MOTIVO_SIN_TELEFONO` durante el resto de la sesión después de que el usuario carga un teléfono**, porque `DatosCompletos.saveContacto()` nunca invalida la query del paciente (CR-02, confirmado independientemente). El 5to control — el atajo de WhatsApp del detalle de turno en el calendario — **nunca renderiza**, porque `event.pacienteId` es siempre `undefined` (CR-01, confirmado independientemente por el orchestrator y por esta verificación). Ver Gaps below |

**Score:** 3/4 truths verified (truth 4 failed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `frontend/src/lib/telefono.ts` | SSOT: `formatTelefono`, `tieneTelefono`, `getMotivoBloqueoWhatsApp`, `MOTIVO_SIN_TELEFONO`, `MOTIVO_SIN_OPTIN` | ✓ VERIFIED | Todos los 5 exports presentes con la semántica exacta descripta en el plan 01 (falsy-tras-trim, precedencia teléfono>opt-in, texto corto D-16) |
| `frontend/src/types/pacients.ts`, `reportes.ts`, `useReportesFinancieros.ts`, `useListaEspera.ts` | `telefono: string \| null` en 6 sitios | ✓ VERIFIED (5/6) | Los 5 sitios del plan 01 confirmados `string \| null`. `frontend/src/types/finanzas.ts:77` (`CuentaCorrienteResumen.paciente.telefono`) — fuera del alcance de plan 01, sigue `string` no nullable (WR-02 de 69-REVIEW.md, confirmado independientemente). No es consumido hoy por ningún componente, así que no es un blocker de comportamiento, pero es el mismo tipo de drift que la fase buscaba eliminar |
| `frontend/src/app/dashboard/pacientes/components/NewPacienteModal.tsx` | Alta sin teléfono | ✓ VERIFIED | Ver truth 1 |
| `backend/src/modules/turnos/turnos.service.ts` | `telefono: true` en el select de `obtenerTurnosPorRango` | ✓ VERIFIED (dato presente, pero PII sin consumidor) | `telefono: true` está en el select anidado de `paciente`. Pero el FK `pacienteId` a nivel raíz sigue sin seleccionarse, por lo que el dato de teléfono viaja al frontend sin que ningún control pueda usarlo (CR-01) |
| `frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx` | Atajo WhatsApp gateado por teléfono | ✗ ORPHANED (código correcto, control inalcanzable) | `getMotivoBloqueoWhatsApp(event.telefono, event.whatsappOptIn)` está bien invocado y el `disabled`/`TooltipContent` siguen el patrón D-17, pero todo el bloque está detrás de `{event.pacienteId && (...)}` que nunca es verdadero |
| `frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx`, `WAThreadView.tsx`, `PacienteDetails.tsx` | Guards de teléfono correctamente wireados | ⚠️ HOLLOW tras primera edición en sesión | Wireado correctamente en el primer render (datos frescos de fetch inicial), pero queda desactualizado tras `saveContacto()` por el resto de la sesión (CR-02) |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `lib/telefono.ts` | `getMotivoBloqueoWhatsApp` | reutiliza `tieneTelefono` | ✓ WIRED | Línea 48: `if (!tieneTelefono(telefono)) return MOTIVO_SIN_TELEFONO;` |
| `NewPacienteModal.tsx` | `POST /pacientes` | payload `telefono: data.telefono?.trim() ?? ""` | ✓ WIRED | Línea 92, confirmado |
| `PatientDrawer.tsx` | `PresupuestosView`/`MensajesView`→`WAThreadView` | prop `pacienteTelefono` | ✓ WIRED (dato correcto, staleness aparte) | Líneas 135, 144: `pacienteTelefono={paciente.telefono ?? null}` |
| `turnos.service.ts` (select) | `AppointmentDetailModal` | `GET /turnos/rango` → mapeo → `CalendarEvent.telefono` | ✓ WIRED (dato) / ✗ NOT_WIRED (control gatekeeper) | El teléfono llega a `event.telefono`, pero el control que lo consume nunca renderiza por falta de `event.pacienteId` (CR-01) |
| `DatosCompletos.saveContacto` | `usePaciente` cache | invalidación tras PATCH | ✗ NOT_WIRED | No existe ninguna llamada a `invalidateQueries`/`refetch` en el archivo (CR-02) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| TEL-02 | 69-03 | Alta completa sin teléfono | ✓ SATISFIED | `NewPacienteModal.tsx` verificado (truth 1) |
| TEL-03 | 69-01, 69-04 | Placeholder legible en vistas de teléfono | ✓ SATISFIED (con advertencia sobre `DatosCompletos.tsx`, ver truth 3) | Helper + 5 sitios de display migrados; `DatosCompletos.tsx` usa un fallback distinto (`—` vía `EditableInput`) en vez de `formatTelefono` |
| ENVIO-03 | 69-01, 69-02, 69-05, 69-06 | Botones WA deshabilitados con tooltip sin teléfono | ✗ BLOCKED | 4/5 controles se degradan a estado incorrecto tras editar el teléfono en la misma sesión (CR-02); el 5to control (calendario) nunca renderiza (CR-01) |

REQUIREMENTS.md aún marca TEL-02, TEL-03 y ENVIO-03 como `[ ]` (pendiente) — consistente con este hallazgo; no deben marcarse `[x]` hasta cerrar los gaps.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `backend/src/modules/turnos/turnos.service.ts` | select de `obtenerTurnosPorRango` | Widened PII (`telefono: true`) sin FK `pacienteId` que lo haga alcanzable, en un endpoint (`turnos.controller.ts` `obtenerPorRango`) sin `resolveScope` (pre-existente, confirmado por 69-REVIEW.md) | 🛑 BLOCKER (impacto en SC4) | Se paga el costo de exponer teléfonos de pacientes en un rango de fechas sin ningún beneficio funcional |
| `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx` | `saveContacto` y demás `save*` | Falta invalidación de cache tras mutación | 🛑 BLOCKER (impacto en SC4 y en el goal de fase) | Los guards de WhatsApp muestran estado incorrecto tras la primera edición de la sesión |
| `frontend/src/app/dashboard/turnos/page.tsx:283` | `(turnosRango as any[])` | Cast que apaga el chequeo de tipos en el límite de la API | ⚠️ WARNING | Es la razón por la que el compilador no detectó `t.pacienteId` inexistente (WR-01 de 69-REVIEW.md) |
| `frontend/src/types/finanzas.ts:77` | `telefono: string` | Tipo no ensanchado a `string \| null` | ℹ️ INFO | Sin consumidor hoy; drift latente (WR-02) |
| `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx:596` | `contactoForm.telefono ?? ""` con fallback interno `—` de `EditableInput` | Segunda definición de placeholder fuera de `formatTelefono` | ℹ️ INFO | No vacío ni "null", pero diverge del SSOT (glifo distinto) |
| 3 formularios (`NewPacienteModal`, `InlineCreatePaciente`, `DatosCompletos`) | validación de teléfono | Regla de validación duplicada con límites divergentes (con/sin `max(20)`) | ℹ️ INFO | Confirmado en 69-REVIEW.md WR-04; no bloquea los criterios de este phase |

No se encontraron marcadores `TBD`/`FIXME`/`XXX` en los archivos modificados por esta fase.

### Human Verification Required

None identified beyond what code inspection already resolved — the two blocking gaps are deterministic code-path issues (unreachable JSX branch; missing cache invalidation), not subjective/visual judgments.

### Gaps Summary

Phase 69 delivers a genuinely centralized, well-designed SSOT (`lib/telefono.ts`) and correctly propagates it to 8 of the 9 concrete surfaces named across the plans (alta completa, autosuggest, ficha `PacienteDetails`, live-turno, lista de espera, 3 columnas de reportes, y 4 de los 5 guards de envío). However, two defects — both already surfaced by `69-REVIEW.md` and independently reconfirmed here by reading the actual runtime code paths — prevent success criterion 4 (ENVIO-03) from being true in the running app:

1. **CR-01 (calendar control unreachable):** the `obtenerTurnosPorRango` Prisma `select` never returns the scalar `pacienteId` FK, so `AppointmentDetailModal`'s WhatsApp shortcut — gated behind `{event.pacienteId && ...}` — never renders for any turno, regardless of whether the patient has a phone. This is not a guard-logic bug; the entire control is dead code in production. It also means the `telefono: true` widening in the backend select, and the PII it exposes on an endpoint with no `resolveScope`, currently buys nothing.

2. **CR-02 (stale cache after save):** `DatosCompletos.saveContacto()` never invalidates the `['paciente', id, ...]` query. Because `PatientDrawer` stays permanently mounted (only its `open` prop toggles) and global query defaults are `staleTime: 30_000` / `refetchOnWindowFocus: false`, adding a phone number to a patient leaves every WhatsApp guard fed from that drawer (`PresupuestosView`, `WAThreadView` ×2, `PacienteDetails`) showing "El paciente no tiene teléfono cargado" for the rest of the session — directly contradicting what the user just saved, and directly contradicting the phase's own goal statement ("se comporte bien en toda la app").

Both gaps sit squarely inside the scope of requirement ENVIO-03 and the phase goal itself — they are not tangential technical debt. `/gsd:plan-phase --gaps` should target: (a) selecting `pacienteId` in `obtenerTurnosPorRango` and using it (or `paciente.id`) in the frontend mapper, and (b) adding query invalidation to `DatosCompletos`'s save handlers.

Secondary, non-blocking observations carried over from `69-REVIEW.md` for awareness (not part of the gaps list): `TurnoRango` type left stale with an `as any[]` cast at the API boundary (WR-01), `CuentaCorrienteResumen.telefono` not widened (WR-02), and phone-length validation duplicated with divergent bounds across 3 forms (WR-04).

---

_Verified: 2026-08-21T21:38:30Z_
_Verifier: Claude (gsd-verifier)_
