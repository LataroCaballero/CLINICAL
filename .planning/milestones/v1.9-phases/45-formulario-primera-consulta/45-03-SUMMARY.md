---
phase: 45-formulario-primera-consulta
plan: "03"
subsystem: ui
tags: [react, typescript, historia-clinica, dual-shape, zona, historial, cleanup]

# Dependency graph
requires:
  - phase: 45-01
    provides: construirContenidoPrimeraVez — zonas[] JSONB shape persisted in DB
  - phase: 45-02
    provides: PrimeraConsultaForm rediseñado zona-céntrico; zonas[] enviado al backend
provides:
  - Render dual-shape en HistorialClinicoPanel, PatientDrawer/HistoriaClinica y TurnoHCModal
  - Entradas nuevas (v1.9+) agrupadas por zona con badge de zona + diagnósticos + tratamientos
  - Entradas legacy siguen renderizando idéntico a antes del cambio
  - zonas-diagnostico.{ts,json} eliminados — catálogo BD es la única fuente
affects: [historia-clinica, live-turno, patient-drawer, agenda]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-shape branch pattern: Array.isArray(c.zonas) antes del branch legacy — 3 lectores con misma estrategia"
    - "ZonaContenido tipo local en cada componente lector — sin acoplamiento a tipos del form"
    - "git rm para eliminar archivos que ya no tienen consumidores antes del build final"

key-files:
  created: []
  modified:
    - frontend/src/components/live-turno/tabs/hc/HistorialClinicoPanel.tsx
    - frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx
    - frontend/src/app/dashboard/components/TurnoHCModal.tsx
  deleted:
    - frontend/src/lib/zonas-diagnostico.ts
    - frontend/src/lib/zonas-diagnostico.json

key-decisions:
  - "Detección dual-shape via Array.isArray(contenido.zonas) — mismo patrón en los 3 lectores, sin ruptura de legacy"
  - "ZonaContenido definido localmente en cada componente lector (no compartido) — evita acoplamiento; los tipos son ligeros y equivalentes"
  - "Build de frontend falla por Node.js 18 vs requerimiento >=20.9.0 — pre-existente desde 45-02, no relacionado con este plan; tsc --noEmit pasa sin errores"

patterns-established:
  - "Dual-shape branch: siempre primero Array.isArray(zonas) para la forma nueva, else rama legacy sin tocarla"

requirements-completed: [FORM-02, FORM-03]

# Metrics
duration: 3min
completed: 2026-06-12
---

# Phase 45 Plan 03: Lectores de historial con render dual-shape y eliminación de zonas-diagnostico Summary

**Tres lectores de historial con branch dual-shape zonas[]/legacy, zonas-diagnostico hardcodeado eliminado, flujo completo verificado visualmente por el usuario en los 8 pasos**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-12T22:51:43Z
- **Completed:** 2026-06-12T23:00:00Z
- **Tasks:** 3/3 completadas
- **Files modified:** 3 modificados + 2 eliminados

## Accomplishments
- HistorialClinicoPanel: tipo ZonaContenido + branch Array.isArray(pvContenido.zonas) → fila por zona con badge de zona (secondary/semibold) + badges outline para diagnósticos + badges azules para tratamientos; legacy idéntico
- PatientDrawer/HistoriaClinica: ContenidoPrimeraVez extendida con zonas?: ZonaContenido[]; FreeEntryPreview genera texto "Abdomen: Diástasis, Abdominoplastia" por zona aplanado; FreeEntryFullContent genera h4 por zona con bloque diagnósticos + otroTexto + tratamientos con precio ARS formateado
- TurnoHCModal EntryCard: ZonaContenidoHC tipo local + branch zonas[] → badge de zona + diagnósticos outline + tratamientos azul; else legacy intacto
- Eliminados zonas-diagnostico.ts y zonas-diagnostico.json — rg confirma cero referencias; tsc --noEmit: 0 errores

## Task Commits

Each task was committed atomically:

1. **Task 1: Render dual-shape en los tres lectores de historial** - `c2e7ac2` (feat)
2. **Task 2: Eliminar zonas-diagnostico hardcodeado** - `0b60476` (chore)
3. **Task 3: Verificación visual del flujo completo** - checkpoint:human-verify, aprobado por usuario (no code changes)

## Files Created/Modified
- `frontend/src/components/live-turno/tabs/hc/HistorialClinicoPanel.tsx` - Tipo ZonaContenido + branch dual-shape en render isPrimeraVez
- `frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx` - Interfaz ZonaContenido + ContenidoPrimeraVez extendida; FreeEntryPreview y FreeEntryFullContent con branch zonas[]
- `frontend/src/app/dashboard/components/TurnoHCModal.tsx` - ZonaContenidoHC tipo + EntryCard con branch zonas[] para nuevo shape vs legacy
- `frontend/src/lib/zonas-diagnostico.ts` - ELIMINADO
- `frontend/src/lib/zonas-diagnostico.json` - ELIMINADO

## Decisions Made
- Detección dual-shape uniforme: `Array.isArray(c.zonas)` en los 3 lectores — consistente con el patrón del plan
- Tipos ZonaContenido definidos localmente en cada componente (no módulo compartido) — evita crear dependencias para tipos que son simples shapes de visualización
- build falla con Node 18 (pre-existente) — no bloquea; tsc valida correctamente

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito para Task 1 y Task 2.

## Issues Encountered
- `npm run build` falla por Node.js 18 vs requerimiento Next.js >=20.9.0 — pre-existente en el entorno, confirmado desde 45-02, no relacionado con los cambios de este plan. TypeScript `npx tsc --noEmit` pasa con 0 errores.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 45 completa: los 5 criterios de éxito del milestone v1.9 fueron validados visualmente por el usuario (8 pasos aprobados)
- Milestone v1.9 Plantilla Primera Consulta: entregado — catálogo BD, formulario zona-céntrico, guardado agrupado, historial dual-shape
- Sin blockers para el próximo trabajo

---
*Phase: 45-formulario-primera-consulta*
*Completed: 2026-06-12*
