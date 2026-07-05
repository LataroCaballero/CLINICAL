# Requirements: v1.13 Embudo CRM Accionable

**Defined:** 2026-07-03
**Core Value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible.

## v1 Requirements

Requisitos scopeados para el milestone v1.13. Cada uno mapea a una fase del roadmap.

### Embudo — estructura y clasificación

- [x] **EMBUDO-01**: La columna "Sin clasificar" aparece al final del embudo (no al inicio) y contiene solo leads sin etapa CRM real (no pacientes operados)
- [x] **EMBUDO-02**: El embudo muestra una nueva etapa "Cirugía Realizada" ubicada después de "Confirmado"
- [x] **EMBUDO-03**: Un paciente operado (fecha de cirugía pasada, o con turno de cirugía) que tiene al menos un paso pendiente aparece en "Cirugía Realizada" con indicador visual naranja
- [x] **EMBUDO-04**: Un paciente operado con todos los pasos completos (entrada de HC + turno de cirugía con fecha + presupuesto enviado + consentimiento/indicaciones preop) se oculta del board del embudo
- [x] **EMBUDO-05**: Un paciente que vuelve a solicitar un turno (u otra acción posterior) puede volver a una etapa anterior del embudo sin ser bloqueado por el guard forward-only

### Etiquetas de contacto en Confirmado

- [x] **CONTACTO-01**: Un paciente en "Confirmado" sin turno de cirugía muestra en la tarjeta el registro de contacto como "Espera fecha"
- [x] **CONTACTO-02**: Un paciente en "Confirmado" con turno de cirugía muestra en la tarjeta el registro de contacto como "Cirugía programada"

### Stepper accionable (sheet lateral CRM)

- [x] **STEPPER-01**: Cada paso del stepper que no tiene pendientes se muestra con círculo verde y sin botón de quick-action
- [x] **STEPPER-02**: Cada paso del stepper que tiene algo pendiente se muestra con círculo naranja
- [x] **STEPPER-03**: Al hacer click en un paso naranja de entrada de HC, se abre el wizard de HC para seleccionar la plantilla pertinente y cargar la entrada
- [x] **STEPPER-04**: Al hacer click en un paso naranja de presupuesto, se abre el modal de presupuesto prellenado con los tratamientos/cirugías cargados en la ficha del paciente
- [x] **STEPPER-05**: En el paso "Confirmado", si el paciente no tiene turno de cirugía, el paso se muestra pendiente ("fecha") y al hacer click se abre la agenda para programar el turno de cirugía
- [x] **STEPPER-06**: En el paso "Confirmado", si el paciente tiene turno de cirugía, el paso se muestra verde

### Estadísticas sobre registros reales

- [x] **STATS-01**: El conteo de cirugías realizadas se calcula sobre registros efectivamente realizados (Cirugia/HC), robusto a que la etapa CRM del paciente cambie después
- [x] **STATS-02**: El conteo de tratamientos realizados se calcula sobre registros efectivamente realizados (HC de tratamiento), robusto a que la etapa CRM del paciente cambie después

## Future Requirements

Diferidos, no en el roadmap de v1.13.

### Reportes ejecutivos

- **REPORT-F01**: Dashboard de estadísticas ejecutivas con reportes exportables y comparativas por período
- **REPORT-F02**: Automatizaciones de seguimiento por tiempo/etapa (ej. "30 días sin respuesta → mensaje automático")

## Out of Scope

Excluido explícitamente para prevenir scope creep.

| Feature | Reason |
|---------|--------|
| Nuevo dashboard de estadísticas ejecutivas / reportes exportables | Este milestone solo garantiza que el conteo se base en registros reales; el dashboard ejecutivo es un candidato de próximo milestone (REPORT-F01) |
| Automatizaciones de seguimiento por tiempo | Diferido (REPORT-F02); no es parte del embudo accionable |
| Rediseño de la planilla de Tratamientos | Fuera de foco; solo se toca el origen de datos de stats, no la UI de la planilla |
| Eliminar el tipo "Cirugía" interno | La agenda quirúrgica lo requiere (decisión v1.8) |
| Nuevas dependencias / librerías | El milestone se resuelve con patrones y componentes existentes |

## Traceability

Qué fases cubren qué requisitos.

| Requirement | Phase | Status |
|-------------|-------|--------|
| EMBUDO-01 | Phase 58 | Complete |
| EMBUDO-02 | Phase 57 | Complete |
| EMBUDO-03 | Phase 58 | Complete |
| EMBUDO-04 | Phase 58 | Complete |
| EMBUDO-05 | Phase 57 | Complete |
| CONTACTO-01 | Phase 58 | Complete |
| CONTACTO-02 | Phase 58 | Complete |
| STEPPER-01 | Phase 59 | Complete |
| STEPPER-02 | Phase 59 | Complete |
| STEPPER-03 | Phase 59 | Complete |
| STEPPER-04 | Phase 59 | Complete |
| STEPPER-05 | Phase 59 | Complete |
| STEPPER-06 | Phase 59 | Complete |
| STATS-01 | Phase 60 | Complete |
| STATS-02 | Phase 60 | Complete |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15 (roadmap complete)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-03*
*Last updated: 2026-07-03 — Roadmap created, traceability complete*
