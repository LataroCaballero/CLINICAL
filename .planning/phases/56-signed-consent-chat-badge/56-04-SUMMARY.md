---
phase: 56-signed-consent-chat-badge
plan: "04"
subsystem: backend/paciente-portal
tags: [consent, portal, storage, nesjs, idor-prevention]
dependency_graph:
  requires: ["56-01"]
  provides: ["getConsentimientosParaFirmar", "GET /paciente-portal/public/consentimiento"]
  affects: ["backend/src/modules/paciente-portal"]
tech_stack:
  added: []
  patterns:
    - "StorageModule import + StorageService injection (mirrors consentimientos.module.ts)"
    - "Per-zone discriminated union return (six D-10 states)"
    - "Per-route PortalJwtGuard, JWT-scoped pacienteId (pitfall 12 prevention)"
key_files:
  created: []
  modified:
    - backend/src/modules/paciente-portal/paciente-portal.module.ts
    - backend/src/modules/paciente-portal/paciente-portal.service.ts
    - backend/src/modules/paciente-portal/paciente-portal.controller.ts
decisions:
  - "Single findMany with nested include (no separate query for SIN_CATALOGO) — Prisma returns null for optional relations, handled in loop"
  - "pdfUrl via StorageService.getPublicUrl returned ONLY for PARA_FIRMAR (T-56-10 compliance)"
  - "YA_FIRMADO includes firmadoAt from ConsentimientoFirmado scoped to pacienteId+zonaId (D-08, T-56-11)"
  - "consentimientosFirmados include scoped with where: { pacienteId } — prevents cross-patient IDOR (T-56-09)"
metrics:
  duration: "~3 min"
  completed: "2026-07-01"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 56 Plan 04: Portal Consent Resolver + GET Route Summary

StorageService wired into PacientePortalModule/Service, getConsentimientosParaFirmar resolver implementing the D-09 chain (Cirugia → cirugiaCatalogo → zona → vigente ConsentimientoZonaArchivo) with all six D-10 empty/signed states, and a PortalJwtGuard-protected GET /consentimiento route.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Wire StorageService + implement getConsentimientosParaFirmar | c961360 | paciente-portal.module.ts, paciente-portal.service.ts |
| 2 | Add guarded GET /consentimiento route | 8a9eeb8 | paciente-portal.controller.ts |

## What Was Built

### Task 1: StorageService Injection + Consent Resolver

**paciente-portal.module.ts:**
- Added `import { StorageModule } from '../storage/storage.module'` (mirrors consentimientos.module.ts:4)
- Added `StorageModule` to the `imports` array so StorageService is DI-injectable
- Updated module docblock to document the StorageModule import purpose

**paciente-portal.service.ts:**
- Added `import { StorageService } from '../storage/storage.service'`
- Added `private readonly storage: StorageService` to constructor (alongside prisma/jwt)
- Implemented `getConsentimientosParaFirmar(pacienteId: string)`:
  - Single `findMany` with nested include: Cirugia → cirugiaCatalogo → zona → consentimientoArchivos (vigente=true, orderBy uploadedAt desc, take 1) + consentimientosFirmados (where { pacienteId }, take 1)
  - Returns `[{ estado: 'SIN_CIRUGIA' }]` when no pending surgeries (PROGRAMADA/EN_CURSO)
  - Iterates each cirugia and resolves to one of the six discriminated states
  - pdfUrl via `this.storage.getPublicUrl(archivo.path)` returned ONLY for PARA_FIRMAR

**Six discriminated states (D-10):**

| State | Root Cause | Returned Fields |
|-------|-----------|-----------------|
| SIN_CIRUGIA | No pending Cirugia rows | `{ estado }` |
| SIN_CATALOGO | cirugiaCatalogoId is null | `{ estado }` |
| SIN_ZONA | CirugiaCatalogo.zonaId is null | `{ estado }` |
| SIN_PDF | No vigente ConsentimientoZonaArchivo | `{ estado }` |
| YA_FIRMADO | ConsentimientoFirmado exists for pacienteId+zonaId | `{ estado, zonaId, zonaNombre, firmadoAt }` |
| PARA_FIRMAR | Happy path — patient can sign | `{ estado, zonaId, zonaNombre, pdfUrl, consentimientoZonaArchivoId, version, indicacionesUrl }` |

### Task 2: Guarded GET Route

**paciente-portal.controller.ts:**
- Added `@UseGuards(PortalJwtGuard) @Get('consentimiento')` route `getConsentimiento(@Req() req: PortalRequest)`
- Delegates to `this.service.getConsentimientosParaFirmar(req.user.pacienteId)`
- `pacienteId` from `req.user` ONLY — never from @Param, @Body, @Query (pitfall 12 / T-56-09)
- Guard is per-route, never class-level (public preVerify/verificar routes stay unrestricted)

## Security (Threat Model)

| Threat | Mitigation |
|--------|-----------|
| T-56-09: IDOR/Elevation | PortalJwtGuard supplies pacienteId from the JWT; resolver query is scoped to that pacienteId; no request param accepted |
| T-56-10: PDF URL disclosure | pdfUrl returned ONLY for PARA_FIRMAR; all other states (SIN_*, YA_FIRMADO) carry no url |
| T-56-11: Re-sign | YA_FIRMADO check uses ConsentimientoFirmado scoped to pacienteId+zonaId; no second signable payload issued |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The resolver is fully wired end-to-end with StorageService. The PDF signing route (Plan 05) reuses the same injected StorageService.

## Threat Flags

None. No new network surface beyond what was planned (the GET /consentimiento route was the intended output). No new trust boundaries introduced.

## Verification

- `tsc --noEmit --project tsconfig.build.json`: exit 0
- `nest build`: exit 0
- All six D-10 discriminator literals present in service
- `@Get('consentimiento')` count: 1 in controller
- `@UseGuards(PortalJwtGuard)` directly precedes `@Get('consentimiento')`
- No pacienteId from @Body/@Param/@Query on the consentimiento route

## Self-Check: PASSED

Files verified:
- backend/src/modules/paciente-portal/paciente-portal.module.ts — StorageModule import + imports array
- backend/src/modules/paciente-portal/paciente-portal.service.ts — StorageService + getConsentimientosParaFirmar
- backend/src/modules/paciente-portal/paciente-portal.controller.ts — @Get('consentimiento') guarded route

Commits verified:
- c961360: feat(56-04): wire StorageService + implement getConsentimientosParaFirmar
- 8a9eeb8: feat(56-04): add PortalJwtGuard-protected GET /consentimiento route
