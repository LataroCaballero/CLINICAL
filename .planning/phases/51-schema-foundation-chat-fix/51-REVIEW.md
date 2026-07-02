---
phase: 51-schema-foundation-chat-fix
reviewed: 2026-06-26T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - backend/src/prisma/schema.prisma
  - backend/src/modules/catalogo-preop/alergia-catalogo.seed-data.ts
  - backend/src/modules/catalogo-preop/medicamento-catalogo.seed-data.ts
  - backend/src/prisma/migrations/20260626000000_v1_12_schema_foundation_chat_fix/migration.sql
  - backend/src/modules/pacientes/seguimiento-scheduler.service.ts
  - backend/src/modules/pacientes/seguimiento-scheduler.service.spec.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 51: Code Review Report

**Reviewed:** 2026-06-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed the v1.12 schema-foundation + CHAT-01/CHAT-02 chat-fix changes: schema additions (patient self-report staging fields, pre-surgical catalog tables, `TareaSeguimiento.notificada` guard, `MensajeInterno.origenPaciente` + nullable author), the hand-appended destructive cleanup `DELETE`, the `notificada` dedupe guard in the seguimiento scheduler, its unit test, and two catalog seed-data arrays.

**The flagged DELETE is correct on both audited axes.** Scope (`WHERE "esSistema" = true`): the only code path that creates a `MensajeInterno` with `esSistema=true` is the buggy scheduler — presupuesto producers (`presupuestos.service.ts:628/703/776`) omit `esSistema` (defaults `false`) and `mensajes-internos.service.ts` `create()` likewise never sets it, so no legitimate message is destroyed (D-01 holds). Cascade: `MensajeLectura.mensaje` is `onDelete: Cascade` (schema:257), so read-receipt rows are removed automatically with no orphans (D-02 holds). No BLOCKER in the cleanup.

The remaining concerns are robustness gaps: the scheduler's alert+flag pair is not atomic (dedupe can still duplicate under partial failure), and the migration adds `notificada` with default `false` without a backfill, so the next 09:00 cron will re-alert the entire overdue backlog immediately after the cleanup.

## Warnings

### WR-01: Alert creation and `notificada` flag are not atomic — dedupe guard can still produce duplicates

**File:** `backend/src/modules/pacientes/seguimiento-scheduler.service.ts:52-69`
**Issue:** The whole point of CHAT-01 is "alert exactly once." But `mensajeInterno.create(...)` (line 52) and `tareaSeguimiento.update({ notificada: true })` (line 63) are two separate awaits, not a single transaction. If the process crashes, or the `update` fails, after the `create` succeeds, the task stays `notificada=false`. The next 09:00 run re-selects it and creates a **second** `MensajeInterno` — exactly the duplicate the guard is meant to prevent. The per-task `try/catch` swallows the `update` error (logs and continues), guaranteeing the inconsistent state persists.
**Fix:** Make the alert and the flag atomic so they commit or roll back together:
```ts
await this.prisma.$transaction([
  this.prisma.mensajeInterno.create({
    data: { mensaje, prioridad: dias <= 3 ? 'ALTA' : 'MEDIA', esSistema: true,
            autorId: tarea.profesional.usuarioId, pacienteId: tarea.paciente.id },
  }),
  this.prisma.tareaSeguimiento.update({
    where: { id: tarea.id },
    data: { notificada: true, notificadaEn: ahora },
  }),
]);
```

### WR-02: Migration adds `notificada` with DEFAULT false and never backfills — next cron re-floods the overdue backlog

**File:** `backend/src/prisma/migrations/20260626000000_v1_12_schema_foundation_chat_fix/migration.sql:26-27, 88`
**Issue:** The migration deletes the historical flood (line 88) but adds `TareaSeguimiento.notificada` with `DEFAULT false` (line 26) and performs **no backfill**. Every existing task that was already alerted (the ones whose alerts are being deleted) is now `notificada=false`. On the very next 09:00 cron, the scheduler's `WHERE { completada:false, notificada:false, fechaProgramada: { lte: now } }` re-selects every overdue, not-completed task and regenerates one `MensajeInterno` each — recreating a (bounded) wave of system messages right after the cleanup. The D-06 comment only addresses lock contention from the DELETE, not this re-notification burst.
**Fix:** If re-notification of the existing backlog is undesired, backfill the flag in the same migration so already-alerted tasks stay quiet:
```sql
UPDATE "TareaSeguimiento"
SET "notificada" = true, "notificadaEn" = CURRENT_TIMESTAMP
WHERE "completada" = false AND "fechaProgramada" <= CURRENT_TIMESTAMP;
```
If the one-time re-baseline IS intended, document it explicitly next to the DELETE so the burst is not mistaken for the original bug.

## Info

### IN-01: D-06 off-peak timing guarantee is unenforced by the SQL

**File:** `backend/src/prisma/migrations/20260626000000_v1_12_schema_foundation_chat_fix/migration.sql:82-88`
**Issue:** The comment promises the unbounded `DELETE` runs "off-peak (23:00–07:00 ART), never at 09:00," but nothing in the migration enforces timing — `prisma migrate deploy` runs whenever the deploy pipeline invokes it. The "never at 09:00" property depends entirely on operator discipline. (Lock/perf detail itself is out of v1 scope; flagged only as a documentation-vs-mechanism gap.)
**Fix:** Either gate the deploy step in the release runbook/CI to the off-peak window, or drop the time-specific promise from the comment to avoid a false sense of safety.

### IN-02: New composite index does not serve the scheduler's global query

**File:** `backend/src/prisma/schema.prisma:1218` / `migration.sql:71`
**Issue:** The scheduler's `findMany` filters on `completada, notificada, fechaProgramada` with **no** `profesionalId` (it is a cross-professional scan). The new index `@@index([profesionalId, completada, notificada, fechaProgramada])` leads with `profesionalId`, so it cannot serve this query. (Pure performance is out of v1 scope; noted because the column order suggests either the index or the query intent is mismatched — the index appears aimed at a per-professional UI listing, not the cron.)
**Fix:** Confirm the index is intended for per-professional reads; if the cron scan needs support, a separate `@@index([completada, notificada, fechaProgramada])` would be required.

### IN-03: Unit test asserts query shape only — does not cover the partial-failure duplicate path

**File:** `backend/src/modules/pacientes/seguimiento-scheduler.service.spec.ts:40-55`
**Issue:** The "skips tasks where notificada=true" test mocks `findMany` to return `[]` and only asserts the `where` contains `notificada: false`. It validates the query shape (which does usefully guard against a refactor dropping the filter) but never exercises actual skipping, and the duplicate-on-partial-failure path (WR-01) is untested.
**Fix:** Add a test where `mensajeInterno.create` resolves but `tareaSeguimiento.update` rejects, asserting the task is not silently left un-flagged — or, once WR-01 is fixed with `$transaction`, assert both ops are issued as one transactional call.

---

_Reviewed: 2026-06-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
