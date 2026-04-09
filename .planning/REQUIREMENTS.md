# Requirements: CLINICAL — v1.3 Historial de Consultas

**Defined:** 2026-04-02
**Core Value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible

## v1.3 Requirements

### Dashboard Widget

- [x] **DASH-01**: Profesional ve los turnos del día actual por defecto (agenda completa del día, no solo turnos futuros)
- [x] **DASH-02**: Profesional puede navegar al día anterior / siguiente desde el widget
- [x] **DASH-03**: Profesional puede seleccionar cualquier fecha con el selector de calendario (pasado o futuro)
- [x] **DASH-04**: Para días pasados y hoy, se muestran métricas del día (total, finalizados, cirugías, ausentes, cancelados)
- [x] **DASH-05**: Cada turno FINALIZADO en días pasados/hoy muestra botón "Ver HC"

### Modal Historia Clínica

- [x] **HC-01**: Modal muestra entradas HC del día del turno en modo solo-lectura con indicador visual de inmutabilidad legal
- [x] **HC-02**: Modal permite agregar nueva entrada HC usando el mismo formato que LiveTurno (selector de tipo: Primera Consulta / Pre Quirúrgico / Control / Práctica + form correspondiente)
- [x] **HC-03**: Nueva entrada retroactiva queda fechada en el día histórico seleccionado (no en hoy)

### Backend

- [x] **BACK-01**: `GET /turnos/agenda` retorna `diagnostico`, `tratamiento` del paciente en el select
- [x] **BACK-02**: `GET /turnos/proximos` retorna `esCirugia`, `entradaHCId`, `tipoTurno.esCirugia` en el select
- [x] **BACK-03**: `POST /pacientes/:id/historia-clinica/entradas` acepta campo `fecha` opcional para entradas retroactivas (validado: no puede ser futuro)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Edición de entradas HC existentes | Restricción legal — las entradas finalizadas son inmutables |
| Modificar entradas desde LiveTurno | Fuera del scope de este milestone |
| Métricas avanzadas (tiempo promedio, etc.) | Deferido a módulo de reportes ejecutivos |
| Navegación por semana/mes | Suficiente con día a día para el flujo de consulta |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BACK-01 | Phase 20 | Complete |
| BACK-02 | Phase 20 | Complete |
| BACK-03 | Phase 20 | Complete |
| DASH-01 | Phase 21 | Complete |
| DASH-02 | Phase 21 | Complete |
| DASH-03 | Phase 21 | Complete |
| DASH-04 | Phase 21 | Complete |
| DASH-05 | Phase 21 | Complete |
| HC-01 | Phase 21 | Complete |
| HC-02 | Phase 21 | Complete |
| HC-03 | Phase 21 | Complete |

**Coverage:**
- v1.3 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 — traceability finalized after roadmap creation*
