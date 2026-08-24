# Phase 61: Backend — Schema, Decoupling e Indicaciones - Context

**Gathered:** 2026-07-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Fase **backend-only** de v1.14. Entrega tres cosas y nada más:

1. **Schema:** campo nuevo `Paciente.indicacionesLeidasAt: DateTime?` (INDIC-03), vía migración patrón pgBouncer.
2. **Decoupling:** `firmarConsentimiento` deja de requerir/leer/escribir cualquier estado de indicaciones (CONS-11).
3. **Derivación CRM:** `computePasosCrm` deriva el paso `indicacionesPreop` del acuse en el perfil del paciente, no del acto de firma (INDIC-04).
4. **Endpoint de acuse:** endpoint portal-scoped que persiste el acuse de lectura de indicaciones en `Paciente.indicacionesLeidasAt`.

**Fuera de esta fase (van a Phase 62 — frontend):** gate open-PDF + checkbox del consentimiento (CONS-09/10), secciones separadas en el portal (CONS-12, INDIC-01/02), indicador staff (INDIC-05), refetch on focus del board (EMBUDO-06). Sin backfill histórico. Sin firma dibujada para indicaciones.

</domain>

<decisions>
## Implementation Decisions

### A. Migración del acople existente
- **D-01:** `ConsentimientoFirmado.indicacionesLeidasAt` pasa de `NOT NULL` a **nullable** (`ALTER COLUMN ... DROP NOT NULL`). NO se dropea la columna: preserva el timestamp forense de los consentimientos ya firmados en v1.12 (valor legal). Los registros nuevos la dejan `NULL`.
- **D-02:** `firmarConsentimiento` (`paciente-portal.service.ts:560`) **deja de escribir** `indicacionesLeidasAt` en el `ConsentimientoFirmado` (quita la línea `indicacionesLeidasAt: new Date()`, ~line 650) y **elimina el guard** que exige `dto.indicacionesLeidas` (~line 606). Cumple SC#1: firmar no lee ni escribe estado de indicaciones.
- **D-03:** Se **quita** el campo `indicacionesLeidas: boolean` del `FirmarConsentimientoPortalDto`. Con el `ValidationPipe({ whitelist: true })` local del portal, un front viejo que aún lo mande no rompe (se strippea silenciosamente). El front se actualiza en Phase 62.

### B. Derivación en computePasosCrm
- **D-04:** El paso `indicacionesPreop` mantiene un **OR con fuentes legacy** para no regresionar pacientes ya firmados en v1.12 (sin backfill):
  ```
  indicacionesPreop = (Paciente.indicacionesLeidasAt != null)
                   || consentimientosFirmados.some(c => c.indicacionesLeidasAt != null)  // legacy v1.12
                   || (indicacionesEnviadas === true)                                     // legacy pre-v1.12
  ```
  Fuente **primaria nueva:** `Paciente.indicacionesLeidasAt`. Las otras dos quedan como fallback de no-regresión.
- **D-05:** `PacientePasosInput` (`crm-steps.helper.ts:28`) agrega el campo `indicacionesLeidasAt` del paciente; el `select` de `getKanban` (`pacientes.service.ts` ~line 673-748) debe incluir `Paciente.indicacionesLeidasAt` y pasarlo a `computePasosCrm`.

### C. Endpoint de acuse de indicaciones
- **D-06:** **Set-once + global por paciente.** El primer acuse fija `Paciente.indicacionesLeidasAt`; reintentos son **idempotentes** (NO sobrescriben el primer timestamp — es el valor legalmente significativo). Un único campo global cubre al paciente, alineado con INDIC-03 (campo único en `Paciente`, no per-zona).
- **D-07:** Endpoint **portal-scoped bajo `PortalJwtGuard`** (paciente identificado por el JWT `scope: 'portal-paciente'`, no por token en path — mismo patrón que `@Patch('salud')`). Sugerido `POST indicaciones/acuse` en `PacientePortalController`, sin body (o body vacío). El planner define el nombre final del route respetando el patrón del controller.

### Folded Todos
- **cr-01-indicaciones-url-validation** (severidad crítica, tag `resolves_phase: 61`): `indicacionesUrl` se persiste sin validación server-side (no hay `ValidationPipe` global; los decoradores del DTO son dead code) → stored-XSS cuando el portal lo renderice como `href` en Phase 62.
  - **Fix (minimal):** validación server-side en `actualizarIndicacionesUrl` (`catalogo-hc.service.ts` ~line 758): `new URL(value)` (reject on throw), permitir sólo protocolos `http:`/`https:` (rechazar `javascript:`/`data:`), enforce `maxLength` 2048, permitir `null` para limpiar. Quitar los comentarios engañosos "@IsUrl validated in DTO — T-53-11" en controller y service.
  - **Encaja en esta fase** porque es backend, toca el mismo dominio (indicaciones) y debe cerrarse antes de que Phase 62 renderice el URL.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos y roadmap del milestone
- `.planning/REQUIREMENTS.md` — CONS-11, INDIC-03, INDIC-04 (scope de Phase 61); Out of Scope (sin backfill, sin firma para indicaciones).
- `.planning/ROADMAP.md` §"Phase 61" — Goal + 4 Success Criteria (fuente de verdad de qué debe ser TRUE).
- `.planning/PROJECT.md` — decisiones D-04 v1.13 (W-1 cierra en Phase 62), patrón migración pgBouncer.

### Todo folded
- `.planning/**/cr-01-indicaciones-url-validation.md` — spec completa del fix stored-XSS (problema, fix minimal, referencias a 53-REVIEW.md / 53-VERIFICATION.md).

### Código a modificar (paths absolutos verificados en scout)
- `backend/src/modules/paciente-portal/paciente-portal.service.ts:560-665` — `firmarConsentimiento` (quitar guard + stop write).
- `backend/src/modules/paciente-portal/dto/firmar-consentimiento-portal.dto.ts:19-28` — quitar `indicacionesLeidas`.
- `backend/src/modules/paciente-portal/paciente-portal.controller.ts` — nuevo endpoint de acuse (patrón `PortalJwtGuard`).
- `backend/src/modules/pacientes/crm-steps.helper.ts:28-113` — `computePasosCrm` + `PacientePasosInput`.
- `backend/src/modules/pacientes/pacientes.service.ts:620-752` — `getKanban` select de `Paciente.indicacionesLeidasAt`.
- `backend/src/prisma/schema.prisma` — `Paciente` (152-236), `ConsentimientoFirmado` (1426-1446).
- `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` (~758) + `catalogo-hc.controller.ts` — fix cr-01.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`PortalJwtGuard` + `PortalJwtStrategy`** (`paciente-portal/guards/`, `strategies/`, strategy name `'portal-jwt'`, scope `portal-paciente`): el endpoint de acuse reusa exactamente este guard. Patrón de referencia: `@Patch('salud')` que resuelve el paciente desde el JWT.
- **`ValidationPipe({ whitelist: true })` local** en los DTOs del portal: hace segura la remoción de `indicacionesLeidas` (los campos extra se strippean). NO hay `ValidationPipe` global — por eso cr-01 requiere validación manual en el service.
- **`computePasosCrm`** ya es helper puro con input tipado y fallbacks legacy — extender su input es low-risk.

### Established Patterns
- **Migración pgBouncer:** `directUrl` (env `DIRECT_URL`) bypassa pgBouncer para schema ops; `PrismaService` fuerza `connection_limit`/`pool_timeout` en `DATABASE_URL`. Migraciones son SQL crudo en `backend/src/prisma/migrations/[timestamp]_[name]/migration.sql`. Patrón del milestone: `prisma diff + db execute + migrate resolve` (nunca `migrate dev`).
- **Forense de consentimiento:** `ConsentimientoFirmado` es registro append-only con hash SHA-256, ip, userAgent, versionNumero — NO tocar los registros existentes; sólo relajar el `NOT NULL` de una columna.

### Integration Points
- `firmarConsentimiento` sigue actualizando `Paciente.consentimientoFirmado`/`consentimientoFirmadoAt` (eso NO cambia — sólo se desacopla la parte de indicaciones).
- `getKanban` es el único consumidor de `computePasosCrm`; el nuevo campo debe entrar en su `select`.

</code_context>

<specifics>
## Specific Ideas

- El timestamp del acuse es el valor legalmente significativo → **set-once**, nunca sobrescribir el primero.
- No dropear columnas forenses: preferir `DROP NOT NULL` sobre `DROP COLUMN` siempre que haya datos legales históricos.

</specifics>

<deferred>
## Deferred Ideas

- **ValidationPipe global en `main.ts`** — mencionado en cr-01 como alternativa más amplia; NO se hace en esta fase (afecta todos los DTOs que hoy dependen de validación manual; cambio deliberado aparte). Se aplica sólo el fix puntual en `actualizarIndicacionesUrl`.
- Todo lo frontend/portal (gate open-PDF, secciones separadas, indicador staff, refetch on focus) → **Phase 62**.

None — la discusión se mantuvo dentro del scope de la fase.

</deferred>

---

*Phase: 61-backend-schema-decoupling-e-indicaciones*
*Context gathered: 2026-07-08*
