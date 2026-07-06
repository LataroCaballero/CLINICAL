# Phase 53: Storage + Upload + Consent Config - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Infraestructura de archivos del portal del paciente. Esta fase entrega:

- **`StorageService`** (INFRA-01): abstracción de almacenamiento con backend en disco local, diseñada para swap a cloud (S3/Supabase) sin tocar consumidores. Interfaz `save(buffer, filename) → relativePath`; los consumidores nunca importan `fs`.
- **Upload seguro** (INFRA-03): validación por magic bytes (no MIME header del cliente), nombres UUID, prevención de path traversal, servido seguro.
- **Rate limiting** (INFRA-02): `ThrottlerModule` cableado globalmente + tier estricto en endpoints públicos/upload.
- **Config de consentimiento + indicaciones por zona** (CONS-01, CONS-02): el médico sube un PDF de consentimiento y carga un link de indicaciones **por zona quirúrgica**, desde Configuración.

**Granularidad clave (decidida en discusión):** consentimiento e indicaciones se agrupan **por zona**, reutilizando el modelo existente `ZonaHC` (mamas, abdomen, rostro…). No se crea un modelo de zona nuevo.

**Fuera de scope (otras fases):**
- Visualización/descarga del PDF en el portal del paciente → Phase 56 (CONS-03)
- Firma del consentimiento (signature pad), estampado en PDF, metadata forense → Phase 56 (CONS-04/05/06)
- Check "informado de indicaciones" del paciente + flag de consentimiento firmado visible → Phase 56 (CONS-07/08)
- Portal público, token hasheado, DTOs → Phases 54/55
- Migración a cloud storage → FUT-01
- Editor rich-text / versionado con UI del consentimiento → FUT-05

</domain>

<decisions>
## Implementation Decisions

### Modelo de zona (reutilización, NO modelo nuevo)
- **D-01:** Reutilizar el modelo existente `ZonaHC` (`backend/src/prisma/schema.prisma` ~línea 1379) como unidad de agrupación de consentimiento + indicaciones. Es per-profesional, ya gestionado en el tab "Catálogo HC", y agrupa diagnósticos/tratamientos. NO crear un modelo `ZonaCirugia`.
- **D-02:** Agregar a `ZonaHC` un campo `indicacionesUrl String?` (link de indicaciones preoperatorias por zona — CONS-02).
- **D-03:** Vincular `CirugiaCatalogo` a la zona ahora: agregar `zonaId String?` con relación a `ZonaHC` (más relación inversa). Así el portal (fases 55/56) resuelve automáticamente el consentimiento/indicación correcto según la cirugía del paciente, sin trabajo extra de modelo más adelante.

### Consentimiento PDF (CONS-01) — por zona, con historial
- **D-04:** El PDF de consentimiento es **único por zona por profesional** (todas las cirugías de la misma zona comparten el mismo consentimiento). Se referencia desde la `ZonaHC`.
- **D-05:** **Conservar historial.** Al re-subir el PDF de una zona, NO se borra el anterior del disco: cada PDF subido se guarda con su UUID y se conserva como respaldo legal (un paciente pudo haberlo visto/firmado). El registro de la zona apunta al PDF **vigente**, pero el vigente debe ser consultable y los anteriores quedan archivados. El versionado con UI llega en Phase 56 (FUT-05) — acá basta con persistir el historial y saber cuál es el vigente.
  - *Para el planner:* esto implica más que un único campo `consentimientoPdfPath` en `ZonaHC`. Evaluar una tabla liviana de versiones (p.ej. `ConsentimientoZonaArchivo` con `zonaId`, `path`, `nombreOriginal`, `uploadedAt`, `vigente`/`esVigente`) en lugar de pisar un solo campo. El `StorageService` ya conserva los archivos por UUID, así que "conservar" = no borrar + registrar la versión.

### Indicaciones (CONS-02) — por zona
- **D-06:** Las indicaciones se cargan como **link (URL)** por zona, no como texto ni PDF. Campo `indicacionesUrl` en `ZonaHC` (ver D-02).

### Rate limiting (INFRA-02) — criterio delegado a Claude
- **D-07:** `ThrottlerModule` **global** vía `APP_GUARD` con `ThrottlerGuard` en `AppModule` (`@nestjs/throttler` v6 ya está en `package.json`, falta cablearlo). Límite por defecto sugerido: **ttl 60s / 100 requests** por IP. Cumple el criterio de éxito #4 (los endpoints de la API responden 429 al superar el límite).
- **D-08:** **Tier estricto** vía `@Throttle` en los endpoints expuestos sin login: portal público de presupuestos existente (`presupuestos/public`) y el endpoint de upload. Sugerido: público ~20 req/min; upload ~10 req/min. Valores afinables; el usuario delegó el criterio.

### Servido de archivos (INFRA-03)
- **D-09:** Servido **público por URL-UUID inadivinable, sin auth**, vía `${BACKEND_URL}/uploads/...`. Razón: el paciente sin login (portal, fase 56) debe poder descargar el PDF. La seguridad la da el UUID inadivinable + `Content-Disposition: attachment`.
- **D-10:** Layout en disco **multi-tenant**: `uploads/{profesionalId}/...`. Guard de **path traversal** obligatorio al resolver/servir rutas.
- **D-11:** Tamaño máximo de upload: **10 MB** (afinable). Solo PDF.

### UI (frontend) — UI hint = yes
- **D-12:** Nueva tab **"Consentimientos"** en Configuración (`frontend/src/app/dashboard/configuracion/page.tsx`). Lista las zonas existentes (`ZonaHC`) y, por cada una: upload del PDF de consentimiento (con su historial de versiones) + campo de link de indicaciones. NO se mete dentro del tab "Catálogo HC" (ya muy cargado y mezclaría catálogo clínico con config de portal).

### Locked por ROADMAP (no re-discutido — recordatorio para el planner)
- **D-13:** Nombres de archivo **UUID** (nunca el nombre original del cliente, que solo se guarda como metadata si hace falta).
- **D-14:** Validación por **magic bytes tras escritura a disco** (no por el header MIME del cliente). Si no es un PDF válido → HTTP 400 y el archivo no persiste.
- **D-15:** Servido con `Content-Disposition: attachment` vía `${BACKEND_URL}/uploads/...`.

### Claude's Discretion
- Valores exactos de rate limiting (ttl/limit por tier) — usuario delegó ("dejalo a tu criterio"). Defaults propuestos en D-07/D-08.
- Estructura exacta de la persistencia del historial de consentimientos (tabla de versiones vs. otra estrategia) — ver nota en D-05.
- Mecánica de servido estático (ServeStaticModule vs. controller dedicado que streamea). Dado el requisito de `Content-Disposition: attachment` + guard de path traversal + futuro acceso desde portal, un controller dedicado de streaming probablemente sea más controlable que `ServeStatic`. Decisión del planner/researcher.
- Firma exacta del `StorageService` más allá de `save(buffer, filename) → relativePath` (p.ej. helpers `resolvePath`/`getPublicUrl`). No agregar `delete` salvo necesidad: se conserva historial.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope y requisitos de la fase
- `.planning/milestones/v1.12-ROADMAP.md` — sección "Phase 53": Goal, Depends on (Phase 51), Requirements (INFRA-01/02/03, CONS-01/02), Success Criteria (5 criterios) y desglose de plans (53-01/02/03).
- `.planning/REQUIREMENTS.md` — INFRA-01, INFRA-02, INFRA-03, CONS-01, CONS-02 (definiciones), más la tabla de cobertura (líneas ~103-107) y la sección de no-objetivos ("Cloud storage en v1.12" diferido a FUT-01).

### Modelo de datos (Prisma)
- `backend/src/prisma/schema.prisma` §`ZonaHC` (~1379) — modelo de zona a extender con `indicacionesUrl` y a referenciar desde el historial de consentimiento.
- `backend/src/prisma/schema.prisma` §`CirugiaCatalogo` (~941) — agregar `zonaId String?` → `ZonaHC`.
- `backend/src/prisma/schema.prisma` §`ConfigClinica` (~447) — config per-profesional existente (branding/SMTP/`instruccionesPre`/`web`); referencia de patrón, no necesariamente donde van los nuevos campos (van en `ZonaHC`).

### Patrones reutilizables
- `backend/src/modules/catalogo-hc/` — módulo que gestiona `ZonaHC`/`DiagnosticoHC`/`TratamientoHC` (controller, service, módulo). Patrón de CRUD per-profesional por zona; punto de extensión para consentimiento/indicaciones por zona.
- `backend/src/modules/whatsapp/whatsapp.controller.ts:222` — patrón de uso de `BACKEND_URL` para construir URLs públicas de archivos (fallback a `http://localhost:3001` con warning).
- `backend/src/modules/presupuestos/presupuesto-public.controller.ts` (`@Controller('presupuestos/public')`) — endpoint público existente HOY SIN guard → debe recibir el tier estricto de rate limiting (INFRA-02 menciona explícitamente "el portal de presupuestos existente").
- `backend/src/modules/auth/guards/jwt-auth.guard.ts` + `auth.module.ts` — auth se aplica por-controller con `@UseGuards(JwtAuthGuard)`; NO hay `APP_GUARD` global hoy. Cablear el `ThrottlerGuard` global es nuevo.

### Frontend
- `frontend/src/app/dashboard/configuracion/page.tsx` — página de Configuración con `Tabs`; agregar la nueva tab "Consentimientos".
- `frontend/src/app/dashboard/configuracion/components/GestionCatalogoHC.tsx` — gestión actual de zonas/catálogo HC; referencia de patrón para listar zonas en la nueva tab.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`ZonaHC` (Prisma) + módulo `catalogo-hc`**: la unidad de zona ya existe per-profesional. Se extiende con `indicacionesUrl` y se le cuelga el historial de consentimientos. Evita inventar un modelo nuevo.
- **`@nestjs/throttler` v6.4**: ya instalado en `backend/package.json`, solo falta cablearlo (módulo + `APP_GUARD`).
- **Patrón `BACKEND_URL`** (`whatsapp.controller.ts:222`): reutilizar para construir las URLs públicas `${BACKEND_URL}/uploads/...`.
- **Tabs de Configuración** (`configuracion/page.tsx`): patrón establecido de tabs shadcn; la nueva tab "Consentimientos" sigue el mismo molde.

### Established Patterns
- **CRUD per-profesional por zona** en `catalogo-hc` (filtrado por `profesionalId`, `esSistema`, `activo`, `orden`). El multi-tenant se mantiene por `profesionalId`.
- **Auth por-controller** con `@UseGuards(JwtAuthGuard)` — no hay guard global; el throttler global será el primer `APP_GUARD`.
- **DTOs + Zod/class-validator** y estructura `*.module/*.controller/*.service` de NestJS por módulo.

### Integration Points
- **Upload/StorageService → nuevo módulo** (p.ej. `storage` o dentro de `catalogo-hc`/un módulo de config) que expone `StorageService` reutilizable por consumidores futuros (portal, firma de consentimiento en fase 56).
- **Servido estático/streaming**: punto nuevo (`main.ts` o controller dedicado) — hoy NO hay `ServeStatic`/`useStaticAssets`/multer en el repo. Todo greenfield acá.
- **`CirugiaCatalogo.zonaId`**: nuevo FK que conecta el catálogo de cirugías con `ZonaHC`; lo consumirá el portal en fases 55/56 para resolver consentimiento/indicación del paciente.
- **`presupuestos/public`**: endpoint existente que entra bajo el tier estricto de throttling.

</code_context>

<specifics>
## Specific Ideas

- El usuario describió la granularidad con ejemplos concretos: "todas las cirugías de mamas tienen el mismo consentimiento y el mismo link de indicaciones, y así con cada zona". → zona = `ZonaHC`.
- Reutilizar explícitamente las zonas que ya se usan al cargar una entrada de HC de consulta (donde se agrupan diagnósticos y tratamientos por zona). Es el mismo `ZonaHC`, no uno paralelo.

</specifics>

<deferred>
## Deferred Ideas

- **Migración a cloud storage (S3/Supabase)** — FUT-01. El `StorageService` se diseña cloud-ready pero la implementación queda en disco local.
- **Editor rich-text + versionado con UI del consentimiento** — FUT-05 / Phase 56. En esta fase solo se persiste el historial y se marca el vigente; sin UI de versiones.
- **Visualización/descarga del PDF, firma, estampado y metadata forense** — Phase 56 (CONS-03 a CONS-08).
- **Vínculo paciente → zona en tiempo de portal** (resolver qué consentimiento mostrarle a un paciente concreto) — Phases 55/56. Acá solo dejamos preparado `CirugiaCatalogo.zonaId`.

None adicional — la discusión se mantuvo dentro del scope de la fase.

</deferred>

---

*Phase: 53-storage-upload-consent-config*
*Context gathered: 2026-06-26*
