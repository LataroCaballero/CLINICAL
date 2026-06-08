---
gsd_state_version: 1.0
milestone: v1.8
milestone_name: Tipos de Turno y Flujo Clínico
status: planning
last_updated: "2026-06-08T17:59:43Z"
last_activity: 2026-06-08 — Completed 41-01-PLAN.md (TipoEntradaHC enum + tipoEntrada field + flujo transition logic)
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
  percent: 60
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-08)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 40 — Migración de Tipos de Turno

## Current Position

```
Milestone: v1.8 Tipos de Turno y Flujo Clínico
Phase:     41 — Tipo de Entrada en Historia Clínica (IN PROGRESS — 1/? plans done)
Plan:      01 (completed)
Status:    41-01 complete — backend enum/migration/flujo-logic done; frontend DTO form next (Plan 02)
Progress:  [██████░░░░] 60% (3 plans done across phases 40-41)

Last activity: 2026-06-08 — Completed 41-01-PLAN.md (TipoEntradaHC enum + tipoEntrada field + flujo transition logic)
Next: Phase 41 Plan 02 — Frontend form field + UI integration for tipoEntrada
```

## Decisions

- Phase 40-01: Migration is data-only SQL (no DDL) — manual file created; `esCirugia: false` filter added at service layer (findAll), keeping Cirugía accessible internally via crearTurnoCirugia()
- [Phase 40-migracion-tipos-turno]: Phase 40-02: Idempotent seed uses upsert per nombre; Pre-Quirúrgico orange branch in getEventStyle() inserted before consulta inicial in both dark/light blocks
- [Phase 41-tipo-entrada-hc]: 41-01: resolverNuevoFlujo extracted to historia-clinica.flujo.helpers.ts (no NestJS deps) — Jest config lacks moduleNameMapper for src/ aliases; pure helper file enables direct unit tests. tipoEntrada @IsOptional() in DTO; UI enforces selection. turno.esCirugia pre-fetched outside $transaction (pgBouncer pattern).

## Phase Map

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 40 | Migración de Tipos de Turno | TIPO-01..06 | Complete (2/2 plans done) |
| 41 | Tipo de Entrada en Historia Clínica | HC-01..04 | Not started |
| 42 | Estado Dual y TratamientosTab | DUAL-01..03 | Not started |
| 43 | Archivar del Embudo CRM | ARCH-01..04 | Not started |

## Accumulated Context

### Carry-forward from v1.7
- CRM kanban movimiento libre con warnings no bloqueantes (forward-only guard para auto-transiciones)
- etapasProtegidas pattern para PERDIDO: [CONFIRMADO, PROCEDIMIENTO_REALIZADO]
- STEPPER_CHAIN hardcoded (no derivado de ETAPA_ORDER, incluye PROCEDIMIENTO_REALIZADO)
- getKanban ACEPTADO-first para múltiples presupuestos (elimina falsos positivos)
- Dialog-from-Sheet para modales dentro de kanban (evita z-index/focus-trap)
- HCCreatorForm reutilizable compartido entre LiveTurno y PatientDrawer
- OrdenConsumo PENDIENTE→CONFIRMADA (dos-step, no descuento inmediato)

### v1.8 Key Decisions (pre-execution)
- TipoTurno son registros en DB (no enum Prisma) — la migración es SQL UPDATE/DELETE de registros + reasignación de FK de turnos
- Secuencia de migración Phase 40: (1) crear "Consulta", (2) migrar turnos de "Consulta para cirugía" → "Consulta", (3) migrar turnos de "Consulta pendiente" → "Consulta", (4) eliminar "Consulta pendiente", (5) rename "Consulta para cirugía". Mantiene integridad referencial en todo momento
- "Cirugía" (esCirugia=true) se preserva sin tocar — usado por agenda quirúrgica
- tipoEntrada en HC: nuevo enum/campo en HistoriaClinicaEntrada (no en HistoriaClinica), valores: CONSULTA_CIRUGIA, TRATAMIENTO, CONTROL, SEGUIMIENTO, PREOPERATORIO
- cerrarSesion Phase 41: la lógica PROCEDIMIENTO_REALIZADO para esCirugia=true es independiente del tipoEntrada y no cambia
- cerrarSesion Phase 41: la transición TURNO_AGENDADO → CONSULTADO solo aplica cuando tipoEntrada = CONSULTA_CIRUGIA
- TratamientosTab Phase 42: query dual via OR entre tipoTurno.nombre = "Tratamiento" y existencia de HC entry con tipoEntrada = TRATAMIENTO
- crmArchivado Phase 43: Boolean default false en modelo Paciente; getKanban y getListaAccion agregan WHERE crmArchivado = false

### v1.8 Technical Context
- Tipos actuales en DB (pre-migración): "Consulta para cirugía", "Consulta para tratamiento en consultorio", "Pre-operatorio", "Control", "Consulta pendiente", "Cirugía"
- Tipos objetivo (post-migración Phase 40): "Consulta", "Tratamiento", "Pre-Quirúrgico", "Control", "Cirugía" (interno, no seleccionable)
- TratamientosTab actualmente filtra por tipoTurno.flujoPaciente === "TRATAMIENTO" (frontend-side) — Phase 42 amplía esta lógica
- getKanban filtra: flujo = CIRUGIA OR flujo = null (legacy) — Phase 43 agrega AND crmArchivado = false
- El seed.ts debe actualizarse en Phase 40 para reflejar los 4 tipos públicos + Cirugía

### Known Tech Debt (carry-forward)
- LIVHC-05/PAC-01: tratamientos snapshot no se escribe cuando consumirInsumos=false
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend
- CALL-01: botón "Llamar" placeholder en agenda
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
