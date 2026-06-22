---
phase: 48-backend-lectura-y-snapshot-de-tratamientos
plan: 02
subsystem: api
tags: [nestjs, prisma, historia-clinica, snapshot, tratamientos, pgbouncer]

# Dependency graph
requires:
  - phase: 48-backend-lectura-y-snapshot-de-tratamientos (48-01)
    provides: read-path por-turno que lee contenido.tratamientos para poblar la columna "Último tratamiento"
provides:
  - "crearEntrada persiste contenido.tratamientos (snapshot) siempre que se pasen tratamientoIds, independiente de consumirInsumos (fix LIVHC-05 / TRAT-03)"
  - "Separación de responsabilidades: snapshot incondicional vs. agregación de insumos + OrdenConsumo condicionada a consumirInsumos"
affects: [49-frontend-planilla, TratamientosTab]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-fetch incondicional del snapshot fuera de $transaction (patrón pgBouncer preservado)"
    - "Guard de efecto separado del guard de datos: el findMany corre por tratamientoIds; la agregación de insumos corre por consumirInsumos"

key-files:
  created: []
  modified:
    - backend/src/modules/historia-clinica/historia-clinica.service.ts

key-decisions:
  - "Cambiar la condición del fetch de tratamientos de (consumirInsumos && tratamientoIds) a solo (tratamientoIds) para que el snapshot se calcule siempre"
  - "Envolver la agregación de insumos en if (dto.consumirInsumos); insumosAgregados queda [] cuando es false, por lo que la OrdenConsumo no se crea (guard intacto)"

patterns-established:
  - "Snapshot de contenido y consumo de insumos son responsabilidades independientes en crearEntrada"

requirements-completed: [TRAT-03]

# Metrics
duration: 2min
completed: 2026-06-22
---

# Phase 48 Plan 02: Backend — Snapshot de Tratamientos Incondicional Summary

**`crearEntrada` ahora persiste `contenido.tratamientos` (snapshot) en toda HC `tratamiento_en_consultorio` con `tratamientoIds`, aun con `consumirInsumos=false`, mientras la `OrdenConsumo` sigue condicionada al consumo (fix LIVHC-05 / TRAT-03).**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-22T01:34:01Z
- **Completed:** 2026-06-22T01:35:18Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- El bloque pre-fetch de `crearEntrada` se refactorizó para separar "poblar el snapshot del contenido" (siempre) de "agregar insumos para la OrdenConsumo" (condicional a `consumirInsumos`).
- `contenido.tratamientos = tratamientosSnapshot` ahora se ejecuta para `tratamiento_en_consultorio` sin importar `consumirInsumos` → la columna "Último tratamiento" se puebla combinada con el read-path por-turno de 48-01.
- Sin regresión de stock: el guard `if (dto.consumirInsumos && insumosAgregados.length > 0)` de la `OrdenConsumo` quedó intacto; con `consumirInsumos=false`, `insumosAgregados` queda `[]` y la orden no se crea.
- Patrón pgBouncer preservado: el `findMany` de tratamientos sigue fuera de la `$transaction`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Snapshot de tratamientos incondicional en crearEntrada** - `c4662c4` (fix)

**Plan metadata:** (final docs commit)

## Files Created/Modified
- `backend/src/modules/historia-clinica/historia-clinica.service.ts` - Snapshot de tratamientos calculado/escrito siempre que haya `tratamientoIds`; agregación de insumos envuelta en `if (dto.consumirInsumos)`; `findMany` fuera de la transacción.

## Decisions Made
- Condición del fetch cambiada de `(consumirInsumos && tratamientoIds)` a solo `(tratamientoIds)` para calcular el snapshot siempre.
- Agregación de insumos (`insumosMap` → `insumosAgregados`) envuelta en `if (dto.consumirInsumos)`. Como queda `[]` cuando es false, el guard existente de la `OrdenConsumo` no requiere cambios — comportamiento de stock preservado.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- **Verificación tsc:** `npx tsc --noEmit -p tsconfig.json` falla con TS6059 (`test/app.e2e-spec.ts` no bajo `rootDir`). Es un problema de configuración pre-existente de `tsconfig.json` (sin `include`), no relacionado con el cambio. La compilación real usa `tsconfig.build.json`, que pasa limpio (exit 0). Registrado en `deferred-items.md`.
- **Verificación lint:** ESLint reporta 3 errores en el archivo, todos pre-existentes (confirmado vía `git stash`: existen idénticos en el archivo original, solo con números de línea desplazados) y fuera del bloque editado (línea 3 `Prisma` sin usar; `aprenderDesdeZonas` ~línea 315/322 formato prettier). El bloque editado introduce cero errores nuevos. Out of scope — registrado en `deferred-items.md`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Write-path corregido. Combinado con el read-path por-turno de 48-01, toda entrada nueva de tratamiento puebla la columna "Último tratamiento".
- Política sin-backfill respetada: solo entradas nuevas se corrigen; entradas legacy intactas.
- Phase 49 (frontend TratamientosTab) puede consumir el read-path con datos correctos para entradas nuevas.

## Self-Check: PASSED

- FOUND: backend/src/modules/historia-clinica/historia-clinica.service.ts
- FOUND: .planning/phases/48-backend-lectura-y-snapshot-de-tratamientos/48-02-SUMMARY.md
- FOUND: commit c4662c4

---
*Phase: 48-backend-lectura-y-snapshot-de-tratamientos*
*Completed: 2026-06-22*
