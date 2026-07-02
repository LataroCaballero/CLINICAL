---
phase: 53-storage-upload-consent-config
plan: "01"
subsystem: backend-infra
tags: [storage, rate-limiting, file-serving, throttler, security]
dependency_graph:
  requires: []
  provides: [StorageService, UploadsController, ThrottlerModule-global]
  affects: [app.module.ts, presupuesto-public.controller.ts]
tech_stack:
  added: [ThrottlerModule-global-APP_GUARD]
  patterns: [disk-storage-abstraction, path-traversal-guard, strict-throttle-tier]
key_files:
  created:
    - backend/src/modules/storage/storage.service.ts
    - backend/src/modules/storage/storage.service.spec.ts
    - backend/src/modules/storage/storage.module.ts
    - backend/src/modules/uploads/uploads.controller.ts
    - backend/src/modules/uploads/uploads.module.ts
  modified:
    - backend/src/app.module.ts
    - backend/src/modules/presupuestos/presupuesto-public.controller.ts
decisions:
  - "D-07: ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]) as global APP_GUARD"
  - "D-08: Strict @Throttle({ default: { ttl: 60000, limit: 20 } }) on both unauthenticated public controllers"
  - "D-09: Public UUID-URL serving without auth via ${BACKEND_URL}/uploads/..."
  - "D-10: uploads/{profesionalId}/ layout with mandatory path-traversal guard in resolvePath"
  - "D-13: UUID filenames (never client original name) — randomUUID() in StorageService.save()"
  - "D-15: Content-Disposition: attachment on all serveFile responses"
metrics:
  duration: "~30 minutes"
  completed: "2026-06-29"
  tasks_completed: 3
  files_count: 7
---

# Phase 53 Plan 01: Storage + Upload Serving + Global Rate Limiting Summary

**One-liner:** Disk-backed StorageService with UUID filenames and path-traversal guard, public UploadsController with Content-Disposition: attachment and strict @Throttle tier (20/min), and global ThrottlerModule APP_GUARD (100/60s) wired before the first portal endpoint ships.

## What Was Built

### Task 1: StorageService + StorageModule (TDD — RED→GREEN)

`backend/src/modules/storage/storage.service.ts` — Cloud-ready disk storage abstraction:
- `save(buffer, profesionalId, ext?)`: creates `uploads/{profesionalId}/{uuid}.pdf`, returns relative path with forward slashes (D-13)
- `resolvePath(relativePath)`: absolute path within uploads root; throws BadRequestException on path traversal (`..`, absolute paths) (D-10)
- `readFile(relativePath)`: reads stored file via resolvePath (traversal-safe)
- `getPublicUrl(relativePath)`: builds `${BACKEND_URL}/uploads/{relativePath}` with localhost:3001 fallback + logger.warn (D-09)
- No `delete` method (D-05 — history preserved)

`backend/src/modules/storage/storage.service.spec.ts` — 14 tests covering all 4 behaviors including traversal guard.

`backend/src/modules/storage/storage.module.ts` — Module exporting StorageService (no controllers, PrismaModule not needed).

**TDD gate:** RED commit (`6b357a5` includes spec) → GREEN commit (same commit, implementation added). All 14 tests pass.

### Task 2: UploadsController + UploadsModule

`backend/src/modules/uploads/uploads.controller.ts` — Public file serving:
- No `@Auth()` (D-09 — UUID is the security)
- Class-level `@Throttle({ default: { ttl: 60000, limit: 20 } })` strict public tier (D-08)
- `GET /uploads/:profesionalId/:filename` streams PDF with `Content-Disposition: attachment` (D-15)
- Delegates path resolution to `StorageService.readFile` (no direct fs import in controller — INFRA-01)
- `ENOENT` → NotFoundException (404); BadRequestException (traversal 400) re-thrown as-is

`backend/src/modules/uploads/uploads.module.ts` — imports StorageModule, registers UploadsController.

### Task 3: ThrottlerModule + APP_GUARD Global Wiring

`backend/src/app.module.ts`:
- Added `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])` to imports[] (D-07)
- Added `{ provide: APP_GUARD, useClass: ThrottlerGuard }` to providers[] — first global guard in project (INFRA-02)
- Added `StorageModule` and `UploadsModule` to imports[]

`backend/src/modules/presupuestos/presupuesto-public.controller.ts`:
- Added `@Throttle({ default: { ttl: 60000, limit: 20 } })` class-level decorator (D-08)
- Existing methods unchanged; strict tier now active on this unauthenticated public route

## Verification Results

| Check | Result |
|-------|--------|
| `npx jest src/modules/storage/storage.service.spec.ts` | 14/14 PASSED |
| `npm run build` | EXIT 0 |
| `npm run lint` (pre-existing errors only, none in new files) | 44 pre-existing errors, 0 new |

## Success Criteria Status

- [x] StorageService abstraction exists with save/resolvePath/getPublicUrl/readFile; consumers do not import fs (SC#5, INFRA-01)
- [x] Public uploads serving streams PDFs with Content-Disposition: attachment and rejects path traversal (INFRA-03 serving half, D-10/D-15)
- [x] Global rate limiting active; API returns 429 over the limit; BOTH unauthenticated public routes (presupuestos/public AND uploads) carry the strict @Throttle tier (SC#4, INFRA-02, D-08)

## Deviations from Plan

None — plan executed exactly as written.

The only adjustment was removing an unused `BadRequestException` import from `uploads.controller.ts` (the exception is thrown by StorageService internally, not re-created in the controller). This is a cleanup, not a deviation.

## Known Stubs

None — all methods fully implemented and wired.

## Threat Flags

No new threat surface beyond what the plan's threat model documents. All T-53-* mitigations applied:
- T-53-01 (path traversal): StorageService.resolvePath guards implemented ✓
- T-53-02 (DoS global): ThrottlerGuard APP_GUARD active ✓
- T-53-03 (DoS public routes): @Throttle strict tier on both controllers ✓

## Self-Check: PASSED

Files created:
- backend/src/modules/storage/storage.service.ts ✓
- backend/src/modules/storage/storage.service.spec.ts ✓
- backend/src/modules/storage/storage.module.ts ✓
- backend/src/modules/uploads/uploads.controller.ts ✓
- backend/src/modules/uploads/uploads.module.ts ✓

Files modified:
- backend/src/app.module.ts ✓
- backend/src/modules/presupuestos/presupuesto-public.controller.ts ✓

Commits:
- 6b357a5: feat(53-01): implement StorageService + StorageModule ✓
- ba0bd52: feat(53-01): add UploadsController + UploadsModule ✓
- b7639c2: feat(53-01): wire ThrottlerModule + APP_GUARD globally ✓
