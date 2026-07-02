---
phase: 43-archivar-embudo-crm
plan: "01"
subsystem: api
tags: [prisma, nestjs, crm, kanban, patients, postgresql]

requires:
  - phase: 42-estado-dual-y-tratamientostab
    provides: getKanban and getListaAccion service methods with flujo-based filtering

provides:
  - crmArchivado Boolean field on Paciente model with Prisma migration
  - PATCH /pacientes/:id/crm-archivo endpoint (toggle archivar/desarchivar)
  - getKanban excludes crmArchivado=true patients automatically
  - getListaAccion excludes crmArchivado=true patients automatically

affects:
  - frontend CRM kanban (patients archived server-side disappear from kanban)
  - frontend lista de accion (archived patients excluded from daily action list)
  - any future phase reading CRM patient lists

tech-stack:
  added: []
  patterns:
    - "Toggle endpoint pattern: @Patch(':id/crm-archivo') accepting {archivado:boolean} — same as whatsapp-opt-in"
    - "crmArchivado: false added as top-level WHERE prop (AND implicit) alongside profesionalId, outside OR array"

key-files:
  created:
    - backend/src/prisma/migrations/20260609000000_add_crm_archivado/migration.sql
    - backend/src/modules/pacientes/dto/update-crm-archivo.dto.ts
  modified:
    - backend/src/prisma/schema.prisma
    - backend/src/modules/pacientes/pacientes.service.ts
    - backend/src/modules/pacientes/pacientes.controller.ts

key-decisions:
  - "No new @@index added for crmArchivado — filter always accompanies profesionalId which is already indexed"
  - "findAll/findOne NOT filtered — archived patients remain accessible in general patient view (ARCH-04)"
  - "Manual migration created (no prisma migrate dev) — follows repo pattern for offline migration files"

patterns-established:
  - "Boolean toggle endpoints: DTO with @IsBoolean(), service with findUnique guard + update + select, @Patch controller route"

requirements-completed: [ARCH-01, ARCH-02, ARCH-03]

duration: 8min
completed: "2026-06-09"
---

# Phase 43 Plan 01: Backend CRM Archivo Summary

**crmArchivado Boolean toggle on Paciente — PATCH endpoint + automatic kanban/lista-accion exclusion via Prisma WHERE filter**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-09T02:38:47Z
- **Completed:** 2026-06-09T02:46:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Added `crmArchivado Boolean @default(false)` to Prisma Paciente model with manual migration SQL
- Exposed `PATCH /pacientes/:id/crm-archivo` accepting `{archivado:boolean}` for toggle (archivar/desarchivar)
- getKanban and getListaAccion now filter `crmArchivado: false` at top-level WHERE — archived patients excluded automatically without any frontend changes

## Task Commits

1. **Task 1: Agregar campo crmArchivado al schema y crear migración manual** - `8244b76` (feat)
2. **Task 2: Crear DTO, endpoint PATCH crm-archivo y método de service** - `467b9f8` (feat)
3. **Task 3: Excluir pacientes archivados en getKanban y getListaAccion** - `4d73041` (feat)

## Files Created/Modified
- `backend/src/prisma/schema.prisma` - Added `crmArchivado Boolean @default(false)` alongside enListaEspera
- `backend/src/prisma/migrations/20260609000000_add_crm_archivado/migration.sql` - ALTER TABLE ADD COLUMN migration
- `backend/src/modules/pacientes/dto/update-crm-archivo.dto.ts` - DTO with `@IsBoolean() archivado: boolean`
- `backend/src/modules/pacientes/pacientes.service.ts` - updateCrmArchivo method + crmArchivado: false in getKanban and getListaAccion WHERE
- `backend/src/modules/pacientes/pacientes.controller.ts` - `@Patch(':id/crm-archivo')` route with UpdateCrmArchivoDto import

## Decisions Made
- No new @@index on crmArchivado — query always includes profesionalId (already indexed), per plan guidance
- findAll/findOne remain unfiltered so archived patients stay accessible in the general patients section (ARCH-04 requirement)
- Manual migration file created without running `prisma migrate dev` — consistent with repo pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. The Prisma migration SQL needs to be applied to the production database via the standard deployment process.

## Next Phase Readiness
- Backend ARCH-01/02/03 complete — frontend can now call `PATCH /pacientes/:id/crm-archivo` with `{archivado:true/false}`
- No blockers for Phase 43 frontend plan (if any)
- Migration `20260609000000_add_crm_archivado` must be applied to DB before deploying

---
*Phase: 43-archivar-embudo-crm*
*Completed: 2026-06-09*
