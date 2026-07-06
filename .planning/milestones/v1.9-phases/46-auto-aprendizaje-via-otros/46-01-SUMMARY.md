---
phase: 46-auto-aprendizaje-via-otros
plan: 01
subsystem: testing
tags: [catalogo-hc, helpers, pure-functions, tdd, aprendizaje, normalizacion]

requires:
  - phase: 44-schema-catalogo-en-bd
    provides: normalizarNombre function from catalogo-hc.seed-data.ts

provides:
  - formatearNombreAprendido pure function (trim + capitalize first char, accent-safe)
  - detectarAprendizaje pure engine computing zonasACrear/Reactivar, diagnosticosACrear/Reactivar, tratamientosACrear/Reactivar
  - SnapshotZona / AccionesAprendizaje / ZonaAprendizajeInput TypeScript interfaces ready for 46-02 to consume

affects:
  - 46-02 (consumes these interfaces and helpers to apply changes via Prisma)

tech-stack:
  added: []
  patterns:
    - Pure helper module alongside NestJS module (catalogo-hc.aprendizaje.helpers.ts) — no NestJS/Prisma deps, directly unit-testable
    - TDD RED-GREEN cycle with atomic commits per phase

key-files:
  created:
    - backend/src/modules/catalogo-hc/catalogo-hc.aprendizaje.helpers.ts
    - backend/src/modules/catalogo-hc/catalogo-hc.aprendizaje.helpers.spec.ts
  modified: []

key-decisions:
  - "formatearNombreAprendido uses spread-on-string to split on Unicode code points, making it accent-safe for e.g. 'á' → 'Á'"
  - "detectarAprendizaje processes zones in two phases: first zone-level decisions, then dx/tx per zone — ensures new-zone names are resolved before dx/tx reference them"
  - "Guard debeExcluir uses normalizarNombre so 'Otros'/'otros'/'OTROS' all resolve to 'otros' and are excluded"

patterns-established:
  - "Pure detection helpers: no NestJS/Prisma imports — I/O is plain TS interfaces, enabling deterministic unit tests"
  - "Two-phase accumulation: phase 1 builds zonaNewNombres map for new zones; phase 2 looks up that map when attaching dx/tx"

requirements-completed: [APR-01, APR-02, APR-03]

duration: 3min
completed: 2026-06-13
---

# Phase 46 Plan 01: Motor de detección de aprendizaje HC Summary

**Motor puro de detección de aprendizaje del catálogo HC con match insensible a tildes/mayúsculas, reactivación de inactivos, dedupe y exclusión de Otros/vacíos — 27 tests en verde, sin deps de NestJS/Prisma**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-13T01:16:10Z
- **Completed:** 2026-06-13T01:18:16Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments

- `formatearNombreAprendido`: trim + capitalización de la primera letra, safe con Unicode/acentos via spread-on-string
- `detectarAprendizaje`: motor puro que calcula exactamente qué crear o reactivar (APR-01/02/03)
- 27 tests unitarios cubriendo todos los casos del plan: match insensible, reactivación de inactivos, dedupe, exclusión de "Otros" y vacíos, zonas nuevas con dx/tx
- Build TypeScript limpio, 0 imports de @nestjs

## Task Commits

1. **RED: Spec completo (27 tests)** — `713f7c0` (test)
2. **GREEN: Implementación helper** — `bae3e78` (feat)

## Files Created/Modified

- `backend/src/modules/catalogo-hc/catalogo-hc.aprendizaje.helpers.ts` — Motor de detección puro: `formatearNombreAprendido`, `detectarAprendizaje`, interfaces `SnapshotZona`/`AccionesAprendizaje`/`ZonaAprendizajeInput`
- `backend/src/modules/catalogo-hc/catalogo-hc.aprendizaje.helpers.spec.ts` — Suite de 27 tests unitarios

## Decisions Made

- `formatearNombreAprendido` usa `[...str]` spread para partir en code points, necesario para tildes iniciales (ej: `'á'` → `'Á'`). `str[0]` daría el byte incorrecto.
- `detectarAprendizaje` tiene dos fases: primero procesa todas las zonas (construye `zonaNewNombres` map), luego procesa dx/tx por zona. Esto garantiza que dx/tx de una zona nueva siempre encuentren el nombre formateado correcto.
- Guard `debeExcluir` usa `normalizarNombre` internamente, por lo que `'Otros'`, `'OTROS'`, `'  otros  '` quedan todos excluidos con una sola condición.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Interfaces `SnapshotZona` y `AccionesAprendizaje` listas para que 46-02 las importe y aplique con Prisma
- `detectarAprendizaje` acepta el snapshot que el service debe cargar de BD (ZonaHC + DiagnosticoHC + TratamientoHC incluyendo inactivos)
- Ningún bloqueador

---
*Phase: 46-auto-aprendizaje-via-otros*
*Completed: 2026-06-13*
