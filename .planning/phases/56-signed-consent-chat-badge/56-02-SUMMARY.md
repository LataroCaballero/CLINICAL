---
phase: 56-signed-consent-chat-badge
plan: "02"
subsystem: backend
tags: [chat, consent, security, xss, body-limit]
dependency_graph:
  requires: []
  provides: [origenPaciente-dto, cr-01-xss-blocker, 2mb-body-limit]
  affects: [56-03-chat-frontend, 56-05-firma-backend, 56-06-portal-indicaciones]
tech_stack:
  added: []
  patterns: [imperative-url-validation, express-body-parser-override]
key_files:
  created: []
  modified:
    - backend/src/modules/mensajes-internos/mensajes-internos.service.ts
    - backend/src/modules/catalogo-hc/catalogo-hc.service.ts
    - backend/src/main.ts
decisions:
  - "Imperative URL validation with new URL() parse + http/https allowlist at write point closes CR-01 (no ValidationPipe global)"
  - "BadRequestException added to catalogo-hc.service.ts imports (was missing)"
  - "Express body parsers registered via app.use() after NestFactory.create, before CORS + filters"
metrics:
  duration: "~5 min"
  completed_date: "2026-07-01"
  tasks_completed: 3
  tasks_total: 3
---

# Phase 56 Plan 02: Backend Enablers (origenPaciente + CR-01 XSS + 2mb body limit) Summary

**One-liner:** Three targeted backend edits: expose `origenPaciente` boolean in mensajes-internos DTO, close CR-01 stored-XSS via imperative URL validation in catalogo-hc, and raise Express body limit to 2mb for signature POST.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Expose origenPaciente in findByPaciente (CHAT-03 backend) | cf2c1b5 | mensajes-internos.service.ts |
| 2 | [CR-01 BLOCKER] Validate indicacionesUrl at write point | d0ccf42 | catalogo-hc.service.ts |
| 3 | Raise Express JSON/urlencoded body limit to 2mb | 35177cf | main.ts |

## What Was Built

### Task 1 — origenPaciente in mensajes-internos DTO
Added `origenPaciente: true` to the `select` block in `findByPaciente` (immediately after `esSistema: true`), and `origenPaciente: m.origenPaciente` to the `.map()` return. The field already existed on the `MensajeInterno` model and was written `true` by `paciente-portal.service.ts crearConsulta` — this only surfaces it for the chat frontend.

### Task 2 — CR-01 Stored-XSS Blocker (imperative URL validation)
Added `BadRequestException` to imports and prepended URL validation to `actualizarIndicacionesUrl` before the ownership guard:
- Null path preserved (allow clearing the link)
- Length > 2048 chars rejected with 400
- `new URL()` parse in try/catch rejects malformed URLs
- Protocol allow-list: only `http:` and `https:` pass (blocks `javascript:` and `data:` vectors)

### Task 3 — Express 2mb body limit
Added `import * as express from 'express'` and registered `app.use(express.json({ limit: '2mb' }))` + `app.use(express.urlencoded({ extended: true, limit: '2mb' }))` after `NestFactory.create`. The existing `rawBody: true` flag is preserved unchanged. This lifts the default 100KB cap so a ~200KB base64 signature PNG POST does not return 413.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Import] Added BadRequestException to catalogo-hc.service.ts imports**
- **Found during:** Task 2
- **Issue:** `BadRequestException` was not imported from `@nestjs/common` — required for the URL validation throws
- **Fix:** Added `BadRequestException` to the existing import statement
- **Files modified:** backend/src/modules/catalogo-hc/catalogo-hc.service.ts
- **Commit:** d0ccf42

## Known Stubs

None.

## Threat Flags

T-56-04 (Injection/XSS) is now mitigated at the write point as planned. T-56-05 (DoS via body size) mitigated with 2mb cap. T-56-06 (information disclosure) accepted per plan. No new threat surface introduced.

## Self-Check

**Files exist:**
- [x] backend/src/modules/mensajes-internos/mensajes-internos.service.ts — modified
- [x] backend/src/modules/catalogo-hc/catalogo-hc.service.ts — modified
- [x] backend/src/main.ts — modified

**Commits exist:**
- [x] cf2c1b5 — feat(56-02): expose origenPaciente
- [x] d0ccf42 — fix(56-02): [CR-01] validate indicacionesUrl
- [x] 35177cf — feat(56-02): raise Express body limit

**Acceptance criteria:**
- [x] `grep -c "origenPaciente" mensajes-internos.service.ts` = 2
- [x] `grep -c "new URL" catalogo-hc.service.ts` = 1
- [x] `grep "protocol"` matches http/https allowlist check
- [x] `grep -c "limit: '2mb'" main.ts` = 2
- [x] `rawBody: true` preserved

**Build/type check:** TypeScript type check could not run in worktree (no node_modules). Used main repo tsc binary — pre-existing error `TS6059` (e2e test file outside rootDir, unrelated to these changes). npm run build not run (no node_modules in worktree). Self-check is PARTIAL — type safety verified by manual review of field types and imports.

## Self-Check: PARTIAL

Type check could not run end-to-end in worktree (no node_modules). Pre-existing `TS6059` error exists in main repo tsc run and is unrelated to these changes. All file edits are syntactically correct TypeScript, use existing patterns, and do not introduce new types. Manual review confirms correctness.
