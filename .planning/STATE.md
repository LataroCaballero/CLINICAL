---
gsd_state_version: 1.0
milestone: v1.8
milestone_name: Tipos de Turno y Flujo Clínico
status: completed
last_updated: "2026-06-09T02:53:34.800Z"
last_activity: "2026-06-09 — Completed 43-02-PLAN.md (ARCH-04: archivar del embudo confirmed end-to-end)"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 8
  completed_plans: 8
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-09)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Planning next milestone (v1.8 shipped 2026-06-09)

## Current Position

```
Milestone: v1.8 Tipos de Turno y Flujo Clínico — SHIPPED 2026-06-09 (tag v1.8)
Status:    Archived to .planning/milestones/. 17/17 requisitos completados (4 fases, 8 planes).
Progress:  [██████████] 100%

Next: /gsd:new-milestone para iniciar el próximo ciclo
```

## Decisions

(Full decision log in PROJECT.md Key Decisions table. Cleared on milestone completion.)

## Phase Map

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 40 | Migración de Tipos de Turno | TIPO-01..06 | Complete (2/2 plans done) |
| 41 | Tipo de Entrada en Historia Clínica | HC-01..04 | Complete (2/2 plans done) |
| 42 | Estado Dual y TratamientosTab | DUAL-01..03 | Complete (2/2 plans done) |
| 43 | Archivar del Embudo CRM | ARCH-01..04 | Complete (2/2 plans done) |

## Accumulated Context

### Carry-forward from v1.8
- 4 tipos de turno públicos en DB: "Consulta", "Tratamiento", "Pre-Quirúrgico", "Control" + "Cirugía" (interno, esCirugia=true, oculto vía filtro en findAll)
- TipoEntradaHC enum en HistoriaClinicaEntrada: CONSULTA_CIRUGIA, TRATAMIENTO, CONTROL, SEGUIMIENTO, PREOPERATORIO
- resolverNuevoFlujo helper puro en historia-clinica.flujo.helpers.ts (testeable sin NestJS)
- TratamientosTab dual-source: fuente A (tipoTurno=Tratamiento) OR fuente B (Consulta + tipoEntradaHC=TRATAMIENTO); tipoEntradaHC expuesto en obtenerTurnosPorRango
- crmArchivado Boolean en Paciente; getKanban/getListaAccion filtran crmArchivado=false; PATCH :id/crm-archivo toggle
- Dialog-from-Sheet + onSettled invalidation por key prefix (patrón establecido v1.7, reusado v1.8)

### Carry-forward from v1.7
- CRM kanban movimiento libre con warnings no bloqueantes (forward-only guard para auto-transiciones)
- etapasProtegidas pattern para PERDIDO: [CONFIRMADO, PROCEDIMIENTO_REALIZADO]
- getKanban ACEPTADO-first para múltiples presupuestos (elimina falsos positivos)
- HCCreatorForm reutilizable compartido entre LiveTurno y PatientDrawer

### Known Tech Debt (carry-forward)
- LIVHC-05/PAC-01: tratamientos snapshot no se escribe cuando consumirInsumos=false
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend
- CALL-01: botón "Llamar" placeholder en agenda
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
