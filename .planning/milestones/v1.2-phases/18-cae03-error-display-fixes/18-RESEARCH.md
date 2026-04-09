# Phase 18: CAE-03 Error Display Fixes — Research

**Researched:** 2026-03-31
**Domain:** BullMQ processor error handling (NestJS) + React conditional rendering (Next.js)
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAE-03 | Facturador ve errores de AFIP traducidos a mensajes legibles en español en un modal (no toasts genéricos) — mínimo error 10242, resultado='R', cert inválido | BUG-1 fix ensures afipError is persisted for UnrecoverableError path; BUG-2 fix expands modal condition to include CAEA_PENDIENTE_INFORMAR estado |
</phase_requirements>

---

## Summary

Phase 18 is a precision bug-fix phase closing two logic defects identified by the v1.2 integration checker in the CAE-03 requirement path. The infrastructure (afipError field, onFailed hook, FacturaDetailModal error panel) was fully built in Phase 17 — both bugs are one-line logic errors in existing code.

**BUG-1** is in `CaeEmissionProcessor.onFailed`: the `prisma.factura.update({ afipError })` call is inside an `if (job.attemptsMade >= maxAttempts)` guard. For `UnrecoverableError` (AFIP business rejection, error 10242), BullMQ marks the job failed immediately with `attemptsMade = 1`. Since `1 < maxAttempts (5)`, the guard is false and `afipError` is never written to DB. The Facturador sees the invoice silently stuck in `EMISION_PENDIENTE` with no error explanation.

**BUG-2** is in `FacturaDetailModal.tsx`: the error panel condition is `factura.afipError && factura.estado === EstadoFactura.EMISION_PENDIENTE`. After 5 transient retries are exhausted, `onFailed` writes `afipError` (correct), then `asignarCaeaFallback` sets `estado = CAEA_PENDIENTE_INFORMAR`. The condition `estado === EMISION_PENDIENTE` is now false — error panel is hidden even though `afipError` is set.

**Primary recommendation:** Move the `prisma.factura.update` call outside the `attemptsMade` guard (BUG-1), expand the modal condition to include `CAEA_PENDIENTE_INFORMAR` (BUG-2), and add a unit test that covers the UnrecoverableError afipError-persist path.

---

## Exact Bug Locations (HIGH confidence)

Both bugs are verified by direct source read and corroborated by the v1.2 audit document.

### BUG-1: CaeEmissionProcessor.onFailed — wrong guard scope

**File:** `backend/src/modules/finanzas/processors/cae-emission.processor.ts` (lines 62–77)

**Current code:**
```typescript
@OnWorkerEvent('failed')
async onFailed(job: Job<CaeJobData>): Promise<void> {
  this.logger.error(`CAE job ${job.id} failed: ${job.failedReason}`);
  const maxAttempts = job.opts?.attempts ?? 3;
  if (job.attemptsMade >= maxAttempts) {
    // afipError persist is INSIDE this guard — wrong
    await this.prisma.factura.update({
      where: { id: job.data.facturaId },
      data: { afipError: job.failedReason ?? 'Error desconocido al emitir.' },
    });
    this.logger.warn(
      `Max retries reached for facturaId ${job.data.facturaId} — attempting CAEA fallback`,
    );
    await this.caeaService.asignarCaeaFallback(job.data.facturaId, job.data.profesionalId);
  }
}
```

**Root cause:** `UnrecoverableError` causes BullMQ to fail the job immediately — `onFailed` fires with `attemptsMade = 1`. The guard `1 >= 5` is false, so `prisma.factura.update` is never reached.

**Required fix:**
```typescript
@OnWorkerEvent('failed')
async onFailed(job: Job<CaeJobData>): Promise<void> {
  this.logger.error(`CAE job ${job.id} failed: ${job.failedReason}`);
  const maxAttempts = job.opts?.attempts ?? 3;
  // Persist afipError unconditionally — covers both UnrecoverableError (attemptsMade=1)
  // and transient exhaustion (attemptsMade=maxAttempts).
  await this.prisma.factura.update({
    where: { id: job.data.facturaId },
    data: { afipError: job.failedReason ?? 'Error desconocido al emitir.' },
  });
  if (job.attemptsMade >= maxAttempts) {
    this.logger.warn(
      `Max retries reached for facturaId ${job.data.facturaId} — attempting CAEA fallback`,
    );
    await this.caeaService.asignarCaeaFallback(job.data.facturaId, job.data.profesionalId);
  }
}
```

**Key constraint:** `prisma.factura.update` must remain BEFORE `asignarCaeaFallback` — this ordering ensures the error is persisted even if the CAEA fallback throws (decision from Phase 17 Plan 02).

---

### BUG-2: FacturaDetailModal — modal condition excludes CAEA_PENDIENTE_INFORMAR

**File:** `frontend/src/app/dashboard/finanzas/facturacion/components/FacturaDetailModal.tsx` (line 270)

**Current code:**
```tsx
{factura?.afipError && factura.estado === EstadoFactura.EMISION_PENDIENTE && (
  <>
    <Separator />
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg mx-6 mb-2">
      ...error panel...
    </div>
  </>
)}
```

**Root cause:** After transient exhaustion, `asignarCaeaFallback` transitions estado to `CAEA_PENDIENTE_INFORMAR`. The modal receives the updated factura via 3-second polling but the condition `estado === EMISION_PENDIENTE` is now false.

**Required fix:**
```tsx
{factura?.afipError && (
  factura.estado === EstadoFactura.EMISION_PENDIENTE ||
  factura.estado === EstadoFactura.CAEA_PENDIENTE_INFORMAR
) && (
  <>
    <Separator />
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg mx-6 mb-2">
      ...error panel unchanged...
    </div>
  </>
)}
```

---

## Standard Stack

No new dependencies. Phase 18 operates entirely within existing infrastructure.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `bullmq` | ^5.x (via `@nestjs/bullmq ^11.0.4`) | BullMQ job lifecycle + `UnrecoverableError` | Already used in CaeEmissionProcessor |
| `@nestjs/bullmq` | ^11.0.4 | `@OnWorkerEvent('failed')` decorator | Already wired |
| `@prisma/client` | ^6.1.0 | `prisma.factura.update` | Already used in processor |
| React / Next.js | 19 / 16 | FacturaDetailModal JSX condition | Already exists |

### No new installations required.

---

## Architecture Patterns

### BullMQ UnrecoverableError lifecycle (HIGH confidence)

When `process()` throws `new UnrecoverableError(message)`:
1. BullMQ immediately moves job to failed set — no retries
2. `onFailed` fires with `job.attemptsMade = 1` (the single attempt that was made)
3. `job.failedReason` contains the `UnrecoverableError` message (the `spanishMessage` from `AfipBusinessError`)
4. `job.opts.attempts` retains the configured value (e.g., 5) — this is NOT overridden

This means the existing guard `job.attemptsMade >= maxAttempts` evaluates as `1 >= 5 = false` for UnrecoverableError. The fix moves the `prisma.factura.update` call before this guard.

### BullMQ transient exhaustion lifecycle (HIGH confidence)

When all configured attempts are exhausted (after backoff):
1. `onFailed` fires with `job.attemptsMade === job.opts.attempts`
2. `job.failedReason` contains the last error message
3. The existing guard `attemptsMade >= maxAttempts` is TRUE
4. The fix path: `prisma.factura.update` runs first (no change here), then `asignarCaeaFallback` runs and sets `estado = CAEA_PENDIENTE_INFORMAR`
5. Frontend polls, gets updated factura — BUG-2 fix ensures panel renders despite estado change

### Phase 17 ordering decision (carry-forward)

From STATE.md Plan 17-02 decision:
> `prisma.factura.update` placed BEFORE `caeaService.asignarCaeaFallback` in `onFailed` — error persisted to DB even if CAEA fallback throws

This ordering must be preserved in the BUG-1 fix. The refactored code keeps `update` before the guard, and the guard retains `asignarCaeaFallback`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| afipError persistence | Custom event system or Redis pubsub | Existing `prisma.factura.update` in `onFailed` | Already wired — just move outside guard |
| Estado-aware error display | New modal component | Expand existing JSX condition | 1-line change; no new component needed |
| UnrecoverableError detection | Instanceof check | None needed — `onFailed` already runs for all failed paths | BullMQ guarantees `onFailed` fires regardless of error type |

---

## Common Pitfalls

### Pitfall 1: Moving update but breaking ordering relative to asignarCaeaFallback
**What goes wrong:** Developer moves `prisma.factura.update` outside the guard but places it AFTER `asignarCaeaFallback` (or inside a try/catch that swallows errors from update if fallback throws).
**Why it happens:** Code restructuring without reading the Phase 17 ordering decision.
**How to avoid:** The new structure must be: (1) `prisma.factura.update`, (2) `if (attemptsMade >= maxAttempts)` guard containing only `asignarCaeaFallback`. The update is always unconditional and first.

### Pitfall 2: Expanding modal condition too broadly
**What goes wrong:** Condition becomes `factura?.afipError` only (no estado check), showing stale error messages on re-opened modals for facturas that subsequently succeeded.
**Why it happens:** Over-simplification.
**How to avoid:** Keep the estado check — expand from `=== EMISION_PENDIENTE` to `=== EMISION_PENDIENTE || === CAEA_PENDIENTE_INFORMAR`. Do NOT show error panel for `EMITIDA` or `ANULADA` even if a stale `afipError` remains in DB (this is theoretically possible if a factura was retried and succeeded after a transient error).

### Pitfall 3: Test only covers transient exhaustion path — misses UnrecoverableError path
**What goes wrong:** Test 8 (existing) verifies `prisma.factura.update` is called when `attemptsMade >= maxAttempts`. After BUG-1 fix, this test still passes. But no test covers the UnrecoverableError scenario where `attemptsMade = 1 < maxAttempts`.
**How to avoid:** Add a new test (Test 9) that calls `onFailed` with `attemptsMade: 1, opts: { attempts: 5 }` and asserts `prisma.factura.update` is called. This test would have been RED before the fix and GREEN after.

---

## Test Architecture

### Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29 + ts-jest |
| Config | `backend/package.json` jest field (standard NestJS) |
| Quick run command | `cd backend && npm test -- --testPathPattern=cae-emission.processor` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAE-03 (BUG-1) | `prisma.factura.update({ afipError })` called when `attemptsMade < maxAttempts` (UnrecoverableError path) | unit | `npm test -- --testPathPattern=cae-emission.processor` | Partial — Test 8 exists but covers transient exhaustion, not UnrecoverableError path |
| CAE-03 (BUG-2) | Modal renders afipError panel when `estado === CAEA_PENDIENTE_INFORMAR` | human verify | n/a (UI condition) | N/A — no automated frontend test |

### Existing Tests (will remain GREEN after fix)

From `cae-emission.processor.spec.ts`:
- **Test 6:** `attemptsMade >= opts.attempts` → calls `asignarCaeaFallback` — still passes (guard preserved)
- **Test 7:** `attemptsMade < opts.attempts` → does NOT call `asignarCaeaFallback` — still passes (guard preserved)
- **Test 8:** `attemptsMade >= maxAttempts` → `prisma.factura.update` called with `afipError` — still passes (update still runs when max reached)

### New Test Required (Wave 0)

**Test 9 (RED → GREEN):** `UnrecoverableError path — prisma.factura.update called even when attemptsMade < maxAttempts`

```typescript
it('Test 9: persists afipError in Factura even when attemptsMade < maxAttempts (UnrecoverableError path)', async () => {
  const job = {
    id: 'j1',
    attemptsMade: 1,           // BullMQ fires onFailed with 1 for UnrecoverableError
    opts: { attempts: 5 },     // configured retries — irrelevant for UnrecoverableError
    data: { facturaId: 'f1', profesionalId: 'p1' },
    failedReason: 'El receptor tiene condición de IVA inválida (10242).',
  } as any;

  await processor.onFailed(job);

  // BUG-1 fix: update must be called regardless of attemptsMade
  expect(mockPrismaService.factura.update).toHaveBeenCalledWith({
    where: { id: 'f1' },
    data: { afipError: 'El receptor tiene condición de IVA inválida (10242).' },
  });
  // Guard still protects CAEA fallback — must NOT be called when attemptsMade < maxAttempts
  expect(mockCaeaService.asignarCaeaFallback).not.toHaveBeenCalled();
});
```

### Wave 0 Gaps
- [ ] Add Test 9 to `backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts` — covers CAE-03 BUG-1 UnrecoverableError path (RED before fix, GREEN after)

*(Test file already exists — this is an addition, not a new file)*

---

## Code Examples

### Corrected onFailed (backend)
```typescript
// Source: audit v1.2 gap closure spec + Phase 17 ordering decision (STATE.md)
@OnWorkerEvent('failed')
async onFailed(job: Job<CaeJobData>): Promise<void> {
  this.logger.error(`CAE job ${job.id} failed: ${job.failedReason}`);
  const maxAttempts = job.opts?.attempts ?? 3;
  // Unconditional: persists afipError for both UnrecoverableError (attemptsMade=1)
  // and transient exhaustion (attemptsMade=maxAttempts). Order: DB first, fallback second.
  await this.prisma.factura.update({
    where: { id: job.data.facturaId },
    data: { afipError: job.failedReason ?? 'Error desconocido al emitir.' },
  });
  if (job.attemptsMade >= maxAttempts) {
    this.logger.warn(
      `Max retries reached for facturaId ${job.data.facturaId} — attempting CAEA fallback`,
    );
    await this.caeaService.asignarCaeaFallback(job.data.facturaId, job.data.profesionalId);
  }
}
```

### Corrected modal condition (frontend)
```tsx
// Source: audit v1.2 gap closure spec
{factura?.afipError && (
  factura.estado === EstadoFactura.EMISION_PENDIENTE ||
  factura.estado === EstadoFactura.CAEA_PENDIENTE_INFORMAR
) && (
  <>
    <Separator />
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg mx-6 mb-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-700">Error de emisión AFIP</p>
          <p className="text-sm text-red-600 mt-1">{factura.afipError}</p>
        </div>
      </div>
    </div>
  </>
)}
```

---

## State of the Art

| Old Behavior | Fixed Behavior | Changed In | Impact |
|--------------|----------------|------------|--------|
| `afipError` only persisted when `attemptsMade >= maxAttempts` | `afipError` persisted unconditionally in `onFailed` | Phase 18 BUG-1 | UnrecoverableError (business rejection) path now shows error to Facturador |
| Modal condition `estado === EMISION_PENDIENTE` | Modal condition `estado === EMISION_PENDIENTE OR CAEA_PENDIENTE_INFORMAR` | Phase 18 BUG-2 | Transient-exhaustion path now shows error to Facturador |

---

## Plan Structure Recommendation

Phase 18 fits cleanly into 2 plans:

**Plan 01 (TDD RED — Wave 0):** Add Test 9 to `cae-emission.processor.spec.ts` — the UnrecoverableError afipError-persist path. Run tests to confirm RED. This is the only Wave 0 gap.

**Plan 02 (GREEN + frontend — Wave 1):** Apply BUG-1 fix (move `prisma.factura.update` outside guard), confirm Test 9 GREEN + all existing tests still pass. Apply BUG-2 fix (expand modal condition). Frontend build check. Human verify checkpoint: manually set `afipError` on a test factura with `estado=CAEA_PENDIENTE_INFORMAR` and confirm the red error panel renders.

Alternatively, both fixes can ship in a single plan since they are independent one-line changes with no risk of interaction. The planner can decide based on whether the TDD discipline (separate Wave 0) is preferred over the minimal-plan approach.

---

## Open Questions

1. **Does BullMQ call `onFailed` for `UnrecoverableError` before or after retrying?**
   - What we know: The audit document states `attemptsMade = 1` for `UnrecoverableError`. BullMQ source confirms `UnrecoverableError` skips the retry queue and goes directly to the failed set.
   - What's unclear: Whether `onFailed` receives `attemptsMade = 0` or `1` (the attempt that triggered the UnrecoverableError). The existing Test 8 uses `attemptsMade: 3` (max reached) — Test 9 should use `attemptsMade: 1` per audit evidence.
   - Recommendation: Use `attemptsMade: 1` in Test 9. If tests reveal a different value, adjust — the fix logic (unconditional persist) is correct regardless of the exact `attemptsMade` value.

2. **Should `afipError` be cleared if a subsequent retry succeeds?**
   - What we know: Not in scope for Phase 18. The `process()` success path (`@OnWorkerEvent('completed')`) does not clear `afipError`. This is safe — a successfully emitted factura has `estado = EMITIDA` and `cae` set, so the modal error panel condition (`!factura.cae`) would hide the Emitir button entirely.
   - Recommendation: Defer. Not needed for CAE-03 closure.

---

## Sources

### Primary (HIGH confidence)
- `/Users/laucaballero/Desktop/Lautaro/AndesCode/CLINICAL/.planning/v1.2-MILESTONE-AUDIT.md` — exact bug descriptions, fix specifications, file/line references (direct code read verified)
- `/Users/laucaballero/Desktop/Lautaro/AndesCode/CLINICAL/backend/src/modules/finanzas/processors/cae-emission.processor.ts` — current buggy implementation confirmed by direct read
- `/Users/laucaballero/Desktop/Lautaro/AndesCode/CLINICAL/frontend/src/app/dashboard/finanzas/facturacion/components/FacturaDetailModal.tsx` — current buggy modal condition confirmed by direct read (line 270)
- `/Users/laucaballero/Desktop/Lautaro/AndesCode/CLINICAL/backend/src/modules/finanzas/processors/cae-emission.processor.spec.ts` — existing tests confirmed; Test 9 gap identified

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — Phase 17 ordering decision (prisma.update before asignarCaeaFallback) confirmed

### Tertiary
- None

---

## Metadata

**Confidence breakdown:**
- Bug identification: HIGH — both bugs confirmed by direct source read and audit document cross-reference
- Fix specification: HIGH — exact code from audit document, verified against current source
- Test architecture: HIGH — existing spec file read; Test 9 structure derived directly from existing Test 8 pattern
- BullMQ UnrecoverableError behavior: HIGH — consistent with audit evidence and BullMQ semantics

**Research date:** 2026-03-31
**Valid until:** Stable indefinitely — no external library changes affect this fix
