# Phase 33: Widget Agenda Operativo - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Convertir la tabla de turnos del día (`UpcomingAppointments.tsx`) en herramienta operativa diaria: reordenar columnas (Tipo de Turno antes de Tratamiento), hacer el nombre del paciente clickeable → PatientDrawer, agregar menú ⋮ con acciones contextuales por estado (En espera, Ausente, Llamar placeholder, Reactivar), y mostrar badges correctos para los nuevos estados EN_ESPERA y SIENDO_ATENDIDO. Solo frontend — backend ya entregado en Phase 32.

</domain>

<decisions>
## Implementation Decisions

### Menú ⋮ y layout de acciones
- El botón ⋮ aparece **solo en hover** sobre la fila (tabla queda limpia en estado normal)
- El ⋮ se ubica **junto al botón "Iniciar" en la misma celda** de la columna Acciones (no columna extra)
- Para turnos en estado **SIENDO_ATENDIDO**: no se muestra el botón ⋮ (la sesión está activa, no tiene sentido cambiar el estado)
- Al ejecutar una acción (En espera, Ausente, Reactivar): **toast + update optimista** — el badge cambia visualmente de inmediato, toast confirma; si falla, toast de error y revierte

### Items del menú ⋮ por estado
- **PENDIENTE / CONFIRMADO / EN_ESPERA**: mostrar "En espera", "Ausente", "Llamar" (placeholder con tooltip "Próximamente")
- **EN_ESPERA**: mismas opciones (ya está en espera, pero puede pasar a Ausente o ser llamado)
- **AUSENTE**: mostrar "Reactivar" (regresa a PENDIENTE)
- **FINALIZADO / CANCELADO / SIENDO_ATENDIDO**: no mostrar ⋮

### Items del menú: iconos y tooltips
- Todos los items llevan **icono + texto + tooltip semántico** al hacer hover
  - "En espera" → icono Clock
  - "Ausente" → icono UserX
  - "Llamar" → icono Bell (campanita), tooltip "Próximamente" (placeholder deshabilitado)
  - "Reactivar" → icono RefreshCw

### Badges de estado (EN_ESPERA y SIENDO_ATENDIDO)
- **EN_ESPERA**: dot **amber/naranja** + label `"En espera"` — sugiere "atención requerida" sin urgencia
- **SIENDO_ATENDIDO**: dot **indigo/azul profundo** + label `"En atención"` + **dot con animated pulse** (señal de turno activo en tiempo real)
- Focus mode y light mode: ambos badges deben tener variantes para los dos temas (patrón existente en `estadoUi()`)

### Nombre del paciente clickeable → PatientDrawer
- El nombre se **subraya al hover + cursor pointer** (patrón link estándar, sin elementos extra en estado normal)
- Al hacer click abre el PatientDrawer en su **vista inicial por defecto** (misma que desde /pacientes — el usuario navega desde ahí)
- El PatientDrawer **coexiste con LiveTurno** panel — ambos pueden estar abiertos simultáneamente
- El click funciona para **todos los estados** del turno (incluyendo FINALIZADO, CANCELADO, AUSENTE)

### Columna "Llamar" placeholder en menú
- "Llamar" aparece en estados PENDIENTE, CONFIRMADO y EN_ESPERA
- Está **deshabilitado** con tooltip `"Próximamente"` — visible para que el usuario sepa que existe la función
- Icono Bell (campanita) — semántica de "notificar/llamar" al paciente (futuro: pantalla sala de espera)

### Claude's Discretion
- Implementación exacta del update optimista (useMutation + onMutate/onError con rollback en TanStack Query)
- Hooks para las nuevas acciones (marcarEnEspera, marcarAusente, reactivar) — seguir el patrón de `useLiveTurnoActions`
- Exacta clase Tailwind para "indigo profundo" en focus mode vs light mode
- Timing y copy exacto de los toasts

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PatientDrawer` (`/app/dashboard/pacientes/components/PatientDrawer.tsx`): acepta `open`, `onOpenChange`, `pacienteId`. Patrón ya usado en `TurnoHCModal.tsx:324` — replicar exactamente
- `estadoUi()` en `UpcomingAppointments.tsx:89`: función que retorna `{ dot, text, label }` — solo agregar casos para `EN_ESPERA` y `SIENDO_ATENDIDO`
- `useLiveTurnoActions` hook: expone `iniciarSesion` mutation — seguir mismo patrón para las 3 nuevas mutations
- shadcn/ui `DropdownMenu` ya en el proyecto — usar para el menú ⋮
- `lucide-react` para iconos: Clock, UserX, Bell, RefreshCw, MoreVertical

### Established Patterns
- Acciones optimistas: `iniciarSesion.mutate(t.id)` con `isPending` check — replicar para las 3 nuevas acciones
- Toast: `toast.error(...)` / `toast.success(...)` con sonner — patrón existente en el componente
- Focus mode dual: todas las clases usan ternario `focusMode ? "dark-class" : "light-class"` — mantener para los nuevos badges
- Column headers en la tabla: líneas 349–355 — solo reordenar "Tipo de Turno" antes que "Tratamiento"

### Integration Points
- `UpcomingAppointments.tsx`: archivo principal de cambios (~480 líneas)
  - Línea 89: `estadoUi()` → agregar EN_ESPERA y SIENDO_ATENDIDO
  - Línea 349–355: reordenar columnas (Tipo antes que Tratamiento)
  - Línea 370: nombre paciente → button clickeable con PatientDrawer state
  - Línea 422–444: acciones column → agregar ⋮ DropdownMenu junto al botón Iniciar
- Hooks nuevos: `useMarcarEnEspera`, `useMarcarAusente`, `useReactivarTurno` — llamar a los endpoints de Phase 32
- API endpoints ya listos: `PATCH /turnos/:id/marcar-en-espera`, `/marcar-ausente`, `/reactivar`
- `TurnoAgenda.estado` type ya incluye `EN_ESPERA` y `SIENDO_ATENDIDO` (extendido en Phase 32)

</code_context>

<specifics>
## Specific Ideas

- El animated pulse en SIENDO_ATENDIDO comunica "vivo ahora mismo" — solo para ese estado, no para EN_ESPERA
- "Llamar" con Bell (no Phone) porque el flujo futuro es pantalla de sala de espera (notificar), no llamada telefónica
- Tooltip semántico en cada item del menú ayuda a la secretaria a entender el efecto sin necesitar hover sobre texto

</specifics>

<deferred>
## Deferred Ideas

- Pantalla de sala de espera conectada al botón "Llamar" — CALL-01 en backlog (requiere infraestructura adicional)
- Notificación al paciente al ser llamado — out of scope v1.6

</deferred>

---

*Phase: 33-widget-agenda-operativo*
*Context gathered: 2026-05-13*
