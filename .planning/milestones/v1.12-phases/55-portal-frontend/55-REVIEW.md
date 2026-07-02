---
phase: 55-portal-frontend
reviewed: 2026-07-01T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - backend/src/modules/paciente-portal/dto/create-consulta-portal.dto.ts
  - backend/src/modules/paciente-portal/paciente-portal.controller.ts
  - backend/src/modules/paciente-portal/paciente-portal.service.ts
  - backend/src/modules/paciente-portal/paciente-portal.service.spec.ts
  - frontend/src/app/portal/[token]/page.tsx
  - frontend/src/components/portal/PortalConsultas.tsx
  - frontend/src/components/portal/PortalInfoBasica.tsx
  - frontend/src/components/portal/PortalSalud.tsx
  - frontend/src/components/portal/SaludChips.tsx
  - frontend/src/hooks/usePortalDatos.ts
  - frontend/src/lib/portal-api.ts
  - frontend/src/schemas/portalConsulta.schema.ts
  - frontend/src/schemas/portalContacto.schema.ts
  - frontend/src/types/portal.ts
findings:
  critical: 0
  warning: 6
  info: 4
  total: 10
status: issues_found
---

# Phase 55: Code Review Report

**Reviewed:** 2026-07-01
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Reviewed the patient-portal slice (public DNI-gate + token-scoped JWT + confined
contact/health/consulta writes). To verify the security-critical claims I also
read the out-of-scope supporting files the changed code depends on
(`portal-jwt.guard.ts`, `portal-jwt.strategy.ts`, the two update DTOs,
`paciente-portal.module.ts`, and `schema.prisma` for `Paciente` / `MensajeInterno`).

The four security invariants the phase set out to enforce hold up under review:

- **Portal-JWT isolation** — the strategy is registered under the named key
  `'portal-jwt'`, rejects any payload whose `scope !== 'portal-paciente'`
  (returns `null` → 401), and resolves `sub` against `Paciente` (not `Usuario`).
  A staff token cannot satisfy a portal route and vice-versa.
- **Write-surface narrowing** — every write builds its Prisma `data` from an
  explicit allow-list (`pickPresent`) AND scopes the returned row via `select`,
  so curated clinical / CRM / token columns can neither be written nor echoed
  back. `crearConsulta` derives `pacienteId` from the JWT, never from the body.
- **DNI brute-force lock** — the 3-attempt / 15-min block-duration model is
  logically correct: the counter only resets on an *expired* prior block, so
  the 429 path is reachable and a legit patient still gets exactly 3 tries.
- **Injection** — Prisma parameterizes all queries; React escapes all rendered
  patient strings; no `eval`/`innerHTML`/`dangerouslySetInnerHTML`.

No BLOCKER-level defects were found. However, there are genuine robustness,
error-handling and input-validation gaps that should be fixed — most notably an
infinite loading spinner when the portal JWT expires, a swallowed network error
on the DNI gate, and completely unbounded input on the staged-health writes.

## Warnings

### WR-01: Portal JWT expiry / fetch error leaves the patient on an infinite loading spinner

**File:** `frontend/src/app/portal/[token]/page.tsx:237`
**Issue:** After `pageState === "ready"`, the render gate is
`if (datosLoading || !portalDatos) return <spinner>`. The portal JWT is
deliberately short-lived (45m, no refresh) and `usePortalDatos` has no `onError`
/ error branch. When the token expires (or any network failure hits
`GET /paciente-portal/public`), React Query settles with `isLoading === false`,
`data === undefined`, `isError === true`. The gate evaluates `!portalDatos` →
`true` and renders the spinner **forever**, with no error message and no path
back to the DNI gate. The stale token is never cleared.
**Fix:** Consume the error state and recover, e.g.:
```tsx
const { data: portalDatos, isLoading: datosLoading, isError } =
  usePortalDatos(pageState === "ready");

useEffect(() => {
  if (isError) {
    clearPortalToken();          // from portal-api.ts
    setPageState("dni-gate");    // force re-verify
  }
}, [isError]);
```

### WR-02: DNI-verify network failure is swallowed — no catch, no user feedback, unhandled rejection

**File:** `frontend/src/app/portal/[token]/page.tsx:90-133`
**Issue:** `handleVerificarDni` wraps the `fetch` in `try { ... } finally { setDniLoading(false) }`
with **no `catch`**. If `fetch` rejects (offline, DNS, CORS, backend down), the
exception propagates out of the async handler as an unhandled promise rejection.
The button re-enables via `finally`, but `dniError` is never set, so the patient
gets zero feedback and no idea the request failed. Contrast with the initial
pre-verify `useEffect`, which correctly `.catch(() => setPageState("error"))`.
**Fix:** Add a `catch` that surfaces the failure:
```tsx
} catch {
  setDniError("No pudimos conectar. Revisá tu conexión e intentá de nuevo.");
} finally {
  setDniLoading(false);
}
```

### WR-03: Staged-health writes accept unbounded input (no size limits on any field)

**File:** `backend/src/modules/paciente-portal/dto/update-salud-staged.dto.ts:12-30`
**Issue:** Unlike `CreateConsultaPortalDto` (which caps `mensaje` at
`@MaxLength(2000)`), none of the four staged-health fields are bounded:
`alergiasAutoReportadas` / `medicacionAutoReportada` are `@IsString({ each: true })`
with no `@MaxLength` and no `@ArrayMaxSize`; `antecedentesAutoReportados` is a
free-form `@IsObject()` (`Json?` column) with no depth/size limit;
`tratamientosPreviosAutoReportados` is `@IsString()` with no length cap. An
authenticated patient (post-DNI) can POST multi-megabyte arrays/objects, which
are persisted verbatim to `Paciente`. The contact DTO has the same gap (no
`@MaxLength` on `telefono`, `email`, `direccion`, etc.). This is a data-integrity
/ storage-abuse vector, not just style.
**Fix:** Bound every user-writable field, e.g.:
```ts
@IsOptional() @IsArray() @ArrayMaxSize(50)
@IsString({ each: true }) @MaxLength(120, { each: true })
alergiasAutoReportadas?: string[];

@IsOptional() @IsString() @MaxLength(4000)
tratamientosPreviosAutoReportados?: string;
```
and add `@MaxLength(...)` to each field in `UpdateContactoPortalDto`.

### WR-04: Patient cannot clear a previously-set contact field (empty string silently dropped twice)

**File:** `frontend/src/components/portal/PortalInfoBasica.tsx:48-59`
**Issue:** The payload is built with truthiness guards
(`if (values.telefonoAlternativo) payload.telefonoAlternativo = ...`), so an
emptied field is omitted from the request. The backend `pickPresent`
(`paciente-portal.service.ts:341-354`) independently drops `undefined`/`null`.
Net effect: when a patient deletes an outdated `telefonoAlternativo` / `email` /
`direccion` (all nullable columns) and hits Guardar, the UI shows success but the
old value persists and reappears on reload. The patient has no way to remove
stale contact data — a silent data-correctness bug.
**Fix:** For nullable contact fields, send `null` on empty to explicitly clear,
and have `pickPresent` forward `null` for the columns that are nullable in the
schema (guarding only the non-nullable `telefono`). Alternatively distinguish
"absent" from "cleared" in the form payload.

### WR-05: Brute-force counter is read-modify-write with a TOCTOU race (concurrent attempts bypass the 3-try cap)

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:196-224`
**Issue:** `verificar` reads `portalIntentosFallidos` in `findByRawToken`, then
computes `nuevoIntentos = base + 1` and writes it back in a separate `update`.
Concurrent requests for the same token all read the same stale counter (e.g. 0),
all fail the DNI check, and all write `1` — so the lock never trips within a
burst. The global throttle (20/min) caps the blast radius, but an attacker can
still get ~20 guesses/min instead of the intended 3/15-min. The 8-digit DNI space
makes this low practical risk, but the lock is weaker than designed.
**Fix:** Make the increment atomic and derive the block from the persisted count:
```ts
const updated = await this.prisma.paciente.update({
  where: { id: paciente.id },
  data: { portalIntentosFallidos: { increment: 1 } },
  select: { portalIntentosFallidos: true },
});
if (updated.portalIntentosFallidos >= MAX_INTENTOS) { /* set block */ }
```
(reset-on-expiry still needs handling, but the count itself must not be computed
from a stale read).

### WR-06: Whitespace-only consulta passes both schemas (only the disabled button prevents it)

**File:** `frontend/src/schemas/portalConsulta.schema.ts:4-7` and `backend/src/modules/paciente-portal/dto/create-consulta-portal.dto.ts:18`
**Issue:** `z.string().min(1)` and `@MinLength(1)` both count whitespace, so a
message of only spaces/newlines validates and would be persisted as an empty
`MensajeInterno` shown to staff. The UI is only saved by the
`disabled={... || !mensaje.trim()}` button guard (`PortalConsultas.tsx:93`); a
direct API call bypasses it entirely.
**Fix:** Trim before length-checking on both sides, e.g. frontend
`z.string().trim().min(1, ...)` and a backend `@Transform(({ value }) => value?.trim())`
ahead of `@MinLength(1)`.

## Info

### IN-01: Hardcoded `http://localhost:3001` fallback for the API URL

**File:** `frontend/src/app/portal/[token]/page.tsx:41`
**Issue:** `const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"`.
If the env var is missing in a production build, the public pre-verify/verify
calls silently target localhost and fail. It matches the repo pattern but is a
foot-gun for a public patient-facing page.
**Fix:** Fail loud (or render the error state) when `NEXT_PUBLIC_API_URL` is unset
in production, rather than defaulting to localhost.

### IN-02: URL token not encoded in the pre-verify/verify fetch paths

**File:** `frontend/src/app/portal/[token]/page.tsx:63,92`
**Issue:** `token` from `useParams` is interpolated raw into the request path.
Portal tokens are URL-safe hashes so this is currently harmless, but an
unexpected value containing `/` or `?` would corrupt the path.
**Fix:** Wrap with `encodeURIComponent(token)`.

### IN-03: `useEnviarConsulta` invalidates `portal-datos` unnecessarily

**File:** `frontend/src/hooks/usePortalDatos.ts:58-60`
**Issue:** Consultas are one-way (D-02) and never appear in the `portal-datos`
payload, so invalidating that query key after sending a consulta triggers a
pointless refetch (and, per WR-01, an avoidable extra failure surface if the JWT
just expired).
**Fix:** Drop the `invalidateQueries` from `useEnviarConsulta.onSuccess`.

### IN-04: `email: ""` sent directly to the API would 400 despite `@IsOptional()`

**File:** `backend/src/modules/paciente-portal/dto/update-contacto-portal.dto.ts:21-23`
**Issue:** `@IsOptional()` only skips validation for `null`/`undefined`, not for
`""`. The frontend never sends an empty email (falsy → omitted), so the app is
safe, but a direct caller sending `email: ""` fails `@IsEmail` with a 400 — an
inconsistency with the "silently ignore" contract described elsewhere.
**Fix:** Accept empty string explicitly (`@ValidateIf(o => o.email !== "")`) or
document that `""` is rejected.

---

_Reviewed: 2026-07-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
