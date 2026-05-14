# Phase 34: LiveTurno Simplificado - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminar la fricción del panel de consulta activa: quitar el timer de toda la UI, reemplazar el botón "Iniciar" bloqueado por un diálogo de confirmación cuando hay sesión activa, y agregar un camino explícito para cerrar la sesión sin guardar HC (turno queda FINALIZADO de todas formas). Cambios solo en frontend — backend no se toca.

</domain>

<decisions>
## Implementation Decisions

### Timer removal (LT-01)
- Eliminar **completamente** el timer de la UI: cero menciones en Header, Footer ni AlertDialog
- El Clock widget del Header desaparece
- El label "Duración: 05:23" del Footer desaparece
- La referencia a la duración en el AlertDialog de "Finalizar sesión" desaparece
- `useLiveTurnoTimer.ts` se borra por completo (no se llama desde ningún componente)
- El indicador verde "En curso" con dot animado **se mantiene** en el Header — no es un timer, da contexto de sesión activa
- `duracionRealMinutos` se preserva en backend (ya calculado por el servidor, no depende del hook cliente)

### LiveTurnoIndicator minimizado
- Cuando el panel está minimizado, muestra `[nombre paciente] — [tipo de turno badge]`
- Ya no muestra el timer compacto

### Dialog LT-02: sesión activa al intentar iniciar
- El botón "Iniciar" en `UpcomingAppointments` pasa de `disabled={!!session}` a **clickeable siempre**
- Click con sesión activa → abre un `AlertDialog` en el widget de agenda (no en el panel)
- Copy del dialog: **"Tenés una sesión activa con [nombre actual]. ¿Finalizarla y abrir el turno de [nuevo paciente]?"**
- Si hay borrador de HC no guardado → el texto del dialog agrega: **"La entrada de HC en borrador no se guardará."**
- Acciones: `[Cancelar]` y `[Finalizar y abrir]`
- Al confirmar: llama `cerrar-sesion` de la sesión actual (sin auto-guardar HC draft) → espera respuesta → llama `iniciarSesion` del nuevo turno
- Si `cerrar-sesion` falla → toast de error, **no** abre el nuevo turno, sesión anterior queda activa
- Si `iniciarSesion` falla → toast de error separado (la sesión anterior ya quedó cerrada)

### Exit sin HC: botón "Cerrar sin guardar entrada de HC" (LT-03)
- Nuevo botón en el **footer** del LiveTurnoPanel, entre "Minimizar" y "Finalizar sesión"
- Label exacto: **"Cerrar sin guardar entrada de HC"**
- Estilo: outline (no destructive) — es una acción de escape, no destructiva
- Click → muestra un `AlertDialog` de confirmación:
  - Título: "Cerrar sin registrar HC"
  - Descripción: "¿Cerrar la sesión sin registrar entrada de HC? El turno quedará finalizado."
  - Acciones: `[Cancelar]` / `[Cerrar sesión]`
- Al confirmar: llama `cerrar-sesion` **sin** auto-guardar el borrador de HC
- El botón "Finalizar sesión" existente **mantiene** el auto-guardado del borrador de HC (sin cambios en su lógica actual)

### Layout del footer post-simplificación
```
[Minimizar]  [Cerrar sin guardar entrada de HC]  [■ Finalizar sesión]
                  outline                              destructive/rojo
```
- Sin label de duración/timer en ninguna parte del footer

### Tab "Turno" dentro del panel
- Se mantiene sin cambios — fuera del alcance de esta phase

### Claude's Discretion
- Implementación exacta del AlertDialog del LT-02 en UpcomingAppointments (puede ser estado local en el componente)
- Manejo del estado `isPending` durante la secuencia cerrar→iniciar del LT-02 (bloquear el botón "Finalizar y abrir" durante la llamada)
- Copy exacto del toast de error en cada escenario de fallo

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AlertDialog` de shadcn/ui: ya usado en `LiveTurnoFooter.tsx` para "Finalizar sesión" — mismo patrón para los dos nuevos dialogs (LT-02 y LT-03)
- `useLiveTurnoActions`: expone `cerrarSesion` mutation — usar directamente en LT-02 (widget) y LT-03 (footer)
- `useLiveTurnoStore`: expone `session` y `draftData.hcFormDraft` — chequear `hcFormDraft && !hcFormDraft.saved` para el aviso de borrador en LT-02
- `iniciarSesion` mutation en `useLiveTurnoActions` — la secuencia LT-02 es `cerrarSesion.mutateAsync` → `iniciarSesion.mutate`
- Sonner `toast`: ya usado en `UpcomingAppointments.tsx` con `toast.error(...)` / `toast.success(...)` — mismo patrón

### Files to modify
- `LiveTurnoHeader.tsx`: remover import de `useLiveTurnoTimer` + `formatTimer`; remover bloque Clock widget (conservar bloque "En curso" dot)
- `LiveTurnoFooter.tsx`: remover import de `useLiveTurnoTimer` + `formatTimer`; remover label "Duracion"; remover duración del AlertDialog existente; agregar botón "Cerrar sin guardar entrada de HC" + su propio AlertDialog
- `LiveTurnoIndicator.tsx`: remover timer compacto; mostrar nombre + badge de tipo de turno
- `UpcomingAppointments.tsx`: cambiar lógica del botón "Iniciar" — reemplazar `disabled={!!session}` por estado local `showSwitchDialog` + AlertDialog LT-02
- `useLiveTurnoTimer.ts`: **eliminar el archivo**

### Integration Points
- `LiveTurnoFooter.tsx`: es el único que llama `cerrarSesion.mutateAsync` actualmente — la lógica de auto-save HC se preserva en ese botón; el nuevo botón llama `cerrarSesion.mutateAsync` directo (sin auto-save)
- `UpcomingAppointments.tsx:462`: `disabled={iniciarSesion.isPending || !!session}` → convertir a `disabled={iniciarSesion.isPending}` + estado local para el dialog
- `useLiveTurnoStore` ya expone `session.pacienteNombre` y `draftData.hcFormDraft` — suficiente para construir el copy del dialog LT-02

</code_context>

<specifics>
## Specific Ideas

- Label exacto del botón LT-03: "Cerrar sin guardar entrada de HC" (no abreviar)
- Dialog LT-02 debe nombrar a ambos pacientes: el de la sesión activa y el del turno nuevo — hace la decisión concreta para el profesional
- El aviso de borrador en LT-02 ("La entrada de HC en borrador no se guardará") se agrega solo si `hcFormDraft && !hcFormDraft.saved`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 34-liveturno-simplificado*
*Context gathered: 2026-05-13*
