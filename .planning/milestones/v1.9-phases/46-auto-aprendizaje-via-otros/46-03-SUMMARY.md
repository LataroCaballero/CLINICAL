---
phase: 46-auto-aprendizaje-via-otros
plan: "03"
subsystem: frontend/historia-clinica
tags: [ux, enter-chip, catalogo-hc, aprendizaje, zonas, diagnosticos, tratamientos]
dependency_graph:
  requires: []
  provides: [APR-01-frontend, APR-02-frontend, APR-03-frontend]
  affects: [PrimeraConsultaForm, useCreateHistoriaClinicaEntry, useCatalogoHC]
tech_stack:
  added: []
  patterns: [enter-to-chip-ux, dashed-chip-visual, query-prefix-invalidation, useRef-stable-id]
key_files:
  created: []
  modified:
    - frontend/src/components/live-turno/tabs/hc/PrimeraConsultaForm.tsx
    - frontend/src/hooks/useCreateHistoriaClinicaEntry.ts
decisions:
  - "Chip 'Otros' de dx/tx alterna input en lugar de togglear el string literal 'Otros' — evita enviar 'Otros' al backend como diagnóstico real"
  - "zonaNuevaCounter ref (incremento) para tempIds estables sin llamar Date.now/Math.random durante potencial render — cumple react-hooks/purity"
  - "dxNuevos/txNuevos son Records locales de nombres/items para renderizar chips punteados; la selección real vive en zonasSeleccionadas (ZonaSeleccionDto[])"
  - "Zonas nuevas reciben grupos Dx/Tx con solo opción 'Otros' sintética — permite cargar dx/tx de zonas creadas en la misma consulta"
  - "CATALOGO_HC_QUERY_KEY sin profesionalId en invalidateQueries — invalida todas las variantes cacheadas (patrón prefijo del repo)"
metrics:
  duration: "~3 minutos"
  completed: "2026-06-13"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 46 Plan 03: UX Enter→chip + invalidación catalogo-hc

**One-liner:** UX Enter→chip para zona/dx/tx nuevos con chips punteados e invalidación silenciosa de catálogo al guardar HC.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | UX Enter→chip en PrimeraConsultaForm | 805cd00 | PrimeraConsultaForm.tsx |
| 2 | Invalidación de catalogo-hc al guardar la HC | f561c91 | useCreateHistoriaClinicaEntry.ts |

## What Was Built

### Task 1: UX Enter→chip (PrimeraConsultaForm.tsx)

**A. Zona nueva instantánea (APR-01):**
- Nuevo estado `zonasNuevas: ZonaHC[]` con tempIds de ref counter
- Input debajo de los chips de zona (reemplaza el viejo input inline de la zona "Otros") — Enter con texto crea zona client-side, la selecciona al instante y limpia el input
- Deduplicación: si el nombre ya existe en catálogo o zonasNuevas, selecciona la existente
- Merge `zonasNuevas` insertadas antes de la zona "Otros" sistema en `zonasConNuevas`
- Chips de zonas nuevas con `dashed` prop

**B. Diagnósticos nuevos (APR-02):**
- `dxInputAbierto: Record<zonaId, boolean>` + `dxInputTexto` — chip "Otros" togglea el input (no agrega el string "Otros")
- Enter agrega nombre a `selState.diagnosticos` y trackea en `dxNuevos[zonaId]`
- Input permanece abierto para cargar múltiples dx
- Chips de dx nuevos renderizados con `dashed` y toggleables

**C. Tratamientos nuevos (APR-03):**
- Mismo patrón con `txInputAbierto`, `txInputTexto`, `txNuevos`
- Precio resuelto por `tratamientosProfesional.find(tp => tp.nombre.toLowerCase() === nombre.toLowerCase())` o 0
- `TratamientoItemDto` con `tratamientoId: fallback?.id`

**D. Distinción visual:**
- Componente `Chip` extendido con `dashed?: boolean`
- Seleccionado+dashed: `bg-blue-600 text-white border-2 border-dashed border-blue-300`
- Deseleccionado+dashed: `bg-white text-gray-700 border-2 border-dashed border-gray-400`
- Mismo patrón en botones de tratamientos nuevos

### Task 2: Invalidación catalogo-hc (useCreateHistoriaClinicaEntry.ts)

- Import `CATALOGO_HC_QUERY_KEY` desde `@/hooks/useCatalogoHC`
- `qc.invalidateQueries({ queryKey: [CATALOGO_HC_QUERY_KEY] })` agregado al `onSuccess` existente
- Invalidación sin feedback UI — aprendizaje silencioso según decisión de CONTEXT

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Date.now/Math.random en event handler — lint react-hooks/purity**
- **Found during:** Task 1 (verificación lint)
- **Issue:** La regla `react-hooks/purity` prohíbe llamar funciones impuras incluso en handlers si el linter las detecta estáticamente
- **Fix:** Reemplazado por `useRef` counter (`zonaNuevaCounter`) que se incrementa en el handler — IDs estables y deterministas
- **Files modified:** PrimeraConsultaForm.tsx
- **Commit:** 805cd00

## Self-Check

- [x] `frontend/src/components/live-turno/tabs/hc/PrimeraConsultaForm.tsx` — FOUND
- [x] `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` — FOUND
- [x] `border-dashed` presente en PrimeraConsultaForm.tsx
- [x] `CATALOGO_HC_QUERY_KEY` importado y usado en useCreateHistoriaClinicaEntry.ts
- [x] tsc --noEmit: 0 errores
- [x] lint en archivos modificados: 0 errores

## Self-Check: PASSED
