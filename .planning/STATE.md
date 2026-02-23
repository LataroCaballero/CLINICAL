# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 1 — Infraestructura Async

## Current Position

Phase: 1 of 5 (Infraestructura Async)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-02-23 — Plan 01-01 completado: BullMQ + WhatsApp Module Infrastructure

Progress: [█░░░░░░░░░] 7%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 15min
- Total execution time: 15min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-infraestructura-async | 1/3 | 15min | 15min |

**Recent Trend:**
- Last 5 plans: 01-01 (15min)
- Trend: -

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4 gate]: WABA registration con Meta puede tomar 2-15 días hábiles. Iniciar registro en Phase 1 Day 1. Phase 4 no hace deploy a producción sin templates APPROVED.
- [Phase 4 gate]: Verificar Meta Tech Provider / ISV enrollment status antes de planificar Phase 4 (deadline Dec 31 2025 para Embedded Signup — puede estar vencido).
- [Phase 4]: Verificar soporte de 360dialog para números argentinos (+54) antes de comprometerse con ese BSP.
- [Phase 1 - RESUELTO]: BullMQ v11 + NestJS v10 — @nestjs/bullmq@11.0.4 declara peer deps ^10.0.0 || ^11.0.0. Compatibilidad confirmada, no se requirio downgrade. Build limpio.

## Session Continuity

Last session: 2026-02-23
Stopped at: Plan 01-01 completado. WhatsappModule con BullMQ operativo. Listo para 01-02 (WABA config storage).
Resume file: None
