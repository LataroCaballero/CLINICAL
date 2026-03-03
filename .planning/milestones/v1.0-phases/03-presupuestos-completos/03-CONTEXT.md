# Phase 3: Presupuestos Completos - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

El coordinador puede crear un presupuesto, generar su PDF con branding de la clínica, enviarlo por email con un link único de aceptación, y la plataforma actualiza automáticamente la etapa CRM del paciente cuando el paciente acepta o rechaza desde la página pública.

Mensajería WhatsApp pertenece a Phase 4. El botón de WhatsApp puede existir como placeholder en Phase 3 UI pero sin funcionalidad de envío real.

</domain>

<decisions>
## Implementation Decisions

### Estructura del presupuesto
- Cada ítem tiene: nombre del procedimiento + precio total (sin cantidad ni precio unitario)
- Descuento global opcional sobre el total (porcentaje o monto)
- Moneda seleccionable por presupuesto: ARS o USD
- Fecha de validez opcional (el coordinador puede dejarla vacía)

### Diseño del PDF
- Encabezado tipo membrete completo: logo de la clínica + nombre del profesional + dirección + teléfono + email + web
- Datos del paciente: nombre completo, DNI, email y teléfono
- Pie de página doble: texto configurable por clínica (condiciones de pago, política de cancelación, etc.) + nota libre opcional que el coordinador escribe al crear cada presupuesto
- Preview del PDF en el navegador (inline, dentro de la plataforma) antes de enviar

### Flujo de envío por email
- Tres acciones disponibles: Descargar PDF / Enviar por Email / Enviar por WhatsApp (WhatsApp = placeholder en Phase 3, activo en Phase 4)
- El sistema envía el email vía SMTP (Nodemailer/SendGrid) — no mailto
- Template fijo de email configurable por clínica + campo de nota rápida opcional que el coordinador puede agregar al enviar
- Destinatario: email del paciente (del perfil), editable por el coordinador antes de enviar

### Página pública de aceptación (sin login)
- El email incluye un link único y seguro (token de un solo uso) hacia una página pública
- La página muestra: resumen de ítems y total + botones "Aceptar" / "Rechazar"
- Al rechazar: pregunta el motivo (campo libre o lista de opciones, Claude decide) → actualiza `motivoPerdida` en el paciente
- Al aceptar: notificación interna en la plataforma al profesional y secretaria (badge/notificación)
- Al rechazar: también notificación interna al profesional y secretaria

### Estados del presupuesto y transiciones CRM
- Estados propios del presupuesto: Borrador → Enviado → Aceptado / Rechazado
- Transición CRM al enviar: etapa del paciente sube automáticamente a "Presupuesto enviado" (CRM-03)
- Transición CRM al aceptar: etapa sube a "Cirugía confirmada" (CRM-04)
- Transición CRM al rechazar: etapa a "Perdido" + motivo de pérdida registrado
- El coordinador puede editar un presupuesto en estado Borrador; no puede editar uno Enviado

### Claude's Discretion
- Diseño visual de la página pública de aceptación del paciente
- Implementación del token único de aceptación (JWT o UUID en DB)
- Cómo renderizar el resumen de ítems en la página pública
- Opciones de motivo de rechazo (lista predefinida o campo libre)
- Animaciones y estados de carga en el flujo
- Exacta disposición del membrete en el PDF

</decisions>

<specifics>
## Specific Ideas

- La página pública de aceptación debe ser "super simple" — el paciente no tiene que loguearse ni tener cuenta
- Al aceptar: la idea es que el equipo contacte rápidamente al paciente para darle un turno de cirugía (la notificación interna debe ser clara y urgente)
- Al rechazar: se notifica al médico y secretaria para poder "tomar acción" — la notificación debe transmitir que hay una oportunidad de recuperar al paciente

</specifics>

<deferred>
## Deferred Ideas

- Envío por WhatsApp del presupuesto — Phase 4 (el botón puede existir como placeholder en Phase 3)
- Email de notificación al profesional/secretaria (además de notificación interna) — potencial mejora futura

</deferred>

---

*Phase: 03-presupuestos-completos*
*Context gathered: 2026-02-24*
