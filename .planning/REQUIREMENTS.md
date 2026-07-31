# Requirements: Sistema de Gestión de Clínica — Milestone v1.15

**Defined:** 2026-07-30
**Milestone:** v1.15 Flujo CRM Automático + Correcciones HC
**Core Value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible

## v1.15 Requirements

Requisitos de este milestone. Cada uno mapea a una fase del roadmap.

### Embudo CRM (flujo automático)

- [x] **EMBUDO-07**: Al crearse un paciente nuevo entra al kanban en la etapa "Nuevo Lead" (`etapaCRM = NUEVO_LEAD`), en vez de quedar sin etapa ("Sin clasificar")
- [x] **EMBUDO-08**: Al agendar la fecha de cirugía (turno de cirugía) el paciente pasa a "Confirmado" aunque no haya aceptado el presupuesto
- [x] **EMBUDO-09**: Al cargarse una entrada de HC "Tratamiento en consultorio" (sola o junto a "Primera vez") el paciente sale del kanban (marcado flujo=TRATAMIENTO y oculto del board, patrón v1.13) y queda registrado en la planilla de tratamientos con la fecha en que se hizo el tratamiento

### Contacto (pendientes por etapa en la card)

- [ ] **CONTACTO-03**: La card de un paciente en "Nuevo Lead" muestra el pendiente "Dar turno" en la zona de badges/registro de contacto inferior
- [ ] **CONTACTO-04**: La card de un paciente en "Consulta Agendada" muestra el pendiente "Ser atendido" en la misma zona

### Planilla de tratamientos

- [ ] **TRAT-07**: La columna "Último tratamiento" muestra todos los tratamientos del turno (no "primero +N-1") truncados en la celda, con tooltip que revela el texto completo

### Sync tipo de turno ↔ plantilla HC

- [ ] **HCSYNC-01**: Al cargar una plantilla de HC "Primera vez" sobre un turno, el tipo de turno se fija en "Consulta" si estaba en otro valor
- [ ] **HCSYNC-02**: Al cargar una plantilla "Tratamiento en consultorio" sobre un turno tipo "Consulta", el tipo de turno cambia a "Tratamiento"
- [ ] **HCSYNC-03**: Al cargar una plantilla "Pre-quirúrgico" sobre un turno, el tipo de turno se fija en "Pre-Quirúrgico". (Guard común a HCSYNC-01/02/03: si la HC se carga sin turno asociado, no se modifica ningún tipo de turno)

### Correcciones de UI de Historia Clínica

- [ ] **HCUI-01**: Al agregar una nueva entrada de HC desde el PatientDrawer se usa el wizard nuevo (`HCCreatorForm`/`HCCreatorDialog`, el mismo de LiveTurno) en vez del formulario de texto libre viejo
- [ ] **HCUI-02**: El detalle de una entrada "Pre-quirúrgico" en el historial de HC renderiza correctamente el JSONB guardado (antecedentes, alergias, medicación, estudios complementarios, consentimiento informado, comentario), en vez de mostrarse vacío

## Future Requirements

Diferidos a milestones futuros (trackeados, no en este roadmap).

### Reportes y automatización

- **REPORT-F01**: Dashboard de estadísticas ejecutivas con reportes exportables y comparativas por período (diferido de v1.13)
- **REPORT-F02**: Automatizaciones de seguimiento por tiempo/etapa (ej. "30 días sin respuesta → mensaje automático") (diferido de v1.13)

### CRM / Configuración

- **TIPO-F01**: Tipos de turno personalizados por profesional desde Configuración + **TIPO-F02**: color por tipo en calendario (diferido de v1.8)
- **CRM-F01**: Vista de pacientes archivados con desarchivar en lote + **CRM-F02**: archivado automático tras N días en PERDIDO (diferido de v1.8)

## Out of Scope

Excluido explícitamente de v1.15.

| Feature | Reason |
|---------|--------|
| Nueva etapa/columna CRM "Tratamiento Realizado" | La salida a planilla se resuelve con flujo=TRATAMIENTO + ocultar del board (patrón v1.13); no se agrega enum ni columna |
| Cambiar el origen de "Último tratamiento" a `Paciente.tratamiento` | Se mantiene el origen por-turno (HC del turno) para preservar precisión por fila; solo cambia el display (TRAT-07) |
| Migración del enum `EtapaCRM` | Los valores necesarios (NUEVO_LEAD, TURNO_AGENDADO, CONSULTADO, CONFIRMADO) ya existen |
| Backfill de etapaCRM en pacientes existentes sin etapa | EMBUDO-07 aplica solo a pacientes creados desde ahora; no se re-clasifican los históricos |
| Migrar `HistorialClinicoPanel`/`TurnoHCModal` al componente compartido de HC | Fuera de scope salvo lo mínimo necesario para HCUI-02 (render prequirúrgico) |

## Traceability

Qué fases cubren qué requisitos.

| Requirement | Phase | Status |
|-------------|-------|--------|
| EMBUDO-07 | Phase 63 | Complete |
| EMBUDO-08 | Phase 63 | Complete |
| EMBUDO-09 | Phase 63 | Complete |
| CONTACTO-03 | Phase 64 | Pending |
| CONTACTO-04 | Phase 64 | Pending |
| TRAT-07 | Phase 64 | Pending |
| HCSYNC-01 | Phase 65 | Pending |
| HCSYNC-02 | Phase 65 | Pending |
| HCSYNC-03 | Phase 65 | Pending |
| HCUI-01 | Phase 66 | Pending |
| HCUI-02 | Phase 66 | Pending |

**Coverage:**
- v1.15 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-30*
*Last updated: 2026-07-30 after roadmap creation (Phases 63-66)*
