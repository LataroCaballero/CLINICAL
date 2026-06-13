---
gsd_state_version: 1.0
milestone: v1.9
milestone_name: Plantilla Primera Consulta
status: completed
last_updated: "2026-06-13T02:55:05.511Z"
last_activity: "2026-06-13 — 47-02 complete: Admin UI catalogo HC (GestionCatalogoHC + useCatalogoHCMutations + pestaña Configuracion), ADM-01/02/03 cerrados, human-verify aprobado"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 12
  completed_plans: 12
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-13)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Planning next milestone (v1.9 shipped — `/gsd:new-milestone`)

## Current Position

Milestone: v1.9 Plantilla Primera Consulta — ✅ SHIPPED 2026-06-13
Status: Complete — 4 fases (44–47), 12 planes, 14/14 requisitos. Tag v1.9.
Last activity: 2026-06-13 — milestone v1.9 archivado (ROADMAP + REQUIREMENTS + audit en milestones/)

```
Progress: [██████████] 100% — milestone complete
```

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

### Carry-forward from v1.9
- Catálogo HC en BD: modelos ZonaHC / DiagnosticoHC / TratamientoHC por profesional (profesionalId denormalizado en hijos sin @relation; esSistema protege "Otros"); seed idempotente de 6 zonas; `GET /catalogo-hc` + `PATCH`/`DELETE` (soft-delete) por tipo; FK opcional TratamientoHC→Tratamiento (ON DELETE SET NULL)
- HC primera_vez: JSONB dual-shape — `Array.isArray(contenido.zonas)` distingue v1.9+ (agrupado por zona) de legacy; helper puro `construirContenidoPrimeraVez`; 3 lectores de historial renderizan ambos shapes
- Auto-aprendizaje: motor puro `detectarAprendizaje` + `aprenderDesdeZonas` best-effort post-transacción en crearEntrada; tratamiento aprendido se crea en catálogo del profesional con precio 0
- `zonas-diagnostico.{ts,json}` eliminados — el catálogo en BD es la única fuente
- useCatalogoHC enabled guard via options?.enabled (SECRETARIA/ADMIN delay query hasta tener profesionalId); CATALOGO_HC_QUERY_KEY invalidado por prefijo sin profesionalId

### Known Tech Debt (carry-forward)
- LIVHC-05/PAC-01: tratamientos snapshot no se escribe cuando consumirInsumos=false
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend
- CALL-01: botón "Llamar" placeholder en agenda
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
