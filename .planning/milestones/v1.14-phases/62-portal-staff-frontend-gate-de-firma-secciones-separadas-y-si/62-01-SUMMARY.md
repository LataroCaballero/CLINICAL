---
phase: 62-portal-staff-frontend-gate-de-firma-secciones-separadas-y-si
plan: 01
subsystem: ui
tags: [portal, react-query, consentimiento, gate, firma]

# Dependency graph
requires:
  - phase: 61-portal-backend-desacople-de-firma-e-indicaciones
    provides: "firmarConsentimiento desacoplado de indicaciones + endpoint set-once POST /paciente-portal/public/indicaciones/acuse"
provides:
  - "Doble gate client-side (pdfAbierto && leiConsentimiento) para habilitar la firma del consentimiento"
  - "Sección de consentimiento sin ningún rastro de indicaciones (link, checkbox, copy)"
  - "Payload de firmarConsentimiento limpio (sin indicacionesLeidas)"
  - "Hook useAcusarIndicaciones listo para consumir desde Plan 02 (PortalIndicaciones.tsx)"
affects: ["62-02", "PortalIndicaciones.tsx"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Doble gate client-side vía dos useState booleanos combinados en disabled del botón (mismo patrón que canvasEmpty/isSubmitting existente)"
    - "Hook de mutación sin payload (mutationFn: async () => ...) que reutiliza portalApi + invalidateQueries, copiado 1:1 de useFirmarConsentimiento"

key-files:
  created: []
  modified:
    - "frontend/src/hooks/usePortalConsentimiento.ts"
    - "frontend/src/components/portal/PortalConsentimiento.tsx"

key-decisions:
  - "Gate open-PDF + checkbox es 100% client-side por diseño legal (D-00): no hay tracking server-side de apertura del PDF; la prueba legal es la firma dibujada + acuse"
  - "safeIndicacionesUrl y todo el bloque de indicaciones se eliminan de PortalConsentimiento.tsx sin reemplazo local — Plan 02 recrea el guard XSS-safe en PortalIndicaciones.tsx"

patterns-established:
  - "useAcusarIndicaciones: mutación sin argumentos, backend resuelve pacienteId desde el JWT portal-scoped — patrón para futuros endpoints set-once del portal"

requirements-completed: [CONS-09, CONS-10, CONS-12]

# Metrics
duration: 6min
completed: 2026-07-21
---

# Phase 62 Plan 01: Gate de Firma Endurecido + Limpieza de Indicaciones Summary

**El botón de firma del consentimiento en el portal ahora exige abrir el PDF y tildar "Leí el consentimiento" (dos gates independientes), la sección quedó sin ningún contenido de indicaciones, y el hook `useAcusarIndicaciones` queda listo para la sección separada del Plan 02.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-21T15:23:19Z
- **Completed:** 2026-07-21T15:29:00Z
- **Tasks:** 2/2 completed
- **Files modified:** 2

## Accomplishments
- Botón "Confirmar firma" deshabilitado hasta `pdfAbierto && leiConsentimiento && !canvasEmpty && !isSubmitting && canvasSupported` (CONS-09, CONS-10)
- Bloque completo de checkbox/link de indicaciones (ambas ramas del ternario `safeIndicacionesUrl`) eliminado de `PortalConsentimiento.tsx` — CONS-12 cumplido
- `FirmarConsentimientoPayload` y el objeto pasado a `mutateAsync` ya no incluyen `indicacionesLeidas`
- `useAcusarIndicaciones` exportado, apunta a `POST /paciente-portal/public/indicaciones/acuse` vía `portalApi` sin body, invalida `["portal-consentimiento"]`

## Task Commits

Each task was committed atomically:

1. **Task 1: Limpiar payload de firma y agregar hook de acuse** - `d9b26f1` (feat)
2. **Task 2: Doble gate open-PDF + checkbox en ZoneCard y limpiar indicaciones** - `601d6ea` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `frontend/src/hooks/usePortalConsentimiento.ts` - `FirmarConsentimientoPayload` sin `indicacionesLeidas`; nuevo `useAcusarIndicaciones`
- `frontend/src/components/portal/PortalConsentimiento.tsx` - estados `pdfAbierto`/`leiConsentimiento` reemplazan `indicacionesLeidas`; bloque de indicaciones eliminado; `onClick` en el link del PDF; `disabled` del botón y payload de `handleFirmar` actualizados

## Decisions Made
- Se removió `safeIndicacionesUrl` de este archivo sin dejar guard huérfano, per instrucción explícita del plan (Task 2, punto 6) — el Plan 02 recrea el guard XSS-safe en `PortalIndicaciones.tsx`.
- No se agregó tracking server-side de apertura de PDF (D-00, out of scope por diseño legal).

## Deviations from Plan

None — plan ejecutado exactamente como estaba escrito. Ambas tareas se completaron con los grep de verificación en verde y `npm run build` en exit 0 (ejecutado con Node v20.19.6 vía nvm, ya que el Node por defecto del shell es v18.20.8 y Next.js 16 requiere >=20.9.0 — no fue necesario ningún cambio de código, sólo la selección de runtime para correr el build).

## Known Stubs

Ninguno. El hook `useAcusarIndicaciones` no tiene consumidor todavía (se conecta en el Plan 02, `PortalIndicaciones.tsx`), pero esto es el contrato intencional de este plan — no es un stub de UI con datos vacíos, es un hook exportado y listo para consumo futuro, documentado explícitamente en el objetivo del plan.

## Threat Flags

Ninguno nuevo. El `threat_model` del plan (T-62-01/02/03) ya cubre la superficie modificada; no se introdujeron endpoints, rutas de auth ni cambios de schema fuera de lo previsto.

## Self-Check: PASSED

- FOUND: frontend/src/hooks/usePortalConsentimiento.ts
- FOUND: frontend/src/components/portal/PortalConsentimiento.tsx
- FOUND commit: d9b26f1
- FOUND commit: 601d6ea
