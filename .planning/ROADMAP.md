# Roadmap: CLINICAL

## Milestones

- ✅ **v1.0 CRM Conversión** — Fases 1–7 (shipped 2026-03-03)
- ✅ **v1.1 Vista del Facturador** — Fases 8–11 (shipped 2026-03-16)
- 🔄 **v1.2 AFIP Real** — Fases 12–19 (in progress)

## Phases

<details>
<summary>✅ v1.0 CRM Conversión (Fases 1–7) — SHIPPED 2026-03-03</summary>

- [x] Phase 1: Infraestructura Async (3/3 planes) — completado 2026-02-23
- [x] Phase 2: Log de Contactos + Lista de Acción (3/3 planes) — completado 2026-02-24
- [x] Phase 2.1: Fix SECRETARIA Contact Logging [INSERTED] (1/1 plan) — completado 2026-02-24
- [x] Phase 3: Presupuestos Completos (4/4 planes) — completado 2026-02-27
- [x] Phase 4: WhatsApp + Etapas CRM Automáticas (6/6 planes) — completado 2026-02-28
- [x] Phase 4.1: WA Critical Fixes [INSERTED] (1/1 plan) — completado 2026-03-02
- [x] Phase 5: Dashboard de Conversión (3/3 planes) — completado 2026-03-02
- [x] Phase 6: CRM Data Wiring Fixes [INSERTED] (1/1 plan) — completado 2026-03-02
- [x] Phase 7: UX + Security Hardening [INSERTED] (1/1 plan) — completado 2026-03-03

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Vista del Facturador (Fases 8–11) — SHIPPED 2026-03-16</summary>

- [x] Phase 8: Schema Foundation + AFIP Research (2/2 planes) — completado 2026-03-13
- [x] Phase 9: Backend API Layer (3/3 planes) — completado 2026-03-13
- [x] Phase 10: FACTURADOR Home Dashboard (2/2 planes) — completado 2026-03-14
- [x] Phase 11: Settlement Workflow (2/2 planes) — completado 2026-03-16

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

### v1.2 AFIP Real (Fases 12–16)

- [x] **Phase 12: Schema AFIP Extendido + Gestión de Certificados** — DB migration con modelos AFIP y UI completa de configuración de certificados por tenant (completed 2026-03-16)
- [x] **Phase 13: WSAA Token Service** — Access tickets reales con firma CMS in-process, cache Redis y mutex por CUIT (completed 2026-03-20)
- [x] **Phase 14: Emisión CAE Real (WSFEv1)** — FECAESolicitar con advisory lock, clasificación de errores y swap del DI token (completed 2026-03-21)
- [x] **Phase 15: QR AFIP + PDF + Frontend de Comprobantes** — QR embebido en PDF, display de CAE en UI, cotización BNA para USD (completed 2026-03-30)
- [x] **Phase 16: CAEA Contingency Mode** — Pre-fetch, fallback automático, FECAEAInformar con 72 reintentos y alertas de deadline (completed 2026-03-30)
- [x] **Phase 17: CAE Emission UX** — Hook `useEmitirFactura`, wiring del botón "Emitir Comprobante", polling de estado, y modal de errores AFIP en español (gap closure: CAE-02, CAE-03) (completed 2026-03-31)
- [x] **Phase 18: CAE-03 Error Display Fixes** — Corrige dos bugs lógicos que impiden que el panel de errores AFIP se renderice en cualquier ruta de error (gap closure: CAE-03) (completed 2026-03-31)
- [ ] **Phase 19: getCierreMensual facturaId Extension** — Extiende el backend para retornar `facturaId` en `getCierreMensual` y elimina el null cast en LiquidacionesTab (gap closure: CAE-02 secondary surface)

## Phase Details

### Phase 18: CAE-03 Error Display Fixes
**Goal**: El Facturador ve errores AFIP en español en el modal para ambas rutas de error — rechazo de negocio (UnrecoverableError) y agotamiento de reintentos transitorios con fallback CAEA
**Depends on**: Phase 17 (afipError field, onFailed hook, FacturaDetailModal error panel infrastructure ya existen)
**Requirements**: CAE-03
**Gap Closure:** Cierra CAE-03-BUG-1 y CAE-03-BUG-2 identificados por integration checker en audit v1.2
**Success Criteria** (what must be TRUE):
  1. Cuando AFIP rechaza con error de negocio (UnrecoverableError / error 10242), `afipError` se persiste en DB incluso si `job.attemptsMade < maxAttempts` — el Facturador ve el panel de error rojo en el modal
  2. Cuando se agotan los 5 reintentos transitorios y la factura cae en CAEA_PENDIENTE_INFORMAR, el panel de error sigue visible en FacturaDetailModal (condición expandida incluye ese estado)
  3. El test unitario del procesador confirma que `prisma.factura.update({ afipError })` se llama para la ruta UnrecoverableError
**Plans**: 2 plans
Plans:
- [ ] 18-01-PLAN.md — TDD RED: Add Test 9 (UnrecoverableError afipError-persist path) to processor spec
- [ ] 18-02-PLAN.md — BUG-1 fix (move prisma.update outside guard) + BUG-2 fix (expand modal condition) + human verify

### Phase 19: getCierreMensual facturaId Extension
**Goal**: El botón "Emitir Comprobante" en LiquidacionesTab y liquidaciones/page puede abrir FacturaDetailModal con el `facturaId` real en lugar de null
**Depends on**: Phase 17 (FacturaDetailModal y useEmitirFactura ya existen), Phase 18 (error display fixes)
**Requirements**: CAE-02 (secondary surface)
**Gap Closure:** Cierra la desviación CAE-02-PARTIAL — LiquidacionesTab/liquidaciones/page emite con facturaId=null porque getCierreMensual no retorna facturaId
**Success Criteria** (what must be TRUE):
  1. El endpoint/service `getCierreMensual` retorna `facturaId: string | null` en `detalleObrasSociales`
  2. `LiquidacionesTab.tsx` y `liquidaciones/page.tsx` pasan el `facturaId` real a FacturaDetailModal (no null cast)
  3. Cuando hay una factura existente, el modal carga los datos completos de la factura y permite emitir
**Plans**: 2 plans
Plans:
- [ ] 19-01-PLAN.md — TDD RED: Add getCierreMensual describe block with 3 failing unit tests
- [ ] 19-02-PLAN.md — GREEN: backend service extension + TypeScript type update + cast removal + human verify

### Phase 12: Schema AFIP Extendido + Gestión de Certificados
**Goal**: El Admin puede configurar el certificado digital y punto de venta por tenant, y el sistema almacena toda la infraestructura de datos AFIP lista para emisión real
**Depends on**: Phase 11 (schema v1.1 ya incluye CondicionIVA, MonedaFactura, LimiteFacturacionMensual)
**Requirements**: AFIP-01, CERT-01, CERT-02, CERT-03, CERT-04
**Success Criteria** (what must be TRUE):
  1. Admin puede subir certificado PEM y clave privada; el sistema rechaza el upload si el CUIT del cert CN no coincide con el CUIT registrado
  2. Admin puede configurar ambiente (HOMO/PROD) y punto de venta; el sistema valida que el ptoVta sea tipo RECE via FEParamGetPtosVenta antes de confirmar
  3. Facturador ve en su home un badge que indica el estado del certificado: OK, venciendo pronto, o no configurado
  4. Sistema envía email al Admin 30 y 60 días antes de que venza el certificado
  5. Al consultar la DB, los campos cae, caeFchVto, nroComprobante, qrData, ptoVta existen en Factura, y el modelo CaeaVigente y enum EstadoFactura.CAEA_PENDIENTE_INFORMAR existen en el schema
**Plans**: 4 plans
Plans:
- [ ] 12-01-PLAN.md — Prisma schema extension (all AFIP models + fields) + test spec scaffolds
- [x] 12-02-PLAN.md — AfipConfigModule backend (service, controller, 3 endpoints, module wiring)
- [ ] 12-03-PLAN.md — CertExpiryScheduler (@Cron daily, email alerts at 60d/30d, unit tests)
- [ ] 12-04-PLAN.md — Frontend: AfipConfigTab + hooks + Facturador badge + human verify
**Research flag**: None — direct Prisma migration + NestJS CRUD, patrón EncryptionService ya existe en WhatsappModule

### Phase 13: WSAA Token Service
**Goal**: El sistema obtiene y cachea Access Tickets de WSAA reales usando firma CMS in-process, listo para ser consumido por WSFEv1
**Depends on**: Phase 12 (ConfiguracionAFIP con cert+key encriptados debe existir en DB)
**Requirements**: CAE-01
**Success Criteria** (what must be TRUE):
  1. Al emitir un comprobante en homologacion, el sistema obtiene un Access Ticket real de wsaahomo.afip.gov.ar (respuesta con token + sign + expiry confirmada en logs)
  2. Si se hacen dos llamadas concurrentes para el mismo CUIT, solo una llega a WSAA; la segunda usa el ticket cacheado en Redis
  3. El ticket se almacena en Redis con clave afip_ta:{profesionalId}:{cuit}:{service} y TTL = expiry menos 5 minutos; una nueva instancia del servidor puede retomar el ticket sin llamar a WSAA
  4. Si el ticket está vigente y Redis lo devuelve, no se realiza ninguna llamada HTTP a WSAA (verificable en logs de red)
**Plans**: 2 plans
Plans:
- [x] 13-01-PLAN.md — WsaaModule core: interfaces, WsaaService (CMS signing + Redis cache + mutex), WsaaStubService, unit tests
- [x] 13-02-PLAN.md — Integration: rewire AfipConfigService to use WsaaService, eliminate openssl subprocess, register in AppModule
**Research flag**: Verificar URLs actuales de WSAA bajo dominio arca.gob.ar al momento de implementar (MEDIUM confidence — AFIP rebrandeado a ARCA)

### Phase 14: Emisión CAE Real (WSFEv1)
**Goal**: El Facturador puede emitir comprobantes electrónicos reales que retornan CAE y número de comprobante de AFIP, con errores explicados en español
**Depends on**: Phase 13 (WsaaService debe retornar tickets válidos)
**Requirements**: CAE-02, CAE-03, CAE-04
**Success Criteria** (what must be TRUE):
  1. Al emitir una factura en homologacion, la respuesta contiene un CAE real de 14 dígitos y un número de comprobante asignado por AFIP, ambos guardados en la fila Factura de la DB
  2. Si dos emisiones ocurren simultáneamente para el mismo CUIT+ptoVta+cbteTipo, la segunda espera el advisory lock y obtiene un número de comprobante secuencial correcto (sin duplicado)
  3. Si AFIP rechaza por error de negocio (ej. 10242 CondicionIVA inválida), el Facturador ve un modal con el mensaje en español y la factura va a DLQ sin reintentos
  4. Si AFIP falla por timeout o HTTP 5xx, el job reintenta con backoff exponencial y el Facturador no ve error hasta que se agoten los reintentos transitorios
  5. El DI token AFIP_SERVICE apunta a AfipRealService; AfipStubService sigue disponible activable por env var para desarrollo local
**Plans**: 4 plans
Plans:
- [ ] 14-01-PLAN.md — Wave 0: EMISION_PENDIENTE migration + AFIP_SERVICE constant + test scaffolds
- [ ] 14-02-PLAN.md — AfipRealService: WSFEv1 SOAP + advisory lock + AfipBusinessError/TransientError (CAE-02, CAE-03)
- [ ] 14-03-PLAN.md — CaeEmissionProcessor: BullMQ error classification — UnrecoverableError vs backoff (CAE-04)
- [ ] 14-04-PLAN.md — Module wiring: AFIP_SERVICE DI swap + POST /emitir endpoint + human verify
**Research flag**: WSFEv1 URLs confirmed non-migrated to arca.gob.ar as of 2026-03-20 — stored in env vars AFIP_WSFEV1_URL_HOMO/PROD with current afip.gov.ar defaults

### Phase 15: QR AFIP + PDF + Frontend de Comprobantes
**Goal**: El PDF de cada comprobante emitido incluye el QR obligatorio RG 5616/2024, y el Facturador puede ver el CAE y QR en la vista de detalle de la factura
**Depends on**: Phase 14 (CAE y nroComprobante deben existir en Factura antes de poder generar el QR)
**Requirements**: QR-01, QR-02, QR-03
**Success Criteria** (what must be TRUE):
  1. El PDF descargable de una factura emitida incluye un código QR que al ser escaneado abre la URL https://www.afip.gob.ar/fe/qr/?p= con el JSON base64 de 13 campos especificados en RG 5616/2024
  2. El Facturador puede ver en el detalle de la factura el número de CAE, la fecha de vencimiento del CAE, y el código QR renderizado como imagen
  3. Para facturas en USD, el Facturador puede ingresar manualmente la cotización BNA del día; la pantalla muestra un link directo a bna.com.ar para consultar el tipo de cambio
**Plans**: 4 plans
Plans:
- [x] 15-01-PLAN.md — qrcode install + FacturaPdfService + buildAfipQrUrl + AfipRealService qrData extension (QR-01)
- [x] 15-02-PLAN.md — Backend API: GET facturas/:id + GET facturas/:id/pdf + PATCH facturas/:id/tipo-cambio (QR-01, QR-02, QR-03)
- [x] 15-03-PLAN.md — Frontend: types + hooks + FacturaDetailModal + ComprobantesTab wiring (QR-02, QR-03)
- [x] 15-04-PLAN.md — Human verify: PDF QR scan + CAE display + USD tipoCambio flow (QR-01, QR-02, QR-03) — APPROVED 2026-03-30
**Research flag**: None — qrcode 1.5.4 API estable; integración PDFKit ya existe para presupuestos; patrón estándar

### Phase 16: CAEA Contingency Mode
**Goal**: Cuando ARCA no está disponible, el sistema asigna automáticamente un CAEA vigente a la factura y la informa a AFIP dentro del plazo de 8 días, con alerta proactiva si el plazo está en riesgo
**Depends on**: Phase 14 (el path CAE primario debe estar probado en produccion real antes de activar el fallback; RG 5782/2025 verificada en Boletín Oficial)
**Requirements**: CAEA-01, CAEA-02, CAEA-03, CAEA-04
**Success Criteria** (what must be TRUE):
  1. El cron bimensual (días 27 y 12 de cada mes a las 6:00) pre-fetcha y almacena el código CAEA vigente en CaeaVigente por tenant; si falla, reintenta antes del cierre del período
  2. Cuando el sistema detecta AfipUnavailableException durante la emisión, la factura queda con estado CAEA_PENDIENTE_INFORMAR y el CAEA vigente asignado, sin intervención del Facturador
  3. Dentro de los 8 días calendario posteriores al período CAEA, el job FECAEAInformar informa todas las facturas pendientes a AFIP; si AFIP confirma, el estado cambia a EMITIDA
  4. Si el plazo de 8 días está en riesgo de vencerse con facturas aún sin informar, el Admin recibe un email de alerta antes de que venza el deadline
**Plans**: TBD
**Research flag**: Verificar RG 5782/2025 en Boletín Oficial antes de comenzar implementacion — confirmar (a) fecha efectiva junio 2026, (b) definicion del umbral 5% de volumen, (c) ventana de 8 dias calendario; si algún parámetro difiere de fuentes comunitarias, actualizar diseño de CaeaService

### Phase 17: CAE Emission UX
**Goal**: El Facturador puede disparar la emisión de comprobantes desde la UI, ver el estado actualizado en tiempo real, y recibir mensajes de error AFIP legibles en español en un modal cuando la emisión es rechazada
**Depends on**: Phase 14 (POST /finanzas/facturas/:id/emitir debe existir), Phase 15 (FacturaDetailModal debe existir)
**Requirements**: CAE-02, CAE-03
**Gap Closure:** Cierra gaps de audit v1.2 — MISSING-01, MISSING-02, FLOW-BROKEN-01, FLOW-BROKEN-02; unblocks CAEA-02 reachability
**Success Criteria** (what must be TRUE):
  1. El Facturador hace click en "Emitir Comprobante" y el botón llama POST /finanzas/facturas/:id/emitir; la factura queda visible en estado EMISION_PENDIENTE inmediatamente
  2. Cuando el job BullMQ completa (EMITIDA o fallo), la UI refleja el nuevo estado sin recargar la página (polling o invalidación de query)
  3. Cuando AFIP rechaza con error de negocio (ej. 10242), el Facturador ve un modal con el `spanishMessage` en español — no un toast genérico
  4. El modal de error cubre al menos: resultado=R (error 10242), cert inválido, y cualquier `AfipBusinessError.spanishMessage` presente en el job `failedReason`
  5. El hook `useGenerarFacturaPDF` (stub muerto) es removido de `useFinanzas.ts`
**Plans**: 3 plans
Plans:
- [ ] 17-01-PLAN.md — Wave 0: Prisma migration afipError String? + PrismaService injection in processor + failing test (RED)
- [ ] 17-02-PLAN.md — Backend: onFailed persists afipError + FacturaDetailDto + getFacturaById propagation (GREEN)
- [ ] 17-03-PLAN.md — Frontend: useEmitirFactura + polling + FacturaDetailModal wiring + error panel + human verify

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Infraestructura Async | v1.0 | 3/3 | Complete | 2026-02-23 |
| 2. Log de Contactos + Lista de Acción | v1.0 | 3/3 | Complete | 2026-02-24 |
| 2.1. Fix SECRETARIA Contact Logging | v1.0 | 1/1 | Complete | 2026-02-24 |
| 3. Presupuestos Completos | v1.0 | 4/4 | Complete | 2026-02-27 |
| 4. WhatsApp + CRM Automáticas | v1.0 | 6/6 | Complete | 2026-02-28 |
| 4.1. WA Critical Fixes | v1.0 | 1/1 | Complete | 2026-03-02 |
| 5. Dashboard de Conversión | v1.0 | 3/3 | Complete | 2026-03-02 |
| 6. CRM Data Wiring Fixes | v1.0 | 1/1 | Complete | 2026-03-02 |
| 7. UX + Security Hardening | v1.0 | 1/1 | Complete | 2026-03-03 |
| 8. Schema Foundation + AFIP Research | v1.1 | 2/2 | Complete | 2026-03-13 |
| 9. Backend API Layer | v1.1 | 3/3 | Complete | 2026-03-13 |
| 10. FACTURADOR Home Dashboard | v1.1 | 2/2 | Complete | 2026-03-14 |
| 11. Settlement Workflow | v1.1 | 2/2 | Complete | 2026-03-16 |
| 12. Schema AFIP Extendido + Certificados | v1.2 | Complete    | 2026-03-16 | 2026-03-16 |
| 13. WSAA Token Service | 2/2 | Complete    | 2026-03-20 | - |
| 14. Emisión CAE Real (WSFEv1) | 4/4 | Complete    | 2026-03-21 | - |
| 15. QR AFIP + PDF + Frontend | v1.2 | Complete    | 2026-03-30 | 2026-03-30 |
| 16. CAEA Contingency Mode | 3/3 | Complete    | 2026-03-30 | - |
| 17. CAE Emission UX | 3/3 | Complete    | 2026-03-31 | - |
| 18. CAE-03 Error Display Fixes | 2/2 | Complete    | 2026-03-31 | - |
| 19. getCierreMensual facturaId Extension | 1/2 | In Progress|  | - |

---
*Roadmap initialized: 2026-02-23 | v1.0 shipped: 2026-03-03 | v1.1 shipped: 2026-03-16 | v1.2 started: 2026-03-16*
