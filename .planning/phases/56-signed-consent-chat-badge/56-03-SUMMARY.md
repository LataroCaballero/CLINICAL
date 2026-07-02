---
phase: 56-signed-consent-chat-badge
plan: "03"
subsystem: api
tags: [pdf-lib, sha256, consent, stamping, nestjs, prisma]

requires:
  - phase: 56-signed-consent-chat-badge
    plan: "01"
    provides: "ConsentimientoFirmado model + version Int on ConsentimientoZonaArchivo in schema"

provides:
  - "pdf-lib@1.17.1 installed in backend"
  - "ConsentStampService: @Injectable NestJS service that stamps signature PNG + forensic box onto last page of template PDF, returns Buffer + SHA-256"
  - "uploadConsentimiento assigns incremental per-zona version numbers (D-03)"
  - "ConsentStampService exported from ConsentimientosModule for portal injection"

affects:
  - "56-05 (paciente-portal firmar endpoint — injects ConsentStampService)"
  - "56-04 (if portal service plan needs stamp service reference)"

tech-stack:
  added:
    - "pdf-lib@1.17.1 — loads existing PDFs and stamps PNG + text + rectangles"
  patterns:
    - "pdf-lib coordinate origin is bottom-left; stamp box sits at y=MARGIN (near physical page bottom)"
    - "SHA-256 computed over the FINAL buffer AFTER pdfDoc.save() — never embedded inside PDF (D-02)"
    - "White drawRectangle before drawImage to flatten PNG alpha transparency (Pitfall F)"
    - "PNG magic-byte validation mirrors existing %PDF- check before embedPng (T-56-08)"

key-files:
  created:
    - "backend/src/modules/consentimientos/consent-stamp.service.ts"
  modified:
    - "backend/package.json (pdf-lib@^1.17.1 added)"
    - "backend/package-lock.json"
    - "backend/src/modules/consentimientos/consentimientos.service.ts (version-roll added)"
    - "backend/src/modules/consentimientos/consentimientos.module.ts (ConsentStampService in providers + exports)"

key-decisions:
  - "[56-03] Hash computed over FINAL signed-PDF buffer AFTER pdfDoc.save() — never inside PDF body (D-02 circular constraint)"
  - "[56-03] White rectangle drawn before PNG embedPng to flatten alpha transparency (Pitfall F)"
  - "[56-03] nextVersion computed via aggregate(_max.version ?? 0)+1 outside $transaction, then passed to create.data.version"
  - "[56-03] pdf-lib supply-chain gate: human-approved via orchestrator before npm install (T-56-SC)"

requirements-completed: [CONS-05, CONS-06]

duration: 12min
completed: 2026-07-01
---

# Phase 56 Plan 03: Consent Stamp Service Summary

**pdf-lib@1.17.1 stamping engine: signature PNG + visible forensic box on template PDF last page, SHA-256 over final buffer, per-zona version-roll on upload**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-01T22:35:00Z
- **Completed:** 2026-07-01T22:47:00Z
- **Tasks:** 3 (Task 1: pre-approved checkpoint; Task 2: install + service; Task 3: version-roll + module)
- **Files modified:** 4 (consent-stamp.service.ts created; package.json, consentimientos.service.ts, consentimientos.module.ts modified)

## Accomplishments

- Installed pdf-lib@1.17.1 in backend (human-approved supply-chain gate via orchestrator)
- Created ConsentStampService with full pdf-lib stamping pipeline: load template, embed font (Helvetica/HelveticaBold built-in, no fontkit), validate PNG magic bytes, draw white rect + forensic border box, draw signature PNG, draw 5 text lines (fecha UTC / IP / userAgent / version), save() then Buffer.from() then SHA-256 over FINAL buffer
- Extended uploadConsentimiento with aggregate-based version increment per zona (D-03); new vigente rows now carry nextVersion
- Exported ConsentStampService from ConsentimientosModule so paciente-portal module can inject it in Plan 05

## Task Commits

1. **Task 1: Verify pdf-lib package legitimacy (checkpoint — pre-approved)** — no commit (gate only)
2. **Task 2: Install pdf-lib + create ConsentStampService** — `268ac29` (feat)
3. **Task 3: Version-roll on upload + export stamp service from module** — `01aede7` (feat)

## Files Created/Modified

- `backend/src/modules/consentimientos/consent-stamp.service.ts` — ConsentStampService: stampConsentimiento() + validatePngMagicBytes(); returns { pdfBuffer, hashSha256 }
- `backend/package.json` — pdf-lib@^1.17.1 added to dependencies
- `backend/package-lock.json` — lock updated
- `backend/src/modules/consentimientos/consentimientos.service.ts` — nextVersion via aggregate + version: nextVersion in create.data
- `backend/src/modules/consentimientos/consentimientos.module.ts` — ConsentStampService in providers[] and exports[]

## Decisions Made

- Hash ordering enforced: pdfDoc.save() then Buffer.from(uint8) then createHash('sha256').update(pdfBuffer).digest('hex') — hash over the signed document, never the template (D-02)
- White fill rectangle drawn before drawImage to flatten signature PNG alpha channel on PDF viewers that render transparent pixels as black (Pitfall F)
- nextVersion computed via aggregate({ _max: { version: true } }) before the $transaction so the value is available in create.data inside the transaction (Prisma $transaction array-form does not support inter-statement value passing)
- pdf-lib stamp sits at y = MARGIN (40pt from bottom) — bottom-left coordinate origin (Pitfall A)

## Deviations from Plan

None — plan executed exactly as written. Task 1 checkpoint was pre-approved by the human via the orchestrator before this executor spawned; the install and implementation proceeded without pause.

## Issues Encountered

- npx tsc --noEmit emits a pre-existing error for test/app.e2e-spec.ts outside rootDir — unrelated to this plan's changes and existed before. npm run build (nest build) exits 0 cleanly.

## User Setup Required

None — no external service configuration required. pdf-lib is a pure-JS dependency with no native binaries or environment variables.

## Next Phase Readiness

- ConsentStampService is injectable by any NestJS module that imports ConsentimientosModule
- paciente-portal.module.ts (Plan 05) can add imports: [ConsentimientosModule] and inject ConsentStampService into PacientePortalService
- uploadConsentimiento now returns the version number on the created row (via createdRow.version), usable by the front-end Consentimientos panel if needed

## Known Stubs

None — ConsentStampService is fully implemented. The stampConsentimiento() method is wired end-to-end; no placeholder logic.

## Threat Flags

No new threat surfaces introduced beyond what the plan's threat model documents (T-56-SC supply-chain gate, T-56-07 hash integrity, T-56-08 PNG magic-byte validation — all mitigated as specified).

## Self-Check: PASSED

Verified before writing SUMMARY:

- backend/src/modules/consentimientos/consent-stamp.service.ts — FOUND
- backend/package.json contains "pdf-lib" — FOUND (pdf-lib: ^1.17.1)
- grep -c "PDFDocument.load" consent-stamp.service.ts returns 1 — PASSED
- grep "_max: { version" consentimientos.service.ts — FOUND
- grep "version: nextVersion" consentimientos.service.ts — FOUND
- grep -c "ConsentStampService" consentimientos.module.ts returns 3 (import + providers + exports) — PASSED
- npm run build exits 0 — PASSED
- Commit 268ac29 (Task 2) — VERIFIED
- Commit 01aede7 (Task 3) — VERIFIED

---
*Phase: 56-signed-consent-chat-badge*
*Completed: 2026-07-01*
