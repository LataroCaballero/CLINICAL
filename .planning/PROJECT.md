# CLINICAL — Plataforma SaaS para Clínicas de Cirugía Estética

## What This Is

Plataforma SaaS multi-tenant de gestión de clínicas, orientada especialmente a cirujanos plásticos y estéticos. Cubre la administración completa de la clínica (pacientes, turnos, historia clínica, finanzas, stock) con un diferencial competitivo en **conversión de pacientes en cirugías**: el módulo CRM permite registrar interacciones, enviar presupuestos con PDF, comunicarse por WhatsApp, y ver el dashboard de conversión completo (embudo, KPIs, motivos de pérdida, performance del coordinador).

El producto se vende por suscripción con tiers: el tier base incluye gestión de pacientes, turnos, estadísticas y CRM de conversión; los tiers superiores agregan módulos financieros y reportes ejecutivos.

## Core Value

**Que un cirujano plástico cierre más cirugías** — el sistema debe hacer visible qué pacientes seguir, cuándo contactarlos y cómo, de la manera más automatizada y simple posible para profesionales sin background en marketing o sistemas.

## Requirements

### Validated

- ✓ Autenticación con JWT y roles (ADMIN, PROFESIONAL, SECRETARIA, PACIENTE, FACTURADOR) — existente
- ✓ Gestión de pacientes (CRUD, búsqueda, drawer con datos completos) — existente
- ✓ Calendario de turnos con estados y sesión en vivo (LiveTurno) — existente
- ✓ Historia clínica con templates y entradas por turno — existente
- ✓ Gestión de obras sociales y planes — existente
- ✓ Módulos financieros (presupuestos, pagos, cuentas corrientes, stock) — existente
- ✓ CRM base: etapas (EtapaCRM), temperatura de paciente, kanban board, scheduler de seguimiento diario — existente
- ✓ Filtrado por contexto profesional (multi-profesional en misma clínica) — existente
- ✓ Reportes operativos y financieros base — existente
- ✓ Infraestructura BullMQ + Redis con retry exponencial — v1.0
- ✓ Credenciales WABA per-tenant con cifrado AES-256-GCM — v1.0
- ✓ Consentimiento WhatsApp (whatsappOptIn) por paciente con timestamp — v1.0
- ✓ Registro estado de entrega de mensajes WhatsApp — v1.0
- ✓ Log de contactos (llamada/mensaje/presencial) con atribución de coordinador — v1.0
- ✓ Historial completo de interacciones con expansión in-place — v1.0
- ✓ Actualización CRM+temperatura al registrar interacción en el mismo paso — v1.0
- ✓ Indicador de días sin contacto por paciente — v1.0
- ✓ Lista de acción diaria con scoring automático (días × temp × etapa) — v1.0
- ✓ Prioridad automática en lista de acción — v1.0
- ✓ Registrar interacción desde lista de acción (incluye rol SECRETARIA) — v1.0
- ✓ Pacientes contactados hoy desaparecen de la lista hasta mañana — v1.0
- ✓ Presupuestos con ítems, montos, moneda (ARS/USD) y fecha de validez — v1.0
- ✓ PDF del presupuesto con branding de la clínica (logo, profesional, desglose) — v1.0
- ✓ Envío de presupuesto por email con PDF adjunto y link de aceptación — v1.0
- ✓ Envío de presupuesto por WhatsApp como documento PDF — v1.0
- ✓ Estados de presupuesto: borrador/enviado/aceptado/rechazado/vencido — v1.0
- ✓ Al enviar presupuesto → CRM sube a PRESUPUESTO_ENVIADO automáticamente — v1.0
- ✓ Al aceptar presupuesto → CRM cierra como CONFIRMADO automáticamente — v1.0
- ✓ Al rechazar presupuesto → captura motivo de pérdida y baja a PERDIDO — v1.0
- ✓ Envío de mensajes WhatsApp desde perfil/turno/presupuesto con templates Meta — v1.0
- ✓ Estado de entrega por mensaje (enviado/entregado/leído/fallido) en tiempo real — v1.0
- ✓ Mensajes inbound de pacientes → log de contactos automático — v1.0
- ✓ Webhook Meta con validación HMAC-SHA256 — v1.0
- ✓ Retry de mensaje fallido — v1.0
- ✓ Auto TURNO_AGENDADO al crear turno para paciente sin etapa CRM — v1.0
- ✓ Auto CONSULTADO/PROCEDIMIENTO_REALIZADO al cerrar sesión (LiveTurno) — v1.0
- ✓ Auto PRESUPUESTO_ENVIADO al enviar presupuesto — v1.0
- ✓ Auto CONFIRMADO al aceptar presupuesto — v1.0
- ✓ Inbound WA sube temperatura a CALIENTE automáticamente — v1.0
- ✓ Dashboard: embudo 6 etapas con tasas de paso (incl. PROCEDIMIENTO_REALIZADO) — v1.0
- ✓ Dashboard: ingreso potencial del pipeline (presupuestos ENVIADOS de pacientes CALIENTES) — v1.0
- ✓ Dashboard: motivos de pérdida con porcentajes — v1.0
- ✓ Dashboard: KPIs por período (nuevos, confirmados, tasa de conversión) — v1.0
- ✓ Dashboard: performance del coordinador con atribución real por usuario — v1.0
- ✓ Schema DB AFIP-ready: CondicionIVA/MonedaFactura enums, LimiteFacturacionMensual model, PracticaRealizada audit fields — v1.1
- ✓ Documento de integración AFIP/ARCA (774 líneas): WSAA, WSFEv1, CAEA, RG 5616/2024, contrato TypeScript EmitirComprobante — v1.1
- ✓ Capa backend de facturación: getMonthBoundariesART() UTC-3, 5 FinanzasService methods, 7 endpoints (ADMIN+FACTURADOR), AfipStubService — v1.1
- ✓ Dashboard FACTURADOR: routing exclusivo `/dashboard/facturador`, KPIs por OS, barra progreso límite mensual, configuración de límite — v1.1
- ✓ Flujo de liquidación: edición inline montoPagado, CerrarLoteModal, transacción atómica LiquidacionObraSocial — v1.1

### Active

- [ ] Emisión de comprobantes electrónicos AFIP/ARCA reales (CAE real, certificado por tenant) — v1.2
- [ ] CAEA contingency mode para cuando ARCA no responde — v1.2
- [ ] QR AFIP en PDF de comprobantes — v1.2
- [ ] Reportes ejecutivos exportables (comparativas entre períodos) — v2
- [ ] Historial de liquidaciones por OS con comparativa autorizado vs. pagado — v2

### Deferred

- [ ] Automatizaciones de seguimiento: triggers basados en tiempo/etapa (ej. "30 días sin respuesta → mensaje automático")
- [ ] Módulos financieros optimizados e interconectados con CRM
- [ ] Página pública del paciente: historial, presupuestos, documentos
- [ ] Módulo de estadísticas ejecutivas (reportes exportables, comparativas)

### Out of Scope

- App móvil nativa — web-first, mobile a futuro
- Chat en tiempo real entre pacientes y clínica — WhatsApp cubre este caso por ahora
- Facturación electrónica AFIP real en v1.1 — completada la investigación, implementación real planificada para v1.2
- Tiers de suscripción con feature flags — deferido a cuando haya clientes reales con necesidades diferenciadas

## Context

**Estado actual (post-v1.1):** El módulo FACTURADOR está completo y funcional. Además del CRM de conversión completo (v1.0), el sistema ahora permite al rol FACTURADOR: ver prácticas pendientes agrupadas por obra social, configurar el límite mensual de facturación, editar el monto real cobrado por la OS por práctica, y cerrar lotes de liquidación en transacciones atómicas. El schema DB está preparado para AFIP (CondicionIVA, MonedaFactura, LimiteFacturacionMensual) y existe un documento de referencia técnica completo para la implementación real en v1.2. 13/13 requisitos del milestone v1.1 satisfechos en 3 días de desarrollo.

**Stack:** NestJS + Prisma + PostgreSQL (backend) | Next.js 16 + React 19 + TypeScript (frontend) | BullMQ + Redis (async) | WhatsApp Cloud API.

**Deuda técnica acumulada (post-v1.1):**
- EncryptionService dev fallback key — configurar `ENCRYPTION_KEY` en .env de producción antes de deploy
- `console.log('DTO RECIBIDO')` en `pacientes.service.ts:33` — expone PII en logs
- SMTP password decryption no implementada per-tenant (funcional vía env vars)
- TypeScript strict mode desactivado, cobertura de tests <6%
- marcarPracticasPagadas deprecado con cuerpo intacto — limpiar cuando se confirme sin callers externos
- IVA treatment matrix para cirugía estética en obras sociales debe validarse con contador antes de v1.2
- RG 5782/2025 (CAEA contingency-only desde junio 2026) — verificar en Boletín Oficial antes de implementar CAEA en v1.2

**Usuarios clave:**
- **Profesional (cirujano):** ve dashboard de conversión, aprueba acciones. No técnico.
- **Secretaria/coordinadora:** opera el CRM día a día, registra interacciones, envía presupuestos por WA/email.
- **Admin:** gestión completa, acceso a finanzas y reportes.

**Restricción de UX crítica:** la plataforma debe ser operada por personas sin conocimientos de marketing o sistemas. Todo debe ser automatizado, sugerido y en lenguaje simple.

## Constraints

- **Tech Stack:** NestJS + Prisma + PostgreSQL (backend), Next.js 16 + React 19 + TypeScript (frontend) — no cambiar
- **Multi-tenancy:** arquitectura actual filtra por profesional; la multi-tenancy por clínica/tenant debe considerarse en cada nuevo modelo
- **WhatsApp:** requiere aprobación Meta para WhatsApp Business API — tiempo de espera; email es fallback implementado
- **Tiers de suscripción:** nuevos features deben ser flaggeables por tier

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| CRM antes que finanzas | El diferencial de venta es la conversión, no las finanzas | ✓ Correcto — v1.0 entregó CRM completo |
| WhatsApp Business API (no links/templates externos) | Experiencia integrada, aunque tiene fricción de aprobación Meta | ✓ Correcto — integración completa implementada |
| Web-first, no app móvil | Velocidad de desarrollo, mercado objetivo usa desktop en clínica | ✓ Correcto — sin demanda de móvil hasta ahora |
| Decimal phases para gap-closure insertados | Permite cerrar gaps sin renumerar phases existentes | ✓ Correcto — 4 decimal phases (2.1, 4.1, 6, 7) cerraron todos los gaps del audit |
| SECRETARIA null-guard pattern (Phase 2.1) | Resolver profesionalId via DB lookup cuando el JWT no lo trae | ✓ Correcto — patrón replicado exitosamente en Phase 4.1 |
| Email channel removido de SendWAMessageModal | 404 persistente, mejor UX con modal dedicado (EnviarPresupuestoModal) | ✓ Correcto — modal WA-only es más claro |
| HMAC-SHA256 en webhook Meta (Phase 7) | Seguridad contra replay attacks y payloads falsificados | ✓ Correcto — dev fallback para testing local preservado |
| Raw SOAP/XML para AFIP (no library) — v1.1 | afipjs/afip-apis unmaintained, sin tipos TS | ✓ Correcto — 774-line reference doc cubre todo sin dependencia |
| ART offset UTC-3 hardcoded (no DST) — v1.1 | Argentina sin DST, más simple que librería timezone | ✓ Correcto — Date.UTC() evita midnight UTC pitfall |
| FACTURADOR no tiene Profesional record — v1.1 | Rol de billing/contabilidad distinto al profesional médico | ✓ Correcto — profesionalId siempre parámetro explícito |
| Prisma migrate deploy (no migrate dev) — v1.1 | Entorno no interactivo (no TTY), deploy diseñado para CI/prod | ✓ Correcto — migration SQL hand-written con backfill seguro |
| Montos server-side en transacción (no client totals) — v1.1 | Prevenir manipulación de totales financieros | ✓ Correcto — montoTotal calculado dentro de $transaction |

## Shipped: v1.1 Vista del Facturador ✅

13/13 requisitos completados en 3 días (2026-03-13 → 2026-03-16). Ver `.planning/milestones/v1.1-ROADMAP.md` para detalles completos.

## Next Milestone: v1.2 AFIP Real

**Suggested goal:** Emitir comprobantes electrónicos reales desde la plataforma usando AFIP/ARCA (CAE real, certificado por tenant, advisory lock en numeración).

**Foundation ready:**
- `.planning/research/AFIP-INTEGRATION.md` — referencia técnica completa con 6 secciones
- `AfipStubService` — interfaz `emitirComprobante()` lista para swap-out con implementación real
- Schema DB con `CondicionIVA`, `MonedaFactura`, `Factura.condicionIVAReceptor`, `Factura.tipoCambio`

Start with `/gsd:new-milestone` to define requirements and roadmap.

---
*Last updated: 2026-03-16 after v1.1 milestone — Vista del Facturador*
