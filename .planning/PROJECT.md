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
- ✓ Emisión de comprobantes electrónicos AFIP/ARCA reales (CAE real, certificado por tenant) — v1.2
- ✓ CAEA contingency mode para cuando ARCA no responde — v1.2
- ✓ QR AFIP en PDF de comprobantes (RG 5616/2024, 13 campos) — v1.2
- ✓ Errores AFIP en español en modal con error panel (BUG-1 + BUG-2 corregidos) — v1.2
- ✓ Widget agenda-first en dashboard: hoy por defecto, navegación día a día, métricas del día (total/finalizados/cirugías/ausentes/cancelados) — v1.3
- ✓ Botón "Ver HC" por turno FINALIZADO en días pasados/hoy → modal con entradas read-only y indicador legal — v1.3
- ✓ Modal HC con tipo selector (Primera Consulta / Pre Quirúrgico / Control / Práctica) usando mismo formato que LiveTurno — v1.3
- ✓ Entradas HC retroactivas: fechadas al día histórico del turno, no a hoy — v1.3
- ✓ Backend endpoints de turnos corregidos: `diagnostico`/`tratamiento` en agenda, `esCirugia`/`entradaHCId` en próximos, `fecha` opcional en creación de entrada HC — v1.3

### Active

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

**Estado actual (post-v1.3):** El widget de dashboard del profesional fue reescrito con enfoque agenda-first. El profesional navega día a día, ve métricas completas del día, y puede revisar y agregar entradas de HC retroactivas a cualquier turno finalizado usando el mismo formato que LiveTurno. El módulo de facturación electrónica AFIP/ARCA (v1.2) permanece completo. 11/11 requisitos del milestone v1.3 satisfechos.

**Stack:** NestJS + Prisma + PostgreSQL (backend) | Next.js 16 + React 19 + TypeScript (frontend) | BullMQ + Redis (async) | WhatsApp Cloud API | node-forge (firma CMS WSAA) | qrcode 1.5.4 + PDFKit (QR en PDF).

**Deuda técnica acumulada (post-v1.2):**
- EncryptionService dev fallback key — configurar `ENCRYPTION_KEY` en .env de producción antes de deploy
- `console.log('DTO RECIBIDO')` en `pacientes.service.ts:33` — expone PII en logs
- SMTP password decryption no implementada per-tenant (funcional vía env vars)
- TypeScript strict mode desactivado, cobertura de tests <6%
- marcarPracticasPagadas deprecado con cuerpo intacto — limpiar cuando se confirme sin callers externos
- IVA alicuota ID 5 (21%) hardcoded en FECAESolicitar — production IVA matrix (mixed rates, exempt) necesaria antes de go-live
- RG 5782/2025 CAEA: verificar umbral 5% volumen y ventana 8 días en Boletín Oficial antes de activar en producción
- Human verification pendiente en staging: BullMQ async lifecycle E2E, CAEA fallback con Redis real, SMTP delivery
- Phase 11 VERIFICATION.md faltante (proceso, no funcional)

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
| node-forge 1.3.3 para firma CMS in-process — v1.2 | Evita openssl subprocess + /tmp key exposure | ✓ Correcto — firma funcional en homologación, no deps externas |
| Redis cache WSAA desde commit 1 (no Map en memoria) — v1.2 | Map no sobrevive horizontal scale | ✓ Correcto — TTL expiry-5min, mutex por CUIT |
| pg_advisory_xact_lock dentro de $transaction(45000ms) — v1.2 | Default 5s insuficiente para SLA AFIP 30s | ✓ Correcto — serialización CAE sin duplicados de numeración |
| AfipBusinessError → DLQ inmediato (no retry) — v1.2 | Error 10242 y resultado=R nunca se resuelven reintentando | ✓ Correcto — UnrecoverableError evita 5 reintentos inútiles |
| QR data como URL string en Factura.qrData — v1.2 | Re-renderizable si spec AFIP cambia, no blob PNG inmutable | ✓ Correcto — buildAfipQrUrl() re-ejecutable |
| CAEA como fallback únicamente — v1.2 | RG 5782/2025 lo restringe desde junio 2026 | ✓ Correcto — path primario siempre CAE; CAEA solo en AfipUnavailableException |
| FECAEAInformar + deadline alerts en mismo milestone — v1.2 | CAEA sin inform tracking es riesgo regulatorio (multas) | ✓ Correcto — 72 reintentos en 8 días + email alert antes de vencimiento |
| afipError persist incondicional en onFailed (BUG-1 fix) — v1.2 | Guard attemptsMade >= maxAttempts impedía persist para UnrecoverableError (attemptsMade=1) | ✓ Correcto — update antes del guard; Test 9 GREEN |
| Modal condition: EMISION_PENDIENTE \|\| CAEA_PENDIENTE_INFORMAR (BUG-2 fix) — v1.2 | EMISION_PENDIENTE solo dejaba error invisible tras CAEA fallback | ✓ Correcto — ambas rutas de error muestran panel rojo |
| Single `selectedDate` state en UpcomingAppointments — v1.3 | Dual `dateIndex`+`pickedDate` creaba modo-switching complejo y edge cases | ✓ Correcto — elimina condición `pickedDate` en métricas y Ver HC |
| `isHoyOPasado = isToday \|\| isPast` como único gate — v1.3 | Gate simple y declarativo en lugar de múltiples condiciones distribuidas | ✓ Correcto — métricas y Ver HC con una sola condición |
| Future date boundary: `setHours(23,59,59,999)` — v1.3 | Hoy no debe rechazarse como fecha futura en entradas HC | ✓ Correcto — patrón replicado verbatim en ambos endpoints HC |

## Shipped: v1.1 Vista del Facturador ✅

13/13 requisitos completados en 3 días (2026-03-13 → 2026-03-16). Ver `.planning/milestones/v1.1-ROADMAP.md` para detalles completos.

## Shipped: v1.2 AFIP Real ✅

16/16 requisitos completados en 50 días (2026-02-09 → 2026-03-31). 8 fases, 24 planes. Ver `.planning/milestones/v1.2-ROADMAP.md` para detalles completos.

## Shipped: v1.3 Historial de Consultas ✅

11/11 requisitos completados en 7 días (2026-04-02 → 2026-04-09). 2 fases, 4 planes. Ver `.planning/milestones/v1.3-ROADMAP.md` para detalles completos.

## Next Milestone: v2.0 (TBD)

Planning pendiente. Candidatos para el próximo milestone:
- Reportes ejecutivos exportables (comparativas entre períodos)
- Historial de liquidaciones por OS con comparativa autorizado vs. pagado
- Dashboard multi-profesional de estado de certificados (SaaS admin)
- IVA matrix para cirugía estética (blocker de go-live AFIP producción)

---
*Last updated: 2026-04-13 after v1.3 milestone — Historial de Consultas*
