---
gsd_state_version: 1.0
milestone: v1.10
milestone_name: Refinamiento Planilla de Tratamientos
status: Phase 48 in progress
last_updated: "2026-06-22T01:36:05.055Z"
last_activity: "2026-06-22 — Plan 48-02 ejecutado (snapshot incondicional, TRAT-03)"
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 2
  completed_plans: 1
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-21)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** v1.10 Refinamiento Planilla de Tratamientos — Phase 48 next

## Current Position

Phase: 48 — Backend — Lectura y Snapshot de Tratamientos (in progress)
Plan: 48-02 completado (snapshot incondicional). 48-01 (read-path por-turno) pendiente de ejecución.
Status: Phase 48 in progress
Last activity: 2026-06-22 — Plan 48-02 ejecutado

```
Progress: [░░░░░░░░░░] 0% — 0/2 phases complete (1/2 plans en Phase 48)
```

## Decisions

(Full decision log in PROJECT.md Key Decisions table. Cleared on milestone completion.)

- 48-02 (TRAT-03): el snapshot de tratamientos (`contenido.tratamientos`) se persiste siempre que haya `tratamientoIds`, independiente de `consumirInsumos`; la `OrdenConsumo` sigue condicionada a `consumirInsumos=true`. Fix LIVHC-05.

## Accumulated Context

### Carry-forward from v1.9
- Catálogo HC en BD: modelos ZonaHC / DiagnosticoHC / TratamientoHC por profesional (profesionalId denormalizado en hijos sin @relation; esSistema protege "Otros"); seed idempotente de 6 zonas; `GET /catalogo-hc` + `PATCH`/`DELETE` (soft-delete) por tipo; FK opcional TratamientoHC→Tratamiento (ON DELETE SET NULL)
- HC primera_vez: JSONB dual-shape — `Array.isArray(contenido.zonas)` distingue v1.9+ (agrupado por zona) de legacy; helper puro `construirContenidoPrimeraVez`; 3 lectores de historial renderizan ambos shapes
- Auto-aprendizaje: motor puro `detectarAprendizaje` + `aprenderDesdeZonas` best-effort post-transacción en crearEntrada; tratamiento aprendido se crea en catálogo del profesional con precio 0
- `zonas-diagnostico.{ts,json}` eliminados — el catálogo en BD es la única fuente
- useCatalogoHC enabled guard via options?.enabled (SECRETARIA/ADMIN delay query hasta tener profesionalId); CATALOGO_HC_QUERY_KEY invalidado por prefijo sin profesionalId

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

### v1.10 Key Context
- Phase 48 touches: `turnos.service.ts` (lines ~493–597, read-path) + `historia-clinica.service.ts` (write-path, fix LIVHC-05)
- Phase 49 touches: `TratamientosTab.tsx` (frontend only — filter predicate + EstadoTurno color map)
- HC content shapes to resolve in Phase 48: (1) `contenido.zonas[].tratamientos` (v1.9 zona-grouped), (2) `contenido.tratamientos` (legacy flat), (3) free text / consultorio treatment
- LIVHC-05 fix: snapshot must be written even when `consumirInsumos=false` (currently only written when true)
- TRAT-04/05 constraint: CIRUGIA patients WITH at least one real treatment stay in planilla (dual-state v1.8 preserved); only those with zero real treatments are excluded
- TRAT-06: current color map uses stale keys PROGRAMADO/REALIZADO — must map all 7 real EstadoTurno values

### Known Tech Debt (carry-forward)
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend
- CALL-01: botón "Llamar" placeholder en agenda
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
