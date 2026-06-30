---
gsd_state_version: 1.0
milestone: v1.12
milestone_name: Prequirúrgico Estructurado + Portal del Paciente
status: planning
stopped_at: Phase 54 context gathered
last_updated: "2026-06-30T16:15:05.419Z"
last_activity: 2026-06-30
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 15
  completed_plans: 15
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-25)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 54 — portal backend + token security

## Current Position

Phase: 54
Plan: Not started
Status: Ready to plan
Last activity: 2026-06-30

Progress: [█████████░] 93%

## Performance Metrics

**Velocity:**

- Total plans completed this milestone: 0
- Average duration: —
- Total execution time: —

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

Last session: 2026-06-30T16:15:05.416Z
Stopped at: Phase 54 context gathered
Resume file: .planning/phases/54-portal-backend-token-security/54-CONTEXT.md
