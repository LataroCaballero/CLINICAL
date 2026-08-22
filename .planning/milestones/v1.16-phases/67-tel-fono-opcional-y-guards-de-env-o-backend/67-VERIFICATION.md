---
phase: 67-tel-fono-opcional-y-guards-de-env-o-backend
verified: 2026-08-18T23:00:00Z
status: passed
score: 12/12 must-haves verified
overrides_applied: 0
---

# Phase 67: Teléfono Opcional y Guards de Envío (Backend) Verification Report

**Phase Goal:** Que el backend acepte y persista un paciente sin teléfono, y que los dos entrypoints de envío por WhatsApp fallen con un mensaje claro en vez de un error crudo cuando no hay número.
**Verified:** 2026-08-18
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC#1 | `POST /pacientes` con sólo `nombreCompleto` y `dni` crea el paciente y devuelve 201 | ✓ VERIFIED | Live-DB probe (this verification session, rolled back): `paciente.create({ nombreCompleto, dni, telefono: null, ... })` succeeded, returned a row with `telefono: null`, no Prisma/DB error. Also covered by `pacientes.service.spec.ts:589` (`'SC#1: create() con sólo nombreCompleto y dni no lanza y persiste telefono: null'`), passing. |
| SC#2 | Los pacientes existentes conservan su teléfono intacto tras la migración | ✓ VERIFIED | Migration `20260818214917_telefono_opcional` applied, single statement `ALTER TABLE "Paciente" ALTER COLUMN "telefono" DROP NOT NULL`. `TEL_BASELINE=424` == `TEL_AFTER=424` (67-01-SUMMARY). Re-confirmed live in this session: `paciente.count()` still returns 424 after this verification's rollback probe. |
| SC#3 | Enviar WhatsApp a un paciente sin teléfono devuelve un error en español identificable por el frontend, sin llegar a la API de Meta | ✓ VERIFIED | `requireTelefonoParaEnvio()` wired into `sendTemplateMessage` (`whatsapp.service.ts:224`) and `sendFreeText` (`:279`), each before `mensajeWhatsApp.create` and `whatsappQueue.add`. `whatsapp.service.spec.ts` (13 tests) asserts `BadRequestException`, 0 calls to `queue.add`/`mensajeWhatsApp.create` for `null`/`''`/`'   '`. |
| SC#4 | Enviar un presupuesto por WhatsApp a un paciente sin teléfono devuelve el mismo error controlado | ✓ VERIFIED | Same guard wired into `sendPresupuestoPdf` (`whatsapp.service.ts:331`). Test `'telefono null -> BadRequestException, sin encolar (ENVIO-02)'` passes. |
| SC#5 | La suite de tests existente del backend sigue pasando | ✓ VERIFIED (with documented pre-existing baseline) | Ran `npm run test -- --runInBand` independently in this session: **4 suites failed / 37 passed, 18 tests failed / 515 passed (533 total)** — identical to the orchestrator-documented baseline (verified against pre-phase commit `33c5a23`). The 4 failing suites (`diagnosticos.*`, `reportes.controller.spec.ts`, `usuarios.controller.spec.ts`) fail at NestJS DI compilation, unrelated to `telefono`. All 4 phase-specific spec files (`pacientes.service.spec.ts`, `whatsapp.service.spec.ts`, `presupuestos.service.spec.ts`, `paciente-portal.service.spec.ts`) pass — 81/81 tests, run independently in this session. `paciente-portal.service.spec.ts` (WR-02) confirmed unedited via `git diff --stat`. |

**Score:** 5/5 ROADMAP success criteria verified

### Plan-Level Must-Haves (TEL-01 write path, ENVIO-01/02 guards)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `Paciente.telefono` nullable end-to-end: schema, migration, DTO, generated client | ✓ VERIFIED | `schema.prisma:158` = `telefono String?`; migration contains only `DROP NOT NULL`; `create-paciente.dto.ts:23-24` has `@IsOptional() @IsString() telefono?: string`; index `idx_paciente_telefono_trgm` intact. |
| 2 | `normalizeTelefono()` is the single definition of "valid phone", used by `create()`, `update()`, `updateContacto()` | ✓ VERIFIED | `pacientes.service.ts:372` — single private method; `grep -c 'this.normalizeTelefono('` = 4 call sites (`create`, `update`, `updateContacto` ×2 counting the fix); threshold `< 6` appears once, inside the helper. |
| 3 | `telefono: ''` from the frontend persists as `null` (create/update/updateContacto) | ✓ VERIFIED | Unit tests assert `data.telefono === null` for `''`/`'   '` in `create()`, `update()`, and `updatePacienteSection('contacto')`. |
| 4 | `updateContacto` — absent `telefono` key does NOT null the column (CR-01 regression fix) | ✓ VERIFIED | Code at `pacientes.service.ts:492-500`: `if (data.telefono !== undefined) patch.telefono = ...`. Two regression tests added in commit `7c8cb91`, both passing: `'CR-01: updatePacienteSection contacto SIN la clave telefono no toca la columna'` and the explicit-null-clears-it counterpart. |
| 5 | `updateEmergencia` untouched — 3 fields still required | ✓ VERIFIED | `git diff` shows zero changes to `updateEmergencia`; test confirms `BadRequestException('Datos de emergencia inválidos')` still thrown. |
| 6 | Portal `pickPresent()` behavior/test (WR-02) unchanged, only comment rewritten | ✓ VERIFIED | `git diff --stat` empty for `paciente-portal.service.spec.ts`; `pickPresent()`'s logic line unchanged; comment rewritten twice (67-02, then amended in `7c8cb91` to disclose the CR-02 caveat honestly). |
| 7 | `suggest()` NULL-safe (COALESCE), parameterized, scope-preserving | ✓ VERIFIED | `pacientes.service.ts` — 2× `COALESCE(p.telefono, '')`, 0× bare `p.telefono LIKE`, `${profesionalFilter}` intact, `${query}` remains a tagged-template parameter (no `Prisma.raw`). |
| 8 | 4 WhatsApp guard call sites (`sendTemplateMessage`, `sendFreeText`, `sendPresupuestoPdf`, `retryMessage`) | ✓ VERIFIED | `grep -c 'this.requireTelefonoParaEnvio('` = 4, one per method, each before the queue-producing/state-mutating call. `retryMessage`'s guard sits after the ownership `NotFoundException` and before the `PENDIENTE`/`errorMsg:null` update. |
| 9 | Read-side audit (12 ROADMAP-named sites + `presupuesto-pdf.service.ts:143` precedent) closed, no `as any`/`!`/placeholder on `telefono` | ✓ VERIFIED | 13-row audit table in `67-04-SUMMARY.md`; `presupuestos.service.ts::generatePdf()` casts removed (`telefono: presupuesto.paciente.telefono`, no `as any`); `presupuesto-pdf.service.ts:143`'s `if (paciente.telefono)` render guard intact (confirmed via `grep`, file untouched). |
| 10 | Test coverage for all of the above, suite green at pre-existing baseline | ✓ VERIFIED | See SC#5 row above. |

**Score:** 10/10 plan-level must-haves verified (12/12 counting SC#1/SC#2 as distinct from their plan-level restatements)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | `telefono String?` | ✓ VERIFIED | Line 158, index intact |
| `backend/src/prisma/migrations/20260818214917_telefono_opcional/migration.sql` | `DROP NOT NULL`, no destructive SQL | ✓ VERIFIED | Single statement, applied to live DB |
| `backend/src/modules/pacientes/dto/create-paciente.dto.ts` | `telefono?: string` w/ `@IsOptional()` | ✓ VERIFIED | Lines 22-24 |
| `backend/src/modules/pacientes/pacientes.service.ts` | `normalizeTelefono()` + 3 call sites + NULL-safe `suggest()` | ✓ VERIFIED | Confirmed by grep + live probe |
| `backend/src/modules/whatsapp/whatsapp.service.ts` | `requireTelefonoParaEnvio()` + 4 call sites | ✓ VERIFIED | Confirmed by grep, all 4 sites |
| `backend/src/modules/presupuestos/presupuestos.service.ts` | `generatePdf()` propagates `telefono: string \| null` without casts | ✓ VERIFIED | `(presupuesto.paciente as any).telefono` removed |
| `backend/src/modules/whatsapp/whatsapp.service.spec.ts` | New spec, ≥10 tests | ✓ VERIFIED | 13 tests, all passing |
| `backend/src/modules/presupuestos/presupuestos.service.spec.ts` | New spec, ≥3 tests | ✓ VERIFIED | 3 tests, all passing |
| `backend/src/modules/pacientes/pacientes.service.spec.ts` | Extended w/ `normalizeTelefono` coverage | ✓ VERIFIED | Includes SC#1, D-01/02/05/06/07, CR-01 regression tests |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `pacientes.service.ts create()/update()/updateContacto()` | `normalizeTelefono()` | direct call | ✓ WIRED | Grep + tests confirm |
| `whatsapp.service.ts` 4 send/retry methods | `requireTelefonoParaEnvio()` | direct call, before queue/create/update | ✓ WIRED | Grep + tests confirm ordering |
| `presupuestos.service.ts generatePdf()` | `presupuesto-pdf.service.ts PresupuestoPdfData` | `telefono: presupuesto.paciente.telefono` | ✓ WIRED | No cast, render guard preserved |
| `schema.prisma` | live DB column | `npx prisma migrate dev` | ✓ WIRED | Migration applied, `migrate status` up to date, verified via live insert probe in this session |

### Data-Flow Trace (Level 4)

Not applicable in the classic sense (no frontend rendering in this phase's scope), but the DB-to-service data flow was traced end-to-end with a live, rolled-back transaction in this verification session: inserting a `Paciente` row with `telefono: null` succeeded against the real database, proving the nullable column is not just a type-level fiction.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Create paciente without telefono, live DB | `$transaction` insert + rollback (this session) | `telefono: null` persisted, row count restored (424→425→424) | ✓ PASS |
| Full backend test suite | `npm run test -- --runInBand` (this session) | 515 passed / 533 total, identical to documented baseline | ✓ PASS |
| Phase-specific specs | `npm run test -- whatsapp.service.spec.ts presupuestos.service.spec.ts pacientes.service.spec.ts paciente-portal.service.spec.ts` | 81/81 passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TEL-01 | 67-01, 67-02, 67-04 | Persistir paciente sin teléfono sin alterar existentes | ✓ SATISFIED | Schema/migration/DTO/service normalization all verified; live-DB probe confirms |
| ENVIO-01 | 67-03 | WhatsApp a paciente sin teléfono → error controlado | ✓ SATISFIED | Guard wired + tested in 3 send paths + retry |
| ENVIO-02 | 67-03 | Presupuesto por WhatsApp a paciente sin teléfono → mismo error | ✓ SATISFIED | Guard wired + tested in `sendPresupuestoPdf` |

No orphaned requirements: REQUIREMENTS.md maps exactly TEL-01/ENVIO-01/ENVIO-02 to Phase 67, all three are marked `[x]` and `Complete`, and all three are declared in plan frontmatter (`requirements:` field across the 5 plans). TEL-02/TEL-03/ENVIO-03 are correctly scoped to Phase 69, not orphaned here.

### Anti-Patterns Found

None are blockers for this phase's declared scope (TEL-01/ENVIO-01/ENVIO-02). All are either fixed, pre-existing (verified via `git blame`/prior-commit diffing and explicitly documented as such), or intentional per CONTEXT.md decisions.

| File | Pattern | Severity | Disposition |
|------|---------|----------|-------------|
| `pacientes.service.ts` — `updateContacto()` | CR-01: absent `telefono` key nulled the column | 🛑 was Critical | **FIXED** in commit `7c8cb91`, with 2 regression tests, verified in this session |
| `paciente-portal.service.ts` — `pickPresent()` | CR-02: portal can still persist `telefono: ''` (no min-length check on `UpdateContactoPortalDto`) | ⚠️ Warning | **Pre-existing** (not introduced by this phase — `pickPresent()`'s null/undefined-drop logic and the DTO's lack of a length constraint both predate Phase 67; the column being `NOT NULL` before this phase did not prevent `''` either). Honestly disclosed via an updated comment in `7c8cb91`. Not part of TEL-01/ENVIO-01/ENVIO-02's scope. Recommend a follow-up ticket for Phase 69 or a dedicated fix. |
| `pacientes.service.ts` — `create()` | CR-03: unawaited `return this.prisma.paciente.create(...)` inside `try` makes the P2002→409 branch dead code | ⚠️ Warning | **Pre-existing**, confirmed by the reviewer's synchronous-throw analysis and disclosed in-code via `7c8cb91`'s comment update. The phase's own `BadRequestException` rethrow works correctly (verified by tests) because `normalizeTelefono()` throws synchronously before the `return`. Does not block TEL-01/ENVIO-01/ENVIO-02. |
| `tsconfig.json` | `strictNullChecks: false` — all `string \| null` widenings are compile-time inert | ℹ️ Info | Documented, weighed per verification instructions; runtime behavior verified via tests/live probes instead of relying on `tsc`. Pre-existing project-wide setting, out of this phase's scope to change. |
| `pacientes.service.ts` — `search()` (not `suggest()`) | Sibling raw query left with stale `telefono: string` type and bare `LIKE` (SQL-safe today, but inconsistent) | ℹ️ Info | Out of the ROADMAP's declared "reads a auditar" list; not a phase must-have. |
| `whatsapp.service.ts` / `pacientes.service.ts` | Guard validates existence, not shape (`'sin dato'` 8-char string passes) | ℹ️ Info | **Intentional per D-03** ("no juzga si el número es válido, sólo si existe") — not a defect against this phase's decisions. |
| `pacientes.service.ts` | `console.log` on hot paths (`suggest()`, `create()` catch) including full error objects | ℹ️ Info | Pre-existing style in this file, not newly introduced by telefono changes (the `create()` catch's `console.log` line predates this phase). |

## Gaps Summary

No gaps found against Phase 67's declared success criteria and must-haves. All 5 ROADMAP success criteria are independently verified (including two live, rolled-back database probes run in this verification session, not just SUMMARY claims). The one genuine regression the code review surfaced (CR-01, an unintended data-loss bug in `updateContacto`) was fixed with regression tests before this verification ran, and is confirmed fixed in the current codebase. CR-02 and CR-03 are real, disclosed, pre-existing defects unrelated to this phase's introduced code paths — they do not block TEL-01/ENVIO-01/ENVIO-02 and are recommended as follow-up tickets rather than phase gaps.

---

*Verified: 2026-08-18*
*Verifier: Claude (gsd-verifier)*
