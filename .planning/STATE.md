---
gsd_state_version: 1.0
milestone: v1.10
milestone_name: Refinamiento Planilla de Tratamientos
status: completed
last_updated: "2026-06-22T20:41:57Z"
last_activity: 2026-06-22 — Plan 49-01 ejecutado
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 3
  completed_plans: 3
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-21)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** v1.10 Refinamiento Planilla de Tratamientos — Phase 48 next

## Current Position

Phase: 49 — Frontend — Filtro y Color-Coding de Estado (complete)
Plan: 49-01 completado (filtro source-B null + helper getEstadoTurnoChip + header remap).
Status: Phase 49 complete — Milestone v1.10 complete
Last activity: 2026-06-22 — Plan 49-01 ejecutado

```
Progress: [██████████] 100% — 1/1 plans en Phase 49 complete
```

## Decisions

(Full decision log in PROJECT.md Key Decisions table. Cleared on milestone completion.)

- 48-02 (TRAT-03): el snapshot de tratamientos (`contenido.tratamientos`) se persiste siempre que haya `tratamientoIds`, independiente de `consumirInsumos`; la `OrdenConsumo` sigue condicionada a `consumirInsumos=true`. Fix LIVHC-05.
- [Phase 48-01]: resumen-con-conteo: 1 nombre → nombre; N nombres → 'first +N-1' uniforme para los 3 shapes; contenido: true en entradaHC select elimina query N+1 separada
- [Phase 49-01]: getEstadoTurnoChip extraído como helper compartido en @/lib/estadoTurno (no inlineado); AppointmentDetailModal y CalendarGrid no migrados (deferred scope creep); filtro source-B null puramente client-side, sin mutar backend

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
