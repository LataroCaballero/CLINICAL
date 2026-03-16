---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Vista del Facturador
status: shipped
stopped_at: v1.1 milestone complete — archived 2026-03-16
last_updated: "2026-03-16"
last_activity: 2026-03-16 — v1.1 milestone shipped — 4 phases, 9 plans, 13/13 requirements
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 9
  completed_plans: 9
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Planning next milestone (v1.2 AFIP Real)

## Milestone Summary: v1.1 Vista del Facturador ✅

Shipped: 2026-03-16 | 4 phases | 9 plans | 3 days | 47 files | +7,174 lines

Key deliverables:
- Schema AFIP-ready + migración segura facturador_v1
- Documento integración AFIP/ARCA 774 líneas con contrato TypeScript
- 7 endpoints backend billing (ADMIN+FACTURADOR), AfipStubService
- Dashboard FACTURADOR `/dashboard/facturador` con KPIs y límite mensual
- Flujo liquidación: edición inline montoPagado, CerrarLoteModal, transacción atómica

Archive: `.planning/milestones/v1.1-ROADMAP.md`

## Next Steps

Run `/gsd:new-milestone` to define v1.2 (AFIP Real recommended).

## Performance Metrics

**v1.1 Plans:**

| Phase | Plans | Tiempo estimado |
|-------|-------|---------|
| 08-schema-afip-research | 2/2 | ~9min total |
| 09-backend-api-layer | 3/3 | ~17min total |
| 10-facturador-dashboard | 2/2 | ~9min total |
| 11-settlement-workflow | 2/2 | ~22min total |

**v1.0 reference:** 23 plans, ~21min avg

## Known Tech Debt (carry-forward)

- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de v1.2
- RG 5782/2025 CAEA — verificar en Boletín Oficial antes de implementar
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
- TypeScript strict mode desactivado, cobertura tests <6%
