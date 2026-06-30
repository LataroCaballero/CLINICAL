---
status: partial
phase: 54-portal-backend-token-security
source: [54-VERIFICATION.md]
started: 2026-06-30T20:05:00Z
updated: 2026-06-30T20:05:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. HTTP-level whitelist stripping on public write routes
expected: PATCH /paciente-portal/public/datos-personales with body `{ alergias: ['x'], etapaCRM: 'GANADO', telefono: '111' }` (and a valid portal JWT) returns 200, updates only `telefono`, and leaves `alergias`/`etapaCRM` columns unchanged in the DB.
result: [pending]

### 2. Public route throttle tier (20 req/min) rejects burst traffic
expected: The 21st request to GET /paciente-portal/public/:token within 60 s returns 429 from the ThrottlerGuard (Redis-backed).
result: [pending]

### 3. Portal JWT auth: a staff JWT is rejected on guarded routes
expected: GET /paciente-portal/public with a valid staff JWT (no `scope=portal-paciente` claim) returns 401.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
