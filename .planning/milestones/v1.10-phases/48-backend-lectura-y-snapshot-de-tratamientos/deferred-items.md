# Deferred Items — Phase 48

Out-of-scope discoveries logged during execution (not fixed — pre-existing, unrelated to current task changes).

## Pre-existing lint errors in historia-clinica.service.ts

Found during 48-02 (verification). All pre-exist on the original file (confirmed via `git stash`), outside the edited block:

- `src/modules/historia-clinica/historia-clinica.service.ts:3` — `'Prisma' is defined but never used` (@typescript-eslint/no-unused-vars)
- `aprenderDesdeZonas` block (~line 315) — prettier/prettier line-wrap formatting
- `tratamientos.map` in `aprenderDesdeZonas` (~line 322) — prettier/prettier trailing-comma formatting

Auto-fixable with `eslint --fix`. Not touched: out of scope for 48-02 (the edited snapshot block introduces zero new lint errors).

## Pre-existing tsconfig.json rootDir issue

`backend/tsconfig.json` has `rootDir: ./src` without an `include`, so default glob picks up `test/app.e2e-spec.ts` → TS6059. Build uses `tsconfig.build.json` (passes clean). Config-level issue unrelated to source changes.
