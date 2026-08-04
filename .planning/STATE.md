---
gsd_state_version: 1.0
milestone: v1.15
milestone_name: Flujo CRM Automático + Correcciones HC
status: verifying
stopped_at: Completed 65-01-PLAN.md
last_updated: "2026-08-04T20:07:49.888Z"
last_activity: 2026-08-04
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 7
  completed_plans: 7
  percent: 75
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-30 after v1.15 roadmap)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 65 — sync-tipo-de-turno-plantilla-hc-backend

## Current Position

Phase: 65 (sync-tipo-de-turno-plantilla-hc-backend) — EXECUTING
Plan: 1 of 1
Status: Phase complete — ready for verification
Last activity: 2026-08-04

Progress: [██████████] 100%

## Accumulated Context

### Decisions

Full decision log en `.planning/PROJECT.md` (Key Decisions). Decisiones de v1.13/v1.14 archivadas en `.planning/milestones/v1.13-ROADMAP.md` / `v1.14-ROADMAP.md`.

**Decisiones relevantes para v1.15 (roadmap):**

- Fases derivadas por cohesión backend/frontend: Phase 63 (embudo CRM backend) → Phase 64 (indicadores + planilla frontend, depende de 63) → Phase 65 (sync tipo turno↔HC backend, independiente) → Phase 66 (correcciones UI de HC frontend, independiente)
- EMBUDO-09 reutiliza el patrón v1.13 de "ocultar del board" (flujo=TRATAMIENTO) — no se agrega columna/etapa nueva
- No se toca el enum `EtapaCRM` ni se hace backfill de pacientes existentes sin etapa (solo aplica hacia adelante)
- HCSYNC-01/02/03 y HCUI-01/02 son trabajo net-new sin dependencia entre sí ni con el embudo CRM
- [Phase 63-01]: flujo=null en create() en vez de ampliar filtro de getKanban (D-03 opción 1) — evita exponer históricos PENDIENTE en el board
- [Phase 63-03]: resolverTipoEntrada fuerza tipoEntrada server-side desde dto.tipo (D-08); resolverNuevoFlujo branch TRATAMIENTO cubre flujoActual=null además de PENDIENTE (D-09); crearEntrada limpia etapaCRM=null al mover a TRATAMIENTO (D-10, espejo de updateFlujo)
- [Phase 63-02]: D-04/D-05/D-06/D-07 aplicados sin desviaciones — crearTurnoCirugia confirma sin presupuesto, crearTurno guarda etapas avanzadas salvo Consulta, cancelarTurno mantiene CONFIRMADO+CALIENTE, getListaAccion expone requiereRecontacto derivado
- [Phase 65]: resolverTipoTurnoSync usa un rank map (Record<string,number>) en vez de if/else chain para D-01 no-downgrade + D-03 unmapped=0
- [Phase 65]: turnoCtx pre-fetch extendido (tipoTurnoId + tipoTurno.nombre) en vez de segundo query dentro de la tx, patrón pgBouncer consistente

### Known Tech Debt (carry-forward)

- **Introducido en v1.13 (advisory):** `crearTurno` degrada etapas avanzadas a `TURNO_AGENDADO` en cualquier turno (intencional); paso 'cirugia' cuenta cirugías CANCELADA/SUSPENDIDA como completas.
- **Pre-existente / carried:** `quick-task 1-eliminar-dropdown-tipo-de-consulta-de-hc` incompleto.
- HistorialClinicoPanel y TurnoHCModal no migrados a HCEntryContent.tsx (diferido; HCUI-02 solo agrega el branch pre_quirúrgico faltante, no migra el componente).
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

## Session Continuity

Last session: 2026-08-04T20:07:49.885Z
Stopped at: Completed 65-01-PLAN.md
Resume file: None

## Operator Next Steps

- Phase 63 complete (EMBUDO-07/08/09). Proceed to Phase 64 (portal staff frontend, depends on 63) or run phase verification.
