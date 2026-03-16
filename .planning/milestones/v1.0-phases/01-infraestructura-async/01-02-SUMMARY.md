---
phase: 01-infraestructura-async
plan: 02
subsystem: backend/whatsapp
tags: [prisma, migration, whatsapp, waba, encryption, opt-in, security]
dependency_graph:
  requires: [01-01]
  provides: [WABA-persistence, opt-in-endpoint, WABA-config-endpoint]
  affects: [pacientes-module, whatsapp-module]
tech_stack:
  added: [axios (Meta Graph API HTTP calls)]
  patterns: [AES-256-GCM encryption via EncryptionService, upsert pattern for WABA config, JWT profesionalId from req.user]
key_files:
  created:
    - backend/src/prisma/migrations/20260223172334_whatsapp_infra/migration.sql
    - backend/src/modules/whatsapp/dto/waba-config-response.dto.ts
    - backend/src/modules/pacientes/dto/update-whatsapp-opt-in.dto.ts
  modified:
    - backend/src/prisma/schema.prisma
    - backend/src/modules/whatsapp/whatsapp.service.ts
    - backend/src/modules/whatsapp/whatsapp.controller.ts
    - backend/src/modules/pacientes/pacientes.service.ts
    - backend/src/modules/pacientes/pacientes.controller.ts
    - backend/src/modules/whatsapp/dto/save-waba-config.dto.ts
decisions:
  - "Meta API version v21.0 stored as private readonly constant META_API_VERSION — parameterized per RESEARCH pitfall #5 to allow single-point updates on Meta deprecation"
  - "WabaConfigResponseDto explicitly excludes accessTokenEncrypted and wabaId — zero token leakage by design, not by convention"
  - "Prisma select: { accessTokenEncrypted: false } pattern in getWabaConfig — defense-in-depth even if DTO accidentally expands"
  - "whatsappOptInAt set to null (not unchanged) when optIn=false — explicit audit trail of opt-out"
  - "validateWABACredentials called BEFORE encrypt() — avoids storing encrypted garbage if Meta rejects credentials"
metrics:
  duration: 25min
  completed: 2026-02-23
  tasks_completed: 2
  files_changed: 8
---

# Phase 1 Plan 02: WhatsApp Prisma Schema + WABA Config Endpoints Summary

Prisma schema updated with ConfiguracionWABA and MensajeWhatsApp models, migration applied to live DB, opt-in endpoint and WABA config endpoints implemented with Meta live validation and AES-256-GCM encryption.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Actualizar schema Prisma y aplicar migración | 1333a03 | schema.prisma, migration.sql |
| 2 | Backend — endpoints opt-in y WABA config con validación Meta + cifrado | 5660eef | whatsapp.service.ts, whatsapp.controller.ts, pacientes.service.ts, pacientes.controller.ts, 2 new DTOs |

## What Was Built

### Task 1 — Prisma Schema + Migration

Migration `20260223172334_whatsapp_infra` applied successfully to live PostgreSQL DB (Supabase pooler).

**Schema additions:**
- `ConfiguracionWABA` model: stores encrypted WABA credentials per professional (`@unique profesionalId`)
- `MensajeWhatsApp` model: message tracking with status lifecycle (PENDIENTE→ENVIADO→ENTREGADO→LEIDO/FALLIDO)
- `EstadoMensajeWA` enum: PENDIENTE, ENVIADO, ENTREGADO, LEIDO, FALLIDO
- `TipoMensajeWA` enum: PRESUPUESTO, RECORDATORIO_TURNO, SEGUIMIENTO, CUSTOM
- `Paciente.whatsappOptIn Boolean @default(false)` — consent field
- `Paciente.whatsappOptInAt DateTime?` — timestamp when consent was given/revoked
- Bidirectional relations: Profesional↔ConfiguracionWABA (1:1), Profesional/Paciente↔MensajeWhatsApp (1:n)

**Prisma validate result:** "The schema at src/prisma/schema.prisma is valid"
**Migration status:** Applied to live DB. Prisma Client regenerated (v6.19.1).

### Task 2 — Backend Endpoints

**PATCH /pacientes/:id/whatsapp-opt-in**
- Auth: ADMIN, PROFESIONAL, SECRETARIA (inherited from controller `@Auth` decorator)
- Sets `whatsappOptIn = optIn`, `whatsappOptInAt = new Date()` when true, `null` when false
- Returns: `{ id, nombreCompleto, whatsappOptIn, whatsappOptInAt }`
- Throws 404 if patient not found

**POST /whatsapp/config**
- Auth: ADMIN, PROFESIONAL
- Flow: validate Meta Graph API → encrypt token → upsert DB → return safe DTO
- `META_API_VERSION = 'v21.0'` as named constant
- Error codes: 190 (invalid token), 100 (invalid phone number ID) → mapped to descriptive 400s
- Returns: `WabaConfigResponseDto { phoneNumberId, displayPhone, verifiedName, activo }`

**GET /whatsapp/config**
- Auth: ADMIN, PROFESIONAL
- Prisma `select` explicitly excludes `accessTokenEncrypted`
- Returns same `WabaConfigResponseDto` or null if no config

**Security invariants enforced:**
- `accessToken` never written to DB in plaintext
- `accessTokenEncrypted` never present in any API response
- Meta validation runs BEFORE encryption — no garbage stored on invalid credentials
- `profesionalId` sourced from `req.user.profesionalId` (JWT payload, matches project pattern)

## Verification Results

1. `npx prisma validate` — PASSED: "The schema is valid"
2. `npm run build` — PASSED: 0 TypeScript errors in new files (pre-existing e2e-spec error excluded per MEMORY.md)
3. Schema contains: ConfiguracionWABA, MensajeWhatsApp, EstadoMensajeWA, TipoMensajeWA, whatsappOptIn in Paciente
4. WabaConfigResponseDto has no accessTokenEncrypted field
5. saveWabaConfig calls validateWABACredentials BEFORE encrypt()
6. updateWhatsappOptIn sets whatsappOptInAt = new Date() on true, null on false

## Deviations from Plan

None — plan executed exactly as written.

The only minor note: `save-waba-config.dto.ts` already existed from Plan 01-01 (pre-created scaffold). Updated the comment to clarify the security intent.

## Self-Check: PASSED

- FOUND: migration.sql (20260223172334_whatsapp_infra)
- FOUND: waba-config-response.dto.ts
- FOUND: update-whatsapp-opt-in.dto.ts
- FOUND: SUMMARY.md
- FOUND: commit 1333a03 (Task 1)
- FOUND: commit 5660eef (Task 2)
