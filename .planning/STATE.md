---
gsd_state_version: 1.0
milestone: v1.12
milestone_name: Prequirúrgico Estructurado + Portal del Paciente
status: executing
stopped_at: Completed 52-01-PLAN.md
last_updated: "2026-06-26T15:47:38.637Z"
last_activity: 2026-06-26 -- Phase 52 execution started
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 10
  completed_plans: 9
  percent: 17
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-25)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 52 — preop-hc-form-chip-catalogs

## Current Position

Phase: 52 (preop-hc-form-chip-catalogs) — EXECUTING
Plan: 1 of 8
Status: Executing Phase 52
Last activity: 2026-06-26 -- Phase 52 execution started

Progress: [██████████] 100%

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

Last session: 2026-06-26T13:06:54.306Z
Stopped at: Completed 52-01-PLAN.md
Resume file: None
