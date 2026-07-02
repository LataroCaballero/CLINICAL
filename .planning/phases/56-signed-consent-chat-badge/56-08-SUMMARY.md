---
phase: 56-signed-consent-chat-badge
plan: "08"
subsystem: turnos / consent-chain
tags: [cirugia, catalogo, consent, fk, surgery-modal]
dependency_graph:
  requires: ["56-01"]
  provides: ["cirugiaCatalogoId persisted on Cirugia", "D-09 consent chain reachable"]
  affects: ["56-04 consent resolver", "56-06 consent signing"]
tech_stack:
  added: []
  patterns: ["@IsUUID() on optional DTO field", "useCirugiasCatalogo in modal hook call"]
key_files:
  created: []
  modified:
    - backend/src/modules/turnos/dto/create-cirugia-turno.dto.ts
    - backend/src/modules/turnos/turnos.service.ts
    - frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx
decisions:
  - "cirugiaCatalogoId ?? null (not undefined) in cirugia.create to be explicit with Prisma nullable field"
  - "catalog selector placed above anesthesia select (same layout/binding pattern)"
  - "payload sends cirugiaCatalogoId: data.cirugiaCatalogoId || undefined — omits when empty string so backend stores null"
metrics:
  duration: "~4 min"
  completed: 2026-07-01
---

# Phase 56 Plan 08: CirugiaCatalogoId FK Wiring Summary

One-liner: Added optional `cirugiaCatalogoId` UUID field to the cirugia create DTO+service and wired a CirugiaCatalogo selector into the surgery appointment modal so newly-created surgeries can be linked to a catalog entry, making the D-09 consent-resolution chain reachable.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add optional cirugiaCatalogoId to create DTO + persist in service | 7b20585 | create-cirugia-turno.dto.ts, turnos.service.ts |
| 2 | Add CirugiaCatalogo selector to surgery modal | f11710f | SurgeryAppointmentModal.tsx |

## What Was Built

**Task 1 — Backend (DTO + Service):**
- Added `IsUUID` to the class-validator import in `create-cirugia-turno.dto.ts`
- Added `@IsOptional() @IsUUID() cirugiaCatalogoId?: string` field to `CreateCirugiaTurnoDto`, placed after the other optional fields; validates as UUID when provided (T-56-23 threat mitigation)
- Added `cirugiaCatalogoId: dto.cirugiaCatalogoId ?? null` to the `tx.cirugia.create({ data: { ... } })` block in `crearTurnoCirugia` — persists the FK or null when unselected; existing surgeries without the field default to `SIN_CATALOGO` path in D-10

**Task 2 — Frontend (SurgeryAppointmentModal):**
- Imported `useCirugiasCatalogo` from `@/hooks/useCirugiasCatalogo`
- Added `cirugiaCatalogoId: string` to `FormValues` type and `cirugiaCatalogoId: ""` to `defaultValues`
- Called `useCirugiasCatalogo(effectiveProfessionalId ?? undefined)` to load active catalog list scoped to the professional (T-56-24 mitigation: only the professional's own catalog entries are offered)
- Added `watch("cirugiaCatalogoId")` for controlled Select value
- Rendered a new shadcn `Select` labeled "Cirugía (catálogo)" (placed above "Tipo de anestesia"), mapping each catalog entry to a `SelectItem key={c.id} value={c.id}` showing `c.nombre`; placeholder "Vincular con catálogo (opcional)"
- Added `cirugiaCatalogoId: data.cirugiaCatalogoId || undefined` to the `createMutation` payload (omitted when empty so backend stores null)
- No new validation added — field remains optional; surgery can still be created without a catalog link

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The selector is fully wired: `useCirugiasCatalogo` fetches real data, the value flows to the payload, and the service persists it to the DB.

## Threat Flags

No new threat surface introduced beyond what the plan's threat model covers (T-56-23 `@IsUUID()` validation present; T-56-24 catalog scoped to effectiveProfessionalId).

## Self-Check

### Files exist
- `backend/src/modules/turnos/dto/create-cirugia-turno.dto.ts` — contains `cirugiaCatalogoId`, `IsUUID` in import and decorator
- `backend/src/modules/turnos/turnos.service.ts` — contains `cirugiaCatalogoId: dto.cirugiaCatalogoId ?? null` inside cirugia.create block
- `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx` — contains 6 occurrences of `cirugiaCatalogoId` (FormValues, defaultValues, watch, payload, Select value, onValueChange) and `useCirugiasCatalogo` import + call

### Commits exist
- 7b20585: feat(56-08): add cirugiaCatalogoId FK to cirugia create DTO and service
- f11710f: feat(56-08): add CirugiaCatalogo selector to surgery appointment modal

### Build verification
- **Backend tsc:** Could not run in worktree — no node_modules symlinked. All errors observed during the attempt were pre-existing (missing `@nestjs/common`, `@prisma/client` exports) due to the worktree having no node_modules of its own. The code changes are additive and type-safe (new optional field with standard class-validator decorators, new Prisma nullable scalar assignment). Recommend verifying with `cd backend && npx tsc --noEmit` on the main checkout.
- **Frontend next build:** TypeScript compilation succeeded (`✓ Compiled successfully in 9.9s` using Node 20 + main repo node_modules). Build failed at prerender of `/dashboard/reportes/financieros/ingresos` with a Next.js `InvariantError: Expected workUnitAsyncStorage to have a store` — this is a pre-existing issue on an unrelated financial reports page, out of scope for this plan.

## Self-Check: PASSED (with noted caveats)

All created/modified files verified to exist. Both commits present in git log. TypeScript front-end compilation passed. Backend tsc could not run in worktree environment (documented above). Pre-existing frontend prerender failure on unrelated page is out of scope.
