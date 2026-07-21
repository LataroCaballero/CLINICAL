---
phase: 62-portal-staff-frontend-gate-de-firma-secciones-separadas-y-si
plan: 03
subsystem: crm
tags: [nestjs, prisma, react, tanstack-query, next.js]

# Dependency graph
requires:
  - phase: 61-backend-schema-decoupling-e-indicaciones
    provides: "Paciente.indicacionesLeidasAt migrado (schema) + computePasosCrm derivando pasos.indicacionesPreop del perfil"
provides:
  - "getKanban expone indicacionesLeidasAt en el payload del board (display-only)"
  - "KanbanPatient tipado con indicacionesLeidasAt: string | null"
  - "EtapaStepper renderiza fecha de lectura (es-AR) en el sub-indicador Indicaciones preop"
  - "useCRMKanban con refetchOnWindowFocus:true + staleTime:0 (cierra deuda W-1)"
affects: [crm, kanban-board, etapa-stepper]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Display-only field threaded through .map sibling (backend) -> type (frontend) -> prop (component), sin tocar la lógica de derivación de pasos"

key-files:
  created: []
  modified:
    - backend/src/modules/pacientes/pacientes.service.ts
    - frontend/src/hooks/useCRMKanban.ts
    - frontend/src/components/crm/EtapaStepper.tsx
    - frontend/src/components/crm/CardActionsSheet.tsx

key-decisions:
  - "staleTime bajado a 0 (extremo del rango D-10 0-5000) — freshness sobre volumen de requests, cierre W-1"
  - "indicacionesLeidasAt viaja sólo para display; el coloreo verde/naranja del dot sigue gobernado por pasos.indicacionesPreop (computePasosCrm), sin cambio de derivación"

patterns-established:
  - "Campo display-only threaded end-to-end sin alterar lógica de negocio existente (D-08/D-09)"

requirements-completed: [INDIC-05, EMBUDO-06]

# Metrics
duration: 6min
completed: 2026-07-21
---

# Phase 62 Plan 03: Fecha de lectura de indicaciones en el stepper + board sync Summary

**El staff ve la fecha en que el paciente leyó las indicaciones preoperatorias directamente en el stepper del sheet, y el board CRM se mantiene fresco sin recarga manual (refetch on window focus), cerrando la deuda W-1 de v1.13.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-21T15:29:00Z (approx)
- **Completed:** 2026-07-21T15:35:19Z
- **Tasks:** 2/2 completed
- **Files modified:** 4

## Accomplishments
- `getKanban` (backend) expone `indicacionesLeidasAt` en el objeto de respuesta del `.map`, sin tocar el `select` (ya lo traía desde Phase 61) ni `computePasosCrm`.
- `KanbanPatient` (frontend) tipa el nuevo campo como `string | null`, documentado como display-only.
- `useCRMKanban` activa `refetchOnWindowFocus: true` y baja `staleTime` de `30_000` a `0`, cerrando la deuda W-1 (board se sincroniza sin recarga manual al volver el foco a la pestaña), preservando `queryKey: ["crm-kanban", profesionalId]` intacto.
- `EtapaStepper` renderiza " · leídas DD/MM/AAAA" (formato es-AR) junto al sub-indicador "Indicaciones preop" cuando `indicacionesLeidasAt` no es null, sin modificar el coloreo verde/naranja del dot (sigue gobernado por `pasos.indicacionesPreop`).
- `CardActionsSheet` threadea `patient.indicacionesLeidasAt` a `EtapaStepper`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Exponer indicacionesLeidasAt (backend getKanban + tipo KanbanPatient) y activar board sync** - `d522b70` (feat)
2. **Task 2: Threadear indicacionesLeidasAt y renderizar la fecha en el sub-indicador (CardActionsSheet + EtapaStepper)** - `975698b` (feat)

_Note: no TDD tasks in this plan (tdd="false" on both)._

## Files Created/Modified
- `backend/src/modules/pacientes/pacientes.service.ts` - `getKanban` `.map` agrega `indicacionesLeidasAt: p.indicacionesLeidasAt` como sibling de `flujo`
- `frontend/src/hooks/useCRMKanban.ts` - `KanbanPatient.indicacionesLeidasAt: string | null`; `useQuery` con `staleTime: 0` + `refetchOnWindowFocus: true`
- `frontend/src/components/crm/EtapaStepper.tsx` - `EtapaStepperProps.indicacionesLeidasAt?: string | null`; render de fecha en sub-indicador "Indicaciones preop"
- `frontend/src/components/crm/CardActionsSheet.tsx` - pasa `indicacionesLeidasAt={patient.indicacionesLeidasAt}` a `EtapaStepper`

## Decisions Made
- `staleTime: 0` elegido (extremo bajo del rango D-10 0–5000) para priorizar freshness del board sobre volumen de requests; consistente con el cierre de deuda W-1.
- Ningún cambio a `computePasosCrm` ni a la derivación de `pasos.indicacionesPreop` — el nuevo campo es puramente informativo para el staff.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `frontend/npm run build` falla bajo Node 18.20.8 (requiere Node >=20.9.0) por incompatibilidad de Next.js 16, no relacionado con este cambio. Se usó `nvm use 20` para correr el build de verificación (exitoso, exit 0). No se modificó el entorno del proyecto — deuda de infraestructura pre-existente, no introducida por este plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
INDIC-05 y EMBUDO-06 completados. El milestone v1.14 (Portal — Firma Gated e Indicaciones Separadas) queda con los 3 planes de Phase 62 ejecutados (62-01, 62-02 pendiente de verificar en STATE.md, 62-03 completo). UAT manual pendiente (ver `<verification>` del plan): abrir sheet de paciente con indicaciones leídas y confirmar fecha visible; acusar desde portal y confirmar refresh sin recarga manual del board.

---
*Phase: 62-portal-staff-frontend-gate-de-firma-secciones-separadas-y-si*
*Completed: 2026-07-21*
