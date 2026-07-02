---
status: complete
phase: 54-portal-backend-token-security
source: [54-01-SUMMARY.md, 54-02-SUMMARY.md, 54-03-SUMMARY.md]
started: 2026-06-30T20:30:43Z
updated: 2026-07-01T00:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running backend/Redis state. Start the backend from scratch (`cd backend && npm run start:dev`). Server boots without errors, the `20260630000000_portal_intentos_bloqueo` migration is already applied (`npx prisma migrate status` → "up to date"), and the app responds to a basic request (e.g. health/login) with live data.
result: pass

### 2. Token pre-verify (200 known / 404 unknown, no patient data)
expected: `GET /paciente-portal/public/:token` with a valid patient's portal token returns 200 with existence + a `bloqueado` flag only (no name/DNI/clinical data). The same call with a random/unknown token returns 404 and leaks no patient fields.
result: pass

### 3. DNI verify + brute-force lock + portal JWT
expected: `POST /paciente-portal/public/:token/verificar` with a wrong DNI fails; after 3 consecutive wrong DNIs the endpoint returns 429 (blocked ~15 min) even if the 4th attempt is correct. A correct DNI (before lock) resets the counter and returns a portal-scoped JWT (`scope=portal-paciente`, 45m).
result: pass

### 4. Authenticated read returns safe subset only
expected: `GET /paciente-portal/public` with a valid portal JWT returns editable contact fields + read-only context (name, DNI, obra social, próxima cirugía) + the four `*AutoReportad*` staged values — and NEVER curated clinical arrays (`alergias`, `condiciones`, `medicacion`) or CRM columns (`etapaCRM`, `flujo`, `temperatura`).
result: pass

### 5. Whitelist stripping on write routes
expected: `PATCH /paciente-portal/public/datos-personales` with body `{ alergias: ['x'], etapaCRM: 'GANADO', telefono: '111' }` (+ valid portal JWT) returns 200, updates only `telefono`, and leaves `alergias`/`etapaCRM` columns unchanged in the DB (silently stripped, not a 400).
result: pass

### 6. Write response does not echo the full record (CR-01)
expected: The 200 response body from PATCH `datos-personales` / `salud` contains only the safe field subset (contact or `*AutoReportad*` keys). It does NOT include `portalToken`, `portalTokenCifrado`, curated clinical fields, or CRM columns.
result: pass

### 7. Portal JWT scope enforcement (staff token rejected)
expected: `GET /paciente-portal/public` with a valid STAFF JWT (no `scope=portal-paciente` claim) returns 401. Only portal-scoped tokens reach the guarded routes.
result: pass

### 8. Public route throttle (20/min)
expected: The 21st request to `GET /paciente-portal/public/:token` within 60 s returns 429 from the Redis-backed ThrottlerGuard.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
