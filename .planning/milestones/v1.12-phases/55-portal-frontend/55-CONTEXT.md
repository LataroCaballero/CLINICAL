# Phase 55: Portal Frontend - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

El **frontend público del portal de autogestión del paciente** — sin login, mobile-first, accesible por el link con token persistente. Entrega la UI que consume los endpoints `paciente-portal` de F54 para que un paciente **no técnico** pueda:

- **Verificar identidad** por DNI (DNI-gate) reusando el patrón de la página pública de presupuesto.
- **Revisar y completar sus datos de contacto** (PORTAL-03): teléfono, email, dirección, contacto de emergencia.
- **Auto-reportar salud** (PORTAL-05): condiciones, alergias, medicación y tratamientos previos → escrito en campos staged (nunca sobre lo clínico curado).
- **Enviar consultas al médico** (CHAT-04): pregunta que aparece en el chat interno del staff diferenciada (`MensajeInterno.origenPaciente = true`).

**Reframe clave del usuario:** NO es un wizard rígido paso-a-paso. Es una **vista siempre navegable e informativa** — el paciente puede ver toda su información y moverse libre entre las 4 secciones en cualquier orden. El indicador "Paso X de 4" del roadmap se mantiene como **progreso visual, no como candado**.

**Gap de backend que F55 debe cerrar:** el endpoint de consulta (CHAT-04) NO fue construido en F54. El campo `MensajeInterno.origenPaciente` ya existe en schema (F51), pero el controller `paciente-portal` sólo tiene verify/read/datos-personales/salud. **F55 agrega un endpoint mínimo `POST /consulta` (JWT portal)** además del frontend — sin esto, SC#4 no se cumple.

**Fuera de scope (otras fases):**
- Ver/descargar PDF de consentimiento, firma dibujada en canvas, PDF firmado con metadata forense, badge "Consentimiento firmado" en PatientSheet, badge visual "Paciente" en el chat del staff → **Phase 56** (CONS-03..08, CHAT-03). En F55 el paso Consentimiento es un **placeholder**.
- Generación/rotación del token del portal → **ya hecho en F52** (D-12).
- Toda la lógica de token hasheado, lock anti-fuerza-bruta (429) y JWT portal-scoped → **ya hecho en F54** (backend). F55 sólo consume.

</domain>

<decisions>
## Implementation Decisions

### CHAT-04 — Endpoint de consulta (cierre del gap de backend)
- **D-01:** **F55 agrega un endpoint mínimo `POST /consulta` en el módulo `paciente-portal`**, protegido por `PortalJwtGuard` (mismo guard de los PATCH). Crea un `MensajeInterno` con `origenPaciente = true` dirigido al chat del profesional del paciente. Es el único agregado de backend de esta fase, que por lo demás es frontend.
- **D-02:** **Envío one-way.** El paciente escribe y envía la consulta; **NO ve las respuestas del staff** dentro del portal. No se construye endpoint de lectura de mensajes ni polling en F55 (eso rozaría el scope de un chat completo). El staff ve/responde desde el chat interno existente.
- **D-03:** El shape del body de la consulta es narrow (sólo el texto del mensaje); el `pacienteId` y el destino del chat se derivan del JWT de portal, nunca del body (pitfall 12, consistente con F54).

### Paso Salud (PORTAL-05)
- **D-04:** **Chips seleccionables + sugerencias comunes por categoría + campo "otro" para agregar libre**, adaptando el patrón del form del staff (F52) a mobile. Categorías: condiciones/enfermedades, alergias, medicación, tratamientos previos.
- **D-05:** **Pre-cargar desde los valores staged** que devuelve el `GET /` del portal (`alergiasAutoReportadas`, `antecedentesAutoReportados`, `medicacionAutoReportada`, `tratamientosPreviosAutoReportados`, D-09 de F54). El paciente ve lo que ya cargó en visitas anteriores y puede corregir/agregar.
- **D-06:** La escritura va SÓLO por `PATCH /salud` (campos `*AutoReportad*`). Nunca toca los campos clínicos curados por el médico — separación staff-vs-paciente ya garantizada por el DTO narrow de F54.

### Layout y navegación
- **D-07:** **Secciones navegables libres** (tabs/acordeón), las 4 siempre accesibles en cualquier orden: (1) Info básica, (2) Salud, (3) Consentimiento [placeholder F56], (4) Consultas. Se muestra tanto la info read-only del paciente (nombre, DNI, obra social, próxima cirugía/zona — de D-08 de F54) como los campos editables. El indicador "X de 4" es progreso, no candado.
- **D-08:** **Guardar al avanzar / al salir de una sección** (SC#2): los cambios de una sección se persisten vía el PATCH correspondiente cuando el paciente la deja o toca "guardar", aunque la navegación sea libre.
- **D-09:** **DNI-gate primero**, reusando el patrón de state machine de la página pública de presupuesto. Manejar el estado bloqueado (429, lock de 3 intentos/15 min de F54) con un mensaje claro y humano en el gate.

### Fin y reingreso
- **D-10:** **Confirmación de guardado + link persistente para re-editar siempre.** El token es persistente (PORTAL-01); al reabrir el link el paciente ve su info actual y puede corregir/agregar cuando quiera. No es un formulario de "un solo uso" — es una vista viva de su información.

### Paso Consultas (comportamiento)
- **D-11:** **Consultas es opcional** — el paciente puede completar datos/salud sin enviar ninguna consulta. La caja de consulta está siempre disponible como canal de contacto (puede enviar varias en distintas visitas); no bloquea el "completado".

### Look & feel
- **D-12:** **Reusar el sistema de diseño shadcn/Tailwind del repo** (mismo que la página pública de presupuesto), adaptado **mobile-first**. Copy en **tuteo español informal**, texto mínimo **≥16px** legible sin zoom (SC#1). Sin correr `/gsd:ui-phase` — se sigue el sistema existente.

### Claude's Discretion
- Shape exacto del `contacto de emergencia` en el form (nombre + teléfono + relación, sugerido) y su mapeo al DTO de `PATCH /datos-personales` de F54.
- Componente concreto para las secciones navegables (Tabs de shadcn vs Accordion vs stepper libre) — elegir el que rinda mejor en mobile.
- Ruta/URL del portal en Next.js (sugerido: `frontend/src/app/portal/[token]/page.tsx`, paralelo a `presupuesto/[token]`).
- Estructura del cliente API + hooks del portal (nuevos, orientados al paciente; `usePortalLink.ts` actual es del lado staff para generar el link, NO se reusa para consumir).
- Ruta exacta del nuevo `POST /consulta` y forma del `Json` que envía el paso Salud (consistente con lo que el `PATCH /salud` de F54 espera escribir en `*AutoReportad*`).
- Validación cliente de email/teléfono (Zod + React Hook Form, patrón del repo).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope y requisitos de la fase
- `.planning/ROADMAP.md` §"Phase 55: Portal Frontend" — Goal, Depends on (Phase 54), Requirements (PORTAL-02, PORTAL-03, PORTAL-05, CHAT-04), Success Criteria 1–4. **OJO:** SC#4 (consulta al chat) requiere el nuevo endpoint `POST /consulta` (D-01), no construido en F54.
- `.planning/REQUIREMENTS.md` — PORTAL-02 (wizard mobile-first, paciente no técnico), PORTAL-03 (datos de contacto editables), PORTAL-05 (auto-reporte de salud), CHAT-04 (consulta → `MensajeInterno` con origen paciente). Tabla de cobertura líneas ~108-114.

### Backend que F55 consume (F54 + gap a cerrar)
- `.planning/phases/54-portal-backend-token-security/54-CONTEXT.md` — decisiones del backend del portal. Endpoints disponibles (D-08/D-09/D-10/D-11/D-13), DTOs narrow, JWT portal (D-05/D-06), lock 429 (D-01..D-03), valores staged para pre-fill (D-09). **F55 NO re-implementa nada de esto; lo consume.**
- `backend/src/modules/paciente-portal/paciente-portal.controller.ts` — rutas ya existentes: `GET /:token` (200/404), `POST /:token/verificar` (DNI→JWT), `GET /` (lectura, `PortalJwtGuard`), `PATCH /datos-personales` (`PortalJwtGuard`), `PATCH /salud` (`PortalJwtGuard`). **Agregar aquí `POST /consulta` (D-01).**
- `backend/src/modules/paciente-portal/guards/` — `PortalJwtGuard` a reusar para el nuevo endpoint de consulta.
- `backend/src/prisma/schema.prisma` §`MensajeInterno` (~línea 237) — campo `origenPaciente Boolean @default(false)` (línea 244) ya existe; el `POST /consulta` lo setea en `true`.

### Analog canónico del frontend
- `frontend/src/app/presupuesto/[token]/page.tsx` — **página pública por token con DNI-gate state machine** (`"loading" | "dni-gate" | "ready" | ...`). Patrón directo para la shell del portal: `useParams`, cliente API, componentes shadcn, manejo de estados de verificación/error.
- `frontend/src/lib/api.ts` — instancia axios del repo (para las llamadas públicas del portal; el JWT de portal se maneja aparte del JWT de staff).

### Patrón de chips del paso Salud
- `.planning/phases/52-preop-hc-form-chip-catalogs/52-CONTEXT.md` — patrón de chips con auto-learning/sugerencias + campo "otro" del form del staff, a adaptar mobile para el paciente (D-04).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`frontend/src/app/presupuesto/[token]/page.tsx`**: analog 1:1 de la shell pública por token + DNI-gate. Copiar la estructura de estados y verificación.
- **Componentes shadcn/ui del repo** (`Button`, `Input`, `Textarea`, `Badge`, `Accordion`, `Tabs`, etc.): base de la UI mobile-first.
- **`backend/.../paciente-portal.controller.ts` + `PortalJwtGuard`**: superficie de escritura/lectura ya lista; sólo falta `POST /consulta`.
- **Patrón de chips de F52**: para el paso Salud (chips + sugerencias + "otro").

### Established Patterns
- Página pública por token → DNI-gate → estado autenticado (patrón de presupuesto público).
- JWT de portal per-ruta (`PortalJwtGuard`), separado del JWT de staff; el `pacienteId` se deriva del token/JWT, nunca del body.
- DTOs narrow con `ValidationPipe whitelist: true` (F54): el front sólo envía campos permitidos; los prohibidos se ignoran.
- Forms con React Hook Form + Zod (patrón del repo) para validación cliente.

### Integration Points
- **Nueva ruta Next.js** del portal (sugerido `frontend/src/app/portal/[token]/`), paralela a `presupuesto/[token]`.
- **Nuevos hooks/cliente API del portal** (lado paciente) contra los endpoints de `paciente-portal`; manejo del JWT de portal en el cliente.
- **Nuevo endpoint backend `POST /consulta`** en `paciente-portal` (único cambio de backend), creando `MensajeInterno(origenPaciente=true)` en el chat del profesional del paciente.
- Pre-fill del paso Salud desde los valores staged que devuelve `GET /` del portal.

</code_context>

<specifics>
## Specific Ideas

- **"No es un paso-a-paso":** el paciente tiene que poder **ver toda su información siempre** y navegar libre; la vista es tanto informativa (read-only de su contexto) como editable. El "Paso X de 4" es orientación de progreso, no un flujo forzado.
- **Vista viva, no formulario de un solo uso:** con el link persistente, el portal es un lugar al que el paciente vuelve para consultar/actualizar sus datos y contactar al médico.
- **Consultas one-way** en F55: canal de entrada del paciente hacia el staff; las respuestas se ven en el chat interno del staff, no en el portal (mantiene el scope acotado).
- **Consentimiento = placeholder** en F55; la firma real y el PDF forense son F56.
- **Copy en tuteo, mobile-first, ≥16px** — pensado para un paciente no técnico usando el celular.

</specifics>

<deferred>
## Deferred Ideas

- **Consultas two-way (ver respuestas del staff en el portal)** — descartado en F55 para acotar scope; posible mejora futura si se quiere un chat bidireccional del paciente.
- **Contrato de diseño UI dedicado (`/gsd:ui-phase`)** para un look más cálido orientado a paciente — no ahora; se reusa el sistema shadcn existente. Reconsiderable si el feedback lo pide.
- **Todo lo de consentimiento firmado** (ver/descargar PDF, firma en canvas, PDF estampado con auditoría, badges) → **Phase 56**.

### Reviewed Todos (not folded)
- **`cr-01-indicaciones-url-validation.md`** (stored-XSS, validación server-side de `indicacionesUrl` en catalogo-hc) — match de baja relevancia (score 0.4, sólo keyword "phase"). **No folded**: es un blocker de backend/seguridad de F52/F53, separado de construir la UI del portal. **Nota para el planner:** si el portal llega a renderizar `indicacionesUrl`, tratarlo como URL no confiable (no inyectar como HTML) hasta que CR-01 se resuelva.

</deferred>

---

*Phase: 55-portal-frontend*
*Context gathered: 2026-07-01*
