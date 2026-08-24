---
phase: 69-consistencia-de-tel-fono-opcional-frontend
plan: 09
subsystem: testing
tags: [vitest, testing-library, jsdom, react19, vite, frontend]

# Dependency graph
requires:
  - phase: 69-01
    provides: "frontend/src/lib/telefono.ts (SSOT de teléfono opcional: formatTelefono, tieneTelefono, getMotivoBloqueoWhatsApp)"
provides:
  - "Runner de tests en frontend/ (vitest) capaz de montar componentes React 19 en jsdom y assertar sobre el DOM"
  - "Alias @ -> ./src resuelto en el runner, espejando tsconfig.json"
  - "Smoke test que prueba end-to-end el SSOT lib/telefono.ts (11 tests) con dos pruebas negativas ejecutadas"
affects: [69-07, 69-08]

# Tech tracking
tech-stack:
  added: [vitest@3.2.7, "@vitejs/plugin-react@4.7.0", jsdom@26.1.0, "@testing-library/react@16.3.2", "@testing-library/dom@10.4.1", "@testing-library/jest-dom@6.9.1", "@testing-library/user-event@14.6.5"]
  patterns:
    - "vitest.config.ts con resolve.alias espejando compilerOptions.paths del tsconfig; test.include acotado a src/**/*.test.ts(x) para no levantar archivos de Next"
    - "vitest.setup.ts importa @testing-library/jest-dom/vitest para registrar matchers (toBeDisabled, toBeInTheDocument, etc.) que consumirán los planes 07 y 08"

key-files:
  created:
    - frontend/vitest.config.ts
    - frontend/vitest.setup.ts
    - frontend/src/lib/__tests__/telefono.test.ts
  modified:
    - frontend/package.json
    - frontend/package-lock.json

key-decisions:
  - "vitest en vez de jest (ya usado en backend/): resuelve tsconfig y JSX con @vitejs/plugin-react sin transform propio, evita la superficie de config de next/jest + SWC para Next 16 / React 19"
  - "Verificación de npm run build / npx tsc corrida bajo Node 20.19.6 (vía nvm, sin tocar package.json ni .nvmrc): el entorno por defecto tiene Node 18.20.8, insuficiente para next build (Next 16 exige >=20.9.0) mientras que npm test corre igual de bien bajo Node 18 — ver Issues Encountered"

requirements-completed: [ENVIO-03]

# Metrics
duration: ~20min
completed: 2026-08-22
---

# Phase 69 Plan 09: Runner de Tests (vitest + Testing Library) Summary

**Vitest + Testing Library instalado y configurado en `frontend/` con jsdom y alias `@`, verificado con un smoke test de 11 casos sobre el SSOT `lib/telefono.ts` y dos pruebas negativas que confirman que el runner falla cuando debe fallar.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-22T02:04:43Z (aprox., desde STATE.md al inicio de la ejecución)
- **Completed:** 2026-08-22T02:10:45Z
- **Tasks:** 2/2
- **Files modified:** 5 (2 creados de config + 1 test + package.json + package-lock.json)

## Accomplishments

- `frontend/` tiene un runner de tests real (`npm test` → `vitest run`) capaz de montar componentes React 19 en jsdom, con matchers de `@testing-library/jest-dom` registrados globalmente.
- El alias `@` del runner espeja `compilerOptions.paths` del `tsconfig.json`, verificado con una prueba negativa (romperlo hace fallar el import).
- Smoke test de 11 casos sobre `lib/telefono.ts` cubre los 5 exports del SSOT que consumen los 5 controles de D-11, incluida la precedencia teléfono > opt-in explícita en ambos sentidos (D-14/D-15) y el criterio falsy-tras-trim (Phase 67 D-03).
- Dos pruebas negativas ejecutadas de verdad (no descriptas, corridas) confirmando que el runner no reporta falso verde.

## Task Commits

1. **Task 1: Instalar y configurar vitest + Testing Library en el frontend** - `ccd6717` (feat)
2. **Task 2: Smoke test del SSOT lib/telefono.ts que prueba que el runner corre de verdad** - `7c28db0` (test)

**Plan metadata:** (este commit, ver final_commit)

## Files Created/Modified

- `frontend/vitest.config.ts` - Config de vitest: plugin `@vitejs/plugin-react`, `environment: "jsdom"`, `globals: true`, `setupFiles: ["./vitest.setup.ts"]`, `resolve.alias` `@` → `./src` vía `path.resolve(__dirname, "./src")`, `test.include` acotado a `src/**/*.test.ts(x)`
- `frontend/vitest.setup.ts` - `import "@testing-library/jest-dom/vitest"` (registra matchers)
- `frontend/src/lib/__tests__/telefono.test.ts` - 11 tests sobre `tieneTelefono`, `formatTelefono`, `getMotivoBloqueoWhatsApp`, importando por alias `@/lib/telefono`
- `frontend/package.json` - +7 devDependencies, scripts `test` (`vitest run`) y `test:watch` (`vitest`), sin tocar `dev`/`build`/`start`/`lint`
- `frontend/package-lock.json` - actualizado por `npm install -D`

## Decisions Made

- Verificación de `npm run build` y `npx tsc --noEmit` corrida bajo Node 20.19.6 vía `nvm use 20` (disponible localmente en `~/.nvm/versions/node/`), sin modificar ningún archivo de config del repo ni el Node por defecto del entorno — ver "Issues Encountered" para el detalle del porqué.
- Se mantuvo `vitest` en vez de `jest` según lo indicado explícitamente en el plan (`<interfaces>`): evita duplicar la superficie de config de `next/jest` + SWC para Next 16 / React 19.

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito. No hizo falta tocar `tsconfig.json` para excluir `vitest.config.ts`/`vitest.setup.ts` — ninguno de los dos rompió `npm run build` ni `npx tsc --noEmit` (ver Verification Results).

## Issues Encountered

**`npm run build` falla bajo Node 18.20.8 (entorno por defecto) con "Node.js version >=20.9.0 is required" (Next 16.0.7).** Esto es una restricción de entorno preexistente, no causada por este plan (`next: "16.0.7"` ya estaba en `dependencies` antes de este plan; los 7 paquetes nuevos instalados son todos devDependencies sin relación con el runtime de Next). Se verificó el build corriendo `nvm use 20` (Node 20.19.6, ya instalado localmente vía nvm, sin cambios al repo) y salió con código 0 y las 33 rutas generadas correctamente. `npm test` y `npx tsc --noEmit`, en cambio, corren igual de bien bajo Node 18.20.8 que bajo Node 20 (verificado en ambos). No se tocó `.nvmrc`, `package.json engines` ni ningún archivo de config para "arreglar" esto — está fuera del scope de este plan (SCOPE BOUNDARY: sólo se auto-corrige lo directamente causado por el cambio actual) y queda registrado acá para trazabilidad, no como deuda nueva introducida por este plan.

## Verification Results

1. **`cd frontend && npm test`** → exit 0, 1 archivo de test, **11 tests pasando** (mínimo pedido: 8). Corrido y confirmado tanto bajo Node 20.19.6 como bajo Node 18.20.8 (el runner no depende de la versión de Node que exige `next build`).
2. **`cd frontend && npm run build`** → exit 0 bajo Node 20.19.6 (33 rutas generadas, `Compiled successfully`). Bajo Node 18.20.8 (default del entorno) el build no arranca por el gate de engine de Next — ver "Issues Encountered".
3. **`cd frontend && npx tsc --noEmit`** → exit 0 (verificado bajo Node 20.19.6).

### Prueba negativa 1 — assertion falsa (falsable, T-69-25)

Se reemplazó temporalmente `expect(tieneTelefono(null)).toBe(false)` por `expect(tieneTelefono(null)).toBe(true)` en `es false para null`.

**Resultado:** `npm test` salió con **exit code 1**, reportando explícitamente:
```
× lib/telefono (SSOT Phase 69) > tieneTelefono > es false para null 3ms
  → expected false to be true // Object.is equality
 Test Files  1 failed (1)
      Tests  1 failed | 10 passed (11)
```
El test roto quedó nombrado con su ruta completa (`describe > describe > it`). Revertido inmediatamente después con `Edit` (diff verificado limpio antes del commit — la assertion falsa nunca llegó a comitearse).

### Prueba negativa 2 — alias roto (falsable)

Se renombró temporalmente el alias `"@"` a `"@roto"` en `resolve.alias` de `frontend/vitest.config.ts`.

**Resultado:** `npm test` salió con **exit code 1**:
```
FAIL  src/lib/__tests__/telefono.test.ts [ src/lib/__tests__/telefono.test.ts ]
Error: Failed to resolve import "@/lib/telefono" from "src/lib/__tests__/telefono.test.ts". Does the file exist?
 Test Files  1 failed (1)
      Tests  no tests
```
Restaurado inmediatamente después (`git diff frontend/vitest.config.ts` confirmado vacío antes de continuar). El alias roto nunca llegó a comitearse.

**Conclusión:** el runner ejecuta tests reales y falla de forma distinguible en ambos escenarios — no hay falso verde.

## Versiones resueltas y auditoría de dependencias (T-69-SC)

`npm ls` tras el install confirma exactamente las 7 devDependencies pedidas, sin overrides ni resolutions:

| Paquete | Versión resuelta |
|---|---|
| vitest | 3.2.7 |
| @vitejs/plugin-react | 4.7.0 |
| jsdom | 26.1.0 |
| @testing-library/react | 16.3.2 (soporta React 19, ≥16 pedido por el plan) |
| @testing-library/dom | 10.4.1 |
| @testing-library/jest-dom | 6.9.1 |
| @testing-library/user-event | 14.6.5 |

Instalados por nombre exacto desde el registry público con `npm install -D`, sin `postinstall`, sin `overrides`/`resolutions` agregados.

**`npm audit --omit=dev`** reportó 14 vulnerabilidades (9 high, 4 moderate, 1 low), **todas en dependencias de producción preexistentes y no relacionadas con los 7 paquetes de este plan**: `axios` (SSRF/prototype pollution en la cadena de advisories del paquete), `follow-redirects`, `form-data`, `linkify-it`, `next` (16.0.7, deuda de versión preexistente — el fix requiere `next@16.3.2`), `postcss` (transitiva de `next`), `sharp` (transitiva de `next`), `vue`/`vue-template-compiler` (transitivas de `tiptap`). Ninguno de los 7 paquetes instalados por este plan (`vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/*`) aparece en el reporte de `npm audit` — son devDependencies puras que no viajan al bundle de producción y `--omit=dev` las excluye del scan por diseño. No se detuvo el plan: las vulnerabilidades reportadas son deuda preexistente del árbol de producción, fuera del alcance de T-69-SC (que sólo exige escalar si la vulnerabilidad es *introducida por estos paquetes*).

## Threat Flags

Ninguno. El único cruce de confianza del plan (registry npm → `frontend/node_modules`) se resolvió con los 7 paquetes esperados, sin superficie nueva de red, auth ni schema.

## Known Stubs

Ninguno.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- El runner está listo para que los planes 07 y 08 escriban tests de comportamiento sobre los guards de envío (botón deshabilitado, tooltip, guard que refleja el dato nuevo) montando los componentes reales en jsdom, en vez de depender de lectura de fuente.
- `npm test` corre en <500ms para el smoke test actual; sin infra de mocking añadida (no hizo falta — `lib/telefono.ts` es puro).
- Sin blockers para continuar con la fase.

## Self-Check: PASSED

- FOUND: frontend/vitest.config.ts
- FOUND: frontend/vitest.setup.ts
- FOUND: frontend/src/lib/__tests__/telefono.test.ts
- FOUND: .planning/phases/69-consistencia-de-tel-fono-opcional-frontend/69-09-SUMMARY.md
- FOUND commit: ccd6717
- FOUND commit: 7c28db0

---
*Phase: 69-consistencia-de-tel-fono-opcional-frontend*
*Completed: 2026-08-22*
