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
- [ ] **CRM-05**: El usuario puede mover un paciente a cualquier etapa usando el stepper del sheet (mismo warning logic que drag-and-drop)

### SHEET — Rediseño del sheet lateral del kanban

- [ ] **SHEET-01**: El sheet muestra nombre del paciente y badge de flujo (CIRUGIA/TRATAMIENTO/PENDIENTE) en el header
- [ ] **SHEET-02**: "Registrar contacto" es un botón compacto que abre un modal pequeño (Dialog, no Sheet nested)
- [ ] **SHEET-03**: Botón compacto activa/desactiva opt-in de lista de espera del paciente
- [ ] **SHEET-04**: El sheet incluye un stepper con las 6 etapas CRM indicando la etapa actual
- [ ] **SHEET-05**: Click en etapa del stepper mueve al paciente a esa etapa; PERDIDO abre LossReasonModal
- [ ] **SHEET-06**: En etapa PRESUPUESTO_ENVIADO del stepper aparece acción "Ver/Crear presupuesto"
- [ ] **SHEET-07**: En etapa CONSULTADO del stepper aparece acción "Registrar HC" abriendo HCCreatorForm
- [ ] **SHEET-08**: En etapa PROCEDIMIENTO_REALIZADO del stepper aparece acción "Marcar como realizado" (etapa clickeable como las demás)
- [ ] **SHEET-09**: El panel de acciones rápidas actual es removido del sheet

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
| SHEET-01 | Phase 37 | Pending |
| SHEET-02 | Phase 37 | Pending |
| SHEET-03 | Phase 37 | Pending |
| SHEET-04 | Phase 37 | Pending |
| SHEET-09 | Phase 37 | Pending |
| CRM-05 | Phase 38 | Pending |
| SHEET-05 | Phase 38 | Pending |
| SHEET-06 | Phase 38 | Pending |
| SHEET-07 | Phase 38 | Pending |
| SHEET-08 | Phase 38 | Pending |

**Coverage:**
- v1.7 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-23*
*Last updated: 2026-05-23 — traceability confirmed against roadmap (phases 35–38)*
