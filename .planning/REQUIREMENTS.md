# Requirements: CLINICAL v1.7 — CRM Flexible

**Defined:** 2026-05-23
**Core Value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible

## v1.7 Requirements

Requirements for milestone v1.7 CRM Flexible. Each maps to roadmap phases.

### CRM — Libertad de movimiento

- [x] **CRM-01**: El usuario puede mover un paciente a cualquier etapa del kanban mediante drag-and-drop sin restricciones de negocio
- [x] **CRM-02**: Al mover a PRESUPUESTO_ENVIADO sin presupuesto existente, aparece toast no bloqueante: "No hay presupuesto enviado a este paciente"
- [x] **CRM-03**: Al mover a CONFIRMADO sin presupuesto aceptado, aparece toast no bloqueante: "Ningún presupuesto fue aceptado — verificá antes de confirmar"
- [x] **CRM-04**: Las transiciones automáticas del sistema (cerrar sesión, enviar/aceptar presupuesto) no sobreescriben etapas más avanzadas puestas a mano
- [x] **CRM-05**: El usuario puede mover un paciente a cualquier etapa usando el stepper del sheet (mismo warning logic que drag-and-drop)

### SHEET — Rediseño del sheet lateral del kanban

- [x] **SHEET-01**: El sheet muestra nombre del paciente y badge de flujo (CIRUGIA/TRATAMIENTO/PENDIENTE) en el header
- [x] **SHEET-02**: "Registrar contacto" es un botón compacto que abre un modal pequeño (Dialog, no Sheet nested)
- [x] **SHEET-03**: Botón compacto activa/desactiva opt-in de lista de espera del paciente
- [x] **SHEET-04**: El sheet incluye un stepper con las 6 etapas CRM indicando la etapa actual
- [x] **SHEET-05**: Click en etapa del stepper mueve al paciente a esa etapa; PERDIDO abre LossReasonModal
- [x] **SHEET-06**: En etapa PRESUPUESTO_ENVIADO del stepper aparece acción "Ver/Crear presupuesto"
- [x] **SHEET-07**: En etapa CONSULTADO del stepper aparece acción "Registrar HC" abriendo HCCreatorForm
- [x] **SHEET-08**: En etapa PROCEDIMIENTO_REALIZADO del stepper aparece acción "Marcar como realizado" (etapa clickeable como las demás)
- [x] **SHEET-09**: El panel de acciones rápidas actual es removido del sheet

## Tech Debt (Phase 39)

Identified by v1.7 audit. All requirements remain satisfied; these fix behavioral asymmetries and UX edge cases:

- [ ] **TD-1** (High): `rechazar()` en presupuestos.service.ts aplica guard `etapasProtegidas` igual que `rechazarByToken()` — sin esto, staff puede sobreescribir etapas avanzadas
- [ ] **TD-2** (Medium): `STEPPER_CHAIN` en EtapaStepper.tsx alineado con `ETAPA_ORDEN` backend: `CONFIRMADO(5) → PROCEDIMIENTO_REALIZADO(6)` (actualmente invertido)
- [ ] **TD-3** (Low): `getKanban` prioriza presupuesto ACEPTADO sobre el más reciente para evitar falso positivo en warning CRM-03

## Deferred Requirements

### v1.x — Stepper UX enhancements

- **STEP-01**: Indicador de tiempo en etapa por paso (días en CONFIRMADO, días en PRESUPUESTO_ENVIADO)
- **STEP-02**: Acción inline en toast de warning (ej. "Crear presupuesto →" como botón dentro del toast)
- **STEP-03**: Animaciones de transición en el stepper al cambiar etapa
- **STEP-04**: Audit log de cambios manuales de etapa visible en el sheet

### v2.x — CRM avanzado

- **AUTO-01**: Automatizaciones de seguimiento: triggers basados en tiempo/etapa
- **AUDIT-01**: Historial de cambios de etapa por paciente (quién movió, cuándo, motivo)

## Out of Scope

| Feature | Reason |
|---------|--------|
| App móvil | Web-first; sin demanda hasta ahora |
| Chat en tiempo real | WhatsApp cubre este caso |
| Animaciones en stepper | Complejidad sin valor claro en v1.7 |
| Audit log de etapas | Deferred — requiere modelo nuevo en DB |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CRM-01 | Phase 35 | Complete |
| CRM-04 | Phase 35 | Complete |
| CRM-02 | Phase 36 | Complete |
| CRM-03 | Phase 36 | Complete |
| SHEET-01 | Phase 37 | Complete |
| SHEET-02 | Phase 37 | Complete |
| SHEET-03 | Phase 37 | Complete |
| SHEET-04 | Phase 37 | Complete |
| SHEET-09 | Phase 37 | Complete |
| CRM-05 | Phase 38 | Complete |
| SHEET-05 | Phase 38 | Complete |
| SHEET-06 | Phase 38 | Complete |
| SHEET-07 | Phase 38 | Complete |
| SHEET-08 | Phase 38 | Complete |
| TD-1 | Phase 39 | Pending |
| TD-2 | Phase 39 | Pending |
| TD-3 | Phase 39 | Pending |

**Coverage:**
- v1.7 requirements: 14 total (all satisfied)
- Tech debt items: 3 (Phase 39 pending)
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-23*
*Last updated: 2026-05-23 — traceability confirmed against roadmap (phases 35–38)*
