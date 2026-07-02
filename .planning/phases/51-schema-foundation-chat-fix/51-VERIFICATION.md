---
phase: 51-schema-foundation-chat-fix
verified: 2026-06-26T04:00:00Z
status: passed
human_decision: "2026-06-26 — User accepted WR-02 bounded burst as intentional first-notification for the overdue backlog (23 tasks, one alert each then permanent silence); WR-01 transaction gap accepted as low risk. No backfill, no code change. SC#4 smoke-test deferred to manual UAT (51-HUMAN-UAT.md)."
score: 4/4 must-haves verified
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Smoke-test existing screens after migration (SC#4)"
    expected: "Pacientes list, HC entries, chat view (mensajes internos), turnos calendar, and finanzas screens all load without console errors or 500 responses after the new columns were added"
    why_human: "npm run build exits 0 and migration is applied, but actual page rendering and query execution against the live schema change can only be confirmed by a human opening the app"
  - test: "Decide on WR-02: bounded 23-message burst acceptable or requires backfill?"
    expected: "Human confirms the one-time wave of up to 23 new esSistema=true messages that will appear on the next 09:00 cron is intentional (first-and-only alert for each overdue task) OR requests a backfill UPDATE be added so the tasks start with notificada=true and the chat stays clean"
    why_human: "The migration already ran — the notificada column was added with DEFAULT false and no backfill was applied. Whether the bounded burst is acceptable is a product decision, not a code check."
---

# Phase 51: Schema Foundation + Chat Fix — Verification Report

**Phase Goal:** La base de datos queda migrada para el milestone completo y el spam diario de mensajes "Seguimiento CRM" se detiene de forma permanente en una sola release atómica.
**Verified:** 2026-06-26T04:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC#1 | Scheduler generates exactly one alert per overdue task; already-alerted tasks are never re-selected regardless of how many cron cycles pass | VERIFIED | `notificada: false` in `findMany` WHERE (line 24); `update({ notificada: true, notificadaEn: ahora })` after create (lines 63-68); 2 unit tests pass. WR-01 warning noted below. |
| SC#2 | Historical flood is deleted from chat; legitimate messages (esSistema=false) are fully preserved | VERIFIED | DB query: `esSistema=true` count = **0**; `esSistema=false` count = **553** (preserved). Migration line 88: `DELETE FROM "MensajeInterno" WHERE "esSistema" = true`. No DELETE on TareaSeguimiento or MensajeLectura. |
| SC#3 | Guard and cleanup deploy in same release — no window where messages are cleaned but `notificada` guard is inactive | VERIFIED (literal) | Both ship in one deploy unit: migration `20260626000000_v1_12_schema_foundation_chat_fix` applies the DDL and the DELETE; scheduler code change adds `notificada: false` to the same release. Guard IS active at deploy time. **See WR-02 warning below** for the practical "permanently" claim. |
| SC#4 | App functions normally after migration — all existing screens load without regressions | VERIFIED (technical) | `npm run build` exits 0. `npx prisma migrate status` reports 47 migrations, "Database schema is up to date!" All new columns have defaults or are nullable — no NOT-NULL-without-default risk. **Human smoke test required** (see human verification section). |

**Score:** 4/4 truths verified.

---

### WR-01 Assessment: Scheduler create + update are not atomic

**Source:** 51-REVIEW.md WR-01
**File:** `backend/src/modules/pacientes/seguimiento-scheduler.service.ts:52-68`

In the scheduler, `mensajeInterno.create(...)` (line 52) and `tareaSeguimiento.update({ notificada: true })` (line 63) are two separate `await` calls inside a per-task `try/catch`. They are NOT wrapped in a `prisma.$transaction`. If the process crashes or the `update` call throws AFTER the `create` succeeds, the task remains `notificada=false`. The next 09:00 cron re-selects it and creates a second `MensajeInterno` — exactly the duplicate SC#1 forbids.

**Severity:** WARNING (not BLOCKER).
- Normal operation (no crash/partial failure) works correctly — unit tests verify this.
- The failure mode requires the `create` to succeed and the `update` to fail atomically, which is uncommon but not impossible.
- SC#1 is met under the happy path; the duplicates-under-partial-failure case is unaddressed.

**Suggested fix:** Wrap both calls in `await this.prisma.$transaction([...])` as shown in the review.

---

### WR-02 Assessment: No backfill for notificada — 23 overdue tasks will burst on next cron

**Source:** 51-REVIEW.md WR-02
**File:** Migration `migration.sql` (column DEFAULT false, no UPDATE backfill)

The migration adds `TareaSeguimiento.notificada BOOLEAN NOT NULL DEFAULT false` and deletes all `esSistema=true` messages. However, **it does not backfill `notificada=true` for existing overdue tasks that had already been alerted** (those alerts are now deleted).

DB query confirms: **23 tasks** are currently `completada=false`, `notificada=false`, and `fechaProgramada <= now`. On the next 09:00 cron after deploy, all 23 will match the scheduler's `WHERE { completada: false, notificada: false, fechaProgramada: { lte: ahora } }` and each will produce a new `MensajeInterno` with `esSistema=true`. After that one cron cycle, all 23 will have `notificada=true` and the spam stops permanently.

**Honest assessment of impact on goal:**
- The phase goal says: "spam diario se detiene de forma permanente en una sola release atómica."
- SC#3 (literal): "no existe ventana en la que los mensajes estén limpiados pero el guard `notificada` no esté activo." → The guard IS active. SC#3 as written is met.
- BUT the practical effect: on the first post-deploy cron, esSistema=true count goes from 0 back to 23. This is a bounded one-time burst (not infinite re-spam), but it IS a recurrence of system messages in the chat immediately after the cleanup.
- "Permanently" in the goal is undermined by this one-time burst: the cleanup takes effect at deploy time, but the next cron re-populates 23 messages.

**Severity:** WARNING — not a hard BLOCKER because:
1. SC#3 literal text is satisfied (guard is active in same release).
2. The burst is bounded (one message per task, no infinite re-alerting after that).
3. After the first post-deploy cron, the spam stops permanently and SC#1 holds.

**Human decision required.** Two options:
- Accept the bounded burst (23 messages, then silence forever). This could be documented as intentional "first-notification for overdue backlog."
- Add a backfill script/migration to set `notificada=true, notificadaEn=CURRENT_TIMESTAMP` for all overdue incomplete tasks before the next cron fires:
  ```sql
  UPDATE "TareaSeguimiento"
  SET "notificada" = true, "notificadaEn" = CURRENT_TIMESTAMP
  WHERE "completada" = false AND "fechaProgramada" <= CURRENT_TIMESTAMP;
  ```
  This can be run immediately against the live DB before 09:00 or shipped as a patch.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | All 7 v1.12 change groups; validates clean | VERIFIED | `npx prisma validate` exits 0; all grepped fields confirmed present (notificada, origenPaciente, autorId nullable, AlergiaCatalogoPro, MedicamentoCatalogoPro, estudiosComplementarios, portalToken, staging fields) |
| `backend/src/modules/catalogo-preop/alergia-catalogo.seed-data.ts` | SEED_ALERGIAS with 5 D-07 values | VERIFIED | Contains: Penicilina, Látex, AINEs, Yodo, Contraste. esSistema invariant documented. |
| `backend/src/modules/catalogo-preop/medicamento-catalogo.seed-data.ts` | SEED_MEDICAMENTOS with 6 D-07 values | VERIFIED | Contains: Anticoagulantes, Corticoides, Metformina, Levotiroxina, Aspirina, Enalapril. esSistema invariant documented. |
| `backend/src/prisma/migrations/20260626000000_v1_12_schema_foundation_chat_fix/migration.sql` | DDL + ALTER autorId DROP NOT NULL + DELETE cleanup | VERIFIED | All DDL present; ALTER COLUMN autorId DROP NOT NULL (line 12); DELETE FROM "MensajeInterno" WHERE "esSistema" = true (line 88); no forbidden TareaSeguimiento/MensajeLectura deletes |
| `backend/src/modules/pacientes/seguimiento-scheduler.service.ts` | CHAT-01 dedupe guard; notificada: false in WHERE; update after create | VERIFIED | `notificada: false` at line 24; `notificada: true` update at lines 63-68; old no-op log comment removed; completada not set by scheduler |
| `backend/src/modules/pacientes/seguimiento-scheduler.service.spec.ts` | 2 unit tests for CHAT-01 behavior | VERIFIED | Both tests pass: "skips tasks where notificada=true" and "alerts new task then marks notificada=true"; TDD: RED commit d49d321 → GREEN commit 456db91 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `TareaSeguimiento.notificada Boolean @default(false)` | Scheduler guard (plan 02) | schema field definition | VERIFIED | schema.prisma line 1211 confirmed |
| `Profesional` | `AlergiaCatalogoPro` / `MedicamentoCatalogoPro` | back-relation fields `alergiasCatalogo` / `medicamentosCatalogo` | VERIFIED | schema.prisma lines 137-138 confirmed |
| `seguimiento-scheduler.service.ts findMany` | `TareaSeguimiento.notificada` | `WHERE notificada: false` | VERIFIED | Line 24; grep match on `notificada: false` |
| `seguimiento-scheduler.service.ts` after `mensajeInterno.create` | `TareaSeguimiento.update` | `data: { notificada: true, notificadaEn: ahora }` | VERIFIED | Lines 63-68; grep match on `notificada: true` |
| `migration.sql` | `MensajeInterno` rows | `DELETE FROM "MensajeInterno" WHERE "esSistema" = true` | VERIFIED | Line 88; DB confirmed 0 rows with esSistema=true post-migration |

---

### Data-Flow Trace (Level 4)

Not applicable for this phase. Phase 51 adds schema columns and fixes a scheduler — no data-rendering UI components were introduced. All new Paciente/HistoriaClinicaEntrada fields are inert (no writer) until Phases 52-55. The scheduler fix is verified via unit test + DB query.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CHAT-01 guard: skips notified tasks | `npm test -- --testPathPattern="seguimiento-scheduler"` | 2 tests PASS (5ms) | PASS |
| Migration applied and up to date | `npx prisma migrate status` | "47 migrations found, Database schema is up to date!" | PASS |
| DB: esSistema=true count = 0 | Prisma client count query | 0 | PASS |
| DB: esSistema=false count preserved | Prisma client count query | 553 | PASS |
| DB: 23 overdue tasks will fire on next cron | count where completada=false, notificada=false, fechaProgramada<=now | 23 | WARNING (WR-02) |
| Build compiles without errors | `npm run build` | exit 0 | PASS |
| Schema validates | `npx prisma validate` | "schema is valid" | PASS |

---

### Probe Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| Migration status | `npx prisma migrate status` | 47 migrations, "Database schema is up to date!" | PASS |
| CHAT-01 unit tests | `npm test -- --testPathPattern="seguimiento-scheduler"` | 2/2 passing | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CHAT-01 | 51-01-PLAN.md, 51-02-PLAN.md | Scheduler deduplication guard — one alert per task, no re-notifications | SATISFIED | `notificada: false` in findMany WHERE; `update({ notificada: true })` after create; 2 unit tests pass; DB column present and active |
| CHAT-02 | 51-01-PLAN.md, 51-02-PLAN.md | Historical flood cleanup — DELETE esSistema=true, cascade-safe, no legitimate message loss | SATISFIED | DB: esSistema=true=0, esSistema=false=553; migration.sql line 88; autorId nullable (SetNull) enables cleanup-safe orphan handling; no MensajeLectura pre-delete needed (CASCADE confirmed) |

No orphaned requirements: REQUIREMENTS.md maps only CHAT-01 and CHAT-02 to Phase 51, both satisfied. Traceability table shows them as "Complete."

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TBD/FIXME/XXX found in any phase-modified file | — | — |

No debt markers found. No placeholder implementations found. The removed log-only comment ("solo registramos en log por ahora") is gone and replaced with a real `update` call.

---

### Commit Verification

All commits claimed in SUMMARY files confirmed in `git log`:

| Commit | Message | Status |
|--------|---------|--------|
| `8eddf7d` | feat(51-01): add all v1.12 milestone schema changes | VERIFIED |
| `352ae8b` | feat(51-01): create idempotent seed-data constant files | VERIFIED |
| `f4d48d9` | feat(51-02): apply big-bang v1.12 migration + CHAT-02 cleanup | VERIFIED |
| `d49d321` | test(51-02): add failing tests for CHAT-01 guard (RED) | VERIFIED |
| `456db91` | feat(51-02): fix scheduler CHAT-01 dedupe guard (GREEN) | VERIFIED |

---

### Human Verification Required

#### 1. Smoke-Test Existing Screens (SC#4)

**Test:** Open the app after the migration and navigate through: pacientes list, a patient's historia clinica, the chat (mensajes internos) view, the turnos calendar, and the finanzas screen.
**Expected:** All screens load without console errors, HTTP 500 responses, or Prisma query errors. The chat view for any patient with seguimientos shows only the legitimate messages (esSistema=false) — no "Seguimiento CRM" messages from the historical flood.
**Why human:** `npm run build` exits 0 and the migration is applied, but actual query execution against the live DB and React rendering can only be confirmed by loading the app.

#### 2. Decision on WR-02: Accept or Fix the 23-Task Burst

**Test:** Before the next 09:00 cron fires, check the current state: there are 23 tasks with `completada=false`, `notificada=false`, and `fechaProgramada <= now`. On the next cron, all 23 will generate one new `MensajeInterno` each.
**Expected:** Human decides one of:
- **Accept:** The 23 tasks are genuinely overdue and deserve one notification. The burst is bounded (one message each, then permanent silence). Document this as intentional behavior for the existing backlog.
- **Suppress:** Run the following against the live DB before 09:00 to prevent the burst:
  ```sql
  UPDATE "TareaSeguimiento"
  SET "notificada" = true, "notificadaEn" = CURRENT_TIMESTAMP
  WHERE "completada" = false AND "fechaProgramada" <= CURRENT_TIMESTAMP;
  ```
  This is a safe, targeted UPDATE and can be run immediately.
**Why human:** Whether the one-time burst of 23 system messages is acceptable ("first alert for overdue tasks") or needs suppression is a product decision that the code cannot make. After this decision, the spam stops permanently either way.

---

### Gaps Summary

No hard blockers were found. All four success criteria are satisfied at the code/DB level. Two warnings surface from the code review (51-REVIEW.md) and are documented for human decision:

- **WR-01 (WARNING):** The scheduler's `mensajeInterno.create` and `tareaSeguimiento.update` are not wrapped in a transaction. Under partial failure (create succeeds, update throws), a task stays `notificada=false` and will generate a duplicate alert on the next cron. This is an edge case that doesn't affect the normal path but violates the SC#1 "exactly once" guarantee in failure scenarios. Suggested fix: wrap both in `prisma.$transaction`.
- **WR-02 (WARNING, requires human decision):** The migration added `notificada DEFAULT false` without a backfill UPDATE. All 23 currently-overdue incomplete tasks will each produce one new `MensajeInterno` on the next 09:00 cron. This is bounded (one per task, then silence), but it is a measurable deviation from the goal's "stops permanently in one atomic release" claim. Human must decide before 09:00: accept the burst or run a suppression UPDATE.

---

_Verified: 2026-06-26T04:00:00Z_
_Verifier: Claude (gsd-verifier)_
