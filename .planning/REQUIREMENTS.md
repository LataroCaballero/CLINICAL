# Requirements: CLINICAL v1.5

**Defined:** 2026-04-22
**Core Value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible

## v1.5 Requirements

### CATLOG — Catálogos Clínicos

- [x] **CATLOG-01**: El profesional puede vincular insumos del stock a un tratamiento del catálogo (relación n:n con cantidad por insumo)
- [x] **CATLOG-02**: El tratamiento del catálogo muestra un precio base calculado a partir del costo de los insumos vinculados (campo estático actualizable con botón "Recalcular", no recalculo automático)
- [x] **CATLOG-03**: El profesional puede crear, editar y eliminar cirugías propias desde la sección de Configuración
- [x] **CATLOG-04**: Una cirugía tiene: nombre, precio ARS, precio USD, insumos con cantidades (FK a stock), duración estimada
- [x] **CATLOG-05**: El precio base de una cirugía se muestra calculado a partir de los insumos asociados
- [x] **CATLOG-06**: Cada profesional ve y gestiona únicamente sus propias cirugías

### LIVHC — LiveTurno HC (Tratamiento en Consultorio)

- [x] **LIVHC-01**: La sección "Práctica" en LiveTurno HC se renombra a "Tratamiento en Consultorio"
- [x] **LIVHC-02**: El profesional puede seleccionar uno o más tratamientos del catálogo en la sección (multi-select)
- [x] **LIVHC-03**: El campo de texto libre se mantiene como opción complementaria al selector de tratamientos
- [x] **LIVHC-04**: La sección muestra un checkbox "Consumir insumos del stock" (visible solo cuando el tratamiento seleccionado tiene insumos vinculados)
- [x] **LIVHC-05**: Al guardar la HC con tratamientos seleccionados, el último tratamiento del paciente se actualiza (derivado en lectura desde la última entrada con tratamiento asignado)

### STOCK — Órdenes de Consumo

- [x] **STOCK-01**: Al guardar una HC con el checkbox de insumos activado, se genera automáticamente una orden de consumo con estado PENDIENTE en el módulo de stock
- [x] **STOCK-02**: La orden de consumo incluye: nombre del paciente, fecha de la sesión, tratamiento(s) realizados, e insumos con cantidades a consumir
- [ ] **STOCK-03**: El responsable de stock puede ver la lista de órdenes de consumo pendientes y confirmarlas una a una
- [ ] **STOCK-04**: Al confirmar una orden, se registra el movimiento SALIDA en el stock correspondiente dentro de una transacción atómica

### PRESUP — Presupuestos con Catálogo

- [ ] **PRESUP-01**: Al armar un presupuesto, el usuario puede seleccionar ítems desde el catálogo de cirugías del profesional
- [ ] **PRESUP-02**: Al armar un presupuesto, el usuario puede seleccionar ítems desde el catálogo de tratamientos
- [ ] **PRESUP-03**: Al seleccionar un ítem del catálogo, se auto-completan nombre y precio (ARS/USD) como snapshot en el momento de la selección
- [ ] **PRESUP-04**: Se pueden seguir agregando ítems de texto libre al presupuesto (comportamiento actual sin cambios)

### PAC — Mejoras en Vista de Pacientes

- [ ] **PAC-01**: El tab Tratamientos muestra una columna con el último tratamiento registrado por paciente (nombre del tratamiento del catálogo)
- [ ] **PAC-02**: El profesional puede cambiar el flujo de un paciente desde el PatientDrawer mediante un modal de confirmación
- [ ] **PAC-03**: El cambio de flujo en PatientDrawer es optimista — se aplica de inmediato en UI, con toast de error si el endpoint falla
- [x] **PAC-04**: Al cambiar el flujo, el paciente se asigna automáticamente a la etapa CRM "Sin Clasificar" en la misma transacción
- [x] **PAC-05**: Al cambiar el flujo, se registra automáticamente un contacto con nota "Paciente pendiente de clasificación"

### HCDR — Entrada de HC desde PatientDrawer

- [x] **HCDR-01**: Desde el PatientDrawer se puede crear una nueva entrada de HC usando el mismo creator que se usa en LiveTurno
- [x] **HCDR-02**: La entrada creada desde PatientDrawer no requiere turno activo (se crea sin turnoId asociado)
- [x] **HCDR-03**: La fecha de la entrada es hoy por defecto pero permite seleccionar una fecha retroactiva

## v2+ Requirements (Deferred)

### Catálogos

- Estudios pre-quirúrgicos por cirugía (checklist por paciente, solicitud desde presupuesto)
- Indicaciones post-procedimiento por tratamiento/cirugía (exportable a PDF)
- Paquetes/bundles de ítems en presupuesto
- Tracking de lote (batch) por insumo inyectable (compliance)

### Stock

- Confirmación masiva de órdenes de consumo (bulk confirm)
- Vinculación OrdenConsumo a Lote específico de producto

## Out of Scope

| Feature | Reason |
|---------|--------|
| Deducción inmediata de stock desde HC | Race condition con escrituras concurrentes; modelo pending→confirm es el correcto para separación de roles (PROFESIONAL documenta, Admin confirma) |
| Recalculo automático de precio base al editar insumos | Quote drift — los presupuestos históricos quedarían con precios incorrectos; botón explícito "Recalcular" es el diseño correcto |
| ultimoTratamientoId como columna desnormalizada en Paciente | Corrupción con entradas retroactivas y escrituras concurrentes; query-on-read (ORDER BY fecha DESC) es más robusto |
| App móvil nativa | Web-first, mobile a futuro |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CATLOG-01 | Phase 26 | Complete |
| CATLOG-02 | Phase 26 | Complete |
| CATLOG-03 | Phase 26 | Complete |
| CATLOG-04 | Phase 26 | Complete |
| CATLOG-05 | Phase 26 | Complete |
| CATLOG-06 | Phase 26 | Complete |
| LIVHC-01 | Phase 27 | Complete |
| LIVHC-02 | Phase 27 | Complete |
| LIVHC-03 | Phase 27 | Complete |
| LIVHC-04 | Phase 27 | Complete |
| LIVHC-05 | Phase 27 | Complete |
| STOCK-01 | Phase 27 | Complete |
| STOCK-02 | Phase 27 | Complete |
| STOCK-03 | Phase 31 | Pending |
| STOCK-04 | Phase 31 | Pending |
| PRESUP-01 | Phase 28 | Pending |
| PRESUP-02 | Phase 28 | Pending |
| PRESUP-03 | Phase 28 | Pending |
| PRESUP-04 | Phase 28 | Pending |
| PAC-01 | Phase 30 | Pending |
| PAC-02 | Phase 29 | Pending |
| PAC-03 | Phase 29 | Pending |
| PAC-04 | Phase 29 | Complete |
| PAC-05 | Phase 29 | Complete |
| HCDR-01 | Phase 27 | Complete |
| HCDR-02 | Phase 27 | Complete |
| HCDR-03 | Phase 27 | Complete |

**Coverage:**
- v1.5 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-22*
*Last updated: 2026-04-22 after initial definition*
