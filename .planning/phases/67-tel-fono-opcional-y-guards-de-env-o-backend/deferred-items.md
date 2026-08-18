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

Per the Scope Boundary rule (only auto-fix issues directly caused by the current
task's changes), these are logged here and left untouched rather than fixed inline.

Running `npm run lint` (which runs `eslint --fix`) as part of this plan's verification
did reformat (prettier-only, no logic change) unrelated lines in
`pacientes.service.ts` and `pacientes.service.spec.ts` as a side effect of the
mandated lint command — documented in the 67-01-SUMMARY.md deviations section.
