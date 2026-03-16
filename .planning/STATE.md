---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: AFIP Real
status: planning
stopped_at: defining requirements
last_updated: "2026-03-16"
last_activity: 2026-03-16 — Milestone v1.2 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Defining requirements for v1.2 AFIP Real

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-16 — Milestone v1.2 started

## Accumulated Context

- v1.1 shipped 2026-03-16: Schema AFIP-ready, AfipStubService, dashboard FACTURADOR, flujo liquidación completo
- Documento técnico AFIP/ARCA en `.planning/research/AFIP-INTEGRATION.md` (774 líneas) — referencia canónica para v1.2
- Fases previas: v1.0 terminó en fase 9 (con 2.1, 4.1, 6, 7 decimales); v1.1 usó fases 8–11
- v1.2 debe continuar numeración desde fase 12

## Known Tech Debt (carry-forward)

- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de implementar AFIP real
- RG 5782/2025 CAEA — verificar en Boletín Oficial antes de implementar
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
- TypeScript strict mode desactivado, cobertura tests <6%
