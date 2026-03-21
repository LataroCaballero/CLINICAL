---
phase: 12-schema-afip-extendido-gestion-certificados
plan: 02
subsystem: api
tags: [nestjs, afip, x509, encryption, soap, prisma, jest, tdd]

# Dependency graph
requires:
  - phase: 12-01
    provides: ConfiguracionAFIP Prisma model + schema migration + placeholder stub files

provides:
  - AfipConfigService with extractCertInfo (X.509 CN + SERIALNUMBER formats), getStatus, saveCert, saveBillingConfig
  - AfipConfigController: GET /afip-config/status, POST /afip-config/cert, PATCH /afip-config/billing
  - AfipConfigModule registered in AppModule
  - DTOs: SaveCertDto, SaveBillingConfigDto, AfipConfigStatusResponse / CertStatus types
  - 12 spec tests passing (TDD green) covering all 4 CertStatus states and encrypted-field exclusion

affects:
  - 12-03 (CertExpiryScheduler plan — uses same AfipConfigModule, AfipConfigService)
  - 13 (WsaaService reads ConfiguracionAFIP rows written here)
  - 14 (emission uses profesionalId → ConfiguracionAFIP lookup)
  - 15 (AfipConfigTab frontend consumes these endpoints)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD (RED spec → GREEN implementation) with real X.509 certs in Jest
    - EncryptionService injected via WhatsappModule import (not duplicated in providers)
    - PrismaService available globally (@Global module) — not in AfipConfigModule providers
    - openssl subprocess for WSAA signing at admin-save frequency (Phase 13 replaces with node-forge)
    - ConfiguracionAFIP.select never includes certPemEncrypted/keyPemEncrypted

key-files:
  created:
    - backend/src/modules/afip-config/afip-config.service.ts
    - backend/src/modules/afip-config/afip-config.service.spec.ts
    - backend/src/modules/afip-config/afip-config.controller.ts
    - backend/src/modules/afip-config/afip-config.module.ts
    - backend/src/modules/afip-config/dto/save-cert.dto.ts
    - backend/src/modules/afip-config/dto/save-billing-config.dto.ts
    - backend/src/modules/afip-config/dto/afip-config-status.dto.ts
  modified:
    - backend/src/app.module.ts (added AfipConfigModule to imports)

key-decisions:
  - "Node.js crypto.X509Certificate subject uses newline-separated key=value; regex handles both serialNumber=CUIT N (lowercase) and CN=N formats"
  - "Auth guard uses @Auth('ADMIN', 'PROFESIONAL') via existing JwtRolesGuard + @Roles pattern — not JwtAuthGuard directly"
  - "PrismaModule @Global() means PrismaService available without explicit import in AfipConfigModule"
  - "CERT_NO_CUIT test cert must be a real openssl-generated cert (not fake DER) because Node X509Certificate validates the structure"

patterns-established:
  - "AfipConfigService.getStatus select clause: never include certPemEncrypted or keyPemEncrypted"
  - "TDD with real X.509 cert PEMs embedded in spec (not mocked) for crypto/Node.js layer tests"

requirements-completed: [CERT-01, CERT-02]

# Metrics
duration: 25min
completed: 2026-03-16
---

# Phase 12 Plan 02: AfipConfigModule Backend Summary

**AfipConfigService + REST endpoints for X.509 cert upload with CUIT extraction, WSAA/FEParamGetPtosVenta validation, and AES-256-GCM encryption via EncryptionService**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-16T17:15:00Z
- **Completed:** 2026-03-16T17:40:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- AfipConfigService with `extractCertInfo` supporting both AFIP cert subject formats (CN=CUIT and serialNumber=CUIT)
- `getStatus` with 4-state CertStatus logic (OK / EXPIRING_SOON / EXPIRED / NOT_CONFIGURED) — encrypted fields never exposed
- `saveCert` pipeline: cert parse → WSAA transient ticket → FEParamGetPtosVenta ptoVta type validation → AES-256-GCM encrypt → upsert
- Three REST endpoints wired via AfipConfigModule into AppModule; build clean

## Task Commits

Each task was committed atomically:

1. **Task 1: DTOs + AfipConfigService with CN extraction and cert status logic** - `2ddb07a` (feat/tdd)
2. **Task 2: AfipConfigController + module wiring + AppModule registration** - `b34eb1c` (feat)

## Files Created/Modified
- `backend/src/modules/afip-config/afip-config.service.ts` - Full AfipConfigService implementation
- `backend/src/modules/afip-config/afip-config.service.spec.ts` - 12 TDD tests (12/12 passing)
- `backend/src/modules/afip-config/afip-config.controller.ts` - GET status, POST cert, PATCH billing
- `backend/src/modules/afip-config/afip-config.module.ts` - Module with WhatsappModule import
- `backend/src/modules/afip-config/dto/save-cert.dto.ts` - certPem, keyPem, ptoVta, ambiente
- `backend/src/modules/afip-config/dto/save-billing-config.dto.ts` - ptoVta, ambiente
- `backend/src/modules/afip-config/dto/afip-config-status.dto.ts` - AfipConfigStatusResponse, CertStatus
- `backend/src/app.module.ts` - Added AfipConfigModule to imports

## Decisions Made
- Node.js `crypto.X509Certificate.subject` returns newline-separated `key=value` — regex targets both `serialNumber=CUIT N` (AFIP production format, lowercase key) and `CN=N` (11-digit only) formats
- Auth guard: used existing `@Auth(roles)` decorator (which wraps JwtRolesGuard) matching the repo's established pattern from profesionales/turnos controllers
- PrismaModule is `@Global()` so AfipConfigModule does not need to import PrismaModule or add PrismaService to providers
- CERT_NO_CUIT test cert must be a real `openssl req -x509` cert because `new crypto.X509Certificate()` validates DER structure — a fake/truncated PEM triggers "invalid PEM" path instead of "no CUIT" path

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CERT_NO_CUIT test cert was a malformed/fake PEM**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** The plan's example `CERT_NO_CUIT` was a truncated/fake DER that Node.js rejects as structurally invalid before subject extraction, causing the test to hit the "invalid PEM" error path instead of the "no CUIT" path
- **Fix:** Generated a real `openssl req -x509` cert with `CN=John Doe` (no CUIT digits) — Node.js parses it correctly and the regex correctly fails to find a CUIT
- **Files modified:** afip-config.service.spec.ts (CERT_NO_CUIT constant)
- **Verification:** Test `throws BadRequestException when CUIT cannot be extracted` now passes
- **Committed in:** 2ddb07a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - test cert bug)
**Impact on plan:** Fix required for spec correctness. No scope changes.

## Issues Encountered
- Node.js `X509Certificate.subject` uses newlines not `/`-separated as openssl CLI displays — required updating regex to handle `serialNumber=CUIT N` (lowercase key) instead of `SERIALNUMBER=CUIT N`

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AfipConfigService ready for Phase 12 Plan 03 (CertExpiryScheduler implementation)
- Three endpoints deployable; POST /cert requires real AFIP cert + network access to WSAA for integration testing
- Phase 13 WsaaService can read `ConfiguracionAFIP` rows written by `saveCert`

---
*Phase: 12-schema-afip-extendido-gestion-certificados*
*Completed: 2026-03-16*
