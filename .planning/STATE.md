---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: AFIP Real
status: In Progress
last_updated: "2026-03-20T23:27:11Z"
last_activity: "2026-03-20 — Phase 13 Plan 02 complete: AfipConfigService rewired to WsaaService — openssl subprocess eliminated, warm Redis cache after cert save, WsaaModule in AppModule"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 5
  completed_plans: 6
  percent: 48
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** v1.2 AFIP Real — emisión de comprobantes electrónicos reales con CAE, certificado por tenant, QR obligatorio RG 5616/2024, y modo contingencia CAEA

## Current Position

```
Phase:    13 — WSAA Token Service (complete)
Plan:     Phase 13 done (both plans complete)
Status:   Phase 13 complete — ready for Phase 14
Progress: [█████████░] 48% of v1.2 phases (Phase 12 done, Phase 13 done)
```

Last activity: 2026-03-20 — Phase 13 Plan 02 complete: AfipConfigService rewired to WsaaService — openssl subprocess eliminated, warm Redis cache after cert save, WsaaModule registered in AppModule

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

Next action: Phase 13 complete. Execute Phase 14 (Emisión CAE Real — WSFEv1 integration). Import WsaaModule in FinanzasModule, inject WSAA_SERVICE, call getTicket() per invoice.
Stopped at: Completed 13-02-PLAN.md

Files to read at session start for Phase 14:
- `.planning/phases/13-wsaa-token-service/13-02-SUMMARY.md` — WSAA_SERVICE injection pattern
- `.planning/phases/13-wsaa-token-service/13-01-SUMMARY.md` — WsaaModule contracts
- `backend/src/modules/wsaa/wsaa.interfaces.ts` — AccessTicket + WsaaServiceInterface
- `backend/src/modules/afip-config/afip-config.service.ts` — validatePtoVta SOAP pattern (reuse for WSFEv1)
