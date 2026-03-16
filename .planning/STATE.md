---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: AFIP Real
status: in-progress
last_updated: "2026-03-16T17:10:00Z"
last_activity: 2026-03-16 — Phase 12 Plan 01 complete — schema + migration + spec scaffolds
stopped_at: "Completed 12-01-PLAN.md"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 4
  completed_plans: 1
  percent: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** v1.2 AFIP Real — emisión de comprobantes electrónicos reales con CAE, certificado por tenant, QR obligatorio RG 5616/2024, y modo contingencia CAEA

## Current Position

```
Phase:    12 — Schema AFIP Extendido + Gestión de Certificados
Plan:     02 (Plan 01 complete)
Status:   In Progress
Progress: [██░░░░░░░░] 20% (1/5 phases partial — Plan 01/N complete)
```

Last activity: 2026-03-16 — Plan 12-01 complete: Prisma schema migration + AFIP spec scaffolds

## Milestone Summary

**v1.2 AFIP Real — 5 phases, 16 requirements**

| Phase | Name | Requirements | Gate |
|-------|------|--------------|------|
| 12 | Schema AFIP Extendido + Certificados | AFIP-01, CERT-01..04 | None |
| 13 | WSAA Token Service | CAE-01 | Phase 12 |
| 14 | Emisión CAE Real (WSFEv1) | CAE-02..04 | Phase 13 |
| 15 | QR AFIP + PDF + Frontend | QR-01..03 | Phase 14 |
| 16 | CAEA Contingency Mode | CAEA-01..04 | Phase 14 + prod invoice real + RG 5782/2025 verified |

## Accumulated Context

### Decisions (carry-forward from v1.1)
- Raw SOAP/XML para AFIP (no SDK) — afipjs/afip-apis unmaintained, @afipsdk cloud proxy incompatible con self-hosted
- AES-256-GCM via EncryptionService existente (WhatsappModule) para cert+key por tenant
- AfipStubService permanece disponible via env toggle para desarrollo local
- FACTURADOR no tiene Profesional record — profesionalId siempre parámetro explícito
- Montos server-side en transacción atómica — nunca totales del cliente

### Decisions (v1.2 new)
- node-forge 1.3.3 para firma CMS in-process (evita openssl subprocess + /tmp key exposure)
- Redis cache WSAA desde commit 1 — nunca Map en memoria (no sobrevive horizontal scale)
- pg_advisory_xact_lock dentro de prisma.$transaction({ timeout: 45000 }) para secuenciación CAE
- AfipBusinessError (10242, resultado=R) → DLQ inmediato; AfipTransientError → backoff exponencial
- QR data almacenada como URL string en Factura.qrData (no PNG blob) — re-renderizable si spec cambia
- CAEA es fallback únicamente — RG 5782/2025 prohibe como path primario desde junio 2026
- FECAEAInformar + alertas deadline deben shipper juntos — CAEA sin inform tracking es riesgo regulatorio
- [Plan 12-01] ConfiguracionAFIP.ptoVta non-nullable — validado via FEParamGetPtosVenta antes de persistir; Factura AFIP fields (cae, caeFchVto, nroComprobante, qrData, ptoVta) nullable hasta Phase 14
- [Plan 12-01] Placeholder stub files (afip-config.service.ts, cert-expiry.scheduler.ts) para compilar specs — Wave 1 planes 02/03 los reemplazan con implementaciones reales

### Research Flags (for plan-phase to act on)
- **Phase 13 y 14:** Verificar URLs actuales WSAA y WSFEv1 bajo dominio arca.gob.ar al momento de implementar. Almacenar en env config: AFIP_WSAA_URL_HOMO, AFIP_WSAA_URL_PROD, AFIP_WSFEV1_URL_HOMO, AFIP_WSFEV1_URL_PROD
- **Phase 16 (CAEA):** MEDIUM confidence — verificar RG 5782/2025 en Boletín Oficial antes de empezar: (a) fecha efectiva junio 2026, (b) umbral 5% volumen, (c) ventana 8 días calendario. Si algún parámetro difiere, actualizar CaeaService design

### Critical Pitfalls (reference before each phase)
1. Punto de venta no registrado como RECE en portal AFIP — silencioso en homo, bloquea producción. Prevención: FEParamGetPtosVenta en upload cert (Phase 12)
2. Cache WSAA en Map en memoria — race condition bajo scale horizontal. Prevención: Redis desde Phase 13
3. Prisma $transaction timeout default 5s < SLA AFIP 30s — advisory lock se libera a mitad. Prevención: { timeout: 45000 } en Phase 14
4. BullMQ reintentando rechazos de negocio AFIP indefinidamente. Prevención: AfipBusinessError → DLQ inmediato (Phase 14)
5. openssl subprocess: private key en /tmp en crash paths. Prevención: node-forge in-process (Phase 13)
6. CondicionIVAReceptorId null — error 10242 desde abril 2026. Prevención: validar antes de encolar job, no dentro del processor (Phase 14)
7. CAEA inform deadline 8 días perdido silenciosamente. Prevención: 72 reintentos + alerta admin (Phase 16)

## Known Tech Debt (carry-forward)

- marcarPracticasPagadas deprecado — limpiar cuando no tenga callers externos
- IVA matrix cirugía estética — validar con contador antes de habilitar producción AFIP
- RG 5782/2025 CAEA — verificar en Boletín Oficial antes de Phase 16
- EncryptionService dev fallback key — configurar ENCRYPTION_KEY en .env prod antes de deploy
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
- TypeScript strict mode desactivado, cobertura tests <6%
- PostgreSQL statement_timeout y lock_timeout a nivel servidor — verificar que no override el { timeout: 45000 } de Prisma $transaction en Phase 14

## Session Continuity

Next action: Execute Phase 12 Plan 02 (AfipConfigService implementation)

Files to read at session start:
- `.planning/ROADMAP.md` — phase structure and success criteria
- `.planning/REQUIREMENTS.md` — requirement details with IDs
- `.planning/research/AFIP-INTEGRATION.md` — 774-line canonical reference (WSAA, WSFEv1, CAEA, advisory lock, signing)
- `backend/src/prisma/schema.prisma` — current schema state (updated with AFIP models)
- `backend/src/modules/afip-config/` — placeholder stubs + spec scaffolds ready for implementation
- `backend/src/modules/finanzas/afip/` — stub service y interface contract
- `.planning/phases/12-schema-afip-extendido-gestion-certificados/12-01-SUMMARY.md` — Plan 01 context
