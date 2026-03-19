# Phase 13: WSAA Token Service - Research

**Researched:** 2026-03-19
**Domain:** AFIP WSAA CMS signing with node-forge, Redis caching with ioredis, async-mutex per-key serialization in NestJS
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Module placement**
- New standalone `backend/src/modules/wsaa/` module — separate from afip-config
- WsaaModule exports WsaaService and WsaaStubService; imported by both AfipConfigModule and FinanzasModule
- Clean separation: cert management (AfipConfigModule) and token service (WsaaModule) are independent concerns
- Primary interface: `WsaaService.getTicket(profesionalId, service)` — service loads cert+key from DB internally via AfipConfigService
- Secondary interface: `WsaaService.getTicketTransient(certPem, keyPem, ambiente, service)` — for cert-save validation flow, no Redis involved

**Cert-save WSAA path (openssl elimination)**
- Phase 13 kills the openssl subprocess entirely — `getWsaaTicketTransient` in AfipConfigService is replaced
- AfipConfigService calls `WsaaService.getTicketTransient(certPem, keyPem, ambiente, 'wsfe')` at cert-save time
- node-forge signs the TRA in-process for both the transient and cached paths
- After a successful cert save, the obtained ticket is immediately stored in Redis (warm cache) — first invoice request hits cache, not WSAA

**Dev stub**
- Separate `WsaaStubService` following AfipStubService pattern (NestJS DI swap via `useClass`)
- WsaaModule conditionally provides WsaaStubService when `USE_AFIP_STUB=true` env var is set
- Stub returns `{ token: 'stub-token', sign: 'stub-sign', expiresAt: <12h from now> }` without any Redis reads or writes
- No Redis dependency in stub mode — avoids requiring Redis for local dev

**Redis client injection**
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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAE-01 | Sistema obtiene Access Ticket de WSAA con firma CMS in-process via `node-forge`, cacheado en Redis (clave `afip_ta:{profesionalId}:{cuit}:{service}`, TTL = expiry menos 5 min, ~11hs), con `async-mutex` por CUIT para evitar renovaciones concurrentes | node-forge 1.3.3 pkcs7.createSignedData() confirmed; ioredis custom provider pattern confirmed; async-mutex Mutex-per-key Map pattern confirmed |

</phase_requirements>

---

## Summary

Phase 13 builds a pure backend NestJS module (`wsaa/`) that obtains AFIP WSAA Access Tickets using in-process CMS signing via node-forge, caches them in Redis with ioredis, and serializes concurrent requests per CUIT using async-mutex. None of node-forge, async-mutex, or ioredis are currently installed in the backend — all three require `npm install`. The `redis` package currently installed is the newer `redis` v5 client (not ioredis); since the CONTEXT.md locks ioredis as the client, it must be added separately and a custom NestJS factory provider pattern is needed.

The existing openssl subprocess path in `AfipConfigService.getWsaaTicketTransient` is eliminated entirely. The private `buildTra()` method is extracted and reused in the new WsaaService. WSAA URLs verified in official AFIP documentation remain at `wsaahomo.afip.gov.ar` / `wsaa.afip.gov.ar` — no migration to `arca.gob.ar` domain has occurred for the actual SOAP endpoints as of March 2026, though the portal itself is branded ARCA.

The signing pattern using node-forge is: `forge.pkcs7.createSignedData()`, set `content`, add certificate, add signer with `digestAlgorithm: forge.pki.oids.sha256`, call `p7.sign({ detached: false })`, then produce DER as `Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary').toString('base64')`. This exact output feeds the SOAP `<wsaa:in0>` element, identical to what the current openssl subprocess produces.

**Primary recommendation:** Install `node-forge@1.3.3 @types/node-forge ioredis @types/ioredis async-mutex`, implement WsaaService with the three-layer pattern (Redis check → lock → WSAA call → cache), and replace AfipConfigService's `getWsaaTicketTransient` with a delegation call to `WsaaService.getTicketTransient`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node-forge | 1.3.3 | CMS/PKCS#7 in-process signing | Locked decision; eliminates openssl subprocess and /tmp key exposure |
| ioredis | ^5.x | Redis client for ticket cache | Locked decision; same Redis instance as BullMQ but independent client |
| async-mutex | ^0.5.x | Per-CUIT mutex to prevent concurrent WSAA calls | Locked decision; lightweight, TypeScript-native, zero dependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/node-forge | ^1.3.x | TypeScript types for node-forge | Required — forge has no bundled types |
| @types/ioredis | ^5.x | TypeScript types for ioredis | May be bundled in ioredis v5; verify after install |
| axios | already installed (^1.13.1) | SOAP HTTP calls to WSAA | Already present — reuse existing import |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ioredis | `redis` v5 (already installed) | `redis` v5 is already in the project but CONTEXT.md locks ioredis; ioredis has more predictable synchronous-style API |
| async-mutex per-key Map | Redis-distributed lock | Redis lock adds network round-trip; in-process Mutex is sufficient for single-instance; Redis-lock needed only for horizontal scale |
| node-forge | `@peculiar/x509` + WebCrypto | WebCrypto requires async keygen but lacks PKCS#7 signed-data API; node-forge is the only pure-JS library with complete PKCS#7 sign support |

**Installation:**
```bash
npm install node-forge@1.3.3 ioredis async-mutex
npm install --save-dev @types/node-forge
```

---

## Architecture Patterns

### Recommended Project Structure
```
backend/src/modules/wsaa/
├── wsaa.module.ts          # Conditional DI: WsaaService or WsaaStubService
├── wsaa.service.ts         # getTicket(), getTicketTransient()
├── wsaa.service.spec.ts    # Unit tests — CAE-01 behaviors
├── wsaa-stub.service.ts    # Dev stub (follows AfipStubService pattern)
├── wsaa.interfaces.ts      # AccessTicket interface, WsaaService interface
└── wsaa.constants.ts       # WSAA_REDIS_CLIENT token, WSAA_SERVICE token
```

### Pattern 1: WsaaModule with Conditional Provider Swap

**What:** WsaaModule uses `ConfigService` to check `USE_AFIP_STUB` and provides either `WsaaService` (real) or `WsaaStubService` (fake) under the `WSAA_SERVICE` injection token.

**When to use:** Every time the module is imported — stub mode requires no Redis or WSAA reachability.

```typescript
// Source: AfipStubService pattern + CONTEXT.md decision
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { WsaaService } from './wsaa.service';
import { WsaaStubService } from './wsaa-stub.service';
import { WSAA_SERVICE, WSAA_REDIS_CLIENT } from './wsaa.constants';

@Module({
  imports: [
    // PrismaModule is @Global() — no import needed
    // ConfigModule is global — no import needed
    // AfipConfigModule — import to access AfipConfigService for cert+key loading
  ],
  providers: [
    {
      provide: WSAA_REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        if (config.get('USE_AFIP_STUB') === 'true') return null; // stub: skip redis
        return new Redis({
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: WSAA_SERVICE,
      useFactory: (config: ConfigService, redis: Redis | null) => {
        if (config.get('USE_AFIP_STUB') === 'true') return new WsaaStubService();
        return new WsaaService(redis, /* prisma, encryption injected differently */);
      },
      inject: [ConfigService, WSAA_REDIS_CLIENT],
    },
  ],
  exports: [WSAA_SERVICE],
})
export class WsaaModule {}
```

> Note: Injecting PrismaService and EncryptionService into WsaaService via constructor injection is cleaner than factory-level wiring. Prefer `providers: [WsaaService, WsaaStubService]` with a separate conditional provider for the WSAA_SERVICE token.

### Pattern 2: getTicket() — Redis + Mutex + WSAA

**What:** Standard cached-ticket flow. Mutex per `{profesionalId}:{cuit}` serializes concurrent callers.

**When to use:** Every invoice emission call (Phase 14 WSFEv1).

```typescript
// Source: CONTEXT.md specifics section + async-mutex docs
import { Mutex } from 'async-mutex';

private readonly mutexMap = new Map<string, Mutex>();

async getTicket(profesionalId: string, service: string): Promise<AccessTicket> {
  // 1. Load cert+key from DB (decrypt via EncryptionService)
  const cfg = await this.loadConfig(profesionalId);
  const mutexKey = `${profesionalId}:${cfg.cuit}`;

  if (!this.mutexMap.has(mutexKey)) {
    this.mutexMap.set(mutexKey, new Mutex());
  }
  const mutex = this.mutexMap.get(mutexKey)!;

  return mutex.runExclusive(async () => {
    // 2. Check Redis cache
    const redisKey = `afip_ta:${profesionalId}:${cfg.cuit}:${service}`;
    const cached = await this.redisSafeGet(redisKey);
    if (cached) return JSON.parse(cached) as AccessTicket;

    // 3. Call WSAA
    const ticket = await this.callWsaa(cfg.certPem, cfg.keyPem, cfg.ambiente, service);

    // 4. Store in Redis with TTL = expiry - now - 5min
    const ttl = Math.floor((ticket.expiresAt.getTime() - Date.now()) / 1000) - 300;
    if (ttl > 0) await this.redisSafeSet(redisKey, JSON.stringify(ticket), ttl);

    return ticket;
  });
}
```

### Pattern 3: node-forge CMS Signing (replaces openssl subprocess)

**What:** Signs TRA XML with PKCS#7 SignedData, non-detached, DER output as base64.

**When to use:** Inside `callWsaa()` — called by both `getTicket()` and `getTicketTransient()`.

```typescript
// Source: DefinitelyTyped node-forge-tests.ts + forge.pkcs7 API
import * as forge from 'node-forge';

private signTra(traXml: string, certPem: string, keyPem: string): string {
  const cert = forge.pki.certificateFromPem(certPem);
  const key = forge.pki.privateKeyFromPem(keyPem);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(traXml, 'utf8');
  p7.addCertificate(cert);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign({ detached: false }); // nodetach — content embedded in CMS envelope

  // DER output as base64 — matches openssl smime -sign -outform DER output
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return Buffer.from(der, 'binary').toString('base64');
}
```

### Pattern 4: WSAA loginCms SOAP Call

**What:** Sends CMS base64 to WSAA and parses token + sign + expirationTime from XML response.

**When to use:** Only when cache misses and no mutex is holding a pending ticket.

```typescript
// Source: AfipConfigService.getWsaaTicketTransient (existing) — same pattern
private async callWsaa(
  certPem: string, keyPem: string, ambiente: AmbienteAFIP, service: string
): Promise<AccessTicket> {
  const wsaaUrl = ambiente === 'PRODUCCION'
    ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms'
    : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';

  const tra = this.buildTra(service);
  const cms = this.signTra(tra, certPem, keyPem);

  const soapEnv = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov/">
  <soapenv:Header/><soapenv:Body>
    <wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await axios.post(wsaaUrl, soapEnv, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
    timeout: 15_000,
  });

  const xml: string = res.data;
  const token = xml.match(/<token>([\s\S]*?)<\/token>/)?.[1];
  const sign = xml.match(/<sign>([\s\S]*?)<\/sign>/)?.[1];
  const expiryStr = xml.match(/<expirationTime>([\s\S]*?)<\/expirationTime>/)?.[1];

  if (!token || !sign) throw new AfipUnavailableException('WSAA no respondió token/sign');

  return {
    token,
    sign,
    expiresAt: expiryStr ? new Date(expiryStr) : new Date(Date.now() + 12 * 60 * 60 * 1000),
  };
}
```

### Pattern 5: Redis Degraded Mode (redisSafe helpers)

**What:** Wraps Redis calls in try/catch — on failure logs warning and returns null (get) or void (set). Callers proceed with live WSAA call.

```typescript
private async redisSafeGet(key: string): Promise<string | null> {
  if (!this.redis) return null;
  try {
    return await this.redis.get(key);
  } catch (err) {
    this.logger.warn('Redis GET failed, proceeding without cache', err);
    return null;
  }
}

private async redisSafeSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!this.redis) return;
  try {
    await this.redis.set(key, value, 'EX', ttlSeconds);
  } catch (err) {
    this.logger.warn('Redis SET failed, ticket not cached', err);
  }
}
```

### Pattern 6: AfipConfigService Integration (openssl elimination)

**What:** Replace `getWsaaTicketTransient` in AfipConfigService with a call to `WsaaService.getTicketTransient`. After cert-save, warm the cache via `WsaaService.getTicket`.

```typescript
// In AfipConfigService.saveCert (after upsert completes):
const ticket = await this.wsaaService.getTicket(profesionalId, 'wsfe');
// ticket is now cached in Redis — first FECAESolicitar call hits cache
```

### Anti-Patterns to Avoid

- **In-memory Map for ticket storage:** Does not survive server restart or horizontal scale. Redis from commit 1.
- **Mutex at module scope (single Mutex for all CUITs):** Serializes all tenants behind one lock. Use per-CUIT Map of Mutex instances.
- **Calling WSAA on every invoice:** TTL is ~12 hours; cache hit rate should be ~100% in normal operation.
- **Writing /tmp files with cert/key:** The entire point of node-forge is in-process signing. No filesystem writes.
- **Catching all errors and swallowing them:** Redis errors should degrade gracefully; WSAA errors (timeout, HTTP 5xx) should throw `AfipUnavailableException` so BullMQ can retry.
- **Using `detached: true` in forge.pkcs7.sign():** AFIP requires the content embedded in the CMS envelope (equivalent to openssl `smime -sign -nodetach`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PKCS#7 CMS signing | Custom ASN.1 encoder / openssl subprocess | `node-forge` pkcs7 | ASN.1 DER encoding has dozens of edge cases in encoding length, OID tables, SignerInfo structure |
| Per-key async serialization | Promise chain + array queue | `async-mutex` Mutex per key | Race conditions in lock acquisition are subtle; async-mutex is battle-tested |
| Redis connection management | Custom retry/reconnect logic | `ioredis` built-in retry | ioredis handles reconnection, command queuing during disconnects automatically |
| TRA timestamp formatting | Custom ISO8601 with timezone | `buildTra()` from AfipConfigService | Already validated against WSAA in production; -03:00 timezone required |

**Key insight:** The openssl subprocess is the only "custom" solution in the current codebase for CMS signing, and it is already known to expose key material in /tmp on crash paths. node-forge eliminates this entirely with equivalent output.

---

## Common Pitfalls

### Pitfall 1: WSAA URL domain migration (ARCA rebrand)
**What goes wrong:** WSAA endpoints at `wsaahomo.afip.gov.ar` and `wsaa.afip.gov.ar` remain valid as of March 2026. The ARCA rebrand affected the web portal (arca.gob.ar) but not the SOAP endpoints in official AFIP developer documentation. Using `arca.gob.ar` for SOAP calls may or may not work — it is unverified.
**Why it happens:** AFIP was rebranded to ARCA but endpoint migration is gradual and not officially announced in developer docs.
**How to avoid:** Store URLs in env vars (`AFIP_WSAA_URL_HOMO`, `AFIP_WSAA_URL_PROD`) with `afip.gov.ar` defaults. This allows runtime override without code changes if migration completes.
**Warning signs:** `ECONNREFUSED` or `503` errors from the WSAA endpoint.

### Pitfall 2: TRA `expirationTime` window rejection
**What goes wrong:** WSAA rejects TRA if `expirationTime - generationTime > allowed_window`. The documented maximum window is ~2 minutes for production, ~10 minutes for homo, but AFIP can change this without notice.
**Why it happens:** The current `buildTra()` uses 10 minutes (`+600_000 ms`), which is at the homo limit. The safe practice is to keep the window small (2–5 minutes) since the ticket itself is valid for ~12 hours regardless.
**How to avoid:** Keep the TRA window at 10 minutes for homo (current behavior) and confirm the exact limit in production during first test. A window of `generationTime - 2min` / `expirationTime + 2min` (symmetric around now) is the recommended production-safe approach.
**Warning signs:** WSAA error response mentioning TRA expired or invalid time window in the SOAP fault.

### Pitfall 3: `detached: true` vs `detached: false` in node-forge sign
**What goes wrong:** Signing with `detached: true` produces a signature without the content embedded. AFIP's WSAA expects the full CMS envelope with content attached (equivalent to `openssl smime -sign -nodetach`). Using detached mode produces a valid CMS blob that WSAA rejects with a cryptographic error.
**Why it happens:** `detached` is the node-forge default in some contexts; must be explicit.
**How to avoid:** Always call `p7.sign({ detached: false })`.
**Warning signs:** WSAA returns a SOAP fault mentioning signature verification failure or malformed CMS.

### Pitfall 4: forge string encoding vs Buffer for TRA content
**What goes wrong:** Setting `p7.content = traXml` directly may use binary encoding. The TRA XML contains UTF-8 characters (ISO dates with timezone `-03:00`). Misencoding produces a signature over wrong bytes.
**Why it happens:** node-forge's internal buffer defaults depend on whether content is set as string or Buffer.
**How to avoid:** Use `p7.content = forge.util.createBuffer(traXml, 'utf8')` explicitly.
**Warning signs:** WSAA returns signature verification error despite valid cert/key pair.

### Pitfall 5: Mutex memory leak on server restart / CUIT flood
**What goes wrong:** `mutexMap` grows unbounded if many different CUITs are processed. In practice this is bounded by tenant count (small number) but worth documenting.
**Why it happens:** Map entries are never evicted.
**How to avoid:** In a multi-tenant SaaS with small CUIT count (< 1000 tenants), the Map is safe. No action needed for this project.
**Warning signs:** RSS memory growing monotonically over days in high-tenant environments.

### Pitfall 6: Redis SET TTL of 0 or negative
**What goes wrong:** If `ticket.expiresAt` is less than 5 minutes from now (e.g., WSAA returned a near-expired ticket due to clock skew), `ttlSeconds` becomes 0 or negative. `redis.set(key, value, 'EX', 0)` throws an error.
**Why it happens:** Clock skew between server and WSAA, or WSAA returned a malformed `expirationTime`.
**How to avoid:** Guard: `if (ttl > 0) await this.redisSafeSet(...)`. This is already in the pattern above.

### Pitfall 7: `@types/ioredis` vs bundled types
**What goes wrong:** ioredis v5 ships its own TypeScript types — installing `@types/ioredis` separately may cause type conflicts.
**Why it happens:** ioredis v4 required `@types/ioredis`; v5 bundles its own.
**How to avoid:** Install ioredis, run `tsc --noEmit`, only add `@types/ioredis` if compilation fails with missing types.

---

## Code Examples

### TRA XML Builder (extracted from AfipConfigService.buildTra)
```typescript
// Source: backend/src/modules/afip-config/afip-config.service.ts line 259
// Move to wsaa.service.ts as private method
private buildTra(service: string): string {
  const now = new Date();
  const expiry = new Date(now.getTime() + 600_000); // 10 min
  const fmt = (d: Date) => d.toISOString().replace('Z', '-03:00');
  return `<?xml version="1.0" encoding="UTF-8"?>`
    + `<loginTicketRequest version="1.0">`
    + `<header>`
    + `<uniqueId>${Date.now()}</uniqueId>`
    + `<generationTime>${fmt(now)}</generationTime>`
    + `<expirationTime>${fmt(expiry)}</expirationTime>`
    + `</header>`
    + `<service>${service}</service>`
    + `</loginTicketRequest>`;
}
```

### AccessTicket Interface
```typescript
// wsaa.interfaces.ts
export interface AccessTicket {
  token: string;
  sign: string;
  expiresAt: Date;
}

export interface WsaaServiceInterface {
  getTicket(profesionalId: string, service: string): Promise<AccessTicket>;
  getTicketTransient(
    certPem: string,
    keyPem: string,
    ambiente: AmbienteAFIP,
    service: string,
  ): Promise<AccessTicket>;
}
```

### WsaaStubService (follows AfipStubService pattern)
```typescript
// Source: backend/src/modules/finanzas/afip/afip-stub.service.ts (same pattern)
@Injectable()
export class WsaaStubService implements WsaaServiceInterface {
  async getTicket(_profesionalId: string, _service: string): Promise<AccessTicket> {
    return {
      token: 'stub-token',
      sign: 'stub-sign',
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    };
  }

  async getTicketTransient(
    _certPem: string, _keyPem: string, _ambiente: AmbienteAFIP, _service: string,
  ): Promise<AccessTicket> {
    return {
      token: 'stub-token',
      sign: 'stub-sign',
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    };
  }
}
```

### ioredis Custom Provider (NestJS factory pattern)
```typescript
// Source: WebSearch verified pattern — standard NestJS FactoryProvider
// wsaa.constants.ts
export const WSAA_REDIS_CLIENT = 'WSAA_REDIS_CLIENT';
export const WSAA_SERVICE = 'WSAA_SERVICE';

// wsaa.module.ts provider entry
{
  provide: WSAA_REDIS_CLIENT,
  useFactory: (config: ConfigService) => {
    if (config.get('USE_AFIP_STUB') === 'true') return null;
    return new Redis({
      host: config.get('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
    });
  },
  inject: [ConfigService],
},
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| openssl subprocess in AfipConfigService | node-forge in-process CMS signing | Phase 13 | Eliminates /tmp key exposure, works in environments without openssl binary |
| No ticket cache | Redis cache with ioredis | Phase 13 | Avoids ~1 WSAA call per invoice; tickets live ~12 hours |
| Single WSAA call per request | async-mutex per-CUIT | Phase 13 | Prevents thundering herd under concurrent invoice requests |
| WSAA logic in AfipConfigService | Standalone WsaaModule | Phase 13 | Clean separation; Phase 14 imports WsaaModule directly |

**Deprecated/outdated:**
- `AfipConfigService.getWsaaTicketTransient` (private method): Replaced by `WsaaService.getTicketTransient()`. Remove after WsaaModule is wired.
- `AfipConfigService.buildTra` (private method): Move to `WsaaService` — it belongs with WSAA logic, not cert management.

---

## Open Questions

1. **arca.gob.ar WSAA endpoint status**
   - What we know: Official AFIP developer docs (README.txt, consulted March 2026) still list `wsaahomo.afip.gov.ar` and `wsaa.afip.gov.ar`. Search results mention `wsaahomo.arca.gov.ar` as an alternative URL.
   - What's unclear: Whether `arca.gob.ar` endpoints are live and equivalent, or just DNS aliases, or partially migrated.
   - Recommendation: Use `afip.gov.ar` endpoints as primary defaults. Store in env vars so they can be overridden without code changes. During integration testing in homo, verify both domains respond identically.

2. **TRA `expirationTime` production limit**
   - What we know: Homo allows 10-minute window. Production documented at ~2 minutes in community sources (MEDIUM confidence — no official primary source found).
   - What's unclear: Exact production limit as of 2026.
   - Recommendation: Keep 10-minute window for Phase 13 (homo only). Before first production deploy, test with 2-minute window. The ticket TTL (~12 hours) is independent of TRA window.

3. **`@types/ioredis` needed or bundled**
   - What we know: ioredis v5 is likely to bundle its own types. ioredis v4 required `@types/ioredis`.
   - What's unclear: Exact ioredis version to install and whether separate `@types` package is needed.
   - Recommendation: `npm install ioredis`, run tsc, decide based on compilation output.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (NestJS default, already configured) |
| Config file | `backend/package.json` `jest` section |
| Quick run command | `cd backend && npx jest wsaa --testPathPattern=wsaa` |
| Full suite command | `cd backend && npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAE-01 | getTicket() returns cached ticket on second call (no WSAA call) | unit | `cd backend && npx jest wsaa.service --testPathPattern=wsaa.service` | ❌ Wave 0 |
| CAE-01 | getTicket() with Redis miss calls WSAA and stores in Redis | unit | same | ❌ Wave 0 |
| CAE-01 | Two concurrent getTicket() calls serialize — only one hits WSAA | unit | same | ❌ Wave 0 |
| CAE-01 | Redis key format is `afip_ta:{profesionalId}:{cuit}:{service}` | unit | same | ❌ Wave 0 |
| CAE-01 | TTL = expiry - now - 5min in seconds | unit | same | ❌ Wave 0 |
| CAE-01 | Redis failure degrades gracefully (no exception, live WSAA call) | unit | same | ❌ Wave 0 |
| CAE-01 | WsaaStubService returns stub ticket without Redis or WSAA | unit | `cd backend && npx jest wsaa-stub` | ❌ Wave 0 |
| CAE-01 | signTra() produces base64 DER that is a valid CMS structure | unit | same (mock forge verify) | ❌ Wave 0 |
| CAE-01 | getTicketTransient() is lock-free and Redis-free | unit | same | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && npx jest wsaa --testPathPattern=wsaa`
- **Per wave merge:** `cd backend && npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/modules/wsaa/wsaa.service.spec.ts` — covers all CAE-01 behaviors (mock ioredis, mock forge, mock axios, mock AfipConfigService)
- [ ] `backend/src/modules/wsaa/wsaa-stub.service.spec.ts` — trivial coverage for stub
- [ ] `backend/src/modules/wsaa/wsaa.module.ts` — module shell must exist before spec can be compiled

---

## Sources

### Primary (HIGH confidence)
- `backend/src/modules/afip-config/afip-config.service.ts` — existing openssl subprocess pattern, buildTra(), WSAA URL strings, SOAP envelope structure, response XML parsing
- `backend/src/modules/afip-config/afip-config.service.spec.ts` — Jest test patterns (NestJS TestingModule, jest.Mocked, provider structure)
- `backend/src/modules/finanzas/afip/afip-stub.service.ts` — DI swap pattern for stub service
- `backend/src/app.module.ts` — BullMQ Redis connection pattern (ConfigService injection, REDIS_HOST/REDIS_PORT)
- DefinitelyTyped `node-forge-tests.ts` (raw.githubusercontent.com) — `forge.pkcs7.createSignedData()` API: addCertificate, addSigner, `p7.sign({ detached: false })`, `forge.asn1.toDer(p7.toAsn1()).getBytes()` for DER output
- `https://www.afip.gob.ar/ws/WSAA/README.txt` — official WSAA SOAP endpoint URLs (afip.gov.ar domain confirmed current)

### Secondary (MEDIUM confidence)
- WebSearch + pyafipws source (reingart/pyafipws) — WSAA response fields: `token`, `sign`, `expirationTime`; ticket lifetime ~12 hours; TRA window defaults
- WebSearch NestJS ioredis factory provider pattern — `provide: 'REDIS_CLIENT', useFactory: (config: ConfigService) => new Redis({...}), inject: [ConfigService]`
- WebSearch async-mutex npm — `Mutex` class, `runExclusive()` API, per-key Map pattern
- `https://github.com/emilianoto/afipjs` — WSAA TRA/TA structure in Node.js ecosystem context

### Tertiary (LOW confidence)
- WebSearch mention of `wsaahomo.arca.gov.ar` as alternative URL — unverified, not in official AFIP developer docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — node-forge 1.3.3, ioredis, async-mutex all confirmed by Context.md decisions + npm ecosystem verification
- Architecture: HIGH — patterns derived from existing code in the repo (AfipConfigService, AfipStubService) with confirmed API shapes from DefinitelyTyped
- Pitfalls: HIGH for items 1-4 (derived from code analysis); MEDIUM for item 5-7 (general ioredis/Redis edge cases)
- WSAA URL migration: MEDIUM — official docs say afip.gov.ar; community mentions arca.gob.ar; recommendation: env vars

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (30 days — stable APIs; WSAA URL migration is the only time-sensitive item)
