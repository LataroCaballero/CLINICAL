---
gsd_state_version: 1.0
milestone: v1.9
milestone_name: Plantilla Primera Consulta
status: defining-requirements
last_updated: "2026-06-12"
last_activity: "2026-06-12 — Milestone v1.9 started (questioning complete, defining requirements)"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-12)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Milestone v1.9 Plantilla Primera Consulta — defining requirements

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-06-12 — Milestone v1.9 started

## Decisions

(Full decision log in PROJECT.md Key Decisions table. Cleared on milestone completion.)

## Accumulated Context

### Carry-forward from v1.8
- 4 tipos de turno públicos en DB: "Consulta", "Tratamiento", "Pre-Quirúrgico", "Control" + "Cirugía" (interno, esCirugia=true, oculto vía filtro en findAll)
- TipoEntradaHC enum en HistoriaClinicaEntrada: CONSULTA_CIRUGIA, TRATAMIENTO, CONTROL, SEGUIMIENTO, PREOPERATORIO
- resolverNuevoFlujo helper puro en historia-clinica.flujo.helpers.ts (testeable sin NestJS)
- TratamientosTab dual-source: fuente A (tipoTurno=Tratamiento) OR fuente B (Consulta + tipoEntradaHC=TRATAMIENTO); tipoEntradaHC expuesto en obtenerTurnosPorRango
- crmArchivado Boolean en Paciente; getKanban/getListaAccion filtran crmArchivado=false; PATCH :id/crm-archivo toggle
- Dialog-from-Sheet + onSettled invalidation por key prefix (patrón establecido v1.7, reusado v1.8)
- Quick task 1 (2026-06-12): dropdown "Tipo de consulta" eliminado de HCCreatorForm — tipoEntrada inferido de la plantilla

### Carry-forward from v1.7
- CRM kanban movimiento libre con warnings no bloqueantes (forward-only guard para auto-transiciones)
- etapasProtegidas pattern para PERDIDO: [CONFIRMADO, PROCEDIMIENTO_REALIZADO]
- getKanban ACEPTADO-first para múltiples presupuestos (elimina falsos positivos)
- HCCreatorForm reutilizable compartido entre LiveTurno y PatientDrawer

### Relevant to v1.9
- Plantilla actual: PrimeraConsultaForm.tsx consume frontend/src/lib/zonas-diagnostico.json (hardcodeado) vía zonas-diagnostico.ts
- Zonas actuales en JSON: abdomen, Nariz, Mamas, Otros (diagnósticos); tratamientos en categorías separadas: abdominoplastia, mastoplastia, rinoplastia, lunar_cirugia_local, tratamiento_facial, otros
- addTratamiento ya hace lookup en tratamientosProfesional (catálogo con precios) por nombre — punto de integración existente

### Known Tech Debt (carry-forward)
- LIVHC-05/PAC-01: tratamientos snapshot no se escribe cuando consumirInsumos=false
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend
- CALL-01: botón "Llamar" placeholder en agenda
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
