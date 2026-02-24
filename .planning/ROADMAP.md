# Roadmap: CLINICAL — Milestone CRM Conversión v1

## Overview

Este milestone transforma el CRM base existente (Kanban, temperatura, scheduler) en una herramienta operativa completa para coordinar la conversión de pacientes en cirugías. La construcción sigue un orden dictado por dependencias técnicas y externas: primero la infraestructura async que todo lo demás necesita, luego las funcionalidades sin dependencias externas (log + lista de acción, presupuestos), luego la integración WhatsApp con sus requerimientos de aprobación Meta, y finalmente el dashboard que agrega todo el trabajo anterior en inteligencia accionable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Infraestructura Async** - BullMQ + Redis + schema de consentimiento y credenciales multi-tenant
- [x] **Phase 2: Log de Contactos + Lista de Accion** - Registro de interacciones y workflow diario del coordinador (completed 2026-02-24)
- [x] **Phase 2.1: Fix SECRETARIA Contact Logging** [INSERTED] — Gap closure: null profesionalId FK para rol SECRETARIA (completed 2026-02-24)
- [ ] **Phase 3: Presupuestos Completos** - PDF con branding, entrega por email, estados y transiciones CRM automáticas
- [ ] **Phase 4: WhatsApp + Etapas CRM Automaticas** - Integración mensajeria module y wiring completo de eventos CRM
- [ ] **Phase 5: Dashboard de Conversion** - Embudo, ingresos potenciales, motivos de pérdida y performance del coordinador

## Phase Details

### Phase 1: Infraestructura Async
**Goal**: La plataforma puede ejecutar trabajos asincrónicos confiables y almacena el consentimiento WhatsApp y credenciales WABA por tenant, antes de que se escriba una sola línea de lógica de envío
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. Un job encolado en BullMQ se ejecuta, reintenta ante fallo y persiste ante reinicio del servidor
  2. Cada paciente tiene campo `whatsappOptIn` visible y editable en su perfil, con timestamp de aceptación registrado
  3. La configuración de WABA (número, API key) se almacena por profesional/clínica, no compartida entre tenants
  4. Cada mensaje WhatsApp enviado queda registrado en base de datos con estado inicial "pendiente"
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — BullMQ + Redis setup en NestJS: módulo WhatsApp, queue whatsapp-messages, WorkerHost processor, smoke test compatibilidad NestJS v10
- [x] 01-02-PLAN.md — Prisma migration: ConfiguracionWABA, MensajeWhatsApp, enums WA, whatsappOptIn en Paciente; endpoints opt-in y WABA config con validación Meta + cifrado AES-256-GCM
- [x] 01-03-PLAN.md — Frontend: tab WhatsApp en Configuración (ADMIN/PROFESIONAL), formulario WABA con validación en vivo, toggle opt-in en perfil paciente

### Phase 2: Log de Contactos + Lista de Accion
**Goal**: El coordinador tiene un registro completo de toda interacción con cada paciente y una lista diaria priorizada que le dice con quién hablar hoy
**Depends on**: Phase 1
**Requirements**: LOG-01, LOG-02, LOG-03, LOG-04, ACCION-01, ACCION-02, ACCION-03, ACCION-04
**Success Criteria** (what must be TRUE):
  1. El coordinador puede registrar una interacción (llamada, mensaje, presencial) desde el perfil del paciente con tipo, nota y fecha
  2. El perfil del paciente muestra el historial completo de interacciones en orden cronológico, con días desde el último contacto visible
  3. Al registrar una interacción, el coordinador puede cambiar la etapa CRM y temperatura del paciente en el mismo formulario
  4. La vista "Lista de Accion" muestra los pacientes ordenados por prioridad calculada (días sin contacto + temperatura + etapa)
  5. Los pacientes contactados hoy desaparecen de la lista hasta el próximo período de seguimiento
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Backend: Prisma ContactoLog model + migration + 3 endpoints (lista-accion, GET/POST contactos) + servicio con lógica de prioridad y exclusión UTC-3
- [ ] 02-02-PLAN.md — Frontend: shadcn Sheet + ContactoSheet reutilizable + hooks useContactos/useCreateContacto + ContactosSection en drawer del paciente
- [ ] 02-03-PLAN.md — Frontend: página /dashboard/accion con cards + animación framer-motion + ListaAccionWidget en dashboard + nav sidebar + permisos

### Phase 2.1: Fix SECRETARIA Contact Logging [INSERTED]
**Goal**: SECRETARIA users can log contacts without a Prisma FK error — the controller resolves `profesionalId` from the patient record when the caller's JWT contains no `profesionalId`
**Gap Closure:** Closes gaps from v1.0 audit — LOG-01 (partial), ACCION-03 (partial)
**Requirements**: LOG-01, ACCION-03
**Success Criteria** (what must be TRUE):
  1. A SECRETARIA user can POST to `/pacientes/:id/contactos` and the ContactoLog is created successfully
  2. The `ContactoLog.profesionalId` FK is populated with the patient's assigned professional when the caller has no `profesionalId`
  3. PROFESIONAL users are unaffected — their own `profesionalId` from JWT is still used
**Plans**: 1 plan

Plans:
- [x] 02.1-01-PLAN.md — Backend: fix `createContacto` handler in `pacientes.controller.ts` — async + null-guard + fallback DB lookup of `paciente.profesionalId` for SECRETARIA role

### Phase 3: Presupuestos Completos
**Goal**: El coordinador puede crear un presupuesto, generar su PDF con branding de la clínica, enviarlo por email y la plataforma actualiza automáticamente la etapa CRM del paciente al enviarlo, aceptarlo o rechazarlo
**Depends on**: Phase 2
**Requirements**: PRES-01, PRES-02, PRES-03, PRES-05, PRES-06, PRES-07, PRES-08, CRM-03, CRM-04
**Success Criteria** (what must be TRUE):
  1. El coordinador puede crear un presupuesto con ítems, montos y fecha de validez vinculado a un paciente
  2. El sistema genera un PDF del presupuesto con logo de la clínica, datos del profesional y desglose de procedimientos
  3. El coordinador puede enviar el presupuesto por email directamente desde la plataforma con un clic
  4. Al enviar el presupuesto, la etapa CRM del paciente sube automáticamente a "Presupuesto enviado" sin acción manual
  5. Al rechazar un presupuesto, el sistema solicita y registra el motivo de pérdida; al registrar pago, cierra la etapa como "Cirugía confirmada"
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Prisma migration (ConfigClinica, PresupuestoItem→precioTotal, tokenAceptacion, VENCIDO) + DTO + rechazar() CRM fix
- [ ] 03-02-PLAN.md — Backend: PresupuestoPdfService (PDFKit) + PresupuestoEmailService (Nodemailer) + public controller + MensajeInterno notifications
- [ ] 03-03-PLAN.md — Frontend: PresupuestosView renovado + EnviarPresupuestoModal + hooks nuevos + página pública /presupuesto/[token]

### Phase 4: WhatsApp + Etapas CRM Automaticas
**Goal**: El coordinador puede enviar mensajes WhatsApp a pacientes usando templates aprobados, los eventos de turnos actualizan la etapa CRM automáticamente, y las respuestas de pacientes por WhatsApp calientan su temperatura automáticamente
**Depends on**: Phase 3
**Requirements**: WA-01, WA-02, WA-03, WA-04, WA-05, CRM-01, CRM-02, CRM-05
**Success Criteria** (what must be TRUE):
  1. El coordinador puede enviar un mensaje WhatsApp a un paciente con opt-in desde su perfil usando un template aprobado por Meta
  2. El estado de entrega de cada mensaje (enviado, entregado, leído, fallido) se actualiza en tiempo real en la plataforma via webhook
  3. Al crear un turno para un paciente sin etapa CRM, la etapa se asigna automáticamente a "Consulta agendada"
  4. Al completar un turno en LiveTurno, la etapa CRM sube automáticamente a "Consulta realizada"
  5. Cuando un paciente responde un mensaje WhatsApp, su temperatura sube automáticamente a "Caliente" y la interacción queda en el log de contactos
**Plans**: TBD

Plans:
- [ ] 04-01: Backend — módulo mensajeria (WhatsApp Cloud API client + webhook handler + idempotencia + entrega via WA de PDF presupuesto)
- [ ] 04-02: Backend — wiring CRM-01 y CRM-02 en turnos module (turno creado → CONSULTA_AGENDADA, LiveTurno completado → CONSULTA_REALIZADA)
- [ ] 04-03: Frontend — UI envío WhatsApp desde perfil paciente + thread de mensajes + estados de entrega + fallback email en fallo

### Phase 5: Dashboard de Conversion
**Goal**: El profesional y el coordinador ven en el dashboard todas las métricas de conversión que necesitan para tomar decisiones: embudo con tasas, ingresos potenciales del pipeline, motivos de pérdida y performance de seguimiento del equipo
**Depends on**: Phase 4
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05
**Success Criteria** (what must be TRUE):
  1. El profesional ve el embudo de conversión con cantidad de pacientes por etapa y tasa de paso entre etapas consecutivas
  2. El profesional ve el ingreso potencial del pipeline (suma de presupuestos activos por etapa CRM)
  3. El profesional ve los principales motivos de pérdida con porcentajes sobre el total de perdidos en el período seleccionado
  4. El profesional ve métricas del período: nuevos pacientes, cirugías cerradas y tasa de conversión general
  5. El coordinador ve su performance de seguimiento: interacciones registradas y pacientes contactados en la semana
**Plans**: TBD

Plans:
- [ ] 05-01: Backend — endpoints de métricas de conversión (embudo, ingresos potenciales, motivos pérdida, performance coordinador)
- [ ] 05-02: Frontend — dashboard de conversión completo (widgets embudo, KPIs, motivos pérdida, tabla performance)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infraestructura Async | 3/3 | Complete | 2026-02-23 |
| 2. Log de Contactos + Lista de Accion | 3/3 | Complete   | 2026-02-24 |
| 2.1. Fix SECRETARIA Contact Logging | 1/1 | Complete | 2026-02-24 |
| 3. Presupuestos Completos | 1/3 | In Progress|  |
| 4. WhatsApp + Etapas CRM Automaticas | 0/3 | Not started | - |
| 5. Dashboard de Conversion | 0/2 | Not started | - |

---

## External Dependencies

**WABA Registration (Meta):** La aprobacion de WhatsApp Business Account toma 2-15 dias habiles. Debe iniciarse al comienzo de Phase 1, no al inicio de Phase 4. Phase 4 no puede hacer deploy a produccion hasta que al menos los templates core esten en estado APPROVED en Meta Business Manager. El desarrollo puede avanzar usando Twilio sandbox mientras la aprobacion esta pendiente.

**Templates WhatsApp:** Cada template requiere 15-48 horas de aprobacion adicional. Someter todos los templates (presupuesto enviado, recordatorio turno, seguimiento, opt-in confirmation) en Phase 1 junto con el registro WABA.

---
*Roadmap created: 2026-02-23*
*Milestone: CRM Conversión v1*
*Coverage: 35/35 v1 requirements mapped*
