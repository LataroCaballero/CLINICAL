# Phase 54: Portal Backend + Token Security - Pattern Map

**Mapped:** 2026-06-30
**Files analyzed:** 8 (6 new + 2 modified)
**Analogs found:** 8 / 8

> Source of truth: `54-CONTEXT.md` (no RESEARCH.md — research was skipped). All analogs cited with real paths + line numbers from the live codebase.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/src/modules/paciente-portal/paciente-portal.controller.ts` (NEW) | controller (public) | request-response | `backend/src/modules/presupuestos/presupuesto-public.controller.ts` | exact |
| `backend/src/modules/paciente-portal/paciente-portal.service.ts` (NEW) | service | CRUD + token-lookup | `presupuestos.service.ts` §`verificarYCargar` + `pacientes.service.ts` §`generarPortalLink`/`obtenerPortalLink` | role+flow match |
| `backend/src/modules/paciente-portal/paciente-portal.module.ts` (NEW) | module/config | n/a | `backend/src/modules/presupuestos/presupuestos.module.ts` | exact |
| `backend/src/modules/paciente-portal/guards/portal-jwt.guard.ts` (NEW) | guard | request-response | `backend/src/modules/auth/guards/jwt-auth.guard.ts` + `strategies/jwt.strategy.ts` | role-match (needs new strategy/scope) |
| `backend/src/modules/paciente-portal/dto/update-contacto-portal.dto.ts` (NEW) | DTO | transform/validate | `backend/src/modules/pacientes/dto/create-contacto.dto.ts` + `enviar-portal-link-email.dto.ts` | exact |
| `backend/src/modules/paciente-portal/dto/update-salud-staged.dto.ts` (NEW) | DTO | transform/validate | `create-contacto.dto.ts` (class-validator + `@IsOptional`) | role-match |
| `backend/src/prisma/schema.prisma` §`Paciente` (MODIFIED) | model/migration | n/a | existing `Paciente` portal fields (lines 217-224) | in-file analog |
| `backend/src/app.module.ts` (MODIFIED) | config | n/a | existing module registration (lines 65-95) | in-file analog |

---

## Pattern Assignments

### `paciente-portal.controller.ts` (controller, public, request-response)

**Analog:** `backend/src/modules/presupuestos/presupuesto-public.controller.ts` (whole file, 59 lines) — near 1:1 model.

**Key structural facts to mirror:**
- NO `@UseGuards(...)` / NO `@Auth()` at class level → controller is public (JWT auth is per-route in this repo, never global — see Shared Patterns).
- Strict throttle tier applied **at class level**: `@Throttle({ default: { ttl: 60000, limit: 20 } })`. Note the nested `{ default: { ... } }` shape — this is the actual API in this repo (the CONTEXT shorthand `@Throttle({ ttl, limit })` must be written with the `default` wrapper).
- Token comes from the URL param `:token`; the DNI comes from the body `{ dni }`; never an id from the body (pitfall 12).

**Full canonical excerpt** (`presupuesto-public.controller.ts:1-41`):
```typescript
import { Controller, Get, Post, Param, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { PresupuestosService } from './presupuestos.service';

// No @Auth() decorator = public, no JWT required
// Strict public throttle tier (D-08): 20 req/min (lower than global 100 req/60s)
@Throttle({ default: { ttl: 60000, limit: 20 } })
@Controller('presupuestos/public')
export class PresupuestoPublicController {
  constructor(private readonly service: PresupuestosService) {}

  @Get(':token')
  getPublicPresupuesto(@Param('token') token: string) {
    return this.service.findByToken(token);
  }

  @Post(':token/verificar')
  verificarDni(@Param('token') token: string, @Body() body: { dni: string }) {
    return this.service.verificarYCargar(token, body.dni);
  }
}
```

**Planner mapping** (F54 routes per D-07/D-08/D-10 — exact base path is planner's discretion, `paciente-portal/public` suggested):
- `@Get(':token')` → pre-verification, returns 200/404 only, NO patient data (D-07). Public, no portal-JWT.
- `@Post(':token/verificar')` with `@Body() body: { dni: string }` → returns portal JWT (D-05) or 429 if blocked (D-01/D-02). Public, no portal-JWT.
- `@Get(...)` authenticated read → `@UseGuards(PortalJwtGuard)`, returns editable + read-only + staged values (D-08/D-09).
- `@Patch(...)` contact data → `@UseGuards(PortalJwtGuard)`, body = `UpdateContactoPortalDto` with `new ValidationPipe({ whitelist: true })` (D-11/D-12).
- `@Post`/`@Patch(...)` staged health → `@UseGuards(PortalJwtGuard)`, body = `UpdateSaludStagedDto` whitelisted (D-13).

> The authenticated routes need the portal-JWT guard, which the analog (a fully-public controller) does NOT show. Apply the guard **per-route** so the verify/pre-verify routes stay public.

---

### `paciente-portal.service.ts` (service, CRUD + token-lookup)

Two analog sources — copy each block verbatim into the new service.

#### A. DNI normalization / match — **Analog:** `presupuestos.service.ts` §`verificarYCargar` (lines 527-534)

Reuse this exact normalization (D-04: trim, strip whitespace, strip dots, case-insensitive):
```typescript
const dniInput = dni.trim().replace(/\s/g, '').replace(/\./g, '');
const dniStored = (paciente.dni ?? '')
  .trim()
  .replace(/\s/g, '')
  .replace(/\./g, '');
if (dniInput.toLowerCase() !== dniStored.toLowerCase()) {
  throw new UnauthorizedException('DNI incorrecto');
}
```
Exception imports come from `@nestjs/common` (same as `presupuestos.service.ts:1-6`): `NotFoundException`, `BadRequestException`, `UnauthorizedException`.

> Edge case from D (Claude's Discretion): `paciente.dni` may be null → the `?? ''` guard already prevents a match against an empty stored DNI only if `dniInput` is also empty. Planner must explicitly reject a patient with no DNI on file (a blank input must NOT match a blank stored value). Add an early guard: if `dniStored === ''` → throw `UnauthorizedException`.

#### B. SHA-256 token lookup — **Analog:** `pacientes.service.ts` §`generarPortalLink` (lines 1102-1103) — hashing recipe

The raw UUID from the URL is hashed and looked up against `Paciente.portalToken` (the 64-char hex hash). F54 only does the **lookup**, never regenerates (D-12 from F52). Import is `import * as crypto from 'crypto';` (`pacientes.service.ts:8`).

Hashing recipe (from `pacientes.service.ts:1103`):
```typescript
const hash = crypto.createHash('sha256').update(rawUuid).digest('hex'); // 64-char hex
```

Lookup pattern (mirror the `findUnique` + `select` shape used in `obtenerPortalLink`, `pacientes.service.ts:1133-1137`) — F54 version looks up BY the hash:
```typescript
const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
const paciente = await this.prisma.paciente.findUnique({
  where: { portalToken: tokenHash },
  select: {
    id: true,
    dni: true,
    portalIntentosFallidos: true,   // NEW (D-01)
    portalBloqueadoHasta: true,     // NEW (D-01)
    /* + fields needed for the authenticated GET */
  },
});
if (!paciente) throw new NotFoundException(); // 404, no patient data leaked (D-07)
```

> No `EncryptionService` needed in F54: decryption is only for recovering the raw URL (`obtenerPortalLink`). F54 receives the raw token from the URL directly, hashes it, and looks up — never decrypts.

#### C. Brute-force lock (D-01/D-02/D-03) — NO direct analog (new logic)

No existing service tracks failed-attempt counters. Planner designs this fresh against the two new `Paciente` columns:
- On DNI mismatch: increment `portalIntentosFallidos`; if it reaches 3 within the window, set `portalBloqueadoHasta = now + 15min` and throw `429` (use `ThrottlerException` or a custom `HttpException(... , 429)` — see "No Analog" note).
- On lookup: if `portalBloqueadoHasta > now` → throw 429 immediately.
- On DNI OK: reset `portalIntentosFallidos = 0` and clear `portalBloqueadoHasta` (D-03).
- Window auto-expiry: once `now > portalBloqueadoHasta` (or 15 min since last attempt), treat counter as reset (D-03).

#### D. JWT emission after DNI OK (D-05) — **Analog:** `auth.service.ts` (lines 52-55)

Staff sign pattern (`auth.service.ts:52-55`):
```typescript
const accessToken = this.jwt.sign({
  sub: user.id,
  rol: user.rol,
});
```
Portal version: inject `JwtService` (constructor, like `auth.service.ts:15` `private jwt: JwtService`), sign a portal-scoped payload with a short TTL (D-05, suggest 30-60 min) and a scope claim distinguishing it from staff tokens:
```typescript
const portalToken = this.jwt.sign(
  { sub: paciente.id, scope: 'portal-paciente' },
  { expiresIn: '45m' },
);
```
> `JwtModule` is registered in `AuthModule` which is `@Global()` (`auth.module.ts:11`), so `JwtService` is injectable anywhere with `signOptions: { expiresIn: '15m' }` default (`auth.module.ts:15-18`). The per-sign `{ expiresIn }` override sets the portal TTL.

#### E. Staged-health write confinement (D-13) — in-schema analog

Write ONLY to `alergiasAutoReportadas` / `antecedentesAutoReportados` (Json) / `medicacionAutoReportada` / `tratamientosPreviosAutoReportados` (`schema.prisma:221-224`). NEVER touch curated `alergias`/`condiciones`/`medicacion` (`schema.prisma:165-166, 214`). The Prisma `update` `data: {}` object is the enforcement point — only staging field keys appear there.

---

### `paciente-portal.module.ts` (module/config)

**Analog:** `backend/src/modules/presupuestos/presupuestos.module.ts` (whole file, 20 lines):
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PresupuestosController } from './presupuestos.controller';
import { PresupuestoPublicController } from './presupuesto-public.controller';
import { PresupuestosService } from './presupuestos.service';

@Module({
  imports: [CuentasCorrientesModule, ConfigModule],
  controllers: [PresupuestosController, PresupuestoPublicController],
  providers: [PresupuestosService, /* ... */],
  exports: [PresupuestosService],
})
export class PresupuestosModule {}
```
F54 module: import nothing extra for crypto/JWT (`PrismaModule` and the `@Global()` `AuthModule` give `PrismaService` + `JwtService`). Register the public controller + service + the new portal-JWT strategy/guard as providers.

---

### `guards/portal-jwt.guard.ts` (guard, request-response)

**Analog:** `backend/src/modules/auth/guards/jwt-auth.guard.ts` (4 lines) + `strategies/jwt.strategy.ts` (whole file).

The staff guard is trivially thin:
```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```
The real logic is the passport strategy (`jwt.strategy.ts:7-45`):
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }
  async validate(payload: any) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: payload.sub }, /* ... */ });
    if (!usuario) return null;
    return { userId: usuario.id, rol: usuario.rol, /* ... */ };
  }
}
```
**Portal version (separate strategy name so it does NOT collide with the staff `'jwt'` strategy):**
- `extends PassportStrategy(Strategy, 'portal-jwt')` (named strategy).
- In `validate(payload)`: reject if `payload.scope !== 'portal-paciente'` (returns null → 401), then load the `Paciente` by `payload.sub` and return `{ pacienteId }`.
- Guard: `export class PortalJwtGuard extends AuthGuard('portal-jwt') {}`.
- The route handler reads `req.user.pacienteId` — the scope is derived from the authenticated JWT, never from the body (pitfall 12 / D-05).
- Same secret/extraction as staff: `ExtractJwt.fromAuthHeaderAsBearerToken()`, `secretOrKey: process.env.JWT_SECRET`, `ignoreExpiration: false` (so an expired portal JWT → 401 → re-verify DNI per D-06).

> Register the new strategy + guard in `paciente-portal.module.ts` providers. Mirror `auth.module.ts:21-28` (strategy + guard listed as providers).

---

### `dto/update-contacto-portal.dto.ts` (DTO, validate) and `dto/update-salud-staged.dto.ts`

**Analog (decorators + optionality):** `backend/src/modules/pacientes/dto/create-contacto.dto.ts` (lines 1-27) — shows the `@IsOptional()` + typed-decorator pattern used across the repo:
```typescript
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateContactoDto {
  @IsEnum(TipoContacto)
  tipo: TipoContacto;

  @IsOptional()
  @IsString()
  nota?: string;
  // ...
}
```
**Analog (whitelist intent + the critical caveat):** `dto/enviar-portal-link-email.dto.ts:6-11`.

> CRITICAL FINDING for the planner — **there is NO global `ValidationPipe` in this project** (confirmed: no `useGlobalPipes`/`ValidationPipe` in `src/main.ts`; documented in `enviar-portal-link-email.dto.ts:6-7`, `pacientes.service.ts:37`, `portal-url.helper.ts:8`). Class-validator decorators alone DO NOT execute at runtime here.
>
> Therefore D-12's "`whitelist: true`, no `forbidNonWhitelisted`, silently ignore extra fields" REQUIRES an **explicit per-route pipe**. The planner must wire it on each write route, e.g.:
> ```typescript
> @Patch(':...')
> updateContacto(
>   @Body(new ValidationPipe({ whitelist: true })) dto: UpdateContactoPortalDto,
> ) { ... }
> ```
> `whitelist: true` strips undeclared props (silently ignoring `alergias`/`condiciones`/`etapaCRM`/`flujo`/`dni` — SC#3/D-12). Do NOT add `forbidNonWhitelisted` (that would 400 instead of ignore). This is the one place F54 deliberately diverges from the repo's "no ValidationPipe" status quo — it must be opt-in at the route.

**`UpdateContactoPortalDto`** (D-11 — all optional, only contact fields; field names mirror `schema.prisma:158-178`): `telefono?`, `telefonoAlternativo?`, `email?`, `direccion?`, `contactoEmergenciaNombre?`, `contactoEmergenciaTelefono?`, `contactoEmergenciaRelacion?` — each `@IsOptional()` + `@IsString()` (email `@IsEmail()`).

**`UpdateSaludStagedDto`** (D-13 — only `*AutoReportad*` keys; mirror `schema.prisma:221-224`): `alergiasAutoReportadas?: string[]` (`@IsOptional() @IsArray() @IsString({ each: true })`), `antecedentesAutoReportados?` (Json — `@IsOptional() @IsObject()`, shape is Claude's discretion per D), `medicacionAutoReportada?: string[]`, `tratamientosPreviosAutoReportados?: string` (`@IsOptional() @IsString()`).

---

### `schema.prisma` §`Paciente` (model + migration)

**In-file analog:** the existing portal/staging block (`schema.prisma:217-224`) shows the exact field style to match:
```prisma
  portalToken                       String?                  @unique // SHA-256 hash, never plaintext (PITFALL 1)
  portalTokenGeneradoAt             DateTime?
  portalTokenCifrado                String?
  alergiasAutoReportadas            String[]
  antecedentesAutoReportados        Json?
  medicacionAutoReportada           String[]
  tratamientosPreviosAutoReportados String?
```
**Add (D-01), matching the column-aligned style of the block:**
```prisma
  portalIntentosFallidos            Int                      @default(0)
  portalBloqueadoHasta              DateTime?
```
Then a single migration: `npx prisma migrate dev` (per CLAUDE.md). This is the ONLY migration of the phase. No index needed (lookup stays on the existing `@unique portalToken`).

---

### `app.module.ts` (module registration)

**In-file analog:** the import + `imports: [...]` array (`app.module.ts:33, 65-95`). `ConsentimientosModule` (line 33 import, line 94 in array) is the most recent feature-module registration to copy:
```typescript
// top of file
import { PacientePortalModule } from './modules/paciente-portal/paciente-portal.module';
// inside @Module({ imports: [ ... ] })
    ConsentimientosModule,
    PacientePortalModule,   // ADD
```
The global `ThrottlerGuard` (`APP_GUARD`, `app.module.ts:99`) already applies to the new public routes; the `@Throttle({ default: { ttl: 60000, limit: 20 } })` class decorator on the new controller tightens them to the strict tier (no provider change needed).

---

## Shared Patterns

### Public controller + strict throttle tier
**Source:** `presupuesto-public.controller.ts:10-12` and `app.module.ts:47,99`
**Apply to:** the new portal public controller.
```typescript
@Throttle({ default: { ttl: 60000, limit: 20 } })   // strict tier; global default is 100/60s
@Controller('...')                                    // NO @UseGuards at class level
```

### Per-route JWT guard (never global)
**Source:** `jwt-auth.guard.ts` + `jwt.strategy.ts`; established pattern noted in CONTEXT D-05 / line 108.
**Apply to:** authenticated portal read/write routes only — `@UseGuards(PortalJwtGuard)` per route, leaving `:token` and `:token/verificar` public.

### Scope from authenticated context, never the body (pitfall 12)
**Source:** `auth.service.ts:52-55` (payload `sub`) → `jwt.strategy.ts:36-44` (`validate` returns identity) → handler reads `req.user`.
**Apply to:** every authenticated portal route — derive `pacienteId` from `req.user.pacienteId` (set by the portal strategy), never from a body field.

### SHA-256 token, raw UUID only in URL (pitfall 1)
**Source:** `pacientes.service.ts:1103`
**Apply to:** the portal token lookup — `crypto.createHash('sha256').update(raw).digest('hex')` then `findUnique({ where: { portalToken: hash } })`.

### Explicit per-route ValidationPipe (no global pipe exists)
**Source:** documented in `enviar-portal-link-email.dto.ts:6-11`, `pacientes.service.ts:37`; confirmed absent in `main.ts`.
**Apply to:** every portal write route — `@Body(new ValidationPipe({ whitelist: true })) dto: ...Dto`. Without this, narrow DTOs are decorative only and SC#3 (D-12) is NOT enforced.

### NestJS exceptions for HTTP responses
**Source:** `presupuestos.service.ts:1-6` (imports) and `verificarYCargar` usage (`:518-533`).
**Apply to:** the portal service — `NotFoundException` (token 404, D-07), `UnauthorizedException` (DNI wrong / JWT scope wrong). For the 429 lock, no existing analog — use a `429` HTTP status (custom `HttpException('...', HttpStatus.TOO_MANY_REQUESTS)`); 429 body shape (message + optional `retryAfter`/`bloqueadoHasta`) is Claude's discretion (D).

---

## No Analog Found

| File / Concern | Role | Data Flow | Reason — planner designs fresh |
|------|------|-----------|---------|
| Brute-force lock counter logic (D-01/02/03) | service logic | stateful | No existing service tracks failed-attempt counters / time-window locks. New logic over the two new `Paciente` columns. |
| 429 "blocked" response | error response | request-response | No public endpoint currently returns a domain 429 (throttler 429 is framework-level). Planner picks `HttpException(.., 429)` + body shape (D). |
| Portal-scoped JWT strategy (`scope: 'portal-paciente'`) | guard/strategy | request-response | Only a single staff `'jwt'` strategy exists. A second NAMED passport strategy + scope-claim check is new (modeled on `jwt.strategy.ts` but not a copy). |

---

## Metadata

**Analog search scope:** `backend/src/modules/{presupuestos,pacientes,auth}/`, `backend/src/prisma/schema.prisma`, `backend/src/app.module.ts`, `backend/src/main.ts`
**Files scanned:** ~14
**Pattern extraction date:** 2026-06-30
