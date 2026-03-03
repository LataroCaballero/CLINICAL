# Milestones

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

