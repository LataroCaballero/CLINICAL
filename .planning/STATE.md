---
gsd_state_version: 1.0
milestone: v1.11
milestone_name: HC Completa en Ficha de Paciente
status: completed
stopped_at: Completed 50-01-PLAN.md — milestone v1.11 fully delivered
last_updated: "2026-06-24T15:39:19.809Z"
last_activity: 2026-06-24 — Phase 50 Plan 01 delivered; HC chips visual parity achieved in PatientSheet
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 1
  completed_plans: 1
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-24)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** v1.11 HC Completa en Ficha de Paciente — COMPLETE (Phase 50, Plan 01 delivered)

## Current Position

Phase: 50 of 50 (HC Completa en PatientSheet) — COMPLETE
Plan: 01 of 01 — COMPLETE (visual verification approved)
Status: Milestone v1.11 complete
Last activity: 2026-06-24 — Phase 50 Plan 01 delivered; HC chips visual parity achieved in PatientSheet

```
Progress: [██████████] 100% — milestone v1.11 COMPLETE
```

## Decisions

(Full decision log in PROJECT.md Key Decisions table. Cleared on milestone completion.)
- [Phase 50]: Shared HCEntryContent.tsx component created: HCEntryChips (card) + HCEntryFullContent (detail) handle both v1.9 zonas[] and legacy shapes with color badge chips
- [Phase 50]: line-clamp-3 moved to TemplateEntryPreview-only so chip badges wrap fully in card preview
- [Phase 50-hc-completa-en-patientsheet]: Shared HCEntryContent.tsx component completed: HCEntryChips (card) + HCEntryFullContent (detail) handle both v1.9 zonas[] and legacy shapes with color badge chips — visual verification approved

## Accumulated Context

### v1.11 scope (Phase 50)
- Milestone pequeño, solo frontend: port de renderizado, sin cambios de backend ni de data fetching. El `contenido` JSONB completo ya llega a PatientSheet vía `useHistoriaClinica`.
- Lógica de chips PROBADA y existente en 2 componentes a reutilizar como referencia: `frontend/src/components/live-turno/tabs/hc/HistorialClinicoPanel.tsx` (~L87-143) y `frontend/src/app/dashboard/components/TurnoHCModal.tsx` (~L369-429). Ambos renderizan zona/diagnósticos/tratamientos como badges de color y manejan 2 shapes (`contenido.zonas[]` v1.9 agrupado y `contenido.tratamientos` legacy plano).
- Target a corregir: `frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx` — `EntryCard`/`FreeEntryPreview` (tarjetas de lista) y `FreeEntryFullContent` (detalle expandido) hoy muestran solo resúmenes truncados en texto plano.
- Plan (HCSHEET-01 → 02 → 03): extraer un componente de render compartido desde la lógica probada → cablearlo en las tarjetas de lista → cablearlo en el detalle expandido con paridad visual.
- Out of scope: migrar `HistorialClinicoPanel`/`TurnoHCModal` al componente compartido (queda disponible para esa consolidación futura); backend; edición de HC desde PatientSheet.

### Carry-forward from v1.10
- `resumirTratamientosDeContenido` (`historia-clinica.contenido.helpers.ts`): extractor puro de los 3 shapes de HC → `string|null` (resumen-con-conteo). Referencia útil del normalizado de shapes.
- `getEstadoTurnoChip` (`frontend/src/lib/estadoTurno.ts`): helper puro de los 7 EstadoTurno → `{label, className}` (patrón de helper de chips compartido — modelo a seguir para el nuevo componente de render HC).

### Carry-forward from v1.9
- Catálogo HC en BD: modelos ZonaHC / DiagnosticoHC / TratamientoHC por profesional; HC primera_vez con JSONB dual-shape (`Array.isArray(contenido.zonas)` distingue v1.9+ agrupado de legacy plano).
- Helper puro `construirContenidoPrimeraVez`; 3 lectores de historial ya renderizan ambos shapes (los 2 de referencia + el target a corregir).

### Carry-forward from v1.8
- TipoEntradaHC enum en HistoriaClinicaEntrada: CONSULTA_CIRUGIA, TRATAMIENTO, CONTROL, SEGUIMIENTO, PREOPERATORIO.
- HCCreatorForm reutilizable compartido entre LiveTurno y PatientDrawer (patrón de componente HC compartido ya establecido).

### Known Tech Debt (carry-forward)
- AppointmentDetailModal y CalendarGrid no migrados a `getEstadoTurnoChip` (diferido).
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend.
- CALL-01: botón "Llamar" placeholder en agenda.
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod.
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs.

## Session Continuity

Last session: 2026-06-24T15:36:02.267Z
Stopped at: Completed 50-01-PLAN.md — milestone v1.11 fully delivered
Resume file: None
