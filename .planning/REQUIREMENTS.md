# Requirements: CLINICAL — Milestone CRM Conversión v1

**Defined:** 2026-02-23
**Core Value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible.

## v1 Requirements

### Infraestructura Async (INFRA)

- [ ] **INFRA-01**: El sistema soporta jobs asincrónicos persistentes con reintentos (BullMQ sobre Redis)
- [ ] **INFRA-02**: Cada clínica (tenant) puede conectar su propio número de WhatsApp (credenciales WABA separadas por tenant en base de datos)
- [ ] **INFRA-03**: Cada paciente tiene campo de consentimiento explícito para recibir mensajes de WhatsApp (`whatsappOptIn` + timestamp de aceptación)
- [ ] **INFRA-04**: El sistema registra cada mensaje WhatsApp enviado con su estado de entrega (pendiente, enviado, entregado, leído, fallido)

### Log de Contactos (LOG)

- [ ] **LOG-01**: El coordinador puede registrar una interacción con un paciente (llamada, mensaje, consulta presencial) con fecha, tipo y nota
- [ ] **LOG-02**: El perfil del paciente muestra el historial completo de interacciones ordenado cronológicamente
- [ ] **LOG-03**: Al registrar una interacción, el coordinador puede actualizar la etapa CRM y temperatura del paciente en el mismo paso
- [ ] **LOG-04**: El sistema muestra cuántos días hace que no hay interacción con cada paciente

### Lista de Acción Diaria (ACCION)

- [ ] **ACCION-01**: El coordinador ve una lista diaria de pacientes que requieren seguimiento, ordenada por prioridad
- [ ] **ACCION-02**: La prioridad se calcula automáticamente según: días sin contacto, temperatura del paciente y etapa CRM
- [ ] **ACCION-03**: Desde la lista de acción, el coordinador puede registrar la interacción realizada sin salir de la vista
- [ ] **ACCION-04**: Los pacientes contactados hoy desaparecen de la lista hasta el próximo período de seguimiento

### Presupuestos (PRES)

- [ ] **PRES-01**: El coordinador puede crear un presupuesto vinculado a un paciente con ítems, montos y fecha de validez
- [ ] **PRES-02**: El sistema genera un PDF del presupuesto con el branding de la clínica (logo, datos, firma del profesional)
- [ ] **PRES-03**: El coordinador puede enviar el presupuesto por email directamente desde la plataforma
- [ ] **PRES-04**: El coordinador puede enviar el presupuesto por WhatsApp (como documento PDF) directamente desde la plataforma
- [ ] **PRES-05**: El presupuesto tiene estados: borrador, enviado, aceptado, rechazado, vencido
- [ ] **PRES-06**: Al enviar el presupuesto, la etapa CRM del paciente sube automáticamente a "Presupuesto enviado"
- [ ] **PRES-07**: Al marcar un presupuesto como aceptado y recibir pago, la etapa CRM cierra automáticamente como "Cirugía confirmada"
- [ ] **PRES-08**: Al rechazar un presupuesto, el sistema solicita el motivo de pérdida (precio, timing, eligió otra clínica, etc.)

### WhatsApp (WA)

- [ ] **WA-01**: El coordinador puede enviar un mensaje WhatsApp a un paciente desde su perfil usando templates aprobados por Meta
- [ ] **WA-02**: El sistema muestra el estado de entrega de cada mensaje enviado (enviado, entregado, leído, fallido)
- [ ] **WA-03**: Los mensajes recibidos de pacientes por WhatsApp se registran en el log de contactos del paciente
- [ ] **WA-04**: El sistema maneja correctamente los webhooks de Meta para actualizar el estado de mensajes en tiempo real
- [ ] **WA-05**: Si un mensaje falla por WhatsApp, el sistema notifica al coordinador con opción de reintentar o enviar por email

### Etapas CRM Automáticas (CRM)

- [ ] **CRM-01**: Al crear un turno para un paciente sin etapa CRM, se asigna automáticamente la etapa "Consulta agendada"
- [ ] **CRM-02**: Al registrar que un turno fue atendido (LiveTurno completado), la etapa CRM sube automáticamente a "Consulta realizada"
- [ ] **CRM-03**: Al enviar un presupuesto, la etapa CRM sube automáticamente a "Presupuesto enviado" (ver PRES-06)
- [ ] **CRM-04**: Al registrar un pago de cirugía, la etapa CRM cierra automáticamente como "Cirugía confirmada"
- [ ] **CRM-05**: Cuando un paciente responde un mensaje de WhatsApp, su temperatura sube automáticamente a "Caliente"

### Dashboard de Conversión (DASH)

- [ ] **DASH-01**: El profesional ve el embudo de conversión con cantidad de pacientes por etapa CRM y tasa de paso entre etapas
- [ ] **DASH-02**: El profesional ve el ingreso potencial del pipeline (suma de presupuestos activos por etapa)
- [ ] **DASH-03**: El profesional ve los principales motivos de pérdida de pacientes con porcentajes
- [ ] **DASH-04**: El profesional ve métricas del período: nuevos pacientes, cirugías cerradas, tasa de conversión general
- [ ] **DASH-05**: El coordinador ve su performance de seguimiento: interacciones registradas, pacientes contactados esta semana

## v2 Requirements

### Automatizaciones / Drip (AUTO)

- **AUTO-01**: El coordinador puede crear una secuencia de seguimiento automático (ej: "Si no hay respuesta en 3 días → mandar mensaje X")
- **AUTO-02**: Las secuencias se disparan por evento (presupuesto enviado, temperatura fría, días sin contacto)
- **AUTO-03**: El sistema pausa automáticamente las secuencias cuando el paciente responde
- **AUTO-04**: El coordinador puede ver y cancelar secuencias activas por paciente

### Módulos Financieros Mejorados (FIN)

- **FIN-01**: Los módulos financieros están revisados con domain expertise contable
- **FIN-02**: Las métricas financieras del dashboard están alineadas con los KPIs reales que un cirujano necesita
- **FIN-03**: Export de reportes financieros a PDF y CSV

## Out of Scope

| Feature | Reason |
|---------|--------|
| App móvil nativa | Web-first; mobile en roadmap futuro |
| Chat en tiempo real paciente ↔ clínica | WhatsApp cubre este caso de uso |
| AI chatbot para responder pacientes | Riesgo legal/reputacional en contexto médico |
| Facturación electrónica / AFIP | Requiere dominio contable específico, fuera de scope |
| Email marketing masivo (newsletters, campañas) | Anti-feature: los pacientes son individuos, no leads de marketing |
| Simulación de procedimientos (foto morphing) | Complejidad alta, fuera del core value |
| BSP intermediario para WhatsApp (360dialog, Twilio) | Se usa Meta Cloud API directamente con templates |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| LOG-01 | Phase 2 | Pending |
| LOG-02 | Phase 2 | Pending |
| LOG-03 | Phase 2 | Pending |
| LOG-04 | Phase 2 | Pending |
| ACCION-01 | Phase 2 | Pending |
| ACCION-02 | Phase 2 | Pending |
| ACCION-03 | Phase 2 | Pending |
| ACCION-04 | Phase 2 | Pending |
| PRES-01 | Phase 3 | Pending |
| PRES-02 | Phase 3 | Pending |
| PRES-03 | Phase 3 | Pending |
| PRES-04 | Phase 3 | Pending |
| PRES-05 | Phase 3 | Pending |
| PRES-06 | Phase 3 | Pending |
| PRES-07 | Phase 3 | Pending |
| PRES-08 | Phase 3 | Pending |
| CRM-03 | Phase 3 | Pending |
| CRM-04 | Phase 3 | Pending |
| WA-01 | Phase 4 | Pending |
| WA-02 | Phase 4 | Pending |
| WA-03 | Phase 4 | Pending |
| WA-04 | Phase 4 | Pending |
| WA-05 | Phase 4 | Pending |
| CRM-01 | Phase 4 | Pending |
| CRM-02 | Phase 4 | Pending |
| CRM-05 | Phase 4 | Pending |
| DASH-01 | Phase 5 | Pending |
| DASH-02 | Phase 5 | Pending |
| DASH-03 | Phase 5 | Pending |
| DASH-04 | Phase 5 | Pending |
| DASH-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0

---
*Requirements defined: 2026-02-23*
*Last updated: 2026-02-23 — traceability completed after roadmap creation*
