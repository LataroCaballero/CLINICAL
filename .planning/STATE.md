---
gsd_state_version: 1.0
milestone: v1.14
milestone_name: Portal — Firma Gated e Indicaciones Separadas
status: executing
stopped_at: Completed 62-03-PLAN.md
last_updated: "2026-07-21T15:37:08.819Z"
last_activity: 2026-07-21
progress:
  total_phases: 2
  completed_phases: 1
  total_plans: 8
  completed_plans: 7
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-06 after v1.14 roadmap)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 62 — portal-staff-frontend-gate-de-firma-secciones-separadas-y-si

## Current Position

Phase: 62 (portal-staff-frontend-gate-de-firma-secciones-separadas-y-si) — EXECUTING
Plan: 3 of 3
Status: Ready to execute
Last activity: 2026-07-21

Progress: [█████████░] 88%

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

### Known Tech Debt (carry-forward)

- **Introducido en v1.13 (advisory):** `crearTurno` degrada etapas avanzadas a `TURNO_AGENDADO` en cualquier turno (intencional); paso 'cirugia' cuenta cirugías CANCELADA/SUSPENDIDA como completas; consentimiento/indicaciones sin invalidación inmediata crm-kanban (se cierra en Phase 62).
- **Pre-existente / carried:** `todo cr-01-indicaciones-url-validation.md` (stored-XSS pre-Phase-54); `quick-task 1-eliminar-dropdown-tipo-de-consulta-de-hc` incompleto.
- HistorialClinicoPanel y TurnoHCModal no migrados a HCEntryContent.tsx (diferido).
- AppointmentDetailModal y CalendarGrid no migrados a getEstadoTurnoChip (diferido).
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend.
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod.
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs.
- **Gate legal pre-go-live (v1.12):** revisión del flujo de consentimiento (Ley 25506 / Ley 26529) antes del primer paciente quirúrgico real.

## Deferred Items

Items diferidos al cierre de v1.13:

| Category | Item | Status |
|----------|------|--------|
| uat_gap | 58-HUMAN-UAT (5 escenarios: orden columnas, indicador naranja, etiquetas contacto, hide todosCompletos) | partial |
| verification_gap | 58-VERIFICATION | human_needed |
| verification_gap | 60 frontend KPI cards display (backend 8/8 + SECURED) | manual pending |
| quick_task | 1-eliminar-dropdown-tipo-de-consulta-de-hc | missing |
| todo | cr-01-indicaciones-url-validation (stored-XSS pre-Phase-54, carried) | pending |

## Session Continuity

Last session: 2026-07-21T15:37:08.816Z
Stopped at: Completed 62-03-PLAN.md
Resume file: None
