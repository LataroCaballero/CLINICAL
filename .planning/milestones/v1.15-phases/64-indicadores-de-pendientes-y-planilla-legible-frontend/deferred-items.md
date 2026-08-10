# Deferred Items — Phase 64

## Pre-existing tsconfig `rootDir` mismatch (out of scope, not fixed)

- **Found during:** 64-01, Task 2 verification (`cd backend && npx tsc --noEmit -p tsconfig.json`)
- **Symptom:** `error TS6059: File '.../backend/test/app.e2e-spec.ts' is not under 'rootDir' '.../backend/src'`
- **Cause:** `backend/tsconfig.json` sets `rootDir: "./src"` but the default `include` pattern (`**/*`) also picks up `backend/test/app.e2e-spec.ts`, which lives outside `src/`. This is a pre-existing project configuration issue, unrelated to any file touched by plan 64-01.
- **Verification performed instead:** `npx tsc --noEmit -p tsconfig.json --rootDir .` (overriding `rootDir` to include the whole backend dir) compiles cleanly with zero errors, confirming the changes made in 64-01 (`historia-clinica.contenido.helpers.ts`, `turnos.service.ts`) introduce no new type errors.
- **Action:** Not fixed — out of scope per Scope Boundary rule (pre-existing, unrelated to task files). Left for a future phase/plan to address the tsconfig `include`/`exclude` configuration if desired.
