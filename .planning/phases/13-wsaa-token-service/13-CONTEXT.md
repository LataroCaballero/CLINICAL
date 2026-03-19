# Phase 13: WSAA Token Service - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend service that obtains AFIP Access Tickets (token + sign) using CMS signature with node-forge in-process, caches them in Redis per tenant, and serializes concurrent requests with async-mutex. No frontend changes. No new DB schema. Pure backend infrastructure consumed by Phase 14 (WSFEv1 / FECAESolicitar). Also replaces the openssl subprocess path in AfipConfigService with node-forge.

</domain>

<decisions>
## Implementation Decisions

### Module placement
- New standalone `backend/src/modules/wsaa/` module — separate from afip-config
- WsaaModule exports WsaaService and WsaaStubService; imported by both AfipConfigModule and FinanzasModule
- Clean separation: cert management (AfipConfigModule) and token service (WsaaModule) are independent concerns
- Primary interface: `WsaaService.getTicket(profesionalId, service)` — service loads cert+key from DB internally via AfipConfigService
- Secondary interface: `WsaaService.getTicketTransient(certPem, keyPem, ambiente, service)` — for cert-save validation flow, no Redis involved

### Cert-save WSAA path (openssl elimination)
- Phase 13 kills the openssl subprocess entirely — `getWsaaTicketTransient` in AfipConfigService is replaced
- AfipConfigService calls `WsaaService.getTicketTransient(certPem, keyPem, ambiente, 'wsfe')` at cert-save time
- node-forge signs the TRA in-process for both the transient and cached paths
- After a successful cert save, the obtained ticket is immediately stored in Redis (warm cache) — first invoice request hits cache, not WSAA

### Dev stub
- Separate `WsaaStubService` following AfipStubService pattern (NestJS DI swap via `useClass`)
- WsaaModule conditionally provides WsaaStubService when `USE_AFIP_STUB=true` env var is set
- Stub returns `{ token: 'stub-token', sign: 'stub-sign', expiresAt: <12h from now> }` without any Redis reads or writes
- No Redis dependency in stub mode — avoids requiring Redis for local dev

### Redis client injection
- WsaaModule creates its own ioredis client using `REDIS_HOST`/`REDIS_PORT` from ConfigModule
- Independent lifecycle from BullMQ's Redis connection
- Redis unavailability is treated as degraded-but-functional: WsaaService falls through to a live WSAA call, logs a warning, and does not cache the result
- Does NOT throw AfipUnavailableException on Redis failure — callers should not know Redis is involved

### Claude's Discretion
- Exact ioredis client provider token name and NestJS provider pattern
- TRA `expirationTime` window (current: 10 min — can expand to WSAA-allowed maximum)
- node-forge CMS signing implementation details (PKCS#7 signed-data, detach mode, DER output)
- Error wrapping details: which Node/ioredis errors map to AfipUnavailableException vs AfipBusinessError
- WsaaService unit test strategy (mocking ioredis, node-forge, axios)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AfipConfigService.getStatus(profesionalId)` — already loads ConfiguracionAFIP; WsaaService can call it or use PrismaService directly to fetch cert+key+ambiente
- `EncryptionService` (WhatsappModule, exported) — decrypt certPemEncrypted/keyPemEncrypted; AfipConfigModule already imports WhatsappModule
- `AfipStubService` pattern (`backend/src/modules/finanzas/afip/afip-stub.service.ts`) — NestJS DI swap via useClass; exact pattern for WsaaStubService
- `buildTra(service)` private method in AfipConfigService — extract into WsaaService (or a shared WSAA utils file)
- WSAA URLs already used in AfipConfigService: `https://wsaa.afip.gov.ar/ws/services/LoginCms` (prod) and `https://wsaahomo.afip.gov.ar/ws/services/LoginCms` (homo)

### Established Patterns
- NestJS ConfigModule available globally — inject ConfigService to read `REDIS_HOST`/`REDIS_PORT`/`USE_AFIP_STUB`
- `async-mutex` — install if not already in package.json; check backend dependencies first
- Raw SOAP/axios pattern established in AfipConfigService.validatePtoVta — same pattern for WSAA loginCms call
- BullMQ already uses ioredis — same connection config, separate client instance

### Integration Points
- `AfipConfigModule` imports `WsaaModule` and calls `WsaaService.getTicketTransient()` at cert-save time (replaces `getWsaaTicketTransient`)
- `FinanzasModule` (Phase 14) will import `WsaaModule` and call `WsaaService.getTicket(profesionalId, 'wsfe')`
- `backend/src/app.module.ts` — add WsaaModule to imports if it needs global availability, or let FinanzasModule import it directly
- Redis key format already locked: `afip_ta:{profesionalId}:{cuit}:{service}`, TTL = expiry timestamp minus 5 minutes in seconds

</code_context>

<specifics>
## Specific Ideas

- WsaaService.getTicket() should acquire async-mutex lock keyed by `{profesionalId}:{cuit}` before checking Redis — so concurrent calls serialize before any WSAA request fires
- After lock acquired: check Redis → if hit, return immediately; if miss, call WSAA, store in Redis, release lock
- getTicketTransient() is lock-free and Redis-free (cert-save-time only, not concurrent in practice)
- The warm-cache-on-cert-save should call `getTicket(profesionalId, 'wsfe')` (not transient) so it goes through the full cache path

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 13-wsaa-token-service*
*Context gathered: 2026-03-19*
