# CLINICAL — Plataforma SaaS para Clínicas de Cirugía Estética

## What This Is

Plataforma SaaS multi-tenant de gestión de clínicas, orientada especialmente a cirujanos plásticos y estéticos. Cubre la administración completa de la clínica (pacientes, turnos, historia clínica, finanzas, stock) y está pivotando su diferencial hacia la **conversión de pacientes en cirugías**: el módulo CRM ayuda a los profesionales a seguir, calentar y cerrar consultas como operaciones reales.

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
- ✓ Módulos financieros (presupuestos, pagos, cuentas corrientes, stock) — existente (pendiente optimización)
- ✓ CRM base: etapas (EtapaCRM), temperatura de paciente, kanban board, scheduler de seguimiento diario — existente
- ✓ Dashboard con KPIs CRM y widget embudo de conversión — existente
- ✓ Filtrado por contexto profesional (multi-profesional en misma clínica) — existente
- ✓ Reportes operativos y financieros base — existente

### Active

- [ ] Integración WhatsApp Business API: enviar mensajes a pacientes desde la plataforma
- [ ] Flujo completo de presupuestos: crear, enviar (WhatsApp/email), trackear estado, generar PDF
- [ ] Automatizaciones de seguimiento: triggers basados en tiempo/etapa (ej. "30 días sin respuesta → mensaje automático")
- [ ] Dashboard ejecutivo de conversión: métricas clave (tasa de cierre, pacientes por etapa, ingresos potenciales)
- [ ] Lista de acción diaria: "a quién contactar hoy" con contexto del paciente y acciones en un clic
- [ ] Motivos de pérdida y analytics: por qué se pierden pacientes, en qué etapa, para mejora continua
- [ ] Módulos bien interconectados: presupuesto → CRM stage, turno → temperatura, pago → cierre automático

### Out of Scope

- App móvil nativa — web-first, mobile a futuro
- Chat en tiempo real entre pacientes y clínica — WhatsApp cubre este caso por ahora
- Módulos financieros reestructurados profundamente — prioridad CRM primero, finanzas en siguiente milestone
- Facturación electrónica / AFIP — requiere dominio contable específico, fuera de scope actual

## Context

**Estado actual:** MVP funcional con todas las áreas cubiertas pero sin pulir para venta. El código existe y funciona, pero el UX no está optimizado para usuarios no técnicos (cirujanos), los módulos no están bien interconectados, y las funcionalidades clave de conversión (WhatsApp, presupuestos completos, automatizaciones) están incompletas o son stubs.

**Deuda técnica relevante:** servicios backend grandes (600-700+ líneas), TypeScript strict mode desactivado, cobertura de tests <6%, algunos TODOs críticos en endpoints de presupuestos y exports. No afectan la funcionalidad hoy pero limitan la velocidad de desarrollo seguro.

**Usuarios clave:**
- **Profesional (cirujano):** ve su panel, dashboard de conversión, aprueba acciones. No es técnico.
- **Secretaria/coordinadora:** opera el CRM día a día, gestiona turnos y pacientes, ejecuta seguimientos.
- **Admin:** gestión completa, acceso a finanzas y reportes.

**Restricción de UX crítica:** la plataforma debe ser operada por personas sin conocimientos de marketing o sistemas. Todo debe ser automatizado, sugerido y en lenguaje simple.

## Constraints

- **Tech Stack:** NestJS + Prisma + PostgreSQL (backend), Next.js 16 + React 19 + TypeScript (frontend) — no cambiar
- **Multi-tenancy:** arquitectura actual filtra por profesional; la multi-tenancy por clínica/tenant debe considerarse en cada nuevo modelo
- **WhatsApp:** requiere aprobación Meta para WhatsApp Business API — puede tener tiempo de espera; planificar alternativa email como fallback
- **Tiers de suscripción:** nuevos features deben ser flaggeables por tier; módulos financieros son tier medio/alto

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| CRM antes que finanzas | El diferencial de venta es la conversión, no las finanzas | — Pending |
| WhatsApp Business API (no links/templates) | Experiencia integrada, no parches — aunque tiene fricción de aprobación | — Pending |
| Web-first, no app móvil | Velocidad de desarrollo, el mercado objetivo usa desktop en clínica | — Pending |
| Tiers de suscripción con feature flags | Permite vender base sin financiero a clínicas pequeñas | — Pending |

---
*Last updated: 2026-02-21 after initialization*
