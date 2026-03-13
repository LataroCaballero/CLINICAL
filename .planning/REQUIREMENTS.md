# Requirements: CLINICAL v1.1 — Vista del Facturador

**Defined:** 2026-03-13
**Core Value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible

## v1.1 Requirements

### Schema Foundation

- [ ] **SCHEMA-01**: El sistema almacena el monto real pagado por la OS y auditoría de correcciones (`montoPagado`, `corregidoPor`, `corregidoAt`, `motivoCorreccion`) en `PracticaRealizada`
- [ ] **SCHEMA-02**: El sistema permite registrar un límite de facturación mensual por profesional (nuevo modelo `LimiteFacturacionMensual`)
- [ ] **SCHEMA-03**: `Factura` incluye campos de condición IVA del receptor y tipo de cambio (preparación RG 5616/2024 para v1.2)

### Dashboard FACTURADOR

- [ ] **DASH-01**: El FACTURADOR ve su propia página al entrar al sistema (`/dashboard/facturador`) con redirect automático desde el layout
- [ ] **DASH-02**: El FACTURADOR puede ver la cantidad y monto total de prácticas pendientes de liquidación, agrupadas por obra social
- [ ] **DASH-03**: El FACTURADOR puede ver el progreso del límite mensual: configurado / facturado / disponible
- [ ] **DASH-04**: El sistema advierte al FACTURADOR cuando un lote a cerrar supera el límite mensual disponible

### Límite Mensual

- [ ] **LMIT-01**: El FACTURADOR puede configurar el límite de facturación del mes actual (valor que le provee el contador del médico)
- [ ] **LMIT-02**: El sistema calcula automáticamente el disponible: límite − suma de comprobantes emitidos en el período

### Liquidación

- [ ] **LIQ-01**: El FACTURADOR puede filtrar prácticas pendientes por obra social para trabajar un lote por OS a la vez
- [ ] **LIQ-02**: Al marcar una práctica como pagada, el FACTURADOR puede ingresar el monto real cobrado por la OS (puede diferir del autorizado)
- [ ] **LIQ-03**: El cierre de un lote de liquidación crea `LiquidacionObraSocial` y marca todas las prácticas seleccionadas como PAGADO en una única transacción atómica

### AFIP (Research)

- [ ] **AFIP-01**: El equipo dispone de un documento de integración AFIP/ARCA con certificados, WSAA, WSFEv1, CAEA, RG 5616/2024 y biblioteca recomendada
- [ ] **AFIP-02**: El backend expone un `AfipStubService` con la interfaz `emitirComprobante()` y respuesta mock (fija el contrato para v1.2)

## v2 Requirements

### Automatizaciones

- **AUTO-01**: Triggers de seguimiento basados en tiempo/etapa (ej. "30 días sin respuesta → mensaje automático")

### AFIP Implementación

- **AFIP-03**: Emisión de comprobantes electrónicos AFIP/ARCA desde la plataforma (CAE real, certificado por tenant)
- **AFIP-04**: CAEA contingency mode para cuando ARCA no responde
- **AFIP-05**: QR AFIP en PDF de comprobantes

### Reporting

- **REP-01**: Reportes ejecutivos exportables (comparativas entre períodos)
- **REP-02**: Historial de liquidaciones por OS con comparativa autorizado vs. pagado

### Paciente Portal

- **PAC-01**: Página pública del paciente con historial, presupuestos y documentos

## Out of Scope

| Feature | Reason |
|---------|--------|
| AFIP CAE real en v1.1 | Requiere certificado por tenant (1-3 días hábiles con contador), advisory locks en numeración, WSAA token lifecycle. Dedicated v1.2 milestone. |
| Catálogo de nomenclador OS (edición masiva) | Mantenimiento de datos continuo, baja ROI para v1.1. PracticaObraSocial ya existe en schema. |
| Portal OS (Webcred, etc.) | Requiere acuerdos comerciales individuales con cada OS. |
| App móvil nativa | Web-first por diseño. |
| Facturación electrónica AFIP en v1.1 | Ver fila 1. |

## Traceability

Actualizar durante creación del roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 | — | Pending |
| SCHEMA-02 | — | Pending |
| SCHEMA-03 | — | Pending |
| DASH-01 | — | Pending |
| DASH-02 | — | Pending |
| DASH-03 | — | Pending |
| DASH-04 | — | Pending |
| LMIT-01 | — | Pending |
| LMIT-02 | — | Pending |
| LIQ-01 | — | Pending |
| LIQ-02 | — | Pending |
| LIQ-03 | — | Pending |
| AFIP-01 | — | Pending |
| AFIP-02 | — | Pending |

**Coverage:**
- v1.1 requirements: 13 total
- Mapped to phases: 0
- Unmapped: 13 ⚠️

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after initial definition*
