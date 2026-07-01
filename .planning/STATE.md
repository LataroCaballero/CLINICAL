---
gsd_state_version: 1.0
milestone: v1.12
milestone_name: Prequirúrgico Estructurado + Portal del Paciente
status: executing
stopped_at: Completed 55-03 — PortalInfoBasica + SaludChips + PortalSalud
last_updated: "2026-07-01T16:40:10.497Z"
last_activity: 2026-07-01
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 22
  completed_plans: 21
  percent: 67
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-25)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 55 — portal-frontend

## Current Position

Phase: 55 (portal-frontend) — EXECUTING
Plan: 4 of 4
Status: Ready to execute
Last activity: 2026-07-01

Progress: [██████████] 95%

## Performance Metrics

**Velocity:**

- Total plans completed this milestone: 3 (Phase 54: 54-01, 54-02, 54-03)
- Average duration: ~4 min/plan
- Total execution time: ~12 min (54-01 4min + 54-02 5min + 54-03 3min)

*Updated after each plan completion*

## Accumulated Context

### Decisions (v1.12 planning)

- Token portal SHA-256 hasheado (portalToken en BD = 64-char hex, URL lleva el UUID crudo)
- @cantoo/pdf-lib para estampar firma en PDF subido (PDFKit no puede modificar archivos existentes)
- Datos de salud del paciente en staging fields separados; alergias[]/condiciones[] son staff-only
- CHAT-01 + CHAT-02 misma release atómica (cleanup regrow en 24h sin el guard notificada)
- INFRA-02 (ThrottlerModule) wired en Phase 53, antes del primer endpoint público del portal (Phase 54)
- StorageService abstraction para cloud-swap futuro sin tocar consumidores
- Gate legal pre-go-live: revisión del flujo de consentimiento antes del primer paciente quirúrgico real
- [51-02] Migración big-bang aplicada via prisma migrate diff + db execute + migrate resolve --applied por drift de timestamp pre-existente (20260415221758 vs 20260416000000)
- [51-02] CHAT-01 + CHAT-02 desplegados atómicamente — flood eliminado y guard activo en la misma release (SC#3)
- [52-09] D-12 ampliada: portalTokenCifrado persiste raw token AES-256-GCM at-rest; GET portal-link sólo lectura vía obtenerPortalLink; lookups siguen por hash SHA-256 (Gap B cerrado)
- [52-10] useQuery (no mutation) para GET portal-link en mount; queryClient.setQueryData tras generar exitoso; portal-email.service retorna { enviado, codigo? } — solo error.code SMTP (T-52-12)
- [53-01] ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]) como APP_GUARD global (D-07); strict @Throttle (limit 20/min) en ambas rutas públicas (presupuestos/public + uploads) (D-08)
- [53-01] StorageService: uploads/{profesionalId}/{uuid}.pdf en disco; resolvePath con guard traversal BadRequestException; sin delete (D-05/D-10/D-13)
- [53-01] UploadsController: GET /uploads/:profesionalId/:filename público sin @Auth, Content-Disposition: attachment, strict throttle (D-09/D-15)
- [53-02] ConsentimientosModule: magic-byte %PDF- check en buffer (no mimetype del cliente) antes de StorageService.save — non-PDF → 400 y nada persiste (D-14/INFRA-03/T-53-06)
- [53-02] ConsentimientoZonaArchivo: version-roll con vigente=false en row anterior + create new vigente row — historial nunca eliminado (D-05/T-53-09)
- [53-02] PATCH /catalogo-hc/zonas/:id/indicaciones: @IsUrl + @MaxLength(2048) + @ValidateIf(null) para permitir limpieza; ownership guard en service (CONS-02/T-53-11)
- [53-02] Migración aplicada via prisma diff+db execute+resolve (mismo patrón Phase 51 — pgBouncer Supabase bloquea migrate dev con drift)
- [54-01] Columnas brute-force portalIntentosFallidos (Int default 0) + portalBloqueadoHasta (DateTime?) en Paciente; migración 20260630000000_portal_intentos_bloqueo via diff+db execute+resolve (ALTER TABLE aditivo, no migrate dev) (D-01)
- [54-01] Strategy NOMBRADA portal-jwt (PassportStrategy(Strategy,'portal-jwt')) + scope-claim gate (scope=portal-paciente, return null→401) mantiene tokens de staff fuera del portal (D-05/T-54-01); ignoreExpiration:false fuerza re-verify DNI (D-06); valida returns { pacienteId } sin cargar Usuario
- [54-01] DTOs estrechos opcionales (UpdateContactoPortalDto contacto-only / UpdateSaludStagedDto *AutoReportad*-only) como superficie de escritura SC#3/SC#4; whitelist se aplica por-ruta en Plan 03 (NO hay ValidationPipe global)
- [54-02] Lock brute-force por bloque-de-duración (no rolling window): 3 fallos → bloqueo 15 min → 3 intentos nuevos solo tras expirar; counter resetea sólo cuando portalBloqueadoHasta está SET y < now (evita rama 429 muerta) (D-03)
- [54-02] pickPresent(input, allowed[]) confina el data de prisma a una allow-list de claves (defense-in-depth junto al whitelist pipe de Plan 03); getDatos nunca selecciona arrays clínicos curados ni columnas CRM (D-08/D-09)
- [54-03] new ValidationPipe({ whitelist: true }) por-ruta en cada write es el único guard SC#3 de mass-assignment (no hay pipe global); reject-on-extra omitido → campos prohibidos se descartan en silencio (200) (D-12)
- [54-03] PacientePortalModule registra su propio PassportModule + JwtModule.register({ secret: JWT_SECRET }) (AuthModule @Global no exporta JwtService); rutas públicas sin guard + strict @Throttle 20/min, rutas read/write con PortalJwtGuard y pacienteId desde req.user (pitfall 12)
- [55-03] antecedentesAutoReportados serialized as Object.fromEntries(condiciones.map(c=>[c,true])) — keys are condition names, round-trips via Object.keys on pre-fill; matches Record<string,unknown> DTO shape
- [55-03] SaludChips emits string[] (no .join) to match UpdateSaludStagedDto; AlergiasChips analog adapted for portal mobile-first; PortalSalud payload confined to 4 *AutoReportad* keys (D-06, T-55-10)

### Carry-forward from v1.11

- `HCEntryContent.tsx` (`HCEntryChips` + `HCEntryFullContent`): render HC compartido, 2 shapes (v1.9 zonas[] + legacy plano) + texto libre. Disponible para consolidar HistorialClinicoPanel/TurnoHCModal (diferido).
- Convención de chips HC: zona → `Badge secondary capitalize font-semibold`; diagnósticos → `Badge outline`; tratamientos → `Badge bg-blue-50 text-blue-700 border-blue-200`.

### Carry-forward from v1.9

- ZonaHC/DiagnosticoHC/TratamientoHC patrón: esSistema, activo, profesionalId FK, soft-delete, @@unique([nombre, profesionalId]), aprenderDesdeZonas best-effort post-tx. AlergiaCatalogoPro/MedicamentoCatalogoPro siguen este patrón exacto en Phase 51.

### Known Tech Debt (carry-forward)

- HistorialClinicoPanel y TurnoHCModal no migrados a HCEntryContent.tsx (diferido).
- AppointmentDetailModal y CalendarGrid no migrados a getEstadoTurnoChip (diferido).
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend.
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod.
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs.

## Session Continuity

Last session: 2026-07-01T16:45:00.000Z
Stopped at: Completed 55-03 — PortalInfoBasica + SaludChips + PortalSalud
Resume file: None
