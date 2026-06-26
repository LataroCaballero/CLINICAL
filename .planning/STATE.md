---
gsd_state_version: 1.0
milestone: v1.12
milestone_name: Prequirúrgico Estructurado + Portal del Paciente
status: planning
last_updated: "2026-06-26T01:44:54.304Z"
last_activity: 2026-06-26
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-24)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Planning next milestone (usar `/gsd:new-milestone`)

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-06-26 — Milestone v1.12 started

## Decisions

(Full decision log in PROJECT.md Key Decisions table. Cleared on milestone completion.)

## Accumulated Context

### Carry-forward from v1.11

- Componente de render HC compartido `frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx`: exporta `HCEntryChips` (tarjeta) y `HCEntryFullContent` (detalle), maneja los 2 shapes de `contenido` (v1.9 `zonas[]` y legacy plano) + texto libre. Disponible para consolidar `HistorialClinicoPanel.tsx` y `TurnoHCModal.tsx` (diferido).
- Convención de chips HC: zona → `Badge secondary capitalize font-semibold`; diagnósticos → `Badge outline`; tratamientos → `Badge bg-blue-50 text-blue-700 border-blue-200`.

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

- HistorialClinicoPanel y TurnoHCModal no migrados al componente compartido `HCEntryContent.tsx` (triplicación de chips de HC; consolidación diferida).
- AppointmentDetailModal y CalendarGrid no migrados a `getEstadoTurnoChip` (diferido).
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend.
- CALL-01: botón "Llamar" placeholder en agenda.
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod.
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs.

## Session Continuity

Last session: 2026-06-24T15:36:02.267Z
Stopped at: v1.11 milestone archived and tagged — ready for /gsd:new-milestone
Resume file: None
