# Requirements: CLINICAL — v1.4 Flujo de Pacientes

**Defined:** 2026-04-15
**Core Value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible

## v1.4 Requirements

### Tipos de Turno

- [ ] **TIPOS-01**: El sistema cuenta con 5 tipos de turno disponibles: "Consulta para cirugía", "Consulta para tratamiento en consultorio", "Pre-operatorio", "Control", "Consulta pendiente"
- [ ] **TIPOS-02**: Al crear un turno, la secretaria/profesional selecciona el tipo de turno de la lista actualizada con los 5 tipos

### Flujo del Paciente

- [ ] **FLUJO-01**: Al crear un turno de tipo "Consulta para cirugía", el flujo del paciente se actualiza automáticamente a CIRUGIA (solo si el paciente está en PENDIENTE — no sobreescribe clasificaciones existentes)
- [ ] **FLUJO-02**: Al crear un turno de tipo "Consulta para tratamiento en consultorio", el flujo del paciente se actualiza automáticamente a TRATAMIENTO (solo si el paciente está en PENDIENTE)
- [ ] **FLUJO-03**: Al crear un turno de tipo "Pre-operatorio", el flujo del paciente se actualiza a CIRUGIA (solo si está en PENDIENTE)
- [ ] **FLUJO-04**: Los tipos "Control" y "Consulta pendiente" no modifican el flujo del paciente
- [ ] **FLUJO-05**: La lista de pacientes muestra un badge de flujo por paciente: CIRUGIA (azul), TRATAMIENTO (verde), PENDIENTE (amber), sin clasificar/legacy (gris)
- [ ] **FLUJO-06**: Los pacientes existentes en el embudo CRM migran a flujo = CIRUGIA en base a historial de turnos (Turno.esCirugia / etapaCRM activo); pacientes sin historial quedan como null (sin clasificar — no aparecen en embudo ni en lista de tratamientos)

### CRM / Embudo

- [ ] **CRM-01**: El embudo CRM (kanban) muestra únicamente pacientes con flujo = CIRUGIA y pacientes legacy (flujo IS NULL con etapaCRM activo)
- [ ] **CRM-02**: La lista de acción diaria muestra únicamente pacientes con flujo = CIRUGIA y pacientes legacy con etapaCRM activo
- [ ] **CRM-03**: Los KPIs del dashboard CRM (embudo, conversión, motivos de pérdida, ingreso potencial, performance coordinador) reflejan solo pacientes de cirugía

### LiveTurno — Clasificación Pendiente

- [ ] **LIVT-01**: En LiveTurno, si el paciente tiene flujo = PENDIENTE, aparece un banner amber no bloqueante indicando que debe clasificarse
- [ ] **LIVT-02**: Desde el banner, el profesional puede clasificar al paciente como "Cirugía" o "Tratamiento"; el banner desaparece tras la acción y el flujo del paciente queda guardado
- [ ] **LIVT-03**: El banner es dismissible por sesión (desaparece sin clasificar); el paciente permanece PENDIENTE y el banner vuelve a aparecer en la próxima sesión LiveTurno

### Lista de Tratamientos

- [ ] **TRAT-01**: La página de pacientes tiene un nuevo tab "Tratamientos" junto a "Embudo" y "Lista"
- [ ] **TRAT-02**: El tab muestra todos los turnos del mes con tipo de flujo TRATAMIENTO del profesional, ordenados por día
- [ ] **TRAT-03**: La lista es navegable por mes (botones anterior / actual / siguiente), con el mes actual como default
- [ ] **TRAT-04**: La lista es filtrable por tipo de turno de tratamiento (dropdown, "Todos" por defecto)
- [ ] **TRAT-05**: Cada fila muestra: fecha+hora, nombre del paciente (clickable al drawer), tipo de turno, estado del turno
- [ ] **TRAT-06**: El header del tab muestra el total de tratamientos del mes seleccionado

## v2 Requirements (Deferred)

### Tratamientos — Funcionalidad Futura

- **TRAT-07**: Lista de tratamientos muestra monto cobrado por paciente en el mes (requiere join Cobro/Factura)
- **TRAT-08**: Export CSV de la lista de tratamientos del mes
- **TRAT-09**: Pantalla de reclasificación masiva de pacientes PENDIENTE

### Reportes

- **REP-01**: Reportes ejecutivos exportables con comparativas entre períodos
- **REP-02**: Historial de liquidaciones por OS con comparativa autorizado vs. pagado

## Out of Scope

| Feature | Reason |
|---------|--------|
| Selector manual de flujo en formulario de nuevo paciente | Clasificación automática vía tipo de turno es más precisa y sin overhead; manual en paciente-form crea UX tax innecesaria |
| Embudo CRM separado para TRATAMIENTO | Tratamientos son recurrentes y no siguen el mismo ciclo de vida (CONSULTADO → PRESUPUESTO → CONFIRMADO); la lista mensual es el view correcto |
| Link a stock al realizar tratamiento | Deferido — requiere módulo separado con lógica de consumo por procedimiento |
| Link a finanzas/presupuestos para tratamientos | Deferido — tratamientos de consultorio raramente tienen presupuesto previo |
| Reclasificación en bulk de pacientes existentes | Deferido — clasificación natural vía nuevos turnos es suficiente para v1.4 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TIPOS-01 | Phase 22 | Pending |
| TIPOS-02 | Phase 22 | Pending |
| FLUJO-01 | Phase 23 | Pending |
| FLUJO-02 | Phase 23 | Pending |
| FLUJO-03 | Phase 23 | Pending |
| FLUJO-04 | Phase 23 | Pending |
| FLUJO-05 | Phase 25 | Pending |
| FLUJO-06 | Phase 22 | Pending |
| CRM-01 | Phase 23 | Pending |
| CRM-02 | Phase 23 | Pending |
| CRM-03 | Phase 23 | Pending |
| LIVT-01 | Phase 24 | Pending |
| LIVT-02 | Phase 24 | Pending |
| LIVT-03 | Phase 24 | Pending |
| TRAT-01 | Phase 25 | Pending |
| TRAT-02 | Phase 25 | Pending |
| TRAT-03 | Phase 25 | Pending |
| TRAT-04 | Phase 25 | Pending |
| TRAT-05 | Phase 25 | Pending |
| TRAT-06 | Phase 25 | Pending |

**Coverage:**
- v1.4 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-15*
*Last updated: 2026-04-15 — initial definition*
