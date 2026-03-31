# Milestones

## v1.2 AFIP Real (Shipped: 2026-03-31)

**Phases completed:** 8 phases (12–19), 24 plans
**Stats:** 50 días (2026-02-09 → 2026-03-31) | 399 archivos | +70,242 líneas | ~82K LOC TypeScript total

**Key accomplishments:**
1. Schema AFIP completo por tenant: ConfiguracionAFIP (cert+key AES-256-GCM), CaeaVigente, AFIP fields en Factura, cert expiry email scheduler
2. WSAA Token Service: firma CMS in-process con node-forge, Redis cache con mutex por CUIT — elimina openssl subprocess y exposición de clave en /tmp
3. Emisión CAE real via WSFEv1: pg_advisory_xact_lock dentro de $transaction(45s), AfipBusinessError → DLQ inmediato, AfipTransientError → backoff exponencial
4. QR AFIP obligatorio RG 5616/2024: PDF con QR escaneable, FacturaDetailModal con CAE + QR + USD tipoCambio con link BNA
5. CAEA contingency mode: cron bimensual prefetch, fallback automático a CAEA_PENDIENTE_INFORMAR, FECAEAInformar 72 reintentos en ventana 8 días, alertas de deadline
6. CAE Emission UX + error display: useEmitirFactura, polling TanStack Query, panel de errores AFIP en español (2 logic bugs del audit corregidos)

---

## v1.1 Vista del Facturador (Shipped: 2026-03-16)

**Phases completed:** 4 phases (8–11), 9 plans
**Stats:** 3 días (2026-03-13 → 2026-03-16) | 47 archivos | +7,174 líneas

**Key accomplishments:**
1. Schema DB extendido con tipos AFIP-ready (CondicionIVA, MonedaFactura), modelo LimiteFacturacionMensual y campos de auditoría en PracticaRealizada vía migración hand-written segura
2. Documento de referencia AFIP/ARCA (774 líneas) con contrato TypeScript EmitirComprobante, patrones WSAA, WSFEv1, CAEA y advisory lock para CAE — listo para implementación real en v1.2
3. Capa backend de facturación: getMonthBoundariesART() UTC-3 + 5 métodos FinanzasService + 7 endpoints nuevos (ADMIN+FACTURADOR) + AfipStubService tipado
4. Routing exclusivo para FACTURADOR: `/dashboard/facturador` con redirect automático, KPI cards de prácticas pendientes por OS, barra de progreso límite mensual, e input de configuración
5. Flujo de liquidación completo: edición inline de montoPagado por práctica, navegación por OS, CerrarLoteModal con confirmación, transacción atómica que crea LiquidacionObraSocial y marca prácticas como PAGADO

---

## v1.0 CRM Conversion (Shipped: 2026-03-03)

**Phases completed:** 9 phases, 23 plans, 9 tasks

**Stats:** 114 commits | 163 archivos | +23,597 líneas | 8 días (2026-02-23 → 2026-03-02)

**Key accomplishments:**
1. Infraestructura BullMQ + Redis con retry exponencial y credenciales WABA cifradas AES-256-GCM por tenant
2. Sistema de log de contactos con scoring automático de prioridad y Lista de Acción diaria del coordinador
3. Presupuestos completos: PDF con branding, envío por email, página pública de aceptación/rechazo con token, CRM auto-transitions
4. Integración WhatsApp Cloud API: templates, mensajes libres, webhook Meta con HMAC-SHA256, hilo de mensajes con delivery status, 3 puntos de envío, null-guard para rol SECRETARIA
5. Dashboard de conversión: embudo 6 etapas con tasas de paso, KPIs por período, motivos de pérdida, pipeline income, performance del coordinador con atribución real
6. 4 fases de gap-closure (2.1, 4.1, 6, 7): SECRETARIA FK fix, email-channel removal, registradoPorId attribution, PROCEDIMIENTO_REALIZADO en funnel, historial completo de contactos

**Known tech debt:**
- EncryptionService dev fallback key — requiere ENCRYPTION_KEY en .env de producción
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
- SMTP password decryption no implementada per-tenant

---

