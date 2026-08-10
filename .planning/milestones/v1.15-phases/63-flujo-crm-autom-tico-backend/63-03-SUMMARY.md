---
phase: 63-flujo-crm-autom-tico-backend
plan: 03
subsystem: backend/historia-clinica
tags: [crm, flujo, historia-clinica, tratamientos]
dependency-graph:
  requires: []
  provides:
    - "resolverTipoEntrada helper (forzado server-side de tipoEntrada)"
    - "resolverNuevoFlujo TRATAMIENTO branch cubre flujo=null"
    - "crearEntrada mueve a flujo=TRATAMIENTO+etapaCRM=null al cargar tratamiento en consultorio"
  affects:
    - backend/src/modules/historia-clinica
tech-stack:
  added: []
  patterns:
    - "Helper puro exportado + re-exportado desde el service (patrón pre-existente resolverNuevoFlujo)"
    - "Forzado server-side de campos derivados de un discriminador de UI (dto.tipo) para prevenir tampering (T-63-08)"
    - "Spread condicional en tx.paciente.update, espejo del patrón updateFlujo() en pacientes.service.ts"
key-files:
  created: []
  modified:
    - backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts
    - backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts
    - backend/src/modules/historia-clinica/historia-clinica.service.ts
decisions:
  - "Se combinaron test+implementación en un solo commit feat por task (ver Deviations) en vez de commits test/feat separados, dado que las tasks son helpers net-new de bajo riesgo."
metrics:
  duration_minutes: 20
  completed: "2026-07-31"
---

# Phase 63 Plan 03: Tratamiento en consultorio saca al paciente del kanban (EMBUDO-09) Summary

Al cargar una entrada de HC "Tratamiento en consultorio" el backend fuerza `tipoEntrada=TRATAMIENTO` server-side y mueve al paciente a `flujo=TRATAMIENTO` + `etapaCRM=null` (oculto del board, patrón v1.13) sólo si estaba `PENDIENTE` o `null` (lead nuevo), preservando intacto al candidato quirúrgico (`flujo=CIRUGIA`).

## What Was Built

**Task 1 — Helpers puros (`historia-clinica.flujo.helpers.ts`):**
- `resolverTipoEntrada(tipo, tipoEntradaDto)`: centraliza el forzado de `tipoEntrada` según el discriminador `dto.tipo` de UI. `pre_quirurgico → 'PREOPERATORIO'` (comportamiento pre-existente, ahora extraído a esta función) y `tratamiento_en_consultorio → 'TRATAMIENTO'` (D-08, nuevo). Cualquier otro caso respeta `dto.tipoEntrada ?? undefined`.
- `resolverNuevoFlujo`: el branch `TRATAMIENTO` ahora acepta `flujoActual === 'PENDIENTE' || flujoActual == null` (antes sólo `PENDIENTE`), cubriendo el lead nuevo con `flujo=null` introducido por EMBUDO-07 (Phase 63-01). El branch `CONSULTA_CIRUGIA` y el guard `esCirugia` quedaron intactos (sin regresión).

**Task 2 — Wiring en `crearEntrada` (`historia-clinica.service.ts`):**
- `crearEntrada` calcula `tipoEntradaResuelto = resolverTipoEntrada(dto.tipo, dto.tipoEntrada)` una sola vez (fuera de la transacción) y lo usa en dos lugares: (1) el `tx.historiaClinicaEntrada.create` (reemplaza el ternario inline que sólo cubría `pre_quirurgico`), y (2) como primer argumento de `resolverNuevoFlujo` (antes recibía `dto.tipoEntrada` crudo, permitiendo que un cliente evadiera la reclasificación mandando un `tipoEntrada` distinto — T-63-08).
- El `tx.paciente.update` agrega `etapaCRM: null` cuando `nuevoFlujo === 'TRATAMIENTO'` (D-10), espejo del patrón ya existente en `updateFlujo()` de `pacientes.service.ts`. El candidato quirúrgico (`flujo=CIRUGIA`) nunca entra a este branch — `resolverNuevoFlujo` devuelve `null` para él, así que ni `flujo` ni `etapaCRM` se tocan (D-09).
- No se agregó código de ocultamiento de board ni de planilla: `getKanban` ya filtra `flujo ∈ {CIRUGIA, null}` (patrón v1.13) y `entrada.fecha` + `contenido.tratamientos` ya se persistían sin cambios de schema (D-10, Success Criterion #3 del plan).

## Tests

15 tests de helpers (`historia-clinica.flujo.spec.ts`, describe blocks `resolverNuevoFlujo` y `resolverTipoEntrada`) + 4 tests de wiring nuevos (describe `HistoriaClinicaService.crearEntrada — wiring D-08/D-09/D-10`, con `PrismaService` mockeado vía `TestingModule`):
- `tratamiento_en_consultorio` fuerza `tipoEntrada=TRATAMIENTO` aunque el cliente mande `tipoEntrada='CONTROL'` (D-08).
- Paciente `flujo=PENDIENTE` + tratamiento en consultorio → `tx.paciente.update` recibe `flujo=TRATAMIENTO` y `etapaCRM=null` (D-09/D-10).
- Paciente `flujo=CIRUGIA` + tratamiento en consultorio → `tx.paciente.update` NO se llama con `flujo=TRATAMIENTO` (D-09, candidato quirúrgico intacto).
- `pre_quirurgico` sigue guardando `tipoEntrada=PREOPERATORIO` (no regresión).

Verificación ejecutada:
- `cd backend && npx jest src/modules/historia-clinica` → 44/44 verde.
- `cd backend && npx tsc --noEmit -p tsconfig.build.json` → sin errores.
- `npx eslint --fix` sobre los 3 archivos modificados → sin errores.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cast explícito a `TipoEntradaHC` en el call site del service**
- **Found during:** Task 2
- **Issue:** `resolverTipoEntrada` devuelve `string | undefined` (el archivo de helpers evita deliberadamente imports de Prisma/Nest, per el doc comment del archivo, para mantenerse testeable de forma aislada). Esto rompía `tsc --noEmit` en la asignación a `tipoEntrada` del `tx.historiaClinicaEntrada.create`, que espera el enum `TipoEntradaHC`.
- **Fix:** Se importó `TipoEntradaHC` desde `@prisma/client` en `historia-clinica.service.ts` (mismo patrón usado en `crm-dashboard.service.ts`) y se castea el resultado de `resolverTipoEntrada` una sola vez al calcular `tipoEntradaResuelto`.
- **Files modified:** `backend/src/modules/historia-clinica/historia-clinica.service.ts`
- **Commit:** 6e455b0

### Process Note (not a deviation from behavior)

Las dos tasks tenían `tdd="true"`, pero en ambas se commiteó test+implementación en un solo commit `feat(63-03): ...` en vez de un commit `test(...)` (RED) seguido de un commit `feat(...)` (GREEN) separados. El frontmatter del plan es `type: execute` (no `type: tdd`), por lo que el gate estricto de plan-level RED/GREEN/REFACTOR (commits separados) no aplica formalmente; los tests sí se escribieron y verificaron antes de considerar cada task terminada, y ambos commits incluyen el código de test correspondiente. Documentado por transparencia de proceso.

## Self-Check: PASSED

- FOUND: backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts (contiene `resolverTipoEntrada`, `flujoActual == null`)
- FOUND: backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts (44 tests, incluye describe `crearEntrada — wiring D-08/D-09/D-10`)
- FOUND: backend/src/modules/historia-clinica/historia-clinica.service.ts (contiene `resolverTipoEntrada` importado/usado, `etapaCRM: null`)
- FOUND commit 4b2049f (Task 1: helpers)
- FOUND commit 6e455b0 (Task 2: wiring)
