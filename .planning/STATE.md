# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 3 — (next phase)

## Current Position

Phase: 2.1 of 5 (Fix SECRETARIA Contact Logging) — COMPLETE
Plan: 1 of 1 in current phase — COMPLETE
Status: Phase 2.1 complete, ready for Phase 3
Last activity: 2026-02-24 — Plan 02.1-01 completado: async createContacto handler with null-guard + profesionalId fallback for SECRETARIA role

Progress: [██████░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 21min
- Total execution time: 90min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-infraestructura-async | 3/3 | 55min | 18min |
| 02-log-de-contactos-lista-de-accion | 3/3 | 35min | 12min |
| 02.1-fix-secretaria-contact-logging | 1/1 | 8min | 8min |

**Recent Trend:**
- Last 5 plans: 01-01 (15min), 01-02 (25min), 01-03 (15min), 02-02 (18min), 02-03 (35min), 02.1-01 (8min)
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: WABA registration debe iniciarse en Phase 1 (no Phase 4) — el lead time de Meta (2-15 días) debe solaparse con el desarrollo, no bloquearlo
- [Roadmap]: PDFKit como generador PDF primario (no Puppeteer) — evita memory leaks en produccion, suficiente para documentos estructurados
- [Roadmap]: CRM-01/CRM-02 (transiciones por turno) se implementan en Phase 4 junto con WhatsApp — ambas son integraciones de eventos CRM, no de mensajeria directa
- [Roadmap]: Drip/automatizaciones (AUTO-01..04) quedan en v2 — WhatsApp manual debe estar estable en produccion antes de envíos automatizados masivos
- [01-01]: @nestjs/bullmq@11.0.4 + bullmq@5.70.1 son compatibles con NestJS v10 sin downgrade — peer deps explicitamente soportan ^10.0.0 || ^11.0.0
- [01-01]: maxRetriesPerRequest: null configurado en BullModule.forRootAsync — critico para workers long-running que no deben hacer timeout
- [01-01]: EncryptionService usa fallback de dev si falta ENCRYPTION_KEY (warning, no error fatal) — facilita onboarding dev
- [01-01]: BullModule exportado desde WhatsappModule para que Phase 4 inyecte la queue sin re-registrarla
- [01-02]: META_API_VERSION = 'v21.0' como constante nombrada en WhatsappService — punto único de actualización cuando Meta depreca versiones
- [01-02]: WabaConfigResponseDto excluye explícitamente accessTokenEncrypted — zero token leakage por diseño
- [01-02]: validateWABACredentials llamado ANTES de encrypt() — evita persistir basura cifrada si Meta rechaza credenciales
- [01-02]: whatsappOptInAt = null (no sin cambio) cuando optIn=false — audit trail explícito de opt-out
- [01-03]: WhatsApp tab added to ADMIN (flex TabsList) and PROFESIONAL (grid-cols-8) — NOT added to SECRETARIA/FACTURADOR
- [01-03]: PROFESIONAL tabs grid changed from grid-cols-7 to grid-cols-8 to accommodate WhatsApp tab
- [01-03]: useUpdateWhatsappOptIn invalidates with partial key ['paciente', pacienteId] to cover all effectiveProfessionalId variants
- [01-03]: whatsappOptIn and whatsappOptInAt read as (paciente as any) pending Prisma client regeneration and type update
- [02-01]: EtapaCRM scoring map uses TURNO_AGENDADO/CONSULTADO (actual enum values) — plan had incorrect CONSULTA_AGENDADA/CONSULTA_REALIZADA
- [02-01]: calcularScore() caps diasSinContacto at 30 to prevent score explosion for very old leads
- [02-01]: contactadosHoy counter included in lista-accion response to enable frontend counter widget
- [02-02]: ContactoSheet uses modalMode=false inside PatientDrawer to prevent Radix portal z-index conflict between Sheet and Drawer
- [02-02]: ContactosSection integrated inline in PatientDrawer default view (not as a tab) so contact history is always visible
- [02-02]: useCreateContacto invalidates 4 query keys: contactos, lista-accion, crm-kanban, paciente for full consistency
- [Phase 02-log-de-contactos-lista-de-accion]: ListaAccionWidget removed from dashboard home — sidebar-only access avoids overloading already-dense dashboard with CRM widgets
- [Phase 02-log-de-contactos-lista-de-accion]: EtapaCRM enum values confirmed: TURNO_AGENDADO and CONSULTADO (plan had wrong CONSULTA_AGENDADA/CONSULTA_REALIZADA) — all CRM frontend code must use schema-accurate values
- [Phase 02.1-fix-secretaria-contact-logging]: profesionalId fallback lookup done in controller not service — keeps service signature clean (string never null)

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4 gate]: WABA registration con Meta puede tomar 2-15 días hábiles. Iniciar registro en Phase 1 Day 1. Phase 4 no hace deploy a producción sin templates APPROVED.
- [Phase 4 gate]: Verificar Meta Tech Provider / ISV enrollment status antes de planificar Phase 4 (deadline Dec 31 2025 para Embedded Signup — puede estar vencido).
- [Phase 4]: Verificar soporte de 360dialog para números argentinos (+54) antes de comprometerse con ese BSP.
- [Phase 1 - RESUELTO]: BullMQ v11 + NestJS v10 — @nestjs/bullmq@11.0.4 declara peer deps ^10.0.0 || ^11.0.0. Compatibilidad confirmada, no se requirio downgrade. Build limpio.

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 02.1-01-PLAN.md — Phase 2.1 (Fix SECRETARIA Contact Logging) complete
Resume file: None
