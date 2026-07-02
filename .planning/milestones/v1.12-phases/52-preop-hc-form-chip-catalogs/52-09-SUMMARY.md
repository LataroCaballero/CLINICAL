---
phase: 52-preop-hc-form-chip-catalogs
plan: "09"
subsystem: backend/portal-link
tags: [gap-closure, security, encryption, portal, prisma]
dependency_graph:
  requires: []
  provides: [portal-token-cifrado-at-rest, obtenerPortalLink-endpoint]
  affects: [pacientes.service, pacientes.module, pacientes.controller, schema.prisma]
tech_stack:
  added: []
  patterns:
    - AES-256-GCM at-rest encryption via EncryptionService (mismo patrón WABA access tokens)
    - WhatsappModule importado en PacientesModule para DI de EncryptionService
    - Lookup por hash SHA-256 (portalToken) mantenido intacto (D-12 ampliada, no rotada)
key_files:
  created:
    - backend/src/prisma/migrations/20260626130000_add_portal_token_cifrado/migration.sql
    - backend/src/modules/pacientes/pacientes.service.spec.ts
  modified:
    - backend/src/prisma/schema.prisma
    - backend/src/modules/pacientes/pacientes.service.ts
    - backend/src/modules/pacientes/pacientes.module.ts
    - backend/src/modules/pacientes/pacientes.controller.ts
decisions:
  - "D-12 ampliada (no rotada): portalToken sigue siendo el hash SHA-256 para lookup; portalTokenCifrado es el raw token cifrado AES-256-GCM para recuperar la url entre sesiones"
  - "Migración via prisma migrate diff + db execute + migrate resolve (patrón 51-02) por drift de BD preexistente"
  - "Legacy backfill: generarPortalLink rota el token si encuentra portalToken sin portalTokenCifrado; obtenerPortalLink devuelve legacy:true sin rotar"
  - "GET :id/portal-link es sólo lectura; POST :id/portal-link genera/recupera; ambos heredan @Auth del controller level"
metrics:
  duration: "~7 min"
  completed: "2026-06-26T19:24:35Z"
  tasks_completed: 3
  files_modified: 6
---

# Phase 52 Plan 09: Portal Token Cifrado At-Rest (Gap B Backend) Summary

Portal link recuperable entre sesiones: raw UUID cifrado AES-256-GCM en columna portalTokenCifrado; lookup sigue por hash SHA-256 (D-12 ampliada); GET sólo-lectura retorna url estable sin generar.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Prisma — columna portalTokenCifrado + migración | 6e45d96 | schema.prisma, migrations/20260626130000_add_portal_token_cifrado/migration.sql |
| 2 (RED) | Tests fallidos para round-trip + obtenerPortalLink | b04a7e8 | pacientes.service.spec.ts |
| 2 (GREEN) | Service: cifrar/recuperar + obtenerPortalLink + inyectar EncryptionService | 60eb43b | pacientes.service.ts, pacientes.module.ts |
| 3 | Controller: GET :id/portal-link sólo lectura | 16bfcee | pacientes.controller.ts |

## What Was Built

**Prisma (Task 1):** Columna nullable `portalTokenCifrado String?` añadida al modelo `Paciente`. Migración `20260626130000_add_portal_token_cifrado` aplicada vía `prisma db execute` + `migrate resolve --applied` (patrón drift del repo, igual 51-02). Cliente regenerado.

**Service (Task 2):** `EncryptionService` inyectado vía `WhatsappModule` (mismo patrón `afip-config.module`). `generarPortalLink` maneja tres casos:
- Caso A (token + cifrado): descifra portalTokenCifrado, reconstruye url, devuelve `{url, alreadyGenerated:true}` sin escribir BD.
- Caso B (legacy — token sin cifrado): genera nuevo rawUuid, rota portalToken (nuevo hash) + persiste portalTokenCifrado, devuelve `{url, alreadyGenerated:false}`.
- Caso C (sin token): primera generación con hash + cifrado.

Nuevo método `obtenerPortalLink` (sólo lectura): descifra y devuelve url, o `{url:null, legacy:true}` para legacy/tamper, sin escribir BD.

**Controller (Task 3):** `@Get(':id/portal-link')` que llama `obtenerPortalLink` y devuelve `{url, alreadyGenerated, legacy, smtpConfigured}`. Hereda `@Auth` del controller. POST y endpoint de email sin cambios.

## TDD Gate Compliance

- RED commit: `b04a7e8` — test(52-09): 9 tests fallando (TS error, `obtenerPortalLink` no existía)
- GREEN commit: `60eb43b` — feat(52-09): 9/9 tests pasan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migración vía diff+execute+resolve en lugar de migrate dev**
- **Found during:** Task 1
- **Issue:** `prisma migrate dev` detectó drift de BD (OrdenConsumo/EstadoOrdenConsumo presentes en DB pero no en historial local), y requería reset con pérdida de datos.
- **Fix:** Patrón documentado en el proyecto (51-02): `prisma migrate diff --script` para generar SQL, `prisma db execute` para aplicar, `prisma migrate resolve --applied` para registrar. Mismo resultado, sin pérdida de datos.
- **Files modified:** backend/src/prisma/migrations/20260626130000_add_portal_token_cifrado/migration.sql

## Security Verification

| Amenaza | Estado |
|---------|--------|
| T-52-09: portalTokenCifrado en claro | Mitigado — AES-256-GCM vía EncryptionService; rawUuid nunca en logs (test "seguridad" pasa) |
| T-52-10: GET portal-link sin auth | Mitigado — hereda @Auth controller level (ADMIN/PROFESIONAL/SECRETARIA/FACTURADOR) |
| T-52-11: decrypt blob corrupto/ajeno | Mitigado — catch en obtenerPortalLink → legacy response; test tamper/clave pasa |

## Self-Check: PASSED

- [x] `backend/src/prisma/migrations/20260626130000_add_portal_token_cifrado/migration.sql` — FOUND
- [x] `backend/src/modules/pacientes/pacientes.service.spec.ts` — FOUND (9/9 tests verde)
- [x] `backend/src/modules/pacientes/pacientes.service.ts` — FOUND (`obtenerPortalLink` presente)
- [x] `backend/src/modules/pacientes/pacientes.module.ts` — FOUND (`WhatsappModule` en imports)
- [x] `backend/src/modules/pacientes/pacientes.controller.ts` — FOUND (`@Get(':id/portal-link')` presente)
- [x] Commits 6e45d96, b04a7e8, 60eb43b, 16bfcee — todos en git log
- [x] `prisma migrate status` — Database schema is up to date
- [x] `npx tsc --noEmit -p tsconfig.build.json` — sin errores nuevos
