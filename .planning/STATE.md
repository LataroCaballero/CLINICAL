---
gsd_state_version: 1.0
milestone: v1.10
milestone_name: Refinamiento Planilla de Tratamientos
status: completed
last_updated: "2026-06-22T21:28:08.584Z"
last_activity: 2026-06-22 — Milestone v1.10 archivado (complete-milestone)
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 3
  completed_plans: 3
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-22)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** v1.10 shipped ✅ — planificar próximo milestone (`/gsd:new-milestone`)

## Current Position

Milestone v1.10 Refinamiento Planilla de Tratamientos — SHIPPED 2026-06-22 (tag v1.10)
Status: completo. Sin milestone activo — esperando `/gsd:new-milestone`.

```
Progress: [██████████] 100% — 2/2 phases, 3/3 plans (v1.10 complete)
```

## Decisions

(Full decision log in PROJECT.md Key Decisions table. Cleared on milestone completion.)

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

### Carry-forward from v1.10
- `resumirTratamientosDeContenido` (`historia-clinica.contenido.helpers.ts`): extractor puro de los 3 shapes de HC → `string|null` (resumen-con-conteo: 1 nombre → nombre; N → `first +N-1`; texto libre truncado a 80 chars); usado por `obtenerTurnosPorRango` con `contenido: true` en el select de `entradaHC` (sin N+1)
- `crearEntrada`: snapshot `contenido.tratamientos` escrito siempre que haya `tratamientoIds` (fix LIVHC-05); agregación de insumos + `OrdenConsumo` bajo `if (dto.consumirInsumos)`; findMany fuera de `$transaction` (pgBouncer)
- `getEstadoTurnoChip` (`frontend/src/lib/estadoTurno.ts`): helper puro de los 7 EstadoTurno → `{label, className}`; disponible para migrar `AppointmentDetailModal` y `CalendarGrid` (aún con impl. propia — tech debt diferido)
- Filtro source-B en `TratamientosTab.tsx`: `isFuenteB(t) && t.ultimoTratamiento != null` (client-side, estado dual v1.8 intacto)

### Known Tech Debt (carry-forward)
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend
- CALL-01: botón "Llamar" placeholder en agenda
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
