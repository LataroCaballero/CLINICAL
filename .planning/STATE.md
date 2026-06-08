---
gsd_state_version: 1.0
milestone: v1.8
milestone_name: Tipos de Turno y Flujo Clínico
status: defining_requirements
stopped_at: Not started
last_updated: "2026-06-08T00:00:00.000Z"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-08)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Defining requirements — v1.8 Tipos de Turno y Flujo Clínico

## Current Position

```
Milestone: v1.8 Tipos de Turno y Flujo Clínico
Phase:     Not started (defining requirements)
Plan:      —
Status:    Defining requirements
Progress:  [░░░░░░░░░░] 0%

Last activity: 2026-06-08 — Milestone v1.8 started
Next: Create REQUIREMENTS.md and ROADMAP.md
```

## Accumulated Context

### Carry-forward from v1.7
- CRM kanban movimiento libre con warnings no bloqueantes (forward-only guard para auto-transiciones)
- etapasProtegidas pattern para PERDIDO: [CONFIRMADO, PROCEDIMIENTO_REALIZADO]
- STEPPER_CHAIN hardcoded (no derivado de ETAPA_ORDER, incluye PROCEDIMIENTO_REALIZADO)
- getKanban ACEPTADO-first para múltiples presupuestos (elimina falsos positivos)
- Dialog-from-Sheet para modales dentro de kanban (evita z-index/focus-trap)
- HCCreatorForm reutilizable compartido entre LiveTurno y PatientDrawer
- OrdenConsumo PENDIENTE→CONFIRMADA (dos-step, no descuento inmediato)

### v1.8 Key Context
- TipoTurno es tabla de datos (no enum Prisma) — nombres y propiedades en DB
- flujoPaciente en TipoTurno: campo que auto-actualiza paciente.flujo al crear turno (guard PENDIENTE-only)
- esCirugia en TipoTurno: determina PROCEDIMIENTO_REALIZADO en cerrarSesion
- TratamientosTab filtra por tipoTurno.flujoPaciente === "TRATAMIENTO" (frontend-side)
- getKanban filtra: flujo = CIRUGIA OR flujo = null (legacy)
- cerrarSesion: esCirugia → PROCEDIMIENTO_REALIZADO; etapaCRM=TURNO_AGENDADO → CONSULTADO
- Tipos actuales a migrar: "Consulta para cirugía" → "Consulta" (flujoPaciente: null); "Consulta para tratamiento" → "Tratamiento"; "Pre-operatorio" → "Pre-Quirúrgico"; "Consulta pendiente" → merge a "Consulta" + DELETE
- tipoEntrada en HC: nuevo campo para clasificar la entrada (CONSULTA_CIRUGIA/TRATAMIENTO/CONTROL/etc.)

### Known Tech Debt (carry-forward)
- LIVHC-05/PAC-01: tratamientos snapshot no se escribe cuando consumirInsumos=false
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend
- CALL-01: botón "Llamar" placeholder en agenda
- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
