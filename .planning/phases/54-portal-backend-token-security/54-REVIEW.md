---
phase: 54-portal-backend-token-security
reviewed: 2026-06-30T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - backend/src/app.module.ts
  - backend/src/modules/paciente-portal/dto/update-contacto-portal.dto.ts
  - backend/src/modules/paciente-portal/dto/update-salud-staged.dto.ts
  - backend/src/modules/paciente-portal/guards/portal-jwt.guard.ts
  - backend/src/modules/paciente-portal/paciente-portal.controller.ts
  - backend/src/modules/paciente-portal/paciente-portal.module.ts
  - backend/src/modules/paciente-portal/paciente-portal.service.spec.ts
  - backend/src/modules/paciente-portal/paciente-portal.service.ts
  - backend/src/modules/paciente-portal/strategies/portal-jwt.strategy.ts
  - backend/src/prisma/migrations/20260630000000_portal_intentos_bloqueo/migration.sql
  - backend/src/prisma/schema.prisma
findings:
  critical: 1
  warning: 2
  info: 3
  total: 6
status: issues_found
---

# Phase 54: Code Review Report

**Reviewed:** 2026-06-30T00:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Reviewed the patient-portal backend security phase: SHA-256 hash token lookup,
the persistent DNI brute-force lock, the named portal-JWT strategy + guard, the
two narrow write DTOs, and the per-route `ValidationPipe({ whitelist: true })`.

Most of the security surface is sound and matches the stated invariants:

- **Token handling** — the raw URL token is never stored or compared raw; it is
  SHA-256 hashed and looked up against the unique `portalToken` column. Unknown
  token → 404 with no patient data. Correct.
- **Brute-force lock off-by-one** — traced through 1st/2nd/3rd failure, active
  block, and post-expiry reset. The 3-strike count (`>= MAX_INTENTOS`, base reset
  only when a prior block has expired) is correct; 429 is not dead code, and the
  active-block check runs before any DNI comparison. No off-by-one.
- **Scope enforcement** — `portal-jwt` strategy is named distinctly from the
  staff `jwt` strategy and rejects any payload whose `scope !== 'portal-paciente'`
  before resolving the patient; staff tokens cannot satisfy a portal route.
- **Mass-assignment on the request body** — both write routes carry the explicit
  `ValidationPipe({ whitelist: true })` and the service additionally rebuilds the
  Prisma `data` from an allow-list (`pickPresent`). Injected `dni` / `etapaCRM` /
  `alergias` keys cannot be written. Confirmed by the spec.

However, there is one BLOCKER: the two write routes leak the **entire** curated
clinical + CRM record (and the encrypted portal token) back to the patient in
their HTTP response, because the Prisma `update()` calls omit a `select`. This
silently bypasses the same D-08/D-09 read-surface invariant that `getDatos` so
carefully enforces. There is no global `ClassSerializerInterceptor` or global
`ValidationPipe` in this project to catch it (verified in `main.ts`).

## Critical Issues

### CR-01: Write routes return the full `Paciente` record — leaks curated clinical, CRM, and the AES-encrypted portal token

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:245-248` (`updateContacto`) and `:264-267` (`updateSaludStaged`)
**Issue:**
Both write methods end with:

```ts
return this.prisma.paciente.update({ where: { id: pacienteId }, data });
```

with **no `select`**. Prisma returns every scalar column of `Paciente` by
default, and NestJS serializes that object straight into the PATCH response body.
There is no global `ClassSerializerInterceptor` and no `@Exclude` on `Paciente`
(confirmed: `main.ts` registers neither), so the authenticated patient receives,
among others:

- `portalTokenCifrado` — the **AES-256-GCM-encrypted raw portal token**
  (`schema.prisma:219`) and `portalToken` (the SHA-256 lookup hash, `:217`).
- Curated staff-only clinical fields: `alergias`, `condiciones`, `medicacion`,
  `adicciones`, `diagnostico`, `tratamiento`, `objetivos`
  (`schema.prisma:165-168,171,214-215`).
- CRM-routing columns: `etapaCRM`, `temperatura`, `scoreConversion`,
  `motivoPerdida`, `flujo`, `notasComerciales`, `enListaEspera`,
  `comentarioListaEspera`, `crmArchivado` (`schema.prisma:197-211`).
- `profesionalId`, `obraSocialId`, `objecionId`, `portalIntentosFallidos`,
  `portalBloqueadoHasta`.

This is the exact data the phase's stated invariant forbids exposing ("The
authenticated read NEVER exposes curated staff-only clinical arrays nor
CRM-routing columns", D-08/D-09). `getDatos` enforces it with a tight `select`;
the write routes hand the same secrets back through the response of a 200 PATCH.
A no-op call (empty DTO → `data = {}`) is enough to dump the whole record.

The unit tests only assert the *input* `data` object, never the *returned*
payload, so the leak is untested.

**Fix:** Never return the raw updated entity. Either return the curated read
shape, or a constrained `select`, or nothing:

```ts
async updateContacto(pacienteId: string, dto: UpdateContactoPortalDto) {
  const data = this.pickPresent(dto, [/* ...contact keys... */]);
  await this.prisma.paciente.update({ where: { id: pacienteId }, data });
  return this.getDatos(pacienteId); // or: return a {select:{...safe...}} subset
}
```

Apply the same change to `updateSaludStaged` (return only the four
`*AutoReportad*` keys, or `getDatos`). Add a test asserting the response body
contains no `portalToken*`, `alergias`, `condiciones`, `medicacion`, or
`etapaCRM` keys.

## Warnings

### WR-01: `verificar` has no input validation on `body.dni` — non-string/missing value crashes with 500

**File:** `backend/src/modules/paciente-portal/paciente-portal.controller.ts:58-61` and `paciente-portal.service.ts:187`
**Issue:**
The route binds `@Body() body: { dni: string }` with no `ValidationPipe` and no
DTO (unlike the two PATCH routes). The service then calls
`dni.trim()` (`service.ts:187`) unconditionally. A request with a missing,
`null`, numeric, array, or object `dni` (e.g. `{}` or `{ "dni": 123 }`) makes
`dni.trim` throw `TypeError: ... is not a function` → unhandled 500. This is a
missing-input-validation defect on a public, unauthenticated route; it also
means the failed-attempt counter is never incremented on these malformed
requests.
**Fix:** Introduce a small DTO and validate it per-route:

```ts
class VerificarDniDto {
  @IsString() @IsNotEmpty() @MaxLength(20)
  dni!: string;
}
// ...
@Post(':token/verificar')
verificar(
  @Param('token') token: string,
  @Body(new ValidationPipe({ whitelist: true })) dto: VerificarDniDto,
) {
  return this.service.verificar(token, dto.dni);
}
```

### WR-02: `pickPresent` forwards explicit `null` into a non-nullable column

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:282`
**Issue:**
`pickPresent` only filters `undefined` (`if (value !== undefined)`), so an
explicit `null` is forwarded. `class-validator`'s `@IsOptional()` (on the
contact DTO) treats `null` as "skip validation", so `{ "telefono": null }`
passes the pipe and reaches `prisma.paciente.update({ data: { telefono: null }})`.
`Paciente.telefono` is non-nullable (`schema.prisma:158`), so Prisma throws at
runtime → 500. Lower-likelihood than CR-01 (requires the client to send an
explicit null), but it is a reachable crash path on an authenticated route.
**Fix:** Either drop `null` for required fields, or validate with
`@IsNotEmpty()` on `telefono`, or normalize: skip values that are `null` for
columns that cannot be nulled. Simplest: change the guard to
`if (value !== undefined && value !== null)` if clearing fields is not a portal
feature.

## Info

### IN-01: DNI compared with non-constant-time `!==`

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:189`
**Issue:** The normalized DNI is compared with `!==`, which short-circuits on the
first differing character. In isolation this is a timing oracle. In practice the
3-attempt-per-15-min per-token lock and the 20 req/min throttle make character
recovery infeasible, so this is informational rather than a true vulnerability.
**Fix:** If hardening is desired, compare with
`crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` (guarding equal length
first). Not required given the lock.

### IN-02: Portal JWT shares `JWT_SECRET` with staff tokens

**File:** `backend/src/modules/paciente-portal/paciente-portal.module.ts:25` and `strategies/portal-jwt.strategy.ts:30`
**Issue:** The portal token is signed/verified with the same `JWT_SECRET` as
staff tokens. Separation rests entirely on the single `scope` claim check in
`validate()`. That check is correct today, but a future regression there would
silently re-admit staff tokens. Defense-in-depth would be a dedicated
`PORTAL_JWT_SECRET`. Acknowledged design tradeoff; noting for the record.

### IN-03: Per-token DNI lock enables a targeted patient lockout (DoS by design)

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:197-206`
**Issue:** The lock is keyed per patient/token. Anyone who obtains a patient's
portal URL can send 3 wrong DNIs and lock the genuine patient out for 15 minutes
(the active-block check rejects even a correct DNI). This is the intended
behavior of D-01/D-02, but worth recording as a known availability tradeoff;
since brute-force first requires the high-entropy token, impact is limited.

---

_Reviewed: 2026-06-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
