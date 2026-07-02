# Phase 56: Signed Consent + Chat Badge - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

La **firma real del consentimiento en el portal del paciente + el archivado forense legal + los badges de estado** para staff. Cierra el milestone v1.12. Entrega:

- **Ver/descargar el PDF de consentimiento** subido por el médico, desde el paso "Consentimiento" del portal (CONS-03). Hoy ese paso es un placeholder (`portal/[token]/page.tsx`, sección `il`, icono `FileSignature`, texto "Próximamente vas a poder firmar…").
- **Firma dibujada en canvas** (CONS-04) usando `signature_pad` (ya instalado en frontend), con fallback si el dispositivo no lo soporta.
- **Estampado de la firma sobre el PDF original** → PDF firmado archivado como artefacto legal separado del template (CONS-05).
- **Metadata forense de auditoría** (CONS-06): fecha/hora servidor (UTC), IP, userAgent, versión del consentimiento y hash SHA-256 del PDF firmado — los 5 campos presentes en el registro.
- **Check "informado de indicaciones"** (CONS-07): el paciente confirma haber leído las indicaciones (link por zona a la web del médico, `ZonaHC.indicacionesUrl` de F53), registrado con timestamp.
- **Flag + fecha de consentimiento firmado** visible para el profesional (CONS-08): `Paciente.consentimientoFirmado` + `consentimientoFirmadoAt` ya existen en schema; falta el badge en la ficha del staff.
- **Badge de origen en el chat interno** (CHAT-03): distinguir visualmente mensajes del paciente (vía portal, `origenPaciente = true`) vs. staff vs. sistema, con badge teal + icono distinto "Paciente".

**Fuera de scope (otras fases / futuro):**
- Generación/rotación del token, hash del token, lock 429, JWT portal → ya hecho en F52/F54.
- Endpoint `POST /consulta` + toda la shell navegable del portal, DNI-gate, paso Salud/Datos → ya hecho en F55.
- Config/upload del PDF template de consentimiento por zona + `indicacionesUrl` por zona → ya hecho en F53.
- **Re-firma cuando el médico sube una versión nueva del consentimiento** → NO en esta fase (D-08). El artefacto es inmutable; una zona ya firmada se muestra como "firmada".
- Migración a cloud storage → FUT-01. Editor rich-text / UI de versionado del consentimiento → FUT-05.
- Desbloqueo manual del 429, consultas two-way en el portal → deferidos en fases previas.

</domain>

<decisions>
## Implementation Decisions

### Estampado del PDF firmado (CONS-05)
- **D-01:** **Firma superpuesta sobre la última página del PDF original** (como firmar al pie del documento real), no una página anexa. El PDF firmado es un artefacto **separado** del template (el original nunca se altera; se genera un nuevo archivo).
  - *Nota técnica para research/planner:* el backend hoy usa **`pdfkit`** (`presupuesto-pdf.service.ts`, `factura-pdf.service.ts`), que genera PDFs desde cero y **NO** puede cargar/estampar sobre un PDF existente. Estampar sobre el PDF subido requiere una librería que cargue+modifique PDFs (p.ej. `pdf-lib`). Elección de librería = research/planner; el enfoque visual (firma sobre la última página) está decidido.
- **D-02:** **Recuadro/pie forense VISIBLE en la misma página de la firma** con fecha/hora (UTC), IP, userAgent y versión del consentimiento — el PDF firmado es auto-contenido como prueba legal. **Además** los 5 campos se guardan en el registro de auditoría en BD (CONS-06).
  - *Restricción de diseño (crítica):* el **hash SHA-256 es del PDF firmado FINAL**, por lo que **NO puede imprimirse dentro del propio PDF** (sería circular). El recuadro visible imprime fecha/IP/userAgent/versión; el hash se calcula sobre el PDF ya generado y se persiste **solo en BD**.

### Versión del consentimiento (parte de CONS-06)
- **D-03:** **Número de versión incremental por zona.** Agregar `version Int` a `ConsentimientoZonaArchivo` (v1, v2, v3… por zona/profesional). Requiere migración + backfill de los archivos existentes (asignar versión por `uploadedAt`). El registro forense guarda ese número como "versión del consentimiento".

### Registro forense: modelo y cardinalidad
- **D-04:** **Modelo dedicado nuevo** (sugerido `ConsentimientoFirmado`). Campos mínimos: `pacienteId`, `zonaId`, `consentimientoZonaArchivoId` (referencia a la versión firmada), `pdfFirmadoPath`, `ip`, `userAgent`, `versionNumero`, `hashSha256`, `firmadoAt` (UTC), `indicacionesLeidasAt`. Elegido sobre reusar `Archivo` + campos en `Paciente` (que mezclaría auditoría forense con el registro genérico de archivos y no escala a múltiples firmas).
- **D-05:** **Cardinalidad: uno por zona/cirugía, varios por paciente.** Un paciente que se opera de múltiples zonas (mamas + abdomen) firma un consentimiento por zona; cada firma es su propio registro vinculado a la zona. Historial completo de lo firmado.
- **D-06:** **Artefacto inmutable.** El PDF firmado y su registro forense **nunca se editan ni se borran** (respaldo legal).
- **D-07:** **`Paciente.consentimientoFirmado` / `consentimientoFirmadoAt`** (ya en schema) se usan como flag+fecha agregados para CONS-08. Setearlos al firmar (criterio de "al menos una zona firmada", a afinar por el planner — el detalle por-zona vive en `ConsentimientoFirmado`).
- **D-08:** **Sin re-firma en esta fase.** Si el médico sube una versión nueva de la zona, una zona ya firmada se muestra en el portal como "firmada" y NO se ofrece volver a firmar. La re-firma (nuevo registro sobre versión nueva) queda para otra fase. La inmutabilidad del historial se mantiene.

### Resolución: qué consentimiento(s) firma el paciente (CONS-03/05)
- **D-09:** **Listar TODAS las zonas con cirugía pendiente.** Si el paciente tiene varias cirugías/zonas pendientes, el portal las lista todas y pide firmar cada una. Cadena de resolución: cirugía(s) pendiente(s) → `CirugiaCatalogo.zonaId` → `ConsentimientoZonaArchivo` **vigente** de esa zona.
- **D-10:** **Estados vacíos con mensaje claro por caso, sin ofrecer el canvas.** Si no hay cirugía pendiente / la cirugía no tiene zona / la zona no tiene PDF vigente: mostrar un mensaje humano en tuteo (p.ej. "Todavía no hay un consentimiento disponible para firmar; tu médico lo va a cargar") y **no** habilitar la firma. Solo se firma lo que tiene PDF vigente resuelto.

### Check "informado de indicaciones" (CONS-07)
- **D-11:** **Obligatorio antes de firmar.** El paciente debe tildar "leí las indicaciones" para habilitar el botón de confirmar firma — la declaración de informado queda unida al acto de firma (más sólido legalmente).
- **D-12:** **`indicacionesLeidasAt` (timestamp) en el registro `ConsentimientoFirmado`.** Si la zona **no** tiene `indicacionesUrl` cargada, se muestra igual un check genérico "confirmo que fui informado" (sin link) y se registra el timestamp — el gating obligatorio se mantiene en ambos casos.

### Chat badge (CHAT-03)
- **D-13:** **Fijado por SC#4:** badge visual "Paciente" con **icono distinto + color teal** para mensajes con `MensajeInterno.origenPaciente = true`, distinguible de staff y de las notificaciones del sistema (que ya usan icono `Bot` centrado, ver `MessageBubble.tsx`). Backend: exponer `origenPaciente` en el mapeo del DTO de `mensajes-internos` (`mensajes-internos.service.ts` ~línea 138, junto a `esPropio`/`esSistema`). Frontend: renderizar la rama "paciente" en `MessageBubble.tsx`. Ícono concreto (p.ej. `User`/`UserRound`) y tono exacto de teal = discreción de Claude, respetando teal.

### Claude's Discretion
- Librería concreta para cargar/estampar el PDF existente (`pdf-lib` u otra) y mecánica del render de la firma PNG → PDF — research/planner.
- Layout/posición exacta del recuadro forense y de la firma en la última página (respetando D-01/D-02).
- Nombre final del modelo forense y de sus campos/índices (base sugerida en D-04).
- Criterio exacto para setear el flag agregado `Paciente.consentimientoFirmado` (¿primera zona firmada? ¿todas las pendientes?) — sugerido: true en cuanto exista ≥1 `ConsentimientoFirmado` para el paciente.
- Fallback de `signature_pad` si el dispositivo no soporta canvas/pointer events (CONS-04 pide fallback).
- Ícono y tono exacto del badge "Paciente" del chat (teal locked).
- Estrategia de backfill del `version Int` incremental en `ConsentimientoZonaArchivo`.

### Folded Todos
Ninguno — CR-01 fue revisado pero NO foldeado (ver Reviewed Todos abajo).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope y requisitos de la fase
- `.planning/ROADMAP.md` §"Phase 56: Signed Consent + Chat Badge" — Goal, Depends on (Phases 53, 54, 55), Requirements (CONS-03..08, CHAT-03), Success Criteria 1–4 (paso 3 del wizard = ver/descargar PDF; firma en canvas → PDF firmado con los 5 campos forenses; badge "Consentimiento firmado" en la ficha; badge teal "Paciente" en el chat).
- `.planning/REQUIREMENTS.md` — CONS-03 (ver/descargar PDF), CONS-04 (firma en signature pad + fallback), CONS-05 (estampado → PDF firmado archivado, separado del template), CONS-06 (metadata forense: fecha/hora, IP, userAgent, versión, hash), CONS-07 (check informado de indicaciones vía link), CONS-08 (flag+fecha visible al profesional), CHAT-03 (distinguir origen paciente/staff/sistema). Tabla de cobertura líneas ~115-121.

### Contexto de fases previas (decisiones que F56 hereda)
- `.planning/phases/53-storage-upload-consent-config/53-CONTEXT.md` — `StorageService` (`save(buffer, filename) → relativePath`, cloud-ready, sin `delete`), servido público por URL-UUID inadivinable con `Content-Disposition: attachment` vía `${BACKEND_URL}/uploads/...`, layout multi-tenant `uploads/{profesionalId}/...`, `ConsentimientoZonaArchivo` (PDF template por zona, `vigente`), `ZonaHC.indicacionesUrl`, `CirugiaCatalogo.zonaId` (puente cirugía→zona). D-05 (conservar historial), D-09/D-10 (servido).
- `.planning/phases/54-portal-backend-token-security/54-CONTEXT.md` — módulo `paciente-portal`, `PortalJwtGuard` (JWT de portal corto scopeado a `pacienteId`), DTOs narrow (`whitelist: true`, campos prohibidos ignorados), scope siempre por contexto autenticado nunca por body (pitfall 12). **El endpoint de firma debe ir bajo `PortalJwtGuard`; el `pacienteId` sale del JWT, nunca del body.**
- `.planning/phases/55-portal-frontend/55-CONTEXT.md` — shell navegable del portal (`portal/[token]/page.tsx`), DNI-gate, secciones libres (Info/Salud/Consentimiento[placeholder]/Consultas), diseño shadcn/Tailwind mobile-first + tuteo ≥16px (D-12), `POST /consulta` (patrón de endpoint de portal a imitar para el de firma).
- `.planning/STATE.md` §"Accumulated Context" — decisiones vivas del milestone v1.12 (gate legal pre-go-live, separación staff-vs-paciente, throttler global).

### Pitfalls del milestone
- `.planning/research/PITFALLS.md` — pitfall 12 (scope por contexto autenticado, no por body) y pitfall 1 (token hasheado) aplican al endpoint de firma.

### Código a tocar / reusar (rutas completas)
- `backend/src/prisma/schema.prisma` — `Paciente.consentimientoFirmado` (~172) + `consentimientoFirmadoAt` (~216) ya existen; `ConsentimientoZonaArchivo` (~1404) a extender con `version Int` (D-03); relación `Archivo` "PacienteConsentimientos" (~358) existe pero NO se usa para el forense (D-04). **Agregar modelo `ConsentimientoFirmado` (D-04) + migración.**
- `backend/src/modules/consentimientos/consentimientos.service.ts` — ya tiene `uploadConsentimiento` (magic-byte validation) + `getZonasConConsentimiento`. Punto de extensión para la firma/estampado, o nuevo submódulo. Usa `StorageService`.
- `backend/src/modules/paciente-portal/paciente-portal.controller.ts` + `guards/PortalJwtGuard` — agregar el endpoint de firma (GET PDF a firmar / POST firma) bajo el guard de portal, reusando el patrón de `POST /consulta` de F55.
- `backend/src/modules/mensajes-internos/mensajes-internos.service.ts` (~línea 138, `esPropio`/`esSistema`) — agregar `origenPaciente` al mapeo del DTO (CHAT-03).
- `backend/src/modules/presupuestos/presupuesto-pdf.service.ts` — referencia de cómo se generan PDFs hoy (pdfkit); confirma que **no** hay librería de estampado sobre PDF existente en el repo (greenfield para pdf-lib o similar).
- `backend/src/modules/whatsapp/whatsapp.controller.ts:222` — patrón `BACKEND_URL` para construir la URL pública del PDF firmado.
- `frontend/src/app/portal/[token]/page.tsx` — placeholder del paso "Consentimiento" (sección `il`) a reemplazar por ver/descargar PDF + canvas + check indicaciones.
- `frontend/package.json` — `signature_pad` ^5.1.1 ya instalado (CONS-04).
- `frontend/src/components/mensajes/MessageBubble.tsx` — ya renderiza `esSistema` (Bot, centrado) y `esPropio`; agregar la rama badge "Paciente" (teal + icono) para `origenPaciente` (CHAT-03).
- Ficha del profesional (staff): `frontend/src/components/patient/PatientDrawer/` — donde va el badge "Consentimiento firmado" + fecha (CONS-08). Confirmar el componente exacto en planning (PatientDrawer/PacienteDetails).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`signature_pad` ^5.1.1** (frontend): librería del canvas de firma ya instalada — CONS-04.
- **`StorageService`** (F53): `save(buffer, filename) → relativePath`, cloud-ready, guarda por UUID en `uploads/{profesionalId}/`; reusar para archivar el PDF firmado.
- **`ConsentimientoZonaArchivo`** (F53): PDF template por zona con `vigente`; extender con `version Int` (D-03).
- **`Paciente.consentimientoFirmado` + `consentimientoFirmadoAt`**: flag+fecha ya en schema para CONS-08.
- **`paciente-portal` + `PortalJwtGuard`** (F54/F55): superficie de portal autenticada por JWT de portal; patrón de `POST /consulta` para el endpoint de firma.
- **`MessageBubble.tsx`**: ya maneja sistema/propio; agregar rama "paciente".
- **Patrón `BACKEND_URL`** (`whatsapp.controller.ts:222`): URL pública del PDF firmado servido con `Content-Disposition: attachment`.

### Established Patterns
- PDFs generados con **pdfkit desde cero** (no estampado sobre PDF existente) → estampar el template requiere librería nueva (pdf-lib u otra).
- Endpoints de portal bajo `PortalJwtGuard`, `pacienteId` derivado del JWT (nunca del body); DTOs narrow `whitelist: true`.
- Servido de archivos por URL-UUID inadivinable + `attachment`, sin auth (para que el paciente sin login descargue el PDF).
- Multi-tenant por `profesionalId` en storage y catálogos.

### Integration Points
- **Nuevo modelo `ConsentimientoFirmado` + migración** (forense) y **`version Int` en `ConsentimientoZonaArchivo`** + backfill.
- **Nuevo endpoint(s) de firma** en `paciente-portal` (o `consentimientos`): resolver zonas pendientes → servir PDF a firmar → recibir firma (PNG base64) + check indicaciones → estampar → archivar → crear registro forense → setear flag en `Paciente`.
- **Estampado PDF**: cargar el template vigente, superponer firma en última página + recuadro forense (D-01/D-02), calcular SHA-256 del resultado, guardar vía `StorageService`.
- **`origenPaciente` en el DTO de `mensajes-internos`** + rama de render en `MessageBubble.tsx` (CHAT-03).
- **Badge "Consentimiento firmado"** en la ficha del staff (PatientDrawer) leyendo `Paciente.consentimientoFirmado`/`consentimientoFirmadoAt`.
- **Reemplazo del placeholder** del paso Consentimiento en `portal/[token]/page.tsx` por el flujo real (ver/descargar + canvas + check + confirmar).

</code_context>

<specifics>
## Specific Ideas

- **Prueba legal auto-contenida:** el usuario quiere la firma estampada sobre la última página del documento real (no una hoja anexa) y la metadata forense visible impresa en el PDF, además de en la BD — para que el PDF por sí solo sirva como constancia.
- **Historial completo, nada se pisa:** un registro forense inmutable por zona/cirugía; un paciente multi-zona firma varios; nunca se sobrescribe.
- **Informado unido a la firma:** el check de indicaciones es obligatorio antes de habilitar la firma; queda registrado con timestamp en el mismo acto.
- **Badge teal "Paciente"** para que las consultas reales del paciente no se pierdan entre el ruido del sistema en el chat.

</specifics>

<deferred>
## Deferred Ideas

- **Re-firma sobre versión nueva del consentimiento** (nuevo registro cuando el médico sube una versión posterior) — NO en F56 (D-08); posible fase futura. La inmutabilidad del historial ya queda garantizada.
- **UI de versionado del consentimiento** (ver/gestionar versiones desde la app) — FUT-05.
- **Migración a cloud storage del PDF firmado** — FUT-01 (el `StorageService` ya es cloud-ready).

### Reviewed Todos (not folded)
- **`cr-01-indicaciones-url-validation.md`** (severity: critical, stored-XSS) — validación server-side de `ZonaHC.indicacionesUrl` contra `javascript:`/`data:` URIs (no hay `ValidationPipe` global; los decorators `@IsUrl` son dead code). **Se vuelve blocker REAL en F56** porque el check de indicaciones (CONS-07/D-11) es el primer lugar donde `indicacionesUrl` se renderiza como link hacia el paciente. **Decisión del usuario: NO foldear** (mantener como blocker separado). **Nota mandatoria para el planner de F56:** tratar `indicacionesUrl` como **URL no confiable** al renderizar el link del paso indicaciones — nunca inyectar como HTML; validar protocolo (solo http/https) en el punto de render y/o resolver CR-01 antes de exponer el link. Fix mínimo en `catalogo-hc.service.ts` `actualizarIndicacionesUrl` (parse `new URL`, allow http/https, maxLength 2048, permitir null). Refs: `.planning/phases/53-storage-upload-consent-config/53-REVIEW.md` §CR-01.

</deferred>

---

*Phase: 56-signed-consent-chat-badge*
*Context gathered: 2026-07-01*
