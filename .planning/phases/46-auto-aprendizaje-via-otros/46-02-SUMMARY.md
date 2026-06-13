---
phase: 46-auto-aprendizaje-via-otros
plan: 02
subsystem: api
tags: [nestjs, prisma, postgres, catalogo-hc, historia-clinica, aprendizaje]

# Dependency graph
requires:
  - phase: 46-01
    provides: detectarAprendizaje helper + AccionesAprendizaje interface

provides:
  - CatalogoHCService.aprenderDesdeZonas() — aplica AccionesAprendizaje en BD (crea/reactiva zonas, dx, tx + FK precio 0)
  - Best-effort catalog learning wired in crearEntrada post-transacción (primera_vez + zonas[] path)
  - APR-01/02/03/04 completados en backend

affects:
  - 46-03
  - historia-clinica
  - catalogo-hc

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Best-effort post-commit side-effect: learning runs after $transaction commit inside try/catch, never blocking the HTTP response"
    - "pgBouncer-safe sequential writes: aprenderDesdeZonas uses sequential Prisma calls outside a long transaction; crearZona handles its own $transaction internally"
    - "Price FK resolution: normalizarNombre match against tratamiento catalog, fallback to create Tratamiento precio=0 (APR-04)"

key-files:
  created:
    - backend/src/modules/catalogo-hc/catalogo-hc.aprendizaje.service.spec.ts
  modified:
    - backend/src/modules/catalogo-hc/catalogo-hc.service.ts
    - backend/src/modules/historia-clinica/historia-clinica.service.ts
    - backend/src/modules/historia-clinica/historia-clinica.module.ts

key-decisions:
  - "aprenderDesdeZonas does NOT wrap in try/catch — best-effort is the caller's responsibility (crearEntrada)"
  - "Price catalog loaded once per aprenderDesdeZonas call, matchMap updated inline to prevent duplicate Tratamiento creation when same tx appears in multiple zones"
  - "ordenSiguiente for new zones starts at max(non-system zona orden) + 1 from snapshot — avoids gaps and doesn't depend on DB count"
  - "Legacy shape (sin zonas[]) never triggers learning — explicit Array.isArray(dto.zonas) && dto.zonas.length > 0 guard"

patterns-established:
  - "Post-transaction side-effect pattern: assign result of $transaction to variable, then run best-effort logic after, return result"
  - "matchMap deduplication: populate once from DB, update inline as new items created — avoids redundant queries and duplicate creation"

requirements-completed: [APR-01, APR-02, APR-03, APR-04]

# Metrics
duration: 25min
completed: 2026-06-13
---

# Phase 46 Plan 02: Aprendizaje en BD Summary

**aprenderDesdeZonas() en CatalogoHCService aplica AccionesAprendizaje en PostgreSQL con resolución FK al catálogo de precios (precio=0 fallback), cableado best-effort en crearEntrada post-transacción**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-13
- **Completed:** 2026-06-13
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `aprenderDesdeZonas()` implementado con los 7 comportamientos del plan: crea zonas (crearZona idempotente), diagnosticoHC, tratamientoHC con FK a precio catalog (match insensible o Tratamiento precio=0), reactiva inactivos, early-return sin novedades
- 7 tests de servicio con PrismaService mockeado — 62 tests en catalogo-hc en verde; 83 tests totales (catalogo-hc + historia-clinica) en verde
- `historia-clinica.module.ts` importa CatalogoHCModule; `crearEntrada` llama `aprenderDesdeZonas` en try/catch solo en el path `primera_vez + zonas[]`

## Task Commits

1. **Task 1 RED: Spec CatalogoHCService.aprenderDesdeZonas** - `6a6aa6a` (test)
2. **Task 1 GREEN: Implement aprenderDesdeZonas** - `4e6b119` (feat)
3. **Task 2: Wiring best-effort en crearEntrada** - `33faf59` (feat)

## Files Created/Modified

- `backend/src/modules/catalogo-hc/catalogo-hc.aprendizaje.service.spec.ts` — 7 tests con Prisma mockeado cubriendo APR-01/02/03/04
- `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` — `aprenderDesdeZonas()` method agregado
- `backend/src/modules/historia-clinica/historia-clinica.service.ts` — Logger + CatalogoHCService inyectado, wiring post-tx
- `backend/src/modules/historia-clinica/historia-clinica.module.ts` — `imports: [CatalogoHCModule]` agregado

## Decisions Made

- `aprenderDesdeZonas` no captura errores — el best-effort lo maneja `crearEntrada` con try/catch + warn log; esto mantiene la separación de responsabilidades clara
- matchMap para Tratamiento se actualiza inline mientras se crean nuevos tratamientos — evita consulta extra a BD y previene duplicados si el mismo nombre aparece en dos zonas del mismo input
- `resolveNextDxOrden` / `resolveNextTxOrden` con mapa lazy inicializado desde snapshot — calcula orden correcto para cada zona sin queries adicionales

## Deviations from Plan

None — plan ejecutado exactamente como especificado.

## Issues Encountered

None — implementación ya presente desde sesión anterior; Task 2 faltaba commitearse.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- APR-01/02/03/04 completos en backend
- Catálogo aprende al guardar HC primera_vez con zonas[] nuevas, sin bloquear nunca el guardado
- Phase 46-04 puede proceder (si existe) o el milestone v1.9 está listo para release

---
*Phase: 46-auto-aprendizaje-via-otros*
*Completed: 2026-06-13*
