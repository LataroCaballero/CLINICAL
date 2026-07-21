---
gsd_state_version: 1.0
milestone: v1.14
milestone_name: Portal — Firma Gated e Indicaciones Separadas
status: Awaiting next milestone
stopped_at: Completed 62-02-PLAN.md
last_updated: "2026-07-21T16:51:16.815Z"
last_activity: 2026-07-21 — Milestone v1.14 completed and archived
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 8
  completed_plans: 8
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-06 after v1.14 roadmap)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Milestone complete

## Current Position

Phase: Milestone v1.14 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-07-21 — Milestone v1.14 completed and archived

## Accumulated Context

### Decisions

Full decision log en `.planning/PROJECT.md` (Key Decisions). Decisiones de v1.13 archivadas en `.planning/milestones/v1.13-ROADMAP.md`.

**Decisions relevantes para v1.14:**

- D-04 (v1.13): consentimiento/indicaciones sin invalidación inmediata de crm-kanban — W-1 cierra en Phase 62 de v1.14 vía refetch on focus
- Indicaciones sólo requieren acuse de lectura (no firma dibujada): campo `indicacionesLeidasAt` en `Paciente`, endpoint portal-scoped
- Gate open-PDF es client-side (no server-side): la prueba legal es firma + checkbox CONS-10
- Migración de schema: patrón pgBouncer (`prisma diff + db execute + migrate resolve`), nunca `migrate dev`
- [Phase 61]: D-01 aplicado via DROP NOT NULL (no DROP COLUMN) — preserva timestamps forenses v1.12 de ConsentimientoFirmado
- [Phase 61]: cr-01 cerrado sin validacion net-new — actualizarIndicacionesUrl ya tenia la validacion server-side completa; solo se corrigio el docstring enganoso
- [Phase 61]: firmarConsentimiento desacoplado de indicaciones (D-02/D-03) + nuevo endpoint set-once POST indicaciones/acuse (D-06/D-07)
- [Phase 61]: D-04 aplicado exacto en computePasosCrm Paso 5: OR de 3 fuentes (Paciente.indicacionesLeidasAt primaria v1.14, ConsentimientoFirmado.indicacionesLeidasAt fallback v1.12, Paciente.indicacionesEnviadas fallback pre-v1.12) sin backfill, sin regresion
- [Phase 62]: Gate open-PDF + checkbox 100% client-side por diseño legal (D-00): sin tracking server-side de apertura del PDF
- [Phase 62]: safeIndicacionesUrl y bloque de indicaciones removidos de PortalConsentimiento.tsx sin reemplazo local; Plan 02 recrea el guard XSS-safe en PortalIndicaciones.tsx
- [Phase 62]: 62-03: staleTime bajado a 0 (extremo D-10) para board CRM; indicacionesLeidasAt display-only threaded end-to-end sin tocar computePasosCrm
- [Phase 62]: 62-02: acuse de indicaciones disparado en cada click del link (backend idempotente/set-once); guard XSS ^https?:// recreado localmente en PortalIndicaciones.tsx

### Known Tech Debt (carry-forward)

- **Introducido en v1.13 (advisory):** `crearTurno` degrada etapas avanzadas a `TURNO_AGENDADO` en cualquier turno (intencional); paso 'cirugia' cuenta cirugías CANCELADA/SUSPENDIDA como completas. (W-1 invalidación crm-kanban CERRADA en Phase 62 vía refetch on focus.)
- **Pre-existente / carried:** `quick-task 1-eliminar-dropdown-tipo-de-consulta-de-hc` incompleto. (`todo cr-01-indicaciones-url-validation` CERRADO en Phase 61.)
- HistorialClinicoPanel y TurnoHCModal no migrados a HCEntryContent.tsx (diferido).
- AppointmentDetailModal y CalendarGrid no migrados a getEstadoTurnoChip (diferido).
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend.
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod.
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs.
- **Gate legal pre-go-live (v1.12):** revisión del flujo de consentimiento (Ley 25506 / Ley 26529) antes del primer paciente quirúrgico real.

## Deferred Items

Items acknowledged y diferidos al cierre de v1.14 (2026-07-21):

| Category | Item | Status |
|----------|------|--------|
| uat_gap | 62-HUMAN-UAT (5 escenarios de portal: gate de firma open-PDF+checkbox, sección indicaciones separada, acuse automático, indicador staff, board sync on focus) | partial |
| verification_gap | 62-VERIFICATION | human_needed |
| quick_task | 1-eliminar-dropdown-tipo-de-consulta-de-hc | missing |

> cr-01-indicaciones-url-validation se cerró en Phase 61 (la validación server-side ya existía; se corrigió el docstring). W-1 (invalidación crm-kanban) se cerró en Phase 62 vía refetch on window focus.

## Session Continuity

Last session: 2026-07-21T15:43:29.823Z
Stopped at: Completed 62-02-PLAN.md
Resume file: None

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
