# Phase 54: Portal Backend + Token Security - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

El **backend público** del portal de autogestión del paciente. Esta fase entrega el módulo NestJS sin login que:

- **Recibe el token UUID crudo** en la URL, lo hashea (SHA-256) y busca al paciente por `Paciente.portalToken` (el hash de 64-char hex). **No genera ni rota el token** — eso ya lo hizo F52 (`pacientes.service.generarPortalLink/obtenerPortalLink`). F54 sólo consume el lookup por hash.
- **Verifica identidad por DNI** con bloqueo anti-fuerza-bruta: 3 intentos fallidos por token en 15 min → 429 (SC#2).
- **Emite un JWT de portal corto** scopeado al `pacienteId` tras verificar DNI; los demás endpoints lo exigen.
- **Expone DTOs estrictos (narrow)** que protegen los campos clínicos curados — un body con `alergias[]`/`condiciones[]`/`etapaCRM`/`flujo`/`DNI` u otro campo prohibido es ignorado (SC#3).
- **Escribe datos de salud auto-reportados en campos staging** (`alergiasAutoReportadas`, `antecedentesAutoReportados`, `medicacionAutoReportada`, `tratamientosPreviosAutoReportados`) sin tocar los campos clínicos curados por el profesional (SC#4).

**Endpoints que entrega F54 (backend, aunque la UI sea F55):**
1. `GET` pre-verificación — confirma sólo existencia del token (200/404), sin datos.
2. `POST /verificar` — token + DNI → JWT de portal (o 429 si bloqueado).
3. `GET` lectura autenticada (con JWT) — datos personales editables + contexto read-only + valores staged para pre-fill.
4. `PATCH` datos personales de contacto (PORTAL-03) — DTO narrow parcial.
5. `POST/PATCH` salud staged (PORTAL-05/06) — DTO narrow a campos `*AutoReportad*`.

**Fuera de scope (otras fases):**
- Wizard mobile-first del paciente / toda la UI del portal → **Phase 55** (PORTAL-02, y la UI de PORTAL-03/05).
- Generación/rotación del token del portal → **ya hecho en F52** (D-12); F54 no re-hashea ni regenera.
- Ver/descargar PDF de consentimiento, firma dibujada, metadata forense → **Phase 56** (CONS-03/04/05/06/07/08).
- Endpoint de consulta al médico (mensaje al chat, `MensajeInterno` con `origenPaciente`) → **Phase 56** (CHAT-04). NO adelantar a F54.
- Migración a cloud storage → FUT-01.

</domain>

<decisions>
## Implementation Decisions

### Mecanismo de bloqueo de DNI (SC#2)
- **D-01:** **Trackear intentos con columnas persistentes en `Paciente`** — agregar `portalIntentosFallidos Int @default(0)` y `portalBloqueadoHasta DateTime?`. Implica una migración pequeña en esta fase. Elegido sobre Map en memoria (se pierde al reiniciar, no multi-instancia) y sobre ThrottlerGuard custom (la storage default del throttler también es in-memory). Persistente, auditable, funciona multi-instancia, sin infra extra.
- **D-02:** **Conteo por token** (por paciente), literal al SC#2: "3 intentos fallidos consecutivos para el mismo token dentro de 15 minutos". No combinar con IP (el SC habla sólo de token y la IP detrás de proxy agrega complejidad sin pedirlo el criterio).
- **D-03:** **Desbloqueo automático tras 15 min + reset al verificar OK.** La ventana expira sola (pasados 15 min vuelve a tener 3 intentos) Y un DNI correcto resetea `portalIntentosFallidos` a 0 inmediatamente. Sin desbloqueo manual por staff (sería scope de otra fase).
- **D-04:** Reusar el patrón de **normalización/match de DNI ya existente** en `presupuestos.service.verificarYCargar` (trim, quita espacios y puntos, comparación case-insensitive).

### Modelo de sesión post-verificación
- **D-05:** **JWT de portal corto.** `POST /verificar` devuelve un JWT scopeado a ese `pacienteId` con TTL corto. Los endpoints de lectura/escritura lo exigen en el header. El DNI NO viaja repetido en cada request; el token UUID crudo NO se reusa como credencial de escritura. Reusar el `JwtService`/patrón de auth ya presente, con un scope/claim que identifique que es un token de portal-paciente (no un JWT de staff).
- **D-06:** **Al expirar el JWT → re-verificar DNI.** Ante 401 por token vencido, el frontend (F55) vuelve a pedir el DNI y re-emite el JWT. El paciente sólo reingresa su DNI; no hay refresh token.

### Contenido del DTO de lectura
- **D-07:** **GET pre-verificación: sin datos** — sólo 200 (token existe) / 404 (no existe o inválido). El nombre del paciente NO aparece hasta verificar DNI (máxima privacidad con token crudo). Considerar también devolver el estado de bloqueo si está bloqueado (para que F55 muestre el mensaje de 429), a criterio del planner.
- **D-08:** **GET post-verificación (con JWT):**
  - **Editables (PORTAL-03):** `telefono`, `email`, `direccion`, contacto de emergencia.
  - **Read-only (mostrar, no editar):** `nombreCompleto`, `DNI`, obra social, próxima cirugía / zona.
  - **NUNCA expone:** `alergias[]`, `condiciones[]`, `etapaCRM`, `flujo` ni ningún campo clínico curado (PORTAL-04).
- **D-09:** **Devolver los valores staged ya auto-reportados** para pre-cargar el paso de salud: `alergiasAutoReportadas`, `antecedentesAutoReportados`, `medicacionAutoReportada`, `tratamientosPreviosAutoReportados`. **NUNCA devolver los curados** (`alergias[]`/`condiciones[]`) — no filtrar lo que cargó el médico.

### Superficie de endpoints y DTOs narrow (SC#3)
- **D-10:** **F54 entrega el backend de escritura completo** que F55 consume: `PATCH` datos personales (PORTAL-03) y `POST/PATCH` salud staged (PORTAL-05/06), ambos con DTO narrow. F55 sólo construye el wizard contra estos endpoints. NO incluir el endpoint de consulta al médico (CHAT-04 → F56).
- **D-11:** **PATCH de datos personales = parcial, sólo whitelisted.** DTO con `telefono`/`email`/`direccion`/contacto-emergencia **todos opcionales**; sólo se actualiza lo presente en el body.
- **D-12:** **Ante un campo prohibido en el body → ignorar silenciosamente** (`whitelist: true`, SIN `forbidNonWhitelisted`). El `ValidationPipe` descarta los campos no declarados sin error y aplica sólo lo permitido. Coincide con el SC#3 literal ("un request que los incluya en el body **es ignorado**") — NO devolver 400 ante campos de más.
- **D-13:** El narrow DTO de salud staged escribe SÓLO sobre los campos `*AutoReportad*`; jamás sobre `alergias[]`/`condiciones[]`/`medicacion[]` curados (SC#4).

### Claude's Discretion
- TTL exacto del JWT de portal (sugerencia: 30–60 min) y la mecánica fina de claims/scope — seguir el patrón de `JwtService`/auth existente.
- Nombre exacto del módulo NestJS (`paciente-portal` sugerido) y de los endpoints/rutas.
- Si el GET pre-verificación devuelve además el flag de bloqueo (para UX del 429) o sólo 200/404.
- Shape exacto del `Json` de `antecedentesAutoReportados` que escribe el portal (consistente con lo que F55 enviará).
- Formato exacto del cuerpo de la respuesta 429 (mensaje + posible `retryAfter`/`bloqueadoHasta`).
- Manejo del edge case "paciente sin DNI cargado en el sistema" al verificar (no discutido explícitamente; resolver de forma segura — un paciente sin DNI no debería poder verificar/entrar).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope y requisitos de la fase
- `.planning/ROADMAP.md` §"Phase 54: Portal Backend + Token Security" — Goal, Depends on (Phases 52, 53), Requirements (PORTAL-01, PORTAL-04, PORTAL-06), Success Criteria 1–4. **OJO:** SC#1 (generación del link/token) ya está cubierto por F52; F54 reusa el lookup por hash.
- `.planning/REQUIREMENTS.md` — PORTAL-01 (link persistente, token hasheado), PORTAL-04 (paciente NO edita obra social ni clínicos), PORTAL-06 (salud auto-reportada queda staged, no sobrescribe lo curado). Tabla de cobertura líneas ~108-113 (PORTAL-01/04/06 → Phase 54; PORTAL-02/03/05 → Phase 55).

### Contexto de fases previas (decisiones que F54 hereda)
- `.planning/phases/52-preop-hc-form-chip-catalogs/52-CONTEXT.md` §D-12 — token real generado en F52: `sha256(uuidCrudo)` hex 64-char en `Paciente.portalToken`, UUID crudo en la URL, `portalTokenCifrado` AES-256-GCM at-rest. **F54 NO re-hashea ni regenera.**
- `.planning/phases/53-storage-upload-consent-config/53-CONTEXT.md` §D-07/D-08 — ThrottlerModule global (`APP_GUARD`, ttl 60s / 100 req) + tier estricto `@Throttle({ ttl: 60000, limit: 20 })` en endpoints públicos. El portal público de F54 debe llevar el tier estricto.
- `.planning/STATE.md` §"Accumulated Context" — decisiones vivas del milestone v1.12 (token hasheado, staging fields staff-vs-paciente, throttler wired en F53 antes del primer endpoint público de F54, gate legal pre-go-live).

### Pitfalls del milestone
- `.planning/research/PITFALLS.md` — pitfall 1 (token hasheado desde su creación), pitfall 12 (scope por contexto autenticado, nunca desde el body), pitfall 13 (staging fields escritos sólo por el portal del paciente, no por el staff).

### Código a tocar / reusar (rutas completas)
- `backend/src/prisma/schema.prisma` §`Paciente` (~líneas 200-235) — campos ya existentes: `portalToken` (217), `portalTokenGeneradoAt` (218), `portalTokenCifrado` (219), `alergiasAutoReportadas` (221), `antecedentesAutoReportados Json?` (222), `medicacionAutoReportada` (223), `tratamientosPreviosAutoReportados` (224). **Agregar (D-01):** `portalIntentosFallidos Int @default(0)` y `portalBloqueadoHasta DateTime?` + migración.
- `backend/src/modules/presupuestos/presupuesto-public.controller.ts` — **patrón canónico de controller público** sin `@UseGuards`, con `@Throttle({ ttl: 60000, limit: 20 })`, rutas `:token` y `:token/verificar` con `body: { dni }`. Modelo directo para el `paciente-portal` controller.
- `backend/src/modules/presupuestos/presupuestos.service.ts` §`verificarYCargar` (~línea 502) — patrón de normalización/match de DNI a reusar (D-04).
- `backend/src/modules/pacientes/pacientes.service.ts` §`generarPortalLink`/`obtenerPortalLink` (~líneas 1041-1130) — lógica del token ya implementada; F54 reusa el lookup por `portalToken` (hash). Importa `crypto` (sha256) y `EncryptionService`.
- `backend/src/app.module.ts` (línea 99) — `ThrottlerGuard` como `APP_GUARD` global ya cableado; registrar el nuevo módulo `paciente-portal`.
- `backend/src/modules/auth/` (`jwt-auth.guard.ts`, `auth.module.ts`) — `JwtAuthGuard` es per-ruta (no global), y `JwtService` disponible para emitir el JWT de portal corto (D-05). El portal NO usa este guard de staff; necesita su propia validación de JWT de portal.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`presupuesto-public.controller.ts`**: analog casi 1:1 — controller público sin auth guard, `@Throttle` estricto, endpoint `:token/verificar` con `{ dni }`. Copiar la estructura para `paciente-portal`.
- **`presupuestos.service.verificarYCargar`**: normalización de DNI (trim, quita espacios/puntos, case-insensitive). Reusar exacto.
- **`pacientes.service.generarPortalLink/obtenerPortalLink`**: token ya generado/hasheado; el lookup por hash SHA-256 es el punto de entrada del portal.
- **`JwtService` + patrón de auth**: para emitir/validar el JWT de portal corto (scope paciente, no staff).
- **Campos de `Paciente`** ya en schema: portal token (hash + cifrado + generadoAt) y los 4 campos `*AutoReportad*` de staging. Sólo faltan las 2 columnas de tracking de intentos (D-01).

### Established Patterns
- JWT auth es **per-ruta** (`@UseGuards(JwtAuthGuard)`), no global → los endpoints públicos del portal simplemente no llevan el guard de staff.
- ThrottlerGuard global (`APP_GUARD`) + tier estricto `@Throttle` en rutas públicas (F53).
- Multi-tenant/scope siempre por contexto autenticado, nunca desde el body (pitfall 12). En el portal el "contexto" es el `pacienteId` derivado del token (y luego del JWT de portal), nunca un id en el body.
- Token de portal: hash SHA-256 64-char hex en DB; UUID crudo sólo en la URL (pitfall 1).
- Narrow DTO con `ValidationPipe` `whitelist: true` para descartar campos no declarados (D-12).

### Integration Points
- **Migración nueva** para las 2 columnas de tracking de intentos en `Paciente` (única migración de esta fase).
- **Nuevo módulo `paciente-portal`** (controller público + service) registrado en `AppModule`, con su propio guard/validación de JWT de portal.
- Lookup contra `Paciente.portalToken` reusando el hashing de `pacientes.service`.
- Escritura confinada a campos de contacto + campos `*AutoReportad*` (staging); jamás a campos clínicos curados.

</code_context>

<specifics>
## Specific Ideas

- **Separación staff vs paciente** estricta: el portal escribe SÓLO en campos `*AutoReportad*` y en datos de contacto; los campos curados (`alergias[]`/`condiciones[]`/`medicacion[]`) son intocables desde el portal (respaldo legal — la declaración del paciente queda registrada aparte de lo que curó el médico).
- **"Ignorado", no "rechazado"**: el SC#3 pide que un campo prohibido en el body sea ignorado silenciosamente, no que devuelva 400. Decisión consciente (D-12) para robustez del front.
- **El token no es credencial de escritura**: el UUID crudo sólo sirve para iniciar la verificación; la escritura requiere el JWT de portal emitido tras validar DNI (D-05).
- **No adelantar CHAT-04** (consulta al médico) ni nada de consentimiento firmado a F54 — quedan en F56.

</specifics>

<deferred>
## Deferred Ideas

- **Desbloqueo manual del 429 por staff** desde la app — no entra en F54 (auto-expiry de 15 min alcanza). Posible mejora futura si surge necesidad operativa.
- **Bloqueo combinado token + IP** — descartado por ahora; el SC#2 sólo pide por token.
- **Endpoint de consulta al médico (CHAT-04)** — Phase 56.
- **Refresh token del JWT de portal** — descartado; al expirar se re-verifica DNI (D-06).

None of the above were folded into this phase — discussion stayed within scope.

</deferred>

---

*Phase: 54-portal-backend-token-security*
*Context gathered: 2026-06-30*
