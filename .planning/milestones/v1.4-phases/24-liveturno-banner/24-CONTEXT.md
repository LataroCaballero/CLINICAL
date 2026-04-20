# Phase 24: LiveTurno Banner - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Banner amber no bloqueante dentro del panel LiveTurno para clasificar pacientes con `flujo = PENDIENTE`. El profesional puede clasificar (Cirugía/Tratamiento) o descartar sin abandonar la consulta en vivo. Fase puramente frontend — el backend PATCH `/pacientes/:id/flujo` ya existe desde Phase 22.

</domain>

<decisions>
## Implementation Decisions

### Posición del banner
- Fijo (sticky) entre la barra de tabs y el contenido del tab activo
- Visible en los 4 tabs (HC, Datos, Turno, Cobro) — no solo en HC
- Sticky: no se puede hacer scroll sobre él; permanece visible mientras no se descarte
- Barra compacta (~40-48px de altura), no card ni panel amplio — minimiza espacio robado a la consulta

### Contenido y botones
- Texto corto y directo: "Paciente sin clasificar — ¿Cirugía o Tratamiento?"
- Botones de clasificación: **"Cirugía"** y **"Tratamiento"** (labels exactos, sin descripción extra)
- Dismiss: **X icon solamente** al extremo derecho del banner (no texto "Ahora no")
- Color: amber (per requisito LIVT-01)

### Comportamiento de clasificación
- **Optimistic update inmediato**: el banner desaparece al instante al hacer click sin esperar la respuesta del servidor
- Después de desaparecer el banner: se muestra el estado `"✓ Clasificado como Cirugía"` (brief check state) en el propio banner por ~2 segundos antes de desaparecer completamente
- **Best-effort**: si el PATCH falla, el banner desaparece de todos modos (no interrumpe la consulta). El profesional puede clasificar después desde el perfil del paciente.
- Una vez clasificado (click en Cirugía o Tratamiento), el banner no vuelve a mostrarse en esa sesión

### Comportamiento de dismiss
- Al hacer click en la X: el paciente permanece `PENDIENTE`, el banner desaparece para esa sesión
- El banner **reaparece en una nueva sesión** (próximo `startSession()` para ese paciente)
- El dismiss es a nivel sesión — no persiste entre sesiones

### Condicional de visibilidad
- `flujo === 'PENDIENTE'` → mostrar banner
- `flujo === null` (legacy) → NO mostrar banner (distinguished per STATE.md/Phase 22)
- `flujo === 'CIRUGIA'` o `flujo === 'TRATAMIENTO'` → NO mostrar banner

### Claude's Discretion
- Animación de entrada/salida del banner (fade, slide, o ninguna)
- Icono/indicador visual dentro del banner (ej. AlertTriangle de lucide-react)
- Implementación exacta del brief check state (CSS transition vs timeout)
- Cómo exponer `pacienteFlujo` en el LiveTurnoSession (agregar campo al store + al response de `iniciar-sesion`)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useLiveTurnoStore` (`live-turno.store.ts`) — store Zustand persistido; `startSession()` resetea todo, ideal para agregar `bannerDismissed: boolean` que se limpia en cada `startSession()`
- `LiveTurnoPanel.tsx` — estructura: Header → Tabs → Content (flex-1 overflow-auto) → Footer. El banner va entre `<LiveTurnoTabs />` y el `<div className="flex-1 overflow-auto">` del content
- `api.ts` — axios instance con auth interceptor; el banner usará `api.patch('/pacientes/:id/flujo', { flujo: 'CIRUGIA' | 'TRATAMIENTO' })` directamente
- `useLiveTurnoActions.ts` → `IniciarSesionResponse.paciente` — agregar `flujo: FlujoPaciente | null` al tipo e incluirlo en `sessionData` al llamar `startSession()`
- `Badge`, `Button` components de shadcn/ui — disponibles para el banner
- `toast` de sonner — disponible si se necesita feedback adicional (aunque no se usa para clasificación exitosa)

### Established Patterns
- Estado optimista: el sistema ya usa este patrón implícitamente (ej. crear turno actualiza la UI sin esperar confirmación completa)
- Zustand store con `persist` — el `LiveTurnoSession` ya almacena datos del paciente; extender con `pacienteFlujo`
- `api.patch()` mutations — patrón existente en todos los hooks de mutación del sistema

### Integration Points
- `backend/src/modules/turnos/turnos.service.ts` → método `iniciarSesion()` — agregar `flujo` al include del `paciente` en el select de respuesta
- `frontend/src/hooks/useLiveTurnoActions.ts` → `IniciarSesionResponse` interface + `sessionData` mapping — agregar `pacienteFlujo`
- `frontend/src/store/live-turno.store.ts` → `LiveTurnoSession` interface — agregar `pacienteFlujo: 'PENDIENTE' | 'CIRUGIA' | 'TRATAMIENTO' | null`; `LiveTurnoState` — agregar `bannerDismissed: boolean`; `startSession()` — inicializar `bannerDismissed: false`
- `frontend/src/components/live-turno/LiveTurnoPanel.tsx` — montar el nuevo `<FlujoClassificationBanner />` entre `<LiveTurnoTabs />` y el div de content

</code_context>

<specifics>
## Specific Ideas

- El brief check state después de clasificar debe ser visual en el mismo banner (no toast), mostrando "✓ Clasificado como Cirugía" con color de éxito antes de que el banner desaparezca completamente
- El banner es un nuevo componente: `LiveTurnoFlujoBanner.tsx` (o nombre similar) dentro de `frontend/src/components/live-turno/`
- El `bannerDismissed` flag en el store se resetea en `startSession()` — no en `endSession()` — para que el comportamiento de "nueva sesión" funcione correctamente

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 24-liveturno-banner*
*Context gathered: 2026-04-16*
