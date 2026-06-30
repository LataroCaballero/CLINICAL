---
id: cr-01-indicaciones-url-validation
status: pending
created: 2026-06-30
source: 53-REVIEW.md (CR-01) + 53-VERIFICATION.md
severity: critical
resolves_phase: 54
tags: [security, xss, validation, pre-phase-54-blocker]
---

# CR-01 — `indicacionesUrl` persisted without server-side validation (stored-XSS pre-Phase-54)

**Pre-Phase-54 blocker.** Must be fixed before Phase 54 renders `indicacionesUrl` as a patient-facing link.

## Problem

`UpdateIndicacionesDto`'s `@IsUrl()` / `@MaxLength(2048)` decorators are **dead code**: the backend has no global `ValidationPipe` (`main.ts` has no `useGlobalPipes(new ValidationPipe(...))`). Any string reaches `prisma.update` unvalidated — including `javascript:` / `data:` URIs. Phase 54 will render this value as an `href` in the patient portal → stored-XSS vector.

The comment `"@IsUrl validated in DTO — T-53-11"` in `catalogo-hc.service.ts` (~line 758) is **incorrect** and should be removed.

## Minimal fix

Implement server-side validation in `actualizarIndicacionesUrl` (catalogo-hc.service.ts):
- Parse with `new URL(value)`; reject on throw.
- Allow only `http:` / `https:` protocols (reject `javascript:`, `data:`, etc.).
- Enforce max length (2048).
- Allow `null` to clear the field.
- Remove the misleading "validated in DTO" comments in the controller and service.

(Alternatively / additionally: add a global `ValidationPipe` in `main.ts` — but that is a broader change affecting all existing DTOs and should be scoped deliberately, since many current DTOs rely on manual validation.)

## References
- `.planning/phases/53-storage-upload-consent-config/53-REVIEW.md` → CR-01
- `.planning/phases/53-storage-upload-consent-config/53-VERIFICATION.md`
- Files: `backend/src/modules/consentimientos/dto/update-indicaciones.dto.ts`, `backend/src/modules/catalogo-hc/catalogo-hc.service.ts`, `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts`, `backend/src/main.ts`
