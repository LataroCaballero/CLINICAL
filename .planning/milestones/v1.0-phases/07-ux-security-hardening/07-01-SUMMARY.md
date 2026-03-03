---
phase: 07-ux-security-hardening
plan: 01
subsystem: ui, api
tags: [react, nestjs, hmac, sha256, whatsapp, webhook, tanstack-query]

# Dependency graph
requires:
  - phase: 04-whatsapp-etapas-crm-automaticas
    provides: WhatsApp webhook controller + BullMQ queue integration
  - phase: 02-log-de-contactos-lista-de-accion
    provides: ContactosSection + useContactos hook with limit param
provides:
  - ContactosSection in-place expand toggle (showAll state + Mostrar menos button)
  - WhatsappHmacGuard verifying x-hub-signature-256 on POST /webhook/whatsapp
  - rawBody: true enabled in NestFactory for HMAC body verification
affects: [future-phases-using-whatsapp-webhook, patient-profile-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HMAC-SHA256 webhook signature verification with timingSafeEqual (timing-attack-safe)"
    - "NestJS rawBody: true option for access to raw request body in guards"
    - "Dev fallback: guard passes when META_APP_SECRET not set (facilitates local dev)"
    - "In-place list expand toggle pattern (useState showAll) avoids Dialog/Sheet z-index conflicts"

key-files:
  created:
    - backend/src/modules/whatsapp/guards/whatsapp-hmac.guard.ts
  modified:
    - frontend/src/app/dashboard/pacientes/components/ContactosSection.tsx
    - backend/src/main.ts
    - backend/src/modules/whatsapp/whatsapp-webhook.controller.ts
    - backend/src/modules/whatsapp/whatsapp.module.ts
    - backend/.env.example

key-decisions:
  - "Guard applied only to @Post handler via @UseGuards(WhatsappHmacGuard) — @Get (Meta challenge handshake) intentionally unguarded; Meta does not send HMAC on GET"
  - "timingSafeEqual with explicit length check before comparison — prevents RangeError and timing attacks"
  - "Dev fallback returns true when META_APP_SECRET missing — enables local development without Meta credentials"
  - "rawBody: true added to NestFactory.create — no custom body parsers added (would break NestJS internal wiring)"
  - "In-place expand (showAll state) avoids Drawer-in-Sheet z-index conflict (documented in STATE.md [02-02])"

patterns-established:
  - "NestJS webhook guard pattern: CanActivate + RawBodyRequest<Request> for HMAC verification"

requirements-completed: [LOG-02, WA-04]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 7 Plan 01: UX + Security Hardening Summary

**ContactosSection in-place expand (LOG-02) + WhatsApp HMAC-SHA256 webhook guard (WA-04) closing all 35 v1 requirements**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T00:24:52Z
- **Completed:** 2026-03-03T00:26:54Z
- **Tasks:** 2
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments
- ContactosSection now expands all contacts in-place with showAll toggle — no Dialog/Sheet, avoids documented z-index conflict
- WhatsappHmacGuard verifies x-hub-signature-256 HMAC-SHA256 on POST /webhook/whatsapp, rejects invalid signatures with 401
- rawBody: true enabled in main.ts so guard can access raw request body before JSON parsing
- GET /webhook/whatsapp (Meta challenge handshake) unaffected — guard only on POST
- META_APP_SECRET documented in backend/.env.example with descriptive placeholder
- Milestone CRM Conversión v1 complete: all 35 requirements fulfilled

## Task Commits

Each task was committed atomically:

1. **Task 1: LOG-02 — ContactosSection expand toggle** - `b666c1d` (feat)
2. **Task 2: WA-04 — HMAC guard + rawBody** - `d9ab88c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `frontend/src/app/dashboard/pacientes/components/ContactosSection.tsx` - Added useState(false) showAll, useContactos(id, showAll ? undefined : 5), Ver todos / Mostrar menos buttons, whitespace-pre-wrap for expanded notes
- `backend/src/modules/whatsapp/guards/whatsapp-hmac.guard.ts` - New HMAC guard with timingSafeEqual, length check, dev fallback
- `backend/src/main.ts` - Added rawBody: true to NestFactory.create
- `backend/src/modules/whatsapp/whatsapp-webhook.controller.ts` - @UseGuards(WhatsappHmacGuard) on @Post only, import added
- `backend/src/modules/whatsapp/whatsapp.module.ts` - WhatsappHmacGuard added to providers
- `backend/.env.example` - META_APP_SECRET entry appended with placeholder value

## Decisions Made
- Guard on POST only (not class-level, not GET) — Meta challenge GET does not carry HMAC signature
- timingSafeEqual with length pre-check — prevents both RangeError and timing-based signature oracle attacks
- Dev fallback (return true without META_APP_SECRET) — critical for local dev; in production the var must be set
- No custom body parsers added alongside rawBody: true — NestJS internal wiring handles it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - both tasks executed cleanly on first attempt. Backend and frontend builds passed without errors.

## User Setup Required

**Production configuration required:**

Add `META_APP_SECRET` to the backend production environment:
```
META_APP_SECRET=<your_app_secret_from_meta_developer_dashboard>
```

Without this variable, the guard logs a warning and passes all requests (dev fallback). In production this must be set to enforce HMAC verification.

## Next Phase Readiness

- All 35 requirements of CRM Conversión v1 milestone are complete
- WhatsApp webhook is now hardened against replay/spoofing attacks
- Patient contact history is fully accessible in-profile without navigation changes
- System ready for production deployment or next feature milestone

---
*Phase: 07-ux-security-hardening*
*Completed: 2026-03-03*

## Self-Check: PASSED

- FOUND: frontend/src/app/dashboard/pacientes/components/ContactosSection.tsx
- FOUND: backend/src/modules/whatsapp/guards/whatsapp-hmac.guard.ts
- FOUND: .planning/phases/07-ux-security-hardening/07-01-SUMMARY.md
- FOUND commit b666c1d: feat(07-01): LOG-02 — expandir historial completo de contactos in-place
- FOUND commit d9ab88c: feat(07-01): WA-04 — HMAC-SHA256 guard para webhook POST de Meta
