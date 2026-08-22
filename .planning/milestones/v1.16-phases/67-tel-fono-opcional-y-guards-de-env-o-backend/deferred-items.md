# Deferred Items — Phase 67

## Pre-existing lint debt (out of scope for 67-01)

`npm run lint` (from `backend/`) reports 44 pre-existing `@typescript-eslint/no-unused-vars` /
`no-require-imports` errors across 21 files. None of them are in the 5 files this plan's
Task 3 touched for type widening (`paciente-suggest.type.ts`, `paciente-lista.dto.ts`,
`reportes.types.ts`, and the two `$queryRaw` generics in `pacientes.service.ts` /
`reportes-financieros.service.ts`). Verified pre-existing via `git blame` — e.g.
`backend/src/modules/finanzas/finanzas.controller.ts:253` (`req` unused) blames to
2026-03-13, five months before this phase started.

Two of the 44 errors are in files this plan's Task 3 partially edited
(`pacientes.service.ts:34,146` — `esPortalUrlValida`, `estudiosPendientes`;
`reportes-financieros.service.ts:453` — `soloVencidas`) but on lines untouched by
the telefono-nullability edits themselves — confirmed unrelated to the `telefono`
change by inspection.

Plan 67-04 (Task 2) touched `presupuestos.service.ts::generatePdf()` and found
`presupuestos.service.ts:21` (`Decimal` imported but never used) also pre-existing —
`git blame` traces it to `b0c219cc` (2026-01-07), seven months before this phase
started, unrelated to the `telefono` cast removal on the same file.

## Pre-existing test failure: `reportes.controller.spec.ts` (out of scope for 67-04)

`npm run test -- reportes` reports 15 failed / 55 passed across 6 suites. All 15
failures are in `reportes.controller.spec.ts`, which fails to bootstrap its
`TestingModule` (`JwtAuthGuard` cannot be resolved — a DI wiring gap in the spec
file itself, unrelated to any Prisma/telefono type). `reportes-financieros.service.ts`
— the file Plan 67-04's Task 1 actually audited — has zero diff from this plan
(confirmed via `git status --short`) and its own spec,
`reportes-financieros.service.spec.ts`, passes (`PASS`). The controller spec last
changed 2026-06-18, two months before this phase started. Logged here rather than
fixed inline, per the Scope Boundary rule.

Per the Scope Boundary rule (only auto-fix issues directly caused by the current
task's changes), these are logged here and left untouched rather than fixed inline.

Running `npm run lint` (which runs `eslint --fix`) as part of this plan's verification
did reformat (prettier-only, no logic change) unrelated lines in
`pacientes.service.ts` and `pacientes.service.spec.ts` as a side effect of the
mandated lint command — documented in the 67-01-SUMMARY.md deviations section.
