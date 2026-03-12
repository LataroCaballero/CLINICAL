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

### Active

- [ ] Dashboard dedicado para el rol FACTURADOR con KPIs de facturación mensual
- [ ] Límite mensual de facturación configurable por el facturador
- [ ] Liquidación de prácticas de obra social con corrección de monto por práctica
- [ ] Flujo de cierre de lote de liquidación (LiquidacionObraSocial correctamente creada)
- [ ] Research e informe de integración AFIP para emisión de comprobantes desde la plataforma

### Deferred

- [ ] Automatizaciones de seguimiento: triggers basados en tiempo/etapa (ej. "30 días sin respuesta → mensaje automático")
- [ ] Módulos financieros optimizados e interconectados con CRM
- [ ] Página pública del paciente: historial, presupuestos, documentos
- [ ] Módulo de estadísticas ejecutivas (reportes exportables, comparativas)

### Out of Scope

- App móvil nativa — web-first, mobile a futuro
- Chat en tiempo real entre pacientes y clínica — WhatsApp cubre este caso por ahora
- Facturación electrónica / AFIP — requiere dominio contable específico, fuera de scope actual
- Tiers de suscripción con feature flags — deferido a cuando haya clientes reales con necesidades diferenciadas

## Context

**Estado actual (post-v1.0):** El módulo CRM de conversión está completo y funcional. La plataforma puede: registrar interacciones con atribución, priorizar seguimiento, crear y enviar presupuestos (PDF/email/WhatsApp), procesar webhooks Meta con HMAC, y mostrar un dashboard de conversión completo (embudo, KPIs, pérdidas, pipeline income, performance del coordinador). 32/32 requisitos del milestone v1.0 satisfechos en 8 días de desarrollo.

**Stack:** NestJS + Prisma + PostgreSQL (backend) | Next.js 16 + React 19 + TypeScript (frontend) | BullMQ + Redis (async) | WhatsApp Cloud API.

**Deuda técnica post-v1.0:**
- EncryptionService dev fallback key — configurar `ENCRYPTION_KEY` en .env de producción antes de deploy
- `console.log('DTO RECIBIDO')` en `pacientes.service.ts:33` — expone PII en logs
- SMTP password decryption no implementada per-tenant (funcional vía env vars)
- TypeScript strict mode desactivado, cobertura de tests <6%

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

## Current Milestone: v1.1 Vista del Facturador

**Goal:** Darle al rol FACTURADOR una vista propia y un flujo completo de liquidación de obras sociales con control de límite mensual de facturación.

**Target features:**
- Dashboard propio del FACTURADOR con KPIs de límite mensual y prácticas pendientes
- Límite mensual de facturación configurable (proviene del contador)
- Liquidación de prácticas con edición de monto real pagado por la OS por práctica
- Cierre de lote de liquidación (crea LiquidacionObraSocial correctamente)
- Research de integración AFIP (documentar para milestone futuro)

---
*Last updated: 2026-03-12 after v1.1 milestone start — Vista del Facturador*
