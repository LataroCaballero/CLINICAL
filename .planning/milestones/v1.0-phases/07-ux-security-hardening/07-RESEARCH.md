# Phase 7: UX + Security Hardening - Research

**Researched:** 2026-03-02
**Domain:** Frontend pagination UX (React/TanStack Query) + NestJS webhook HMAC security
**Confidence:** HIGH

## Summary

Phase 7 closes the final two open v1 requirements: LOG-02 (full contact history view) and WA-04 (Meta webhook HMAC signature verification). These are unrelated at the technical level but both are small, self-contained changes.

**LOG-02** is almost entirely done — the backend already returns `total` and supports unlimited `take` when no `limit` is passed. The `ContactosSection` component already renders a "Ver todos (N)" button stub with a `/* future */` comment. The only real work is wiring the button to expand the list in-place (re-fetch without limit) or open a full-view dialog/sheet. No backend changes needed.

**WA-04** requires adding HMAC-SHA256 signature validation to `POST /webhook/whatsapp` before the payload reaches BullMQ. The critical implementation detail is that HMAC must be computed over the **raw** request body (before JSON parsing). NestJS supports this via `rawBody: true` in `NestFactory.create()` options, which attaches a `Buffer` at `req.rawBody`. The signature lives in the `x-hub-signature-256` header, prefixed with `sha256=`. Meta's App Secret is the signing key. The validation must use `crypto.timingSafeEqual` to prevent timing attacks. The existing handler must still return 200 immediately for valid requests; invalid requests return 403.

**Primary recommendation:** Implement LOG-02 as an in-place state toggle in `ContactosSection` (no new component) and WA-04 as a NestJS Guard on `WhatsappWebhookController`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `crypto` (built-in) | Node 20 LTS | HMAC-SHA256 computation + timingSafeEqual | No external dependency; already imported in main.ts |
| NestJS `rawBody: true` option | NestJS v10 (project version) | Preserve raw request body buffer before JSON parsing | Official NestJS FAQ pattern for webhook signature verification |
| NestJS `CanActivate` Guard | NestJS v10 | Encapsulate signature verification as reusable guard | Consistent with project's guard pattern; keeps controller thin |
| TanStack Query `useQuery` | Already in project | Re-fetch contactos without limit on demand | Already used in `useContactos` hook; queryKey already defined |
| shadcn/ui `Dialog` | Already in project | Show full contact history in a modal overlay | Radix-based; avoids Drawer-in-Drawer z-index conflict already documented in STATE.md |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nestjs/platform-express` `RawBodyRequest` | NestJS v10 | TypeScript type for request with rawBody Buffer | In guard to properly type the request object |
| `date-fns` `formatDistanceToNow` | Already in project | Date rendering in full contact list | Re-use existing pattern from ContactosSection |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| NestJS Guard for HMAC | Inline check in controller | Guard is reusable, testable, and consistent with project patterns; inline is simpler but harder to test |
| Dialog for full history | New route/page | Dialog avoids navigation from within Drawer; STATE.md already documents z-index pattern for Sheet-inside-Drawer (use Dialog instead of Sheet to avoid portal conflicts) |
| `useQuery` with no limit | Separate hook `useAllContactos` | Re-using the same `useContactos(id)` without limit parameter avoids hook proliferation; query key already covers the pacienteId |

**Installation:** No new packages required. All dependencies are already present.

---

## Architecture Patterns

### Recommended Project Structure

```
backend/src/
├── modules/whatsapp/
│   ├── guards/
│   │   └── whatsapp-hmac.guard.ts    # NEW — CanActivate guard
│   ├── whatsapp-webhook.controller.ts  # ADD @UseGuards(WhatsappHmacGuard)
│   └── whatsapp.module.ts              # ADD guard to providers
└── main.ts                             # CHANGE: add rawBody: true

frontend/src/app/dashboard/pacientes/components/
└── ContactosSection.tsx               # CHANGE: wire "Ver todos" button
```

### Pattern 1: NestJS rawBody + Guard for HMAC verification

**What:** Enable raw body capture at application bootstrap, then verify HMAC in a guard before any controller handler runs.

**When to use:** Any webhook endpoint that requires request authenticity verification before processing.

**Example:**

```typescript
// main.ts — add rawBody: true
const app = await NestFactory.create(AppModule, { rawBody: true });
```

```typescript
// backend/src/modules/whatsapp/guards/whatsapp-hmac.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class WhatsappHmacGuard implements CanActivate {
  private readonly logger = new Logger(WhatsappHmacGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();

    const signature = request.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = request.rawBody;
    const appSecret = process.env.META_APP_SECRET;

    if (!appSecret) {
      this.logger.warn('META_APP_SECRET not set — skipping HMAC verification (dev mode)');
      return true; // Dev fallback; never skip in production
    }

    if (!signature || !rawBody) {
      this.logger.warn('Missing x-hub-signature-256 or rawBody');
      throw new UnauthorizedException('Missing webhook signature');
    }

    // Signature format: "sha256=<hex>"
    const expected = `sha256=${crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex')}`;

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    // Timing-safe comparison to prevent timing attacks
    if (sigBuffer.length !== expectedBuffer.length) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
```

```typescript
// whatsapp-webhook.controller.ts — add guard only to POST handler
@Post('webhook/whatsapp')
@HttpCode(200)
@UseGuards(WhatsappHmacGuard)
async handleWebhook(@Body() body: any): Promise<string> {
  await this.whatsappQueue.add('process-webhook', body, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
  return 'OK';
}
```

**Source:** NestJS official FAQ (rawBody), Meta Cloud API webhook security docs, Node.js crypto documentation.

### Pattern 2: LOG-02 — In-place expand via local state in ContactosSection

**What:** Toggle between "preview" (limit 5) and "full" (no limit) by holding a local `showAll` boolean. When `showAll=true`, pass no limit to `useContactos`, which hits the backend without `?limit=`.

**When to use:** When the full list is expected to be under ~50 items and a separate page/route is not warranted.

**Example:**

```typescript
// ContactosSection.tsx — minimal change
const [showAll, setShowAll] = useState(false);
const { data, isLoading } = useContactos(pacienteId, showAll ? undefined : 5);

// Replace the "Ver todos" button onClick:
onClick={() => setShowAll(true)}
```

**Alternative: Dialog overlay** — If the expanded list should visually separate from the PatientDrawer default view, open a Dialog (not Sheet) with all contactos. This avoids the Drawer-portal z-index issue documented in STATE.md decision `[02-02]`.

**Source:** Codebase analysis — `ContactosSection.tsx` line 119-128 has the stub; `useContactos.ts` already accepts optional `limit`.

### Anti-Patterns to Avoid

- **Don't apply `WhatsappHmacGuard` to `GET /webhook/whatsapp`** — Meta's verification challenge GET request does NOT include an HMAC signature; applying the guard there will break webhook registration.
- **Don't compare signatures with `===`** — timing attacks can leak secret length. Always use `crypto.timingSafeEqual`.
- **Don't read body as string after JSON parsing** — JSON parsing can normalize whitespace/encoding; always use `req.rawBody` Buffer. Meta generates the HMAC over the exact bytes it sends.
- **Don't create a new TanStack Query key for "all" contactos** — Re-use `['contactos', pacienteId]` without limit to avoid cache fragmentation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC signature computation | Custom hash logic | Node.js `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')` | Crypto primitives are in stdlib; hand-rolled is error-prone |
| Timing-safe comparison | `===` or custom loop | `crypto.timingSafeEqual(a, b)` | Prevents timing side-channel attacks; standard recommendation from Meta docs |
| Raw body capture middleware | Custom Express middleware | NestJS `rawBody: true` option + `RawBodyRequest` type | Native NestJS v10 feature; avoids body-parser conflict risk |

**Key insight:** The HMAC verification for Meta webhooks is 20 lines of guard code using entirely built-in Node.js crypto. The only infra change is `rawBody: true` in `main.ts`. Don't over-engineer.

---

## Common Pitfalls

### Pitfall 1: Applying HMAC guard to the GET verification endpoint

**What goes wrong:** `GET /webhook/whatsapp` (Meta's challenge handshake) has no `x-hub-signature-256`. If the guard runs on GET, Meta's verification fails and the webhook cannot be registered.

**Why it happens:** Applying `@UseGuards()` at the class level catches all methods.

**How to avoid:** Apply `@UseGuards(WhatsappHmacGuard)` only on the `@Post` handler (method-level), not at the `@Controller()` class level.

**Warning signs:** Webhook registration failing with 403/401 during Meta dashboard setup.

### Pitfall 2: rawBody is undefined despite rawBody: true

**What goes wrong:** `req.rawBody` is `undefined` in the guard even though `rawBody: true` is set.

**Why it happens:** If custom body parser middleware (`app.use(json())`) is added after `NestFactory.create`, it overrides NestJS's internal rawBody wiring. This project's `main.ts` does NOT add custom body parser middleware, so this is not a risk here.

**How to avoid:** Never add manual `app.use(json())` or `app.use(urlencoded())` calls when using `rawBody: true`. NestJS handles body parsing internally.

**Warning signs:** `request.rawBody` is `undefined` or `null` inside the guard.

### Pitfall 3: Signature length mismatch before timingSafeEqual

**What goes wrong:** `crypto.timingSafeEqual(a, b)` throws `RangeError: Input buffers must have the same byte length` if the two buffers differ in length.

**Why it happens:** An attacker or malformed request sends a signature of different length.

**How to avoid:** Check `sigBuffer.length !== expectedBuffer.length` first and throw `UnauthorizedException` before calling `timingSafeEqual`.

**Warning signs:** Unhandled RangeError in logs for some webhook requests.

### Pitfall 4: META_APP_SECRET not added to env

**What goes wrong:** Guard skips verification silently in production if env var is missing, defeating the purpose of WA-04.

**Why it happens:** Dev fallback (`return true` when secret is missing) helps local dev but can accidentally reach production.

**How to avoid:** Add a `WARN` log when skipping but also add `META_APP_SECRET` to `.env.example` and deployment env. The guard should hard-fail in production if secret is missing (consider checking `NODE_ENV`).

---

## Code Examples

Verified patterns from codebase analysis and official sources:

### Raw body setup (main.ts change — 1 line)

```typescript
// Source: NestJS official FAQ raw-body
// backend/src/main.ts
const app = await NestFactory.create(AppModule, { rawBody: true });
```

### HMAC guard skeleton (complete implementation)

```typescript
// Source: Node.js crypto docs + Meta webhook security docs
// backend/src/modules/whatsapp/guards/whatsapp-hmac.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class WhatsappHmacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const sig = req.headers['x-hub-signature-256'] as string | undefined;
    const raw = req.rawBody;
    const secret = process.env.META_APP_SECRET;

    if (!secret) return true; // dev fallback

    if (!sig || !raw) throw new UnauthorizedException('Missing signature');

    const expected = `sha256=${crypto.createHmac('sha256', secret).update(raw).digest('hex')}`;
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid signature');
    }
    return true;
  }
}
```

### ContactosSection showAll toggle (minimal diff)

```typescript
// Source: Codebase — ContactosSection.tsx
// Add to component top:
const [showAll, setShowAll] = useState(false);

// Change useContactos call:
const { data, isLoading } = useContactos(pacienteId, showAll ? undefined : 5);

// Change the "Ver todos" button onClick:
<button onClick={() => setShowAll(true)}>
  Ver todos ({total})
</button>
```

### Guard wired to POST handler only

```typescript
// Source: NestJS docs guard usage
import { UseGuards } from '@nestjs/common';
import { WhatsappHmacGuard } from './guards/whatsapp-hmac.guard';

// GET handler — NO guard (Meta challenge has no HMAC)
@Get('webhook/whatsapp')
verifyWebhook(...) { ... }

// POST handler — guard applied here only
@Post('webhook/whatsapp')
@HttpCode(200)
@UseGuards(WhatsappHmacGuard)
async handleWebhook(@Body() body: any): Promise<string> { ... }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual body-parser with verify option | `rawBody: true` in NestFactory.create | NestJS v9.3+ | Simpler; no custom middleware needed |
| `===` string comparison | `crypto.timingSafeEqual` with Buffer | Industry standard since ~2015 | Eliminates timing side-channel |
| Separate page for expanded list | In-place state toggle or Dialog overlay | React hooks era | Fewer routes, same UX quality |

**Deprecated/outdated:**
- Manual `app.use(bodyParser.json({ verify: ... }))` pattern: Still works but unnecessary when NestJS `rawBody: true` is available. The project's `main.ts` is clean and does not currently use custom body parsers, so the native option works directly.

---

## Open Questions

1. **Should "Ver todos" expand in-place or open a Dialog?**
   - What we know: The component lives inside a `Drawer`. STATE.md decision `[02-02]` documents that `Sheet` inside `Drawer` causes Radix portal z-index conflicts. `Dialog` does not have this documented issue.
   - What's unclear: Whether expanding in-place (simpler) is sufficient UX or if a dedicated modal provides better readability for patients with 20+ contacts.
   - Recommendation: Default to in-place expansion (single `showAll` boolean, zero new components). Only use Dialog if product decides the contact list needs its own scroll container.

2. **Should the HMAC guard hard-fail if `META_APP_SECRET` is missing in production?**
   - What we know: Current guard skeleton returns `true` (skip verification) when secret is absent — safe for dev, risky if var is missing in production.
   - What's unclear: Whether this project uses `NODE_ENV` checking conventions.
   - Recommendation: Add a `Logger.warn` when skipping and document `META_APP_SECRET` in CLAUDE.md env vars. Hard-fail only if the planner decides to add `NODE_ENV` guard logic.

3. **Does BullMQ `process-webhook` job need the raw body or the parsed body?**
   - What we know: The existing processor (`handleProcessWebhook`) reads `body.entry[0].changes[0].value` — standard JSON structure. The guard runs before `@Body()` binding; `@Body()` still receives the parsed JSON object.
   - What's unclear: Nothing — the guard validates authenticity using `rawBody` while the controller passes the already-parsed `@Body()` to BullMQ. These are independent. No change to the processor required.

---

## Phase Requirements

<phase_requirements>

| ID | Description | Research Support |
|----|-------------|-----------------|
| LOG-02 | El perfil del paciente muestra el historial completo de interacciones ordenado cronológicamente | Backend already returns `total` and supports unlimited fetch (no `take` when no limit). `ContactosSection` has a stub button. Wire `showAll` state to toggle `useContactos` limit from 5 to undefined. |
| WA-04 | El sistema maneja correctamente los webhooks de Meta para actualizar el estado de mensajes en tiempo real — includes HMAC signature validation | Add `rawBody: true` to `NestFactory.create`, create `WhatsappHmacGuard` using `crypto.createHmac` + `timingSafeEqual`, apply guard to POST handler only. Existing `handleProcessWebhook` processor unchanged. |

</phase_requirements>

---

## Sources

### Primary (HIGH confidence)

- Codebase — `ContactosSection.tsx`, `useContactos.ts`, `pacientes.service.ts#getContactosByPaciente` — verified backend returns `total` and supports unlimited take; frontend has stub button
- Codebase — `whatsapp-webhook.controller.ts`, `main.ts` — verified current state: no rawBody, no HMAC guard
- Node.js v20 `crypto` module (built-in) — `createHmac`, `timingSafeEqual` are stable stdlib APIs
- [NestJS GitHub issue #10471](https://github.com/nestjs/nest/issues/10471) — `rawBody: true` option behavior and `RawBodyRequest` type
- [Manuel Heidrich blog — NestJS raw body webhook](https://manuel-heidrich.dev/blog/how-to-access-the-raw-body-of-a-stripe-webhook-request-in-nestjs/) — verified body-parser pattern

### Secondary (MEDIUM confidence)

- [WebSearch: Meta x-hub-signature-256 HMAC verification](https://communityforums.atmeta.com/discussions/dev-general/how-to-verify-a-webhook-request-sign/1171086) — Header name `x-hub-signature-256`, format `sha256=<hex>`, key is App Secret — consistent across multiple independent sources
- [Hookdeck — SHA256 webhook signature verification guide](https://hookdeck.com/webhooks/guides/how-to-implement-sha256-webhook-signature-verification) — verification algorithm confirmed
- [GitHub zeroclaw issue #51](https://github.com/zeroclaw-labs/zeroclaw/issues/51) — confirms `x-hub-signature-256` is the correct header Meta uses (not the older `x-hub-signature`)

### Tertiary (LOW confidence)

- None — all critical claims verified through primary or secondary sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project; rawBody pattern from NestJS official issue tracker
- Architecture: HIGH — patterns derived from codebase inspection; no speculation about project conventions
- Pitfalls: HIGH for HMAC (well-documented crypto pitfalls); MEDIUM for LOG-02 UX (dialog vs inline is a product decision, not a technical risk)

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable APIs; NestJS rawBody feature is mature)
