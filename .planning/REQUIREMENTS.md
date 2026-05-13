# Requirements: CLINICAL — v1.6 Agenda Operativa

**Defined:** 2026-05-13
**Core Value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible

## v1.6 Requirements

### Estados de Turno

- [ ] **EST-01**: Schema migrado con `EN_ESPERA` y `SIENDO_ATENDIDO` en el enum `EstadoTurno` de Prisma
- [ ] **EST-02**: Endpoint disponible para marcar turno como `EN_ESPERA` (SECRETARIA / PROFESIONAL / ADMIN)
- [ ] **EST-03**: `iniciarSesion` establece el estado del turno a `SIENDO_ATENDIDO` (en lugar de `CONFIRMADO`)
- [ ] **EST-04**: Endpoint disponible para marcar turno como `AUSENTE`
- [ ] **EST-05**: Endpoint disponible para reactivar turno: `AUSENTE → PENDIENTE`

### Widget Agenda

- [ ] **WID-01**: Columna "Tipo de Turno" aparece antes que "Tratamiento" en la tabla de agenda
- [ ] **WID-02**: Click en el nombre del paciente abre su PatientDrawer
- [ ] **WID-03**: Cada turno activo (no FINALIZADO/CANCELADO) muestra botón "Iniciar" + menú ⋮ con acciones contextuales
- [ ] **WID-04**: Menú ⋮ contiene "En espera", "Ausente" y "Llamar" (placeholder) según estado del turno
- [ ] **WID-05**: Turno en estado `AUSENTE` muestra opción "Reactivar" en el menú ⋮
- [ ] **WID-06**: Estados `EN_ESPERA` y `SIENDO_ATENDIDO` se muestran correctamente en columna Estado

### LiveTurno Simplificado

- [ ] **LT-01**: El contador de tiempo (timer) no se muestra en el panel de consulta activa
- [ ] **LT-02**: Con consulta activa, intentar iniciar otro turno muestra confirmación en lugar de botón deshabilitado
- [ ] **LT-03**: Cerrar/descartar el panel sin guardar HC llama al backend cerrar-sesion → turno queda `FINALIZADO`

## Deferred (v2+)

### Reportes

- **REP-01**: Reportes ejecutivos exportables con comparativas entre períodos
- **REP-02**: Historial de liquidaciones por OS con comparativa autorizado vs. pagado

### Llamadas (Sala de Espera Digital)

- **CALL-01**: Botón "Llamar" conectado a pantalla de sala de espera para llamar pacientes desde el sistema

## Out of Scope

| Feature | Reason |
|---------|--------|
| Pantalla de sala de espera | Infraestructura adicional, futuro lejano; botón "Llamar" queda como placeholder |
| Notificación al paciente al llamarlo | Requiere integración extra; out of scope v1.6 |
| Timer de consulta como métrica | Profesional no lo usa; data de `duracionRealMinutos` se mantiene en backend sin mostrar en UI |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EST-01 | Phase 32 | Pending |
| EST-02 | Phase 32 | Pending |
| EST-03 | Phase 32 | Pending |
| EST-04 | Phase 32 | Pending |
| EST-05 | Phase 32 | Pending |
| WID-01 | Phase 33 | Pending |
| WID-02 | Phase 33 | Pending |
| WID-03 | Phase 33 | Pending |
| WID-04 | Phase 33 | Pending |
| WID-05 | Phase 33 | Pending |
| WID-06 | Phase 33 | Pending |
| LT-01 | Phase 34 | Pending |
| LT-02 | Phase 34 | Pending |
| LT-03 | Phase 34 | Pending |

**Coverage:**
- v1.6 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-13*
*Last updated: 2026-05-13 after initial definition*
