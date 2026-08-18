---
phase: 67-tel-fono-opcional-y-guards-de-env-o-backend
plan: 04
subsystem: api
tags: [nestjs, prisma, typescript, reportes, presupuestos, pdf]

# Dependency graph
requires:
  - phase: 67-01
    provides: "Paciente.telefono nullable end-to-end (schema, migration, Prisma client, all TypeScript declarations widened to string | null)"
  - phase: 67-03
    provides: "presupuestos.service.ts::generatePdf() explicitly scoped out of the WhatsApp guard set as a type-safety/null-passthrough concern, assigned to this plan"
provides:
  - "reportes-financieros.service.ts's three telefono read sites (list mapping x2 + raw SQL SELECT/GROUP BY) confirmed compiling clean against string | null, zero code changes needed"
  - "presupuestos.service.ts::generatePdf() propagates telefono: string | null without as any casts, matching the already-cast-free presupuesto-email.service.ts sibling"
  - "13-row audit table closing the ROADMAP's 'reads a auditar' list (12 sites) plus the presupuesto-pdf.service.ts:143 precedent row, with disposition + owning plan per site"
affects: [67-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Confirm-don't-touch: when a widened type already makes a call site typecheck cleanly, the correct action is a zero-diff audit entry, not a defensive ?? '' or placeholder"

key-files:
  created: []
  modified:
    - backend/src/modules/presupuestos/presupuestos.service.ts
  audited-no-change:
    - backend/src/modules/reportes/services/reportes-financieros.service.ts
    - backend/src/modules/presupuestos/presupuesto-email.service.ts
    - backend/src/modules/presupuestos/presupuesto-pdf.service.ts
    - backend/src/modules/paciente-portal/paciente-portal.service.ts
    - backend/src/modules/pacientes/pacientes.service.ts

key-decisions:
  - "Task 1 (reportes-financieros.service.ts) resulted in zero code changes: the three telefono read sites (~:522 map, ~:563/:572 raw SQL SELECT/GROUP BY, ~:599 map) already compile clean against string | null (widened by plan 67-01's Task 3) and getMorosidad()'s raw SQL never filters/compares on pac.telefono, so no COALESCE was needed. No commit was created for this task per the plan's explicit zero-diff allowance."
  - "presupuestos.service.ts::generatePdf() had 3 stale (presupuesto.paciente as any) casts (dni, email, telefono) — all three removed in one edit, not just telefono, since the compiler accepted all three without complaint (confirming the plan's conditional 'if the compiler accepts them without the casts' clause)"
  - "presupuesto-email.service.ts:77 required zero edits — it already read presupuesto.paciente.telefono directly with no cast, serving as this plan's in-repo precedent for the presupuestos.service.ts fix"
  - "presupuesto-pdf.service.ts NOT touched — git diff --stat confirms zero changes; the if (paciente.telefono) render guard at line 143 remains the precedent"
  - "pacientes.service.ts:973 (getListaAccion) re-confirmed first-hand this session: no return-type annotation on the method, no satisfies/nominal type on the .map() literal at :970-981 — same finding as plan 67-01's audit, re-verified per this plan's read_first requirement. pacientes.service.ts is NOT in this plan's files_modified and git status confirms zero diff."
  - "paciente-portal.service.ts:142 (getDatos(), contacto.telefono passthrough) audited as the 6th of the 12 ROADMAP-named sites: no explicit return-type annotation on getDatos(), contacto is a plain object literal with no nominal/satisfies type — telefono: paciente.telefono flows by structural inference, zero edit needed"

patterns-established: []

requirements-completed: [TEL-01]

# Metrics
duration: ~20min
completed: 2026-08-18
---

# Phase 67 Plan 4: Auditoría de Lecturas — Reportes Financieros y Presupuesto PDF Summary

**`reportes-financieros.service.ts`'s three telefono read sites needed zero changes (already `string | null`-clean from plan 67-01); `presupuestos.service.ts::generatePdf()` had its stale `as any` casts on `dni`/`email`/`telefono` removed to match the cast-free `presupuesto-email.service.ts` sibling; the ROADMAP's 12-site audit closes with a 13-row table (12 sites + the `presupuesto-pdf.service.ts:143` precedent).**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2/2 complete (Task 1: zero-diff audit, no commit; Task 2: one commit)
- **Files modified:** 1 (`presupuestos.service.ts`)

## Accomplishments

- Confirmed (via `grep` + `npm run build` + `npm run test -- reportes`) that `reportes-financieros.service.ts`'s three telefono sites — `getCuentasPorCobrar()`'s `.map()` (~:522), `getMorosidad()`'s raw SQL `SELECT`/`GROUP BY` (~:563/:572), and `getMorosidad()`'s `.map()` (~:599) — already propagate `telefono: string | null` cleanly with no `as any`, no `!`, no `?? ''` placeholder, and no `LIKE`/`=`/`LOWER`/`unaccent`/`similarity` comparison against the column. Zero lines changed for this task.
- Removed the three stale `(presupuesto.paciente as any)` casts in `presupuestos.service.ts::generatePdf()` (`dni`, `email`, `telefono`) — the compiler accepted the direct property access for all three once the cast was dropped, so the payload now reads `telefono: presupuesto.paciente.telefono` verbatim, matching `presupuesto-email.service.ts:77`'s existing cast-free style.
- Verified `presupuesto-pdf.service.ts`'s `if (paciente.telefono) doc.text(...)` render guard (line 143) is untouched — confirmed via `git diff --stat` showing zero changes to that file — and probed it directly (throwaway `ts-node` script, deleted immediately after, no artifact left behind): calling `generatePdfBuffer()` with `paciente.telefono: null` produced a 1900-byte PDF buffer with no "Teléfono: null" (or "Telefono: null") substring anywhere in its text stream, and did not throw.
- Re-confirmed `pacientes.service.ts:973` (`getListaAccion`) first-hand per this plan's read_first requirement: no return-type annotation, no `satisfies`/nominal type on the `.map()` literal — same finding as plan 67-01, `telefono: p.telefono` still flows by structural inference. `git status --short` confirms `pacientes.service.ts` has zero diff from this plan.
- Audited `paciente-portal.service.ts:142` (`getDatos()`, `contacto.telefono` passthrough) — the 6th of the 12 ROADMAP-named sites, not explicitly covered by any prior plan's summary — and confirmed the same structural-inference pattern applies: zero edit needed.
- Closed the audit with a 13-row table (below) covering all 12 ROADMAP-named sites plus `presupuesto-pdf.service.ts:143` as the 13th precedent row.
- `npm run build` passes 0 errors; `npx eslint` scoped to the two touched files reports only pre-existing, unrelated errors (see Deferred Issues below).

## Task Commits

Task 1 (audit, zero diff — no commit created, per the plan's explicit allowance for a zero-line-change outcome) and Task 2 were the only tasks:

1. **Task 1: Auditar los tres sitios de reportes financieros** — no commit (zero code changes; audited via `grep`/`npm run build`/`npm run test`, documented here)
2. **Task 2: Presupuestos — propagar telefono nullable sin casts y cerrar la tabla de auditoría** - `bd9bd2f` (fix)

**Plan metadata:** (this commit, to follow)

## Files Created/Modified

- `backend/src/modules/presupuestos/presupuestos.service.ts` — `generatePdf()`'s `paciente` payload block: removed `(presupuesto.paciente as any)` on `dni`, `email`, `telefono`, now reads all three directly off `presupuesto.paciente`
- `backend/src/modules/reportes/services/reportes-financieros.service.ts` — audited, zero changes
- `backend/src/modules/presupuestos/presupuesto-email.service.ts` — audited, zero changes (already cast-free)
- `backend/src/modules/presupuestos/presupuesto-pdf.service.ts` — audited, zero changes (precedent preserved)
- `.planning/phases/67-tel-fono-opcional-y-guards-de-env-o-backend/deferred-items.md` — appended two new pre-existing-debt entries found while running this plan's mandated verification commands (see Deferred Issues)

## 13-Site Audit Table (ROADMAP "reads a auditar" + precedent)

| # | Site | Owning Plan | Disposition |
|---|------|-------------|-------------|
| 1 | `pacientes.service.ts:166` (`obtenerListaPacientes`) | 67-01 | Auditado sin cambios — `PacienteListaDto` widened + `satisfies` enforces `string \| null` |
| 2 | `pacientes.service.ts:973` (`getListaAccion`) | 67-01 (re-confirmed 67-04) | Auditado sin cambios — no return-type annotation, plain object literal, structural inference |
| 3 | `reportes-financieros.service.ts:522` (`getCuentasPorCobrar()` `.map()`) | 67-04 | Auditado sin cambios — type already widened by 67-01, no cast/placeholder present |
| 4 | `reportes-financieros.service.ts:563`/`:572` (`getMorosidad()` raw SQL `SELECT`/`GROUP BY`) | 67-01 (generic widened) / 67-04 (SQL audited) | Auditado sin cambios — no `LIKE`/`=`/comparison on `pac.telefono`, `GROUP BY` on a nullable column groups `NULL` rows without error |
| 5 | `reportes-financieros.service.ts:599` (`getMorosidad()` `.map()`) | 67-04 | Auditado sin cambios |
| 6 | `paciente-portal.service.ts:142` (`getDatos()`, `contacto.telefono`) | 67-04 | Auditado sin cambios — no return-type annotation, plain object literal, structural inference |
| 7 | `whatsapp.service.ts:229` (`sendTemplateMessage`) | 67-03 | Modificado — `requireTelefonoParaEnvio()` guard wired in |
| 8 | `whatsapp.service.ts:279` (`sendFreeText`) | 67-03 | Modificado — guard wired in |
| 9 | `whatsapp.service.ts:331` (`sendPresupuestoPdf`) | 67-03 | Modificado — guard wired in |
| 10 | `whatsapp.service.ts:456` (`retryMessage`) | 67-03 | Modificado — guard wired in, after ownership check |
| 11 | `presupuestos.service.ts:458` (`generatePdf()` paciente payload) | 67-04 | Modificado — `(presupuesto.paciente as any).telefono` cast removed |
| 12 | `presupuesto-email.service.ts:77` (`enviarPresupuestoPorEmail()` pdfData) | 67-04 | Auditado sin cambios — already cast-free, precedent for the fix above |
| 13 | `presupuesto-pdf.service.ts:143` (`buildPatientSection()` render) | 67-04 | Precedente preservado — `if (paciente.telefono)` guard confirmed intact via `git diff --stat` and a live probe (no `Teléfono: null` in the rendered PDF text stream) |

## Decisions Made

- **Task 1 zero-diff outcome**: the plan explicitly allowed this ("Si `npm run build` no reporta ningún error... el resultado legítimo de esta task puede ser cero líneas modificadas"). Verified via targeted `grep` for `LIKE`/`=` comparisons, `as any`/`!` assertions, and `?? ''` placeholders on `telefono` in `reportes-financieros.service.ts` — none found. `npm run test -- reportes` shows `reportes-financieros.service.spec.ts` passing; no commit was created for a task with no file changes.
- **Removing all 3 casts, not just telefono, in `generatePdf()`**: the plan's action block said "quitar el cast... sobre `telefono` —y también sobre `dni` y `email` si el compilador los acepta sin ellos". `npm run build` confirmed all three compile without casts, so all three were dropped together in one edit for consistency with the sibling `presupuesto-email.service.ts` block, which never had casts on any of the three fields.
- **`presupuesto-pdf.service.ts` behavior verification methodology**: rather than asserting only via type-checking, ran a throwaway `ts-node` script (no NestJS `TestingModule`, no DB — `PresupuestoPdfService` has no injected dependencies besides `Logger`) that called `generatePdfBuffer()` directly with `paciente.telefono: null` and inspected the resulting PDF buffer's `latin1`-decoded text stream for the literal substring `Teléfono: null`. Confirmed absent; buffer generated (1900 bytes) without throwing. Script deleted immediately after running — `git status --short` confirmed no leftover artifact.
- **`paciente-portal.service.ts:142` disposition**: this is the 6th of the 12 ROADMAP-named sites and was not explicitly covered by plan 67-02's summary (which only touched `pickPresent()`'s comment, a different method). Read `getDatos()` directly (lines 93-150): no return-type annotation on the method, `contacto: { telefono: paciente.telefono, ... }` is a plain object literal with no nominal type or `satisfies` — same structural-inference pattern already established as safe by plans 67-01/67-04 for the other read-passthrough sites.
- **`pacientes.service.ts:973` re-confirmation**: the plan's `read_first` explicitly required opening `getListaAccion()` fresh (not trusting 67-01's summary alone) before writing the audit table row. Did so — same finding, same disposition, now cited with this plan's own first-hand verification per the acceptance criteria's wording ("cita el chequeo efectivamente realizado... no una suposición").

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written; both tasks matched their `<action>` blocks and acceptance criteria without requiring bug fixes, missing-functionality additions, or blocking-issue fixes.

## Deferred Issues

Logged to `.planning/phases/67-tel-fono-opcional-y-guards-de-env-o-backend/deferred-items.md` (pre-existing, out of scope per the Scope Boundary rule — none introduced by this plan's edits):

- **`presupuestos.service.ts:21`** — `Decimal` imported but never used (`@typescript-eslint/no-unused-vars`). `git blame` traces it to `b0c219cc` (2026-01-07), seven months before this phase started, on a line untouched by this plan's cast removal (line ~458).
- **`reportes.controller.spec.ts`** — 15/70 test failures under `npm run test -- reportes` are all in this one spec file, which fails to bootstrap its `TestingModule` (`JwtAuthGuard` unresolved — a pre-existing DI wiring gap in the spec itself, last changed 2026-06-18). `reportes-financieros.service.ts` (the file this plan's Task 1 actually audited) has zero diff from this plan and its own spec, `reportes-financieros.service.spec.ts`, passes.
- **`reportes-financieros.service.ts:453`** (`soloVencidas` unused) — already logged by plan 67-01, re-confirmed still present and still unrelated to `telefono`.

## Issues Encountered

None beyond the pre-existing, already-scoped-out lint/test debt above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 67-04 closes the read-side of TEL-01: every site the ROADMAP flagged as consuming `telefono` is now either verified type-clean, edited to drop a stale cast, or confirmed as an intentional guard (67-03). No remaining `as any`/`!`/placeholder around `telefono` in the audited files.
- Plan 67-05 (test coverage) can now write unit tests directly against `normalizeTelefono()` (67-02), `requireTelefonoParaEnvio()` and its 4 call sites (67-03), and `presupuestos.service.ts::generatePdf()`'s null-safe `paciente.telefono` passthrough (this plan) using the mock-Prisma / BullMQ-mock shapes already identified in `67-PATTERNS.md`.
- `pacientes.service.ts` remains untouched by this plan — confirmed via `git status --short` — leaving it fully available for plan 67-05's edits without merge risk.
- No blockers remain for 67-05.

---
*Phase: 67-tel-fono-opcional-y-guards-de-env-o-backend*
*Completed: 2026-08-18*

## Self-Check: PASSED

- FOUND: backend/src/modules/presupuestos/presupuestos.service.ts
- FOUND: .planning/phases/67-tel-fono-opcional-y-guards-de-env-o-backend/deferred-items.md
- FOUND: .planning/phases/67-tel-fono-opcional-y-guards-de-env-o-backend/67-04-SUMMARY.md
- FOUND commit: bd9bd2f (Task 2)
