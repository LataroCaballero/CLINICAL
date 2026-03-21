---
phase: 08-schema-foundation-afip-research
plan: "02"
subsystem: infra
tags: [afip, arca, wsaa, wsfev1, caea, electronic-invoicing, soap, aes-256-gcm, prisma]

# Dependency graph
requires:
  - phase: 08-schema-foundation-afip-research
    provides: "08-RESEARCH.md with raw AFIP findings used as authoritative source"
provides:
  - "AFIP/ARCA integration reference document (.planning/research/AFIP-INTEGRATION.md)"
  - "EmitirComprobanteParams and EmitirComprobanteResult TypeScript interfaces (Phase 9 contract)"
  - "Certificate storage strategy using EncryptionService AES-256-GCM pattern"
  - "Advisory lock pattern for CAE sequencing correctness"
  - "CAEA contingency-only restriction documented (RG 5782/2025, June 2026)"
affects:
  - "09-backend-api-layer (AfipStubService implements EmitirComprobanteParams interface)"
  - "v1.2 (real CAE implementation — Sections 1-4 fully specify the implementation)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AFIP WSAA TRA XML structure with buildTRA() skeleton"
    - "CMS/PKCS#7 signing: openssl smime subprocess (primary) or node-forge (alternative)"
    - "AES-256-GCM cert storage modeled after EncryptionService (iv:authTag:ciphertext)"
    - "pg_advisory_xact_lock for CAE sequencing (FECompUltimoAutorizado + 1)"
    - "Token caching per CUIT:service with 5-minute renewal buffer"

key-files:
  created:
    - ".planning/research/AFIP-INTEGRATION.md"
  modified: []

key-decisions:
  - "Raw SOAP/XML — no third-party AFIP library (afipjs/afip-apis/afip.js unmaintained, no TS types)"
  - "openssl smime subprocess as primary CMS signing approach; node-forge as alternative — flagged as v1.2 team decision"
  - "Certificate storage: EncryptionService AES-256-GCM pattern, fields on ConfiguracionAFIP model (v1.2)"
  - "BNA rate for MonCotiz: manual entry recommended for v1.2 (robust, audit-friendly)"
  - "CAEA restricted to contingency-only from June 2026 (RG 5782/2025) — CAE always primary path"

patterns-established:
  - "AfipService interface pattern: emitirComprobante() + verificarServicio() as NestJS injectable"
  - "Phase 9 stub returns plausible fake CAE with resultado: 'A'"

requirements-completed: [AFIP-01]

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 8 Plan 02: AFIP-INTEGRATION.md Reference Document Summary

**AFIP/ARCA electronic invoicing reference covering WSAA authentication, WSFEv1 CAE flow, CAEA contingency, RG 5616/2024 mandatory fields, and per-tenant AES-256-GCM certificate storage — with typed TypeScript interface contract for Phase 9 AfipStubService**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T12:57:54Z
- **Completed:** 2026-03-13T13:01:49Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Wrote `.planning/research/AFIP-INTEGRATION.md` (774 lines, 6 required sections, all must-haves satisfied)
- Defined `EmitirComprobanteParams` and `EmitirComprobanteResult` TypeScript interfaces — the contract Phase 9 AfipStubService must implement
- Documented the `pg_advisory_xact_lock` pattern for CAE sequencing (explicit callout as critical for v1.2 correctness)
- Captured CAEA contingency-only restriction from June 2026 (RG 5782/2025) prominently in Section 4
- Documented both CMS signing options (openssl smime subprocess vs node-forge) with complete code examples
- Specified CondicionIVAReceptorId mapping table (11 enum values → AFIP integer IDs) for v1.2 use

## Task Commits

1. **Task 1: Write AFIP-INTEGRATION.md with all six required sections** - `6d09265` (docs)

**Plan metadata:** *(final commit pending)*

## Files Created/Modified

- `.planning/research/AFIP-INTEGRATION.md` - Complete AFIP/ARCA integration reference (6 sections, 774 lines)

## Decisions Made

- **Raw SOAP/XML approach confirmed** — no third-party library; `afipjs`/`afip-apis`/`afip.js` forks are unmaintained with no TypeScript support
- **CMS signing decision deferred to v1.2** — both `openssl smime` (subprocess, no new dependency) and `node-forge` (in-process, adds dependency) documented with complete code examples
- **Certificate storage** — modeled after `EncryptionService` AES-256-GCM: `iv:authTag:ciphertext` format, dedicated `ConfiguracionAFIP` model preferred over fields on `Profesional`
- **BNA rate for MonCotiz** — manual entry recommended for v1.2 (robust, audit-friendly, no scraping risk)
- **CAEA as contingency-only** — always attempt CAE first; CAEA only when AFIP endpoint unavailable

## Deviations from Plan

None — plan executed exactly as written. The document includes all six required sections and all specified content elements.

## Issues Encountered

None. All research content was sourced directly from `08-RESEARCH.md` per plan instructions.

## Content Gaps and Open Questions Flagged

1. **RG 5782/2025 verification** — CAEA contingency-only restriction (June 2026) found via community sources only. Flagged for official BOLETIN OFICIAL verification before v1.2 CAEA implementation.
2. **CMS signing approach** — `openssl smime` vs `node-forge` is a v1.2 team decision. Both approaches fully documented in Section 2.
3. **BNA rate source** — Manual entry vs automated scraping; flagged as v1.2 implementation decision in Section 5.
4. **Multi-instance token cache** — In-memory `Map` works for single-instance; Redis required for horizontal scaling (v1.2 concern).
5. **CAEA pre-request holiday handling** — AFIP availability during 5-day window on holidays not documented; retry logic recommended.

## EmitirComprobante Interface for Phase 9

The `EmitirComprobanteParams` and `EmitirComprobanteResult` interfaces are defined in Section 3 of `AFIP-INTEGRATION.md`. Phase 9 must:
1. Create `backend/src/modules/finanzas/afip/afip.interfaces.ts` with these exact interfaces
2. Create `backend/src/modules/finanzas/afip/afip-stub.service.ts` implementing them with fake data
3. Make the stub injectable so it can be swapped for the real service in v1.2

## User Setup Required

None — this is a documentation-only plan. No external service configuration required.

## Next Phase Readiness

- Phase 9 (AfipStubService) can proceed immediately — `emitirComprobante()` interface contract is fully specified
- v1.2 AFIP implementors have a complete reference — no re-research needed for WSAA, WSFEv1, or CAEA
- Advisory lock pattern (Section 3) must be implemented in v1.2 before any production CAE calls

---
*Phase: 08-schema-foundation-afip-research*
*Completed: 2026-03-13*
