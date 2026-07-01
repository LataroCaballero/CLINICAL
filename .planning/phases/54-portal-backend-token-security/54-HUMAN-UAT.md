---
status: complete
phase: 54-portal-backend-token-security
source: [54-VERIFICATION.md]
started: 2026-06-30T20:05:00Z
updated: 2026-07-01T00:05:00Z
---

## Current Test

[testing complete — verified via /gsd:verify-work 54, see 54-UAT.md]

## Tests

### 1. HTTP-level whitelist stripping on public write routes
expected: PATCH /paciente-portal/public/datos-personales with body `{ alergias: ['x'], etapaCRM: 'GANADO', telefono: '111' }` (and a valid portal JWT) returns 200, updates only `telefono`, and leaves `alergias`/`etapaCRM` columns unchanged in the DB.
result: pass

### 2. Public route throttle tier (20 req/min) rejects burst traffic
expected: The 21st request to GET /paciente-portal/public/:token within 60 s returns 429 from the ThrottlerGuard (Redis-backed).
result: pass

### 3. Portal JWT auth: a staff JWT is rejected on guarded routes
expected: GET /paciente-portal/public with a valid staff JWT (no `scope=portal-paciente` claim) returns 401.
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
