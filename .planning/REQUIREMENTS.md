# Requirements: CLINICAL — v1.2 AFIP Real

**Defined:** 2026-03-16
**Core Value:** Que un cirujano plástico cierre más cirugías — el sistema debe permitir emitir comprobantes electrónicos AFIP reales sin fricción técnica para el FACTURADOR

## v1.2 Requirements

### Schema & Infraestructura DB

- [x] **AFIP-01**: El sistema puede almacenar y recuperar el schema AFIP extendido — `ConfiguracionAFIP` (cert+key AES-256-GCM por tenant, cuit, ptoVta, ambiente, certExpiresAt), campos `cae`/`caeFchVto`/`nroComprobante`/`qrData`/`ptoVta` en `Factura`, modelo `CaeaVigente`, enum `EstadoFactura.CAEA_PENDIENTE_INFORMAR`

### Gestión de Certificados

- [x] **CERT-01**: Admin puede subir certificado digital y clave privada con validación automática — CUIT del cert CN coincide con el registrado, ptoVta es tipo RECE verificado via `FEParamGetPtosVenta`
- [x] **CERT-02**: Admin puede configurar ambiente (HOMO/PROD), punto de venta, y ver estado del certificado en pantalla dedicada
- [x] **CERT-03**: Sistema envía email al Admin 30 y 60 días antes del vencimiento del certificado
- [x] **CERT-04**: Facturador ve badge de estado del certificado (OK / venciendo / no configurado) en su home

### Emisión CAE Real

- [x] **CAE-01**: Sistema obtiene Access Ticket de WSAA con firma CMS in-process via `node-forge`, cacheado en Redis (clave `afip_ta:{profesionalId}:{cuit}:{service}`, TTL = expiry menos 5 min, ~11hs), con `async-mutex` por CUIT para evitar renovaciones concurrentes
- [x] **CAE-02**: Sistema emite comprobante electrónico real via `FECAESolicitar` con `pg_advisory_xact_lock(hashtext(cuit:ptoVta:cbteTipo))` dentro de `prisma.$transaction({ timeout: 45000 })`, y almacena CAE + nroComprobante en `Factura`
- [x] **CAE-03**: Facturador ve errores de AFIP traducidos a mensajes legibles en español en un modal (no toasts genéricos) — mínimo error 10242, resultado='R', cert inválido
- [x] **CAE-04**: Jobs de emisión clasifican errores de negocio AFIP (10242, resultado=R) como permanentes (DLQ inmediato); errores transitorios (timeout, HTTP 5xx) usan backoff exponencial

### Output QR y PDF

- [x] **QR-01**: PDF de factura incluye código QR AFIP (`https://www.afip.gob.ar/fe/qr/?p=` + Base64 JSON con 13 campos RG 5616/2024) embebido via `qrcode` 1.5.4 + PDFKit
- [ ] **QR-02**: Facturador ve número de CAE y código QR renderizado en el detalle de la factura emitida
- [ ] **QR-03**: Facturador puede ingresar cotización BNA manualmente para facturas en USD, con link directo a bna.com.ar

### CAEA Contingency Mode

- [ ] **CAEA-01**: Sistema pre-fetcha códigos CAEA con cron bimensual (`0 6 27,11,12 * *`) y los almacena en `CaeaVigente` por tenant
- [ ] **CAEA-02**: Sistema asigna CAEA automáticamente cuando ARCA no está disponible (`AfipUnavailableException`) y marca la factura como `CAEA_PENDIENTE_INFORMAR`
- [ ] **CAEA-03**: Sistema informa facturas CAEA a AFIP dentro del plazo de 8 días calendario via job BullMQ con 72 reintentos distribuidos en la ventana
- [ ] **CAEA-04**: Sistema alerta al Admin si el plazo de 8 días para informar CAEA está en riesgo de vencerse antes de que ocurra

## v2 Requirements

### Reportes & Auditoría

- Historial de liquidaciones por OS con varianza autorizado vs. cobrado
- Reportes ejecutivos exportables (comparativas entre períodos)
- Dashboard multi-profesional de estado de certificados (operador SaaS)

## Out of Scope

| Feature | Reason |
|---------|--------|
| `@afipsdk/afip.js` | Cloud proxy — dependencia externa obligatoria en app.afipsdk.com, costo por tenant, incompatible con modelo self-hosted |
| `@arcasdk/core` | Superset de raw SOAP (incluye `soap` npm con fallas conocidas contra AFIP); raw SOAP + axios es más predecible |
| Auto-fetch cotización BNA | BNA no tiene API oficial; scraping fragile y viola TOS |
| CAEA como path primario | RG 5782/2025 lo restringe a contingency-only desde junio 2026 — penalización >5% volumen |
| Batch multi-comprobante en FECAESolicitar | Constraints de header hacen unreliable con IVA mixto (OS + particular) |
| Portal submission OS (Webcred) | Requiere acuerdos comerciales individuales con cada OS |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AFIP-01 | Phase 12 | Complete |
| CERT-01 | Phase 12 | Complete |
| CERT-02 | Phase 12 | Complete |
| CERT-03 | Phase 12 | Complete |
| CERT-04 | Phase 12 | Complete |
| CAE-01 | Phase 13 | Complete |
| CAE-02 | Phase 14 | Complete |
| CAE-03 | Phase 14 | Complete |
| CAE-04 | Phase 14 | Complete |
| QR-01 | Phase 15 | Complete |
| QR-02 | Phase 15 | Pending |
| QR-03 | Phase 15 | Pending |
| CAEA-01 | Phase 16 | Pending |
| CAEA-02 | Phase 16 | Pending |
| CAEA-03 | Phase 16 | Pending |
| CAEA-04 | Phase 16 | Pending |

**Coverage:**
- v1.2 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 — traceability populated after roadmap creation*
