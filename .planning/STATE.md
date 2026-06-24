---
gsd_state_version: 1.0
milestone: v1.11
milestone_name: HC Completa en Ficha de Paciente
status: ready_to_plan
last_updated: "2026-06-24T00:00:00.000Z"
last_activity: 2026-06-24 — Roadmap v1.11 creado (Phase 50, 3/3 requisitos mapeados)
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-24)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** v1.11 HC Completa en Ficha de Paciente — Phase 50 lista para planificar

## Current Position

Phase: 50 of 50 (HC Completa en PatientSheet) — único phase del milestone
Plan: — (sin planificar)
Status: Ready to plan
Last activity: 2026-06-24 — Roadmap v1.11 creado; HCSHEET-01/02/03 → Phase 50

```
Progress: [░░░░░░░░░░] 0% — milestone v1.11 (Phase 50 lista para planificar)
```

## Decisions

(Full decision log in PROJECT.md Key Decisions table. Cleared on milestone completion.)

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

Last session: 2026-06-24
Stopped at: Roadmap v1.11 creado (ROADMAP.md, STATE.md, REQUIREMENTS.md traceability). Phase 50 lista para planificar.
Resume file: None — siguiente paso `/gsd:plan-phase 50`
