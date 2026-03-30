---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: AFIP Real
status: completed
stopped_at: Completed 15-02-PLAN.md
last_updated: "2026-03-30T21:41:30.974Z"
last_activity: "2026-03-30 — Phase 15 Plan 02 complete: GET facturas/:id, GET facturas/:id/pdf, PATCH facturas/:id/tipo-cambio wired in FinanzasController — 50 finanzas tests green, QR-02 and QR-03 backend contracts delivered"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 14
  completed_plans: 12
  percent: 82
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** v1.2 AFIP Real — emisión de comprobantes electrónicos reales con CAE, certificado por tenant, QR obligatorio RG 5616/2024, y modo contingencia CAEA

## Current Position

```
Phase:    15 — QR AFIP + PDF + Frontend (in progress)
Plan:     Plan 02 complete — GET facturas/:id + GET facturas/:id/pdf + PATCH facturas/:id/tipo-cambio
Status:   Phase 15 Plans 01-02 done; Plans 03, 04 remaining
Progress: [████████░░] 82% of v1.2 plans (Phase 12 done, Phase 13 done, Phase 14 done; Phase 15 Plans 01-02 done, Plans 03-04 + Phase 16 remaining)
```

Last activity: 2026-03-30 — Phase 15 Plan 02 complete: GET facturas/:id, GET facturas/:id/pdf, PATCH facturas/:id/tipo-cambio wired in FinanzasController — 50 finanzas tests green, QR-02 and QR-03 backend contracts delivered

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
- [Plan 12-02] Node.js X509Certificate.subject usa newline-separated key=value — regex maneja serialNumber=CUIT N (lowercase, producción AFIP) y CN=N (11 dígitos)
- [Plan 12-02] @Auth('ADMIN','PROFESIONAL') decorator usado en AfipConfigController — usa JwtRolesGuard via existing @Auth pattern del repo
- [Plan 12-02] PrismaModule @Global() — AfipConfigModule no necesita importarlo ni agregar PrismaService a providers
- [Plan 12-03] SMTP_PASS siempre desde env var en CertExpiryScheduler — ConfigClinica smtpPassEncrypted decryption es pre-existing gap (mismo que PresupuestoEmailService); env-var path es el camino seguro
- [Plan 12-03] daysLeft guard: === 60 || === 30 || <= 5 — exactamente 2 alertas programadas más ventana urgente diaria en los últimos 5 días
- [Plan 12-04] AfipConfigTab preview modal mostra valores ingresados (ambiente prominent); CUIT/expiry extraídos server-side después de confirmar — no pre-fetch del cert
- [Plan 12-04] Facturador badge visual-only: useAfipConfig hook, renders solo cuando configured, sin onClick/Link wrapper
- [Plan 13-01] signTra() es public (no private) para permitir jest.spyOn en unit tests — mock evita necesidad de PEM certs reales en fixtures
- [Plan 13-01] signingTime authenticatedAttribute value usa ISO string (no Date object) — @types/node-forge requiere `value?: string`
- [Plan 13-01] AFIP_WSAA_URL_HOMO / AFIP_WSAA_URL_PROD env vars soportados en callWsaa() con defaults que siguen dominios actuales (wsaahomo.afip.gov.ar, wsaa.afip.gov.ar) — env configurable per research flag
- [Plan 13-01] Redis cache key format: afip_ta:{profesionalId}:{cuit}:{service} — TTL = floor((expiresAt-now)/1000 - 300), skip SET si <= 0
- [Plan 13-01] Mutex key format: {profesionalId}:{cuit} — serializa por identidad de tenant
- [Plan 13-02] WsaaModule does NOT import AfipConfigModule — WsaaService loads cert+key via PrismaService directly; AfipConfigModule imports WsaaModule. Circular dep broken cleanly.
- [Plan 13-02] Warm cache call (getTicket) after cert save is non-blocking (try/catch) — Redis failure must not fail the cert upload flow
- [Plan 13-02] WSAA_SERVICE injection pattern established: any module needing AFIP auth tokens imports WsaaModule and uses @Inject(WSAA_SERVICE) wsaaService: WsaaServiceInterface
- [Plan 14-01] EMISION_PENDIENTE positioned between EMITIDA and ANULADA — transient states logically precede terminal states in enum ordering
- [Plan 14-01] processors/ directory co-located under finanzas/ module — BullMQ processors belong to the domain they process, not a top-level module
- [Plan 14-01] AFIP_SERVICE DI token follows same string-constant pattern as WSAA_SERVICE — swap real/stub via useFactory without changing callers
- [Plan 14-02] SOAP namespace prefix ar: used in FECAESolicitar envelope — test assertions must use <ar:CbteDesde> not bare <CbteDesde>
- [Plan 14-02] configuracionAFIP.findUniqueOrThrow called outside $transaction — cfg needed for URL selection and lock key before transaction opens
- [Plan 14-02] callFECAESolicitar re-throws only AfipTransientError from axios catch; resultado='R' business error thrown from emitirComprobante after successful HTTP response
- [Plan 14-02] IVA alicuota ID 5 (21%) hard-coded for Phase 14 homologacion — documented tech debt for production IVA matrix
- [Plan 14-03] CaeJobData carries only facturaId + profesionalId — never monetary amounts — server-side totals rule; AfipRealService reads Factura data from DB
- [Plan 14-03] instanceof AfipBusinessError check must precede generic re-throw — order is critical so business errors are never accidentally retried with backoff
- [Plan 14-03] emitirComprobante called as (afipService as any).emitirComprobante() — AfipRealService DB-read signature differs from AfipService interface (identifiers only vs full params)
- [Plan 14-04] AFIP_SERVICE useFactory in FinanzasModule routes to AfipRealService (USE_AFIP_STUB != 'true') or AfipStubService (USE_AFIP_STUB='true') — env toggle pattern mirrors WSAA_SERVICE from Phase 13
- [Plan 14-04] condicionIVAReceptor null check in emitirFactura before enqueue (not in processor) — prevents AFIP error 10242 from being retried 5 times with exponential backoff
- [Plan 14-04] ConfiguracionAFIP existence validated before setting EMISION_PENDIENTE — prevents orphaned estado if cert not uploaded
- [Plan 15-01] buildAfipQrUrl uses Buffer.from(json).toString('base64') — standard Node.js, no external encoder; URL-safe per AFIP spec examples
- [Plan 15-01] facturaFields fetched BEFORE $transaction (outside advisory lock) to avoid adding DB round-trip inside timed lock window
- [Plan 15-01] AfipStubService returns deterministic qrData with stub CUIT 20000000001 — makes unit tests predictable regardless of date
- [Plan 15-01] EmitirComprobanteResult.qrData is optional (?) — real service always sets it, stub always returns it; existing callers (CaeEmissionProcessor) don't break
- [Plan 15-01] FacturaPdfService NOT exported from FinanzasModule — internal use only; Plan 02 injects it into FinanzasService
- [Plan 15-02] GET facturas/:id/pdf placed before POST facturas/:id/anular — NestJS route ordering: literal segments before param routes to avoid shadowing
- [Plan 15-02] generateFacturaPdf calls getFacturaById() then second findUniqueOrThrow for profesional/configClinica — FacturaDetailDto does not carry config data, second query needed for PDF FacturaPdfData building

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

Next action: Execute Phase 15 Plan 03 — Frontend comprobante detail page consuming GET /finanzas/facturas/:id and GET /finanzas/facturas/:id/pdf.
Stopped at: Completed 15-02-PLAN.md

Files to read at session start for Phase 15 Plan 03:
- `.planning/phases/15-qr-afip-pdf-frontend-comprobantes/15-02-SUMMARY.md` — backend endpoint contracts
- `backend/src/modules/finanzas/finanzas.controller.ts` — final route shapes
- `frontend/src/hooks/` — existing TanStack Query hooks pattern to follow
