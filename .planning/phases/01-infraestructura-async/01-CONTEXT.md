# Phase 1: Infraestructura Async - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Cimientos técnicos antes de cualquier lógica de mensajería: BullMQ sobre Redis para jobs async persistentes, schema Prisma con credenciales WABA por tenant, campo de consentimiento opt-in por paciente, y registro de mensajes enviados con estado de entrega. Nada de lógica de envío de mensajes en esta fase — solo la infraestructura que lo habilita.

</domain>

<decisions>
## Implementation Decisions

### Config WABA por clínica
- Las credenciales de WhatsApp (Phone Number ID, WABA ID, Access Token) se configuran desde una **página de Settings de la clínica** dentro del dashboard
- Al guardar, el sistema **valida las credenciales en vivo con la API de Meta** antes de persistirlas — si son inválidas, muestra error descriptivo
- El número de WhatsApp conectado se muestra formateado en la página de Settings para confirmación visual
- Solo **ADMIN y PROFESIONAL** pueden ver y editar la configuración de WhatsApp
- El estado de conexión (conectado/desconectado) es visible **únicamente en la página de Settings** — sin badges en sidebar ni topbar

### Claude's Discretion
- Diseño visual del formulario de Settings de WhatsApp
- Estructura de las tablas/campos Prisma para credenciales (encrypted storage recomendado)
- Setup de BullMQ (nombres de queues, concurrencia, retry policy)
- Formato del campo `whatsappOptIn` en el paciente (boolean + timestamp)
- Modelo `MensajeWhatsApp` en Prisma (campos mínimos para tracking: waMessageId, pacienteId, estado, timestamps)

</decisions>

<specifics>
## Specific Ideas

- Las credenciales WABA deben estar encriptadas en la base de datos (no texto plano) — es un token de acceso de Meta
- La validación en vivo debe usar el endpoint de Meta para verificar que el Phone Number ID y Access Token son válidos antes de guardar

</specifics>

<deferred>
## Deferred Ideas

- Wizard de onboarding guiado para conectar WhatsApp — considerarlo para UX de onboarding futuro
- Bull Board o dashboard de jobs para admin técnico — útil para debugging en producción, fuera de scope v1
- Visibilidad del log de mensajes en el perfil del paciente — se implementa en Phase 4 junto con la mensajería

</deferred>

---

*Phase: 01-infraestructura-async*
*Context gathered: 2026-02-23*
